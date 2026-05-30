/**
 * Re-derive column E "Refined Aquis Date" from Excel's displayed value in column D
 * (cell.w), not from the JS Date object xlsx returns. The Date-object path was
 * losing 1 day to timezone conversion (Excel shows "26-Aug-11" but JS Date was
 * "2011-08-25T18:29:50Z" → getDate()=25).
 *
 * Strategy:
 *   - Read ORIGINAL file with xlsx to get cell.w for column D (Excel's display).
 *   - Patch column E only in Asset Finance.with_calc.xlsx using exceljs so all
 *     other cells / formulas / styles / column widths / column V remain intact.
 *
 * Also re-runs the depreciation calc for column V so its half-year factor uses
 * the corrected dates.
 */
'use strict';
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');

const ORIG_FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.original.xlsx');
const OUT_FILE  = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');

const MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
function pad2(n){ return String(n).padStart(2,'0'); }

function parseExcelDisplay(s) {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  let m;
  // 26-Aug-11   or   5-Sep-11   or   26-Aug-2011
  if ((m = t.match(/^(\d{1,2})-([A-Za-z]{3,9})-(\d{2,4})$/))) {
    const mm = MONTHS[m[2].slice(0,3).toLowerCase()];
    if (!mm) return null;
    let yy = parseInt(m[3], 10);
    if (yy < 100) yy = yy < 50 ? 2000 + yy : 1900 + yy;
    return { d: parseInt(m[1],10), m: mm, y: yy };
  }
  // 06.01.2020
  if ((m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/))) {
    return { d: +m[1], m: +m[2], y: +m[3] };
  }
  // 23.08.18  or  16.3.19
  if ((m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/))) {
    let yy = +m[3]; yy = yy < 50 ? 2000+yy : 1900+yy;
    return { d: +m[1], m: +m[2], y: yy };
  }
  // ISO yyyy-mm-dd
  if ((m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) {
    return { d: +m[3], m: +m[2], y: +m[1] };
  }
  // American M/D/YY or M/D/YYYY — Excel's default short-date display in en-US.
  // Verified from the workbook: e.g. "11/6/25" appears alongside JS Date
  // "Nov 05 2025 23:59:50 IST" → real date is Nov 6, 2025 → M/D/YY.
  if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) {
    let yy = +m[3]; if (yy < 100) yy = yy < 50 ? 2000 + yy : 1900 + yy;
    return { d: +m[2], m: +m[1], y: yy };
  }
  return null;
}

function fmt(p) { return `${pad2(p.d)}-${pad2(p.m)}-${p.y}`; }

// 1) Build row→display lookup from the ORIGINAL workbook using xlsx (gives us cell.w)
const wb = XLSX.readFile(ORIG_FILE, { cellDates: true, cellFormula: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(ws['!ref']);

const refined = new Map();    // rowNum → "DD-MM-YYYY" or "Unknown"
let parsedCount=0, unknownCount=0, syson=0, blank=0;
for (let r = 4; r <= range.e.r+1; r++) {
  const cell = ws['D' + r];
  if (!cell || cell.v == null || String(cell.v).trim() === '') {
    refined.set(r, 'Unknown'); blank++; unknownCount++;
    continue;
  }
  // Prefer cell.w (Excel's formatted text — what user actually sees in Excel)
  const disp = (cell.w != null) ? String(cell.w) : String(cell.v);
  if (disp.trim().toLowerCase() === 'syson') {
    refined.set(r, 'Unknown'); syson++; unknownCount++;
    continue;
  }
  const p = parseExcelDisplay(disp);
  if (p && p.y >= 1900 && p.y <= 2100 && p.m >=1 && p.m <=12 && p.d >=1 && p.d <=31) {
    refined.set(r, fmt(p)); parsedCount++;
  } else {
    refined.set(r, 'Unknown'); unknownCount++;
  }
}
console.log(`Source lookup built: parsed=${parsedCount}, unknown=${unknownCount} (blank=${blank}, syson=${syson})`);

// 2) Open .with_calc.xlsx with exceljs and patch only column E + recompute column V cached result
(async () => {
  const ewb = new ExcelJS.Workbook();
  await ewb.xlsx.readFile(OUT_FILE);
  const ews = ewb.worksheets[0];

  let changedE = 0, sameE = 0;
  let changedVresult = 0;
  for (let r = 4; r <= ews.rowCount; r++) {
    const row = ews.getRow(r);
    if (!row.getCell(1).value) continue;       // skip blank row
    const want = refined.get(r) || 'Unknown';
    const existing = String(row.getCell(5).value || '');
    if (existing !== want) {
      row.getCell(5).value = want;
      changedE++;
    } else sameE++;

    // Recompute V's cached result with the corrected date (formula text already
    // references column E and will recompute when Excel opens the file, but we
    // also update the .result so the file shows correct numbers immediately).
    const O = Number(row.getCell(15).value || 0);
    const G = Number(row.getCell(7).value || 0);
    const C = Number(row.getCell(3).value || 0);
    let factor = 1.0;
    if (want === 'Unknown') factor = 1.0;
    else {
      const m = want.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (m) {
        const ym = parseInt(m[3],10)*100 + parseInt(m[2],10);
        if (ym >= 202510 && ym <= 202603) factor = 0.5;
      }
    }
    const newResult = (O*C) + (G*C*factor);
    const vCell = row.getCell(22);
    if (vCell && vCell.value && typeof vCell.value === 'object' && 'formula' in vCell.value) {
      const oldResult = vCell.value.result;
      if (oldResult == null || Math.abs(oldResult - newResult) > 0.01) {
        vCell.value = { formula: vCell.value.formula, result: newResult };
        changedVresult++;
      }
    }
  }
  await ewb.xlsx.writeFile(OUT_FILE);
  console.log(`Column E updated: ${changedE} cells changed, ${sameE} unchanged`);
  console.log(`Column V cached results updated: ${changedVresult}`);
})().catch(e => { console.error(e); process.exit(1); });
