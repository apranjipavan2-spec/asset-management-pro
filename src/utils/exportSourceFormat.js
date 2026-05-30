// Export DB assets in the original source-Excel format:
// two workbooks (Non-FCRA + FCRA), per-category sheets, KALIKE banner,
// grouped header rows, and the original 30-column layout.

const NON_FCRA_FILE = 'Dep_Asset_Register_Export.xlsx';
const FCRA_FILE = 'FCRA_Asset_Register_Export.xlsx';

// Sheet structure matching the source files. Each asset's `sourceSheet`
// column (set during import) is the authoritative bucket; the predicate
// is the fallback for app-created assets without a sourceSheet.
const NON_FCRA_SHEETS = [
    { name: 'Furniture & Fixtures_grants',   match: (a) => isFurniture(a) && !isOwnFund(a) },
    { name: 'Computers_grants',              match: (a) => isComputer(a) },
    { name: 'Office equipment_grant',        match: (a) => isOfficeEquipment(a) && !isOwnFund(a) },
    { name: 'Plant & Machinery_grant',       match: (a) => isPlantOrVehicle(a) },
    { name: 'Office equipment_own fund',     match: (a) => isOfficeEquipment(a) && isOwnFund(a) },
    { name: 'Furniture & Fixtures_own funds',match: (a) => isFurniture(a) && isOwnFund(a) }
];

const FCRA_SHEETS = [
    { name: 'Office equipment_fcra', match: (a) => !isComputer(a) },
    { name: 'fcra computer etc',     match: (a) => isComputer(a) }
];

function bucketFor(asset, sheetDefs) {
    if (asset.sourceSheet) {
        const def = sheetDefs.find(d => d.name === asset.sourceSheet);
        if (def) return def.name;
    }
    const def = sheetDefs.find(d => d.match(asset));
    return def ? def.name : sheetDefs[sheetDefs.length - 1].name;
}

function low(s) { return String(s || '').toLowerCase(); }
function isFurniture(a) { return /furniture|fixture/.test(low(a.category)); }
function isComputer(a)  { return /computer|laptop|printer|desktop/.test(low(a.category)); }
function isPlantOrVehicle(a) { return /plant|machinery|vehicle|tractor/.test(low(a.category)); }
function isOfficeEquipment(a) {
    const c = low(a.category);
    if (/office[\s_]+equipment/.test(c)) return true;
    // Catch-all for items that aren't furniture / computer / plant
    return !isFurniture(a) && !isComputer(a) && !isPlantOrVehicle(a);
}
function isOwnFund(a) { return /own\s*fund|owned/.test(low(a.category)) || /own\s*fund/.test(low(a.fundingSource)); }

// 30-column row layout (matches source row[3] header order, with grouped headers above)
function buildSheet(assets) {
    // Row 0: KALIKE banner (merged conceptually; we just put it in col 0)
    // Row 1: grouped headers ("Assets at Cost" @ col 14, "Accumulated Depreciation" @ col 18)
    // Row 2: sub-grouped headers ("Opening" @ col 18, "FY 23-24" @ col 23, "FY 24-25" @ col 24)
    // Row 3: column headers (30 cols)
    // Row 4+: data rows
    const headerRow = [
        'Asset Identification Number','Asset class','Description','Location',
        'Whether purchased by the entity or received in kind\n(Purchase/Kind)',
        'Acquisition Date','Supplier Name','Bill No.','Date of Installation','Date put to use',
        'Quantity','Voucher No.','Depreciation Rate*','Useful life in number of years**',
        'Gross Block Opening Balance','Additions','Disposals','Closing Balance    A',
        'Acc. Depreciaton Opening Balance','Depreciation - Cost','Depreciation - Total',
        'Disposals','Closing Balance    B','Net Block (A-B)','Net Block (A-B)',
        'Disposal Date','Proceeds on Disposal','Profit / (Loss) on Disposal','Donor Name','Status'
    ];

    const banner = new Array(30).fill(null);
    banner[0] = 'K A L I K E - FIXED ASSET REGISTER FY 2024-25 / FY 2025-26';

    const groupedRow1 = new Array(30).fill(null);
    groupedRow1[14] = 'Assets at Cost';
    groupedRow1[18] = 'Accumulated Depreciation';

    const groupedRow2 = new Array(30).fill(null);
    groupedRow2[18] = 'Opening';
    groupedRow2[23] = 'FY 24-25';
    groupedRow2[24] = 'FY 25-26';

    const dataRows = assets.map(a => {
        const gross = num(a.amount) || num(a.grossBlock);
        const accDep = num(a.accumulatedDepreciation);
        const depCost = num(a.currentYearDepreciation);
        const depTotal = accDep + depCost;
        const closingA = gross; // simplified: no additions/disposals tracked
        const closingB = depTotal;
        // Source convention: NetA = gross - opening dep only, NetB = gross - total dep
        const netA = gross - accDep;
        const netB = num(a.netBlock) || (gross - depTotal);
        return [
            a.id || '',
            a.category || '',
            a.name || '',
            a.location || '',
            a.procurementType || null,
            toDateCell(a.purchaseDate),
            a.supplier || '',
            a.billNumber || '',
            toDateCell(a.installationDate),
            toDateCell(a.putToUseDate),
            num(a.quantity) || 1,
            a.voucherNumber || '',
            num(a.depreciationRate),
            a.usefulLife || '',
            blankIfZero(gross),
            null,         // Additions (source leaves blank)
            null,         // Disposals (cost) (source leaves blank when 0)
            blankIfZero(closingA),
            accDep,
            depCost,
            depTotal,
            null,         // Disposals (dep) (source leaves blank when 0)
            closingB,
            netA,         // Net Block (A-B) FY 24-25 — opening basis
            netB,         // Net Block (A-B) FY 25-26 — closing basis
            toDateCell(a.disposalDate),
            null,         // Proceeds on Disposal (source leaves blank)
            null,         // Profit/(Loss) (source leaves blank)
            donorFor(a),
            a.status && a.status !== 'Active' ? a.status : null
        ];
    });

    return [banner, groupedRow1, groupedRow2, headerRow, ...dataRows];
}

