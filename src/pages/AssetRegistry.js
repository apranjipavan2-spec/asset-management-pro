import { db } from '../mock/db.js';

export function renderAssetRegistry() {
    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <header class="flex items-end justify-between">
                <div>
                    <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Master Asset Registry</h2>
                    <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">Institutional Inventory & Condition Monitoring</p>
                </div>
                <div class="flex gap-2">
                    <div class="relative">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input id="registry-search" type="text" placeholder="Filter by ID or Name..." oninput="window.filterRegistryTable()" class="bg-white border border-slate-200 rounded-xl px-4 py-2 pl-9 text-xs focus:border-accent outline-none w-64 shadow-sm" />
                    </div>
                    <button onclick="app.exportCSV('assets')" class="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-xl hover:bg-slate-50 transition-all uppercase tracking-widest shadow-sm flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">download</span> CSV
                    </button>
                    <button onclick="app.showAddAssetModal()" class="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-xl hover:bg-slate-800 transition-all uppercase tracking-widest shadow-lg shadow-slate-900/10 flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">add</span> Add New Asset
                    </button>
                </div>
            </header>

            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="px-8 py-5 border-b border-slate-50 bg-slate-50/20 flex gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[.2em]">
                    <span onclick="window.filterRegistryByStatus('all')" data-tab="all" class="registry-tab text-slate-900 border-b-2 border-accent pb-5 -mb-5 cursor-pointer">All Assets</span>
                    <span onclick="window.filterRegistryByStatus('Active')" data-tab="Active" class="registry-tab hover:text-slate-900 cursor-pointer transition-all">Active</span>
                    <span onclick="window.filterRegistryByStatus('Maintenance')" data-tab="Maintenance" class="registry-tab hover:text-slate-900 cursor-pointer transition-all">In Maintenance</span>
                    <span onclick="window.filterRegistryByStatus('Storage')" data-tab="Storage" class="registry-tab hover:text-slate-900 cursor-pointer transition-all">Stored</span>
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
                                <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest font-label border-b border-slate-100 text-right select-none">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="registry-tbody" class="divide-y divide-slate-100">
                            ${db.assets.map(asset => `
                                <tr onclick="app.showAssetModal('${asset.id}')" data-status="${asset.status}" data-name="${asset.name}" data-id="${asset.id}" class="registry-row hover:bg-slate-50/50 transition-all cursor-pointer group">
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
                                    <td class="px-8 py-5 text-right">
                                        <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onclick="event.stopPropagation(); app.showEditAssetModal('${asset.id}')" class="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 flex items-center justify-center transition-all shadow-sm">
                                                <span class="material-symbols-outlined text-[16px]">edit</span>
                                            </button>
                                            <button onclick="event.stopPropagation(); app.deleteAssetRequest('${asset.id}')" class="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all shadow-sm">
                                                <span class="material-symbols-outlined text-[16px]">delete</span>
                                            </button>
                                        </div>
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

// --- Live Search Filter ---
window.filterRegistryTable = () => {
    const query = (document.getElementById('registry-search')?.value || '').toLowerCase();
    document.querySelectorAll('.registry-row').forEach(row => {
        const name = (row.dataset.name || '').toLowerCase();
        const id = (row.dataset.id || '').toLowerCase();
        const matchesSearch = !query || name.includes(query) || id.includes(query);
        // Also respect active tab filter
        const activeTab = document.querySelector('.registry-tab.text-slate-900');
        const tabFilter = activeTab ? activeTab.dataset.tab : 'all';
        const matchesTab = tabFilter === 'all' || row.dataset.status === tabFilter;
        row.style.display = (matchesSearch && matchesTab) ? '' : 'none';
    });
};

// --- Tab Status Filter ---
window.filterRegistryByStatus = (status) => {
    // Update tab visual state
    document.querySelectorAll('.registry-tab').forEach(tab => {
        if (tab.dataset.tab === status) {
            tab.classList.add('text-slate-900', 'border-b-2', 'border-accent', 'pb-5', '-mb-5');
            tab.classList.remove('text-slate-400');
        } else {
            tab.classList.remove('text-slate-900', 'border-b-2', 'border-accent', 'pb-5', '-mb-5');
            tab.classList.add('text-slate-400');
        }
    });
    // Re-apply filter (combines with search)
    window.filterRegistryTable();
};
