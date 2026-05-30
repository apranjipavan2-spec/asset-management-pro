import { db } from '../mock/db.js';

export function renderFinanceDashboard() {
    const stats = db.getStats();
    const grants = db.grants;

    // ── Operational ↔ Finance reconciliation ────────────────────────
    // Pair each FAR parent (financial register) with the count of
    // individual units (operational register) currently linked to it.
    const childByParent = new Map();
    for (const a of (db.assets || [])) {
        const k = a.parentAssetId;
        if (!k) continue;
        childByParent.set(k, (childByParent.get(k) || 0) + 1);
    }
    const farRows = (db.assetFar || []).slice().sort((a, b) =>
        String(a.assetId || '').localeCompare(String(b.assetId || ''))
    );
    const reconRows = farRows.map(p => ({
        assetId: p.assetId,
        assetClass: p.assetClass || '',
        fy: p.fy,
        donor: p.donor || '',
        children: childByParent.get(p.assetId) || 0
    }));
    const totalParents       = farRows.length;
    const parentsWithChildren= reconRows.filter(r => r.children > 0).length;
    const parentsOrphan      = totalParents - parentsWithChildren;
    const orphanIndividuals  = (db.assets || []).filter(a =>
        a.parentAssetId && !farRows.some(p => p.assetId === a.parentAssetId)
    ).length;

    return `
        <div class="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 pb-10 font-sans">
            <header class="flex items-center justify-between">
                <div>
                    <h2 class="page-title">Financial Control Ledger</h2>
                    <p class="page-subtitle">Institutional Asset Valuation & Compliance</p>
                </div>
                ${window.app.canExportAssets() ? `
                <div class="flex items-center gap-2">
                    ${window.app.canExportFinance() ? `
                    <button onclick="app.exportSourceFormat()" title="Dep + FCRA Asset Register source-format XLSX — Finance/ED/Superadmin only" class="px-3 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-xl hover:bg-slate-800 transition-all uppercase tracking-widest shadow-sm flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[14px]">download</span> Source-Format XLSX
                    </button>` : ''}
                    <div class="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <button onclick="app.exportCSV('finance_assets')" class="px-3 py-2 text-slate-600 text-[10px] font-bold hover:bg-slate-50 border-r border-slate-100 transition-all uppercase tracking-widest flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[14px]">csv</span> CSV
                        </button>
                        <button onclick="app.exportExcel(event)" class="px-3 py-2 text-emerald-600 text-[10px] font-bold hover:bg-emerald-50 transition-all uppercase tracking-widest flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-[14px]">table_chart</span> Flat XLSX
                        </button>
                    </div>
                </div>` : ''}
            </header>

            <!-- Key Financial Metrics: Compact -->
            <section class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="stat-tile flex flex-col">
                    <div class="stat-strip bg-slate-900"></div>
                    <span class="stat-label mb-1.5">Gross Portfolio</span>
                    <span class="stat-value text-xl">₹${stats.totalValue.toLocaleString()}</span>
                    <p class="text-[9px] font-bold text-emerald-600 mt-3 flex items-center gap-1">
                        <span class="material-symbols-outlined text-[12px]">trending_up</span> ${stats.totalValue > 0 ? ((stats.netValue / stats.totalValue) * 100).toFixed(1) : 0}% Net Book Coverage
                    </p>
                </div>
                <div class="stat-tile flex flex-col">
                    <div class="stat-strip bg-rose-500"></div>
                    <span class="stat-label mb-1.5">Accum. Dep.</span>
                    <span class="stat-value text-xl text-rose-500">-₹${(stats.totalValue - stats.netValue).toLocaleString()}</span>
                    <p class="text-[9px] font-bold text-slate-400 mt-3">${db.assets.length > 0 ? (db.assets.reduce((s, a) => (s + (parseFloat(a.depreciationRate) || 0)), 0) / db.assets.length * 100).toFixed(1) : 0}% avg. rate</p>
                </div>
                <div class="stat-tile flex flex-col">
                    <div class="stat-strip bg-emerald-500"></div>
                    <span class="stat-label mb-1.5">Net Book Value</span>
                    <span class="stat-value text-xl">₹${stats.netValue.toLocaleString()}</span>
                    <p class="text-[9px] font-bold text-slate-400 mt-3">Equity Balance</p>
                </div>
                <div class="stat-tile flex flex-col">
                    <div class="stat-strip bg-indigo-500"></div>
                    <span class="stat-label mb-1.5">Grant Liquidity</span>
                    <span class="stat-value text-xl">₹${grants.reduce((s, g) => s + g.openingBalance, 0).toLocaleString()}</span>
                    <p class="text-[9px] font-bold text-slate-400 mt-3">${grants.length} Active Grantors</p>
                </div>
            </section>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Grant Utilization Card Grid: NICE & DETAILED -->
                <div class="card-accent flex flex-col">
                    <div class="card-header">
                        <h3 class="card-title">Grant Expenditure Analysis</h3>
                        ${window.app.canExportAssets() ? `<button onclick="app.exportCSV('grants')" class="text-[9px] font-black text-accent hover:underline uppercase tracking-widest">Detail Report</button>` : ''}
                    </div>
                    <div class="p-5 grid grid-cols-1 gap-4 max-h-[760px] overflow-y-auto scroll-container bg-slate-50/30">
                        ${grants.map(grant => {
                            const pct = Math.min(100, (grant.spent / grant.openingBalance * 100)).toFixed(0);
                            return `
                            <div class="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm hover:shadow-[0_4px_15px_-3px_rgba(6,81,237,0.15)] hover:border-accent/30 transition-all group">
                                <div class="flex justify-between items-start mb-6">
                                    <div class="flex items-center gap-4">
                                        <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <span class="material-symbols-outlined text-xl">payments</span>
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <p class="text-[10px] font-black text-indigo-500 uppercase tracking-widest">${grant.id}</p>
                                                <button onclick="app.showEditGrantModal('${grant.id}')" class="p-1 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded transition-colors">
                                                    <span class="material-symbols-outlined text-[14px]">edit</span>
                                                </button>
                                                <button onclick="app.deleteGrantRequest('${grant.id}')" class="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors">
                                                    <span class="material-symbols-outlined text-[14px]">delete</span>
                                                </button>
                                            </div>
                                            <h4 class="text-sm font-black text-slate-900 mt-0.5 font-headline">${grant.name}</h4>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] text-slate-500 font-black uppercase tracking-widest">Allocated Fund</p>
                                        <p class="text-lg font-black text-slate-900 tabular-nums font-headline">₹${grant.openingBalance.toLocaleString()}</p>
                                    </div>
                                </div>
                                
                                <div class="grid grid-cols-3 gap-4 mb-6">
                                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-300 shadow-sm">
                                        <p class="text-[9px] text-slate-500 font-black uppercase mb-1">Program</p>
                                        <p class="text-[10px] font-bold text-slate-900 truncate">${grant.program}</p>
                                    </div>
                                    <div class="p-3 bg-rose-50 rounded-xl border border-rose-300 shadow-sm">
                                        <p class="text-[9px] text-rose-500 font-black uppercase mb-1">Spent</p>
                                        <p class="text-[10px] font-black text-rose-600">₹${grant.spent.toLocaleString()}</p>
                                    </div>
                                    <div class="p-3 bg-emerald-50 rounded-xl border border-emerald-300 shadow-sm">
                                        <p class="text-[9px] text-emerald-500 font-black uppercase mb-1">Available</p>
                                        <p class="text-[10px] font-black text-emerald-600">₹${grant.closingBalance.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    <div class="flex justify-between items-end">
                                        <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest text-[9px]">Burn Rate Progress</span>
                                        <span class="text-xs font-black text-slate-900 tabular-nums">${pct}%</span>
                                    </div>
                                    <div class="w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                                        <div class="h-full bg-slate-900 transition-all duration-1000 ease-out" style="width: ${pct}%"></div>
                                    </div>
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>

                <div class="space-y-4">
                    <!-- Asset Worth Summary: Compact -->
                    <div class="card-accent overflow-hidden">
                        <div class="card-header">
                            <h3 class="card-title">Portfolio Distribution</h3>
                        </div>
                        <div class="p-5 flex flex-col gap-3 max-h-[400px] overflow-y-auto scroll-container bg-slate-50/30">
                            ${[...new Set(db.assets.map(a => a.category))].map(cat => {
                                const total = db.assets.filter(a => a.category === cat).reduce((s, a) => {
                                    const dep = window.app?.computeAssetDepreciation?.(a) || {};
                                    return s + (Number(dep.gross) || Number(a.grossBlock) || Number(a.amount) || 0);
                                }, 0);
                                const pct = stats.totalValue > 0 ? (total / stats.totalValue * 100).toFixed(0) : 0;
                                return `
                                <div class="p-4 bg-white border border-slate-300 rounded-xl shadow-sm hover:shadow-[0_4px_15px_-3px_rgba(6,81,237,0.15)] hover:border-accent/30 transition-all space-y-3 group">
                                    <div class="flex justify-between items-end">
                                        <span class="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-accent transition-colors">${cat}</span>
                                        <span class="text-[11px] font-black text-slate-900 tabular-nums bg-slate-50 px-2 py-1 rounded-lg border border-slate-300 group-hover:border-accent/20 transition-colors">₹${total.toLocaleString()}</span>
                                    </div>
                                    <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                        <div class="h-full bg-accent relative" style="width: ${pct}%">
                                        </div>
                                    </div>
                                </div>
                                `
                            }).join('')}
                        </div>
                    </div>

                    <!-- Requisition Queue: Compact -->
                    <div class="card-accent overflow-hidden">
                        <div class="card-header">
                            <h3 class="card-title">Pending Financial Approval</h3>
                            <span class="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black tabular-nums">${db.requests.filter(r => !r.financeApproved && !r.status.startsWith('Rejected')).length}</span>
                        </div>
                        <div class="p-5 flex flex-col gap-3 max-h-[340px] overflow-y-auto scroll-container bg-slate-50/30">
                            ${db.requests.filter(r => !r.financeApproved && !r.status.startsWith('Rejected')).length > 0 ? db.requests.filter(r => !r.financeApproved && !r.status.startsWith('Rejected')).map(req => `
                                <div class="p-4 bg-white border border-slate-300 rounded-xl shadow-sm hover:shadow-[0_4px_15px_-3px_rgba(6,81,237,0.15)] hover:border-amber-500/50 transition-all space-y-3 group">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-amber-600 transition-colors">${req.category}</p>
                                            <p class="text-xs font-black text-slate-900 mt-1">${req.user}</p>
                                        </div>
                                        <span class="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-300">${new Date(req.date).toLocaleDateString()}</span>
                                    </div>
                                    <p class="text-[10px] text-slate-600 italic bg-slate-50 px-3 py-2 rounded-lg border border-slate-300 line-clamp-1">"${req.reason}"</p>
                                    <div class="flex gap-2 pt-1">
                                        <button onclick="approveReqFinance('${req.id}')" class="flex-1 py-2 bg-slate-900 text-white text-[9px] font-black rounded-lg shadow-sm hover:shadow hover:bg-emerald-600 transition-all uppercase tracking-widest">Approve</button>
                                        <button onclick="rejectReqFinance('${req.id}')" class="flex-1 py-2 bg-white border border-slate-300 text-[9px] font-black text-slate-500 rounded-lg hover:border-rose-500 hover:text-rose-500 transition-all uppercase tracking-widest">Reject</button>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="p-8 bg-white border border-slate-300 border-dashed rounded-xl flex items-center justify-center">
                                    <p class="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-2">
                                        <span class="material-symbols-outlined text-sm">check_circle</span> Queue Clear
                                    </p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── Operational ↔ Finance Reconciliation ────────────── -->
            <section class="card overflow-hidden">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Finance ↔ Operational Reconciliation</h3>
                        <p class="card-meta">Per-parent unit counts (asset_far → assets)</p>
                    </div>
                    <div class="flex gap-3 text-[10px] font-black uppercase tracking-widest">
                        <span class="px-2 py-1 bg-slate-100 text-slate-700 rounded-md">${totalParents} parents</span>
                        <span class="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md">${parentsWithChildren} linked</span>
                        <span class="px-2 py-1 ${parentsOrphan > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-400'} rounded-md">${parentsOrphan} parent-only</span>
                        <span class="px-2 py-1 ${orphanIndividuals > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-400'} rounded-md">${orphanIndividuals} orphan units</span>
                    </div>
                </div>
                <div class="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                    <input id="recon-search" type="text" placeholder="Filter parents by ID, class, donor..."
                        oninput="window.filterReconTable()"
                        class="form-input" />
                </div>
                <div class="max-h-[420px] overflow-auto scroll-container">
                    <table class="dense-table w-full">
                        <thead class="sticky-header bg-white">
                            <tr class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <th class="text-left px-6 py-3">Parent Asset ID</th>
                                <th class="text-left">Class</th>
                                <th class="text-left">Donor</th>
                                <th class="text-center">FY</th>
                                <th class="text-right pr-6"># Individual Units</th>
                            </tr>
                        </thead>
                        <tbody id="recon-tbody" class="divide-y divide-slate-100">
                            ${reconRows.map(r => `
                                <tr class="recon-row hover:bg-slate-50 cursor-pointer"
                                    data-key="${[r.assetId, r.assetClass, r.donor].join(' ').toLowerCase()}"
                                    onclick="window.showParentChildren('${String(r.assetId).replace(/'/g, "\\'")}')">
                                    <td class="px-6 py-2 text-[10px] font-mono font-bold text-slate-900 break-all max-w-[420px]">${r.assetId}</td>
                                    <td class="text-[10px] text-slate-600 max-w-[160px] truncate" title="${r.assetClass}">${r.assetClass}</td>
                                    <td class="text-[10px] text-slate-600 max-w-[120px] truncate" title="${r.donor}">${r.donor}</td>
                                    <td class="text-[10px] text-center text-slate-500 font-bold tabular-nums">${r.fy ?? '—'}</td>
                                    <td class="pr-6 text-right">
                                        <span class="text-[10px] font-black tabular-nums ${r.children === 0 ? 'text-amber-600' : 'text-slate-900'}">${r.children}</span>
                                    </td>
                                </tr>
                            `).join('')}
                            ${reconRows.length === 0 ? `
                                <tr><td colspan="5" class="p-8 text-center text-[10px] text-slate-400 italic uppercase tracking-widest">No FAR rows seeded — run scripts/seed_asset_far.cjs</td></tr>
                            ` : ''}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    `;
}

window.filterReconTable = () => {
    const q = (document.getElementById('recon-search')?.value || '').toLowerCase().trim();
    document.querySelectorAll('.recon-row').forEach(row => {
        row.style.display = (!q || (row.dataset.key || '').includes(q)) ? '' : 'none';
    });
};

window.showParentChildren = (parentId) => {
    const kids = (db.assets || []).filter(a => a.parentAssetId === parentId);
    const fmt = (s) => s == null || s === '' ? '—' : s;
    const html = `
        <div id="parent-children-backdrop" class="fixed inset-0 z-[150] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div class="bg-white w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
                    <div class="min-w-0">
                        <p class="text-[9px] font-black uppercase tracking-widest text-slate-300">Parent Asset</p>
                        <p class="text-xs font-black font-mono break-all">${parentId}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">${kids.length} Units</span>
                        <button onclick="document.getElementById('parent-children-backdrop').remove()" class="p-2 rounded-full hover:bg-white/10 transition">
                            <span class="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                </div>
                <div class="overflow-auto flex-1 scroll-container">
                    <table class="dense-table w-full">
                        <thead class="sticky-header bg-white">
                            <tr class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <th class="text-left px-6 py-3">Standardized ID</th>
                                <th class="text-left">District</th>
                                <th class="text-left">Assigned to</th>
                                <th class="text-left">Status</th>
                                <th class="text-left">Match</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${kids.length === 0 ? `<tr><td colspan="5" class="p-8 text-center text-[10px] text-slate-400 italic uppercase tracking-widest">No individual units linked</td></tr>` : kids.map(a => `
                                <tr class="hover:bg-slate-50 cursor-pointer" onclick="document.getElementById('parent-children-backdrop').remove(); window.app.showAssetModal('${String(a.id).replace(/'/g, "\\'")}')">
                                    <td class="px-6 py-2 text-[10px] font-mono font-bold text-slate-900 break-all max-w-[360px]">${a.id}</td>
                                    <td class="text-[10px] text-slate-600">${fmt(a.district)}</td>
                                    <td class="text-[10px] text-slate-600 max-w-[140px] truncate">${fmt(a.assignedTo)}</td>
                                    <td class="text-[10px] text-slate-600">${fmt(a.status)}</td>
                                    <td><span class="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${a.parentMatchType === 'EXACT_NORM' ? 'bg-emerald-50 text-emerald-700' : a.parentMatchType === 'STRUCTURAL' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}">${fmt(a.parentMatchType)}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstElementChild);
};

window.approveReqFinance = (id) => {
    db.approveRequestFinance(id);
    window.app.render();
};

window.rejectReqFinance = (id) => {
    db.rejectRequestFinance(id);
    window.app.render();
};
