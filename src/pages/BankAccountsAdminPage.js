// Manage the master bank-accounts list used by the Bank Payment Export page.
// Finance / superadmin / director can add, edit, archive, and delete rows.
// With ~1800 records we paginate + search client-side so the DOM stays small.

const PAGE_SIZE = 50;

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('amp_token')}`
});

window.baaState = window.baaState || {
    accounts: [],
    query: '',
    statusFilter: 'active',   // 'active' | 'archived' | 'all'
    page: 1,
    editingId: null,
    creating: false,
    error: ''
};

const stOf = () => window.baaState;

async function loadAccounts() {
    const res = await fetch('/api/bank_accounts', { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    stOf().accounts = (Array.isArray(rows) ? rows : [])
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
}

async function savePayload(payload) {
    const res = await fetch('/api/bank_accounts', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Save failed (${res.status}): ${txt.slice(0, 200)}`);
    }
}

async function deleteAccount(id) {
    const res = await fetch(`/api/bank_accounts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Delete failed (${res.status}): ${txt.slice(0, 200)}`);
    }
}

function readFormFields(rowId) {
    const row = document.querySelector(`[data-baa-row="${rowId}"]`);
    if (!row) return null;
    const get = field => (row.querySelector(`[data-field="${field}"]`)?.value ?? '').trim();
    return {
        id:            get('id'),
        name:          get('name'),
        bankName:      get('bankName'),
        accountNumber: get('accountNumber'),
        ifsc:          get('ifsc'),
        reviewNotes:   get('reviewNotes'),
        archived:      row.querySelector('[data-field="archived"]')?.checked ? 1 : 0
    };
}

window.baaEdit = (id) => {
    stOf().editingId = id;
    stOf().creating = false;
    rerender();
};

window.baaCancel = () => {
    stOf().editingId = null;
    stOf().creating = false;
    stOf().error = '';
    rerender();
};

window.baaAddNew = () => {
    stOf().creating = true;
    stOf().editingId = null;
    stOf().page = 1;
    rerender();
};

function generateId(name) {
    const slug = String(name || 'rec').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20) || 'rec';
    const suffix = Date.now().toString(36).slice(-5);
    return `${slug}_${suffix}`;
}

window.baaSave = async (rowKey) => {
    const data = readFormFields(rowKey);
    if (!data) return;
    if (!data.name) return alert('Name is required.');
    if (!data.accountNumber) return alert('Account number is required.');
    if (!data.id) data.id = generateId(data.name);

    if (rowKey === '__new__') {
        if (stOf().accounts.some(a => a.id === data.id)) {
            return alert(`A record with ID "${data.id}" already exists.`);
        }
    }

    const now = new Date().toISOString();
    const existing = stOf().accounts.find(a => a.id === data.id);
    const payload = {
        ...data,
        sourceFile:  existing?.sourceFile  || 'manual',
        sourceSheet: existing?.sourceSheet || '',
        createdAt:   existing?.createdAt   || now,
        updatedAt:   now
    };

    try {
        await savePayload(payload);
        await loadAccounts();
        stOf().editingId = null;
        stOf().creating = false;
        stOf().error = '';
        rerender();
    } catch (e) {
        stOf().error = e.message;
        rerender();
    }
};

window.baaDelete = async (id, name) => {
    if (!confirm(`Delete bank record for "${name}"? This cannot be undone. Prefer Archive if you only want to hide it.`)) return;
    try {
        await deleteAccount(id);
        await loadAccounts();
        rerender();
    } catch (e) {
        stOf().error = e.message;
        rerender();
    }
};

window.baaToggleArchive = async (id) => {
    const a = stOf().accounts.find(x => x.id === id);
    if (!a) return;
    try {
        await savePayload({ ...a, archived: a.archived ? 0 : 1, updatedAt: new Date().toISOString() });
        await loadAccounts();
        rerender();
    } catch (e) {
        stOf().error = e.message;
        rerender();
    }
};

window.baaSearch = (val) => {
    stOf().query = val || '';
    stOf().page = 1;
    rerender();
};

window.baaFilter = (val) => {
    stOf().statusFilter = val;
    stOf().page = 1;
    rerender();
};

