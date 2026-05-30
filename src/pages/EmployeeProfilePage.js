import { db } from '../mock/db.js';

export function renderEmployeeProfilePage(user, targetId) {
    const target = db.users.find(u => u.empId === targetId || u.id === targetId);
    if (!target) return '<div class="p-20 text-center">Identity Not Found</div>';

    // Verify permission to view this specific target
    const isHR = window.app.hasPermission('manage_users');
    const isManager = window.app.hasPermission('manage_team') && target.reportsTo === user.empId;
    const isSelf = target.empId === user.empId;
    
    if (!isHR && !isManager && !isSelf) {
        return window.app.renderUnauthorized();
    }

    const assets = db.assets.filter(a => a.assignedToId === target.empId);
    const attendance = db.attendance.filter(a => a.empId === target.empId);
    const reviews = db.performanceReviews.filter(r => r.empId === target.empId && r.status === 'Published');
    const tasks = db.tasks.filter(t => t.assignedTo === target.empId);

    const healthAvg = assets.length > 0 ? assets.reduce((acc, a) => acc + parseInt(a.health), 0) / assets.length : 100;

    return `
    <div class="space-y-8 animate-fade-in-up pb-10">
        <!-- Header Profile Card -->
        <div class="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
            <div class="h-32 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 relative">
                <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>
            <div class="px-10 pb-10 -mt-16 relative z-10 flex flex-col md:flex-row items-end gap-8">
                <img src="${target.avatar || 'https://cdn-icons-png.flaticon.com/512/147/147144.png'}" class="w-32 h-32 rounded-3xl border-4 border-white shadow-2xl bg-white" />
                <div class="flex-1 space-y-2 mb-2">
                    <div class="flex items-center gap-3">
                        <h1 class="text-3xl font-black text-slate-900 uppercase tracking-tight">${target.name}</h1>
                        <span class="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-emerald-100">Active</span>
                    </div>
                    <p class="text-sm font-bold text-slate-500 uppercase tracking-[.2em]">${target.designation || 'Staff Identity'} • ${target.department || 'General'}</p>
                    <div class="flex items-center gap-4 pt-2">
                        <div class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm text-slate-400">badge</span>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${target.id}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-sm text-slate-400">location_on</span>
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${target.location || 'HO'}</span>
                        </div>
                    </div>
                </div>
                <div class="flex gap-2 mb-2">
                    ${isHR ? `<button onclick="window.simulateUserRole('${target.id}')" class="px-5 py-2.5 bg-amber-500 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20">
                        <span class="material-symbols-outlined text-sm">visibility</span> Audit View
                    </button>` : ''}
                    <button class="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20">
                        <span class="material-symbols-outlined text-sm">mail</span> Message
                    </button>
                </div>
            </div>
        </div>

        <!-- Institutional Footprint Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Asset Footprint -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <span class="material-symbols-outlined">inventory_2</span>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">Assigned Assets</h3>
                                <p class="text-xs text-slate-500 font-medium">${assets.length} Assets under guardianship</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-black text-slate-900 tabular-nums">${healthAvg.toFixed(0)}%</p>
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Health</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        ${assets.length > 0 ? assets.map(a => `
                            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group">
                                <div class="flex items-center gap-4">
                                    <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <span class="material-symbols-outlined text-xl">devices</span>
                                    </div>
                                    <div>
                                        <p class="text-[11px] font-black text-slate-900 uppercase tracking-tight">${a.name}</p>
                                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">${a.category} • ${a.id}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase border border-emerald-100">${a.status}</span>
                                    <div class="w-20 bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                                        <div class="h-full bg-blue-500" style="width: ${a.health}"></div>
                                    </div>
                                </div>
                            </div>
                        `).join('') : '<div class="py-10 text-center text-xs text-slate-400 italic uppercase tracking-widest">No assets assigned to this identity</div>'}
                    </div>
                </div>

                <!-- Recent Performance Highlights -->
                <div class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <div class="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
                        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <span class="material-symbols-outlined">workspace_premium</span>
                        </div>
                        <div>
                            <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">Performance Record</h3>
                            <p class="text-xs text-slate-500 font-medium">Finalized appraisal history</p>
                        </div>
                    </div>
                    
                    <div class="space-y-6">
                        ${reviews.length > 0 ? reviews.map(r => `
                            <div class="relative pl-8 border-l-2 border-slate-100 pb-2">
                                <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-amber-500"></div>
                                <div class="flex items-center justify-between mb-2">
                                    <h4 class="text-xs font-black text-slate-900 uppercase tracking-widest">${r.period} Appraisal</h4>
                                    <span class="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg">SCORE: ${r.taskScore}/10</span>
                                </div>
                                <p class="text-[11px] text-slate-500 leading-relaxed italic">"${r.feedback}"</p>
                            </div>
                        `).join('') : '<div class="py-10 text-center text-xs text-slate-400 italic uppercase tracking-widest">No published reviews found</div>'}
                    </div>
                </div>
            </div>

            <!-- Side Metrics -->
            <div class="space-y-8">
                <!-- Attendance Overview -->
                <div class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Attendance Trend</h3>
                    <div class="grid grid-cols-7 gap-1 mb-6">
                        ${[...Array(28)].map((_, i) => `
                            <div class="aspect-square rounded-[4px] ${Math.random() > 0.1 ? 'bg-emerald-400' : 'bg-rose-400'} opacity-20 hover:opacity-100 transition-opacity cursor-help" title="May ${i+1}: Present"></div>
                        `).join('')}
                    </div>
                    <div class="flex justify-between items-center text-center">
                        <div>
                            <p class="text-lg font-black text-slate-900">94%</p>
                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Monthly Avg</p>
                        </div>
                        <div class="w-px h-8 bg-slate-100"></div>
                        <div>
                            <p class="text-lg font-black text-slate-900">02</p>
                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Late Marks</p>
                        </div>
                        <div class="w-px h-8 bg-slate-100"></div>
                        <div>
                            <p class="text-lg font-black text-slate-900">01</p>
                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Leaves</p>
                        </div>
                    </div>
                </div>

                <!-- Task Completion -->
                <div class="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                    <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest mb-6">Task Execution</h3>
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completed</span>
                            <span class="text-[10px] font-black text-emerald-600">${tasks.filter(t=>t.status==='Completed').length}</span>
                        </div>
                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div class="h-full bg-emerald-500" style="width: ${(tasks.filter(t=>t.status==='Completed').length / tasks.length * 100) || 0}%"></div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">In Progress</span>
                            <span class="text-[10px] font-black text-blue-600">${tasks.filter(t=>t.status==='In Progress').length}</span>
                        </div>
                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div class="h-full bg-blue-500" style="width: ${(tasks.filter(t=>t.status==='In Progress').length / tasks.length * 100) || 0}%"></div>
                        </div>
                    </div>
                </div>

                <!-- Institutional Identity -->
                <div class="bg-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-900/20 text-center">
                    <div class="bg-white p-4 rounded-2xl inline-block mb-6 shadow-2xl">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=KALIKE-IDENTITY-${target.id}" class="w-32 h-32" />
                    </div>
                    <h4 class="text-xs font-black uppercase tracking-widest mb-2">Institutional Badge</h4>
                    <p class="text-[10px] text-slate-400 font-medium leading-relaxed uppercase tracking-widest px-4">Authorized identity for access to Kalike Governance Protocols</p>
                </div>
            </div>
        </div>
    </div>
    `;
}
