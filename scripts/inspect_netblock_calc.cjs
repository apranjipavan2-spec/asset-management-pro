/**
 * Inspect columns O (Net Block FY 24-25) and P (Net Block FY 25-26) in the
 * current with_calc workbook.
 *
 * Sanity checks:
 *   O should approximate F - J  (opening gross minus opening acc dep)
 *      i.e. last year's closing net block carried forward as this year's opening.
 *   P should be I - N            (closing gross minus closing acc dep)
 *
 * Reports rows where the relationship deviates significantly.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

function num(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'result' in v) return Number(v.result) || 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];

  // Check whether O and P are formulas or static
  let oFormula = 0, oStatic = 0, oBlank = 0;
  let pFormula = 0, pStatic = 0, pBlank = 0;
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    const o = row.getCell(15).value;
    const p = row.getCell(16).value;
    if (o == null || o === '') oBlank++;
    else if (typeof o === 'object' && 'formula' in o) oFormula++;
    else oStatic++;
    if (p == null || p === '') pBlank++;
    else if (typeof p === 'object' && 'formula' in p) pFormula++;
    else pStatic++;
  }
  console.log(`Column O: ${oFormula} formulas, ${oStatic} static, ${oBlank} blank`);
  console.log(`Column P: ${pFormula} formulas, ${pStatic} static, ${pBlank} blank`);
  console.log('');

  // Sanity check: O = F - J ?
  const oDiffs = [];
  let oExact = 0, oWithin1 = 0, oWithin5 = 0, oFar = 0;
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    const F = num(row.getCell(6).value);
    const J = num(row.getCell(10).value);
    const O = num(row.getCell(15).value);
    const expected = F - J;
    const diff = O - expected;
    const refVal = Math.max(Math.abs(O), Math.abs(expected));
    const pct = refVal > 0 ? Math.abs(diff) / refVal * 100 : (Math.abs(diff) < 1 ? 0 : 100);
    if (Math.abs(diff) < 1) oExact++;
    else if (pct < 1) oWithin1++;
    else if (pct < 5) oWithin5++;
    else {
      oFar++;
      const id = String(row.getCell(1).value || '').slice(0, 35);
      if (oDiffs.length < 20) oDiffs.push({ r, id, F, J, O, expected, diff, pct });
    }
  }
  console.log(`Column O sanity (should equal F - J):`);
  console.log(`  Exact (< ₹1):      ${oExact}`);
  console.log(`  Within 1%:         ${oWithin1}`);
  console.log(`  Within 5%:         ${oWithin5}`);
  console.log(`  > 5% off:          ${oFar}`);
  console.log('');
  if (oDiffs.length > 0) {
    console.log('--- Sample O discrepancies ---');
    console.log('row | id                                 |       F |      J |      O | expected (F-J) |   diff  |   %');
    console.log('-'.repeat(130));
    for (const x of oDiffs) {
      console.log(`${String(x.r).padStart(3)} | ${x.id.padEnd(35)} | ${x.F.toFixed(0).padStart(8)} | ${x.J.toFixed(0).padStart(8)} | ${x.O.toFixed(0).padStart(8)} | ${x.expected.toFixed(0).padStart(12)} | ${x.diff.toFixed(0).padStart(8)} | ${x.pct.toFixed(1)}%`);
    }
  }

  // Sanity check P = I - N (cached values)
  console.log('\nColumn P sanity (should equal I - N):');
  let pExact = 0, pWithin1 = 0, pFar = 0;
  const pDiffs = [];
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    const I = num(row.getCell(9).value);
    const N = num(row.getCell(14).value);
    const P = num(row.getCell(16).value);
    const expected = I - N;
    const diff = P - expected;
    const refVal = Math.max(Math.abs(P), Math.abs(expected));
    const pct = refVal > 0 ? Math.abs(diff) / refVal * 100 : (Math.abs(diff) < 1 ? 0 : 100);
    if (Math.abs(diff) < 1) pExact++;
    else if (pct < 1) pWithin1++;
    else {
      pFar++;
      const id = String(row.getCell(1).value || '').slice(0, 35);
      if (pDiffs.length < 10) pDiffs.push({ r, id, I, N, P, expected, diff, pct });
    }
  }
  console.log(`  Exact (< ₹1):  ${pExact}`);
  console.log(`  Within 1%:     ${pWithin1}`);
  console.log(`  > 1% off:      ${pFar}`);
  if (pDiffs.length > 0) {
    console.log('\n--- Sample P discrepancies ---');
    console.log('row | id                                 |       I |      N |      P | expected (I-N) |   diff  |   %');
    console.log('-'.repeat(130));
    for (const x of pDiffs) {
      console.log(`${String(x.r).padStart(3)} | ${x.id.padEnd(35)} | ${x.I.toFixed(0).padStart(8)} | ${x.N.toFixed(0).padStart(8)} | ${x.P.toFixed(0).padStart(8)} | ${x.expected.toFixed(0).padStart(12)} | ${x.diff.toFixed(0).padStart(8)} | ${x.pct.toFixed(1)}%`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
