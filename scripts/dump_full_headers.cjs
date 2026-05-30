'use strict';
const XLSX = require('xlsx');

function dumpHeader(file, sheetName, headerRowIdx) {
    const wb = XLSX.readFile(file, { cellDates: true });
    const ws = wb.Sheets[sheetName];
    if (!ws) { console.log(`  Sheet not found: ${sheetName}`); return; }
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true });
    console.log(`\n=== ${file} :: "${sheetName}" ===`);
    // Print top-3 rows wide
    for (let i = 0; i <= headerRowIdx + 1 && i < rows.length; i++) {
        const r = rows[i] || [];
        console.log(`Row[${i}] (${r.length} cells):`);
        r.forEach((v, ci) => {
            if (v != null && String(v).trim() !== '') console.log(`   col${String(ci).padStart(2)}: ${String(v).trim()}`);
        });
    }
    // Print first data row
    const first = rows[headerRowIdx + 1] || [];
    console.log(`First data row (${first.length} cells):`);
    first.forEach((v, ci) => {
        if (v != null && String(v).trim() !== '') console.log(`   col${String(ci).padStart(2)}: ${String(v).trim().slice(0, 60)}`);
    });
}

dumpHeader('Dep. Asset Register 24-25-22042025 (3).xlsx', 'Furniture & Fixtures_grants', 3);
dumpHeader('Revised.Dep. FCRA Asset Register 24-25 22042025.xlsx', 'fcra computer etc', 3);
dumpHeader('Revised.Dep. FCRA Asset Register 24-25 22042025.xlsx', 'Office equipment_fcra', 3);
