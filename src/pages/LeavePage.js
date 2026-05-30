import { db } from '../mock/db.js';

export function renderLeavePage(user) {
    const isHR = window.app.hasPermission('manage_payroll') || window.app.hasPermission('all');
    const isManager = window.app.hasPermission('manage_team');
    const isSuper = isHR;
    const canSeeTeam = isManager || isSuper;

    if (!window.app.leaveContext) window.app.leaveContext = isSuper ? 'all' : (canSeeTeam ? 'team' : 'personal');
    const context = window.app.leaveContext;

    const myLeaves = db.leaves.filter(l => {
        if (context === 'personal') return l.empId === user.empId;
        if (context === 'team') return l.reportsTo === user.empId || (isManager && l.department === user.department);
        if (context === 'all' && isSuper) return true;
        if (l.empId === user.empId) return true;
        return false;
    });

    const balance = !isHR ? db.getLeaveBalance(user.empId) : null;

    const statusColor = (s) => s === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : s === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100';

    return `
    <div class="w-full space-y-4 animate-fade-in-up">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="page-title">Leave Management</h1>
                <div class="flex items-center gap-4 mt-2">
                    <button onclick="window.app.leaveContext = 'personal'; window.app.navigateTo('leave')" class="text-[9px] font-black uppercase tracking-widest ${context === 'personal' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} transition-colors">Personal</button>
                    ${canSeeTeam ? `<button onclick="window.app.leaveContext = 'team'; window.app.navigateTo('leave')" class="text-[9px] font-black uppercase tracking-widest ${context === 'team' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} transition-colors">Team Oversight</button>` : ''}
                    ${isSuper ? `<button onclick="window.app.leaveContext = 'all'; window.app.navigateTo('leave')" class="text-[9px] font-black uppercase tracking-widest ${context === 'all' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} transition-colors">Global Attendance</button>` : ''}
                </div>
            </div>
            ${!canSeeTeam ? `<button onclick="document.getElementById('leave-form').classList.toggle('hidden')" class="btn-primary">
                <span class="material-symbols-outlined text-sm">add</span> Apply Leave
            </button>` : ''}
        </div>

        <!-- Leave Balance (Employee) -->
        ${balance ? `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="stat-tile text-center">
                <div class="stat-strip bg-sky-500"></div>
                <p class="stat-label ml-0">Casual Leave</p>
                <p class="stat-value text-sky-600 ml-0">${balance.casualLeave}</p>
                <p class="text-[9px] text-slate-400">of 12 days</p>
            </div>
            <div class="stat-tile text-center">
                <div class="stat-strip bg-rose-500"></div>
                <p class="stat-label ml-0">Sick Leave</p>
                <p class="stat-value text-rose-600 ml-0">${balance.sickLeave}</p>
                <p class="text-[9px] text-slate-400">of 12 days</p>
            </div>
            <div class="stat-tile text-center">
                <div class="stat-strip bg-emerald-500"></div>
                <p class="stat-label ml-0">Earned Leave</p>
                <p class="stat-value text-emerald-600 ml-0">${balance.earnedLeave}</p>
                <p class="text-[9px] text-slate-400">of 15 days</p>
            </div>
            <div class="stat-tile text-center">
                <div class="stat-strip bg-purple-500"></div>
                <p class="stat-label ml-0">Compensatory</p>
                <p class="stat-value text-purple-600 ml-0">${balance.compensatory}</p>
                <p class="text-[9px] text-slate-400">earned</p>
            </div>
        </div>` : ''}

        <!-- Apply Leave Form -->
        ${!isManager ? `
        <div id="leave-form" class="hidden card p-4 space-y-3">
            <h3 class="card-title">New Leave Application</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-row">
                    <label class="form-label">Leave Type</label>
                    <select id="lv-type" class="form-input">
                        <option value="Casual">Casual Leave</option><option value="Sick">Sick Leave</option><option value="Earned">Earned Leave</option><option value="Compensatory">Compensatory Off</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div class="form-row">
                        <label class="form-label">From</label>
                        <input type="date" id="lv-from" class="form-input" />
                    </div>
                    <div class="form-row">
                        <label class="form-label">To</label>
                        <input type="date" id="lv-to" class="form-input" />
                    </div>
                </div>
            </div>
            <div class="form-row">
                <label class="form-label">Reason</label>
                <textarea id="lv-reason" rows="3" placeholder="Reason for leave..." class="form-input resize-none"></textarea>
            </div>
            <button onclick="(() => {
                const fromDate = document.getElementById('lv-from').value;
                const toDate = document.getElementById('lv-to').value;
                const reason = document.getElementById('lv-reason').value.trim();
                if (!fromDate || !toDate || !reason) { alert('All fields required'); return; }
                const days = Math.ceil((new Date(toDate) - new Date(fromDate)) / 86400000) + 1;
                if (days < 1) { alert('Invalid date range'); return; }
                db.applyLeave({ 
                    empId: user.empId, 
                    empName: user.name, 
                    type: document.getElementById('lv-type').value, 
                    fromDate, 
                    toDate, 
                    days, 
                    reason,
                    department: user.department,
                    location: user.location,
                    reportsTo: user.reportsTo
                });
                app.navigateTo('leave');
            })()" class="btn-primary bg-sky-600 hover:bg-sky-700">Submit Application</button>
        </div>` : ''}

        <!-- Leave List -->
        <div class="card overflow-hidden">
            <div class="divide-y divide-slate-50 max-h-[55vh] overflow-y-auto">
                ${myLeaves.length > 0 ? myLeaves.map(l => `
                    <div class="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 flex-wrap mb-1">
                                    <span class="text-sm font-black text-slate-900">${l.empName}</span>
                                    <span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full bg-slate-50 text-slate-500 border border-slate-100">${l.type}</span>
                                    <span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full border ${statusColor(l.status)}">${l.status}</span>
                                </div>
                                <p class="text-[11px] text-slate-500">${l.fromDate} → ${l.toDate} (${l.days} day${l.days > 1 ? 's' : ''})</p>
                                <p class="text-[10px] text-slate-400 mt-1">${l.reason}</p>
                                ${l.remarks ? `<p class="text-[10px] text-slate-400 mt-1 italic">Manager: ${l.remarks}</p>` : ''}
                            </div>
                            ${isManager && l.status === 'Pending' && (l.reportsTo === user.empId || isHR) ? `
                            <div class="flex items-center gap-2 shrink-0">
                                <input type="text" id="lr-${l.id}" placeholder="Remarks" class="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-accent outline-none" />
                                <button onclick="db.approveLeave('${l.id}','${user.empId}','${user.name}',document.getElementById('lr-${l.id}').value);app.navigateTo('leave')" class="px-3 py-1.5 bg-emerald-600 text-white text-[9px] font-black rounded-lg uppercase hover:bg-emerald-700 transition-all">Approve</button>
                                <button onclick="db.rejectLeave('${l.id}','${user.empId}','${user.name}',document.getElementById('lr-${l.id}').value||'Rejected');app.navigateTo('leave')" class="px-3 py-1.5 bg-rose-600 text-white text-[9px] font-black rounded-lg uppercase hover:bg-rose-700 transition-all">Reject</button>
                            </div>` : ''}
                        </div>
                    </div>
                `).join('') : '<div class="px-6 py-12 text-center text-xs text-slate-400 italic uppercase tracking-widest">No leave applications</div>'}
            </div>
        </div>
    </div>`;
}
