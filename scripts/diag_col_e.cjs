'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];

  const tally = { textDDMMYYYY: 0, unknown: 0, dateObj: 0, number: 0, blank: 0, other: 0 };
  const samples = { dateObj: [], other: [] };

  for (let r = 4; r <= 379; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    const v = row.getCell(5).value;
    if (v == null || v === '') { tally.blank++; continue; }
    if (v === 'Unknown') { tally.unknown++; continue; }
    if (typeof v === 'string') {
      if (/^\d{2}-\d{2}-\d{4}$/.test(v)) tally.textDDMMYYYY++;
      else { tally.other++; if (samples.other.length < 5) samples.other.push({ r, v }); }
      continue;
    }
    if (v instanceof Date) { tally.dateObj++; if (samples.dateObj.length < 5) samples.dateObj.push({ r, v: v.toISOString() }); continue; }
    if (typeof v === 'number') { tally.number++; continue; }
    tally.other++;
    if (samples.other.length < 5) samples.other.push({ r, v: JSON.stringify(v) });
  }

  console.log('Column E breakdown:');
  console.log(`  Text DD-MM-YYYY    : ${tally.textDDMMYYYY}`);
  console.log(`  "Unknown"          : ${tally.unknown}`);
  console.log(`  Date object        : ${tally.dateObj}`);
  console.log(`  Numeric            : ${tally.number}`);
  console.log(`  Blank              : ${tally.blank}`);
  console.log(`  Other              : ${tally.other}`);
  if (samples.dateObj.length) {
    console.log('\nSample Date-object cells (these are your new entries):');
    for (const s of samples.dateObj) console.log(`  row ${s.r}: ${s.v}`);
  }
  if (samples.other.length) {
    console.log('\nSample "other" cells:');
    for (const s of samples.other) console.log(`  row ${s.r}: ${s.v}`);
  }
})();
