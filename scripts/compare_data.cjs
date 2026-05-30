/**
 * Deep compare: actual data rows in source sheets vs DB rows.
 * Per-category match to find what made it from Excel → DB.
 */
'use strict';
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const FILES = {
    'NON_FCRA': 'Dep. Asset Register 24-25-22042025 (3).xlsx',
    'FCRA': 'Revised.Dep. FCRA Asset Register 24-25 22042025.xlsx'
};

// Data sheets only (exclude summary/schedule/working sheets)
const DATA_SHEETS = {
    'NON_FCRA': [
        'Furniture & Fixtures_grants',
        'Computers_grants',
        'Office equipment_grant',
        'Plant & Machinery_grant',
        'Office equipment_own fund',
        'Furniture & Fixtures_own funds'
    ],
    'FCRA': [
        'Office equipment_fcra',
        'fcra computer etc'
    ]
};

function countDataRows(file, sheetName) {
    const wb = XLSX.readFile(file, { cellDates: true });
    const ws = wb.Sheets[sheetName];
    if (!ws) return { rows: 0, ids: [] };
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    // Header row at index 3 in data sheets; data begins at index 4
    const dataRows = rows.slice(4).filter(r => {
        // Must have a non-empty first cell (Asset Identification Number)
        return r && r[0] != null && String(r[0]).trim() !== '';
    });
    const ids = dataRows.map(r => String(r[0]).trim());
    return { rows: dataRows.length, ids };
}

console.log('========== Source Excel: data rows per data-sheet ==========\n');
const allSourceIds = new Set();
let sourceTotalRows = 0;
for (const [bucket, file] of Object.entries(FILES)) {
    console.log(`\n[${bucket}] ${file}`);
    for (const sheet of DATA_SHEETS[bucket]) {
        const { rows, ids } = countDataRows(file, sheet);
        console.log(`  ${sheet.padEnd(40)} ${String(rows).padStart(4)} data rows`);
        ids.forEach(id => allSourceIds.add(id));
        sourceTotalRows += rows;
    }
}
console.log(`\nTotal source data rows (both files):  ${sourceTotalRows}`);
console.log(`Unique source Asset IDs:             ${allSourceIds.size}`);

const db = new Database('./db.sqlite', { readonly: true });
const dbAssets = db.prepare('SELECT id, name, category, fundingSource, amount, grossBlock FROM assets').all();
const dbIds = new Set(dbAssets.map(a => a.id));
console.log(`\nDB assets total:                     ${dbAssets.length}`);

// Intersection
const inBoth = [...allSourceIds].filter(id => dbIds.has(id));
const inSourceOnly = [...allSourceIds].filter(id => !dbIds.has(id));
const inDbOnly = [...dbIds].filter(id => !allSourceIds.has(id));
console.log(`  IDs in both source & DB:           ${inBoth.length}`);
console.log(`  IDs in source but NOT in DB:       ${inSourceOnly.length}`);
console.log(`  IDs in DB but NOT in source:       ${inDbOnly.length}`);

if (inSourceOnly.length && inSourceOnly.length < 30) {
    console.log('\n  Source IDs missing from DB:');
    inSourceOnly.forEach(id => console.log(`    - ${id}`));
} else if (inSourceOnly.length) {
    console.log(`\n  (First 10 source IDs missing from DB)`);
    inSourceOnly.slice(0, 10).forEach(id => console.log(`    - ${id}`));
}

if (inDbOnly.length && inDbOnly.length < 30) {
    console.log('\n  DB IDs not in source (extra/seeded):');
    inDbOnly.forEach(id => console.log(`    - ${id}`));
} else if (inDbOnly.length) {
    console.log(`\n  (First 10 DB IDs not in source)`);
    inDbOnly.slice(0, 10).forEach(id => console.log(`    - ${id}`));
}

// FCRA tagging check
console.log('\n========== fundingSource distribution in DB ==========');
const fundDist = db.prepare("SELECT COALESCE(fundingSource,'(null)') as src, COUNT(*) c FROM assets GROUP BY fundingSource ORDER BY c DESC").all();
fundDist.forEach(r => console.log(`  ${String(r.c).padStart(4)}  ${r.src}`));

db.close();
