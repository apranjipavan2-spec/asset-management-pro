import { db } from '../mock/db.js';

export function renderTasksPage(user) {
    const isManager = window.app.hasPermission('manage_team');
    const myTasks = isManager ? db.tasks : db.tasks.filter(t => t.assignedTo === user.empId);
    const employees = db.users.filter(u => u.role === 'employee');

    // Leaderboard: average task score per employee
    const leaderboard = {};
    db.tasks.filter(t => t.status === 'Scored').forEach(t => {
        if (!leaderboard[t.assignedToName]) leaderboard[t.assignedToName] = { total: 0, count: 0, empId: t.assignedTo };
        leaderboard[t.assignedToName].total += t.score;
        leaderboard[t.assignedToName].count++;
    });
    const leaderboardArr = Object.entries(leaderboard).map(([name, d]) => ({ name, avg: (d.total / d.count).toFixed(1), count: d.count })).sort((a, b) => b.avg - a.avg).slice(0, 10);

    const priorityColor = (p) => p === 'Critical' ? 'bg-rose-50 text-rose-600 border-rose-100' : p === 'High' ? 'bg-amber-50 text-amber-600 border-amber-100' : p === 'Medium' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-500 border-slate-100';
    const statusColor = (s) => s === 'Completed' || s === 'Scored' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : s === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' : s === 'Overdue' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100';

    return `
    <div class="w-full space-y-4 animate-fade-in-up">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="page-title">Task Management</h1>
                <p class="page-subtitle">${isManager ? 'Assign, Track & Score Tasks' : 'Your Assigned Tasks'}</p>
            </div>
            ${isManager ? `<button onclick="document.getElementById('task-form').classList.toggle('hidden')" class="btn-primary">
                <span class="material-symbols-outlined text-sm">add</span> Assign Task
            </button>` : ''}
        </div>

        <!-- Assign Task Form (Manager) -->
        ${isManager ? `
        <div id="task-form" class="hidden card p-4 space-y-3">
            <h3 class="card-title">Create New Task</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="form-row">
                    <label class="form-label">Task Title</label>
                    <input type="text" id="task-title" placeholder="e.g. Complete monthly MIS report" class="form-input" />
                </div>
                <div class="form-row">
                    <label class="form-label">Assign To</label>
                    <select id="task-assignee" class="form-input">
                        <option value="">Select Employee</option>
                        ${employees.map(e => `<option value="${e.id}" data-name="${e.name}">${e.name} (${e.designation || e.id})</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <label class="form-label">Priority</label>
                    <select id="task-priority" class="form-input">
                        <option value="Low">Low</option><option value="Medium" selected>Medium</option><option value="High">High</option><option value="Critical">Critical</option>
                    </select>
                </div>
                <div class="form-row">
                    <label class="form-label">Due Date</label>
                    <input type="date" id="task-due" class="form-input" />
                </div>
            </div>
            <div class="form-row">
                <label class="form-label">Description</label>
                <textarea id="task-desc" rows="3" placeholder="Detailed task description..." class="form-input resize-none"></textarea>
            </div>
            <button onclick="(() => {
                const sel = document.getElementById('task-assignee');
                const assignedTo = sel.value;
                const assignedToName = sel.options[sel.selectedIndex]?.dataset?.name || '';
                const title = document.getElementById('task-title').value.trim();
                if (!title || !assignedTo) { alert('Title and assignee required'); return; }
                db.addTask({ title, description: document.getElementById('task-desc').value, assignedTo, assignedToName, assignedBy: '${user.empId}', assignedByName: '${user.name}', priority: document.getElementById('task-priority').value, dueDate: document.getElementById('task-due').value });
                app.navigateTo('tasks');
            })()" class="btn-primary bg-amber-600 hover:bg-amber-700">Create Task</button>
        </div>` : ''}

        <!-- Leaderboard (if tasks scored) -->
        ${leaderboardArr.length > 0 ? `
        <div class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5">
            <h3 class="text-xs font-black text-amber-700 uppercase tracking-[.2em] mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-sm">emoji_events</span>Performance Leaderboard</h3>
            <div class="flex flex-wrap gap-3">
                ${leaderboardArr.map((e, i) => `
                    <div class="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-amber-100">
                        <span class="text-xs font-black ${i === 0 ? 'text-amber-600' : i === 1 ? 'text-slate-500' : i === 2 ? 'text-amber-800' : 'text-slate-400'}">#${i+1}</span>
                        <span class="text-xs font-bold text-slate-900">${e.name}</span>
                        <span class="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">${e.avg}/10</span>
                        <span class="text-[8px] text-slate-400">(${e.count} tasks)</span>
                    </div>
                `).join('')}
            </div>
        </div>` : ''}

        <!-- Task List -->
        <div class="card overflow-hidden">
            <div class="card-header">
                <h3 class="card-title">${isManager ? 'All Tasks' : 'My Tasks'} (${myTasks.length})</h3>
            </div>
            <div class="divide-y divide-slate-50 max-h-[55vh] overflow-y-auto">
                ${myTasks.length > 0 ? myTasks.map(t => `
                    <div class="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                        <div class="flex items-start justify-between gap-4">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 flex-wrap mb-1">
                                    <span class="text-sm font-black text-slate-900">${t.title}</span>
                                    <span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full border ${priorityColor(t.priority)}">${t.priority}</span>
                                    <span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full border ${statusColor(t.status)}">${t.status}</span>
                                    ${t.score > 0 ? `<span class="px-2 py-0.5 text-[9px] font-black bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">★ ${t.score}/${t.maxScore}</span>` : ''}
                                </div>
                                ${t.description ? `<p class="text-[11px] text-slate-500 mt-1">${t.description}</p>` : ''}
                                <div class="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
                                    <span>Assigned to: <strong class="text-slate-600">${t.assignedToName}</strong></span>
                                    <span>By: <strong class="text-slate-600">${t.assignedByName}</strong></span>
                                    ${t.dueDate ? `<span>Due: <strong class="text-slate-600">${t.dueDate}</strong></span>` : ''}
                                    ${t.feedback ? `<span>Feedback: <em class="text-slate-600">${t.feedback}</em></span>` : ''}
                                </div>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                                ${!isManager && (t.status === 'Pending' || t.status === 'In Progress') ? `
                                    ${t.status === 'Pending' ? `<button onclick="db.updateTaskStatus('${t.id}','In Progress');app.navigateTo('tasks')" class="px-3 py-1.5 bg-blue-50 text-blue-600 text-[9px] font-black rounded-lg border border-blue-100 hover:bg-blue-100 transition-all uppercase">Start</button>` : ''}
                                    ${t.status === 'In Progress' ? `<button onclick="db.updateTaskStatus('${t.id}','Completed');app.navigateTo('tasks')" class="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all uppercase">Complete</button>` : ''}
                                ` : ''}
                                ${isManager && t.status === 'Completed' ? `
                                    <input type="number" id="ts-${t.id}" min="0" max="10" step="0.5" placeholder="0-10" class="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:border-accent outline-none" />
                                    <input type="text" id="tf-${t.id}" placeholder="Feedback" class="w-28 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:border-accent outline-none" />
                                    <button onclick="db.scoreTask('${t.id}', parseFloat(document.getElementById('ts-${t.id}').value)||0, document.getElementById('tf-${t.id}').value, '${user.empId}');app.navigateTo('tasks')" class="px-3 py-1.5 bg-accent text-white text-[9px] font-black rounded-lg uppercase hover:bg-blue-700 transition-all">Score</button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('') : '<div class="px-6 py-12 text-center text-xs text-slate-400 italic uppercase tracking-widest">No tasks found</div>'}
            </div>
        </div>
    </div>`;
}
