/**
 * Comprehensive cleanup:
 *
 *  V (Calculated Acc Dep Opening)
 *      Old formula used MID(E,...) which fails now that E is a Date.
 *      New formula uses MONTH(E)/YEAR(E) — works for any date type.
 *
 *  W (Calculated Net Block (A-B))
 *      Old formula was wrong (computed Acc Dep, not Net Block).
 *      New: =IF(V="","",F-V).
 *
 *  X (Calculated Depreciation)
 *      Old formula was =F-W (also wrong).
 *      New: O*C + G*C*factor   where factor = 0.5 for Oct25-Mar26 additions,
 *                                              1.0 otherwise.
 *      With IFERROR wrappers so blanks don't break it.
 *
 *  Defined names: remove the 2 references to external workbooks
 *  ('[1]Assets', '[2]Assets'). They are unused and trigger Excel's
 *  "update links" prompt on open.
 *
 *  Cached results are written so the file opens with correct values
 *  even before Excel recalculates.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');
const EPOCH_OFFSET_DAYS = 25569;
const MS_PER_DAY = 86400 * 1000;

function num(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime() / MS_PER_DAY + EPOCH_OFFSET_DAYS;
  if (typeof v === 'object' && 'result' in v) {
    const r = v.result;
    if (r === '' || r == null) return 0;
    if (r instanceof Date) return r.getTime() / MS_PER_DAY + EPOCH_OFFSET_DAYS;
    if (r && typeof r === 'object' && 'error' in r) return 0;
    return Number(r) || 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function eDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(Math.round((v - EPOCH_OFFSET_DAYS) * MS_PER_DAY));
  if (typeof v === 'string') {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v);
    if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12));
  }
  return null;
}

function fyOf(d) {
  const mo = d.getUTCMonth() + 1, y = d.getUTCFullYear();
  return mo >= 4 ? y : y - 1;
}

function computeAccDepOpening(cost, rate, d) {
  const fy = fyOf(d);
  if (fy >= 2025) return 0;
  const yearsTotal = 2024 - fy + 1;
  const mo = d.getUTCMonth() + 1;
  const fyf = (mo >= 4 && mo <= 9) ? 1.0 : 0.5;
  return cost * (1 - (1 - rate * fyf) * Math.pow(1 - rate, yearsTotal - 1));
}

// --- Formulas ---
function vFormula(r) {
  // Calculated Acc Dep Opening — robust to Date or text E
  return (
    `IF(E${r}="Unknown","",` +
      `IF(OR(F${r}=0,C${r}=0),0,` +
        `IF(IF(MONTH(E${r})>=4,YEAR(E${r}),YEAR(E${r})-1)>=2025,0,` +
          `F${r}*(1-(1-C${r}*IF(AND(MONTH(E${r})>=4,MONTH(E${r})<=9),1,0.5))` +
          `*POWER(1-C${r},2024-IF(MONTH(E${r})>=4,YEAR(E${r}),YEAR(E${r})-1)))` +
        `)` +
      `)` +
    `)`
  );
}
function wFormula(r) { return `IF(V${r}="","",F${r}-V${r})`; }
// X: Calculated Depreciation — FY 25-26 dep using half-year rule on additions
function xFormula(r) {
  return (
    `IFERROR(O${r}*C${r},0)+` +
    `IFERROR(G${r}*C${r}*` +
      `IF(E${r}="Unknown",1,` +
        `IF(OR(AND(YEAR(E${r})=2025,MONTH(E${r})>=10),AND(YEAR(E${r})=2026,MONTH(E${r})<=3)),0.5,1)` +
      `),0)`
  );
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  // --- 1) Remove phantom external defined names ---
  let removedNames = [];
  if (wb.definedNames && wb.definedNames.model) {
    const remain = [];
    for (const n of wb.definedNames.model) {
      const txt = JSON.stringify(n);
      if (txt.includes('[1]') || txt.includes('[2]') || txt.includes('.xls') || /external/i.test(txt)) {
        removedNames.push(n.name);
      } else {
        remain.push(n);
      }
    }
    wb.definedNames.model = remain;
  }

  // --- 2) Replace formulas in V, W, X (cols 22, 23, 24) ---
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

    // V — Acc Dep Opening
    let vResult;
    if (eVal === 'Unknown' || eVal == null) vResult = '';
    else if (F === 0 || C === 0) vResult = 0;
    else if (!d) vResult = '';
    else if (fyOf(d) >= 2025) vResult = 0;
    else vResult = Math.round(computeAccDepOpening(F, C, d) * 100) / 100;
    row.getCell(22).value = { formula: vFormula(r), result: vResult };
    v_count++;

    // W — Net Block (A-B)
    const wResult = (typeof vResult === 'number') ? Math.round((F - vResult) * 100) / 100 : '';
    row.getCell(23).value = { formula: wFormula(r), result: wResult };
    w_count++;

    // X — Calculated Depreciation (FY 25-26 dep, half-year for Oct25-Mar26 additions)
    let factor = 1.0;
    if (d) {
      const mo = d.getUTCMonth() + 1, y = d.getUTCFullYear();
      if ((y === 2025 && mo >= 10) || (y === 2026 && mo <= 3)) factor = 0.5;
    }
    const xResult = Math.round((O * C + G * C * factor) * 100) / 100;
    row.getCell(24).value = { formula: xFormula(r), result: xResult };
    x_count++;
  }

  // --- 3) Refresh cached results on Y, Z, AA, AB (user-added diff cols) ---
  // Y = J - V; Z = W - O; AA = IF(ABS(Y)>5,"High","Correct"); AB = same for Z
  let yzCached = 0;
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

    // Y
    const yCell = row.getCell(25);
    if (yCell.value && typeof yCell.value === 'object') {
      const y = vBlank ? '' : Math.round((J - V) * 100) / 100;
      const existing = yCell.value;
      yCell.value = existing.formula
        ? { formula: existing.formula, result: y }
        : { sharedFormula: existing.sharedFormula, result: y };
    }
    // Z
    const zCell = row.getCell(26);
    if (zCell.value && typeof zCell.value === 'object') {
      const z = wBlank ? '' : Math.round((W - O) * 100) / 100;
      const existing = zCell.value;
      zCell.value = existing.formula
        ? { formula: existing.formula, result: z }
        : { sharedFormula: existing.sharedFormula, result: z };
    }
    // AA — uses Y
    const aaCell = row.getCell(27);
    if (aaCell.value && typeof aaCell.value === 'object') {
      const y = vBlank ? null : (J - V);
      const cat = (y == null) ? '' : (Math.abs(y) > 5 ? 'High' : 'Correct');
      const existing = aaCell.value;
      aaCell.value = existing.formula
        ? { formula: existing.formula, result: cat }
        : { sharedFormula: existing.sharedFormula, result: cat };
    }
    // AB — uses Z
    const abCell = row.getCell(28);
    if (abCell.value && typeof abCell.value === 'object') {
      const z = wBlank ? null : (W - O);
      const cat = (z == null) ? '' : (Math.abs(z) > 5 ? 'High' : 'Correct');
      const existing = abCell.value;
      abCell.value = existing.formula
        ? { formula: existing.formula, result: cat }
        : { sharedFormula: existing.sharedFormula, result: cat };
    }
    yzCached++;
  }

  await wb.xlsx.writeFile(FILE);

  console.log('='.repeat(80));
  console.log('Calculated columns rebuilt + external links removed');
  console.log('='.repeat(80));
  console.log(`Rows updated:`);
  console.log(`  V (Calc Acc Dep Opening) : ${v_count}    — formula uses MONTH/YEAR, works on real dates`);
  console.log(`  W (Calc Net Block A-B)   : ${w_count}    — formula =F-V`);
  console.log(`  X (Calc Depreciation)    : ${x_count}    — O*C + G*C*halfYearFactor`);
  console.log(`  Y, Z, AA, AB cached      : ${yzCached}    — diff + High/Correct refreshed`);
  console.log('');
  console.log('External defined names removed (made standalone):');
  for (const n of removedNames) console.log(`  - ${n}`);
  console.log('');
  console.log(`File saved: ${FILE}`);
})().catch(e => { console.error(e); process.exit(1); });
