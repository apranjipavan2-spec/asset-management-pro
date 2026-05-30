import { db } from '../mock/db.js';

export function renderAttendancePage(user) {
    const isAdmin = window.app.hasPermission('manage_team');
    const today = new Date().toISOString().split('T')[0];
    const records = isAdmin ? db.attendance : db.attendance.filter(a => a.empId === user.empId);
    const todayRecord = db.attendance.find(a => a.empId === user.empId && a.date === today);

    // Monthly summary
    const thisMonth = today.slice(0, 7);
    const myMonthly = db.attendance.filter(a => a.empId === user.empId && a.date.startsWith(thisMonth));
    const presentDays = myMonthly.filter(a => a.status === 'Present').length;

    return `
    <div class="w-full space-y-4 animate-fade-in-up">
        <div>
            <h1 class="page-title">Attendance</h1>
            <p class="page-subtitle">${isAdmin ? 'Team Attendance Overview' : 'Mark & Track Your Attendance'}</p>
        </div>

        <!-- Quick Mark Attendance -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="card p-4 col-span-2">
                <h3 class="card-title mb-3">Today — ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                ${todayRecord ? `
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><span class="material-symbols-outlined text-xl">check_circle</span></div>
                        <div>
                            <p class="text-sm font-black text-emerald-600">Marked Present</p>
                            <p class="text-[10px] text-slate-400">Check-in: ${todayRecord.checkIn} ${todayRecord.checkOut ? '• Check-out: ' + todayRecord.checkOut : ''}</p>
                        </div>
                        ${!todayRecord.checkOut ? `<button onclick="(() => { const r = db.attendance.find(a => a.empId === '${user.empId}' && a.date === '${today}'); if(r) { r.checkOut = new Date().toLocaleTimeString(); db.syncToCloud(); } app.navigateTo('attendance'); })()" class="ml-auto btn-ghost">Check Out</button>` : ''}
                    </div>
                ` : `
                    <div class="flex items-center gap-3">
                        <button onclick="db.markAttendance({ empId: '${user.empId}', empName: '${user.name}', status: 'Present', location: '${user.location || ''}' }); app.navigateTo('attendance')" class="btn-primary bg-emerald-600 hover:bg-emerald-700">
                            <span class="material-symbols-outlined text-sm">login</span> Mark Present
                        </button>
                        <button onclick="db.markAttendance({ empId: '${user.empId}', empName: '${user.name}', status: 'Half-Day', location: '${user.location || ''}' }); app.navigateTo('attendance')" class="btn-primary bg-amber-500 hover:bg-amber-600">
                            <span class="material-symbols-outlined text-sm">hourglass_bottom</span> Half Day
                        </button>
                    </div>
                `}
            </div>
            <div class="stat-tile text-center flex flex-col items-center justify-center">
                <div class="stat-strip bg-emerald-500"></div>
                <p class="stat-label">This Month</p>
                <p class="stat-value text-emerald-600">${presentDays}</p>
                <p class="text-[10px] text-slate-400">Days Present</p>
            </div>
        </div>

        <!-- FieldGovern Link -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 flex items-center gap-4">
            <div class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center"><span class="material-symbols-outlined text-xl">poll</span></div>
            <div class="flex-1">
                <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest">FieldGovern Attendance</h3>
                <p class="text-[10px] text-slate-400">For detailed field attendance tracking via FieldGovern</p>
            </div>
            <a href="https://app.fieldgovern.com" target="_blank" class="btn-primary bg-blue-600 hover:bg-blue-700">
                <span class="material-symbols-outlined text-sm">open_in_new</span> Open FieldGovern
            </a>
        </div>

        <!-- Attendance History -->
        <div class="card overflow-hidden">
            <div class="card-header">
                <h3 class="card-title">${isAdmin ? 'All Attendance' : 'My History'} (${records.length})</h3>
            </div>
            <div class="divide-y divide-slate-50 max-h-[45vh] overflow-y-auto">
                ${records.length > 0 ? records.slice(0, 50).map(a => `
                    <div class="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                        <div class="w-8 h-8 rounded-lg ${a.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : a.status === 'Absent' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'} flex items-center justify-center">
                            <span class="material-symbols-outlined text-sm">${a.status === 'Present' ? 'check' : a.status === 'Absent' ? 'close' : 'hourglass_bottom'}</span>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-xs font-bold text-slate-900">${a.empName}</p>
                            <p class="text-[10px] text-slate-400">${a.date} • ${a.checkIn || '-'} → ${a.checkOut || '-'}</p>
                        </div>
                        <span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${a.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : a.status === 'Absent' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}">${a.status}</span>
                    </div>
                `).join('') : '<div class="px-6 py-12 text-center text-xs text-slate-400 italic uppercase tracking-widest">No attendance records</div>'}
            </div>
        </div>
    </div>`;
}
