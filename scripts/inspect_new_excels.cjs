/**
 * Inspect the new 25-26 Excel files. Dump sheet names, row counts,
 * header rows, and a couple sample rows so we can plan the import.
 *
 * Run: node scripts/inspect_new_excels.cjs
 */
'use strict';
const XLSX = require('xlsx');

const FILES = [
    'Dep. Asset Register 25-26-05052026.xlsx',
    'Revised.Dep. FCRA Asset Register 25-26-05052026.xlsx'
];

for (const path of FILES) {
    console.log('\n' + '='.repeat(80));
    console.log('FILE:', path);
    console.log('='.repeat(80));
    const wb = XLSX.readFile(path, { cellDates: true });
    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
        console.log(`\n  Sheet: "${sheetName}"  (${rows.length} rows)`);
        // Show first 5 rows of structure
        for (let i = 0; i < Math.min(5, rows.length); i++) {
            const r = rows[i] || [];
            const preview = r.slice(0, 32).map(c => {
                if (c == null) return '';
                const s = String(c).replace(/\s+/g, ' ').trim();
                return s.length > 22 ? s.slice(0, 22) + '..' : s;
            });
            console.log(`    [${i}]`, JSON.stringify(preview));
        }
        // Show last data row
        if (rows.length > 6) {
            const last = rows[rows.length - 1] || [];
            const preview = last.slice(0, 32).map(c => {
                if (c == null) return '';
                const s = String(c).replace(/\s+/g, ' ').trim();
                return s.length > 22 ? s.slice(0, 22) + '..' : s;
            });
            console.log(`    [last=${rows.length - 1}]`, JSON.stringify(preview));
        }
    }
}
