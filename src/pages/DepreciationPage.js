import { db } from '../mock/db.js';

// ─── Module state ────────────────────────────────────────────
// Filters persist across re-renders so partial table updates don't lose context.
const DEP_STATE = window.__depState || (window.__depState = {
    fy: 'all',
    category: 'all',
    location: 'all',
    status: 'all',
    donor: 'all',
    program: 'all',
    search: '',
    acqFy: 'all',
    dateFrom: '',
    dateTo: '',
    minValue: '',
    maxValue: ''
});

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function fyLabel(fy) {
    const y = Number(fy) || 0;
    if (!y) return '—';
    return `${y}-${String((y + 1) % 100).padStart(2, '0')}`;
}

// Apr (month index 3) onward = FY starts that year; before Apr = previous year.
function fyStartOf(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    return d.getMonth() >= 3 ? y : y - 1;
}

// Per-unit derivation: the FAR row is the source of truth for value/depreciation.
function buildFarIndex() {
    const idx = new Map();
    (db.assetFar || []).forEach(r => {
        if (!r?.assetId) return;
        const existing = idx.get(r.assetId);
        if (!existing || (Number(r.fy) || 0) > (Number(existing.fy) || 0)) {
            idx.set(r.assetId, r);
        }
    });
    return idx;
}

function deriveFromFar(asset, farIndex) {
    const parent = asset.parentAssetId ? farIndex.get(asset.parentAssetId) : null;
    if (!parent) return null;
    const qty = Math.max(1, Number(parent.quantity) || 1);
    return {
        gross: (Number(parent.I) || 0) / qty,
        ytd:   (Number(parent.K) || 0) / qty,
        accum: (Number(parent.N) || 0) / qty,
        nbv:   (Number(parent.P) || 0) / qty,
        rate:  Number(parent.depRate) || 0,
        source: 'FAR',
        fy: parent.fy,
        parentId: parent.assetId,
        quantity: qty,
        donor: parent.donor || '',
        program: parent.program || '',
        assetClass: parent.assetClass || ''
    };
}

// Build a normalized row for filtering/listing — combines asset + FAR-derived fields.
function buildRow(asset, farIndex) {
    const fromFar = deriveFromFar(asset, farIndex);
    const d = fromFar || window.app.computeAssetDepreciation(asset);
    const parent = asset.parentAssetId ? farIndex.get(asset.parentAssetId) : null;
    const rawAcq = (parent?.acqDate || parent?.refinedAcqDate || asset.purchaseDate || asset.installationDate || '').slice(0, 10);
    return {
        asset,
        fromFar,
        rate: fromFar ? fromFar.rate : d.rate,
        gross: fromFar ? fromFar.gross : d.gross,
        ytd:   fromFar ? fromFar.ytd   : d.ytd,
        accum: fromFar ? fromFar.accum : d.totalAccum,
        nbv:   fromFar ? fromFar.nbv   : d.nbv,
        fy: fromFar ? fromFar.fy : null,
        donor: fromFar ? fromFar.donor : (asset.fundingSource || ''),
        program: (asset.program || (fromFar ? fromFar.program : '') || ''),
        category: asset.category || (fromFar ? fromFar.assetClass : '') || '',
        location: asset.location || '',
        status: asset.status || '',
        acqDate: rawAcq,
        acqFy: fyStartOf(rawAcq)
    };
}

function uniqSorted(rows, pick) {
    return [...new Set(rows.map(pick).filter(Boolean))].sort();
}

// Cross-navigation cache for the heavy farIndex + allRows build.
// Keyed off db._dataVersion (bumped by every syncToCloud call), so:
//   - First visit: builds.
//   - Repeat visit with no mutations: reuses (near-instant render).
//   - Repeat visit after any mutation: rebuilds automatically.
let _depCache = null;
function _getDepCache() {
    const v = db._dataVersion || 0;
    if (_depCache && _depCache.version === v) return _depCache;
    const farIndex = buildFarIndex();
    const allRows = db.assets.map(a => buildRow(a, farIndex));
    _depCache = { version: v, farIndex, allRows };
    return _depCache;
}

