import { db } from '../mock/db.js';

export function renderAssetRegistry() {
    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header class="flex items-end justify-between">
                <div>
                    <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Master Asset Registry</h2>
                    <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">Institutional Inventory & Condition Monitoring</p>
                </div>
                <div class="flex gap-2">
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input type="text" placeholder="Filter by ID or Name..." class="bg-white border border-slate-200 rounded-xl px-4 py-2 pl-9 text-xs focus:border-accent outline-none w-64 shadow-sm" />
                    </div>
                    <button class="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-xl hover:bg-slate-800 transition-all uppercase tracking-widest shadow-lg shadow-slate-900/10 flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">add</span> Add New Asset
                    </button>
                </div>
            </header>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="px-8 py-5 border-b border-slate-50 bg-slate-50/20 flex gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[.2em]">
                    <span class="text-slate-900 border-b-2 border-accent pb-5 -mb-5 cursor-pointer">All Assets</span>
                    <span class="hover:text-slate-900 cursor-pointer transition-all">Active</span>
                    <span class="hover:text-slate-900 cursor-pointer transition-all">In Maintenance</span>
                    <span class="hover:text-slate-900 cursor-pointer transition-all">Stored</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100">Identity</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100">Regional Deployment</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100">Classification</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100">Condition Index</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100">Current Status</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-right">Valuation</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${db.assets.map(asset => `
                                <tr class="hover:bg-slate-50/50 transition-all cursor-pointer group">
                                    <td class="px-8 py-5">
                                        <div class="flex items-center gap-4">
                                            <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                                                <span class="material-symbols-outlined">inventory_2</span>
                                            </div>
                                            <div>
                                                <p class="text-sm font-black text-slate-900">${asset.name}</p>
                                                <p class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">ID: ${asset.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-8 py-5 text-xs font-bold text-slate-600">${asset.location}</td>
                                    <td class="px-8 py-5">
                                        <span class="text-[10px] font-black text-slate-900 uppercase bg-slate-100 px-2 py-0.5 rounded">${asset.category}</span>
                                    </td>
                                    <td class="px-8 py-5">
                                        <div class="w-24 bg-slate-100 h-1 rounded-full overflow-hidden mb-1.5">
                                            <div class="h-full ${parseFloat(asset.health) > 80 ? 'bg-emerald-500' : 'bg-rose-500'}" style="width: ${asset.health}"></div>
                                        </div>
                                        <span class="text-[9px] font-black text-slate-400 uppercase">${asset.health} HEALTH index</span>
                                    </td>
                                    <td class="px-8 py-5">
                                        <span class="px-3 py-1 ${asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : asset.status === 'Maintenance' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-100 text-slate-600 border-slate-200'} text-[10px] font-black rounded-full uppercase border">
                                            ${asset.status}
                                        </span>
                                    </td>
                                    <td class="px-8 py-5 text-right text-sm font-black text-slate-900 tabular-nums">₹${asset.amount.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}