window.baaGoto = (page) => {
    stOf().page = Math.max(1, page);
    rerender();
};

function applyFilters() {
    const st = stOf();
    const q = st.query.trim().toLowerCase();
    let rows = st.accounts;
    if (st.statusFilter === 'active')   rows = rows.filter(r => !r.archived);
    if (st.statusFilter === 'archived') rows = rows.filter(r => !!r.archived);
    if (q) {
        rows = rows.filter(r =>
            String(r.name || '').toLowerCase().includes(q)         ||
            String(r.bankName || '').toLowerCase().includes(q)     ||
            String(r.accountNumber || '').toLowerCase().includes(q)||
            String(r.ifsc || '').toLowerCase().includes(q)         ||
            String(r.id || '').toLowerCase().includes(q)
        );
    }
    return rows;
}

const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all';

function renderEditableRow(rowKey, source) {
    const a = source || {};
    const isNew = rowKey === '__new__';
    return `
        <tr data-baa-row="${rowKey}" style="background: rgba(254, 243, 199, 0.35); border-top: 1px solid rgba(245, 158, 11, 0.3);">
            <td>
                <input data-field="id" value="${a.id || ''}" ${isNew ? '' : 'readonly'} placeholder="${isNew ? 'auto' : 'id'}"
                    class="w-full px-2 py-1.5 border ${isNew ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-100 text-slate-500'} rounded-lg text-[11.5px] font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </td>
            <td>
                <input data-field="name" value="${(a.name || '').replace(/"/g, '&quot;')}" placeholder="Person name" class="${inputCls} py-1.5 text-sm" />
            </td>
            <td>
                <input data-field="bankName" value="${(a.bankName || '').replace(/"/g, '&quot;')}" placeholder="HDFC / AXIS / SBI" class="${inputCls} py-1.5 text-sm" />
            </td>
            <td>
                <input data-field="accountNumber" value="${a.accountNumber || ''}" placeholder="Account #" class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11.5px] font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </td>
            <td>
                <input data-field="ifsc" value="${a.ifsc || ''}" placeholder="IFSC" class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11.5px] font-mono uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </td>
            <td>
                <input data-field="reviewNotes" value="${(a.reviewNotes || '').replace(/"/g, '&quot;')}" placeholder="Notes" class="${inputCls} py-1.5 text-xs" />
            </td>
            <td class="text-center">
                <input data-field="archived" type="checkbox" ${a.archived ? 'checked' : ''} class="w-4 h-4 accent-rose-500" />
            </td>
            <td class="whitespace-nowrap">
                <button onclick="baaSave('${rowKey}')" class="pay-pill pay-pill--success mr-1">
                    <span class="material-symbols-outlined text-[14px]">check</span> Save
                </button>
                <button onclick="baaCancel()" class="pay-pill pay-pill--ghost">Cancel</button>
            </td>
        </tr>`;
}

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
}

function renderReadOnlyRow(a) {
    const statusBadge = a.archived
        ? '<span class="pay-badge pay-badge--archived pay-badge--dot">Archived</span>'
        : '<span class="pay-badge pay-badge--active pay-badge--dot">Active</span>';
    const safeName = esc(a.name);
    return `
        <tr class="${a.archived ? 'is-archived' : ''}">
            <td class="font-mono text-[11.5px] text-slate-600">${esc(a.id)}</td>
            <td class="text-sm font-semibold text-slate-800">${safeName}</td>
            <td class="text-sm text-slate-700">${esc(a.bankName) || '—'}</td>
            <td class="font-mono text-[11.5px] text-slate-700">${esc(a.accountNumber) || '—'}</td>
            <td class="font-mono text-[11.5px] text-slate-600 uppercase">${esc(a.ifsc) || '—'}</td>
            <td class="text-xs text-slate-500">${esc(a.reviewNotes) || '—'}</td>
            <td class="text-center">${statusBadge}</td>
            <td class="whitespace-nowrap">
                <button onclick="baaEdit('${esc(a.id)}')" title="Edit" class="pay-icon-btn">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onclick="baaToggleArchive('${esc(a.id)}')" title="${a.archived ? 'Unarchive' : 'Archive'}" class="pay-icon-btn pay-icon-btn--warn">
                    <span class="material-symbols-outlined text-[18px]">${a.archived ? 'unarchive' : 'archive'}</span>
                </button>
                <button onclick="baaDelete('${esc(a.id)}', '${safeName.replace(/'/g, "\\'")}')" title="Delete" class="pay-icon-btn pay-icon-btn--danger">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </td>
        </tr>`;
}

