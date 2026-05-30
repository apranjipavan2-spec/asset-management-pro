/**
 * Import assets from the Kalike Fixed Asset Register Excel file.
 *
 * Usage:
 *   node scripts/import_assets_excel.cjs "Dep. Asset Register 24-25-22042025 (3).xlsx"
 *
 * Output:
 *   src/mock/real_assets.json  — overwrites with fresh normalized data
 *
 * Run `npm run db:seed` afterwards to push the JSON into SQLite.
 */

'use strict';

const XLSX  = require('xlsx');
const fs    = require('fs');
const path  = require('path');

// ── Config ────────────────────────────────────────────────────
const EXCEL_FILE  = process.argv[2];
const OUTPUT_JSON = path.join(__dirname, '..', 'src', 'mock', 'real_assets.json');

if (!EXCEL_FILE) {
    console.error('Usage: node scripts/import_assets_excel.cjs <path-to-excel>');
    process.exit(1);
}
if (!fs.existsSync(EXCEL_FILE)) {
    console.error('File not found:', EXCEL_FILE);
    process.exit(1);
}

// ── Sheet → category name map ─────────────────────────────────
// Only sheets listed here are imported. Others (working, summary) are skipped.
const SHEET_CATEGORY = {
    'Furniture & Fixtures_grants':   'Furniture & Fixtures (Grant)',
    'Computers_grants':              'Computers (Grant)',
    'Office equipment_grant':        'Office Equipment (Grant)',
    'Plant & Machinery_grant':       'Plant & Machinery (Grant)',
    'Office equipment_own fund':     'Office Equipment (Own Fund)',
    'Furniture & Fixtures_own funds':'Furniture & Fixtures (Own Fund)',
};

// ── Column index mapping (0-based, row 3 is the header row) ──
const COL = {
    id:                  0,
    category:            1,
    name:                2,
    location:            3,
    procurementType:     4,
    purchaseDate:        5,
    supplier:            6,
    billNumber:          7,
    installationDate:    8,
    putToUseDate:        9,
    quantity:           10,
    voucherNumber:      11,
    depreciationRate:   12,
    usefulLife:         13,
    grossBlock:         14,
    // col 15: Additions — not stored
    // col 16: Disposals — not stored
    // col 17: Closing Balance A — grossBlock closing, not stored separately
    accumulatedDepreciation: 22,  // Closing Balance B (accumulated dep.)
    netBlock:           24,       // Net Block FY 24-25
    disposalDate:       25,
    fundingSource:      28,       // Donor Name
    status:             29,
};

// ── Helpers ───────────────────────────────────────────────────
function normalizeDate(raw) {
    if (!raw || raw === 'N/A' || raw === 'null' || raw === '') return null;
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // Excel serial date number
    if (/^\d+$/.test(s) && Number(s) > 1000) {
        const d = XLSX.SSF.parse_date_code(Number(s));
        if (d) {
            const mm = String(d.m).padStart(2,'0');
            const dd = String(d.d).padStart(2,'0');
            return `${d.y}-${mm}-${dd}`;
        }
    }

    // DD.MM.YYYY / DD/MM/YYYY / DD-MM-YYYY
    const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;

    // DD.MM.YY (2-digit year — assume 2000s)
    const m2 = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2})$/);
    if (m2) return `20${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;

    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];

    console.warn(`  Could not parse date: "${raw}"`);
    return null;
}

function num(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(n) ? null : n;
}

function str(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
}

function normalizeStatus(raw) {
    if (!raw) return 'Active';
    const s = String(raw).toLowerCase().trim();
    if (s.includes('dispos') || s.includes('scrap') || s.includes('written'))  return 'Disposed';
    if (s.includes('maint') || s.includes('repair'))                            return 'In Maintenance';
    if (s.includes('store') || s.includes('inactive'))                          return 'Stored';
    return 'Active';
}

// ── Main import ───────────────────────────────────────────────
const wb = XLSX.readFile(EXCEL_FILE);
const assets = [];
const seen   = new Set();   // deduplicate by ID
let skipped  = 0;

for (const sheetName of Object.keys(SHEET_CATEGORY)) {
    if (!wb.SheetNames.includes(sheetName)) {
        console.warn(`Sheet not found, skipping: "${sheetName}"`);
        continue;
    }

    const category = SHEET_CATEGORY[sheetName];
    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

    // Find header row — first row where col 0 looks like an asset ID
    // (contains "KALIKE" or "#Kalike" or is the literal header text)
    let dataStart = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const cell = str(rows[i][0]);
        if (!cell) continue;
        // Header row itself — skip it
        if (cell.toLowerCase().includes('asset identification')) { dataStart = i + 1; break; }
        if (cell.toUpperCase().includes('KALIKE') || cell.startsWith('#')) { dataStart = i; break; }
    }
    if (dataStart === -1) {
        // Fallback: use row after the row that contains "Asset Identification Number"
        for (let i = 3; i < Math.min(rows.length, 8); i++) {
            if (rows[i] && str(rows[i][0]) && str(rows[i][0]).toLowerCase().includes('asset')) {
                dataStart = i + 1;
                break;
            }
        }
    }
    if (dataStart === -1) dataStart = 4; // safe fallback

    let sheetCount = 0;
    for (let i = dataStart; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;

        const rawId = str(row[COL.id]);
        if (!rawId || rawId.toLowerCase().includes('total') || rawId.toLowerCase().includes('grand')) continue;
        // Skip rows that look like sub-headers
        if (rawId.toLowerCase().includes('asset identification')) continue;

        const id = rawId;
        if (seen.has(id)) { skipped++; continue; }
        seen.add(id);

        assets.push({
            id,
            category:               str(row[COL.category]) || category,
            name:                   str(row[COL.name]),
            location:               str(row[COL.location]),
            procurementType:        str(row[COL.procurementType]),
            purchaseDate:           normalizeDate(row[COL.purchaseDate]),
            supplier:               str(row[COL.supplier]),
            billNumber:             str(row[COL.billNumber]),
            installationDate:       normalizeDate(row[COL.installationDate]),
            putToUseDate:           normalizeDate(row[COL.putToUseDate]),
            quantity:               num(row[COL.quantity]) ?? 1,
            voucherNumber:          str(row[COL.voucherNumber]),
            depreciationRate:       num(row[COL.depreciationRate]),
            usefulLife:             num(row[COL.usefulLife]),
            grossBlock:             num(row[COL.grossBlock]),
            accumulatedDepreciation:num(row[COL.accumulatedDepreciation]),
            netBlock:               num(row[COL.netBlock]),
            disposalDate:           normalizeDate(row[COL.disposalDate]),
            fundingSource:          str(row[COL.fundingSource]),
            status:                 normalizeStatus(row[COL.status]),
            source_file:            path.basename(EXCEL_FILE),
            source_sheet:           sheetName,
        });
        sheetCount++;
    }

    console.log(`  ${sheetName}: ${sheetCount} assets`);
}

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(assets, null, 2), 'utf8');

console.log(`\nDone. ${assets.length} assets written to src/mock/real_assets.json`);
if (skipped > 0) console.log(`${skipped} duplicates skipped.`);
console.log('\nNext step: npm run db:seed');
