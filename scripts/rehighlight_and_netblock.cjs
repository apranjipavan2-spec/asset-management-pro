/**
 * Three changes in one pass:
 *
 *  1) Re-highlight column J (Acc Dep Opening) vs column W (calculated):
 *     highlight only when |stored - calc| > ₹5. Clear all prior J/W fills first.
 *
 *  2) Highlight column K (existing Dep - Cost) vs column V (calculated):
 *     highlight only when |K - V| > ₹5.
 *
 *  3) Add column X "Calculated Net Block (A-B)" = F - W. Compare against
 *     column O (stored Net Block FY 24-25). Highlight O+X when they differ
 *     by more than ₹5.
 *
 * Net Block (A-B) intent: A = Gross Block Opening (F), B = Acc Dep Opening
 * (J or our calculated W). O is the carried-forward closing net block of
 * FY 24-25. X uses our theoretically correct W instead of stored J, so the
 * X vs O comparison surfaces rows where O is "stale" because J is wrong.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');
const TOLERANCE = 5; // rupees

function num(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'result' in v) return Number(v.result) || 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseRefinedDate(s) {
  if (!s || s === 'Unknown') return null;
  const m = String(s).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  return { d: +m[1], m: +m[2], y: +m[3] };
}
function fyOf(d) { return d.m >= 4 ? d.y : d.y - 1; }

function computeAccDepOpening(cost, rate, dt) {
  const purchaseFY = fyOf(dt);
  if (purchaseFY >= 2025) return 0;
  const yearsTotal = 2024 - purchaseFY + 1;
  const firstYearFactor = (dt.m >= 4 && dt.m <= 9) ? 1.0 : 0.5;
  let wdv = cost;
  wdv = wdv - (wdv * rate * firstYearFactor);
  for (let i = 1; i < yearsTotal; i++) wdv = wdv - (wdv * rate);
  return cost - wdv;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  const noFill = { type: 'pattern', pattern: 'none' };
  const fillJ  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFAB91' } }; // orange — J/W mismatch
  const fillK  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB39DDB' } }; // soft purple — K/V mismatch
  const fillO  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF80CBC4' } }; // soft teal — O/X mismatch

  // Step 0: clear any prior fills on J, W, K, V (we set them fresh)
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    for (const c of [10, 23, 11, 22]) row.getCell(c).fill = noFill;
  }

  // Header for column X — match O's style
  const oHeader = ws.getRow(3).getCell(15);
  const xHeader = ws.getRow(3).getCell(24);
  xHeader.value = 'Calculated Net Block (A-B)';
  if (oHeader.style) xHeader.style = JSON.parse(JSON.stringify(oHeader.style));
  xHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }; // pale green — derived

  // Match column O width
  const oCol = ws.getColumn(15);
  const xCol = ws.getColumn(24);
  if (oCol.width) xCol.width = oCol.width;

  // Counters & samples
  let jwHits = 0, kvHits = 0, oxHits = 0;
  const kvSamples = [], oxSamples = [];

  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;

    const F = num(row.getCell(6).value);
    const G = num(row.getCell(7).value);
    const C = num(row.getCell(3).value);
    const J = num(row.getCell(10).value);
    const K = num(row.getCell(11).value);
    const O = num(row.getCell(15).value);
    const V = num(row.getCell(22).value);
    const W = num(row.getCell(23).value);
    const refD = String(row.getCell(5).value || '');
    const dt = parseRefinedDate(refD);
    const id = String(row.getCell(1).value || '').slice(0, 35);

    // ---- (1) J vs W: highlight when |diff| > ₹5 ----
    // W is blank where we couldn't compute — only compare when W has a value
    const wHasValue = row.getCell(23).value != null && row.getCell(23).value !== '';
    if (wHasValue && Math.abs(J - W) > TOLERANCE) {
      row.getCell(10).fill = fillJ;
      row.getCell(23).fill = fillJ;
      jwHits++;
    }

    // ---- (2) K vs V: highlight when |diff| > ₹5 ----
    if (Math.abs(K - V) > TOLERANCE) {
      row.getCell(11).fill = fillK;
      row.getCell(22).fill = fillK;
      kvHits++;
      if (kvSamples.length < 30) kvSamples.push({ r, id, refD, K, V, diff: V - K });
    }

    // ---- (3) Column X = F - W (calculated Net Block A-B) ----
    const xCell = row.getCell(24);
    // Style to match O
    const oCell = row.getCell(15);
    if (oCell.style) xCell.style = JSON.parse(JSON.stringify(oCell.style));

    // Only compute X when we have all inputs
    let xVal = null;
    if (dt && F > 0 && C > 0) {
      const wComputed = computeAccDepOpening(F, C, dt);
      xVal = F - wComputed;
      xCell.value = Math.round(xVal * 100) / 100;
    } else {
      xCell.value = null;
    }

    // ---- Compare O vs X ----
    if (xVal != null && Math.abs(O - xVal) > TOLERANCE) {
      row.getCell(15).fill = fillO;
      row.getCell(24).fill = fillO;
      oxHits++;
      if (oxSamples.length < 30) oxSamples.push({ r, id, refD, O, X: xVal, diff: xVal - O });
    }
  }

  await wb.xlsx.writeFile(FILE);

  console.log('='.repeat(80));
  console.log('Re-highlight + Net Block column X added');
  console.log('='.repeat(80));
  console.log(`Tolerance for highlight: |diff| > ₹${TOLERANCE}`);
  console.log('');
  console.log(`J vs W mismatches (Acc Dep Opening)        : ${jwHits} rows  [orange]`);
  console.log(`K vs V mismatches (Depreciation - Cost)    : ${kvHits} rows  [purple]`);
  console.log(`O vs X mismatches (Net Block A-B)          : ${oxHits} rows  [teal]`);
  console.log('');

  console.log('--- Sample: K vs V (existing Dep vs new calculated Dep) ---');
  console.log('row | id                                 | date       |        K |        V |   diff (V-K)');
  console.log('-'.repeat(110));
  for (const x of kvSamples.slice(0, 20)) {
    console.log(`${String(x.r).padStart(3)} | ${x.id.padEnd(35)} | ${x.refD.padEnd(10)} | ${x.K.toFixed(2).padStart(9)} | ${x.V.toFixed(2).padStart(9)} | ${x.diff.toFixed(2).padStart(12)}`);
  }
  if (kvSamples.length > 20) console.log(`  ... and ${kvSamples.length - 20} more`);

  console.log('');
  console.log('--- Sample: O vs X (stored Net Block vs calculated F-W) ---');
  console.log('row | id                                 | date       |        O |        X |   diff (X-O)');
  console.log('-'.repeat(110));
  for (const x of oxSamples.slice(0, 20)) {
    console.log(`${String(x.r).padStart(3)} | ${x.id.padEnd(35)} | ${x.refD.padEnd(10)} | ${x.O.toFixed(2).padStart(9)} | ${x.X.toFixed(2).padStart(9)} | ${x.diff.toFixed(2).padStart(12)}`);
  }
  if (oxSamples.length > 20) console.log(`  ... and ${oxSamples.length - 20} more`);

  console.log('');
  console.log(`File saved: ${FILE}`);
})().catch(e => { console.error(e); process.exit(1); });
