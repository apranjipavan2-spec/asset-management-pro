'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];
  console.log(`Sheet name        : ${ws.name}`);
  console.log(`actualRowCount    : ${ws.actualRowCount}`);
  console.log(`rowCount          : ${ws.rowCount}`);
  console.log(`actualColumnCount : ${ws.actualColumnCount}`);
  console.log(`columnCount       : ${ws.columnCount}`);
  console.log(`dimensions        : ${JSON.stringify(ws.dimensions)}`);
  console.log(`autoFilter        : ${JSON.stringify(ws.autoFilter)}`);
  console.log(`views             : ${JSON.stringify(ws.views)}`);
  console.log('');
  // Find any hidden rows
  let hidden = [];
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (row.hidden) hidden.push(r);
  }
  console.log(`Hidden rows: ${hidden.length}`);
  if (hidden.length) console.log(`  range: ${hidden[0]}..${hidden[hidden.length-1]} (sample: ${hidden.slice(0,15).join(',')}${hidden.length>15?'...':''})`);
  // Find rows with content past 379
  console.log('');
  console.log('Rows past 379 with any content:');
  let count = 0;
  for (let r = 380; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    let any = false;
    for (let c = 1; c <= 24; c++) {
      if (row.getCell(c).value != null && row.getCell(c).value !== '') { any = true; break; }
    }
    if (any) { count++; if (count <= 10) console.log(`  row ${r}: A=${row.getCell(1).value}`); }
  }
  console.log(`Total rows with content past 379: ${count}`);
})();
