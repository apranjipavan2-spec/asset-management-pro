import { db } from '../mock/db.js';

export function renderEmployeeDashboard(user) {
    // Prefer ID match (stable) over name match (fragile if a user is renamed).
    // Keep name as fallback so the view still works when the custodian backfill
    // populates `assignedTo` but not `assignedToId` for some rows.
    const myAssets = db.assets.filter(a =>
        (user.empId && (a.assignedToId === user.empId || a.assignedToId === user.id)) ||
        (user.id && a.assignedToId === user.id) ||
        (a.assignedTo && a.assignedTo === user.name)
    );
    return `
        <div class="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <!-- Quick stats -->
            <section class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <!-- Assets count -->
                <div class="bg-white p-3.5 rounded-lg shadow-sm border border-slate-100 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-accent"></div>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assigned Assets</span>
                    <div class="mt-1 flex items-center justify-between">
                        <h3 class="text-2xl font-extrabold text-slate-900">${myAssets.length}</h3>
                        <span class="material-symbols-outlined text-slate-200 text-3xl">inventory</span>
                    </div>
                </div>
                <!-- Reports count -->
                <div class="bg-white p-3.5 rounded-lg shadow-sm border border-slate-100 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-500"></div>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Issues</span>
                    <div class="mt-1 flex items-center justify-between">
                        <h3 class="text-2xl font-extrabold text-slate-900">${db.maintenanceLogs.filter(l => l.reporter === user.name && l.status !== 'Resolved').length}</h3>
                        <span class="material-symbols-outlined text-slate-200 text-3xl">report</span>
                    </div>
                </div>
                <!-- Recent Request -->
                <div class="bg-white p-3.5 rounded-lg shadow-sm border border-slate-100 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500"></div>
                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pending Requests</span>
                    <div class="mt-1 flex items-center justify-between">
                        <h3 class="text-2xl font-extrabold text-slate-900">${db.requests.filter(r => r.user === user.name && r.status.includes('Pending')).length}</h3>
                        <span class="material-symbols-outlined text-slate-200 text-3xl">shopping_cart</span>
                    </div>
                </div>
            </section>

            <!-- Assets Table -->
            <section class="bg-white rounded-xl border border-accent/30 shadow-sm overflow-hidden hover:border-accent transition-all flex flex-col flex-1 min-h-0">
                <div class="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                    <h3 class="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest">Equipment Assigned to You</h3>
                    <button onclick="app.navigateTo('request')" class="px-3 py-1 bg-accent text-white text-[9px] font-bold rounded-md hover:bg-primary transition-all uppercase tracking-widest">New Asset Request</button>
                </div>
                <div class="overflow-auto flex-1 scroll-container">
                    <table class="dense-table">
                        <thead class="sticky-header">
                            <tr>
                                <th>Equipment Model</th>
                                <th>Location</th>
                                <th>Condition</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${myAssets.length > 0 ? myAssets.map(asset => `
                                <tr class="group">
                                    <td>
                                        <div class="flex items-center gap-3">
                                            <div class="compact-icon bg-slate-100 text-slate-400 group-hover:bg-accent group-hover:text-white">
                                                <span class="material-symbols-outlined text-sm">laptop_mac</span>
                                            </div>
                                            <div class="max-w-[200px]">
                                                <p class="text-[11px] font-black text-slate-900 multiline-name">${asset.name}</p>
                                                <p class="text-[9px] text-slate-400 font-bold uppercase">ID: ${asset.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="text-[10px] font-bold text-slate-600">${asset.location}</td>
                                    <td>
                                        <div class="flex items-center gap-2">
                                            <div class="w-1.5 h-1.5 rounded-full ${asset.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}"></div>
                                            <span class="text-[10px] font-bold text-slate-900">${asset.status === 'Active' ? 'Operational' : 'Issue Reported'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button onclick="app.navigateTo('issues')" class="px-2 py-1 bg-white border border-slate-200 text-[8px] font-black text-slate-500 rounded uppercase hover:bg-slate-50 hover:text-rose-600 transition-all">Report Problem</button>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="4" class="px-4 py-6 text-center text-xs text-slate-400 italic">No assets currently assigned.</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    `;
}
