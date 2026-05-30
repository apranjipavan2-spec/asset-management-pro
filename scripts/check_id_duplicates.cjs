'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILES = {
  current:  path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'),
  original: path.resolve('Asset New data/Asset for Finance/Asset Finance.original.xlsx'),
};

function val(v) {
  if (v == null) return null;
  if (typeof v === 'object' && 'result' in v) return v.result;
  return v;
}

(async () => {
  for (const [label, file] of Object.entries(FILES)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const ws = wb.worksheets[0];
    const last = ws.actualRowCount || ws.rowCount;
    const byId = new Map();
    for (let r = 1; r <= last + 5; r++) {
      const id = String(ws.getRow(r).getCell(1).value || '').trim();
      if (!id) continue;
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push({ r, j: val(ws.getRow(r).getCell(10).value), f: val(ws.getRow(r).getCell(6).value) });
    }
    const dups = [...byId.entries()].filter(([, rows]) => rows.length > 1);
    console.log(`\n${label.toUpperCase()} — total unique IDs: ${byId.size}, IDs with duplicates: ${dups.length}`);
    for (const [id, rows] of dups) {
      console.log(`  "${id}"`);
      for (const x of rows) console.log(`     row ${String(x.r).padStart(4)}  F=${x.f}  J=${x.j}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
