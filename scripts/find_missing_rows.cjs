'use strict';
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const SOURCES = [
    { file: 'Dep. Asset Register 24-25-22042025 (3).xlsx', sheets: ['Computers_grants', 'Office equipment_grant'] },
    { file: 'Revised.Dep. FCRA Asset Register 24-25 22042025.xlsx', sheets: ['fcra computer etc'] }
];

const db = new Database('./db.sqlite', { readonly: true });
const dbIds = new Set(db.prepare('SELECT id FROM assets').all().map(r => r.id));
db.close();

for (const { file, sheets } of SOURCES) {
    const wb = XLSX.readFile(file);
    for (const sheet of sheets) {
        const ws = wb.Sheets[sheet];
        const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
        console.log(`\n=== ${sheet} ===`);
        rows.slice(4).forEach((r, i) => {
            const id = r && r[0] ? String(r[0]).trim() : '';
            if (id && id.toLowerCase() !== 'total' && !dbIds.has(id)) {
                console.log(`  row ${i+4}: "${id}" | name="${r[2]||''}" | category="${r[1]||''}"`);
            }
        });
    }
}
