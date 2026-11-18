import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {add,date,isOff,deliveryGroups} from './engine.js';
import {printMonths,printRanges} from './print-layout.js';
const W=841.89,H=595.28,M=14.18,BOTTOM=H-24;
const ink=rgb(.176,.263,.18),grid=rgb(.72,.77,.68),paper=rgb(.93,.95,.9),off=rgb(.93,.94,.91);
const yen=n=>'¥'+n.toLocaleString('ja-JP');
const label=s=>s?s.replaceAll('-','/'):'—';
const hex=s=>rgb(parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255);
export async function createPdf(p,result,fontBytes,color){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(fontBytes,{subset:false,features:{liga:false,clig:false}}),glyphs=new Set(font.getCharacterSet());
 const clean=s=>Array.from(String(s??'').replace(/\r\n?|\t/g,' ')).map(c=>c==='\n'||glyphs.has(c.codePointAt(0))?c:'□').join('');
 const widths=new Map();function width(c,size){const k=c+'|'+size;if(!widths.has(k))widths.set(k,font.widthOfTextAtSize(c,size));return widths.get(k);}
 function wrap(s,available,size=9){const out=[];let line='',w=0;for(const c of clean(s)){if(c==='\n'){out.push(line);line='';w=0;continue;}const cw=width(c,size);if(w+cw>available&&line){out.push(line);line='';w=0;}line+=c;w+=cw;}out.push(line);return out;}
 let page,y,section='';
 function text(s,x,top,size=9,c=ink){if(s)page.drawText(clean(s),{x,y:H-top-size,size,font,color:c});}
 function rect(x,top,w,h,fill){page.drawRectangle({x,y:H-top-h,width:w,height:h,borderColor:grid,borderWidth:.35,...(fill?{color:fill}:{})});}
 function newPage(title){section=title;page=doc.addPage([W,H]);text(p.name,M,10,13);text(title,M,29,10);y=46;}
 function room(height){if(y+height>BOTTOM)newPage(section);}
 // Text is drawn directly into PDF with an embedded Unicode font, never as screenshots.
 function table(headers,rows,widths,{size=9,minHeight=16,fills}={}){
  const lineHeight=size*1.35;
  function header(){let x=M;headers.forEach((h,i)=>{rect(x,y,widths[i],20,paper);text(h,x+3,y+4,8);x+=widths[i];});y+=20;}
  room(38);header();
  rows.forEach((row,rowIndex)=>{
   if(row.full){if(BOTTOM-y<44){newPage(section);header();}rect(M,y,widths.reduce((a,n)=>a+n,0),20,paper);text(row.full,M+4,y+4,9);y+=20;return;}
   const lines=row.map((c,i)=>c&&typeof c==='object'?c.lines.flatMap(item=>wrap(item.text,widths[i]-6,size).map(text=>({...item,text}))):wrap(c,widths[i]-6,size).map(text=>({text})));let offset=0,total=Math.max(...lines.map(a=>a.length));
   while(offset<total){if(BOTTOM-y<Math.max(minHeight,lineHeight+6)){newPage(section);header();}
    const count=Math.max(1,Math.min(total-offset,Math.floor((BOTTOM-y-6)/lineHeight))),height=Math.max(minHeight,count*lineHeight+6);let x=M;
    lines.forEach((ls,i)=>{rect(x,y,widths[i],height,fills?.(rowIndex,i));ls.slice(offset,offset+count).forEach((s,j)=>{const top=y+3+j*lineHeight;if(s.color){const c=hex(s.color),w=widths[i]-4;page.drawRectangle({x:x+2,y:H-top-lineHeight,width:w,height:lineHeight,color:rgb(.86+.14*c.red,.86+.14*c.green,.86+.14*c.blue)});page.drawRectangle({x:x+2,y:H-top-lineHeight,width:1.5,height:lineHeight,color:c});if(s.buffer)for(let k=0;k<w;k+=5)page.drawLine({start:{x:x+2+k,y:H-top-lineHeight},end:{x:x+2+Math.min(k+4,w),y:H-top},thickness:.6,color:rgb(1,1,1)});text(s.text,x+4,top,size,rgb(c.red*.65,c.green*.65,c.blue*.65));}else text(s.text,x+3,top,size);});x+=widths[i];});
    y+=height;offset+=count;
   }
  });
 }
 newPage('見積・工程');
 text(`制作費合計 ${yen(result.price)}　制作 ${result.work}日　予備 ${result.buffer}日　計画 ${Math.round((result.work+result.buffer)*100)/100}日　予定完了 ${label(result.end)}`,M,y,10);y+=18;
 const conditions=`着手日 ${label(p.settings.start)}　日当 ${yen(p.settings.rate)}　休業日 ${p.settings.offDays.map(d=>'日月火水木金土'[d]).join('・')||'なし'}　予備日は請求対象外`;
 text(conditions,M,y,8);y+=17;
 const contentWidth=W-M*2,proportions=[.035,.15,.305,.05,.05,.06,.11,.12,.12];
 let taskNumber=0;const estimateRows=deliveryGroups(result.tasks).flatMap(g=>[{full:`納品単位 ${g.unit}`},...g.tasks.map(t=>[++taskNumber,t.target,t.name,t.work,t.buffer,Math.round((t.work+t.buffer)*100)/100,yen(t.price),label(t.start),label(t.end)]),['','','小計',g.work,g.buffer,g.plan,yen(g.price),label(g.start),label(g.end)]]);
 table(['No.','分類','工程','制作日','予備日','計画日数','制作費','予定開始','予定完了'],[...estimateRows,['','','合計',result.work,result.buffer,Math.round((result.work+result.buffer)*100)/100,yen(result.price),'',label(result.end)]],proportions.map(n=>n*contentWidth),{fills:(r)=>estimateRows[r]?.[0]===''||r===estimateRows.length?paper:undefined});
 newPage('カレンダー');
 const byDay=new Map(),byId=new Map(result.tasks.map(t=>[t.id,t]));
 for(const e of result.events){if(!byDay.has(e.date))byDay.set(e.date,[]);byDay.get(e.date).push(e);}
 for(const month of printMonths(p.settings.start,result.end)){
  room(80);text(date(month+'-01').toLocaleDateString('ja-JP',{year:'numeric',month:'long'}),M,y,11);y+=17;
  const d=date(month+'-01'),count=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(),weeks=Math.ceil((d.getDay()+count)/7),start=add(month+'-01',-d.getDay());
  const rows=Array.from({length:weeks},(_,w)=>Array.from({length:7},(_,day)=>{const s=add(start,w*7+day);if(s.slice(0,7)!==month)return '';return {lines:[{text:String(date(s).getDate())},...(byDay.get(s)||[]).map(e=>{const t=byId.get(e.taskId);return {text:`${t.deliveryUnit??1} / ${t.target} / ${t.name}${e.phase==='buffer'?'（予備）':''}`,color:color(t),buffer:e.phase==='buffer'};})]};}));
  table([...'日月火水木金土'],rows,Array(7).fill(contentWidth/7),{size:8,minHeight:25,fills:(r,c)=>isOff(add(start,r*7+c),p.settings)?off:undefined});y+=12;
 }
 newPage('ガントチャート');
 for(const {start,span} of printRanges(p.settings.start,result.end)){
  const end=add(start,span-1),dates=Array.from({length:span},(_,i)=>add(start,i)),tasks=result.tasks.filter(t=>t.start&&t.start<=end&&t.end>=start);
  room(68);text(`${label(start)} - ${label(end)}　制作日：塗りつぶし　予備日：斜線`,M,y,9);y+=17;
  const labelW=contentWidth*.25,dayW=(contentWidth-labelW)/28,headHeight=25;
  function ganttHeader(){rect(M,y,labelW,headHeight,paper);text('納品単位 / 分類 / 工程',M+3,y+7,8);dates.forEach((s,j)=>{const x=M+labelW+j*dayW;rect(x,y,dayW,headHeight,isOff(s,p.settings)?off:paper);text(`${date(s).getMonth()+1}/${date(s).getDate()}`,x+1,y+3,6);text('日月火水木金土'[date(s).getDay()],x+dayW/2-3,y+13,6);});y+=headHeight;}
  ganttHeader();
  for(const t of tasks){const lines=wrap(`${t.deliveryUnit??1} / ${t.target} / ${t.name}`,labelW-6,8);let offset=0;
   while(offset<lines.length){if(BOTTOM-y<18){newPage('ガントチャート');ganttHeader();}const count=Math.max(1,Math.min(lines.length-offset,Math.floor((BOTTOM-y-6)/11))),height=Math.max(17,count*11+6);
    rect(M,y,labelW,height);lines.slice(offset,offset+count).forEach((s,k)=>text(s,M+3,y+3+k*11,8));
    dates.forEach((s,j)=>{const x=M+labelW+j*dayW;rect(x,y,dayW,height,isOff(s,p.settings)?off:undefined);let used=0;
     for(const slot of t.slots.filter(e=>e.date===s)){const barX=x+used*dayW,barW=slot.amount*dayW,barY=y+(height-9)/2;page.drawRectangle({x:barX,y:H-barY-9,width:barW,height:9,color:hex(color(t))});if(slot.phase==='buffer'){for(let k=0;k<barW;k+=3)page.drawLine({start:{x:barX+k,y:H-barY-9},end:{x:barX+Math.min(k+3,barW),y:H-barY},thickness:.7,color:rgb(1,1,1)});}used+=slot.amount;}
    });y+=height;offset+=count;
   }
  }y+=12;
 }
 const pages=doc.getPages();pages.forEach((pg,i)=>{page=pg;text(`${i+1} / ${pages.length}`,W-47,H-15,8);});
 doc.setTitle(p.name);doc.setCreator('日々計画');return doc.save();
}
