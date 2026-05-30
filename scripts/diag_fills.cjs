'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];
  let withFill = 0, sample = [];
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    for (let c = 1; c <= 24; c++) {
      const cell = row.getCell(c);
      if (cell.fill) {
        const f = cell.fill;
        const hasColor = (f.fgColor && f.fgColor.argb && f.fgColor.argb !== '00000000') || (f.pattern && f.pattern !== 'none');
        if (hasColor) {
          withFill++;
          if (sample.length < 8) sample.push({ r, c, fill: JSON.stringify(f) });
        }
      }
    }
  }
  console.log(`Cells with non-default fill: ${withFill}`);
  for (const s of sample) console.log(`  r=${s.r} c=${s.c}: ${s.fill}`);
})();