function passesFilter(row) {
    if (DEP_STATE.fy && DEP_STATE.fy !== 'all' && String(row.fy ?? '') !== String(DEP_STATE.fy)) return false;
    if (DEP_STATE.acqFy && DEP_STATE.acqFy !== 'all' && String(row.acqFy ?? '') !== String(DEP_STATE.acqFy)) return false;
    if (DEP_STATE.category !== 'all' && row.category !== DEP_STATE.category) return false;
    if (DEP_STATE.location !== 'all' && row.location !== DEP_STATE.location) return false;
    if (DEP_STATE.status !== 'all' && row.status !== DEP_STATE.status) return false;
    if (DEP_STATE.donor !== 'all' && row.donor !== DEP_STATE.donor) return false;
    if (DEP_STATE.program !== 'all' && row.program !== DEP_STATE.program) return false;

    if (DEP_STATE.dateFrom || DEP_STATE.dateTo) {
        const acq = (row.acqDate || '').slice(0, 10);
        if (!acq) return false;
        if (DEP_STATE.dateFrom && acq < DEP_STATE.dateFrom) return false;
        if (DEP_STATE.dateTo && acq > DEP_STATE.dateTo) return false;
    }

    if (DEP_STATE.minValue !== '' && DEP_STATE.minValue != null) {
        const min = Number(DEP_STATE.minValue);
        if (!Number.isNaN(min) && Number(row.gross || 0) < min) return false;
    }
    if (DEP_STATE.maxValue !== '' && DEP_STATE.maxValue != null) {
        const max = Number(DEP_STATE.maxValue);
        if (!Number.isNaN(max) && Number(row.gross || 0) > max) return false;
    }

    const q = DEP_STATE.search.toLowerCase().trim();
    if (q) {
        const hay = `${row.asset.id} ${row.asset.name} ${row.category} ${row.location} ${row.donor} ${row.program}`.toLowerCase();
        if (!hay.includes(q)) return false;
    }
    return true;
}

function activeFilterCount() {
    let n = 0;
    ['fy', 'acqFy', 'category', 'location', 'status', 'donor', 'program'].forEach(k => {
        if (DEP_STATE[k] !== 'all') n++;
    });
    if (DEP_STATE.search.trim()) n++;
    if (DEP_STATE.dateFrom || DEP_STATE.dateTo) n++;
    if (DEP_STATE.minValue !== '' && DEP_STATE.minValue != null) n++;
    if (DEP_STATE.maxValue !== '' && DEP_STATE.maxValue != null) n++;
    return n;
}

