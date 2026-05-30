// Normalize assets.fundingSource and the grants table.
// Rule (per user): strip ALL whitespace and uppercase. e.g.:
//   "Titan -skill"        -> "TITAN-SKILL"
//   "Titan Skill Tirupur" -> "TITANSKILLTIRUPUR"
//   "Own Fund"            -> "OWNFUND"
//
// Effects:
//   1. Updates every assets.fundingSource value in place.
//   2. Same normalization applied to grants.id and grants.name.
//   3. Grants that collapse to the same key are merged: the first row wins,
//      duplicates are deleted, and any assets referencing the deleted id are
//      repointed to the survivor.
//
// Safe to re-run. Transactional. Prints a before/after report.

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(process.cwd(), 'db.sqlite');
const DRY_RUN = process.argv.includes('--dry-run');

const normalize = (v) => {
    if (v == null) return v;
    const s = String(v).replace(/\s+/g, '').toUpperCase();
    return s;
};

const db = new Database(DB_PATH);
db.pragma('foreign_keys = OFF');

console.log(`DB: ${DB_PATH}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}\n`);

const beforeAssets = db.prepare(
    `SELECT fundingSource AS v, COUNT(*) AS n FROM assets GROUP BY fundingSource ORDER BY n DESC`
).all();
const beforeGrants = db.prepare(`SELECT id, name FROM grants ORDER BY name`).all();

console.log(`=== BEFORE: ${beforeAssets.length} distinct funding values across ${beforeAssets.reduce((s, r) => s + r.n, 0)} assets ===`);
console.log(`=== BEFORE: ${beforeGrants.length} grant rows ===\n`);

// Plan
const mapping = new Map(); // raw -> normalized
beforeAssets.forEach(r => mapping.set(r.v, normalize(r.v)));

const collapsed = new Map(); // normalized -> [raw values]
mapping.forEach((norm, raw) => {
    if (!collapsed.has(norm)) collapsed.set(norm, []);
    collapsed.get(norm).push(raw);
});

console.log('=== MERGES ===');
let mergeCount = 0;
collapsed.forEach((rawList, norm) => {
    if (rawList.length > 1) {
        mergeCount++;
        console.log(`  [${norm}]  <-  ${rawList.map(v => JSON.stringify(v)).join(', ')}`);
    }
});
if (mergeCount === 0) console.log('  (no funding-source values merge)');

if (DRY_RUN) {
    console.log('\nDry run — nothing written. Re-run without --dry-run to apply.');
    process.exit(0);
}

const tx = db.transaction(() => {
    // 1. Normalize assets.fundingSource
    const updateAsset = db.prepare(`UPDATE assets SET fundingSource = ? WHERE fundingSource = ?`);
    mapping.forEach((norm, raw) => {
        if (raw !== norm) updateAsset.run(norm, raw);
    });

    // 2. Normalize grants — done in three phases to avoid PK collisions:
    //    a. Group all rows by normalized id and pick a survivor per group
    //       (preferring any row already at the normalized form).
    //    b. Delete every non-survivor (also records old id → survivor id remap).
    //    c. Rename survivors whose current id != normalized form. Safe now
    //       because no other row in the table shares the target normalized id.
    const allGrants = db.prepare(`SELECT id, name FROM grants`).all();
    const groups = new Map(); // normId -> [{id, name}, ...]
    allGrants.forEach(g => {
        const k = normalize(g.id);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(g);
    });

    const idRemap = new Map(); // old id -> survivor id (post-rename)
    const renames = []; // { oldId, newId, newName }

    groups.forEach((rows, normId) => {
        const survivor = rows.find(r => r.id === normId) || rows[0];
        // Delete dupes
        rows.forEach(r => {
            if (r === survivor) return;
            db.prepare(`DELETE FROM grants WHERE id = ?`).run(r.id);
            idRemap.set(r.id, normId);
        });
        // Queue survivor rename
        if (survivor.id !== normId) {
            renames.push({ oldId: survivor.id, newId: normId, newName: normalize(survivor.name) });
            idRemap.set(survivor.id, normId);
        } else if (survivor.name !== normalize(survivor.name)) {
            // Same id, but name needs normalizing
            db.prepare(`UPDATE grants SET name = ? WHERE id = ?`).run(normalize(survivor.name), survivor.id);
        }
    });

    renames.forEach(({ oldId, newId, newName }) => {
        db.prepare(`UPDATE grants SET id = ?, name = ? WHERE id = ?`).run(newId, newName, oldId);
    });

    // Repoint any asset.fundingSource still pointing at a retired/renamed grant id
    idRemap.forEach((survivor, oldId) => {
        db.prepare(`UPDATE assets SET fundingSource = ? WHERE fundingSource = ?`).run(survivor, oldId);
    });
});

tx();

// Report after-state
const afterAssets = db.prepare(
    `SELECT fundingSource AS v, COUNT(*) AS n FROM assets GROUP BY fundingSource ORDER BY n DESC`
).all();
const afterGrants = db.prepare(`SELECT id, name FROM grants ORDER BY name`).all();

console.log(`\n=== AFTER ===`);
console.log(`Distinct funding values: ${beforeAssets.length} -> ${afterAssets.length}`);
console.log(`Grant rows: ${beforeGrants.length} -> ${afterGrants.length}\n`);

// Highlight any asset.fundingSource that still has no matching grant
const orphans = db.prepare(`
    SELECT a.fundingSource AS v, COUNT(*) AS n
    FROM assets a LEFT JOIN grants g ON g.id = a.fundingSource OR g.name = a.fundingSource
    WHERE g.id IS NULL
    GROUP BY a.fundingSource ORDER BY n DESC
`).all();

if (orphans.length) {
    console.log('=== ORPHAN funding values (not in grants table) ===');
    orphans.forEach(r => console.log(`  ${String(r.n).padStart(4)}  ${JSON.stringify(r.v)}`));
    console.log('(consider mapping these to canonical grants or adding rows to the grants table)');
} else {
    console.log('All asset.fundingSource values now resolve to a grant row.');
}

db.close();
