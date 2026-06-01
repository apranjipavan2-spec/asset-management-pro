// Manage payment programs (debit sources) used by the Bank Payment Export page.
// Finance / superadmin / director can add, edit, archive, and delete programs.
// Reads are open to any authed user; the server enforces role on writes.

const FORMATS = ['hdfc', 'axis'];
const BANKS = ['HDFC', 'AXIS'];

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('amp_token')}`
});

window.ppaState = window.ppaState || {
    programs: [],
    editingId: null,   // id currently in edit mode (null = none)
    creating: false,   // true while the "add new" row is open
    error: ''
};

const stOf = () => window.ppaState;

async function loadPrograms() {
    const res = await fetch('/api/payment_programs', { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    stOf().programs = (Array.isArray(rows) ? rows : [])
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.label).localeCompare(String(b.label)));
}

async function savePayload(payload) {
    const res = await fetch('/api/payment_programs', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Save failed (${res.status}): ${txt.slice(0, 200)}`);
    }
}

async function deleteProgram(id) {
    const res = await fetch(`/api/payment_programs/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Delete failed (${res.status}): ${txt.slice(0, 200)}`);
    }
}

// Collect the form fields from a single editable row in the table.
function readFormFields(rowId) {
    const row = document.querySelector(`[data-ppa-row="${rowId}"]`);
    if (!row) return null;
    const get = field => row.querySelector(`[data-field="${field}"]`)?.value ?? '';
    const getNum = field => {
        const v = parseInt(row.querySelector(`[data-field="${field}"]`)?.value ?? '0', 10);
        return Number.isFinite(v) ? v : 0;
    };
    return {
        id:           get('id').trim(),
        label:        get('label').trim(),
        format:       get('format').trim(),
        debitBank:    get('debitBank').trim(),
        debitAccount: get('debitAccount').trim(),
        entity:       get('entity').trim(),
        email:        get('email').trim(),
        sortOrder:    getNum('sortOrder'),
        archived:     row.querySelector('[data-field="archived"]')?.checked ? 1 : 0
    };
}

window.ppaEdit = (id) => {
    stOf().editingId = id;
    stOf().creating = false;
    rerender();
};

window.ppaCancel = () => {
    stOf().editingId = null;
    stOf().creating = false;
    stOf().error = '';
    rerender();
};

window.ppaAddNew = () => {
    stOf().creating = true;
    stOf().editingId = null;
    rerender();
};

window.ppaSave = async (rowKey) => {
    const data = readFormFields(rowKey);
    if (!data) return;
    if (!data.id) return alert('ID is required.');
    if (!/^[a-z0-9_]+$/.test(data.id)) return alert('ID can only contain lowercase letters, digits, and underscores.');
    if (!data.label) return alert('Label is required.');
    if (!FORMATS.includes(data.format)) return alert(`Format must be one of: ${FORMATS.join(', ')}`);
    if (!BANKS.includes(data.debitBank)) return alert(`Debit bank must be one of: ${BANKS.join(', ')}`);

    // Block ID collision when creating a new row.
    if (rowKey === '__new__') {
        if (stOf().programs.some(p => p.id === data.id)) {
            return alert(`A program with ID "${data.id}" already exists.`);
        }
    }

    const now = new Date().toISOString();
    const existing = stOf().programs.find(p => p.id === data.id);
    const payload = {
        ...data,
        createdAt: existing?.createdAt || now,
        updatedAt: now
    };

    try {
        await savePayload(payload);
        await loadPrograms();
        stOf().editingId = null;
        stOf().creating = false;
        stOf().error = '';
        rerender();
    } catch (e) {
        stOf().error = e.message;
        rerender();
    }
};

window.ppaDelete = async (id, label) => {
    if (!confirm(`Delete program "${label}"? This cannot be undone. Existing audit logs that reference it will keep working.`)) return;
    try {
        await deleteProgram(id);
        await loadPrograms();
        rerender();
    } catch (e) {
        stOf().error = e.message;
        rerender();
    }
};

window.ppaToggleArchive = async (id) => {
    const p = stOf().programs.find(x => x.id === id);
    if (!p) return;
    try {
        await savePayload({ ...p, archived: p.archived ? 0 : 1, updatedAt: new Date().toISOString() });
        await loadPrograms();
        rerender();
    } catch (e) {
        stOf().error = e.message;
        rerender();
    }
};

const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all';
const selectCls = 'px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all';

