'use strict';
const XLSX = require('xlsx');
const path = require('path');
const wb = XLSX.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.original.xlsx'),
                         { cellDates: true, cellFormula: true });
const ws = wb.Sheets[wb.SheetNames[0]];

// Tally what formats cell.w has
const buckets = new Map();
const samples = new Map();
for (let r = 4; r <= 379; r++) {
  const cell = ws['D' + r];
  if (!cell) { (buckets.get('NO-CELL')||buckets.set('NO-CELL',0).get('NO-CELL')); buckets.set('NO-CELL',(buckets.get('NO-CELL')||0)+1); continue; }
  const v = cell.v, w = cell.w, t = cell.t;
  const wstr = w == null ? '(no w)' : String(w);
  let key;
  if (v == null || String(v).trim()==='') key = 'BLANK';
  else if (w == null) key = `t=${t} no-w v=${String(v).slice(0,30)}`;
  else if (/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(wstr.trim())) key = 'DD-Mon-YY/YYYY';
  else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(wstr.trim())) key = 'DD.MM.YYYY';
  else if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(wstr.trim())) key = 'DD.MM.YY';
  else key = `OTHER: "${wstr.slice(0,30)}"`;
  buckets.set(key, (buckets.get(key)||0) + 1);
  if (!samples.has(key)) samples.set(key, []);
  if (samples.get(key).length < 3) samples.get(key).push({ row: r, t, v: String(v).slice(0,40), w: wstr });
}

for (const [k, c] of buckets) {
  console.log(`[${c}] ${k}`);
  for (const s of samples.get(k) || []) console.log(`     row ${s.row}: t=${s.t} v=${JSON.stringify(s.v)} w=${JSON.stringify(s.w)}`);
}
