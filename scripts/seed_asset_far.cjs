/**
 * Seed asset_far for FY 2025-26 from the canonical finance register:
 *
 *   Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx
 *
 * The canonical workbook is the merged/restructured 30-column layout (header
 * at row 3, data from row 4) produced by scripts/restructure_asset_finance.cjs.
 * It carries every asset previously held in the two raw source files
 * (Dep. Asset Register 25-26 + Revised.Dep. FCRA 25-26) plus the live
 * finance formulas, so it is the single source of truth for the app.
 *
 *   01 Asset Identification Number
 *   02 Asset class
 *   03 Description
 *   04 Location
 *   05 Whether purchased / received in kind (Purchase/Kind)
 *   06 Acquisition Date
 *   07 Supplier Name
 *   08 Bill No.
 *   09 Date of Installation
 *   10 Date put to use
 *   11 Quantity
 *   12 Voucher No.
 *   13 Depreciation Rate*
 *   14 Useful life in number of years**
 *   15 Gross Block Opening Balance
 *   16 Additions
 *   17 Disposals (Gross)
 *   18 Closing Balance A          (formula — recomputed)
 *   19 Acc. Depreciation Opening Balance
 *   20 Depreciation - Cost FY     (formula — recomputed)
 *   21 Depreciation - Total       (formula — recomputed)
 *   22 Disposals (Acc Dep)
 *   23 Closing Balance B          (formula — recomputed)
 *   24 Net Block (A-B) prev FY 24-25
 *   25 Net Block (A-B) this FY    (formula — recomputed)
 *   26 Disposal Date
 *   27 Proceeds on Disposal
 *   28 Profit / (Loss)            (formula — recomputed)
 *   29 Donor Name
 *   30 Status   (the FCRA "Office equipment_fcra" sheet has Remarks at 30 and Status at 31; handled below)
 *
 * Re-running the script is safe: each (assetId, fy=2025) row is upserted.
 * Already-locked rows are preserved (skipped).
 *
 * Usage:  node scripts/seed_asset_far.cjs
 */
'use strict';
const path = require('path');
const Database = require('better-sqlite3');
const ExcelJS = require('exceljs');

