import { db } from '../mock/db.js';

export function renderManagerDashboard() {
    const stats = db.getStats();
    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <!-- Metrics Row -->
            <section class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <!-- Fleet Volume -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-accent"></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label">Total Fleet Volume</span>
                    <div class="mt-4">
                        <h3 class="text-3xl font-extrabold text-slate-900">${stats.totalAssets.toLocaleString()}</h3>
                        <p class="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                            <span class="material-symbols-outlined text-xs">trending_up</span> +2.4% vs last month
                        </p>
                    </div>
                </div>
                <!-- Utilization -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-500"></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label">Utilization Status</span>
                    <div class="mt-4 space-y-3">
                        <div class="flex justify-between items-end">
                            <span class="text-[10px] font-bold text-slate-400 uppercase">Active</span>
                            <span class="text-lg font-bold">${stats.activeAssets}</span>
                        </div>
                        <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-emerald-500" style="width: ${(stats.activeAssets / stats.totalAssets * 100).toFixed(1)}%"></div>
                        </div>
                    </div>
                </div>
                <!-- Pending -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-amber-500"></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label">Maintenance Pending</span>
                    <div class="mt-4">
                        <h3 class="text-3xl font-extrabold text-slate-900">${stats.maintenanceAssets}</h3>
                        <div class="mt-2">
                             <span class="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded uppercase border border-amber-100">Awaiting Service</span>
                        </div>
                    </div>
                </div>
                <!-- Health -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-[4px] bg-indigo-500"></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-label">Fleet Health Index</span>
                    <div class="mt-4">
                        <h3 class="text-3xl font-extrabold text-indigo-600">98.2%</h3>
                        <p class="text-[10px] text-slate-400 font-medium mt-1 italic">Optimal Performance</p>
                    </div>
                </div>
            </section>

            <!-- Regional & Alerts -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Distribution -->
                <div class="lg:col-span-2 space-y-6">
                    <div class="flex items-center justify-between">
                        <h4 class="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Regional Distribution</h4>
                        <button class="text-[10px] font-bold text-accent hover:underline">View Global Map</button>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="relative overflow-hidden rounded-xl h-40 group cursor-pointer border border-slate-100">
                             <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_vzng1gLsP-p8lnfm7p9u7q_6ykboKifmubKk1JvDk3t6yZjDulPn4SoQ3yeyi9fVU4liC2RMspZ3x4vwxkPnD6gTHA9Hy3iUl3kbj53C4K8Wb5M43kaNLDbHLEJQ6WR8GTQH6buSZSoNqrELLi4w9Q6I7eQDx5XOseSuUOgmqBgpqJyoWRSrVsYlrizVHX2DBa98QbdzVwoDwvkXgl5I8dWlyvz7F-xvjupEGITkjDOvsbcLGwscsMmCrqZBRejm6ADvf2svAZ0" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70" />
                             <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                             <div class="absolute bottom-4 left-4">
                                <p class="text-[10px] font-bold text-blue-300 uppercase tracking-widest">North America</p>
                                <p class="text-lg font-bold text-white">5,120 Units</p>
                             </div>
                        </div>
                        <div class="relative overflow-hidden rounded-xl h-40 group cursor-pointer border border-slate-100">
                             <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCvG5nHHvBYp_wUKUNLIDOWVJItGCAgrO2mQd530WRuQ88W9pIMxwvW3Ae_CD3TiYPaDm6ZI8XLMzodlwqyBJvgkXyeaCRxav5sV1GPaXj-6A5SQNEtB5UN3hhLFgSn7ESu-AryASxLyrJ9OsNO0grFOiIRTW7Sv0aNgKbUFIVf7UzEkMJTB6cTyankxfx0tExNl4tcV6gwVWBVDnqTdCUZD_3pWj3Y-gkGRpnphctbRB2j25ZWJuCY_FuFHy7S3hqkkys1lhfTzBs" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70" />
                             <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                             <div class="absolute bottom-4 left-4">
                                <p class="text-[10px] font-bold text-blue-300 uppercase tracking-widest">EMEA Region</p>
                                <p class="text-lg font-bold text-white">4,284 Units</p>
                             </div>
                        </div>
                        <div class="relative overflow-hidden rounded-xl h-40 group cursor-pointer border border-slate-100">
                             <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFgK8Swj2_8_g9K0ay3Q5uxytX6g3NY2xrGhyuXqz5xuSo5RrtkzGxWjgRaHtKRAv7Op6Yt5h5fTvNuOap6jr6LbufvtIea_7AHqxFhPCmork6PgmpvLZg44yFEXF81jj_XkhW7Csa-Fbd2ifFDPGZmdSv67X-p1ag8EyCAnFOnGBYRyYkgxtlpTwiEmvMs1u7NQtysebOn6IYkISOtWLZh0bTrurr04pQ5fPNpWIeM8Ihr4cn6qhxFHDDHAEeaZ_LsfhQ6wT9NgM" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-70" />
                             <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                             <div class="absolute bottom-4 left-4">
                                <p class="text-[10px] font-bold text-blue-300 uppercase tracking-widest">APAC Logistics</p>
                                <p class="text-lg font-bold text-white">3,438 Units</p>
                             </div>
                        </div>
                    </div>
                </div>
                <!-- Alerts -->
                <div class="space-y-6">
                    <div class="flex items-center justify-between">
                        <h4 class="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">Critical Alerts</h4>
                        <span class="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">2 NEW</span>
                    </div>
                    <div class="space-y-3">
                         <div class="bg-rose-50 p-4 border-l-4 border-rose-500 rounded-r-xl flex gap-3">
                             <span class="material-symbols-outlined text-rose-500 text-lg">report</span>
                             <div>
                                 <p class="text-xs font-bold text-rose-900">Critical Malfunction</p>
                                 <p class="text-[10px] text-rose-700 mt-0.5 leading-relaxed">Turbine #402 reporting catastrophic pressure drop in Sector G.</p>
                                 <p class="text-[9px] text-rose-500 font-bold mt-2 uppercase">2 mins ago</p>
                             </div>
                         </div>
                         <div class="bg-slate-100 p-4 border-l-4 border-slate-400 rounded-r-xl flex gap-3">
                             <span class="material-symbols-outlined text-slate-500 text-lg">local_shipping</span>
                             <div>
                                 <p class="text-xs font-bold text-slate-900">Logistics Delay</p>
                                 <p class="text-[10px] text-slate-600 mt-0.5 leading-relaxed">Atlantic storm causing 72h delay for Batch #9812.</p>
                                 <p class="text-[9px] text-slate-500 font-bold mt-2 uppercase">2 hours ago</p>
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            <!-- Asset table -->
            <section class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Main Registry -->
                <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-fit">
                    <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Active Asset Registry</h3>
                        <div class="flex gap-2">
                            <button onclick="app.exportCSV('assets')" class="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-600 rounded-lg hover:bg-slate-100 transition-all border border-slate-200">Export CSV</button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <tbody class="divide-y divide-slate-100">
                                ${db.assets.map(asset => `
                                    <tr class="hover:bg-slate-50/50 transition-all cursor-pointer group">
                                        <td class="px-8 py-4">
                                            <div class="flex items-center gap-3">
                                                <div class="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-accent group-hover:text-white transition-all">
                                                    <span class="material-symbols-outlined text-sm">inventory_2</span>
                                                </div>
                                                <div>
                                                    <p class="text-xs font-bold text-slate-900">${asset.name}</p>
                                                    <p class="text-[9px] text-slate-400 font-bold uppercase">#${asset.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-8 py-4 text-xs text-slate-600">${asset.category}</td>
                                        <td class="px-8 py-4 text-xs text-slate-600">${asset.location}</td>
                                        <td class="px-8 py-4">
                                            <span class="px-2 py-0.5 ${asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'} text-[9px] font-bold rounded uppercase border">
                                                ${asset.status}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Requisition Queue -->
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-fit">
                    <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Pending Approval</h3>
                        <span class="bg-amber-500 text-white text-[9px] px-2 py-1 rounded-full font-black">${db.requests.filter(r => r.status === 'Pending').length}</span>
                    </div>
                    <div class="divide-y divide-slate-100">
                        ${db.requests.filter(r => r.status === 'Pending').length > 0 ? db.requests.filter(r => r.status === 'Pending').map(req => `
                            <div class="p-6 space-y-4 hover:bg-slate-50/50 transition-all">
                                <div class="flex justify-between items-start">
                                    <div>
                                        <p class="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">${req.category}</p>
                                        <p class="text-xs font-bold text-slate-900 mt-1">${req.user}</p>
                                    </div>
                                    <span class="text-[9px] font-bold text-slate-400 italic">${new Date(req.date).toLocaleDateString()}</span>
                                </div>
                                <p class="text-[10px] text-slate-500 leading-relaxed italic bg-slate-50 p-3 rounded-lg border border-slate-100">"${req.reason}"</p>
                                <div class="flex gap-2">
                                    <button onclick="approveReq('${req.id}')" class="flex-1 py-2 bg-emerald-500 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-600 transition-all uppercase tracking-widest shadow-sm shadow-emerald-500/20">Approve</button>
                                    <button onclick="rejectReq('${req.id}')" class="flex-1 py-2 bg-white border border-slate-200 text-[10px] font-bold text-slate-400 rounded-lg hover:border-rose-500 hover:text-rose-500 transition-all uppercase tracking-widest">Reject</button>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="p-10 text-center text-[10px] text-slate-400 uppercase tracking-widest italic">All requests processed</div>
                        `}
                    </div>
                </div>
            </section>
        </div>
    `;
}

// Global actions for Manager
window.approveReq = (id) => {
    db.approveRequest(id);
    window.app.render();
};

window.rejectReq = (id) => {
    db.rejectRequest(id);
    window.app.render();
};
