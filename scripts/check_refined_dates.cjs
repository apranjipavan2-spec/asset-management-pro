'use strict';
const XLSX = require('xlsx');
const path = require('path');
// Read from the ORIGINAL untouched file to compare against Excel's display
const wb = XLSX.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.original.xlsx'),
                         { cellDates: true, cellFormula: true });
const ws = wb.Sheets[wb.SheetNames[0]];

// And the current corrected file with what I wrote in column E
const wbCur = XLSX.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'),
                            { cellDates: true, cellFormula: true });
const wsCur = wbCur.Sheets[wbCur.SheetNames[0]];

// Compare cell.w (Excel display) of column D in the original  vs my refined value in column E (current)
console.log('row | Excel display (D.w) | My E value   | match?');
console.log('-'.repeat(70));
let mismatches = 0;
const buckets = new Map();
for (let r = 4; r <= 379; r++) {
  const dCell = ws['D' + r];
  const eCell = wsCur['E' + r];
  const display = dCell ? (dCell.w || String(dCell.v || '')).trim() : '';
  const refined = eCell ? String(eCell.v || '').trim() : '';

  // Map display "dd-MMM-yy" or "DD.MM.YYYY" or "DD.MM.YY" → "DD-MM-YYYY" for comparison
  let normalized = '';
  let m;
  if ((m = display.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/))) {
    const mm = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12}[m[2].slice(0,3)];
    let yy = parseInt(m[3]); if (yy < 100) yy = yy < 50 ? 2000+yy : 1900+yy;
    normalized = `${m[1].padStart(2,'0')}-${String(mm).padStart(2,'0')}-${yy}`;
  } else if ((m = display.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) {
    normalized = `${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}-${m[3]}`;
  } else if ((m = display.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/))) {
    let yy = parseInt(m[3]); yy = yy < 50 ? 2000+yy : 1900+yy;
    normalized = `${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}-${yy}`;
  } else {
    normalized = display;     // Unknown, Syson, etc.
  }

  const ok = normalized === refined || (refined === 'Unknown' && /^(Unknown|Syson|)$/.test(display));
  if (!ok) {
    mismatches++;
    if (mismatches <= 12) console.log(`${String(r).padStart(3)} | ${display.padEnd(20)} | ${refined.padEnd(12)} | NORM=${normalized}`);
  }
  const key = (dCell && dCell.t === 'd') ? 'Date-object' : 'String';
  if (!buckets.has(key)) buckets.set(key, { total: 0, mismatch: 0 });
  buckets.get(key).total++;
  if (!ok) buckets.get(key).mismatch++;
}
console.log(`\nTotal mismatches: ${mismatches}`);
console.log('Breakdown:');
for (const [k, v] of buckets) console.log(`  ${k}: ${v.mismatch}/${v.total} mismatched`);
