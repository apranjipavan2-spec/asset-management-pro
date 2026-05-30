/**
 * Test: replicate the in-browser exportSourceFormat using the same XLSX lib,
 * write the two files, then re-read them and diff against the SOURCE Excel
 * files (row counts per sheet, column headers, sample data row values).
 */
'use strict';
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

// --- copy of src/utils/exportSourceFormat.js logic, in CommonJS ---

const NON_FCRA_SHEETS = [
    { name: 'Furniture & Fixtures_grants', match: (a) => isFurniture(a) && !isOwnFund(a) },
    { name: 'Computers_grants',            match: (a) => isComputer(a) },
    { name: 'Office equipment_grant',      match: (a) => isOfficeEquipment(a) && !isOwnFund(a) },
    { name: 'Plant & Machinery_grant',     match: (a) => isPlantOrVehicle(a) },
    { name: 'Office equipment_own fund',   match: (a) => isOfficeEquipment(a) && isOwnFund(a) },
    { name: 'Furniture & Fixtures_own funds', match: (a) => isFurniture(a) && isOwnFund(a) }
];
const FCRA_SHEETS = [
    { name: 'Office equipment_fcra', match: (a) => !isComputer(a) },
    { name: 'fcra computer etc',     match: (a) => isComputer(a) }
];

function low(s) { return String(s || '').toLowerCase(); }
function isFurniture(a) { return /furniture|fixture/.test(low(a.category)); }
function isComputer(a)  { return /computer|laptop|printer|desktop/.test(low(a.category)); }
function isPlantOrVehicle(a) { return /plant|machinery|vehicle|tractor/.test(low(a.category)); }
function isOfficeEquipment(a) {
    const c = low(a.category);
    if (/office[\s_]+equipment/.test(c)) return true;
    return !isFurniture(a) && !isComputer(a) && !isPlantOrVehicle(a);
}
function isOwnFund(a) { return /own\s*fund|owned/.test(low(a.category)) || /own\s*fund/.test(low(a.fundingSource)); }
function num(v) { if (v == null || v === '') return 0; const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
function blankIfZero(v) { return v === 0 ? null : v; }
function donorFor(a) {
    const d = String(a.fundingSource || '').trim();
    if (!d || d.toLowerCase() === 'own fund' || d.toLowerCase() === 'fcra') return null;
    return d;
}
function toDateCell(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) { const d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3])); return Number.isNaN(d.getTime()) ? v : d; }
    return v;
}

function buildSheet(assets) {
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
    banner[0] = 'K A L I K E - FIXED ASSET REGISTER FY 2013-14/2014-15/2015-16/2016-17';
    const g1 = new Array(30).fill(null); g1[14]='Assets at Cost'; g1[18]='Accumulated Depreciation';
    const g2 = new Array(30).fill(null); g2[18]='Opening'; g2[23]='FY 23-24'; g2[24]='FY 24-25';
    const data = assets.map(a => {
        const gross = num(a.amount) || num(a.grossBlock);
        const accDep = num(a.accumulatedDepreciation);
        const depCost = num(a.currentYearDepreciation);
        const depTotal = accDep + depCost;
        const netA = gross - accDep;
        const netB = num(a.netBlock) || (gross - depTotal);
        return [
            a.id||'', a.category||'', a.name||'', a.location||'', a.procurementType||null,
            toDateCell(a.purchaseDate), a.supplier||'', a.billNumber||'', toDateCell(a.installationDate), toDateCell(a.putToUseDate),
            num(a.quantity)||1, a.voucherNumber||'', num(a.depreciationRate), a.usefulLife||'',
            blankIfZero(gross), null, null, blankIfZero(gross), accDep, depCost, depTotal, null, depTotal, netA, netB,
            toDateCell(a.disposalDate), null, null, donorFor(a),
            a.status && a.status !== 'Active' ? a.status : null
        ];
    });
    return [banner, g1, g2, headerRow, ...data];
}

function bucketFor(a, defs) {
    if (a.sourceSheet) {
        const d = defs.find(x => x.name === a.sourceSheet);
        if (d) return d.name;
    }
    const d = defs.find(x => x.match(a));
    return d ? d.name : defs[defs.length-1].name;
}
function buildWorkbook(allAssets, defs) {
    const grouped = new Map(defs.map(d => [d.name, []]));
    for (const a of allAssets) {
        const s = bucketFor(a, defs);
        if (grouped.has(s)) grouped.get(s).push(a);
    }
    const wb = XLSX.utils.book_new();
    for (const d of defs) {
        const aoa = buildSheet(grouped.get(d.name) || []);
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        XLSX.utils.book_append_sheet(wb, ws, d.name.slice(0,31));
    }
    return wb;
}