function renderPagination(filteredCount) {
    const st = stOf();
    const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
    const cur = Math.min(st.page, totalPages);
    if (totalPages <= 1) return '';
    const start = (cur - 1) * PAGE_SIZE + 1;
    const end = Math.min(cur * PAGE_SIZE, filteredCount);
    return `
        <div class="flex items-center justify-between px-4 py-3 border-t border-slate-200 text-xs text-slate-600">
            <div>Showing <strong>${start}–${end}</strong> of <strong>${filteredCount}</strong></div>
            <div class="flex items-center gap-1">
                <button onclick="baaGoto(${cur - 1})" ${cur <= 1 ? 'disabled' : ''} class="pay-pill pay-pill--ghost ${cur <= 1 ? 'opacity-40 cursor-not-allowed' : ''}">‹ Prev</button>
                <span class="px-2">Page ${cur} / ${totalPages}</span>
                <button onclick="baaGoto(${cur + 1})" ${cur >= totalPages ? 'disabled' : ''} class="pay-pill pay-pill--ghost ${cur >= totalPages ? 'opacity-40 cursor-not-allowed' : ''}">Next ›</button>
            </div>
        </div>`;
}

function renderTable() {
    const st = stOf();
    const filtered = applyFilters();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const cur = Math.min(Math.max(1, st.page), totalPages);
    const slice = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

    const rows = [];
    if (st.creating) {
        rows.push(renderEditableRow('__new__', { archived: 0 }));
    }
    for (const a of slice) {
        rows.push(st.editingId === a.id ? renderEditableRow(a.id, a) : renderReadOnlyRow(a));
    }
    if (!rows.length) {
        rows.push(`
            <tr>
                <td colspan="8" class="p-10 text-center">
                    <span class="material-symbols-outlined text-[40px] text-slate-300 block mb-2">savings</span>
                    <div class="text-sm text-slate-600 font-semibold">${st.query ? 'No matches.' : 'No bank accounts yet.'}</div>
                    <div class="text-xs text-slate-500 mt-1">${st.query ? 'Try a different search term.' : 'Click <strong>Add Record</strong> above to create one.'}</div>
                </td>
            </tr>`);
    }
    return `
        <div class="pay-section">
            <div class="pay-section__head">
                <span class="pay-section__title"><span class="material-symbols-outlined text-[16px] text-slate-500">list_alt</span> Bank accounts</span>
                <span class="pay-section__meta">${filtered.length} of ${st.accounts.length} matching</span>
            </div>
            <div class="overflow-x-auto">
                <table class="pay-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Bank</th>
                            <th>Account #</th>
                            <th>IFSC</th>
                            <th>Notes</th>
                            <th class="text-center">Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${rows.join('')}</tbody>
                </table>
            </div>
            ${renderPagination(filtered.length)}
        </div>`;
}

function renderStatTiles() {
    const accounts = stOf().accounts;
    const active = accounts.filter(a => !a.archived).length;
    const archived = accounts.filter(a => a.archived).length;
    const banks = new Set(accounts.filter(a => !a.archived && a.bankName).map(a => a.bankName));
    const tile = (color, label, value, hint, i, mod = '') => `
        <div class="pay-tile pay-anim ${mod}" style="--pay-delay: ${i * 50}ms">
            <span class="pay-tile__strip ${color}"></span>
            <div class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">${label}</div>
            <div class="font-headline font-extrabold text-slate-900 text-[28px] leading-none">${value}</div>
            <div class="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-widest">${hint}</div>
        </div>`;
    return `
        <section class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${tile('bg-slate-900',   'Total Records', accounts.length, `${active} active · ${archived} archived`, 0)}
            ${tile('bg-emerald-500', 'Active',        active,           'Visible on export page',                  1)}
            ${tile('bg-rose-500',    'Archived',      archived,         'Hidden from export',                       2)}
            ${tile('bg-blue-500',    'Banks',         banks.size,       'Distinct active banks',                    3)}
        </section>`;
}

