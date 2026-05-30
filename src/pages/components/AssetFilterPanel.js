// Shared asset filter sidebar — used by AssetRegistry, AssetsLedger (Fixed Assets),
// DepreciationPage and FAR Schedule. Each page owns its own state object and
// passes it in; the panel renders inputs and calls `onChangeFnName(key, value)`
// (a global window.app.* method) when the user changes anything.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const FILTER_KEYS = [
    'search', 'category', 'location', 'status', 'assignee',
    'donor', 'program', 'year', 'acqFy',
    'dateFrom', 'dateTo', 'minValue', 'maxValue'
];

export const ASSET_FILTER_DEFAULTS = () => ({
    search: '',
    category: 'all',
    location: 'all',
    status: 'all',
    assignee: 'all',
    donor: 'all',
    program: 'all',
    year: 'all',
    acqFy: 'all',
    dateFrom: '',
    dateTo: '',
    minValue: '',
    maxValue: ''
});

// Apr (month index 3) onward = FY starts that year; before Apr = previous year.
function fyStart(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
        const m = String(dateStr).match(/(\d{4})/);
        return m ? Number(m[1]) : '';
    }
    return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}

const fyLabel = (y) => `FY ${y}-${String((Number(y) + 1) % 100).padStart(2, '0')}`;

