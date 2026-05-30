/**
 * Cross-check the DB totals against the "Total" rows in each source sheet.
 * Reports per-sheet differences so we know if anything imported wrong.
 */
'use strict';
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const FILES = [
    { path: 'Dep. Asset Register 25-26-05052026.xlsx', isFcra: 0, sheets: [
        'Furniture & Fixtures_grants', 'Computers_grants', 'Office equipment_grant',
        'Plant & Machinery_grant', 'Office equipment_own fund', 'Furniture & Fixtures_own funds'
    ]},
    { path: 'Revised.Dep. FCRA Asset Register 25-26-05052026.xlsx', isFcra: 1, sheets: [
        'Office equipment_fcra', 'fcra computer etc'
    ]}
];

const COL = { id: 0, grossOpen: 14, netFY25: 24 };

function num(v) {
    if (v == null || v === '') return 0;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
}

const db = new Database('./db.sqlite');

console.log('\nSHEET-BY-SHEET RECONCILIATION');
console.log('='.repeat(100));
console.log('Sheet'.padEnd(36) + ' | ' + 'Src Total NetFY26'.padStart(20) + ' | ' + 'DB NetFY26'.padStart(20) + ' | ' + 'Diff'.padStart(15));
console.log('-'.repeat(100));

let grandSrc = 0, grandDb = 0;
for (const { path, isFcra, sheets } of FILES) {
    const wb = XLSX.readFile(path, { cellDates: true });
    for (const sheetName of sheets) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
        let srcTotalRow = null;
        for (let i = rows.length - 1; i >= 4; i--) {
            const r = rows[i] || [];
            if (r[0] && String(r[0]).trim().toLowerCase() === 'total') { srcTotalRow = r; break; }
        }
        const srcNet = srcTotalRow ? num(srcTotalRow[COL.netFY25]) : null;
        const dbNet = db.prepare('SELECT COALESCE(SUM(netBlock),0) s FROM assets WHERE sourceSheet = ?').get(sheetName).s;
        const diff = srcNet == null ? 'no Total row' : (srcNet - dbNet).toFixed(2);
        console.log(sheetName.padEnd(36) + ' | ' + (srcNet == null ? '(n/a)' : srcNet.toFixed(2)).padStart(20) + ' | ' + dbNet.toFixed(2).padStart(20) + ' | ' + String(diff).padStart(15));
        if (srcNet != null) { grandSrc += srcNet; grandDb += dbNet; }
    }
}
console.log('-'.repeat(100));
console.log('GRAND TOTAL'.padEnd(36) + ' | ' + grandSrc.toFixed(2).padStart(20) + ' | ' + grandDb.toFixed(2).padStart(20) + ' | ' + (grandSrc - grandDb).toFixed(2).padStart(15));

const total = db.prepare('SELECT COUNT(*) c FROM assets').get().c;
const fcra = db.prepare('SELECT COUNT(*) c FROM assets WHERE isFcra=1').get().c;
const nonFcra = db.prepare('SELECT COUNT(*) c FROM assets WHERE isFcra=0').get().c;
console.log(`\nDB has ${total} assets: ${nonFcra} non-FCRA + ${fcra} FCRA`);

const grossSum = db.prepare('SELECT COALESCE(SUM(grossBlock),0) s FROM assets').get().s;
const netSum = db.prepare('SELECT COALESCE(SUM(netBlock),0) s FROM assets').get().s;
console.log(`Total Gross Block: Rs ${grossSum.toFixed(2)}`);
console.log(`Total Net Block (FY 25-26): Rs ${netSum.toFixed(2)}`);

db.close();
