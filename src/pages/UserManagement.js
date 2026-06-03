import { db } from '../mock/db.js';
import { PROGRAMS, programLabel } from '../data/programs.js';

export function renderUserManagement() {
    const user = window.app.user;
    const users = db.users;

    window.exportUserDirectory = () => {
        const users = db.users || [];
        const headers = ["Employee ID", "Name", "Role", "Designation", "Department", "Location", "Last Login"];
        const rows = users.map(u => [
            `"${u.id}"`, `"${u.name}"`, `"${u.role}"`, `"${u.designation || 'N/A'}"`,
            `"${u.department || 'N/A'}"`, `"${u.location || 'N/A'}"`, `"${u.lastLogin || 'Never'}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Kalike_User_Directory_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    window.exportLoginCredentials = () => {
        const isSuperOrHR = ['superadmin', 'hr'].includes(window.app.user.role);
        if (!isSuperOrHR) { alert('Access denied: superadmin or HR only.'); return; }
        const users = db.users || [];
        const rolePassMap = { superadmin: 'SuperAdmin@2026!', director: 'Director@2026!', finance: 'Finance@2026!', operations: 'Operations@2026!', hr: 'HR@2026!', manager: 'Manager@2026!', employee: 'Employee@2026!' };
        const headers = ["Employee ID", "Name", "Role", "Designation", "Location", "Default Password", "Login URL"];
        const rows = users.map(u => [
            `"${u.id}"`, `"${u.name}"`, `"${u.role}"`, `"${u.designation || 'N/A'}"`,
            `"${u.location || 'N/A'}"`,
            `"${rolePassMap[u.role] || 'Contact Admin'}"`,
            `"${window.location.origin}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `Kalike_Login_Credentials_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    window.applyBulkRoleChange = async () => {
        const fromRole = document.getElementById('bulk-from-role').value;
        const toRole = document.getElementById('bulk-to-role').value;
        if (!fromRole || !toRole || fromRole === toRole) { alert('Select different From and To roles.'); return; }
        const targets = db.users.filter(u => u.role === fromRole);
        if (targets.length === 0) { alert(`No users with role "${fromRole}" found.`); return; }
        if (!confirm(`Change ${targets.length} user(s) from "${fromRole}" → "${toRole}"?`)) return;
        for (const u of targets) {
            await db.updateUser(u.id, { role: toRole });
        }
        await db.syncToCloud();
        window.app.renderContent();
    };

    window.filterUserDirectory = (query) => {
        const q = (query || '').trim().toLowerCase();
        const rows = document.querySelectorAll('#user-directory-tbody tr.user-row');
        let visible = 0;
        rows.forEach(r => {
            const hay = r.getAttribute('data-search') || '';
            const match = q === '' || hay.includes(q);
            r.style.display = match ? '' : 'none';
            if (match) visible++;
        });
        const meta = document.getElementById('user-count-meta');
        if (meta) meta.textContent = q ? `Showing ${visible} of ${rows.length}` : `Active Identities: ${rows.length}`;
    };

    window.simulateUserRole = (id) => {
        const u = db.users.find(x => x.id === id);
        if (!u) return;
        const confirm = window.confirm(`Institutional Audit Mode: Simulate environment as ${u.name} (${u.role})?\n\nThis will reload the dashboard with their specific permission gates.`);
        if (confirm) {
            if (!sessionStorage.getItem('amp_real_user')) sessionStorage.setItem('amp_real_user', JSON.stringify(window.app.user));
            localStorage.setItem('amp_user', JSON.stringify({ ...u, isSimulated: true }));
            window.location.reload();
        }
    };

    return `
        <div class="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 pb-10">
            <header class="flex items-center justify-between">
                <div>
                    <h2 class="page-title">User Governance</h2>
                    <p class="page-subtitle">Identity Access & Role Management</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button onclick="window.exportUserDirectory()" class="btn-ghost flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-sm">download</span>
                        Directory
                    </button>
                    ${['superadmin', 'hr'].includes(user.role) ? `
                    <button onclick="window.exportLoginCredentials()" class="btn-primary bg-emerald-600 hover:bg-emerald-700">
                        <span class="material-symbols-outlined text-sm">key</span>
                        Credentials
                    </button>
                    <button onclick="document.getElementById('bulk-role-panel').classList.toggle('hidden')" class="btn-primary bg-amber-500 hover:bg-amber-600">
                        <span class="material-symbols-outlined text-sm">manage_accounts</span>
                        Bulk Role Change
                    </button>
                    ` : ''}
                    <div class="flex bg-slate-100 p-1 rounded-xl">
                        <button onclick="window.switchGovTab('users')" id="tab-users" class="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg bg-white shadow-sm text-slate-900 transition-all">Identities</button>
                        <button onclick="window.switchGovTab('roles')" id="tab-roles" class="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg text-slate-400 hover:text-slate-600 transition-all">Role Architect</button>
                    </div>
                    <button onclick="window.showAddUserModal()" class="btn-primary">
                        <span class="material-symbols-outlined text-sm">person_add</span>
                        Add User
                    </button>
                </div>
            </header>

            <!-- Bulk Role Change Panel -->
            <div id="bulk-role-panel" class="hidden bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-wrap items-end gap-4">
                <div class="flex items-center gap-2 shrink-0">
                    <span class="material-symbols-outlined text-amber-600">manage_accounts</span>
                    <div>
                        <p class="text-[10px] font-black text-amber-900 uppercase tracking-widest">Bulk Role Reassignment</p>
                        <p class="text-[9px] text-amber-700 font-medium">Change all users of one role to another role at once</p>
                    </div>
                </div>
                <div class="flex flex-wrap items-end gap-3 flex-1 min-w-0">
                    <div class="space-y-1">
                        <label class="text-[9px] font-black text-amber-700 uppercase tracking-widest">From Role</label>
                        <select id="bulk-from-role" class="bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500">
                            <option value="">Select current role...</option>
                            ${db.roles.map(r => `<option value="${r.id}">${r.name} (${db.users.filter(u => u.role === r.id).length} users)</option>`).join('')}
                        </select>
                    </div>
                    <span class="material-symbols-outlined text-amber-400 pb-2">arrow_forward</span>
                    <div class="space-y-1">
                        <label class="text-[9px] font-black text-amber-700 uppercase tracking-widest">To Role</label>
                        <select id="bulk-to-role" class="bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500">
                            <option value="">Select new role...</option>
                            ${db.roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                        </select>
                    </div>
                    <button onclick="window.applyBulkRoleChange()" class="px-5 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-700 transition-all">Apply Change</button>
                </div>
            </div>

            <div id="gov-users-view" class="space-y-6">
                <div class="card-accent flex flex-col flex-1 min-h-0">
                    <div class="card-header">
                        <h3 class="card-title">Institutional User Directory</h3>
                        <span class="card-meta"><span id="user-count-meta">Active Identities: ${users.length}</span></span>
                    </div>

                    <div class="px-6 pt-4 pb-2">
                        <div class="relative max-w-md">
                            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                            <input type="text" id="user-search-input" oninput="window.filterUserDirectory(this.value)" placeholder="Search by name or employee ID..." class="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 pl-10 pr-10 text-xs font-bold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-300" />
                            <button type="button" onclick="document.getElementById('user-search-input').value=''; window.filterUserDirectory('');" class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all" title="Clear">
                                <span class="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    </div>

                    <div class="overflow-auto max-h-[760px] scroll-container flex-1">
                        <table class="dense-table">
                            <thead class="sticky-header">
                                <tr class="bg-slate-100/30">
                                    <th>Identity Name</th>
                                    <th>ID / Emp Code</th>
                                    <th>Governance Role</th>
                                    <th>Program</th>
                                    <th>Last Activity</th>
                                    <th class="text-right px-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="user-directory-tbody">
                                ${users.map(u => `
                                    <tr class="group user-row" data-search="${((u.name || '') + ' ' + (u.id || '') + ' ' + (u.empId || '')).toLowerCase().replace(/"/g, '&quot;')}">
                                        <td>
                                            <div class="flex items-center gap-3">
                                                <img src="${u.avatar || 'https://cdn-icons-png.flaticon.com/512/147/147144.png'}" class="w-8 h-8 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-100" />
                                                <div>
                                                    <p class="font-black text-slate-900">${u.name}</p>
                                                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Active System User</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span class="text-[10px] font-black text-slate-500 font-mono">${u.id}</span></td>
                                        <td>
                                            <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                                                u.role === 'manager' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                                u.role === 'finance' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                                'bg-slate-50 text-slate-400 border-slate-100'
                                            }">
                                                ${db.roles.find(r => r.id === u.role)?.name || u.role}
                                            </span>
                                        </td>
                                        <td>
                                            ${u.program ? `<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">${programLabel(u.program)}</span>` : `<span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">— Unassigned —</span>`}
                                        </td>
                                        <td>
                                            <span class="text-[9px] font-black text-slate-400 uppercase tabular-nums">${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}</span>
                                        </td>
                                        <td class="text-right px-6">
                                            <div class="flex items-center justify-end gap-2">
                                                <button onclick="window.app.navigateTo('profile', '${u.id}')" title="View Full Institutional Profile" class="w-8 h-8 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center justify-center">
                                                    <span class="material-symbols-outlined text-[16px]">account_circle</span>
                                                </button>
                                                <button onclick="window.simulateUserRole('${u.id}')" title="Simulate this role" class="w-8 h-8 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-amber-600 hover:border-amber-100 transition-all flex items-center justify-center">
                                                    <span class="material-symbols-outlined text-[16px]">visibility</span>
                                                </button>
                                                <button onclick="window.showEditUserModal('${u.id}')" class="w-8 h-8 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center justify-center">
                                                    <span class="material-symbols-outlined text-[16px]">edit_note</span>
                                                </button>
                                                <button onclick="window.deleteUser('${u.id}')" class="w-8 h-8 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 transition-all flex items-center justify-center">
                                                    <span class="material-symbols-outlined text-[16px]">person_remove</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="gov-roles-view" class="hidden space-y-4">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div class="lg:col-span-1 card p-4 space-y-4">
                        <h4 class="card-title border-b border-slate-100 pb-3">Role Architect</h4>
                        <div class="space-y-3">
                            <div class="form-row">
                                <label class="form-label">Internal Role Name</label>
                                <input type="text" id="new-role-name" placeholder="e.g. Project Lead" class="form-input" />
                            </div>
                            <div class="form-row">
                                <label class="form-label">Internal ID Code</label>
                                <input type="text" id="new-role-id" placeholder="e.g. project_lead" class="form-input" />
                            </div>
                            <div class="form-row">
                                <label class="form-label">Authority Level (0-10)</label>
                                <input type="number" id="new-role-level" value="1" class="form-input" />
                            </div>
                            <button onclick="window.createRole()" class="btn-primary w-full justify-center">Define New Role</button>
                        </div>
                    </div>

                    <div class="lg:col-span-2 card-accent flex flex-col overflow-hidden">
                        <div class="card-header">
                            <h3 class="card-title">Institutional Roles</h3>
                        </div>
                        <div class="overflow-auto max-h-[500px]">
                            <table class="dense-table">
                                <thead class="bg-slate-100/30">
                                    <tr>
                                        <th>Role Definition</th>
                                        <th>Level</th>
                                        <th>Default Allotments</th>
                                        <th class="text-right px-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${db.roles.map(r => `
                                        <tr>
                                            <td><span class="text-xs font-black text-slate-900 uppercase tracking-tight">${r.name}</span></td>
                                            <td><span class="text-[10px] font-black text-indigo-600 font-mono">LVL ${r.level}</span></td>
                                            <td>
                                                <div class="flex flex-wrap gap-1 max-w-xs">
                                                    ${JSON.parse(r.permissions || '[]').map(p => `<span class="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[8px] font-black rounded uppercase border border-slate-100">${p}</span>`).join('')}
                                                </div>
                                            </td>
                                             <td class="text-right px-6">
                                                <div class="flex items-center justify-end gap-2">
                                                    <button onclick="window.showEditRoleModal('${r.id}')" class="w-7 h-7 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 transition-all flex items-center justify-center">
                                                        <span class="material-symbols-outlined text-[14px]">settings_suggest</span>
                                                    </button>
                                                    ${!r.isDefault ? `
                                                        <button onclick="window.deleteRole('${r.id}')" class="w-7 h-7 rounded-lg bg-white border border-slate-100 text-slate-300 hover:text-rose-600 transition-all flex items-center justify-center">
                                                            <span class="material-symbols-outlined text-[14px]">delete</span>
                                                        </button>
                                                    ` : ''}
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Role Config Modal -->
        <div id="role-modal" class="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300">
             <div id="role-modal-content" class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl scale-95 transition-transform duration-300 flex flex-col overflow-hidden mx-4 max-h-[90vh]">
                 <div class="card-header">
                    <h3 id="role-modal-title" class="card-title">Configure Role</h3>
                    <button onclick="window.hideRoleModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                 </div>

                 <div class="p-5 space-y-4 overflow-y-auto" id="role-modal-body">
                    <div class="grid grid-cols-2 gap-3">
                        <div class="form-row">
                            <label class="form-label">Role Name</label>
                            <input type="text" id="role-name" class="form-input" />
                        </div>
                        <div class="form-row">
                            <label class="form-label">Authority Level (0-10)</label>
                            <input type="number" id="role-level" class="form-input" />
                        </div>
                    </div>

                    ${user.role === 'superadmin' ? `
                    <!-- Super Admin shortcut — only visible to superadmin -->
                    <label class="flex items-start gap-3 p-3 rounded-xl border-2 border-rose-200 bg-rose-50/60 cursor-pointer hover:bg-rose-50 transition-colors">
                        <input type="checkbox" value="all" class="role-perm-checkbox accent-rose-600 mt-0.5 w-4 h-4" />
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-black text-rose-700 uppercase tracking-wider">Super Admin Powers</div>
                            <div class="text-[10px] text-rose-600/80 font-medium mt-0.5">Grants access to everything, including Analytics &amp; Audit Log.</div>
                        </div>
                    </label>
                    ` : ''}

                    <!-- ASSETS -->
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[14px] text-slate-400">inventory_2</span>
                            <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assets</div>
                        </div>
                        <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" value="manage_assets" class="role-perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-bold text-slate-800">Manage Assets</div>
                                <div class="text-[10px] text-slate-500 mt-1">Unlocks: Registry · Transfers · Maintenance</div>
                            </div>
                        </label>
                    </div>

                    <!-- FINANCE -->
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[14px] text-slate-400">account_balance_wallet</span>
                            <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Finance</div>
                        </div>
                        <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" value="approve_finance" class="role-perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-bold text-slate-800">Finance Approvals</div>
                                <div class="text-[10px] text-slate-500 mt-1">
                                    <span class="font-bold text-slate-600">Finance:</span> Bank Payment · Payment Programs · Bank Accounts<br/>
                                    <span class="font-bold text-slate-600">Assets:</span> Registry · Fixed Assets · Depreciation · FAR · Grants<br/>
                                    <span class="font-bold text-slate-600">Work:</span> Procurement
                                </div>
                            </div>
                        </label>
                        <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" value="manage_payroll" class="role-perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-bold text-slate-800">Manage Payroll</div>
                                <div class="text-[10px] text-slate-500 mt-1">Unlocks: Payroll</div>
                            </div>
                        </label>
                    </div>

                    <!-- WORK -->
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[14px] text-slate-400">work</span>
                            <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Work</div>
                        </div>
                        <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" value="approve_requests" class="role-perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-bold text-slate-800">Approve Requests</div>
                                <div class="text-[10px] text-slate-500 mt-1">Procurement (also opens with Finance Approvals or Manage Assets)</div>
                            </div>
                        </label>
                    </div>

                    <!-- PEOPLE -->
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[14px] text-slate-400">group</span>
                            <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">People</div>
                        </div>
                        <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" value="manage_team" class="role-perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-bold text-slate-800">Manage Team</div>
                                <div class="text-[10px] text-slate-500 mt-1">Unlocks: My Team · Team Dashboard · Program Dashboard</div>
                            </div>
                        </label>
                        <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" value="manage_users" class="role-perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-bold text-slate-800">Manage Users</div>
                                <div class="text-[10px] text-slate-500 mt-1">Unlocks: Users · My Team · Team Dashboard · Program Dashboard</div>
                            </div>
                        </label>
                    </div>

                    <!-- ADMINISTRATION -->
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[14px] text-slate-400">shield_person</span>
                            <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Administration</div>
                        </div>
                        <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" value="view_reports" class="role-perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-bold text-slate-800">View Reports</div>
                                <div class="text-[10px] text-slate-500 mt-1">Unlocks: Reports · Team Dashboard</div>
                            </div>
                        </label>
                        <div class="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                            <div class="text-[10px] text-slate-500"><span class="font-bold text-slate-600">Analytics &amp; Audit Log</span> require Super Admin Powers.</div>
                        </div>
                    </div>

                    <!-- Always available -->
                    <div class="space-y-2 pt-2 border-t border-slate-100">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                            <div class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Always available (no permission needed)</div>
                        </div>
                        <div class="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-[10px] text-slate-600 leading-relaxed">
                            Home · Request Asset · Report Issue · Attendance · Leave · Calendar · Worklog · Tasks · Expenses · Org Chart · Reviews · Board · Social Hub · Data Collection · Vault
                        </div>
                    </div>
                 </div>

                 <div class="card-header border-t border-slate-100 border-b-0 flex justify-end gap-3">
                    <button onclick="window.hideRoleModal()" class="btn-ghost">Cancel</button>
                    <button id="role-save-btn" onclick="window.saveRole()" class="btn-primary">Persist Role Configuration</button>
                 </div>
             </div>
        </div>

        <!-- Add/Edit User Modal -->
        <div id="user-modal" class="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm hidden flex-col items-center justify-center opacity-0 transition-opacity duration-300">
             <div id="user-modal-content" class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl scale-95 transition-transform duration-300 flex flex-col overflow-hidden mx-4 max-h-[90vh]">
                 <div class="card-header">
                    <h3 id="user-modal-title" class="card-title">Register Identity</h3>
                    <button onclick="window.hideUserModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                 </div>

                 <div class="p-4 space-y-3 overflow-y-auto">
                    <div class="form-row">
                        <label class="form-label">Display Name</label>
                        <input type="text" id="user-name" class="form-input" placeholder="Enter Full Name" />
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div class="form-row">
                            <label class="form-label">Unique ID / Code</label>
                            <input type="text" id="user-id" class="form-input" placeholder="EMP-123" />
                        </div>
                        <div class="form-row">
                            <label class="form-label">Base Role Level</label>
                            <select id="user-role" class="form-input">
                                ${db.roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <label class="form-label">Security Key (Password)</label>
                        <input type="text" id="user-password" class="form-input" placeholder="Set Secure Password" />
                    </div>

                    ${['superadmin', 'hr'].includes(user.role) ? `
                    <div class="form-row">
                        <label class="form-label">Program Assignment <span class="text-[9px] text-slate-400 font-bold normal-case tracking-normal">(scopes Team Dashboard for managers)</span></label>
                        <select id="user-program" class="form-input">
                            <option value="">— Unassigned —</option>
                            ${PROGRAMS.map(p => `<option value="${p.id}">${p.label}</option>`).join('')}
                        </select>
                    </div>
                    ` : ''}

                    <div class="space-y-3 pt-3 border-t border-slate-100" id="permissions-matrix">
                        <div>
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity-Specific Allotments</label>
                            <div class="text-[10px] text-slate-500 mt-1">Overrides this user's role. Leave all unchecked to fall back to role defaults.</div>
                        </div>

                        ${user.role === 'superadmin' ? `
                        <!-- Super Admin — only visible to superadmin -->
                        <label class="flex items-start gap-3 p-3 rounded-xl border-2 border-rose-200 bg-rose-50/60 cursor-pointer hover:bg-rose-50 transition-colors">
                            <input type="checkbox" value="all" class="perm-checkbox accent-rose-600 mt-0.5 w-4 h-4" />
                            <div class="flex-1 min-w-0">
                                <div class="text-xs font-black text-rose-700 uppercase tracking-wider">Super Admin Powers</div>
                                <div class="text-[10px] text-rose-600/80 font-medium mt-0.5">Grants access to everything, including Analytics &amp; Audit Log.</div>
                            </div>
                        </label>
                        ` : ''}

                        <!-- ASSETS -->
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[14px] text-slate-400">inventory_2</span>
                                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Assets</div>
                            </div>
                            <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input type="checkbox" value="manage_assets" class="perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-xs font-bold text-slate-800">Manage Assets</div>
                                    <div class="text-[10px] text-slate-500 mt-1">Unlocks: Registry · Transfers · Maintenance</div>
                                </div>
                            </label>
                        </div>

                        <!-- FINANCE -->
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[14px] text-slate-400">account_balance_wallet</span>
                                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Finance</div>
                            </div>
                            <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input type="checkbox" value="approve_finance" class="perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-xs font-bold text-slate-800">Finance Approvals</div>
                                    <div class="text-[10px] text-slate-500 mt-1">
                                        <span class="font-bold text-slate-600">Finance:</span> Bank Payment · Payment Programs · Bank Accounts<br/>
                                        <span class="font-bold text-slate-600">Assets:</span> Registry · Fixed Assets · Depreciation · FAR · Grants<br/>
                                        <span class="font-bold text-slate-600">Work:</span> Procurement
                                    </div>
                                </div>
                            </label>
                            <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input type="checkbox" value="manage_payroll" class="perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-xs font-bold text-slate-800">Manage Payroll</div>
                                    <div class="text-[10px] text-slate-500 mt-1">Unlocks: Payroll</div>
                                </div>
                            </label>
                        </div>

                        <!-- WORK -->
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[14px] text-slate-400">work</span>
                                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Work</div>
                            </div>
                            <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input type="checkbox" value="approve_requests" class="perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-xs font-bold text-slate-800">Approve Requests</div>
                                    <div class="text-[10px] text-slate-500 mt-1">Procurement (also opens with Finance Approvals or Manage Assets)</div>
                                </div>
                            </label>
                        </div>

                        <!-- PEOPLE -->
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[14px] text-slate-400">group</span>
                                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">People</div>
                            </div>
                            <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input type="checkbox" value="manage_team" class="perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-xs font-bold text-slate-800">Manage Team</div>
                                    <div class="text-[10px] text-slate-500 mt-1">Unlocks: My Team · Team Dashboard · Program Dashboard</div>
                                </div>
                            </label>
                            <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input type="checkbox" value="manage_users" class="perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-xs font-bold text-slate-800">Manage Users</div>
                                    <div class="text-[10px] text-slate-500 mt-1">Unlocks: Users · My Team · Team Dashboard · Program Dashboard</div>
                                </div>
                            </label>
                        </div>

                        <!-- ADMINISTRATION -->
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[14px] text-slate-400">shield_person</span>
                                <div class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Administration</div>
                            </div>
                            <label class="flex items-start gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                <input type="checkbox" value="view_reports" class="perm-checkbox accent-slate-900 mt-0.5 w-4 h-4" />
                                <div class="flex-1 min-w-0">
                                    <div class="text-xs font-bold text-slate-800">View Reports</div>
                                    <div class="text-[10px] text-slate-500 mt-1">Unlocks: Reports · Team Dashboard</div>
                                </div>
                            </label>
                            <div class="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200">
                                <div class="text-[10px] text-slate-500"><span class="font-bold text-slate-600">Analytics &amp; Audit Log</span> require Super Admin Powers.</div>
                            </div>
                        </div>

                        <!-- Always available -->
                        <div class="space-y-2 pt-2 border-t border-slate-100">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                                <div class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Always available (no permission needed)</div>
                            </div>
                            <div class="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-[10px] text-slate-600 leading-relaxed">
                                Home · Request Asset · Report Issue · Attendance · Leave · Calendar · Worklog · Tasks · Expenses · Org Chart · Reviews · Board · Social Hub · Data Collection · Vault
                            </div>
                        </div>
                    </div>
                 </div>

                 <div class="card-header border-t border-slate-100 border-b-0 flex justify-end gap-3">
                    <button onclick="window.hideUserModal()" class="btn-ghost">Cancel</button>
                    <button id="user-save-btn" onclick="window.saveUser()" class="btn-primary">Persist Identity</button>
                 </div>
             </div>
        </div>
    `;
}

    // Governance Tab Switcher
    window.switchGovTab = (tab) => {
        const uView = document.getElementById('gov-users-view');
        const rView = document.getElementById('gov-roles-view');
        const uBtn = document.getElementById('tab-users');
        const rBtn = document.getElementById('tab-roles');
        
        if (tab === 'users') {
            uView.classList.remove('hidden');
            rView.classList.add('hidden');
            uBtn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
            uBtn.classList.remove('text-slate-400');
            rBtn.classList.add('text-slate-400');
            rBtn.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
        } else {
            uView.classList.add('hidden');
            rView.classList.remove('hidden');
            rBtn.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
            rBtn.classList.remove('text-slate-400');
            uBtn.classList.add('text-slate-400');
            uBtn.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
        }
    };

    window.createRole = async () => {
        const name = document.getElementById('new-role-name').value;
        const id = document.getElementById('new-role-id').value;
        const level = document.getElementById('new-role-level').value;
        
        if (!name || !id) return alert('Please provide role name and ID.');
        
        await db.addRole({ id, name, level });
        window.renderPage('user_management');
    };

    window.deleteRole = async (id) => {
        if (!confirm('Are you sure you want to delete this role?')) return;
        const success = await db.deleteRole(id);
        if (!success) alert('Cannot delete core system roles.');
        window.renderPage('user_management');
    };

    let editingRoleId = null;
    window.showEditRoleModal = (id) => {
        editingRoleId = id;
        const r = db.roles.find(x => x.id === id);
        if (!r) return;
        const modal = document.getElementById('role-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        document.getElementById('role-name').value = r.name;
        document.getElementById('role-level').value = r.level;
        
        const perms = JSON.parse(r.permissions || '[]');
        document.querySelectorAll('.role-perm-checkbox').forEach(cb => {
            cb.checked = perms.includes(cb.value);
        });

        setTimeout(() => {
            modal.classList.remove('opacity-0');
            document.getElementById('role-modal-content').classList.remove('scale-95');
        }, 10);
    };

    window.hideRoleModal = () => {
        const modal = document.getElementById('role-modal');
        modal.classList.add('opacity-0');
        document.getElementById('role-modal-content').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    };

    window.saveRole = async () => {
        const name = document.getElementById('role-name').value;
        const level = document.getElementById('role-level').value;
        const permissions = [];
        document.querySelectorAll('.role-perm-checkbox:checked').forEach(cb => {
            permissions.push(cb.value);
        });
        // Only an actual superadmin can grant `all` — strip it otherwise.
        const safePerms = window.app.user?.role === 'superadmin'
            ? permissions
            : permissions.filter(p => p !== 'all');

        await db.updateRole(editingRoleId, {
            name,
            level: parseInt(level),
            permissions: JSON.stringify(safePerms)
        });
        
        db._logActivity('Role Configuration Updated', `Updated permissions and level for ${name}`);
        await db.syncToCloud();
        window.hideRoleModal();
        window.renderPage('user_management');
    };

    let editingUserId = null;

    window.showAddUserModal = () => {
        editingUserId = null;
        const modal = document.getElementById('user-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.getElementById('user-modal-title').innerText = 'Register Institutional Identity';
        document.getElementById('user-id').disabled = false;
        document.getElementById('user-id').value = '';
        document.getElementById('user-name').value = '';
        document.getElementById('user-password').value = '';
        document.getElementById('user-role').value = 'employee';
        const addProgEl = document.getElementById('user-program');
        if (addProgEl) addProgEl.value = '';

        document.querySelectorAll('.perm-checkbox').forEach(cb => cb.checked = false);

        setTimeout(() => {
            modal.classList.remove('opacity-0');
            document.getElementById('user-modal-content').classList.remove('scale-95');
        }, 10);
    };

    window.showEditUserModal = (id) => {
        editingUserId = id;
        const u = db.users.find(x => x.id === id);
        if (!u) return;
        const modal = document.getElementById('user-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.getElementById('user-modal-title').innerText = 'Edit Identity Authority';
        
        document.getElementById('user-id').value = u.id;
        document.getElementById('user-id').disabled = true;
        document.getElementById('user-name').value = u.name;
        document.getElementById('user-role').value = u.role;
        document.getElementById('user-password').value = u.password;
        const editProgEl = document.getElementById('user-program');
        if (editProgEl) editProgEl.value = u.program || '';

        const perms = JSON.parse(u.permissions || '[]');
        document.querySelectorAll('.perm-checkbox').forEach(cb => {
            cb.checked = perms.includes(cb.value);
        });

        setTimeout(() => {
            modal.classList.remove('opacity-0');
            document.getElementById('user-modal-content').classList.remove('scale-95');
        }, 10);
    };

    window.hideUserModal = () => {
        const modal = document.getElementById('user-modal');
        modal.classList.add('opacity-0');
        document.getElementById('user-modal-content').classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    };

    window.saveUser = async () => {
        const id = document.getElementById('user-id').value;
        const name = document.getElementById('user-name').value;
        const role = document.getElementById('user-role').value;
        const password = document.getElementById('user-password').value;
        const progEl = document.getElementById('user-program');
        const program = progEl ? (progEl.value || null) : undefined;

        const permissions = [];
        document.querySelectorAll('.perm-checkbox:checked').forEach(cb => {
            permissions.push(cb.value);
        });
        // Only an actual superadmin can grant `all` — strip it otherwise.
        const safePerms = window.app.user?.role === 'superadmin'
            ? permissions
            : permissions.filter(p => p !== 'all');

        if (editingUserId) {
            const idx = db.users.findIndex(u => u.id === editingUserId);
            if (idx !== -1) {
                const patch = { name, role, password, permissions: JSON.stringify(safePerms) };
                if (program !== undefined) patch.program = program;
                db.users[idx] = { ...db.users[idx], ...patch };
                db._logActivity('Identity Modified', `Updated authority for ${name} (${id})`);
            }
        } else {
            if (db.users.find(u => u.id === id)) return alert('Identity ID already exists.');
            const newUser = { id, name, role, password, permissions: JSON.stringify(safePerms) };
            if (program !== undefined) newUser.program = program;
            db.users.push(newUser);
            db._logActivity('Identity Created', `Registered new identity: ${name} (${id})`);
        }

        await db.syncToCloud();
        window.hideUserModal();
        window.renderPage('user_management');
    };

    window.deleteUser = async (id) => {
        if (id === 'admin') return alert('Cannot remove primary admin.');
        if (!confirm('Destroy identity access for this user?')) return;
        db.users = db.users.filter(u => u.id !== id);
        await db.syncToCloud();
        window.renderPage('user_management');
    };
