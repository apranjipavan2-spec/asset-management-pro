/**
 * Read the actual cell formulas in columns V and W of both files
 * so we know what the "manual" calc really does.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

function describe(cell) {
  const v = cell.value;
  if (v == null) return 'null';
  if (typeof v === 'object') {
    if ('formula' in v) return `FORMULA: =${v.formula}  →  ${v.result ?? '?'}`;
    if ('sharedFormula' in v) return `SHARED: =${v.sharedFormula}  →  ${v.result ?? '?'}`;
    if ('result' in v) return `(obj result) ${v.result}`;
    return JSON.stringify(v).slice(0, 80);
  }
  return `value: ${v}`;
}

(async () => {
  const base = 'Asset New data/Asset for Finance';
  for (const name of ['Asset Finance.with_calc.xlsx', 'Asset Finance.with_calc.auto.xlsx']) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path.resolve(base, name));
    const ws = wb.worksheets[0];
    console.log(`\n=== ${name} ===`);
    for (const r of [4, 5, 10, 50, 200]) {
      const row = ws.getRow(r);
      console.log(`row ${r} id="${row.getCell(1).value || ''}"`);
      for (const [letter, col] of [['C',3],['F',6],['G',7],['I',9],['J',10],['K',11],['L',12],['V',22],['W',23],['X',24],['Y',25]]) {
        console.log(`   ${letter}: ${describe(row.getCell(col))}`);
      }
    }
  }
})();
