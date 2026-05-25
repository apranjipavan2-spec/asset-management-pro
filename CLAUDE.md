# Kalike Asset Management System

Institutional asset & workspace management app for Kalike — covers asset registry, depreciation, transfers, requests, maintenance plus a broader HR/payroll/procurement workspace.

## Stack

- **Frontend**: Vanilla JS, Vite 8, Tailwind v4 (no framework — hand-rolled class-based router in `src/main.js`)
- **Backend**: Express 5 + `better-sqlite3` (WAL mode), JWT auth, bcryptjs password hashing
- **Single database file**: `db.sqlite` at repo root (gitignored)

## Commands

| Command | Purpose |
|---|---|
| `npm run dev:full` | Start API (port 3000) **and** Vite dev server concurrently — the normal dev loop |
| `npm run dev` | Vite only (proxies `/api` → `localhost:3000`) |
| `npm run server` | Express only |
| `npm run build` | Production build to `dist/` |
| `npm run db:init` | Rebuild `db.sqlite` from scratch (deletes existing DB, seeds from CSV + JSON fixtures) |
| `npm run db:hash-passwords` | One-time migration: bcrypt-hash any plaintext passwords still in `users.password` |
| `npm run db:restore-employee-passwords` | Re-apply legacy `<id-suffix>+<first 5 of name>` formula for all role=employee users |

Other one-off scripts live in `scripts/` (e.g. `export_users.js`, `normalize_assets.cjs`, `fetch_logo.js`) — run with `node scripts/<file>`. **Always run from the repo root**; scripts use cwd-relative paths like `./db.sqlite`.

## Environment

Copy `.env.example` → `.env` and fill in:
- `JWT_SECRET` — required in production. Server warns at startup if missing.
- `PORT` — optional, defaults to 3000.

Note: there is no `dotenv` loader wired in. Either export env vars in your shell before `npm run server`, or run via a wrapper that loads `.env` (e.g. `node --env-file=.env server.js` on Node 20+).

## Architecture

### Frontend (`src/`)
- `main.js` — `AssetApp` class is the whole router/shell. Pages are render functions returning HTML strings; they mutate DOM via `window.app.*` event handlers. Mounted via `<script type="module">` in `index.html`.
- `pages/*.js` — 35 page modules. Each exports a `renderXxx(user)` function. Add a new page by importing it in `main.js` and adding a route in the `render()` switch.
- `mock/db.js` — `AssetDB` is an in-memory client-side cache, hydrated from the server via `StorageAdapter.fetchCollection()`. **Important**: the frontend keeps a parallel mirror of server data; treat the server as source of truth and let `db` rehydrate after writes.
- `css/style.css` — Tailwind v4 directives + custom animations.

### Backend (`server.js`)
- All endpoints under `/api/*`.
- Generic CRUD: `handleGet` / `handlePost` / `handleDelete` are bound per-table, e.g. `app.get('/api/assets', (req,res) => handleGet(req,res,'assets'))`.
- `/api/login` — only auth endpoint. Returns `{ success, token, user }` with permissions merged from `roles` + `users` rows.
- `/api/sync` — bulk replace-all for offline-sync restore.

### Data layer
- Schema: `src/mock/schema.sql` (loaded on server start; safe migrations via `safeAddColumn` in `server.js`).
- Seed fixtures: `src/mock/real_assets.json`, `grants.json`, `employees.json`.
- User seed source: `login_credentials_master.csv` (gitignored — never commit).

## Security model — read before touching auth or CRUD

These invariants matter; please don't regress them:

