// Bank payment export. Two-step flow:
//   1) pick program / debit source        (state.stage = 'pick_program')
//   2) search + multi-select beneficiaries (state.stage = 'cart')
// Then export N rows in one CSV/XLSX matching the bank's exact column layout.
// Finance/superadmin/director only — gated server-side too.

// Programs are loaded from /api/payment_programs at page open. The list is
// editable via the Payment Programs admin page.

// Used to decide intra-bank (I) vs NEFT (N).
const INTRA_BANK_PREFIX = { HDFC: 'HDFC', AXIS: 'UTIB' };

const stripSpaces = s => String(s || '').replace(/\s+/g, '');
const stamp = () => {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};
// dd-mm-yyyy — what the bank import templates expect.
const todayDMY = () => {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth()+1)}-${d.getFullYear()}`;
};

function flagFor(program, ifsc) {
    const prefix = INTRA_BANK_PREFIX[program.debitBank] || '';
    return (prefix && String(ifsc || '').toUpperCase().startsWith(prefix)) ? 'I' : 'N';
}

// Format the cheque number with the program's optional prefix.
function formatCheque(program, n) {
    return `${program.chequePrefix || ''}${n}`;
}

// Build one bank-format row for a single beneficiary + amount + cheque #.
function buildRow(program, account, amount, chequeNo) {
    const name = stripSpaces(account.name);
    const flag = flagFor(program, account.ifsc);
    const amt = Number.isFinite(+amount) ? +amount : 0;
    const chq = formatCheque(program, chequeNo);
    const date = todayDMY();

    if (program.format === 'hdfc') {
        // 29 columns. The bank template has literal labels 'Cheque No' at col 13
        // and 'Date' at col 23; keep those labels — put the actual values in the
        // next (originally empty) column.
        const row = Array(29).fill('');
        row[0]  = flag;
        row[2]  = account.accountNumber;
        row[3]  = amt;
        row[4]  = name;
        row[13] = 'Cheque No';
        row[14] = chq;
        row[23] = 'Date';
        row[24] = date;
        row[25] = account.ifsc;
        row[26] = account.bankName;
        row[28] = program.email || '';
        return row;
    }
    // axis 12-column format. Labels 'Date' at idx 2 and 'Cheque No' at idx 8
    // stay as literals; the actual values go into the empty slots (5 and 6).
    return [
        flag,
        amt,
        'Date',
        name,
        account.accountNumber,
        date,
        chq,
        program.debitAccount,
        'Cheque No',
        account.ifsc,
        11,
        program.entity
    ];
}

function toCsv(rows) {
    const esc = v => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return rows.map(r => r.map(esc).join(',')).join('\r\n');
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── state ──────────────────────────────────────────────────────────
window.payexState = window.payexState || {
    stage: 'pick_program',  // or 'cart'
    programId: null,
    programs: [],           // payment_programs from server
    accounts: [],           // all bank_accounts from server
    query: '',
    matches: [],            // search results
    cart: []                // [{ accountId, amount }]
};

const stOf = () => window.payexState;
const programOf = () => stOf().programs.find(p => p.id === stOf().programId) || null;
const accountById = id => stOf().accounts.find(a => a.id === id) || null;

async function loadAccounts() {
    const res = await fetch('/api/bank_accounts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('amp_token')}` }
    });
    if (!res.ok) throw new Error('Failed to load bank accounts');
    stOf().accounts = await res.json();
}

async function loadPrograms() {
    const res = await fetch('/api/payment_programs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('amp_token')}` }
    });
    if (!res.ok) throw new Error('Failed to load payment programs');
    const rows = await res.json();
    stOf().programs = (Array.isArray(rows) ? rows : [])
        .filter(p => !p.archived)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.label).localeCompare(String(b.label)));
}

async function postAuditEvent(extra) {
    try {
        const program = programOf();
        await fetch('/api/payment_export_audit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('amp_token')}`
            },
            body: JSON.stringify({
                programId: program?.id,
                programLabel: program?.label,
                format: program?.format,
                rowCount: extra.rowCount,
                totalAmount: extra.totalAmount,
                beneficiaryIds: extra.beneficiaryIds
            })
        });
    } catch (e) {
        // Audit must never block the export. Log to console only.
        console.warn('Audit log failed:', e.message);
    }
}

// ── handlers ──────────────────────────────────────────────────────
window.payexPickProgram = (id) => {
    stOf().programId = id;
    stOf().stage = 'cart';
    stOf().query = '';
    stOf().matches = [];
    stOf().cart = [];
    rerender();
};

