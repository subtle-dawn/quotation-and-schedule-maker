import test from 'node:test';
import assert from 'node:assert/strict';
import {printMonths,printRanges} from '../src/print-layout.js';
test('カレンダーは年をまたいで完了月まで全月を含む',()=>{assert.deepEqual(printMonths('2026-11-16','2027-01-06'),['2026-11','2026-12','2027-01']);assert.deepEqual(printMonths('2026-11-16',null),['2026-11']);});
test('ガントは28日ずつ分割し、最終日を欠落・重複させない',()=>{assert.deepEqual(printRanges('2026-11-16','2027-01-06'),[{start:'2026-11-16',span:28},{start:'2026-12-14',span:24}]);assert.deepEqual(printRanges('2026-11-16','2026-12-13'),[{start:'2026-11-16',span:28}]);assert.deepEqual(printRanges('2026-11-16','2026-11-16'),[{start:'2026-11-16',span:1}]);assert.deepEqual(printRanges('2026-11-16',null),[]);});
