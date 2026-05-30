// Import bank account master from xlsx into bank_accounts table.
// Usage:  node scripts/import_bank_master.cjs <path-to-xlsx>
// Default path: ./master_bank_details.xlsx in repo root.

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const XLSX = require('xlsx');

const xlsxPath = process.argv[2] || './master_bank_details.xlsx';
const dbPath = './db.sqlite';

if (!fs.existsSync(xlsxPath)) {
    console.error(`File not found: ${xlsxPath}`);
    console.error('Usage: node scripts/import_bank_master.cjs <path-to-xlsx>');
    process.exit(1);
}
if (!fs.existsSync(dbPath)) {
    console.error(`DB not found: ${dbPath}. Run "npm run db:init" first.`);
    process.exit(1);
}

const db = new DatabaseSync(dbPath);

// Ensure table exists (idempotent)
db.exec(`CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bankName TEXT,
    accountNumber TEXT NOT NULL,
    ifsc TEXT,
    sourceFile TEXT,
    sourceSheet TEXT,
    reviewNotes TEXT,
    createdAt TEXT,
    updatedAt TEXT
)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_bank_accounts_name ON bank_accounts(name)`);

const wb = XLSX.readFile(xlsxPath);
const sheet = wb.Sheets['Master'] || wb.Sheets[wb.SheetNames[0]];
if (!sheet) {
    console.error('No Master sheet found.');
    process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
console.log(`Read ${rows.length} rows from ${xlsxPath}.`);

const now = new Date().toISOString();
const insert = db.prepare(`INSERT OR REPLACE INTO bank_accounts
    (id, name, bankName, accountNumber, ifsc, sourceFile, sourceSheet, reviewNotes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

db.exec('BEGIN');
let n = 0, skipped = 0;
try {
    db.exec('DELETE FROM bank_accounts');
    for (const r of rows) {
        const name = String(r['Name'] || '').replace(/[\r\n]+/g, ' ').trim();
        const acct = String(r['Account Number'] || '').trim();
        if (!name || !acct) { skipped++; continue; }
        const id = `BA-${String(n).padStart(5, '0')}`;
        insert.run(
            id,
            name,
            String(r['Bank Name'] || '').trim(),
            acct,
            String(r['IFSC Code'] || '').trim(),
            String(r['Source File'] || '').trim(),
            String(r['Source Sheet'] || '').trim(),
            String(r['Review Notes'] || '').trim(),
            now,
            now
        );
        n++;
    }
    db.exec('COMMIT');
} catch (e) {
    db.exec('ROLLBACK');
    throw e;
}

console.log(`Imported ${n} rows. Skipped ${skipped} (missing name or account).`);
const total = db.prepare('SELECT COUNT(*) AS c FROM bank_accounts').get();
console.log(`bank_accounts now has ${total.c} rows.`);
db.close();