window.payexChangeProgram = () => {
    stOf().stage = 'pick_program';
    rerender();
};

// Multi-field search: matches against name, account number, IFSC, or bank name.
// Numeric-only queries (no letters) skip the name field so digits don't
// accidentally hit names containing those digits — keeps account search clean.
// Each match carries `_matchedOn` so the row can render a "matched on …" hint.
function matchAccount(a, raw) {
    if (!raw) return null;
    const needle = raw.toLowerCase();
    const digitsOnly = /^\d+$/.test(raw.replace(/\s+/g, ''));
    const compactNeedle = needle.replace(/\s+/g, '');
    if (!digitsOnly && (a.name || '').toLowerCase().includes(needle)) return 'Name';
    if ((a.accountNumber || '').toLowerCase().includes(compactNeedle)) return 'Account';
    if (!digitsOnly) {
        if ((a.ifsc || '').toLowerCase().includes(needle)) return 'IFSC';
        if ((a.bankName || '').toLowerCase().includes(needle)) return 'Bank';
    }
    return null;
}

window.payexSearch = (q) => {
    const st = stOf();
    st.query = q;
    const raw = String(q || '').trim();
    if (!raw) { st.matches = []; document.getElementById('payex-results').innerHTML = renderResults(); return; }
    const out = [];
    for (const a of st.accounts) {
        const on = matchAccount(a, raw);
        if (on) { out.push({ ...a, _matchedOn: on }); if (out.length >= 100) break; }
    }
    st.matches = out;
    document.getElementById('payex-results').innerHTML = renderResults();
};

window.payexAdd = (accountId) => {
    const st = stOf();
    if (st.cart.some(c => c.accountId === accountId)) return;  // already in cart
    st.cart.push({ accountId, amount: '' });
    document.getElementById('payex-cart').innerHTML = renderCart();
    document.getElementById('payex-results').innerHTML = renderResults();
};

window.payexRemove = (accountId) => {
    stOf().cart = stOf().cart.filter(c => c.accountId !== accountId);
    document.getElementById('payex-cart').innerHTML = renderCart();
    document.getElementById('payex-results').innerHTML = renderResults();
};

window.payexSetAmount = (accountId, v) => {
    const line = stOf().cart.find(c => c.accountId === accountId);
    if (line) line.amount = v;
    // update totals row only — don't blow away the input field
    const t = document.getElementById('payex-cart-total');
    if (t) t.textContent = cartTotalString();
};

window.payexClearCart = () => {
    if (!stOf().cart.length) return;
    if (!confirm('Clear all selected beneficiaries?')) return;
    stOf().cart = [];
    document.getElementById('payex-cart').innerHTML = renderCart();
    document.getElementById('payex-results').innerHTML = renderResults();
};

function buildExport() {
    const program = programOf();
    const st = stOf();
    if (!program) { alert('Pick a program first.'); return null; }
    if (!st.cart.length) { alert('Add at least one beneficiary.'); return null; }

    const zeroRows = st.cart.filter(c => !(+c.amount > 0)).length;
    if (zeroRows > 0) {
        const proceed = confirm(`${zeroRows} of ${st.cart.length} row(s) have amount = 0. Export anyway?`);
        if (!proceed) return null;
    }

    // Assign sequential cheque numbers starting from the program's base.
    const baseCheque = Number.isFinite(+program.baseChequeNumber) ? +program.baseChequeNumber : 1001;
    const rows = [];
    const usedCheques = [];
    let idx = 0;
    for (const c of st.cart) {
        const acc = accountById(c.accountId);
        if (!acc) continue;
        const chq = baseCheque + idx;
        rows.push(buildRow(program, acc, c.amount, chq));
        usedCheques.push(chq);
        idx++;
    }

    const total = st.cart.reduce((s, c) => s + (Number.isFinite(+c.amount) ? +c.amount : 0), 0);
    postAuditEvent({
        rowCount: rows.length,
        totalAmount: total,
        beneficiaryIds: st.cart.map(c => c.accountId),
        chequeFrom: usedCheques[0],
        chequeTo: usedCheques[usedCheques.length - 1]
    });

    return { program, rows, chequeFrom: usedCheques[0], chequeTo: usedCheques[usedCheques.length - 1] };
}

