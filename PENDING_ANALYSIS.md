# Kalike Asset Management — Pending Work & Improvements Analysis

## ✅ SETUP STATUS

| Tool | Status | Notes |
|------|--------|-------|
| **sigmap MCP** | ✅ Registered | Active, connects on use |
| **graphify** | ✅ Installed | `graphify-out/` exists with AST cache |
| **caveman** | ✅ Available | Skill installed, ready for compression |
| **.claude/settings** | ✅ Configured | Permissions allowlist in place |

---

## 📋 PENDING TASKS (from CLAUDE.md, priority order)

### 1. **Request Validation** — Add zod (or similar) at server boundary
- **Why**: Current handlers trust request shape, no schema enforcement
- **Impact**: Medium — security/data integrity
- **Effort**: ~2h
- **Status**: Not started
- **How**: Add zod to `server.js` handlers, validate before CRUD

### 2. **Dedicated Password-Change Endpoint**
- **Why**: Generic `/api/users` POST strips `password` field; admins can't reset user passwords via API
- **Impact**: High — UX/admin tooling
- **Effort**: ~1h
- **Status**: Not started
- **How**: Build `/api/users/:id/password` endpoint, bcrypt hash before store

### 3. **Code-Split Bundle** — 552 KB warning from Vite
- **Why**: Single monolithic bundle, slow initial load
- **Impact**: Medium — frontend performance
- **Effort**: ~3h
- **Status**: Not started
- **How**: Dynamic import for heavy pages (Payroll, AnalyticsDashboard, ReportsEngine)

### 4. **Audit Log Retention Policy**
- **Why**: `audit_logs` unbounded growth
- **Impact**: Low-medium — database size/query performance
- **Effort**: ~1h
- **Status**: Not started
- **How**: Add periodic prune or rotate-to-archive logic

### 5. **Wire dotenv** — `.env` not auto-loading
- **Why**: Manual shell exports or `node --env-file=.env` workaround
- **Impact**: Low — DX friction
- **Effort**: ~15min
- **Status**: Not started
- **How**: Add `dotenv` package, `require('dotenv').config()` in `server.js`

### 6. **Manager Visibility on Team Data**
- **Why**: `manager` role only sees own rows on private tables; needs to see reports' tasks/worklogs/reviews
- **Impact**: High — core business logic
- **Effort**: ~2h
- **Status**: Not started
- **How**: Add `reportsTo` lookup or `WHERE assignedTo IN (SELECT id FROM users WHERE reportsTo = req.user.id)`

---

## 🔍 OBSERVED IMPROVEMENTS (from code state)

### Recent Wins (Last 5 commits)
1. ✅ Layout animation optimization (`262d4fe`)
2. ✅ Modal DOM fix for consistent rendering (`f372dd2`)
3. ✅ Asset Registry quick-action buttons (`9405205`)
4. ✅ Grant modal + DB flow (`3d8d97d`)

### Areas for Enhancement
- **Error boundaries**: Pages don't trap async errors gracefully; failed API calls surface via `alert()` only
- **Type safety**: No TypeScript/JSDoc; manual prop validation in page render functions
- **Tests**: No test suite observed in codebase
- **Accessibility**: No a11y audit; modals may lack focus management/ARIA labels
- **Mobile responsiveness**: Tailwind v4 used; worth testing breakpoints
- **Caching strategy**: `AssetDB` in-memory cache can drift; no explicit invalidation strategy
- **Rate limiting**: No rate limit on `/api/*` endpoints
- **Input sanitization**: No explicit XSS/injection prevention (besides SQLite parameterization)

---

## 📊 CURRENT CODEBASE STATE

- **Frontend**: 35 pages, ~552 KB bundled (warning from Vite)
- **Backend**: Single `server.js`, ~1000+ lines, schema in `src/mock/schema.sql`
- **Database**: `better-sqlite3` WAL mode, schema-safe migrations
- **Auth**: JWT + bcryptjs, role-based WRITE_ROLES matrix, per-row privacy on PRIVATE_TABLES
- **Recent refactor** (2026-05-22): Security hardening — bcrypt, no god-mode, table/column whitelist

---

## 🎯 QUICK WINS (< 1h each)
1. Wire dotenv for cleaner `.env` loading
2. Add Audit log archive/cleanup cron
3. Document missing endpoints (e.g., password-change API spec)
4. Add ESLint rule to catch hardcoded secrets

---

## 📌 RISK / KNOWN SHARP EDGES
- Frontend cache (`AssetDB`) drift after mutations
- `RAW_EMPLOYEES` from JSON still exported but legacy
- 50 MB JSON body limit on Express (set for backup restore)
- Tokens in `localStorage` — XSS = account takeover
- No 401 auto-refresh in browser; full page reload required after login

---

## 🔗 MCP / TOOL ECOSYSTEM
- **sigmap**: ✅ Registered (code context)
- **graphify**: ✅ Available (knowledge graphs) — `graphify-out/` cache exists
- **caveman**: ✅ Available (response compression)
- **.claude/settings.local.json**: ✅ Configured with allowed Bash/npm/node commands
