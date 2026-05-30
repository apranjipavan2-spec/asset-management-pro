'use strict';
const Database = require('better-sqlite3');
const db = new Database('db.sqlite');
const row = db.prepare(`
    SELECT assetId, assetClass, description, location, purchaseOrKind,
           acqDate, supplierName, billNo, installationDate, quantity,
           depRate, grossBlockOpening, accDepOpening, netBlockPrevFY, status
    FROM asset_far
    WHERE fy = 2025 AND description IS NOT NULL AND description <> ''
    LIMIT 3
`).all();
console.log('Sample rows from DB:');
row.forEach((r, i) => {
    console.log(`\n[${i+1}] ${r.assetId}`);
    for (const k of Object.keys(r)) console.log(`    ${k.padEnd(20)} ${r[k]}`);
});