// After a successful export, push the next cheque number back to the program
// so the next batch starts where this one stopped. Re-loads programs after.
async function advanceChequeNumber(programId, nextBase) {
    const program = stOf().programs.find(p => p.id === programId);
    if (!program) return;
    const payload = { ...program, baseChequeNumber: nextBase, updatedAt: new Date().toISOString() };
    try {
        const res = await fetch('/api/payment_programs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('amp_token')}`
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        program.baseChequeNumber = nextBase; // update local cache
    } catch (e) {
        console.warn('Failed to advance cheque number on server:', e);
    }
}

function showExportBanner(built) {
    const program = built.program;
    const from = formatCheque(program, built.chequeFrom);
    const to = formatCheque(program, built.chequeTo);
    const next = formatCheque(program, built.chequeTo + 1);
    const msg = built.chequeFrom === built.chequeTo
        ? `Exported 1 row · Cheque #${from} · Next batch will start at #${next}`
        : `Exported ${built.rows.length} rows · Cheques #${from}–#${to} · Next batch will start at #${next}`;
    const el = document.getElementById('payex-banner');
    if (el) {
        el.innerHTML = `
            <div class="pay-section" style="border-left: 4px solid #10b981">
                <div class="p-3 flex items-start gap-2 text-sm text-emerald-800">
                    <span class="material-symbols-outlined text-[18px] text-emerald-600 mt-0.5">check_circle</span>
                    <div class="flex-1">${msg}</div>
                    <button onclick="document.getElementById('payex-banner').innerHTML=''" class="pay-icon-btn">
                        <span class="material-symbols-outlined text-[16px]">close</span>
                    </button>
                </div>
            </div>`;
    }
}

window.payexExportCsv = async () => {
    const built = buildExport();
    if (!built) return;
    const csv = toCsv(built.rows);
    const fname = `${built.program.id}_${stamp()}.csv`;
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fname);
    await advanceChequeNumber(built.program.id, built.chequeTo + 1);
    showExportBanner(built);
};

// Force the given column indices to be stored as text cells in the worksheet.
// SheetJS auto-types all-digit strings as numbers, which makes Excel render
// long account numbers in scientific notation and drop leading zeros. We
// override the cell type and number format so the value survives intact.
function coerceColumnsToText(sheet, cols) {
    if (!sheet || !sheet['!ref']) return;
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (const c of cols) {
        for (let r = range.s.r; r <= range.e.r; r++) {
            const ref = XLSX.utils.encode_cell({ r, c });
            const cell = sheet[ref];
            if (!cell || cell.v === undefined || cell.v === null || cell.v === '') continue;
            cell.v = String(cell.v);
            cell.t = 's';
            cell.z = '@';   // text format code
        }
    }
}

// Text-typed column indices per bank format (account #, IFSC, cheque, date, etc.).
function textColumnsFor(format) {
    if (format === 'hdfc') return [2, 14, 24, 25, 26, 28]; // accountNumber, cheque value, date value, ifsc, bankName, email
    if (format === 'axis') return [4, 5, 6, 7, 9, 11];     // accountNumber, date value, cheque value, debitAccount, ifsc, entity
    return [];
}

window.payexExportXlsx = async () => {
    if (typeof XLSX === 'undefined') return alert('Excel library still loading — try again.');
    const built = buildExport();
    if (!built) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(built.rows);
    coerceColumnsToText(ws, textColumnsFor(built.program.format));
    XLSX.utils.book_append_sheet(wb, ws, built.program.label.slice(0, 31));
    const fname = `${built.program.id}_${stamp()}.xlsx`;
    XLSX.writeFile(wb, fname);
    await advanceChequeNumber(built.program.id, built.chequeTo + 1);
    showExportBanner(built);
};

// ── render helpers ─────────────────────────────────────────────────
function cartTotal() {
    return stOf().cart.reduce((s, c) => s + (Number.isFinite(+c.amount) ? +c.amount : 0), 0);
}
function cartTotalString() {
    const total = cartTotal();
    return `${stOf().cart.length} selected · ₹${total.toLocaleString('en-IN')}`;
}

// Step indicator at top of both stages. `current` is 1 or 2.
function renderStepper(current) {
    const dot = (n, label, active, done) => {
        const numCls = active ? 'pay-step__num pay-step__num--active' : (done ? 'pay-step__num pay-step__num--done' : 'pay-step__num');
        const lblCls = active ? 'pay-step__label pay-step__label--active' : (done ? 'pay-step__label pay-step__label--done' : 'pay-step__label');
        return `<div class="pay-step"><span class="${numCls}">${done ? '✓' : n}</span><span class="${lblCls}">${label}</span></div>`;
    };
    const barCls = current > 1 ? 'pay-step__bar pay-step__bar--done' : 'pay-step__bar';
    return `
        <div class="flex items-center gap-3">
            ${dot(1, 'Pick program', current === 1, current > 1)}
            <div class="${barCls}"></div>
            ${dot(2, 'Select & export', current === 2, false)}
        </div>`;
}

