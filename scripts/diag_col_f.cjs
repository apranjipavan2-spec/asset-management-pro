'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];
  const targets = [17, 38, 112, 129, 222, 266, 280, 282, 296, 304];
  for (const r of targets) {
    const row = ws.getRow(r);
    const f = row.getCell(6).value;
    const e = row.getCell(5).value;
    console.log(`row ${r}:`);
    console.log(`  E (date)  type=${typeof e} -> ${e instanceof Date ? e.toISOString() : JSON.stringify(e)}`);
    console.log(`  F (cost)  type=${typeof f} -> ${f instanceof Date ? '[Date] '+f.toISOString() : JSON.stringify(f)}`);
  }
})();
