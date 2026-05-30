/**
 * Upsert assets and grants from JSON fixtures into the live SQLite database.
 *
 * Safe to run repeatedly — uses INSERT OR REPLACE so existing rows are
 * overwritten with fresh data from the JSON, but rows created inside the
 * app (transfers, maintenance logs, etc.) are untouched.
 *
 * Usage:
 *   node scripts/seed_db.js              # seeds both assets + grants
 *   node scripts/seed_db.js --assets     # only assets
 *   node scripts/seed_db.js --grants     # only grants
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'db.sqlite');
const ASSETS_JSON = path.join(__dirname, '..', 'src', 'mock', 'real_assets.json');
const GRANTS_JSON = path.join(__dirname, '..', 'src', 'mock', 'grants.json');

const args = process.argv.slice(2);
const doAssets = args.length === 0 || args.includes('--assets');
const doGrants = args.length === 0 || args.includes('--grants');

if (!fs.existsSync(DB_PATH)) {
    console.error('db.sqlite not found. Run npm run db:init first.');
    process.exit(1);
}

const db = new Database(DB_PATH);

// ── Assets ─────────────────────────────────────────────────────
if (doAssets) {
    if (!fs.existsSync(ASSETS_JSON)) {
        console.warn('src/mock/real_assets.json not found — skipping assets.');
    } else {
        const assets = JSON.parse(fs.readFileSync(ASSETS_JSON, 'utf8'));

        // Discover DB columns dynamically so we never insert unknown columns
        const dbCols = new Set(
            db.prepare('PRAGMA table_info(assets)').all().map(c => c.name)
        );

        // Columns present in the JSON that also exist in the DB
        const sampleKeys = Object.keys(assets[0] || {});
        const insertCols = sampleKeys.filter(k => dbCols.has(k));

        const placeholders = insertCols.map(() => '?').join(', ');
        const stmt = db.prepare(
            `INSERT OR REPLACE INTO assets (${insertCols.join(', ')}) VALUES (${placeholders})`
        );

        const validAssets = assets.filter(r => r.id && r.name);
        const skipped = assets.length - validAssets.length;

        const upsertAll = db.transaction((rows) => {
            for (const row of rows) {
                stmt.run(insertCols.map(c => row[c] ?? null));
            }
        });

        upsertAll(validAssets);
        const count = db.prepare('SELECT COUNT(*) as c FROM assets').get().c;
        console.log(`Assets: ${validAssets.length} upserted → ${count} total in DB${skipped ? ` (${skipped} skipped — missing id/name)` : ''}`);
    }
}

// ── Grants ─────────────────────────────────────────────────────
if (doGrants) {
    if (!fs.existsSync(GRANTS_JSON)) {
        console.warn('src/mock/grants.json not found — skipping grants.');
    } else {
        const grants = JSON.parse(fs.readFileSync(GRANTS_JSON, 'utf8'));

        const dbCols = new Set(
            db.prepare('PRAGMA table_info(grants)').all().map(c => c.name)
        );
        const sampleKeys = Object.keys(grants[0] || {});
        const insertCols = sampleKeys.filter(k => dbCols.has(k));

        const placeholders = insertCols.map(() => '?').join(', ');
        const stmt = db.prepare(
            `INSERT OR REPLACE INTO grants (${insertCols.join(', ')}) VALUES (${placeholders})`
        );

        const upsertAll = db.transaction((rows) => {
            for (const row of rows) {
                stmt.run(insertCols.map(c => row[c] ?? null));
            }
        });

        upsertAll(grants);
        const count = db.prepare('SELECT COUNT(*) as c FROM grants').get().c;
        console.log(`Grants: ${grants.length} upserted → ${count} total in DB`);
    }
}

db.close();
console.log('\nSeeding complete.');
