import { db } from '../mock/db.js';

export function renderAssetsLedger() {
    return `
        <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 font-sans">
            <header class="flex items-center justify-between">
                <div>
                    <h2 class="text-2xl text-slate-900 font-black tracking-tightest uppercase">Fixed Assets Ledger</h2>
                    <p class="text-slate-400 text-[10px] font-black tracking-[.2em] uppercase mt-1">Capital Asset Inventory & Book Value</p>
                </div>
                <button onclick="app.exportCSV('assets')" class="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[.2em] rounded-xl hover:bg-accent transition-all flex items-center gap-2 group shadow-lg shadow-slate-900/10">
                    <span class="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">download_for_offline</span>
                    Export Ledger
                </button>
            </header>

            <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div class="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <h3 class="text-[10px] font-black uppercase tracking-[.25em] text-slate-900 font-headline">Capital Asset Register</h3>
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-slate-200">Total Records: ${db.assets.length}</span>
                </div>

                <div class="scrollable-table-container">
                    <table class="dense-table">
                        <thead class="sticky-header">
                            <tr>
                                <th>Asset Identity</th>
                                <th>Category</th>
                                <th>Location</th>
                                <th>Funding Source</th>
                                <th class="text-right">Acquisition</th>
                                <th class="text-right">Net Value</th>
                                <th class="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${db.assets.map(asset => {
                                const nbv = asset.amount - asset.depreciation;
                                const isGrant = asset.fundingSource !== "General Fund";
                                return `
                                <tr onclick="app.showAssetModal('${asset.id}')">
                                    <td>
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                                <span class="material-symbols-outlined text-sm">receipt_long</span>
                                            </div>
                                            <div>
                                                <p class="font-black text-slate-900">${asset.name}</p>
                                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">${asset.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span class="font-bold text-slate-600">${asset.category}</span></td>
                                    <td><span class="font-bold text-slate-500">${asset.location}</span></td>
                                    <td>
                                        <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase border ${isGrant ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}">
                                            ${asset.fundingSource}
                                        </span>
                                    </td>
                                    <td class="text-right font-black text-slate-900 text-tabular">₹${asset.amount.toLocaleString()}</td>
                                    <td class="text-right font-black text-emerald-600 text-tabular">₹${nbv.toLocaleString()}</td>
                                    <td class="text-center">
                                        <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${asset.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}">
                                            ${asset.status}
                                        </span>
                                    </td>
                                </tr>
                                `
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Portfolio Totals -->
            <div class="bg-slate-900 rounded-2xl p-6 flex justify-between items-center text-white shadow-xl shadow-slate-900/20">
                <div class="flex items-center gap-6">
                    <div>
                        <p class="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Total Cost Basis</p>
                        <p class="text-sm font-black text-tabular">₹${db.assets.reduce((s, a) => s + a.amount, 0).toLocaleString()}</p>
                    </div>
                    <div class="w-px h-8 bg-white/10"></div>
                    <div>
                        <p class="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-1">Grant Contribution</p>
                        <p class="text-sm font-black text-tabular">₹${db.assets.reduce((s, a) => s + (a.fundingSource !== 'General Fund' ? a.fundingAmount : 0), 0).toLocaleString()}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Total Net Book Value</p>
                    <p class="text-xl font-black text-tabular text-emerald-500">₹${db.assets.reduce((s, a) => s + (a.amount - a.depreciation), 0).toLocaleString()}</p>
                </div>
            </div>
        </div>
    `;
}