function renderToolbar(allRows, filteredRows) {
    const fys      = uniqSorted(allRows, r => r.fy != null ? String(r.fy) : '').reverse();
    const acqFys   = uniqSorted(allRows, r => r.acqFy != null && r.acqFy !== '' ? String(r.acqFy) : '').reverse();
    const cats     = uniqSorted(allRows, r => r.category);
    const locs     = uniqSorted(allRows, r => r.location);
    const statuses = uniqSorted(allRows, r => r.status);
    const donors   = uniqSorted(allRows, r => r.donor);
    const programs = uniqSorted(allRows, r => r.program);

    const opt = (val, label, selected) =>
        `<option value="${esc(val)}" ${String(val) === String(selected) ? 'selected' : ''}>${esc(label)}</option>`;

    const filterCount = activeFilterCount();
    const hasDateRange = !!(DEP_STATE.dateFrom || DEP_STATE.dateTo);
    const hasValueRange = (DEP_STATE.minValue !== '' && DEP_STATE.minValue != null) || (DEP_STATE.maxValue !== '' && DEP_STATE.maxValue != null);
    const fld = 'w-full px-2.5 py-1.5 text-[11px] font-semibold border border-slate-200 rounded-lg bg-slate-50 hover:bg-white focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-colors';
    const sect = (icon, t) => `<p class="text-[8px] font-black uppercase tracking-[.18em] text-slate-400 mb-1.5 flex items-center gap-1"><span class="material-symbols-outlined text-[12px] text-slate-300">${icon}</span>${t}</p>`;
    const qChip = (active, label, onClick) =>
        `<button onclick="${onClick}" class="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md border transition-all ${active ? 'bg-accent text-white border-accent shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}">${esc(label)}</button>`;

    // Active filter pills
    const pills = [];
    const pill = (label, args) =>
        `<button onclick="app.depSetFilter(${args})" class="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-wider border border-accent/20 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all">
            ${esc(label)}<span class="material-symbols-outlined text-[11px] opacity-60 group-hover:opacity-100">close</span>
        </button>`;
    if ((DEP_STATE.search || '').trim()) pills.push(pill(`"${DEP_STATE.search.trim().slice(0, 14)}"`, `'search', ''`));
    if (DEP_STATE.fy && DEP_STATE.fy !== 'all') pills.push(pill(`Sched FY ${fyLabel(DEP_STATE.fy)}`, `'fy', 'all'`));
    if (DEP_STATE.acqFy && DEP_STATE.acqFy !== 'all') pills.push(pill(`Acq FY ${fyLabel(DEP_STATE.acqFy)}`, `'acqFy', 'all'`));
    if (DEP_STATE.category !== 'all') pills.push(pill(DEP_STATE.category.slice(0, 14), `'category', 'all'`));
    if (DEP_STATE.location !== 'all') pills.push(pill(DEP_STATE.location.slice(0, 14), `'location', 'all'`));
    if (DEP_STATE.status !== 'all') pills.push(pill(DEP_STATE.status.slice(0, 14), `'status', 'all'`));
    if (DEP_STATE.donor !== 'all') pills.push(pill(DEP_STATE.donor.slice(0, 14), `'donor', 'all'`));
    if (DEP_STATE.program !== 'all') pills.push(pill(DEP_STATE.program.slice(0, 14), `'program', 'all'`));
    if (hasDateRange) pills.push(`<button onclick="app.depSetFilter('dateFrom',''); app.depSetFilter('dateTo','')" class="group inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-wider border border-accent/20 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all">${esc((DEP_STATE.dateFrom || '…') + ' → ' + (DEP_STATE.dateTo || '…'))}<span class="material-symbols-outlined text-[11px] opacity-60 group-hover:opacity-100">close</span></button>`);
    if (DEP_STATE.minValue !== '' && DEP_STATE.minValue != null) pills.push(pill(`≥ ₹${DEP_STATE.minValue}`, `'minValue', ''`));
    if (DEP_STATE.maxValue !== '' && DEP_STATE.maxValue != null) pills.push(pill(`≤ ₹${DEP_STATE.maxValue}`, `'maxValue', ''`));
    const pillsHtml = pills.length ? `<div class="flex flex-wrap gap-1 mb-3">${pills.join('')}</div>` : '';

    const latestAcq = acqFys[0];
    const prevAcq   = acqFys[1];

    return `
        <div class="bg-white border border-slate-200 rounded-xl shadow-sm md:h-full flex flex-col overflow-hidden">
            <div class="px-3 pt-3 pb-2 border-b border-slate-100 flex-shrink-0">
                <div class="flex items-center justify-between gap-2 mb-1">
                    <div class="flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-[16px] text-slate-500">filter_alt</span>
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-700">Filters</span>
                        ${filterCount ? `<span class="text-[9px] font-black px-1.5 py-0.5 rounded bg-accent text-white">${filterCount}</span>` : ''}
                    </div>
                    ${filterCount ? `<button onclick="app.depResetFilters()" class="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors">Clear all</button>` : ''}
                </div>
                <p class="text-[10px] font-bold text-slate-400"><span class="text-slate-700 font-black">${filteredRows.length.toLocaleString('en-IN')}</span> of ${allRows.length.toLocaleString('en-IN')} rows</p>
            </div>

            <div class="px-3 py-3 flex-1 min-h-0 overflow-y-auto">
                ${pillsHtml}

                <div class="relative mb-3">
                    <span class="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-slate-400 pointer-events-none">search</span>
                    <input type="text" placeholder="Search ID, name, location…" value="${esc(DEP_STATE.search)}"
                        oninput="app.depSetFilter('search', this.value)"
                        class="${fld} pl-7" />
                </div>

                <div class="mb-4">
                    ${sect('category', 'Categorize')}
                    <div class="flex flex-col gap-1.5">
                        ${cats.length > 0 ? `
                        <select onchange="app.depSetFilter('category', this.value)" class="${fld}" title="Category">
                            <option value="all">All Categories</option>
                            ${cats.map(v => opt(v, v, DEP_STATE.category)).join('')}
                        </select>` : ''}
                        ${locs.length > 0 ? `
                        <select onchange="app.depSetFilter('location', this.value)" class="${fld}" title="Location">
                            <option value="all">All Locations</option>
                            ${locs.map(v => opt(v, v, DEP_STATE.location)).join('')}
                        </select>` : ''}
                        ${statuses.length > 0 ? `
                        <select onchange="app.depSetFilter('status', this.value)" class="${fld}" title="Status">
                            <option value="all">All Statuses</option>
                            ${statuses.map(v => opt(v, v, DEP_STATE.status)).join('')}
                        </select>` : ''}
                        ${donors.length > 0 ? `
                        <select onchange="app.depSetFilter('donor', this.value)" class="${fld}" title="Donor">
                            <option value="all">All Donors</option>
                            ${donors.map(v => opt(v, v, DEP_STATE.donor)).join('')}
                        </select>` : ''}
                        ${programs.length > 0 ? `
                        <select onchange="app.depSetFilter('program', this.value)" class="${fld}" title="Program">
                            <option value="all">All Programs</option>
                            ${programs.map(v => opt(v, v, DEP_STATE.program)).join('')}
                        </select>` : ''}
                    </div>
                </div>

                <div class="mb-4">
                    ${sect('event', 'When · Acquisition')}
                    ${(latestAcq || prevAcq) ? `
                        <div class="flex flex-wrap gap-1 mb-1.5">
                            ${qChip(DEP_STATE.acqFy === 'all', 'Any', `app.depSetFilter('acqFy', 'all')`)}
                            ${latestAcq ? qChip(String(DEP_STATE.acqFy) === String(latestAcq), fyLabel(latestAcq), `app.depSetFilter('acqFy', '${latestAcq}')`) : ''}
                            ${prevAcq ? qChip(String(DEP_STATE.acqFy) === String(prevAcq), fyLabel(prevAcq), `app.depSetFilter('acqFy', '${prevAcq}')`) : ''}
                        </div>` : ''}
                    <div class="flex flex-col gap-1.5">
                        ${acqFys.length > 0 ? `
                        <select onchange="app.depSetFilter('acqFy', this.value)" class="${fld}" title="Financial Year of Acquisition (Apr-Mar)">
                            <option value="all">All Acquisition FYs</option>
                            ${acqFys.map(v => opt(v, fyLabel(v), DEP_STATE.acqFy)).join('')}
                        </select>` : ''}
                        ${fys.length > 0 ? `
                        <select onchange="app.depSetFilter('fy', this.value)" class="${fld}" title="Schedule FY (the FAR year used for the computed values)">
                            <option value="all">All Schedule FYs</option>
                            ${fys.map(v => opt(v, fyLabel(v), DEP_STATE.fy)).join('')}
                        </select>` : ''}
                        <div class="grid grid-cols-2 gap-1.5">
                            <input type="date" value="${esc(DEP_STATE.dateFrom)}" onchange="app.depSetFilter('dateFrom', this.value)" title="From" class="${fld}" />
                            <input type="date" value="${esc(DEP_STATE.dateTo)}" onchange="app.depSetFilter('dateTo', this.value)" title="To" class="${fld}" />
                        </div>
                        ${hasDateRange ? `<button onclick="app.depSetFilter('dateFrom',''); app.depSetFilter('dateTo','')" class="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-600 px-2 py-1 rounded border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-all">Clear dates</button>` : ''}
                    </div>
                </div>

                <div>
                    ${sect('payments', 'Gross Value (₹)')}
                    <div class="grid grid-cols-2 gap-1.5">
                        <input type="number" inputmode="decimal" placeholder="Min" value="${esc(DEP_STATE.minValue)}" onchange="app.depSetFilter('minValue', this.value)" class="${fld}" />
                        <input type="number" inputmode="decimal" placeholder="Max" value="${esc(DEP_STATE.maxValue)}" onchange="app.depSetFilter('maxValue', this.value)" class="${fld}" />
                    </div>
                    ${hasValueRange ? `<button onclick="app.depSetFilter('minValue',''); app.depSetFilter('maxValue','')" class="mt-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-600 px-2 py-1 rounded border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-all w-full">Clear value range</button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderTable(filteredRows) {
    if (!filteredRows.length) {
        return `
            <tr><td colspan="7" class="text-center py-10">
                <div class="flex flex-col items-center gap-2 text-slate-400">
                    <span class="material-symbols-outlined text-3xl">filter_alt_off</span>
                    <p class="text-[11px] font-bold">No rows match the current filters</p>
                    <button onclick="app.depResetFilters()" class="text-[10px] font-black text-accent hover:underline uppercase tracking-widest">Reset filters</button>
                </div>
            </td></tr>
        `;
    }
    return filteredRows.map(row => {
        const asset = row.asset;
        const ratePct = row.rate ? (row.rate * 100).toFixed(row.rate * 100 % 1 === 0 ? 0 : 1) + '%' : 'SLM';
        const safeId = asset.id.replace(/'/g, "\\'");
        const sourceBadge = row.fromFar
            ? `<span title="Derived from FAR row ${row.fromFar.parentId}" class="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase tracking-tighter">FAR ${fyLabel(row.fromFar.fy)}</span>`
            : `<span title="No linked FAR parent — falling back to row-level fields" class="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-tighter">UNLINKED</span>`;
        return `
            <tr onclick="app.showAssetModal('${safeId}')">
                <td>
                    <div class="flex items-center gap-2">
                        <div class="compact-icon bg-amber-50 text-amber-600 border border-amber-100">
                            <span class="material-symbols-outlined text-sm">trending_down</span>
                        </div>
                        <div class="max-w-[220px]">
                            <p class="text-[11px] font-black text-slate-900 multiline-name">${esc(asset.name || '—')}</p>
                            <p class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest break-all">${esc(asset.id)}</p>
                            <p class="text-[9px] text-slate-500 font-bold mt-0.5">${esc(row.location || '—')}${row.fromFar && row.fromFar.quantity > 1 ? ` · 1 of ${row.fromFar.quantity}` : ''}</p>
                        </div>
                    </div>
                </td>
                <td class="text-center"><span class="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">${ratePct}</span></td>
                <td class="text-center">${sourceBadge}</td>
                <td class="text-right font-bold text-slate-500 text-tabular">₹${fmt(row.gross)}</td>
                <td class="text-right font-black text-amber-600 text-tabular">₹${fmt(row.ytd)}</td>
                <td class="text-right font-black text-rose-500 text-tabular">₹${fmt(row.accum)}</td>
                <td class="text-right font-black text-slate-900 text-tabular">₹${fmt(row.nbv)}</td>
            </tr>
        `;
    }).join('');
}

export function renderDepreciationPage() {
    const { allRows } = _getDepCache();
    const filteredRows = allRows.filter(passesFilter);

    // Stats — based on the *unfiltered* universe so the header health doesn't shift around.
    let withParent = 0, missingParent = 0;
    allRows.forEach(r => r.fromFar ? withParent++ : missingParent++);
    const latestFY = [...new Set((db.assetFar || []).map(r => r.fy))].sort((a, b) => b - a)[0];
    const canExport = window.app.canExportAssets();

    const statChip = (bg, border, iconColor, labelColor, valueColor, icon, label, value) => `
        <div class="${bg} ${border} border rounded-lg px-2.5 py-1.5 flex items-center gap-2 flex-1 min-w-[110px]">
            <span class="material-symbols-outlined ${iconColor} text-[18px]">${icon}</span>
            <div class="leading-tight">
                <p class="text-[8px] font-black uppercase tracking-widest ${labelColor}">${label}</p>
                <p class="text-sm font-black ${valueColor} leading-none">${value}</p>
            </div>
        </div>
    `;

    return `
        <div class="h-full flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 font-sans">
            <!-- Single-row header: title · stats · actions -->
            <header class="flex items-center gap-3 flex-wrap flex-shrink-0">
                <div class="flex-shrink-0">
                    <h2 class="text-xl text-slate-900 font-black tracking-tight leading-tight">Depreciation Schedules</h2>
                    <p class="text-slate-500 text-[10px] font-bold tracking-[.15em] uppercase mt-0.5">Per-unit values derived from FAR · FY ${fyLabel(latestFY)}</p>
                </div>

                <div class="flex items-center gap-2 flex-1 flex-wrap min-w-0">
                    ${statChip('bg-emerald-50', 'border-emerald-200', 'text-emerald-400', 'text-emerald-700', 'text-emerald-900', 'verified', 'Linked to FAR', withParent.toLocaleString('en-IN'))}
                    ${statChip(missingParent ? 'bg-amber-50' : 'bg-slate-50', missingParent ? 'border-amber-200' : 'border-slate-200', missingParent ? 'text-amber-400' : 'text-slate-300', missingParent ? 'text-amber-700' : 'text-slate-500', missingParent ? 'text-amber-900' : 'text-slate-900', 'link_off', 'No FAR parent', missingParent.toLocaleString('en-IN'))}
                    ${statChip('bg-slate-50', 'border-slate-200', 'text-slate-300', 'text-slate-500', 'text-slate-900', 'view_list', 'FAR Rows', (db.assetFar || []).length.toLocaleString('en-IN'))}
                    ${statChip('bg-violet-50', 'border-violet-200', 'text-violet-400', 'text-violet-700', 'text-violet-900', 'event_note', 'Audit FY', fyLabel(latestFY))}
                </div>

                <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button onclick="app.toggleDepFilters()" class="md:hidden px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-50 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">filter_alt</span>
                        Filters${activeFilterCount() ? ` (${activeFilterCount()})` : ''}
                    </button>
                    ${canExport ? `
                    <button onclick="app.depExportFilteredXlsx(event)" title="Export visible (${filteredRows.length.toLocaleString('en-IN')}) rows to XLSX" class="px-2 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">table_chart</span>
                        XLSX
                    </button>
                    <button onclick="app.depExportFiltered(event)" title="Export visible (${filteredRows.length.toLocaleString('en-IN')}) rows to CSV" class="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-50 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">download</span>
                        CSV
                    </button>` : ''}
                </div>
            </header>

            <!-- Filters (collapsible on mobile, sidebar on md+) + Table -->
            <div class="flex flex-col md:flex-row gap-3 flex-1 min-h-0">
                <aside id="dep-toolbar" class="hidden md:block md:w-60 md:flex-shrink-0">${renderToolbar(allRows, filteredRows)}</aside>

                <div class="bg-white rounded-xl border border-accent/30 overflow-hidden shadow-sm flex flex-col flex-1 min-h-0 min-w-0">
                    <div class="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/40 flex-shrink-0">
                        <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-900">Valuation Schedules</h3>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-200">Method: WDV · Sourced from FAR</span>
                    </div>

                    <div class="flex-1 min-h-0 overflow-y-auto">
                        <table class="dense-table">
                            <thead class="sticky-header">
                                <tr>
                                    <th>Asset Identity</th>
                                    <th class="text-center">Rate</th>
                                    <th class="text-center">Source</th>
                                    <th class="text-right">Cost Basis</th>
                                    <th class="text-right">YTD Expense</th>
                                    <th class="text-right">Accumulated</th>
                                    <th class="text-right">Net Book Value</th>
                                </tr>
                            </thead>
                            <tbody id="dep-body">${renderTable(filteredRows)}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}


// ─── Public helpers for main.js ──────────────────────────────
export function depSetFilter(key, value) {
    if (!(key in DEP_STATE)) return;
    DEP_STATE[key] = value;
    rerenderDep();
}

export function depResetFilters() {
    Object.assign(DEP_STATE, {
        fy: 'all', category: 'all', location: 'all',
        status: 'all', donor: 'all', program: 'all', search: '',
        acqFy: 'all', dateFrom: '', dateTo: '',
        minValue: '', maxValue: ''
    });
    rerenderDep();
}

export function rerenderDep() {
    // Partial re-render: just the toolbar + table body, preserving scroll.
    // allRows reused from the page-mount cache — only the filter pass runs per keystroke.
    const { allRows } = _getDepCache();
    const filteredRows = allRows.filter(passesFilter);
    const tb = document.getElementById('dep-toolbar');
    const body = document.getElementById('dep-body');
    if (tb) tb.innerHTML = renderToolbar(allRows, filteredRows);
    if (body) body.innerHTML = renderTable(filteredRows);
}

// Filtered XLSX export — same column shape as exportExcel's master sheet, but limited
// to the currently filtered rows from the depreciation table.
export function depExportFilteredXlsx(btn) {
    if (!window.app.canExportAssets()) {
        alert('Only finance, director, operations, or superadmin can export.');
        return;
    }
    if (typeof XLSX === 'undefined') {
        alert('Excel library is still loading. Please try again in a few seconds.');
        return;
    }
    if (btn) btn.classList.add('animate-export-pulse');

    setTimeout(() => {
        const farIndex = buildFarIndex();
        const rows = db.assets.map(a => buildRow(a, farIndex)).filter(passesFilter);

        const data = rows.map(r => ({
            'ID': r.asset.id,
            'Name': r.asset.name,
            'Category': r.category,
            'Location': r.location,
            'Status': r.status,
            'Donor': r.donor,
            'Program': r.program,
            'Source': r.fromFar ? 'FAR' : 'Registry',
            'FY': r.fy ?? '',
            'Parent FAR ID': r.fromFar?.parentId || '',
            'Rate': r.rate,
            'Cost Basis': Number(r.gross.toFixed(2)),
            'YTD Expense': Number(r.ytd.toFixed(2)),
            'Accum. Depreciation': Number(r.accum.toFixed(2)),
            'Net Book Value': Number(r.nbv.toFixed(2))
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Depreciation');
        XLSX.writeFile(wb, `amp_depreciation_${new Date().toISOString().split('T')[0]}.xlsx`);

        if (btn) btn.classList.remove('animate-export-pulse');
    }, 400);
}

// Filtered CSV export — same column shape as the main exportCSV('depreciation')
// path but limited to the currently filtered rows.
export function depExportFiltered(btn) {
    if (!window.app.canExportAssets()) {
        alert('Only finance, director, operations, or superadmin can export.');
        return;
    }
    if (btn) btn.classList.add('animate-export-pulse');

    setTimeout(() => {
        const farIndex = buildFarIndex();
        const rows = db.assets.map(a => buildRow(a, farIndex)).filter(passesFilter);

        const headers = [
            'ID', 'Name', 'Category', 'Location', 'Status', 'Donor', 'Program',
            'Source', 'FY', 'Parent FAR ID', 'Rate',
            'Cost Basis', 'YTD Expense', 'Accum. Depreciation', 'Net Book Value'
        ];
        const idSafe = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
        let csv = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n';
        rows.forEach(r => {
            csv += [
                idSafe(r.asset.id), idSafe(r.asset.name), idSafe(r.category),
                idSafe(r.location), idSafe(r.status), idSafe(r.donor), idSafe(r.program),
                r.fromFar ? 'FAR' : 'Registry',
                r.fy ?? '',
                idSafe(r.fromFar?.parentId || ''),
                r.rate,
                r.gross.toFixed(2), r.ytd.toFixed(2), r.accum.toFixed(2), r.nbv.toFixed(2)
            ].join(',') + '\n';
        });

        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csv));
        link.setAttribute('download', `amp_depreciation_filtered_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (btn) btn.classList.remove('animate-export-pulse');
    }, 400);
}
