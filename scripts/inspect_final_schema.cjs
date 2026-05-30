/**
 * Inspect the finalised Asset Finance.with_calc.xlsx to map each column:
 *   - header
 *   - is it input (literal value) or formula?
 *   - what is the formula?
 *   - are there year-sensitive constants left?
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

function describe(cell) {
  const v = cell.value;
  if (v == null || v === '') return { kind: 'EMPTY', detail: '' };
  if (typeof v === 'object') {
    if ('formula' in v) return { kind: 'FORMULA', detail: `=${v.formula}`, result: v.result };
    if ('sharedFormula' in v) return { kind: 'SHARED', detail: `=${v.sharedFormula}`, result: v.result };
    if (v instanceof Date) return { kind: 'DATE', detail: v.toISOString().slice(0, 10) };
    if ('result' in v) return { kind: 'COMPUTED', detail: String(v.result) };
    if ('richText' in v) return { kind: 'TEXT', detail: v.richText.map(t => t.text).join('') };
    return { kind: 'OBJ', detail: JSON.stringify(v).slice(0, 80) };
  }
  return { kind: typeof v === 'number' ? 'NUM' : 'TEXT', detail: String(v) };
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];

  console.log(`Sheet: ${ws.name}, rows: ${ws.rowCount}, cols: ${ws.columnCount}`);
  console.log('\n=== Header rows ===');
  for (let r = 1; r <= 3; r++) {
    const cells = [];
    for (let c = 1; c <= ws.columnCount; c++) {
      const v = ws.getRow(r).getCell(c).value;
      let s = '';
      if (v == null) s = '';
      else if (typeof v === 'object' && 'richText' in v) s = v.richText.map(t => t.text).join('');
      else s = String(v);
      cells.push(`[${String.fromCharCode(64 + c)}] ${s.replace(/\s+/g, ' ')}`);
    }
    console.log(`row ${r}: ${cells.filter(s => !s.endsWith('] ')).join('  |  ')}`);
  }

  console.log('\n=== Per-column behaviour (sampled across 5 rows) ===');
  const sampleRows = [4, 5, 50, 200, 350];
  for (let c = 1; c <= ws.columnCount; c++) {
    const letter = String.fromCharCode(64 + c);
    const header = (() => {
      for (let r = 3; r >= 1; r--) {
        const v = ws.getRow(r).getCell(c).value;
        if (v == null) continue;
        if (typeof v === 'object' && 'richText' in v) return v.richText.map(t => t.text).join('');
        return String(v).replace(/\s+/g, ' ');
      }
      return '';
    })();

    const kinds = new Set();
    const formulas = new Set();
    for (const r of sampleRows) {
      const d = describe(ws.getRow(r).getCell(c));
      kinds.add(d.kind);
      if (d.kind === 'FORMULA' || d.kind === 'SHARED') formulas.add(d.detail);
    }

    console.log(`\n${letter} | ${header}`);
    console.log(`   kinds across sample rows: ${[...kinds].join(', ')}`);
    if (formulas.size) {
      for (const f of formulas) console.log(`   formula: ${f.slice(0, 220)}`);
    }
  }

  console.log('\n=== Year-sensitive constants scan ===');
  for (let c = 1; c <= ws.columnCount; c++) {
    const letter = String.fromCharCode(64 + c);
    for (const r of [4, 5, 50, 200]) {
      const v = ws.getRow(r).getCell(c).value;
      if (v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v)) {
        const f = v.formula || v.sharedFormula;
        if (/\b20[12][0-9]\b/.test(f)) {
          console.log(`row ${r} col ${letter}: hardcoded year in formula: ${f.slice(0, 180)}`);
          break;
        }
      }
    }
  }
})();
