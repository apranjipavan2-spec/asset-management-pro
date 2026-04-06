import { db } from '../mock/db.js';

export function renderMaintenanceHub() {
    const logs = db.maintenanceLogs;
    const pending = logs.filter(l => l.status === 'Pending');
    const inProgress = logs.filter(l => l.status === 'In Progress');
    const resolved = logs.filter(l => l.status === 'Resolved');

    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header class="flex items-end justify-between">
                <div>
                    <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Maintenance Control Hub</h2>
                    <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">Operational Readiness & Repair Tracking</p>
                </div>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-250px)]">
                <!-- Pending Column -->
                <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between px-2">
                        <h3 class="text-[10px] font-black uppercase tracking-[.25em] text-slate-400">Incoming Tasks</h3>
                        <span class="bg-slate-200 text-slate-600 text-[9px] px-2 py-0.5 rounded font-black">${pending.length}</span>
                    </div>
                    <div class="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4 overflow-y-auto">
                        ${pending.map(log => renderTicket(log, 'border-amber-500')).join('')}
                    </div>
                </div>

                <!-- In Progress Column -->
                <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between px-2">
                        <h3 class="text-[10px] font-black uppercase tracking-[.25em] text-slate-400">Active Service</h3>
                        <span class="bg-blue-500 text-white text-[9px] px-2 py-0.5 rounded font-black">${inProgress.length}</span>
                    </div>
                    <div class="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4 overflow-y-auto">
                        ${inProgress.map(log => renderTicket(log, 'border-blue-500')).join('')}
                    </div>
                </div>

                <!-- Resolved Column -->
                <div class="flex flex-col gap-4">
                    <div class="flex items-center justify-between px-2">
                        <h3 class="text-[10px] font-black uppercase tracking-[.25em] text-slate-400">Completed</h3>
                        <span class="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded font-black">${resolved.length}</span>
                    </div>
                    <div class="flex-1 bg-slate-50/50 rounded-2xl border border-slate-100 p-4 space-y-4 overflow-y-auto opacity-70">
                        ${resolved.map(log => renderTicket(log, 'border-emerald-500')).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderTicket(log, borderColor) {
    const asset = db.assets.find(a => a.id === log.assetId);
    return `
        <div class="bg-white p-5 rounded-xl shadow-sm border-l-4 ${borderColor} space-y-4 group hover:shadow-md transition-all">
            <div class="flex justify-between items-start">
                <div>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">#${log.id}</p>
                    <h4 class="text-xs font-bold text-slate-900 mt-1">${asset ? asset.name : 'Unknown Asset'}</h4>
                </div>
                <span class="text-[10px] text-slate-400 font-bold">${new Date(log.date).toLocaleDateString()}</span>
            </div>
            
            <p class="text-[10px] text-slate-500 leading-relaxed italic bg-slate-50 p-3 rounded-lg border border-slate-100 line-clamp-2">"${log.description}"</p>
            
            <div class="flex items-center justify-between pt-2">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">${log.reporter}</span>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    ${log.status === 'Pending' ? `
                        <button onclick="updateMaintStatus('${log.id}', 'In Progress')" class="p-1 px-2 bg-blue-50 text-blue-600 text-[9px] font-bold rounded uppercase border border-blue-100 hover:bg-blue-500 hover:text-white">Start</button>
                    ` : ''}
                    ${log.status === 'In Progress' ? `
                        <button onclick="updateMaintStatus('${log.id}', 'Resolved')" class="p-1 px-2 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded uppercase border border-emerald-100 hover:bg-emerald-500 hover:text-white">Resolve</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Global actions
window.updateMaintStatus = (id, status) => {
    const log = db.maintenanceLogs.find(l => l.id === id);
    if (log) {
        log.status = status;
        if (status === 'Resolved') {
            const asset = db.assets.find(a => a.id === log.assetId);
            if (asset) asset.status = 'Active';
        }
        db.save();
        window.app.render();
    }
};
