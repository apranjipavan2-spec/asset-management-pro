'use strict';
const XLSX = require('xlsx');
const path = require('path');
const wb = XLSX.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.xlsx'),
                         { cellDates: true, cellFormula: true, cellStyles: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(ws['!ref']);

// Count formula vs static cells per column
const stats = {};
for (let c = range.s.c; c <= range.e.c; c++) {
  const letter = XLSX.utils.encode_col(c);
  stats[letter] = { formula: 0, static: 0, blank: 0, samples: [] };
  for (let r = 3; r <= range.e.r; r++) {           // data rows only
    const addr = letter + (r+1);
    const cell = ws[addr];
    if (!cell || cell.v == null || cell.v === '') { stats[letter].blank++; continue; }
    if (cell.f) {
      stats[letter].formula++;
      if (stats[letter].samples.length < 2) stats[letter].samples.push(`${addr} = ${cell.f}`);
    } else {
      stats[letter].static++;
      if (stats[letter].samples.length < 2) stats[letter].samples.push(`${addr} (static) = ${cell.v}`);
    }
  }
}
const headerRow3 = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,blankrows:false})[2];
console.log('col | header                           | formula | static | blank | samples');
console.log('-'.repeat(120));
for (const [letter, s] of Object.entries(stats)) {
  const idx = XLSX.utils.decode_col(letter);
  const hdr = (headerRow3[idx] || '').toString().replace(/\r?\n/g,' ').slice(0,32);
  console.log(`${letter.padEnd(3)} | ${hdr.padEnd(32)} | ${String(s.formula).padStart(7)} | ${String(s.static).padStart(6)} | ${String(s.blank).padStart(5)} | ${s.samples.join(' | ')}`);
}

// Also inspect cell styling (color/fill/border) of header row and a sample data cell
console.log('\nStyle samples:');
for (const addr of ['A1','A3','F3','K3','O3','P3','F4','K4','O4','P4']) {
  const c = ws[addr];
  if (!c) { console.log(`  ${addr}: (empty)`); continue; }
  const s = c.s || {};
  console.log(`  ${addr}:`, JSON.stringify({ fill: s.fill, border: s.border?'(border)':undefined, font: s.font?{bold:s.font.bold,color:s.font.color}:undefined, alignment: s.alignment }));
}

// Column widths
console.log('\nColumn widths !cols:');
if (ws['!cols']) {
  ws['!cols'].forEach((c, i) => {
    if (!c) return;
    console.log(`  col ${XLSX.utils.encode_col(i)}: ${JSON.stringify(c)}`);
  });
} else console.log('  (no !cols set)');
