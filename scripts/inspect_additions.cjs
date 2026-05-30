'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.xlsx'));
  const ws = wb.worksheets[0];

  // Walk all rows where Additions (G) > 0 OR row has additions and net block open zero
  console.log('row | id (truncated)               | acqDate    | refined  | grossOpen | additions | dispC | accDepOpen | netFY25(O) | rate | depCost(K) | netFY26(P)');
  console.log('-'.repeat(170));
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const id   = String(row.getCell(1).value || '').slice(0,30);
    const acqD = row.getCell(4).value;
    const refD = row.getCell(5).value;
    const grOp = row.getCell(6).value;
    const add  = row.getCell(7).value;
    const dispC= row.getCell(8).value;
    const accD = row.getCell(10).value;
    const rate = row.getCell(3).value;
    const netO = row.getCell(15).value;
    const depK = row.getCell(11).value;
    const netP = row.getCell(16).value;
    if (!add || (typeof add === 'number' && add <= 0)) continue;
    const ds = acqD instanceof Date ? acqD.toISOString().slice(0,10) : String(acqD||'');
    const depKv = depK && depK.result != null ? depK.result : (typeof depK === 'number' ? depK : '');
    const netPv = netP && netP.result != null ? netP.result : (typeof netP === 'number' ? netP : '');
    console.log(`${String(r).padStart(3)} | ${id.padEnd(30)} | ${ds.padEnd(10)} | ${String(refD||'').padEnd(8)} | ${String(grOp||'').padStart(9)} | ${String(add).padStart(9)} | ${String(dispC||'').padStart(5)} | ${String(accD||'').padStart(10).slice(0,10)} | ${String(netO||'').padStart(10).slice(0,10)} | ${rate} | ${String(depKv).padStart(10).slice(0,10)} | ${String(netPv).padStart(10).slice(0,10)}`);
  }
})();
