/**
 * Compute the theoretical Acc Dep Opening Balance (column J) from first principles
 * and compare against the stored value.
 *
 * Method: WDV + half-year rule (the convention this file already follows in column V).
 *   Year-by-year:
 *     wdv = Cost
 *     wdv -= wdv * rate * firstYearFactor      // FY of purchase: 0.5 if Oct-Mar, else 1.0
 *     for each subsequent FY through FY 24-25:
 *       wdv -= wdv * rate                       // full year
 *   AccDepOpening = Cost - wdv
 *
 * Indian FY convention: FY YY-YY+1 runs Apr-1 to Mar-31. An asset purchased
 * on any date in FY F gets its first year of depreciation in FY F itself.
 * The asset has been depreciated from FY F through FY 24-25 (inclusive)
 * = (2024 - F + 1) years.
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

function parseRefinedDate(s) {
  if (!s || s === 'Unknown') return null;
  const m = String(s).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  return { d: +m[1], m: +m[2], y: +m[3] };
}

// FY (start year) for a given calendar date
function fyOf(d) { return d.m >= 4 ? d.y : d.y - 1; }

function computeAccDepOpening(cost, rate, dt) {
  // Asset purchased on dt. We want acc dep at end of FY 24-25 (= start of FY 25-26).
  const purchaseFY = fyOf(dt);
  if (purchaseFY >= 2025) return 0;       // bought in or after FY 25-26 → no opening acc dep
  const yearsTotal = 2024 - purchaseFY + 1;  // inclusive
  const firstYearFactor = (dt.m >= 4 && dt.m <= 9) ? 1.0 : 0.5;

  let wdv = cost;
  // first year (year of purchase)
  wdv = wdv - (wdv * rate * firstYearFactor);
  // remaining years
  for (let i = 1; i < yearsTotal; i++) wdv = wdv - (wdv * rate);

  return cost - wdv;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];

  const buckets = { exact: 0, within1pct: 0, within5pct: 0, far: 0, newAsset: 0, noDate: 0, noCost: 0, noRate: 0 };
  const samples = { far: [], within5pct: [], newAsset: [] };
  let totalStored = 0, totalCalc = 0;

  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    const cost = num(row.getCell(6).value);    // F = Gross Block Opening
    const additions = num(row.getCell(7).value);
    const rate = num(row.getCell(3).value);
    const stored = num(row.getCell(10).value);   // J = Acc Dep Opening Balance
    const refD = String(row.getCell(5).value || '');
    const id = String(row.getCell(1).value || '').slice(0, 35);

    const dt = parseRefinedDate(refD);

    // Classify
    if (!dt && additions > 0 && !cost) { buckets.newAsset++; if (samples.newAsset.length<3) samples.newAsset.push({r,id,refD,additions,stored}); continue; }
    if (!dt) { buckets.noDate++; continue; }
    if (cost === 0 && additions > 0) {
      // Asset bought this year — no opening Acc Dep expected
      const fy = fyOf(dt);
      if (fy >= 2025) { buckets.newAsset++; if (samples.newAsset.length<3) samples.newAsset.push({r,id,refD,additions,stored}); continue; }
    }
    if (cost === 0) { buckets.noCost++; continue; }
    if (rate === 0) { buckets.noRate++; continue; }

    const calc = computeAccDepOpening(cost, rate, dt);
    totalStored += stored;
    totalCalc += calc;
    const diff = calc - stored;
    const pct = stored > 0 ? Math.abs(diff) / stored * 100 : (calc > 0 ? 100 : 0);

    if (Math.abs(diff) < 1) buckets.exact++;
    else if (pct < 1) buckets.within1pct++;
    else if (pct < 5) {
      buckets.within5pct++;
      if (samples.within5pct.length < 5) samples.within5pct.push({r,id,refD,cost,rate,stored,calc,diff,pct});
    }
    else {
      buckets.far++;
      if (samples.far.length < 15) samples.far.push({r,id,refD,cost,rate,stored,calc,diff,pct});
    }
  }

  console.log('='.repeat(80));
  console.log('Acc Dep Opening Balance — calculated vs stored');
  console.log('='.repeat(80));
  console.log(`Stored total : ₹${totalStored.toFixed(2)}`);
  console.log(`Computed total : ₹${totalCalc.toFixed(2)}`);
  console.log(`Difference   : ₹${(totalCalc - totalStored).toFixed(2)}`);
  console.log('');
  console.log('Per-row variance bucket:');
  console.log(`  Exact match (<₹1)              : ${buckets.exact}`);
  console.log(`  Within 1%                       : ${buckets.within1pct}`);
  console.log(`  Within 5% (small drift)         : ${buckets.within5pct}`);
  console.log(`  >5% off (investigate)           : ${buckets.far}`);
  console.log(`  New asset (no opening expected) : ${buckets.newAsset}`);
  console.log(`  Skipped — missing date          : ${buckets.noDate}`);
  console.log(`  Skipped — no cost               : ${buckets.noCost}`);
  console.log(`  Skipped — no rate               : ${buckets.noRate}`);
  console.log('');

  console.log('--- Sample: rows >5% off (theoretical formula doesn\'t match stored) ---');
  console.log('row | id                                | date       | cost     | rate | stored      | calc       | diff      | %');
  console.log('-'.repeat(140));
  for (const x of samples.far) {
    console.log(`${String(x.r).padStart(3)} | ${x.id.padEnd(34)} | ${x.refD.padEnd(10)} | ${x.cost.toFixed(0).padStart(8)} | ${x.rate.toFixed(2)} | ${x.stored.toFixed(2).padStart(10)} | ${x.calc.toFixed(2).padStart(10)} | ${x.diff.toFixed(2).padStart(9)} | ${x.pct.toFixed(1)}%`);
  }

  console.log('\n--- Sample: rows 1-5% off (likely rounding / minor convention drift) ---');
  for (const x of samples.within5pct) {
    console.log(`${String(x.r).padStart(3)} | ${x.id.padEnd(34)} | ${x.refD.padEnd(10)} | ${x.cost.toFixed(0).padStart(8)} | ${x.rate.toFixed(2)} | ${x.stored.toFixed(2).padStart(10)} | ${x.calc.toFixed(2).padStart(10)} | ${x.diff.toFixed(2).padStart(9)} | ${x.pct.toFixed(1)}%`);
  }
})();
