import './css/style.css';
import { db } from './mock/db.js';
import { renderEmployeeDashboard } from './pages/EmployeeDashboard.js';
import { renderManagerDashboard } from './pages/ManagerDashboard.js';
import { renderRequestPage } from './pages/RequestPage.js';
import { renderMaintenanceHub } from './pages/MaintenanceHub.js';
import { renderIssueReportPage } from './pages/IssueReportPage.js';
import { renderFinanceDashboard } from './pages/FinanceDashboard.js';
import { renderAssetRegistry } from './pages/AssetRegistry.js';
import { renderTransferPage } from './pages/TransferPage.js';
import { renderAssetsLedger } from './pages/AssetsLedger.js';
import { renderDepreciationPage } from './pages/DepreciationPage.js';
import { renderGrantLedger } from './pages/GrantLedger.js';
import { renderHomeDashboard } from './pages/HomeDashboard.js';
import { renderProcurementPage } from './pages/ProcurementPage.js';
import { renderWorklogPage } from './pages/WorklogPage.js';
import { renderTasksPage } from './pages/TasksPage.js';
import { renderLeavePage } from './pages/LeavePage.js';
import { renderReimbursementPage } from './pages/ReimbursementPage.js';
import { renderAttendancePage } from './pages/AttendancePage.js';
import { renderOrgChartPage } from './pages/OrgChartPage.js';
import { renderSocialHubPage } from './pages/SocialHubPage.js';
import { renderDataCollectionPage } from './pages/DataCollectionPage.js';
import { renderDocumentVaultPage } from './pages/DocumentVaultPage.js';
import { renderAnnouncementsPage } from './pages/AnnouncementsPage.js';
import { renderCalendarPage } from './pages/CalendarPage.js';
import { renderPerformanceReviewsPage } from './pages/PerformanceReviewsPage.js';
import { renderSettingsPage } from './pages/SettingsPage.js';
import { renderNotificationsPage } from './pages/NotificationsPage.js';
import { renderAuditLog } from './pages/AuditLog.js';
import { renderEmployeeProfilePage } from './pages/EmployeeProfilePage.js';
import { renderTeamManagementPage } from './pages/TeamManagementPage.js';
import { renderUserManagement } from './pages/UserManagement.js';

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

class App {
    constructor() {
        window.app = this;
        this.appElement = document.getElementById('app');
        this.user = JSON.parse(localStorage.getItem('amp_user')) || null;
        this.currentPage = 'home';
        this.loginRole = null;
        this.initialized = false;
        
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
        const submitBtn = document.querySelector('[onclick="app.authenticate()"]');

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
            this.navigateTo('home');
        } catch (err) {
            console.error('Login request failed:', err);
            errorMsg.innerText = 'Could not reach the authentication server.';
            errorMsg.classList.remove('hidden');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
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
        this.navigateTo('login');
    }

    navigateTo(page) {
        this.currentPage = page;
        window.history.pushState({}, '', `#${page}`);
        this.renderShell();
        this.renderContent().catch(err => console.error('Navigation render error:', err));
    }

