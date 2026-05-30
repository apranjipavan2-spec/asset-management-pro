import 'dotenv/config.js';
import express from 'express';
import pkg from 'node-sqlite3-wasm';
const { Database } = pkg;
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import ExcelJS from 'exceljs';

const DEV_JWT_SECRET = 'kalike-enterprise-secret-key-2026';
const JWT_SECRET = process.env.JWT_SECRET || DEV_JWT_SECRET;
if (JWT_SECRET === DEV_JWT_SECRET) {
    console.warn('[security] JWT_SECRET not set — using public dev fallback. Set JWT_SECRET env var in production.');
}
const BCRYPT_ROUNDS = 10;

// Whitelist of tables exposed via the generic CRUD handlers. Anything not
// listed here cannot be reached, preventing identifier-injection.
const ALLOWED_TABLES = new Set([
    'assets', 'grants', 'transfers', 'requests', 'maint', 'users', 'audit_logs',
    'worklogs', 'tasks', 'leaves', 'leave_balances', 'reimbursements', 'payroll',
    'procurement', 'attendance', 'employee_hierarchy', 'notifications',
    'documents', 'announcements', 'announcement_reads', 'calendar_events',
    'performance_reviews', 'communication_logs', 'signatures', 'roles',
    'asset_far', 'social_accounts'
]);

