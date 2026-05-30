// Merge "Final All Assets Master Refined" with "Assets Assigned"
// Match key: Asset Code (assignment) ↔ Asset Identification Number (master)
// One AID can map to multiple Standardized IDs in master; assignments are
// distributed across those rows in order. Unmatched assignments are kept
// in a separate sheet so nothing is lost.

const path = require('path');
const XLSX = require('xlsx');

const MASTER  = 'C:/Kalike/Asset/Asset New data/Mapping Final/Final All Assets Master Refined.xlsx';
const ASSIGN  = 'C:/Kalike/Asset/Asset New data/Mapping Final/Assets Assigned.xlsx';
const OUT     = 'C:/Kalike/Asset/Asset New data/Mapping Final/Assets Merged - Master + Assigned.xlsx';

// Normalize an asset id string for fuzzy matching:
//   - uppercase
//   - fix common typo KALIEK → KALIKE
//   - collapse whitespace, trim around slashes
function norm(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .toUpperCase()
    .replace(/KALIEK/g, 'KALIKE')
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .trim();
}

const masterWB = XLSX.readFile(MASTER);
const assignWB = XLSX.readFile(ASSIGN);
const master = XLSX.utils.sheet_to_json(masterWB.Sheets[masterWB.SheetNames[0]], { defval: null });
const assign = XLSX.utils.sheet_to_json(assignWB.Sheets[assignWB.SheetNames[0]], { defval: null });

const masterCols = Object.keys(master[0] || {});
const assignCols = Object.keys(assign[0] || {});

// Group master row indices by normalized AID, AND by normalized Standardized ID
const aidGroups = new Map();
const stdMap = new Map();
master.forEach((r, i) => {
  const aid = norm(r['Asset Identification Number']);
  if (aid) {
    if (!aidGroups.has(aid)) aidGroups.set(aid, []);
    aidGroups.get(aid).push(i);
  }
  const std = norm(r['Standardized Asset ID']);
  if (std) stdMap.set(std, i);
});

// Per-master-row assignment storage: master index → array of matched assignment rows
const masterAssignments = new Array(master.length).fill(null).map(() => []);
const masterMatchType = new Array(master.length).fill(''); // 'AID' | 'STD' | ''
const unmatched = [];

// Track how many assignments have been consumed for each AID group
const aidConsumed = new Map();

for (const ar of assign) {
  const code = norm(ar['Asset Code']);
  if (!code) { unmatched.push({ row: ar, reason: 'Empty Asset Code' }); continue; }

  // First try AID group
  if (aidGroups.has(code)) {
    const group = aidGroups.get(code);
    const consumed = aidConsumed.get(code) || 0;
    if (consumed < group.length) {
      const mi = group[consumed];
      masterAssignments[mi].push(ar);
      masterMatchType[mi] = 'AID';
      aidConsumed.set(code, consumed + 1);
    } else {
      // More assignments than master rows for this AID — overflow goes to last row
      const mi = group[group.length - 1];
      masterAssignments[mi].push(ar);
      masterMatchType[mi] = 'AID (overflow)';
    }
    continue;
  }

  // Fallback: try Standardized Asset ID
  if (stdMap.has(code)) {
    const mi = stdMap.get(code);
    masterAssignments[mi].push(ar);
    masterMatchType[mi] = 'Standardized ID';
    continue;
  }

  unmatched.push({ row: ar, reason: 'No match in master (program/year missing)' });
}

// Build merged sheet rows
const newCols = [
  'Match Status',
  'Match Type',
  'Multiple Assignments?',
  'Assigned to',
  'Current Location (from Assignment)',
  'Status (from Assignment)',
  'Original Location (from Assignment)',
  'Location of asset (from Assignment)',
  'Asset Name (from Assignment)',
  'Asset Code (from Assignment)',
  'Assignment SL No',
];

const mergedRows = master.map((row, i) => {
  const out = {};
  for (const c of masterCols) out[c] = row[c];

  const assignments = masterAssignments[i];
  if (assignments.length === 0) {
    out['Match Status']                       = 'UNASSIGNED';
    out['Match Type']                         = '';
    out['Multiple Assignments?']              = '';
    out['Assigned to']                        = '';
    out['Current Location (from Assignment)'] = '';
    out['Status (from Assignment)']           = '';
    out['Original Location (from Assignment)']= '';
    out['Location of asset (from Assignment)']= '';
    out['Asset Name (from Assignment)']       = '';
    out['Asset Code (from Assignment)']       = '';
    out['Assignment SL No']                   = '';
  } else {
    const join = (k) => assignments.map(a => a[k] ?? '').join(' | ');
    out['Match Status']                       = 'ASSIGNED';
    out['Match Type']                         = masterMatchType[i];
    out['Multiple Assignments?']              = assignments.length > 1 ? `YES (${assignments.length})` : 'NO';
    out['Assigned to']                        = join('Assigned to');
    out['Current Location (from Assignment)'] = join('Location current');
    out['Status (from Assignment)']           = join('Status');
    out['Original Location (from Assignment)']= join('Location ');
    out['Location of asset (from Assignment)']= join('Location of asset');
    out['Asset Name (from Assignment)']       = join('Asset Name');
    out['Asset Code (from Assignment)']       = join('Asset Code');
    out['Assignment SL No']                   = join('SL No');
  }
  return out;
});

const mergedHeader = [...masterCols, ...newCols];

// Unmatched sheet
const unmatchedRows = unmatched.map(u => ({
  ...u.row,
  'Unmatched Reason': u.reason,
}));

// Summary sheet
const totalMaster = master.length;
const assignedMaster = mergedRows.filter(r => r['Match Status'] === 'ASSIGNED').length;
const unassignedMaster = totalMaster - assignedMaster;
const matchedAssignments = assign.length - unmatched.length;
const summary = [
  { Metric: 'Master rows (Final All Assets Master Refined)',        Value: totalMaster },
  { Metric: 'Assignment rows (Assets Assigned)',                    Value: assign.length },
  { Metric: 'Master rows with at least one assignment matched',     Value: assignedMaster },
  { Metric: 'Master rows still unassigned',                         Value: unassignedMaster },
  { Metric: 'Assignment rows successfully matched to master',       Value: matchedAssignments },
  { Metric: 'Assignment rows that could NOT be matched',            Value: unmatched.length },
  { Metric: '  → Match by Asset Identification Number',             Value: mergedRows.filter(r => String(r['Match Type']).startsWith('AID')).length },
  { Metric: '  → Match by Standardized Asset ID',                   Value: mergedRows.filter(r => r['Match Type'] === 'Standardized ID').length },
];

// Write workbook
const wb = XLSX.utils.book_new();

const wsMerged = XLSX.utils.json_to_sheet(mergedRows, { header: mergedHeader });
XLSX.utils.book_append_sheet(wb, wsMerged, 'Merged');

const wsUnmatched = XLSX.utils.json_to_sheet(unmatchedRows);
XLSX.utils.book_append_sheet(wb, wsUnmatched, 'Unmatched Assignments');

const wsSummary = XLSX.utils.json_to_sheet(summary);
XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

XLSX.writeFile(wb, OUT);

console.log('Wrote:', OUT);
console.log('');
summary.forEach(s => console.log(' ', s.Metric, '=', s.Value));
console.log('');
console.log('First 10 unmatched assignment codes:');
unmatched.slice(0, 10).forEach(u => console.log('  -', u.row['Asset Code'], '→', u.reason));
