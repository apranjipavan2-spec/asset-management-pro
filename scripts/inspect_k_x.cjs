'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.auto.xlsx'));
  const ws = wb.worksheets[0];
  for (const r of [4, 5, 10, 50, 200]) {
    const row = ws.getRow(r);
    for (const [letter, col] of [['K', 11], ['V', 22], ['W', 23], ['X', 24], ['Y', 25]]) {
      const v = row.getCell(col).value;
      let s;
      if (v == null) s = 'null';
      else if (typeof v === 'object') {
        if ('formula' in v) s = `=${v.formula}  →  ${v.result}`;
        else if ('sharedFormula' in v) s = `SHARED =${v.sharedFormula}  →  ${v.result}`;
        else s = JSON.stringify(v).slice(0, 100);
      } else s = String(v);
      console.log(`r${r} ${letter}: ${s.slice(0, 200)}`);
    }
    console.log('');
  }
})();
