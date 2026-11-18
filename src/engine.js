export const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function date(s){ const d=new Date(`${s}T12:00:00`); if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(+d)||key(d)!==s) throw Error('日付を正しく入力してください。'); return d; }
export function add(s,n){const d=date(s);d.setDate(d.getDate()+n);return key(d);}
export function days(a,b){return Math.round((date(b)-date(a))/86400000);}
export function isOff(s,settings){return settings.offDays.includes(date(s).getDay()) || settings.holidays.includes(s);}
export function deliveryGroups(tasks){
 const groups=new Map();
 for(const t of tasks){const unit=t.deliveryUnit??1;if(!groups.has(unit))groups.set(unit,{unit,tasks:[],work:0,buffer:0,price:0,start:null,end:null});const g=groups.get(unit);g.tasks.push(t);g.work+=t.work;g.buffer+=t.buffer;g.price+=t.price??0;if(t.start&&(!g.start||t.start<g.start))g.start=t.start;if(t.end&&(!g.end||t.end>g.end))g.end=t.end;}
 return [...groups.values()].map(g=>({...g,plan:Math.round((g.work+g.buffer)*100)/100}));
}
export function normalizeDeliveryUnits(tasks){return deliveryGroups(tasks).flatMap((g,i)=>g.tasks.map(t=>({...t,deliveryUnit:i+1})));}
export function reorderTasks(tasks,sourceId,targetId,after=false){
 const source=tasks.find(t=>t.id===sourceId);
 if(!source||sourceId===targetId||!tasks.some(t=>t.id===targetId))return tasks;
 const next=tasks.filter(t=>t.id!==sourceId),index=next.findIndex(t=>t.id===targetId);
 next.splice(index+(after?1:0),0,source);return next;
}
export function validate(p){
 if(!p||p.version!==1||typeof p.name!=='string'||!p.settings||!Array.isArray(p.tasks))throw Error('対応する計画データではありません。');
 date(p.settings.start);
 if(!Number.isFinite(p.settings.rate)||p.settings.rate<0||p.settings.rate>1e9)throw Error('日当は0〜10億円で入力してください。');
 if(!Array.isArray(p.settings.offDays)||p.settings.offDays.some(n=>!Number.isInteger(n)||n<0||n>6)||new Set(p.settings.offDays).size===7)throw Error('作業できる曜日を1日以上残してください。');
 if(!Array.isArray(p.settings.holidays))throw Error('休業日の形式が正しくありません。');
 p.settings.holidays.forEach(date);
 if(p.tasks.length>500)throw Error('工程数は500件までです。');
 const ids=new Set();let total=0;
 for(const t of p.tasks){if(typeof t.id!=='string'||ids.has(t.id)||['name','target','category','request'].some(k=>typeof t[k]!=='string'))throw Error('工程データが正しくありません。');if(t.deliveryUnit!==undefined&&(!Number.isSafeInteger(t.deliveryUnit)||t.deliveryUnit<0))throw Error('納品単位は0以上の整数で入力してください。');ids.add(t.id);for(const k of ['work','buffer']){if(!Number.isFinite(t[k])||t[k]<0||t[k]>1000)throw Error('日数は0〜1000の数値で入力してください。');total+=t[k];}}
 if(total>5000)throw Error('計画日数は合計5000日以内にしてください。');
 return p;
}
export function schedule(p){
 validate(p);let cursor=p.settings.start,used=0,guard=0;const events=[];
 function available(){while(isOff(cursor,p.settings)||used>=1-1e-8){cursor=add(cursor,1);used=0;if(++guard>40000)throw Error('計画期間が長すぎます。休業日の設定を確認してください。');}}
 const tasks=deliveryGroups(p.tasks).flatMap(g=>g.tasks).map(t=>{const slots=[];for(const phase of ['work','buffer']){let left=t[phase];while(left>1e-8){available();const amount=Math.min(1-used,left);const e={taskId:t.id,date:cursor,phase,amount};slots.push(e);events.push(e);left-=amount;used+=amount;}}return {...t,start:slots[0]?.date||null,end:slots.at(-1)?.date||null,slots,price:Math.round(t.work*p.settings.rate)};});
 return {tasks,events,end:events.at(-1)?.date||null,work:tasks.reduce((a,t)=>a+t.work,0),buffer:tasks.reduce((a,t)=>a+t.buffer,0),price:tasks.reduce((a,t)=>a+t.price,0)};
}
export function ics(p,result){
 const esc=s=>s.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Hibi Keikaku//JA','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 for(const t of result.tasks)for(const s of t.slots){lines.push('BEGIN:VEVENT',`UID:${t.id}-${s.date}-${s.phase}@hibikeikaku.local`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${s.date.replaceAll('-','')}`,`DTEND;VALUE=DATE:${add(s.date,1).replaceAll('-','')}`,`SUMMARY:${esc(`${t.target} ${t.name}${s.phase==='buffer'?'（予備日）':''}`.trim())}`,`DESCRIPTION:${esc(`${p.name}\n${s.amount}日分\n${t.request}`)}`,'END:VEVENT');}
 lines.push('END:VCALENDAR');
 // RFC 5545: fold content lines at 75 UTF-8 octets.
 return lines.flatMap(line=>{const out=[];let part='',size=0;for(const c of line){const n=new TextEncoder().encode(c).length;if(size+n>75){out.push(part);part=' ';size=1;}part+=c;size+=n;}out.push(part);return out;}).join('\r\n')+'\r\n';
}
export function csv(result){let n=0;const rows=[['No.','納品単位','分類','工程','制作日','予備日','計画日数','制作費（円）','予定開始日','予定完了日'],...deliveryGroups(result.tasks).flatMap(g=>[...g.tasks.map(t=>[++n,g.unit,t.target,t.name,t.work,t.buffer,t.work+t.buffer,t.price,t.start||'',t.end||'']),['',g.unit,'小計','',g.work,g.buffer,g.plan,g.price,g.start||'',g.end||'']])];return '\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');}