function renderEditableRow(rowKey, source) {
    const p = source || {};
    const isNew = rowKey === '__new__';
    return `
        <tr data-ppa-row="${rowKey}" style="background: rgba(254, 243, 199, 0.35); border-top: 1px solid rgba(245, 158, 11, 0.3);">
            <td>
                <input data-field="id" value="${p.id || ''}" ${isNew ? '' : 'readonly'} placeholder="lowercase_id"
                    class="w-full px-2 py-1.5 border ${isNew ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-100 text-slate-500'} rounded-lg text-[11.5px] font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </td>
            <td>
                <input data-field="label" value="${p.label || ''}" placeholder="Display label" class="${inputCls} py-1.5 text-sm" />
            </td>
            <td>
                <select data-field="format" class="${selectCls} py-1.5">
                    ${FORMATS.map(f => `<option value="${f}" ${p.format === f ? 'selected' : ''}>${f.toUpperCase()}</option>`).join('')}
                </select>
            </td>
            <td>
                <select data-field="debitBank" class="${selectCls} py-1.5">
                    ${BANKS.map(b => `<option value="${b}" ${p.debitBank === b ? 'selected' : ''}>${b}</option>`).join('')}
                </select>
            </td>
            <td>
                <input data-field="debitAccount" value="${p.debitAccount || ''}" placeholder="(blank for HDFC)"
                    class="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11.5px] font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </td>
            <td>
                <input data-field="entity" value="${p.entity || ''}" placeholder="Entity" class="${inputCls} py-1.5 text-sm" />
            </td>
            <td>
                <input data-field="email" value="${p.email || ''}" placeholder="(HDFC only)" class="${inputCls} py-1.5 text-xs" />
            </td>
            <td>
                <input data-field="sortOrder" type="number" value="${p.sortOrder ?? 100}" class="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </td>
            <td class="text-center">
                <input data-field="archived" type="checkbox" ${p.archived ? 'checked' : ''} class="w-4 h-4 accent-rose-500" />
            </td>
            <td class="whitespace-nowrap">
                <button onclick="ppaSave('${rowKey}')" class="pay-pill pay-pill--success mr-1">
                    <span class="material-symbols-outlined text-[14px]">check</span> Save
                </button>
                <button onclick="ppaCancel()" class="pay-pill pay-pill--ghost">Cancel</button>
            </td>
        </tr>`;
}

function renderReadOnlyRow(p) {
    const formatBadge = p.format === 'hdfc' ? 'pay-badge--hdfc' : 'pay-badge--axis';
    const statusBadge = p.archived
        ? '<span class="pay-badge pay-badge--archived pay-badge--dot">Archived</span>'
        : '<span class="pay-badge pay-badge--active pay-badge--dot">Active</span>';
    return `
        <tr class="${p.archived ? 'is-archived' : ''}">
            <td class="font-mono text-[11.5px] text-slate-600">${p.id}</td>
            <td class="text-sm font-semibold text-slate-800">${p.label}</td>
            <td><span class="pay-badge ${formatBadge}">${(p.format || '').toUpperCase()}</span></td>
            <td class="text-sm text-slate-700">${p.debitBank || '—'}</td>
            <td class="font-mono text-[11.5px] text-slate-500">${p.debitAccount || '—'}</td>
            <td class="text-sm text-slate-700">${p.entity || '—'}</td>
            <td class="text-xs text-slate-500">${p.email || '—'}</td>
            <td class="text-sm text-center text-slate-500">${p.sortOrder ?? ''}</td>
            <td class="text-center">${statusBadge}</td>
            <td class="whitespace-nowrap">
                <button onclick="ppaEdit('${p.id}')" title="Edit" class="pay-icon-btn">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button onclick="ppaToggleArchive('${p.id}')" title="${p.archived ? 'Unarchive' : 'Archive'}" class="pay-icon-btn pay-icon-btn--warn">
                    <span class="material-symbols-outlined text-[18px]">${p.archived ? 'unarchive' : 'archive'}</span>
                </button>
                <button onclick="ppaDelete('${p.id}', '${(p.label || '').replace(/'/g, "\\'")}')" title="Delete" class="pay-icon-btn pay-icon-btn--danger">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
            </td>
        </tr>`;
}