function num(v) {
    if (v == null || v === '') return 0;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
}

// Source convention: leave balance cells blank rather than write 0.
function blankIfZero(v) { return v === 0 ? null : v; }

// Source convention: own-fund / FCRA sheets have blank donor cells.
// Only emit donor when it's a real grantor name (not our seeded fallback).
function donorFor(a) {
    const d = String(a.fundingSource || '').trim();
    if (!d || d.toLowerCase() === 'own fund' || d.toLowerCase() === 'fcra') return null;
    return d;
}

// Convert ISO date string (YYYY-MM-DD) to a JS Date so XLSX writes a real date cell.
function toDateCell(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
        const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
        return Number.isNaN(d.getTime()) ? v : d;
    }
    return v;
}

function buildWorkbook(XLSX, allAssets, sheetDefs) {
    // Pre-group assets by sheet using sourceSheet (authoritative) with heuristic fallback.
    const grouped = new Map(sheetDefs.map(d => [d.name, []]));
    for (const a of allAssets) {
        const sheet = bucketFor(a, sheetDefs);
        if (grouped.has(sheet)) grouped.get(sheet).push(a);
    }
    const wb = XLSX.utils.book_new();
    for (const def of sheetDefs) {
        const bucket = grouped.get(def.name) || [];
        const aoa = buildSheet(bucket);
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        // Merge cells for banner + grouped headers (purely cosmetic, matches source look)
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 29 } },            // banner
            { s: { r: 1, c: 14 }, e: { r: 1, c: 17 } },           // "Assets at Cost"
            { s: { r: 1, c: 18 }, e: { r: 1, c: 24 } },           // "Accumulated Depreciation"
            { s: { r: 2, c: 23 }, e: { r: 2, c: 24 } }            // "FY 23-24 / FY 24-25" header sub-row
        ];
        // Some column widths
        ws['!cols'] = [{ wch: 38 }, { wch: 24 }, { wch: 28 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws, def.name.slice(0, 31)); // sheet name max 31 chars
    }
    return wb;
}

export function exportSourceFormat(allAssets, opts = {}) {
    if (typeof XLSX === 'undefined') {
        alert('Excel library still loading — try again in a moment.');
        return;
    }
    const includeFcra = opts.includeFcra !== false; // default: include for back-compat
    const nonFcra = allAssets.filter(a => !a.isFcra);
    const fcra = allAssets.filter(a => a.isFcra);

    const wbNon = buildWorkbook(XLSX, nonFcra, NON_FCRA_SHEETS);
    XLSX.writeFile(wbNon, NON_FCRA_FILE);

    if (includeFcra) {
        const wbFcra = buildWorkbook(XLSX, fcra, FCRA_SHEETS);
        XLSX.writeFile(wbFcra, FCRA_FILE);
    }
}
