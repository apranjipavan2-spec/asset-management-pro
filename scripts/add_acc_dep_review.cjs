/**
 * Option 2 + 3:
 *   1) Add column W "Calculated Acc Dep Opening" computing theoretical
 *      Acc Dep Opening Balance from first principles (WDV + half-year rule),
 *      styled to match column J.
 *   2) Highlight cells in column J that disagree with the calculated value:
 *      - >5%  off  → ORANGE  (needs investigation / likely wrong)
 *      - 1-5% off  → YELLOW  (minor drift, rounding-ish)
 *      Exact and <1% rows are left untouched.
 *
 * Also lightly highlights column W with a header note color so reviewers
 * see this is a calculated value, not source data.
 *
 * Net Block columns (O and P) are NOT modified — separate inspection script
 * confirmed O matches F-J on 375/376 rows, P matches I-N on all 376 rows.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');

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

  // 1) Header for column W — match J's style
  const jHeader = ws.getRow(3).getCell(10);
  const wHeader = ws.getRow(3).getCell(23);
  wHeader.value = 'Calculated Acc Dep Opening';
  if (jHeader.style) wHeader.style = JSON.parse(JSON.stringify(jHeader.style));
  // Tint header so reviewers see it's a derived column
  wHeader.fill = {
    type: 'pattern', pattern: 'solid',
    fgColor: { argb: 'FFE8F5E9' },     // pale green
  };

  // Match column J width
  const jCol = ws.getColumn(10);
  const wCol = ws.getColumn(23);
  if (jCol.width) wCol.width = jCol.width;

  // Colors for J cell highlighting
  const orange = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFAB91' } }; // soft orange — >5% off
  const yellow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF59D' } }; // soft yellow — 1-5% off

  let written = 0, hiOrange = 0, hiYellow = 0, skippedNoData = 0;
  const reviewSamples = [];

  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;

    const cost = num(row.getCell(6).value);    // F
    const rate = num(row.getCell(3).value);    // C
    const stored = num(row.getCell(10).value); // J
    const refD = String(row.getCell(5).value || '');
    const dt = parseRefinedDate(refD);

    // Style W cell to match J's style (preserve borders, number format)
    const wCell = row.getCell(23);
    const jCell = row.getCell(10);
    if (jCell.style) wCell.style = JSON.parse(JSON.stringify(jCell.style));

    if (!dt || cost === 0 || rate === 0) {
      wCell.value = null;
      skippedNoData++;
      continue;
    }

    const calc = computeAccDepOpening(cost, rate, dt);
    wCell.value = Math.round(calc * 100) / 100;
    written++;

    const diff = calc - stored;
    const pct = stored > 0 ? Math.abs(diff) / stored * 100 : (calc > 0 ? 100 : 0);

    if (Math.abs(diff) < 1) continue;
    if (pct < 1) continue;

    if (pct >= 5) {
      jCell.fill = orange;
      wCell.fill = orange;
      hiOrange++;
      const id = String(row.getCell(1).value || '').slice(0, 35);
      reviewSamples.push({ r, id, refD, stored, calc, diff, pct, level: 'ORANGE' });
    } else {
      jCell.fill = yellow;
      wCell.fill = yellow;
      hiYellow++;
    }
  }

  await wb.xlsx.writeFile(FILE);

  console.log('='.repeat(80));
  console.log('Column W (Calculated Acc Dep Opening) written');
  console.log('='.repeat(80));
  console.log(`  Cells with computed value     : ${written}`);
  console.log(`  Cells left blank (no data)    : ${skippedNoData}`);
  console.log('');
  console.log('Highlighted cells in column J (and W):');
  console.log(`  ORANGE (>5% off — review)     : ${hiOrange}`);
  console.log(`  YELLOW (1-5% off — minor)     : ${hiYellow}`);
  console.log('');
  console.log('--- ORANGE-flagged rows (need review) ---');
  console.log('row | id                                 | date       | stored      | calc        | diff       | %');
  console.log('-'.repeat(120));
  for (const x of reviewSamples) {
    console.log(`${String(x.r).padStart(3)} | ${x.id.padEnd(35)} | ${x.refD.padEnd(10)} | ${x.stored.toFixed(2).padStart(11)} | ${x.calc.toFixed(2).padStart(11)} | ${x.diff.toFixed(2).padStart(10)} | ${x.pct.toFixed(1)}%`);
  }
  console.log('');
  console.log(`File saved: ${FILE}`);
})().catch(e => { console.error(e); process.exit(1); });
