/**
 * For each 2025-26 acquisition where K/L/N/P were filled in (vs blank
 * in original), verify K = F*rate*ff where ff follows the Indian
 * half-year rule:
 *   purchased Apr-Sep 2025  → ff = 1.0 (full year)
 *   purchased Oct 2025 - Mar 2026 → ff = 0.5 (half year)
 *   anything outside FY 25-26 → flag as suspicious
 *
 * Also check the internal consistency: L = K + opening (K, since no
 * prior dep on new assets), N = L (no mid-year disposal), P = I - N.
 */
'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.with_calc.xlsx');
const EPOCH = 25569, MS = 86400000;

const TARGET_ROWS = [357, 356, 358, 359, 363, 364, 365, 366, 367, 371, 372, 374, 376, 360, 361, 362, 369, 379, 355, 368, 370, 373, 377, 378, 375];

function rawValue(v) {
  if (v == null) return v;
  if (typeof v === 'object') {
    if (v instanceof Date) return v;
    if ('result' in v) return v.result;
  }
  return v;
}
function num(v) {
  v = rawValue(v);
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime() / MS + EPOCH;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function eDate(v) {
  v = rawValue(v);
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(Math.round((v - EPOCH) * MS));
  return null;
}

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.worksheets[0];

  const issues = [];
  const ok = [];

  for (const r of TARGET_ROWS.sort((a, b) => a - b)) {
    const row = ws.getRow(r);
    const id = String(rawValue(row.getCell(1).value) || '').trim();
    const C = num(row.getCell(3).value);    // rate
    const d = eDate(row.getCell(5).value);  // date
    const F = num(row.getCell(6).value);    // gross block
    const G = num(row.getCell(7).value) || 0;
    const I = num(row.getCell(9).value);    // closing A
    const J = num(row.getCell(10).value) || 0;
    const K = num(row.getCell(11).value);   // dep cost (current year)
    const L = num(row.getCell(12).value);   // dep total
    const M = num(row.getCell(13).value) || 0;
    const N = num(row.getCell(14).value);   // closing B
    const P = num(row.getCell(16).value);   // net block #2

    const mo = d ? d.getUTCMonth() + 1 : null;
    const yr = d ? d.getUTCFullYear() : null;
    let ff = 1.0;
    let fyLabel = '';
    if (d) {
      if ((yr === 2025 && mo >= 4) || (yr === 2026 && mo <= 3)) {
        // in FY 25-26
        if (yr === 2025 && mo >= 4 && mo <= 9) { ff = 1.0; fyLabel = 'Apr-Sep25 (full)'; }
        else if ((yr === 2025 && mo >= 10) || (yr === 2026 && mo <= 3)) { ff = 0.5; fyLabel = 'Oct25-Mar26 (half)'; }
      } else {
        fyLabel = `OUTSIDE FY25-26 (date=${d.toISOString().slice(0,10)})`;
      }
    } else {
      fyLabel = 'NO DATE';
    }

    // Expected K depending on which gross we depreciate
    // For newly added assets the entire F is "additions" effectively;
    // but the register has both F (opening gross) and G (additions).
    // For a brand new 25-26 asset, F was likely set to the cost (treated as opening for current year accounting).
    // Expected K = F * C * ff (or (F+G) * C * ff if both filled)
    const expK_F  = F == null || C == null ? null : F * C * ff;
    const expK_FG = (F == null && G == null) || C == null ? null : ((F || 0) + (G || 0)) * C * ff;
    const tol = 1.0;  // 1 rupee tolerance

    let kStatus = 'unknown';
    if (K == null) kStatus = 'K is empty';
    else if (expK_F  != null && Math.abs(K - expK_F)  < tol) kStatus = `K=F*C*${ff}  ✓`;
    else if (expK_FG != null && Math.abs(K - expK_FG) < tol) kStatus = `K=(F+G)*C*${ff}  ✓`;
    else kStatus = `K=${K?.toFixed(2)}  expected F*C*${ff}=${expK_F?.toFixed(2)}  diff=${(K-expK_F).toFixed(2)}`;

    // Internal consistency: L should be J + K (since no disposals), N=L-M, P=I-N
    const expL = (J || 0) + (K || 0);
    const expN = expL - (M || 0);
    const expP = (I || 0) - (N || 0);
    const lOk = L != null && Math.abs(L - expL) < tol;
    const nOk = N != null && Math.abs(N - expN) < tol;
    const pOk = P != null && Math.abs(P - expP) < tol;

    const rec = {
      r, id: id.slice(0, 40), date: d ? d.toISOString().slice(0, 10) : '—', fyLabel,
      F, C, K, L, N, P, kStatus, lOk, nOk, pOk
    };
    if (kStatus.includes('✓') && lOk && nOk && pOk && !fyLabel.startsWith('OUTSIDE') && fyLabel !== 'NO DATE') {
      ok.push(rec);
    } else {
      issues.push(rec);
    }
  }

  console.log(`\nChecked ${TARGET_ROWS.length} rows. Clean: ${ok.length}, Need review: ${issues.length}\n`);

  if (ok.length) {
    console.log('='.repeat(110));
    console.log('CLEAN — K = F * C * ff (correct half-year applied), L/N/P internally consistent');
    console.log('='.repeat(110));
    console.log('row | date       | fy window          | F        | C    | K        | id');
    for (const x of ok) {
      console.log(
        `${String(x.r).padStart(3)} | ${x.date} | ${x.fyLabel.padEnd(18)} | ${String(x.F).padStart(8)} | ${String(x.C).padStart(4)} | ${String(x.K).padStart(8)} | ${x.id}`
      );
    }
  }

  if (issues.length) {
    console.log('\n' + '='.repeat(110));
    console.log('NEED REVIEW');
    console.log('='.repeat(110));
    for (const x of issues) {
      console.log(`\nrow ${x.r}  ${x.id}`);
      console.log(`   date=${x.date}  window=${x.fyLabel}`);
      console.log(`   F=${x.F}  C=${x.C}  K=${x.K}  L=${x.L}  N=${x.N}  P=${x.P}`);
      console.log(`   ${x.kStatus}`);
      console.log(`   L consistent: ${x.lOk}  N consistent: ${x.nOk}  P consistent: ${x.pOk}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
