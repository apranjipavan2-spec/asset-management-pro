/**
 * Finalize columns W (Calculated Acc Dep Opening) and X (Calculated Net
 * Block A-B) with correct Excel formulas + cached results, and clear
 * every fill colour from the data area so the reviewer can apply their
 * own highlighting.
 *
 * Formula reasoning (W — Acc Dep Opening at end of FY 24-25):
 *   Let m = MID(E,4,2)   (month from refined date DD-MM-YYYY)
 *   Let y = MID(E,7,4)   (year)
 *   purchaseFY  = IF(m>=4, y, y-1)
 *   firstYrFct  = IF(AND(m>=4,m<=9), 1, 0.5)        — Apr-Sep full, Oct-Mar half
 *   yearsTotal  = 2024 - purchaseFY + 1              — Indian FY count inclusive
 *   wdvFinal    = F * (1 - C*firstYrFct) * (1-C)^(yearsTotal-1)
 *   AccDep      = F - wdvFinal
 *                = F * ( 1 - (1 - C*firstYrFct) * (1-C)^(yearsTotal-1) )
 *
 *   Edge cases:
 *     E = "Unknown"          → blank (can't compute without date)
 *     F = 0 or C = 0         → 0    (no cost or non-depreciable)
 *     purchaseFY >= 2025     → 0    (new asset, no opening acc dep)
 *
 * Formula reasoning (X — Calculated Net Block A-B):
 *   X = F - W   (Gross Block Opening minus Calculated Acc Dep Opening)
 *   When W is blank, X is also blank.
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
  // closed form: cost * (1 - (1 - rate*firstYrFct) * (1-rate)^(yearsTotal-1))
  return cost * (1 - (1 - rate * firstYearFactor) * Math.pow(1 - rate, yearsTotal - 1));
}

// Build the Excel formula text for column W at row r
function wFormula(r) {
  return (
    `IF(E${r}="Unknown","",` +
      `IF(OR(F${r}=0,C${r}=0),0,` +
        // purchaseFY = IF(month>=4, year, year-1)
        // shortcut: encode purchaseFY = IF(VALUE(MID(E,4,2))>=4, VALUE(MID(E,7,4)), VALUE(MID(E,7,4))-1)
        `IF((IF(VALUE(MID(E${r},4,2))>=4,VALUE(MID(E${r},7,4)),VALUE(MID(E${r},7,4))-1))>=2025,0,` +
          `F${r}*(1-(1-C${r}*IF(AND(VALUE(MID(E${r},4,2))>=4,VALUE(MID(E${r},4,2))<=9),1,0.5))` +
          `*POWER(1-C${r},2024-(IF(VALUE(MID(E${r},4,2))>=4,VALUE(MID(E${r},7,4)),VALUE(MID(E${r},7,4))-1))))` +
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

  // Headers
  const jHeader = ws.getRow(3).getCell(10);
  const oHeader = ws.getRow(3).getCell(15);
  const wHeaderCell = ws.getRow(3).getCell(23);
  const xHeaderCell = ws.getRow(3).getCell(24);

  wHeaderCell.value = 'Calculated Acc Dep Opening';
  if (jHeader.style) wHeaderCell.style = JSON.parse(JSON.stringify(jHeader.style));

  xHeaderCell.value = 'Calculated Net Block (A-B)';
  if (oHeader.style) xHeaderCell.style = JSON.parse(JSON.stringify(oHeader.style));

  // Clear fill on the two new headers
  wHeaderCell.fill = { type: 'pattern', pattern: 'none' };
  xHeaderCell.fill = { type: 'pattern', pattern: 'none' };

  // Match widths
  if (ws.getColumn(10).width) ws.getColumn(23).width = ws.getColumn(10).width;
  if (ws.getColumn(15).width) ws.getColumn(24).width = ws.getColumn(15).width;

  // Data rows
  let wValueCount = 0, wBlankCount = 0, wZeroCount = 0;
  let xValueCount = 0;
  let clearedCells = 0;

  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;

    // (1) Clear all fills on columns A..X (1..24) for this row
    for (let c = 1; c <= 24; c++) {
      const cell = row.getCell(c);
      if (cell.fill && cell.fill.pattern && cell.fill.pattern !== 'none') {
        cell.fill = { type: 'pattern', pattern: 'none' };
        clearedCells++;
      }
    }

    const F = num(row.getCell(6).value);
    const C = num(row.getCell(3).value);
    const refD = String(row.getCell(5).value || '');
    const dt = parseRefinedDate(refD);

    // (2) Column W: formula + cached result
    const wCell = row.getCell(23);
    const jCell = row.getCell(10);
    if (jCell.style) wCell.style = JSON.parse(JSON.stringify(jCell.style));
    wCell.fill = { type: 'pattern', pattern: 'none' }; // ensure clear (style copy might bring J's fill)

    let wResult;
    if (refD === 'Unknown' || !dt) {
      // No date available — leave blank
      wCell.value = { formula: wFormula(r), result: '' };
      wResult = null;
      wBlankCount++;
    } else if (F === 0 || C === 0) {
      wCell.value = { formula: wFormula(r), result: 0 };
      wResult = 0;
      wZeroCount++;
    } else {
      const fy = fyOf(dt);
      if (fy >= 2025) {
        wCell.value = { formula: wFormula(r), result: 0 };
        wResult = 0;
        wZeroCount++;
      } else {
        const calc = Math.round(computeAccDepOpening(F, C, dt) * 100) / 100;
        wCell.value = { formula: wFormula(r), result: calc };
        wResult = calc;
        wValueCount++;
      }
    }

    // (3) Column X: formula F - W + cached result
    const xCell = row.getCell(24);
    const oCell = row.getCell(15);
    if (oCell.style) xCell.style = JSON.parse(JSON.stringify(oCell.style));
    xCell.fill = { type: 'pattern', pattern: 'none' };

    if (wResult === null) {
      xCell.value = { formula: xFormula(r), result: '' };
    } else {
      const xRes = Math.round((F - wResult) * 100) / 100;
      xCell.value = { formula: xFormula(r), result: xRes };
      xValueCount++;
    }
  }

  await wb.xlsx.writeFile(FILE);

  console.log('='.repeat(80));
  console.log('Columns W & X finalized — formulas + cached results, all fills cleared');
  console.log('='.repeat(80));
  console.log(`Column W (Calculated Acc Dep Opening):`);
  console.log(`  Computed (positive value)     : ${wValueCount}`);
  console.log(`  Zero (new asset / no rate)    : ${wZeroCount}`);
  console.log(`  Blank (Unknown date)          : ${wBlankCount}`);
  console.log(`Column X (Calculated Net Block A-B):`);
  console.log(`  Computed                      : ${xValueCount}`);
  console.log(`  Blank                         : ${376 - xValueCount}`);
  console.log('');
  console.log(`Fills cleared: ${clearedCells} cells across columns A..X`);
  console.log(`File saved: ${FILE}`);
})().catch(e => { console.error(e); process.exit(1); });
