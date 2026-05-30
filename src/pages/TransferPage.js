import { db } from '../mock/db.js';

// Generic filter helper used by all three transfer dropdowns.
window.filterTransferList = function(listId, query) {
    const q = String(query || '').toLowerCase();
    const options = document.querySelectorAll(`#${listId} .transfer-opt`);
    options.forEach(opt => {
        const text = opt.innerText.toLowerCase();
        opt.style.display = text.includes(q) ? '' : 'none';
    });
};
window.filterTransferAssets = (q) => window.filterTransferList('transfer-asset-menu', q);

// Close any open transfer dropdown menu when clicking outside.
document.addEventListener('click', (e) => {
    const menus = ['transfer-asset-menu', 'transfer-assignee-menu', 'transfer-location-menu'];
    for (const id of menus) {
        const menu = document.getElementById(id);
        if (!menu) continue;
        const wrapper = menu.closest('[data-dropdown-wrap]');
        if (wrapper && !wrapper.contains(e.target)) menu.classList.add('hidden');
    }
}, true);

window.pickTransferAssignee = function(name) {
    document.getElementById('transfer-assignee').value = name;
    document.getElementById('transfer-assignee-label').innerText = name || '-- Select Custodian --';
    document.getElementById('transfer-assignee-menu').classList.add('hidden');
};
window.pickTransferLocation = function(loc) {
    document.getElementById('transfer-location').value = loc;
    document.getElementById('transfer-location-label').innerText = loc || '-- Select Geography --';
    document.getElementById('transfer-location-menu').classList.add('hidden');
};
window.applyTransferCustomEntry = function(field) {
    const inputId = `transfer-${field}-custom-input`;
    const val = (document.getElementById(inputId)?.value || '').trim();
    if (!val) return;
    if (field === 'assignee') window.pickTransferAssignee(val);
    else if (field === 'location') window.pickTransferLocation(val);
};

