/**
 * Remove all conditional formatting rules from the worksheet.
 *
 * Reason: the file had CF rules that referenced an external defined name
 * (AssetErrorCode → '[1]Assets') which we deleted to make the file
 * standalone. Excel then dropped them on open and flagged it as
 * "Removed Records: Conditional formatting". A 12th rule had an
 * unparsable type. Cleanest path is to wipe all CF — the user prefers
 * to apply highlighting themselves.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  const before = (ws.conditionalFormattings || []).length;
  ws.conditionalFormattings = [];

  await wb.xlsx.writeFile(FILE);

  // Verify
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.readFile(FILE);
  const after = (wb2.worksheets[0].conditionalFormattings || []).length;
  console.log(`Conditional formatting rules: before=${before}, after=${after}`);
  console.log(`Saved: ${FILE}`);
})().catch(e => { console.error(e); process.exit(1); });
