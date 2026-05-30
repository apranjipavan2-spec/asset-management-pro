/**
 * Revert V/X formulas in the main file back to the pre-automation
 * state: hardcoded FY 25-26 (CURR_FY = 2025, lastFY = 2024).
 *
 * The TODAY()-driven version is preserved at:
 *   Asset Finance.with_calc.auto.xlsx
 *
 * V (Acc Dep Opening) hardcoded:
 *   purchaseFY >= 2025 → 0
 *   else: F*(1 - (1 - C*ff)*(1-C)^(2024-purchaseFY))
 *
 * X (Current FY Depreciation) hardcoded:
 *   half-year window = Oct-2025..Mar-2026
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');
const EPOCH = 25569, MS = 86400000;
const CURR_FY = 2025;
const LAST_FY = 2024;

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

function computeAccDepOpening(cost, rate, d) {
  const fy = fyOf(d);
  if (fy > LAST_FY) return 0;
  const yearsTotal = LAST_FY - fy + 1;
  const mo = d.getUTCMonth() + 1;
  const fyf = (mo >= 4 && mo <= 9) ? 1.0 : 0.5;
  return cost * (1 - (1 - rate * fyf) * Math.pow(1 - rate, yearsTotal - 1));
}

function vFormula(r) {
  const purchaseFY = `IF(MONTH(E${r})>=4,YEAR(E${r}),YEAR(E${r})-1)`;
  return (
    `IF(E${r}="Unknown","",` +
      `IF(OR(F${r}=0,C${r}=0),0,` +
        `IF(${purchaseFY}>=${CURR_FY},0,` +
          `F${r}*(1-(1-C${r}*IF(AND(MONTH(E${r})>=4,MONTH(E${r})<=9),1,0.5))` +
          `*POWER(1-C${r},${LAST_FY}-${purchaseFY}))` +
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
          `AND(YEAR(E${r})=${CURR_FY + 1},MONTH(E${r})<=3)` +
        `),0.5,1)` +
      `),0)`
  );
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  console.log(`Reverting to hardcoded years: CURR_FY=${CURR_FY}, LAST_FY=${LAST_FY}`);

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

    let vResult;
    if (eVal === 'Unknown' || eVal == null) vResult = '';
    else if (F === 0 || C === 0) vResult = 0;
    else if (!d) vResult = '';
    else if (fyOf(d) >= CURR_FY) vResult = 0;
    else vResult = Math.round(computeAccDepOpening(F, C, d) * 100) / 100;
    row.getCell(22).value = { formula: vFormula(r), result: vResult };
    v_count++;

    const wResult = (typeof vResult === 'number') ? Math.round((F - vResult) * 100) / 100 : '';
    row.getCell(23).value = { formula: wFormula(r), result: wResult };
    w_count++;

    let factor = 1.0;
    if (d) {
      const mo = d.getUTCMonth() + 1, y = d.getUTCFullYear();
      if ((y === CURR_FY && mo >= 10) || (y === CURR_FY + 1 && mo <= 3)) factor = 0.5;
    }
    const xResult = Math.round((O * C + G * C * factor) * 100) / 100;
    row.getCell(24).value = { formula: xFormula(r), result: xResult };
    x_count++;
  }

  // Refresh Y, Z, AA, AB cached results
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
  console.log(`Reverted to hardcoded FY ${CURR_FY}-${(CURR_FY + 1) % 100}`);
  console.log('='.repeat(80));
  console.log(`  V (Calc Acc Dep Opening) : ${v_count} rows`);
  console.log(`  W (Calc Net Block A-B)   : ${w_count} rows`);
  console.log(`  X (Calc Depreciation)    : ${x_count} rows`);
  console.log(`  Y/Z/AA/AB                : cached results refreshed`);
  console.log('\nSample V4 formula now reads:');
  console.log('  ' + vFormula(4).slice(0, 180) + '...');
  console.log(`\nFile saved: ${FILE}`);
})().catch(e => { console.error(e); process.exit(1); });
