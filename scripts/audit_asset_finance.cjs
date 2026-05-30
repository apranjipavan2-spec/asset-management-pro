'use strict';
const XLSX = require('xlsx');
const path = require('path');

const FILE = path.resolve('Asset New data/Asset for Finance/Asset Finance.xlsx');
const wb = XLSX.readFile(FILE, { cellDates: true, cellFormula: true });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });

// Column indices
const C = {
  id: 0, cls: 1, rate: 2, acqDate: 3, refDate: 4,
  open: 5, add: 6, disp: 7, closingA: 8,
  accDepOpen: 9, depCost: 10, depTotal: 11, dispDep: 12, closingB: 13,
  netFY25: 14, netFY26: 15,
  disposalDate: 16, proceeds: 17, profitLoss: 18, donor: 19, status: 20
};

function num(v){ if(v==null||v==='') return 0; const n=parseFloat(v); return Number.isFinite(n)?n:0; }
function isBlank(v){ return v==null||v===''||(typeof v==='string'&&v.trim()===''); }

let dataRows=0, totalRows=0;
const issues = { closingA:[], depTotal:[], closingB:[], netFY25:[], netFY26:[],
                 blankClass:[], blankRate:[], blankAcq:[], badDateFormat:[],
                 noDonor:[], noStatus:[], duplicateIds:[], rateNotMatchingClass:[] };
const idMap = new Map();
const classRates = new Map();         // class → Set of rates
const classCount = new Map();
const dateFormats = new Set();
let sumOpen=0,sumAdd=0,sumDisp=0,sumCA=0,sumAccOpen=0,sumDepCost=0,sumDepTotal=0,sumDispDep=0,sumCB=0,sumN25=0,sumN26=0;

for (let i = 3; i < rows.length; i++) {     // headers are rows 1-3
  const r = rows[i] || [];
  const id = r[C.id];
  if (isBlank(id)) continue;
  if (String(id).trim().toLowerCase() === 'total' || String(id).trim().toLowerCase() === 'grand total') { totalRows++; continue; }
  dataRows++;
  const excelRow = i + 1;

  // Track duplicates
  const idKey = String(id).trim();
  if (idMap.has(idKey)) issues.duplicateIds.push(`row ${excelRow}: "${idKey}" duplicates row ${idMap.get(idKey)}`);
  else idMap.set(idKey, excelRow);

  // Class & rate
  const cls = isBlank(r[C.cls]) ? null : String(r[C.cls]).trim();
  if (!cls) issues.blankClass.push(`row ${excelRow} (${idKey})`);
  if (isBlank(r[C.rate])) issues.blankRate.push(`row ${excelRow} (${idKey})`);
  if (cls && !isBlank(r[C.rate])) {
    const rate = num(r[C.rate]);
    if (!classRates.has(cls)) classRates.set(cls, new Map());
    const m = classRates.get(cls);
    m.set(rate, (m.get(rate)||0)+1);
    classCount.set(cls, (classCount.get(cls)||0)+1);
  }

  // Acquisition date
  if (isBlank(r[C.acqDate])) issues.blankAcq.push(`row ${excelRow} (${idKey})`);
  else {
    const d = r[C.acqDate];
    if (d instanceof Date) dateFormats.add('Date object');
    else {
      const s = String(d);
      if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(s)) dateFormats.add('DD.MM.YY');
      else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(s)) dateFormats.add('DD.MM.YYYY');
      else if (/^[A-Za-z]{3}\s+[A-Za-z]{3}\s+\d/.test(s)) dateFormats.add('JS Date string ("Thu Aug 25 ...")');
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) dateFormats.add('DD/MM/YYYY');
      else if (/^\d{4}-\d{2}-\d{2}/.test(s)) dateFormats.add('ISO');
      else { dateFormats.add('OTHER: '+s.slice(0,30)); issues.badDateFormat.push(`row ${excelRow} (${idKey}): "${s.slice(0,40)}"`); }
    }
  }

  // Math checks
  const open=num(r[C.open]), add=num(r[C.add]), disp=num(r[C.disp]), ca=num(r[C.closingA]);
  const accOpen=num(r[C.accDepOpen]), depC=num(r[C.depCost]), depT=num(r[C.depTotal]), dispD=num(r[C.dispDep]), cb=num(r[C.closingB]);
  const n25=num(r[C.netFY25]), n26=num(r[C.netFY26]);

  sumOpen+=open; sumAdd+=add; sumDisp+=disp; sumCA+=ca;
  sumAccOpen+=accOpen; sumDepCost+=depC; sumDepTotal+=depT; sumDispDep+=dispD; sumCB+=cb;
  sumN25+=n25; sumN26+=n26;

  const expCA = open+add-disp;
  if (Math.abs(expCA-ca)>0.5) issues.closingA.push(`row ${excelRow} (${idKey}): CA=${ca} expected ${expCA.toFixed(2)} (open ${open}+add ${add}-disp ${disp})`);
  const expDT = accOpen+depC;
  if (Math.abs(expDT-depT)>0.5) issues.depTotal.push(`row ${excelRow} (${idKey}): DepTotal=${depT} expected ${expDT.toFixed(2)}`);
  const expCB = depT-dispD;
  if (Math.abs(expCB-cb)>0.5) issues.closingB.push(`row ${excelRow} (${idKey}): CB=${cb} expected ${expCB.toFixed(2)}`);
  const expN25 = open-accOpen;
  if (Math.abs(expN25-n25)>0.5) issues.netFY25.push(`row ${excelRow} (${idKey}): N25=${n25} expected ${expN25.toFixed(2)}`);
  const expN26 = ca-cb;
  if (Math.abs(expN26-n26)>0.5) issues.netFY26.push(`row ${excelRow} (${idKey}): N26=${n26} expected ${expN26.toFixed(2)}`);

  if (isBlank(r[C.donor])) issues.noDonor.push(`row ${excelRow} (${idKey})`);
  if (isBlank(r[C.status])) issues.noStatus.push(`row ${excelRow} (${idKey})`);
}

