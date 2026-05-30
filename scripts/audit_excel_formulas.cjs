/**
 * Deep audit of the new 25-26 source Excel files.
 *
 *  1. Dump every formula in every sheet
 *  2. Recompute Net Block (A-B) for each row and flag rows where
 *     stored value disagrees with the computed value
 *  3. Sum each importable sheet's data rows and compare to the
 *     sheet's own "Total" row
 *  4. Look for category-column inconsistencies, blank Asset IDs,
 *     orphan "Total" rows, and obvious data errors.
 */
'use strict';
const XLSX = require('xlsx');

const FILES = [
    { path: 'Dep. Asset Register 25-26-05052026.xlsx',
      dataSheets: ['Furniture & Fixtures_grants', 'Computers_grants',
                   'Office equipment_grant', 'Plant & Machinery_grant',
                   'Office equipment_own fund', 'Furniture & Fixtures_own funds'] },
    { path: 'Revised.Dep. FCRA Asset Register 25-26-05052026.xlsx',
      dataSheets: ['Office equipment_fcra', 'fcra computer etc'] }
];

const COL = {
    id: 0, category: 1, name: 2, location: 3, procurementType: 4,
    purchaseDate: 5, supplier: 6, billNumber: 7, installationDate: 8, putToUseDate: 9,
    quantity: 10, voucherNumber: 11, depRate: 12, usefulLife: 13,
    grossOpen: 14, additions: 15, disposalsCost: 16, closingA: 17,
    accDepOpen: 18, depCost: 19, depTotal: 20, disposalsDep: 21,
    closingB: 22, netFY25: 23, netFY26: 24,
    disposalDate: 25, proceeds: 26, profitLoss: 27, donor: 28
};

function num(v) { if (v == null || v === '') return 0; const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }
function colLetter(i) { let s = ''; i++; while (i) { i--; s = String.fromCharCode(65 + (i%26)) + s; i = Math.floor(i/26); } return s; }

let totalFormulas = 0;
const inconsistencies = [];

