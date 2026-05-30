/**
 * One-shot cleanup for Asset Finance.xlsx
 *
 *   1. Fill column E "Refined Aquis Date" with uniform DD-MM-YYYY parsed from column D
 *   2. Mark blank Acquisition Dates in column D as "Unknown" (and column E)
 *   3. Mark invalid "Syson" entry at row 269 in column D as "Unknown" (and column E)
 *   4. Mark blank Donor Names in column T as "Unknown"
 *
 * Formula cells (I, K, L, N, P, S — 2071 cells) are never touched.
 * Negative net block at row 171 left as-is.
 * Duplicate Asset ID at row 379 left as-is.
 */
'use strict';
const XLSX = require('xlsx');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.xlsx');

// Cell-style options preserved so we don't strip formatting
const wb = XLSX.readFile(FILE, { cellDates: true, cellFormula: true, cellStyles: true, cellNF: true });
const sheetName = wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const range = XLSX.utils.decode_range(ws['!ref']);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad2(n){ return String(n).padStart(2,'0'); }
function fmtDDMMYYYY(d){ return `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}`; }

/**
 * Parse a column-D value into a Date or null (unparseable).
 * Accepts: Date object, DD.MM.YY, DD.MM.YYYY, with optional whitespace.
 */
function parseAcqDate(v) {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') {                       // Excel serial fallback
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v*86400000);
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return new Date(+m[3], +m[2]-1, +m[1]);
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/);
  if (m) {
    const yy = +m[3];
    const year = yy < 50 ? 2000 + yy : 1900 + yy;    // 19 → 2019, 95 → 1995
    return new Date(year, +m[2]-1, +m[1]);
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = +m[3]; if (year < 100) year = year<50 ? 2000+year : 1900+year;
    return new Date(year, +m[2]-1, +m[1]);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

const stats = {
  refinedFilled: 0,
  acqUnknown: 0,
  sysonFixed: 0,
  donorUnknown: 0,
  refinedUnknown: 0,
};

const log = [];

// Make sure the sheet range covers columns D, E, T (it does: A:U is 0..20)
// Walk every data row (row index 4 = row 4 in spreadsheet; headers are rows 1-3)
for (let r = 3; r <= range.e.r; r++) {        // 0-based: rows 4..end
  const excelRow = r + 1;
  const idCell = ws['A' + excelRow];
  if (!idCell || idCell.v == null || String(idCell.v).trim() === '') continue;

  const colD = 'D' + excelRow;
  const colE = 'E' + excelRow;
  const colT = 'T' + excelRow;

  const dCell = ws[colD];
  const rawD = dCell ? dCell.v : null;

  // --- Step A: parse column D ---
  let parsed = parseAcqDate(rawD);
  let dIsUnknown = false;

  if (parsed === null) {
    // Blank, or invalid like "Syson"
    if (rawD != null && String(rawD).trim() !== '') {
      // invalid value (Syson)
      ws[colD] = { t: 's', v: 'Unknown', w: 'Unknown' };
      stats.sysonFixed++;
      log.push(`row ${excelRow}: column D was "${rawD}" → "Unknown"`);
    } else {
      // blank
      ws[colD] = { t: 's', v: 'Unknown', w: 'Unknown' };
      stats.acqUnknown++;
      log.push(`row ${excelRow}: column D was blank → "Unknown"`);
    }
    dIsUnknown = true;
  }

  // --- Step B: write column E ---
  if (dIsUnknown) {
    ws[colE] = { t: 's', v: 'Unknown', w: 'Unknown' };
    stats.refinedUnknown++;
  } else {
    const formatted = fmtDDMMYYYY(parsed);
    ws[colE] = { t: 's', v: formatted, w: formatted };
    stats.refinedFilled++;
  }

  // --- Step C: donor column T ---
  const tCell = ws[colT];
  if (!tCell || tCell.v == null || String(tCell.v).trim() === '') {
    ws[colT] = { t: 's', v: 'Unknown', w: 'Unknown' };
    stats.donorUnknown++;
  }
}

// Ensure the sheet range still includes column E (it does — file goes A:U).
// Re-emit !ref just to be safe.
ws['!ref'] = XLSX.utils.encode_range({ s: range.s, e: { r: range.e.r, c: Math.max(range.e.c, 4) } });

// Write back to the same file
XLSX.writeFile(wb, FILE, { cellDates: true, bookType: 'xlsx' });

console.log('='.repeat(80));
console.log('Asset Finance.xlsx — cleanup applied');
console.log('='.repeat(80));
console.log(`  Refined Aquis Date filled with DD-MM-YYYY ........ ${stats.refinedFilled}`);
console.log(`  Refined Aquis Date set to "Unknown" .............. ${stats.refinedUnknown}`);
console.log(`  Acquisition Date set to "Unknown" (was blank) .... ${stats.acqUnknown}`);
console.log(`  Acquisition Date set to "Unknown" (was "Syson") .. ${stats.sysonFixed}`);
console.log(`  Donor Name set to "Unknown" ...................... ${stats.donorUnknown}`);
console.log('');
console.log('Per-row changes for columns D/E:');
for (const line of log) console.log('  ' + line);
