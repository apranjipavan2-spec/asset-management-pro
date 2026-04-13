import { db } from '../mock/db.js';

export function renderDepreciationPage() {
    return `
        <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 font-sans">
            <header class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl text-slate-900 font-black tracking-tightest uppercase">Depreciation Schedules</h2>
                    <p class="text-slate-400 text-[10px] font-black tracking-[.2em] uppercase mt-1">SLM Value Reduction Tracking</p>
                </div>
                <button onclick="app.exportCSV('depreciation')" class="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[.2em] rounded-xl hover:bg-accent transition-all flex items-center gap-2 group shadow-lg shadow-slate-900/10">
                    <span class="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">download_for_offline</span>
                    Export Schedule
                </button>
            </header>

            <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div class="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <h3 class="text-[10px] font-black uppercase tracking-[.25em] text-slate-900 font-headline">Valuation Schedules</h3>
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">Method: Straight-Line (SLM)</span>
                </div>

                <div class="scrollable-table-container">
                    <table class="dense-table">
                        <thead class="sticky-header">
                            <tr>
                                <th>Asset Identity</th>
                                <th class="text-center">Method</th>
                                <th class="text-right">Cost Basis</th>
                                <th class="text-right">YTD Expense</th>
                                <th class="text-right">Accumulated</th>
                                <th class="text-right">Net Book Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${db.assets.map(asset => {
                                const annualDep = Math.round(asset.depreciation * 0.2); 
                                const nbv = asset.amount - asset.depreciation;
                                return `
                                <tr onclick="app.showAssetModal('${asset.id}')">
                                    <td>
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                                <span class="material-symbols-outlined text-sm">trending_down</span>
                                            </div>
                                            <div>
                                                <p class="font-black text-slate-900">${asset.name}</p>
                                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">${asset.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="text-center"><span class="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">SLM 10Y</span></td>
                                    <td class="text-right font-bold text-slate-400 text-tabular">₹${asset.amount.toLocaleString()}</td>
                                    <td class="text-right font-black text-amber-600 text-tabular">₹${annualDep.toLocaleString()}</td>
                                    <td class="text-right font-black text-rose-500 text-tabular">₹${asset.depreciation.toLocaleString()}</td>
                                    <td class="text-right font-black text-slate-900 text-tabular">₹${nbv.toLocaleString()}</td>
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


