import { db } from '../mock/db.js';

export function renderEmployeeDashboard(user) {
    const myAssets = db.assets.filter(a => a.assignedTo === user.name);
    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <header class="flex items-end justify-between">
                <div>
                    <h2 class="text-3xl text-slate-900">Welcome Back, ${user.name.split(' ')[0]}</h2>
                    <p class="text-slate-500 text-sm mt-1">Institutional Grade Portal | All systems operational</p>
                </div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                    Last Session: 4h ago
                </div>
            </header>

            <!-- Quick stats -->
            <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Assets count -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-accent"></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label font-bold">Assigned Assets</span>
                    <div class="mt-4 flex items-center justify-between">
                        <h3 class="text-3xl font-extrabold text-slate-900">${myAssets.length}</h3>
                        <span class="material-symbols-outlined text-slate-100 text-4xl">inventory</span>
                    </div>
                </div>
                <!-- Reports count -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-rose-500"></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label font-bold">Active Issues</span>
                    <div class="mt-4 flex items-center justify-between">
                        <h3 class="text-3xl font-extrabold text-slate-900">${db.maintenanceLogs.filter(l => l.reporter === user.name && l.status !== 'Resolved').length}</h3>
                        <span class="material-symbols-outlined text-slate-100 text-4xl">report</span>
                    </div>
                </div>
                <!-- Recent Request -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-500"></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label font-bold">Pending Requests</span>
                    <div class="mt-4 flex items-center justify-between">
                        <h3 class="text-3xl font-extrabold text-slate-900">${db.requests.filter(r => r.user === user.name && r.status.includes('Pending')).length}</h3>
                        <span class="material-symbols-outlined text-slate-100 text-4xl">shopping_cart</span>
                    </div>
                </div>
            </section>

            <!-- Assets Table -->
            <section class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Equipment Assigned to You</h3>
                    <button onclick="app.navigateTo('request')" class="px-4 py-1.5 bg-accent text-white text-[10px] font-bold rounded-lg hover:bg-primary transition-all">New Asset Request</button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label">Equipment Model</th>
                                <th class="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label">Location</th>
                                <th class="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label">Condition</th>
                                <th class="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100">
                            ${myAssets.length > 0 ? myAssets.map(asset => `
                                <tr class="hover:bg-slate-50/50 transition-all group">
                                    <td class="px-8 py-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-accent group-hover:text-white transition-all">
                                                <span class="material-symbols-outlined text-sm">laptop_mac</span>
                                            </div>
                                            <div>
                                                <p class="text-xs font-bold text-slate-900">${asset.name}</p>
                                                <p class="text-[9px] text-slate-400 font-bold uppercase">ID: ${asset.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-8 py-4 text-xs text-slate-600">${asset.location}</td>
                                    <td class="px-8 py-4">
                                        <div class="flex items-center gap-2">
                                            <div class="w-2 h-2 rounded-full ${asset.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}"></div>
                                            <span class="text-xs font-bold text-slate-900">${asset.status === 'Active' ? 'Operational' : 'Issue Reported'}</span>
                                        </div>
                                    </td>
                                    <td class="px-8 py-4">
                                        <button onclick="app.navigateTo('issues')" class="px-3 py-1 bg-white border border-slate-200 text-[9px] font-bold text-slate-500 rounded hover:bg-slate-50 hover:text-rose-600 transition-all">Report Problem</button>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="4" class="px-8 py-10 text-center text-sm text-slate-400 italic">No assets currently assigned.</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    `;
}
