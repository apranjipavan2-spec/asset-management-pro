import { db } from '../mock/db.js';

export function renderNotificationsPage() {
    const logs = [...(db.auditLogs || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return `
        <div class="w-full space-y-4">
            <header class="flex justify-between items-end">
                <div>
                    <h2 class="page-title">System Activity Matrix</h2>
                    <p class="page-subtitle">Real-time Institutional Audit Trail</p>
                </div>
                <div class="flex gap-4">
                    <div class="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                        <span class="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                        <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Live Monitoring Active</span>
                    </div>
                </div>
            </header>

            <div class="card overflow-hidden">
                <div class="overflow-x-auto scroll-container">
                    <table class="dense-table">
                        <thead class="sticky-header">
                            <tr class="bg-slate-50/50 border-b border-slate-100">
                                <th>Timeline</th>
                                <th>Classification</th>
                                <th>Narrative & Context</th>
                                <th class="text-right">Protocol</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            ${logs.map(log => `
                                <tr class="hover:bg-slate-50 transition-colors group">
                                    <td class="whitespace-nowrap">
                                        <p class="text-xs font-black text-slate-900 tabular-nums">${log.date.split(' ')[1]}</p>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">${log.date.split(' ')[0]}</p>
                                    </td>
                                    <td class="whitespace-nowrap">
                                        <span class="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded uppercase tracking-tighter shadow-sm">${log.action}</span>
                                    </td>
                                    <td>
                                        <p class="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">${log.details}</p>
                                    </td>
                                    <td class="whitespace-nowrap text-right">
                                        <button onclick="app.handleRevert('${log.id}', '${log.action}')" class="btn-warn text-[9px] py-1.5 flex items-center gap-1.5">
                                            <span class="material-symbols-outlined text-xs">history</span>
                                            Rollback
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}
