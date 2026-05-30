// Bank payment export — search employee, pick account + program, export in
// the exact bank-required column layout. Finance/superadmin/director only.

const PROGRAMS = [
    { id: 'edu_hdfc',      label: 'Salary Education HDFC',      format: 'hdfc', debitBank: 'HDFC', debitAccount: '',                entity: 'Education',         email: '' },
    { id: 'csa_hdfc',      label: 'Salary CSA HDFC',            format: 'hdfc', debitBank: 'HDFC', debitAccount: '',                entity: 'CSA',               email: 'ashajyothi@kalike.org' },
    { id: 'titan_tn_hdfc', label: 'Salary Titan TN HDFC',       format: 'hdfc', debitBank: 'HDFC', debitAccount: '',                entity: 'Titan TN',          email: '' },
    { id: 'titan_ka_hdfc', label: 'Salary Titan KA HDFC',       format: 'hdfc', debitBank: 'HDFC', debitAccount: '',                entity: 'Titan KA',          email: '' },
    { id: 'htpf_axis',     label: 'Salary HTPF Axis',           format: 'axis', debitBank: 'AXIS', debitAccount: '919010089947452', entity: 'HTParekhFoundation',email: '' },
    { id: 'tesco_axis',    label: 'Salary TESCO Axis',          format: 'axis', debitBank: 'AXIS', debitAccount: '919010084929941', entity: 'TESCO',             email: '' },
    { id: 'water_axis',    label: 'Salary Water Security Axis', format: 'axis', debitBank: 'AXIS', debitAccount: '919010089727339', entity: 'WashWaterSecurity', email: '' },
    { id: 'parag',         label: 'PARAG',                      format: 'axis', debitBank: 'AXIS', debitAccount: '919010089727339', entity: 'Parag',             email: '' }
];

// Maps a debit-bank label to the IFSC prefix of that bank. Used to decide I/N.
const INTRA_BANK_PREFIX = { HDFC: 'HDFC', AXIS: 'UTIB' };

const stripSpaces = s => String(s || '').replace(/\s+/g, '');
const stamp = () => {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

function flagFor(program, ifsc) {
    const prefix = INTRA_BANK_PREFIX[program.debitBank] || '';
    return (prefix && String(ifsc || '').toUpperCase().startsWith(prefix)) ? 'I' : 'N';
}

// Build the row array matching the bank's expected layout for the given program.
function buildRow(program, account, amount) {
    const name = stripSpaces(account.name);
    const flag = flagFor(program, account.ifsc);
    const amt = Number.isFinite(+amount) ? +amount : 0;

    if (program.format === 'hdfc') {
        // 29 columns; only the indices listed below carry data.
        const row = Array(29).fill('');
        row[0]  = flag;
        row[2]  = account.accountNumber;
        row[3]  = amt;
        row[4]  = name;
        row[13] = 'Cheque No';
        row[23] = 'Date';
        row[25] = account.ifsc;
        row[26] = account.bankName;
        row[28] = program.email || '';
        return row;
    }
    // axis 12-column format
    return [
        flag,
        amt,
        'Date',
        name,
        account.accountNumber,
        '',
        '',
        program.debitAccount,
        'Cheque No',
        account.ifsc,
        11,
        program.entity
    ];
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

function toCsv(rows) {
    const esc = v => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return rows.map(r => r.map(esc).join(',')).join('\r\n');
}

window.payexState = window.payexState || {
    accounts: [],          // all bank_accounts from server
    matches: [],           // search results
    selected: null,        // currently selected account
    programId: PROGRAMS[0].id,
    amount: ''
};

async function loadAccounts() {
    const res = await fetch('/api/bank_accounts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('amp_token')}` }
    });
    if (!res.ok) throw new Error('Failed to load bank accounts');
    window.payexState.accounts = await res.json();
}

window.payexSearch = (query) => {
    const q = String(query || '').toLowerCase().trim();
    const st = window.payexState;
    if (!q) { st.matches = []; }
    else {
        st.matches = st.accounts.filter(a =>
            (a.name || '').toLowerCase().includes(q)
        ).slice(0, 50);
    }
    document.getElementById('payex-results').innerHTML = renderResults();
};

window.payexSelect = (id) => {
    const st = window.payexState;
    st.selected = st.accounts.find(a => a.id === id) || null;
    document.getElementById('payex-detail').innerHTML = renderDetail();
};

window.payexSetProgram = (id) => { window.payexState.programId = id; };
window.payexSetAmount = (v) => { window.payexState.amount = v; };
window.payexRerenderDetail = () => {
    const el = document.getElementById('payex-detail');
    if (el) el.innerHTML = renderDetail();
};

window.payexExportCsv = () => {
    const { selected, programId, amount } = window.payexState;
    if (!selected) return alert('Select an account first.');
    const program = PROGRAMS.find(p => p.id === programId);
    const row = buildRow(program, selected, amount);
    const csv = toCsv([row]);
    const fname = `${stripSpaces(selected.name)}_${program.id}_${stamp()}.csv`;
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fname);
};

