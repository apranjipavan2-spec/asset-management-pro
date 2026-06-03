import { db } from '../mock/db.js';
import { showSignatureModal } from './SignaturePad.js';

export function renderProcurementPage(user) {
    const isManager = window.app.hasPermission('approve_requests');
    const isFinance = window.app.hasPermission('approve_finance');
    const isOperations = window.app.hasPermission('manage_transfers');
    const isDirector = window.app.hasPermission('all');

    // Filter items based on institutional access
    const isSuper = isOperations || isFinance || isDirector;
    const canSeeTeam = isManager || isSuper;

    // Persist view context in app state if not provided
    if (!window.app.procurementContext) window.app.procurementContext = isSuper ? 'all' : (canSeeTeam ? 'team' : 'personal');
    const context = window.app.procurementContext;

    const items = db.procurement.filter(p => {
        if (context === 'personal') return p.requestedBy === user.empId;
        if (context === 'team') return p.reportsTo === user.empId || (isManager && p.department === user.department);
        if (context === 'all' && isSuper) return true;
        // Fallback for unauthorized context
        if (p.requestedBy === user.empId) return true;
        return false;
    });

    const employees = db.users.filter(u => u.role === 'employee');

    const stepLabels = { draft: 'Draft', submitted: 'Submitted', manager_approved: 'Manager OK', finance_approved: 'Finance OK', director_approved: 'ED OK', admin_approved: 'PO Issued', delivered: 'Delivered', asset_registered: 'Complete', rejected: 'Rejected' };
    const steps = ['submitted', 'manager_approved', 'finance_approved', 'director_approved', 'admin_approved', 'delivered', 'asset_registered'];

    const stepColor = (s) => s === 'rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : s === 'asset_registered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100';

    window.showProcSignature = (id, amount) => {
        showSignatureModal(id, user, (sigData) => {
            db.advanceProcurement(id, 'finance_approved', { by: user.empId, approvedAmount: amount });
            app.navigateTo('procurement');
        });
    };

    // ----- Action modals (Reject / Issue PO / Mark Delivered) -----
    const showProcModal = (innerHtml, id = 'proc-action-modal') => {
        document.getElementById(id)?.remove();
        const div = document.createElement('div');
        div.innerHTML = `
            <div id="${id}" class="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onclick="if(event.target===this) this.remove()">
                <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                    ${innerHtml}
                </div>
            </div>`;
        document.body.appendChild(div.firstElementChild);
    };

    window.procReject = (id) => {
        showProcModal(`
            <div class="p-6 space-y-4">
                <h3 class="text-sm font-black text-rose-700 uppercase tracking-widest">Reject Request</h3>
                <p class="text-[11px] text-slate-500">This will close the request. The requester will be notified.</p>
                <label class="block text-[9px] font-black text-slate-400 uppercase">Reason for rejection</label>
                <textarea id="proc-reject-reason" rows="3" placeholder="Insufficient budget, vendor unverified, etc." class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-rose-500 outline-none resize-none"></textarea>
                <div class="flex justify-end gap-2 pt-2">
                    <button onclick="document.getElementById('proc-action-modal').remove()" class="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900">Cancel</button>
                    <button onclick="(() => {
                        const reason = document.getElementById('proc-reject-reason').value.trim();
                        if (!reason) { alert('Please provide a reason.'); return; }
                        db.rejectProcurement('${id}', '${user.empId}', reason);
                        document.getElementById('proc-action-modal').remove();
                        app.navigateTo('procurement');
                    })()" class="px-4 py-2 bg-rose-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-rose-700">Confirm Reject</button>
                </div>
            </div>
        `);
    };

    window.procIssuePO = (id) => {
        const p = db.procurement.find(x => x.id === id);
        if (!p) return;
        const defaultPo = 'PO-' + Date.now();
        showProcModal(`
            <div class="p-6 space-y-4">
                <h3 class="text-sm font-black text-violet-700 uppercase tracking-widest">Issue Purchase Order</h3>
                <p class="text-[11px] text-slate-500">"${p.title}" · ₹${(p.approvedAmount || p.estimatedAmount).toLocaleString('en-IN')}</p>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">PO Number</label>
                    <input id="proc-po-number" type="text" value="${defaultPo}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-violet-500 outline-none" />
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Expected Delivery</label>
                    <input id="proc-po-delivery" type="date" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-violet-500 outline-none" />
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Remarks</label>
                    <textarea id="proc-po-remarks" rows="2" placeholder="Optional notes for vendor / file" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-violet-500 outline-none resize-none"></textarea>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button onclick="document.getElementById('proc-action-modal').remove()" class="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900">Cancel</button>
                    <button onclick="(() => {
                        const poNumber = document.getElementById('proc-po-number').value.trim();
                        if (!poNumber) { alert('PO Number is required.'); return; }
                        db.advanceProcurement('${id}', 'admin_approved', {
                            by: '${user.empId}',
                            poNumber,
                            deliveryDate: document.getElementById('proc-po-delivery').value,
                            adminRemarks: document.getElementById('proc-po-remarks').value
                        });
                        document.getElementById('proc-action-modal').remove();
                        app.navigateTo('procurement');
                    })()" class="px-4 py-2 bg-violet-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-violet-700">Issue PO</button>
                </div>
            </div>
        `);
    };

    window.procMarkDelivered = (id) => {
        const p = db.procurement.find(x => x.id === id);
        if (!p) return;
        const defaultAmt = p.approvedAmount || p.estimatedAmount;
        showProcModal(`
            <div class="p-6 space-y-4">
                <h3 class="text-sm font-black text-teal-700 uppercase tracking-widest">Mark Delivered</h3>
                <p class="text-[11px] text-slate-500">"${p.title}" · PO ${p.purchaseOrderNumber || '—'}</p>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Bill / Invoice No.</label>
                        <input id="proc-deliver-bill" type="text" placeholder="e.g. INV-2025-0421" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-teal-500 outline-none" />
                    </div>
                    <div>
                        <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Voucher No.</label>
                        <input id="proc-deliver-voucher" type="text" placeholder="e.g. V-1102" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-teal-500 outline-none" />
                    </div>
                </div>
                <div>
                    <label class="block text-[9px] font-black text-slate-400 uppercase mb-1">Actual Amount (₹)</label>
                    <input id="proc-deliver-amount" type="number" value="${defaultAmt}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-teal-500 outline-none" />
                    <p class="text-[9px] text-slate-400 mt-1">Approved: ₹${defaultAmt.toLocaleString('en-IN')}</p>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button onclick="document.getElementById('proc-action-modal').remove()" class="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900">Cancel</button>
                    <button onclick="(() => {
                        const bill = document.getElementById('proc-deliver-bill').value.trim();
                        const voucher = document.getElementById('proc-deliver-voucher').value.trim();
                        const amt = parseFloat(document.getElementById('proc-deliver-amount').value) || 0;
                        if (!bill) { alert('Bill / Invoice number is required.'); return; }
                        db.advanceProcurement('${id}', 'delivered', {
                            by: '${user.empId}',
                            billNumber: bill,
                            voucherNumber: voucher,
                            actualAmount: amt
                        });
                        document.getElementById('proc-action-modal').remove();
                        app.navigateTo('procurement');
                    })()" class="px-4 py-2 bg-teal-600 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-teal-700">Confirm Delivered</button>
                </div>
            </div>
        `);
    };

    // ----- List-level filters (in-page, no server round-trip) -----
    window.procFilter = window.procFilter || { search: '', step: 'all', urgency: 'all' };
    window.procSetFilter = (key, val) => { window.procFilter[key] = val; app.navigateTo('procurement'); };

    const stepGroups = {
        active: ['submitted', 'manager_approved', 'finance_approved', 'director_approved'],
        po:     ['admin_approved'],
        delivered: ['delivered'],
        done:   ['asset_registered'],
        rejected: ['rejected']
    };
    const filteredItems = items.filter(p => {
        if (window.procFilter.step !== 'all') {
            const allowed = stepGroups[window.procFilter.step] || [window.procFilter.step];
            if (!allowed.includes(p.step)) return false;
        }
        if (window.procFilter.urgency !== 'all' && p.urgency !== window.procFilter.urgency) return false;
        const q = window.procFilter.search.toLowerCase().trim();
        if (!q) return true;
        return (
            (p.title || '').toLowerCase().includes(q) ||
            (p.vendor || '').toLowerCase().includes(q) ||
            (p.requestedByName || '').toLowerCase().includes(q) ||
            (p.purchaseOrderNumber || '').toLowerCase().includes(q) ||
            (p.id || '').toLowerCase().includes(q)
        );
    });

    const counters = {
        all: items.length,
        active: items.filter(p => stepGroups.active.includes(p.step)).length,
        po: items.filter(p => stepGroups.po.includes(p.step)).length,
        delivered: items.filter(p => stepGroups.delivered.includes(p.step)).length,
        done: items.filter(p => stepGroups.done.includes(p.step)).length,
        rejected: items.filter(p => stepGroups.rejected.includes(p.step)).length
    };
    const pill = (key, label, color) => {
        const active = window.procFilter.step === key;
        return `<button onclick="window.procSetFilter('step','${key}')" class="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full border transition-all ${active ? `${color.activeBg} ${color.activeText} ${color.activeBorder} shadow-sm` : `bg-white text-slate-500 border-slate-200 hover:text-slate-900`}">
            ${label} <span class="ml-1 ${active ? 'opacity-80' : 'text-slate-300'}">${counters[key]}</span>
        </button>`;
    };

    return `
    <div class="space-y-6 animate-fade-in-up">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-xl font-black text-slate-900 uppercase tracking-tight">Procurement Workflow</h1>
                <div class="flex items-center gap-4 mt-2">
                    <button onclick="window.app.procurementContext = 'personal'; window.app.navigateTo('procurement')" class="text-[9px] font-black uppercase tracking-widest ${context === 'personal' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} transition-colors">Personal</button>
                    ${canSeeTeam ? `<button onclick="window.app.procurementContext = 'team'; window.app.navigateTo('procurement')" class="text-[9px] font-black uppercase tracking-widest ${context === 'team' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} transition-colors">Team Oversight</button>` : ''}
                    ${isSuper ? `<button onclick="window.app.procurementContext = 'all'; window.app.navigateTo('procurement')" class="text-[9px] font-black uppercase tracking-widest ${context === 'all' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} transition-colors">Global Inventory</button>` : ''}
                </div>
            </div>
            <button onclick="document.getElementById('proc-form').classList.toggle('hidden')" class="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-accent transition-all flex items-center gap-2">
                <span class="material-symbols-outlined text-sm">add</span> New Request
            </button>
        </div>

        <!-- Workflow Legend -->
        <div class="flex items-center gap-2 flex-wrap bg-white p-4 rounded-2xl border border-slate-100">
            ${steps.map((s, i) => `
                <div class="flex items-center gap-1">
                    <span class="w-6 h-6 rounded-full bg-slate-900 text-white text-[9px] font-black flex items-center justify-center">${i+1}</span>
                    <span class="text-[9px] font-bold text-slate-600">${stepLabels[s]}</span>
                </div>
                ${i < steps.length - 1 ? '<span class="text-slate-300">→</span>' : ''}
            `).join('')}
            <span class="ml-auto text-[9px] font-bold text-slate-400 italic">ED approval auto-skipped for requests ≤ ₹1,00,000</span>
        </div>

        <!-- Filter Bar -->
        <div class="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap items-center gap-3">
            <div class="relative flex-1 min-w-[220px]">
                <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input type="text" placeholder="Search title, vendor, PO, requester..." value="${window.procFilter.search.replace(/"/g, '&quot;')}" oninput="window.procFilter.search = this.value" onkeyup="if(event.key==='Enter') app.navigateTo('procurement')" onchange="app.navigateTo('procurement')" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 pl-9 text-xs font-bold focus:border-accent outline-none" />
            </div>
            <select onchange="window.procSetFilter('urgency', this.value)" class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-700 focus:border-accent outline-none uppercase tracking-wider">
                <option value="all" ${window.procFilter.urgency==='all'?'selected':''}>All Urgency</option>
                <option value="Normal" ${window.procFilter.urgency==='Normal'?'selected':''}>Normal</option>
                <option value="Urgent" ${window.procFilter.urgency==='Urgent'?'selected':''}>Urgent</option>
                <option value="Critical" ${window.procFilter.urgency==='Critical'?'selected':''}>Critical</option>
            </select>
            <div class="flex items-center gap-2 flex-wrap">
                ${pill('all',       'All',       { activeBg:'bg-slate-900',    activeText:'text-white',         activeBorder:'border-slate-900' })}
                ${pill('active',    'In Review', { activeBg:'bg-blue-600',     activeText:'text-white',         activeBorder:'border-blue-600' })}
                ${pill('po',        'PO Issued', { activeBg:'bg-violet-600',   activeText:'text-white',         activeBorder:'border-violet-600' })}
                ${pill('delivered', 'Delivered', { activeBg:'bg-teal-600',     activeText:'text-white',         activeBorder:'border-teal-600' })}
                ${pill('done',      'Complete',  { activeBg:'bg-emerald-600',  activeText:'text-white',         activeBorder:'border-emerald-600' })}
                ${pill('rejected',  'Rejected',  { activeBg:'bg-rose-600',     activeText:'text-white',         activeBorder:'border-rose-600' })}
            </div>
        </div>

        <!-- Create Form -->
        <div id="proc-form" class="hidden bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest">New Procurement Request</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="text-[9px] font-black text-slate-400 uppercase block mb-1">Item / Service Title</label>
                    <input type="text" id="pr-title" placeholder="e.g. 5 Desktop Computers" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-accent outline-none" />
                </div>
                <div>
                    <label class="text-[9px] font-black text-slate-400 uppercase block mb-1">Estimated Amount (₹)</label>
                    <input type="number" id="pr-amount" placeholder="0" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-accent outline-none" />
                </div>
                <div>
                    <label class="text-[9px] font-black text-slate-400 uppercase block mb-1">Vendor Name</label>
                    <input type="text" id="pr-vendor" placeholder="Vendor/Supplier" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-accent outline-none" />
                </div>
                <div>
                    <label class="text-[9px] font-black text-slate-400 uppercase block mb-1">Urgency</label>
                    <select id="pr-urgency" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:border-accent outline-none">
                        <option value="Normal">Normal</option><option value="Urgent">Urgent</option><option value="Critical">Critical</option>
                    </select>
                </div>
            </div>
            <div>
                <label class="text-[9px] font-black text-slate-400 uppercase block mb-1">Justification</label>
                <textarea id="pr-just" rows="2" placeholder="Why is this needed?" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-accent outline-none resize-none"></textarea>
            </div>
            <button onclick="(() => {
                const title = document.getElementById('pr-title').value.trim();
                if (!title) { alert('Title required'); return; }
                db.createProcurement({ 
                    title, 
                    estimatedAmount: document.getElementById('pr-amount').value, 
                    vendor: document.getElementById('pr-vendor').value, 
                    urgency: document.getElementById('pr-urgency').value, 
                    justification: document.getElementById('pr-just').value, 
                    requestedBy: user.empId, 
                    requestedByName: user.name,
                    department: user.department,
                    location: user.location,
                    reportsTo: user.reportsTo
                });
                app.navigateTo('procurement');
            })()" class="px-6 py-3 bg-violet-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-violet-700 transition-all">Submit Request</button>
        </div>

        <!-- Procurement List -->
        <div class="space-y-4">
            ${filteredItems.length > 0 ? filteredItems.map(p => {
                const currentStep = steps.indexOf(p.step);
                const edSkipped = (p.estimatedAmount || 0) <= 100000;
                return `
                <div class="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all">
                    <div class="p-5">
                        <div class="flex items-start justify-between gap-4 mb-3">
                            <div>
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="text-sm font-black text-slate-900">${p.title}</h3>
                                    <span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full border ${stepColor(p.step)}">${stepLabels[p.step] || p.step}</span>
                                    ${p.step === 'manager_approved' ? '<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-1"><span class="material-symbols-outlined text-[10px]">notifications_active</span> Alert Sent</span>' : ''}
                                    ${p.urgency === 'Critical' ? '<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full bg-rose-50 text-rose-600 border border-rose-100">Critical</span>' : ''}
                                    ${p.urgency === 'Urgent' ? '<span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full bg-amber-50 text-amber-600 border border-amber-100">Urgent</span>' : ''}
                                </div>
                                <p class="text-[10px] text-slate-400 mt-1">By ${p.requestedByName} • ${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</p>
                            </div>
                            <p class="text-lg font-black text-slate-900 tabular-nums shrink-0">₹${(p.estimatedAmount || 0).toLocaleString('en-IN')}</p>
                        </div>
                        ${p.justification ? `<p class="text-[11px] text-slate-500 mb-3">${p.justification}</p>` : ''}
                        ${p.vendor ? `<p class="text-[10px] text-slate-400">Vendor: <strong>${p.vendor}</strong></p>` : ''}

                        <!-- Progress Bar -->
                        <div class="flex items-center gap-1 mt-4">
                            ${steps.map((s, i) => {
                                const isSkippedEd = s === 'director_approved' && edSkipped;
                                const filled = i <= currentStep;
                                let cls;
                                if (p.step === 'rejected' && filled) cls = 'bg-rose-400';
                                else if (isSkippedEd && p.step !== 'rejected') cls = 'bg-slate-300';
                                else if (filled) cls = 'bg-emerald-400';
                                else cls = 'bg-slate-100';
                                return `<div class="flex-1 h-1.5 rounded-full ${cls}" title="${stepLabels[s]}${isSkippedEd?' (skipped)':''}"></div>`;
                            }).join('')}
                        </div>
                        <div class="flex items-center justify-between mt-1 text-[8px] font-bold uppercase tracking-widest text-slate-400">
                            <span>Stage ${currentStep + 1} of ${steps.length}</span>
                            ${edSkipped && p.step !== 'rejected' ? '<span class="text-slate-400">ED approval skipped (≤ ₹1L)</span>' : ''}
                            <span>PO ${p.purchaseOrderNumber || '—'}</span>
                        </div>

                        <!-- Action Buttons based on step & role -->
                        ${!p.rejected ? `
                        <div class="flex gap-2 mt-4">
                            ${(isManager && p.step === 'submitted' && (p.reportsTo === user.empId || isSuper)) ? `
                                <button onclick="db.advanceProcurement('${p.id}','manager_approved',{by:'${user.empId}',remarks:''});app.navigateTo('procurement')" class="px-3 py-1.5 bg-emerald-600 text-white text-[9px] font-black rounded-lg uppercase hover:bg-emerald-700 transition-all">Approve as Manager</button>
                                <button onclick="window.procReject('${p.id}')" class="px-3 py-1.5 bg-rose-100 text-rose-600 text-[9px] font-black rounded-lg uppercase hover:bg-rose-200 transition-all">Reject</button>
                            ` : ''}
                            ${isFinance && p.step === 'manager_approved' ? `
                                <button onclick="window.showProcSignature('${p.id}', ${p.estimatedAmount})" class="px-3 py-1.5 bg-blue-600 text-white text-[9px] font-black rounded-lg uppercase hover:bg-blue-700 transition-all flex items-center gap-2">
                                    <span class="material-symbols-outlined text-sm">draw</span> Finance Approve
                                </button>
                                <button onclick="window.procReject('${p.id}')" class="px-3 py-1.5 bg-rose-100 text-rose-600 text-[9px] font-black rounded-lg uppercase hover:bg-rose-200 transition-all">Reject</button>
                            ` : ''}
                            ${isDirector && p.step === 'finance_approved' && p.estimatedAmount > 100000 ? `
                                <button onclick="db.advanceProcurement('${p.id}','director_approved',{by:'${user.empId}'});app.navigateTo('procurement')" class="px-3 py-1.5 bg-purple-600 text-white text-[9px] font-black rounded-lg uppercase hover:bg-purple-700 transition-all">Executive Approval</button>
                                <button onclick="window.procReject('${p.id}')" class="px-3 py-1.5 bg-rose-100 text-rose-600 text-[9px] font-black rounded-lg uppercase hover:bg-rose-200 transition-all">Reject</button>
                            ` : ''}
                            ${isOperations && ((p.step === 'finance_approved' && p.estimatedAmount <= 100000) || p.step === 'director_approved') ? `
                                <button onclick="window.procIssuePO('${p.id}')" class="px-3 py-1.5 bg-violet-600 text-white text-[9px] font-black rounded-lg uppercase hover:bg-violet-700 transition-all flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-sm">receipt_long</span> Issue PO
                                </button>
                            ` : ''}
                            ${isOperations && p.step === 'admin_approved' ? `
                                <button onclick="window.procMarkDelivered('${p.id}')" class="px-3 py-1.5 bg-teal-600 text-white text-[9px] font-black rounded-lg uppercase hover:bg-teal-700 transition-all flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-sm">local_shipping</span> Mark Delivered
                                </button>
                            ` : ''}
                            ${isOperations && p.step === 'delivered' && !p.assetRegistered ? `
                                <button onclick="db.registerAssetFromProcurement('${p.id}');app.navigateTo('procurement')" class="px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black rounded-lg uppercase hover:bg-indigo-700 transition-all flex items-center gap-2">
                                    <span class="material-symbols-outlined text-sm">inventory_2</span> Integrate to Asset Registry
                                </button>
                            ` : ''}
                            ${p.assetRegistered ? `
                                <div class="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg uppercase border border-emerald-100 flex items-center gap-2">
                                    <span class="material-symbols-outlined text-sm">check_circle</span> Asset Synchronized (${p.assetId})
                                </div>
                            ` : ''}
                        </div>
                        ${(() => {
                            const sig = db.signatures.find(s => s.refId === p.id);
                            return sig ? `
                                <div class="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                    <div>
                                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Digitally Authorized By</p>
                                        <p class="text-[10px] font-black text-slate-900">${sig.empName}</p>
                                        <p class="text-[8px] text-slate-400 font-bold uppercase">${new Date(sig.signedAt).toLocaleString()}</p>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        ${p.step === 'admin_approved' || p.step === 'delivered' || p.step === 'asset_registered' ? `
                                            <button onclick="window.exportPO('${p.id}')" class="px-3 py-2 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md flex items-center gap-2 pdf-export-btn">
                                                <span class="material-symbols-outlined text-[12px]">picture_as_pdf</span> Export PO (PDF)
                                            </button>
                                        ` : ''}
                                        <div class="h-10 bg-slate-50 rounded-lg p-1 border border-slate-100">
                                            <img src="${sig.signatureData}" class="h-full object-contain mix-blend-multiply opacity-80" />
                                        </div>
                                    </div>
                                </div>
                            ` : '';
                        })()}
                        ` : ''}
                    </div>
                </div>`;
            }).join('') : `
                <div class="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                    <span class="material-symbols-outlined text-slate-300 text-5xl">inventory_2</span>
                    <p class="text-sm font-black text-slate-700 uppercase tracking-widest mt-3">${counters.all === 0 ? 'No procurement requests yet' : 'No requests match the current filters'}</p>
                    <p class="text-[11px] text-slate-400 mt-2">${counters.all === 0 ? 'Click "New Request" above to start the procurement pipeline.' : 'Clear the search or pick a different status pill above.'}</p>
                    ${counters.all > 0 ? `<button onclick="window.procFilter={search:'',step:'all',urgency:'all'}; app.navigateTo('procurement')" class="mt-4 px-4 py-2 bg-slate-100 text-slate-700 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-200">Reset Filters</button>` : ''}
                </div>`}
        </div>
    </div>`;
}
