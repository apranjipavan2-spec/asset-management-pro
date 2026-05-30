const Database = require('better-sqlite3');
const db = new Database('./db.sqlite', { readonly: true });
const q  = (s,p=[]) => db.prepare(s).all(...p);
const qv = (s,p=[]) => db.prepare(s).get(...p);

const out = {};
out.distinctAssignedTo = q(`SELECT assignedTo, COUNT(*) AS cnt FROM assets GROUP BY assignedTo ORDER BY cnt DESC LIMIT 15`);
out.distinctAssignedToId = q(`SELECT assignedToId, COUNT(*) AS cnt FROM assets GROUP BY assignedToId ORDER BY cnt DESC LIMIT 15`);
out.assetsWithRealCustodian = qv(`
  SELECT COUNT(*) AS n FROM assets
  WHERE assignedToId IS NOT NULL AND TRIM(assignedToId) NOT IN ('','N/A','-','None','Unassigned')
`).n;
out.distinctFundingSource = q(`SELECT fundingSource, COUNT(*) AS cnt FROM assets GROUP BY fundingSource ORDER BY cnt DESC LIMIT 15`);
out.locationCaseDupes = q(`
  SELECT LOWER(TRIM(location)) AS norm, COUNT(DISTINCT location) AS variants,
         GROUP_CONCAT(DISTINCT location) AS forms
  FROM assets WHERE location IS NOT NULL
  GROUP BY norm HAVING variants > 1
`);
// any user row that looks like an "Unassigned" placeholder?
out.usersIdsSample = q(`SELECT id, empId, name FROM users LIMIT 5`);
console.log(JSON.stringify(out, null, 2));
