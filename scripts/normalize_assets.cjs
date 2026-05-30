/**
 * One-time normalization script for real_assets.json
 * Fixes: category names, date formats, type consistency
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'mock', 'real_assets.json');
const assets = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Category mapping: raw dirty names → clean normalized names
const CATEGORY_MAP = {
    'Furnitures & Fixture_ Grants': 'Furniture & Fixtures (Grant)',
    'Furnitures & Fixture_Grants': 'Furniture & Fixtures (Grant)',
    'Furnitures & Fixtures_ Grants': 'Furniture & Fixtures (Grant)',
    'Furniture & Fixture_ Grants': 'Furniture & Fixtures (Grant)',
    'Computers_grants': 'Computers (Grant)',
    'Computers_Grants': 'Computers (Grant)',
    'Computers_ grants': 'Computers (Grant)',
    'Office equipment_grant': 'Office Equipment (Grant)',
    'Office Equipment_grant': 'Office Equipment (Grant)',
    'Office equipment_Grant': 'Office Equipment (Grant)',
    'Office Equipment_Grant': 'Office Equipment (Grant)',
    'Plant & Machinery_grant': 'Plant & Machinery (Grant)',
    'Plant & Machinery_Grant': 'Plant & Machinery (Grant)',
    'Plant & machinery_grant': 'Plant & Machinery (Grant)',
    'Office Equipment (Own Fund)': 'Office Equipment (Own Fund)',
    'Furniture & Fixtures (Own Fund)': 'Furniture & Fixtures (Own Fund)',
    'Infrastructure': 'Infrastructure',
    'Unclassified': 'Unclassified',
    // Already clean names pass through
    'Furniture & Fixtures (Grant)': 'Furniture & Fixtures (Grant)',
    'Computers (Grant)': 'Computers (Grant)',
    'Office Equipment (Grant)': 'Office Equipment (Grant)',
    'Plant & Machinery (Grant)': 'Plant & Machinery (Grant)',
};

/**
 * Convert various date formats to YYYY-MM-DD
 * Handles: DD.MM.YYYY, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, YYYY-MM-DD, null
 */
function normalizeDate(dateStr) {
    if (!dateStr || dateStr === 'N/A' || dateStr === 'null' || dateStr === '') return null;

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
    let match = dateStr.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
    if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];
        // Validate — if day > 12, it's definitely DD.MM.YYYY
        // If both <= 12, assume DD.MM.YYYY (Indian format)
        return `${year}-${month}-${day}`;
    }

    // Try JS Date parse as last resort
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
    }

    console.warn(`Could not parse date: "${dateStr}"`);
    return null;
}

let changes = {
    categories: 0,
    dates: 0,
    quantities: 0,
    billNumbers: 0,
    names: 0,
    total: 0
};

assets.forEach((asset, i) => {
    // 1. Normalize category
    const rawCat = asset.category;
    if (CATEGORY_MAP[rawCat]) {
        if (rawCat !== CATEGORY_MAP[rawCat]) {
            asset.category = CATEGORY_MAP[rawCat];
            changes.categories++;
        }
    } else if (rawCat && !Object.values(CATEGORY_MAP).includes(rawCat)) {
        console.warn(`Unknown category [${i}]: "${rawCat}" — leaving as-is`);
    }

    // 2. Normalize dates
    const dateFields = ['purchaseDate', 'installationDate', 'putToUseDate', 'disposalDate'];
    dateFields.forEach(field => {
        const original = asset[field];
        if (original) {
            const normalized = normalizeDate(String(original));
            if (normalized !== original) {
                asset[field] = normalized;
                changes.dates++;
            }
        }
    });

    // 3. Normalize quantity to number
    if (asset.quantity !== undefined && asset.quantity !== null) {
        const numQty = parseInt(asset.quantity, 10);
        if (!isNaN(numQty) && asset.quantity !== numQty) {
            asset.quantity = numQty;
            changes.quantities++;
        }
    }

    // 4. Normalize billNumber to string
    if (asset.billNumber !== undefined && asset.billNumber !== null) {
        if (typeof asset.billNumber === 'number') {
            asset.billNumber = String(asset.billNumber);
            changes.billNumbers++;
        }
    }

    // 5. Normalize voucherNumber to string
    if (asset.voucherNumber !== undefined && asset.voucherNumber !== null) {
        if (typeof asset.voucherNumber === 'number') {
            asset.voucherNumber = String(asset.voucherNumber);
        }
    }

    changes.total++;
});

// Write back
fs.writeFileSync(filePath, JSON.stringify(assets, null, 4), 'utf8');

console.log('\n=== NORMALIZATION COMPLETE ===');
console.log(`Total assets processed: ${changes.total}`);
console.log(`Categories renamed: ${changes.categories}`);
console.log(`Dates reformatted: ${changes.dates}`);
console.log(`Quantities fixed to number: ${changes.quantities}`);
console.log(`Bill numbers fixed to string: ${changes.billNumbers}`);

// Print unique categories after normalization
const uniqueCats = [...new Set(assets.map(a => a.category))].sort();
console.log(`\nUnique categories after normalization (${uniqueCats.length}):`);
uniqueCats.forEach(c => console.log(`  - ${c}`));

// Print date samples
console.log(`\nSample dates after normalization:`);
assets.slice(0, 5).forEach(a => {
    console.log(`  ${a.id}: purchaseDate=${a.purchaseDate}, installationDate=${a.installationDate}`);
});
