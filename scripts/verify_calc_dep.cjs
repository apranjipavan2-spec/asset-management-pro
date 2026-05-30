'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];

  // Confirm header
  console.log('Row 2:', { V: ws.getRow(2).getCell(22).value });
  console.log('Row 3:', { V: ws.getRow(3).getCell(22).value });

  // Confirm column V width
  console.log('Col K width:', ws.getColumn(11).width, ' Col V width:', ws.getColumn(22).width);

  // Sample rows: existing-only, new-addition Oct-Mar (half), Apr-Sep (full), Unknown
  const samples = [
    { row: 4,   note: 'Continuing only (Aug 2011)' },
    { row: 143, note: 'New addition Nov 2025 — half year' },
    { row: 152, note: 'New addition Jan 2026 — half year' },
    { row: 311, note: 'New addition Unknown date — full year' },
    { row: 361, note: 'New addition Jul 2025 — full year (Apr-Sep)' },
    { row: 379, note: 'Continuing only (Sep 2018)' },
  ];
  console.log('\nrow | note                                   | refDate    | O (net25)  | G (add)  | C (rate) | K (curr) | V (new)  | factor');
  console.log('-'.repeat(150));
  for (const s of samples) {
    const row = ws.getRow(s.row);
    const refD = row.getCell(5).value;
    const O = Number(row.getCell(15).value || 0);
    const G = Number(row.getCell(7).value || 0);
    const C = Number(row.getCell(3).value || 0);
    const Kv = row.getCell(11).value;
    const Vv = row.getCell(22).value;
    const Kres = Kv && Kv.result != null ? Kv.result : (typeof Kv === 'number' ? Kv : '');
    const Vres = Vv && Vv.result != null ? Vv.result : (typeof Vv === 'number' ? Vv : '');
    const m = (refD || '').toString().match(/^(\d{2})-(\d{2})-(\d{4})$/);
    let factor = 1.0;
    if ((refD || '') === 'Unknown') factor = 1.0;
    else if (m) {
      const ym = parseInt(m[3])*100 + parseInt(m[2]);
      if (ym >= 202510 && ym <= 202603) factor = 0.5;
    }
    const expected = (O*C) + (G*C*factor);
    const okMark = (Math.abs((Vres||0) - expected) < 0.01) ? '✓' : '✗';
    console.log(`${String(s.row).padStart(3)} | ${s.note.padEnd(40)} | ${String(refD||'').padEnd(10)} | ${String(O).padStart(10).slice(0,10)} | ${String(G).padStart(8).slice(0,8)} | ${String(C).padStart(8).slice(0,8)} | ${String(Kres).padStart(8).slice(0,8)} | ${String(Vres).padStart(8).slice(0,8)} | ${factor}  ${okMark}`);
  }

  // Total Calculated Depreciation across all rows
  let totalV = 0, totalK = 0;
  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;
    const Kv = row.getCell(11).value;
    const Vv = row.getCell(22).value;
    totalK += Kv && Kv.result != null ? Kv.result : (typeof Kv === 'number' ? Kv : 0);
    totalV += Vv && Vv.result != null ? Vv.result : (typeof Vv === 'number' ? Vv : 0);
  }
  console.log(`\nTotals:`);
  console.log(`  K (existing Depreciation - Cost):      ${totalK.toFixed(2)}`);
  console.log(`  V (Calculated Depreciation):           ${totalV.toFixed(2)}`);
  console.log(`  Difference (V picks up new additions): ${(totalV - totalK).toFixed(2)}`);

  // Formula count: original 2071 + 376 new = 2447
  let fcount = 0;
  ws.eachRow(row => row.eachCell(c => { if (c.formula) fcount++; }));
  console.log(`\nFormula cells: ${fcount} (expected 2071 + 376 = 2447)`);

  // Style spot-check on V
  const v3 = ws.getRow(3).getCell(22);
  console.log('\nV3 styling:');
  console.log('  border:', v3.border ? 'yes' : 'no', ' font:', v3.font ? JSON.stringify(v3.font) : 'no', ' alignment:', v3.alignment ? JSON.stringify(v3.alignment) : 'no');
  const v4 = ws.getRow(4).getCell(22);
  console.log('V4 styling:');
  console.log('  border:', v4.border ? 'yes' : 'no', ' numFmt:', v4.numFmt || 'no');
})();
