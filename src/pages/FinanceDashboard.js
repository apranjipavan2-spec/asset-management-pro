import { db } from '../mock/db.js';

export function renderFinanceDashboard() {
    const stats = db.getStats();
    const grants = db.grants;

    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header class="flex items-end justify-between">
                <div>
                    <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Financial Control Ledger</h2>
                    <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">Institutional Asset Valuation & Compliance</p>
                </div>
            </header>

            <!-- Key Financial Metrics -->
            <section class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <!-- Total Valuation -->
                <div class="bg-white p-7 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-slate-900"></div>
                    <span class="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-2">Gross Asset Value</span>
                    <span class="text-2xl font-black text-slate-900 tabular-nums">₹${stats.totalValue.toLocaleString()}</span>
                    <div class="mt-5 flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span class="text-emerald-600 font-black">+2.4%</span> vs last quarter
                    </div>
                </div>
                <!-- Depreciation -->
                <div class="bg-white p-7 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-rose-500"></div>
                    <span class="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Depreciation</span>
                    <span class="text-2xl font-black text-rose-500 tabular-nums">-₹${(stats.totalValue - stats.netValue).toLocaleString()}</span>
                    <div class="mt-5 flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span class="text-rose-500 font-black">${((stats.totalValue - stats.netValue) / stats.totalValue * 100).toFixed(1)}%</span> cumulative rate
                    </div>
                </div>
                <!-- NBV -->
                <div class="bg-white p-7 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-500"></div>
                    <span class="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-2">Net Book Value</span>
                    <span class="text-2xl font-black text-slate-900 tabular-nums">₹${stats.netValue.toLocaleString()}</span>
                    <div class="mt-5 flex items-center gap-2 text-xs font-bold text-slate-400">
                        Institutional Equity
                    </div>
                </div>
                <!-- Managed Grants -->
                <div class="bg-white p-7 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-indigo-500"></div>
                    <span class="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-2">Managed Grants</span>
                    <span class="text-2xl font-black text-slate-900 tabular-nums">₹${grants.reduce((s, g) => s + g.openingBalance, 0).toLocaleString()}</span>
                    <div class="mt-5 flex items-center gap-2 text-xs font-bold text-slate-400">
                        ${grants.length} Active Grantors
                    </div>
                </div>
            </section>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Grant Utilization Ledger -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div class="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <h3 class="text-xs font-black uppercase tracking-[.25em] text-slate-900 font-label">Grant Expenditure Analysis</h3>
                    </div>
                    <div class="divide-y divide-slate-100">
                        ${grants.map(grant => {
                            const pct = Math.min(100, (grant.spent / grant.openingBalance * 100)).toFixed(0);
                            return `
                            <div class="p-8 space-y-5">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">ID: ${grant.id}</p>
                                        <p class="text-sm font-black text-slate-900 mt-1">${grant.name}</p>
                                    </div>
                                    <span class="text-xs font-black text-slate-900 tabular-nums">₹${grant.openingBalance.toLocaleString()}</span>
                                </div>
                                
                                <div class="space-y-2">
                                    <div class="flex justify-between items-end">
                                        <span class="text-[10px] font-black text-slate-400 uppercase">Utilization</span>
                                        <span class="text-xs font-black text-slate-900 tabular-nums">${pct}%</span>
                                    </div>
                                    <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div class="h-full bg-slate-900" style="width: ${pct}%"></div>
                                    </div>
                                </div>
                                <div class="flex justify-between text-[10px] font-black">
                                    <span class="text-rose-500 uppercase">Spent: ₹${grant.spent.toLocaleString()}</span>
                                    <span class="text-emerald-600 uppercase">Remaining: ₹${grant.closingBalance.toLocaleString()}</span>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>

                <!-- Asset Worth Summary -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div class="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <h3 class="text-xs font-black uppercase tracking-[.25em] text-slate-900 font-label">Asset Worth Summary</h3>
                    </div>
                    <div class="p-8 space-y-8">
                        <div>
                            <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">Valuation by Category</p>
                            <div class="space-y-6">
                                ${[...new Set(db.assets.map(a => a.category))].map(cat => {
                                    const total = db.assets.filter(a => a.category === cat).reduce((s, a) => s + a.amount, 0);
                                    const pct = (total / stats.totalValue * 100).toFixed(0);
                                    return `
                                    <div class="space-y-2">
                                        <div class="flex justify-between items-end">
                                            <span class="text-xs font-bold text-slate-900">${cat}</span>
                                            <span class="text-xs font-bold text-slate-500 tabular-nums">₹${total.toLocaleString()}</span>
                                        </div>
                                        <div class="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                            <div class="h-full bg-accent" style="width: ${pct}%"></div>
                                        </div>
                                    </div>
                                    `
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
