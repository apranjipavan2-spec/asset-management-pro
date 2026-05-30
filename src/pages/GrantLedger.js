import { db } from '../mock/db.js';

export function renderGrantLedger() {
    return `
        <div class="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <header class="flex items-end justify-between">
                <div>
                    <h2 class="page-title">Grant Expenditure Ledger</h2>
                    <p class="page-subtitle">Restricted Fund Tracking & Compliance</p>
                </div>
                <div class="flex gap-2">
                    ${window.app.canExportAssets() ? `<button onclick="app.exportCSV('grants')" class="btn-ghost flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">download</span> CSV
                    </button>` : ''}
                    <button onclick="app.showAddGrantModal()" class="btn-primary">
                        <span class="material-symbols-outlined text-sm">add</span> Add New Grant
                    </button>
                </div>
            </header>

            <div class="card-accent flex flex-col flex-1 min-h-0">
                <div class="card-header">
                    <h3 class="card-title">Detailed Program Ledger</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="dense-table">
                        <thead class="sticky-header">
                            <tr class="bg-slate-100/30">
                                <th>Grant Identity</th>
                                <th>Program Geography</th>
                                <th class="text-right">Awarded Amount</th>
                                <th class="text-right">State / Burn</th>
                                <th class="text-right">Available Balance</th>
                                <th class="text-right px-6 select-none">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${db.grants.map(grant => {
                                const burnPct = Math.min(100, (grant.spent / grant.openingBalance * 100)).toFixed(0);
                                return `
                                <tr class="group">
                                    <td onclick="app.showGrantModal('${grant.id}')">
                                        <div class="flex items-center gap-3">
                                            <div class="compact-icon bg-indigo-50 text-indigo-500 border border-indigo-100 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                <span class="material-symbols-outlined text-sm">workspace_premium</span>
                                            </div>
                                            <div class="max-w-[180px]">
                                                <p class="text-[11px] font-black text-slate-900 multiline-name leading-tight" title="${grant.name}">${grant.name}</p>
                                                <p class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">ID: ${grant.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="text-[10px] font-bold text-slate-600 max-w-[120px]">
                                        <p class="multiline-name leading-tight">${grant.program}</p>
                                    </td>
                                    <td class="text-right text-xs font-black text-slate-900 tabular-nums">₹${Math.round(grant.openingBalance).toLocaleString()}</td>
                                    <td class="text-right">
                                        <p class="text-xs font-black text-rose-500 tabular-nums">-₹${Math.round(grant.spent).toLocaleString()}</p>
                                        <div class="flex justify-end gap-2 items-center mt-1">
                                             <div class="w-12 h-1 bg-rose-100 rounded-full overflow-hidden">
                                                 <div class="h-full bg-rose-500" style="width: ${burnPct}%"></div>
                                             </div>
                                             <p class="text-[8px] font-bold text-rose-500">${burnPct}%</p>
                                        </div>
                                    </td>
                                    <td class="text-right text-xs font-black text-emerald-600 tabular-nums">₹${Math.round(grant.closingBalance).toLocaleString()}</td>
                                    <td class="text-right px-6">
                                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onclick="app.showEditGrantModal('${grant.id}')" class="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 flex items-center justify-center transition-all shadow-sm" title="Edit Grant">
                                                <span class="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button onclick="app.deleteGrantRequest('${grant.id}')" class="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm" title="Delete Grant">
                                                <span class="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
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
