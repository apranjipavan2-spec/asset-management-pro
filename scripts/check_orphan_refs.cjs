/**
 * Check whether any of the 15 orphan asset IDs are referenced by
 * transfers, requests, maintenance, issues — so we know if deleting
 * them would leave dangling references.
 */
'use strict';
const Database = require('better-sqlite3');
const db = new Database('./db.sqlite');

const orphanIds = [
    'KALIKE/JRDT/Parag/HP Laptop/2023-24/01 to 05',
    'KALIKE/NSE/Dell laptop/01',
    'KALIKE/Lambani/Pelain Table 6x3 /2021-22/01 \nKALIKE/Lambani/Cutting Table /2021-22/01 \nKALIKE/Lambani/Wood stool /2021-22/01  to 06',
    'KALIKE/Titan SKill/Recolving chair/2024-25/01 to 07',
    'Kalike/NRTT/BLR Comp. table 01 to 02 /2012-13',
    'Kalike/NRTT/BLR Flexmed back chairs 01 to 08 /2012-13',
    'Kalike/NRTT/BLR Parition Panel 01 to 06 /2012-13',
    'Kalike/NRTT/BLR Pinup board 01/2012-13',
    'Kalike/NRTT/BLR Stackable Visitors Chair 01 to 02 /2012-13',
    'Kalike/NRTT/BLR Visitors Chair 01 to 02 /2012-13',
    'Kalike/NRTT/NRTT/BLR Lshaped table 01 to 06 /2012-13',
    'Kalike/SDTT/CRS//2019-20',
    'Kalike/SDTT/CRS//2019-20 #2',
    'Kalike/SDTT/CRS/Microphone Junction Box/ 01/2019-20',
    'Kalike/TITAN/Ceiling Fan/01/18-19'
];

const tables = ['transfers', 'requests', 'maintenance', 'issues', 'asset_history'];
for (const tbl of tables) {
    try {
        const cols = db.prepare(`PRAGMA table_info(${tbl})`).all();
        const hasAssetId = cols.some(c => c.name === 'assetId');
        if (!hasAssetId) { console.log(`${tbl}: no assetId column, skipping`); continue; }
        const refs = db.prepare(`SELECT id, assetId FROM ${tbl} WHERE assetId IN (${orphanIds.map(()=>'?').join(',')})`).all(...orphanIds);
        console.log(`${tbl}: ${refs.length} references to orphan assets`);
        for (const r of refs) console.log(`   - ${tbl}.id=${r.id} → asset ${r.assetId}`);
    } catch (e) {
        console.log(`${tbl}: ${e.message}`);
    }
}

db.close();
