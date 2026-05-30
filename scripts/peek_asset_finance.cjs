'use strict';
const ExcelJS = require('exceljs');
const path = require('path');
const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');

function cellText(v) {
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number') return String(v);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === 'object') {
        if ('richText' in v) return v.richText.map(t => t.text).join('').trim();
        if ('formula' in v) return '[F]' + String(v.formula);
        if ('result' in v) return String(v.result ?? '').trim();
        if ('text' in v) return String(v.text).trim();
    }
    return String(v).trim();
}

(async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(FILE);
    for (const ws of wb.worksheets) {
        console.log(`-- Sheet: ${ws.name}  rows=${ws.rowCount}  cols=${ws.columnCount}`);
        for (let r = 1; r <= Math.min(ws.rowCount, 6); r++) {
            const row = ws.getRow(r);
            const vals = [];
            for (let c = 1; c <= ws.columnCount; c++) {
                vals.push(`[${c}]` + cellText(row.getCell(c).value));
            }
            console.log(`R${r}: ` + vals.join(' | '));
        }
        const lr = ws.rowCount;
        const lrow = ws.getRow(lr);
        const lvals = [];
        for (let c = 1; c <= ws.columnCount; c++) {
            lvals.push(`[${c}]` + cellText(lrow.getCell(c).value));
        }
        console.log(`R${lr}: ` + lvals.join(' | '));
    }
})().catch(e => { console.error(e); process.exit(1); });
