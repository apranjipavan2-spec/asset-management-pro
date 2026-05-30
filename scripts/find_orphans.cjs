/**
 * Find assets in the DB whose IDs no longer appear in the new 25-26 source files.
 * These are "orphans" from the previous import.
 */
'use strict';
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const FILES = [
    { path: 'Dep. Asset Register 25-26-05052026.xlsx', sheets: [
        'Furniture & Fixtures_grants', 'Computers_grants', 'Office equipment_grant',
        'Plant & Machinery_grant', 'Office equipment_own fund', 'Furniture & Fixtures_own funds'
    ]},
    { path: 'Revised.Dep. FCRA Asset Register 25-26-05052026.xlsx', sheets: [
        'Office equipment_fcra', 'fcra computer etc'
    ]}
];

const db = new Database('./db.sqlite');

const sourceIds = new Set();
const seenIds = new Set();
for (const { path, sheets } of FILES) {
    const wb = XLSX.readFile(path, { cellDates: true });
    for (const sheetName of sheets) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
        for (let i = 4; i < rows.length; i++) {
            const r = rows[i] || [];
            const rawId = r[0];
            if (!rawId || String(rawId).trim() === '' || String(rawId).trim().toLowerCase() === 'total') continue;
            let id = String(rawId).trim();
            if (seenIds.has(id)) {
                let n = 2;
                while (seenIds.has(`${id} #${n}`)) n++;
                id = `${id} #${n}`;
            }
            seenIds.add(id);
            sourceIds.add(id);
        }
    }
}

const dbAssets = db.prepare("SELECT id, name, category, sourceSheet, netBlock FROM assets WHERE sourceSheet IS NOT NULL ORDER BY sourceSheet, id").all();

console.log(`Source files contain ${sourceIds.size} unique asset IDs across importable sheets.`);
console.log(`DB has ${dbAssets.length} assets with sourceSheet set.\n`);

const orphans = dbAssets.filter(a => !sourceIds.has(a.id));
console.log(`Orphans (in DB but NOT in new source files): ${orphans.length}\n`);
let orphanNet = 0;
for (const o of orphans) {
    orphanNet += (o.netBlock || 0);
    console.log(`  [${o.sourceSheet}] ${o.id} | ${o.name} | NetBlock: ${(o.netBlock || 0).toFixed(2)}`);
}
console.log(`\nTotal orphan Net Block: Rs ${orphanNet.toFixed(2)}`);

db.close();
