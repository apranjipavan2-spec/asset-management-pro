// Regenerate login_credentials_master.csv from the live DB.
//
// Passwords are bcrypt-hashed in the DB and cannot be reversed, so we
// reconstruct the plaintext from two trusted sources:
//   • role='employee' users → derived formula `<id-suffix>+<first 5 of name>`
//     (this is what scripts/restore_employee_passwords.js wrote)
//   • everyone else → looked up from the existing CSV at repo root
//     (the original plaintext source-of-truth for seeded admin accounts)
//
// Output is sorted: privileged roles first, then alphabetical by name.

import Database from 'better-sqlite3';
import fs from 'fs';

const DB_PATH = './db.sqlite';
const CSV_PATH = './login_credentials_master.csv';

const ROLE_PRIORITY = {
    superadmin: 0,
    director:   1,
    finance:    2,
    hr:         3,
    operations: 4,
    manager:    5,
    employee:   6
};

const csvEscape = (v) => {
    const s = v == null ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
};

const derivedPassword = (id, name) => {
    if (!id || !name) return '';
    const idNumber = id.split('/').pop();
    const firstFive = name.substring(0, 5);
    return idNumber + firstFive;
};

// 1. Load existing CSV into a lookup of id → original plaintext password.
const existing = new Map();
if (fs.existsSync(CSV_PATH)) {
    const lines = fs.readFileSync(CSV_PATH, 'utf8').split(/\r?\n/).filter(l => l.trim());
    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].match(/("([^"]|"")*"|[^,]+)/g);
        if (!cells || cells.length < 4) continue;
        const strip = (c) => c.replace(/^"|"$/g, '').replace(/""/g, '"');
        existing.set(strip(cells[0]), strip(cells[3]));
    }
    console.log(`Loaded ${existing.size} plaintext passwords from existing CSV.`);
} else {
    console.warn('No existing CSV found — non-employee passwords will be marked <UNKNOWN>.');
}

// 2. Read all DB users.
const db = new Database(DB_PATH, { readonly: true });
const users = db.prepare(`
    SELECT id, name, role, designation, location, email, phone
    FROM users
    ORDER BY id
`).all();
db.close();

// 3. Sort: by role priority, then by name.
users.sort((a, b) => {
    const pa = ROLE_PRIORITY[a.role] ?? 99;
    const pb = ROLE_PRIORITY[b.role] ?? 99;
    if (pa !== pb) return pa - pb;
    return (a.name || '').localeCompare(b.name || '');
});

// 4. Resolve password per user.
let derivedCount = 0;
let lookupCount = 0;
let unknownCount = 0;
const rows = users.map(u => {
    let password;
    if (u.role === 'employee') {
        password = derivedPassword(u.id, u.name);
        derivedCount++;
    } else if (existing.has(u.id)) {
        password = existing.get(u.id);
        lookupCount++;
    } else {
        password = '<UNKNOWN>';
        unknownCount++;
    }
    return { ...u, password };
});

// 5. Write the refreshed CSV.
const header = ['ID', 'Name', 'Role', 'Password', 'Designation', 'Location', 'Email', 'Phone'];
const out = [
    header.join(','),
    ...rows.map(r => [
        r.id, r.name, r.role, r.password, r.designation, r.location, r.email, r.phone
    ].map(csvEscape).join(','))
].join('\n') + '\n';

fs.writeFileSync(CSV_PATH, out, 'utf8');

console.log(`\nWrote ${rows.length} rows to ${CSV_PATH}`);
console.log(`  ${derivedCount} employees (derived formula)`);
console.log(`  ${lookupCount} privileged users (from existing CSV)`);
if (unknownCount > 0) {
    console.warn(`  ${unknownCount} marked <UNKNOWN> — these users were not in the original CSV.`);
}
console.log(`\nNote: this file is gitignored. Distribute via a secure channel.`);
