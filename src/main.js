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

class App {
    constructor() {
        this.appElement = document.getElementById('app');
        this.user = JSON.parse(localStorage.getItem('amp_user')) || null;
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        window.addEventListener('popstate', () => this.handleRouting());
        this.handleRouting();
    }

    login(role) {
        const userMap = {
            'employee': { name: 'Alex Thompson', role: 'employee', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBK-XhdfG5M2z7ZnqNV7vg1xck1LLeFfv-uT8se8zMaLNwV3IoNrLsMCQJ5SmBhn91rOEj9e1XX-HoyunQ0wraVtpeDf-B6S0qt5-QwHFEAKy1Mq2HDyCIud0I2U92bXtVlNXTpT02THVamdsYfJBDt683jWshlATO97fjFddraQzoomilxeU2QCJXBwMzfcvS3EpRtkBLYzQLvCbfQvVpauo5ZHQzpauh1r0P4u5huRtf3ssrvDjgp6X-8Ox50xDswLLVc1Dzkajk' },
            'manager': { name: 'Sarah Miller', role: 'manager', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBK-XhdfG5M2z7ZnqNV7vg1xck1LLeFfv-uT8se8zMaLNwV3IoNrLsMCQJ5SmBhn91rOEj9e1XX-HoyunQ0wraVtpeDf-B6S0qt5-QwHFEAKy1Mq2HDyCIud0I2U92bXtVlNXTpT02THVamdsYfJBDt683jWshlATO97fjFddraQzoomilxeU2QCJXBwMzfcvS3EpRtkBLYzQLvCbfQvVpauo5ZHQzpauh1r0P4u5huRtf3ssrvDjgp6X-8Ox50xDswLLVc1Dzkajk' },
            'finance': { name: 'David Chen', role: 'finance', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBK-XhdfG5M2z7ZnqNV7vg1xck1LLeFfv-uT8se8zMaLNwV3IoNrLsMCQJ5SmBhn91rOEj9e1XX-HoyunQ0wraVtpeDf-B6S0qt5-QwHFEAKy1Mq2HDyCIud0I2U92bXtVlNXTpT02THVamdsYfJBDt683jWshlATO97fjFddraQzoomilxeU2QCJXBwMzfcvS3EpRtkBLYzQLvCbfQvVpauo5ZHQzpauh1r0P4u5huRtf3ssrvDjgp6X-8Ox50xDswLLVc1Dzkajk' }
        };
        this.user = userMap[role];
        localStorage.setItem('amp_user', JSON.stringify(this.user));
        this.navigateTo('dashboard');
    }

    logout() {
        this.user = null;
        localStorage.removeItem('amp_user');
        this.navigateTo('login');
    }

    navigateTo(page) {
        this.currentPage = page;
        window.history.pushState({}, '', `#${page}`);
        this.render();
    }

    handleRouting() {
        const hash = window.location.hash.slice(1) || (this.user ? 'dashboard' : 'login');
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
        this.appElement.innerHTML = `
            <div class="min-h-screen flex items-center justify-center bg-slate-900 p-8">
                <div class="max-w-md w-full glass-card p-10 rounded-2xl text-center space-y-8 animate-in fade-in zoom-in duration-500">
                    <div class="space-y-4">
                        <h1 class="text-3xl text-slate-900">Asset Management Pro</h1>
                        <p class="text-slate-500 text-sm tracking-widest uppercase">Institutional Grade Environment</p>
                    </div>
                    <div class="grid grid-cols-1 gap-4">
                        <button onclick="app.login('employee')" class="w-full py-4 px-6 bg-slate-50 border border-slate-200 rounded-xl hover:border-accent hover:bg-accent/5 transition-all flex items-center gap-4 group">
                            <span class="material-symbols-outlined text-accent group-hover:scale-110 transition-transform">person</span>
                            <div class="text-left">
                                <p class="font-bold text-slate-900 text-sm">Employee Portal</p>
                                <p class="text-xs text-slate-500">Request and Track Assets</p>
                            </div>
                        </button>
                        <button onclick="app.login('manager')" class="w-full py-4 px-6 bg-slate-50 border border-slate-200 rounded-xl hover:border-accent hover:bg-accent/5 transition-all flex items-center gap-4 group">
                            <span class="material-symbols-outlined text-accent group-hover:scale-110 transition-transform">admin_panel_settings</span>
                            <div class="text-left">
                                <p class="font-bold text-slate-900 text-sm">Asset Manager</p>
                                <p class="text-xs text-slate-500">Operations & Inventory Control</p>
                            </div>
                        </button>
                        <button onclick="app.login('finance')" class="w-full py-4 px-6 bg-slate-50 border border-slate-200 rounded-xl hover:border-accent hover:bg-accent/5 transition-all flex items-center gap-4 group">
                            <span class="material-symbols-outlined text-accent group-hover:scale-110 transition-transform">account_balance</span>
                            <div class="text-left">
                                <p class="font-bold text-slate-900 text-sm">Finance Officer</p>
                                <p class="text-xs text-slate-500">Asset Valuation & Compliance</p>
                            </div>
                        </button>
                    </div>
                    <p class="text-[10px] text-slate-400 font-medium">SECURE END-TO-END ENCRYPTED GATEWAY</p>
                </div>
            </div>
        `;
    }

    renderShell() {
        const navItems = this.getNavItems();
        this.appElement.innerHTML = `
            <div class="flex h-screen overflow-hidden">
                <aside class="w-64 premium-sidebar flex flex-col p-6 shrink-0">
                    <div class="mb-10">
                        <h1 class="text-xl text-white">Asset Pro</h1>
                        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Ledger v2.0</p>
                    </div>
                    <nav class="flex-1 space-y-2">
                        ${navItems.map(item => `
                            <a href="#${item.id}" class="nav-item ${this.currentPage === item.id ? 'active' : ''}">
                                <span class="material-symbols-outlined">${item.icon}</span>
                                <span class="text-sm font-medium">${item.label}</span>
                            </a>
                        `).join('')}
                    </nav>
                    <div class="mt-auto pt-6 border-t border-slate-800">
                        <div class="flex items-center gap-3 mb-4">
                            <img src="${this.user.avatar}" class="w-10 h-10 rounded-full border border-slate-700" />
                            <div>
                                <p class="text-xs font-bold text-white">${this.user.name}</p>
                                <p class="text-[10px] text-slate-400 uppercase font-bold tracking-tight">${this.user.role}</p>
                            </div>
                        </div>
                        <button onclick="app.logout()" class="w-full py-2 px-4 bg-slate-800 text-slate-400 text-xs font-bold rounded-lg hover:bg-error/10 hover:text-error transition-all flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-sm">logout</span>
                            Sign Out
                        </button>
                    </div>
                </aside>
                <main class="flex-1 flex flex-col overflow-hidden">
                    <header class="h-16 px-8 flex items-center justify-between bg-white border-b border-slate-200">
                        <h2 class="text-lg font-black text-slate-900 uppercase tracking-tight">${this.currentPage.replace('_', ' ')}</h2>
                        <div class="flex items-center gap-4">
                            <button class="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-all relative">
                                <span class="material-symbols-outlined">notifications</span>
                                <span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                            </button>
                            <div class="h-8 w-[1px] bg-slate-200 mx-2"></div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Status: Online</span>
                        </div>
                    </header>
                    <div id="content" class="flex-1 overflow-y-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <!-- Loaded dynamically -->
                        <div class="flex items-center justify-center h-full">
                            <div class="animate-pulse flex flex-col items-center gap-4">
                                <div class="w-12 h-12 bg-slate-200 rounded-full"></div>
                                <p class="text-sm text-slate-400 font-medium">Syncing Ledger...</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        `;
        this.renderContent();
    }

    getNavItems() {
        const roles = {
            'employee': [
                { id: 'dashboard', label: 'My Assets', icon: 'inventory' },
                { id: 'request', label: 'Request Asset', icon: 'add_shopping_cart' },
                { id: 'issues', label: 'Report Issue', icon: 'report_problem' }
            ],
            'manager': [
                { id: 'dashboard', label: 'Operations', icon: 'dashboard' },
                { id: 'registry', label: 'Master Registry', icon: 'inventory_2' },
                { id: 'transfers', label: 'Transfers', icon: 'swap_horiz' },
                { id: 'maintenance', label: 'Maintenance Hub', icon: 'construction' }
            ],
            'finance': [
                { id: 'dashboard', label: 'Financial Overview', icon: 'account_balance' },
                { id: 'assets_ledger', label: 'Fixed Assets', icon: 'receipt_long' },
                { id: 'depreciation', label: 'Depreciation', icon: 'trending_down' },
                { id: 'grants', label: 'Grant Ledger', icon: 'payments' }
            ]
        };
        return roles[this.user.role];
    }

    renderContent() {
        const content = document.getElementById('content');
        if (!content) return;

        const role = this.user.role;
        const page = this.currentPage;

        // Route mapping
        const routes = {
            'employee': {
                'dashboard': () => renderEmployeeDashboard(this.user),
                'request': () => renderRequestPage(this.user),
                'issues': () => renderIssueReportPage(this.user)
            },
            'manager': {
                'dashboard': () => renderManagerDashboard(),
                'registry': () => renderAssetRegistry(),
                'transfers': () => renderTransferPage(),
                'maintenance': () => renderMaintenanceHub()
            },
            'finance': {
                'dashboard': () => renderFinanceDashboard() ,
                'assets_ledger': () => renderAssetsLedger(),
                'depreciation': () => renderDepreciationPage(),
                'grants': () => renderGrantLedger()
            }
        };

        const renderFn = routes[role] && routes[role][page];
        
        if (renderFn) {
            content.innerHTML = renderFn();
        } else {
            content.innerHTML = this.renderPlaceholder(page);
        }
    }

    renderPlaceholder(title) {
        return `
            <div class="flex flex-col items-center justify-center h-full text-slate-400">
                <span class="material-symbols-outlined text-6xl mb-4">construction</span>
                <h2 class="text-xl font-bold uppercase tracking-widest">${title} Module</h2>
                <p class="text-sm mt-2">Implementation in progress...</p>
            </div>
        `;
    }

    exportCSV(type) {
        let data = [];
        let filename = 'export.csv';

        if (type === 'assets') {
            data = db.assets.map(a => ({
                ID: a.id,
                Name: a.name,
                Category: a.category,
                Status: a.status,
                Location: a.location,
                PurchaseDate: a.purchaseDate,
                Amount: a.amount,
                Depreciation: a.depreciation
            }));
            filename = 'asset_registry.csv';
        }

        if (data.length === 0) {
            alert('No data to export.');
            return;
        }

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\\n');
        const csvContent = `${headers}\\n${rows}`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

window.app = new App();
export default window.app;
