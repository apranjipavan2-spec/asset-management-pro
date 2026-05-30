/**
 * Highlight column D cells that use American M/D/YY display format.
 * These are visually ambiguous against the DD/MM/YY convention used locally
 * (e.g. "1/5/22" could be misread as 1-May-22, but is actually 5-Jan-22).
 *
 * Applies a yellow background to col D AND col E for each affected row so
 * reviewers can easily spot them. The Refined Aquis Date in col E already
 * shows the unambiguous DD-MM-YYYY interpretation.
 */
'use strict';
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');

const ORIG = path.resolve('Asset New data/Asset for Finance/Asset Finance.original.xlsx');
const OUT  = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');

// 1) Find rows whose original column D display matches American M/D/YY
const wb = XLSX.readFile(ORIG, { cellDates: true, cellFormula: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const AMERICAN = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const rows = [];
for (let r = 4; r <= 379; r++) {
  const cell = ws['D' + r];
  if (!cell) continue;
  const disp = (cell.w != null) ? String(cell.w) : '';
  if (AMERICAN.test(disp.trim())) rows.push({ r, disp: disp.trim() });
}
console.log(`Found ${rows.length} cells in column D using American M/D/YY format`);

// 2) Highlight those D and E cells in the output file
(async () => {
  const ewb = new ExcelJS.Workbook();
  await ewb.xlsx.readFile(OUT);
  const ews = ewb.worksheets[0];

  // Yellow fill — common attention color, preserves text readability
  const yellow = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFEB3B' },     // bright yellow
  };

  for (const { r } of rows) {
    const row = ews.getRow(r);
    for (const col of [4, 5]) {        // D and E
      const cell = row.getCell(col);
      cell.fill = yellow;
    }
  }

  // Optional: also mark the header E3 with a small note so it's discoverable.
  // (No — keep header pristine; user only asked for the affected data cells.)

  await ewb.xlsx.writeFile(OUT);
  console.log(`Highlighted ${rows.length} rows (columns D & E) in ${OUT}`);
  console.log('\nSample of highlighted rows:');
  for (const { r, disp } of rows.slice(0, 10)) {
    console.log(`  row ${r}: D="${disp}"  →  E="${ews.getRow(r).getCell(5).value}"`);
  }
  if (rows.length > 10) console.log(`  ... and ${rows.length-10} more`);
})().catch(e => { console.error(e); process.exit(1); });