1. **No GodMode / master passwords.** All login goes through `/api/login` which does a bcrypt compare against the `users.password` column. The plaintext fallbacks (`assetpavan`, `financepavan`, derived `id+name` employee passwords) were removed.
2. **Passwords are bcrypt-hashed at rest.** `isBcryptHash()` in `server.js` detects legacy plaintext rows and transparently upgrades them on first successful login. New users seeded via `initialize_sqlite.js` are hashed at insert.
3. **CRUD handlers whitelist tables and columns.** `ALLOWED_TABLES` is the authoritative list in `server.js`. To expose a new table, add it there. Dynamic columns are filtered against `PRAGMA table_info(...)` per request — unknown keys are dropped, not appended.
4. **Generic POST to `/api/users` cannot write `password`.** Password changes must go through a dedicated endpoint (not yet built). If you need user-password admin tooling, build a new endpoint that hashes before storing.
5. **`JWT_SECRET` is env-overridable** (`process.env.JWT_SECRET`). Production must set this; the hardcoded fallback is dev-only and prints a startup warning.
6. **Role-based write gating.** `WRITE_ROLES` in `server.js` declares which roles may POST/DELETE to high-sensitivity tables. Denials are audit-logged as `AUTHZ_DENIED`.
7. **Per-row privacy on personal tables.** `PRIVATE_TABLES` in `server.js` maps a table to its owner column (e.g. `payroll → empId`, `tasks → assignedTo`, `notifications → recipientId`). For users not in `ELEVATED_ROLES` (superadmin/hr/finance/director), `GET` returns only rows where the owner column matches `req.user.id`, and `POST` force-stamps the owner column with `req.user.id`. Attempting to write a row owned by another user returns 403 and is audit-logged.

### Role × table write matrix

| Table | Roles allowed to write |
|---|---|
| `users` | superadmin, hr, director |
| `roles` | superadmin |
| `payroll` | superadmin, hr, finance, director |
| `leave_balances` | superadmin, hr, director |
| `employee_hierarchy` | superadmin, hr, director |
| `grants` | superadmin, finance, director |
| `announcements` | superadmin, hr, director, manager |
| `performance_reviews` | superadmin, hr, director, manager |
| `audit_logs` | superadmin, director (mostly server-written) |

Anything not in this table accepts writes from any authenticated user. To restrict a new table, add it to `WRITE_ROLES` in `server.js`.

## Files that must never be committed

Already in `.gitignore`, but worth knowing:
- `db.sqlite`, `db.sqlite-shm`, `db.sqlite-wal` — local dev DB
- `login_credentials_master.csv`, `employee_data_setup.csv` — seed credentials
- `*.xlsx`, `*.xls` — data exports (raw asset registers from finance)
- `KALIKE_HISTORY.html` — backup HTML snapshot
- `scratch/`, `graphify-out/`, `.agent/` — generated/scratch dirs

If you need to share seed data, sanitise it and add an `.example` variant.

## Conventions

- **No framework, no JSX.** Pages return template-literal HTML strings. Event handlers go on `window.*` or `app.*` so inline `onclick="app.foo()"` works.
- **No build-time TypeScript.** Plain ES modules everywhere.
- **Tailwind v4** (no `tailwind.config.js`) — utility classes inline.
- **Modal pattern**: append to `document.body`, give a unique id, remove on close. See `SignaturePad.js` for the canonical implementation (the recent `f372dd2` fix made this consistent across the app).
- **API errors**: `.then(...).catch(...)` everywhere; surface failures to the user via `alert()` or an inline error div — never swallow silently.

## Known sharp edges

- The frontend `AssetDB` in-memory cache can drift from server state. After mutating writes, prefer reloading the page or re-fetching the affected collection rather than reasoning about cache invalidation.
- `RAW_EMPLOYEES` (from `src/mock/employees.json`) is still exported by `db.js` but no longer used for login. Some pages may still reference it for org-chart-style lookups — grep before removing.
- 50 MB JSON body limit on Express (`server.js:17`) — set high to support backup-restore via `/api/sync`. Keep that in mind if you ever expose this beyond LAN.
- Tokens are stored in `localStorage` (`amp_token`) — XSS therefore equals account takeover. Audit any new third-party script tags carefully.
- The browser-side `AssetDB` does not refresh after a 401 redirect; rely on the full page reload that login triggers.

## Auth flow

1. User submits `/api/login` with `{ userId, password, role? }`.
2. Server bcrypt-compares (or upgrades plaintext), returns `{ token, user }`.
3. Frontend stores `amp_user` + `amp_token` in `localStorage`.
4. `StorageAdapter.authFetch()` attaches `Authorization: Bearer <token>` to every `/api/*` call.
5. `requireAuth` middleware in `server.js` verifies the JWT and attaches `req.user` to all routes except `/api/login`. A 401 from any call clears `localStorage` and bounces to login.
6. `/api/logout` is fire-and-forget — JWT is stateless, the call only writes an audit row.

## Audit events written by the server