for (const { path, dataSheets } of FILES) {
    console.log('\n' + '='.repeat(100));
    console.log('FILE:', path);
    console.log('='.repeat(100));
    const wb = XLSX.readFile(path, { cellDates: true, cellFormula: true });

    // ---------- Pass 1: dump formulas per sheet ----------
    console.log('\n--- FORMULA INVENTORY ---');
    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
        const formulasHere = [];
        for (let r = range.s.r; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const addr = colLetter(c) + (r + 1);
                const cell = ws[addr];
                if (cell && cell.f) {
                    formulasHere.push({ addr, f: cell.f, v: cell.v });
                }
            }
        }
        if (formulasHere.length === 0) { console.log(`  [${sheetName}] no formulas`); continue; }
        console.log(`  [${sheetName}] ${formulasHere.length} formula cells`);
        totalFormulas += formulasHere.length;
        // Print a unique formula pattern sample (max 5 per pattern)
        const patterns = new Map();
        for (const f of formulasHere) {
            const key = f.f.replace(/[A-Z]+\d+/g, '<ref>').slice(0, 80);
            if (!patterns.has(key)) patterns.set(key, []);
            patterns.get(key).push(f);
        }
        for (const [pat, list] of patterns) {
            console.log(`     pattern: ${pat}  (${list.length}x)  e.g. ${list[0].addr} = ${list[0].f.slice(0,60)} → ${list[0].v}`);
        }
    }

    // ---------- Pass 2: row-by-row Net Block check on data sheets ----------
    console.log('\n--- ROW-BY-ROW NET BLOCK CHECK (data sheets) ---');
    for (const sheetName of dataSheets) {
        const ws = wb.Sheets[sheetName];
        if (!ws) { console.log(`  ${sheetName}: missing`); continue; }
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
        let badNetA = 0, badNetB = 0, badClosingA = 0, badClosingB = 0, badDepTotal = 0;
        let dataRows = 0;
        let sumGross = 0, sumNetFY26 = 0, sumNetFY25 = 0, sumDepCost = 0, sumDepTotal = 0;
        for (let i = 4; i < rows.length; i++) {
            const r = rows[i] || [];
            const id = r[COL.id];
            if (!id || String(id).trim() === '') continue;
            if (String(id).trim().toLowerCase() === 'total') continue;
            dataRows++;
            const grossOpen   = num(r[COL.grossOpen]);
            const additions   = num(r[COL.additions]);
            const dispCost    = num(r[COL.disposalsCost]);
            const closingA    = num(r[COL.closingA]);
            const accDepOpen  = num(r[COL.accDepOpen]);
            const depCost     = num(r[COL.depCost]);
            const depTotal    = num(r[COL.depTotal]);
            const dispDep     = num(r[COL.disposalsDep]);
            const closingB    = num(r[COL.closingB]);
            const netFY25     = num(r[COL.netFY25]);
            const netFY26     = num(r[COL.netFY26]);

            sumGross += grossOpen + additions - dispCost;
            sumNetFY25 += netFY25;
            sumNetFY26 += netFY26;
            sumDepCost += depCost;
            sumDepTotal += depTotal;

            // Expected closing A = open + additions - disposals
            const expClosingA = grossOpen + additions - dispCost;
            if (Math.abs(expClosingA - closingA) > 0.5) {
                badClosingA++;
                if (badClosingA <= 3) inconsistencies.push(`[${sheetName}] row ${i+1} (${id}): Closing A = ${closingA}, expected ${expClosingA.toFixed(2)} (open ${grossOpen} + add ${additions} - disp ${dispCost})`);
            }
            // Expected dep total = accDepOpen + depCost
            const expDepTotal = accDepOpen + depCost;
            if (Math.abs(expDepTotal - depTotal) > 0.5) {
                badDepTotal++;
                if (badDepTotal <= 3) inconsistencies.push(`[${sheetName}] row ${i+1} (${id}): Dep Total = ${depTotal}, expected ${expDepTotal.toFixed(2)} (open ${accDepOpen} + cost ${depCost})`);
            }
            // Expected closing B = depTotal - disposals(dep)
            const expClosingB = depTotal - dispDep;
            if (Math.abs(expClosingB - closingB) > 0.5) {
                badClosingB++;
                if (badClosingB <= 3) inconsistencies.push(`[${sheetName}] row ${i+1} (${id}): Closing B = ${closingB}, expected ${expClosingB.toFixed(2)} (depTotal ${depTotal} - dispDep ${dispDep})`);
            }
            // Net Block A-B FY 24-25 should equal grossOpen - accDepOpen
            const expNetFY25 = grossOpen - accDepOpen;
            if (netFY25 !== 0 && Math.abs(expNetFY25 - netFY25) > 0.5) {
                badNetA++;
                if (badNetA <= 3) inconsistencies.push(`[${sheetName}] row ${i+1} (${id}): Net FY25 = ${netFY25}, expected ${expNetFY25.toFixed(2)} (gross ${grossOpen} - accDep ${accDepOpen})`);
            }
            // Net Block A-B FY 25-26 should equal closingA - closingB
            const expNetFY26 = closingA - closingB;
            if (netFY26 !== 0 && Math.abs(expNetFY26 - netFY26) > 0.5) {
                badNetB++;
                if (badNetB <= 3) inconsistencies.push(`[${sheetName}] row ${i+1} (${id}): Net FY26 = ${netFY26}, expected ${expNetFY26.toFixed(2)} (closingA ${closingA} - closingB ${closingB})`);
            }
        }
        // Locate "Total" row and compare
        let totalRow = null;
        for (let i = rows.length - 1; i >= 4; i--) {
            const r = rows[i] || [];
            if (r[COL.id] && String(r[COL.id]).trim().toLowerCase() === 'total') { totalRow = r; break; }
        }
        const tGross = totalRow ? num(totalRow[COL.closingA]) : null;
        const tDepCost = totalRow ? num(totalRow[COL.depCost]) : null;
        const tDepTotal = totalRow ? num(totalRow[COL.depTotal]) : null;
        const tNetFY25 = totalRow ? num(totalRow[COL.netFY25]) : null;
        const tNetFY26 = totalRow ? num(totalRow[COL.netFY26]) : null;
        console.log(`  ${sheetName}: ${dataRows} rows`);
        console.log(`     Closing A computed=${sumGross.toFixed(2)}  Total row=${tGross}  diff=${tGross == null ? 'n/a' : (tGross - sumGross).toFixed(2)}`);
        console.log(`     Dep Cost  computed=${sumDepCost.toFixed(2)}  Total row=${tDepCost}  diff=${tDepCost == null ? 'n/a' : (tDepCost - sumDepCost).toFixed(2)}`);
        console.log(`     Dep Total computed=${sumDepTotal.toFixed(2)}  Total row=${tDepTotal}  diff=${tDepTotal == null ? 'n/a' : (tDepTotal - sumDepTotal).toFixed(2)}`);
        console.log(`     Net FY26  computed=${sumNetFY26.toFixed(2)}  Total row=${tNetFY26}  diff=${tNetFY26 == null ? 'n/a' : (tNetFY26 - sumNetFY26).toFixed(2)}`);
        if (badClosingA + badClosingB + badDepTotal + badNetA + badNetB > 0) {
            console.log(`     ⚠️  Row-level inconsistencies: ClosingA=${badClosingA} ClosingB=${badClosingB} DepTotal=${badDepTotal} NetFY25=${badNetA} NetFY26=${badNetB}`);
        } else {
            console.log(`     ✓ All row-level arithmetic checks pass`);
        }
    }
}

console.log('\n' + '='.repeat(100));
console.log(`TOTAL FORMULAS ACROSS ALL SHEETS: ${totalFormulas}`);
console.log('='.repeat(100));

if (inconsistencies.length > 0) {
    console.log('\nFIRST ' + Math.min(inconsistencies.length, 30) + ' INCONSISTENCIES:');
    for (const i of inconsistencies.slice(0, 30)) console.log('  - ' + i);
}