export function assetToFilterRow(asset) {
    const rawDate = asset?.purchaseDate || asset?.acqDate || asset?.installationDate || asset?.putToUseDate || '';
    const m = String(rawDate).match(/(\d{4}-\d{2}-\d{2}|\d{4}\/\d{2}\/\d{2}|\d{4})/);
    const acqDate = m ? m[0].replace(/\//g, '-') : '';
    const ym = String(rawDate).match(/(\d{4})/);
    return {
        id: asset?.id || '',
        name: asset?.name || '',
        category: asset?.category || '',
        location: asset?.location || asset?.district || '',
        status: asset?.status || '',
        assignee: asset?.assignedTo || '',
        donor: asset?.fundingSource || '',
        program: asset?.program || '',
        year: ym ? ym[1] : '',
        acqDate,
        acqFy: fyStart(rawDate),
        value: Number(asset?.grossBlock || asset?.amount || 0) || 0
    };
}

export function passesAssetFilter(row, state) {
    if (state.category !== 'all' && row.category !== state.category) return false;
    if (state.location !== 'all' && row.location !== state.location) return false;
    if (state.status !== 'all' && row.status !== state.status) return false;
    if (state.donor !== 'all' && row.donor !== state.donor) return false;
    if (state.program !== 'all' && row.program !== state.program) return false;
    if (state.year && state.year !== 'all' && String(row.year) !== String(state.year)) return false;
    if (state.acqFy && state.acqFy !== 'all' && String(row.acqFy) !== String(state.acqFy)) return false;

    if (state.dateFrom || state.dateTo) {
        const acq = (row.acqDate || '').slice(0, 10);
        if (!acq) return false;
        if (state.dateFrom && acq < state.dateFrom) return false;
        if (state.dateTo && acq > state.dateTo) return false;
    }

    if (state.minValue !== '' && state.minValue != null) {
        const min = Number(state.minValue);
        if (!Number.isNaN(min) && Number(row.value || 0) < min) return false;
    }
    if (state.maxValue !== '' && state.maxValue != null) {
        const max = Number(state.maxValue);
        if (!Number.isNaN(max) && Number(row.value || 0) > max) return false;
    }

    if (state.assignee === 'assigned' && !row.assignee) return false;
    if (state.assignee === 'unassigned' && row.assignee) return false;
    if (state.assignee !== 'all' && state.assignee !== 'assigned' && state.assignee !== 'unassigned'
        && row.assignee !== state.assignee) return false;
    const q = (state.search || '').toLowerCase().trim();
    if (q) {
        const hay = `${row.id} ${row.name} ${row.category} ${row.location} ${row.donor} ${row.program} ${row.assignee}`.toLowerCase();
        if (!hay.includes(q)) return false;
    }
    return true;
}

export function activeAssetFilterCount(state) {
    let n = 0;
    ['category', 'location', 'status', 'assignee', 'donor', 'program', 'year', 'acqFy'].forEach(k => {
        if (state[k] && state[k] !== 'all') n++;
    });
    if ((state.search || '').trim()) n++;
    if (state.dateFrom || state.dateTo) n++;
    if (state.minValue !== '' && state.minValue != null) n++;
    if (state.maxValue !== '' && state.maxValue != null) n++;
    return n;
}

function uniqSorted(rows, pick) {
    return [...new Set(rows.map(pick).filter(v => v !== '' && v != null))].sort();
}

// Build the "Active filters" pill row — one chip per active filter, click X to clear it.
function activeChipsHtml(state, onChange) {
    const chips = [];
    const chip = (label, onClickArgs) =>
        `<button onclick="${onChange}(${onClickArgs})" class="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-wider border border-accent/20 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all">
            ${esc(label)}
            <span class="material-symbols-outlined text-[11px] opacity-60 group-hover:opacity-100">close</span>
        </button>`;

    if ((state.search || '').trim()) chips.push(chip(`"${state.search.trim().slice(0, 14)}"`, `'search', ''`));
    if (state.assignee === 'assigned')     chips.push(chip('Assigned', `'assignee', 'all'`));
    else if (state.assignee === 'unassigned') chips.push(chip('Unassigned', `'assignee', 'all'`));
    else if (state.assignee && state.assignee !== 'all') chips.push(chip(state.assignee.slice(0, 14), `'assignee', 'all'`));
    if (state.category && state.category !== 'all') chips.push(chip(state.category.slice(0, 14), `'category', 'all'`));
    if (state.location && state.location !== 'all') chips.push(chip(state.location.slice(0, 14), `'location', 'all'`));
    if (state.status && state.status !== 'all') chips.push(chip(state.status.slice(0, 14), `'status', 'all'`));
    if (state.donor && state.donor !== 'all') chips.push(chip(state.donor.slice(0, 14), `'donor', 'all'`));
    if (state.program && state.program !== 'all') chips.push(chip(state.program.slice(0, 14), `'program', 'all'`));
    if (state.acqFy && state.acqFy !== 'all') chips.push(chip(fyLabel(state.acqFy), `'acqFy', 'all'`));
    if (state.year && state.year !== 'all') chips.push(chip(`CY ${state.year}`, `'year', 'all'`));
    if (state.dateFrom || state.dateTo) {
        const lbl = `${state.dateFrom || '…'} → ${state.dateTo || '…'}`;
        // Clear both keys in sequence
        chips.push(`<button onclick="${onChange}('dateFrom',''); ${onChange}('dateTo','')" class="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-wider border border-accent/20 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all">
            ${esc(lbl)}
            <span class="material-symbols-outlined text-[11px] opacity-60 group-hover:opacity-100">close</span>
        </button>`);
    }
    if (state.minValue !== '' && state.minValue != null) chips.push(chip(`≥ ₹${state.minValue}`, `'minValue', ''`));
    if (state.maxValue !== '' && state.maxValue != null) chips.push(chip(`≤ ₹${state.maxValue}`, `'maxValue', ''`));

    return chips.length
        ? `<div class="flex flex-wrap gap-1 mb-3">${chips.join('')}</div>`
        : '';
}

// Section header — small uppercase eyebrow with optional icon.
function sectionLabel(icon, text) {
    return `<p class="text-[8px] font-black uppercase tracking-[.18em] text-slate-400 mb-1.5 flex items-center gap-1">
        <span class="material-symbols-outlined text-[12px] text-slate-300">${icon}</span>${text}
    </p>`;
}

// Compact form-row: label on the left, control on the right.
const fieldStyle = 'w-full px-2.5 py-1.5 text-[11px] font-semibold border border-slate-200 rounded-lg bg-slate-50 hover:bg-white focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-colors';

export function renderAssetFilterPanel({ state, allRows, onChange, resetFn, totalLabel, filteredLabel }) {
    const cats     = uniqSorted(allRows, r => r.category);
    const locs     = uniqSorted(allRows, r => r.location);
    const statuses = uniqSorted(allRows, r => r.status);
    const donors   = uniqSorted(allRows, r => r.donor);
    const programs = uniqSorted(allRows, r => r.program);
    const years    = uniqSorted(allRows, r => r.year).reverse();
    const fys      = uniqSorted(allRows, r => r.acqFy).reverse();
    const assignees = uniqSorted(allRows, r => r.assignee);

    const opt = (val, label, selected) =>
        `<option value="${esc(val)}" ${String(val) === String(selected) ? 'selected' : ''}>${esc(label)}</option>`;

    const filterCount = activeAssetFilterCount(state);
    const totalN = (totalLabel ?? allRows.length).toLocaleString('en-IN');
    const visibleN = (filteredLabel ?? allRows.length).toLocaleString('en-IN');
    const hasDateRange = !!(state.dateFrom || state.dateTo);
    const hasValueRange = (state.minValue !== '' && state.minValue != null) || (state.maxValue !== '' && state.maxValue != null);

    // Quick-pick chip — visually toggleable scope button.
    const qChip = (active, label, onClick) =>
        `<button onclick="${onClick}" class="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border transition-all ${active ? 'bg-accent text-white border-accent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}">${esc(label)}</button>`;

    // FY shortcuts: latest + previous from data, plus calendar "this/last".
    const latestFy = fys[0];
    const prevFy   = fys[1];
    const fyShortcut = (val, label) =>
        val ? qChip(String(state.acqFy) === String(val), label, `${onChange}('acqFy', '${val}')`) : '';

    return `
        <div class="bg-white border border-slate-200 rounded-xl shadow-sm md:h-full flex flex-col overflow-hidden">
            <!-- Sticky header inside the panel: title + counts + clear-all -->
            <div class="px-3 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                    <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px] text-slate-500">filter_alt</span>
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-700">Filters</span>
                        ${filterCount ? `<span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-accent text-white">${filterCount}</span>` : ''}
                    </div>
                    ${filterCount ? `<button onclick="${resetFn}()" class="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors">Clear all</button>` : ''}
                </div>
                <p class="text-[10px] font-bold text-slate-400">
                    <span class="text-slate-700 font-black">${visibleN}</span> of ${totalN} rows
                </p>
            </div>

            <div class="px-3 py-3 flex-1 min-h-0 overflow-y-auto">
                ${activeChipsHtml(state, onChange)}

                <!-- Search -->
                <div class="relative mb-3">
                    <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-400 pointer-events-none">search</span>
                    <input type="text" placeholder="Search ID, name, assignee…" value="${esc(state.search)}"
                        oninput="${onChange}('search', this.value)"
                        class="${fieldStyle} pl-7" />
                </div>

                <!-- Quick scope -->
                <div class="mb-4">
                    ${sectionLabel('bolt', 'Quick Scope')}
                    <div class="flex flex-wrap gap-1">
                        ${qChip(state.assignee === 'all', 'All', `${onChange}('assignee', 'all')`)}
                        ${qChip(state.assignee === 'assigned',   'Assigned',   `${onChange}('assignee', 'assigned')`)}
                        ${qChip(state.assignee === 'unassigned', 'Unassigned', `${onChange}('assignee', 'unassigned')`)}
                    </div>
                </div>

                <!-- Categorize -->
                <div class="mb-4">
                    ${sectionLabel('category', 'Categorize')}
                    <div class="flex flex-col gap-1.5">
                        ${assignees.length > 0 ? `
                        <select onchange="${onChange}('assignee', this.value)" class="${fieldStyle}" title="Assignee / Custodian">
                            <option value="all">All Assignees</option>
                            <option value="assigned"   ${state.assignee === 'assigned' ? 'selected' : ''}>· Any Assigned</option>
                            <option value="unassigned" ${state.assignee === 'unassigned' ? 'selected' : ''}>· Unassigned only</option>
                            ${assignees.map(v => opt(v, v, state.assignee)).join('')}
                        </select>` : ''}

                        ${cats.length > 0 ? `
                        <select onchange="${onChange}('category', this.value)" class="${fieldStyle}" title="Asset Class / Category">
                            <option value="all">All Categories</option>
                            ${cats.map(v => opt(v, v, state.category)).join('')}
                        </select>` : ''}

                        ${locs.length > 0 ? `
                        <select onchange="${onChange}('location', this.value)" class="${fieldStyle}" title="Location / District">
                            <option value="all">All Locations</option>
                            ${locs.map(v => opt(v, v, state.location)).join('')}
                        </select>` : ''}

                        ${statuses.length > 0 ? `
                        <select onchange="${onChange}('status', this.value)" class="${fieldStyle}" title="Status / State">
                            <option value="all">All Statuses</option>
                            ${statuses.map(v => opt(v, v, state.status)).join('')}
                        </select>` : ''}

                        ${donors.length > 0 ? `
                        <select onchange="${onChange}('donor', this.value)" class="${fieldStyle}" title="Grant / Fund Source">
                            <option value="all">All Grants / Funds</option>
                            ${donors.map(v => opt(v, v, state.donor)).join('')}
                        </select>` : ''}

                        ${programs.length > 0 ? `
                        <select onchange="${onChange}('program', this.value)" class="${fieldStyle}" title="Program">
                            <option value="all">All Programs</option>
                            ${programs.map(v => opt(v, v, state.program)).join('')}
                        </select>` : ''}
                    </div>
                </div>

                <!-- When -->
                <div class="mb-4">
                    ${sectionLabel('event', 'When · Acquisition')}
                    ${(latestFy || prevFy) ? `
                        <div class="flex flex-wrap gap-1 mb-1.5">
                            ${qChip(state.acqFy === 'all', 'Any FY', `${onChange}('acqFy', 'all')`)}
                            ${fyShortcut(latestFy, fyLabel(latestFy))}
                            ${fyShortcut(prevFy,   fyLabel(prevFy))}
                        </div>` : ''}
                    <div class="flex flex-col gap-1.5">
                        ${fys.length > 0 ? `
                        <select onchange="${onChange}('acqFy', this.value)" class="${fieldStyle}" title="Financial Year of Acquisition (Apr-Mar)">
                            <option value="all">All Financial Years</option>
                            ${fys.map(v => opt(v, fyLabel(v), state.acqFy)).join('')}
                        </select>` : ''}

                        ${years.length > 0 ? `
                        <select onchange="${onChange}('year', this.value)" class="${fieldStyle}" title="Calendar Year of Purchase">
                            <option value="all">All Calendar Years</option>
                            ${years.map(v => opt(v, v, state.year)).join('')}
                        </select>` : ''}

                        <div class="grid grid-cols-2 gap-1.5">
                            <input type="date" value="${esc(state.dateFrom)}" onchange="${onChange}('dateFrom', this.value)" title="From"
                                class="${fieldStyle}" />
                            <input type="date" value="${esc(state.dateTo)}" onchange="${onChange}('dateTo', this.value)" title="To"
                                class="${fieldStyle}" />
                        </div>
                        ${hasDateRange ? `<button onclick="${onChange}('dateFrom',''); ${onChange}('dateTo','')" class="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-600 px-2 py-1 rounded border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-all">Clear dates</button>` : ''}
                    </div>
                </div>

                <!-- Value -->
                <div>
                    ${sectionLabel('payments', 'Value Range (₹)')}
                    <div class="grid grid-cols-2 gap-1.5">
                        <input type="number" inputmode="decimal" placeholder="Min" value="${esc(state.minValue)}" onchange="${onChange}('minValue', this.value)"
                            class="${fieldStyle}" />
                        <input type="number" inputmode="decimal" placeholder="Max" value="${esc(state.maxValue)}" onchange="${onChange}('maxValue', this.value)"
                            class="${fieldStyle}" />
                    </div>
                    ${hasValueRange ? `<button onclick="${onChange}('minValue',''); ${onChange}('maxValue','')" class="mt-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-600 px-2 py-1 rounded border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-all w-full">Clear value range</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

export { FILTER_KEYS, fyStart, fyLabel };
