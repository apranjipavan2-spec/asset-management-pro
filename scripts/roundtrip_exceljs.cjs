'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.xlsx'));
  const ws = wb.worksheets[0];
  console.log('Sheet:', ws.name, ' rows:', ws.rowCount, ' cols:', ws.columnCount);

  // Header row 3 + first data row inspection
  const hdrRow = ws.getRow(3);
  console.log('\n-- Header row 3 styles --');
  for (let c = 1; c <= 21; c++) {
    const cell = hdrRow.getCell(c);
    const fill = cell.fill ? JSON.stringify(cell.fill).slice(0,90) : '';
    const font = cell.font ? JSON.stringify({b:cell.font.bold,sz:cell.font.size,c:cell.font.color}) : '';
    const border = cell.border ? 'borders' : '';
    console.log(`  ${cell.address} v="${String(cell.value||'').slice(0,28)}" font=${font} fill=${fill} ${border}`);
  }
  console.log('\n-- Data row 4 styles --');
  const dataRow = ws.getRow(4);
  for (let c = 1; c <= 21; c++) {
    const cell = dataRow.getCell(c);
    const numFmt = cell.numFmt || '';
    const border = cell.border ? 'borders' : '';
    console.log(`  ${cell.address} v=${JSON.stringify(cell.value).slice(0,40)} numFmt="${numFmt}" ${border}`);
  }

  // Formula count
  let fcount = 0;
  ws.eachRow((row) => row.eachCell((cell) => { if (cell.formula) fcount++; }));
  console.log('\nFormula cells:', fcount);

  // Column widths
  console.log('\nColumn widths:');
  ws.columns.forEach((col, i) => {
    if (col && col.width) console.log(`  col ${String.fromCharCode(65+i)}: width=${col.width}`);
  });

  // Write to tmp and re-read to verify round-trip
  const tmp = path.resolve('Asset New data/Asset for Finance/roundtrip_test.xlsx');
  await wb.xlsx.writeFile(tmp);

  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile(tmp);
  const ws2 = wb2.worksheets[0];
  let fcount2 = 0;
  ws2.eachRow((row) => row.eachCell((cell) => { if (cell.formula) fcount2++; }));
  console.log('\nRound-trip formula cells:', fcount2, fcount2 === fcount ? '✓' : '✗ MISMATCH');

  // Spot-check that styles survived
  console.log('\nRound-trip header row 3 fills:');
  const hdrRow2 = ws2.getRow(3);
  for (const c of [1,3,6,11,15,16]) {
    const cell = hdrRow2.getCell(c);
    const fill = cell.fill ? JSON.stringify(cell.fill).slice(0,80) : '(none)';
    console.log(`  ${cell.address}: ${fill}`);
  }

  // Clean up
  require('fs').unlinkSync(tmp);
  console.log('\nRound-trip OK.');
})().catch(e => { console.error(e); process.exit(1); });
