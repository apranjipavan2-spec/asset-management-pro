// One-command pull: backup laptop DB, then scp phone's DB onto laptop.
// Usage: node scripts/pull_db_from_phone.cjs <user>@<phone-ip> [remotePath]
// Default remote path: ~/Kalike/Asset/
//
// Use this when you want fresh production data on the laptop for dev/testing.
// The phone is source of truth — always pull, don't push, unless you intend to overwrite.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
const remotePath = process.argv[3] || '~/Kalike/Asset/';
if (!src || !src.includes('@')) {
    console.error('Usage: node scripts/pull_db_from_phone.cjs <user>@<phone-ip> [remotePath]');
    console.error('Example: node scripts/pull_db_from_phone.cjs u0_a234@192.168.1.42');
    process.exit(1);
}

// Backup current laptop DB before overwriting
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const backupSub = path.join(__dirname, '..', 'db_backups', `before_pull_${ts}`);
fs.mkdirSync(backupSub, { recursive: true });
for (const f of ['db.sqlite', 'db.sqlite-wal', 'db.sqlite-shm']) {
    const p = path.join(__dirname, '..', f);
    if (fs.existsSync(p)) fs.copyFileSync(p, path.join(backupSub, f));
}
console.log('Backup of current laptop DB:', backupSub);

const cmd = `scp -P 8022 "${src}:${remotePath}db.sqlite*" ./`;
console.log('Running:', cmd);
try {
    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('\nDone. Restart your laptop dev server (`npm run dev:full`) to see the pulled data.');
} catch (e) {
    console.error('\nscp failed. Common causes:');
    console.error('  - sshd not running on phone');
    console.error('  - wrong IP / username');
    console.error('  - laptop and phone not on same wifi');
    process.exit(1);
}
