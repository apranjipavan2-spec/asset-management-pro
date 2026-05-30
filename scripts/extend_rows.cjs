/**
 * Extend the usable area of the worksheet so the user can scroll past
 * row 379 and add new asset rows.
 *
 * What we do:
 *   - Fix autoFilter to cover the full data range A3:Z379 (not just the
 *     header row), so Excel knows the data is bounded.
 *   - Touch row 600 with an empty value, which forces ExcelJS to update
 *     worksheet dimensions to include that row. Excel respects the saved
 *     <dimension> tag for the scrollable area.
 *   - Remove any sheet protection or scroll-area constraints if present.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  // 1) autoFilter: cover the actual data, not just the header
  ws.autoFilter = { from: 'A3', to: 'Z379' };

  // 2) Remove any sheet protection
  if (ws.protect) {
    try { ws.unprotect(); } catch (_) {}
  }

  // 3) Clear any scrollArea on views, reset activeCell to top of data
  if (Array.isArray(ws.views)) {
    for (const v of ws.views) {
      if (v.scrollArea) delete v.scrollArea;
      v.activeCell = 'A4';
      v.topLeftCell = 'A1';
    }
  }

  // 4) Force the dimensions to extend past 379 by writing a sentinel into
  //    cell A600. We then clear its value but keep the row reference so
  //    ExcelJS records the larger sheet bounds.
  const sentinelRow = 600;
  ws.getCell(`A${sentinelRow}`).value = ' ';   // single space placeholder
  ws.getCell(`A${sentinelRow}`).value = null;  // clear back
  // Explicitly bump the worksheet dimension
  ws.getRow(sentinelRow).commit?.();

  await wb.xlsx.writeFile(FILE);

  // Verify
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile(FILE);
  const ws2 = wb2.worksheets[0];
  console.log(`After save:`);
  console.log(`  rowCount     : ${ws2.rowCount}`);
  console.log(`  dimensions   : ${JSON.stringify(ws2.dimensions)}`);
  console.log(`  autoFilter   : ${JSON.stringify(ws2.autoFilter)}`);
  console.log('Saved.');
})().catch(e => { console.error(e); process.exit(1); });
