import { db } from '../mock/db.js';

export function renderAssetsLedger() {
    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header class="flex items-end justify-between">
                <div>
                    <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Fixed Assets Ledger</h2>
                    <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">Capital Asset Inventory & Book Value</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="app.exportCSV('assets')" class="px-3 py-1.5 bg-white text-[10px] font-bold text-slate-600 rounded-lg hover:bg-slate-50 transition-all border border-slate-200 shadow-sm flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">download</span> Export Ledger
                    </button>
                </div>
            </header>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="px-8 py-5 border-b border-slate-50 bg-slate-50/20 flex justify-between items-center">
                    <h3 class="text-xs font-black uppercase tracking-[.25em] text-slate-900 font-label">Capital Asset Register</h3>
                    <div class="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                        Total Assets: ${db.assets.length}
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100">Asset</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100">Date Acquired</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-right">Cost Basis</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-right">Accum. Dep.</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-right">Net Book Value</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${db.assets.map(asset => {
                                const nbv = asset.amount - asset.depreciation;
                                return `
                                <tr class="hover:bg-slate-50/50 transition-all group">
                                    <td class="px-8 py-5">
                                        <div class="flex items-center gap-4">
                                            <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                                                <span class="material-symbols-outlined">receipt_long</span>
                                            </div>
                                            <div>
                                                <p class="text-sm font-black text-slate-900">${asset.name}</p>
                                                <p class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">${asset.id} / ${asset.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-8 py-5 text-xs font-bold text-slate-600">${asset.purchaseDate}</td>
                                    <td class="px-8 py-5 text-right text-sm font-black text-slate-900 tabular-nums">₹${asset.amount.toLocaleString()}</td>
                                    <td class="px-8 py-5 text-right text-sm font-black text-rose-500 tabular-nums">-₹${asset.depreciation.toLocaleString()}</td>
                                    <td class="px-8 py-5 text-right text-sm font-black text-emerald-600 tabular-nums">₹${nbv.toLocaleString()}</td>
                                </tr>
                                `
                            }).join('')}
                        </tbody>
                        <tfoot class="bg-slate-50">
                            <tr class="border-t border-slate-200">
                                <td colspan="2" class="px-8 py-4 text-xs font-black text-slate-900 uppercase tracking-widest text-right">Portfolio Totals:</td>
                                <td class="px-8 py-4 text-right text-sm font-black text-slate-900 tabular-nums">₹${db.assets.reduce((s, a) => s + a.amount, 0).toLocaleString()}</td>
                                <td class="px-8 py-4 text-right text-sm font-black text-rose-500 tabular-nums">-₹${db.assets.reduce((s, a) => s + a.depreciation, 0).toLocaleString()}</td>
                                <td class="px-8 py-4 text-right text-sm font-black text-emerald-600 tabular-nums">₹${db.assets.reduce((s, a) => s + (a.amount - a.depreciation), 0).toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;
}
