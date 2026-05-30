/**
 * Compare depreciation calculations between two files:
 *   - Asset Finance.with_calc.xlsx       (manual / earlier calc)
 *   - Asset Finance.with_calc.auto.xlsx  (auto-generated calc)
 *
 * Identify which columns differ and where the largest discrepancies lie.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

function num(c) {
  if (c == null) return 0;
  if (typeof c === 'number') return c;
  if (typeof c === 'object' && c !== null) {
    if ('result' in c) return Number(c.result || 0);
    if ('text' in c) return Number(c.text) || 0;
  }
  const n = Number(c);
  return Number.isFinite(n) ? n : 0;
}

function str(c) {
  if (c == null) return '';
  if (typeof c === 'object' && c !== null) {
    if ('result' in c) return String(c.result ?? '');
    if ('text' in c) return String(c.text ?? '');
    if ('richText' in c) return c.richText.map(t => t.text).join('');
  }
  return String(c);
}

(async () => {
  const base = 'Asset New data/Asset for Finance';
  const wbA = new ExcelJS.Workbook();
  const wbB = new ExcelJS.Workbook();
  await wbA.xlsx.readFile(path.resolve(base, 'Asset Finance.with_calc.xlsx'));
  await wbB.xlsx.readFile(path.resolve(base, 'Asset Finance.with_calc.auto.xlsx'));

  const wsA = wbA.worksheets[0];
  const wsB = wbB.worksheets[0];

  // Get headers
  const headersA = [];
  const headersB = [];
  for (let c = 1; c <= Math.max(wsA.columnCount, wsB.columnCount); c++) {
    headersA.push(str(wsA.getRow(3).getCell(c).value) || str(wsA.getRow(2).getCell(c).value) || str(wsA.getRow(1).getCell(c).value));
    headersB.push(str(wsB.getRow(3).getCell(c).value) || str(wsB.getRow(2).getCell(c).value) || str(wsB.getRow(1).getCell(c).value));
  }

  console.log('=== File A: Asset Finance.with_calc.xlsx ===');
  console.log(`Rows: ${wsA.rowCount}, Cols: ${wsA.columnCount}`);
  console.log('Headers:');
  headersA.forEach((h, i) => { if (h) console.log(`  Col ${String.fromCharCode(65 + i)} (${i + 1}): ${h}`); });

  console.log('\n=== File B: Asset Finance.with_calc.auto.xlsx ===');
  console.log(`Rows: ${wsB.rowCount}, Cols: ${wsB.columnCount}`);
  console.log('Headers:');
  headersB.forEach((h, i) => { if (h) console.log(`  Col ${String.fromCharCode(65 + i)} (${i + 1}): ${h}`); });

  // Find depreciation-related columns
  console.log('\n=== Depreciation-related columns ===');
  const depColsA = [];
  const depColsB = [];
  headersA.forEach((h, i) => { if (h && /depr|deprec/i.test(h)) depColsA.push({ col: i + 1, header: h }); });
  headersB.forEach((h, i) => { if (h && /depr|deprec/i.test(h)) depColsB.push({ col: i + 1, header: h }); });
  console.log('File A depreciation cols:', depColsA);
  console.log('File B depreciation cols:', depColsB);

  // Find the calculated depreciation column in each file
  // Typically column V (22) or whatever has "Calculated" / "Total" depreciation
  const findCol = (headers, patterns) => {
    for (const p of patterns) {
      for (let i = 0; i < headers.length; i++) {
        if (headers[i] && p.test(headers[i])) return i + 1;
      }
    }
    return -1;
  };

  const calcDepA = findCol(headersA, [/calc.*depr/i, /total.*depr/i, /^depr.*calc/i]);
  const calcDepB = findCol(headersB, [/calc.*depr/i, /total.*depr/i, /^depr.*calc/i]);
  console.log(`\nCalculated Depreciation col in A: ${calcDepA} (header: "${headersA[calcDepA - 1]}")`);
  console.log(`Calculated Depreciation col in B: ${calcDepB} (header: "${headersB[calcDepB - 1]}")`);

  // Compare row by row, for all numeric columns
  console.log('\n=== Row-by-row diff (per column totals) ===');
  const maxCols = Math.max(wsA.columnCount, wsB.columnCount);
  const colDiffs = []; // {col, header, sumA, sumB, diff, diffCount}
  for (let c = 1; c <= maxCols; c++) {
    let sumA = 0, sumB = 0, diffCount = 0, exampleDiffs = [];
    const startRow = 4;
    const maxRow = Math.max(wsA.rowCount, wsB.rowCount);
    for (let r = startRow; r <= maxRow; r++) {
      const vA = num(wsA.getRow(r).getCell(c).value);
      const vB = num(wsB.getRow(r).getCell(c).value);
      sumA += vA; sumB += vB;
      if (Math.abs(vA - vB) > 0.01) {
        diffCount++;
        if (exampleDiffs.length < 5) exampleDiffs.push({ r, vA, vB, d: vB - vA });
      }
    }
    if (Math.abs(sumA - sumB) > 0.01 || diffCount > 0) {
      colDiffs.push({ col: c, colLetter: String.fromCharCode(64 + c), headerA: headersA[c - 1] || '', headerB: headersB[c - 1] || '', sumA, sumB, diff: sumB - sumA, diffCount, exampleDiffs });
    }
  }

  console.log('Columns that differ between the two files:');
  console.log('col | header                          | sum A          | sum B          | diff           | rows differ');
  console.log('-'.repeat(120));
  for (const d of colDiffs) {
    console.log(`${d.colLetter.padEnd(3)} | ${(d.headerA || d.headerB).slice(0, 32).padEnd(32)} | ${d.sumA.toFixed(2).padStart(14)} | ${d.sumB.toFixed(2).padStart(14)} | ${d.diff.toFixed(2).padStart(14)} | ${d.diffCount}`);
  }

  // Show example diffs for each differing column
  console.log('\n=== Example differing rows per column ===');
  for (const d of colDiffs) {
    if (d.exampleDiffs.length === 0) continue;
    console.log(`\nColumn ${d.colLetter} (${d.headerA || d.headerB}):`);
    for (const e of d.exampleDiffs) {
      console.log(`  row ${e.r}: A=${e.vA.toFixed(2)}  B=${e.vB.toFixed(2)}  diff=${e.d.toFixed(2)}`);
    }
  }
})();
