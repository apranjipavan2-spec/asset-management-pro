import { db } from '../mock/db.js';

export function renderFinanceDashboard() {
    const stats = db.getStats();
    const grants = db.grants;

    return `
        <div class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-200 pb-10 font-sans">
            <header class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl text-slate-900 font-black tracking-tightest uppercase">Financial Control Ledger</h2>
                    <p class="text-slate-400 text-[10px] font-black tracking-[.2em] uppercase mt-1">Institutional Asset Valuation & Compliance</p>
                </div>
                <button onclick="app.exportCSV('assets')" class="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[.2em] rounded-xl hover:bg-accent transition-all flex items-center gap-2 group shadow-lg shadow-slate-900/10">
                    <span class="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">download_for_offline</span>
                    Export Ledger
                </button>
            </header>

            <!-- Key Financial Metrics: Compact -->
            <section class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-slate-900"></div>
                    <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Gross Portfolio</span>
                    <span class="text-xl font-black text-slate-900 tabular-nums">₹${stats.totalValue.toLocaleString()}</span>
                    <p class="text-[9px] font-bold text-emerald-600 mt-3 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[12px]">trending_up</span> +2.4% yield
                    </p>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-500"></div>
                    <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Accum. Dep.</span>
                    <span class="text-xl font-black text-rose-500 tabular-nums">-₹${(stats.totalValue - stats.netValue).toLocaleString()}</span>
                    <p class="text-[9px] font-bold text-slate-400 mt-3">20.0% standard rate</p>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500"></div>
                    <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Net Book Value</span>
                    <span class="text-xl font-black text-slate-900 tabular-nums">₹${stats.netValue.toLocaleString()}</span>
                    <p class="text-[9px] font-bold text-slate-400 mt-3">Equity Balance</p>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500"></div>
                    <span class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1.5">Grant Liquidity</span>
                    <span class="text-xl font-black text-slate-900 tabular-nums">₹${grants.reduce((s, g) => s + g.openingBalance, 0).toLocaleString()}</span>
                    <p class="text-[9px] font-bold text-slate-400 mt-3">${grants.length} Active Grantors</p>
                </div>
            </section>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Grant Utilization Card Grid: NICE & DETAILED -->
                <div class="space-y-4">
                    <div class="flex items-center justify-between px-2">
                        <h3 class="text-[11px] font-black uppercase tracking-[.25em] text-slate-900 font-headline">Grant Expenditure Analysis</h3>
                        <button onclick="app.exportCSV('grants')" class="text-[9px] font-black text-accent hover:underline uppercase tracking-widest">Detail Report</button>
                    </div>
                    <div class="grid grid-cols-1 gap-4">
                        ${grants.map(grant => {
                            const pct = Math.min(100, (grant.spent / grant.openingBalance * 100)).toFixed(0);
                            return `
                            <div class="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-all group">
                                <div class="flex justify-between items-start mb-6">
                                    <div class="flex items-center gap-4">
                                        <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <span class="material-symbols-outlined text-xl">payments</span>
                                        </div>
                                        <div>
                                            <p class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">${grant.id}</p>
                                            <h4 class="text-sm font-black text-slate-900 mt-0.5 font-headline">${grant.name}</h4>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">Allocated Fund</p>
                                        <p class="text-lg font-black text-slate-900 tabular-nums font-headline">₹${grant.openingBalance.toLocaleString()}</p>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-3 gap-4 mb-6">
                                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p class="text-[9px] text-slate-400 font-black uppercase mb-1">Program</p>
                                        <p class="text-[10px] font-bold text-slate-700 truncate">${grant.program}</p>
                                    </div>
                                    <div class="p-3 bg-rose-50 rounded-xl border border-rose-100">
                                        <p class="text-[9px] text-rose-400 font-black uppercase mb-1">Spent</p>
                                        <p class="text-[10px] font-black text-rose-600">₹${grant.spent.toLocaleString()}</p>
                                    </div>
                                    <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                        <p class="text-[9px] text-emerald-400 font-black uppercase mb-1">Available</p>
                                        <p class="text-[10px] font-black text-emerald-600">₹${grant.closingBalance.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <div class="flex justify-between items-end">
                                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[9px]">Burn Rate Progress</span>
                                        <span class="text-xs font-black text-slate-900 tabular-nums">${pct}%</span>
                                    </div>
                                    <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div class="h-full bg-slate-900 transition-all duration-1000 ease-out" style="width: ${pct}%"></div>
                                    </div>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>

                <div class="space-y-6">
                    <!-- Asset Worth Summary: Compact -->
                    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <div class="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h3 class="text-[10px] font-black uppercase tracking-[.25em] text-slate-900 font-headline">Portfolio Distribution</h3>
                        </div>
                        <div class="p-6 space-y-5">
                            ${[...new Set(db.assets.map(a => a.category))].map(cat => {
                                const total = db.assets.filter(a => a.category === cat).reduce((s, a) => s + a.amount, 0);
                                const pct = (total / stats.totalValue * 100).toFixed(0);
                                return `
                                <div class="space-y-2">
                                    <div class="flex justify-between items-end">
                                        <span class="text-[11px] font-bold text-slate-900 uppercase tracking-tight">${cat}</span>
                                        <span class="text-[11px] font-black text-slate-400 tabular-nums">₹${total.toLocaleString()}</span>
                                    </div>
                                    <div class="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                        <div class="h-full bg-accent" style="width: ${pct}%"></div>
                                    </div>
                                </div>
                                `
                            }).join('')}
                        </div>
                    </div>

                    <!-- Requisition Queue: Compact -->
                    <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 class="text-[10px] font-black uppercase tracking-[.25em] text-slate-900 font-headline">Pending Financial Approval</h3>
                            <span class="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black tabular-nums">${db.requests.filter(r => !r.financeApproved && !r.status.startsWith('Rejected')).length}</span>
                        </div>
                        <div class="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
                            ${db.requests.filter(r => !r.financeApproved && !r.status.startsWith('Rejected')).length > 0 ? db.requests.filter(r => !r.financeApproved && !r.status.startsWith('Rejected')).map(req => `
                                <div class="p-5 space-y-3 hover:bg-slate-50 transition-all">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${req.category}</p>
                                            <p class="text-xs font-black text-slate-900 mt-1">${req.user}</p>
                                        </div>
                                        <span class="text-[9px] font-black text-slate-400">${new Date(req.date).toLocaleDateString()}</span>
                                    </div>
                                    <p class="text-[10px] text-slate-500 italic bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 line-clamp-1">"${req.reason}"</p>
                                    <div class="flex gap-2">
                                        <button onclick="approveReqFinance('${req.id}')" class="flex-1 py-2 bg-slate-900 text-white text-[9px] font-black rounded-lg hover:bg-emerald-600 transition-all uppercase tracking-widest">Approve</button>
                                        <button onclick="rejectReqFinance('${req.id}')" class="flex-1 py-2 bg-white border border-slate-200 text-[9px] font-black text-slate-400 rounded-lg hover:border-rose-500 hover:text-rose-500 transition-all uppercase tracking-widest">Reject</button>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="p-10 text-center text-[10px] text-slate-400 uppercase tracking-widest font-black italic">Queue Clear</div>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.approveReqFinance = (id) => {
    db.approveRequestFinance(id);
    window.app.render();
};

window.rejectReqFinance = (id) => {
    db.rejectRequestFinance(id);
    window.app.render();
};