| Action | Level | Triggered when |
|---|---|---|
| `LOGIN_SUCCESS` | INFO | Successful auth |
| `LOGIN_FAIL` | WARN | Wrong password |
| `LOGIN_UNKNOWN_USER` | WARN | Unknown `userId` |
| `LOGIN_WRONG_ROLE` | WARN | Role param doesn't match DB role |
| `LOGIN_BAD_REQUEST` | WARN | Missing credentials |
| `LOGIN_ERROR` | ERROR | Internal exception during auth |
| `PASSWORD_UPGRADED` | INFO | Plaintext password silently rehashed to bcrypt |
| `LOGOUT` | INFO | Explicit logout call |
| `AUTHZ_DENIED` | WARN | Authenticated user attempted a write their role does not permit |

Client IP is captured in `details`. Read via `/api/audit` or directly from `audit_logs`.

## Recent security hardening (2026-05-22)

Done in one session — referenced for context if you see the changes:
- Added bcryptjs + transparent plaintext→hash upgrade on login
- Removed `superadmin/godmode` bypass
- Removed `assetpavan`/`financepavan`/derived-employee plaintext password paths
- Whitelisted tables and per-table columns in generic CRUD + `/api/sync`
- `.gitignore` expanded to cover DB, CSVs, XLSX, scratch dirs
- One-time migration (`hash_existing_passwords.js`) ran against existing 123 users
- Restored employee derived-formula passwords via `restore_employee_passwords.js` so muscle memory survives the refactor
- JWT verification middleware on all `/api/*` except `/api/login`; frontend attaches bearer token via `StorageAdapter.authFetch()`
- Auth events logged to `audit_logs` (success, fail, unknown user, wrong role, upgrade, logout)
- Role-based write gates on `WRITE_ROLES` tables; denials audit-logged as `AUTHZ_DENIED`
- All utility scripts relocated to `scripts/`; `db:init` / `db:hash-passwords` / `db:restore-employee-passwords` npm aliases added
- `.env.example` added; `JWT_SECRET` and `PORT` are env-overridable with a startup warning when `JWT_SECRET` falls back to the dev default
- Per-row privacy on `PRIVATE_TABLES`: non-elevated users only see/write rows they own; cross-user write attempts return 403 + `AUTHZ_DENIED`

## Completed work (2026-05-25)

1. ✅ **Request validation** — Added zod@4.4.3 with schemas for login, password-change, and generic POST payloads. All handlers validate before processing.
2. ✅ **Dedicated password-change endpoint** — `/api/users/:id/password` added. Elevated roles can reset user passwords; own-account always allowed. Bcrypt hashing + audit logging.
3. ✅ **Code-split the 552 KB bundle** — Implemented dynamic imports for Payroll, AnalyticsDashboard, ReportsEngine. Main bundle now 441 KB (20% reduction). Lazy chunks load on demand.
4. ✅ **Audit log retention policy** — Added `pruneAuditLogs()` function with 24h interval. Configurable via `AUDIT_RETENTION_DAYS` env (default 90 days). Non-blocking cleanup.
5. ✅ **Wire `dotenv`** — Added `import 'dotenv/config.js'` at top of server.js. `.env` loads automatically at startup; no manual shell exports needed.
6. ✅ **Manager visibility on team data** — Updated `handleGet` and `handlePost` to allow managers to see and write rows for their direct reports. Uses `users.reportsTo` lookup; denials are audit-logged.

**See**: `VERIFICATION_REPORT.md` for detailed end-to-end verification of all tasks.

## Future enhancements (not critical)

The following areas could improve robustness but are not blocking:
- **Error boundaries** — Pages don't trap async errors; failed API calls surface via `alert()` only
- **Tests** — No test suite in codebase; integration tests would catch regressions
- **TypeScript/JSDoc** — No type safety; JSDoc hints would help with code understanding
- **Accessibility** — No a11y audit; modals may lack focus management/ARIA labels
- **Rate limiting** — No rate limit on `/api/*` endpoints; add per-IP throttling for auth
- **Caching strategy** — AssetDB in-memory cache can drift; explicit invalidation would help
- **CodeGraph integration** — CodeGraph (https://github.com/colbymchenry/codegraph) could speed up agent code exploration (57% fewer tokens, 71% fewer tool calls)
