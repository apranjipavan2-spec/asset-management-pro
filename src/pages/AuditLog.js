import { db } from '../mock/db.js';

export function renderAuditLog() {
    const logs = db.auditLogs || [];
    
    return `
        <div class="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <!-- Header Section -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 class="page-title">System Activity Matrix</h2>
                    <p class="page-subtitle">Institutional Audit Trail & Governance Log</p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest">Live Monitoring Active</span>
                    </div>
                    <button onclick="window.exportAuditLogs()" class="btn-primary">
                        <span class="material-symbols-outlined text-sm">export_notes</span>
                        Activity Report
                    </button>
                    <button onclick="app.render()" class="px-3 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm group">
                        <span class="material-symbols-outlined text-xl group-hover:rotate-180 transition-transform">refresh</span>
                    </button>
                </div>
            </div>

            <!-- Stats Overview -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="stat-tile relative overflow-hidden group">
                    <div class="stat-strip bg-slate-900"></div>
                    <p class="stat-label ml-1">Total Operations</p>
                    <h3 class="stat-value ml-1">${logs.length}</h3>
                    <span class="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-slate-900/5 group-hover:scale-110 transition-transform">history</span>
                </div>
                <div class="stat-tile relative overflow-hidden group">
                    <div class="stat-strip bg-indigo-500"></div>
                    <p class="stat-label ml-1 text-indigo-400">Admin Mutations</p>
                    <h3 class="stat-value ml-1 text-indigo-600">${logs.filter(l => l.action.includes('Asset') || l.action.includes('Grant')).length}</h3>
                    <span class="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-indigo-600/5 group-hover:scale-110 transition-transform">shield_person</span>
                </div>
                <div class="stat-tile relative overflow-hidden group">
                    <div class="stat-strip bg-emerald-500"></div>
                    <p class="stat-label ml-1 text-emerald-400">Security Health</p>
                    <h3 class="stat-value ml-1 text-emerald-600 uppercase tracking-tight">OPTIMAL</h3>
                    <span class="material-symbols-outlined absolute -right-4 -bottom-4 text-8xl text-emerald-600/5 group-hover:scale-110 transition-transform">verified_user</span>
                </div>
            </div>

            <!-- Activity Feed -->
            <div class="card-accent min-h-[400px] flex flex-col">
                <div class="card-header">
                    <h3 class="card-title">Chronological Event Stream</h3>
                    <input type="text" placeholder="Search logs..." oninput="filterAuditLogs(this.value)" class="form-input w-48" />
                </div>
                
                <div class="p-4 overflow-auto max-h-[760px] scroll-container flex-1">
                    ${logs.length === 0 ? `
                        <div class="flex flex-col items-center justify-center py-20 opacity-40">
                            <span class="material-symbols-outlined text-6xl mb-4">analytics</span>
                            <p class="text-sm font-black uppercase tracking-widest">No activity recorded yet</p>
                        </div>
                    ` : `
                        <div class="space-y-4">
                                ${logs.map(log => {
                                    const isCritical = log.level === 'SECURITY' || log.action.includes('Delete') || log.action.includes('Reject');
                                    const isCreate = log.action.includes('Add') || log.action.includes('Register');
                                    const isAuth = log.action.includes('Authorize') || log.action.includes('Approval');
                                    
                                    let icon = 'event_note';
                                    let colorClass = 'text-slate-400 bg-slate-100';
                                    if (log.level === 'SECURITY') { icon = 'policy'; colorClass = 'text-orange-600 bg-orange-50 ring-orange-200 border-orange-200 border'; }
                                    else if (isCritical) { icon = 'warning'; colorClass = 'text-rose-500 bg-rose-50 ring-rose-100'; }
                                    else if (isCreate) { icon = 'add_circle'; colorClass = 'text-emerald-500 bg-emerald-50 ring-emerald-100'; }
                                    else if (isAuth) { icon = 'verified'; colorClass = 'text-indigo-500 bg-indigo-50 ring-indigo-100'; }

                                    return `
                                        <div class="audit-row group flex items-start gap-6 p-5 rounded-2xl hover:bg-slate-50/80 transition-all border border-transparent hover:border-slate-100" data-content="${log.userName} ${log.action} ${log.details}">
                                            <div class="flex flex-col items-center gap-2 pt-1">
                                                <span class="text-[9px] font-black text-slate-400 tabular-nums uppercase">${log.timestamp}</span>
                                                <div class="w-px h-10 bg-slate-100 group-last:hidden"></div>
                                            </div>
                                            
                                            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ${colorClass}">
                                                <span class="material-symbols-outlined text-xl">${icon}</span>
                                            </div>
                                            
                                            <div class="flex-1 min-w-0">
                                                <div class="flex items-center justify-between gap-4">
                                                    <h4 class="text-sm font-black text-slate-900 font-headline uppercase tracking-tight truncate">
                                                        ${log.action}
                                                        ${log.level && log.level !== 'INFO' ? `<span class="ml-2 px-1.5 py-0.5 bg-slate-900 text-white text-[8px] rounded uppercase tracking-widest">${log.level}</span>` : ''}
                                                    </h4>
                                                    <span class="text-[10px] font-black text-slate-300 tabular-nums">${log.date}</span>
                                                </div>
                                                <p class="text-xs text-slate-500 mt-1 font-medium leading-relaxed">${log.details}</p>
                                                
                                                <div class="flex items-center justify-between mt-3">
                                                    <div class="flex items-center gap-2">
                                                        <div class="px-2 py-1 bg-slate-900 text-white rounded-lg flex items-center gap-1.5 shadow-sm">
                                                            <div class="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                                            <span class="text-[9px] font-black uppercase tracking-widest">${log.userName}</span>
                                                        </div>
                                                        <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">ID: ${log.userId}</span>
                                                    </div>
                                                    ${log.snapshot ? `
                                                        <button onclick="app.handleRevert('${log.id}', '${log.action}')" class="px-3 py-1 bg-rose-50 text-rose-600 text-[9px] font-black rounded-lg border border-rose-100 hover:bg-rose-600 hover:text-white transition-all uppercase tracking-widest flex items-center gap-1.5">
                                                            <span class="material-symbols-outlined text-[14px]">history</span>
                                                            Revert Action
                                                        </button>
                                                    ` : ''}
                                                    ${log.action.startsWith('REVERTED') ? `
                                                        <div class="px-3 py-1 bg-slate-100 text-slate-400 text-[9px] font-black rounded-lg border border-slate-200 uppercase tracking-widest flex items-center gap-1.5 cursor-not-allowed">
                                                            <span class="material-symbols-outlined text-[14px]">done_all</span>
                                                            Action Reverted
                                                        </div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

window.filterAuditLogs = (val) => {
    const query = val.toLowerCase();
    document.querySelectorAll('.audit-row').forEach(row => {
        const content = row.dataset.content.toLowerCase();
        row.style.display = content.includes(query) ? 'flex' : 'none';
    });
};

window.exportAuditLogs = () => {
    const logs = db.auditLogs || [];
    if (logs.length === 0) return alert('Audit Matrix is currently empty.');

    const headers = ["Date", "Timestamp", "Level", "Identity", "Action", "Description"];
    const rows = logs.map(l => [
        `"${l.date}"`,
        `"${l.timestamp}"`,
        `"${l.level || 'INFO'}"`,
        `"${l.userName}"`,
        `"${l.action}"`,
        `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Institutional_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
