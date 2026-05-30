/**
 * Look for anomalously high or suspicious values in columns W and X.
 *
 * Sanity rules we expect:
 *   W (Calculated Acc Dep Opening) must be ≤ F (Gross Block Opening).
 *     If W > F we've over-depreciated — that's a bug.
 *   X (Calculated Net Block A-B) = F - W, so X must be ≥ 0 and ≤ F.
 *     If X is negative, something's wrong upstream.
 *
 * Also flag rows where W or X spikes vs neighbours (e.g. W is several
 * times F — points to wrong rate or wrong date).
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

function num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'result' in v) {
    if (v.result === '' || v.result == null) return null;
    return Number(v.result) || 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];

  const flags = { wOverCost: [], xNegative: [], wOver90pct: [], jFarFromW: [] };

  for (let r = 4; r <= 379; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    const id = String(row.getCell(1).value || '').slice(0, 35);
    const F = num(row.getCell(6).value);
    const C = num(row.getCell(3).value);
    const J = num(row.getCell(10).value);
    const W = num(row.getCell(23).value);
    const X = num(row.getCell(24).value);
    const eVal = row.getCell(5).value;
    const eDisp = (eVal instanceof Date) ? eVal.toISOString().slice(0, 10) : String(eVal);

    if (W != null && F != null && W > F + 1) {
      flags.wOverCost.push({ r, id, eDisp, F, C, W, X });
    }
    if (X != null && X < -1) {
      flags.xNegative.push({ r, id, eDisp, F, W, X });
    }
    if (W != null && F > 0 && W > 0.9 * F) {
      flags.wOver90pct.push({ r, id, eDisp, F, C, W, pct: (W / F * 100).toFixed(1) });
    }
    if (W != null && J != null && Math.abs(W - J) > Math.max(100, 0.2 * Math.max(J, 1))) {
      flags.jFarFromW.push({ r, id, eDisp, F, C, J, W, diff: W - J });
    }
  }

  console.log('='.repeat(80));
  console.log('Anomaly check on columns W and X');
  console.log('='.repeat(80));
  console.log(`W > F (impossible — more depreciation than cost) : ${flags.wOverCost.length}`);
  console.log(`X < 0 (impossible — negative net block)          : ${flags.xNegative.length}`);
  console.log(`W > 90% of F (very high, suspicious)              : ${flags.wOver90pct.length}`);
  console.log(`|W - J| > 20% & > ₹100 (big gap from stored J)    : ${flags.jFarFromW.length}`);
  console.log('');

  if (flags.wOverCost.length) {
    console.log('--- W > F (rows to fix urgently) ---');
    console.log('row | id                                 | date       |        F |  rate |        W |        X');
    console.log('-'.repeat(110));
    for (const x of flags.wOverCost.slice(0, 20)) {
      console.log(`${String(x.r).padStart(3)} | ${x.id.padEnd(35)} | ${x.eDisp.padEnd(10)} | ${x.F.toFixed(2).padStart(9)} | ${x.C.toFixed(2)} | ${x.W.toFixed(2).padStart(9)} | ${String(x.X).padStart(9)}`);
    }
  }

  if (flags.wOver90pct.length) {
    console.log('\n--- W is > 90% of cost (very old asset OR wrong rate/date) ---');
    console.log('row | id                                 | date       |        F |  rate |        W |   %');
    console.log('-'.repeat(110));
    for (const x of flags.wOver90pct.slice(0, 30)) {
      console.log(`${String(x.r).padStart(3)} | ${x.id.padEnd(35)} | ${x.eDisp.padEnd(10)} | ${x.F.toFixed(2).padStart(9)} | ${x.C.toFixed(2)} | ${x.W.toFixed(2).padStart(9)} | ${x.pct}%`);
    }
    if (flags.wOver90pct.length > 30) console.log(`  ... and ${flags.wOver90pct.length - 30} more`);
  }

  if (flags.jFarFromW.length) {
    console.log('\n--- Top 20 rows where W differs most from stored J ---');
    flags.jFarFromW.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    console.log('row | id                                 | date       |        F |  rate |        J |        W |     diff');
    console.log('-'.repeat(130));
    for (const x of flags.jFarFromW.slice(0, 20)) {
      console.log(`${String(x.r).padStart(3)} | ${x.id.padEnd(35)} | ${x.eDisp.padEnd(10)} | ${x.F.toFixed(2).padStart(9)} | ${x.C.toFixed(2)} | ${x.J.toFixed(2).padStart(9)} | ${x.W.toFixed(2).padStart(9)} | ${x.diff.toFixed(2).padStart(9)}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
