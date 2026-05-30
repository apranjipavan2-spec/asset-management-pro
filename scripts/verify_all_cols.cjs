/**
 * Full comparison of every original column (A..T) between the current
 * working file and the original file. Matches rows by composite key
 * (asset id + F-value) so the one known duplicate ID is handled correctly.
 *
 * Reports, per column:
 *   - count of matches
 *   - count of differences
 *   - sample of diffs (up to 20)
 *
 * Also reports rows present in one file but not the other.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const CURRENT  = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');
const ORIGINAL = path.resolve('Asset New data/Asset for Finance/Asset Finance.original.xlsx');

const COLS = [
  { c: 1,  h: 'A — Asset ID',                  kind: 'text' },
  { c: 2,  h: 'B — Asset Class',               kind: 'text' },
  { c: 3,  h: 'C — Depreciation Rate',         kind: 'num'  },
  { c: 4,  h: 'D — Acquisition Date',          kind: 'text' },
  { c: 5,  h: 'E — Refined Acquis Date',       kind: 'text' },
  { c: 6,  h: 'F — Gross Block Opening',       kind: 'num'  },
  { c: 7,  h: 'G — Additions',                 kind: 'num'  },
  { c: 8,  h: 'H — Disposals',                 kind: 'num'  },
  { c: 9,  h: 'I — Closing Balance A',         kind: 'num'  },
  { c: 10, h: 'J — Acc Dep Opening',           kind: 'num'  },
  { c: 11, h: 'K — Depreciation Cost',         kind: 'num'  },
  { c: 12, h: 'L — Depreciation Total',        kind: 'num'  },
  { c: 13, h: 'M — Disposals',                 kind: 'num'  },
  { c: 14, h: 'N — Closing Balance B',         kind: 'num'  },
  { c: 15, h: 'O — Net Block (A-B) #1',        kind: 'num'  },
  { c: 16, h: 'P — Net Block (A-B) #2',        kind: 'num'  },
  { c: 17, h: 'Q — Disposal Date',             kind: 'text' },
  { c: 18, h: 'R — Proceeds on Disposal',      kind: 'num'  },
  { c: 19, h: 'S — Profit/(Loss) on Disposal', kind: 'num'  },
  { c: 20, h: 'T — Donor Name',                kind: 'text' },
];

function rawValue(v) {
  if (v == null) return v;
  if (typeof v === 'object') {
    if (v instanceof Date) return v;
    if ('result' in v) return v.result;
    if ('richText' in v) return v.richText.map(t => t.text).join('');
    if ('text' in v) return v.text;
  }
  return v;
}

function toNumber(v) {
  v = rawValue(v);
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime() / 86400000 + 25569;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toText(v) {
  v = rawValue(v);
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

async function loadRows(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const rows = [];
  const last = (ws.actualRowCount || ws.rowCount) + 5;
  for (let r = 4; r <= last; r++) {  // data starts row 4
    const row = ws.getRow(r);
    const id = toText(row.getCell(1).value);
    if (!id) continue;
    const F = toNumber(row.getCell(6).value);
    rows.push({ r, id, F, row });
  }
  return rows;
}

function makeKey(id, F) {
  return `${id}|F=${F == null ? '∅' : F.toFixed(2)}`;
}

(async () => {
  const curRows = await loadRows(CURRENT);
  const origRows = await loadRows(ORIGINAL);

  console.log(`CURRENT  data rows: ${curRows.length}`);
  console.log(`ORIGINAL data rows: ${origRows.length}`);

  // Match by (id, F). Track used current rows so duplicates pair correctly.
  const curByKey = new Map();
  for (const cr of curRows) {
    const k = makeKey(cr.id, cr.F);
    if (!curByKey.has(k)) curByKey.set(k, []);
    curByKey.get(k).push(cr);
  }

  const pairs = [];
  const missingInCur = [];
  const usedCurKeys = new Set();

  for (const or of origRows) {
    const k = makeKey(or.id, or.F);
    const candidates = curByKey.get(k);
    if (!candidates || !candidates.length) {
      missingInCur.push(or);
      continue;
    }
    const cr = candidates.shift();  // pop one
    pairs.push({ or, cr });
    usedCurKeys.add(cr.r);
  }

  const missingInOrig = curRows.filter(cr => !usedCurKeys.has(cr.r));

  console.log(`\nMatched pairs:                  ${pairs.length}`);
  console.log(`In ORIGINAL but missing CURRENT: ${missingInCur.length}`);
  console.log(`In CURRENT but missing ORIGINAL: ${missingInOrig.length}`);

  if (missingInCur.length) {
    console.log('\n--- In ORIGINAL but not CURRENT (by id+F key) ---');
    for (const x of missingInCur) console.log(`  rOrig=${x.r}  F=${x.F}  ${x.id}`);
  }
  if (missingInOrig.length) {
    console.log('\n--- In CURRENT but not ORIGINAL (by id+F key) ---');
    for (const x of missingInOrig) console.log(`  rCur=${x.r}  F=${x.F}  ${x.id}`);
  }

  // Per-column diff
  const colDiffs = {};
  for (const col of COLS) colDiffs[col.c] = { col, diffs: [] };

  for (const { or, cr } of pairs) {
    for (const col of COLS) {
      const ov = or.row.getCell(col.c).value;
      const cv = cr.row.getCell(col.c).value;
      let differs = false;
      let orStr, cuStr;
      if (col.kind === 'num') {
        const on = toNumber(ov);
        const cn = toNumber(cv);
        const oneNull = (on == null) !== (cn == null);
        if (oneNull) differs = true;
        else if (on != null && Math.abs(on - cn) > 0.005) differs = true;
        orStr = on == null ? '' : on.toFixed(2);
        cuStr = cn == null ? '' : cn.toFixed(2);
      } else {
        const ot = toText(ov);
        const ct = toText(cv);
        if (ot !== ct) differs = true;
        orStr = ot;
        cuStr = ct;
      }
      if (differs) {
        colDiffs[col.c].diffs.push({ id: or.id, rOrig: or.r, rCur: cr.r, orig: orStr, cur: cuStr });
      }
    }
  }

  console.log('\n' + '='.repeat(95));
  console.log('PER-COLUMN SUMMARY');
  console.log('='.repeat(95));
  console.log('Column                                 |  Matches  |  Diffs');
  console.log('-'.repeat(95));
  for (const col of COLS) {
    const d = colDiffs[col.c].diffs.length;
    const m = pairs.length - d;
    console.log(`${col.h.padEnd(40)} |  ${String(m).padStart(7)} |  ${String(d).padStart(5)}`);
  }

  for (const col of COLS) {
    const d = colDiffs[col.c].diffs;
    if (!d.length) continue;
    console.log('\n' + '='.repeat(95));
    console.log(`DIFFS for ${col.h}  (${d.length} rows)`);
    console.log('='.repeat(95));
    console.log('rOrig | rCur | original                  | current                   | id');
    console.log('-'.repeat(95));
    for (const x of d.slice(0, 30)) {
      console.log(
        `${String(x.rOrig).padStart(5)} | ${String(x.rCur).padStart(4)} | ${String(x.orig).slice(0, 25).padEnd(25)} | ${String(x.cur).slice(0, 25).padEnd(25)} | ${x.id.slice(0, 40)}`
      );
    }
    if (d.length > 30) console.log(`... and ${d.length - 30} more`);
  }

  console.log('\nDone.');
})().catch(e => { console.error(e); process.exit(1); });
