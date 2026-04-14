import { db } from '../mock/db.js';

export function renderTransferPage() {
    const transfers = db.transfers;

    return `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-200 h-[calc(100vh-128px)] flex flex-col min-h-0 gap-6">
            <header class="flex items-end justify-between shrink-0">
                <div>
                    <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Asset Transfers</h2>
                    <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">Execute Relocations & Reassignments</p>
                </div>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
                <!-- Transfer Form -->
                <div class="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
                    <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                        <span class="material-symbols-outlined text-accent">swap_horiz</span>
                        Initiate Transfer
                    </h3>
                    
                    <div class="space-y-6 flex-1">
                        <div class="space-y-3">
                            <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Select Asset</label>
                            <select id="transfer-asset" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all">
                                <option value="" disabled selected>-- Select an Asset --</option>
                                ${db.assets.map(a => `<option value="${a.id}">${a.name} (#${a.id}) - Current: ${a.assignedTo} / ${a.location}</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-3">
                                <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">New Assignee</label>
                                <input type="text" id="transfer-assignee" placeholder="e.g. Finance Dept or John Doe" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all" />
                            </div>
                            <div class="space-y-3">
                                <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">New Location</label>
                                <input type="text" id="transfer-location" placeholder="e.g. HQ Wing A" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all" />
                            </div>
                        </div>
                        <div class="p-4 bg-slate-50 rounded-xl flex gap-3 items-start border border-slate-200">
                            <span class="material-symbols-outlined text-slate-400">info</span>
                            <p class="text-xs text-slate-500 leading-relaxed italic">Leave Assignee or Location blank if it is not changing. This action immediately updates the Master Registry.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-end pt-6">
                        <button onclick="executeTransfer()" class="px-8 py-3 bg-accent text-white text-xs font-bold rounded-xl shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all uppercase tracking-widest">Execute Relocation</button>
                    </div>
                </div>

                <!-- Recent Assignments -->
                 <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
                    <div class="px-8 py-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                        <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Recent Relocations (Log)</h3>
                    </div>
                    <div class="overflow-y-auto flex-1 p-6 space-y-4 min-h-0">
                        ${transfers.length > 0 ? transfers.map(t => {
                            const asset = db.assets.find(a => a.id === t.assetId) || { name: 'Unknown Asset', category: 'N/A' };
                            return `
                            <div onclick="window.openTransferModal('${t.id}')" class="cursor-pointer p-4 border border-slate-100 rounded-xl flex gap-4 items-center hover:bg-slate-50 transition-all hover:border-slate-300 hover:shadow-sm">
                                 <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                    <span class="material-symbols-outlined text-sm">swap_horiz</span>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-xs font-bold text-slate-900 truncate">${asset.name} <span class="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">#${t.assetId}</span></p>
                                    <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1.5 text-[10px] text-slate-500">
                                         <span class="truncate">${t.fromAssignee} <span class="text-slate-400">(${t.fromLocation})</span></span>
                                         <span class="material-symbols-outlined text-[10px] text-accent hidden sm:inline-block">arrow_right_alt</span>
                                         <span class="font-bold text-slate-700 truncate">${t.toAssignee} <span class="text-slate-400 font-normal">(${t.toLocation})</span></span>
                                    </div>
                                </div>
                                <div class="ml-auto text-[9px] font-black text-slate-400 uppercase tracking-widest text-right shrink-0">
                                    ${new Date(t.date).toLocaleDateString()}
                                </div>
                            </div>
                        `}).join('') : '<p class="text-[10px] text-slate-400 uppercase font-bold tracking-widest italic pt-4">No transfer history recorded.</p>'}
                    </div>
                 </div>
            </div>
        </div>

        <!-- Transfer Detail Modal -->
        <div id="transfer-detail-modal" class="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300">
             <div id="transfer-detail-content" class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl scale-95 transition-transform duration-300 flex flex-col overflow-hidden mx-4">
                 <!-- Injected dynamically via JS -->
             </div>
        </div>
    `;
}

window.executeTransfer = () => {
    const assetId = document.getElementById('transfer-asset').value;
    const assignee = document.getElementById('transfer-assignee').value;
    const location = document.getElementById('transfer-location').value;

    if (!assetId) {
        alert("Please select an asset to transfer.");
        return;
    }
    if (!assignee && !location) {
        alert("Please provide either a new assignee or a new location.");
        return;
    }

    db.transferAsset(assetId, assignee, location);
    
    // Clear inputs
    document.getElementById('transfer-assignee').value = '';
    document.getElementById('transfer-location').value = '';
    document.getElementById('transfer-asset').selectedIndex = 0;

    window.app.renderContent('transfer'); // Refresh just the transfer view so we fetch updated logs natively
};

window.openTransferModal = (txId) => {
    const tx = db.transfers.find(t => t.id === txId);
    if (!tx) return;
    const asset = db.assets.find(a => a.id === tx.assetId) || { name: 'Unknown', category: 'N/A' };
    
    // Check if it's an initial deployment (Origin -> First Assignee)
    const isInitial = tx.fromAssignee === "Central Depot";
    
    const content = `
        <div class="px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center relative shrink-0">
            <div>
                 <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight">Custody Transfer Record</h3>
                 <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Transaction: #${tx.id}</p>
            </div>
            <button onclick="window.closeTransferModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
        
        <div class="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
            <!-- Asset Brief -->
            <div class="flex justify-between items-start pb-6 border-b border-slate-100">
               <div>
                   <p class="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Target Asset</p>
                   <p class="text-lg font-bold text-slate-900">${asset.name}</p>
                   <p class="text-xs font-mono text-slate-500 mt-0.5">${tx.assetId}</p>
               </div>
               <div class="text-right">
                   <p class="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Classification</p>
                   <span class="inline-block px-3 py-1 font-bold text-[10px] uppercase tracking-widest rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        ${asset.category}
                   </span>
               </div>
            </div>

            <!-- Transfer Map Data Vis-->
            <div class="relative py-4">
                <!-- Line connecting nodes -->
                <div class="absolute top-[4.5rem] left-[15%] right-[15%] hidden sm:block h-0.5 bg-slate-100 -z-10"></div>

                <div class="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-8 sm:gap-0">
                    <!-- From -->
                    <div class="w-full sm:w-1/2 sm:pr-4 text-center">
                        <div class="mx-auto w-12 h-12 bg-slate-50 border-2 border-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-3 shadow-sm ring-4 ring-white">
                            <span class="material-symbols-outlined">${isInitial ? 'warehouse' : 'person_remove'}</span>
                        </div>
                        <p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Relinquished By</p>
                        <p class="text-sm font-bold text-slate-900 mt-1">${tx.fromAssignee}</p>
                        <p class="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-0.5">${tx.fromDesignation}</p>
                        <span class="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold mt-2">${tx.fromLocation}</span>
                    </div>
                    
                    <!-- Middle Arrow -->
                    <div class="w-10 flex flex-col items-center justify-center pt-1 sm:pt-4">
                         <span class="material-symbols-outlined text-accent text-3xl rotate-90 sm:rotate-0">open_in_new</span>
                    </div>

                    <!-- To -->
                    <div class="w-full sm:w-1/2 sm:pl-4 text-center">
                        <div class="mx-auto w-12 h-12 bg-emerald-50 border-2 border-emerald-200 text-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-sm ring-4 ring-white">
                            <span class="material-symbols-outlined">person_add</span>
                        </div>
                        <p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Assigned To</p>
                        <p class="text-sm font-bold text-slate-900 mt-1">${tx.toAssignee}</p>
                        <p class="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-0.5">${tx.toDesignation}</p>
                        <span class="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded text-[9px] font-bold mt-2">${tx.toLocation}</span>
                    </div>
                </div>
            </div>

            <!-- Footer Details -->
            <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4">
                 <div class="mb-3 sm:mb-0">
                      <p class="text-[9px] uppercase font-bold tracking-widest text-slate-400">Execution Date & Time</p>
                      <p class="text-xs font-bold text-slate-900 mt-1">${new Date(tx.date).toLocaleString()}</p>
                 </div>
                 <div class="sm:text-right">
                      <p class="text-[9px] uppercase font-bold tracking-widest text-slate-400">Authorization Logic</p>
                      <p class="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1 sm:justify-end">
                           <span class="material-symbols-outlined text-emerald-500 text-[14px]">verified_user</span> System Verified
                      </p>
                 </div>
            </div>
        </div>

        <div class="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
             <button onclick="window.closeTransferModal()" class="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-widest shadow-sm">Acknowledge</button>
        </div>
    `;

    const container = document.getElementById('transfer-detail-content');
    if (!container) return;
    container.innerHTML = content;
    
    const modal = document.getElementById('transfer-detail-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    void modal.offsetWidth; // Force Reflow
    modal.classList.remove('opacity-0');
    container.classList.remove('scale-95');
};

window.closeTransferModal = () => {
    const modal = document.getElementById('transfer-detail-modal');
    const container = document.getElementById('transfer-detail-content');
    
    modal.classList.add('opacity-0');
    container.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};