window.payexExportXlsx = () => {
    if (typeof XLSX === 'undefined') return alert('Excel library still loading — try again.');
    const { selected, programId, amount } = window.payexState;
    if (!selected) return alert('Select an account first.');
    const program = PROGRAMS.find(p => p.id === programId);
    const row = buildRow(program, selected, amount);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([row]);
    XLSX.utils.book_append_sheet(wb, ws, program.label.slice(0, 31));
    const fname = `${stripSpaces(selected.name)}_${program.id}_${stamp()}.xlsx`;
    XLSX.writeFile(wb, fname);
};

function renderResults() {
    const st = window.payexState;
    if (!st.matches.length) {
        return `<div class="text-sm text-gray-500 italic">Start typing a name above to see matching accounts.</div>`;
    }
    return `
        <div class="overflow-x-auto border rounded">
            <table class="min-w-full text-sm">
                <thead class="bg-gray-100 text-left">
                    <tr><th class="p-2">Name</th><th class="p-2">Bank</th><th class="p-2">Account</th><th class="p-2">IFSC</th><th class="p-2"></th></tr>
                </thead>
                <tbody>
                    ${st.matches.map(a => `
                        <tr class="border-t hover:bg-blue-50">
                            <td class="p-2">${a.name || ''}</td>
                            <td class="p-2">${a.bankName || ''}</td>
                            <td class="p-2 font-mono text-xs">${a.accountNumber || ''}</td>
                            <td class="p-2 font-mono text-xs">${a.ifsc || ''}</td>
                            <td class="p-2"><button class="px-2 py-1 bg-blue-600 text-white rounded text-xs" onclick="payexSelect('${a.id}')">Select</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
}

function renderDetail() {
    const st = window.payexState;
    const a = st.selected;
    if (!a) return `<div class="text-sm text-gray-500 italic">No account selected.</div>`;
    const program = PROGRAMS.find(p => p.id === st.programId);
    const flag = flagFor(program, a.ifsc);
    return `
        <div class="bg-white border rounded p-4 space-y-3">
            <div class="flex justify-between items-start">
                <div>
                    <div class="text-lg font-semibold">${a.name}</div>
                    <div class="text-sm text-gray-600">${a.bankName || '—'}</div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-gray-500">Transfer type</div>
                    <div class="font-mono text-sm"><span class="px-2 py-0.5 rounded ${flag === 'I' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}">${flag}</span> ${flag === 'I' ? '(intra-bank)' : '(NEFT)'}</div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 text-sm">
                <div><div class="text-xs text-gray-500">Account Number</div><div class="font-mono">${a.accountNumber}</div></div>
                <div><div class="text-xs text-gray-500">IFSC</div><div class="font-mono">${a.ifsc || '—'}</div></div>
            </div>

            <div class="border-t pt-3 grid grid-cols-2 gap-3">
                <div>
                    <label class="text-xs text-gray-500 block mb-1">Program / Debit Source</label>
                    <select onchange="payexSetProgram(this.value); payexRerenderDetail()" class="w-full border rounded px-2 py-1 text-sm">
                        ${PROGRAMS.map(p => `<option value="${p.id}" ${p.id === st.programId ? 'selected' : ''}>${p.label}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-xs text-gray-500 block mb-1">Amount (optional)</label>
                    <input type="number" value="${st.amount || ''}" placeholder="0" oninput="payexSetAmount(this.value)" class="w-full border rounded px-2 py-1 text-sm" />
                </div>
            </div>

            <div class="flex gap-2 pt-2">
                <button onclick="payexExportCsv()" class="px-3 py-2 bg-blue-600 text-white rounded text-sm">Export CSV</button>
                <button onclick="payexExportXlsx()" class="px-3 py-2 bg-emerald-600 text-white rounded text-sm">Export Excel</button>
            </div>
        </div>`;
}

export async function renderPaymentExportPage() {
    // kick off async load; user can start typing once it resolves
    if (!window.payexState.accounts.length) {
        loadAccounts()
            .then(() => { document.getElementById('payex-count').textContent = `${window.payexState.accounts.length} accounts loaded.`; })
            .catch(e => { document.getElementById('payex-count').textContent = `Load failed: ${e.message}`; });
    }

    return `
        <div class="w-full space-y-4 pb-10 font-sans">
            <header>
                <h2 class="page-title">Salary Payment Export</h2>
                <p class="page-subtitle">Search an employee, pick their account, choose the program, and export in the bank's required format.</p>
            </header>

            <div class="bg-white border rounded p-4 space-y-2">
                <label class="text-xs text-gray-500 block">Search by name</label>
                <input type="text" oninput="payexSearch(this.value)" placeholder="Type a name…" class="w-full border rounded px-3 py-2" autofocus />
                <div id="payex-count" class="text-xs text-gray-500">Loading bank master…</div>
            </div>

            <div id="payex-results">${renderResults()}</div>
            <div id="payex-detail">${renderDetail()}</div>
        </div>
    `;
}