const DB_PATH = path.resolve('db.sqlite');
const FILES = [
    { file: path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'), label: 'canonical' },
];
const FY = 2025;
const HEADER_ROW = 3;
const DATA_START_ROW = 4;
const EXPECTED_ID_HEADER = /asset.*identification/i;

const EPOCH = 25569, MS = 86400000;

function cellNum(v) {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    if (v instanceof Date) return 0;
    if (typeof v === 'object') {
        if ('result' in v) return Number(v.result) || 0;
        return 0;
    }
    const n = Number(String(v).replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
}

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

function cellDate(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'number') {
        const d = new Date(Math.round((v - EPOCH) * MS));
        return d.toISOString().slice(0, 10);
    }
    if (typeof v === 'object' && 'result' in v) {
        if (v.result instanceof Date) return v.result.toISOString().slice(0, 10);
        return cellDate(v.result);
    }
    const s = cellText(v);
    if (!s) return null;
    if (/^unknown$/i.test(s)) return null;
    // dd.mm.yy or dd.mm.yyyy → ISO
    const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (dot) {
        const [, d, m, y] = dot;
        const yyyy = y.length === 2 ? `20${y}` : y;
        return `${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // dd/mm/yyyy → ISO
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slash) {
        const [, d, m, y] = slash;
        const yyyy = y.length === 2 ? `20${y}` : y;
        return `${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parsed = Date.parse(s);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null;
}

function looksLikeAssetSheet(ws) {
    const r = ws.getRow(HEADER_ROW);
    const first = cellText(r.getCell(1).value);
    return EXPECTED_ID_HEADER.test(first);
}

// Determine column offset for "Status" — most sheets put it at 30, but
// "Office equipment_fcra" inserts a Remarks col at 30 and Status at 31.
function detectStatusCol(ws) {
    const r = ws.getRow(HEADER_ROW);
    for (let c = 29; c <= Math.min(ws.columnCount, 33); c++) {
        const t = cellText(r.getCell(c).value).toLowerCase();
        if (t === 'status' || t === 'staus') return c;
    }
    return 30; // fall back to typical column
}

(async () => {
    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    const hasTable = db.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='asset_far'`
    ).get();
    if (!hasTable) {
        console.error('asset_far table does not exist. Start the server once (npm run server) so it can create the schema, then re-run this script.');
        process.exit(1);
    }

    const existing = db.prepare('SELECT COUNT(*) AS n FROM asset_far WHERE fy = ?').get(FY).n;
    console.log(`Existing rows for FY ${FY}: ${existing}`);

    const upsert = db.prepare(`
        INSERT INTO asset_far (
            id, assetId, fy, assetClass,
            description, location, purchaseOrKind,
            acqDate, supplierName, billNo, installationDate, datePutToUse,
            quantity, voucherNo, depRate, usefulLifeYears,
            refinedAcqDate,
            grossBlockOpening, additions, disposalsGross,
            accDepOpening, disposalsAccDep, netBlockPrevFY,
            disposalDate, proceedsOnDisposal, donor, status,
            locked, createdAt, updatedAt
        ) VALUES (
            @id, @assetId, @fy, @assetClass,
            @description, @location, @purchaseOrKind,
            @acqDate, @supplierName, @billNo, @installationDate, @datePutToUse,
            @quantity, @voucherNo, @depRate, @usefulLifeYears,
            @refinedAcqDate,
            @grossBlockOpening, @additions, @disposalsGross,
            @accDepOpening, @disposalsAccDep, @netBlockPrevFY,
            @disposalDate, @proceedsOnDisposal, @donor, @status,
            0, @now, @now
        )
        ON CONFLICT(assetId, fy) DO UPDATE SET
            assetClass         = excluded.assetClass,
            description        = excluded.description,
            location           = excluded.location,
            purchaseOrKind     = excluded.purchaseOrKind,
            acqDate            = excluded.acqDate,
            supplierName       = excluded.supplierName,
            billNo             = excluded.billNo,
            installationDate   = excluded.installationDate,
            datePutToUse       = excluded.datePutToUse,
            quantity           = excluded.quantity,
            voucherNo          = excluded.voucherNo,
            depRate            = excluded.depRate,
            usefulLifeYears    = excluded.usefulLifeYears,
            refinedAcqDate     = excluded.refinedAcqDate,
            grossBlockOpening  = excluded.grossBlockOpening,
            additions          = excluded.additions,
            disposalsGross     = excluded.disposalsGross,
            accDepOpening      = excluded.accDepOpening,
            disposalsAccDep    = excluded.disposalsAccDep,
            netBlockPrevFY     = excluded.netBlockPrevFY,
            disposalDate       = excluded.disposalDate,
            proceedsOnDisposal = excluded.proceedsOnDisposal,
            donor              = excluded.donor,
            status             = excluded.status,
            updatedAt          = excluded.updatedAt
        WHERE asset_far.locked = 0
    `);
    const isLocked = db.prepare('SELECT locked FROM asset_far WHERE assetId = ? AND fy = ?');

    let inserted = 0, skipped = 0, locked = 0, duplicates = 0;
    const seenIds = new Set();
    const skippedSheets = [];

    for (const { file, label } of FILES) {
        console.log(`\nOpening (${label}): ${path.basename(file)}`);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(file);
        for (const ws of wb.worksheets) {
            if (!looksLikeAssetSheet(ws)) {
                skippedSheets.push(`${path.basename(file)} :: ${ws.name}`);
                continue;
            }
            const statusCol = detectStatusCol(ws);
            let sheetRows = 0;
            const tx = db.transaction(() => {
                for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
                    const row = ws.getRow(r);
                    const assetIdRaw = cellText(row.getCell(1).value);
                    if (!assetIdRaw) { skipped++; continue; }
                    if (/^total$/i.test(assetIdRaw)) { skipped++; continue; }

                    if (seenIds.has(assetIdRaw)) { duplicates++; continue; }
                    seenIds.add(assetIdRaw);

                    const lockedRow = isLocked.get(assetIdRaw, FY);
                    if (lockedRow && lockedRow.locked === 1) { locked++; continue; }

                    const acqDate = cellDate(row.getCell(6).value);
                    const installationDate = cellDate(row.getCell(9).value);
                    const datePutToUse = cellDate(row.getCell(10).value);

                    const payload = {
                        id: `far_${FY}_${assetIdRaw.replace(/[^A-Za-z0-9]/g, '_').slice(0, 60)}_seed`,
                        assetId: assetIdRaw,
                        fy: FY,
                        assetClass:         cellText(row.getCell(2).value) || null,
                        description:        cellText(row.getCell(3).value) || null,
                        location:           cellText(row.getCell(4).value) || null,
                        purchaseOrKind:     cellText(row.getCell(5).value) || null,
                        acqDate:            acqDate,
                        supplierName:       cellText(row.getCell(7).value) || null,
                        billNo:             cellText(row.getCell(8).value) || null,
                        installationDate:   installationDate,
                        datePutToUse:       datePutToUse,
                        quantity:           cellNum(row.getCell(11).value),
                        voucherNo:          cellText(row.getCell(12).value) || null,
                        depRate:            cellNum(row.getCell(13).value),
                        usefulLifeYears:    cellText(row.getCell(14).value) || null,
                        refinedAcqDate:     acqDate,
                        grossBlockOpening:  cellNum(row.getCell(15).value),
                        additions:          cellNum(row.getCell(16).value),
                        disposalsGross:     cellNum(row.getCell(17).value),
                        accDepOpening:      cellNum(row.getCell(19).value),
                        disposalsAccDep:    cellNum(row.getCell(22).value),
                        netBlockPrevFY:     cellNum(row.getCell(24).value),
                        disposalDate:       cellDate(row.getCell(26).value),
                        proceedsOnDisposal: cellNum(row.getCell(27).value),
                        donor:              cellText(row.getCell(29).value) || null,
                        status:             cellText(row.getCell(statusCol).value) || null,
                        now: new Date().toISOString()
                    };

                    upsert.run(payload);
                    inserted++; sheetRows++;
                }
            });
            tx();
            console.log(`  ${ws.name.padEnd(35)} → ${sheetRows} rows`);
        }
    }

    const total = db.prepare('SELECT COUNT(*) AS n FROM asset_far WHERE fy = ?').get(FY).n;
    console.log('');
    console.log('='.repeat(60));
    console.log(`Seed complete for FY ${FY}-${(FY + 1) % 100}`);
    console.log('='.repeat(60));
    console.log(`  Inserted / upserted    : ${inserted}`);
    console.log(`  Duplicates skipped     : ${duplicates}`);
    console.log(`  Skipped (no Asset ID)  : ${skipped}`);
    console.log(`  Skipped (locked)       : ${locked}`);
    console.log(`  Total rows in FY ${FY}-${(FY + 1) % 100}: ${total}`);
    if (skippedSheets.length) {
        console.log('  Sheets skipped (no asset header):');
        skippedSheets.forEach(s => console.log('    - ' + s));
    }
    console.log('');
    db.close();
})().catch(e => { console.error(e); process.exit(1); });
