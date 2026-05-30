import { db } from '../mock/db.js';

export function renderReimbursementPage(user) {
    const isFinance = window.app.hasPermission('approve_finance');
    const isManager = window.app.hasPermission('manage_team');
    const isSuper = isFinance;
    const canSeeTeam = isManager || isSuper;
    const isAdmin = canSeeTeam;

    if (!window.app.reimbursementContext) window.app.reimbursementContext = isSuper ? 'all' : (canSeeTeam ? 'team' : 'personal');
    const context = window.app.reimbursementContext;

    const items = db.reimbursements.filter(r => {
        if (context === 'personal') return r.empId === user.empId;
        if (context === 'team') return r.reportsTo === user.empId || (isManager && r.department === user.department);
        if (context === 'all' && isSuper) return true;
        if (r.empId === user.empId) return true;
        return false;
    });

    const statusColor = (s) => s === 'Settled' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : s === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : s.includes('Approved') ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100';
    const catIcon = (c) => c === 'Travel' ? 'flight' : c === 'Food' ? 'restaurant' : c === 'Accommodation' ? 'hotel' : c === 'Office Supplies' ? 'inventory_2' : 'receipt_long';

    const totalPending = items.filter(r => r.status === 'Pending').reduce((s, r) => s + r.amount, 0);
    const totalSettled = items.filter(r => r.status === 'Settled').reduce((s, r) => s + r.amount, 0);

    return `
    <div class="w-full space-y-4 animate-fade-in-up">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="page-title">Expense Claims & Settlements</h1>
                <div class="flex items-center gap-4 mt-2">
                    <button onclick="window.app.reimbursementContext = 'personal'; window.app.navigateTo('reimbursements')" class="text-[9px] font-black uppercase tracking-widest ${context === 'personal' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} transition-colors">Personal</button>
                    ${canSeeTeam ? `<button onclick="window.app.reimbursementContext = 'team'; window.app.navigateTo('reimbursements')" class="text-[9px] font-black uppercase tracking-widest ${context === 'team' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} transition-colors">Team Oversight</button>` : ''}
                    ${isSuper ? `<button onclick="window.app.reimbursementContext = 'all'; window.app.navigateTo('reimbursements')" class="text-[9px] font-black uppercase tracking-widest ${context === 'all' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} transition-colors">Global Settlement</button>` : ''}
                </div>
            </div>
            ${!isAdmin ? `<button onclick="document.getElementById('rmb-form').classList.toggle('hidden')" class="btn-primary">
                <span class="material-symbols-outlined text-sm">add</span> New Claim
            </button>` : ''}
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="stat-tile">
                <div class="stat-strip bg-amber-500"></div>
                <span class="stat-label ml-1">Pending</span>
                <p class="stat-value ml-1 text-amber-600 text-xl">₹${totalPending.toLocaleString('en-IN')}</p>
            </div>
            <div class="stat-tile">
                <div class="stat-strip bg-emerald-500"></div>
                <span class="stat-label ml-1">Settled</span>
                <p class="stat-value ml-1 text-emerald-600 text-xl">₹${totalSettled.toLocaleString('en-IN')}</p>
            </div>
            <div class="stat-tile">
                <div class="stat-strip bg-slate-400"></div>
                <span class="stat-label ml-1">Total Claims</span>
                <p class="stat-value ml-1 text-xl">${items.length}</p>
            </div>
        </div>

        <!-- Submit Form (Employee) -->
        ${!isAdmin ? `
        <div id="rmb-form" class="hidden card p-4 space-y-3">
            <h3 class="card-title">Submit Expense Claim</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="form-row">
                    <label class="form-label">Category</label>
                    <select id="rmb-cat" class="form-input">
                        <option value="Travel">Travel</option><option value="Food">Food & Meals</option><option value="Accommodation">Accommodation</option><option value="Office Supplies">Office Supplies</option><option value="Communication">Communication</option><option value="Other">Other</option>
                    </select>
                </div>
                <div class="form-row">
                    <label class="form-label">Amount (₹)</label>
                    <input type="number" id="rmb-amt" placeholder="0" class="form-input" />
                </div>
                <div class="form-row">
                    <label class="form-label">Bill Date</label>
                    <input type="date" id="rmb-date" class="form-input" />
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="form-row">
                    <label class="form-label">Bill Number</label>
                    <input type="text" id="rmb-bill" placeholder="Bill/Invoice #" class="form-input" />
                </div>
                <div class="form-row">
                    <label class="form-label">Travel From</label>
                    <input type="text" id="rmb-from" placeholder="Origin" class="form-input" />
                </div>
                <div class="form-row">
                    <label class="form-label">Travel To</label>
                    <input type="text" id="rmb-to" placeholder="Destination" class="form-input" />
                </div>
            </div>
            <div class="form-row">
                <label class="form-label">Description / Purpose</label>
                <textarea id="rmb-desc" rows="3" placeholder="Describe the expense..." class="form-input resize-none"></textarea>
            </div>
            <button onclick="(() => {
                const amt = document.getElementById('rmb-amt').value;
                const desc = document.getElementById('rmb-desc').value.trim();
                if (!amt || !desc) { alert('Amount and description required'); return; }
                db.submitReimbursement({
                    empId: user.empId,
                    empName: user.name,
                    category: document.getElementById('rmb-cat').value,
                    amount: amt,
                    description: desc,
                    billDate: document.getElementById('rmb-date').value,
                    billNumber: document.getElementById('rmb-bill').value,
                    travelFrom: document.getElementById('rmb-from').value,
                    travelTo: document.getElementById('rmb-to').value,
                    department: user.department,
                    location: user.location,
                    reportsTo: user.reportsTo
                });
                app.navigateTo('reimbursements');
            })()" class="btn-warn">Submit Claim</button>
        </div>` : ''}

        <!-- Claims List -->
        <div class="card overflow-hidden">
            <div class="divide-y divide-slate-50 max-h-[55vh] overflow-y-auto">
                ${items.length > 0 ? items.map(r => `
                    <div class="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                        <div class="flex items-center justify-between gap-4">
                            <div class="flex items-center gap-4 flex-1">
                                <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><span class="material-symbols-outlined text-xl">${catIcon(r.category)}</span></div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="text-sm font-black text-slate-900">${r.empName}</span>
                                        <span class="text-xs font-bold text-slate-500">${r.category}</span>
                                        <span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full border ${statusColor(r.status)}">${r.status}</span>
                                    </div>
                                    <p class="text-[11px] text-slate-500 mt-0.5 truncate">${r.description}</p>
                                    <p class="text-[10px] text-slate-400 mt-0.5">${r.billDate || ''} ${r.travelFrom ? `• ${r.travelFrom} → ${r.travelTo}` : ''}</p>
                                </div>
                            </div>
                            <div class="text-right shrink-0">
                                <p class="text-lg font-black text-slate-900 tabular-nums">₹${r.amount.toLocaleString('en-IN')}</p>
                                <p class="text-[9px] text-slate-400">${r.submittedOn}</p>
                            </div>
                            ${isManager && r.status === 'Pending' && (r.reportsTo === user.empId || isFinance) ? `
                            <div class="flex gap-1 shrink-0">
                                <button onclick="db.approveReimbursementManager('${r.id}','');app.navigateTo('reimbursements')" class="px-2 py-1 bg-emerald-600 text-white text-[8px] font-black rounded-lg uppercase">Approve</button>
                                <button onclick="db.rejectReimbursement('${r.id}','${user.empId}','Rejected by manager');app.navigateTo('reimbursements')" class="px-2 py-1 bg-rose-600 text-white text-[8px] font-black rounded-lg uppercase">Reject</button>
                            </div>` : ''}
                            ${isFinance && (r.status === 'Manager Approved' || r.status === 'Approved - Pending Settlement') ? `
                            <div class="flex gap-1 shrink-0">
                                ${r.status === 'Manager Approved' ? `<button onclick="db.approveReimbursementAdmin('${r.id}','');app.navigateTo('reimbursements')" class="px-2 py-1 bg-blue-600 text-white text-[8px] font-black rounded-lg uppercase">Admin OK</button>` : ''}
                                ${r.status === 'Approved - Pending Settlement' ? `<button onclick="db.settleReimbursement('${r.id}','${user.empId}','${user.name}');app.navigateTo('reimbursements')" class="px-2 py-1 bg-emerald-600 text-white text-[8px] font-black rounded-lg uppercase">Settle</button>` : ''}
                            </div>` : ''}
                        </div>
                    </div>
                `).join('') : '<div class="px-6 py-12 text-center text-xs text-slate-400 italic uppercase tracking-widest">No expense claims</div>'}
            </div>
        </div>
    </div>`;
}
