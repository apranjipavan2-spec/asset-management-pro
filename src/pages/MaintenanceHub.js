import { db } from '../mock/db.js';

export function renderMaintenanceHub() {
    let needsSave = false;
    db.assets.forEach(asset => {
        if (asset.status === 'Maintenance') {
            const hasActiveTicket = db.maintenanceLogs.some(l => l.assetId === asset.id && l.status !== 'Resolved');
            if (!hasActiveTicket) {
                db.maintenanceLogs.push({
                    id: 'M-' + Math.floor(Math.random() * 100000),
                    assetId: asset.id,
                    description: `Automated Request: Routine maintenance required for ${asset.name}.`,
                    reporter: 'System Audit',
                    date: new Date().toISOString(),
                    status: 'Pending'
                });
                needsSave = true;
            }
        }
    });
    if (needsSave) db.save();

    const logs = db.maintenanceLogs;
    const pending = logs.filter(l => l.status === 'Pending');
    const inProgress = logs.filter(l => l.status === 'In Progress');
    const resolved = logs.filter(l => l.status === 'Resolved');

    return `
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-128px)] flex flex-col min-h-0 gap-6">
            <header class="shrink-0">
                <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Maintenance Control Hub</h2>
                <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">Operational Readiness & Repair Tracking</p>
            </header>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
                
                <!-- Tab Headers -->
                <div class="flex p-2 bg-slate-50 border-b border-slate-100 shrink-0 gap-2">
                    <button id="btn-pending" onclick="window.switchMaintTab('pending')" class="maint-tab-btn flex-1 py-3 px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all bg-white shadow-sm ring-1 ring-slate-200 text-slate-900 flex items-center justify-center gap-2">
                        Incoming Tasks
                        <span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-bold">${pending.length}</span>
                    </button>
                    <button id="btn-progress" onclick="window.switchMaintTab('progress')" class="maint-tab-btn flex-1 py-3 px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all text-slate-500 hover:bg-slate-100/50 flex items-center justify-center gap-2">
                        Active Service
                        <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-bold">${inProgress.length}</span>
                    </button>
                    <button id="btn-resolved" onclick="window.switchMaintTab('resolved')" class="maint-tab-btn flex-1 py-3 px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all text-slate-500 hover:bg-slate-100/50 flex items-center justify-center gap-2">
                        Completed Hub
                        <span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-bold">${resolved.length}</span>
                    </button>
                    <button id="btn-history" onclick="window.switchMaintTab('history')" class="maint-tab-btn flex-1 py-3 px-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all text-slate-500 hover:bg-slate-100/50 flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-sm">history</span> Service History
                    </button>
                </div>

                <!-- Tab Contents -->
                <div class="flex-1 overflow-y-auto p-6 bg-slate-50 relative min-h-0">
                    
                    <div id="tab-pending" class="maint-tab-content space-y-3">
                        ${pending.length === 0 ? renderEmptyState('No pending tasks') : pending.map(log => renderRow(log)).join('')}
                    </div>

                    <div id="tab-progress" class="maint-tab-content space-y-3 hidden">
                        ${inProgress.length === 0 ? renderEmptyState('No active services running') : inProgress.map(log => renderRow(log)).join('')}
                    </div>

                    <div id="tab-resolved" class="maint-tab-content space-y-3 hidden">
                        ${resolved.length === 0 ? renderEmptyState('No completed tasks') : resolved.map(log => renderRow(log)).join('')}
                    </div>

                    <div id="tab-history" class="maint-tab-content space-y-3 hidden">
                        ${logs.length === 0 ? renderEmptyState('No historical records') : logs.map(log => renderRow(log)).join('')}
                    </div>

                </div>
            </div>
            
            <!-- Hidden Complete Details Modal -->
            <div id="maint-detail-modal" class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300">
                 <div id="maint-detail-content" class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl scale-95 transition-transform duration-300 flex flex-col overflow-hidden">
                     <!-- Injected dynamically via JS -->
                 </div>
            </div>

        </div>
    `;
}

function renderEmptyState(msg) {
    return `
        <div class="flex flex-col items-center justify-center h-48 text-slate-400 text-center">
            <span class="material-symbols-outlined text-4xl mb-3 opacity-50">task</span>
            <p class="text-xs uppercase tracking-widest font-bold">${msg}</p>
        </div>
    `;
}

