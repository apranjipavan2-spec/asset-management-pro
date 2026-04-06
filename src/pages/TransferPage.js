import { db } from '../mock/db.js';

export function renderTransferPage() {
    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header class="flex items-end justify-between">
                <div>
                    <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Asset Transfers</h2>
                    <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">Execute Relocations & Reassignments</p>
                </div>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                 <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">
                    <div class="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Recent Relocations (Log)</h3>
                    </div>
                    <div class="overflow-y-auto flex-1 p-6 space-y-4 opacity-70">
                        <!-- Mocked historical data for visual completion -->
                        <div class="p-4 border border-slate-100 rounded-xl flex gap-4 items-center">
                             <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <span class="material-symbols-outlined text-sm">history</span>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-slate-900">Tier 1 Heavy Drill (#AS-99812)</p>
                                <p class="text-[10px] text-slate-500 mt-1">Transferred to <span class="font-bold">John Doe</span> at <span class="font-bold">Nevada Site A</span></p>
                            </div>
                            <span class="ml-auto text-[9px] font-black text-slate-400 uppercase tracking-widest">Yesterday</span>
                        </div>
                    </div>
                 </div>
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
    window.app.render(); // Refresh the view
    alert("Asset successfully relocated!");
};
