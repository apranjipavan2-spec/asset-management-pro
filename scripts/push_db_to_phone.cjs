// One-command push: checkpoint the WAL, then scp db.sqlite to the phone.
// Usage: node scripts/push_db_to_phone.cjs <user>@<phone-ip> [remotePath]
// Default remote path: ~/Kalike/Asset/
//
// Prerequisite: stop the laptop dev server first (Ctrl+C the npm run dev:full terminal).
// Stop the phone's server too before running; then restart it after.
const { execSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dest = process.argv[2];
const remotePath = process.argv[3] || '~/Kalike/Asset/';
if (!dest || !dest.includes('@')) {
    console.error('Usage: node scripts/push_db_to_phone.cjs <user>@<phone-ip> [remotePath]');
    console.error('Example: node scripts/push_db_to_phone.cjs u0_a234@192.168.1.42');
    process.exit(1);
}

const DB = path.join(__dirname, '..', 'db.sqlite');
if (!fs.existsSync(DB)) { console.error('No db.sqlite found.'); process.exit(1); }

// Safety backup
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupSub = path.join(__dirname, '..', 'db_backups', `before_push_${ts}`);
fs.mkdirSync(backupSub, { recursive: true });
for (const f of ['db.sqlite', 'db.sqlite-wal', 'db.sqlite-shm']) {
    const src = path.join(__dirname, '..', f);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(backupSub, f));
}
console.log('Backup:', backupSub);

// Checkpoint WAL into main file
console.log('Checkpointing WAL ...');
const db = new DatabaseSync(DB);
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
db.close();
console.log('  ok');

// scp all three (WAL/SHM should be empty after checkpoint but copy anyway for safety)
const cmd = `scp -P 8022 db.sqlite db.sqlite-wal db.sqlite-shm "${dest}:${remotePath}"`;
console.log('Running:', cmd);
try {
    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('\nDone. Now on the phone: restart `npm run server` and hard-refresh the Cloudflare tab.');
} catch (e) {
    console.error('\nscp failed. Common causes:');
    console.error('  - sshd not running on phone (run `sshd` in Termux first)');
    console.error('  - wrong IP / username (check `whoami` and `ifconfig wlan0` on phone)');
    console.error('  - laptop and phone not on same wifi');
    process.exit(1);
}
