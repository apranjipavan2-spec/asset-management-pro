import { db } from '../mock/db.js';

const ROLE_ORDER = ['superadmin', 'director', 'finance', 'hr', 'operations', 'manager', 'employee'];
const ROLE_STYLE = {
    superadmin: { dot: 'bg-rose-500',    chip: 'bg-rose-50 text-rose-600 border-rose-100' },
    director:   { dot: 'bg-indigo-600',  chip: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    finance:    { dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-600 border-amber-100' },
    hr:         { dot: 'bg-fuchsia-500', chip: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100' },
    operations: { dot: 'bg-cyan-500',    chip: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
    manager:    { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
    employee:   { dot: 'bg-slate-400',   chip: 'bg-slate-50 text-slate-500 border-slate-100' }
};

const roleLabel = (id) => db.roles.find(r => r.id === id)?.name || id || 'User';
const roleStyle = (id) => ROLE_STYLE[id] || ROLE_STYLE.employee;

// "Coordinator-Education" -> "Education", "Manager" -> "" (no program suffix)
const programOf = (designation) => {
    if (!designation) return '';
    const idx = designation.indexOf('-');
    if (idx === -1) return '';
    return designation.slice(idx + 1).trim();
};

function memberCard(emp) {
    const program = programOf(emp.designation);
    const safeSearch = ((emp.name || '') + ' ' + (emp.id || '') + ' ' + (emp.empId || '') + ' ' +
        (emp.designation || '') + ' ' + (emp.location || '') + ' ' + (emp.role || '') + ' ' + program).toLowerCase().replace(/"/g, '&quot;');
    const rs = roleStyle(emp.role);
    return `
        <div class="member-card group relative bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 transition-all p-4 flex items-center gap-3 cursor-pointer"
             data-search="${safeSearch}"
             onclick="window.app.navigateTo('profile', '${emp.id}')">
            <div class="relative shrink-0">
                <img src="${emp.avatar || 'https://cdn-icons-png.flaticon.com/512/147/147144.png'}" class="w-11 h-11 rounded-xl border border-slate-100 object-cover" />
                <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${rs.dot}"></span>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-xs font-black text-slate-900 truncate">${emp.name || 'Unnamed'}</p>
                    <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${rs.chip}">${roleLabel(emp.role)}</span>
                </div>
                <p class="text-[10px] text-slate-500 font-bold truncate mt-0.5">${emp.designation || 'No designation'}${program ? ` · <span class="text-indigo-600">${program}</span>` : ''}</p>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="text-[9px] font-mono font-black text-slate-400">${emp.id || ''}</span>
                    ${emp.location ? `<span class="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">${emp.location}</span>` : ''}
                </div>
            </div>
            <span class="material-symbols-outlined text-slate-300 group-hover:text-indigo-500 transition-colors text-[18px] shrink-0">chevron_right</span>
        </div>`;
}

export function renderOrgChartPage(user) {
    const isSuperAdmin = window.app.hasPermission('manage_users') || window.app.hasPermission('all');
    const allUsers = [...db.users].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const roots = db.hierarchy.filter(h => !h.reportsTo || h.reportsTo === '');
    const getChildren = (empId) =>
        db.hierarchy.filter(h => h.reportsTo === empId)
            .sort((a, b) => (a.empName || '').localeCompare(b.empName || ''));

    const renderNode = (h, depth = 0) => {
        const children = getChildren(h.empId);
        const emp = db.users.find(u => u.id === h.empId);
        const role = roleLabel(emp?.role);
        const rs = roleStyle(emp?.role);
        return `
            <div class="relative">
                <div class="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative z-10">
                    <div class="relative cursor-pointer" onclick="window.app.navigateTo('profile', '${h.empId}')">
                        <img src="${emp?.avatar || 'https://cdn-icons-png.flaticon.com/512/147/147144.png'}" class="w-12 h-12 rounded-2xl border-2 border-white shadow-md shadow-slate-200 object-cover" />
                        <div class="absolute -bottom-1 -right-1 w-5 h-5 ${rs.dot} border-2 border-white rounded-lg flex items-center justify-center">
                            <span class="material-symbols-outlined text-white text-[10px]">${depth === 0 ? 'grade' : 'person'}</span>
                        </div>
                    </div>
                    <div class="flex-1 min-w-0 cursor-pointer" onclick="window.app.navigateTo('profile', '${h.empId}')">
                        <div class="flex items-center gap-2 flex-wrap">
                            <h4 class="text-xs font-black text-slate-900 uppercase tracking-tight truncate">${h.empName}</h4>
                            <span class="px-1.5 py-0.5 ${rs.chip} text-[8px] font-black rounded uppercase border">${role}</span>
                        </div>
                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">${emp?.designation || 'N/A'}</p>
                        <div class="flex items-center gap-2 mt-1.5">
                            <span class="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded">${h.department || emp?.location || 'HO'}</span>
                        </div>
                    </div>
                    <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="event.stopPropagation(); window.app.navigateTo('profile', '${h.empId}')" title="View Full Profile" class="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center">
                            <span class="material-symbols-outlined text-[18px]">account_circle</span>
                        </button>
                        ${isSuperAdmin ? `
                            <button onclick="event.stopPropagation(); window.showReassignModal('${h.empId}')" title="Reassign Reporting Line" class="w-8 h-8 rounded-xl bg-slate-50 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center">
                                <span class="material-symbols-outlined text-[18px]">account_tree</span>
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${children.length > 0 ? `
                    <div class="ml-10 border-l-2 border-slate-100/50 mt-2 space-y-4 pb-4">
                        ${children.map(c => `
                            <div class="relative pt-4 pl-8 before:content-[''] before:absolute before:left-0 before:top-1/2 before:w-8 before:h-[2px] before:bg-slate-100/50">
                                ${renderNode(c, depth + 1)}
                            </div>
                        `).join('')}
                    </div>` : ''}
            </div>`;
    };

    // Group users by role, in our preferred role order, alphabetised within each
    const byRole = {};
    for (const u of allUsers) {
        const k = u.role || 'employee';
        (byRole[k] = byRole[k] || []).push(u);
    }
    const roleGroups = ROLE_ORDER
        .filter(r => byRole[r] && byRole[r].length > 0)
        .map(r => ({ role: r, members: byRole[r] }));
    // Any roles in DB but not in ROLE_ORDER (just in case)
    Object.keys(byRole).filter(r => !ROLE_ORDER.includes(r)).forEach(r =>
        roleGroups.push({ role: r, members: byRole[r] })
    );

    const coverage = allUsers.length > 0 ? Math.round((db.hierarchy.length / allUsers.length) * 100) : 0;
    const unmapped = allUsers.length - db.hierarchy.length;

    return `
    <div class="w-full space-y-4 animate-fade-in-up pb-10">
        <header class="flex items-center justify-between flex-wrap gap-3">
            <div>
                <h1 class="page-title">Institutional Tree</h1>
                <p class="page-subtitle">Strategic Reporting & Chain of Command</p>
            </div>
            <div class="flex items-center gap-3 flex-wrap">
                <div class="bg-white p-1 rounded-xl border border-slate-100 flex shadow-sm">
                    <div class="px-3 py-2 text-center">
                        <p class="stat-label">Total</p>
                        <p class="text-xs font-black text-slate-900 tabular-nums">${allUsers.length}</p>
                    </div>
                    <div class="w-[1px] bg-slate-100 h-8 self-center"></div>
                    <div class="px-3 py-2 text-center">
                        <p class="stat-label">Mapped</p>
                        <p class="text-xs font-black text-emerald-600 tabular-nums">${db.hierarchy.length}</p>
                    </div>
                    <div class="w-[1px] bg-slate-100 h-8 self-center"></div>
                    <div class="px-3 py-2 text-center">
                        <p class="stat-label">Coverage</p>
                        <p class="text-xs font-black text-slate-900 tabular-nums">${coverage}%</p>
                    </div>
                    <div class="w-[1px] bg-slate-100 h-8 self-center"></div>
                    <div class="px-3 py-2 text-center">
                        <p class="stat-label">Unmapped</p>
                        <p class="text-xs font-black ${unmapped > 0 ? 'text-rose-500' : 'text-slate-400'} tabular-nums">${unmapped}</p>
                    </div>
                </div>
                ${isSuperAdmin ? `
                    <button onclick="window.showReassignModal()" class="btn-primary">
                        <span class="material-symbols-outlined text-sm">hub</span>
                        Set Chain of Command
                    </button>
                ` : ''}
            </div>
        </header>

        ${roots.length > 0 ? `
            <div class="bg-slate-50/50 rounded-xl border border-slate-200 shadow-inner p-6 overflow-auto">
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Reporting Structure</h3>
                <div class="w-full space-y-12">
                    ${roots.sort((a, b) => (a.empName || '').localeCompare(b.empName || '')).map(r => renderNode(r)).join('')}
                </div>
            </div>
        ` : `
            <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                <span class="material-symbols-outlined text-amber-600">family_history</span>
                <div class="flex-1">
                    <p class="text-xs font-black text-amber-900 uppercase tracking-tight">No reporting structure defined yet</p>
                    <p class="text-[10px] text-amber-700 font-bold mt-0.5">Use "Set Chain of Command" to establish supervisor-report links. All ${allUsers.length} members are listed below.</p>
                </div>
            </div>
        `}

        <div class="card-accent">
            <div class="card-header flex-wrap gap-3">
                <div>
                    <h3 class="card-title">All Members</h3>
                    <p class="card-meta" id="member-count-meta">${allUsers.length} people · grouped by role · alphabetical</p>
                </div>
                <div class="relative w-full sm:w-80">
                    <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                    <input type="text" id="member-search" oninput="window.filterMemberDirectory(this.value)" placeholder="Search name, ID, designation, location..." class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 pl-10 pr-10 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300" />
                    <button type="button" onclick="document.getElementById('member-search').value=''; window.filterMemberDirectory('');" class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all" title="Clear">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            </div>

            <div class="p-6 space-y-8" id="member-groups">
                ${roleGroups.map(g => {
                    const rs = roleStyle(g.role);
                    return `
                        <section class="member-group" data-role="${g.role}">
                            <div class="flex items-center gap-3 mb-4">
                                <span class="w-2 h-2 rounded-full ${rs.dot}"></span>
                                <h4 class="text-[11px] font-black text-slate-700 uppercase tracking-widest">${roleLabel(g.role)}</h4>
                                <span class="text-[10px] font-black text-slate-400 tabular-nums">${g.members.length}</span>
                                <span class="role-visible-count text-[10px] font-black text-indigo-500 tabular-nums hidden"></span>
                                <div class="flex-1 h-[1px] bg-slate-100"></div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                ${g.members.map(memberCard).join('')}
                            </div>
                        </section>`;
                }).join('')}
            </div>
        </div>

        <!-- Reassignment Modal -->
        <div id="reassign-modal" class="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-md hidden flex-col items-center justify-center opacity-0 transition-all duration-300">
            <div id="reassign-modal-content" class="bg-white w-full max-w-lg rounded-2xl shadow-2xl scale-95 transition-all duration-300 flex flex-col overflow-hidden mx-4">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">Chain of Command</h3>
                        <p class="card-meta">Map Strategic Reporting Lines</p>
                    </div>
                    <button onclick="window.hideReassignModal()" class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                        <span class="material-symbols-outlined text-slate-400 text-sm">close</span>
                    </button>
                </div>

                <div class="p-4 space-y-3">
                    <div class="form-row">
                        <label class="form-label">Employee to Map</label>
                        <select id="reassign-emp" class="form-input">
                            <option value="">Select Personnel</option>
                            ${allUsers.map(u => `<option value="${u.id}" data-name="${u.name}">${u.name} (${u.designation || 'Staff'})</option>`).join('')}
                        </select>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="form-row">
                            <label class="form-label">Direct Supervisor</label>
                            <select id="reassign-mgr" class="form-input">
                                <option value="">No Supervisor (Top Level)</option>
                                ${allUsers.map(u => `<option value="${u.id}" data-name="${u.name}">${u.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-row">
                            <label class="form-label">Department</label>
                            <input type="text" id="reassign-dept" placeholder="e.g. WaSH" class="form-input" />
                        </div>
                    </div>

                    <button onclick="window.saveHierarchy()" class="btn-primary w-full justify-center bg-indigo-600 hover:bg-indigo-700">Establish Authority</button>
                </div>
            </div>
        </div>
    </div>
    `;
}

window.filterMemberDirectory = (query) => {
    const q = (query || '').trim().toLowerCase();
    const groups = document.querySelectorAll('#member-groups .member-group');
    let totalVisible = 0;
    let totalAll = 0;
    groups.forEach(group => {
        const cards = group.querySelectorAll('.member-card');
        let groupVisible = 0;
        cards.forEach(card => {
            const hay = card.getAttribute('data-search') || '';
            const match = q === '' || hay.includes(q);
            card.style.display = match ? '' : 'none';
            if (match) groupVisible++;
        });
        totalVisible += groupVisible;
        totalAll += cards.length;
        const badge = group.querySelector('.role-visible-count');
        if (badge) {
            if (q && groupVisible !== cards.length) {
                badge.textContent = `· ${groupVisible} match${groupVisible === 1 ? '' : 'es'}`;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        group.style.display = groupVisible === 0 && q ? 'none' : '';
    });
    const meta = document.getElementById('member-count-meta');
    if (meta) {
        meta.textContent = q
            ? `Showing ${totalVisible} of ${totalAll} matching "${query}"`
            : `${totalAll} people · grouped by role · alphabetical`;
    }
};

// Handlers
window.showReassignModal = (empId = '') => {
    const modal = document.getElementById('reassign-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    if (empId) {
        document.getElementById('reassign-emp').value = empId;
        const h = db.hierarchy.find(x => x.empId === empId);
        if (h) {
            document.getElementById('reassign-mgr').value = h.reportsTo || '';
            document.getElementById('reassign-dept').value = h.department || '';
        }
    }

    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('reassign-modal-content').classList.remove('scale-95');
    }, 10);
};

window.hideReassignModal = () => {
    const modal = document.getElementById('reassign-modal');
    modal.classList.add('opacity-0');
    document.getElementById('reassign-modal-content').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
};

window.saveHierarchy = async () => {
    const empSel = document.getElementById('reassign-emp');
    const mgrSel = document.getElementById('reassign-mgr');
    const empId = empSel.value;
    const empName = empSel.options[empSel.selectedIndex]?.dataset?.name || '';
    const reportsTo = mgrSel.value;
    const reportsToName = mgrSel.options[mgrSel.selectedIndex]?.dataset?.name || '';
    const dept = document.getElementById('reassign-dept').value;

    if (!empId) return alert('Institutional Error: Identity Selection is mandatory.');
    if (empId === reportsTo) return alert('Security Override: An identity cannot report to itself.');

    await db.setHierarchy(empId, empName, reportsTo, reportsToName, dept);
    window.renderPage('org_chart');
};