function renderProgramPicker() {
    const programs = stOf().programs;
    if (!programs.length) {
        return `
            <div class="pay-section">
                <div class="p-8 text-center space-y-3">
                    <span class="material-symbols-outlined text-[40px] text-slate-300">tune</span>
                    <div class="text-sm text-slate-700 font-semibold">No active payment programs yet.</div>
                    <div class="text-xs text-slate-500">Ask Finance/Superadmin to add one from <strong>Finance → Payment Programs</strong>.</div>
                </div>
            </div>`;
    }
    return `
        <div class="pay-section">
            <div class="pay-section__head">
                <span class="pay-section__title"><span class="material-symbols-outlined text-[16px] text-slate-500">looks_one</span> Pick program · Debit source</span>
                ${renderStepper(1)}
            </div>
            <div class="p-5">
                <p class="text-xs text-slate-500 mb-4">Pick where the salary is being paid from. Bank format, debit account, and intra-bank routing all follow from this.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    ${programs.map((p, i) => {
                        const isHdfc = p.format === 'hdfc';
                        const stripColor = isHdfc ? 'bg-blue-500' : 'bg-violet-500';
                        const tileMod = isHdfc ? '' : 'pay-tile--axis';
                        const badgeMod = isHdfc ? 'pay-badge--hdfc' : 'pay-badge--axis';
                        const icon = isHdfc ? 'account_balance' : 'currency_rupee';
                        return `
                            <button onclick="payexPickProgram('${p.id}')"
                                class="pay-tile pay-anim ${tileMod} group focus:outline-none focus:ring-2 focus:ring-blue-300/40"
                                style="--pay-delay: ${i * 40}ms">
                                <span class="pay-tile__strip ${stripColor}"></span>
                                <div class="space-y-2.5">
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="flex items-center gap-2 min-w-0">
                                            <span class="material-symbols-outlined text-slate-400 text-[20px]">${icon}</span>
                                            <span class="font-bold text-slate-900 text-[15px] truncate">${p.label}</span>
                                        </div>
                                        <span class="pay-badge ${badgeMod}">${(p.format || '').toUpperCase()}</span>
                                    </div>
                                    <div class="grid grid-cols-1 gap-1 text-[12px]">
                                        <div class="flex items-center gap-1.5 text-slate-600">
                                            <span class="material-symbols-outlined text-[15px] text-slate-400">payments</span>
                                            <span class="font-semibold">${p.debitBank || '—'}</span>
                                            ${p.debitAccount ? `<span class="font-mono text-slate-500">· ${p.debitAccount}</span>` : ''}
                                        </div>
                                        <div class="flex items-center gap-1.5 text-slate-500">
                                            <span class="material-symbols-outlined text-[15px] text-slate-400">domain</span>
                                            <span>${p.entity || '—'}</span>
                                        </div>
                                    </div>
                                    <div class="pt-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        Select <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                                    </div>
                                </div>
                            </button>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
}