export function renderTransferPage() {
    const user = window.app.user;
    const isElevated = ['superadmin', 'director', 'operations', 'manager'].includes(user.role);
    const transferableAssets = isElevated
        ? db.assets
        : db.assets.filter(a => a.assignedToId === user.empId || a.assignedTo === user.name);
    const transfers = db.transfers;

    // Build dropdown sources
    const usersList = Array.isArray(db.users) ? db.users : [];
    const employeeCustodians = usersList
        .filter(u => u && u.name)
        .map(u => ({ name: u.name, role: u.role || '', id: u.empId || u.id || '' }))
        .sort((a, b) => a.name.localeCompare(b.name));
    // Departmental/team custodians inferred from existing assets (so the user can pick
    // "Finance Dept" if it's already in use somewhere).
    const deptSet = new Set();
    for (const a of db.assets) {
        const v = (a.assignedTo || '').trim();
        if (!v || v === 'Unassigned' || v === 'N/A') continue;
        if (!employeeCustodians.find(e => e.name === v)) deptSet.add(v);
    }
    const deptCustodians = [...deptSet].sort();

    // Known geographies from assets (distinct, non-empty)
    const locationSet = new Set();
    for (const a of db.assets) {
        const loc = (a.location || '').trim();
        if (loc) locationSet.add(loc);
    }
    const knownLocations = [...locationSet].sort();

    return `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-200 h-[calc(100vh-128px)] flex flex-col min-h-0 gap-4">
            <header class="flex items-end justify-between shrink-0">
                <div>
                    <h2 class="page-title">Asset Transfers</h2>
                    <p class="page-subtitle">Execute Relocations & Reassignments</p>
                </div>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
                <!-- Transfer Form -->
                <div class="card-accent flex flex-col h-full">
                    <h3 class="card-title mb-4 flex items-center gap-2">
                        <span class="material-symbols-outlined text-accent">swap_horiz</span>
                        Initiate Transfer
                    </h3>
                    
                    <div class="space-y-4 flex-1">
                        <div class="form-row relative">
                            <label class="form-label">Select Asset Identity</label>
                            
                            <div data-dropdown-wrap class="relative w-full group/dropdown">
                                <!-- Hidden input for logic compatibility -->
                                <input type="hidden" id="transfer-asset" value="" />

                                <button type="button" onclick="const menu = document.getElementById('transfer-asset-menu'); menu.classList.toggle('hidden');" class="w-full text-left bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none transition-all flex justify-between items-center text-slate-700 shadow-sm hover:border-accent">
                                    <span id="transfer-asset-label" class="truncate font-bold">-- Select an Identity --</span>
                                    <span class="material-symbols-outlined text-slate-400">expand_more</span>
                                </button>

                                <div id="transfer-asset-menu" class="hidden absolute z-50 left-0 right-0 mt-2 bg-white border-2 border-accent/30 rounded-2xl shadow-xl max-h-[500px] overflow-hidden flex flex-col">
                                    <div class="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                        <div class="relative">
                                            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">search</span>
                                            <input type="text" placeholder="Search by name, ID..." oninput="window.filterTransferAssets(this.value)" class="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-accent outline-none transition-all" onclick="event.stopPropagation()" />
                                        </div>
                                    </div>
                                    <div class="overflow-y-auto scroll-container flex-1">
                                        ${transferableAssets.length === 0 ? '<p class="p-4 text-xs text-slate-400 italic text-center">No assets assigned to you.</p>' : ''}
                                        ${transferableAssets.map(a => `
                                            <div class="transfer-asset-option cursor-pointer p-4 border-b border-slate-100 hover:bg-slate-50 transition-all last:border-0" onclick="
                                                document.getElementById('transfer-asset').value = '${a.id}';
                                                document.getElementById('transfer-asset-label').innerText = '${a.name.replace(/'/g, "\\'")} (#${a.id})';
                                                document.getElementById('transfer-asset-label').classList.remove('truncate');
                                                document.getElementById('transfer-asset-menu').classList.add('hidden');
                                            ">
                                                <p class="text-[11px] font-black text-slate-900 leading-snug mb-1">${a.name} <span class="text-slate-400">#${a.id}</span></p>
                                                <div class="flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-widest">
                                                    <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">Custodian: ${a.assignedTo || 'Unassigned'}</span>
                                                    <span class="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">Geo: ${a.location}</span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- Target Custodian dropdown -->
                            <div class="form-row">
                                <label class="form-label">Target Custodian</label>
                                <div data-dropdown-wrap class="relative w-full">
                                    <input type="hidden" id="transfer-assignee" value="" />
                                    <button type="button" onclick="document.getElementById('transfer-assignee-menu').classList.toggle('hidden')" class="w-full text-left bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none transition-all flex justify-between items-center text-slate-700 shadow-sm hover:border-accent">
                                        <span id="transfer-assignee-label" class="truncate font-bold">-- Select Custodian --</span>
                                        <span class="material-symbols-outlined text-slate-400">expand_more</span>
                                    </button>
                                    <div id="transfer-assignee-menu" class="hidden absolute z-50 left-0 right-0 mt-2 bg-white border-2 border-accent/30 rounded-2xl shadow-xl max-h-[420px] overflow-hidden flex flex-col">
                                        <div class="p-2 border-b border-slate-100 bg-slate-50">
                                            <div class="relative">
                                                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">search</span>
                                                <input type="text" placeholder="Search employee or dept..." oninput="window.filterTransferList('transfer-assignee-menu', this.value)" class="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-accent outline-none" onclick="event.stopPropagation()" />
                                            </div>
                                        </div>
                                        <div class="overflow-y-auto scroll-container flex-1">
                                            ${employeeCustodians.length > 0 ? `<div class="px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">People</div>` : ''}
                                            ${employeeCustodians.map(e => `
                                                <div class="transfer-opt cursor-pointer px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-all" onclick="window.pickTransferAssignee('${(e.name || '').replace(/'/g, "\\'")}')">
                                                    <p class="text-[11px] font-black text-slate-900 leading-snug">${e.name}</p>
                                                    <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">${e.role || 'employee'}${e.id ? ' · ' + e.id : ''}</p>
                                                </div>
                                            `).join('')}
                                            ${deptCustodians.length > 0 ? `<div class="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Departments / Teams</div>` : ''}
                                            ${deptCustodians.map(d => `
                                                <div class="transfer-opt cursor-pointer px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-all" onclick="window.pickTransferAssignee('${d.replace(/'/g, "\\'")}')">
                                                    <p class="text-[11px] font-black text-slate-900">${d}</p>
                                                </div>
                                            `).join('')}
                                            <div class="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Enter Manually</div>
                                            <div class="px-3 pb-3 flex gap-2">
                                                <input id="transfer-assignee-custom-input" type="text" placeholder="Type a new custodian…" class="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-accent outline-none" onclick="event.stopPropagation()" />
                                                <button type="button" onclick="window.applyTransferCustomEntry('assignee')" class="btn-primary">Use</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Target Geography dropdown -->
                            <div class="form-row">
                                <label class="form-label">Target Geography</label>
                                <div data-dropdown-wrap class="relative w-full">
                                    <input type="hidden" id="transfer-location" value="" />
                                    <button type="button" onclick="document.getElementById('transfer-location-menu').classList.toggle('hidden')" class="w-full text-left bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none transition-all flex justify-between items-center text-slate-700 shadow-sm hover:border-accent">
                                        <span id="transfer-location-label" class="truncate font-bold">-- Select Geography --</span>
                                        <span class="material-symbols-outlined text-slate-400">expand_more</span>
                                    </button>
                                    <div id="transfer-location-menu" class="hidden absolute z-50 left-0 right-0 mt-2 bg-white border-2 border-accent/30 rounded-2xl shadow-xl max-h-[420px] overflow-hidden flex flex-col">
                                        <div class="p-2 border-b border-slate-100 bg-slate-50">
                                            <div class="relative">
                                                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">search</span>
                                                <input type="text" placeholder="Search location..." oninput="window.filterTransferList('transfer-location-menu', this.value)" class="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-accent outline-none" onclick="event.stopPropagation()" />
                                            </div>
                                        </div>
                                        <div class="overflow-y-auto scroll-container flex-1">
                                            ${knownLocations.map(loc => `
                                                <div class="transfer-opt cursor-pointer px-4 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-all" onclick="window.pickTransferLocation('${loc.replace(/'/g, "\\'")}')">
                                                    <p class="text-[11px] font-black text-slate-900">${loc}</p>
                                                </div>
                                            `).join('')}
                                            <div class="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Enter Manually</div>
                                            <div class="px-3 pb-3 flex gap-2">
                                                <input id="transfer-location-custom-input" type="text" placeholder="e.g. HQ Wing A" class="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-accent outline-none" onclick="event.stopPropagation()" />
                                                <button type="button" onclick="window.applyTransferCustomEntry('location')" class="btn-primary">Use</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="p-4 bg-slate-50 rounded-xl flex gap-3 items-start border border-slate-200">
                            <span class="material-symbols-outlined text-slate-400">info</span>
                            <p class="text-xs text-slate-500 leading-relaxed italic">Leave Assignee or Location blank if it is not changing. This action immediately updates the Master Registry.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-end pt-4">
                        <button onclick="executeTransfer()" class="btn-primary">Execute Relocation</button>
                    </div>
                </div>

                <!-- Recent Assignments -->
                 <div class="card-accent flex flex-col flex-1 min-h-0">
                    <div class="card-header shrink-0">
                        <h3 class="card-title">Recent Relocations (Log)</h3>
                    </div>
                    <div class="overflow-auto max-h-[760px] scroll-container flex-1 p-4 space-y-3 min-h-0">
                        ${transfers.length > 0 ? transfers.map(t => {
                            const asset = db.assets.find(a => a.id === t.assetId) || { name: 'Unknown Asset', category: 'N/A' };
                            return `
                            <div onclick="window.openTransferModal('${t.id}')" class="cursor-pointer p-2.5 border border-slate-100 rounded-xl flex gap-3 items-center hover:bg-slate-50 transition-all hover:border-slate-300 hover:shadow-sm group">
                                 <div class="compact-icon bg-slate-100 text-slate-400 group-hover:bg-accent group-hover:text-white transition-all">
                                    <span class="material-symbols-outlined text-[14px]">swap_horiz</span>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="text-[11px] font-black text-slate-900 multiline-name leading-tight">${asset.name} <span class="text-[9px] text-slate-400 font-bold uppercase tracking-widest ml-1">#${t.assetId}</span></p>
                                    <div class="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mt-0.5 text-[9px] text-slate-500 font-medium font-body">
                                         <span class="truncate">${t.fromAssignee} <span class="text-slate-400">(${t.fromLocation})</span></span>
                                         <span class="material-symbols-outlined text-[10px] text-accent hidden sm:inline-block">arrow_right_alt</span>
                                         <span class="font-bold text-slate-700 truncate">${t.toAssignee} <span class="text-slate-400 font-normal">(${t.toLocation})</span></span>
                                    </div>
                                </div>
                                <div class="ml-auto text-[8px] font-black text-slate-400 uppercase tracking-widest text-right shrink-0">
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

    // Clear inputs (rerender refreshes labels too)
    document.getElementById('transfer-assignee').value = '';
    document.getElementById('transfer-location').value = '';
    document.getElementById('transfer-asset').value = '';

    window.app.renderContent();
};

window.openTransferModal = (txId) => {
    const tx = db.transfers.find(t => t.id === txId);
    if (!tx) return;
    const asset = db.assets.find(a => a.id === tx.assetId) || { name: 'Unknown', category: 'N/A' };
    
    // Check if it's an initial deployment (Origin -> First Assignee)
    const isInitial = tx.fromAssignee === "Central Depot";
    
    const content = `
        <div class="card-header shrink-0">
            <div>
                 <h3 class="page-title text-base">Custody Transfer Record</h3>
                 <p class="page-subtitle">Transaction: #${tx.id}</p>
            </div>
            <button onclick="window.closeTransferModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>

        <div class="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
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
                            <p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Previous Custodian</p>
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
                            <p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">New Custodian</p>
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

        <div class="card-header border-t border-slate-100 border-b-0 flex justify-end">
             <button onclick="window.closeTransferModal()" class="btn-ghost">Acknowledge</button>
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
