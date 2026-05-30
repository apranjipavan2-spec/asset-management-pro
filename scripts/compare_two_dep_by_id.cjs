/**
 * Compare depreciation calculations between two files by ASSET ID
 * (rows are ordered differently, so position-based diff is useless).
 *
 *   File A: Asset Finance.with_calc.xlsx
 *   File B: Asset Finance.with_calc.auto.xlsx
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

function num(c) {
  if (c == null) return 0;
  if (typeof c === 'number') return c;
  if (typeof c === 'object' && c !== null) {
    if ('result' in c) return Number(c.result || 0);
    if ('text' in c) { const n = Number(c.text); return Number.isFinite(n) ? n : 0; }
  }
  const n = Number(c);
  return Number.isFinite(n) ? n : 0;
}
function str(c) {
  if (c == null) return '';
  if (typeof c === 'object' && c !== null) {
    if ('result' in c) return String(c.result ?? '');
    if ('text' in c) return String(c.text ?? '');
    if ('richText' in c) return c.richText.map(t => t.text).join('');
  }
  return String(c).trim();
}

function loadById(ws) {
  const map = new Map();
  for (let r = 4; r <= ws.rowCount; r++) {
    const id = str(ws.getRow(r).getCell(1).value);
    if (!id) continue;
    map.set(id, r);
  }
  return map;
}

(async () => {
  const base = 'Asset New data/Asset for Finance';
  const wbA = new ExcelJS.Workbook();
  const wbB = new ExcelJS.Workbook();
  await wbA.xlsx.readFile(path.resolve(base, 'Asset Finance.with_calc.xlsx'));
  await wbB.xlsx.readFile(path.resolve(base, 'Asset Finance.with_calc.auto.xlsx'));
  const wsA = wbA.worksheets[0];
  const wsB = wbB.worksheets[0];

  const idA = loadById(wsA);
  const idB = loadById(wsB);
  console.log(`Asset IDs — File A: ${idA.size}, File B: ${idB.size}`);

  const onlyA = [...idA.keys()].filter(k => !idB.has(k));
  const onlyB = [...idB.keys()].filter(k => !idA.has(k));
  console.log(`IDs only in A: ${onlyA.length}${onlyA.length ? '  e.g. ' + onlyA.slice(0,3).join(', ') : ''}`);
  console.log(`IDs only in B: ${onlyB.length}${onlyB.length ? '  e.g. ' + onlyB.slice(0,3).join(', ') : ''}`);

  // Columns we care about
  const COLS = {
    C: { col: 3,  name: 'Dep Rate' },
    F: { col: 6,  name: 'GB Open' },
    G: { col: 7,  name: 'Additions' },
    I: { col: 9,  name: 'GB Closing' },
    J: { col: 10, name: 'Acc Dep Open' },
    K: { col: 11, name: 'Dep - Cost' },
    L: { col: 12, name: 'Dep - Total' },
    N: { col: 14, name: 'Acc Dep Close' },
    O: { col: 15, name: 'Net Block (A-B) col O' },
    P: { col: 16, name: 'Net Block (A-B) col P' },
    V: { col: 22, name: 'Calc Acc Dep Open (V)' },
    W: { col: 23, name: 'Calc Net Block (W)' },
  };

  const totals = {};
  for (const k of Object.keys(COLS)) totals[k] = { sumA: 0, sumB: 0, diffCount: 0, examples: [] };

  const common = [...idA.keys()].filter(k => idB.has(k));
  for (const id of common) {
    const rA = wsA.getRow(idA.get(id));
    const rB = wsB.getRow(idB.get(id));
    for (const [k, info] of Object.entries(COLS)) {
      const vA = num(rA.getCell(info.col).value);
      const vB = num(rB.getCell(info.col).value);
      totals[k].sumA += vA;
      totals[k].sumB += vB;
      if (Math.abs(vA - vB) > 0.01) {
        totals[k].diffCount++;
        if (totals[k].examples.length < 6) {
          totals[k].examples.push({ id, vA, vB, d: vB - vA });
        }
      }
    }
  }

  console.log('\n=== Per-column totals (matched by Asset ID, ' + common.length + ' rows) ===');
  console.log('Col | Field                    | Sum (manual)   | Sum (auto)     | Diff           | Rows differ');
  console.log('-'.repeat(110));
  for (const [k, info] of Object.entries(COLS)) {
    const t = totals[k];
    const diff = t.sumB - t.sumA;
    console.log(`${k.padEnd(3)} | ${info.name.padEnd(24)} | ${t.sumA.toFixed(2).padStart(14)} | ${t.sumB.toFixed(2).padStart(14)} | ${diff.toFixed(2).padStart(14)} | ${t.diffCount}`);
  }

  console.log('\n=== Top 10 largest absolute differences on column K (Depreciation - Cost) ===');
  const colKdiffs = [];
  for (const id of common) {
    const vA = num(wsA.getRow(idA.get(id)).getCell(11).value);
    const vB = num(wsB.getRow(idB.get(id)).getCell(11).value);
    const d = vB - vA;
    if (Math.abs(d) > 0.01) colKdiffs.push({ id, vA, vB, d });
  }
  colKdiffs.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  console.log('AssetID                            | manual K    | auto K      | diff');
  console.log('-'.repeat(90));
  for (const x of colKdiffs.slice(0, 10)) {
    console.log(`${x.id.padEnd(34)} | ${x.vA.toFixed(2).padStart(11)} | ${x.vB.toFixed(2).padStart(11)} | ${x.d.toFixed(2).padStart(11)}`);
  }

  console.log('\n=== Top 10 largest absolute differences on column V (Calc Acc Dep Opening) ===');
  const colVdiffs = [];
  for (const id of common) {
    const vA = num(wsA.getRow(idA.get(id)).getCell(22).value);
    const vB = num(wsB.getRow(idB.get(id)).getCell(22).value);
    const d = vB - vA;
    if (Math.abs(d) > 0.01) colVdiffs.push({ id, vA, vB, d });
  }
  colVdiffs.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  console.log('AssetID                            | manual V    | auto V      | diff');
  console.log('-'.repeat(90));
  for (const x of colVdiffs.slice(0, 10)) {
    console.log(`${x.id.padEnd(34)} | ${x.vA.toFixed(2).padStart(11)} | ${x.vB.toFixed(2).padStart(11)} | ${x.d.toFixed(2).padStart(11)}`);
  }

  // For one example: show side-by-side full row
  if (colVdiffs.length > 0) {
    const ex = colVdiffs[0];
    console.log(`\n=== Full side-by-side for largest V-diff asset: ${ex.id} ===`);
    const rA = wsA.getRow(idA.get(ex.id));
    const rB = wsB.getRow(idB.get(ex.id));
    for (const [k, info] of Object.entries(COLS)) {
      const vA = num(rA.getCell(info.col).value);
      const vB = num(rB.getCell(info.col).value);
      console.log(`  ${k}: ${info.name.padEnd(24)}  A=${vA.toFixed(2).padStart(12)}  B=${vB.toFixed(2).padStart(12)}  diff=${(vB - vA).toFixed(2).padStart(12)}`);
    }
    // refined acq date
    console.log(`  E (Refined Acq Date)  A="${str(rA.getCell(5).value)}"   B="${str(rB.getCell(5).value)}"`);
  }
})();
