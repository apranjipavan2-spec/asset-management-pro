import { db } from '../mock/db.js';

export function renderHomeDashboard(user) {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const hour = today.getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    // Stats computation
    const stats = db.getStats();
    const myTasks = db.tasks.filter(t => t.assignedTo === user.empId);
    const pendingTasks = myTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
    const myLeaves = db.leaves.filter(l => l.empId === user.empId && l.status === 'Pending').length;
    const unreadNotifs = db.getUnreadNotifications(user.empId, user.role).length;
    
    const canApproveFinance = window.app.hasPermission('approve_finance');
    const canManageTeam = window.app.hasPermission('manage_team');
    const canManagePayroll = window.app.hasPermission('manage_payroll');
    const canViewReports = window.app.hasPermission('view_reports');
    const canViewGlobalStats = window.app.hasPermission('view_global_stats');

    const pendingReimb = canApproveFinance || canManageTeam
        ? db.reimbursements.filter(r => r.status === 'Pending' || r.status === 'Manager Approved').length
        : db.reimbursements.filter(r => r.empId === user.empId && r.status === 'Pending').length;
        
    const pendingProcurement = db.procurement.filter(p => !p.rejected && p.step !== 'asset_registered').length;
    const pendingLeaveApprovals = canManageTeam || canManagePayroll ? db.leaves.filter(l => l.status === 'Pending').length : 0;

    const allModules = [
        // ASSETS
        { id: 'asset_home', group: 'assets', label: 'Asset Management', icon: 'account_balance_wallet', desc: 'Track, register & manage assets', color: 'from-blue-600 to-indigo-700', stat: canViewGlobalStats ? `${stats.totalAssets} Assets` : 'My Assets', permission: 'any' },
        { id: 'request', group: 'assets', label: 'Request Asset', icon: 'add_shopping_cart', desc: 'Raise new asset requisitions', color: 'from-indigo-600 to-blue-700', stat: 'Quick', permission: 'any' },
        { id: 'issues', group: 'assets', label: 'Report Issue', icon: 'report_problem', desc: 'Flag damage or malfunction', color: 'from-rose-500 to-red-600', stat: 'Quick', permission: 'any' },
        // TIME & SCHEDULE
        { id: 'attendance', group: 'time', label: 'Attendance', icon: 'fact_check', desc: 'Mark & track attendance', color: 'from-lime-600 to-green-700', stat: 'Today', permission: 'any' },
        { id: 'leave', group: 'time', label: 'Leave', icon: 'event_busy', desc: 'Apply & track leave requests', color: 'from-sky-500 to-cyan-600', stat: canManageTeam ? `${pendingLeaveApprovals} Pending` : `${myLeaves} Applied`, permission: 'any' },
        { id: 'calendar', group: 'time', label: 'Calendar', icon: 'calendar_month', desc: 'Shared schedules & deadlines', color: 'from-emerald-600 to-teal-700', stat: `${db.calendarEvents.length} Events`, permission: 'any' },
        // WORK
        { id: 'worklog', group: 'work', label: 'Daily Worklog', icon: 'edit_note', desc: 'Log daily tasks & activities', color: 'from-emerald-600 to-teal-700', stat: `${db.worklogs.filter(w=>w.empId===user.empId).length} Entries`, permission: 'any' },
        { id: 'tasks', group: 'work', label: 'Tasks', icon: 'task_alt', desc: 'Assigned tasks & performance', color: 'from-amber-500 to-orange-600', stat: `${pendingTasks} Pending`, permission: 'any' },
        { id: 'procurement', group: 'work', label: 'Procurement', icon: 'shopping_cart', desc: 'Multi-step procurement workflow', color: 'from-violet-600 to-purple-700', stat: `${pendingProcurement} Active`, permission: ['approve_requests', 'approve_finance', 'manage_assets'] },
        // FINANCE
        { id: 'reimbursements', group: 'finance', label: 'Expenses', icon: 'receipt_long', desc: 'Expense claims & settlements', color: 'from-rose-500 to-pink-600', stat: `${pendingReimb} Pending`, permission: 'any' },
        { id: 'payroll', group: 'finance', label: 'Payroll', icon: 'payments', desc: 'Salary slips & payroll', color: 'from-fuchsia-600 to-pink-700', stat: `${db.payroll.length} Slips`, permission: 'manage_payroll' },
        { id: 'payment_export', group: 'finance', label: 'Bank Payment', icon: 'account_balance', desc: 'Disbursement file builder', color: 'from-emerald-500 to-teal-600', stat: 'Export', permission: 'approve_finance' },
        { id: 'payment_programs', group: 'finance', label: 'Payment Programs', icon: 'tune', desc: 'Programs & cheque settings', color: 'from-violet-500 to-purple-600', stat: 'Setup', permission: 'approve_finance' },
        { id: 'bank_accounts', group: 'finance', label: 'Bank Accounts', icon: 'savings', desc: 'Master beneficiary list', color: 'from-sky-500 to-blue-600', stat: 'Master', permission: 'approve_finance' },
        // PEOPLE
        { id: 'org_chart', group: 'people', label: 'Org Chart', icon: 'account_tree', desc: 'Employee hierarchy & teams', color: 'from-slate-600 to-gray-700', stat: `${db.hierarchy.length} Mapped`, permission: 'any' },
        { id: 'performance', group: 'people', label: 'Reviews', icon: 'workspace_premium', desc: 'Performance reviews & feedback', color: 'from-rose-500 to-pink-600', stat: `${db.performanceReviews.length} Reviews`, permission: 'any' },
        { id: 'users', group: 'people', label: 'User Management', icon: 'admin_panel_settings', desc: 'Manage permissions & users', color: 'from-rose-700 to-red-900', stat: 'Governance', permission: 'manage_users' },
        { id: 'team_dashboard', group: 'people', label: 'Team Dashboard', icon: 'monitoring', desc: 'Team progress & program rollup', color: 'from-emerald-600 to-teal-700', stat: 'Live', permission: ['manage_team', 'view_reports', 'manage_users'] },
        // COMMUNICATION
        { id: 'announcements', group: 'comm', label: 'Board', icon: 'campaign', desc: 'Official announcements & feed', color: 'from-amber-500 to-orange-600', stat: `${db.announcements.length} Posts`, permission: 'any' },
        { id: 'social_hub', group: 'comm', label: 'Social Hub', icon: 'share', desc: 'Kalike social media & advocacy', color: 'from-cyan-500 to-blue-600', stat: 'Engage', permission: 'any' },
        { id: 'data_collection', group: 'comm', label: 'Data Collection', icon: 'poll', desc: 'FieldGovern surveys & forms', color: 'from-indigo-500 to-blue-600', stat: 'External', permission: 'any' },
        // RESOURCES
        { id: 'documents', group: 'resources', label: 'Document Vault', icon: 'folder_shared', desc: 'Secure institutional storage', color: 'from-indigo-600 to-blue-700', stat: `${db.documents.length} Files`, permission: 'any' },
        // ADMIN
        { id: 'reports', group: 'admin', label: 'Reports Engine', icon: 'analytics', desc: 'Organizational analytics', color: 'from-slate-700 to-slate-900', stat: 'Analytics', permission: 'view_reports' },
    ].filter(m => {
        if (m.permission === 'any') return true;
        if (Array.isArray(m.permission)) return m.permission.some(p => window.app.hasPermission(p));
        return window.app.hasPermission(m.permission);
    });

    const groupMeta = {
        assets:    { label: 'Assets',          icon: 'inventory_2',             desc: 'Track, request, and report issues',         gradient: 'from-blue-500 to-indigo-600',     tint: 'bg-blue-50',     accent: 'text-blue-600' },
        time:      { label: 'Attendance & Schedule', icon: 'schedule',           desc: 'Attendance, leave, and calendar',           gradient: 'from-emerald-500 to-teal-600',    tint: 'bg-emerald-50',  accent: 'text-emerald-600' },
        work:      { label: 'Work',            icon: 'work',                    desc: 'Worklog, tasks, and procurement',           gradient: 'from-amber-500 to-orange-600',    tint: 'bg-amber-50',    accent: 'text-amber-600' },
        finance:   { label: 'Finance',         icon: 'account_balance_wallet',  desc: 'Reimbursements and payroll',                gradient: 'from-fuchsia-500 to-pink-600',    tint: 'bg-fuchsia-50',  accent: 'text-fuchsia-600' },
        people:    { label: 'People',          icon: 'group',                   desc: 'Org chart, reviews, and team',              gradient: 'from-rose-500 to-red-600',        tint: 'bg-rose-50',     accent: 'text-rose-600' },
        comm:      { label: 'Communication',   icon: 'forum',                   desc: 'Announcements, social, and data',           gradient: 'from-cyan-500 to-sky-600',        tint: 'bg-cyan-50',     accent: 'text-cyan-600' },
        resources: { label: 'Resources',       icon: 'folder_shared',           desc: 'Document vault and files',                  gradient: 'from-violet-500 to-purple-600',   tint: 'bg-violet-50',   accent: 'text-violet-600' },
        admin:     { label: 'Administration',  icon: 'shield_person',           desc: 'Reports and governance tools',              gradient: 'from-slate-700 to-slate-900',     tint: 'bg-slate-100',   accent: 'text-slate-700' }
    };

    const groupedModules = Object.keys(groupMeta)
        .map(gid => ({ id: gid, ...groupMeta[gid], items: allModules.filter(m => m.group === gid) }))
        .filter(g => g.items.length > 0);

    window.__homeGroups = groupedModules;
    window.openHomeGroup = function(gid) {
        const g = (window.__homeGroups || []).find(x => x.id === gid);
        if (!g) return;
        const existing = document.getElementById('home-group-modal');
        if (existing) existing.remove();
        const wrap = document.createElement('div');
        wrap.id = 'home-group-modal';
        wrap.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in-up';
        wrap.onclick = (e) => { if (e.target === wrap) wrap.remove(); };
        wrap.innerHTML = `
            <div class="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-white/10">
                <div class="relative overflow-hidden text-white px-6 py-5 bg-gradient-to-br ${g.gradient}">
                    <div class="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div class="absolute -bottom-12 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div class="relative flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30 shadow-lg">
                            <span class="material-symbols-outlined text-[26px]">${g.icon}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-lg font-black tracking-tight">${g.label}</h3>
                            <p class="text-[11px] text-white/80 font-medium">${g.desc}</p>
                        </div>
                        <span class="px-3 py-1 bg-white/15 backdrop-blur border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">${g.items.length} Items</span>
                        <button onclick="document.getElementById('home-group-modal').remove()" class="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/25 backdrop-blur transition-all text-white flex items-center justify-center">
                            <span class="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>
                <div class="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/30">
                    ${g.items.map(m => `
                        <a href="#${m.id}" onclick="document.getElementById('home-group-modal').remove()" class="group relative flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-transparent hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
                            <div class="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${m.color} opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div class="w-11 h-11 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
                                <span class="material-symbols-outlined text-xl">${m.icon}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-black text-slate-900 uppercase tracking-tight truncate">${m.label}</p>
                                <p class="text-[10px] text-slate-500 truncate font-medium mt-0.5">${m.desc}</p>
                            </div>
                            <span class="text-[9px] font-black ${g.accent} ${g.tint} px-2 py-1 rounded-full uppercase shrink-0 tracking-widest">${m.stat}</span>
                            <span class="material-symbols-outlined text-slate-200 group-hover:text-slate-500 group-hover:translate-x-1 transition-all text-base shrink-0">arrow_forward</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(wrap);
    };


    return `
    <div class="space-y-4 animate-fade-in-up">
        <!-- Welcome Banner (compact, polished) -->
        <div class="relative overflow-hidden rounded-2xl px-5 py-4 text-white flex items-center justify-between gap-4 shadow-lg" style="background:linear-gradient(120deg,#0f172a 0%,#1e293b 45%,#312e81 100%);">
            <div class="absolute -top-10 -right-10 w-48 h-48 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-12 left-1/3 w-40 h-40 bg-fuchsia-400/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="relative flex items-center gap-3 min-w-0 z-10">
                <div class="relative shrink-0">
                    <img src="${user.avatar}" class="w-11 h-11 rounded-xl border-2 border-white/20 shadow" />
                    <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900"></span>
                </div>
                <div class="min-w-0">
                    <h1 class="text-base font-black tracking-tight truncate flex items-center gap-2">
                        ${greeting}, ${user.name}
                        <span class="text-amber-300">👋</span>
                    </h1>
                    <p class="text-[10px] text-slate-300 font-medium truncate">${dateStr} · <span class="text-white/80">Kalike Unified Workspace</span></p>
                </div>
            </div>
            <div class="relative flex items-center gap-2 shrink-0 z-10">
                <span class="px-2.5 py-1 bg-white/10 backdrop-blur text-white text-[9px] font-black rounded-full uppercase tracking-widest border border-white/20">${user.role}</span>
                ${unreadNotifs > 0 ? `<span class="px-2.5 py-1 bg-rose-500/30 text-rose-100 text-[9px] font-black rounded-full uppercase tracking-widest border border-rose-400/40 flex items-center gap-1"><span class="w-1.5 h-1.5 bg-rose-300 rounded-full animate-pulse"></span>${unreadNotifs}</span>` : ''}
            </div>
        </div>

        <!-- Quick Stats Row (Conditional based on Authority) -->
        ${canViewGlobalStats ? `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><span class="material-symbols-outlined text-xl">inventory_2</span></div>
                    <div><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Assets</p><p class="text-xl font-black text-slate-900 tabular-nums">${stats.totalAssets}</p></div>
                </div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><span class="material-symbols-outlined text-xl">task_alt</span></div>
                    <div><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Pending Tasks</p><p class="text-xl font-black text-slate-900 tabular-nums">${db.tasks.filter(t=>t.status!=='Completed').length}</p></div>
                </div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><span class="material-symbols-outlined text-xl">currency_rupee</span></div>
                    <div><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inventory Value</p><p class="text-xl font-black text-slate-900 tabular-nums">₹${(stats.netValue/100000).toFixed(1)}L</p></div>
                </div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600"><span class="material-symbols-outlined text-xl">notifications_active</span></div>
                    <div><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Alerts</p><p class="text-xl font-black text-slate-900 tabular-nums">${unreadNotifs}</p></div>
                </div>
            </div>
        </div>
        ` : `
        <!-- Personal Quick View for Staff -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><span class="material-symbols-outlined text-xl">inventory_2</span></div>
                    <div><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">My Assets</p><p class="text-xl font-black text-slate-900 tabular-nums">${db.assets.filter(a=>a.assignedToId === user.empId).length}</p></div>
                </div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600"><span class="material-symbols-outlined text-xl">task_alt</span></div>
                    <div><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">My Tasks</p><p class="text-xl font-black text-slate-900 tabular-nums">${pendingTasks}</p></div>
                </div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600"><span class="material-symbols-outlined text-xl">event_available</span></div>
                    <div><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">My Attendance</p><p class="text-xl font-black text-slate-900 tabular-nums">${db.attendance.filter(a=>a.empId===user.empId && a.status === 'Present').length}</p></div>
                </div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600"><span class="material-symbols-outlined text-xl">notifications</span></div>
                    <div><p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unread</p><p class="text-xl font-black text-slate-900 tabular-nums">${unreadNotifs}</p></div>
                </div>
            </div>
        </div>
        `}


        <!-- Multi-Tier Oversight Blocks (Conditional) -->
        ${(canManageTeam || canViewGlobalStats) ? `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            ${canManageTeam ? `
                <div class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <span class="material-symbols-outlined">groups</span>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">Team Performance</h3>
                                <p class="text-xs text-slate-500 font-medium">Direct reports & active appraisals</p>
                            </div>
                        </div>
                        <a href="#org_chart" class="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Manage Team</a>
                    </div>
                    
                    <div class="space-y-4">
                        ${db.hierarchy.filter(h => h.reportsTo === user.empId).slice(0, 5).map(h => {
                            const emp = db.users.find(u => u.id === h.empId);
                            const lastReview = db.performanceReviews.filter(r => r.empId === h.empId && r.status === 'Published').sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
                            return `
                                <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-all cursor-pointer group" onclick="window.app.navigateTo('profile', '${h.empId}')">
                                    <div class="flex items-center gap-4">
                                        <img src="${emp?.avatar || 'https://cdn-icons-png.flaticon.com/512/147/147144.png'}" class="w-10 h-10 rounded-xl border border-white shadow-sm" />
                                        <div>
                                            <p class="text-[11px] font-black text-slate-900 uppercase tracking-tight">${h.empName}</p>
                                            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">${h.department} • ${emp?.designation || 'Staff'}</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] font-black text-slate-900 uppercase">${lastReview ? `SCORE: ${lastReview.taskScore}` : 'NO REVIEW'}</p>
                                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Institutional Index</p>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            ${canViewGlobalStats ? `
                <div class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <span class="material-symbols-outlined">verified_user</span>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">Governance Feed</h3>
                                <p class="text-xs text-slate-500 font-medium">Critical approvals & compliance alerts</p>
                            </div>
                        </div>
                        <span class="px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-full uppercase border border-indigo-100">Live Audit</span>
                    </div>
                    
                    <div class="space-y-4">
                        ${db.procurement.filter(p => !p.rejected && p.step !== 'asset_registered').slice(0, 4).map(p => `
                            <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group" onclick="window.app.navigateTo('procurement')">
                                <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                    <span class="material-symbols-outlined text-xl">shopping_cart</span>
                                </div>
                                <div class="flex-1">
                                    <div class="flex items-center justify-between">
                                        <p class="text-[11px] font-black text-slate-900 uppercase tracking-tight">${p.title}</p>
                                        <span class="text-[9px] font-black text-slate-400 tabular-nums">₹${p.estimatedAmount.toLocaleString()}</span>
                                    </div>
                                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Waiting for: ${p.step.replace('_', ' ')}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
        ` : ''}

        <!-- Function Group Tiles (click to open submenu) -->
        <div class="flex items-center justify-between px-1 pt-2">
            <div>
                <h2 class="text-xs font-black text-slate-900 uppercase tracking-[.25em]">Workspace</h2>
                <p class="text-[10px] text-slate-400 font-medium">Tap a tile to explore that section</p>
            </div>
            <span class="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full uppercase tracking-widest border border-slate-100">${groupedModules.length} Areas</span>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            ${groupedModules.map(group => `
                <button type="button" onclick="window.openHomeGroup('${group.id}')" class="group relative bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 hover:shadow-xl hover:-translate-y-1 hover:border-transparent transition-all duration-300 text-left flex flex-col gap-2 sm:gap-3 cursor-pointer overflow-hidden active:scale-95">
                    <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${group.gradient}"></div>
                    <div class="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${group.gradient} opacity-[0.07] group-hover:opacity-20 group-hover:scale-125 transition-all duration-500"></div>
                    <div class="relative flex items-center justify-between">
                        <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${group.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                            <span class="material-symbols-outlined text-xl">${group.icon}</span>
                        </div>
                        <span class="text-[9px] font-black ${group.accent} ${group.tint} px-1.5 py-0.5 rounded-full shrink-0 uppercase tracking-widest">${group.items.length}</span>
                    </div>
                    <div class="relative">
                        <h2 class="text-[11px] sm:text-xs font-black text-slate-900 uppercase tracking-wide truncate">${group.label}</h2>
                        <p class="text-[9px] sm:text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-2 leading-snug hidden lg:block">${group.desc}</p>
                    </div>
                    <div class="relative flex items-center justify-between pt-2 border-t border-slate-50 mt-auto">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Open</span>
                        <span class="material-symbols-outlined text-slate-300 group-hover:text-slate-700 group-hover:translate-x-1 transition-all text-base">arrow_forward</span>
                    </div>
                </button>
            `).join('')}
        </div>

    </div>`;
}
