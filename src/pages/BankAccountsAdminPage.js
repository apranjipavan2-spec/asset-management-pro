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
    sheetFilter: '',          // '' = any source sheet
    notesOnly: false,         // true → only rows with non-empty notes
    sortKey: 'name',          // name | bankName | accountNumber | ifsc | sourceSheet | archived
    sortDir: 'asc',           // 'asc' | 'desc'
    page: 1,
    editingId: null,
    creating: false,
    error: '',
    bulkOpen: false,
    bulkBusy: false,
    bulkProgress: ''
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
        sourceSheet:   get('sourceSheet'),
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
        sourceSheet: data.sourceSheet || existing?.sourceSheet || '',
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

window.baaSheetFilter = (val) => {
    stOf().sheetFilter = val || '';
    stOf().page = 1;
    rerender();
};

window.baaToggleNotesOnly = () => {
    stOf().notesOnly = !stOf().notesOnly;
    stOf().page = 1;
    rerender();
};

window.baaSort = (key) => {
    const st = stOf();
    if (st.sortKey === key) {
        st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        st.sortKey = key;
        st.sortDir = 'asc';
    }
    st.page = 1;
    rerender();
};

window.baaGoto = (page) => {
    stOf().page = Math.max(1, page);
    rerender();
};

// ── Bulk import ────────────────────────────────────────────────────
// Parse tab-separated values pasted from Excel: one row per line, columns
// expected in order: Name, Bank, Account #, IFSC, Notes, Source Sheet
// (the last two are optional). Blank lines are skipped; a header row whose
// first cell is "Name" is also skipped automatically so users can paste
// with or without headers.
function parseBulkText(text) {
    const valid = [];
    const errors = [];
    const lines = String(text || '').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i].replace(/\s+$/, '');
        if (!raw.trim()) continue;
        const cells = raw.split('\t').map(s => s.trim());
        if (i === 0 && /^name$/i.test(cells[0] || '')) continue; // header row
        const [name, bankName, accountNumber, ifsc, reviewNotes, sourceSheet] = cells;
        if (!name || !accountNumber) {
            errors.push({ line: i + 1, reason: !name ? 'missing name' : 'missing account #', raw });
            continue;
        }
        valid.push({
            name,
            bankName: bankName || '',
            accountNumber,
            ifsc: (ifsc || '').toUpperCase(),
            reviewNotes: reviewNotes || '',
            sourceSheet: sourceSheet || ''
        });
    }
    return { valid, errors };
}

window.baaBulkOpen = () => {
    stOf().bulkOpen = true;
    stOf().bulkProgress = '';
    rerender();
    setTimeout(() => document.getElementById('baa-bulk-textarea')?.focus(), 50);
};

window.baaBulkClose = () => {
    if (stOf().bulkBusy) return; // don't close mid-import
    stOf().bulkOpen = false;
    stOf().bulkProgress = '';
    rerender();
};

window.baaBulkPreview = () => {
    const text = document.getElementById('baa-bulk-textarea')?.value || '';
    const { valid, errors } = parseBulkText(text);
    const dupIds = new Set();
    for (const row of valid) {
        const id = generateId(row.name);
        if (stOf().accounts.some(a => a.id === id)) dupIds.add(id);
    }
    const out = document.getElementById('baa-bulk-preview');
    if (!out) return;
    out.innerHTML = `
        <div class="text-xs space-y-1">
            <div class="text-emerald-700"><strong>${valid.length}</strong> valid row${valid.length === 1 ? '' : 's'} ready to import</div>
            ${errors.length ? `<div class="text-rose-700"><strong>${errors.length}</strong> skipped: ${errors.slice(0, 3).map(e => `line ${e.line} (${e.reason})`).join(', ')}${errors.length > 3 ? '…' : ''}</div>` : ''}
            ${dupIds.size ? `<div class="text-amber-700"><strong>${dupIds.size}</strong> potential ID collision${dupIds.size === 1 ? '' : 's'} — these will get a unique suffix on save.</div>` : ''}
        </div>`;
};

