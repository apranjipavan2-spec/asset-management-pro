/**
 * For every row tagged "High" in AA or AB, work out WHY:
 *   - is the date suspicious vs the asset ID year?
 *   - is the rate odd for the asset class?
 *   - is the diff a tiny rounding (1-50 rs) or a real number?
 *   - does the gap match a known convention difference (first-year
 *     half-year vs full year)?
 *
 * Report grouped by hypothesis, so we can decide row-by-row whether
 * the stored value or our calc is the mistake.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const EPOCH = 25569, MS = 86400000;

function num(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime() / MS + EPOCH;
  if (typeof v === 'object' && 'result' in v) {
    const r = v.result;
    if (r == null || r === '') return 0;
    if (r instanceof Date) return r.getTime() / MS + EPOCH;
    if (r && typeof r === 'object' && 'error' in r) return 0;
    return Number(r) || 0;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function eDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(Math.round((v - EPOCH) * MS));
  return null;
}

// Detect the FY embedded in the asset ID — patterns like "2018-19" or "/18-19" or "/2018-19/"
function idFY(id) {
  // look for YYYY-YY pattern
  const m1 = id.match(/(20\d{2})[-\/\\](\d{2})/);
  if (m1) return parseInt(m1[1], 10);
  // look for /YY-YY/
  const m2 = id.match(/\/(\d{2})[-\/\\](\d{2})\b/);
  if (m2) {
    const yy = parseInt(m2[1], 10);
    return 2000 + yy;
  }
  return null;
}

function recomputeAccDep(F, C, d) {
  const mo = d.getUTCMonth() + 1, y = d.getUTCFullYear();
  const fy = mo >= 4 ? y : y - 1;
  if (fy >= 2025) return 0;
  const yearsTotal = 2024 - fy + 1;
  const fyf = (mo >= 4 && mo <= 9) ? 1 : 0.5;
  return F * (1 - (1 - C * fyf) * Math.pow(1 - C, yearsTotal - 1));
}
// Alternate convention: treat first year always as half (some auditors do this)
function recomputeHalfFirstYear(F, C, d) {
  const mo = d.getUTCMonth() + 1, y = d.getUTCFullYear();
  const fy = mo >= 4 ? y : y - 1;
  if (fy >= 2025) return 0;
  const yearsTotal = 2024 - fy + 1;
  return F * (1 - 0.5 * Math.pow(1 - C, yearsTotal - 1) * (1 / (1 - C) * (1 - C)));
  // = F * (1 - 0.5*(1-C)^(yearsTotal-1))   simpler
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx'));
  const ws = wb.worksheets[0];

  const groups = {
    dateVsIdMismatch: [],     // ID says one FY, date says another
    halfYearConvention: [],   // gap explained by Aug/Sep being treated as half
    fullDepreciated: [],      // asset over 95% depreciated — stored may have capped at residual
    tinyRounding: [],         // diff < 50
    largeUnexplained: [],     // big gap with no obvious cause
    storedZero: [],           // J=0 but our calc says non-zero
    ourZero: [],              // we say 0 but stored has value
  };

  let totalHigh = 0;
  for (let r = 4; r <= 379; r++) {
    const row = ws.getRow(r);
    if (!row.getCell(1).value) continue;

    const aa = row.getCell(27).value;
    const ab = row.getCell(28).value;
    const aaResult = aa && typeof aa === 'object' ? aa.result : aa;
    const abResult = ab && typeof ab === 'object' ? ab.result : ab;
    if (aaResult !== 'High' && abResult !== 'High') continue;
    totalHigh++;

    const id = String(row.getCell(1).value || '').trim();
    const C = num(row.getCell(3).value);
    const eVal = row.getCell(5).value;
    const d = eDate(eVal);
    const F = num(row.getCell(6).value);
    const J = num(row.getCell(10).value);
    const O = num(row.getCell(15).value);
    const V = num(row.getCell(22).value);
    const W = num(row.getCell(23).value);
    const diffJV = J - V;     // Y value
    const diffWO = W - O;     // Z value
    const dateStr = d ? d.toISOString().slice(0, 10) : 'Unknown';

    // Categorize
    const idYear = idFY(id);
    const dYear = d ? (d.getUTCMonth() + 1 >= 4 ? d.getUTCFullYear() : d.getUTCFullYear() - 1) : null;

    const baseInfo = { r, id: id.slice(0, 40), dateStr, idYear, dYear, F, C, J, V, O, W, diffJV: +diffJV.toFixed(2), diffWO: +diffWO.toFixed(2) };

    if (J === 0 && V > 5) { groups.storedZero.push(baseInfo); continue; }
    if (V === 0 && J > 5) { groups.ourZero.push(baseInfo); continue; }

    if (idYear && dYear && Math.abs(idYear - dYear) >= 2) {
      groups.dateVsIdMismatch.push({ ...baseInfo, gap: idYear - dYear });
      continue;
    }

    // Test: would the stored value match if we treated first year always as half-year (regardless of month)?
    if (d && F > 0 && C > 0) {
      const altV = recomputeHalfFirstYear(F, C, d);
      const altDiff = Math.abs(J - altV);
      const ourDiff = Math.abs(J - V);
      if (altDiff < ourDiff && altDiff < 10) {
        groups.halfYearConvention.push({ ...baseInfo, altV: +altV.toFixed(2), altDiff: +altDiff.toFixed(2) });
        continue;
      }
    }

    // Almost-fully-depreciated assets often get capped at residual (e.g., 5%)
    if (V > 0.93 * F) {
      groups.fullDepreciated.push({ ...baseInfo, vPct: +(V / F * 100).toFixed(1) });
      continue;
    }

    if (Math.abs(diffJV) < 50 && Math.abs(diffWO) < 50) {
      groups.tinyRounding.push(baseInfo);
      continue;
    }

    groups.largeUnexplained.push(baseInfo);
  }

  function dump(label, arr, fields) {
    if (!arr.length) return;
    console.log('\n' + '='.repeat(90));
    console.log(`${label}  (${arr.length} rows)`);
    console.log('='.repeat(90));
    console.log(fields.join(' | '));
    console.log('-'.repeat(90));
    for (const x of arr.slice(0, 25)) {
      console.log(fields.map(f => {
        const v = x[f];
        if (typeof v === 'number') return v.toFixed(2).padStart(10);
        return String(v == null ? '' : v).padEnd(f === 'id' ? 40 : 10);
      }).join(' | '));
    }
    if (arr.length > 25) console.log(`... and ${arr.length - 25} more`);
  }

  console.log(`\nTotal rows tagged High in AA or AB: ${totalHigh}`);

  dump('A) DATE vs ID YEAR MISMATCH — date in column E disagrees with the FY in the asset ID by ≥2 years. The DATE is almost certainly wrong; updating E should make our calc agree with the stored value.',
       groups.dateVsIdMismatch,
       ['r', 'id', 'dateStr', 'idYear', 'dYear', 'gap', 'J', 'V', 'diffJV']);

  dump('B) HALF-YEAR CONVENTION on first year — stored value matches if first year is treated as half regardless of purchase month. Auditors sometimes use this simplified rule. Stored is consistent with that rule; our calc uses Indian IT half-year rule (Apr-Sep full / Oct-Mar half).',
       groups.halfYearConvention,
       ['r', 'id', 'dateStr', 'F', 'C', 'J', 'V', 'altV', 'altDiff']);

  dump('C) ASSET FULLY/NEARLY DEPRECIATED (V > 93% of F) — stored value may have been capped at a residual value (5% or 1 rupee) per accounting policy. Our calc reflects pure formula.',
       groups.fullDepreciated,
       ['r', 'id', 'dateStr', 'F', 'V', 'vPct', 'J', 'diffJV']);

  dump('D) STORED VALUE = 0 but our calc shows depreciation — either a missed entry in the original register or asset shouldnt depreciate (status=disposed/reclassified).',
       groups.storedZero,
       ['r', 'id', 'dateStr', 'F', 'C', 'J', 'V', 'diffJV']);

  dump('E) OUR CALC = 0 but stored has a value — usually means we read 0 cost/rate but stored register knew the value.',
       groups.ourZero,
       ['r', 'id', 'dateStr', 'F', 'C', 'J', 'V', 'diffJV']);

  dump('F) TINY ROUNDING (both diffs < ₹50) — likely just floating point drift between our closed-form formula and the year-by-year rounding the original register used.',
       groups.tinyRounding,
       ['r', 'id', 'dateStr', 'J', 'V', 'diffJV', 'O', 'W', 'diffWO']);

  dump('G) LARGE UNEXPLAINED — needs eyeball review.',
       groups.largeUnexplained,
       ['r', 'id', 'dateStr', 'F', 'C', 'J', 'V', 'diffJV', 'O', 'W', 'diffWO']);

  console.log('\nBucket summary:');
  for (const [k, v] of Object.entries(groups)) console.log(`  ${k.padEnd(25)} ${v.length}`);
})().catch(e => { console.error(e); process.exit(1); });