function renderResults() {
    const st = stOf();
    const program = programOf();
    if (!st.query.trim()) {
        return `
            <div class="p-8 text-center text-xs text-slate-400 italic">
                <span class="material-symbols-outlined text-[28px] text-slate-300 block mb-2">search</span>
                Start typing a name, account number, IFSC, or bank above to find beneficiaries.
            </div>`;
    }
    if (!st.matches.length) {
        return `
            <div class="p-8 text-center text-xs text-slate-500 italic">
                <span class="material-symbols-outlined text-[28px] text-slate-300 block mb-2">search_off</span>
                No matches in the master file for "<strong>${st.query}</strong>".
            </div>`;
    }
    const cartIds = new Set(st.cart.map(c => c.accountId));
    return `
        <div class="overflow-x-auto">
            <table class="pay-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Bank</th>
                        <th>Account</th>
                        <th>IFSC</th>
                        <th>Matched</th>
                        <th class="text-center">Route</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${st.matches.map(a => {
                        const inCart = cartIds.has(a.id);
                        const flag = program ? flagFor(program, a.ifsc) : '';
                        const flagBadge = flag === 'I' ? 'pay-badge pay-badge--i' : 'pay-badge pay-badge--n';
                        return `
                            <tr class="${inCart ? 'is-added' : ''}">
                                <td class="font-semibold text-slate-800">${a.name || ''}</td>
                                <td class="text-slate-600">${a.bankName || '—'}</td>
                                <td class="font-mono text-[11.5px] text-slate-700">${a.accountNumber || ''}</td>
                                <td class="font-mono text-[11.5px] text-slate-500">${a.ifsc || ''}</td>
                                <td><span class="text-[9.5px] font-bold uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded">${a._matchedOn || ''}</span></td>
                                <td class="text-center">
                                    <span class="${flagBadge}" title="${flag === 'I' ? 'Intra-bank (same bank, instant)' : 'NEFT (different bank)'}">${flag || '—'}</span>
                                </td>
                                <td class="text-right">
                                    ${inCart
                                        ? `<span class="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1 justify-end"><span class="material-symbols-outlined text-[14px]">check</span> Added</span>`
                                        : `<button onclick="payexAdd('${a.id}')" class="pay-pill pay-pill--primary ml-auto"><span class="material-symbols-outlined text-[14px]">add</span> Add</button>`}
                                </td>
                            </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;
}

