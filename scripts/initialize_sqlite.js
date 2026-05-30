import { DatabaseSync as _DatabaseSync } from 'node:sqlite';
function _wrapStmt(stmt, sql) {
    const names = new Set([...sql.matchAll(/[@:$]([a-zA-Z_]\w*)/g)].map(m => m[1]));
    const f = p => {
        if (!p || typeof p !== 'object' || Array.isArray(p)) return p;
        const o = {}; for (const k of names) if (k in p) o[k] = p[k]; return o;
    };
    return { run: p => stmt.run(f(p)), get: p => stmt.get(f(p)), all: p => stmt.all(f(p)) };
}
class Database extends _DatabaseSync {
    prepare(sql) { return _wrapStmt(super.prepare(sql), sql); }
}
import fs from 'fs';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;
const dbPath = './db.sqlite';
const schemaPath = './src/mock/schema.sql';
const assetsPath = './src/mock/real_assets.json';
const grantsPath = './src/mock/grants.json';

// Delete existing DB to ensure a clean slate
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Existing database deleted.');
}

const db = new Database(dbPath);

console.log('--- Initializing SQLite Database ---');

// 1. Apply Schema
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);
console.log('Schema applied.');

// 2. Load Data
const assetsData = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));
const grantsData = JSON.parse(fs.readFileSync(grantsPath, 'utf8'));
console.log(`Loaded ${assetsData.length} assets and ${grantsData.length} grants from JSON.`);

// 3. Seed Roles (Governance Baseline)
const insertRole = db.prepare(`
    INSERT INTO roles (id, name, permissions, level, isDefault) 
    VALUES (@id, @name, @permissions, @level, @isDefault)
`);

const roles = [
    { id: 'superadmin', name: 'Super Administrator', permissions: '["all"]', level: 6, isDefault: 1 },
    { id: 'director', name: 'Executive Director', permissions: '["all"]', level: 5, isDefault: 1 },
    { id: 'finance', name: 'Finance Controller', permissions: '["approve_finance", "view_reports", "view_global_stats"]', level: 4, isDefault: 1 },
    { id: 'operations', name: 'Operations Manager', permissions: '["manage_assets", "approve_requests", "view_reports", "view_global_stats"]', level: 4, isDefault: 1 },
    { id: 'hr', name: 'HR Manager', permissions: '["manage_users", "manage_payroll", "view_reports", "view_global_stats"]', level: 4, isDefault: 1 },
    { id: 'manager', name: 'Program Coordinator', permissions: '["manage_team", "approve_requests"]', level: 3, isDefault: 1 },
    { id: 'employee', name: 'General Staff', permissions: '[]', level: 1, isDefault: 1 }
];

// 4. Seed Users from Master CSV
const credentialsPath = './login_credentials_master.csv';
const insertUser = db.prepare(`
    INSERT INTO users (id, name, role, password, designation, location, empId, avatar) 
    VALUES (@id, @name, @role, @password, @designation, @location, @empId, @avatar)
`);

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

let usersProcessed = 0;
if (fs.existsSync(credentialsPath)) {
    const csvContent = fs.readFileSync(credentialsPath, 'utf8');
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const fields = parseCsvLine(lines[i]);
        if (fields.length >= 6 && fields[0] && fields[1]) {
            const plaintext = fields[3];
            const row = {
                id: fields[0],
                name: fields[1],
                role: fields[2],
                password: bcrypt.hashSync(plaintext, BCRYPT_ROUNDS),
                designation: fields[4],
                location: fields[5],
                empId: fields[0],
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fields[1])}&background=random`
            };
            try {
                insertUser.run(row);
                usersProcessed++;
            } catch (e) {
                console.warn(`Duplicate or invalid user skipped: ${row.id}`);
            }
        }
    }
} else {
    // No credentials CSV — seed a default superadmin so the app is usable
    const adminPass = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    try {
        db.prepare(`INSERT INTO users (id, name, role, password) VALUES (?, ?, ?, ?)`)
            .run('superadmin', 'Super Admin', 'superadmin', bcrypt.hashSync(adminPass, BCRYPT_ROUNDS));
        console.log(`[init] No CSV found. Default superadmin created. Password: ${adminPass}`);
    } catch (e) { /* already exists */ }
}

// 5. Seed Assets & Grants
const insertAsset = db.prepare(`
    INSERT INTO assets (
        id, name, category, status, location, purchaseDate, amount, 
        grossBlock, netBlock, program, assignedTo, assignedToId, 
        assignedToDesignation, depreciation, accumulatedDepreciation, 
        currentYearDepreciation, fundingSource, fundingAmount, 
        procurementType, supplier, billNumber, voucherNumber, 
        installationDate, putToUseDate, quantity, depreciationRate, 
        usefulLife, disposalDate, health
    ) VALUES (
        @id, @name, @category, @status, @location, @purchaseDate, @amount, 
        @grossBlock, @netBlock, @program, @assignedTo, @assignedToId, 
        @assignedToDesignation, @depreciation, @accumulatedDepreciation, 
        @currentYearDepreciation, @fundingSource, @fundingAmount, 
        @procurementType, @supplier, @billNumber, @voucherNumber, 
        @installationDate, @putToUseDate, @quantity, @depreciationRate, 
        @usefulLife, @disposalDate, @health
    )
`);

const insertGrant = db.prepare(`
    INSERT INTO grants (
        id, name, program, openingBalance, spent, closingBalance
    ) VALUES (
        @id, @name, @program, @openingBalance, @spent, @closingBalance
    )
`);

db.exec('BEGIN');
try {
    for (const role of roles) insertRole.run(role);
    for (const asset of assetsData) {
        asset.name = asset.name || asset.category || "Unnamed Asset";
        asset.depreciation = asset.depreciation || 0;
        asset.currentYearDepreciation = asset.currentYearDepreciation || 0;
        asset.amount = asset.amount || asset.grossBlock || 0;
        asset.fundingAmount = asset.amount || 0;
        asset.health = asset.health || "100.0%";
        asset.program = asset.program || "General";
        asset.assignedTo = asset.assignedTo || "Unassigned";
        asset.assignedToId = asset.assignedToId || "N/A";
        asset.assignedToDesignation = asset.assignedToDesignation || "N/A";
        asset.usefulLife = asset.usefulLife || null;
        insertAsset.run(asset);
    }
    for (const grant of grantsData) insertGrant.run(grant);
    db.exec('COMMIT');
} catch (e) { db.exec('ROLLBACK'); throw e; }
console.log(`Seeding complete. Processed ${usersProcessed} users and ${roles.length} roles.`);

// Verification
const assetCount = db.prepare('SELECT COUNT(*) as count FROM assets').get();
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
const roleCount = db.prepare('SELECT COUNT(*) as count FROM roles').get();
console.log(`Summary: ${assetCount.count} Assets, ${userCount.count} Users, ${roleCount.count} Roles.`);

console.log('--- Initialization Complete ---');
db.close();
