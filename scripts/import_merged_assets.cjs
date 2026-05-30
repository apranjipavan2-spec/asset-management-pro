/**
 * Import the 1664 individual asset units from the finalised merged workbook
 * into the `assets` table — the operational register.
 *
 *   Source: Asset New data/Mapping Final/Assets Merged - Master + Assigned.xlsx
 *   Sheet : "Merged"
 *
 * Each row in the merged sheet is one physical/individual unit. Its parent
 * (financial) record lives in `asset_far` (seeded separately) and is linked
 * via `parentAssetId` → `asset_far.assetId` (100% coverage: 1250 EXACT_NORM
 * + 414 STRUCTURAL).
 *
 * This script WIPES the existing `assets` table and reseeds from the xlsx.
 * Existing data is only stale placeholder seed; transfers/requests/maint
 * tables are empty so no FK orphans occur.
 *
 * Re-run safe: idempotent.
 *
 * Usage:
 *   node scripts/import_merged_assets.cjs
 */
'use strict';
const path = require('path');
const Database = require('better-sqlite3');
const ExcelJS = require('exceljs');

const DB_PATH = path.resolve('db.sqlite');
const XLSX = path.resolve('Asset New data/Mapping Final/Assets Merged - Master + Assigned.xlsx');

function cellText(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number') return String(v);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'object') {
        if ('richText' in v) return v.richText.map(t => t.text).join('').trim();
        if ('result' in v) return String(v.result ?? '').trim();
        if ('text' in v) return String(v.text).trim();
    }
    return String(v).trim();
}

function cellNum(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'object' && 'result' in v) return Number(v.result) || 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function cellDate(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'number') {
        const d = new Date(Math.round((v - 25569) * 86400000));
        return d.toISOString().slice(0, 10);
    }
    const s = cellText(v);
    if (!s || /^unknown$/i.test(s)) return null;
    const t = Date.parse(s);
    return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

function programFromId(stdId) {
    // KALIKE/NRTT/KSU/L SHAPE TABLE/2012-13/01 → NRTT
    if (!stdId) return null;
    const parts = stdId.split('/');
    return parts.length >= 2 ? parts[1].trim() : null;
}

function joinLocation(district, detail) {
    const parts = [district, detail].filter(s => s && String(s).trim());
    return parts.length ? parts.join(' — ') : null;
}

(async () => {
    console.log(`Reading ${XLSX}`);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(XLSX);
    const ws = wb.getWorksheet('Merged');
    if (!ws) throw new Error('Sheet "Merged" not found');
    console.log(`Sheet rows (incl. header): ${ws.rowCount}`);

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Apply pending column migrations (mirrors safeAddColumn in server.js).
    const newCols = [
        ['parentAssetId', 'TEXT'], ['standardizedId', 'TEXT'],
        ['assetIdentificationNumber', 'TEXT'], ['parentMatchType', 'TEXT'],
        ['assignmentCode', 'TEXT'], ['modelName', 'TEXT'],
        ['district', 'TEXT'], ['locationDetail', 'TEXT'], ['notes', 'TEXT'],
    ];
    const existing = new Set(db.prepare('PRAGMA table_info(assets)').all().map(r => r.name));
    for (const [c, t] of newCols) {
        if (!existing.has(c)) {
            db.prepare(`ALTER TABLE assets ADD COLUMN ${c} ${t}`).run();
            console.log(`  + added column assets.${c}`);
        }
    }
    db.prepare('CREATE INDEX IF NOT EXISTS idx_assets_parentAssetId ON assets(parentAssetId)').run();

    const before = db.prepare('SELECT COUNT(*) AS n FROM assets').get().n;
    console.log(`assets before: ${before}`);

    const cols = [
        'id', 'name', 'category', 'status', 'location', 'purchaseDate',
        'program', 'assignedTo', 'procurementType', 'supplier', 'billNumber',
        'installationDate', 'depreciationRate', 'usefulLife',
        'parentAssetId', 'standardizedId', 'assetIdentificationNumber',
        'parentMatchType', 'assignmentCode', 'modelName', 'district',
        'locationDetail', 'notes'
    ];
    const insert = db.prepare(
        `INSERT INTO assets (${cols.join(', ')}) VALUES (${cols.map(c => '@' + c).join(', ')})`
    );

    let inserted = 0, skipped = 0;
    const seen = new Set();
    const tx = db.transaction(() => {
        db.prepare('DELETE FROM assets').run();
        for (let r = 2; r <= ws.rowCount; r++) {
            const row = ws.getRow(r);
            const stdId = cellText(row.getCell(9).value);
            if (!stdId) { skipped++; continue; }
            if (seen.has(stdId)) {
                console.warn(`  ! duplicate standardizedId at row ${r}: ${stdId} — skipping`);
                skipped++;
                continue;
            }
            seen.add(stdId);

            const district = cellText(row.getCell(15).value) || null;
            const locationDetail = cellText(row.getCell(16).value) || null;
            const description = cellText(row.getCell(12).value);
            const modelName = cellText(row.getCell(13).value);
            const name = description || modelName || stdId;

            const payload = {
                id: stdId,
                name,
                category: cellText(row.getCell(11).value) || null,
                status: cellText(row.getCell(24).value) || 'Active',
                location: joinLocation(district, locationDetail),
                purchaseDate: cellDate(row.getCell(18).value),
                program: programFromId(stdId),
                assignedTo: cellText(row.getCell(14).value) || null,
                procurementType: cellText(row.getCell(17).value) || null,
                supplier: cellText(row.getCell(19).value) || null,
                billNumber: cellText(row.getCell(20).value) || null,
                installationDate: cellDate(row.getCell(21).value),
                depreciationRate: cellNum(row.getCell(22).value),
                usefulLife: cellText(row.getCell(23).value) || null,
                parentAssetId: cellText(row.getCell(3).value) || null,
                standardizedId: stdId,
                assetIdentificationNumber: cellText(row.getCell(2).value) || null,
                parentMatchType: cellText(row.getCell(4).value) || null,
                assignmentCode: cellText(row.getCell(10).value) || null,
                modelName: modelName || null,
                district,
                locationDetail,
                notes: cellText(row.getCell(25).value) || null,
            };

            insert.run(payload);
            inserted++;
        }
    });
    tx();

    const after = db.prepare('SELECT COUNT(*) AS n FROM assets').get().n;
    const withParent = db.prepare(
        `SELECT COUNT(*) AS n FROM assets WHERE parentAssetId IS NOT NULL AND parentAssetId != ''`
    ).get().n;
    const linkedToFar = db.prepare(
        `SELECT COUNT(*) AS n FROM assets a
         WHERE EXISTS (SELECT 1 FROM asset_far f WHERE f.assetId = a.parentAssetId)`
    ).get().n;

    console.log('');
    console.log('='.repeat(60));
    console.log('Import complete');
    console.log('='.repeat(60));
    console.log(`  Inserted          : ${inserted}`);
    console.log(`  Skipped           : ${skipped}`);
    console.log(`  assets after      : ${after}`);
    console.log(`  with parentAssetId: ${withParent}`);
    console.log(`  linked to asset_far: ${linkedToFar} / ${after}`);
    console.log('');
    db.close();
})().catch(e => { console.error(e); process.exit(1); });
