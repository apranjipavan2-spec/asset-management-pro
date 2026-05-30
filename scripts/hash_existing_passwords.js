import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;
const dbPath = './db.sqlite';

const db = new Database(dbPath);
const isBcryptHash = (s) => typeof s === 'string' && /^\$2[aby]\$\d{2}\$/.test(s);

const users = db.prepare('SELECT id, password FROM users').all();
const update = db.prepare('UPDATE users SET password = ? WHERE id = ?');

let hashed = 0;
let skipped = 0;

const tx = db.transaction(() => {
    for (const u of users) {
        if (!u.password) { skipped++; continue; }
        if (isBcryptHash(u.password)) { skipped++; continue; }
        update.run(bcrypt.hashSync(u.password, BCRYPT_ROUNDS), u.id);
        hashed++;
    }
});

tx();

console.log(`Password migration complete. Hashed: ${hashed}. Already-hashed or empty: ${skipped}. Total users: ${users.length}.`);
db.close();
