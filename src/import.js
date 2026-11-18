import * as XLSX from 'xlsx/xlsx.mjs';
import {validate} from './engine.js';
const norm=s=>String(s??'').replace(/[\s　]/g,'');
function excelDate(v){if(typeof v==='number'){const p=XLSX.SSF.parse_date_code(v);return p?`${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`:null;}return /^\d{4}-\d{2}-\d{2}$/.test(v)?v:null;}
export function importExcel(data,filename){
 const book=XLSX.read(data,{type:'array'});let rows,header,found;
 for(const name of book.SheetNames){const r=XLSX.utils.sheet_to_json(book.Sheets[name],{header:1,defval:''});const index=r.findIndex(row=>row.some(c=>['工程・納品物','工程','作業名','タスク名'].includes(norm(c)))&&row.some(c=>['制作日','制作日数','基本日数','工数'].includes(norm(c))));if(index>=0){rows=r;header=r[index].map(norm);found=index;break;}}
 if(!rows)throw Error('「工程・納品物」と「制作日」の列がある表を見つけられませんでした。READMEの対応形式をご確認ください。');
 const col=(names)=>header.findIndex(h=>names.includes(h));
 const fields={name:col(['工程・納品物','工程','作業名','タスク名']),work:col(['制作日','制作日数','基本日数','工数']),buffer:col(['予備日','予備日数']),target:col(['キャラクター／対象','キャラクター/対象','対象']),category:col(['分類']),request:col(['つなぐ仕事依頼','案件','依頼名']),deliveryUnit:col(['納品単位'])};
 let rate=10000,start='';const warnings=[];
 const settingsSheet=book.Sheets['単価・設定'];
 if(settingsSheet){const settingsRows=XLSX.utils.sheet_to_json(settingsSheet,{header:1,defval:''});for(const row of settingsRows){if(norm(row[0]).startsWith('日当')&&typeof row[1]==='number')rate=row[1];if(norm(row[0]).startsWith('着手日'))start=excelDate(row[1])||'';}}
 if(!start)start=new Date().toLocaleDateString('sv-SE');
 const tasks=[];
 for(let i=found+1;i<rows.length;i++){const row=rows[i];if(!String(row[fields.name]??'').trim())continue;
 const numeric=(field,optional)=>{const v=fields[field]<0?'':row[fields[field]];if(optional&&(v===''||v==null))return 0;if(v===''||v==null||!Number.isFinite(Number(v)))throw Error(`${i+1}行目の${field==='work'?'制作日':'予備日'}が数値ではありません。`);return Number(v);};
 const deliveryUnit=fields.deliveryUnit<0||row[fields.deliveryUnit]===''||row[fields.deliveryUnit]==null?1:Number(row[fields.deliveryUnit]);
 tasks.push({id:crypto.randomUUID(),name:String(row[fields.name]),work:numeric('work',false),buffer:numeric('buffer',true),deliveryUnit,target:String(row[fields.target>=0?fields.target:fields.category]??''),category:String(row[fields.category]??''),request:String(row[fields.request]??'')});}
 if(!tasks.length)throw Error('取り込める工程がありません。');
 warnings.push('金曜・日曜を休業日に設定しました。元ファイルのカレンダーや予定完了日は取り込まず、日数から再計算します。');
 const project={version:1,name:filename.replace(/\.(xlsx|xls|csv)$/i,''),settings:{rate,start,offDays:[0,5],holidays:[]},tasks};
 return {project:validate(project),warnings};
}
