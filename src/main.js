import './css/style.css';
import { db, RAW_EMPLOYEES } from './mock/db.js';
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
import { renderAnalyticsDashboard } from './pages/AnalyticsDashboard.js';

class App {
    constructor() {
        this.appElement = document.getElementById('app');
        this.user = JSON.parse(localStorage.getItem('amp_user')) || null;
        this.currentPage = 'dashboard';
        this.loginRole = null; // Step trace for login flow
        this.init();
    }

    init() {
        window.addEventListener('popstate', () => this.handleRouting());
        this.handleRouting();
    }

    selectRole(role) {
        this.loginRole = role;
        this.render();
    }

    cancelLogin() {
        this.loginRole = null;
        this.render();
    }

    authenticate() {
        const idInput = document.getElementById('login-id');
        const passInput = document.getElementById('login-password');
        const errorMsg = document.getElementById('login-error');
        
        if (!idInput || !passInput) return;

        const userId = idInput.value.trim();
        const password = passInput.value.trim();

        if (this.loginRole === 'employee') {
            const employee = RAW_EMPLOYEES.find(e => e.id === userId || e.id === `#Kalike/EMP/${userId}`);
            if (!employee) {
                errorMsg.innerText = "Invalid Employee ID.";
                errorMsg.classList.remove('hidden');
                return;
            }

            // Password logic: ID Number + First 5 chars of name
            const idNumber = employee.id.split('/').pop();
            const firstFive = employee.name.substring(0, 5);
            const expectedPass = idNumber + firstFive;

            if (password !== expectedPass) {
                errorMsg.innerText = "Incorrect Security Password.";
                errorMsg.classList.remove('hidden');
                return;
            }

            this.user = { 
                name: employee.name, 
                role: 'employee', 
                avatar: 'https://cdn-icons-png.flaticon.com/512/147/147144.png',
                empId: employee.id 
            };
        } else if (this.loginRole === 'manager') {
            if (password !== "assetpavan") {
                errorMsg.innerText = "Access Forbidden: Incorrect Master Password.";
                errorMsg.classList.remove('hidden');
                return;
            }
            this.user = { name: 'Asset Administrator', role: 'manager', avatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' };
        } else if (this.loginRole === 'finance') {
            if (password !== "financepavan") {
                errorMsg.innerText = "Access Forbidden: Incorrect Financial Key.";
                errorMsg.classList.remove('hidden');
                return;
            }
            this.user = { name: 'Finance Controller', role: 'finance', avatar: 'https://cdn-icons-png.flaticon.com/512/9131/9131529.png' };
        }

        localStorage.setItem('amp_user', JSON.stringify(this.user));
        this.loginRole = null;
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
        const roleSelectionUI = `
            <div class="grid grid-cols-1 gap-4 w-full">
                <button onclick="app.selectRole('employee')" class="group relative w-full py-5 px-6 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-300 flex items-center gap-5 text-left hover:shadow-xl active:scale-[0.98]">
                    <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 group-hover:rotate-6 border border-blue-100">
                        <span class="material-symbols-outlined text-2xl">person</span>
                    </div>
                    <div>
                        <p class="font-extrabold text-slate-900 text-sm">Personnel Portal</p>
                        <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Asset Requisitioning</p>
                    </div>
                    <span class="material-symbols-outlined ml-auto text-slate-400 group-hover:text-blue-600 transition-colors">chevron_right</span>
                </button>
                <button onclick="app.selectRole('manager')" class="group relative w-full py-5 px-6 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-300 flex items-center gap-5 text-left hover:shadow-xl active:scale-[0.98]">
                    <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 group-hover:rotate-6 border border-blue-100">
                        <span class="material-symbols-outlined text-2xl">admin_panel_settings</span>
                    </div>
                    <div>
                        <p class="font-extrabold text-slate-900 text-sm">Asset Administrator</p>
                        <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Operations & Control</p>
                    </div>
                    <span class="material-symbols-outlined ml-auto text-slate-400 group-hover:text-blue-600 transition-colors">chevron_right</span>
                </button>
                <button onclick="app.selectRole('finance')" class="group relative w-full py-5 px-6 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all duration-300 flex items-center gap-5 text-left hover:shadow-xl active:scale-[0.98]">
                    <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 group-hover:rotate-6 border border-blue-100">
                        <span class="material-symbols-outlined text-2xl">account_balance</span>
                    </div>
                    <div>
                        <p class="font-extrabold text-slate-900 text-sm">Finance Controller</p>
                        <p class="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Valuation & Ledgering</p>
                    </div>
                    <span class="material-symbols-outlined ml-auto text-slate-400 group-hover:text-blue-600 transition-colors">chevron_right</span>
                </button>
            </div>
        `;

        const authFormUI = () => {
            const roleName = this.loginRole === 'employee' ? 'Personnel' : (this.loginRole === 'manager' ? 'Admin' : 'Finance');
            const idPlaceholder = this.loginRole === 'employee' ? 'Employee ID (e.g. 272)' : 'System Username';
            return `
                <div class="space-y-6 w-full animate-fade-in-up">
                    <div class="flex items-center gap-4 mb-2">
                        <button onclick="app.cancelLogin()" class="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all hover:text-slate-900">
                            <span class="material-symbols-outlined text-xl">arrow_back</span>
                        </button>
                        <div>
                            <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight">${roleName} Access</h2>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Multi-factor Identity Verification</p>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div class="group">
                            <label class="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1 mb-1.5 block group-focus-within:text-blue-600 transition-colors">Identity Identifier</label>
                            <div class="relative">
                                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">badge</span>
                                <input type="text" id="login-id" placeholder="${idPlaceholder}" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 pl-11 text-xs focus:border-blue-600 outline-none transition-all font-bold placeholder:text-slate-300" />
                            </div>
                        </div>
                        <div class="group">
                            <label class="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1 mb-1.5 block group-focus-within:text-blue-600 transition-colors">Authentication Key</label>
                            <div class="relative">
                                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">lock</span>
                                <input type="password" id="login-password" placeholder="••••••••" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-3.5 pl-11 text-xs focus:border-blue-600 outline-none transition-all font-bold placeholder:text-slate-300" />
                            </div>
                        </div>
                        <div id="login-error" class="hidden text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 p-4 rounded-xl border border-rose-200 animate-in fade-in slide-in-from-top-2"></div>
                        <button onclick="app.authenticate()" class="w-full py-4.5 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-[.3em] text-[10px] hover:bg-blue-600 transition-all shadow-xl active:scale-[0.97] flex items-center justify-center gap-3">
                            <span class="material-symbols-outlined text-sm">vpn_key</span>
                            Authorize & Sync
                        </button>
                    </div>
                </div>
            `;
        };

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

                    ${!this.loginRole ? `
                        <div class="space-y-6 w-full animate-fade-in-up">
                            <div class="text-center">
                                <p class="text-xs text-slate-500 font-bold uppercase tracking-[.2em]">Select Deployment Portal</p>
                            </div>
                            ${roleSelectionUI}
                        </div>
                    ` : authFormUI()}

                    <footer class="text-center">
                        <p class="text-[9px] text-slate-600 font-black uppercase tracking-[.3em]">Secure End-to-End Ledger v2.2.0</p>
                    </footer>
                </div>
            </div>
        `;

        if (this.loginRole) {
            setTimeout(() => document.getElementById('login-id')?.focus(), 200);
        }
    }

    renderShell() {
        const navItems = this.getNavItems();
        this.appElement.innerHTML = `
            <div class="flex h-screen overflow-hidden bg-slate-50">
                <aside class="w-72 flex flex-col p-6 shrink-0 bg-slate-900 relative z-20 shadow-2xl overflow-y-auto">
                    <div class="mb-10 px-2">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
                                <span class="material-symbols-outlined font-light">account_balance_wallet</span>
                            </div>
                            <div>
                                <h1 class="text-lg font-black text-white tracking-tight uppercase leading-none">Asset Pro</h1>
                                <p class="text-[9px] text-slate-500 uppercase tracking-widest font-black mt-1">Enterprise Ledger</p>
                            </div>
                        </div>
                    </div>
                    
                    <nav class="flex-1 space-y-1">
                        ${navItems.map(item => `
                            <a href="#${item.id}" class="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${this.currentPage === item.id ? 'bg-accent text-white shadow-lg shadow-accent/20 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'}">
                                <span class="material-symbols-outlined text-[22px] transition-transform group-hover:scale-110">${item.icon}</span>
                                <span class="text-xs uppercase tracking-widest font-bold">${item.label}</span>
                                ${this.currentPage === item.id ? '<div class="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>' : ''}
                            </a>
                        `).join('')}
                    </nav>

                    <div class="mt-auto px-2">
                        <div class="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                            <div class="flex items-center gap-3">
                                <div class="relative">
                                    <img src="${this.user.avatar}" class="w-10 h-10 rounded-full border border-white/10" />
                                    <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                                </div>
                                <div class="min-w-0">
                                    <p class="text-xs font-black text-white truncate">${this.user.name}</p>
                                    <p class="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5">${this.user.role}</p>
                                </div>
                            </div>
                            <button onclick="app.logout()" class="w-full py-2.5 bg-white/5 text-slate-400 text-[10px] font-black rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-all uppercase tracking-widest flex items-center justify-center gap-2 border border-transparent hover:border-rose-500/20">
                                <span class="material-symbols-outlined text-[16px]">logout</span>
                                Terminate Session
                            </button>
                        </div>
                    </div>
                </aside>

                <main class="flex-1 flex flex-col overflow-hidden relative">
                    <header class="h-20 px-10 flex items-center justify-between bg-white/70 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-10">
                        <div>
                             <h2 class="text-sm font-black text-slate-900 uppercase tracking-[.25em]">${this.currentPage.replace('_', ' ')}</h2>
                        </div>
                        <div class="flex items-center gap-6">
                            <div class="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                <div class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Status: Online</span>
                            </div>
                            <button class="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all relative">
                                <span class="material-symbols-outlined">settings</span>
                            </button>
                            <button class="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all relative">
                                <span class="material-symbols-outlined">notifications</span>
                                <span class="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-4 ring-white"></span>
                            </button>
                        </div>
                    </header>
                    <div id="content" class="flex-1 overflow-y-auto p-10">
                        <!-- Content Bound to Viewport via flex-1 overflow-y-auto -->
                    </div>
                </main>
            </div>

            <!-- Global Asset Detail Modal -->
            <div id="asset-modal-backdrop" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] hidden flex items-center justify-center opacity-0 transition-opacity duration-300">
                <div id="asset-modal-content" class="glass-modal">
                    <!-- Dynamic Content -->
                </div>
            </div>
        `;
        this.renderContent();
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
                { id: 'maintenance', label: 'Maintenance Hub', icon: 'construction' },
                { id: 'analytics', label: 'Analytics Matrix', icon: 'pie_chart' }
            ],
            'finance': [
                { id: 'dashboard', label: 'Financial Overview', icon: 'account_balance' },
                { id: 'assets_ledger', label: 'Fixed Assets', icon: 'receipt_long' },
                { id: 'depreciation', label: 'Depreciation', icon: 'trending_down' },
                { id: 'grants', label: 'Grant Ledger', icon: 'payments' },
                { id: 'analytics', label: 'Analytics Matrix', icon: 'pie_chart' }
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
                'maintenance': () => renderMaintenanceHub(),
                'analytics': () => renderAnalyticsDashboard()
            },
            'finance': {
                'dashboard': () => renderFinanceDashboard(),
                'assets_ledger': () => renderAssetsLedger(),
                'depreciation': () => renderDepreciationPage(),
                'grants': () => renderGrantLedger(),
                'analytics': () => renderAnalyticsDashboard()
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
        const btn = event.currentTarget;
        if (btn) btn.classList.add('animate-export-pulse');

        setTimeout(() => {
            let csvContent = "data:text/csv;charset=utf-8,";
            let filename = `amp_${type}_${new Date().toISOString().split('T')[0]}.csv`;

            function idSafe(str) { return `"${String(str).replace(/"/g, '""')}"`; }

            if (type === 'assets') {
                const headers = ["ID", "Name", "Category", "Status", "Location", "Purchase Date", "Amount", "Program", "Custodian", "Funding Source", "Grant Amount"];
                csvContent += headers.join(",") + "\n";
                db.assets.forEach(a => {
                    csvContent += [a.id, a.name, a.category, a.status, a.location, a.purchaseDate, a.amount, idSafe(a.program), idSafe(a.assignedTo), a.fundingSource || 'N/A', a.fundingAmount || 0].join(",") + "\n";
                });
            } else if (type === 'depreciation') {
                const headers = ["ID", "Name", "Method", "Cost Basis", "Accum. Depreciation", "Net Book Value"];
                csvContent += headers.join(",") + "\n";
                db.assets.forEach(a => {
                    csvContent += [a.id, a.name, "SLM", a.amount, a.depreciation, (a.amount - a.depreciation)].join(",") + "\n";
                });
            } else if (type === 'grants') {
                const headers = ["ID", "Grant Name", "Program", "Opening", "Spent", "Remaining"];
                csvContent += headers.join(",") + "\n";
                db.grants.forEach(g => {
                    csvContent += [g.id, idSafe(g.name), idSafe(g.program), g.openingBalance, g.spent, g.closingBalance].join(",") + "\n";
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
}


window.app = new App();
export default window.app;
