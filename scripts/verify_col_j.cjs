/**
 * Compare column J between the working file and the original file.
 * Match rows by column A (asset ID) so reordering/inserts don't break
 * the diff. Report:
 *   - rows present in original but missing in current
 *   - rows present in current but missing in original
 *   - rows where J value differs (with both numbers)
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const CURRENT = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');
const ORIGINAL = path.resolve('Asset New data/Asset for Finance/Asset Finance.original.xlsx');

function num(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'result' in v) {
    const r = v.result;
    if (r == null || r === '') return null;
    if (r && typeof r === 'object' && 'error' in r) return null;
    const n = Number(r);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function idOf(v) {
  if (v == null) return null;
  return String(v).trim();
}

async function loadJ(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const map = new Map();
  const rowCount = ws.actualRowCount || ws.rowCount;
  for (let r = 1; r <= rowCount + 5; r++) {
    const row = ws.getRow(r);
    const id = idOf(row.getCell(1).value);
    if (!id) continue;
    // Skip header-ish rows where J is non-numeric AND A is short label
    const j = num(row.getCell(10).value);
    map.set(id, { r, j });
  }
  return { ws, map };
}

(async () => {
  const cur = await loadJ(CURRENT);
  const orig = await loadJ(ORIGINAL);

  console.log(`Current file  rows with ID: ${cur.map.size}`);
  console.log(`Original file rows with ID: ${orig.map.size}`);

  const missingInCur = [];   // in original, not in current
  const missingInOrig = [];  // in current, not in original
  const valueDiffs = [];     // J differs
  const matches = [];

  for (const [id, { r: rOrig, j: jOrig }] of orig.map) {
    if (!cur.map.has(id)) {
      missingInCur.push({ id, rOrig, jOrig });
      continue;
    }
    const { r: rCur, j: jCur } = cur.map.get(id);
    const both = (jOrig == null && jCur == null);
    if (both) { matches.push({ id, rCur, jCur }); continue; }
    if (jOrig == null || jCur == null) {
      valueDiffs.push({ id, rOrig, rCur, jOrig, jCur, diff: 'one-side-null' });
      continue;
    }
    if (Math.abs(jOrig - jCur) > 0.005) {
      valueDiffs.push({ id, rOrig, rCur, jOrig, jCur, diff: +(jCur - jOrig).toFixed(2) });
    } else {
      matches.push({ id, rCur, jCur });
    }
  }

  for (const [id, { r: rCur, j: jCur }] of cur.map) {
    if (!orig.map.has(id)) missingInOrig.push({ id, rCur, jCur });
  }

  console.log('\n' + '='.repeat(90));
  console.log(`SUMMARY`);
  console.log('='.repeat(90));
  console.log(`  Matches (J identical to within 1 paise) : ${matches.length}`);
  console.log(`  Value differs (J changed)               : ${valueDiffs.length}`);
  console.log(`  In ORIGINAL but missing in CURRENT      : ${missingInCur.length}`);
  console.log(`  In CURRENT but missing in ORIGINAL      : ${missingInOrig.length}`);

  if (missingInCur.length) {
    console.log('\n--- Rows in ORIGINAL not found in CURRENT ---');
    console.log('rOrig | jOrig       | id');
    for (const x of missingInCur.slice(0, 30)) {
      console.log(`${String(x.rOrig).padStart(5)} | ${String(x.jOrig ?? '').padStart(11)} | ${x.id}`);
    }
    if (missingInCur.length > 30) console.log(`... and ${missingInCur.length - 30} more`);
  }

  if (missingInOrig.length) {
    console.log('\n--- Rows in CURRENT not found in ORIGINAL (newly added) ---');
    console.log('rCur  | jCur        | id');
    for (const x of missingInOrig.slice(0, 30)) {
      console.log(`${String(x.rCur).padStart(5)} | ${String(x.jCur ?? '').padStart(11)} | ${x.id}`);
    }
    if (missingInOrig.length > 30) console.log(`... and ${missingInOrig.length - 30} more`);
  }

  if (valueDiffs.length) {
    console.log('\n--- Rows where J value differs ---');
    console.log('rCur  | rOrig | jOrig         | jCur          | diff (cur-orig) | id');
    for (const x of valueDiffs.slice(0, 50)) {
      const jo = x.jOrig == null ? 'null' : x.jOrig.toFixed(2);
      const jc = x.jCur == null ? 'null' : x.jCur.toFixed(2);
      console.log(
        `${String(x.rCur).padStart(5)} | ${String(x.rOrig).padStart(5)} | ${jo.padStart(13)} | ${jc.padStart(13)} | ${String(x.diff).padStart(15)} | ${x.id}`
      );
    }
    if (valueDiffs.length > 50) console.log(`... and ${valueDiffs.length - 50} more`);
  }

  console.log('\nDone.');
})().catch(e => { console.error(e); process.exit(1); });
