/**
 * Compare column V (Calculated Depreciation, new) against column K
 * (Depreciation - Cost, existing). Identify rows where they differ
 * and explain why.
 *
 * Expected logic:
 *   K = O * C
 *   V = (O*C) + (G*C*factor), factor = 0.5 for Oct25-Mar26, else 1
 *
 *   - If G = 0 (no additions): V should equal K
 *   - If G > 0 (new addition):  V > K by (G * C * factor)
 *   - K is 0 for new additions where O is blank (this is the bug V fixes)
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];

  function num(c) {
    if (c == null) return 0;
    if (typeof c === 'number') return c;
    if (typeof c === 'object' && 'result' in c) return Number(c.result || 0);
    const n = Number(c);
    return Number.isFinite(n) ? n : 0;
  }

  let matches = 0, diffNewAdd = 0, diffOther = 0;
  let sumK = 0, sumV = 0;
  const diffRows = [];

  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;

    const O = num(row.getCell(15).value);
    const G = num(row.getCell(7).value);
    const C = num(row.getCell(3).value);
    const K = num(row.getCell(11).value);
    const V = num(row.getCell(22).value);
    const refD = String(row.getCell(5).value || '');

    sumK += K; sumV += V;

    const dlt = Math.abs(V - K);
    if (dlt < 0.01) { matches++; continue; }

    if (G > 0) diffNewAdd++;
    else diffOther++;

    if (diffRows.length < 40) {
      let factor = 1.0;
      const m = refD.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (m) {
        const ym = parseInt(m[3],10)*100 + parseInt(m[2],10);
        if (ym >= 202510 && ym <= 202603) factor = 0.5;
      }
      diffRows.push({ r, refD, O, G, C, K, V, diff: V-K, factor, expected: O*C + G*C*factor });
    }
  }

  console.log(`Total rows: ${matches + diffNewAdd + diffOther}`);
  console.log(`  V == K (match):                     ${matches}`);
  console.log(`  V > K because of new additions:     ${diffNewAdd}`);
  console.log(`  V != K for other reasons:           ${diffOther}`);
  console.log('');
  console.log(`Sum K = ₹${sumK.toFixed(2)}`);
  console.log(`Sum V = ₹${sumV.toFixed(2)}`);
  console.log(`Diff  = ₹${(sumV - sumK).toFixed(2)}   (extra depreciation V picks up)`);
  console.log('');
  console.log('--- Rows where V differs from K ---');
  console.log('row | refDate    | O (net25)  | G (add)   | C    | K (existing) | V (new)   | factor | sanity check');
  console.log('-'.repeat(130));
  for (const x of diffRows) {
    const sanity = Math.abs(x.V - x.expected) < 0.01 ? '✓' : `✗ expected ${x.expected.toFixed(2)}`;
    console.log(`${String(x.r).padStart(3)} | ${x.refD.padEnd(10)} | ${x.O.toFixed(2).padStart(10)} | ${x.G.toFixed(0).padStart(9)} | ${x.C.toFixed(2)} | ${x.K.toFixed(2).padStart(12)} | ${x.V.toFixed(2).padStart(9)} | ${x.factor}   | ${sanity}`);
  }
})();