window.baaBulkImport = async () => {
    if (stOf().bulkBusy) return;
    const text = document.getElementById('baa-bulk-textarea')?.value || '';
    const { valid, errors } = parseBulkText(text);
    if (!valid.length) {
        alert(`No valid rows to import.${errors.length ? ` ${errors.length} row(s) had errors.` : ''}`);
        return;
    }
    if (!confirm(`Import ${valid.length} bank record${valid.length === 1 ? '' : 's'}? ${errors.length ? `(${errors.length} skipped due to errors.)` : ''}`)) return;

    stOf().bulkBusy = true;
    stOf().bulkProgress = `0 / ${valid.length}`;
    rerender();

    const now = new Date().toISOString();
    const existingIds = new Set(stOf().accounts.map(a => a.id));
    let ok = 0, fail = 0;
    for (let i = 0; i < valid.length; i++) {
        const row = valid[i];
        let id = generateId(row.name);
        while (existingIds.has(id)) id = `${id}_${Math.random().toString(36).slice(2, 4)}`;
        existingIds.add(id);
        const payload = {
            id,
            name: row.name,
            bankName: row.bankName,
            accountNumber: row.accountNumber,
            ifsc: row.ifsc,
            reviewNotes: row.reviewNotes,
            sourceFile: 'bulk-paste',
            sourceSheet: row.sourceSheet || '',
            archived: 0,
            createdAt: now,
            updatedAt: now
        };
        try {
            await savePayload(payload);
            ok++;
        } catch (e) {
            fail++;
            console.warn('Bulk row failed:', row, e);
        }
        if (i % 5 === 0 || i === valid.length - 1) {
            stOf().bulkProgress = `${i + 1} / ${valid.length}`;
            const el = document.getElementById('baa-bulk-progress');
            if (el) el.textContent = stOf().bulkProgress;
        }
    }
    stOf().bulkBusy = false;
    stOf().bulkOpen = false;
    stOf().bulkProgress = '';
    try { await loadAccounts(); } catch {}
    rerender();
    alert(`Imported ${ok} row${ok === 1 ? '' : 's'}. ${fail ? `${fail} failed — see browser console.` : ''}`);
};

function renderBulkModal() {
    const st = stOf();
    if (!st.bulkOpen) return '';
    const sample = `Anand Kumar\tHDFC\t50100123456789\tHDFC0001234\t\tSalary HDFC\nMeera S\tAXIS\t910010012345678\tUTIB0000123\tPart-time\tCSA`;
    return `
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onclick="if(event.target===this) baaBulkClose()">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
                        <span class="material-symbols-outlined text-[20px] text-slate-500">content_paste</span>
                        Bulk import bank accounts
                    </h3>
                    <button onclick="baaBulkClose()" ${st.bulkBusy ? 'disabled' : ''} class="pay-icon-btn">
                        <span class="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
                <div class="p-5 space-y-3 overflow-auto flex-1">
                    <div class="text-xs text-slate-600">
                        Paste rows directly from Excel. Expected column order
                        (tab-separated): <strong>Name → Bank → Account # → IFSC → Notes → Source Sheet</strong>.
                        Notes and Source Sheet are optional. Header row is auto-detected and skipped.
                    </div>
                    <textarea id="baa-bulk-textarea"
                        oninput="baaBulkPreview()"
                        placeholder="${sample.replace(/\t/g, '    ').replace(/"/g, '&quot;')}"
                        class="w-full h-64 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        ${st.bulkBusy ? 'disabled' : ''}></textarea>
                    <div id="baa-bulk-preview" class="min-h-[20px]"></div>
                    ${st.bulkBusy ? `
                        <div class="text-xs text-blue-700 flex items-center gap-2">
                            <span class="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                            Importing… <span id="baa-bulk-progress" class="font-mono">${st.bulkProgress}</span>
                        </div>` : ''}
                </div>
                <div class="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button onclick="baaBulkClose()" ${st.bulkBusy ? 'disabled' : ''} class="pay-pill pay-pill--ghost">Cancel</button>
                    <button onclick="baaBulkImport()" ${st.bulkBusy ? 'disabled' : ''} class="pay-pill pay-pill--primary">
                        <span class="material-symbols-outlined text-[14px]">cloud_upload</span> Import
                    </button>
                </div>
            </div>
        </div>`;
}

function applyFilters() {
    const st = stOf();
    const q = st.query.trim().toLowerCase();
    let rows = st.accounts;
    if (st.statusFilter === 'active')   rows = rows.filter(r => !r.archived);
    if (st.statusFilter === 'archived') rows = rows.filter(r => !!r.archived);
    if (st.sheetFilter) rows = rows.filter(r => String(r.sourceSheet || '') === st.sheetFilter);
    if (st.notesOnly)   rows = rows.filter(r => String(r.reviewNotes || '').trim() !== '');
    if (q) {
        rows = rows.filter(r =>
            String(r.name || '').toLowerCase().includes(q)          ||
            String(r.bankName || '').toLowerCase().includes(q)      ||
            String(r.accountNumber || '').toLowerCase().includes(q) ||
            String(r.ifsc || '').toLowerCase().includes(q)          ||
            String(r.reviewNotes || '').toLowerCase().includes(q)   ||
            String(r.sourceSheet || '').toLowerCase().includes(q)   ||
            String(r.id || '').toLowerCase().includes(q)
        );
    }
    // Sort
    const key = st.sortKey;
    const dir = st.sortDir === 'desc' ? -1 : 1;
    rows = rows.slice().sort((a, b) => {
        const av = String(a[key] ?? '').toLowerCase();
        const bv = String(b[key] ?? '').toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return  1 * dir;
        return 0;
    });
    return rows;
}

