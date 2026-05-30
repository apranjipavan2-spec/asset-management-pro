'use strict';
const XLSX = require('xlsx');
const path = require('path');
const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.xlsx');
const wb = XLSX.readFile(FILE, { cellDates: true, cellFormula: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });

// Inspect raw cell (not the JSON conversion) for col D = index 3
const range = XLSX.utils.decode_range(ws['!ref']);
function colLetter(i){ let s=''; i++; while(i){i--; s=String.fromCharCode(65+(i%26))+s; i=Math.floor(i/26);} return s; }

const samples = new Map();      // pattern → [{row, raw, type}]
const blanks = [];
for (let r = 3; r <= range.e.r; r++) {
  const addr = 'D' + (r+1);
  const cell = ws[addr];
  if (!cell || cell.v === null || cell.v === undefined || cell.v === '') {
    blanks.push(r+1);
    continue;
  }
  const v = cell.v;
  const t = cell.t;        // n=number, s=string, d=date
  let key;
  if (v instanceof Date) key = 'Date-object';
  else if (t === 'n') key = 'number(excel-serial)';
  else {
    const s = String(v);
    if (/^\d{1,2}\.\d{1,2}\.\d{2}$/.test(s)) key = 'DD.MM.YY';
    else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) key = 'DD.MM.YYYY';
    else if (/^[A-Z][a-z]{2}\s+[A-Z][a-z]{2}\s+\d+\s+\d{4}/.test(s)) key = 'JS-Date-string';
    else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) key = 'DD/MM/YY';
    else if (/^\d{4}-\d{2}-\d{2}/.test(s)) key = 'ISO';
    else key = 'OTHER';
  }
  if (!samples.has(key)) samples.set(key, []);
  samples.get(key).push({ row: r+1, raw: v, type: t, formatted: cell.w });
}

console.log('-- distinct date-format buckets in column D --');
for (const [k, list] of samples) {
  console.log(`\n[${k}]  count=${list.length}`);
  for (const s of list.slice(0,6)) console.log(`  row ${s.row}: type=${s.type} raw=${JSON.stringify(s.raw)} formatted=${JSON.stringify(s.formatted)}`);
  if (list.length>6) console.log(`  ... ${list.length-6} more`);
}
console.log(`\nblank rows: ${blanks.length}: ${blanks.join(', ')}`);
