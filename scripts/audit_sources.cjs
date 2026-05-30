/**
 * One-off audit: dump sheet names, headers, row counts for the 2 source files,
 * and compare against DB asset counts.
 */
'use strict';
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const FILES = [
    'Dep. Asset Register 24-25-22042025 (3).xlsx',
    'Revised.Dep. FCRA Asset Register 24-25 22042025.xlsx'
];

function inspect(file) {
    console.log(`\n========== ${file} ==========`);
    const wb = XLSX.readFile(file, { cellDates: true });
    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
        // try header row at 0, 1, 2, 3 — print first 5 rows for context
        console.log(`\n  Sheet: "${sheetName}"  rows=${rows.length}`);
        for (let i = 0; i < Math.min(5, rows.length); i++) {
            const r = rows[i] || [];
            const preview = r.slice(0, 15).map(v => v === null ? '' : String(v).slice(0, 25)).join(' | ');
            console.log(`    [${i}] ${preview}`);
        }
    }
}

FILES.forEach(inspect);

console.log('\n\n========== DB asset counts ==========');
const db = new Database('./db.sqlite', { readonly: true });
const total = db.prepare('SELECT COUNT(*) c FROM assets').get();
console.log(`Total assets in DB: ${total.c}`);
const byCat = db.prepare("SELECT category, COUNT(*) c FROM assets GROUP BY category ORDER BY c DESC").all();
console.log('\nBy category:');
byCat.forEach(r => console.log(`  ${r.c.toString().padStart(4)}  ${r.category}`));
const cols = db.prepare("PRAGMA table_info(assets)").all();
console.log(`\nassets table columns (${cols.length}):`);
console.log('  ' + cols.map(c => c.name).join(', '));
db.close();
