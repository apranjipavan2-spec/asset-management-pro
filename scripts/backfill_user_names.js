import Database from 'better-sqlite3';
import fs from 'fs';

const dbPath = './db.sqlite';
const credentialsPath = './login_credentials_master.csv';

function parseCsvLine(line) {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
            else inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            out.push(cur); cur = '';
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out.map(v => v.trim());
}

if (!fs.existsSync(dbPath)) {
    console.error(`DB not found at ${dbPath}`);
    process.exit(1);
}
if (!fs.existsSync(credentialsPath)) {
    console.error(`CSV not found at ${credentialsPath}`);
    process.exit(1);
}

const db = new Database(dbPath);
const update = db.prepare('UPDATE users SET name = ?, avatar = ? WHERE id = ?');

const lines = fs.readFileSync(credentialsPath, 'utf8').split(/\r?\n/).filter(l => l.trim() !== '');
let updated = 0, missing = 0;

const tx = db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
        const fields = parseCsvLine(lines[i]);
        if (fields.length < 2 || !fields[0] || !fields[1]) continue;
        const id = fields[0];
        const name = fields[1];
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        const result = update.run(name, avatar, id);
        if (result.changes > 0) updated++;
        else missing++;
    }
});

tx();
console.log(`Backfilled ${updated} user names. ${missing} CSV rows had no matching user.`);
db.close();
