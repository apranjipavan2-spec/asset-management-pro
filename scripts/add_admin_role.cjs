/**
 * Adds the 'admin' role (office administrator).
 * Hierarchy: below HR. Handles asset records + notifications.
 * Idempotent.
 */
'use strict';
const Database = require('better-sqlite3');
const db = new Database('./db.sqlite');

const ADMIN_PERMS = JSON.stringify([
    'manage_assets',
    'view_assets',
    'view_reports',
    'manage_notifications',
    'manage_announcements'
]);

const existing = db.prepare("SELECT id FROM roles WHERE id = 'admin'").get();
if (existing) {
    db.prepare("UPDATE roles SET name = ?, permissions = ? WHERE id = 'admin'")
        .run('Office Administrator', ADMIN_PERMS);
    console.log('Updated existing admin role');
} else {
    db.prepare("INSERT INTO roles (id, name, permissions) VALUES (?, ?, ?)")
        .run('admin', 'Office Administrator', ADMIN_PERMS);
    console.log('Inserted admin role');
}

const row = db.prepare("SELECT * FROM roles WHERE id = 'admin'").get();
console.log('  ' + row.id + ' (' + row.name + ')  perms=' + row.permissions);
db.close();
