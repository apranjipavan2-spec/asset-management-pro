import { db } from '../mock/db.js';

export function renderTeamManagementPage(user) {
    const isManager = window.app.hasPermission('manage_team');
    const isHR = window.app.hasPermission('manage_users');
    const isED = window.app.user.role === 'director' || window.app.user.role === 'superadmin';

    // Determine target population
    let team = [];
    let title = "Team Oversight";
    
    if (isED || isHR) {
        // Show everything for ED/HR
        team = db.hierarchy.map(h => {
            const emp = db.users.find(u => u.id === h.empId);
            const metrics = db.getTeamMetrics(h.reportsTo).find(m => m.empId === h.empId);
            return { ...h, ...metrics, designation: emp?.designation || 'Staff', avatar: emp?.avatar || '' };
        });
        title = "Institutional Oversight";
    } else {
        // Just direct reports for Managers
        team = db.getTeamMetrics(user.empId);
    }

    const governanceAlerts = db.getGovernanceAlerts();
    const myTeamAlerts = isED || isHR ? governanceAlerts : governanceAlerts.filter(a => {
        // Check if item belongs to subordinate
        const reports = db.getDirectReports(user.empId);
        return reports.some(r => r.empId === a.item.empId || r.empId === a.item.requestedBy);
    });

    return `
    <div class="space-y-8 animate-fade-in-up pb-20">
        <header class="flex items-center justify-between">
            <div>
                <h1 class="text-3xl font-black text-slate-900 uppercase tracking-tightest">${title}</h1>
                <p class="text-xs text-slate-400 font-black uppercase tracking-[.3em] mt-1">Personnel Performance & Governance Health</p>
            </div>
            <div class="flex items-center gap-3">
                <div class="bg-white px-6 py-3 rounded-2xl border border-slate-100 flex items-center gap-4 shadow-sm">
                    <div class="text-center">
                        <p class="text-[8px] font-black text-slate-400 uppercase">Team Size</p>
                        <p class="text-sm font-black text-slate-900">${team.length}</p>
                    </div>
                    <div class="w-[1px] h-8 bg-slate-100"></div>
                    <div class="text-center">
                        <p class="text-[8px] font-black text-slate-400 uppercase">Alerts</p>
                        <p class="text-sm font-black text-rose-500">${myTeamAlerts.length}</p>
                    </div>
                </div>
            </div>
        </header>

        <!-- Governance Alerts Pulse -->
        ${myTeamAlerts.length > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${myTeamAlerts.slice(0, 3).map(alert => `
                    <div class="bg-white p-5 rounded-2xl border-l-4 ${alert.severity === 'critical' ? 'border-l-rose-500 bg-rose-50/20' : 'border-l-amber-500 bg-amber-50/20'} border border-slate-100 shadow-sm animate-pulse-subtle">
                        <div class="flex items-start gap-4">
                            <div class="w-8 h-8 rounded-lg ${alert.severity === 'critical' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-sm">${alert.severity === 'critical' ? 'priority_high' : 'warning'}</span>
                            </div>
                            <div>
                                <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest">${alert.title}</h4>
                                <p class="text-[11px] text-slate-600 font-medium mt-1">${alert.message}</p>
                                <button onclick="window.app.navigateTo('${alert.type}')" class="mt-3 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                    Take Action <span class="material-symbols-outlined text-[12px]">arrow_right_alt</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}

        <!-- Subordinate Health Matrix -->
        <div class="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
            <div class="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-[.25em]">Subordinate Health Matrix</h3>
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span class="text-[10px] font-black text-slate-400 uppercase">Live Sync</span>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse sortable-table">
                    <thead>
                        <tr class="bg-slate-50/50 border-b border-slate-100">
                            <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                            <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Today</th>
                            <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Activity</th>
                            <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Velocity</th>
                            <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${team.map(emp => `
                            <tr class="hover:bg-slate-50/50 transition-colors group">
                                <td class="px-8 py-4">
                                    <div class="flex items-center gap-4">
                                        <div class="relative">
                                            <img src="${emp.avatar || 'https://cdn-icons-png.flaticon.com/512/147/147144.png'}" class="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm" />
                                            ${emp.atRisk ? `
                                                <div class="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                                                    <span class="material-symbols-outlined text-white text-[8px] font-black">priority_high</span>
                                                </div>
                                            ` : ''}
                                        </div>
                                        <div>
                                            <p class="text-[11px] font-black text-slate-900 uppercase tracking-tight">${emp.name}</p>
                                            <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">${emp.designation}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-8 py-4">
                                    ${emp.presentToday ? `
                                        <span class="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg uppercase border border-emerald-100">Present</span>
                                    ` : `
                                        <span class="px-2.5 py-1 bg-slate-50 text-slate-400 text-[9px] font-black rounded-lg uppercase border border-slate-100">Away</span>
                                    `}
                                </td>
                                <td class="px-8 py-4">
                                    <p class="text-[10px] font-black text-slate-900 uppercase">${emp.lastLog || 'Never'}</p>
                                    <p class="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Worklog Submission</p>
                                </td>
                                <td class="px-8 py-4">
                                    <div class="w-32">
                                        <div class="flex items-center justify-between mb-1.5">
                                            <p class="text-[9px] font-black text-slate-900">${emp.taskCompletion || 0}%</p>
                                            <p class="text-[8px] font-bold text-slate-400">${emp.pendingTasks || 0} Pending</p>
                                        </div>
                                        <div class="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div class="h-full bg-indigo-600 rounded-full" style="width: ${emp.taskCompletion || 0}%"></div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-8 py-4 text-right">
                                    <div class="flex items-center justify-end gap-2">
                                        <button onclick="window.app.navigateTo('profile', '${emp.empId}')" class="w-9 h-9 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all flex items-center justify-center group/btn">
                                            <span class="material-symbols-outlined text-[18px]">account_circle</span>
                                        </button>
                                        <button onclick="window.app.navigateTo('tasks')" class="w-9 h-9 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-amber-600 hover:border-amber-100 hover:shadow-lg hover:shadow-amber-500/5 transition-all flex items-center justify-center group/btn">
                                            <span class="material-symbols-outlined text-[18px]">add_task</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>`;
}
