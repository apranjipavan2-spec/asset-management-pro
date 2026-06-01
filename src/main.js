import './css/style.css';
import { db } from './mock/db.js';
// Helper-bearing page modules stay statically imported because their named
// exports get wired into window.app.* methods for inline onclick handlers.
// Everything else is loaded on demand via loadDynamicPage(pageName).
import { renderAssetRegistry, regSetFilter as _regSetFilter, regResetFilters as _regResetFilters, toggleRegFilters as _toggleRegFilters } from './pages/AssetRegistry.js';
import { renderAssetsLedger, faSetFilter as _faSetFilter, faResetFilters as _faResetFilters, toggleFaFilters as _toggleFaFilters, faShowDetail as _faShowDetail, faExportXlsx as _faExportXlsx } from './pages/AssetsLedger.js';
import { renderDepreciationPage, depSetFilter as _depSetFilter, depResetFilters as _depResetFilters, depExportFiltered as _depExportFiltered, depExportFilteredXlsx as _depExportFilteredXlsx } from './pages/DepreciationPage.js';
import { renderDepreciationSchedulePage, rerenderFAR, openAddRowModal, closeFarModal, openDeleteModal, openIssueNumberModal, refreshIssuePreview, buildAssetIdPreview, farResetFilters as _farResetFilters, toggleFarFilters as _toggleFarFilters } from './pages/DepreciationSchedulePage.js';
import { exportSourceFormat } from './utils/exportSourceFormat.js';

const dynamicPageCache = new Map();

const loadDynamicPage = async (pageName) => {
    if (dynamicPageCache.has(pageName)) {
        return dynamicPageCache.get(pageName);
    }
    const module = await import(`./pages/${pageName}.js`);
    const renderFn = module[`render${pageName}`];
    dynamicPageCache.set(pageName, renderFn);
    return renderFn;
};

// asset_home picks a dashboard variant based on the user's permissions.
const renderAssetHome = async (user) => {
    const app = window.app;
    if (app.hasPermission('all') || app.hasPermission('view_reports')) {
        const fn = await loadDynamicPage('AnalyticsDashboard');
        return fn(user);
    }
    if (app.hasPermission('approve_finance')) {
        const fn = await loadDynamicPage('FinanceDashboard');
        return fn(user);
    }
    if (app.hasPermission('manage_assets')) {
        const fn = await loadDynamicPage('ManagerDashboard');
        return fn(user);
    }
    const fn = await loadDynamicPage('EmployeeDashboard');
    return fn(user);
};

// Sidebar group ordering + labels. Pages reference these by `group`.
const NAV_GROUPS = [
    { id: 'pinned',    label: null,                icon: null },
    { id: 'assets',    label: 'Assets',            icon: 'inventory_2' },
    { id: 'time',      label: 'Time & Schedule',   icon: 'schedule' },
    { id: 'work',      label: 'Work',              icon: 'work' },
    { id: 'finance',   label: 'Finance',           icon: 'account_balance_wallet' },
    { id: 'people',    label: 'People',            icon: 'group' },
    { id: 'comm',      label: 'Communication',     icon: 'forum' },
    { id: 'resources', label: 'Resources',         icon: 'folder_shared' },
    { id: 'admin',     label: 'Administration',    icon: 'shield_person' }
];

// Single source of truth for pages. To add/remove a page or change who sees it,
// edit this map. `perm` can be: null (any authenticated user), a string, or an
// array (any-of). Grant a user access by checking the matching permission box
// in the Users page; revoke by unchecking. `hidden: true` keeps the route
// reachable but hides it from the sidebar (e.g. settings, profile).
const PAGE_REGISTRY = {
    home:            { group: 'pinned',    label: 'Home',            icon: 'home',                  perm: null,                                                     render: 'HomeDashboard' },

    asset_home:      { group: 'assets',    label: null /* dynamic */,icon: null /* dynamic */,      perm: null,                                                     render: renderAssetHome },
    request:         { group: 'assets',    label: 'Request Asset',   icon: 'add_shopping_cart',     perm: null,                                                     render: 'RequestPage' },
    issues:          { group: 'assets',    label: 'Report Issue',    icon: 'report_problem',        perm: null,                                                     render: 'IssueReportPage' },
    registry:        { group: 'assets',    label: 'Registry',        icon: 'inventory_2',           perm: ['manage_assets', 'approve_finance'],                     render: renderAssetRegistry },
    transfers:       { group: 'assets',    label: 'Transfers',       icon: 'swap_horiz',            perm: 'manage_assets',                                          render: 'TransferPage' },
    maintenance:     { group: 'assets',    label: 'Maintenance',     icon: 'construction',          perm: 'manage_assets',                                          render: 'MaintenanceHub' },
    assets_ledger:   { group: 'assets',    label: 'Fixed Assets',    icon: 'receipt_long',          perm: 'approve_finance',                                        render: renderAssetsLedger },
    depreciation:    { group: 'assets',    label: 'Depreciation',    icon: 'trending_down',         perm: 'approve_finance',                                        render: renderDepreciationPage },
    far:             { group: 'assets',    label: 'FAR Schedule',    icon: 'fact_check',            perm: 'approve_finance',                                        render: renderDepreciationSchedulePage },
    grants:          { group: 'assets',    label: 'Grants',          icon: 'savings',               perm: 'approve_finance',                                        render: 'GrantLedger' },

    attendance:      { group: 'time',      label: 'Attendance',      icon: 'fact_check',            perm: null,                                                     render: 'AttendancePage' },
    leave:           { group: 'time',      label: 'Leave',           icon: 'event_busy',            perm: null,                                                     render: 'LeavePage' },
    calendar:        { group: 'time',      label: 'Calendar',        icon: 'calendar_month',        perm: null,                                                     render: 'CalendarPage' },

    worklog:         { group: 'work',      label: 'Worklog',         icon: 'edit_note',             perm: null,                                                     render: 'WorklogPage' },
    tasks:           { group: 'work',      label: 'Tasks',           icon: 'task_alt',              perm: null,                                                     render: 'TasksPage' },
    procurement:     { group: 'work',      label: 'Procurement',     icon: 'shopping_cart',         perm: ['approve_requests', 'approve_finance', 'manage_assets'], render: 'ProcurementPage' },

    reimbursements:  { group: 'finance',   label: 'Expenses',        icon: 'receipt_long',          perm: null,                                                     render: 'ReimbursementPage' },
    payroll:         { group: 'finance',   label: 'Payroll',         icon: 'payments',              perm: 'manage_payroll',                                         render: 'PayrollPage' },
    payment_export:  { group: 'finance',   label: 'Bank Payment',    icon: 'account_balance',       perm: 'approve_finance',                                        render: 'PaymentExportPage' },
    payment_programs:{ group: 'finance',   label: 'Payment Programs',icon: 'tune',                  perm: 'approve_finance',                                        render: 'PaymentProgramsAdminPage' },
    bank_accounts:   { group: 'finance',   label: 'Bank Accounts',   icon: 'savings',               perm: 'approve_finance',                                        render: 'BankAccountsAdminPage' },

    org_chart:       { group: 'people',    label: 'Org Chart',       icon: 'account_tree',          perm: null,                                                     render: 'OrgChartPage' },
    performance:     { group: 'people',    label: 'Reviews',         icon: 'workspace_premium',     perm: null,                                                     render: 'PerformanceReviewsPage' },
    team:            { group: 'people',    label: 'My Team',         icon: 'groups',                perm: ['manage_team', 'manage_users'],                          render: 'TeamManagementPage' },
    users:           { group: 'people',    label: 'Users',           icon: 'admin_panel_settings',  perm: 'manage_users',                                           render: 'UserManagement' },

    announcements:   { group: 'comm',      label: 'Board',           icon: 'campaign',              perm: null,                                                     render: 'AnnouncementsPage' },
    social_hub:      { group: 'comm',      label: 'Social Hub',      icon: 'share',                 perm: null,                                                     render: 'SocialHubPage' },
    data_collection: { group: 'comm',      label: 'Data Collection', icon: 'poll',                  perm: null,                                                     render: 'DataCollectionPage' },

    documents:       { group: 'resources', label: 'Vault',           icon: 'folder_shared',         perm: null,                                                     render: 'DocumentVaultPage' },

    reports:         { group: 'admin',     label: 'Reports',         icon: 'analytics',             perm: 'view_reports',                                           render: 'ReportsEnginePage' },
    analytics:       { group: 'admin',     label: 'Analytics',       icon: 'pie_chart',             perm: 'all',                                                    render: 'AnalyticsDashboard' },
    audit_log:       { group: 'admin',     label: 'Audit Log',       icon: 'history_edu',           perm: 'all',                                                    render: 'AuditLog' },

    settings:        { group: null,        label: 'Settings',        icon: 'settings',              perm: null,                                                     render: 'SettingsPage',            hidden: true },
    notifications:   { group: null,        label: 'Notifications',   icon: 'notifications',         perm: null,                                                     render: 'NotificationsPage',       hidden: true },
    profile:         { group: null,        label: 'Profile',         icon: 'person',                perm: null,                                                     render: 'EmployeeProfilePage',     hidden: true },
    social:          { group: null,        label: 'Social',          icon: 'public',                perm: null,                                                     render: 'SocialFeedPage',          hidden: true }
};

// Default landing page per user. Employees see the social feed first;
// everyone else lands on the workspace home. Header toggle lets either
// jump to the other view.
const defaultPageForUser = (user) => (user && user.role === 'employee') ? 'social' : 'home';

class App {
    constructor() {
        window.app = this;
        this.appElement = document.getElementById('app');
        this.user = JSON.parse(localStorage.getItem('amp_user')) || null;
        this.currentPage = defaultPageForUser(this.user);
        this.loginRole = null;
        this.initialized = false;
        // Accordion: at most one sidebar group expanded at a time. `null`
        // means rely on the active page's group. A string forces that group
        // open (and implicitly closes the rest).
        this.openNavGroup = null;
        
        if (!this.appElement) {
            document.addEventListener('DOMContentLoaded', () => {
                this.appElement = document.getElementById('app');
                this.init();
            });
        } else {
            this.init();
        }
    }

    async init() {
        try {
            this.renderLoading();
            await db.init();
            this.initialized = true;
            window.addEventListener('popstate', () => this.handleRouting());
            window.addEventListener('hashchange', () => this.handleRouting());
            this.installGlobalModalHandlers();
            this.installSortableTables();
            this.handleRouting();
        } catch (err) {
            console.error('App initialization failed:', err);
            this.appElement.innerHTML = `
                <div class="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                    <div class="max-w-md w-full bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-6">
                        <div class="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl mx-auto flex items-center justify-center">
                            <span class="material-symbols-outlined text-4xl">cloud_off</span>
                        </div>
                        <div>
                            <h2 class="text-2xl font-black text-slate-900 uppercase tracking-tight">Sync Failure</h2>
                            <p class="text-sm text-slate-500 mt-2">The institutional database could not be synchronized. Please check your network or server status.</p>
                        </div>
                        <button onclick="window.location.reload()" class="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-all">Retry Handshake</button>
                    </div>
                </div>
            `;
        }
    }

