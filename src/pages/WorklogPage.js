import { db } from '../mock/db.js';

export function renderWorklogPage(user) {
    const isManager = window.app.hasPermission('manage_team');
    const today = new Date().toISOString().split('T')[0];
    const myWorklogs = isManager ? db.worklogs : db.worklogs.filter(w => w.empId === user.empId);

    const parseTasks = (t) => { try { return JSON.parse(t); } catch { return typeof t === 'string' ? [t] : []; } };

    return `
    <div class="w-full space-y-4 animate-fade-in-up">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="page-title">Daily Worklog</h1>
                <p class="page-subtitle">${isManager ? 'Team Activity & Scoring' : 'Track Your Daily Activities'}</p>
            </div>
            ${!isManager ? `<button onclick="document.getElementById('wl-form').classList.toggle('hidden')" class="btn-primary">
                <span class="material-symbols-outlined text-sm">add</span> New Entry
            </button>` : ''}
        </div>

        <!-- Add Worklog Form (Employee) -->
        ${!isManager ? `
        <div id="wl-form" class="hidden card p-4 space-y-3">
            <h3 class="card-title">Submit Today's Worklog</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="form-row">
                    <label class="form-label">Date</label>
                    <input type="date" id="wl-date" value="${today}" class="form-input" />
                </div>
                <div class="form-row">
                    <label class="form-label">Hours Worked</label>
                    <input type="number" id="wl-hours" value="8" min="0" max="16" step="0.5" class="form-input" />
                </div>
            </div>
            <div class="form-row">
                <label class="form-label">Tasks Completed (one per line)</label>
                <textarea id="wl-tasks" rows="3" placeholder="- Completed field visit to Yadgir schools&#10;- Updated MIS data for Q3&#10;- Coordinated with district team" class="form-input resize-none"></textarea>
            </div>
            <button onclick="(() => {
                const date = document.getElementById('wl-date').value;
                const hours = parseFloat(document.getElementById('wl-hours').value) || 8;
                const tasksRaw = document.getElementById('wl-tasks').value.trim();
                if (!tasksRaw) { alert('Please enter at least one task'); return; }
                const tasks = tasksRaw.split('\\n').filter(t => t.trim());
                db.addWorklog({ empId: '${user.empId}', empName: '${user.name}', date, tasks, hoursWorked: hours });
                app.navigateTo('worklog');
            })()" class="btn-primary bg-emerald-600 hover:bg-emerald-700">Submit Worklog</button>
        </div>` : ''}

        <!-- Worklog List -->
        <div class="card overflow-hidden">
            <div class="card-header">
                <h3 class="card-title">${isManager ? 'All Team Worklogs' : 'My Worklogs'} (${myWorklogs.length})</h3>
            </div>
            <div class="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
                ${myWorklogs.length > 0 ? myWorklogs.map(wl => {
                    const tasks = parseTasks(wl.tasks);
                    return `
                    <div class="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-2">
                                    <span class="text-xs font-black text-slate-900">${wl.empName}</span>
                                    <span class="text-[9px] font-bold text-slate-400">${wl.date}</span>
                                    <span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${wl.status === 'scored' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}">${wl.status}</span>
                                    ${wl.score > 0 ? `<span class="px-2 py-0.5 text-[9px] font-black bg-blue-50 text-blue-600 rounded-full border border-blue-100">Score: ${wl.score}/10</span>` : ''}
                                </div>
                                <div class="space-y-1 ml-1">
                                    ${tasks.map(t => `<p class="text-[11px] text-slate-600 flex items-start gap-2"><span class="text-emerald-500 mt-0.5">•</span>${t.replace(/^[-•]\s*/, '')}</p>`).join('')}
                                </div>
                                <p class="text-[10px] text-slate-400 mt-2">${wl.hoursWorked || 8}h worked ${wl.remarks ? '• Remarks: ' + wl.remarks : ''}</p>
                            </div>
                            ${isManager && wl.status !== 'scored' ? `
                            <div class="flex items-center gap-2 shrink-0">
                                <input type="number" id="score-${wl.id}" min="0" max="10" step="0.5" placeholder="0-10" class="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:border-accent outline-none" />
                                <input type="text" id="rmk-${wl.id}" placeholder="Remarks" class="w-32 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-accent outline-none" />
                                <button onclick="(() => {
                                    const score = parseFloat(document.getElementById('score-${wl.id}').value) || 0;
                                    const remarks = document.getElementById('rmk-${wl.id}').value;
                                    db.scoreWorklog('${wl.id}', score, remarks, '${user.empId}', '${user.name}');
                                    app.navigateTo('worklog');
                                })()" class="px-3 py-1.5 bg-accent text-white text-[9px] font-black rounded-lg uppercase hover:bg-blue-700 transition-all">Score</button>
                            </div>` : ''}
                        </div>
                    </div>`;
                }).join('') : '<div class="px-6 py-12 text-center text-xs text-slate-400 italic uppercase tracking-widest">No worklog entries yet</div>'}
            </div>
        </div>
    </div>`;
}
