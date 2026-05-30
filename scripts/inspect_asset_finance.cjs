'use strict';
const XLSX = require('xlsx');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.xlsx');
console.log('FILE:', FILE);
console.log('='.repeat(100));

const wb = XLSX.readFile(FILE, { cellDates: true, cellFormula: true, cellStyles: true });

function colLetter(i) { let s=''; i++; while(i){ i--; s=String.fromCharCode(65+(i%26))+s; i=Math.floor(i/26); } return s; }
function num(v){ if(v==null||v==='') return 0; const n=parseFloat(v); return Number.isFinite(n)?n:0; }

console.log('Sheets:', wb.SheetNames);
console.log('');

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false, raw: true });
  console.log('='.repeat(100));
  console.log(`SHEET: "${sheetName}"  range=${ws['!ref']}  rows=${rows.length}  cols=${range.e.c+1}`);
  console.log('='.repeat(100));

  // Show first 6 rows (headers + a couple data rows) verbatim
  console.log('\n-- First 6 rows --');
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const r = rows[i] || [];
    console.log(`  row ${i+1}:`, r.map(c => c === null ? '' : String(c).slice(0,40)).slice(0, range.e.c+1));
  }

  // Last 3 rows (often totals)
  console.log('\n-- Last 3 rows --');
  for (let i = Math.max(0, rows.length-3); i < rows.length; i++) {
    const r = rows[i] || [];
    console.log(`  row ${i+1}:`, r.map(c => c === null ? '' : String(c).slice(0,40)).slice(0, range.e.c+1));
  }

  // Formula inventory
  const formulas = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = colLetter(c) + (r+1);
      const cell = ws[addr];
      if (cell && cell.f) formulas.push({ addr, f: cell.f, v: cell.v });
    }
  }
  console.log(`\n-- Formulas (${formulas.length} cells) --`);
  if (formulas.length) {
    const patterns = new Map();
    for (const f of formulas) {
      const key = f.f.replace(/[A-Z]+\d+/g,'<ref>').slice(0,80);
      if (!patterns.has(key)) patterns.set(key, []);
      patterns.get(key).push(f);
    }
    for (const [pat, list] of patterns) {
      console.log(`  pattern: ${pat}  (${list.length}x)  e.g. ${list[0].addr} = ${list[0].f.slice(0,80)} -> ${list[0].v}`);
    }
  }

  // Merged cells (headers often merged)
  if (ws['!merges'] && ws['!merges'].length) {
    console.log(`\n-- Merges (${ws['!merges'].length}) --`);
    for (const m of ws['!merges'].slice(0,10)) {
      console.log(`  ${colLetter(m.s.c)}${m.s.r+1}:${colLetter(m.e.c)}${m.e.r+1}`);
    }
  }

  // Count non-empty data rows (skip first 4 header-ish rows)
  let dataRows = 0, blankIds = 0;
  for (let i = 4; i < rows.length; i++) {
    const id = rows[i] && rows[i][0];
    if (id && String(id).trim() && String(id).trim().toLowerCase() !== 'total') dataRows++;
    else if (rows[i] && rows[i].some(c => c !== null && c !== '')) blankIds++;
  }
  console.log(`\n-- Counts -- dataRows(col0 non-empty, !=total)=${dataRows}  blank-id-but-has-data rows=${blankIds}`);
}
