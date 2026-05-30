/**
 * Unmangle cost / depreciation columns that were accidentally formatted
 * as dates. Excel keeps the underlying number, but the cell now displays
 * as a date (e.g. 14000 → "30-04-1938") and ExcelJS reads it as a Date
 * object. Any subsequent formula that does F*C ends up multiplying with
 * negative millisecond values.
 *
 * Fix per cell:
 *   - If value is a Date and the cell is in a numeric column (C, F, G, H,
 *     I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X) — convert the
 *     Date back to its Excel serial number (days since 1899-12-30) and
 *     set numFmt to '#,##0.00'.
 *   - Leave date columns (D, E) alone.
 *
 * After unmangling, re-cache W and X using their formulas.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');

// Excel epoch: 1899-12-30 (treating Excel's 1900 leap-year bug).
// JS Date 0 = 1970-01-01. Difference in days = 25569.
const EPOCH_OFFSET_DAYS = 25569;
const MS_PER_DAY = 86400 * 1000;

function dateToExcelSerial(d) {
  return d.getTime() / MS_PER_DAY + EPOCH_OFFSET_DAYS;
}

// Numeric columns (1-indexed). Excluding A,B (text), D,E (real dates).
const NUMERIC_COLS = [3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

function num(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return dateToExcelSerial(v);
  if (typeof v === 'object' && 'result' in v) {
    const r = v.result;
    if (r instanceof Date) return dateToExcelSerial(r);
    return Number(r) || 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fyOfDate(d) {
  const mo = d.getUTCMonth() + 1, y = d.getUTCFullYear();
  return mo >= 4 ? y : y - 1;
}
function computeAccDepOpening(cost, rate, d) {
  const mo = d.getUTCMonth() + 1;
  const fy = fyOfDate(d);
  if (fy >= 2025) return 0;
  const yearsTotal = 2024 - fy + 1;
  const fyf = (mo >= 4 && mo <= 9) ? 1.0 : 0.5;
  return cost * (1 - (1 - rate * fyf) * Math.pow(1 - rate, yearsTotal - 1));
}

function wFormula(r) {
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
function xFormula(r) { return `IF(W${r}="","",F${r}-W${r})`; }

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  const fixedByCol = {};
  const samples = [];

  // Step 1: unmangle Date-typed cells in numeric columns
  for (let r = 4; r <= 379; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    for (const c of NUMERIC_COLS) {
      const cell = row.getCell(c);
      let v = cell.value;
      // Unwrap formula objects whose cached result is a Date
      if (v && typeof v === 'object' && 'formula' in v && v.result instanceof Date) {
        const serial = dateToExcelSerial(v.result);
        cell.value = { formula: v.formula, result: serial };
        cell.numFmt = '#,##0.00';
        fixedByCol[c] = (fixedByCol[c] || 0) + 1;
        if (samples.length < 8) samples.push({ r, c, was: v.result.toISOString().slice(0, 10), now: serial });
      } else if (v instanceof Date) {
        const serial = dateToExcelSerial(v);
        cell.value = serial;
        cell.numFmt = '#,##0.00';
        fixedByCol[c] = (fixedByCol[c] || 0) + 1;
        if (samples.length < 8) samples.push({ r, c, was: v.toISOString().slice(0, 10), now: serial });
      }
    }
  }

  // Step 2: recompute W and X cached results from the cleaned data
  for (let r = 4; r <= 379; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;

    const F = num(row.getCell(6).value);
    const C = num(row.getCell(3).value);
    const eNow = row.getCell(5).value;

    let wResult;
    if (eNow === 'Unknown' || eNow == null) {
      wResult = '';
    } else if (F === 0 || C === 0) {
      wResult = 0;
    } else {
      let dForCalc = null;
      if (eNow instanceof Date) dForCalc = eNow;
      else if (typeof eNow === 'number') dForCalc = new Date(Math.round((eNow - EPOCH_OFFSET_DAYS) * MS_PER_DAY));
      else if (typeof eNow === 'string') {
        const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(eNow);
        if (m) dForCalc = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12));
      }
      if (!dForCalc) wResult = '';
      else if (fyOfDate(dForCalc) >= 2025) wResult = 0;
      else wResult = Math.round(computeAccDepOpening(F, C, dForCalc) * 100) / 100;
    }
    row.getCell(23).value = { formula: wFormula(r), result: wResult };

    const xRes = (typeof wResult === 'number') ? Math.round((F - wResult) * 100) / 100 : '';
    row.getCell(24).value = { formula: xFormula(r), result: xRes };
  }

  await wb.xlsx.writeFile(FILE);

  const colLetter = (n) => String.fromCharCode(64 + n);
  console.log('Date-formatted cells unmangled in numeric columns:');
  for (const c of Object.keys(fixedByCol)) {
    console.log(`  Column ${colLetter(+c)} (${+c}): ${fixedByCol[c]} cells`);
  }
  console.log('');
  console.log('Sample unmangled cells (before → after as Excel serial / number):');
  for (const s of samples) {
    console.log(`  row ${s.r}, col ${colLetter(s.c)}: "${s.was}"  →  ${s.now}`);
  }
  console.log('');
  console.log('W and X cached results re-computed from the cleaned data.');
})().catch(e => { console.error(e); process.exit(1); });
