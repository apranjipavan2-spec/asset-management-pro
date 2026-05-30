'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];
  for (const c of [22, 23, 24, 25, 26, 27, 28]) {
    const colLetter = c <= 26 ? String.fromCharCode(64 + c) : 'A' + String.fromCharCode(64 + c - 26);
    const header = ws.getRow(3).getCell(c).value;
    const v4 = ws.getRow(4).getCell(c).value;
    console.log(`Col ${colLetter} (${c}) header="${header}"`);
    if (v4 && typeof v4 === 'object' && 'formula' in v4) {
      console.log(`  R4 formula: ${v4.formula}`);
      console.log(`  R4 result : ${JSON.stringify(v4.result)}`);
    } else {
      console.log(`  R4 value: ${JSON.stringify(v4)}`);
    }
    // Find a row with #VALUE! result
    for (let r = 5; r <= 379; r++) {
      const v = ws.getRow(r).getCell(c).value;
      if (v && typeof v === 'object') {
        const res = v.result;
        if (res && typeof res === 'object' && res.error) {
          console.log(`  Sample error at R${r}: ${JSON.stringify(res)}, formula=${v.formula || v.sharedFormula}`);
          break;
        }
      }
    }
    console.log('');
  }
})();
