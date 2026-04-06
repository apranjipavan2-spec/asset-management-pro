import { db } from '../mock/db.js';

export function renderGrantLedger() {
    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header class="flex items-end justify-between">
                <div>
                    <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Grant Expenditure Ledger</h2>
                    <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">Restricted Fund Tracking & Compliance</p>
                </div>
            </header>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="px-8 py-5 border-b border-slate-50 bg-slate-50/20">
                    <h3 class="text-xs font-black uppercase tracking-[.25em] text-slate-900 font-label">Detailed Program Ledger</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100">Grant Particulars</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100">Program Area</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-right">Awarded Amount</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-right">Burn Rate / Spent</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-right">Available Balance</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${db.grants.map(grant => {
                                const burnPct = Math.min(100, (grant.spent / grant.openingBalance * 100)).toFixed(0);
                                return `
                                <tr class="hover:bg-slate-50/50 transition-all group">
                                    <td class="px-8 py-5">
                                        <div class="flex items-center gap-4">
                                            <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100">
                                                <span class="material-symbols-outlined text-sm">workspace_premium</span>
                                            </div>
                                            <div>
                                                <p class="text-sm font-black text-slate-900">${grant.name}</p>
                                                <p class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">ID: ${grant.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-8 py-5 text-xs font-bold text-slate-600">${grant.program}</td>
                                    <td class="px-8 py-5 text-right text-sm font-black text-slate-900 tabular-nums">₹${grant.openingBalance.toLocaleString()}</td>
                                    <td class="px-8 py-5 text-right">
                                        <p class="text-sm font-black text-rose-500 tabular-nums">-₹${grant.spent.toLocaleString()}</p>
                                        <div class="flex justify-end gap-2 items-center mt-1">
                                             <div class="w-16 h-1 bg-rose-100 rounded-full overflow-hidden">
                                                 <div class="h-full bg-rose-500" style="width: ${burnPct}%"></div>
                                             </div>
                                             <p class="text-[9px] font-bold text-rose-500">${burnPct}%</p>
                                        </div>
                                    </td>
                                    <td class="px-8 py-5 text-right text-sm font-black text-emerald-600 tabular-nums">₹${grant.closingBalance.toLocaleString()}</td>
                                </tr>
                                `
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}