    renderLoading() {
        this.appElement.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-mesh p-6 relative overflow-hidden">
                <div class="absolute -top-24 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse"></div>
                <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-[120px] animate-pulse"></div>
                
                <div class="max-w-[400px] w-full glass-frosted p-12 rounded-[3rem] flex flex-col items-center space-y-8 relative z-10 animate-fade-in">
                    <div class="relative">
                        <div class="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10 animate-float">
                            <img src="https://kalike.org/wp-content/uploads/2025/01/Logo-Transparent-1.png" class="w-14 h-14 object-contain invert" />
                        </div>
                        <div class="absolute -inset-4 bg-accent/20 rounded-[2.5rem] blur-2xl animate-pulse"></div>
                    </div>
                    
                    <div class="text-center space-y-2">
                        <h1 class="text-2xl font-black text-slate-900 tracking-tightest uppercase">Initializing</h1>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Institutional Secure Node</p>
                    </div>

                    <div class="w-full space-y-4">
                        <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-accent animate-loading-bar"></div>
                        </div>
                        <div class="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <span class="animate-pulse">Syncing Vault...</span>
                            <span id="sync-status">Handshake</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Removed selectRole() - unified login, no role selection needed
    // Role is determined by database on login

    async authenticate() {
        const idInput = document.getElementById('login-id');
        const passInput = document.getElementById('login-password');
        const errorMsg = document.getElementById('login-error');
        const submitBtn = document.querySelector('#login-form button[type="submit"]');

        if (!idInput || !passInput) return;

        const userId = idInput.value.trim();
        const password = passInput.value;

        if (!userId || !password) {
            errorMsg.innerText = "User ID and password are required.";
            errorMsg.classList.remove('hidden');
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        errorMsg.classList.add('hidden');

        try {
            // Unified login: no role selection, server determines role from database
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                errorMsg.innerText = data.message || 'Authentication failed.';
                errorMsg.classList.remove('hidden');
                return;
            }

            // Server returns user with their actual role from database
            this.user = data.user;
            localStorage.setItem('amp_user', JSON.stringify(this.user));
            if (data.token) localStorage.setItem('amp_token', data.token);

            // Reload db collections with auth, then navigate to dashboard
            await db.init();
            this.navigateTo(defaultPageForUser(this.user));
        } catch (err) {
            console.error('Login request failed:', err);
            errorMsg.innerText = 'Could not reach the authentication server.';
            errorMsg.classList.remove('hidden');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    togglePasswordVisibility() {
        const input = document.getElementById('login-password');
        const icon = document.getElementById('login-pw-toggle-icon');
        const btn = document.getElementById('login-pw-toggle');
        if (!input || !icon) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        icon.textContent = show ? 'visibility_off' : 'visibility';
        if (btn) btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    }

    logout() {
        const token = localStorage.getItem('amp_token');
        if (token) {
            fetch('/api/logout', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            }).catch(() => {}); // fire-and-forget; logout proceeds regardless
        }
        this.user = null;
        localStorage.removeItem('amp_user');
        localStorage.removeItem('amp_token');
        this.currentPage = 'login';
        window.history.pushState({}, '', '#login');
        this.render();
    }

    navigateTo(page, arg) {
        this.currentPage = page;
        this.pageArg = arg ?? null;
        // Reset accordion override so the new page's parent group auto-opens
        // and any previously expanded group collapses.
        this.openNavGroup = null;
        const hash = arg != null ? `${page}:${encodeURIComponent(arg)}` : page;
        window.history.pushState({}, '', `#${hash}`);
        this.closeMobileNav();
        this.renderShell();
        this.renderContent().catch(err => console.error('Navigation render error:', err));
    }

    openMobileNav() {
        document.getElementById('nav-sidebar')?.classList.remove('-translate-x-full');
        document.getElementById('nav-overlay')?.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    closeMobileNav() {
        document.getElementById('nav-sidebar')?.classList.add('-translate-x-full');
        document.getElementById('nav-overlay')?.classList.add('hidden');
        document.body.style.overflow = '';
    }

    handleRouting() {
        const raw = window.location.hash.slice(1) || (this.user ? defaultPageForUser(this.user) : 'login');
        const sepIdx = raw.indexOf(':');
        const page = sepIdx === -1 ? raw : raw.slice(0, sepIdx);
        const encArg = sepIdx === -1 ? null : raw.slice(sepIdx + 1);
        const pageChanged = page !== this.currentPage;
        this.currentPage = page;
        this.pageArg = encArg ? decodeURIComponent(encArg) : null;
        // On real navigation, drop the accordion override so the active page's
        // group opens and the previous one collapses.
        if (pageChanged) this.openNavGroup = null;
        this.render();
    }

    render() {
        if (!this.user && this.currentPage !== 'login') {
            this.currentPage = 'login';
        }

        if (this.currentPage === 'login') {
            this.renderLogin();
        } else {
            this.renderShell();
        }
    }

    renderLogin() {
        // Unified login form - no role selection needed
        const authFormUI = `
            <form id="login-form" onsubmit="event.preventDefault(); app.authenticate();" class="space-y-5 w-full animate-fade-in-up">
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[.2em] text-center">Enter your credentials</p>

                <div class="space-y-3.5">
                    <div class="group">
                        <label for="login-id" class="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1 mb-1 block group-focus-within:text-blue-600 transition-colors">User ID</label>
                        <div class="relative">
                            <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">badge</span>
                            <input type="text" id="login-id" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Enter your ID" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 pl-10 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold placeholder:text-slate-300" />
                        </div>
                    </div>
                    <div class="group">
                        <label for="login-password" class="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1 mb-1 block group-focus-within:text-blue-600 transition-colors">Password</label>
                        <div class="relative">
                            <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">lock</span>
                            <input type="password" id="login-password" autocomplete="current-password" placeholder="••••••••" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 pl-10 pr-11 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold placeholder:text-slate-300" />
                            <button type="button" id="login-pw-toggle" onclick="app.togglePasswordVisibility()" aria-label="Show password" class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors">
                                <span class="material-symbols-outlined text-base" id="login-pw-toggle-icon">visibility</span>
                            </button>
                        </div>
                    </div>
                    <div id="login-error" class="hidden text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-2.5 rounded-lg border border-rose-200"></div>
                    <button type="submit" class="w-full py-3.5 bg-slate-950 text-white rounded-xl font-black uppercase tracking-[.3em] text-[10px] hover:bg-blue-600 transition-all shadow-lg active:scale-[0.97] flex items-center justify-center gap-2.5 mt-1">
                        <span class="material-symbols-outlined text-sm">vpn_key</span>
                        Login
                    </button>
                </div>
            </form>
        `;

        this.appElement.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-mesh p-6 relative overflow-hidden">
                <!-- Floating geometric accents -->
                <div class="absolute -top-24 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse"></div>
                <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 2s"></div>

                <div class="max-w-[440px] w-full glass-frosted p-8 sm:p-10 rounded-[2.5rem] flex flex-col items-center space-y-5 relative z-10 animate-fade-in-up">
                    <div class="text-center space-y-2">
                        <div class="w-16 h-16 bg-slate-900 rounded-2xl mx-auto flex items-center justify-center shadow-2xl animate-float">
                            <img src="https://kalike.org/wp-content/uploads/2025/01/Logo-Transparent-1.png" alt="Kalike Logo" class="w-10 h-10 object-contain invert" />
                        </div>
                        <div>
                            <h1 class="text-2xl font-black text-slate-900 tracking-tightest uppercase">Kalike</h1>
                            <div class="h-1 w-10 bg-accent mx-auto mt-1 rounded-full"></div>
                        </div>
                    </div>

                    ${authFormUI}

                    <footer class="text-center">
                        <p class="text-[9px] text-slate-600 font-black uppercase tracking-[.3em]">Secure End-to-End Ledger v2.2.0</p>
                    </footer>
                </div>
            </div>
        `;

        setTimeout(() => document.getElementById('login-id')?.focus(), 200);
    }

    hasPermission(permission) {
        if (!this.user) return false;
        if (this.user.role === 'superadmin') return true;
        try {
            const perms = JSON.parse(this.user.permissions || '[]');
            return perms.includes('all') || perms.includes(permission);
        } catch (e) {
            return false;
        }
    }

    // Asset register access — broad: any role that handles assets, including operations & admin.
    // These two get asset CSV exports but NOT the finance-formatted source-Excel.
    canExportAssets() {
        if (!this.user) return false;
        return ['superadmin', 'director', 'finance', 'operations', 'hr', 'manager', 'admin'].includes(this.user.role);
    }

    // Finance-formatted source-Excel (Dep + FCRA registers) — narrow:
    // only Executive Director, Finance team, and Superadmin per institutional policy.
    // Operations and admin are deliberately excluded (assets only, no finance).
    canExportFinance() {
        if (!this.user) return false;
        return ['superadmin', 'director', 'finance'].includes(this.user.role);
    }

    exportSourceFormat() {
        // The source-format Excel (matches the Dep + FCRA register layout) is
        // finance-sensitive and gated to Finance/ED/Superadmin only.
        if (!this.canExportFinance()) {
            alert('Only the Executive Director, Finance team, and Superadmin can download the source-format Dep / FCRA Asset Register.');
            return;
        }
        exportSourceFormat(db.assets, { includeFcra: true });
    }

    getNotificationsBadge() {
        if (!this.user) return 0;
        return db.notifications.filter(n => n.recipientId === this.user.id && !n.isRead).length;
    }

    // Mapping of known modal IDs → close-fn name. Lets the global backdrop
    // handler invoke each modal's proper animated close routine.
    // Modals not listed fall back to the generic remove-element behavior.
    static MODAL_CLOSERS = {
        'transfer-detail-modal':  'closeTransferModal',
        'maint-detail-modal':     'closeMaintModal',
        'asset-detail-modal':     'closeAssetDetailModal',
        'approval-detail-modal':  'closeApprovalModal',
        'analytics-drill-modal':  'closeDrillModal'
    };

    // Click-outside-to-close + Esc-to-close for every modal in the app.
    // Detects the backdrop by the canonical "fixed inset-0 bg-slate-900/* backdrop-blur" pattern.
    // Delegated click-to-sort on every <th> inside a `.dense-table`, `.sortable-table`,
    // or `<table data-sortable>`. Cycles asc → desc → none with arrow indicators.
    // Cells with `data-sort-value` use that for comparison; otherwise textContent
    // is parsed as number-if-possible, date-if-recognisable, else lowercase string.
    installSortableTables() {
        if (window.__sortableTablesInstalled) return;
        window.__sortableTablesInstalled = true;

        const parseCell = (cell) => {
            const raw = cell?.dataset?.sortValue ?? cell?.textContent ?? '';
            const t = String(raw).trim();
            if (t === '' || t === '—' || t === '-') return null;
            // Number? (strip ₹, commas, %, spaces)
            const cleaned = t.replace(/[\u20B9$,%\s]/g, '');
            if (/^-?\d+(\.\d+)?$/.test(cleaned)) return parseFloat(cleaned);
            // Date?
            const ts = Date.parse(t);
            if (!isNaN(ts) && /\d{4}|\d{1,2}[\/\.\-]\d{1,2}/.test(t)) return ts;
            return t.toLowerCase();
        };

        const sortBy = (table, colIdx, dir) => {
            const tbody = table.querySelector('tbody') || table;
            const rows = Array.from(tbody.querySelectorAll(':scope > tr'));
            if (rows.length < 2) return;
            rows.sort((a, b) => {
                const av = parseCell(a.children[colIdx]);
                const bv = parseCell(b.children[colIdx]);
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                if (typeof av === 'number' && typeof bv === 'number') return dir * (av - bv);
                return dir * String(av).localeCompare(String(bv));
            });
            rows.forEach(r => tbody.appendChild(r));
        };

        document.addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (!th) return;
            const table = th.closest('table');
            if (!table) return;
            const ok = table.classList.contains('dense-table')
                    || table.classList.contains('sortable-table')
                    || table.hasAttribute('data-sortable');
            if (!ok) return;
            if (th.hasAttribute('data-no-sort')) return;

            // Determine column index within the header row
            const headerRow = th.parentElement;
            const colIdx = Array.from(headerRow.children).indexOf(th);
            if (colIdx < 0) return;

            // Cycle state on the header cell: none → asc → desc → none
            const cur = th.dataset.sortDir || 'none';
            const next = cur === 'none' ? 'asc' : cur === 'asc' ? 'desc' : 'none';
            // Clear arrows from all sibling headers
            for (const sib of headerRow.children) {
                sib.dataset.sortDir = '';
                const arrow = sib.querySelector('.sort-arrow');
                if (arrow) arrow.textContent = '';
            }
            th.dataset.sortDir = next;
            // Inject/update arrow indicator
            let arrow = th.querySelector('.sort-arrow');
            if (!arrow) {
                arrow = document.createElement('span');
                arrow.className = 'sort-arrow ml-1 text-[10px] opacity-70';
                th.appendChild(arrow);
                th.style.cursor = 'pointer';
                th.style.userSelect = 'none';
            }
            arrow.textContent = next === 'asc' ? '▲' : next === 'desc' ? '▼' : '';

            if (next === 'none') {
                // Restore original DOM order by re-rendering — simpler: do nothing
                // (most pages re-render on data change anyway). No-op is acceptable.
                return;
            }
            sortBy(table, colIdx, next === 'asc' ? 1 : -1);
        });

        // Add a hint cursor on hover for sortable headers
        const styleId = '__sortable-th-style';
        if (!document.getElementById(styleId)) {
            const s = document.createElement('style');
            s.id = styleId;
            s.textContent = `
                table.dense-table th, table.sortable-table th, table[data-sortable] th { cursor: pointer; }
                table.dense-table th[data-no-sort], table.sortable-table th[data-no-sort], table[data-sortable] th[data-no-sort] { cursor: default; }
            `;
            document.head.appendChild(s);
        }
    }

    // Reliable close: walks up from the clicked button to its own backdrop
    // (`.fixed.inset-0`) and removes it. Avoids the duplicate-id pitfall of
    // `getElementById(...).remove()` when two elements share the same id.
    closeNearestModal(btn) {
        const backdrop = btn?.closest?.('.fixed.inset-0');
        if (backdrop) backdrop.remove();
    }

    installGlobalModalHandlers() {
        if (window.__modalHandlersInstalled) return;
        window.__modalHandlersInstalled = true;

        const closeBackdrop = (el) => {
            if (!el || el.id === 'nav-overlay') return;
            const fn = App.MODAL_CLOSERS[el.id];
            if (fn && typeof window[fn] === 'function') { window[fn](); return; }
            // Persistent backdrop with hidden-class pattern (no named closer)
            if (el.classList.contains('hidden')) return;
            if (el.classList.contains('flex-col') || el.classList.contains('flex')) {
                el.classList.add('opacity-0');
                el.querySelector(':scope > div')?.classList.add('scale-95');
                setTimeout(() => {
                    el.classList.add('hidden');
                    el.classList.remove('flex', 'flex-col');
                }, 200);
                return;
            }
            // Dynamically appended (no hidden class): remove from DOM
            el.remove();
        };

        document.addEventListener('mousedown', (e) => {
            const t = e.target;
            if (!(t instanceof HTMLElement)) return;
            if (!t.classList.contains('fixed') || !t.classList.contains('inset-0')) return;
            const cls = t.className;
            if (!cls.includes('bg-slate-900')) return;
            // Click landed directly on the backdrop element (not inside content)
            closeBackdrop(t);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            // Find topmost visible backdrop and close it
            const backdrops = Array.from(document.querySelectorAll('.fixed.inset-0'))
                .filter(el => el.className.includes('bg-slate-900') && !el.classList.contains('hidden') && el.id !== 'nav-overlay');
            const top = backdrops[backdrops.length - 1];
            if (top) closeBackdrop(top);
        });
    }

    canAccessPage(pageId) {
        const def = PAGE_REGISTRY[pageId];
        if (!def) return false;
        if (def.perm == null) return true;
        const perms = Array.isArray(def.perm) ? def.perm : [def.perm];
        return perms.some(p => this.hasPermission(p));
    }

    // asset_home label/icon depends on which dashboard variant the user will land on.
    assetHomeNavMeta() {
        if (this.hasPermission('manage_assets')) return { label: 'Asset Ops',    icon: 'dashboard' };
        if (this.hasPermission('approve_finance')) return { label: 'Finance View', icon: 'account_balance' };
        return { label: 'My Assets', icon: 'inventory' };
    }

    getNavGroups() {
        return NAV_GROUPS.map(g => {
            const items = Object.entries(PAGE_REGISTRY)
                .filter(([id, def]) => def.group === g.id && !def.hidden && this.canAccessPage(id))
                .map(([id, def]) => {
                    if (id === 'asset_home') return { id, ...this.assetHomeNavMeta() };
                    return { id, label: def.label, icon: def.icon };
                });
            return { ...g, items };
        }).filter(g => g.items.length > 0);
    }

    getNavItems() {
        return this.getNavGroups().flatMap(g => g.items);
    }

    findActiveGroup() {
        const groups = this.getNavGroups();
        for (const g of groups) {
            if (g.items.some(i => i.id === this.currentPage)) return g.id;
        }
        return 'pinned';
    }

    toggleNavGroup(groupId) {
        // Accordion: clicking a group opens it and closes every other group.
        // Clicking the open group closes it.
        const currentlyOpen = this.openNavGroup ?? this.findActiveGroup();
        this.openNavGroup = currentlyOpen === groupId ? '__none__' : groupId;
        this.renderShell();
    }

    formatHeaderClock(d = new Date()) {
        const date = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        return `${date} · ${time}`;
    }

    startHeaderClock() {
        if (this._clockInterval) clearInterval(this._clockInterval);
        this._clockInterval = setInterval(() => {
            const el = document.getElementById('header-clock');
            if (!el) {
                clearInterval(this._clockInterval);
                this._clockInterval = null;
                return;
            }
            el.textContent = this.formatHeaderClock();
        }, 1000);
    }

    renderShell() {
        const user = this.user;
        if (!user) return;

        window.exitSimulation = () => {
            const realUser = sessionStorage.getItem('amp_real_user');
            if (realUser) {
                localStorage.setItem('amp_user', realUser);
                sessionStorage.removeItem('amp_real_user');
                window.location.reload();
            }
        };

        let simulationBanner = '';
        if (user.isSimulated) {
            simulationBanner = `
                <div class="bg-amber-600 text-white px-6 py-2.5 flex items-center justify-between shadow-lg relative z-[100] animate-in slide-in-from-top duration-500">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-sm animate-pulse">policy</span>
                        <p class="text-[10px] font-black uppercase tracking-[.25em]">Institutional Audit Mode: Viewing system as ${user.name} (${user.role})</p>
                    </div>
                    <button onclick="window.exitSimulation()" class="bg-white/20 hover:bg-white/40 border border-white/30 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Exit Simulation</button>
                </div>
            `;
        }

        this.appElement.innerHTML = `
            <div class="flex flex-col h-screen overflow-hidden bg-slate-50">
                ${simulationBanner}
                <div id="nav-overlay" onclick="window.app.closeMobileNav()" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 hidden md:hidden"></div>
                <div class="flex flex-1 overflow-hidden">
                    <aside id="nav-sidebar" class="sidebar-shell sidebar-scroll fixed inset-y-0 left-0 z-50 w-72 flex flex-col p-5 shrink-0 shadow-2xl overflow-y-auto -translate-x-full md:translate-x-0 md:relative md:z-20 transition-transform duration-300 ease-in-out">
                        <div class="brand-block">
                            <div class="brand-logo shrink-0">
                                <img src="https://kalike.org/wp-content/uploads/2025/01/Logo-Transparent-1.png" alt="Kalike Logo" class="w-full h-full object-contain" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <h1 class="brand-title">Kalike Workspace</h1>
                                <p class="brand-sub">Institutional Ops</p>
                            </div>
                            <button onclick="window.app.closeMobileNav()" class="md:hidden w-8 h-8 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-all shrink-0">
                                <span class="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        <nav class="flex-1 flex flex-col gap-0.5">
                            ${(() => {
                                const activeGroup = this.findActiveGroup();
                                // Manual click override wins; otherwise default to the
                                // group of the current page. `__none__` = user explicitly
                                // closed everything.
                                this._openGroupResolved = this.openNavGroup ?? activeGroup;
                                return '';
                            })()}
                            ${this.getNavGroups().map(group => {
                                const hasActiveItem = group.items.some(i => i.id === this.currentPage);
                                const isOpen = group.id === 'pinned' || group.id === this._openGroupResolved;

                                // Pinned items render flat (top-level nav-link)
                                if (group.id === 'pinned') {
                                    return group.items.map(item => `
                                        <a href="#${item.id}"
                                           class="nav-link ${this.currentPage === item.id ? 'is-active' : ''}">
                                            <span class="material-symbols-outlined nav-icon">${item.icon}</span>
                                            <span>${item.label}</span>
                                        </a>
                                    `).join('');
                                }

                                return `
                                    <div class="nav-section nav-group" data-group-id="${group.id}">
                                        <button onclick="window.app.toggleNavGroup('${group.id}')"
                                            class="nav-group-btn ${hasActiveItem ? 'has-active' : ''}">
                                            <div class="flex items-center gap-2.5">
                                                <span class="material-symbols-outlined group-icon">${group.icon}</span>
                                                <span class="nav-group-label">${group.label}</span>
                                                ${hasActiveItem ? '<span class="nav-group-dot ml-1"></span>' : ''}
                                            </div>
                                            <span class="material-symbols-outlined group-chevron ${isOpen ? 'rotate-180' : ''}">expand_more</span>
                                        </button>
                                        <div class="nav-group-body ${isOpen ? '' : 'hidden'}">
                                            ${group.items.map(item => `
                                                <a href="#${item.id}"
                                                   class="nav-sublink ${this.currentPage === item.id ? 'is-active' : ''}">
                                                    <span class="material-symbols-outlined nav-icon">${item.icon}</span>
                                                    <span>${item.label}</span>
                                                </a>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </nav>

                        <div class="mt-auto pt-4 border-t border-slate-800/60">
                            <div class="user-card">
                                <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.name}" class="w-9 h-9 rounded-xl border border-slate-700 shrink-0" />
                                <div class="flex-1 min-w-0">
                                    <p class="user-name truncate">${user.name}</p>
                                    <p class="user-role truncate">${user.role}</p>
                                </div>
                                <button onclick="app.logout()" title="Logout" class="text-slate-500 hover:text-rose-400 transition-colors w-8 h-8 rounded-lg hover:bg-rose-500/10 flex items-center justify-center shrink-0">
                                    <span class="material-symbols-outlined text-[18px]">logout</span>
                                </button>
                            </div>
                        </div>
                    </aside>

                    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <header class="h-14 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 z-10 gap-3">
                            <div class="flex items-center gap-3 min-w-0 flex-1">
                                <button onclick="window.app.openMobileNav()" class="md:hidden w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-all active:scale-95 shrink-0">
                                    <span class="material-symbols-outlined text-[22px]">menu</span>
                                </button>
                                <div class="flex flex-col min-w-0">
                                    <span class="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight truncate">Hi, ${(user.name || '').split(' ')[0] || 'there'}</span>
                                    <span id="header-clock" class="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">${this.formatHeaderClock()}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 md:gap-4 shrink-0">
                                <div class="hidden sm:flex items-center gap-0.5 bg-slate-100 rounded-xl p-0.5">
                                    <button onclick="app.navigateTo('home')" class="px-2.5 md:px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${this.currentPage === 'home' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}">Workspace</button>
                                    <button onclick="app.navigateTo('social')" class="px-2.5 md:px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${this.currentPage === 'social' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}">Social</button>
                                </div>
                                <div class="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl">
                                    <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Synced</span>
                                </div>
                                <button onclick="app.navigateTo('notifications')" class="w-9 h-9 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-all relative">
                                    <span class="material-symbols-outlined text-[22px]">notifications</span>
                                    ${this.getNotificationsBadge() ? `<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>` : ''}
                                </button>
                                <button onclick="app.navigateTo('settings')" class="w-9 h-9 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-all">
                                    <span class="material-symbols-outlined text-[22px]">settings</span>
                                </button>
                            </div>
                        </header>

                        <div id="content" class="flex-1 overflow-y-auto px-4 pt-2 pb-4 md:px-10 md:pt-3 md:pb-8">
                            <!-- Content Bound to Viewport via flex-1 overflow-y-auto -->
                        </div>
                    </main>
                </div>
            </div>

        `;
        this.renderContent().catch(err => {
            console.error('Failed to render content:', err);
            const content = document.getElementById('content');
            if (content) content.innerHTML = '<p class="text-red-600">Failed to load page</p>';
        });
        this.startHeaderClock();
    }

    async renderContent() {
        const content = document.getElementById('content');
        if (!content) return;

        const page = this.currentPage;
        const def = PAGE_REGISTRY[page];

        if (!def) {
            content.innerHTML = this.renderUnknownPage(page);
            return;
        }

        if (!this.canAccessPage(page)) {
            content.innerHTML = this.renderUnauthorized();
            return;
        }

        // Show the loading spinner immediately on every navigation so the user
        // always gets feedback that something is happening. Critically, we yield
        // to the browser (rAF) AFTER painting the spinner so it's actually
        // visible — otherwise the synchronous renderFn finishes in the same
        // task and the spinner innerHTML is overwritten before any paint.
        content.innerHTML = `
            <div class="h-full w-full flex items-center justify-center animate-in fade-in duration-150">
                <div class="flex flex-col items-center gap-3 text-slate-400">
                    <div class="w-10 h-10 border-4 border-slate-200 border-t-accent rounded-full animate-spin"></div>
                    <p class="text-[10px] font-black uppercase tracking-widest">Loading ${def.label || 'page'}…</p>
                </div>
            </div>`;
        // Force a paint frame before the heavy render so the spinner is visible.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        try {
            const renderFn = typeof def.render === 'string'
                ? await loadDynamicPage(def.render)
                : def.render;
            const html = await renderFn(this.user, this.pageArg);
            content.innerHTML = html;
        } catch (err) {
            throw err;
        }
    }

    renderUnauthorized() {
        return `
            <div class="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in">
                <div class="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center text-rose-400">
                    <span class="material-symbols-outlined text-5xl">lock</span>
                </div>
                <div class="text-center max-w-md">
                    <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight">Access Restricted</h3>
                    <p class="text-sm text-slate-500 font-semibold mt-2">You don't currently have permission to view this page. Ask an administrator to grant you access from the Users panel.</p>
                </div>
                <button onclick="app.navigateTo('home')" class="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-xl">Return to Home</button>
            </div>
        `;
    }

    renderUnknownPage(page) {
        return `
            <div class="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in">
                <div class="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-300">
                    <span class="material-symbols-outlined text-5xl">architecture</span>
                </div>
                <div class="text-center">
                    <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight">${page.replace(/_/g, ' ')} Module</h3>
                    <p class="text-sm text-slate-400 font-bold uppercase tracking-widest mt-2">Page not registered</p>
                </div>
                <button onclick="app.navigateTo('home')" class="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-xl">Return to Command Center</button>
            </div>
        `;
    }

    showAssetModal(id) {
        const asset = db.assets.find(a => a.id === id);
        if (!asset) return;
        const transfers = db.transfers.filter(t => t.assetId === id);
        const dep = this.computeAssetDepreciation(asset);
        const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
        const canExport = this.canExportAssets();

        const modalHtml = `
            <div id="asset-modal-backdrop" class="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div class="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
                    <!-- Modal Header -->
                    <div class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                                <span class="material-symbols-outlined text-2xl">receipt_long</span>
                            </div>
                            <div>
                                <h3 class="text-xl font-black text-slate-900 font-headline uppercase tracking-tight">${asset.name}</h3>
                                <p class="text-xs text-slate-400 font-black uppercase tracking-widest">${asset.id} / ${asset.category}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${canExport ? `
                            <button onclick="app.exportAssetPDF('${asset.id.replace(/'/g, "\\'")}')" class="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
                            </button>
                            <button onclick="app.exportAssetExcel('${asset.id.replace(/'/g, "\\'")}')" class="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-100 transition-all flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-sm">table_view</span> Excel
                            </button>` : ''}
                            <button onclick="app.closeNearestModal(this)" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
                                <span class="material-symbols-outlined group-hover:rotate-90 transition-transform">close</span>
                            </button>
                        </div>
                    </div>

                    <!-- Modal Body -->
                    <div id="asset-modal-printable" class="p-8 overflow-y-auto space-y-8 flex-1 scroll-container">
                        <!-- Identity & Linkage -->
                        <div class="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl">
                            <div class="flex items-center justify-between mb-4">
                                <h4 class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Identity & Linkage</h4>
                                ${asset.parentMatchType ? `<span class="text-[8px] font-black px-2 py-0.5 rounded-full ${asset.parentMatchType === 'EXACT_NORM' ? 'bg-emerald-500/20 text-emerald-300' : asset.parentMatchType === 'STRUCTURAL' ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'} uppercase tracking-widest">${asset.parentMatchType}</span>` : ''}
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Standardized Asset ID</p>
                                    <p class="text-xs font-black font-mono break-all text-white">${asset.standardizedId || asset.id || '—'}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Original / Legacy Asset ID</p>
                                    <p class="text-xs font-black font-mono break-all text-amber-200">${asset.assetIdentificationNumber || '—'}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Parent Asset ID (Finance)</p>
                                    <p class="text-xs font-black font-mono break-all text-indigo-200">${asset.parentAssetId || '—'}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assignment Code</p>
                                    <p class="text-xs font-black font-mono break-all text-slate-200">${asset.assignmentCode || '—'}</p>
                                </div>
                                ${asset.modelName ? `
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Model / Brand</p>
                                    <p class="text-xs font-bold text-slate-200">${asset.modelName}</p>
                                </div>` : ''}
                                ${asset.district ? `
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">District</p>
                                    <p class="text-xs font-bold text-slate-200">${asset.district}</p>
                                </div>` : ''}
                            </div>
                            ${asset.notes ? `
                            <div class="mt-5 pt-4 border-t border-white/10">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Notes</p>
                                <p class="text-[11px] text-slate-200 italic">${asset.notes}</p>
                            </div>` : ''}
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <!-- Logistics Card -->
                            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Logistics & Custody</h4>
                                <div class="space-y-4">
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase">Current Custodian</p>
                                        <p class="text-sm font-black text-slate-900 mt-0.5">${asset.assignedTo || 'Unassigned'}</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase">Station / Location</p>
                                        <p class="text-sm font-bold text-slate-600 mt-0.5">${asset.location || '—'}</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase">Quantity</p>
                                        <p class="text-sm font-bold text-slate-600 mt-0.5">${asset.quantity || 1}</p>
                                    </div>
                                    <div class="pt-3 border-t border-slate-200">
                                        <span class="px-2 py-1 bg-emerald-500 text-white text-[9px] font-black rounded uppercase tracking-tighter">${asset.status || 'Active'}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Financial Attribution Card -->
                            <div class="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-100">
                                <h4 class="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Financial Attribution</h4>
                                <div class="space-y-4">
                                    <div>
                                        <p class="text-[9px] font-black text-indigo-400 uppercase">Funding Origin</p>
                                        <p class="text-sm font-black text-indigo-700 mt-0.5">${asset.fundingSource || 'General Fund'}</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-indigo-400 uppercase">Cost Basis / Support</p>
                                        <p class="text-lg font-black text-slate-900 mt-0.5 tabular-nums">${fmt(dep.gross)}</p>
                                        ${asset.fundingAmount ? `<p class="text-[10px] font-bold text-indigo-500 italic">Grant Contribution: ${fmt(asset.fundingAmount)}</p>` : ''}
                                    </div>
                                    <div class="pt-3 border-t border-indigo-100">
                                        <p class="text-[9px] font-black text-indigo-400 uppercase">Net Book Value</p>
                                        <p class="text-sm font-black text-emerald-600 tabular-nums">${fmt(dep.nbv)}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Schedule Card -->
                            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Acquisition Schedule</h4>
                                <div class="space-y-4">
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase">Date of Purchase</p>
                                        <p class="text-sm font-bold text-slate-700 mt-0.5">${asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'long', year: 'numeric'}) : '—'}</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase">Put to Use</p>
                                        <p class="text-sm font-bold text-slate-700 mt-0.5">${asset.putToUseDate ? new Date(asset.putToUseDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'long', year: 'numeric'}) : '—'}</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase">Supplier / Bill</p>
                                        <p class="text-sm font-bold text-slate-700 mt-0.5">${asset.supplier || '—'} ${asset.billNumber ? `· #${asset.billNumber}` : ''}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Depreciation Schedule -->
                        <div class="bg-amber-50/40 p-6 rounded-2xl border border-amber-200">
                            <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <h4 class="text-[10px] font-black text-amber-700 uppercase tracking-widest">Depreciation Schedule</h4>
                                <div class="flex items-center gap-1.5">
                                    ${dep.source === 'FAR' ? `<span class="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-tighter" title="Derived per-unit from FAR row">FAR ${dep.fy ? `FY ${dep.fy}-${String((dep.fy+1)%100).padStart(2,'0')}` : ''}</span>` : `<span class="text-[9px] font-black text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">Registry</span>`}
                                    <span class="text-[9px] font-black text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200 uppercase tracking-tighter">Rate ${dep.ratePct}</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Gross Block</p>
                                    <p class="text-base font-black text-slate-900 mt-1 tabular-nums">${fmt(dep.gross)}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Opening Accum.</p>
                                    <p class="text-base font-black text-rose-500 mt-1 tabular-nums">${fmt(dep.openingAccum)}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest">YTD Expense</p>
                                    <p class="text-base font-black text-amber-600 mt-1 tabular-nums">${fmt(dep.ytd)}</p>
                                </div>
                                <div>
                                    <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Net Book Value</p>
                                    <p class="text-base font-black text-emerald-600 mt-1 tabular-nums">${fmt(dep.nbv)}</p>
                                </div>
                            </div>
                            <div class="mt-4 pt-3 border-t border-amber-200 text-[10px] text-amber-700 font-bold tabular-nums">
                                ${fmt(dep.gross)} − ${fmt(dep.openingAccum)} − ${fmt(dep.ytd)} = <span class="text-emerald-700">${fmt(dep.nbv)}</span>
                            </div>
                        </div>

                        <!-- Chain of Custody -->
                        <div>
                            <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 font-headline text-center">Chain of Custody / Movement Log</h4>
                            <div class="space-y-3">
                                ${transfers.length > 0 ? transfers.map(t => `
                                    <div class="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-slate-300 transition-all">
                                        <div class="flex flex-col items-center gap-1">
                                            <span class="text-[9px] font-black text-slate-400 uppercase">${new Date(t.date).getFullYear()}</span>
                                            <div class="w-2 h-2 rounded-full bg-slate-900"></div>
                                        </div>
                                        <div class="flex-1 grid grid-cols-2 gap-8">
                                            <div>
                                                <p class="text-[8px] font-black text-slate-400 uppercase mb-1">Source Assignee</p>
                                                <p class="text-xs font-black text-slate-900">${t.fromAssignee}</p>
                                                <p class="text-[9px] text-slate-500 italic mt-0.5">${t.fromLocation}</p>
                                            </div>
                                            <div>
                                                <p class="text-[8px] font-black text-indigo-500 uppercase mb-1">Active Custodian</p>
                                                <p class="text-xs font-black text-slate-900">${t.toAssignee}</p>
                                                <p class="text-[9px] text-slate-500 italic mt-0.5">${t.toLocation}</p>
                                            </div>
                                        </div>
                                        <div class="text-[9px] font-black text-slate-400 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">${new Date(t.date).toLocaleDateString()}</div>
                                    </div>
                                `).join('') : '<div class="p-10 text-center text-slate-400 italic text-xs uppercase tracking-widest border border-dashed border-slate-200 rounded-2xl">Original Procurement • No Transfers Recorded</div>'}
                            </div>
                        </div>
                        
                        <!-- Administrative Actions (Manager Only) -->
                        ${this.user.role === 'manager' ? `
                        <div class="pt-6 mt-6 border-t border-slate-100 flex gap-4">
                            <button onclick="app.showEditAssetModal('${asset.id}')" class="flex-1 py-4 bg-slate-100 text-slate-900 text-xs font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-sm">edit</span>
                                Modify Registry Entry
                            </button>
                            <button onclick="app.deleteAssetRequest('${asset.id}')" class="flex-1 py-4 bg-white border border-rose-200 text-rose-500 text-xs font-black rounded-xl hover:bg-rose-50 hover:border-rose-300 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-sm">delete_forever</span>
                                Drop Asset
                            </button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);

        // Close on backdrop click
        document.getElementById('asset-modal-backdrop').addEventListener('click', (e) => {
            if (e.target.id === 'asset-modal-backdrop') e.target.remove();
        });
    }

    closeAssetModal() {
        const backdrop = document.getElementById('asset-modal-backdrop');
        if (backdrop) {
            backdrop.classList.replace('opacity-100', 'opacity-0');
            setTimeout(() => backdrop.remove(), 300);
        }
    }

    // Returns the latest FAR row for a given parentAssetId, or null.
    // Cached per AssetDB.assetFar reference so repeated lookups in a modal/export
    // pass stay O(1).
    _farLatestFor(parentAssetId) {
        if (!parentAssetId) return null;
        const rows = db.assetFar || [];
        if (this._farIndexSrc !== rows) {
            const idx = new Map();
            rows.forEach(r => {
                if (!r?.assetId) return;
                const ex = idx.get(r.assetId);
                if (!ex || (Number(r.fy) || 0) > (Number(ex.fy) || 0)) idx.set(r.assetId, r);
            });
            this._farIndex = idx;
            this._farIndexSrc = rows;
        }
        return this._farIndex.get(parentAssetId) || null;
    }

    // Single source of truth for per-asset depreciation numbers.
    // Mirrors what DepreciationPage shows so the modal + exports never drift.
    // FAR rows (db.assetFar) are the authoritative source; the registry-level
    // fields are a fallback for assets without a linked FAR parent.
    computeAssetDepreciation(asset) {
        let gross = parseFloat(asset.grossBlock || asset.amount || 0);
        let ytd = parseFloat(asset.currentYearDepreciation || 0);
        let totalAccum = parseFloat(asset.accumulatedDepreciation || 0);
        let nbv = asset.netBlock != null && asset.netBlock !== '' ? parseFloat(asset.netBlock) : null;
        let rate = parseFloat(asset.depreciationRate || 0);
        let source = 'Registry';
        let fy = null;

        const registryEmpty = !gross && !ytd && !totalAccum && !nbv;
        if (registryEmpty) {
            const parent = this._farLatestFor(asset.parentAssetId);
            if (parent) {
                const qty = Math.max(1, Number(parent.quantity) || 1);
                gross      = (Number(parent.I) || 0) / qty;
                ytd        = (Number(parent.K) || 0) / qty;
                totalAccum = (Number(parent.N) || 0) / qty;
                nbv        = (Number(parent.P) || 0) / qty;
                rate       = Number(parent.depRate) || rate;
                source     = 'FAR';
                fy         = parent.fy;
            }
        }

        if (nbv == null) nbv = Math.max(0, gross - totalAccum);
        const openingAccum = Math.max(0, totalAccum - ytd);
        const ratePct = rate ? (rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 1) + '%' : 'SLM';

        return { gross, openingAccum, ytd, totalAccum, nbv, rate, ratePct, source, fy };
    }

    exportAssetPDF(id) {
        if (!this.canExportAssets()) { alert('You do not have permission to export.'); return; }
        const asset = db.assets.find(a => a.id === id);
        if (!asset) { alert('Asset not found.'); return; }
        const jsPDFCtor = window.jspdf?.jsPDF || window.jsPDF;
        if (!jsPDFCtor) { alert('PDF library still loading — try again in a moment.'); return; }

        const dep = this.computeAssetDepreciation(asset);
        const transfers = db.transfers.filter(t => t.assetId === id);
        const fmtINR = (n) => 'INR ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
        const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

        const doc = new jsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 12;
        let y = margin;

        const ensureSpace = (need) => {
            if (y + need > pageH - margin) { doc.addPage(); y = margin; }
        };
        const setColor = (r, g, b) => doc.setTextColor(r, g, b);
        const sectionTitle = (label) => {
            ensureSpace(10);
            doc.setFillColor(15, 23, 42);
            doc.rect(margin, y, pageW - margin * 2, 6, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(label.toUpperCase(), margin + 2, y + 4);
            y += 8;
        };
        const kvRow = (rows) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const colW = (pageW - margin * 2) / 2;
            rows.forEach(([k, v]) => {
                ensureSpace(7);
                setColor(100, 116, 139);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.text(String(k).toUpperCase(), margin, y);
                setColor(15, 23, 42);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                const wrapped = doc.splitTextToSize(String(v ?? '—'), pageW - margin * 2 - 40);
                doc.text(wrapped, margin + 45, y);
                y += Math.max(5, wrapped.length * 4) + 1;
            });
        };

        // ── Header
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageW, 22, 'F');
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text('KALIKE ASSET MANAGEMENT · ASSET DETAIL', margin, 8);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.text(String(asset.name || '—'), margin, 14);
        doc.setTextColor(203, 213, 225);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(String(asset.id || ''), margin, 19);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.text(`Generated ${new Date().toLocaleString('en-IN')}`, pageW - margin, 8, { align: 'right' });
        y = 28;

        // ── Identity & Linkage
        sectionTitle('Identity & Linkage');
        kvRow([
            ['Standardized ID', asset.standardizedId || asset.id || '—'],
            ['Legacy ID', asset.assetIdentificationNumber || '—'],
            ['Parent (Finance)', asset.parentAssetId || '—'],
            ['Assignment Code', asset.assignmentCode || '—'],
            ['Category', asset.category || '—'],
            ['Model / Brand', asset.modelName || '—'],
            ['District', asset.district || '—'],
            ['Match Type', asset.parentMatchType || '—']
        ]);
        if (asset.notes) kvRow([['Notes', asset.notes]]);

        // ── Logistics
        sectionTitle('Logistics & Custody');
        kvRow([
            ['Custodian', asset.assignedTo || 'Unassigned'],
            ['Location', asset.location || '—'],
            ['Quantity', asset.quantity || 1],
            ['Status', asset.status || 'Active']
        ]);

        // ── Acquisition
        sectionTitle('Acquisition Schedule');
        kvRow([
            ['Purchase Date', fmtDate(asset.purchaseDate)],
            ['Installation', fmtDate(asset.installationDate)],
            ['Put to Use', fmtDate(asset.putToUseDate)],
            ['Supplier', asset.supplier || '—'],
            ['Bill No.', asset.billNumber || '—'],
            ['Voucher No.', asset.voucherNumber || '—'],
            ['Procurement', asset.procurementType || 'Purchase'],
            ['Funding Source', asset.fundingSource || 'General Fund']
        ]);

        // ── Depreciation
        sectionTitle(`Depreciation${dep.source === 'FAR' ? ` · From FAR (FY ${dep.fy}-${String((Number(dep.fy)+1)%100).padStart(2,'0')})` : ' · Registry'} · Rate ${dep.ratePct}`);
        kvRow([
            ['Gross Block', fmtINR(dep.gross)],
            ['Opening Accum.', fmtINR(dep.openingAccum)],
            ['YTD Expense', fmtINR(dep.ytd)],
            ['Total Accum.', fmtINR(dep.totalAccum)],
            ['Net Book Value', fmtINR(dep.nbv)]
        ]);

        // ── Transfers
        sectionTitle(`Chain of Custody · ${transfers.length} transfer${transfers.length === 1 ? '' : 's'}`);
        if (!transfers.length) {
            ensureSpace(6);
            setColor(148, 163, 184);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(8);
            doc.text('Original procurement — no transfers recorded.', margin, y);
            y += 6;
        } else {
            transfers.forEach((t, i) => {
                kvRow([
                    [`#${i + 1} Date`, fmtDate(t.date)],
                    ['From', `${t.fromAssignee || '—'} · ${t.fromLocation || '—'}`],
                    ['To', `${t.toAssignee || '—'} · ${t.toLocation || '—'}`]
                ]);
            });
        }

        const safeName = `${asset.id}`.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
        doc.save(`Asset_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
    }

    exportAssetExcel(id) {
        if (!this.canExportAssets()) { alert('You do not have permission to export.'); return; }
        const asset = db.assets.find(a => a.id === id);
        if (!asset) { alert('Asset not found.'); return; }
        if (typeof XLSX === 'undefined') { alert('Excel library still loading — try again in a moment.'); return; }

        const dep = this.computeAssetDepreciation(asset);
        const transfers = db.transfers.filter(t => t.assetId === id);

        const summary = [
            { Field: 'Asset ID',                  Value: asset.id },
            { Field: 'Name',                      Value: asset.name },
            { Field: 'Category',                  Value: asset.category || '' },
            { Field: 'Status',                    Value: asset.status || '' },
            { Field: 'Location',                  Value: asset.location || '' },
            { Field: 'Custodian',                 Value: asset.assignedTo || 'Unassigned' },
            { Field: 'Quantity',                  Value: asset.quantity || 1 },
            { Field: 'Supplier',                  Value: asset.supplier || '' },
            { Field: 'Bill No.',                  Value: asset.billNumber || '' },
            { Field: 'Voucher No.',               Value: asset.voucherNumber || '' },
            { Field: 'Purchase Date',             Value: asset.purchaseDate || '' },
            { Field: 'Installation Date',         Value: asset.installationDate || '' },
            { Field: 'Put-to-Use Date',           Value: asset.putToUseDate || '' },
            { Field: 'Funding Source',            Value: asset.fundingSource || '' },
            { Field: 'Funding Amount',            Value: asset.fundingAmount || 0 },
            { Field: 'Procurement Type',          Value: asset.procurementType || 'Purchase' },
            { Field: 'Depreciation Method',       Value: 'Straight-Line (SLM)' },
            { Field: 'Depreciation Rate',         Value: dep.ratePct },
            { Field: 'Gross Block',               Value: dep.gross },
            { Field: 'Opening Accumulated Dep.',  Value: dep.openingAccum },
            { Field: 'Current Year Dep. (YTD)',   Value: dep.ytd },
            { Field: 'Total Accumulated Dep.',    Value: dep.totalAccum },
            { Field: 'Net Book Value',            Value: dep.nbv },
            { Field: 'Useful Life (years)',       Value: asset.usefulLife || '' }
        ];

        const wb = XLSX.utils.book_new();
        const wsSummary = XLSX.utils.json_to_sheet(summary);
        wsSummary['!cols'] = [{ wch: 32 }, { wch: 48 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Asset Summary');

        if (transfers.length) {
            const wsTransfers = XLSX.utils.json_to_sheet(transfers.map(t => ({
                Date: t.date,
                'From Custodian': t.fromAssignee,
                'From Location': t.fromLocation,
                'To Custodian': t.toAssignee,
                'To Location': t.toLocation,
                Reason: t.reason || ''
            })));
            XLSX.utils.book_append_sheet(wb, wsTransfers, 'Transfers');
        }

        const safeName = `${asset.id}`.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
        XLSX.writeFile(wb, `Asset_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }

    showEditAssetModal(id) {
        this.closeAssetModal();
        const asset = db.assets.find(a => a.id === id);
        if (!asset) return;

        const modalHtml = `
            <div id="edit-asset-modal-backdrop" class="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
                    <div class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner border border-indigo-100">
                                <span class="material-symbols-outlined text-2xl">edit_document</span>
                            </div>
                            <div>
                                <h3 class="text-xl font-black text-slate-900 font-headline uppercase tracking-tight">Modify Asset</h3>
                                <p class="text-xs text-slate-400 font-black uppercase tracking-widest">${asset.id}</p>
                            </div>
                        </div>
                        <button onclick="app.closeNearestModal(this)" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
                            <span class="material-symbols-outlined group-hover:rotate-90 transition-transform">close</span>
                        </button>
                    </div>
                    <div class="p-8 space-y-5">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Asset Name</label>
                            <input id="edit-asset-name" type="text" value="${asset.name}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category</label>
                                <select id="edit-asset-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors">
                                    <option value="Equipment" ${asset.category === 'Equipment' ? 'selected' : ''}>Equipment</option>
                                    <option value="Infrastructure" ${asset.category === 'Infrastructure' ? 'selected' : ''}>Infrastructure</option>
                                    <option value="Office" ${asset.category === 'Office' ? 'selected' : ''}>Office</option>
                                    <option value="Vehicle" ${asset.category === 'Vehicle' ? 'selected' : ''}>Vehicle</option>
                                    <option value="Software" ${asset.category === 'Software' ? 'selected' : ''}>Software</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Status</label>
                                <select id="edit-asset-status" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors">
                                    <option value="Active" ${asset.status === 'Active' ? 'selected' : ''}>Active</option>
                                    <option value="Maintenance" ${asset.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                                    <option value="Storage" ${asset.status === 'Storage' ? 'selected' : ''}>Storage</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Location</label>
                                <input id="edit-asset-location" type="text" value="${asset.location || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Acquisition Cost (₹)</label>
                                <input id="edit-asset-amount" type="number" value="${asset.amount || 0}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors tabular-nums" />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">District</label>
                                <input id="edit-asset-district" type="text" value="${asset.district || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assigned to</label>
                                <input id="edit-asset-assigned-to" type="text" value="${asset.assignedTo || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Model / Brand</label>
                                <input id="edit-asset-model-name" type="text" value="${asset.modelName || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assignment Code</label>
                                <input id="edit-asset-assignment-code" type="text" value="${asset.assignmentCode || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Notes</label>
                            <textarea id="edit-asset-notes" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors resize-none">${asset.notes || ''}</textarea>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 space-y-2">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Identity (read-only)</p>
                            <div class="grid grid-cols-1 gap-1.5 text-[10px] font-mono break-all">
                                <p><span class="text-slate-400">STD ID:</span> <span class="text-slate-900 font-bold">${asset.id || '—'}</span></p>
                                <p><span class="text-slate-400">Legacy ID:</span> <span class="text-amber-600 font-bold">${asset.assetIdentificationNumber || '—'}</span></p>
                                <p><span class="text-slate-400">Parent (Finance):</span> <span class="text-indigo-600 font-bold">${asset.parentAssetId || '—'}</span></p>
                            </div>
                        </div>
                        <div id="edit-asset-error" class="hidden text-xs text-rose-500 font-bold text-center"></div>
                        <button onclick="app.submitEditAsset('${asset.id}')" class="w-full py-4 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all uppercase tracking-[.2em] shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 group">
                            <span class="material-symbols-outlined text-sm">save</span>
                            Save Modifications
                        </button>
                    </div>
                </div>
            </div>
        `;
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);

        document.getElementById('edit-asset-modal-backdrop').addEventListener('click', (e) => {
            if (e.target.id === 'edit-asset-modal-backdrop') e.target.remove();
        });
    }

    submitEditAsset(id) {
        const $ = (sel) => document.getElementById(sel);
        const name = $('edit-asset-name').value.trim();
        const category = $('edit-asset-category').value;
        const status = $('edit-asset-status').value;
        const location = $('edit-asset-location').value.trim();
        const amount = $('edit-asset-amount').value;
        const district = $('edit-asset-district').value.trim();
        const assignedTo = $('edit-asset-assigned-to').value.trim();
        const modelName = $('edit-asset-model-name').value.trim();
        const assignmentCode = $('edit-asset-assignment-code').value.trim();
        const notes = $('edit-asset-notes').value.trim();
        const errorEl = $('edit-asset-error');

        if (!name) {
            errorEl.textContent = 'Asset name is required.';
            errorEl.classList.remove('hidden');
            return;
        }

        db.updateAsset(id, {
            name, category, status, location,
            amount: parseFloat(amount) || 0,
            district: district || null,
            assignedTo: assignedTo || null,
            modelName: modelName || null,
            assignmentCode: assignmentCode || null,
            notes: notes || null,
        });
        document.getElementById('edit-asset-modal-backdrop').remove();
        // Option 1: Re-open asset modal
        this.showAssetModal(id);
        // Option 2: Force complete re-render if in registry to update table
        if (this.currentPage === 'registry') {
             this.navigate('registry');
             this.showAssetModal(id);
        }
    }

    deleteAssetRequest(id) {
        const confirmed = window.confirm('CRITICAL WARNING:\n\nYou are about to permanently drop this asset from the institutional registry. This action will erase all chain-of-custody transfers and associated metadata.\n\nProceed?');
        if (confirmed) {
            db.deleteAsset(id);
            this.closeAssetModal();
            if (this.currentPage === 'registry') this.navigate('registry');
        }
    }

    showGrantModal(id) {
        const grant = db.grants.find(g => g.id === id);
        if (!grant) return;

        const fundedAssets = db.assets.filter(a => a.fundingSource === id);
        const burnPct = Math.min(100, (grant.spent / grant.openingBalance * 100)).toFixed(0);

        const modalHtml = `
            <div id="grant-modal-backdrop" class="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div class="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
                    <!-- Modal Header -->
                    <div class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <span class="material-symbols-outlined text-2xl">workspace_premium</span>
                            </div>
                            <div>
                                <h3 class="text-xl font-black text-slate-900 font-headline uppercase tracking-tight">${grant.name}</h3>
                                <p class="text-xs text-indigo-400 font-black uppercase tracking-widest">${grant.id} / ${grant.program}</p>
                            </div>
                        </div>
                        <button onclick="app.closeNearestModal(this)" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
                            <span class="material-symbols-outlined group-hover:rotate-90 transition-transform">close</span>
                        </button>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-8 overflow-y-auto space-y-8 flex-1 scroll-container">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Total Awarded</h4>
                                <p class="text-2xl font-black text-slate-900 tabular-nums">₹${grant.openingBalance.toLocaleString()}</p>
                            </div>
                            <div class="bg-rose-50/30 p-6 rounded-2xl border border-rose-100">
                                <h4 class="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">Total Spent</h4>
                                <p class="text-2xl font-black text-rose-600 tabular-nums">₹${grant.spent.toLocaleString()}</p>
                            </div>
                            <div class="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100">
                                <h4 class="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Closing Balance</h4>
                                <p class="text-2xl font-black text-emerald-600 tabular-nums">₹${grant.closingBalance.toLocaleString()}</p>
                            </div>
                        </div>

                        <!-- Utilization -->
                        <div>
                            <div class="flex justify-between items-end mb-2">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Fund Utilization Rate</span>
                                <span class="text-[10px] font-black text-slate-900 tabular-nums leading-none">${burnPct}%</span>
                            </div>
                            <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div class="h-full bg-indigo-500 transition-all duration-1000 ease-out" style="width: ${burnPct}%"></div>
                            </div>
                        </div>

                        <!-- Asset Roster -->
                        <div>
                            <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 font-headline text-center">Procured Assets Portfolio</h4>
                            <div class="space-y-3">
                                ${fundedAssets.length > 0 ? fundedAssets.map(a => `
                                    <div class="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
                                        <div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                                            <span class="material-symbols-outlined text-[16px]">inventory_2</span>
                                        </div>
                                        <div class="flex-1">
                                            <p class="text-sm font-black text-slate-900 leading-none">${a.name}</p>
                                            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">${a.id}</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-[9px] font-black text-slate-400 uppercase mb-0.5">Asset Cost</p>
                                            <p class="text-sm font-black text-slate-900 tabular-nums">₹${a.amount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                `).join('') : '<div class="p-10 text-center text-slate-400 italic text-xs uppercase tracking-widest border border-dashed border-slate-200 rounded-2xl">No assets currently attributed to this grant.</div>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);

        // Close on backdrop click
        document.getElementById('grant-modal-backdrop').addEventListener('click', (e) => {
            if (e.target.id === 'grant-modal-backdrop') e.target.remove();
        });
    }

    showAddGrantModal() {
        const modalHtml = `
            <div id="add-grant-modal-backdrop" class="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
                    <div class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                <span class="material-symbols-outlined text-2xl">workspace_premium</span>
                            </div>
                            <div>
                                <h3 class="text-xl font-black text-slate-900 font-headline uppercase tracking-tight">Register New Grant</h3>
                                <p class="text-xs text-indigo-400 font-black uppercase tracking-widest">Endowment Tracking Initiation</p>
                            </div>
                        </div>
                        <button onclick="app.closeNearestModal(this)" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
                            <span class="material-symbols-outlined group-hover:rotate-90 transition-transform">close</span>
                        </button>
                    </div>
                    <div class="p-8 space-y-5">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Grant / Endowment Name</label>
                            <input id="new-grant-name" type="text" placeholder="e.g. World Bank Tech Initiative" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Program Area</label>
                            <input id="new-grant-program" type="text" placeholder="e.g. Education Technology" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-colors" />
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Total Awarded Amount (₹)</label>
                            <input id="new-grant-amount" type="number" placeholder="1000000" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 outline-none transition-colors tabular-nums" />
                        </div>
                        <div id="new-grant-error" class="hidden text-xs text-rose-500 font-bold text-center"></div>
                        <button onclick="app.submitNewGrant()" class="w-full py-4 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all uppercase tracking-[.2em] shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group">
                            <span class="material-symbols-outlined text-sm group-hover:rotate-90 transition-transform">save</span>
                            Initialize Ledger
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);

        document.getElementById('add-grant-modal-backdrop').addEventListener('click', (e) => {
            if (e.target.id === 'add-grant-modal-backdrop') e.target.remove();
        });
    }

    submitNewGrant() {
        const name = document.getElementById('new-grant-name').value.trim();
        const program = document.getElementById('new-grant-program').value.trim();
        const amount = document.getElementById('new-grant-amount').value;
        const errorEl = document.getElementById('new-grant-error');

        if (!name || !program || !amount) {
            errorEl.textContent = 'All fields are required.';
            errorEl.classList.remove('hidden');
            return;
        }

        db.addNewGrant({ name, program, amount });
        document.getElementById('add-grant-modal-backdrop').remove();
        if (this.currentPage === 'grants') this.navigate('grants');
    }

    showAddAssetModal() {
        const modalHtml = `
            <div id="add-asset-modal-backdrop" class="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div class="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
                    <div class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                                <span class="material-symbols-outlined text-2xl">add_circle</span>
                            </div>
                            <div>
                                <h3 class="text-xl font-black text-slate-900 font-headline uppercase tracking-tight">Register New Asset</h3>
                                <p class="text-xs text-slate-400 font-black uppercase tracking-widest">Institutional Procurement Entry</p>
                            </div>
                        </div>
                        <button onclick="app.closeNearestModal(this)" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
                            <span class="material-symbols-outlined group-hover:rotate-90 transition-transform">close</span>
                        </button>
                    </div>
                    <div class="p-8 space-y-5 overflow-y-auto scroll-container">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Asset Name</label>
                            <input id="new-asset-name" type="text" placeholder="e.g. Dell Latitude 7450" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category</label>
                                <select id="new-asset-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors">
                                    <option value="Equipment">Equipment</option>
                                    <option value="Infrastructure">Infrastructure</option>
                                    <option value="Office">Office</option>
                                    <option value="Vehicle">Vehicle</option>
                                    <option value="Software">Software</option>
                                </select>
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Status</label>
                                <select id="new-asset-status" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors">
                                    <option value="Active">Active</option>
                                    <option value="Storage">Storage</option>
                                </select>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Location</label>
                                <input id="new-asset-location" type="text" placeholder="e.g. Bangalore HQ" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Acquisition Cost (₹)</label>
                                <input id="new-asset-amount" type="number" placeholder="0" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors tabular-nums" />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">District</label>
                                <input id="new-asset-district" type="text" placeholder="e.g. Bangalore" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assigned to</label>
                                <input id="new-asset-assigned-to" type="text" placeholder="Custodian name" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Model / Brand</label>
                                <input id="new-asset-model-name" type="text" placeholder="e.g. Dell Inspiron 3520" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assignment Code</label>
                                <input id="new-asset-assignment-code" type="text" placeholder="optional" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Parent Asset ID (Finance) — optional</label>
                            <input id="new-asset-parent-id" type="text" list="far-parents-datalist" placeholder="Start typing to link to a financial parent..." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold focus:border-slate-900 outline-none transition-colors" />
                            <datalist id="far-parents-datalist">
                                ${(db.assetFar || []).slice(0, 500).map(p => `<option value="${(p.assetId || '').replace(/"/g, '&quot;')}">${(p.assetClass || '').replace(/"/g, '&quot;')}</option>`).join('')}
                            </datalist>
                        </div>
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Notes</label>
                            <textarea id="new-asset-notes" rows="2" placeholder="optional" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors resize-none"></textarea>
                        </div>
                        <div id="new-asset-error" class="hidden text-xs text-rose-500 font-bold text-center"></div>
                        <button onclick="app.submitNewAsset()" class="w-full py-4 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all uppercase tracking-[.2em] shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 group">
                            <span class="material-symbols-outlined text-sm group-hover:rotate-90 transition-transform">check_circle</span>
                            Commit to Registry
                        </button>
                    </div>
                </div>
            </div>
        `;

        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv.firstElementChild);

        document.getElementById('add-asset-modal-backdrop').addEventListener('click', (e) => {
            if (e.target.id === 'add-asset-modal-backdrop') e.target.remove();
        });
    }

    submitNewAsset() {
        const $ = (sel) => document.getElementById(sel);
        const name = $('new-asset-name').value.trim();
        const category = $('new-asset-category').value;
        const status = $('new-asset-status').value;
        const location = $('new-asset-location').value.trim();
        const amount = $('new-asset-amount').value;
        const district = $('new-asset-district').value.trim();
        const assignedTo = $('new-asset-assigned-to').value.trim();
        const modelName = $('new-asset-model-name').value.trim();
        const assignmentCode = $('new-asset-assignment-code').value.trim();
        const parentAssetId = $('new-asset-parent-id').value.trim();
        const notes = $('new-asset-notes').value.trim();
        const errorEl = $('new-asset-error');

        if (!name || !location || !amount) {
            errorEl.textContent = 'Name, location, and acquisition cost are required.';
            errorEl.classList.remove('hidden');
            return;
        }

        // If a parent ID is given, validate it actually exists in the FAR.
        if (parentAssetId) {
            const exists = (db.assetFar || []).some(p => p.assetId === parentAssetId);
            if (!exists) {
                errorEl.textContent = `Parent Asset ID "${parentAssetId}" not found in finance register.`;
                errorEl.classList.remove('hidden');
                return;
            }
        }

        db.addNewAsset({
            name, category, status, location, amount,
            district: district || null,
            assignedTo: assignedTo || null,
            modelName: modelName || null,
            assignmentCode: assignmentCode || null,
            parentAssetId: parentAssetId || null,
            parentMatchType: parentAssetId ? 'MANUAL' : null,
            notes: notes || null,
        });

        // Close modal and refresh registry view
        document.getElementById('add-asset-modal-backdrop').remove();
        this.navigate('registry');
    }

    exportCSV(type) {
        if ((type === 'assets' || type === 'finance_assets' || type === 'grants' || type === 'depreciation') && !this.canExportAssets()) {
            alert('Only finance, director, operations, or superadmin can export asset/finance data.');
            return;
        }
        const btn = event.currentTarget;
        if (btn) btn.classList.add('animate-export-pulse');

        setTimeout(() => {
            let csvContent = "data:text/csv;charset=utf-8,";
            let filename = `amp_${type}_${new Date().toISOString().split('T')[0]}.csv`;

            function idSafe(str) { return `"${String(str).replace(/"/g, '""')}"`; }

            if (type === 'assets' || type === 'finance_assets') {
                const headers = [
                    "Asset Identification Number", 
                    "Asset class", 
                    "Description", 
                    "Location", 
                    "Procurement Type", 
                    "Acquisition Date", 
                    "Supplier Name", 
                    "Bill No.", 
                    "Date of Installation", 
                    "Date put to use", 
                    "Voucher No.", 
                    "Quantity", 
                    "Depreciation Rate", 
                    "Opening Gross Block", 
                    "Accumulated Depreciation", 
                    "Net Block",
                    "Donor Name"
                ];
                csvContent += headers.join(",") + "\n";
                db.assets.forEach(a => {
                    csvContent += [
                        idSafe(a.id), 
                        idSafe(a.category), 
                        idSafe(a.name), 
                        idSafe(a.location), 
                        idSafe(a.procurementType || 'Purchase'), 
                        idSafe(a.purchaseDate), 
                        idSafe(a.supplier || 'N/A'), 
                        idSafe(a.billNumber || 'N/A'), 
                        idSafe(a.installationDate || 'N/A'), 
                        idSafe(a.putToUseDate || 'N/A'), 
                        idSafe(a.voucherNumber || 'N/A'), 
                        a.quantity || 1,
                        a.depreciationRate || 0.1,
                        a.amount || 0,
                        a.accumulatedDepreciation || 0,
                        a.netBlock || 0,
                        idSafe(a.fundingSource || 'Entity Funds')
                    ].join(",") + "\n";
                });
            } else if (type === 'grants') {
                const headers = [
                    "Asset ID", "Asset Name", "Category", "Location", "Procurement Type", 
                    "Purchase Date", "Supplier", "Bill Number", "Installation Date", "Quantity", 
                    "Voucher Number", "Depreciation Rate", "Gross Block", "Accumulated Depreciation", 
                    "Current Year Depreciation", "Net Block", "Funding Source", "Custodian"
                ];
                csvContent += headers.join(",") + "\n";
                db.assets.forEach(a => {
                    csvContent += [
                        idSafe(a.id), idSafe(a.name), idSafe(a.category), idSafe(a.location), idSafe(a.procurementType), 
                        idSafe(a.purchaseDate), idSafe(a.supplier), idSafe(a.billNumber), idSafe(a.installationDate), a.quantity || 1, 
                        idSafe(a.voucherNumber), a.depreciationRate || 0, a.grossBlock || 0, a.accumulatedDepreciation || 0, 
                        a.currentYearDepreciation || 0, a.netBlock || 0, idSafe(a.fundingSource || 'N/A'), idSafe(a.assignedTo)
                    ].join(",") + "\n";
                });
            } else if (type === 'depreciation') {
                const headers = ["ID", "Name", "Source", "FY", "Parent FAR ID", "Rate", "Cost Basis", "YTD Expense", "Accum. Depreciation", "Net Book Value"];
                csvContent += headers.join(",") + "\n";
                const farIdx = new Map();
                (db.assetFar || []).forEach(r => {
                    if (!r?.assetId) return;
                    const ex = farIdx.get(r.assetId);
                    if (!ex || (Number(r.fy) || 0) > (Number(ex.fy) || 0)) farIdx.set(r.assetId, r);
                });
                db.assets.forEach(a => {
                    const parent = a.parentAssetId ? farIdx.get(a.parentAssetId) : null;
                    let gross, ytd, accum, nbv, rate, source, fy, parentId;
                    if (parent) {
                        const qty = Math.max(1, Number(parent.quantity) || 1);
                        gross = (Number(parent.I) || 0) / qty;
                        ytd   = (Number(parent.K) || 0) / qty;
                        accum = (Number(parent.N) || 0) / qty;
                        nbv   = (Number(parent.P) || 0) / qty;
                        rate  = Number(parent.depRate) || 0;
                        source = "FAR"; fy = parent.fy; parentId = parent.assetId;
                    } else {
                        const dep = this.computeAssetDepreciation(a);
                        gross = dep.gross; ytd = dep.ytd; accum = dep.totalAccum; nbv = dep.nbv;
                        rate = dep.rate; source = "Registry"; fy = ""; parentId = "";
                    }
                    csvContent += [
                        idSafe(a.id), idSafe(a.name), source, fy, idSafe(parentId),
                        rate, gross.toFixed(2), ytd.toFixed(2), accum.toFixed(2), nbv.toFixed(2)
                    ].join(",") + "\n";
                });
            } else if (type === 'requests') {
                const headers = ["ID", "Category", "Reason", "User", "Date", "Status", "Manager Approved", "Finance Approved"];
                csvContent += headers.join(",") + "\n";
                db.requests.forEach(r => {
                    csvContent += [r.id, idSafe(r.category), idSafe(r.reason), idSafe(r.user), new Date(r.date).toLocaleDateString(), idSafe(r.status), r.managerApproved, r.financeApproved].join(",") + "\n";
                });
            }

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (btn) btn.classList.remove('animate-export-pulse');
        }, 800);
    }

    exportExcel(e) {
        if (!this.canExportAssets()) {
            alert('Only finance, director, operations, hr, or superadmin can export the asset register.');
            return;
        }
        if (typeof XLSX === 'undefined') {
            alert("Excel library is still loading. Please try again in a few seconds.");
            return;
        }

        const btn = e ? e.currentTarget : null;
        if (btn) btn.classList.add('animate-export-pulse');

        setTimeout(() => {
            const workbook = XLSX.utils.book_new();
            
            // 1. MASTER SHEET
            const masterData = db.assets.map(a => ({
                "Asset Identification Number": a.id,
                "Asset class": a.category,
                "Description": a.name,
                "Location": a.location,
                "Whether purchased by the entity or received in kind (Purchase/Kind)": a.procurementType || 'Purchase',
                "Acquisition Date": a.purchaseDate,
                "Supplier Name": a.supplier || 'N/A',
                "Bill No.": a.billNumber || 'N/A',
                "Date of Installation": a.installationDate || 'N/A',
                "Date put to use": a.putToUseDate || 'N/A',
                "Voucher No.": a.voucherNumber || 'N/A',
                "Quantity": a.quantity || 1,
                "Depreciation Rate*": a.depreciationRate || 0.1,
                "Gross Block Opening Balance": a.amount || 0,
                "Acc. Depreciaton Opening Balance": a.accumulatedDepreciation || 0,
                "Net Block": a.netBlock || 0,
                "Donor Name": a.fundingSource || 'Entity Funds'
            }));
            const masterSheet = XLSX.utils.json_to_sheet(masterData);
            XLSX.utils.book_append_sheet(workbook, masterSheet, "Master Register");

            const filename = `Institutional_Asset_Register_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, filename);
            
            if (btn) btn.classList.remove('animate-export-pulse');
        }, 800);
    }

    backupDatabase() {
        const snapshot = {
            _meta: {
                version: '3.0',
                exportedAt: new Date().toISOString(),
                totalAssets: db.assets.length
            },
            assets: db.assets,
            grants: db.grants,
            maintenanceLogs: db.maintenanceLogs,
            requests: db.requests,
            transfers: db.transfers
        };

        const json = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `AssetPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    restoreDatabase() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const snapshot = JSON.parse(evt.target.result);
                    if (!snapshot.assets || !Array.isArray(snapshot.assets)) {
                        alert('Invalid backup file.');
                        return;
                    }
                    const confirmed = window.confirm(`Restore backup? This will overwrite all current data.`);
                    if (!confirmed) return;

                    db.adapter.syncAll({
                        assets: snapshot.assets,
                        grants: snapshot.grants || [],
                        maintenanceLogs: snapshot.maintenanceLogs || [],
                        requests: snapshot.requests || [],
                        transfers: snapshot.transfers || []
                    }).then(() => {
                        window.location.reload();
                    }).catch(err => {
                        alert('Sync failed: ' + err.message);
                    });
                } catch (err) {
                    alert('Failed to restore: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    handleRevert(logId, actionName) {
        if (!confirm(`Are you sure you want to revert: "${actionName}"?`)) return;
        try {
            const result = db.revertAction(logId);
            if (result.success) {
                this.render();
            } else {
                alert('Rollback Failed: ' + result.message);
            }
        } catch (err) {
            alert('Critical Error during Revert: ' + err.message);
        }
    }

    // ─── Fixed Asset Register (per-FY depreciation schedule) ────────────────
    // Backs the DepreciationSchedulePage. All cross-network work goes through
    // db.adapter.authFetch so JWT + 401 handling is uniform with other pages.

    async farInit() {
        const state = window.__farState;
        if (!state) return;
        try {
            const yearsRes = await db.adapter.authFetch('/api/far/years');
            state.years = await yearsRes.json();
            if (!state.fy && state.years.length) state.fy = state.years[0].fy;
            if (!state.fy) {
                const now = new Date();
                state.fy = (now.getMonth() + 1 >= 4 ? now.getFullYear() : now.getFullYear() - 1) - 1;
            }
            await this.farLoadRows();
            rerenderFAR();
        } catch (err) {
            console.error('FAR init failed:', err);
            const body = document.getElementById('far-body');
            if (body) body.innerHTML = `<div class="p-8 text-center text-rose-500 text-xs font-bold uppercase tracking-widest">Failed to load register: ${err.message}</div>`;
        }
    }

    async farLoadRows() {
        const state = window.__farState;
        if (!state?.fy) { state.rows = []; return; }
        const res = await db.adapter.authFetch(`/api/far?fy=${encodeURIComponent(state.fy)}`);
        state.rows = await res.json();
    }

    async farSelectFY(fy) {
        const state = window.__farState;
        if (!state) return;
        state.fy = Number(fy);
        state.selectedId = null;
        state.editingId = null;
        await this.farLoadRows();
        rerenderFAR();
    }

    farSetFilter(key, value) {
        const state = window.__farState;
        if (!state) return;
        state[key] = value;
        rerenderFAR();
    }

    farResetFilters() { _farResetFilters(); }
    toggleFarFilters() { _toggleFarFilters(); }

    // ── Depreciation Schedule filters ────────────────────────
    depSetFilter(key, value) { _depSetFilter(key, value); }
    depResetFilters() { _depResetFilters(); }
    depExportFiltered(e) { _depExportFiltered(e?.currentTarget || null); }
    depExportFilteredXlsx(e) { _depExportFilteredXlsx(e?.currentTarget || null); }
    toggleDepFilters() {
        const el = document.getElementById('dep-toolbar');
        if (!el) return;
        el.classList.toggle('hidden');
    }

    // ── Asset Registry filters ───────────────────────────────
    regSetFilter(key, value) { _regSetFilter(key, value); }
    regResetFilters() { _regResetFilters(); }
    toggleRegFilters() { _toggleRegFilters(); }

    // ── Fixed Assets filters ─────────────────────────────────
    faSetFilter(key, value) { _faSetFilter(key, value); }
    faResetFilters() { _faResetFilters(); }
    toggleFaFilters() { _toggleFaFilters(); }
    faShowDetail(id) { _faShowDetail(id); }
    faExportXlsx(e) { _faExportXlsx(e?.currentTarget || null); }

    // ── New-asset-number flow ────────────────────────────────
    farIssueNumber() {
        const state = window.__farState;
        if (!state?.fy) { alert('Select a financial year first.'); return; }
        openIssueNumberModal();
    }

    farCloseIssueModal() { closeFarModal('far-issue-modal'); }

    farIssueRefresh() { refreshIssuePreview(); }

    async farIssueSubmit() {
        const errBox = document.getElementById('iss-error');
        const showErr = (m) => { if (errBox) { errBox.textContent = m; errBox.classList.remove('hidden'); } };
        const get = (id) => (document.getElementById(id)?.value || '').trim();
        const num = (id) => Number(document.getElementById(id)?.value) || 0;

        const assetClass    = get('iss-class');
        const funder        = get('iss-funder');
        const site          = get('iss-site');
        const description   = get('iss-desc');
        const quantity      = Math.max(1, parseInt(get('iss-qty')) || 1);
        const fy            = parseInt(get('iss-fy')) || 0;
        const purchaseOrKind= get('iss-pok') || 'Purchase';
        const acqDate       = get('iss-acq');
        const supplierName  = get('iss-supp');
        const billNo        = get('iss-bill');
        const voucherNo     = get('iss-vou');
        const installDate   = get('iss-inst');
        const putToUseDate  = get('iss-put');
        const usefulLife    = get('iss-life');
        const depRate       = Number(get('iss-rate')) || 0;
        const totalAmount   = num('iss-total');
        const donor         = get('iss-donor');

        if (!assetClass)  { showErr('Asset Class is required.'); return; }
        if (!funder)      { showErr('Funder / Project is required.'); return; }
        if (!site)        { showErr('Site / Location is required.'); return; }
        if (!description) { showErr('Description is required.'); return; }
        if (!fy)          { showErr('Financial Year is required.'); return; }
        if (!acqDate)     { showErr('Acquisition Date is required.'); return; }
        if (totalAmount <= 0) { showErr('Total Amount must be greater than zero.'); return; }

        const assetId = buildAssetIdPreview({ funder, site, description, quantity, fy });
        if (!assetId) { showErr('Could not build asset ID. Check classification fields.'); return; }

        const perUnit = totalAmount / quantity;

        const farPayload = {
            assetId, fy, assetClass, depRate,
            description, location: site,
            purchaseOrKind, acqDate,
            supplierName, billNo,
            installationDate: installDate || null,
            datePutToUse: putToUseDate || null,
            quantity, voucherNo, usefulLifeYears: usefulLife,
            grossBlockOpening: 0,
            additions: totalAmount,
            disposalsGross: 0,
            accDepOpening: 0,
            disposalsAccDep: 0,
            netBlockPrevFY: 0,
            disposalDate: null,
            proceedsOnDisposal: 0,
            donor, status: 'In Use'
        };

        try {
            const res = await db.adapter.authFetch('/api/far', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(farPayload)
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || `FAR insert failed (HTTP ${res.status})`);
            }
        } catch (err) {
            showErr('FAR row failed: ' + err.message);
            return;
        }

        // Build N registry rows — one per physical unit so each can be tracked / assigned independently.
        // Per-unit registry IDs use the same KALIKE/.../desc NN/fy pattern but with a single seq per unit.
        const fyLbl = `${fy}-${String((fy + 1) % 100).padStart(2, '0')}`;
        const rangeMatch = assetId.match(/\s(\d{2})(?: to (\d{2}))?\//);
        const startSeq = rangeMatch ? parseInt(rangeMatch[1], 10) : 1;
        const registryFailures = [];
        for (let i = 1; i <= quantity; i++) {
            const suffix = String(startSeq + i - 1).padStart(2, '0');
            const finalId = assetId.replace(/\s\d{2}(?: to \d{2})?\//, ` ${suffix}/`);
            const row = {
                id: finalId,
                name: description,
                category: assetClass,
                status: 'Active',
                location: site,
                health: '100.0%',
                purchaseDate: acqDate,
                amount: perUnit,
                grossBlock: perUnit,
                netBlock: perUnit,
                program: funder,
                assignedTo: 'Unassigned',
                assignedToId: 'N/A',
                assignedToDesignation: 'N/A',
                depreciation: 0,
                accumulatedDepreciation: 0,
                currentYearDepreciation: 0,
                fundingSource: donor || funder,
                fundingAmount: perUnit,
                procurementType: purchaseOrKind,
                supplier: supplierName || 'N/A',
                billNumber: billNo || 'N/A',
                voucherNumber: voucherNo || 'N/A',
                installationDate: installDate || acqDate,
                putToUseDate: putToUseDate || acqDate,
                quantity: 1,
                depreciationRate: depRate,
                usefulLife: usefulLife || null,
                parentAssetId: assetId,
                assetIdentificationNumber: finalId,
                notes: `FY ${fyLbl} · unit ${suffix} of ${String(startSeq + quantity - 1).padStart(2,'0')}`
            };
            try {
                const r = await db.adapter.authFetch('/api/assets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(row)
                });
                if (!r.ok) {
                    const j = await r.json().catch(() => ({}));
                    registryFailures.push(`#${suffix}: ${j.error || 'HTTP ' + r.status}`);
                }
            } catch (err) {
                registryFailures.push(`#${suffix}: ${err.message}`);
            }
        }

        closeFarModal('far-issue-modal');
        await this.farLoadRows();
        // Refresh local AssetDB cache so the new registry rows appear if user navigates to Registry.
        try { await db.adapter.fetchCollection('assets').then(rows => { if (Array.isArray(rows)) db.assets = rows; }); } catch (_) {}
        rerenderFAR();

        if (registryFailures.length) {
            alert(`FAR row created, but ${registryFailures.length} registry row(s) failed:\n${registryFailures.join('\n')}`);
        } else {
            alert(`Issued ${assetId}\nFAR: 1 grouped row\nRegistry: ${quantity} unit row(s)`);
        }
    }

    farRowClick(event, id) {
        // Don't hijack clicks on the delete button or other interactive elements.
        if (event?.target?.closest('button, input, select, a')) return;
        const state = window.__farState;
        if (!state || state.editingId) return;
        state.selectedId = state.selectedId === id ? null : id;
        rerenderFAR();
    }

    farClearSelection() {
        const state = window.__farState;
        if (!state) return;
        state.selectedId = null;
        rerenderFAR();
    }

    farStartEdit() {
        const state = window.__farState;
        if (!state?.selectedId) return;
        const row = state.rows.find(r => r.id === state.selectedId);
        if (!row || row.locked) return;
        state.editingId = state.selectedId;
        rerenderFAR();
        // Focus the first editable input in the editing row.
        setTimeout(() => {
            const tr = document.querySelector(`tr[data-row-id="${state.editingId}"]`);
            tr?.querySelector('input')?.focus();
        }, 50);
    }

    async farFinishEdit() {
        const state = window.__farState;
        if (!state?.editingId) return;
        // Pull any uncommitted values from focused inputs (onchange may not have
        // fired yet if the user clicked "Done" without leaving the field).
        const tr = document.querySelector(`tr[data-row-id="${state.editingId}"]`);
        tr?.querySelectorAll('input[data-id][data-col]').forEach(inp => {
            this.farSaveCell({ target: inp });
        });
        const row = state.rows.find(r => r.id === state.editingId);
        if (!row) { state.editingId = null; rerenderFAR(); return; }
        try {
            await this.farPersistRow(row);
            state.editingId = null;
            rerenderFAR();
        } catch (err) {
            alert('Save failed: ' + err.message);
            await this.farLoadRows();
            state.editingId = null;
            rerenderFAR();
        }
    }

    async farCancelEdit() {
        const state = window.__farState;
        if (!state) return;
        // Re-fetch to discard any in-flight cell saves the user wants to revert.
        // (Per-cell saves are persisted on blur; "Cancel" reloads canonical row state.)
        state.editingId = null;
        await this.farLoadRows();
        rerenderFAR();
    }

    // During edit mode, cell changes are staged in memory only. The actual
    // POST happens when the user clicks "Done" (farFinishEdit). This makes
    // "Cancel" able to discard genuinely — we just reload from the server.
    farSaveCell(event) {
        const input = event?.target;
        if (!input) return;
        const id = input.dataset.id;
        const col = input.dataset.col;
        const state = window.__farState;
        const row = state?.rows.find(r => r.id === id);
        if (!row) return;
        const raw = input.value;
        const value = input.type === 'number' ? (raw === '' ? 0 : Number(raw)) : raw;
        if (input.type === 'number' && Number.isNaN(value)) {
            alert('Please enter a valid number.');
            input.value = row[col] ?? '';
            return;
        }
        row[col] = value;
        // No rerender — keeps user's focus on the next input as they tab through.
    }

    async farPersistRow(row) {
        const res = await db.adapter.authFetch('/api/far', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: row.id,
                assetId: row.assetId,
                fy: row.fy,
                assetClass: row.assetClass,
                depRate: row.depRate,
                acqDate: row.acqDate,
                refinedAcqDate: row.refinedAcqDate,
                grossBlockOpening: row.grossBlockOpening,
                additions: row.additions,
                disposalsGross: row.disposalsGross,
                accDepOpening: row.accDepOpening,
                disposalsAccDep: row.disposalsAccDep,
                netBlockPrevFY: row.netBlockPrevFY,
                disposalDate: row.disposalDate,
                proceedsOnDisposal: row.proceedsOnDisposal,
                donor: row.donor,
                status: row.status
            })
        });
        const payload = await res.json();
        if (payload?.computed) Object.assign(row, payload.computed);
    }

    farAddNew() {
        const state = window.__farState;
        if (!state?.fy) { alert('Select a financial year first.'); return; }
        openAddRowModal();
    }

    farCloseAddModal() { closeFarModal('far-add-modal'); }

    async farSubmitAddModal() {
        const state = window.__farState;
        if (!state?.fy) return;
        const errBox = document.getElementById('far-add-error');
        const showErr = (msg) => { if (errBox) { errBox.textContent = msg; errBox.classList.remove('hidden'); } };

        const get = (id) => document.getElementById(id);
        const val = (id) => (get(id)?.value || '').trim();
        const num = (id) => Number(get(id)?.value) || 0;

        const assetId = val('far-new-assetId');
        if (!assetId) { showErr('Asset Identification Number is required.'); return; }
        const assetClass = val('far-new-assetClass');
        if (!assetClass) { showErr('Asset Class is required.'); return; }
        const depRate = num('far-new-depRate');

        const payload = {
            assetId, fy: state.fy, assetClass, depRate,
            description:        val('far-new-description'),
            location:           val('far-new-location'),
            purchaseOrKind:     val('far-new-purchaseOrKind'),
            acqDate:            val('far-new-acqDate') || null,
            supplierName:       val('far-new-supplierName'),
            billNo:             val('far-new-billNo'),
            installationDate:   val('far-new-installationDate') || null,
            datePutToUse:       val('far-new-datePutToUse') || null,
            quantity:           num('far-new-quantity') || 1,
            voucherNo:          val('far-new-voucherNo'),
            usefulLifeYears:    val('far-new-usefulLifeYears'),
            grossBlockOpening:  num('far-new-grossBlockOpening'),
            additions:          num('far-new-additions'),
            disposalsGross:     num('far-new-disposalsGross'),
            accDepOpening:      num('far-new-accDepOpening'),
            disposalsAccDep:    num('far-new-disposalsAccDep'),
            netBlockPrevFY:     num('far-new-netBlockPrevFY'),
            disposalDate:       val('far-new-disposalDate') || null,
            proceedsOnDisposal: num('far-new-proceedsOnDisposal'),
            donor:              val('far-new-donor'),
            status:             val('far-new-status') || 'In Use'
        };

        try {
            const res = await db.adapter.authFetch('/api/far', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || `HTTP ${res.status}`);
            }
            closeFarModal('far-add-modal');
            await this.farLoadRows();
            rerenderFAR();
        } catch (err) {
            showErr('Add failed: ' + err.message);
        }
    }

    farDelete(id) {
        const state = window.__farState;
        const row = state?.rows?.find(r => r.id === id);
        if (!row) return;
        openDeleteModal(row);
    }

    farCloseDeleteModal() { closeFarModal('far-delete-modal'); }

    async farConfirmDelete(id) {
        const errBox = document.getElementById('far-del-error');
        const showErr = (msg) => { if (errBox) { errBox.textContent = msg; errBox.classList.remove('hidden'); } };
        const password = (document.getElementById('far-del-password')?.value || '').trim();
        const reason = (document.getElementById('far-del-reason')?.value || '').trim();
        if (!password) { showErr('Password is required to archive this row.'); return; }
        try {
            const res = await db.adapter.authFetch(`/api/far/${encodeURIComponent(id)}/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, reason })
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || `HTTP ${res.status}`);
            }
            closeFarModal('far-delete-modal');
            await this.farLoadRows();
            rerenderFAR();
        } catch (err) {
            showErr(err.message);
        }
    }

    async farRollover() {
        const state = window.__farState;
        if (!state?.fy) return;
        const fromFY = state.fy;
        const toFY = fromFY + 1;
        const msg = `Roll over FY ${fromFY}-${String((fromFY + 1) % 100).padStart(2, '0')} → FY ${toFY}-${String((toFY + 1) % 100).padStart(2, '0')}?\n\n` +
            `• Current FY rows will be LOCKED (read-only)\n` +
            `• A fresh set of rows will open for the new FY with carried-forward balances\n` +
            `• Fully-disposed assets will not carry forward\n\n` +
            `This cannot be undone from the UI. Continue?`;
        if (!confirm(msg)) return;
        try {
            const res = await db.adapter.authFetch('/api/far/rollover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromFY })
            });
            const out = await res.json();
            alert(`Rollover complete. ${out.rowCount} rows processed.`);
            state.fy = toFY;
            const yearsRes = await db.adapter.authFetch('/api/far/years');
            state.years = await yearsRes.json();
            await this.farLoadRows();
            rerenderFAR();
        } catch (err) {
            alert('Rollover failed: ' + err.message);
        }
    }

    async farExport() {
        const state = window.__farState;
        if (!state?.fy) { alert('Nothing to export.'); return; }
        try {
            const res = await db.adapter.authFetch(`/api/far/export?fy=${encodeURIComponent(state.fy)}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Asset_FAR_FY${state.fy}-${String((state.fy + 1) % 100).padStart(2, '0')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Export failed: ' + err.message);
        }
    }
}


window.app = new App();
export default window.app;
