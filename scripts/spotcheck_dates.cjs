'use strict';
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');

const wb = XLSX.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.original.xlsx'),
                         { cellDates: true, cellFormula: true });
const ws = wb.Sheets[wb.SheetNames[0]];

(async () => {
  const ewb = new ExcelJS.Workbook();
  await ewb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ews = ewb.worksheets[0];

  // Sample diverse rows
  const rows = [4, 11, 12, 99, 143, 152, 154, 218, 219, 269, 311, 354, 361, 378, 379];
  console.log('row | Excel D.w        | New E (refined) | Decoded            | match?');
  console.log('-'.repeat(90));
  for (const r of rows) {
    const w = ws['D'+r] ? (ws['D'+r].w || ws['D'+r].v || '') : '';
    const e = ews.getRow(r).getCell(5).value;
    // Decode E "DD-MM-YYYY" back to human ("DD Mon YYYY")
    const m = String(e||'').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    let decoded;
    if (m) {
      const mn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[2]-1];
      decoded = `${+m[1]} ${mn} ${m[3]}`;
    } else decoded = String(e||'');
    console.log(`${String(r).padStart(3)} | ${String(w).padEnd(18)} | ${String(e||'').padEnd(15)} | ${decoded.padEnd(18)} |`);
  }
})();
