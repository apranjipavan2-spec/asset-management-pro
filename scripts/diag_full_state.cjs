/**
 * Full diagnostic — what's actually in the file right now:
 *   - All headers row 1-3
 *   - Column E type breakdown
 *   - Any cell in columns A..AD with formula or unusual type
 *   - External workbook links / defined names / data connections
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];

  // Headers
  console.log('--- Headers (rows 1-3) ---');
  for (let r = 1; r <= 3; r++) {
    for (let c = 1; c <= 30; c++) {
      const v = ws.getRow(r).getCell(c).value;
      if (v != null && v !== '') {
        const txt = (typeof v === 'object' && 'richText' in v)
          ? v.richText.map(t => t.text).join('')
          : (typeof v === 'object' && 'result' in v ? v.result : String(v));
        console.log(`  R${r} C${c} (${String.fromCharCode(64 + c)}): ${String(txt).slice(0, 60)}`);
      }
    }
  }

  // Column E breakdown
  console.log('\n--- Column E breakdown ---');
  const tally = { date: 0, number: 0, textDDMMYYYY: 0, textOther: 0, unknown: 0, blank: 0, formula: 0 };
  const samples = { number: [], textOther: [], formula: [] };
  for (let r = 4; r <= 379; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    const v = row.getCell(5).value;
    if (v == null || v === '') tally.blank++;
    else if (v === 'Unknown') tally.unknown++;
    else if (v instanceof Date) tally.date++;
    else if (typeof v === 'number') { tally.number++; if (samples.number.length < 5) samples.number.push({ r, v }); }
    else if (typeof v === 'object' && 'formula' in v) { tally.formula++; if (samples.formula.length < 5) samples.formula.push({ r, formula: v.formula, result: v.result }); }
    else if (typeof v === 'string') {
      if (/^\d{2}-\d{2}-\d{4}$/.test(v)) tally.textDDMMYYYY++;
      else { tally.textOther++; if (samples.textOther.length < 5) samples.textOther.push({ r, v }); }
    }
  }
  for (const k of Object.keys(tally)) console.log(`  ${k}: ${tally[k]}`);
  if (samples.number.length) console.log('  Sample numeric E cells:', samples.number);
  if (samples.textOther.length) console.log('  Sample odd-text E cells:', samples.textOther);
  if (samples.formula.length) console.log('  Sample formula E cells:', samples.formula);

  // Find columns with user-added formulas (anything beyond column 24)
  console.log('\n--- Columns Y, Z, AA, AB, AC, AD (25-30) — formulas / external refs ---');
  for (let c = 25; c <= 30; c++) {
    const headerVal = ws.getRow(3).getCell(c).value;
    const headerTxt = (typeof headerVal === 'object' && headerVal && 'result' in headerVal) ? headerVal.result : headerVal;
    if (!headerTxt) continue;
    console.log(`\n  Column ${String.fromCharCode(64 + c)} header: "${headerTxt}"`);
    // Check first 3 non-empty data cells for formula
    let found = 0;
    for (let r = 4; r <= 379 && found < 3; r++) {
      const row = ws.getRow(r);
      if (!row.getCell(1).value) continue;
      const v = row.getCell(c).value;
      if (v != null && v !== '') {
        if (typeof v === 'object' && 'formula' in v) {
          console.log(`    R${r}: formula = ${v.formula}`);
          console.log(`         result  = ${JSON.stringify(v.result)}`);
        } else {
          console.log(`    R${r}: value = ${JSON.stringify(v)}`);
        }
        found++;
      }
    }
  }

  // External links / defined names
  console.log('\n--- External workbook links ---');
  const externals = (wb.model && wb.model.externalLinks) || wb._externalLinks || [];
  console.log(`  externalLinks count: ${externals.length}`);
  if (externals.length) console.log(`  details: ${JSON.stringify(externals).slice(0, 500)}`);

  console.log('\n--- Defined names ---');
  if (wb.definedNames) {
    const names = wb.definedNames.model || [];
    console.log(`  defined names count: ${names.length}`);
    for (const n of names.slice(0, 10)) console.log(`    ${JSON.stringify(n)}`);
  }

  // Scan all cell formulas for external refs (formulas containing '[' or workbook!)
  console.log('\n--- Cells with formulas referencing other workbooks ---');
  let extRefs = [];
  for (let r = 1; r <= 379; r++) {
    const row = ws.getRow(r);
    for (let c = 1; c <= 30; c++) {
      const v = row.getCell(c).value;
      if (v && typeof v === 'object' && 'formula' in v) {
        const f = v.formula || '';
        if (f.includes('[') || /'[^']+\.xls/i.test(f) || f.includes('!') && /^=?['\[]/.test(f.trim())) {
          extRefs.push({ r, c, f: f.slice(0, 120) });
        }
      }
    }
  }
  console.log(`  Found: ${extRefs.length}`);
  for (const x of extRefs.slice(0, 10)) {
    console.log(`    R${x.r} C${String.fromCharCode(64 + x.c)}: ${x.f}`);
  }
})().catch(e => { console.error(e); process.exit(1); });