    handleRouting() {
        const hash = window.location.hash.slice(1) || (this.user ? 'home' : 'login');
        this.currentPage = hash;
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
            <div class="space-y-6 w-full animate-fade-in-up">
                <div>
                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[.2em] text-center">Enter your credentials</p>
                </div>

                <div class="space-y-4">
                    <div class="group">
                        <label class="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1 mb-1.5 block group-focus-within:text-blue-600 transition-colors">User ID</label>
                        <div class="relative">
                            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">badge</span>
                            <input type="text" id="login-id" placeholder="Enter your ID" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 pl-11 text-xs focus:border-blue-600 outline-none transition-all font-bold placeholder:text-slate-300" />
                        </div>
                    </div>
                    <div class="group">
                        <label class="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1 mb-1.5 block group-focus-within:text-blue-600 transition-colors">Password</label>
                        <div class="relative">
                            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">lock</span>
                            <input type="password" id="login-password" placeholder="••••••••" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 pl-11 text-xs focus:border-blue-600 outline-none transition-all font-bold placeholder:text-slate-300" />
                        </div>
                    </div>
                    <div id="login-error" class="hidden text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-200 animate-in fade-in slide-in-from-top-2"></div>
                    <button onclick="app.authenticate()" class="w-full py-4.5 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-[.3em] text-[10px] hover:bg-blue-600 transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-3">
                        <span class="material-symbols-outlined text-sm">vpn_key</span>
                        Login
                    </button>
                </div>
            </div>
        `;

        this.appElement.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-mesh p-6 relative overflow-hidden">
                <!-- Floating geometric accents -->
                <div class="absolute -top-24 -left-24 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse"></div>
                <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400/10 rounded-full blur-[120px] animate-pulse" style="animation-delay: 2s"></div>

                <div class="max-w-[440px] w-full glass-frosted p-10 sm:p-12 rounded-[2.5rem] flex flex-col items-center space-y-10 relative z-10 animate-fade-in-up">
                    <div class="text-center space-y-3">
                        <div class="w-20 h-20 bg-slate-900 rounded-3xl mx-auto flex items-center justify-center shadow-2xl animate-float">
                            <span class="material-symbols-outlined text-white text-4xl font-light">account_balance_wallet</span>
                        </div>
                        <div>
                            <h1 class="text-3xl font-black text-slate-900 tracking-tightest uppercase">Asset Pro</h1>
                            <div class="h-1 w-12 bg-accent mx-auto mt-1 rounded-full"></div>
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

    getNotificationsBadge() {
        if (!this.user) return 0;
        return db.notifications.filter(n => n.recipientId === this.user.id && !n.isRead).length;
    }

    getNavItems() {
        const isSuper = this.hasPermission('all');
        const canManageTeam = this.hasPermission('manage_team');
        const nav = [];
        
        // 1. CORE DASHBOARD
        nav.push({ id: 'home', label: 'Home', icon: 'home' });

        // 2. ASSET MANAGEMENT MODULES
        const canManageAssets = this.hasPermission('manage_assets');
        const canViewFinance = this.hasPermission('approve_finance');

        if (canManageAssets) {
            nav.push({ id: 'asset_home', label: 'Asset Ops', icon: 'dashboard' });
            nav.push({ id: 'registry', label: 'Registry', icon: 'inventory_2' });
            nav.push({ id: 'transfers', label: 'Transfers', icon: 'swap_horiz' });
            nav.push({ id: 'maintenance', label: 'Maintenance', icon: 'construction' });
        } else if (canViewFinance) {
            nav.push({ id: 'asset_home', label: 'Finance View', icon: 'account_balance' });
            nav.push({ id: 'assets_ledger', label: 'Fixed Assets', icon: 'receipt_long' });
            nav.push({ id: 'depreciation', label: 'Depreciation', icon: 'trending_down' });
            nav.push({ id: 'grants', label: 'Grants', icon: 'payments' });
        } else {
            nav.push({ id: 'asset_home', label: 'My Assets', icon: 'inventory' });
            nav.push({ id: 'request', label: 'Request Asset', icon: 'add_shopping_cart' });
            nav.push({ id: 'issues', label: 'Report Issue', icon: 'report_problem' });
        }

        // 3. WORKSPACE & PROCUREMENT
        nav.push({ id: 'procurement', label: 'Procurement', icon: 'shopping_cart' });
        nav.push({ id: 'worklog', label: 'Worklog', icon: 'edit_note' });
        nav.push({ id: 'tasks', label: 'Tasks', icon: 'task_alt' });
        nav.push({ id: 'leave', label: 'Leave', icon: 'event_busy' });
        nav.push({ id: 'reimbursements', label: 'Expenses', icon: 'receipt_long' });
        nav.push({ id: 'attendance', label: 'Attendance', icon: 'schedule' });
        
        // 4. ADMIN & HR
        if (this.hasPermission('manage_payroll')) nav.push({ id: 'payroll', label: 'Payroll', icon: 'payments' });

        // 5. COLLABORATION
        nav.push({ id: 'documents', label: 'Vault', icon: 'folder_shared' });
        nav.push({ id: 'announcements', label: 'Board', icon: 'campaign' });
        nav.push({ id: 'calendar', label: 'Calendar', icon: 'calendar_month' });
        nav.push({ id: 'performance', label: 'Reviews', icon: 'workspace_premium' });
        nav.push({ id: 'org_chart', label: 'Org Chart', icon: 'account_tree' });
        nav.push({ id: 'social_hub', label: 'Social Hub', icon: 'share' });
        nav.push({ id: 'data_collection', label: 'Data Collect', icon: 'poll' });

        // 6. GOVERNANCE & ANALYTICS (Footer Nav)
        if (this.hasPermission('view_reports')) nav.push({ id: 'reports', label: 'Reports', icon: 'analytics' });
        if (canManageTeam || this.hasPermission('manage_users')) {
            nav.push({ id: 'team', label: 'My Team', icon: 'groups' });
        }
        if (isSuper) {
            nav.push({ id: 'analytics', label: 'Analytics', icon: 'pie_chart' });
            nav.push({ id: 'audit_log', label: 'Logs', icon: 'history_edu' });
        }
        
        if (this.hasPermission('manage_users')) nav.push({ id: 'users', label: 'Users', icon: 'admin_panel_settings' });

        return nav;
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
                <div class="flex flex-1 overflow-hidden">
                    <aside class="w-72 flex flex-col p-6 shrink-0 bg-slate-900 relative z-20 shadow-2xl overflow-y-auto">
                        <div class="mb-10 px-2">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/5 p-1.5">
                                <img src="https://kalike.org/wp-content/uploads/2025/01/Logo-Transparent-1.png" alt="Kalike Logo" class="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 class="text-sm font-black text-white uppercase tracking-tighter">Kalike Workspace</h1>
                                <p class="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Institutional Ops</p>
                            </div>
                        </div>
                        </div>
                        
                        <nav class="flex-1 space-y-1">
                            ${this.getNavItems().map(item => `
                                <a href="#${item.id}" 
                                   class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${this.currentPage === item.id ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}">
                                    <span class="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">${item.icon}</span>
                                    <span class="text-[11px] font-black uppercase tracking-widest">${item.label}</span>
                                    ${item.badge ? `<span class="ml-auto bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-md font-black">${item.badge}</span>` : ''}
                                </a>
                            `).join('')}
                        </nav>

                        <div class="mt-auto pt-6 border-t border-slate-800">
                            <div class="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex items-center gap-3">
                                <img src="${user.avatar || 'https://ui-avatars.com/api/?name=' + user.name}" class="w-9 h-9 rounded-xl border border-slate-700" />
                                <div class="flex-1 min-w-0">
                                    <p class="text-[10px] font-black text-white truncate uppercase tracking-tight">${user.name}</p>
                                    <p class="text-[8px] text-slate-500 font-bold truncate uppercase tracking-widest">${user.role}</p>
                                </div>
                                <button onclick="app.logout()" class="text-slate-500 hover:text-rose-400 transition-colors">
                                    <span class="material-symbols-outlined text-sm">logout</span>
                                </button>
                            </div>
                        </div>
                    </aside>

                    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
                        <header class="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
                            <div class="flex items-center gap-4">
                                <h2 class="text-xs font-black text-slate-900 uppercase tracking-[.2em]">${this.currentPage.replace('_', ' ')}</h2>
                            </div>
                            <div class="flex items-center gap-6">
                                <div class="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl">
                                    <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Network Synced</span>
                                </div>
                                <button onclick="app.navigateTo('notifications')" class="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-all relative">
                                    <span class="material-symbols-outlined">notifications</span>
                                    ${this.getNotificationsBadge() ? `<span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>` : ''}
                                </button>
                                <button onclick="app.navigateTo('settings')" class="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-all">
                                    <span class="material-symbols-outlined">settings</span>
                                </button>
                            </div>
                        </header>

                        <div id="content" class="flex-1 overflow-y-auto p-10">
                            <!-- Content Bound to Viewport via flex-1 overflow-y-auto -->
                        </div>
                    </main>
                </div>
            </div>

            <!-- Global Asset Detail Modal -->
            <div id="asset-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] hidden flex items-center justify-center opacity-0 transition-opacity duration-300">
                <div id="asset-modal-content" class="glass-modal">
                    <!-- Dynamic Content -->
                </div>
            </div>
        `;
        this.renderContent().catch(err => {
            console.error('Failed to render content:', err);
            const content = document.getElementById('content');
            if (content) content.innerHTML = '<p class="text-red-600">Failed to load page</p>';
        });
    }

