import Database from 'better-sqlite3';
import fs from 'fs';

try {
    const db = new Database('./db.sqlite', { readonly: true });
    const users = db.prepare('SELECT id, name, role, password FROM users').all();

    const csvHeader = 'ID,Name,Role,Password\n';
    const csvRows = users.map(u => `"${u.id}","${u.name}","${u.role}","${u.password}"`).join('\n');

    fs.writeFileSync('./login_details.csv', csvHeader + csvRows);
    console.log('Successfully exported login details to login_details.csv');
} catch (error) {
    console.error('Error exporting users:', error);
}
