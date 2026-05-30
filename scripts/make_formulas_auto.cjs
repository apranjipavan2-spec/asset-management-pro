/**
 * Make V (Calc Acc Dep Opening) and X (Calc Depreciation) self-updating
 * across financial years by replacing the hardcoded year constants with
 * a TODAY()-derived "current FY start year".
 *
 * Helper expression (inlined everywhere because Excel named formulae
 * round-trip poorly through ExcelJS):
 *     CURR_FY = IF(MONTH(TODAY())>=4, YEAR(TODAY()), YEAR(TODAY())-1)
 *
 *   - "Current FY 25-26" → CURR_FY = 2025
 *   - "Current FY 26-27" → CURR_FY = 2026  (auto on/after 1-Apr-2026)
 *
 * V — opening Acc Dep at start of current FY (= end of CURR_FY-1 closing)
 *     hardcoded 2025 → CURR_FY
 *     hardcoded 2024 → CURR_FY - 1
 *
 * X — current FY depreciation. Half-year window is
 *     Oct(CURR_FY)..Mar(CURR_FY+1).
 *     hardcoded 2025 → CURR_FY
 *     hardcoded 2026 → CURR_FY + 1
 *
 * Cached results are computed against TODAY's value of CURR_FY so the
 * file shows fresh numbers immediately when re-opened in Excel.
 *
 * Caveat (already discussed with user): TODAY() is volatile. On 1-Apr
 * of any year, V/W/X will jump to the new FY automatically. That's the
 * intended behaviour but it means previously-shown values no longer
 * match the column J/O of the same workbook (which are static last-year
 * audited values). The diff columns Y/Z/AA/AB will reflect this jump.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.auto.xlsx');
const EPOCH = 25569, MS = 86400000;

// CURR_FY expression — inlined into every formula.
// Audit runs one FY behind the calendar, so we anchor the dataset to the
// FY that ended most recently (= calendar FY − 1).
//   May 2026 → CURR_FY = 2025 (FY 2025-26)
//   May 2027 → CURR_FY = 2026 (FY 2026-27)
const CURR_FY = 'IF(MONTH(TODAY())>=4,YEAR(TODAY())-1,YEAR(TODAY())-2)';

function num(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime() / MS + EPOCH;
  if (typeof v === 'object' && 'result' in v) {
    const r = v.result;
    if (r == null || r === '') return 0;
    if (r instanceof Date) return r.getTime() / MS + EPOCH;
    if (r && typeof r === 'object' && 'error' in r) return 0;
    return Number(r) || 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function eDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(Math.round((v - EPOCH) * MS));
  return null;
}

function fyOf(d) {
  const mo = d.getUTCMonth() + 1, y = d.getUTCFullYear();
  return mo >= 4 ? y : y - 1;
}

function computeAccDepOpening(cost, rate, d, lastFY) {
  const fy = fyOf(d);
  if (fy > lastFY) return 0;
  const yearsTotal = lastFY - fy + 1;
  const mo = d.getUTCMonth() + 1;
  const fyf = (mo >= 4 && mo <= 9) ? 1.0 : 0.5;
  return cost * (1 - (1 - rate * fyf) * Math.pow(1 - rate, yearsTotal - 1));
}

function vFormula(r) {
  // purchaseFY = IF(MONTH(E)>=4, YEAR(E), YEAR(E)-1)
  const purchaseFY = `IF(MONTH(E${r})>=4,YEAR(E${r}),YEAR(E${r})-1)`;
  return (
    `IF(E${r}="Unknown","",` +
      `IF(OR(F${r}=0,C${r}=0),0,` +
        `IF(${purchaseFY}>=${CURR_FY},0,` +
          `F${r}*(1-(1-C${r}*IF(AND(MONTH(E${r})>=4,MONTH(E${r})<=9),1,0.5))` +
          `*POWER(1-C${r},(${CURR_FY}-1)-${purchaseFY}))` +
        `)` +
      `)` +
    `)`
  );
}

function wFormula(r) { return `IF(V${r}="","",F${r}-V${r})`; }

function xFormula(r) {
  return (
    `IFERROR(O${r}*C${r},0)+` +
    `IFERROR(G${r}*C${r}*` +
      `IF(E${r}="Unknown",1,` +
        `IF(OR(` +
          `AND(YEAR(E${r})=${CURR_FY},MONTH(E${r})>=10),` +
          `AND(YEAR(E${r})=${CURR_FY}+1,MONTH(E${r})<=3)` +
        `),0.5,1)` +
      `),0)`
  );
}

// K (Depreciation - Cost) uses the same formula as X — both are current-FY
// depreciation. Parameterised on CURR_FY so it rolls forward every audit cycle.
const kFormula = xFormula;

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  // Determine TODAY-based CURR_FY for cached results (audit lags calendar by 1 FY)
  const now = new Date();
  const calendarFY = (now.getMonth() + 1 >= 4) ? now.getFullYear() : now.getFullYear() - 1;
  const curFY = calendarFY - 1;
  const lastFY = curFY - 1;
  console.log(`Cached-result base: today=${now.toISOString().slice(0, 10)}  →  CURR_FY=${curFY}, lastFY=${lastFY}`);

  let v_count = 0, w_count = 0, x_count = 0;
  for (let r = 4; r <= 379; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;

    const F = num(row.getCell(6).value);
    const G = num(row.getCell(7).value);
    const O = num(row.getCell(15).value);
    const C = num(row.getCell(3).value);
    const eVal = row.getCell(5).value;
    const d = eDate(eVal);

    // V
    let vResult;
    if (eVal === 'Unknown' || eVal == null) vResult = '';
    else if (F === 0 || C === 0) vResult = 0;
    else if (!d) vResult = '';
    else if (fyOf(d) >= curFY) vResult = 0;
    else vResult = Math.round(computeAccDepOpening(F, C, d, lastFY) * 100) / 100;
    row.getCell(22).value = { formula: vFormula(r), result: vResult };
    v_count++;

    // W
    const wResult = (typeof vResult === 'number') ? Math.round((F - vResult) * 100) / 100 : '';
    row.getCell(23).value = { formula: wFormula(r), result: wResult };
    w_count++;

    // K & X — current FY depreciation (identical formulas)
    let factor = 1.0;
    if (d) {
      const mo = d.getUTCMonth() + 1, y = d.getUTCFullYear();
      if ((y === curFY && mo >= 10) || (y === curFY + 1 && mo <= 3)) factor = 0.5;
    }
    const xResult = Math.round((O * C + G * C * factor) * 100) / 100;
    row.getCell(11).value = { formula: kFormula(r), result: xResult };
    row.getCell(24).value = { formula: xFormula(r), result: xResult };
    x_count++;
  }

  // Refresh Y, Z, AA, AB cached results so they don't show stale numbers
  for (let r = 4; r <= 379; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    const J = num(row.getCell(10).value);
    const V = num(row.getCell(22).value);
    const W = num(row.getCell(23).value);
    const O = num(row.getCell(15).value);
    const vRaw = row.getCell(22).value;
    const wRaw = row.getCell(23).value;
    const vBlank = vRaw && typeof vRaw === 'object' && (vRaw.result === '' || vRaw.result == null);
    const wBlank = wRaw && typeof wRaw === 'object' && (wRaw.result === '' || wRaw.result == null);

    const patchCached = (col, value) => {
      const cell = row.getCell(col);
      if (cell.value && typeof cell.value === 'object') {
        const existing = cell.value;
        cell.value = existing.formula
          ? { formula: existing.formula, result: value }
          : existing.sharedFormula
            ? { sharedFormula: existing.sharedFormula, result: value }
            : cell.value;
      }
    };

    patchCached(25, vBlank ? '' : Math.round((J - V) * 100) / 100);
    patchCached(26, wBlank ? '' : Math.round((W - O) * 100) / 100);
    const yVal = vBlank ? null : (J - V);
    patchCached(27, yVal == null ? '' : (Math.abs(yVal) > 5 ? 'High' : 'Correct'));
    const zVal = wBlank ? null : (W - O);
    patchCached(28, zVal == null ? '' : (Math.abs(zVal) > 5 ? 'High' : 'Correct'));
  }

  await wb.xlsx.writeFile(FILE);

  console.log('\n' + '='.repeat(80));
  console.log('Formulas now use TODAY()-derived CURR_FY — fully automatic');
  console.log('='.repeat(80));
  console.log(`  V (Calc Acc Dep Opening) : ${v_count} rows`);
  console.log(`  W (Calc Net Block A-B)   : ${w_count} rows  (=F-V, no year reference)`);
  console.log(`  X (Calc Depreciation)    : ${x_count} rows`);
  console.log(`  Y/Z/AA/AB                : cached results refreshed`);
  console.log('');
  console.log('Sample V4 formula now reads:');
  console.log('  ' + vFormula(4).slice(0, 180) + '...');
  console.log('');
  console.log(`File saved: ${FILE}`);
})().catch(e => { console.error(e); process.exit(1); });