// Column names allowed in dynamic INSERTs. Built lazily per-table from the
// live schema so a typo or attacker-supplied key cannot reach the SQL string.
const tableColumnCache = new Map();
const getAllowedColumns = (table) => {
    if (tableColumnCache.has(table)) return tableColumnCache.get(table);
    const cols = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name));
    tableColumnCache.set(table, cols);
    return cols;
};
const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = './db.sqlite';
const schemaPath = './src/mock/schema.sql';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const db = new Database(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Initialize DB with schema
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

// ── Schema Migrations ──────────────────────────────────────
// Safely add columns that may not exist in older databases
const safeAddColumn = (table, column, type, defaultVal) => {
    try {
        db.prepare(`SELECT ${column} FROM ${table} LIMIT 1`).get();
    } catch (e) {
        const def = defaultVal !== undefined ? ` DEFAULT ${typeof defaultVal === 'string' ? `'${defaultVal}'` : defaultVal}` : '';
        console.log(`Migration: Adding ${column} to ${table}...`);
        db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${def}`).run();
    }
};

// Users table migrations
safeAddColumn('users', 'designation', 'TEXT');
safeAddColumn('users', 'location', 'TEXT');
safeAddColumn('users', 'department', 'TEXT');
safeAddColumn('users', 'reportsTo', 'TEXT');
safeAddColumn('users', 'permissions', 'TEXT');
safeAddColumn('users', 'phone', 'TEXT');
safeAddColumn('users', 'email', 'TEXT');
safeAddColumn('users', 'joiningDate', 'TEXT');
safeAddColumn('users', 'bankAccount', 'TEXT');
safeAddColumn('users', 'panNumber', 'TEXT');
safeAddColumn('users', 'basicSalary', 'REAL', 0);

// Audit logs snapshot and level column
safeAddColumn('audit_logs', 'snapshot', 'TEXT');
safeAddColumn('audit_logs', 'level', 'TEXT', 'INFO');

// Procurement workflow extras (location for routing, reportsTo for team scope, deliveryDate for ETA)
safeAddColumn('procurement', 'location', 'TEXT');
safeAddColumn('procurement', 'reportsTo', 'TEXT');

// Users last login
safeAddColumn('users', 'lastLogin', 'TEXT');

// Assets operational register fields (sourced from merged Excel; finance fields live in asset_far)
safeAddColumn('assets', 'parentAssetId', 'TEXT');
safeAddColumn('assets', 'standardizedId', 'TEXT');
safeAddColumn('assets', 'assetIdentificationNumber', 'TEXT');
safeAddColumn('assets', 'parentMatchType', 'TEXT');
safeAddColumn('assets', 'assignmentCode', 'TEXT');
safeAddColumn('assets', 'modelName', 'TEXT');
safeAddColumn('assets', 'district', 'TEXT');
safeAddColumn('assets', 'locationDetail', 'TEXT');
safeAddColumn('assets', 'notes', 'TEXT');
try { db.prepare('CREATE INDEX IF NOT EXISTS idx_assets_parentAssetId ON assets(parentAssetId)').run(); } catch {}

// FAR — register columns added from Dep. Asset Register 25-26 source workbooks
const FAR_EXTRA_COLS = [
    ['description',      'TEXT'],
    ['location',         'TEXT'],
    ['purchaseOrKind',   'TEXT'],
    ['supplierName',     'TEXT'],
    ['billNo',           'TEXT'],
    ['installationDate', 'TEXT'],
    ['datePutToUse',     'TEXT'],
    ['quantity',         'REAL', 1],
    ['voucherNo',        'TEXT'],
    ['usefulLifeYears',  'TEXT'],
];
for (const [c, t, d] of FAR_EXTRA_COLS) {
    safeAddColumn('asset_far', c, t, d);
    safeAddColumn('asset_far_archive', c, t, d);
}

// Seed default social_accounts rows (idempotent — only inserts if id missing).
// Superadmin can edit/disable/add more rows via Settings → Social Accounts.
const seedSocialAccount = db.prepare(`
    INSERT OR IGNORE INTO social_accounts
        (id, platform, displayName, handle, url, youtubeChannelId, isActive, displayOrder, createdAt, updatedAt)
    VALUES (@id, @platform, @displayName, @handle, @url, @youtubeChannelId, @isActive, @displayOrder, @createdAt, @updatedAt)
`);
const nowIso = new Date().toISOString();
const defaultSocialAccounts = [
    { id: 'social_youtube_main',   platform: 'youtube',   displayName: 'Kalike Foundation', handle: '@KalikeFdn',
      url: 'https://www.youtube.com/@KalikeFdn',          youtubeChannelId: '', isActive: 1, displayOrder: 1 },
    { id: 'social_instagram_main', platform: 'instagram', displayName: 'Kalike Foundation', handle: '@kalikefdn',
      url: 'https://www.instagram.com/kalikefdn/',        youtubeChannelId: null, isActive: 1, displayOrder: 2 },
    { id: 'social_linkedin_main',  platform: 'linkedin',  displayName: 'Kalike',            handle: 'company/kalike',
      url: 'https://www.linkedin.com/company/kalike/',    youtubeChannelId: null, isActive: 1, displayOrder: 3 },
    { id: 'social_x_main',         platform: 'x',         displayName: 'Kalike Foundation', handle: '@KalikeFdn',
      url: 'https://twitter.com/KalikeFdn',               youtubeChannelId: null, isActive: 1, displayOrder: 4 },
    { id: 'social_facebook_main',  platform: 'facebook',  displayName: 'Kalike Foundation', handle: 'KalikeFdn',
      url: 'https://www.facebook.com/KalikeFdn',          youtubeChannelId: null, isActive: 1, displayOrder: 5 }
];
for (const row of defaultSocialAccounts) {
    seedSocialAccount.run({ ...row, createdAt: nowIso, updatedAt: nowIso });
}

// ── Generic CRUD Helpers ────────────────────────────────────
const assertTable = (table, res) => {
    if (!ALLOWED_TABLES.has(table)) {
        res.status(400).json({ error: 'Unknown resource' });
        return false;
    }
    return true;
};

// Role-based write authorization. Tables not listed here accept writes from
// any authenticated user. Tables listed restrict POST/DELETE to the roles
// in the Set. Reads are intentionally not gated — most dashboards need
// broad visibility and per-row privacy is out of scope.
const WRITE_ROLES = {
    users:              new Set(['superadmin', 'hr', 'director']),
    roles:              new Set(['superadmin']),
    payroll:            new Set(['superadmin', 'hr', 'finance', 'director']),
    leave_balances:     new Set(['superadmin', 'hr', 'director']),
    employee_hierarchy: new Set(['superadmin', 'hr', 'director']),
    grants:             new Set(['superadmin', 'finance', 'director']),
    // Finance + superadmin only. Director gets view access via the page perm
    // (approve_finance), but never writes to the register or triggers rollover.
    asset_far:          new Set(['superadmin', 'finance']),
    announcements:      new Set(['superadmin', 'hr', 'director', 'manager', 'admin']),
    performance_reviews:new Set(['superadmin', 'hr', 'director', 'manager']),
    social_accounts:    new Set(['superadmin']),
    audit_logs:         new Set(['superadmin', 'director']) // mostly written by server itself
};

// Per-row privacy: tables that contain personal data are filtered so a
// non-elevated user only sees rows they own. Map value is the column that
// identifies the row's owner (matched against req.user.id).
const PRIVATE_TABLES = {
    payroll:             'empId',
    leaves:              'empId',
    leave_balances:      'empId',
    reimbursements:      'empId',
    performance_reviews: 'empId',
    attendance:          'empId',
    signatures:          'empId',
    worklogs:            'empId',
    documents:           'empId',
    tasks:               'assignedTo',
    notifications:       'recipientId'
};

// Roles that bypass per-row privacy (see all rows on private tables).
const ELEVATED_ROLES = new Set(['superadmin', 'hr', 'finance', 'director']);

const isElevated = (req) => req.user && ELEVATED_ROLES.has(req.user.role);

// ── Validation Schemas (Zod) ──────────────────────────────────
const loginSchema = z.object({
    userId: z.string().min(1, 'User ID required'),
    password: z.string().min(1, 'Password required'),
    role: z.string().optional()
});

const passwordChangeSchema = z.object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters')
});

const genericPostSchema = z.record(z.any()).refine(
    obj => Object.keys(obj).length > 0,
    'Request body cannot be empty'
);

const validateRequest = (schema, data) => {
    try {
        return { valid: true, data: schema.parse(data) };
    } catch (err) {
        return { valid: false, errors: err.errors };
    }
};

const assertWritePermission = (table, req, res) => {
    const allowed = WRITE_ROLES[table];
    if (!allowed) return true; // unrestricted
    const role = req.user && req.user.role;
    if (!role || !allowed.has(role)) {
        logAuditEvent(
            'AUTHZ_DENIED',
            req.user ? req.user.id : null,
            req.user ? req.user.id : null,
            `Role '${role}' attempted ${req.method} on '${table}'`,
            'WARN'
        );
        res.status(403).json({ error: 'Insufficient role for this operation' });
        return false;
    }
    return true;
};

const handleGet = (req, res, table) => {
    if (!assertTable(table, res)) return;
    try {
        const ownerCol = PRIVATE_TABLES[table];
        if (ownerCol && !isElevated(req)) {
            if (req.user.role === 'manager') {
                const reports = db.prepare(
                    `SELECT id FROM users WHERE reportsTo = ?`
                ).all(req.user.id).map(u => u.id);
                const ids = [req.user.id, ...reports];
                const placeholders = ids.map(() => '?').join(', ');
                const rows = db.prepare(
                    `SELECT * FROM ${quoteIdent(table)} WHERE ${quoteIdent(ownerCol)} IN (${placeholders})`
                ).all(...ids);
                return res.json(rows);
            }
            const rows = db.prepare(
                `SELECT * FROM ${quoteIdent(table)} WHERE ${quoteIdent(ownerCol)} = ?`
            ).all(req.user.id);
            return res.json(rows);
        }
        const rows = db.prepare(`SELECT * FROM ${quoteIdent(table)}`).all();
        res.json(rows);
    } catch (err) {
        console.error(`GET ${table}:`, err);
        res.status(500).json({ error: err.message });
    }
};

const handlePost = (req, res, table) => {
    if (!assertTable(table, res)) return;
    if (!assertWritePermission(table, req, res)) return;
    try {
        const data = req.body || {};
        const validation = validateRequest(genericPostSchema, data);
        if (!validation.valid) {
            return res.status(400).json({ error: 'Invalid request body', details: validation.errors });
        }

        const allowed = getAllowedColumns(table);
        const keys = Object.keys(data).filter(k => allowed.has(k));
        if (keys.length === 0) {
            return res.status(400).json({ error: 'No valid columns supplied' });
        }
        // Defence-in-depth: never let a client write a password column directly.
        // Password writes must go through /api/login or dedicated endpoints.
        if (table === 'users' && keys.includes('password')) {
            const idx = keys.indexOf('password');
            keys.splice(idx, 1);
        }

        // Per-row privacy: non-elevated users may only write rows they own.
        // Managers can write for their direct reports. Force-set owner column.
        const ownerCol = PRIVATE_TABLES[table];
        if (ownerCol && !isElevated(req)) {
            const targetOwnerId = data[ownerCol] || req.user.id;
            const canWriteForTarget = req.user.id === targetOwnerId ||
                (req.user.role === 'manager' &&
                 db.prepare(`SELECT 1 FROM users WHERE id = ? AND reportsTo = ?`).get(targetOwnerId, req.user.id));

            if (!canWriteForTarget) {
                logAuditEvent(
                    'AUTHZ_DENIED',
                    req.user.id,
                    req.user.id,
                    `Attempted to write '${table}.${ownerCol}=${targetOwnerId}' (not own row or team member)`,
                    'WARN'
                );
                return res.status(403).json({ error: 'Cannot write rows owned by another user' });
            }
            if (!keys.includes(ownerCol)) keys.push(ownerCol);
            data[ownerCol] = targetOwnerId;
        }
        const columns = keys.map(quoteIdent).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const values = keys.map(k => data[k]);
        db.prepare(`INSERT OR REPLACE INTO ${quoteIdent(table)} (${columns}) VALUES (${placeholders})`).run(...values);
        res.json({ success: true });
    } catch (err) {
        console.error(`POST ${table}:`, err);
        res.status(500).json({ error: err.message });
    }
};

const handleDelete = (req, res, table) => {
    if (!assertTable(table, res)) return;
    if (!assertWritePermission(table, req, res)) return;
    try {
        db.prepare(`DELETE FROM ${quoteIdent(table)} WHERE id = ?`).run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error(`DELETE ${table}:`, err);
        res.status(500).json({ error: err.message });
    }
};

// Bcrypt hashes always start with $2a$, $2b$, or $2y$ + cost + $
const isBcryptHash = (s) => typeof s === 'string' && /^\$2[aby]\$\d{2}\$/.test(s);

// ── Audit logging ──────────────────────────────────────────
const logAuditEvent = (action, userId, userName, details, level = 'INFO') => {
    try {
        const now = new Date().toISOString();
        const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.prepare(
            `INSERT INTO audit_logs (id, userId, userName, action, details, date, timestamp, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(id, userId || 'unknown', userName || 'unknown', action, details, now, now, level);
    } catch (e) {
        console.error('Audit log write failed:', e.message);
    }
};

const pruneAuditLogs = () => {
    try {
        const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10);
        const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
        const result = db.prepare('DELETE FROM audit_logs WHERE timestamp < ?').run(cutoffDate);
        if (result.changes > 0) {
            console.log(`Audit cleanup: removed ${result.changes} logs older than ${retentionDays} days`);
        }
    } catch (e) {
        console.error('Audit log prune failed:', e.message);
    }
};

setInterval(pruneAuditLogs, 24 * 60 * 60 * 1000);

// ── JWT verification middleware ────────────────────────────
// Applies to every /api/* route except /api/login. Attaches req.user.
const requireAuth = (req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    if (req.path === '/api/login') return next();

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
        return res.status(401).json({ error: 'Missing authentication token' });
    }
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use(requireAuth);

// ── AUTHENTICATION ENDPOINT ─────────────────────────────────
app.post('/api/login', async (req, res) => {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    try {
        const validation = validateRequest(loginSchema, req.body || {});
        if (!validation.valid) {
            logAuditEvent('LOGIN_BAD_REQUEST', req.body?.userId, 'unknown', `Invalid request: ${validation.errors.map(e => e.message).join(', ')} from ${clientIp}`, 'WARN');
            return res.status(400).json({ success: false, message: 'Invalid credentials format.' });
        }
        const { userId, password, role } = validation.data;

        const stmt = db.prepare(`SELECT * FROM users WHERE id = ? OR id = ? OR empId = ?`);
        const userEntry = stmt.get(userId, `#Kalike/EMP/${userId}`, userId);

        if (!userEntry) {
            logAuditEvent('LOGIN_UNKNOWN_USER', userId, 'unknown', `Unknown identity '${userId}' from ${clientIp}`, 'WARN');
            return res.status(401).json({ success: false, message: 'Access Forbidden: Identity not found.' });
        }

        if (role && userEntry.role !== role) {
            logAuditEvent('LOGIN_WRONG_ROLE', userEntry.id, userEntry.name, `Attempted role '${role}', actual '${userEntry.role}' from ${clientIp}`, 'WARN');
            return res.status(403).json({ success: false, message: `Invalid Access: This account is not registered as a ${role}.` });
        }

        // Verify password: support both bcrypt hashes and legacy plaintext
        // rows, transparently upgrading plaintext to a hash on first login.
        let passwordOk = false;
        let upgraded = false;
        if (isBcryptHash(userEntry.password)) {
            passwordOk = await bcrypt.compare(password, userEntry.password);
        } else if (typeof userEntry.password === 'string' && userEntry.password.length > 0) {
            passwordOk = password === userEntry.password;
            if (passwordOk) {
                const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
                db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(hashed, userEntry.id);
                upgraded = true;
            }
        }

        if (!passwordOk) {
            logAuditEvent('LOGIN_FAIL', userEntry.id, userEntry.name, `Incorrect credentials from ${clientIp}`, 'WARN');
            return res.status(401).json({ success: false, message: 'Security Breach: Incorrect credentials.' });
        }

        if (upgraded) {
            logAuditEvent('PASSWORD_UPGRADED', userEntry.id, userEntry.name, 'Plaintext password transparently rehashed to bcrypt', 'INFO');
        }

        const roleStmt = db.prepare(`SELECT permissions FROM roles WHERE id = ?`);
        const roleEntry = roleStmt.get(userEntry.role);
        const rolePermissions = roleEntry ? JSON.parse(roleEntry.permissions || '[]') : [];
        const userPermissions = JSON.parse(userEntry.permissions || '[]');
        const combinedPermissions = [...new Set([...rolePermissions, ...userPermissions])];

        const authenticatedUser = {
            name: userEntry.name,
            role: userEntry.role,
            avatar: userEntry.avatar || 'https://cdn-icons-png.flaticon.com/512/147/147144.png',
            empId: userEntry.id,
            designation: userEntry.designation || '',
            location: userEntry.location || '',
            permissions: JSON.stringify(combinedPermissions),
            lastLogin: userEntry.lastLogin
        };

        const now = new Date().toISOString();
        db.prepare(`UPDATE users SET lastLogin = ? WHERE id = ?`).run(now, userEntry.id);
        authenticatedUser.lastLogin = now;

        const token = jwt.sign({ id: userEntry.id, role: authenticatedUser.role }, JWT_SECRET, { expiresIn: '8h' });
        logAuditEvent('LOGIN_SUCCESS', userEntry.id, userEntry.name, `Authenticated as '${authenticatedUser.role}' from ${clientIp}`, 'INFO');

        res.json({ success: true, token, user: authenticatedUser });

    } catch (err) {
        console.error('Login Error:', err);
        logAuditEvent('LOGIN_ERROR', null, null, `Server error: ${err.message}`, 'ERROR');
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// ── LOGOUT (audit only — JWT is stateless) ─────────────────
app.post('/api/logout', (req, res) => {
    if (req.user) {
        logAuditEvent('LOGOUT', req.user.id, req.user.id, `Session ended (role '${req.user.role}')`, 'INFO');
    }
    res.json({ success: true });
});

// ── PASSWORD CHANGE ENDPOINT ───────────────────────────────────
app.post('/api/users/:id/password', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const userId = req.params.id;
    const isOwnAccount = req.user.id === userId;
    const canChangeOthers = ELEVATED_ROLES.has(req.user.role);

    if (!isOwnAccount && !canChangeOthers) {
        logAuditEvent('AUTHZ_DENIED', req.user.id, req.user.id, `Attempted to change password for ${userId}`, 'WARN');
        return res.status(403).json({ error: 'Cannot change another user\'s password' });
    }

    try {
        const validation = validateRequest(passwordChangeSchema, req.body || {});
        if (!validation.valid) {
            return res.status(400).json({ error: 'Invalid request', details: validation.errors });
        }

        const { newPassword } = validation.data;
        const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, userId);

        logAuditEvent('PASSWORD_CHANGED', req.user.id, req.user.id, `Password changed for user ${userId}`, 'INFO');
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

// ── ORIGINAL API ENDPOINTS (Preserved) ──────────────────────
app.get('/api/assets', (req, res) => handleGet(req, res, 'assets'));
app.post('/api/assets', (req, res) => handlePost(req, res, 'assets'));
app.delete('/api/assets/:id', (req, res) => handleDelete(req, res, 'assets'));

// ── Fixed Asset Register (per-FY) ────────────────────────────
// Compute the six derived columns from the locked finance inputs. Mirrors the
// FY-aware K formula in Asset Finance.with_calc.xlsx:
//   I = F + G − H
//   K (current FY dep) — if acq FY < audit FY: rate × prior-year net block;
//                        else: rate × additions, halved for Oct–Mar acquisitions
//   L = J + K, N = L − M, P = I − N, S = R − (H − M)
const farFyOf = (isoDate) => {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;
    const m = d.getUTCMonth() + 1;
    return m >= 4 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
};
const farMonth = (isoDate) => {
    if (!isoDate) return null;
    const d = new Date(isoDate);
    return isNaN(d.getTime()) ? null : d.getUTCMonth() + 1;
};
const computeFarRow = (r) => {
    const F = Number(r.grossBlockOpening) || 0;
    const G = Number(r.additions) || 0;
    const H = Number(r.disposalsGross) || 0;
    const J = Number(r.accDepOpening) || 0;
    const M = Number(r.disposalsAccDep) || 0;
    const O = Number(r.netBlockPrevFY) || 0;
    const R = Number(r.proceedsOnDisposal) || 0;
    const C = Number(r.depRate) || 0;
    const acqFY = farFyOf(r.refinedAcqDate);
    const auditFY = Number(r.fy);

    const I = F + G - H;
    let K = 0;
    if (acqFY != null && acqFY < auditFY) {
        K = C * O;
    } else if (acqFY != null) {
        const month = farMonth(r.refinedAcqDate);
        const fullYear = month >= 4 && month <= 9;
        K = (fullYear ? C : C / 2) * G;
    }
    const L = J + K;
    const N = L - M;
    const P = I - N;
    const S = R - (H - M);
    return { ...r, I, K, L, N, P, S };
};

// GET /api/far?fy=2025 — list rows for a FY, computed cols included.
// All authenticated users can read; UI gating restricts visibility.
app.get('/api/far', (req, res) => {
    try {
        const fy = req.query.fy ? parseInt(req.query.fy, 10) : null;
        const stmt = fy
            ? db.prepare('SELECT * FROM asset_far WHERE fy = ? ORDER BY assetId')
            : db.prepare('SELECT * FROM asset_far ORDER BY fy DESC, assetId');
        const rows = fy ? stmt.all(fy) : stmt.all();
        res.json(rows.map(computeFarRow));
    } catch (err) {
        console.error('GET /api/far:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/far/years — distinct FYs present in the register, descending.
// Used by the page's FY selector. Returns [{ fy, rowCount, locked }].
app.get('/api/far/years', (req, res) => {
    try {
        const rows = db.prepare(
            `SELECT fy, COUNT(*) AS rowCount, MIN(locked) AS allLocked
             FROM asset_far GROUP BY fy ORDER BY fy DESC`
        ).all();
        res.json(rows.map(r => ({ fy: r.fy, rowCount: r.rowCount, locked: r.allLocked === 1 })));
    } catch (err) {
        console.error('GET /api/far/years:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/far — upsert a single FAR row. Body must include assetId + fy.
// Computed columns in the body are dropped; server recomputes on read.
app.post('/api/far', (req, res) => {
    if (!assertWritePermission('asset_far', req, res)) return;
    try {
        const data = req.body || {};
        if (!data.assetId || data.fy == null) {
            return res.status(400).json({ error: 'assetId and fy are required' });
        }
        const row = db.prepare('SELECT id, locked FROM asset_far WHERE assetId = ? AND fy = ?').get(data.assetId, data.fy);
        if (row && row.locked === 1) {
            return res.status(403).json({ error: 'This FY is closed and read-only' });
        }
        const id = data.id || row?.id || `far_${data.fy}_${data.assetId.replace(/[^A-Za-z0-9]/g, '_').slice(0, 60)}_${Date.now().toString(36)}`;
        const now = new Date().toISOString();
        const payload = {
            id, assetId: data.assetId, fy: Number(data.fy),
            assetClass: data.assetClass ?? null,
            description: data.description ?? null,
            location: data.location ?? null,
            purchaseOrKind: data.purchaseOrKind ?? null,
            acqDate: data.acqDate ?? null,
            supplierName: data.supplierName ?? null,
            billNo: data.billNo ?? null,
            installationDate: data.installationDate ?? null,
            datePutToUse: data.datePutToUse ?? null,
            quantity: data.quantity != null ? Number(data.quantity) || 0 : 1,
            voucherNo: data.voucherNo ?? null,
            depRate: data.depRate != null ? Number(data.depRate) : 0,
            usefulLifeYears: data.usefulLifeYears ?? null,
            refinedAcqDate: data.refinedAcqDate ?? data.acqDate ?? null,
            grossBlockOpening: Number(data.grossBlockOpening) || 0,
            additions: Number(data.additions) || 0,
            disposalsGross: Number(data.disposalsGross) || 0,
            accDepOpening: Number(data.accDepOpening) || 0,
            disposalsAccDep: Number(data.disposalsAccDep) || 0,
            netBlockPrevFY: Number(data.netBlockPrevFY) || 0,
            disposalDate: data.disposalDate ?? null,
            proceedsOnDisposal: Number(data.proceedsOnDisposal) || 0,
            donor: data.donor ?? null,
            status: data.status ?? null,
            locked: data.locked ? 1 : 0,
            createdAt: row ? undefined : now,
            updatedAt: now
        };
        const cols = Object.entries(payload).filter(([, v]) => v !== undefined);
        db.prepare(
            `INSERT OR REPLACE INTO asset_far (${cols.map(([k]) => quoteIdent(k)).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
        ).run(...cols.map(([, v]) => v));
        res.json({ success: true, id, computed: computeFarRow(payload) });
    } catch (err) {
        console.error('POST /api/far:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/far/rollover — close fromFY and open toFY (= fromFY+1).
// Each open row in fromFY: lock it, then insert a fresh toFY row with
// F ← prior I, J ← prior N, O ← prior P, additions/disposals/etc reset to 0.
// finance + director + superadmin permitted (per WRITE_ROLES.asset_far).
app.post('/api/far/rollover', (req, res) => {
    if (!assertWritePermission('asset_far', req, res)) return;
    try {
        const fromFY = parseInt(req.body?.fromFY, 10);
        if (!Number.isFinite(fromFY)) {
            return res.status(400).json({ error: 'fromFY (integer) is required' });
        }
        const toFY = fromFY + 1;
        const existing = db.prepare('SELECT COUNT(*) AS n FROM asset_far WHERE fy = ?').get(toFY);
        if (existing.n > 0) {
            return res.status(409).json({ error: `FY ${toFY}-${(toFY + 1) % 100} already exists with ${existing.n} rows` });
        }
        const rows = db.prepare('SELECT * FROM asset_far WHERE fy = ?').all(fromFY);
        if (rows.length === 0) {
            return res.status(404).json({ error: `No rows found for FY ${fromFY}-${(fromFY + 1) % 100}` });
        }

        const now = new Date().toISOString();
        const insertNext = db.prepare(`INSERT INTO asset_far (
            id, assetId, fy, assetClass,
            description, location, purchaseOrKind,
            acqDate, supplierName, billNo, installationDate, datePutToUse,
            quantity, voucherNo, depRate, usefulLifeYears,
            refinedAcqDate,
            grossBlockOpening, additions, disposalsGross,
            accDepOpening, disposalsAccDep, netBlockPrevFY,
            disposalDate, proceedsOnDisposal, donor, status, locked, createdAt, updatedAt
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        const lockOld = db.prepare('UPDATE asset_far SET locked = 1, updatedAt = ? WHERE id = ?');

        const tx = db.transaction(() => {
            for (const old of rows) {
                const computed = computeFarRow(old);
                // Drop fully-disposed assets from the new FY (closing net block 0 and status Disposed)
                if ((old.status || '').toLowerCase() === 'disposed' && computed.P <= 0.01) {
                    lockOld.run(now, old.id);
                    continue;
                }
                insertNext.run(
                    `far_${toFY}_${old.assetId.replace(/[^A-Za-z0-9]/g, '_').slice(0, 60)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
                    old.assetId, toFY, old.assetClass,
                    old.description, old.location, old.purchaseOrKind,
                    old.acqDate, old.supplierName, old.billNo, old.installationDate, old.datePutToUse,
                    old.quantity, old.voucherNo, old.depRate, old.usefulLifeYears,
                    old.refinedAcqDate,
                    computed.I,            // new F = prior closing gross
                    0, 0,                  // additions, disposalsGross reset
                    computed.N,            // new J = prior closing acc dep
                    0,                     // disposalsAccDep reset
                    computed.P,            // new O = prior net block
                    null, 0,               // disposalDate, proceedsOnDisposal reset
                    old.donor, old.status,
                    0, now, now
                );
                lockOld.run(now, old.id);
            }
        });
        tx();

        logAuditEvent(
            'FAR_ROLLOVER',
            req.user.id, req.user.id,
            `Closed FY ${fromFY}-${(fromFY + 1) % 100} and opened FY ${toFY}-${(toFY + 1) % 100} (${rows.length} rows processed)`,
            'INFO'
        );
        res.json({ success: true, fromFY, toFY, rowCount: rows.length });
    } catch (err) {
        console.error('POST /api/far/rollover:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/far/:id/archive — soft-delete with password confirmation.
// The row is copied into asset_far_archive (with archivedBy/archivedAt/reason)
// and only then removed from asset_far. The caller must supply their current
// password so an unattended session can't be used to wipe rows.
app.post('/api/far/:id/archive', async (req, res) => {
    if (!assertWritePermission('asset_far', req, res)) return;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    try {
        const { password, reason } = req.body || {};
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ error: 'Password is required to archive a row.' });
        }
        const user = db.prepare('SELECT id, password FROM users WHERE id = ?').get(req.user.id);
        if (!user || !user.password) {
            logAuditEvent('FAR_ARCHIVE_DENIED', req.user.id, req.user.id, `Password verify failed (no user record) from ${clientIp}`, 'WARN');
            return res.status(401).json({ error: 'Password verification failed.' });
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            logAuditEvent('FAR_ARCHIVE_DENIED', req.user.id, req.user.id, `Bad password while archiving FAR ${req.params.id} from ${clientIp}`, 'WARN');
            return res.status(401).json({ error: 'Incorrect password.' });
        }

        const row = db.prepare('SELECT * FROM asset_far WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Row not found.' });
        if (row.locked === 1) return res.status(403).json({ error: 'Row is locked (FY closed) and cannot be archived.' });

        const now = new Date().toISOString();
        const archiveId = `arch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const insertArchive = db.prepare(`INSERT INTO asset_far_archive (
            archiveId, originalId, assetId, fy, assetClass,
            description, location, purchaseOrKind,
            acqDate, supplierName, billNo, installationDate, datePutToUse,
            quantity, voucherNo, depRate, usefulLifeYears,
            refinedAcqDate,
            grossBlockOpening, additions, disposalsGross,
            accDepOpening, disposalsAccDep, netBlockPrevFY,
            disposalDate, proceedsOnDisposal, donor, status,
            locked, createdAt, updatedAt, archivedBy, archivedAt, archiveReason
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
        const tx = db.transaction(() => {
            insertArchive.run(
                archiveId, row.id, row.assetId, row.fy, row.assetClass,
                row.description, row.location, row.purchaseOrKind,
                row.acqDate, row.supplierName, row.billNo, row.installationDate, row.datePutToUse,
                row.quantity, row.voucherNo, row.depRate, row.usefulLifeYears,
                row.refinedAcqDate,
                row.grossBlockOpening, row.additions, row.disposalsGross,
                row.accDepOpening, row.disposalsAccDep, row.netBlockPrevFY,
                row.disposalDate, row.proceedsOnDisposal, row.donor, row.status,
                row.locked, row.createdAt, row.updatedAt,
                req.user.id, now, (reason || '').toString().slice(0, 500)
            );
            db.prepare('DELETE FROM asset_far WHERE id = ?').run(req.params.id);
        });
        tx();

        logAuditEvent(
            'FAR_ARCHIVED', req.user.id, req.user.id,
            `Archived ${row.assetId} (FY ${row.fy}-${(row.fy + 1) % 100}) reason="${(reason || '').toString().slice(0, 200)}" from ${clientIp}`,
            'INFO'
        );
        res.json({ success: true, archiveId });
    } catch (err) {
        console.error('POST /api/far/:id/archive:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/far/archive — list archived rows (most recent first).
// Same write-roles gate (finance + superadmin) reused for visibility.
app.get('/api/far/archive', (req, res) => {
    if (!assertWritePermission('asset_far', req, res)) return;
    try {
        const fy = req.query.fy ? parseInt(req.query.fy, 10) : null;
        const stmt = fy
            ? db.prepare('SELECT * FROM asset_far_archive WHERE fy = ? ORDER BY archivedAt DESC')
            : db.prepare('SELECT * FROM asset_far_archive ORDER BY archivedAt DESC LIMIT 500');
        res.json(fy ? stmt.all(fy) : stmt.all());
    } catch (err) {
        console.error('GET /api/far/archive:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/far/:id — legacy hard-delete kept for the rollover path only.
// UI no longer calls this; new archive endpoint above is the supported flow.
app.delete('/api/far/:id', (req, res) => {
    if (!assertWritePermission('asset_far', req, res)) return;
    try {
        const row = db.prepare('SELECT locked FROM asset_far WHERE id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Not found' });
        if (row.locked === 1) return res.status(403).json({ error: 'Row is locked (FY closed)' });
        db.prepare('DELETE FROM asset_far WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/far:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/far/export?fy=2025 — XLSX matching the source register layout.
// Column K carries the live FY-aware formula so it auto-rolls when reopened.
app.get('/api/far/export', async (req, res) => {
    try {
        const fy = parseInt(req.query.fy, 10);
        if (!Number.isFinite(fy)) {
            return res.status(400).json({ error: 'fy (integer) is required' });
        }
        const rows = db.prepare('SELECT * FROM asset_far WHERE fy = ? ORDER BY assetId').all(fy);

        const wb = new ExcelJS.Workbook();
        wb.creator = 'Kalike Asset App';
        wb.created = new Date();
        const ws = wb.addWorksheet(`FAR FY ${fy}-${String((fy + 1) % 100).padStart(2, '0')}`);

        // 30-column header layout, A..AD — matches the source registers.
        // Letters: 1=A Asset ID … 13=M Dep Rate (used by K-formula) …
        //          15=O Gross Opening, 16=P Additions, 17=Q Disposals,
        //          18=R Closing A (formula), 19=S Acc Dep Opening, 20=T Dep Cost (formula),
        //          21=U Acc Dep Total (formula), 22=V Disposals Acc Dep,
        //          23=W Closing B (formula), 24=X Net Block Prev FY,
        //          25=Y Net Block This FY (formula), 26=Z Disposal Date,
        //          27=AA Proceeds, 28=AB Profit/Loss (formula), 29=AC Donor, 30=AD Status
        const headers = [
            'Asset Identification Number',
            'Asset class',
            'Description',
            'Location',
            'Whether purchased / received in kind',
            'Acquisition Date',
            'Supplier Name',
            'Bill No.',
            'Date of Installation',
            'Date put to use',
            'Quantity',
            'Voucher No.',
            'Depreciation Rate',
            'Useful life (years)',
            'Gross Block Opening Balance',
            'Additions',
            'Disposals',
            'Closing Balance    A',
            'Acc. Depreciation Opening Balance',
            'Depreciation - Cost (FY)',
            'Depreciation - Total',
            'Disposals',
            'Closing Balance    B',
            'Net Block (A-B) Prev FY',
            'Net Block (A-B) This FY',
            'Disposal Date',
            'Proceeds on Disposal',
            'Profit / (Loss) on Disposal',
            'Donor Name',
            'Status'
        ];
        ws.addRow(headers);

        const CURR_FY = `IF(MONTH(TODAY())>=4,YEAR(TODAY())-1,YEAR(TODAY())-2)`;
        // K (depreciation for the year) lives in column T (col 20). Uses F=col 6 acq date,
        // M=col 13 dep rate, P=col 16 additions, X=col 24 net block prev FY.
        const kFormula = (r) =>
            `IF(IF(MONTH(F${r})>=4,YEAR(F${r}),YEAR(F${r})-1)<${CURR_FY},M${r}*X${r},` +
            `IF(AND(MONTH(F${r})>=4,MONTH(F${r})<=9),M${r}*P${r},(M${r}/2)*P${r}))`;

        rows.map(r => computeFarRow(r)).forEach((r, idx) => {
            const rowNum = idx + 2;
            ws.addRow([
                r.assetId,
                r.assetClass || '',
                r.description || '',
                r.location || '',
                r.purchaseOrKind || '',
                r.acqDate || '',
                r.supplierName || '',
                r.billNo || '',
                r.installationDate || '',
                r.datePutToUse || '',
                Number(r.quantity) || 0,
                r.voucherNo || '',
                Number(r.depRate) || 0,
                r.usefulLifeYears || '',
                Number(r.grossBlockOpening) || 0,
                Number(r.additions) || 0,
                Number(r.disposalsGross) || 0,
                { formula: `O${rowNum}+P${rowNum}-Q${rowNum}`, result: r.I },
                Number(r.accDepOpening) || 0,
                { formula: kFormula(rowNum), result: r.K },
                { formula: `S${rowNum}+T${rowNum}`, result: r.L },
                Number(r.disposalsAccDep) || 0,
                { formula: `U${rowNum}-V${rowNum}`, result: r.N },
                Number(r.netBlockPrevFY) || 0,
                { formula: `R${rowNum}-W${rowNum}`, result: r.P },
                r.disposalDate || '',
                Number(r.proceedsOnDisposal) || 0,
                { formula: `AA${rowNum}-(Q${rowNum}-V${rowNum})`, result: r.S },
                r.donor || '',
                r.status || ''
            ]);
        });

        // Header style
        const head = ws.getRow(1);
        head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        head.alignment = { horizontal: 'center', wrapText: true };
        head.height = 36;

        const moneyCols = ['O','P','Q','R','S','T','U','V','W','X','Y','AA','AB'];
        moneyCols.forEach(c => { ws.getColumn(c).numFmt = '#,##0.00'; });
        ws.getColumn('M').numFmt = '0.00%';
        ws.getColumn('K').numFmt = '0';
        ws.getColumn('A').width = 32;
        ws.getColumn('B').width = 22;
        ws.getColumn('C').width = 28;
        ws.getColumn('D').width = 16;
        ws.getColumn('E').width = 14;
        ['F','I','J','Z'].forEach(c => { ws.getColumn(c).width = 12; });
        ws.getColumn('G').width = 22;
        ws.getColumn('H').width = 14;
        ws.getColumn('K').width = 10;
        ws.getColumn('L').width = 14;
        ws.getColumn('M').width = 10;
        ws.getColumn('N').width = 14;
        moneyCols.forEach(c => { ws.getColumn(c).width = 16; });
        ws.getColumn('AC').width = 18;
        ws.getColumn('AD').width = 14;
        ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="Asset_FAR_FY${fy}-${String((fy + 1) % 100).padStart(2, '0')}.xlsx"`);
        const buf = await wb.xlsx.writeBuffer();
        res.end(Buffer.from(buf));
    } catch (err) {
        console.error('GET /api/far/export:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/grants', (req, res) => handleGet(req, res, 'grants'));
app.post('/api/grants', (req, res) => handlePost(req, res, 'grants'));

app.get('/api/transfers', (req, res) => handleGet(req, res, 'transfers'));
app.post('/api/transfers', (req, res) => handlePost(req, res, 'transfers'));

app.get('/api/requests', (req, res) => handleGet(req, res, 'requests'));
app.post('/api/requests', (req, res) => handlePost(req, res, 'requests'));

app.get('/api/maint', (req, res) => handleGet(req, res, 'maint'));
app.post('/api/maint', (req, res) => handlePost(req, res, 'maint'));

app.get('/api/users', (req, res) => handleGet(req, res, 'users'));
app.post('/api/users', (req, res) => handlePost(req, res, 'users'));

app.get('/api/audit', (req, res) => handleGet(req, res, 'audit_logs'));
app.post('/api/audit', (req, res) => handlePost(req, res, 'audit_logs'));

// ── NEW MODULE ENDPOINTS ────────────────────────────────────

// Worklogs
app.get('/api/worklogs', (req, res) => handleGet(req, res, 'worklogs'));
app.post('/api/worklogs', (req, res) => handlePost(req, res, 'worklogs'));
app.delete('/api/worklogs/:id', (req, res) => handleDelete(req, res, 'worklogs'));

// Tasks
app.get('/api/tasks', (req, res) => handleGet(req, res, 'tasks'));
app.post('/api/tasks', (req, res) => handlePost(req, res, 'tasks'));
app.delete('/api/tasks/:id', (req, res) => handleDelete(req, res, 'tasks'));

// Leaves
app.get('/api/leaves', (req, res) => handleGet(req, res, 'leaves'));
app.post('/api/leaves', (req, res) => handlePost(req, res, 'leaves'));
app.delete('/api/leaves/:id', (req, res) => handleDelete(req, res, 'leaves'));

// Leave Balances
app.get('/api/leave-balances', (req, res) => handleGet(req, res, 'leave_balances'));
app.post('/api/leave-balances', (req, res) => handlePost(req, res, 'leave_balances'));

// Reimbursements
app.get('/api/reimbursements', (req, res) => handleGet(req, res, 'reimbursements'));
app.post('/api/reimbursements', (req, res) => handlePost(req, res, 'reimbursements'));
app.delete('/api/reimbursements/:id', (req, res) => handleDelete(req, res, 'reimbursements'));

// Payroll
app.get('/api/payroll', (req, res) => handleGet(req, res, 'payroll'));
app.post('/api/payroll', (req, res) => handlePost(req, res, 'payroll'));
app.delete('/api/payroll/:id', (req, res) => handleDelete(req, res, 'payroll'));

// Procurement (Enhanced)
app.get('/api/procurement', (req, res) => handleGet(req, res, 'procurement'));
app.post('/api/procurement', (req, res) => handlePost(req, res, 'procurement'));
app.delete('/api/procurement/:id', (req, res) => handleDelete(req, res, 'procurement'));

// Attendance
app.get('/api/attendance', (req, res) => handleGet(req, res, 'attendance'));
app.post('/api/attendance', (req, res) => handlePost(req, res, 'attendance'));

// Employee Hierarchy
app.get('/api/hierarchy', (req, res) => handleGet(req, res, 'employee_hierarchy'));
app.post('/api/hierarchy', (req, res) => handlePost(req, res, 'employee_hierarchy'));
app.delete('/api/hierarchy/:id', (req, res) => handleDelete(req, res, 'employee_hierarchy'));

// Notifications
app.get('/api/notifications', (req, res) => handleGet(req, res, 'notifications'));
app.post('/api/notifications', (req, res) => handlePost(req, res, 'notifications'));
app.delete('/api/notifications/:id', (req, res) => handleDelete(req, res, 'notifications'));

// Mark notification as read
app.put('/api/notifications/:id/read', (req, res) => {
    try {
        db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Document Vault
app.get('/api/documents', (req, res) => handleGet(req, res, 'documents'));
app.post('/api/documents', (req, res) => handlePost(req, res, 'documents'));
app.delete('/api/documents/:id', (req, res) => handleDelete(req, res, 'documents'));

// Announcements
app.get('/api/announcements', (req, res) => handleGet(req, res, 'announcements'));
app.post('/api/announcements', (req, res) => handlePost(req, res, 'announcements'));
app.delete('/api/announcements/:id', (req, res) => handleDelete(req, res, 'announcements'));

// Announcement Reads
app.get('/api/announcement_reads', (req, res) => handleGet(req, res, 'announcement_reads'));
app.post('/api/announcement_reads', (req, res) => handlePost(req, res, 'announcement_reads'));

// Calendar Events
app.get('/api/calendar_events', (req, res) => handleGet(req, res, 'calendar_events'));
app.post('/api/calendar_events', (req, res) => handlePost(req, res, 'calendar_events'));
app.delete('/api/calendar_events/:id', (req, res) => handleDelete(req, res, 'calendar_events'));

// Performance Reviews
app.get('/api/performance_reviews', (req, res) => handleGet(req, res, 'performance_reviews'));
app.post('/api/performance_reviews', (req, res) => handlePost(req, res, 'performance_reviews'));
app.delete('/api/performance_reviews/:id', (req, res) => handleDelete(req, res, 'performance_reviews'));

// Institutional Communication Logs (Alerts)
app.get('/api/communication_logs', (req, res) => handleGet(req, res, 'communication_logs'));
app.post('/api/communication_logs', (req, res) => handlePost(req, res, 'communication_logs'));

// Digital Signatures
app.get('/api/signatures', (req, res) => handleGet(req, res, 'signatures'));
app.post('/api/signatures', (req, res) => handlePost(req, res, 'signatures'));

// Governance Roles
app.get('/api/roles', (req, res) => handleGet(req, res, 'roles'));
app.post('/api/roles', (req, res) => handlePost(req, res, 'roles'));
app.delete('/api/roles/:id', (req, res) => handleDelete(req, res, 'roles'));

// Social Accounts (superadmin-writable per WRITE_ROLES; everyone reads).
app.get('/api/social_accounts', (req, res) => handleGet(req, res, 'social_accounts'));
app.post('/api/social_accounts', (req, res) => handlePost(req, res, 'social_accounts'));
app.delete('/api/social_accounts/:id', (req, res) => handleDelete(req, res, 'social_accounts'));

// YouTube RSS proxy. Reads the first active social_accounts row with
// platform='youtube' AND non-empty youtubeChannelId, fetches the public
// XML feed, parses entries, and returns last 12 videos. Cached 30 min.
const _ytCache = { data: null, fetchedAt: 0, channelId: null };
const _YT_CACHE_TTL_MS = 30 * 60 * 1000;
function parseYoutubeRss(xml) {
    const blocks = xml.split('<entry>').slice(1).map(s => s.split('</entry>')[0]);
    const grab = (block, tag) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return m ? m[1].trim() : '';
    };
    const grabAttr = (block, tag, attr) => {
        const m = block.match(new RegExp(`<${tag}[^>]*\\b${attr}=["']([^"']+)["']`));
        return m ? m[1] : '';
    };
    return blocks.map(b => {
        const videoId = grab(b, 'yt:videoId');
        return {
            videoId,
            title: grab(b, 'title'),
            publishedAt: grab(b, 'published'),
            thumbnail: grabAttr(b, 'media:thumbnail', 'url')
                || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''),
            url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''
        };
    }).filter(v => v.videoId).slice(0, 12);
}

app.get('/api/social/youtube', async (req, res) => {
    try {
        const row = db.prepare(
            `SELECT youtubeChannelId FROM social_accounts
             WHERE platform = 'youtube' AND isActive = 1
               AND youtubeChannelId IS NOT NULL AND youtubeChannelId != ''
             ORDER BY displayOrder ASC LIMIT 1`
        ).get();
        if (!row || !row.youtubeChannelId) {
            return res.json({ videos: [], reason: 'no_channel_configured' });
        }
        const channelId = row.youtubeChannelId;
        if (_ytCache.data && _ytCache.channelId === channelId
            && (Date.now() - _ytCache.fetchedAt) < _YT_CACHE_TTL_MS) {
            return res.json(_ytCache.data);
        }
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
        const resp = await fetch(rssUrl);
        if (!resp.ok) {
            return res.status(502).json({ videos: [], error: `YouTube feed unreachable (${resp.status})` });
        }
        const xml = await resp.text();
        const payload = { videos: parseYoutubeRss(xml), channelId };
        _ytCache.data = payload;
        _ytCache.fetchedAt = Date.now();
        _ytCache.channelId = channelId;
        res.json(payload);
    } catch (err) {
        console.error('GET /api/social/youtube:', err);
        res.status(500).json({ videos: [], error: 'YouTube feed error' });
    }
});

// Mark all notifications read for a user
app.put('/api/notifications/read-all/:userId', (req, res) => {
    try {
        db.prepare('UPDATE notifications SET isRead = 1 WHERE recipientId = ?').run(req.params.userId);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── SYNC ENDPOINT (Updated) ─────────────────────────────────
app.post('/api/sync', (req, res) => {
    const {
        assets, grants, maintenanceLogs, requests, transfers, auditLogs, users,
        worklogs, tasks, leaves, leaveBalances, reimbursements, payroll,
        procurement, attendance, hierarchy, notifications,
        documents, announcements, announcementReads, calendarEvents, performanceReviews, communicationLogs, signatures, roles
    } = req.body;

    const syncTable = (table, data) => {
        if (!data || !Array.isArray(data)) return;
        if (!ALLOWED_TABLES.has(table)) {
            console.warn(`Sync rejected unknown table: ${table}`);
            return;
        }
        const allowed = getAllowedColumns(table);
        const deleteStmt = db.prepare(`DELETE FROM ${quoteIdent(table)}`);
        const buildInsert = (item) => {
            const keys = Object.keys(item).filter(k => allowed.has(k));
            if (keys.length === 0) return null;
            const columns = keys.map(quoteIdent).join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            return {
                stmt: db.prepare(`INSERT INTO ${quoteIdent(table)} (${columns}) VALUES (${placeholders})`),
                values: keys.map(k => item[k])
            };
        };

        const transaction = db.transaction((items) => {
            deleteStmt.run();
            for (const item of items) {
                try {
                    const built = buildInsert(item);
                    if (built) built.stmt.run(...built.values);
                } catch (e) {
                    console.warn(`Sync skip row in ${table}:`, e.message);
                }
            }
        });
        transaction(data);
    };

    try {
        syncTable('assets', assets);
        syncTable('grants', grants);
        syncTable('maint', maintenanceLogs);
        syncTable('requests', requests);
        syncTable('transfers', transfers);
        syncTable('audit_logs', auditLogs);
        syncTable('users', users);
        syncTable('worklogs', worklogs);
        syncTable('tasks', tasks);
        syncTable('leaves', leaves);
        syncTable('leave_balances', leaveBalances);
        syncTable('reimbursements', reimbursements);
        syncTable('payroll', payroll);
        syncTable('procurement', procurement);
        syncTable('attendance', attendance);
        syncTable('employee_hierarchy', hierarchy);
        syncTable('notifications', notifications);
        syncTable('documents', documents);
        syncTable('announcements', announcements);
        syncTable('announcement_reads', announcementReads);
        syncTable('calendar_events', calendarEvents);
        syncTable('performance_reviews', performanceReviews);
        syncTable('communication_logs', communicationLogs);
        syncTable('signatures', signatures);
        syncTable('roles', roles);
        res.json({ success: true });
    } catch (err) {
        console.error('Sync Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Serve Vite production build in production (Koyeb / any single-server deploy)
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
    }
}

const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, () => {
    console.log(`Kalike Unified Workspace server running at http://localhost:${PORT}`);
});
