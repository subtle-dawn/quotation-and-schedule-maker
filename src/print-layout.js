import {date,add,days,key} from './engine.js';
export function printMonths(start,end){
 const months=[];const d=date(start.slice(0,7)+'-01'),last=(end||start).slice(0,7);
 while(key(d).slice(0,7)<=last){months.push(key(d).slice(0,7));d.setMonth(d.getMonth()+1);}return months;
}
export function printRanges(start,end){
 if(!end)return [];
 const ranges=[];for(let s=start;s<=end;s=add(s,28))ranges.push({start:s,span:Math.min(28,days(s,end)+1)});return ranges;
}
