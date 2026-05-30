/**
 * Add column V "Calculated Depreciation" to Asset Finance.xlsx
 *
 * Logic (per row n):
 *   Let O_n = opening Net Block FY24-25 (col O), G_n = Additions (col G),
 *   C_n = Depreciation Rate (col C), E_n = Refined Aquis Date (DD-MM-YYYY text).
 *
 *   Continuing asset portion (always full year): O_n * C_n
 *   New-addition portion: G_n * C_n * factor
 *     factor = 0.5 if E_n is in [Oct 2025 .. Mar 2026]  (half-year rule)
 *     factor = 1.0 otherwise (incl. Apr-Sep 2025 purchases and continuing-only rows)
 *     If E_n = "Unknown" → factor = 1.0 (conservative)
 *
 *   Calculated Depreciation = (O_n*C_n) + (G_n*C_n*factor)
 *
 * Style: matches column K (same number format, borders, header style, width).
 * All existing formulas, styles, and column widths in the workbook are preserved.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE     = path.resolve('Asset New data/Asset for Finance/Asset Finance.xlsx');
const OUT_FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');
const NEW_COL_LETTER = 'V';
const NEW_COL_IDX = 22;          // 1-based: A=1, B=2, ..., V=22
const REF_COL_LETTER = 'K';      // style we will mirror
const REF_COL_IDX = 11;

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  // Note current state for verification
  const lastDataRow = ws.rowCount;
  console.log(`Workbook has ${lastDataRow} rows.`);

  // 1. Determine the data row range. Row 3 is headers; data starts at row 4.
  //    Walk until last row with an Asset ID in column A.
  let firstDataRow = 4;
  let endDataRow = 4;
  for (let r = 4; r <= lastDataRow; r++) {
    const id = ws.getRow(r).getCell(1).value;
    if (id != null && String(id).trim() !== '') endDataRow = r;
  }
  console.log(`Data rows: ${firstDataRow}..${endDataRow}`);

  // 2. Build the header for column V.
  //    Row 1 title is merged A1:C2 only — leave V1 blank.
  //    Row 2 has group labels — set V2 = "FY 25-26" (matches existing pattern at P2).
  //    Row 3 column header = "Calculated Depreciation".
  const hdrRow3 = ws.getRow(3);
  const refHdrCell = hdrRow3.getCell(REF_COL_IDX);
  const newHdrCell = hdrRow3.getCell(NEW_COL_IDX);
  newHdrCell.value = 'Calculated Depreciation';
  // Copy header style from K3 (font/fill/border/alignment/numFmt)
  if (refHdrCell.font)       newHdrCell.font       = { ...refHdrCell.font };
  if (refHdrCell.fill)       newHdrCell.fill       = JSON.parse(JSON.stringify(refHdrCell.fill));
  if (refHdrCell.border)     newHdrCell.border     = JSON.parse(JSON.stringify(refHdrCell.border));
  if (refHdrCell.alignment)  newHdrCell.alignment  = { ...refHdrCell.alignment };

  // Row 2 group label
  const hdrRow2 = ws.getRow(2);
  hdrRow2.getCell(NEW_COL_IDX).value = 'FY 25-26';
  const p2 = hdrRow2.getCell(16);   // P2 is the existing FY 25-26 group cell
  if (p2.font)       hdrRow2.getCell(NEW_COL_IDX).font      = { ...p2.font };
  if (p2.alignment)  hdrRow2.getCell(NEW_COL_IDX).alignment = { ...p2.alignment };

  // 3. Populate column V with the depreciation formula for each data row.
  let written = 0;
  let halfYearRows = 0, fullYearWithAdditions = 0, unknownRows = 0;
  for (let r = firstDataRow; r <= endDataRow; r++) {
    const row = ws.getRow(r);
    const refDate = String(row.getCell(5).value || '');     // E_n
    const additions = Number(row.getCell(7).value || 0);
    // Build the formula
    //   IF(E="Unknown", O*C + G*C,
    //      IF(AND(YYYYMM(E) >= 202510, YYYYMM(E) <= 202603),
    //         O*C + G*C*0.5,
    //         O*C + G*C))
    const formula =
      `IF(E${r}="Unknown",IFERROR(O${r},0)*C${r}+IFERROR(G${r},0)*C${r},` +
      `IF(AND(VALUE(MID(E${r},7,4))*100+VALUE(MID(E${r},4,2))>=202510,` +
         `VALUE(MID(E${r},7,4))*100+VALUE(MID(E${r},4,2))<=202603),` +
      `IFERROR(O${r},0)*C${r}+IFERROR(G${r},0)*C${r}*0.5,` +
      `IFERROR(O${r},0)*C${r}+IFERROR(G${r},0)*C${r}))`;

    // Pre-compute the numeric result for `.result` field (so cached value is correct)
    const oVal = Number(row.getCell(15).value || 0);
    const gVal = additions;
    const rVal = Number(row.getCell(3).value || 0);
    let factor = 1.0;
    if (refDate === 'Unknown') factor = 1.0;
    else {
      const m = refDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (m) {
        const yyyymm = parseInt(m[3]) * 100 + parseInt(m[2]);
        if (yyyymm >= 202510 && yyyymm <= 202603) factor = 0.5;
      }
    }
    const result = (oVal * rVal) + (gVal * rVal * factor);

    const newCell = row.getCell(NEW_COL_IDX);
    newCell.value = { formula, result };

    // Style: mirror column K's data style for this row
    const refCell = row.getCell(REF_COL_IDX);
    if (refCell.numFmt)    newCell.numFmt    = refCell.numFmt;
    if (refCell.border)    newCell.border    = JSON.parse(JSON.stringify(refCell.border));
    if (refCell.font)      newCell.font      = { ...refCell.font };
    if (refCell.alignment) newCell.alignment = { ...refCell.alignment };
    if (refCell.fill)      newCell.fill      = JSON.parse(JSON.stringify(refCell.fill));

    written++;
    if (additions > 0 && factor === 0.5) halfYearRows++;
    else if (additions > 0 && refDate === 'Unknown') unknownRows++;
    else if (additions > 0 && factor === 1.0) fullYearWithAdditions++;
  }

  // 4. Set column V width to match K
  const refColDef = ws.getColumn(REF_COL_IDX);
  const newColDef = ws.getColumn(NEW_COL_IDX);
  newColDef.width = refColDef.width;

  // 5. Save to separate file (original untouched)
  await wb.xlsx.writeFile(OUT_FILE);
  console.log(`Wrote: ${OUT_FILE}`);

  console.log(`\nWrote column V "Calculated Depreciation" for ${written} rows.`);
  console.log(`  Continuing-only / Apr-Sep additions (full year): ${written - halfYearRows - unknownRows - fullYearWithAdditions} rows continuing-only + ${fullYearWithAdditions} Apr-Sep additions`);
  console.log(`  Oct-Mar additions (half year):          ${halfYearRows}`);
  console.log(`  Additions with Unknown date (full):     ${unknownRows}`);
})().catch(e => { console.error(e); process.exit(1); });
