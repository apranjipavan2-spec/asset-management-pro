// Normalize assets.location to a canonical list, per user-approved map.
// Multi-location values like "Yadgir/Koppal/kustagi" are split by '/', each
// part canonicalized, then rejoined with ' / ' (with duplicates removed).
//
// Values that look like programs/grants (ECE, RELI, ICICI) are mapped to
// 'Unassigned' and the affected asset IDs are written to
// scripts/out_location_reclassify.csv so they can be re-categorized later.
//
// Empty/null location -> 'Unassigned'.
// Safe to re-run. Transactional.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(process.cwd(), 'db.sqlite');
const OUT_CSV = path.resolve(process.cwd(), 'scripts/out_location_reclassify.csv');
const DRY_RUN = process.argv.includes('--dry-run');

// Token map: normalized lowercase token -> canonical name.
const TOKENS = {
    'bangalore': 'Bangalore Office',
    'blore': 'Bangalore Office',
    'blore office': 'Bangalore Office',
    'bangalore office': 'Bangalore Office',
    'yadgir': 'Yadgir Office',
    'yadgir office': 'Yadgir Office',
    'yadgir gust house': 'Yadgir Guest House',
    'yadgir guest house': 'Yadgir Guest House',
    'koppal': 'Koppal Office',
    'koppal office': 'Koppal Office',
    'konkal': 'Konkal Office',
    'konkal office': 'Konkal Office',
    'kustagi': 'Kustagi Office',
    'kustagi office': 'Kustagi Office',
    'tirupur': 'Tirupur Office',
    'tirupur office': 'Tirupur Office',
    'tiruvannamalai': 'Tiruvannamalai Office',
    'thiruvannamalai': 'Tiruvannamalai Office',
    'tiruvannamalai office': 'Tiruvannamalai Office',
    'neyveli': 'Neyveli Office',
    'neyeli': 'Neyveli Office',
    'neyveli office': 'Neyveli Office',
    'neyeli office': 'Neyveli Office',
    'wadagere': 'Wadagere Office',
    'wadegere': 'Wadagere Office',
    'wadagere office': 'Wadagere Office',
    'it team': 'IT Team',
    'crs': 'CRS Office',
    'crs office': 'CRS Office',
    'skill center': 'Skill Center',
    'skill centre': 'Skill Center',
    'vic': 'VIC Center',
    'vic center': 'VIC Center',
    'vic centre': 'VIC Center',
    'parag': 'Parag Team',
    'parag team': 'Parag Team',
    'kanchagrahalli': 'Kanchagrahalli',
    'lambani and peper pencil': 'Lambani / Paper Pencil',
    'lambani and paper pencil': 'Lambani / Paper Pencil'
};

// Values that aren't real locations — map to Unassigned and log asset IDs.
const RECLASSIFY = new Set(['ece', 'reli', 'icici']);

const normToken = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

const canonicalize = (raw) => {
    if (raw == null || String(raw).trim() === '') return { canonical: 'Unassigned', reclassify: false };

    // Multi-location split
    const parts = String(raw).split('/').map(p => p.trim()).filter(Boolean);

    const canonicals = [];
    let reclassify = false;
    let unmapped = [];

    for (const part of parts) {
        const key = normToken(part);
        if (RECLASSIFY.has(key)) {
            reclassify = true;
            continue;
        }
        if (TOKENS[key]) {
            canonicals.push(TOKENS[key]);
        } else {
            unmapped.push(part);
        }
    }

    // Dedupe preserving order
    const seen = new Set();
    const ordered = canonicals.filter(c => !seen.has(c) && seen.add(c));

    // If we have no canonical match and only unmapped values, preserve the
    // original (best-effort title-cased) so we don't silently destroy data.
    if (ordered.length === 0 && unmapped.length === 0) {
        return { canonical: 'Unassigned', reclassify };
    }
    if (ordered.length === 0) {
        return { canonical: unmapped.join(' / '), reclassify, unmapped: true };
    }

    return {
        canonical: [...ordered, ...unmapped].join(' / '),
        reclassify,
        unmapped: unmapped.length > 0
    };
};

const db = new Database(DB_PATH);

console.log(`DB: ${DB_PATH}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}\n`);

const before = db.prepare(
    `SELECT location AS v, COUNT(*) AS n FROM assets GROUP BY location ORDER BY n DESC`
).all();

console.log(`=== BEFORE: ${before.length} distinct locations across ${before.reduce((s, r) => s + r.n, 0)} assets ===\n`);

// Build the per-value mapping (so we can preview)
const mapping = before.map(r => ({ raw: r.v, n: r.n, ...canonicalize(r.v) }));

console.log('=== MAPPING PREVIEW ===');
mapping.forEach(m => {
    const flag = m.reclassify ? ' [RECLASSIFY]' : (m.unmapped ? ' [UNMAPPED]' : '');
    console.log(`  ${String(m.n).padStart(4)}  ${JSON.stringify(m.raw)}  ->  ${JSON.stringify(m.canonical)}${flag}`);
});

// Collect asset IDs that need reclassification (had ECE/RELI/ICICI etc.)
const reclassifyValues = mapping.filter(m => m.reclassify).map(m => m.raw);
let reclassifyAssets = [];
if (reclassifyValues.length) {
    const placeholders = reclassifyValues.map(() => '?').join(',');
    reclassifyAssets = db.prepare(
        `SELECT id, name, category, location, assignedTo FROM assets WHERE location IN (${placeholders})`
    ).all(...reclassifyValues);
}

if (DRY_RUN) {
    console.log('\nDry run — nothing written. Re-run without --dry-run to apply.');
    if (reclassifyAssets.length) {
        console.log(`\n(${reclassifyAssets.length} assets would be flagged for reclassification.)`);
    }
    process.exit(0);
}

const tx = db.transaction(() => {
    const upd = db.prepare(`UPDATE assets SET location = ? WHERE location = ? OR (location IS NULL AND ? = '')`);
    const updNull = db.prepare(`UPDATE assets SET location = ? WHERE location IS NULL OR location = ''`);

    mapping.forEach(m => {
        if (m.raw == null || m.raw === '') {
            updNull.run(m.canonical);
        } else {
            db.prepare(`UPDATE assets SET location = ? WHERE location = ?`).run(m.canonical, m.raw);
        }
    });
});

tx();

// Write reclassify CSV
if (reclassifyAssets.length) {
    const csv = ['id,name,category,original_location,assignedTo']
        .concat(reclassifyAssets.map(a =>
            [a.id, a.name, a.category, a.location, a.assignedTo]
                .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
        )).join('\n');
    fs.writeFileSync(OUT_CSV, csv);
    console.log(`\nWrote ${reclassifyAssets.length} asset rows to ${OUT_CSV} for manual reclassification.`);
}

const after = db.prepare(
    `SELECT location AS v, COUNT(*) AS n FROM assets GROUP BY location ORDER BY n DESC`
).all();

console.log(`\n=== AFTER: ${after.length} distinct locations ===`);
after.forEach(r => console.log(`  ${String(r.n).padStart(4)}  ${JSON.stringify(r.v)}`));

db.close();
