const Database = require('better-sqlite3');
const db = new Database('./db.sqlite', { readonly: true });

const total  = db.prepare('SELECT COUNT(*) AS n FROM assets').get().n;
const linked = db.prepare("SELECT COUNT(*) AS n FROM assets WHERE parentAssetId IS NOT NULL AND parentAssetId != ''").get().n;
const valid  = db.prepare('SELECT COUNT(*) AS n FROM assets a WHERE EXISTS (SELECT 1 FROM asset_far f WHERE f.assetId = a.parentAssetId)').get().n;
const rows   = db.prepare("SELECT COALESCE(NULLIF(parentMatchType,''), '(blank)') AS t, COUNT(*) AS n FROM assets GROUP BY parentMatchType ORDER BY n DESC").all();

console.log('Total individual assets         :', total);
console.log('Has parentAssetId               :', linked);
console.log('Parent ID exists in asset_far   :', valid);
console.log('');
console.log('Match-type breakdown:');
for (const r of rows) {
  const pct = (100 * r.n / total).toFixed(1).padStart(5);
  console.log('  ' + String(r.t).padEnd(15) + ' ' + String(r.n).padStart(5) + '   ' + pct + ' %');
}

const farTotal = db.prepare('SELECT COUNT(*) AS n FROM asset_far').get().n;
const farWithKids = db.prepare("SELECT COUNT(DISTINCT a.parentAssetId) AS n FROM assets a JOIN asset_far f ON f.assetId = a.parentAssetId").get().n;
console.log('');
console.log('Finance side (asset_far):');
console.log('  Total parent rows             :', farTotal);
console.log('  Parents with >=1 child unit   :', farWithKids);
console.log('  Parents with NO child unit    :', farTotal - farWithKids);
