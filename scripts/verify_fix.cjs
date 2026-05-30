'use strict';
const XLSX = require('xlsx');
const path = require('path');
const wb = XLSX.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.xlsx'),
                         { cellDates: true, cellFormula: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(ws['!ref']);

// Sample a mix of rows
const checkRows = [4, 5, 77, 90, 171, 218, 219, 269, 311, 354, 378, 379];
console.log('Spot-check — col D (Acq Date), col E (Refined Aquis Date), col T (Donor):\n');
console.log('row | D (raw)                                  | E (refined)         | T (donor)');
console.log('-'.repeat(110));
for (const r of checkRows) {
  const d = ws['D'+r]; const e = ws['E'+r]; const t = ws['T'+r];
  const dv = d ? (d.v instanceof Date ? d.v.toISOString().slice(0,10) : String(d.v)) : '';
  const ev = e ? String(e.v) : '';
  const tv = t ? String(t.v) : '';
  console.log(`${String(r).padStart(3)} | ${dv.padEnd(40)} | ${ev.padEnd(19)} | ${tv}`);
}

// Count column E non-blank
let eFilled = 0, eUnknown = 0, eBlank = 0;
let tUnknown = 0, tBlank = 0;
for (let r = 4; r <= range.e.r+1; r++) {
  const id = ws['A'+r]; if (!id || id.v==null || String(id.v).trim()==='') continue;
  const e = ws['E'+r]; const t = ws['T'+r];
  if (!e || e.v == null || String(e.v).trim()==='') eBlank++;
  else if (String(e.v).trim() === 'Unknown') eUnknown++;
  else eFilled++;
  if (!t || t.v == null || String(t.v).trim()==='') tBlank++;
  else if (String(t.v).trim() === 'Unknown') tUnknown++;
}
console.log(`\nColumn E summary: filled=${eFilled}  Unknown=${eUnknown}  blank=${eBlank}`);
console.log(`Column T summary: Unknown=${tUnknown}  blank=${tBlank}`);

// Verify formula count survived
let fcount = 0;
for (let r = range.s.r; r <= range.e.r; r++) {
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({r,c});
    if (ws[addr] && ws[addr].f) fcount++;
  }
}
console.log(`Formula cells preserved: ${fcount} (expected 2071)`);
