import { db } from '../mock/db.js';

window.filterRequestCategories = function(query) {
    const q = query.toLowerCase();
    const options = document.querySelectorAll('.request-category-option');
    options.forEach(opt => {
        const text = opt.innerText.toLowerCase();
        opt.style.display = text.includes(q) ? '' : 'none';
    });
};

// Matches asset name, asset id, holder name, or holder employee id (haystack
// is built from data-* attributes on each .transfer-asset-option row).
window.filterTransferAssets = function(query) {
    const q = query.trim().toLowerCase();
    const options = document.querySelectorAll('.transfer-asset-option');
    let visible = 0;
    options.forEach(opt => {
        const haystack = (opt.dataset.search || '').toLowerCase();
        const show = !q || haystack.includes(q);
        opt.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    const empty = document.getElementById('transfer-asset-empty');
    if (empty) empty.style.display = visible === 0 ? '' : 'none';
};

export function renderRequestPage(user) {
    return `
        <div class="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <header>
                <h2 class="text-xl text-slate-900 font-black tracking-tight">Request / Transfer Asset</h2>
                <p class="text-slate-500 text-[10px] mt-0.5 uppercase tracking-widest font-bold">Request New Assets or Transfer Existing Equipment</p>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <!-- LEFT: Tabs + active form -->
            <div class="space-y-3">
            <!-- Request Type Tabs -->
            <div class="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button onclick="window.switchRequestTab('asset')" id="tab-asset" class="flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all bg-white text-accent border border-accent shadow-sm">
                    🛒 Request Asset
                </button>
                <button onclick="window.switchRequestTab('transfer')" id="tab-transfer" class="flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all text-slate-500 border border-slate-300 hover:text-slate-900 hover:border-slate-400">
                    🔄 Transfer Asset
                </button>
            </div>

            <!-- Asset Request Form -->
            <div id="asset-form" class="bg-white p-5 rounded-xl border border-accent/30 shadow-sm space-y-4 hover:border-accent transition-all">
                <div class="space-y-4">
                    <div class="space-y-1.5 relative">
                        <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Asset Category</label>

                        <div class="relative w-full group/dropdown">
                            <input type="hidden" id="request-category" value="IT Equipment" />

                            <button type="button" onclick="const menu = document.getElementById('request-category-menu'); menu.classList.toggle('hidden');" class="w-full text-left bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none transition-all flex justify-between items-center text-slate-700 hover:border-accent">
                                <span id="request-category-label" class="font-bold">IT Equipment</span>
                                <span class="material-symbols-outlined text-slate-400 text-base">expand_more</span>
                            </button>

                            <div id="request-category-menu" class="hidden absolute z-50 left-0 right-0 mt-2 bg-white border-2 border-accent/30 rounded-2xl shadow-xl max-h-[500px] overflow-hidden flex flex-col">
                                <div class="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                    <div class="relative">
                                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">search</span>
                                        <input type="text" placeholder="Search categories..." oninput="window.filterRequestCategories(this.value)" class="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-accent outline-none transition-all" onclick="event.stopPropagation()" />
                                    </div>
                                </div>
                                <div class="overflow-y-auto scroll-container flex-1">
                                    ${[
                                        { val: 'IT Equipment', label: 'IT Equipment', desc: 'Laptop, Monitor, Hub, Peripherals' },
                                        { val: 'Infrastructure', label: 'Infrastructure', desc: 'Network, Power Systems, Server Infrastructure' },
                                        { val: 'Logistics', label: 'Logistics', desc: 'Transport Vehicles, Hauler, Tooling' },
                                        { val: 'Office', label: 'Office', desc: 'Furniture, Desk Configurations, Stationery' }
                                    ].map(c => `
                                        <div class="request-category-option cursor-pointer p-4 border-b border-slate-100 hover:bg-slate-50 transition-all last:border-0" onclick="
                                            document.getElementById('request-category').value = '${c.val}';
                                            document.getElementById('request-category-label').innerText = '${c.label}';
                                            document.getElementById('request-category-menu').classList.add('hidden');
                                        ">
                                            <p class="text-[11px] font-black text-slate-900 leading-snug mb-1">${c.label}</p>
                                            <div class="flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-widest">
                                                <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">${c.desc}</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Business Justification</label>
                        <textarea id="request-reason" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-accent outline-none transition-all" placeholder="Reason for requisition..."></textarea>
                    </div>

                    <div class="p-3 bg-slate-50 rounded-lg flex gap-2 items-start border border-slate-200">
                        <span class="material-symbols-outlined text-slate-400 text-base">info</span>
                        <p class="text-[11px] text-slate-500 leading-snug">Once submitted, this request will be forwarded to the Head of Operations for approval. You will be notified via the "My Assets" portal upon status change.</p>
                    </div>
                </div>

                <div class="flex items-center gap-2 justify-end pt-1">
                    <button onclick="app.navigateTo('dashboard')" class="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Discard</button>
                    <button id="submit-request-btn" onclick="submitRequisition()" class="px-5 py-2 bg-accent text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-primary transition-all uppercase tracking-widest">Submit Requisition</button>
                </div>
            </div>

            <!-- Transfer Request Form -->
            <div id="transfer-form" style="display: none;" class="bg-white p-5 rounded-xl border border-accent/30 shadow-sm space-y-4 hover:border-accent transition-all">
                <div class="space-y-4">
                    <div class="space-y-1.5 relative">
                        <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Select Asset to Transfer</label>

                        <div class="relative w-full group/dropdown">
                            <input type="hidden" id="transfer-asset-id" value="" />

                            <button type="button" onclick="const menu = document.getElementById('transfer-asset-menu'); menu.classList.toggle('hidden');" class="w-full text-left bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none transition-all flex justify-between items-center text-slate-700 hover:border-accent">
                                <span id="transfer-asset-label" class="font-bold text-slate-400">Choose an asset...</span>
                                <span class="material-symbols-outlined text-slate-400 text-base">expand_more</span>
                            </button>

                            <div id="transfer-asset-menu" class="hidden absolute z-50 left-0 right-0 mt-2 bg-white border-2 border-accent/30 rounded-2xl shadow-xl max-h-[500px] overflow-hidden flex flex-col">
                                <div class="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                    <div class="relative">
                                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">search</span>
                                        <input type="text" placeholder="Search by asset, ID, holder name, or employee ID..." oninput="window.filterTransferAssets(this.value)" class="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-accent outline-none transition-all" onclick="event.stopPropagation()" />
                                    </div>
                                </div>
                                <div class="overflow-y-auto scroll-container flex-1">
                                    ${(() => {
                                        const activeAssets = db.assets.filter(a => a.status === 'Active');
                                        if (activeAssets.length === 0) {
                                            return `<div class="p-4 text-center text-[10px] text-slate-400 uppercase tracking-widest">No active assets assigned</div>`;
                                        }
                                        const escape = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
                                        return activeAssets.map(a => {
                                            const holder = db.users.find(u => u.id === a.assignedToId || u.empId === a.assignedToId) || {};
                                            const holderName = a.assignedTo || holder.name || 'Unassigned';
                                            const holderId = a.assignedToId || holder.empId || holder.id || '—';
                                            const location = a.location || '—';
                                            const search = `${a.name} ${a.id} ${a.category} ${holderName} ${holderId} ${location}`;
                                            return `
                                                <div class="transfer-asset-option cursor-pointer p-4 border-b border-slate-100 hover:bg-slate-50 transition-all last:border-0"
                                                    data-search="${escape(search)}"
                                                    onclick="
                                                        document.getElementById('transfer-asset-id').value = '${escape(a.id)}';
                                                        document.getElementById('transfer-asset-label').innerText = '${escape(a.name)} (${escape(a.id)})';
                                                        document.getElementById('transfer-asset-label').classList.remove('text-slate-400');
                                                        document.getElementById('transfer-asset-label').classList.add('text-slate-900');
                                                        document.getElementById('transfer-asset-menu').classList.add('hidden');
                                                    ">
                                                    <div class="flex items-start justify-between gap-3">
                                                        <p class="text-[12px] font-black text-slate-900 leading-snug">${escape(a.name)}</p>
                                                        <span class="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 text-[9px] font-bold uppercase tracking-widest shrink-0">${escape(a.id)}</span>
                                                    </div>
                                                    <div class="flex flex-wrap gap-1.5 mt-2 text-[9px] font-bold uppercase tracking-widest">
                                                        <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">${escape(a.category)}</span>
                                                        <span class="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">📍 ${escape(location)}</span>
                                                    </div>
                                                    <div class="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                                                        <span class="material-symbols-outlined text-slate-400 text-[16px]">person</span>
                                                        <div class="flex-1 min-w-0">
                                                            <p class="text-[11px] font-bold text-slate-900 truncate">${escape(holderName)}</p>
                                                            <p class="text-[9px] font-bold uppercase tracking-widest text-slate-400">Emp ID: ${escape(holderId)}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            `;
                                        }).join('');
                                    })()}
                                    <div id="transfer-asset-empty" class="p-4 text-center text-[10px] text-slate-400 uppercase tracking-widest" style="display: none;">No assets match your search</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-1.5">
                        <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Transfer Reason</label>
                        <textarea id="transfer-reason" rows="3" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-accent outline-none transition-all" placeholder="Why do you need to transfer this asset?"></textarea>
                    </div>

                    <div class="p-3 bg-slate-50 rounded-lg flex gap-2 items-start border border-slate-200">
                        <span class="material-symbols-outlined text-slate-400 text-base">info</span>
                        <p class="text-[11px] text-slate-500 leading-snug">Your transfer request will be sent to your manager for approval. They will review the request and complete the transfer once approved.</p>
                    </div>
                </div>

                <div class="flex items-center gap-2 justify-end pt-1">
                    <button onclick="app.navigateTo('dashboard')" class="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Discard</button>
                    <button id="submit-transfer-btn" onclick="submitTransferRequest()" class="px-5 py-2 bg-accent text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-primary transition-all uppercase tracking-widest">Request Transfer</button>
                </div>
            </div>
            </div>
            <!-- /LEFT -->

            <!-- RIGHT: Request History -->
            <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div class="px-4 py-2.5 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                    <h3 class="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest">Request History</h3>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${db.requests.filter(r => r.user === user.name).length} total</span>
                </div>
                <div class="divide-y divide-slate-100 max-h-[520px] overflow-y-auto scroll-container">
                    ${db.requests.filter(r => r.user === user.name).length > 0 ? db.requests.filter(r => r.user === user.name).map(r => `
                        <div class="px-4 py-2.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                            <div class="min-w-0 flex-1">
                                <p class="text-[11px] font-black text-slate-900 truncate">${r.type === 'transfer' ? `🔄 Transfer: ${r.assetName}` : `🛒 ${r.category}`}</p>
                                ${r.reason ? `<p class="text-[10px] text-slate-500 line-clamp-2 mt-0.5">${r.reason}</p>` : ''}
                                <p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mt-1">${new Date(r.date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</p>
                            </div>
                            <span class="px-2 py-0.5 text-[9px] font-bold uppercase rounded border shrink-0 ${
                                r.status === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                r.status.startsWith('Rejected') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                'bg-amber-50 text-amber-600 border-amber-100'
                            }">${r.status}</span>
                        </div>
                    `).join('') : `<div class="px-4 py-8 text-center text-[10px] text-slate-400 uppercase tracking-widest">No recent submissions</div>`}
                </div>
            </div>
            </div>
        </div>
    `;
}

// Tab switching
window.switchRequestTab = (tab) => {
    const assetForm = document.getElementById('asset-form');
    const transferForm = document.getElementById('transfer-form');
    const tabAsset = document.getElementById('tab-asset');
    const tabTransfer = document.getElementById('tab-transfer');

    const activate = (btn) => {
        btn.classList.add('bg-white', 'text-accent', 'border-accent', 'shadow-sm');
        btn.classList.remove('text-slate-500', 'hover:text-slate-900', 'bg-transparent', 'border-slate-300', 'hover:border-slate-400');
    };
    const deactivate = (btn) => {
        btn.classList.remove('bg-white', 'text-accent', 'border-accent', 'shadow-sm');
        btn.classList.add('text-slate-500', 'hover:text-slate-900', 'bg-transparent', 'border-slate-300', 'hover:border-slate-400');
    };

    if (tab === 'asset') {
        assetForm.style.display = '';
        transferForm.style.display = 'none';
        activate(tabAsset);
        deactivate(tabTransfer);
    } else {
        assetForm.style.display = 'none';
        transferForm.style.display = '';
        activate(tabTransfer);
        deactivate(tabAsset);
    }
};

// Asset requisition submission
window.submitRequisition = () => {
    const category = document.getElementById('request-category').value;
    const reason = document.getElementById('request-reason').value;

    if (!reason.trim()) {
        alert('Please provide a business justification.');
        return;
    }

    db.requestAsset(category, reason, window.app.user.name);
    alert('Your asset request has been submitted. Your manager will review it shortly.');
    window.app.navigateTo('dashboard');
};

// Transfer request submission
window.submitTransferRequest = () => {
    const assetId = document.getElementById('transfer-asset-id').value;
    const reason = document.getElementById('transfer-reason').value;

    if (!assetId) {
        alert('Please select an asset to transfer.');
        return;
    }

    if (!reason.trim()) {
        alert('Please provide a reason for the transfer.');
        return;
    }

    db.requestAssetTransfer(assetId, reason, window.app.user.name);
    alert('Your transfer request has been submitted. Your manager will review it shortly.');
    window.app.navigateTo('dashboard');
};
