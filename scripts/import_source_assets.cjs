/**
 * Import assets from BOTH source files. Adds `isFcra` column, tags
 * each asset 0/1, inserts missing rows. Idempotent.
 *
 * Run: node scripts/import_source_assets.cjs
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

// Column-index → DB field (0-based, header row at index 3, data starts at 4)
const COL = {
    id: 0, category: 1, name: 2, location: 3, procurementType: 4,
    purchaseDate: 5, supplier: 6, billNumber: 7, installationDate: 8, putToUseDate: 9,
    quantity: 10, voucherNumber: 11, depreciationRate: 12, usefulLife: 13,
    grossBlockOpening: 14, additions: 15, disposals: 16, closingBalanceA: 17,
    accDepOpening: 18, depCost: 19, depTotal: 20, accDepDisposals: 21,
    closingBalanceB: 22, netBlockFY24: 23, netBlockFY25: 24,
    disposalDate: 25, proceeds: 26, profitLoss: 27, donorName: 28
};

function toIsoDate(v) {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString().slice(0,10);
    const s = String(v).trim();
    // dd.mm.yy or dd.mm.yyyy
    const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (m) {
        let [, d, mo, y] = m;
        if (y.length === 2) y = '20' + y;
        return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
    return s;
}

function toNum(v) {
    if (v == null || v === '') return 0;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
}

const db = new Database('./db.sqlite');

// Add columns safely
const cols = db.prepare("PRAGMA table_info(assets)").all().map(c => c.name);
if (!cols.includes('isFcra')) {
    db.exec('ALTER TABLE assets ADD COLUMN isFcra INTEGER DEFAULT 0');
    console.log('Added column: assets.isFcra');
}
if (!cols.includes('sourceSheet')) {
    db.exec('ALTER TABLE assets ADD COLUMN sourceSheet TEXT');
    console.log('Added column: assets.sourceSheet');
}

const upsert = db.prepare(`
    INSERT INTO assets (
        id, name, category, location, procurementType, purchaseDate,
        supplier, billNumber, installationDate, putToUseDate, quantity,
        voucherNumber, depreciationRate, usefulLife,
        amount, grossBlock, accumulatedDepreciation, currentYearDepreciation, netBlock,
        disposalDate, fundingSource, isFcra, sourceSheet,
        status, program, assignedTo, assignedToId, assignedToDesignation,
        depreciation, fundingAmount, health
    ) VALUES (
        @id, @name, @category, @location, @procurementType, @purchaseDate,
        @supplier, @billNumber, @installationDate, @putToUseDate, @quantity,
        @voucherNumber, @depreciationRate, @usefulLife,
        @amount, @grossBlock, @accumulatedDepreciation, @currentYearDepreciation, @netBlock,
        @disposalDate, @fundingSource, @isFcra, @sourceSheet,
        'Active', 'General', 'Unassigned', 'N/A', 'N/A',
        0, @amount, '100.0%'
    )
    ON CONFLICT(id) DO UPDATE SET
        isFcra = excluded.isFcra,
        sourceSheet = excluded.sourceSheet,
        name = excluded.name,
        category = excluded.category,
        location = excluded.location,
        procurementType = excluded.procurementType,
        purchaseDate = excluded.purchaseDate,
        supplier = excluded.supplier,
        billNumber = excluded.billNumber,
        installationDate = excluded.installationDate,
        putToUseDate = excluded.putToUseDate,
        quantity = excluded.quantity,
        voucherNumber = excluded.voucherNumber,
        depreciationRate = excluded.depreciationRate,
        usefulLife = excluded.usefulLife,
        amount = excluded.amount,
        grossBlock = excluded.grossBlock,
        accumulatedDepreciation = excluded.accumulatedDepreciation,
        currentYearDepreciation = excluded.currentYearDepreciation,
        netBlock = excluded.netBlock,
        disposalDate = excluded.disposalDate,
        fundingSource = excluded.fundingSource,
        fundingAmount = excluded.amount
`);

let inserted = 0, updated = 0, skipped = 0, suffixed = 0;
// Track seen IDs across the entire import so duplicates (within a sheet OR
// across sheets, including the cross-sheet reclassification rows) get a
// stable #2 / #3 suffix instead of overwriting each other.
const seenIds = new Set();
const tx = db.transaction(() => {
    for (const { path, isFcra, sheets } of FILES) {
        const wb = XLSX.readFile(path, { cellDates: true });
        for (const sheetName of sheets) {
            const ws = wb.Sheets[sheetName];
            if (!ws) { console.warn(`Sheet missing: ${sheetName} in ${path}`); continue; }
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
            for (let i = 4; i < rows.length; i++) {
                const r = rows[i];
                if (!r) continue;
                const rawId = r[COL.id];
                if (!rawId || String(rawId).trim() === '' || String(rawId).trim().toLowerCase() === 'total') { skipped++; continue; }
                const baseId = String(rawId).trim();
                let id = baseId;
                if (seenIds.has(id)) {
                    let n = 2;
                    while (seenIds.has(`${baseId} #${n}`)) n++;
                    id = `${baseId} #${n}`;
                    suffixed++;
                    console.log(`  Duplicate detected: "${baseId}" in ${sheetName} → renamed to "${id}"`);
                }
                seenIds.add(id);
                const gross = toNum(r[COL.grossBlockOpening]);
                const accDep = toNum(r[COL.accDepOpening]);
                const depCost = toNum(r[COL.depCost]);
                const netBlk = toNum(r[COL.netBlockFY25]) || toNum(r[COL.netBlockFY24]) || (gross - accDep);
                const existing = db.prepare('SELECT id FROM assets WHERE id = ?').get(id);
                const row = {
                    id: id,
                    name: r[COL.name] ? String(r[COL.name]).trim() : 'Unnamed',
                    category: r[COL.category] ? String(r[COL.category]).trim() : 'Uncategorized',
                    location: r[COL.location] ? String(r[COL.location]).trim() : '',
                    procurementType: r[COL.procurementType] ? String(r[COL.procurementType]).trim() : null,
                    purchaseDate: toIsoDate(r[COL.purchaseDate]),
                    supplier: r[COL.supplier] ? String(r[COL.supplier]).trim() : '',
                    billNumber: r[COL.billNumber] ? String(r[COL.billNumber]).trim() : '',
                    installationDate: toIsoDate(r[COL.installationDate]),
                    putToUseDate: toIsoDate(r[COL.putToUseDate]),
                    quantity: toNum(r[COL.quantity]) || 1,
                    voucherNumber: r[COL.voucherNumber] ? String(r[COL.voucherNumber]).trim() : '',
                    depreciationRate: toNum(r[COL.depreciationRate]),
                    usefulLife: r[COL.usefulLife] ? String(r[COL.usefulLife]).trim() : null,
                    amount: gross,
                    grossBlock: gross,
                    accumulatedDepreciation: accDep,
                    currentYearDepreciation: depCost,
                    netBlock: netBlk,
                    disposalDate: toIsoDate(r[COL.disposalDate]),
                    fundingSource: (r[COL.donorName] != null && String(r[COL.donorName]).trim() !== '')
                        ? String(r[COL.donorName]).trim()
                        : (isFcra ? 'FCRA' : 'Own Fund'),
                    isFcra,
                    sourceSheet: sheetName
                };
                upsert.run(row);
                if (existing) updated++; else inserted++;
            }
        }
    }
});
tx();

console.log(`Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}, Suffixed duplicates: ${suffixed}`);
const fcraCount = db.prepare('SELECT COUNT(*) c FROM assets WHERE isFcra=1').get().c;
const nonFcraCount = db.prepare('SELECT COUNT(*) c FROM assets WHERE isFcra=0').get().c;
const total = db.prepare('SELECT COUNT(*) c FROM assets').get().c;
console.log(`DB now has ${total} assets: ${nonFcraCount} non-FCRA + ${fcraCount} FCRA`);
db.close();