    async renderContent() {
        const content = document.getElementById('content');
        if (!content) return;

        const role = this.user.role;
        const page = this.currentPage;

        const sharedRoutes = {
            'home': renderHomeDashboard,
            'procurement': renderProcurementPage,
            'worklog': renderWorklogPage,
            'tasks': renderTasksPage,
            'leave': renderLeavePage,
            'reimbursements': renderReimbursementPage,
            'attendance': renderAttendancePage,
            'payroll': 'PayrollPage',
            'reports': 'ReportsEnginePage',
            'documents': renderDocumentVaultPage,
            'announcements': renderAnnouncementsPage,
            'calendar': renderCalendarPage,
            'performance': renderPerformanceReviewsPage,
            'org_chart': renderOrgChartPage,
            'social_hub': renderSocialHubPage,
            'data_collection': renderDataCollectionPage,
            'settings': renderSettingsPage,
            'notifications': renderNotificationsPage,
            'profile': renderEmployeeProfilePage,
            'team': renderTeamManagementPage
        };

        const assetRoutes = {
            'employee':   { 'asset_home': renderEmployeeDashboard, 'request': renderRequestPage, 'issues': renderIssueReportPage },
            'manager':    { 'asset_home': renderManagerDashboard, 'registry': renderAssetRegistry, 'transfers': renderTransferPage, 'maintenance': renderMaintenanceHub, 'users': renderUserManagement, 'audit_log': renderAuditLog },
            'finance':    { 'asset_home': renderFinanceDashboard, 'assets_ledger': renderAssetsLedger, 'depreciation': renderDepreciationPage, 'grants': renderGrantLedger },
            'hr':         { 'asset_home': renderManagerDashboard, 'registry': renderAssetRegistry, 'users': renderUserManagement, 'audit_log': renderAuditLog },
            'operations': { 'asset_home': renderManagerDashboard, 'registry': renderAssetRegistry, 'transfers': renderTransferPage, 'maintenance': renderMaintenanceHub },
            'director':   { 'asset_home': 'AnalyticsDashboard', 'analytics': 'AnalyticsDashboard', 'registry': renderAssetRegistry, 'transfers': renderTransferPage, 'grants': renderGrantLedger, 'assets_ledger': renderAssetsLedger, 'depreciation': renderDepreciationPage, 'audit_log': renderAuditLog, 'users': renderUserManagement },
            'superadmin': { 'asset_home': 'AnalyticsDashboard', 'analytics': 'AnalyticsDashboard', 'registry': renderAssetRegistry, 'transfers': renderTransferPage, 'maintenance': renderMaintenanceHub, 'grants': renderGrantLedger, 'assets_ledger': renderAssetsLedger, 'depreciation': renderDepreciationPage, 'audit_log': renderAuditLog, 'users': renderUserManagement },
            'executive':  { 'asset_home': 'AnalyticsDashboard', 'analytics': 'AnalyticsDashboard' }
        };

        let renderFn = sharedRoutes[page] || (assetRoutes[role] || {})[page];

        if (renderFn) {
            if (typeof renderFn === 'string') {
                renderFn = await loadDynamicPage(renderFn);
            }
            content.innerHTML = renderFn(this.user);
        } else {
            content.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center space-y-6 animate-fade-in">
                    <div class="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-300">
                        <span class="material-symbols-outlined text-5xl">architecture</span>
                    </div>
                    <div class="text-center">
                        <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight">${page.replace('_', ' ')} Module</h3>
                        <p class="text-sm text-slate-400 font-bold uppercase tracking-widest mt-2">Implementation in progress for ${role} access</p>
                    </div>
                    <button onclick="app.navigateTo('home')" class="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all shadow-xl">Return to Command Center</button>
                </div>
            `;
        }
    }

    showAssetModal(id) {
        const asset = db.assets.find(a => a.id === id);
        if (!asset) return;
        const transfers = db.transfers.filter(t => t.assetId === id);

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
                        <button onclick="document.getElementById('asset-modal-backdrop').remove()" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
                            <span class="material-symbols-outlined group-hover:rotate-90 transition-transform">close</span>
                        </button>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-8 overflow-y-auto space-y-8 flex-1 scroll-container">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <!-- Logistics Card -->
                            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Logistics & Custody</h4>
                                <div class="space-y-4">
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase">Current Custodian</p>
                                        <p class="text-sm font-black text-slate-900 mt-0.5">${asset.assignedTo}</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase">Station / Location</p>
                                        <p class="text-sm font-bold text-slate-600 mt-0.5">${asset.location}</p>
                                    </div>
                                    <div class="pt-3 border-t border-slate-200">
                                        <span class="px-2 py-1 bg-emerald-500 text-white text-[9px] font-black rounded uppercase tracking-tighter">${asset.status}</span>
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
                                        <p class="text-lg font-black text-slate-900 mt-0.5 tabular-nums">₹${asset.amount.toLocaleString()}</p>
                                        ${asset.fundingAmount ? `<p class="text-[10px] font-bold text-indigo-500 italic">Grant Contribution: ₹${asset.fundingAmount.toLocaleString()}</p>` : ''}
                                    </div>
                                    <div class="pt-3 border-t border-indigo-100">
                                        <p class="text-[9px] font-black text-indigo-400 uppercase">Net Book Value</p>
                                        <p class="text-sm font-black text-emerald-600 tabular-nums">₹${(asset.amount - asset.depreciation).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Schedule Card -->
                            <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Acquisition Schedule</h4>
                                <div class="space-y-4">
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase">Date of Purchase</p>
                                        <p class="text-sm font-bold text-slate-700 mt-0.5">${new Date(asset.purchaseDate).toLocaleDateString('en-IN', {day: '2-digit', month: 'long', year: 'numeric'})}</p>
                                    </div>
                                    <div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase">Program Area</p>
                                        <p class="text-sm font-bold text-slate-700 mt-0.5">${asset.program}</p>
                                    </div>
                                </div>
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
                        <button onclick="document.getElementById('edit-asset-modal-backdrop').remove()" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
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
                                <input id="edit-asset-location" type="text" value="${asset.location}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors" />
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Acquisition Cost (₹)</label>
                                <input id="edit-asset-amount" type="number" value="${asset.amount}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-slate-900 outline-none transition-colors tabular-nums" />
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
        const name = document.getElementById('edit-asset-name').value.trim();
        const category = document.getElementById('edit-asset-category').value;
        const status = document.getElementById('edit-asset-status').value;
        const location = document.getElementById('edit-asset-location').value.trim();
        const amount = document.getElementById('edit-asset-amount').value;
        const errorEl = document.getElementById('edit-asset-error');

        if (!name || !location || !amount) {
            errorEl.textContent = 'All fields are required.';
            errorEl.classList.remove('hidden');
            return;
        }

        db.updateAsset(id, { name, category, status, location, amount: parseFloat(amount) });
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
                        <button onclick="document.getElementById('grant-modal-backdrop').remove()" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
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
                        <button onclick="document.getElementById('add-grant-modal-backdrop').remove()" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
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
                <div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200">
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
                        <button onclick="document.getElementById('add-asset-modal-backdrop').remove()" class="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
                            <span class="material-symbols-outlined group-hover:rotate-90 transition-transform">close</span>
                        </button>
                    </div>
                    <div class="p-8 space-y-5">
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
        const name = document.getElementById('new-asset-name').value.trim();
        const category = document.getElementById('new-asset-category').value;
        const status = document.getElementById('new-asset-status').value;
        const location = document.getElementById('new-asset-location').value.trim();
        const amount = document.getElementById('new-asset-amount').value;
        const errorEl = document.getElementById('new-asset-error');

        if (!name || !location || !amount) {
            errorEl.textContent = 'All fields are required.';
            errorEl.classList.remove('hidden');
            return;
        }

        db.addNewAsset({ name, category, status, location, amount });

        // Close modal and refresh registry view
        document.getElementById('add-asset-modal-backdrop').remove();
        this.navigate('registry');
    }

    exportCSV(type) {
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
                const headers = ["ID", "Name", "Method", "Cost Basis", "Accum. Depreciation", "Net Book Value"];
                csvContent += headers.join(",") + "\n";
                db.assets.forEach(a => {
                    csvContent += [idSafe(a.id), idSafe(a.name), "SLM", a.amount, a.accumulatedDepreciation, (a.amount - a.accumulatedDepreciation)].join(",") + "\n";
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
}


window.app = new App();
export default window.app;
