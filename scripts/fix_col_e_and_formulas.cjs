/**
 * Make the formulas robust to any date entered by the user.
 *
 * Root cause: column E was a mix of text "DD-MM-YYYY" (361 rows, the
 * originals) and real Date objects (14 rows, recent user entries).
 * The W formula used MID/VALUE, which only works on text — Date cells
 * returned #VALUE!.
 *
 * Fix:
 *   1) Normalize column E:
 *        - "Unknown"           → leave as text
 *        - text "DD-MM-YYYY"   → convert to a real Excel date
 *        - already a Date      → leave (will pick up the format below)
 *      Apply DD-MM-YYYY display format to every E cell so the visual
 *      stays the same, but the underlying value is always a date number
 *      (or the literal "Unknown").
 *
 *   2) Rewrite W formula to use MONTH(E) and YEAR(E). The "Unknown"
 *      branch still short-circuits before those functions are called.
 *
 *   3) X formula stays =F-W, with blank propagation when W is blank.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');
const DATE_FMT = 'dd-mm-yyyy';

function num(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'result' in v) return Number(v.result) || 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Parse "DD-MM-YYYY" text → JS Date (UTC noon to avoid TZ rollover)
function parseDDMMYYYY(s) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(s));
  if (!m) return null;
  return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12, 0, 0));
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

// W formula — uses MONTH(E)/YEAR(E), robust to date values
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

function xFormula(r) {
  return `IF(W${r}="","",F${r}-W${r})`;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  let converted = 0, alreadyDate = 0, keptUnknown = 0, unparsable = 0;

  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;

    const eCell = row.getCell(5);
    const v = eCell.value;

    // Normalize column E
    if (v instanceof Date) {
      alreadyDate++;
      eCell.numFmt = DATE_FMT;
    } else if (typeof v === 'string') {
      if (v === 'Unknown') {
        keptUnknown++;
        // no format change — text stays text
      } else {
        const d = parseDDMMYYYY(v);
        if (d) {
          eCell.value = d;
          eCell.numFmt = DATE_FMT;
          converted++;
        } else {
          unparsable++;
        }
      }
    } else if (typeof v === 'number') {
      // Already a serial number — just ensure formatting
      eCell.numFmt = DATE_FMT;
      alreadyDate++;
    }

    // Rewrite W formula + cache result
    const F = num(row.getCell(6).value);
    const C = num(row.getCell(3).value);
    const eNow = row.getCell(5).value;
    let wResult;
    if (eNow === 'Unknown' || eNow == null) {
      wResult = '';
    } else if (F === 0 || C === 0) {
      wResult = 0;
    } else {
      const dForCalc = (eNow instanceof Date) ? eNow
        : (typeof eNow === 'number')
          ? new Date(Math.round((eNow - 25569) * 86400 * 1000))  // serial → JS Date
          : null;
      if (!dForCalc) wResult = '';
      else if (fyOfDate(dForCalc) >= 2025) wResult = 0;
      else wResult = Math.round(computeAccDepOpening(F, C, dForCalc) * 100) / 100;
    }
    const wCell = row.getCell(23);
    wCell.value = { formula: wFormula(r), result: wResult };

    // X
    const xCell = row.getCell(24);
    const xRes = (typeof wResult === 'number') ? Math.round((F - wResult) * 100) / 100 : '';
    xCell.value = { formula: xFormula(r), result: xRes };
  }

  await wb.xlsx.writeFile(FILE);

  console.log('Column E normalization:');
  console.log(`  Text "DD-MM-YYYY" → real Excel date : ${converted}`);
  console.log(`  Already a Date / number (left)      : ${alreadyDate}`);
  console.log(`  "Unknown" kept as text              : ${keptUnknown}`);
  console.log(`  Unparsable (left as-is)             : ${unparsable}`);
  console.log('');
  console.log('Formulas updated:');
  console.log(`  W now uses MONTH(E)/YEAR(E) — works on text and date alike`);
  console.log(`  X stays =F-W  with blank propagation`);
  console.log('');
  console.log('From now on: typing a date in column E (in any format Excel');
  console.log('recognizes) will display as DD-MM-YYYY and W/X recompute correctly.');
})().catch(e => { console.error(e); process.exit(1); });
