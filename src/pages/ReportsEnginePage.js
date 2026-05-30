import { db, RAW_EMPLOYEES } from '../mock/db.js';

export function renderReportsEnginePage(user) {
    const reportCards = [
        {
            title: "Monthly HR Summary",
            desc: "Attendance metrics, leave utilization, and payroll snapshots for the current month.",
            icon: "group",
            color: "emerald"
        },
        {
            title: "Quarterly Financials",
            desc: "Asset depreciation, grant utilization, and reimbursement settlements per quarter.",
            icon: "account_balance",
            color: "blue"
        },
        {
            title: "Biannual Performance",
            desc: "Aggregated task scores, manager ratings, and worklog completion rates over 6 months.",
            icon: "insights",
            color: "purple"
        },
        {
            title: "Annual Organizational Review",
            desc: "Comprehensive yearly export of all modules including procurement, financials, and HR data.",
            icon: "summarize",
            color: "amber"
        }
    ];

    setTimeout(() => {
        // Mock export functionality
        const exportBtns = document.querySelectorAll('.export-btn');
        exportBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const originalText = button.innerHTML;
                button.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">refresh</span> Generating...';
                button.classList.add('opacity-75');
                
                setTimeout(() => {
                    button.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Downloaded';
                    button.classList.remove('opacity-75', 'bg-slate-900');
                    button.classList.add('bg-emerald-600');
                    
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.classList.add('bg-slate-900');
                        button.classList.remove('bg-emerald-600');
                    }, 2000);
                }, 1500);
            });
        });
    }, 100);

    return `
        <div class="h-full flex flex-col space-y-6 fade-in">
            <!-- Header -->
            <div class="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner">
                        <span class="material-symbols-outlined text-2xl">analytics</span>
                    </div>
                    <div>
                        <h1 class="text-2xl font-black text-slate-900 tracking-tight uppercase">Reports Engine</h1>
                        <p class="text-xs text-slate-500 font-bold tracking-widest uppercase mt-1">Cross-Module Analytics & Export</p>
                    </div>
                </div>
            </div>

            <!-- Report Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0 overflow-y-auto pb-6">
                ${reportCards.map(card => `
                    <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col hover:border-${card.color}-200 hover:shadow-md transition-all group">
                        <div class="flex items-start justify-between mb-4">
                            <div class="w-12 h-12 rounded-2xl flex items-center justify-center border bg-${card.color}-50 border-${card.color}-100 text-${card.color}-600 shrink-0 group-hover:scale-110 transition-transform">
                                <span class="material-symbols-outlined text-2xl">${card.icon}</span>
                            </div>
                            <span class="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">CSV / PDF</span>
                        </div>
                        
                        <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">${card.title}</h3>
                        <p class="text-sm text-slate-500 leading-relaxed mb-6 flex-1">${card.desc}</p>
                        
                        <div class="pt-4 border-t border-slate-100 flex gap-3">
                            <button class="export-btn flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-accent transition-colors flex items-center justify-center gap-2">
                                <span class="material-symbols-outlined text-sm">download</span>
                                Export Data
                            </button>
                            <button class="w-10 h-10 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-slate-100 hover:text-slate-900 transition-colors" title="View Preview">
                                <span class="material-symbols-outlined text-sm">visibility</span>
                            </button>
                        </div>
                    </div>
                `).join('')}

            <!-- Live Organizational Insights -->
            <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-sm font-black text-slate-900 uppercase tracking-[.25em] flex items-center gap-2">
                        <span class="material-symbols-outlined text-accent">monitoring</span>
                        Live Organizational Insights
                    </h2>
                    <span class="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full border border-emerald-100 uppercase tracking-widest">Real-time Data Sync</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- HR Insights -->
                    <div class="space-y-4">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">HR & Operations</p>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-slate-600 uppercase tracking-tight">Total Workforce</span>
                            <span class="text-sm font-black text-slate-900">${RAW_EMPLOYEES.length}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-slate-600 uppercase tracking-tight">Active Leaves</span>
                            <span class="text-sm font-black text-slate-900">${db.leaves.filter(l => l.status === 'Pending').length}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-slate-600 uppercase tracking-tight">Avg Attendance</span>
                            <span class="text-sm font-black text-emerald-600">94.2%</span>
                        </div>
                    </div>

                    <!-- Finance Insights -->
                    <div class="space-y-4">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Financial Health</p>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-slate-600 uppercase tracking-tight">Asset Net Value</span>
                            <span class="text-sm font-black text-slate-900">₹${(db.getStats().netValue / 100000).toFixed(1)}L</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-slate-600 uppercase tracking-tight">Pending Reimb.</span>
                            <span class="text-sm font-black text-amber-600">₹${db.reimbursements.filter(r => r.status === 'Pending').reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString()}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-slate-600 uppercase tracking-tight">Procurement Pipe.</span>
                            <span class="text-sm font-black text-blue-600">${db.procurement.filter(p => p.step !== 'asset_registered').length}</span>
                        </div>
                    </div>

                    <!-- Performance Insights -->
                    <div class="space-y-4">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Performance & Growth</p>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-slate-600 uppercase tracking-tight">Task Completion</span>
                            <span class="text-sm font-black text-slate-900">${((db.tasks.filter(t => t.status === 'Completed').length / (db.tasks.length || 1)) * 100).toFixed(1)}%</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-slate-600 uppercase tracking-tight">Avg Performance</span>
                            <span class="text-sm font-black text-purple-600">${(db.performanceReviews.reduce((avg, r) => avg + (r.managerRating || 0), 0) / (db.performanceReviews.length || 1)).toFixed(1)}/5.0</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-medium text-slate-600 uppercase tracking-tight">Review Coverage</span>
                            <span class="text-sm font-black text-slate-900">${db.performanceReviews.length}/${RAW_EMPLOYEES.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Institutional Alert Logs (Audit) -->
            <div class="bg-slate-900 rounded-3xl shadow-lg border border-slate-700 p-8 text-white overflow-hidden relative">
                <div class="absolute top-0 right-0 p-8 opacity-10">
                    <span class="material-symbols-outlined text-8xl">contact_mail</span>
                </div>
                <div class="relative z-10">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h3 class="text-lg font-black uppercase tracking-tight">Institutional Alert Logs</h3>
                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Audit trail of automated Email/SMS notifications</p>
                        </div>
                        <span class="px-3 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded-full border border-blue-500/30 uppercase tracking-widest">System Active</span>
                    </div>

                    <div class="space-y-3">
                        ${db.communicationLogs.length > 0 ? db.communicationLogs.slice(0, 5).map(log => `
                            <div class="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                        <span class="material-symbols-outlined text-sm">${log.type === 'Email' ? 'mail' : 'sms'}</span>
                                    </div>
                                    <div>
                                        <p class="text-xs font-black uppercase tracking-tight">${log.type} to ${log.recipient}</p>
                                        <p class="text-[10px] text-slate-400 mt-1 italic line-clamp-1">"${log.message}"</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[8px] font-black rounded-full uppercase tracking-widest">${log.status}</span>
                                    <p class="text-[9px] text-slate-500 mt-1 font-bold">${new Date(log.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        `).join('') : '<div class="py-8 text-center text-xs text-slate-500 italic uppercase tracking-widest">No alerts triggered in this session</div>'}
                    </div>
                </div>
            </div>
        </div>
    `;
}