function renderFilterBar() {
    const st = stOf();
    const pill = (val, label) => `
        <button onclick="baaFilter('${val}')" class="pay-pill ${st.statusFilter === val ? 'pay-pill--primary' : 'pay-pill--ghost'}">${label}</button>`;
    return `
        <div class="pay-section">
            <div class="p-3 flex flex-wrap items-center gap-3">
                <div class="flex items-center gap-2 flex-1 min-w-[260px]">
                    <span class="material-symbols-outlined text-[18px] text-slate-400">search</span>
                    <input
                        type="text"
                        value="${esc(st.query)}"
                        oninput="baaSearch(this.value)"
                        placeholder="Search name, bank, account # or IFSC..."
                        class="${inputCls} py-2 text-sm flex-1" />
                </div>
                <div class="flex items-center gap-1">
                    ${pill('active',   'Active')}
                    ${pill('archived', 'Archived')}
                    ${pill('all',      'All')}
                </div>
            </div>
        </div>`;
}

function rerender() {
    const root = document.getElementById('baa-root');
    if (root) root.innerHTML = renderBody();
}

function renderBody() {
    const st = stOf();
    return `
        ${renderStatTiles()}
        ${st.error ? `
            <div class="pay-section" style="border-left: 4px solid #f43f5e">
                <div class="p-3 flex items-start gap-2 text-sm text-rose-700">
                    <span class="material-symbols-outlined text-[18px] text-rose-500 mt-0.5">error</span>
                    <div class="flex-1">${st.error}</div>
                </div>
            </div>` : ''}
        ${renderFilterBar()}
        ${renderTable()}
        <div class="pay-section">
            <div class="pay-section__head">
                <span class="pay-section__title"><span class="material-symbols-outlined text-[16px] text-slate-500">info</span> Field reference</span>
            </div>
            <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-slate-600">
                <div><span class="font-bold text-slate-800">ID</span> — internal key. Once saved it cannot be renamed.</div>
                <div><span class="font-bold text-slate-800">Name</span> — beneficiary name; what shows up on the export.</div>
                <div><span class="font-bold text-slate-800">Bank</span> — beneficiary bank name (HDFC, AXIS, SBI, ...).</div>
                <div><span class="font-bold text-slate-800">Account # / IFSC</span> — used by the Bank Payment export file.</div>
                <div><span class="font-bold text-slate-800">Archive</span> — hides from the export page without deleting; safe to undo any time.</div>
                <div><span class="font-bold text-slate-800">Delete</span> — permanent. Prefer Archive unless the record was created by mistake.</div>
            </div>
        </div>`;
}

export async function renderBankAccountsAdminPage() {
    loadAccounts()
        .then(() => rerender())
        .catch(e => {
            stOf().error = `Failed to load: ${e.message}`;
            rerender();
        });

    const st = stOf();
    const disabled = st.creating || st.editingId;

    return `
        <div class="pay-page w-full space-y-5 pb-10 font-sans">
            <header class="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 class="page-title flex items-center gap-2"><span class="material-symbols-outlined text-[22px] text-slate-400">savings</span> Bank Accounts</h2>
                    <p class="page-subtitle">Master Beneficiary List</p>
                </div>
                <div class="flex items-center gap-2">
                    <a href="#payment_export" class="pay-pill pay-pill--ghost">
                        <span class="material-symbols-outlined text-[14px]">account_balance</span> Open Export
                    </a>
                    <button onclick="baaAddNew()" ${disabled ? 'disabled' : ''} class="pay-pill pay-pill--primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}">
                        <span class="material-symbols-outlined text-[14px]">add</span> Add Record
                    </button>
                </div>
            </header>
            <div id="baa-root" class="space-y-5">
                ${renderBody()}
            </div>
        </div>
    `;
}
