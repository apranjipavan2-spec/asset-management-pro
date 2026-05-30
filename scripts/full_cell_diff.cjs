'use strict';
const XLSX = require('xlsx');
const path = require('path');

const PAIRS = [
    {
        label: 'Non-FCRA',
        src: 'C:\\Users\\apran\\Downloads\\Dep. Asset Register 24-25-22042025 (3).xlsx',
        gen: path.resolve('./out_Dep_Asset_Register_Export.xlsx'),
        sheets: ['Furniture & Fixtures_grants','Computers_grants','Office equipment_grant',
                 'Plant & Machinery_grant','Office equipment_own fund','Furniture & Fixtures_own funds']
    },
    {
        label: 'FCRA',
        src: 'C:\\Users\\apran\\Downloads\\Revised.Dep. FCRA Asset Register 24-25 22042025.xlsx',
        gen: path.resolve('./out_FCRA_Asset_Register_Export.xlsx'),
        sheets: ['Office equipment_fcra','fcra computer etc']
    }
];

function readSheet(file, sheet) {
    const wb = XLSX.readFile(file, { cellDates: true });
    const ws = wb.Sheets[sheet];
    if (!ws) return null;
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
}

function norm(v) {
    if (v == null) return '';
    if (v instanceof Date) return v.toISOString().slice(0,10);
    if (typeof v === 'number') {
        // Treat zero-padded numeric strings same as their number value
        const s = v.toString();
        // Round floats to 2dp for currency
        if (!Number.isInteger(v)) return v.toFixed(2);
        return s;
    }
    const s = String(v).trim();
    // numeric-string equivalence
    if (/^\d+$/.test(s)) return parseInt(s, 10).toString();
    if (/^\d+\.\d+$/.test(s)) return parseFloat(s).toFixed(2);
    return s.replace(/\s+/g, ' ');
}

function indexById(rows) {
    const out = new Map();
    if (!rows) return out;
    rows.slice(4).forEach((r, i) => {
        const id = r && r[0] ? String(r[0]).trim() : '';
        if (id && id.toLowerCase() !== 'total') {
            if (!out.has(id)) out.set(id, []);
            out.get(id).push({ rowIdx: i + 4, row: r });
        }
    });
    return out;
}

let grandTotalCells = 0, grandMatches = 0, grandMismatches = 0, grandMissing = 0, grandExtra = 0;
const issues = [];

for (const pair of PAIRS) {
    console.log('\n========== ' + pair.label + ' ==========');
    for (const sheet of pair.sheets) {
        const srcRows = readSheet(pair.src, sheet);
        const genRows = readSheet(pair.gen, sheet);
        if (!srcRows) { console.log('  [' + sheet + '] missing in source'); continue; }
        if (!genRows) { console.log('  [' + sheet + '] missing in generated'); continue; }

        const srcIdx = indexById(srcRows);
        const genIdx = indexById(genRows);

        let cells = 0, matches = 0, misCount = 0, missing = 0, extra = 0;
        const sheetIssues = [];

        // Compare every src row to gen
        for (const [id, srcInstances] of srcIdx) {
            const genInstances = genIdx.get(id) || [];
            if (genInstances.length === 0) {
                missing++;
                sheetIssues.push({ id, type: 'MISSING_IN_GEN' });
                continue;
            }
            // Pair up source duplicates: first→first, second→none
            const srcRow = srcInstances[0].row;
            const genRow = genInstances[0].row;
            const len = Math.max(srcRow.length, genRow.length, 30);
            for (let c = 0; c < len; c++) {
                cells++;
                const a = norm(srcRow[c]);
                const b = norm(genRow[c]);
                if (a === b) matches++;
                else {
                    misCount++;
                    if (sheetIssues.length < 5) {
                        sheetIssues.push({ id, type: 'CELL', col: c, src: srcRow[c], gen: genRow[c] });
                    }
                }
            }
            // count any extra source duplicates as missing-in-gen
            for (let k = 1; k < srcInstances.length; k++) {
                missing++;
                sheetIssues.push({ id, type: 'SRC_DUPLICATE_NOT_IN_GEN', rowIdx: srcInstances[k].rowIdx });
            }
        }
        // Any IDs only in generated?
        for (const id of genIdx.keys()) if (!srcIdx.has(id)) {
            extra++;
            sheetIssues.push({ id, type: 'EXTRA_IN_GEN' });
        }

        const pct = cells ? (matches/cells*100).toFixed(2) : '0';
        console.log('  [' + sheet.padEnd(35) + '] cells=' + String(cells).padStart(5)
            + ' match=' + String(matches).padStart(5) + ' (' + pct + '%)'
            + ' mismatches=' + misCount
            + ' missingInGen=' + missing
            + ' extraInGen=' + extra);
        if (sheetIssues.length) {
            sheetIssues.slice(0, 10).forEach(iss => {
                if (iss.type === 'CELL')
                    console.log('      col[' + iss.col + '] id=' + iss.id + ' src=' + JSON.stringify(iss.src) + ' gen=' + JSON.stringify(iss.gen));
                else
                    console.log('      ' + iss.type + ' id=' + iss.id);
            });
        }

        grandTotalCells += cells; grandMatches += matches; grandMismatches += misCount;
        grandMissing += missing; grandExtra += extra;
    }
}

console.log('\n========== GRAND TOTAL ==========');
console.log('Cells compared: ' + grandTotalCells);
console.log('Exact matches:  ' + grandMatches + ' (' + (grandMatches/grandTotalCells*100).toFixed(2) + '%)');
console.log('Cell mismatches:' + grandMismatches);
console.log('Rows missing in generated: ' + grandMissing);
console.log('Rows extra in generated:   ' + grandExtra);