function distinctSheets() {
    const set = new Set();
    for (const a of stOf().accounts) {
        const s = String(a.sourceSheet || '').trim();
        if (s) set.add(s);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
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
            <td>
                <input data-field="sourceSheet" value="${(a.sourceSheet || '').replace(/"/g, '&quot;')}" placeholder="Source sheet" class="${inputCls} py-1.5 text-xs" />
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
            <td class="text-xs text-slate-600">${esc(a.sourceSheet) || '—'}</td>
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
                <td colspan="9" class="p-10 text-center">
                    <span class="material-symbols-outlined text-[40px] text-slate-300 block mb-2">savings</span>
                    <div class="text-sm text-slate-600 font-semibold">${st.query || st.sheetFilter || st.notesOnly ? 'No matches.' : 'No bank accounts yet.'}</div>
                    <div class="text-xs text-slate-500 mt-1">${st.query || st.sheetFilter || st.notesOnly ? 'Try clearing filters or a different search term.' : 'Click <strong>Add Record</strong> above to create one.'}</div>
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
                            ${sortableTh('name',          'Name')}
                            ${sortableTh('bankName',      'Bank')}
                            ${sortableTh('accountNumber', 'Account #')}
                            ${sortableTh('ifsc',          'IFSC')}
                            <th>Notes</th>
                            ${sortableTh('sourceSheet',   'Source Sheet')}
                            ${sortableTh('archived',      'Status', 'text-center')}
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>${rows.join('')}</tbody>
                </table>
            </div>
            ${renderPagination(filtered.length)}
        </div>`;
}

// Sortable header cell — clicking toggles asc/desc on this column.
function sortableTh(key, label, extraCls = '') {
    const st = stOf();
    const active = st.sortKey === key;
    const arrow = !active ? '' : (st.sortDir === 'asc' ? ' ▲' : ' ▼');
    const cls = `${extraCls} cursor-pointer select-none ${active ? 'text-slate-900 font-bold' : ''}`.trim();
    return `<th class="${cls}" onclick="baaSort('${key}')" title="Sort by ${label}">${label}${arrow}</th>`;
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
    const sheets = distinctSheets();
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
                        placeholder="Search name, bank, account #, IFSC, notes, or sheet..."
                        class="${inputCls} py-2 text-sm flex-1" />
                </div>
                <select onchange="baaSheetFilter(this.value)" class="pay-pill pay-pill--ghost px-3 py-2 text-sm" title="Filter by source sheet">
                    <option value="" ${!st.sheetFilter ? 'selected' : ''}>All sheets (${sheets.length})</option>
                    ${sheets.map(s => `<option value="${esc(s)}" ${st.sheetFilter === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}
                </select>
                <button onclick="baaToggleNotesOnly()" class="pay-pill ${st.notesOnly ? 'pay-pill--primary' : 'pay-pill--ghost'}" title="Show only rows that have notes">
                    <span class="material-symbols-outlined text-[14px]">sticky_note_2</span> Has notes
                </button>
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
    const modal = document.getElementById('baa-modal-root');
    if (modal) modal.innerHTML = renderBulkModal();
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
                    <button onclick="baaBulkOpen()" ${disabled ? 'disabled' : ''} class="pay-pill pay-pill--ghost ${disabled ? 'opacity-50 cursor-not-allowed' : ''}">
                        <span class="material-symbols-outlined text-[14px]">content_paste</span> Bulk Import
                    </button>
                    <button onclick="baaAddNew()" ${disabled ? 'disabled' : ''} class="pay-pill pay-pill--primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}">
                        <span class="material-symbols-outlined text-[14px]">add</span> Add Record
                    </button>
                </div>
            </header>
            <div id="baa-root" class="space-y-5">
                ${renderBody()}
            </div>
            <div id="baa-modal-root">${renderBulkModal()}</div>
        </div>
    `;
}
