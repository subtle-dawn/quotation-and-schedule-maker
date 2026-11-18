import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PDFDocument,PDFName} from 'pdf-lib';
import {createPdf} from '../src/pdf.js';
import {schedule} from '../src/engine.js';
test('PDFはA4横向き固定で3セクションを別ページにし、フォントを埋め込む',async()=>{
 const p={version:1,name:'PDF検証',settings:{start:'2026-11-16',rate:10000,offDays:[0,5],holidays:[]},tasks:[{id:'1',target:'テスト',category:'',request:'',name:'日本語の工程 A1',deliveryUnit:1,work:2,buffer:1}]};
 const bytes=await createPdf(p,schedule(p),fs.readFileSync(new URL('../src/assets/fonts/NotoSansJP-Regular.ttf',import.meta.url)),()=> '#648a79');
 const doc=await PDFDocument.load(bytes);assert.equal(doc.getPageCount(),3);assert.equal(doc.getTitle(),'PDF検証');for(const page of doc.getPages()){assert.equal(page.getWidth(),841.89);assert.equal(page.getHeight(),595.28);assert.ok(page.node.Resources().get(PDFName.of('Font')));}
});