console.log('='.repeat(100));
console.log('AUDIT — Asset Finance.xlsx');
console.log('='.repeat(100));
console.log(`Data rows: ${dataRows}  Total/grand-total rows: ${totalRows}`);
console.log(`Unique Asset IDs: ${idMap.size}`);
console.log('');

console.log('--- Date formats in column D ---');
for (const f of dateFormats) console.log('  ', f);
console.log('');

console.log('--- Asset Class distribution ---');
for (const [cls, count] of [...classCount.entries()].sort((a,b)=>b[1]-a[1])) {
  console.log(`  ${count.toString().padStart(4)} : ${cls}`);
}
console.log('');

console.log('--- Depreciation rates per Asset Class ---');
for (const [cls, rateMap] of classRates) {
  const rates = [...rateMap.entries()].map(([r,n]) => `${r} (${n}x)`).join(', ');
  console.log(`  ${cls}: ${rates}`);
}
console.log('');

console.log('--- Totals (computed across data rows) ---');
console.log(`  Gross Open .......... ${sumOpen.toFixed(2)}`);
console.log(`  Additions ........... ${sumAdd.toFixed(2)}`);
console.log(`  Disposals (cost) .... ${sumDisp.toFixed(2)}`);
console.log(`  Closing A ........... ${sumCA.toFixed(2)}`);
console.log(`  Acc Dep Open ........ ${sumAccOpen.toFixed(2)}`);
console.log(`  Dep Cost ............ ${sumDepCost.toFixed(2)}`);
console.log(`  Dep Total ........... ${sumDepTotal.toFixed(2)}`);
console.log(`  Disposals (dep) ..... ${sumDispDep.toFixed(2)}`);
console.log(`  Closing B ........... ${sumCB.toFixed(2)}`);
console.log(`  Net FY 24-25 (A-B) .. ${sumN25.toFixed(2)}`);
console.log(`  Net FY 25-26 (A-B) .. ${sumN26.toFixed(2)}`);
console.log('');

function bucket(name, arr, sample=5) {
  console.log(`--- ${name}: ${arr.length} ---`);
  for (const x of arr.slice(0, sample)) console.log('  ', x);
  if (arr.length > sample) console.log(`  ... and ${arr.length-sample} more`);
  console.log('');
}

bucket('Duplicate Asset IDs', issues.duplicateIds, 10);
bucket('Closing A arithmetic mismatch', issues.closingA);
bucket('Dep Total arithmetic mismatch', issues.depTotal);
bucket('Closing B arithmetic mismatch', issues.closingB);
bucket('Net FY 24-25 arithmetic mismatch', issues.netFY25);
bucket('Net FY 25-26 arithmetic mismatch', issues.netFY26);
bucket('Blank Asset Class', issues.blankClass);
bucket('Blank Dep Rate', issues.blankRate);
bucket('Blank Acquisition Date', issues.blankAcq);
bucket('Non-standard date format', issues.badDateFormat, 8);
bucket('Blank Donor', issues.noDonor, 8);
bucket('Blank Status', issues.noStatus, 3);

// Check Title row column B (which is currently in merged area for title)
console.log('--- Header layout check ---');
console.log('  Row 1 (title row):', (rows[0]||[]).slice(0,21).filter(c=>c).join(' | '));
console.log('  Row 2 (group hdr):', (rows[1]||[]).slice(0,21).map(c=>c||'').join(' | '));
console.log('  Row 3 (col hdr):  ', (rows[2]||[]).slice(0,21).map(c=>c||'').join(' | '));
