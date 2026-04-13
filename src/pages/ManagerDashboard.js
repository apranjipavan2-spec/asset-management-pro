import { db } from '../mock/db.js';

export function renderManagerDashboard() {
    const stats = db.getStats();
    
    // Requests Logic
    const allRequests = [...db.requests].sort((a,b) => new Date(b.date) - new Date(a.date));
    const pendingCount = allRequests.filter(r => !r.managerApproved && !r.status.startsWith('Rejected')).length;

    return `
        <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-128px)] flex flex-col min-h-0">
            <!-- Content Split (Enforces strict vertical gutters and exact screen height) -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                
                <!-- Left Column (2/3 width) -->
                <div class="lg:col-span-2 flex flex-col gap-6 min-h-0">

                    <!-- Top 3 KPIs -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <!-- Fleet Volume -->
                        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden flex flex-col justify-between h-24">
                            <div class="absolute left-0 top-0 bottom-0 w-1 bg-accent shadow-[0_0_10px_rgba(6,81,237,0.5)]"></div>
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Fleet Volume</span>
                            <div class="flex justify-between items-end ml-1">
                                <h3 class="text-3xl font-black text-slate-900 leading-none tracking-tighter">${stats.totalAssets.toLocaleString()}</h3>
                                <p class="text-[9px] text-emerald-700 font-black flex items-center gap-0.5 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full uppercase tracking-widest">
                                    <span class="material-symbols-outlined text-[10px]">trending_up</span> +2.4%
                                </p>
                            </div>
                        </div>
                        <!-- Utilization -->
                        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden flex flex-col justify-between h-24">
                            <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Active Nodes</span>
                            <div class="flex justify-between items-end ml-1">
                                <h3 class="text-3xl font-black text-slate-900 leading-none tracking-tighter">${stats.activeAssets}</h3>
                                <span class="text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full uppercase tracking-widest">${(stats.activeAssets / stats.totalAssets * 100).toFixed(1)}% Usage</span>
                            </div>
                        </div>
                        <!-- Pending -->
                        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden flex flex-col justify-between h-24">
                            <div class="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Maintenance Queue</span>
                            <div class="flex justify-between items-end ml-1">
                                <h3 class="text-3xl font-black text-slate-900 leading-none tracking-tighter">${stats.maintenanceAssets}</h3>
                                <span class="text-[9px] text-amber-700 font-black bg-amber-50 border border-amber-100 px-2 py-1 rounded-full uppercase tracking-widest">Awaiting</span>
                            </div>
                        </div>
                    </div>

                    <!-- The Active Asset Registry Table -->
                    <section class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
                        <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20">
                            <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Active Asset Registry</h3>
                            <button onclick="app.exportCSV('assets')" class="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-600 rounded-lg hover:bg-slate-100 transition-all border border-slate-200">Export CSV</button>
                        </div>
                        <div class="overflow-y-auto flex-1 bg-white min-h-0">
                            <table class="w-full text-left relative">
                                <thead class="bg-slate-50/80 backdrop-blur top-0 sticky z-10">
                                    <tr>
                                        <th class="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Asset Identity</th>
                                        <th class="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Class</th>
                                        <th class="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Geography</th>
                                        <th class="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Custodian</th>
                                        <th class="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">State</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100">
                                    ${db.assets.map(asset => `
                                        <tr onclick="window.openAssetDetailModal('${asset.id}')" class="hover:bg-slate-50/50 transition-all group cursor-pointer">
                                            <td class="px-6 py-3">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-accent group-hover:text-white transition-all">
                                                        <span class="material-symbols-outlined text-[14px]">inventory_2</span>
                                                    </div>
                                                    <div>
                                                        <p class="text-xs font-bold text-slate-900 group-hover:text-accent">${asset.name}</p>
                                                        <p class="text-[9px] text-slate-400 font-bold uppercase">#${asset.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-3 text-[11px] font-bold text-slate-600">${asset.category}</td>
                                            <td class="px-6 py-3 text-[11px] font-bold text-slate-600">${asset.location}</td>
                                            <td class="px-6 py-3">
                                                <div class="flex items-center gap-2">
                                                    <div class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[8px] font-black uppercase tracking-tighter shrink-0">${asset.assignedTo ? asset.assignedTo.charAt(0) : '?'}</div>
                                                    <div>
                                                        <p class="text-[10px] font-bold text-slate-800">${asset.assignedTo ? asset.assignedTo.split(' ')[0] : 'Unassigned'}</p>
                                                        <p class="text-[8px] tracking-widest uppercase font-bold text-slate-400">${asset.assignedToId || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-3">
                                                <span class="px-2 py-0.5 ${asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'} text-[9px] font-bold rounded uppercase border">
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
                <div class="flex flex-col gap-6 min-h-0">

                    <!-- Health KPI Anchor -->
                    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden flex flex-col justify-between h-24">
                        <div class="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fleet Health Index</span>
                        <div class="flex justify-between items-end ml-1">
                            <h3 class="text-3xl font-black text-indigo-600 leading-none tracking-tighter">98.2%</h3>
                            <span class="text-[9px] text-indigo-700 font-black bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-full uppercase tracking-widest">Optimal Status</span>
                        </div>
                    </div>

                    <!-- Requisition Queue -->
                    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col flex-1 min-h-0">
                        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 z-20">
                            <h3 class="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <span class="material-symbols-outlined text-sm text-slate-400">inbox</span> 
                                Authorizations
                            </h3>
                            <div class="flex items-center gap-2">
                                <button onclick="app.exportCSV('requests')" class="px-2 py-1 bg-white border border-slate-200 text-slate-500 rounded text-[8px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-sm">CSV</button>
                                ${pendingCount > 0 ? `<span class="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black shadow-inner">${pendingCount} Pending</span>` : ''}
                            </div>
                        </div>
                        <div class="divide-y divide-slate-100 overflow-y-auto flex-1 bg-white min-h-0">
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
                                    <div onclick="window.openApprovalModal('${req.id}')" class="p-4 hover:bg-slate-50/70 transition-colors cursor-pointer group border-l-4 border-transparent hover:border-indigo-400">
                                        <div class="flex justify-between items-start">
                                            <div>
                                                <p class="text-[11px] font-bold text-slate-900 group-hover:text-indigo-700 transition-colors leading-none">${req.user}</p>
                                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">${req.category}</p>
                                            </div>
                                            <div class="flex flex-col items-end">
                                                 <span class="text-[9px] font-bold text-slate-400 mb-1">${new Date(req.date).toLocaleDateString()}</span>
                                                 <span class="px-1.5 py-0.5 border rounded uppercase tracking-widest font-black text-[8px] ${statusClass}">${statusLabel}</span>
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
                 <p class="text-xs font-bold text-emerald-600 mt-1">$${parseFloat(asset.amount).toLocaleString()}</p>
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
                    <p class="text-2xl font-black tabular-nums">₹${parseFloat(asset.amount).toLocaleString()}</p>
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
                <table class="w-full text-left text-sm border-collapse mt-4">
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
        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center relative">
            <div>
                 <h3 class="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2"><span class="material-symbols-outlined text-indigo-500">gavel</span> Authorization Review</h3>
                 <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Requisition Identity: #${req.id}</p>
            </div>
            <button onclick="window.closeApprovalModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        </div>
        
        <div class="p-8 space-y-6">
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

        <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
             ${req.status === 'Approved' || req.status.startsWith('Rejected') ? `
                 <button onclick="window.closeApprovalModal()" class="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors uppercase tracking-widest">Close Record</button>
             ` : `
                 <button onclick="window.rejectReqManager('${req.id}')" class="px-5 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 transition-colors top-action text-xs font-black uppercase tracking-widest shadow-sm">
                     Deny Request
                 </button>
                 
                 ${!req.managerApproved ? `
                     <button onclick="window.approveReqManager('${req.id}')" class="px-5 py-2.5 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 transition-colors top-action text-xs font-black uppercase tracking-widest flex items-center gap-2">
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
    db.approveRequestManager(id);
    window.closeApprovalModal();
    setTimeout(() => window.app.render(), 300); // Wait for modal animation to visually disappear before destroying DOM
};

window.rejectReqManager = (id) => {
    db.rejectRequestManager(id);
    window.closeApprovalModal();
    setTimeout(() => window.app.render(), 300);
};