function renderRow(log) {
    const asset = db.assets.find(a => a.id === log.assetId);
    let statusClass = 'border-l-4 ';
    let iconClass = 'text-slate-400';
    
    if (log.status === 'Pending') {
        statusClass += 'border-amber-400';
        iconClass = 'text-amber-500 bg-amber-50';
    } else if (log.status === 'In Progress') {
        statusClass += 'border-blue-500';
        iconClass = 'text-white bg-blue-500';
    } else {
        statusClass += 'border-emerald-500';
        iconClass = 'text-white bg-emerald-500';
    }
    
    return `
        <div onclick="window.openMaintModal('${log.id}')" class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group ${statusClass}">
             <div class="flex items-center gap-4">
                 <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold ${iconClass} shrink-0 transition-transform group-hover:scale-110">
                      <span class="material-symbols-outlined text-sm">${log.status === 'Resolved' ? 'done_all' : (log.status === 'In Progress' ? 'build' : 'flag')}</span>
                 </div>
                 <div>
                     <p class="font-bold text-sm text-slate-900 group-hover:text-accent transition-colors">${asset ? asset.name : 'Unknown Asset'}</p>
                     <div class="flex gap-2 mt-1">
                         <span class="text-[9px] uppercase font-black tracking-widest text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">TKT #${log.id}</span>
                         <span class="text-[9px] uppercase font-bold tracking-widest text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">${new Date(log.date).toLocaleDateString()}</span>
                         ${log.status === 'Resolved' ? `<span class="text-[9px] uppercase font-black tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Archived ReCord</span>` : ''}
                     </div>
                 </div>
             </div>
             
             <div class="mt-4 sm:mt-0 sm:text-right flex items-center sm:block gap-2">
                  <p class="text-[9px] font-black tracking-widest text-slate-400 uppercase">Reporter</p>
                  <p class="text-xs font-bold text-slate-900 mt-0.5">${log.reporter}</p>
             </div>
        </div>
    `;
}

// Global actions
window.switchMaintTab = (tabId) => {
    // Reset all tabs
    document.querySelectorAll('.maint-tab-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'shadow-sm', 'ring-1', 'ring-slate-200', 'text-slate-900');
        btn.classList.add('text-slate-500', 'hover:bg-slate-100/50');
    });
    // Activate clicked tab
    const activeBtn = document.getElementById('btn-' + tabId);
    activeBtn.classList.remove('text-slate-500', 'hover:bg-slate-100/50');
    activeBtn.classList.add('bg-white', 'shadow-sm', 'ring-1', 'ring-slate-200', 'text-slate-900');
    
    // Switch content body
    document.querySelectorAll('.maint-tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
};

window.openMaintModal = (logId) => {
    const log = db.maintenanceLogs.find(l => l.id === logId);
    if (!log) return;
    const asset = db.assets.find(a => a.id === log.assetId);

    const isPending = log.status === 'Pending';
    const isProgress = log.status === 'In Progress';

    // Retrieve Historical Context
    const assetTransfers = db.transfers.filter(t => t.assetId === log.assetId).sort((a,b) => new Date(b.date) - new Date(a.date));
    const previousMaint = db.maintenanceLogs.filter(l => l.assetId === log.assetId && l.id !== logId).sort((a,b) => new Date(b.date) - new Date(a.date));
    
    // Determine Current Custodian safely
    const currentCustodian = asset ? asset.assignedTo : (assetTransfers.length > 0 ? assetTransfers[0].toAssignee : 'Unassigned');

    const contentStr = `
        <div class="px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center relative shrink-0">
            <div>
                 <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight">Service Ticket Details</h3>
                 <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reference: #${log.id}</p>
            </div>
            <button onclick="window.closeMaintModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        
        <div class="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
            <!-- Core Context -->
            <div class="flex justify-between items-start">
               <div>
                   <p class="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Target Asset</p>
                   <p class="text-lg font-bold text-slate-900">${asset ? asset.name : 'Unknown'}</p>
                   <p class="text-xs font-mono text-slate-500 mt-0.5">${log.assetId}</p>
               </div>
               <div class="text-right flex flex-col items-end gap-2">
                   <div>
                       <p class="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">State Marker</p>
                       <span class="inline-block px-3 py-1 font-bold text-[10px] uppercase tracking-widest rounded-full ${isPending ? 'bg-amber-100 text-amber-700' : (isProgress ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}">
                            ${log.status}
                       </span>
                   </div>
                   <div class="text-right bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                       <p class="text-[8px] uppercase font-black tracking-widest text-slate-400">Current Custodian</p>
                       <p class="text-[11px] font-bold text-slate-900 mt-0.5">${currentCustodian}</p>
                   </div>
               </div>
            </div>

            <div class="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl relative">
                <span class="material-symbols-outlined text-amber-200 absolute right-4 top-4 text-4xl">flag</span>
                <p class="text-[10px] uppercase font-black tracking-widest text-amber-500 mb-2 relative z-10">Issue Description</p>
                <p class="text-sm font-medium text-slate-700 leading-relaxed relative z-10">${log.description}</p>
            </div>
            
            <div class="flex flex-col sm:flex-row justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                 <div>
                      <p class="text-[9px] uppercase font-bold tracking-widest text-slate-400">Reporter Identity</p>
                      <p class="text-xs font-bold text-slate-900 mt-1">${log.reporter}</p>
                 </div>
                 <div class="sm:text-right mt-3 sm:mt-0">
                      <p class="text-[9px] uppercase font-bold tracking-widest text-slate-400">Request Date</p>
                      <p class="text-xs font-bold text-slate-900 mt-1">${new Date(log.date).toLocaleString()}</p>
                 </div>
            </div>
            
            <!-- Historical Matrix -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                <!-- Maintenance History -->
                <div>
                     <h4 class="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                         <span class="material-symbols-outlined text-sm">history</span> Past Maintenance
                     </h4>
                     <div class="space-y-3">
                         ${previousMaint.length > 0 ? previousMaint.slice(0, 3).map(m => `
                             <div class="bg-white border text-left border-slate-200 p-3 rounded-xl shadow-sm relative overflow-hidden">
                                  <div class="absolute left-0 top-0 bottom-0 w-1 bg-slate-300"></div>
                                  <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">${new Date(m.date).toLocaleDateString()}</p>
                                  <p class="text-[10px] text-slate-700 font-bold mt-1 ml-1 truncate" title="${m.description}">${m.description}</p>
                                  <span class="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded ml-1 mt-2 inline-block uppercase font-bold">${m.status}</span>
                             </div>
                         `).join('') : `<p class="text-[10px] text-slate-400 italic font-bold">No previous maintenance records.</p>`}
                         ${previousMaint.length > 3 ? `<p class="text-[9px] text-slate-400 font-bold text-right py-2">+ ${previousMaint.length - 3} older records</p>` : ''}
                     </div>
                </div>

                <!-- Custody/Transfer Audit -->
                <div>
                     <h4 class="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                         <span class="material-symbols-outlined text-sm">swap_horiz</span> Custody Ledger
                     </h4>
                     <div class="border-l-2 border-slate-100 ml-2 space-y-4 relative">
                         ${assetTransfers.length > 0 ? assetTransfers.slice(0, 4).map((t, idx) => `
                             <div class="relative pl-6">
                                 <div class="absolute w-2 h-2 bg-accent rounded-full -left-[5px] top-1.5 ring-4 ring-white"></div>
                                 <p class="text-[10px] font-bold text-slate-900">${t.toAssignee}</p>
                                 <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">${t.toDesignation}</p>
                                 <p class="text-[8px] font-bold text-slate-400 uppercase">${new Date(t.date).toLocaleDateString()} &middot; ${t.toLocation}</p>
                             </div>
                         `).join('') : `<p class="text-[10px] text-slate-400 italic font-bold pl-4">No transfer history recorded.</p>`}
                     </div>
                </div>
            </div>
        </div>

        <div class="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
             <button onclick="window.closeMaintModal()" class="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-widest">Close</button>
             
             ${isPending ? `
                <button onclick="window.updateMaintStatus('${log.id}', 'In Progress')" class="px-5 py-2.5 rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors text-xs font-black uppercase tracking-widest flex items-center gap-2">
                   <span class="material-symbols-outlined text-sm">precision_manufacturing</span> Initiate Repairs
                </button>
             ` : ''}
             
             ${isProgress ? `
                <button onclick="window.updateMaintStatus('${log.id}', 'Resolved')" class="px-5 py-2.5 rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-colors text-xs font-black uppercase tracking-widest flex items-center gap-2">
                   <span class="material-symbols-outlined text-sm">verified</span> Mark Completed
                </button>
             ` : ''}
        </div>
    `;

    document.getElementById('maint-detail-content').innerHTML = contentStr;
    const modal = document.getElementById('maint-detail-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    void modal.offsetWidth; // Reflow for animation
    modal.classList.remove('opacity-0');
    document.getElementById('maint-detail-content').classList.remove('scale-95');
};

window.closeMaintModal = () => {
    const modal = document.getElementById('maint-detail-modal');
    modal.classList.add('opacity-0');
    document.getElementById('maint-detail-content').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.updateMaintStatus = (id, status) => {
    const log = db.maintenanceLogs.find(l => l.id === id);
    if (!log) return;
    
    // Update log state
    log.status = status;
    
    // If ticket is completed, flip the actual Asset back online
    if (status === 'Resolved') {
        const asset = db.assets.find(a => a.id === log.assetId);
        if (asset) {
            asset.status = 'Active';
            // Give it 100% health back!
            asset.health = '100.0%';
        }
    }
    
    db.save();
    window.closeMaintModal();
    
    // Wait briefly for modal exit animation before hard redrawing the layout
    setTimeout(() => {
        window.app.render();
        // Automatically switch view to the 'In Progress' or 'Resolved' tab they just moved it to
        if(status === 'In Progress') window.switchMaintTab('progress');
        if(status === 'Resolved') window.switchMaintTab('resolved');
    }, 300);
};
