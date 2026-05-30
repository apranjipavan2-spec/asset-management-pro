'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const TARGET = 'Kalike/USAID/UPS Batteries/ 01 to 03/2018-19';
const FILES = {
  current:  path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'),
  original: path.resolve('Asset New data/Asset for Finance/Asset Finance.original.xlsx'),
};

function val(v) {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('result' in v) {
      const r = v.result;
      if (r instanceof Date) return r.toISOString().slice(0, 10);
      return r;
    }
    if ('richText' in v) return v.richText.map(t => t.text).join('');
    return JSON.stringify(v).slice(0, 60);
  }
  return v;
}

(async () => {
  for (const [label, file] of Object.entries(FILES)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const ws = wb.worksheets[0];
    const last = ws.actualRowCount || ws.rowCount;
    let found = null;
    for (let r = 1; r <= last + 5; r++) {
      const row = ws.getRow(r);
      const id = String(row.getCell(1).value || '').trim();
      if (id === TARGET) { found = { r, row }; break; }
    }
    console.log('\n' + '='.repeat(90));
    console.log(`${label.toUpperCase()}   file: ${file}`);
    console.log('='.repeat(90));
    if (!found) { console.log('NOT FOUND'); continue; }
    console.log(`Row #${found.r}`);
    // Header row is row 3 — print header + value side-by-side
    const headerRow = ws.getRow(3);
    for (let c = 1; c <= 20; c++) {
      const h = val(headerRow.getCell(c).value);
      const v = val(found.row.getCell(c).value);
      const col = c <= 26 ? String.fromCharCode(64 + c) : '';
      console.log(`  ${col.padEnd(3)} ${String(h).padEnd(28)} : ${v}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