function renderTable() {
    const st = stOf();
    const rows = [];
    if (st.creating) {
        rows.push(renderEditableRow('__new__', { sortOrder: 100, format: 'hdfc', debitBank: 'HDFC' }));
    }
    for (const p of st.programs) {
        rows.push(st.editingId === p.id ? renderEditableRow(p.id, p) : renderReadOnlyRow(p));
    }
    if (!rows.length) {
        rows.push(`
            <tr>
                <td colspan="10" class="p-10 text-center">
                    <span class="material-symbols-outlined text-[40px] text-slate-300 block mb-2">tune</span>
                    <div class="text-sm text-slate-600 font-semibold">No payment programs yet.</div>
                    <div class="text-xs text-slate-500 mt-1">Click <strong>Add Program</strong> above to create the first one.</div>
                </td>
            </tr>`);
    }
    return `
        <div class="pay-section">
            <div class="pay-section__head">
                <span class="pay-section__title"><span class="material-symbols-outlined text-[16px] text-slate-500">list_alt</span> All programs</span>
                <span class="pay-section__meta">${st.programs.length} total</span>
            </div>
            <div class="overflow-x-auto">
                <table class="pay-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Label</th>
                            <th>Format</th>
                            <th>Debit Bank</th>
                            <th>Debit Account</th>
                            <th>Entity</th>
                            <th>Email</th>
                            <th class="text-center">Sort</th>
                            <th class="text-center">Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${rows.join('')}</tbody>
                </table>
            </div>
        </div>`;
}

function renderStatTiles() {
    const programs = stOf().programs;
    const active = programs.filter(p => !p.archived).length;
    const archived = programs.filter(p => p.archived).length;
    const hdfc = programs.filter(p => p.format === 'hdfc' && !p.archived).length;
    const axis = programs.filter(p => p.format === 'axis' && !p.archived).length;
    const tile = (color, label, value, hint, i, mod = '') => `
        <div class="pay-tile pay-anim ${mod}" style="--pay-delay: ${i * 50}ms">
            <span class="pay-tile__strip ${color}"></span>
            <div class="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">${label}</div>
            <div class="font-headline font-extrabold text-slate-900 text-[28px] leading-none">${value}</div>
            <div class="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-widest">${hint}</div>
        </div>`;
    return `
        <section class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${tile('bg-slate-900', 'Total Programs', programs.length, `${active} active · ${archived} archived`, 0)}
            ${tile('bg-emerald-500', 'Active', active, 'Visible on export page', 1)}
            ${tile('bg-blue-500', 'HDFC Format', hdfc, '29-column layout', 2)}
            ${tile('bg-violet-500', 'AXIS Format', axis, '12-column layout', 3, 'pay-tile--axis')}
        </section>`;
}

function rerender() {
    const root = document.getElementById('ppa-root');
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
        ${renderTable()}
        <div class="pay-section">
            <div class="pay-section__head">
                <span class="pay-section__title"><span class="material-symbols-outlined text-[16px] text-slate-500">info</span> Field reference</span>
            </div>
            <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-slate-600">
                <div><span class="font-bold text-slate-800">ID</span> — internal key. Once saved it cannot be renamed (it appears in audit logs and export filenames).</div>
                <div><span class="font-bold text-slate-800">Format</span> — HDFC writes 29-column rows; Axis writes 12-column rows.</div>
                <div><span class="font-bold text-slate-800">Debit Account</span> — leave blank for HDFC programs; required for Axis programs.</div>
                <div><span class="font-bold text-slate-800">Email</span> — confirmation email (HDFC column 28). Leave blank for Axis.</div>
                <div><span class="font-bold text-slate-800">Sort</span> — lower numbers appear first on the export page.</div>
                <div><span class="font-bold text-slate-800">Archive</span> — hides from the export page without deleting; safe to undo any time.</div>
            </div>
        </div>`;
}

export async function renderPaymentProgramsAdminPage() {
    // Fire-and-forget load; render skeleton immediately.
    loadPrograms()
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
                    <h2 class="page-title flex items-center gap-2"><span class="material-symbols-outlined text-[22px] text-slate-400">tune</span> Payment Programs</h2>
                    <p class="page-subtitle">Debit Source Configuration</p>
                </div>
                <div class="flex items-center gap-2">
                    <a href="#payment_export" class="pay-pill pay-pill--ghost">
                        <span class="material-symbols-outlined text-[14px]">account_balance</span> Open Export
                    </a>
                    <button onclick="ppaAddNew()" ${disabled ? 'disabled' : ''} class="pay-pill pay-pill--primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}">
                        <span class="material-symbols-outlined text-[14px]">add</span> Add Program
                    </button>
                </div>
            </header>
            <div id="ppa-root" class="space-y-5">
                ${renderBody()}
            </div>
        </div>
    `;
}
