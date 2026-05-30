import { db } from '../mock/db.js';

export function renderOrgChartPage(user) {
    const isSuperAdmin = window.app.hasPermission('manage_users') || window.app.hasPermission('all');
    const allUsers = db.users;

    // Roots: users that don't report to anyone
    const roots = db.hierarchy.filter(h => !h.reportsTo || h.reportsTo === '');
    const getChildren = (empId) => db.hierarchy.filter(h => h.reportsTo === empId);

    const renderNode = (h, depth = 0) => {
        const children = getChildren(h.empId);
        const emp = allUsers.find(u => u.id === h.empId);
        const role = db.roles.find(r => r.id === emp?.role);
        
        return `
            <div class="relative">
                <div class="flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative z-10">
                    <div class="relative cursor-pointer" onclick="window.app.navigateTo('profile', '${h.empId}')">
                        <img src="${emp?.avatar || 'https://cdn-icons-png.flaticon.com/512/147/147144.png'}" class="w-12 h-12 rounded-2xl border-2 border-white shadow-md shadow-slate-200 object-cover" />
                        <div class="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 border-2 border-white rounded-lg flex items-center justify-center">
                            <span class="material-symbols-outlined text-white text-[10px]">${depth === 0 ? 'grade' : 'person'}</span>
                        </div>
                    </div>
                    
                    <div class="flex-1 min-w-0 cursor-pointer" onclick="window.app.navigateTo('profile', '${h.empId}')">
                        <div class="flex items-center gap-2">
                            <h4 class="text-xs font-black text-slate-900 uppercase tracking-tight truncate">${h.empName}</h4>
                            <span class="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black rounded uppercase">${role?.name || 'User'}</span>
                        </div>
                        <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">${emp?.designation || 'N/A'}</p>
                        <div class="flex items-center gap-2 mt-1.5">
                            <span class="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded">${h.department || 'Operations'}</span>
                            <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">${emp?.location || 'Yadgir'}</span>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="window.app.navigateTo('profile', '${h.empId}')" title="View Full Profile" class="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center">
                            <span class="material-symbols-outlined text-[18px]">account_circle</span>
                        </button>
                        ${isSuperAdmin ? `
                            <button onclick="window.showReassignModal('${h.empId}')" title="Reassign Reporting Line" class="w-8 h-8 rounded-xl bg-slate-50 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center">
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
                    </div>
                ` : ''}
            </div>`;
    };

    return `
    <div class="w-full space-y-4 animate-fade-in-up pb-10">
        <header class="flex items-center justify-between">
            <div>
                <h1 class="page-title">Institutional Tree</h1>
                <p class="page-subtitle">Strategic Reporting & Chain of Command</p>
            </div>
            <div class="flex items-center gap-3">
                <div class="bg-white p-1 rounded-xl border border-slate-100 flex shadow-sm">
                    <div class="px-3 py-2 text-center">
                        <p class="stat-label">Coverage</p>
                        <p class="text-xs font-black text-slate-900">${Math.round((db.hierarchy.length / allUsers.length) * 100)}%</p>
                    </div>
                    <div class="w-[1px] bg-slate-100 h-8 self-center"></div>
                    <div class="px-3 py-2 text-center">
                        <p class="stat-label">Unmapped</p>
                        <p class="text-xs font-black text-rose-500">${allUsers.length - db.hierarchy.length}</p>
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

        <div class="bg-slate-50/50 rounded-xl border border-slate-200 shadow-inner p-6 min-h-[400px] overflow-auto">
            ${roots.length > 0 ? `
                <div class="w-full space-y-12">
                    ${roots.map(r => renderNode(r)).join('')}
                </div>
            ` : `
                <div class="flex flex-col items-center justify-center h-[400px] text-center space-y-4">
                    <div class="w-20 h-20 bg-white rounded-[32px] border-2 border-slate-100 flex items-center justify-center shadow-sm">
                        <span class="material-symbols-outlined text-4xl text-slate-200">family_history</span>
                    </div>
                    <div>
                        <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">No Structure Defined</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Establish reporting lines to visualize your organization</p>
                    </div>
                </div>
            `}
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

