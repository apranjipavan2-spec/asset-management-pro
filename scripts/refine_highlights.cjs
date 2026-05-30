/**
 * Re-classify the 136 highlighted American-format dates:
 *   - If one of the two numbers > 12  → day position is certain. No highlight.
 *   - If both numbers <= 12            → genuinely ambiguous M/D vs D/M. Keep yellow.
 *
 * Column E (the refined DD-MM-YYYY value) is correct in both cases because we
 * trust Excel's stored date. We only adjust the visual highlight on cells D and E.
 */
'use strict';
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');

const ORIG = path.resolve('Asset New data/Asset for Finance/Asset Finance.original.xlsx');
const OUT  = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');

const wb = XLSX.readFile(ORIG, { cellDates: true, cellFormula: true });
const ws = wb.Sheets[wb.SheetNames[0]];

const american = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
const ambiguous = [];     // rows to keep highlighted (both <=12)
const unambiguous = [];   // rows to clear highlight (one > 12)

for (let r = 4; r <= 379; r++) {
  const cell = ws['D' + r];
  if (!cell) continue;
  const disp = (cell.w != null ? String(cell.w) : '').trim();
  const m = disp.match(american);
  if (!m) continue;
  const a = +m[1], b = +m[2];
  if (a > 12 || b > 12) unambiguous.push({ r, disp });
  else                  ambiguous.push({ r, disp });
}

console.log(`American-format cells: ${ambiguous.length + unambiguous.length}`);
console.log(`  Truly ambiguous (both ≤ 12) — keep yellow:  ${ambiguous.length}`);
console.log(`  Unambiguous (one > 12) — clear highlight:    ${unambiguous.length}`);

(async () => {
  const ewb = new ExcelJS.Workbook();
  await ewb.xlsx.readFile(OUT);
  const ews = ewb.worksheets[0];

  // Clear fill on the unambiguous rows (cols D and E)
  for (const { r } of unambiguous) {
    const row = ews.getRow(r);
    for (const col of [4, 5]) row.getCell(col).fill = { type: 'pattern', pattern: 'none' };
  }

  // (yellow on ambiguous rows is already applied from the previous step — leave them)

  await ewb.xlsx.writeFile(OUT);

  // Report a sample of what's still flagged vs cleared
  console.log('\n--- Sample CLEARED (no longer highlighted) ---');
  for (const { r, disp } of unambiguous.slice(0, 8)) {
    console.log(`  row ${r}: D="${disp}"  →  E="${ews.getRow(r).getCell(5).value}"`);
  }
  if (unambiguous.length > 8) console.log(`  ... and ${unambiguous.length-8} more`);

  console.log('\n--- Sample STILL HIGHLIGHTED (truly ambiguous, both ≤ 12) ---');
  for (const { r, disp } of ambiguous.slice(0, 10)) {
    console.log(`  row ${r}: D="${disp}"  →  E="${ews.getRow(r).getCell(5).value}"  (verify whether ${disp.split('/')[0]} is month or day)`);
  }
  if (ambiguous.length > 10) console.log(`  ... and ${ambiguous.length-10} more`);
})().catch(e => { console.error(e); process.exit(1); });
