// One-time migration: set every role='employee' user's password to the
// legacy derived formula (id-suffix + first 5 chars of name), bcrypt-hashed.
// This preserves muscle memory after the auth refactor that removed the
// derived-formula path from the frontend.

import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;
const db = new Database('./db.sqlite');

const employees = db.prepare(`SELECT id, name FROM users WHERE role = 'employee'`).all();
const update = db.prepare(`UPDATE users SET password = ? WHERE id = ?`);

const tx = db.transaction(() => {
    let count = 0;
    for (const emp of employees) {
        if (!emp.id || !emp.name) continue;
        const idNumber = emp.id.split('/').pop();
        const firstFive = emp.name.substring(0, 5);
        const derived = idNumber + firstFive;
        update.run(bcrypt.hashSync(derived, BCRYPT_ROUNDS), emp.id);
        count++;
    }
    return count;
});

const count = tx();
console.log(`Restored derived passwords for ${count} employees (formula: <id-suffix> + <first 5 of name>).`);
db.close();
