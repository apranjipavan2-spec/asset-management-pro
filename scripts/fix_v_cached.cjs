/**
 * Recompute the cached `.result` value of column V for every row.
 *
 * Rows 209, 210, 211 have column C as a formula (`=15%`). My earlier scripts
 * did `Number(cell.value || 0)`, which yields NaN on a `{formula,result}` object
 * → ultimately stored 0 in V's cached result. The FORMULA text in V is
 * correct (Excel will recompute on open), but the cached value shown in the
 * file before recalculation was wrong.
 *
 * This script reads each cell's effective numeric value (unwrapping formulas
 * to their `.result`) and updates V's cached result. Formula text untouched.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const OUT = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');

function num(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'result' in v) return Number(v.result) || 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(OUT);
  const ws = wb.worksheets[0];

  let updated = 0;
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;

    const O = num(row.getCell(15).value);
    const G = num(row.getCell(7).value);
    const C = num(row.getCell(3).value);
    const refD = String(row.getCell(5).value || '');

    let factor = 1.0;
    if (refD !== 'Unknown') {
      const m = refD.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (m) {
        const ym = parseInt(m[3],10) * 100 + parseInt(m[2],10);
        if (ym >= 202510 && ym <= 202603) factor = 0.5;
      }
    }
    const correctResult = (O * C) + (G * C * factor);

    const v = row.getCell(22).value;
    if (v && typeof v === 'object' && 'formula' in v) {
      const cur = v.result;
      if (cur == null || Math.abs(cur - correctResult) > 0.005) {
        row.getCell(22).value = { formula: v.formula, result: correctResult };
        updated++;
      }
    }
  }
  await wb.xlsx.writeFile(OUT);
  console.log(`Updated cached result on ${updated} cell(s) of column V.`);
})().catch(e => { console.error(e); process.exit(1); });
