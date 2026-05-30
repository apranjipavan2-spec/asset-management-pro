import { db } from '../mock/db.js';

window.filterManagerAssets = function(query) {
    const q = query.toLowerCase();
    const rows = document.querySelectorAll('#manager-asset-tbody tr');
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
    });
};

export function renderManagerDashboard() {
    const stats = db.getStats();
    
    // Requests Logic
    const allRequests = [...db.requests].sort((a,b) => new Date(b.date) - new Date(a.date));
    const pendingCount = allRequests.filter(r => !r.managerApproved && !r.status.startsWith('Rejected')).length;

    return `
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-200 h-[calc(100vh-128px)] flex flex-col min-h-0">
            <header class="flex items-center justify-between mb-4">
                <div>
                    <h2 class="page-title">Executive Fleet Intelligence</h2>
                    <p class="page-subtitle">Real-time Asset Monitoring & Deployment</p>
                </div>
                ${window.app.canExportAssets() ? `
                <div class="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <button onclick="app.exportCSV('assets')" class="px-3 py-2 text-slate-600 text-[10px] font-bold hover:bg-slate-50 border-r border-slate-100 transition-all uppercase tracking-widest flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[14px]">csv</span> CSV
                    </button>
                    <button onclick="app.exportExcel(event)" class="px-3 py-2 text-emerald-600 text-[10px] font-bold hover:bg-emerald-50 transition-all uppercase tracking-widest flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[14px]">table_chart</span> Excel
                    </button>
                </div>` : ''}
            </header>

            <!-- Content Split (Enforces strict vertical gutters and exact screen height) -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
                
                <!-- Left Column (2/3 width) -->
                <div class="lg:col-span-2 flex flex-col gap-4 min-h-0">

                    <!-- Top 3 KPIs -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <!-- Fleet Volume -->
                        <div class="stat-tile flex flex-col justify-between h-24">
                            <div class="stat-strip bg-accent"></div>
                            <span class="stat-label ml-1">Total Fleet Volume</span>
                            <div class="flex justify-between items-end ml-1">
                                <h3 class="stat-value">${stats.totalAssets.toLocaleString()}</h3>
                                <p class="text-[9px] text-emerald-700 font-black flex items-center gap-0.5 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full uppercase tracking-widest">
                                    <span class="material-symbols-outlined text-[10px]">trending_up</span> ${stats.activeAssets} Active
                                </p>
                            </div>
                        </div>
                        <!-- Utilization -->
                        <div class="stat-tile flex flex-col justify-between h-24">
                            <div class="stat-strip bg-emerald-500"></div>
                            <span class="stat-label ml-1">Active Nodes</span>
                            <div class="flex justify-between items-end ml-1">
                                <h3 class="stat-value">${stats.activeAssets}</h3>
                                <span class="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full uppercase tracking-widest">${(stats.activeAssets / stats.totalAssets * 100).toFixed(1)}% Usage</span>
                            </div>
                        </div>
                        <!-- Pending -->
                        <div class="stat-tile flex flex-col justify-between h-24">
                            <div class="stat-strip bg-amber-500"></div>
                            <span class="stat-label ml-1">Maintenance Queue</span>
                            <div class="flex justify-between items-end ml-1">
                                <h3 class="stat-value">${stats.maintenanceAssets}</h3>
                                <span class="text-[9px] text-amber-700 font-black bg-amber-50 border border-amber-100 px-2 py-1 rounded-full uppercase tracking-widest">Awaiting</span>
                            </div>
                        </div>
                    </div>

                    <!-- The Active Asset Registry Table -->
                    <section class="card-accent flex flex-col flex-1 min-h-0">
                        <div class="card-header gap-4 flex-wrap">
                            <h3 class="card-title">Active Asset Registry</h3>
                            <div class="flex items-center gap-3 flex-1 justify-end">
                                <div class="relative max-w-xs w-full">
                                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
                                    <input type="text" oninput="window.filterManagerAssets(this.value)" placeholder="Search identity, class, geo, custodian..." class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:border-accent outline-none transition-all shadow-sm" />
                                </div>
                                ${window.app.canExportAssets() ? `<button onclick="app.exportCSV('assets')" class="px-3 py-2 bg-slate-50 text-[10px] font-bold text-slate-600 rounded-lg hover:bg-slate-100 transition-all border border-slate-200 shrink-0 uppercase tracking-widest flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px]">csv</span> Export</button>` : ''}
                            </div>
                        </div>
                        <div class="overflow-auto max-h-[760px] scroll-container flex-1 bg-white min-h-0">
                            <table class="dense-table relative">
                                <thead class="sticky-header">
                                    <tr>
                                        <th>Asset Identity</th>
                                        <th>Class</th>
                                        <th>Geography</th>
                                        <th>Custodian</th>
                                        <th>State</th>
                                    </tr>
                                </thead>
                                <tbody id="manager-asset-tbody" class="divide-y divide-slate-100">
                                    ${db.assets.map(asset => `
                                        <tr onclick="window.openAssetDetailModal('${asset.id}')" class="group ${asset.status === 'Disposed' ? 'opacity-50 grayscale' : ''}">
                                            <td>
                                                <div class="flex items-center gap-3">
                                                    <div class="compact-icon bg-slate-100 text-slate-400 group-hover:bg-accent group-hover:text-white">
                                                        <span class="material-symbols-outlined text-[14px]">inventory_2</span>
                                                    </div>
                                                    <div class="max-w-[140px]">
                                                        <p class="text-[11px] font-black text-slate-900 group-hover:text-accent multiline-name">${asset.name}</p>
                                                        <p class="text-[9px] text-slate-400 font-bold uppercase">#${asset.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="text-[10px] font-bold text-slate-600">${asset.category}</td>
                                            <td class="text-[10px] font-bold text-slate-600">${asset.location}</td>
                                            <td>
                                                <div class="flex items-center gap-2">
                                                    <div class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[8px] font-black uppercase tracking-tighter shrink-0">${asset.assignedTo ? asset.assignedTo.charAt(0) : '?'}</div>
                                                    <div>
                                                        <p class="text-[10px] font-bold text-slate-800">${asset.assignedTo ? asset.assignedTo.split(' ')[0] : 'Unassigned'}</p>
                                                        <p class="text-[8px] tracking-widest uppercase font-bold text-slate-400">${asset.assignedToId || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span class="px-2 py-0.5 ${asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : asset.status === 'Disposed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-100'} text-[9px] font-bold rounded-full uppercase border">
                                                    ${asset.status}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <!-- Right Column (1/3 width) -->
                <div class="flex flex-col gap-4 min-h-0">

                    <!-- Health KPI Anchor -->
                    <div class="stat-tile flex flex-col justify-between h-24">
                        <div class="stat-strip bg-indigo-500"></div>
                        <span class="stat-label ml-1">Fleet Health Index</span>
                        <div class="flex justify-between items-end ml-1">
                            <h3 class="stat-value text-indigo-600">${stats.totalAssets > 0 ? ((stats.activeAssets / stats.totalAssets) * 100).toFixed(1) : 0}%</h3>
                            <span class="text-[9px] text-indigo-700 font-black bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-full uppercase tracking-widest">${stats.activeAssets === stats.totalAssets ? 'Optimal' : stats.maintenanceAssets > 0 ? 'Needs Attention' : 'Good'}</span>
                        </div>
                    </div>

                    <!-- Requisition Queue -->
                    <div class="card-accent flex flex-col flex-1 min-h-0">
                        <div class="card-header shrink-0">
                            <h3 class="card-title flex items-center gap-2">
                                <span class="material-symbols-outlined text-sm text-slate-400">inbox</span>
                                Authorizations
                            </h3>
                            <div class="flex items-center gap-2">
                                <button onclick="app.exportCSV('requests')" class="px-2 py-1 bg-white border border-slate-200 text-slate-500 rounded text-[8px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm">CSV</button>
                                ${pendingCount > 0 ? `<span class="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black shadow-inner">${pendingCount} Pending</span>` : ''}
                            </div>
                        </div>
                        <div class="divide-y divide-slate-100 overflow-auto max-h-[760px] scroll-container flex-1 bg-white min-h-0">
                            ${allRequests.length > 0 ? allRequests.map(req => {
                                let statusClass = 'bg-amber-50 text-amber-700 border-amber-200';
                                let statusLabel = 'Pending Review';
                                
                                if(req.status === 'Approved') {
                                    statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                    statusLabel = 'Approved';
                                } else if(req.status.startsWith('Rejected')) {
                                    statusClass = 'bg-rose-50 text-rose-700 border-rose-200';
                                    statusLabel = 'Rejected';
                                } else if(req.managerApproved) {
                                    statusClass = 'bg-blue-50 text-blue-700 border-blue-200';
                                    statusLabel = 'Mngr Auth / Pending Fin';
                                }
                                
                                return `
                                    <div onclick="window.openApprovalModal('${req.id}')" class="p-3 hover:bg-slate-50/70 transition-colors cursor-pointer group border-l-4 border-transparent hover:border-indigo-400">
                                        <div class="flex justify-between items-start">
                                            <div class="max-w-[120px]">
                                                <p class="text-[10px] font-black text-slate-900 group-hover:text-indigo-700 transition-colors leading-tight truncate">${req.user}</p>
                                                <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 truncate">${req.category}</p>
                                            </div>
                                            <div class="flex flex-col items-end">
                                                 <span class="text-[8px] font-bold text-slate-400 mb-1">${new Date(req.date).toLocaleDateString()}</span>
                                                 <span class="px-1.5 py-0.5 border rounded-full uppercase tracking-widest font-black text-[7px] ${statusClass}">${statusLabel}</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('') : `
                                <div class="p-10 text-center flex flex-col items-center opacity-50">
                                     <span class="material-symbols-outlined text-4xl mb-2 text-slate-400">check_circle</span>
                                     <p class="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Inbox clear. No historical items.</p>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

            </div>

            <!-- Global Hidden Approval Modal -->
            <div id="approval-detail-modal" class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300">
                 <div id="approval-detail-content" class="bg-white w-full max-w-xl rounded-2xl shadow-2xl scale-95 transition-transform duration-300 flex flex-col overflow-hidden">
                 </div>
            </div>

            <!-- Global Hidden Asset Detail Modal -->
            <div id="asset-detail-modal" class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300">
                 <div id="asset-detail-content" class="bg-white w-full max-w-lg rounded-2xl shadow-2xl scale-95 transition-transform duration-300 flex flex-col overflow-hidden p-6 relative">
                 </div>
            </div>

            <!-- Single Asset PDF Print Container -->
            <div id="pdf-print-container" class="hidden print:block absolute inset-0 bg-white p-12 z-[9999]">
                 <div id="pdf-content"></div>
            </div>

        </div>
    `;
}

// Asset Modal logic
window.openAssetDetailModal = (assetId) => {
    const asset = db.assets.find(a => a.id === assetId);
    if(!asset) return;

    const contentStr = `
        <button onclick="window.closeAssetDetailModal()" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors">
            <span class="material-symbols-outlined text-sm">close</span>
        </button>
        
        <div class="flex items-center gap-4 mb-6 pt-2">
            <div class="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                 <span class="material-symbols-outlined text-2xl">laptop_mac</span>
            </div>
            <div>
                 <h2 class="text-xl font-black text-slate-900 tracking-tight leading-none">${asset.name}</h2>
                 <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">SN #${asset.id}</p>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                 <p class="text-[9px] uppercase tracking-widest font-black text-slate-400">Asset Category</p>
                 <p class="text-xs font-bold text-slate-800 mt-1">${asset.category}</p>
            </div>
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                 <p class="text-[9px] uppercase tracking-widest font-black text-slate-400">Deployment Hub</p>
                 <p class="text-xs font-bold text-slate-800 mt-1">${asset.location}</p>
            </div>
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                 <p class="text-[9px] uppercase tracking-widest font-black text-slate-400">Value Marker</p>
                 <p class="text-xs font-bold text-emerald-600 mt-1">₹${(Number(window.app?.computeAssetDepreciation?.(asset)?.gross) || 0).toLocaleString('en-IN')}</p>
            </div>
            <div class="bg-slate-50 p-3 rounded-lg border border-slate-100">
                 <p class="text-[9px] uppercase tracking-widest font-black text-slate-400">Health Index</p>
                 <p class="text-xs font-bold text-indigo-600 mt-1">${asset.health}</p>
            </div>
        </div>

        <div class="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center gap-4">
             <div class="w-10 h-10 rounded-full bg-white text-indigo-600 flex items-center justify-center font-black shadow-sm">${asset.assignedTo ? asset.assignedTo.charAt(0) : '?'}</div>
             <div>
                  <p class="text-[9px] uppercase font-black tracking-widest text-indigo-400 mb-0.5">Current Custodian</p>
                  <p class="text-sm font-bold text-indigo-900">${asset.assignedTo || 'Unassigned'}</p>
                  <p class="text-[10px] text-indigo-500 font-bold tracking-widest uppercase">${asset.assignedToDesignation || ''} ${asset.assignedToId ? `(${asset.assignedToId})` : ''}</p>
             </div>
        </div>

        <!-- Transfer Timeline -->
        <div class="mt-6 border-t border-slate-100 pt-6">
            <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 pb-1">Chain of Custody Timeline</h4>
            <div class="space-y-4 border-l-2 border-slate-100 ml-2 pl-4 relative max-h-52 overflow-y-auto pr-2">
                ${db.transfers.filter(t => t.assetId === assetId).map((tx, idx) => `
                    <div class="relative">
                        <div class="absolute -left-[1.35rem] top-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white shadow-sm ring-2 ring-indigo-50"></div>
                        <div class="bg-slate-50 border border-slate-100 rounded-lg p-3">
                             <div class="flex justify-between items-start mb-1">
                                  <p class="text-[10px] font-black text-slate-900 leading-none">${tx.toAssignee}</p>
                                  <p class="text-[8px] font-bold tracking-widest text-slate-400 uppercase">${new Date(tx.date).toLocaleDateString()}</p>
                             </div>
                             <p class="text-[9px] font-medium text-slate-500 italic">Deployed: ${tx.toLocation}</p>
                        </div>
                    </div>
                `).join('') || '<div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-4 bg-slate-50 rounded-lg border border-slate-100 border-dashed">No Historical Ledgers Found</div>'}
            </div>
        </div>

        <div class="mt-6 pt-6 border-t border-slate-100">
             <button onclick="window.exportAssetPDF('${asset.id}')" class="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10">
                 <span class="material-symbols-outlined text-sm">picture_as_pdf</span> Generate Dossier
             </button>
        </div>
    `;

    document.getElementById('asset-detail-content').innerHTML = contentStr;
    const modal = document.getElementById('asset-detail-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    document.getElementById('asset-detail-content').classList.remove('scale-95');
};

window.closeAssetDetailModal = () => {
    const modal = document.getElementById('asset-detail-modal');
    modal.classList.add('opacity-0');
    document.getElementById('asset-detail-content').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.exportAssetPDF = (assetId) => {
    const asset = db.assets.find(a => a.id === assetId);
    if (!asset) return;

    const transfers = db.transfers.filter(t => t.assetId === assetId);
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const pdfHtml = `
        <div class="max-w-4xl mx-auto font-sans text-slate-900 bg-white min-h-screen">
            <div class="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-8 pt-8">
                <div>
                    <h1 class="text-4xl font-black uppercase tracking-tight">Asset Dossier</h1>
                    <p class="text-xs uppercase tracking-widest text-slate-500 font-bold mt-2">Institutional Ledger — Confidentially Generated</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-black uppercase tracking-widest text-indigo-600">${asset.id}</p>
                    <p class="text-xs font-black uppercase tracking-widest text-slate-500 mt-2">${date}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-10 mb-12 border-b border-slate-200 pb-12">
                 <div>
                    <p class="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Hardware Specifications</p>
                    <p class="text-2xl font-black text-slate-900">${asset.name}</p>
                    <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">${asset.category}</p>
                 </div>
                 <div class="text-right">
                    <p class="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">Liability Ledger Valuation</p>
                    <p class="text-2xl font-black tabular-nums">₹${(Number(window.app?.computeAssetDepreciation?.(asset)?.gross) || 0).toLocaleString('en-IN')}</p>
                    <p class="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Status: ${asset.status}</p>
                 </div>
            </div>
            
            <div class="mb-12">
                 <p class="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-6 border-b border-slate-100 pb-2">Active Custody & Deployment Matrix</p>
                 <div class="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex items-center gap-6">
                      <div class="flex-1">
                          <p class="text-sm font-black text-indigo-900 leading-none uppercase tracking-tight">${asset.assignedTo || 'Unassigned'}</p>
                          <p class="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">${asset.assignedToDesignation || ''} ${asset.assignedToId ? `(${asset.assignedToId})` : ''}</p>
                      </div>
                      <div class="text-right border-l border-indigo-200 pl-6">
                          <p class="text-[10px] font-black tracking-widest text-indigo-400 uppercase mb-1">Assigned Node</p>
                          <p class="text-sm font-bold text-indigo-900 uppercase">${asset.location}</p>
                      </div>
                 </div>
            </div>

            <div>
                <p class="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-6 border-b border-slate-100 pb-2">Historical Chain of Custody (Ledger Record)</p>
                <table class="w-full text-left text-sm border-collapse mt-4 sortable-table">
                    <thead>
                        <tr class="bg-slate-100 border-y border-slate-300">
                            <th class="py-3 px-4 font-black uppercase tracking-widest text-[10px] text-slate-500">Date Logged</th>
                            <th class="py-3 px-4 font-black uppercase tracking-widest text-[10px] text-slate-500">Previous Custodian</th>
                            <th class="py-3 px-4 font-black uppercase tracking-widest text-[10px] text-slate-500">New Custodian</th>
                            <th class="py-3 px-4 font-black uppercase tracking-widest text-[10px] text-slate-500 text-right">Deployment Location</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                        ${transfers.map(tx => `
                            <tr>
                                <td class="py-4 px-4 font-bold tabular-nums">${new Date(tx.date).toLocaleDateString()}</td>
                                <td class="py-4 px-4 text-slate-600">${tx.fromAssignee}</td>
                                <td class="py-4 px-4 text-slate-900 font-bold">${tx.toAssignee}</td>
                                <td class="py-4 px-4 text-right font-medium text-slate-600">${tx.toLocation}</td>
                            </tr>
                        `).join('') || `<tr><td colspan="4" class="py-8 text-center text-xs font-bold text-slate-400 italic">No historical records appended to this asset profile.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
        <style>
           @media print {
               body * { visibility: hidden; }
               #pdf-print-container, #pdf-print-container * { visibility: visible; }
               #pdf-print-container { position: absolute; left: 0; top: 0; width: 100%; width: 100vw; background: white; margin: 0; padding: 0.5in; }
               aside, header { display: none !important; }
           }
        </style>
    `;
    
    document.getElementById('pdf-content').innerHTML = pdfHtml;
    
    window.closeAssetDetailModal();
    setTimeout(() => {
        window.print();
        document.getElementById('pdf-content').innerHTML = '';
    }, 200);
};

// Global scope logic for Manager authorizations mapped out of modals
window.openApprovalModal = (reqId) => {
    const req = db.requests.find(r => r.id === reqId);
    if(!req) return;

    const contentStr = `
        <div class="card-header">
            <div>
                 <h3 class="card-title flex items-center gap-2"><span class="material-symbols-outlined text-indigo-500">gavel</span> Authorization Review</h3>
                 <p class="card-meta">Requisition Identity: #${req.id}</p>
            </div>
            <button onclick="window.closeApprovalModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        </div>

        <div class="p-6 space-y-4">
            <div class="flex items-center gap-4 border border-slate-100 p-4 rounded-xl shadow-sm bg-white">
                <div class="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                     <span class="material-symbols-outlined">person</span>
                </div>
                <div class="flex-1">
                     <p class="text-[9px] uppercase font-black tracking-widest text-slate-400">Requesting Personnel</p>
                     <p class="text-lg font-bold text-slate-900 leading-tight">${req.user}</p>
                </div>
                <div class="text-right border-l border-slate-100 pl-4">
                     <p class="text-[9px] uppercase font-black tracking-widest text-slate-400">Asset Profile</p>
                     <p class="text-sm font-bold text-indigo-600 leading-tight">${req.category}</p>
                </div>
            </div>

            <div class="bg-slate-50 p-5 rounded-xl border border-slate-100 relative">
                <span class="material-symbols-outlined text-slate-200 absolute right-4 top-4 text-4xl pointer-events-none">format_quote</span>
                <p class="text-[9px] uppercase font-black tracking-widest text-slate-400 mb-2 relative z-10">Submitted Justification</p>
                <p class="text-sm font-medium text-slate-700 leading-relaxed relative z-10 italic">"${req.reason}"</p>
            </div>
            
            ${req.financeApproved ? `
                <div class="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                     <span class="material-symbols-outlined text-emerald-500 text-sm">verified_user</span>
                     <div>
                          <p class="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Finance Tier Approved</p>
                     </div>
                </div>
            ` : `
                <div class="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                     <span class="material-symbols-outlined text-amber-500 text-sm">schedule</span>
                     <div>
                          <p class="text-[10px] font-black text-amber-700 uppercase tracking-widest">Finance Tier Pending / Unknown</p>
                     </div>
                </div>
            `}
        </div>

        <div class="card-header border-t border-slate-100 border-b-0 flex justify-end gap-3">
             ${req.status === 'Approved' ? `
                 <button onclick="window.closeApprovalModal()" class="btn-ghost">Dismiss</button>
                 <button onclick="window.closeApprovalModal(); app.showProcureAssetModal('${req.id}')" class="btn-primary bg-emerald-600 hover:bg-emerald-700">
                     <span class="material-symbols-outlined text-sm">shopping_cart</span> Procure Asset
                 </button>
             ` : req.status.startsWith('Rejected') ? `
                 <button onclick="window.closeApprovalModal()" class="btn-ghost">Close Record</button>
             ` : `
                 <button onclick="window.rejectReqManager('${req.id}')" class="btn-warn">
                     Deny Request
                 </button>
                 ${!req.managerApproved ? `
                     <button onclick="window.approveReqManager('${req.id}')" class="btn-primary bg-indigo-600 hover:bg-indigo-700">
                         <span class="material-symbols-outlined text-sm">check_circle</span> Authorize Requisition
                     </button>
                 ` : ''}
             `}
        </div>
    `;

    document.getElementById('approval-detail-content').innerHTML = contentStr;
    const modal = document.getElementById('approval-detail-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    document.getElementById('approval-detail-content').classList.remove('scale-95');
};

window.closeApprovalModal = () => {
    const modal = document.getElementById('approval-detail-modal');
    modal.classList.add('opacity-0');
    document.getElementById('approval-detail-content').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.approveReqManager = (id) => {
    const req = db.requests.find(r => r.id === id);
    if (req && req.type === 'transfer') {
        db.approveTransferRequest(id);
    } else {
        db.approveRequestManager(id);
    }
    window.closeApprovalModal();
    setTimeout(() => window.app.render(), 300); // Wait for modal animation to visually disappear before destroying DOM
};

window.rejectReqManager = (id) => {
    const req = db.requests.find(r => r.id === id);
    if (req && req.type === 'transfer') {
        db.rejectTransferRequest(id);
    } else {
        db.rejectRequestManager(id);
    }
    window.closeApprovalModal();
    setTimeout(() => window.app.render(), 300);
};
