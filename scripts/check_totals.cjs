'use strict';
const XLSX = require('xlsx');
const Database = require('better-sqlite3');

const SRC_NON = 'C:/Users/apran/Downloads/Dep. Asset Register 24-25-22042025 (3).xlsx';
const SRC_FCRA = 'C:/Users/apran/Downloads/Revised.Dep. FCRA Asset Register 24-25 22042025.xlsx';

const db = new Database('./db.sqlite', { readonly: true });
const dbAssets = db.prepare('SELECT id, amount, accumulatedDepreciation, currentYearDepreciation, netBlock, isFcra FROM assets').all();
db.close();

function sum(arr, key) { return arr.reduce((s,a)=>s+(+a[key]||0),0); }
const dbGross = sum(dbAssets,'amount');
const dbNet = sum(dbAssets,'netBlock');
const dbAcc = sum(dbAssets,'accumulatedDepreciation');
const dbDep = sum(dbAssets,'currentYearDepreciation');

function inr(n) { return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function sumSource(path, sheets) {
    const wb = XLSX.readFile(path, { cellDates: true });
    let g=0, a=0, d=0, n=0, c=0;
    const ids = new Set();
    for (const sh of sheets) {
        const ws = wb.Sheets[sh]; if(!ws) continue;
        const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:null });
        for (let i=4;i<rows.length;i++) {
            const r = rows[i]; if(!r) continue;
            const id = r[0]?String(r[0]).trim():'';
            if(!id || id.toLowerCase()==='total') continue;
            c++; ids.add(id);
            g += +r[14]||0; a += +r[18]||0; d += +r[19]||0; n += +r[24]||0;
        }
    }
    return { g, a, d, n, c, unique: ids.size };
}

const s1 = sumSource(SRC_NON, ['Furniture & Fixtures_grants','Computers_grants','Office equipment_grant','Plant & Machinery_grant','Office equipment_own fund','Furniture & Fixtures_own funds']);
const s2 = sumSource(SRC_FCRA, ['Office equipment_fcra','fcra computer etc']);
const ST = { g:s1.g+s2.g, a:s1.a+s2.a, d:s1.d+s2.d, n:s1.n+s2.n, c:s1.c+s2.c };

console.log('============== TOTAL FLEET VALUATION ==============');
console.log('Source rows: ' + s1.c + ' (' + s1.unique + ' unique) + ' + s2.c + ' (' + s2.unique + ' unique) = ' + ST.c);
console.log('DB rows:     ' + dbAssets.length + ' (PRIMARY KEY collapses 3 source duplicates)\n');

console.log('Metric             | Dashboard          | DB                 | Source (sum of all rows incl. dups)');
console.log('--------           | --------           | --------           | --------');
console.log('Count              | 375                | ' + dbAssets.length + '                | ' + ST.c);
console.log('Gross Block        | ₹15,823,800.01     | ' + inr(dbGross) + ' | ' + inr(ST.g));
console.log('Acc. Depreciation  | (not shown)        | ' + inr(dbAcc) + '   | ' + inr(ST.a));
console.log('Curr-Yr Dep        | (not shown)        | ' + inr(dbDep) + '   | ' + inr(ST.d));
console.log('Net Block FY24-25  | (not shown)        | ' + inr(dbNet) + '   | ' + inr(ST.n));

console.log('\n--- Delta DB vs Source ---');
console.log('  Gross diff: ' + inr(dbGross - ST.g));
console.log('  Net diff:   ' + inr(dbNet - ST.n));

// Per-sheet breakdown
console.log('\n--- Per-sheet gross block ---');
for (const sh of ['Furniture & Fixtures_grants','Computers_grants','Office equipment_grant','Plant & Machinery_grant','Office equipment_own fund','Furniture & Fixtures_own funds']) {
    const wb = XLSX.readFile(SRC_NON, { cellDates:true });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sh], { header:1, defval:null });
    let g=0, c=0;
    rows.slice(4).forEach(r => { if(r && r[0] && String(r[0]).trim().toLowerCase() !== 'total') { g += +r[14]||0; c++; }});
    console.log('  ' + sh.padEnd(36) + ' rows=' + String(c).padStart(4) + '  gross=' + inr(g));
}
for (const sh of ['Office equipment_fcra','fcra computer etc']) {
    const wb = XLSX.readFile(SRC_FCRA, { cellDates:true });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sh], { header:1, defval:null });
    let g=0, c=0;
    rows.slice(4).forEach(r => { if(r && r[0] && String(r[0]).trim().toLowerCase() !== 'total') { g += +r[14]||0; c++; }});
    console.log('  ' + sh.padEnd(36) + ' rows=' + String(c).padStart(4) + '  gross=' + inr(g));
}
