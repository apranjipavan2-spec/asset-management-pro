// Apply pending .sql migrations from ./migrations in filename order.
// Safe to re-run — each applied file is recorded in _migrations and skipped next time.
// Always backs up the DB before applying anything.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db.sqlite');
const MIG_DIR = path.join(__dirname, '..', 'migrations');
const BACKUP_DIR = path.join(__dirname, '..', 'db_backups');

if (!fs.existsSync(DB_PATH)) { console.error('No db.sqlite found at', DB_PATH); process.exit(1); }
if (!fs.existsSync(MIG_DIR)) {
    fs.mkdirSync(MIG_DIR, { recursive: true });
    console.log('Created empty migrations/ folder. Drop numbered .sql files there (e.g. 001_add_column.sql).');
    process.exit(0);
}

const files = fs.readdirSync(MIG_DIR).filter(f => f.endsWith('.sql')).sort();
if (files.length === 0) { console.log('No .sql files in migrations/. Nothing to do.'); process.exit(0); }

const db = new DatabaseSync(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS _migrations (id TEXT PRIMARY KEY, appliedAt TEXT NOT NULL)`);
const applied = new Set(db.prepare('SELECT id FROM _migrations').all().map(r => r.id));

const pending = files.filter(f => !applied.has(f));
if (pending.length === 0) { console.log(`All ${files.length} migration(s) already applied. Nothing to do.`); db.close(); process.exit(0); }

console.log(`${pending.length} pending migration(s):`, pending.join(', '));

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupSub = path.join(BACKUP_DIR, `before_migrate_${ts}`);
fs.mkdirSync(backupSub, { recursive: true });
for (const f of ['db.sqlite', 'db.sqlite-wal', 'db.sqlite-shm']) {
    const src = path.join(__dirname, '..', f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(backupSub, f));
}
console.log('Backed up DB to', backupSub);

let n = 0;
for (const f of pending) {
    const sql = fs.readFileSync(path.join(MIG_DIR, f), 'utf8');
    console.log('Applying', f, '...');
    db.exec('BEGIN');
    try {
        db.exec(sql);
        db.prepare('INSERT INTO _migrations (id, appliedAt) VALUES (?, ?)').run(f, new Date().toISOString());
        db.exec('COMMIT');
        n++;
        console.log('  ok');
    } catch (e) {
        db.exec('ROLLBACK');
        console.error('  FAILED:', e.message);
        console.error('  DB restored to pre-migration state. Fix the SQL and re-run.');
        db.close();
        process.exit(1);
    }
}
db.close();
console.log(`Done. ${n} migration(s) applied.`);
