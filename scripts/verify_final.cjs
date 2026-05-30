'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];

  const errCount = {};
  for (let r = 4; r <= 379; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    for (let c = 22; c <= 28; c++) {
      const v = row.getCell(c).value;
      if (v && typeof v === 'object') {
        const res = v.result;
        if (res && typeof res === 'object' && res.error) {
          const col = c <= 26 ? String.fromCharCode(64+c) : 'A'+String.fromCharCode(64+c-26);
          errCount[col] = (errCount[col] || 0) + 1;
        }
      }
    }
  }
  console.log('Remaining #VALUE!/error cells per column (V..AB):');
  if (Object.keys(errCount).length === 0) console.log('  NONE — all clean.');
  else for (const k of Object.keys(errCount)) console.log(`  ${k}: ${errCount[k]}`);

  // Spot-check first 3 data rows
  console.log('\nSpot check (first 3 data rows):');
  for (const r of [4, 5, 6]) {
    const row = ws.getRow(r);
    const id = String(row.getCell(1).value).slice(0, 30);
    const F = row.getCell(6).value;
    const O = row.getCell(15).value;
    const V = row.getCell(22).value;
    const W = row.getCell(23).value;
    const X = row.getCell(24).value;
    const Vr = V && typeof V === 'object' ? V.result : V;
    const Wr = W && typeof W === 'object' ? W.result : W;
    const Xr = X && typeof X === 'object' ? X.result : X;
    console.log(`  R${r} ${id.padEnd(30)} | F=${F} | O=${O} | V=${Vr} | W=${Wr} | X=${Xr}`);
  }

  // Defined names sanity
  console.log('\nRemaining defined names:');
  if (wb.definedNames && wb.definedNames.model) {
    for (const n of wb.definedNames.model) console.log(`  ${JSON.stringify(n)}`);
  }
})();