function renderCart() {
    const st = stOf();
    if (!st.cart.length) {
        return `
            <div class="pay-section">
                <div class="pay-section__head">
                    <span class="pay-section__title"><span class="material-symbols-outlined text-[16px] text-slate-500">shopping_cart</span> Selected beneficiaries</span>
                    <span class="pay-section__meta">0 selected</span>
                </div>
                <div class="p-8 text-center text-xs text-slate-400 italic">
                    <span class="material-symbols-outlined text-[28px] text-slate-300 block mb-2">shopping_cart</span>
                    Search above and click <strong>Add</strong> to include beneficiaries in the export.
                </div>
            </div>`;
    }
    const program = programOf();
    return `
        <div class="pay-section">
            <div class="pay-section__head">
                <span class="pay-section__title"><span class="material-symbols-outlined text-[16px] text-slate-500">shopping_cart</span> Selected beneficiaries</span>
                <button onclick="payexClearCart()" class="pay-pill pay-pill--danger-soft">
                    <span class="material-symbols-outlined text-[14px]">delete_sweep</span> Clear all
                </button>
            </div>
            <div class="overflow-x-auto">
                <table class="pay-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Account</th>
                            <th>IFSC</th>
                            <th class="text-center">Route</th>
                            <th>Amount (₹)</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${st.cart.map(c => {
                            const a = accountById(c.accountId);
                            if (!a) return '';
                            const flag = program ? flagFor(program, a.ifsc) : '';
                            const flagBadge = flag === 'I' ? 'pay-badge pay-badge--i' : 'pay-badge pay-badge--n';
                            return `
                                <tr>
                                    <td class="font-semibold text-slate-800">${a.name || ''}</td>
                                    <td class="font-mono text-[11.5px] text-slate-700">${a.accountNumber || ''}</td>
                                    <td class="font-mono text-[11.5px] text-slate-500">${a.ifsc || ''}</td>
                                    <td class="text-center"><span class="${flagBadge}">${flag || '—'}</span></td>
                                    <td>
                                        <div class="relative">
                                            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                                            <input type="number" min="0" step="0.01" value="${c.amount}" placeholder="0"
                                                oninput="payexSetAmount('${a.id}', this.value)"
                                                class="w-36 pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all" />
                                        </div>
                                    </td>
                                    <td class="text-right">
                                        <button onclick="payexRemove('${a.id}')" class="pay-icon-btn pay-icon-btn--danger" title="Remove">
                                            <span class="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    </td>
                                </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <div class="border-t border-slate-100 px-4 py-3 bg-slate-50/60 text-right">
                <span id="payex-cart-total" class="text-sm font-bold text-slate-800">${cartTotalString()}</span>
            </div>
        </div>`;
}

function renderCartStage() {
    const program = programOf();
    if (!program) return renderProgramPicker();
    const isHdfc = program.format === 'hdfc';
    const stripColor = isHdfc ? 'bg-blue-500' : 'bg-violet-500';
    const tileMod = isHdfc ? '' : 'pay-tile--axis';
    const badgeMod = isHdfc ? 'pay-badge--hdfc' : 'pay-badge--axis';
    const st = stOf();
    return `
        <!-- Selected program hero -->
        <div class="pay-tile ${tileMod}">
            <span class="pay-tile__strip ${stripColor}"></span>
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 mb-1.5">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Selected program</span>
                        <span class="pay-badge ${badgeMod}">${(program.format || '').toUpperCase()}</span>
                    </div>
                    <div class="font-headline font-extrabold text-slate-900 text-[17px]">${program.label}</div>
                    <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-600">
                        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[15px] text-slate-400">payments</span><strong>${program.debitBank}</strong>${program.debitAccount ? ` · <span class="font-mono">${program.debitAccount}</span>` : ''}</span>
                        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[15px] text-slate-400">domain</span>${program.entity || '—'}</span>
                        ${program.email ? `<span class="flex items-center gap-1 text-slate-500"><span class="material-symbols-outlined text-[15px] text-slate-400">mail</span>${program.email}</span>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    ${renderStepper(2)}
                    <button onclick="payexChangeProgram()" class="pay-pill pay-pill--ghost">
                        <span class="material-symbols-outlined text-[14px]">swap_horiz</span> Change
                    </button>
                </div>
            </div>
        </div>

        <!-- Search -->
        <div class="pay-section">
            <div class="pay-section__head">
                <span class="pay-section__title"><span class="material-symbols-outlined text-[16px] text-slate-500">search</span> Search beneficiaries</span>
                <span id="payex-count" class="pay-section__meta">${st.accounts.length} loaded</span>
            </div>
            <div class="p-5">
                <div class="pay-search">
                    <span class="pay-search__icon material-symbols-outlined text-[20px]">search</span>
                    <input type="text" value="${st.query || ''}" oninput="payexSearch(this.value)" placeholder="Name, account number, IFSC, or bank…" autofocus />
                    <span class="pay-search__hint">Name · Account · IFSC</span>
                </div>
            </div>
            <div id="payex-results" class="border-t border-slate-100">${renderResults()}</div>
        </div>

        <!-- Cart -->
        <div id="payex-cart">${renderCart()}</div>

        <!-- Post-export confirmation banner -->
        <div id="payex-banner"></div>

        <!-- Export action bar -->
        <div class="pay-action-bar">
            <div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ready to export</div>
                <div class="font-bold text-[14px] text-slate-800">${cartTotalString()} · Format: ${(program.format || '').toUpperCase()}</div>
            </div>
            <div class="flex gap-2">
                <button onclick="payexExportCsv()" class="pay-pill pay-pill--primary">
                    <span class="material-symbols-outlined text-[14px]">csv</span> Export CSV
                </button>
                <button onclick="payexExportXlsx()" class="pay-pill pay-pill--success">
                    <span class="material-symbols-outlined text-[14px]">table_chart</span> Export Excel
                </button>
            </div>
        </div>`;
}

function rerender() {
    const root = document.getElementById('payex-root');
    if (!root) return;
    root.innerHTML = stOf().stage === 'pick_program' ? renderProgramPicker() : renderCartStage();
}

export async function renderPaymentExportPage() {
    // Fire-and-forget loads. Programs always reload so newly-added ones show.
    loadPrograms()
        .then(() => { rerender(); })
        .catch(e => {
            const root = document.getElementById('payex-root');
            if (root) root.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">Failed to load payment programs: ${e.message}</div>`;
        });

    if (!stOf().accounts.length) {
        loadAccounts()
            .then(() => {
                const c = document.getElementById('payex-count');
                if (c) c.textContent = `${stOf().accounts.length} beneficiaries loaded.`;
            })
            .catch(e => {
                const c = document.getElementById('payex-count');
                if (c) c.textContent = `Load failed: ${e.message}`;
            });
    }

    return `
        <div class="pay-page w-full space-y-5 pb-10 font-sans">
            <header class="flex items-start justify-between gap-4">
                <div>
                    <h2 class="page-title flex items-center gap-2"><span class="material-symbols-outlined text-[22px] text-slate-400">account_balance</span> Salary Payment Export</h2>
                    <p class="page-subtitle">Bank-Ready Disbursement Builder</p>
                </div>
                <a href="#payment_programs" class="pay-pill pay-pill--ghost">
                    <span class="material-symbols-outlined text-[14px]">tune</span> Manage Programs
                </a>
            </header>
            <div id="payex-root" class="space-y-5">
                ${stOf().stage === 'pick_program' ? renderProgramPicker() : renderCartStage()}
            </div>
        </div>
    `;
}
