import 'dotenv/config.js';
import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

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
    'performance_reviews', 'communication_logs', 'signatures', 'roles'
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
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

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

// Users last login
safeAddColumn('users', 'lastLogin', 'TEXT');

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
    announcements:      new Set(['superadmin', 'hr', 'director', 'manager']),
    performance_reviews:new Set(['superadmin', 'hr', 'director', 'manager']),
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

const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, () => {
    console.log(`Kalike Unified Workspace server running at http://localhost:${PORT}`);
});
