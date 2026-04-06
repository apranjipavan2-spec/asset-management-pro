import { db } from '../mock/db.js';

export function renderDepreciationPage() {
    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header class="flex items-end justify-between">
                <div>
                    <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Depreciation Schedules</h2>
                    <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">SLM Value Reduction Tracking</p>
                </div>
            </header>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="px-8 py-5 border-b border-slate-50 bg-slate-50/20 flex justify-between items-center">
                    <h3 class="text-xs font-black uppercase tracking-[.25em] text-slate-900 font-label">Straight-Line Method (SLM) Schedules</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100">Asset Identity</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-center">Method</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-right">Dep. Expense (YTD)</th>
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-right">Accum. Depreciation</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${db.assets.map(asset => {
                                // Simplified annual depreciation mock for visual purposes
                                const annualDep = Math.round(asset.depreciation * 0.2); 
                                return `
                                <tr class="hover:bg-slate-50/50 transition-all group">
                                    <td class="px-8 py-5">
                                        <p class="text-sm font-black text-slate-900">${asset.name}</p>
                                        <p class="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">${asset.id}</p>
                                    </td>
                                    <td class="px-8 py-5 text-center">
                                        <span class="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">SLM (10 YR)</span>
                                    </td>
                                    <td class="px-8 py-5 text-right text-sm font-black text-amber-600 tabular-nums">₹${annualDep.toLocaleString()}</td>
                                    <td class="px-8 py-5 text-right text-sm font-black text-rose-500 tabular-nums">₹${asset.depreciation.toLocaleString()}</td>
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
