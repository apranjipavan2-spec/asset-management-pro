/**
 * Restructure Asset Finance.with_calc.xlsx into the canonical 30-column layout:
 *
 *   1  Asset Identification Number       (from target col 1)
 *   2  Asset class                       (from target col 2)
 *   3  Description                       (from source col 3)
 *   4  Location                          (from source col 4)
 *   5  Whether purchased / in kind       (from source col 5)
 *   6  Acquisition Date                  (from target col 4 "Refined Acq Date")
 *   7  Supplier Name                     (from source col 7)
 *   8  Bill No.                          (from source col 8)
 *   9  Date of Installation              (from source col 9)
 *  10  Date put to use                   (from source col 10)
 *  11  Quantity                          (from source col 11)
 *  12  Voucher No.                       (from source col 12)
 *  13  Depreciation Rate*                (from target col 3)
 *  14  Useful life in years**            (from source col 14)
 *  15  Gross Block Opening Balance       (from target col 5)
 *  16  Additions                         (from target col 6)
 *  17  Disposals                         (from target col 7)
 *  18  Closing Balance A   [FORMULA]     = O+P-Q
 *  19  Acc. Depreciation Opening Balance (from target col 9)
 *  20  Depreciation - Cost [FORMULA]     FY-aware: refs M, F, P, X
 *  21  Depreciation - Total [FORMULA]    = S+T
 *  22  Disposals (acc dep)               (from target col 12)
 *  23  Closing Balance B   [FORMULA]     = U-V
 *  24  Net Block (A-B) prev FY           (from target col 14)
 *  25  Net Block (A-B) this FY [FORMULA] = R-W
 *  26  Disposal Date                     (from target col 16)
 *  27  Proceeds on Disposal              (from target col 17)
 *  28  Profit / (Loss) [FORMULA]         = AA-(Q-V)
 *  29  Donor Name                        (from target col 19)
 *  30  Status                            (from target col 20)
 *
 * A backup is written next to the original before overwriting.
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
const SRC_HEADER_ROW = 4;
const SRC_DATA_START = 5;
const DST_HEADER_ROW = 3; // we'll write new headers at row 3
const DST_DATA_START = 4;
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
    if (v == null || v === '') return null;
    if (typeof v === 'number') return v;
    if (v instanceof Date) return null;
    if (typeof v === 'object' && 'result' in v) {
        const n = Number(v.result);
        return Number.isFinite(n) ? n : null;
    }
    const n = Number(String(v).replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : null;
}

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
            return new Date(`${yyyy}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00Z`);
        }
        return s;
    }
    const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slash) {
        const [, d, m, y] = slash;
        const yyyy = y.length === 2 ? `20${y}` : y;
        const day = parseInt(d, 10), mon = parseInt(m, 10);
        if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) {
            return new Date(`${yyyy}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00Z`);
        }
        return s;
    }
    const t = Date.parse(s);
    return Number.isFinite(t) ? new Date(t) : s;
}

function looksLikeAssetSheet(ws) {
    return /asset.*identification/i.test(cellText(ws.getRow(SRC_HEADER_ROW).getCell(1).value));
}

(async () => {
    if (!fs.existsSync(TARGET)) {
        console.error(`Target not found: ${TARGET}`);
        process.exit(1);
    }
    for (const f of SOURCES) {
        if (!fs.existsSync(f)) { console.error(`Source not found: ${f}`); process.exit(1); }
    }

    // 1. Build lookup from both source files (keyed verbatim on Asset ID)
    const lookup = new Map();
    let dupSrc = 0;
    for (const f of SOURCES) {
        console.log(`Reading source: ${path.basename(f)}`);
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.readFile(f);
        for (const ws of wb.worksheets) {
            if (!looksLikeAssetSheet(ws)) continue;
            for (let r = SRC_DATA_START; r <= ws.rowCount; r++) {
                const row = ws.getRow(r);
                const id = cellText(row.getCell(1).value);
                if (!id || /^total$/i.test(id)) continue;
                if (lookup.has(id)) { dupSrc++; continue; }
                lookup.set(id, {
                    description:      cellText(row.getCell(3).value)  || '',
                    location:         cellText(row.getCell(4).value)  || '',
                    purchaseOrKind:   cellText(row.getCell(5).value)  || '',
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
    console.log(`Source IDs collected: ${lookup.size}  (skipped ${dupSrc} cross-file dupes)`);

    // 2. Backup target
    const bak = TARGET.replace(/\.xlsx$/i, `.before_restructure_${Date.now()}.xlsx`);
    fs.copyFileSync(TARGET, bak);
    console.log(`Backup: ${path.basename(bak)}`);

    // 3. Read existing target workbook + capture all data rows
    const tb = new ExcelJS.Workbook();
    await tb.xlsx.readFile(TARGET);
    const oldWs = tb.worksheets[0];
    console.log(`Source target sheet: ${oldWs.name}  rows=${oldWs.rowCount}  cols=${oldWs.columnCount}`);

    // Collect old data rows (row 4+ that have a non-empty Asset ID)
    const oldRows = [];
    for (let r = 4; r <= oldWs.rowCount; r++) {
        const row = oldWs.getRow(r);
        const id = cellText(row.getCell(1).value);
        if (!id) continue;
        oldRows.push({
            assetId:        id,
            assetClass:     cellText(row.getCell(2).value),
            depRate:        cellNum(row.getCell(3).value),
            acqDate:        cellDateOrText(row.getCell(4).value),
            grossOpening:   cellNum(row.getCell(5).value),
            additions:      cellNum(row.getCell(6).value),
            disposalsGross: cellNum(row.getCell(7).value),
            accDepOpening:  cellNum(row.getCell(9).value),
            disposalsAccDep:cellNum(row.getCell(12).value),
            netBlockPrev:   cellNum(row.getCell(14).value),
            disposalDate:   cellDateOrText(row.getCell(16).value),
            proceeds:       cellNum(row.getCell(17).value),
            donor:          cellText(row.getCell(19).value),
            status:         cellText(row.getCell(20).value),
        });
    }
    console.log(`Captured ${oldRows.length} existing data rows`);

    // 4. Build a fresh sheet with the new layout
    // Remove old sheet, add a fresh "Sheet1"
    const oldName = oldWs.name;
    tb.removeWorksheet(oldWs.id);
    const ws = tb.addWorksheet(oldName);

    // Title rows (1..2): keep simple banner
    const titleCell = ws.getRow(1).getCell(1);
    titleCell.value = 'K A L I K E - FIXED ASSET REGISTER';
    titleCell.font = { bold: true, size: 14 };
    ws.mergeCells(1, 1, 1, 30);
    ws.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Sub-banner row 2 (group labels above the cols)
    ws.getRow(2).getCell(15).value = 'Assets at Cost';
    ws.mergeCells(2, 15, 2, 18);
    ws.getRow(2).getCell(19).value = 'Accumulated Depreciation';
    ws.mergeCells(2, 19, 2, 23);
    ws.getRow(2).alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).font = { bold: true };

    // Header row 3
    const headers = [
        'Asset Identification Number',
        'Asset class',
        'Description',
        'Location',
        'Whether purchased by the entity or received in kind (Purchase/Kind)',
        'Acquisition Date',
        'Supplier Name',
        'Bill No.',
        'Date of Installation',
        'Date put to use',
        'Quantity',
        'Voucher No.',
        'Depreciation Rate*',
        'Useful life in number of years**',
        'Gross Block Opening Balance',
        'Additions',
        'Disposals',
        'Closing Balance A',
        'Acc. Depreciaton Opening Balance',
        'Depreciation - Cost',
        'Depreciation - Total',
        'Disposals',
        'Closing Balance B',
        'Net Block (A-B)',
        'Net Block (A-B)',
        'Disposal Date',
        'Proceeds on Disposal',
        'Profit / (Loss) on Disposal',
        'Donor Name',
        'Status',
    ];
    headers.forEach((h, i) => {
        const c = ws.getRow(DST_HEADER_ROW).getCell(i + 1);
        c.value = h;
        c.font = { bold: true };
        c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        c.border = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' },
        };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };
    });
    ws.getRow(DST_HEADER_ROW).height = 48;

    // 5. Write data rows
    let matched = 0, unmatched = 0;
    const unmatchedIds = [];
    for (let i = 0; i < oldRows.length; i++) {
        const r = DST_DATA_START + i;
        const od = oldRows[i];
        const hit = lookup.get(od.assetId);
        if (!hit) { unmatched++; if (unmatchedIds.length < 25) unmatchedIds.push(od.assetId); }
        else matched++;

        const row = ws.getRow(r);
        row.getCell(1).value  = od.assetId;
        row.getCell(2).value  = od.assetClass || null;
        row.getCell(3).value  = hit ? (hit.description || null) : null;
        row.getCell(4).value  = hit ? (hit.location || null) : null;
        row.getCell(5).value  = hit ? (hit.purchaseOrKind || null) : null;
        row.getCell(6).value  = od.acqDate ?? null;
        row.getCell(7).value  = hit ? (hit.supplierName || null) : null;
        row.getCell(8).value  = hit ? (hit.billNo || null) : null;
        row.getCell(9).value  = hit ? (hit.installationDate ?? null) : null;
        row.getCell(10).value = hit ? (hit.datePutToUse ?? null) : null;
        row.getCell(11).value = hit ? (hit.quantity ?? null) : null;
        row.getCell(12).value = hit ? (hit.voucherNo || null) : null;
        row.getCell(13).value = od.depRate ?? null;
        row.getCell(14).value = hit ? (hit.usefulLifeYears || null) : null;
        row.getCell(15).value = od.grossOpening ?? null;
        row.getCell(16).value = od.additions ?? null;
        row.getCell(17).value = od.disposalsGross ?? null;
        // Col 18 Closing Balance A = O + P - Q
        row.getCell(18).value = { formula: `O${r}+P${r}-Q${r}` };
        row.getCell(19).value = od.accDepOpening ?? null;
        // Col 20 Depreciation - Cost (FY-aware), refs M (DepRate), F (AcqDate), P (Additions), X (Net Block prev FY)
        row.getCell(20).value = { formula:
            `IF(IF(MONTH(F${r})>=4,YEAR(F${r}),YEAR(F${r})-1)<IF(MONTH(TODAY())>=4,YEAR(TODAY())-1,YEAR(TODAY())-2), M${r}*X${r}, IF(AND(MONTH(F${r})>=4,MONTH(F${r})<=9), M${r}*P${r}, (M${r}/2)*P${r}))`
        };
        // Col 21 Depreciation - Total = S + T
        row.getCell(21).value = { formula: `S${r}+T${r}` };
        row.getCell(22).value = od.disposalsAccDep ?? null;
        // Col 23 Closing Balance B = U - V
        row.getCell(23).value = { formula: `U${r}-V${r}` };
        row.getCell(24).value = od.netBlockPrev ?? null;
        // Col 25 Net Block this FY = R - W
        row.getCell(25).value = { formula: `R${r}-W${r}` };
        row.getCell(26).value = od.disposalDate ?? null;
        row.getCell(27).value = od.proceeds ?? null;
        // Col 28 P/L = AA - (Q - V)
        row.getCell(28).value = { formula: `AA${r}-(Q${r}-V${r})` };
        row.getCell(29).value = od.donor || null;
        row.getCell(30).value = od.status || null;
    }

    // 6. Column widths + formats
    const widths = [28,22,28,16,18,12,22,14,12,12,8,16,10,12,16,12,12,14,18,16,16,12,14,14,14,12,14,16,18,12];
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    ['F','I','J','Z'].forEach(c => { ws.getColumn(c).numFmt = 'yyyy-mm-dd'; });
    ws.getColumn('K').numFmt = '0';
    // Numeric columns
    ['M','O','P','Q','R','S','T','U','V','W','X','Y','AA','AB'].forEach(c => {
        ws.getColumn(c).numFmt = '#,##0.00;[Red]-#,##0.00';
    });

    // Freeze first 3 rows + first column
    ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 3 }];

    // 7. Save (overwriting the original)
    await tb.xlsx.writeFile(TARGET);

    console.log('');
    console.log('='.repeat(60));
    console.log('Restructure complete');
    console.log('='.repeat(60));
    console.log(`  Rows written  : ${oldRows.length}`);
    console.log(`  Matched src   : ${matched}`);
    console.log(`  Unmatched src : ${unmatched}`);
    if (unmatchedIds.length) {
        console.log(`  First unmatched IDs (up to 25):`);
        unmatchedIds.forEach(s => console.log('    - ' + s));
    }
    console.log(`  File: ${TARGET}`);
})().catch(e => { console.error(e); process.exit(1); });