// --- generate ---
const db = new Database('./db.sqlite', { readonly: true });
const all = db.prepare('SELECT * FROM assets').all();
db.close();
console.log(`Loaded ${all.length} assets from DB (${all.filter(a=>!a.isFcra).length} non-FCRA, ${all.filter(a=>a.isFcra).length} FCRA)`);

const wbNon = buildWorkbook(all.filter(a=>!a.isFcra), NON_FCRA_SHEETS);
const wbFcra = buildWorkbook(all.filter(a=>a.isFcra), FCRA_SHEETS);

const NON_OUT = './out_Dep_Asset_Register_Export.xlsx';
const FCRA_OUT = './out_FCRA_Asset_Register_Export.xlsx';
XLSX.writeFile(wbNon, NON_OUT);
XLSX.writeFile(wbFcra, FCRA_OUT);
console.log(`Wrote ${NON_OUT} and ${FCRA_OUT}\n`);

// --- diff against source ---
function countDataRowsInGenerated(file, sheet) {
    const wb = XLSX.readFile(file);
    const ws = wb.Sheets[sheet];
    if (!ws) return -1;
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
    return rows.slice(4).filter(r => r && r[0] && String(r[0]).trim() !== '').length;
}
function countDataRowsInSource(file, sheet) {
    const wb = XLSX.readFile(file);
    const ws = wb.Sheets[sheet];
    if (!ws) return -1;
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
    return rows.slice(4).filter(r => r && r[0] && String(r[0]).trim() !== '' && String(r[0]).trim().toLowerCase() !== 'total').length;
}

console.log('=== Non-FCRA: source vs generated, per sheet (data rows) ===');
const SRC_NON = 'Dep. Asset Register 24-25-22042025 (3).xlsx';
let srcTotal=0, genTotal=0;
for (const def of NON_FCRA_SHEETS) {
    const src = countDataRowsInSource(SRC_NON, def.name);
    const gen = countDataRowsInGenerated(NON_OUT, def.name);
    srcTotal += src; genTotal += gen;
    const ok = src === gen ? '✓' : '✗';
    console.log(`  ${ok}  ${def.name.padEnd(40)} src=${String(src).padStart(4)}  gen=${String(gen).padStart(4)}  diff=${gen-src}`);
}
console.log(`  TOTAL: src=${srcTotal}  gen=${genTotal}  diff=${genTotal-srcTotal}\n`);

console.log('=== FCRA: source vs generated, per sheet (data rows) ===');
const SRC_FCRA = 'Revised.Dep. FCRA Asset Register 24-25 22042025.xlsx';
srcTotal=0; genTotal=0;
for (const def of FCRA_SHEETS) {
    const src = countDataRowsInSource(SRC_FCRA, def.name);
    const gen = countDataRowsInGenerated(FCRA_OUT, def.name);
    srcTotal += src; genTotal += gen;
    const ok = src === gen ? '✓' : '✗';
    console.log(`  ${ok}  ${def.name.padEnd(40)} src=${String(src).padStart(4)}  gen=${String(gen).padStart(4)}  diff=${gen-src}`);
}
console.log(`  TOTAL: src=${srcTotal}  gen=${genTotal}  diff=${genTotal-srcTotal}\n`);

// --- column header compare ---
console.log('=== Column header compare (Furniture & Fixtures_grants) ===');
function getHeaderRow(file, sheet) {
    const wb = XLSX.readFile(file);
    const ws = wb.Sheets[sheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
    return rows[3] || [];
}
const srcH = getHeaderRow(SRC_NON, 'Furniture & Fixtures_grants');
const genH = getHeaderRow(NON_OUT, 'Furniture & Fixtures_grants');
console.log(`  source cols: ${srcH.length}, generated cols: ${genH.length}`);
let mismatches = 0;
for (let i = 0; i < Math.max(srcH.length, genH.length); i++) {
    const s = (srcH[i]||'').toString().replace(/\s+/g,' ').trim();
    const g = (genH[i]||'').toString().replace(/\s+/g,' ').trim();
    if (s !== g) { console.log(`    col ${i}: src="${s}" | gen="${g}"`); mismatches++; }
}
console.log(`  header mismatches: ${mismatches}`);

// --- sample value compare ---
console.log('\n=== Sample row compare (first 2 rows of Furniture & Fixtures_grants) ===');
function getDataRow(file, sheet, idx) {
    const wb = XLSX.readFile(file, { cellDates:true });
    const ws = wb.Sheets[sheet];
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
    return rows[4 + idx] || [];
}
for (let i = 0; i < 2; i++) {
    const srcRow = getDataRow(SRC_NON, 'Furniture & Fixtures_grants', i);
    const genRow = getDataRow(NON_OUT, 'Furniture & Fixtures_grants', i);
    console.log(`  Row ${i}: src.id="${srcRow[0]}", gen.id="${genRow[0]}", match=${srcRow[0]===genRow[0]}`);
}
