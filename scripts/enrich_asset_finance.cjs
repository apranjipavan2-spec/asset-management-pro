/**
 * Enrich Asset Finance.with_calc.xlsx with extra register columns from the
 * two source registers (Dep. Asset Register 25-26 + Revised.Dep. FCRA).
 *
 * Strategy: append the new columns at U..AC so all existing E..T formula
 * references in the workbook stay valid. A backup is written next to the
 * original before overwriting.
 *
 *   Added columns (row 3 header):
 *     U  Description
 *     V  Location
 *     W  Supplier Name
 *     X  Bill No.
 *     Y  Date of Installation
 *     Z  Date put to use
 *     AA Quantity
 *     AB Voucher No.
 *     AC Useful life in number of years
 *
 * The lookup is keyed verbatim on Asset Identification Number (column A
 * in both workbooks). Rows whose ID is not present in either source are
 * left blank — they get reported in the summary so finance can investigate.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const TARGET = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');
const SOURCES = [
    'C:/Users/apran/Downloads/RE_ Asset data- final/Dep. Asset Register 25-26-05052026.xlsx',
    'C:/Users/apran/Downloads/RE_ Asset data- final/Revised.Dep. FCRA Asset Register 25-26-05052026.xlsx',
];
const HEADER_ROW_SRC = 4;
const DATA_START_SRC = 5;
const HEADER_ROW_DST = 3;
const DATA_START_DST = 4;
const EPOCH = 25569, MS = 86400000;

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
    if (v instanceof Date) return 0;
    if (typeof v === 'object' && 'result' in v) return Number(v.result) || 0;
    const n = Number(String(v).replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
}

// Returns a JS Date when parseable, else the original text (so Excel
// keeps whatever the source had — e.g. "31/11/2021" which is an invalid
// day stays as a string instead of becoming nonsense).
function cellDateOrText(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(Math.round((v - EPOCH) * MS));
    if (typeof v === 'object' && 'result' in v) return cellDateOrText(v.result);
    const s = cellText(v);
    if (!s) return null;
    if (/^unknown$/i.test(s)) return null;
    const dot = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (dot) {
        const [, d, m, y] = dot;
        const yyyy = y.length === 2 ? `20${y}` : y;
        const day = parseInt(d, 10), mon = parseInt(m, 10);
        if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) {
            return new Date(`${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`);
        }
        return s;
    }
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slash) {
        const [, d, m, y] = slash;
        const yyyy = y.length === 2 ? `20${y}` : y;
        const day = parseInt(d, 10), mon = parseInt(m, 10);
        if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) {
            return new Date(`${yyyy}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`);
        }
        return s;
    }
    const t = Date.parse(s);
    return Number.isFinite(t) ? new Date(t) : s;
}

function looksLikeAssetSheet(ws) {
    return /asset.*identification/i.test(cellText(ws.getRow(HEADER_ROW_SRC).getCell(1).value));
}

(async () => {
    if (!fs.existsSync(TARGET)) {
        console.error(`Target not found: ${TARGET}`);
        process.exit(1);
    }
    for (const f of SOURCES) {
        if (!fs.existsSync(f)) { console.error(`Source not found: ${f}`); process.exit(1); }
    }

    // 1. Build lookup from both new source files (keyed verbatim on Asset ID)
    const lookup = new Map();
    let dupSrc = 0;
    for (const f of SOURCES) {
        console.log(`Reading source: ${path.basename(f)}`);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(f);
        for (const ws of wb.worksheets) {
            if (!looksLikeAssetSheet(ws)) continue;
            for (let r = DATA_START_SRC; r <= ws.rowCount; r++) {
                const row = ws.getRow(r);
                const id = cellText(row.getCell(1).value);
                if (!id || /^total$/i.test(id)) continue;
                if (lookup.has(id)) { dupSrc++; continue; }
                lookup.set(id, {
                    description:      cellText(row.getCell(3).value)  || '',
                    location:         cellText(row.getCell(4).value)  || '',
                    supplierName:     cellText(row.getCell(7).value)  || '',
                    billNo:           cellText(row.getCell(8).value)  || '',
                    installationDate: cellDateOrText(row.getCell(9).value),
                    datePutToUse:     cellDateOrText(row.getCell(10).value),
                    quantity:         cellNum(row.getCell(11).value),
                    voucherNo:        cellText(row.getCell(12).value) || '',
                    usefulLifeYears:  cellText(row.getCell(14).value) || '',
                });
            }
        }
    }
    console.log(`Source IDs collected: ${lookup.size}  (skipped ${dupSrc} cross-file duplicates)`);

    // 2. Backup target
    const bak = TARGET.replace(/\.xlsx$/i, `.before_enrich_${Date.now()}.xlsx`);
    fs.copyFileSync(TARGET, bak);
    console.log(`Backup: ${path.basename(bak)}`);

    // 3. Open target workbook + append columns
    const tb = new ExcelJS.Workbook();
    await tb.xlsx.readFile(TARGET);
    const ws = tb.worksheets[0];
    console.log(`Target sheet: ${ws.name}  rows=${ws.rowCount}  cols=${ws.columnCount}`);

    // Header row (row 3) — letters 21..29 = U..AC
    const headers = [
        'Description',
        'Location',
        'Supplier Name',
        'Bill No.',
        'Date of Installation',
        'Date put to use',
        'Quantity',
        'Voucher No.',
        'Useful life in number of years',
    ];
    // Inherit header style from existing row 3 col 1 if present
    const headerStyleCell = ws.getRow(HEADER_ROW_DST).getCell(1);
    const headerStyle = headerStyleCell && headerStyleCell.style ? headerStyleCell.style : null;
    headers.forEach((h, i) => {
        const c = ws.getRow(HEADER_ROW_DST).getCell(21 + i);
        c.value = h;
        if (headerStyle) c.style = JSON.parse(JSON.stringify(headerStyle));
    });

    // 4. Fill data rows U..AC for every row that has an Asset ID in col 1
    let matched = 0, unmatched = 0;
    const unmatchedIds = [];
    for (let r = DATA_START_DST; r <= ws.rowCount; r++) {
        const id = cellText(ws.getRow(r).getCell(1).value);
        if (!id) continue;
        const hit = lookup.get(id);
        const row = ws.getRow(r);
        if (!hit) {
            unmatched++;
            if (unmatchedIds.length < 25) unmatchedIds.push(id);
            // Leave cells empty
            continue;
        }
        row.getCell(21).value = hit.description || null;
        row.getCell(22).value = hit.location || null;
        row.getCell(23).value = hit.supplierName || null;
        row.getCell(24).value = hit.billNo || null;
        row.getCell(25).value = hit.installationDate ?? null;
        row.getCell(26).value = hit.datePutToUse ?? null;
        row.getCell(27).value = hit.quantity || null;
        row.getCell(28).value = hit.voucherNo || null;
        row.getCell(29).value = hit.usefulLifeYears || null;
        matched++;
    }

    // 5. Set widths + date number format for the appended columns
    ws.getColumn(21).width = 28; // Description
    ws.getColumn(22).width = 16; // Location
    ws.getColumn(23).width = 22; // Supplier
    ws.getColumn(24).width = 14; // Bill
    ws.getColumn(25).width = 14; // Install Date
    ws.getColumn(26).width = 14; // Put to use
    ws.getColumn(27).width = 8;  // Quantity
    ws.getColumn(28).width = 16; // Voucher
    ws.getColumn(29).width = 14; // Useful life
    ['Y','Z'].forEach(c => { ws.getColumn(c).numFmt = 'yyyy-mm-dd'; });
    ws.getColumn('AA').numFmt = '0';

    // 6. Save (overwriting the original)
    await tb.xlsx.writeFile(TARGET);

    console.log('');
    console.log('='.repeat(60));
    console.log('Enrichment complete');
    console.log('='.repeat(60));
    console.log(`  Rows matched   : ${matched}`);
    console.log(`  Rows unmatched : ${unmatched}`);
    if (unmatchedIds.length) {
        console.log(`  First unmatched IDs (up to 25):`);
        unmatchedIds.forEach(s => console.log('    - ' + s));
    }
    console.log(`  File: ${TARGET}`);
})().catch(e => { console.error(e); process.exit(1); });
