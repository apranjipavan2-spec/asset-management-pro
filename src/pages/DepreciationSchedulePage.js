// Fixed Asset Register — per-FY depreciation schedule mirroring
// Asset Finance.with_calc.xlsx. Editing flow: a row is first selected by
// click, then the toolbar Edit button switches that row's inputs live.
// Director sees the same view as read-only.
// Computed cols (I, K, L, N, P, S) come from the server.

import {
    ASSET_FILTER_DEFAULTS,
    renderAssetFilterPanel,
    passesAssetFilter,
    activeAssetFilterCount
} from './components/AssetFilterPanel.js';

const FAR_STATE = window.__farState || (window.__farState = {
    fy: null,
    years: [],
    rows: [],
    // shared-panel keys (mirrors AssetFilterPanel state)
    ...ASSET_FILTER_DEFAULTS(),
    selectedId: null,
    editingId: null
});

const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const fmtRate = (n) => `${(Number(n || 0) * 100).toFixed(0)}%`;
const fyLabel = (y) => `FY ${y}-${String((Number(y) + 1) % 100).padStart(2, '0')}`;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function canEditFAR() {
    const role = window.app.user?.role;
    return role === 'superadmin' || role === 'finance';
}

function inputCell(row, col, value, type = 'number') {
    const isEditingThisRow = canEditFAR() && !row.locked && FAR_STATE.editingId === row.id;
    if (!isEditingThisRow) {
        const display = type === 'number'
            ? fmt(value)
            : (type === 'date' ? esc((value || '').slice(0, 10)) : esc(value || ''));
        return `<span class="far-static">${display}</span>`;
    }
    const v = type === 'number'
        ? (value == null ? '' : Number(Number(value).toFixed(2)))
        : (value || '');
    const step = type === 'number' ? 'step="0.01"' : '';
    const inputType = type === 'date' ? 'date' : (type === 'number' ? 'number' : 'text');
    return `<input type="${inputType}" ${step} value="${esc(v)}" data-id="${esc(row.id)}" data-col="${col}" onchange="app.farSaveCell(event)" class="far-input" />`;
}

function computedCell(value, tone = 'slate') {
    const colorMap = {
        slate:   'text-slate-700',
        amber:   'text-amber-600 font-black',
        rose:    'text-rose-500 font-black',
        emerald: 'text-emerald-600 font-black',
        ink:     'text-slate-900 font-black'
    };
    return `<span class="far-derived ${colorMap[tone] || colorMap.slate} text-tabular">${fmt(value)}</span>`;
}

function totalsRow(rows) {
    const sum = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return {
        F: sum('grossBlockOpening'), G: sum('additions'), H: sum('disposalsGross'),
        I: sum('I'), J: sum('accDepOpening'), K: sum('K'), L: sum('L'),
        M: sum('disposalsAccDep'), N: sum('N'), O: sum('netBlockPrevFY'),
        P: sum('P'), R: sum('proceedsOnDisposal'), S: sum('S')
    };
}

// Map a FAR row into the shared filter row shape used by AssetFilterPanel.
function farToFilterRow(r) {
    const d = String(r?.acqDate || r?.refinedAcqDate || r?.installationDate || '').slice(0, 10);
    const ym = d.match(/(\d{4})/);
    let acqFy = '';
    if (d) {
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) {
            const y = dt.getFullYear();
            acqFy = dt.getMonth() >= 3 ? y : y - 1;
        }
    }
    return {
        id: r?.assetId || '',
        name: r?.description || '',
        category: r?.assetClass || '',
        location: r?.location || '',
        status: r?.status || '',
        assignee: '',
        donor: r?.donor || '',
        program: '',
        year: ym ? ym[1] : '',
        acqDate: d,
        acqFy,
        value: Number(r?.I) || 0
    };
}

function filterRowFromFar(r) { return farToFilterRow(r); }

// Compact single-row header: title · stat chips · FY · actions.
// Edit-mode chip lives in its own slim bar below.
function renderHeader(filteredRowsArr) {
    const editable = canEditFAR();
    const yearsOptions = FAR_STATE.years.length
        ? FAR_STATE.years.map(y => `<option value="${y.fy}" ${y.fy === FAR_STATE.fy ? 'selected' : ''}>${fyLabel(y.fy)}${y.locked ? ' (locked)' : ''} · ${y.rowCount} rows</option>`).join('')
        : '<option value="">No data yet</option>';

    const tot = totalsRow(filteredRowsArr);
    const fyRowsLabel = (filteredRowsArr.length).toLocaleString('en-IN');
    const fmtShort = (n) => {
        const v = Number(n) || 0;
        const abs = Math.abs(v);
        if (abs >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
        if (abs >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
        if (abs >= 1e3) return `${(v / 1e3).toFixed(1)} K`;
        return Math.round(v).toLocaleString('en-IN');
    };
    const grossN = fmtShort(tot.I);
    const accumN = fmtShort(tot.N);
    const nbvN   = fmtShort(tot.P);

    const statChip = (bg, border, iconColor, labelColor, valueColor, icon, label, value) => `
        <div class="${bg} ${border} border rounded-lg px-2.5 py-1.5 flex items-center gap-2 min-w-0 md:flex-1 md:min-w-[110px]">
            <span class="material-symbols-outlined ${iconColor} text-[18px] shrink-0">${icon}</span>
            <div class="leading-tight min-w-0">
                <p class="text-[8px] font-black uppercase tracking-widest ${labelColor} truncate">${label}</p>
                <p class="text-sm font-black ${valueColor} leading-none truncate">${value}</p>
            </div>
        </div>`;

    return `
    <header class="flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap md:gap-3 flex-shrink-0">
        <div class="flex-shrink-0">
            <h2 class="text-lg md:text-xl text-slate-900 font-black tracking-tight leading-tight">Fixed Asset Register</h2>
            <p class="text-slate-500 text-[10px] font-bold tracking-[.15em] uppercase mt-0.5">Per-FY Schedule · ${editable ? 'Edit Mode' : 'View Only'}</p>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:flex md:items-center md:flex-1 md:flex-wrap md:min-w-0">
            ${statChip('bg-slate-50',   'border-slate-200',   'text-slate-300',   'text-slate-500',   'text-slate-900',   'view_list', 'FY Rows', fyRowsLabel)}
            ${statChip('bg-emerald-50', 'border-emerald-200', 'text-emerald-400', 'text-emerald-700', 'text-emerald-900', 'savings',   'Gross Block', `₹${grossN}`)}
            ${statChip('bg-rose-50',    'border-rose-200',    'text-rose-400',    'text-rose-700',    'text-rose-900',    'trending_down', 'Accum Dep', `₹${accumN}`)}
            ${statChip('bg-violet-50',  'border-violet-200',  'text-violet-400',  'text-violet-700',  'text-violet-900',  'account_balance', 'Net Block', `₹${nbvN}`)}
        </div>

        <div class="flex items-center gap-1.5 flex-wrap md:flex-shrink-0 justify-start md:justify-end w-full md:w-auto">
            <select onchange="app.farSelectFY(this.value)" class="far-select" style="height:30px; padding:4px 28px 4px 10px; font-size:10px;">
                ${yearsOptions}
            </select>
            <button onclick="app.toggleFarFilters()" class="md:hidden px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-50 transition-all flex items-center gap-1 shadow-sm">
                <span class="material-symbols-outlined text-[13px]">filter_alt</span>
                Filters${activeAssetFilterCount(FAR_STATE) ? ` (${activeAssetFilterCount(FAR_STATE)})` : ''}
            </button>
            ${editable ? `
            <button onclick="app.farIssueNumber()" title="Issue a new asset number (auto-generated ID + creates Registry rows)" class="px-2 py-1 bg-violet-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-violet-700 transition-all flex items-center gap-1 shadow-sm">
                <span class="material-symbols-outlined text-[13px]">qr_code_2</span> New&nbsp;ID
            </button>
            <button onclick="app.farAddNew()" title="Add a blank row" class="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-50 transition-all flex items-center gap-1 shadow-sm">
                <span class="material-symbols-outlined text-[13px]">add</span> Row
            </button>
            <button onclick="app.farRollover()" title="Carry closing balances forward to next FY" class="px-2 py-1 bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-amber-700 transition-all flex items-center gap-1 shadow-sm">
                <span class="material-symbols-outlined text-[13px]">event_repeat</span> Roll&nbsp;FY
            </button>` : ''}
            <button onclick="app.farExport()" title="Export current FY to XLSX" class="px-2 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm">
                <span class="material-symbols-outlined text-[13px]">table_chart</span> XLSX
            </button>
        </div>
    </header>`;
}

// Slim edit-mode bar (only shown to editors).
function renderEditBar() {
    if (!canEditFAR()) return '';
    const selectedRow = FAR_STATE.selectedId ? FAR_STATE.rows.find(r => r.id === FAR_STATE.selectedId) : null;
    const editingRow  = FAR_STATE.editingId  ? FAR_STATE.rows.find(r => r.id === FAR_STATE.editingId)  : null;
    const canStartEdit = selectedRow && !selectedRow.locked && !FAR_STATE.editingId;

    return `
    <div class="flex items-center gap-2 px-3 py-1.5 rounded-md ${editingRow ? 'bg-amber-50 border border-amber-200' : selectedRow ? 'bg-sky-50 border border-sky-200' : 'bg-white border border-slate-200'} flex-shrink-0">
        <span class="material-symbols-outlined text-sm ${editingRow ? 'text-amber-600' : selectedRow ? 'text-sky-600' : 'text-slate-400'}">${editingRow ? 'edit_note' : selectedRow ? 'check_circle' : 'mouse'}</span>
        <span class="text-[9px] font-black uppercase tracking-widest ${editingRow ? 'text-amber-700' : selectedRow ? 'text-sky-700' : 'text-slate-500'}">
            ${editingRow
                ? `Editing: <span class="font-bold normal-case tracking-normal text-amber-900">${esc(editingRow.assetId)}</span>`
                : selectedRow
                    ? `Selected: <span class="font-bold normal-case tracking-normal text-sky-900">${esc(selectedRow.assetId)}</span>`
                    : 'Click any row to select, then press Edit'}
        </span>
        <div class="flex-1"></div>
        ${editingRow ? `
            <button onclick="app.farFinishEdit()" class="px-2 py-1 bg-amber-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-amber-700 transition-all flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">check</span> Done
            </button>
            <button onclick="app.farCancelEdit()" class="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-50 transition-all flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">close</span> Cancel
            </button>
        ` : `
            <button onclick="app.farStartEdit()" ${canStartEdit ? '' : 'disabled'} class="px-2 py-1 ${canStartEdit ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'} text-[9px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">edit</span> Edit selected
            </button>
            ${selectedRow ? `<button onclick="app.farClearSelection()" class="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-50 transition-all flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">deselect</span> Clear
            </button>` : ''}
        `}
    </div>`;
}

// Sidebar: shared AssetFilterPanel (date range + FY + value range all live in it now).
function renderSidebar(allFilterRows, filteredFilterRows) {
    return renderAssetFilterPanel({
        state: FAR_STATE,
        allRows: allFilterRows,
        onChange: 'app.farSetFilter',
        resetFn: 'app.farResetFilters',
        totalLabel: allFilterRows.length,
        filteredLabel: filteredFilterRows.length
    });
}

function filteredRows() {
    return FAR_STATE.rows.filter(r => passesAssetFilter(farToFilterRow(r), FAR_STATE));
}

function renderTable() {
    const rows = filteredRows();
    const totals = totalsRow(rows);
    const editable = canEditFAR();
    const TOTAL_COLS = 31;

    // Rate badge (Depreciation-style) — shown when not inline-editing this row.
    const rateBadge = (r) => {
        if (canEditFAR() && !r.locked && FAR_STATE.editingId === r.id) {
            return inputCell(r, 'depRate', r.depRate, 'number');
        }
        const pct = r.depRate
            ? (r.depRate * 100).toFixed((r.depRate * 100) % 1 === 0 ? 0 : 1) + '%'
            : '—';
        return `<span class="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">${pct}</span>`;
    };

    const bodyRows = rows.map((r, idx) => {
        const lockBadge = r.locked ? '<span class="ml-1 text-amber-500" title="FY closed — read-only">🔒</span>' : '';
        const isSelected = FAR_STATE.selectedId === r.id;
        const isEditing  = FAR_STATE.editingId === r.id;
        const baseBg   = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40';
        const rowBg    = isEditing ? 'far-row-editing' : isSelected ? 'far-row-selected' : baseBg;
        const stickyBg = isEditing ? 'far-row-editing' : isSelected ? 'far-row-selected' : baseBg;
        const compBg   = isEditing ? 'far-derived-editing' : isSelected ? 'far-derived-selected' : 'bg-slate-50/60';
        const clickAttr = editable && !isEditing ? `onclick="app.farRowClick(event, '${esc(r.id)}')"` : '';
        const qty = Number(r.quantity) || 0;
        const qtyHint = qty > 1 ? ` · 1 of ${qty}` : '';

        return `
        <tr data-row-id="${esc(r.id)}" class="${rowBg}" ${clickAttr}>
            <td class="sticky left-0 z-10 ${stickyBg} far-cell-wrap-id">
                <div class="flex items-center gap-2">
                    <div class="compact-icon bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
                        <span class="material-symbols-outlined text-sm">trending_down</span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest break-all leading-tight">${esc(r.assetId)}${lockBadge}</p>
                        <p class="text-[9px] text-slate-500 font-bold mt-0.5">${esc(r.location || '—')}${qtyHint}</p>
                    </div>
                </div>
            </td>
            <td class="far-cell-wrap">${inputCell(r, 'assetClass', r.assetClass, 'text')}</td>
            <td class="far-cell-wrap">${inputCell(r, 'description', r.description, 'text')}</td>
            <td class="far-cell-wrap-sm">${inputCell(r, 'location', r.location, 'text')}</td>
            <td class="far-cell-wrap-sm">${inputCell(r, 'purchaseOrKind', r.purchaseOrKind, 'text')}</td>
            <td>${inputCell(r, 'acqDate', r.acqDate?.slice(0, 10), 'date')}</td>
            <td class="far-cell-wrap-sm">${inputCell(r, 'supplierName', r.supplierName, 'text')}</td>
            <td class="far-cell-wrap-sm">${inputCell(r, 'billNo', r.billNo, 'text')}</td>
            <td>${inputCell(r, 'installationDate', r.installationDate?.slice(0, 10), 'date')}</td>
            <td>${inputCell(r, 'datePutToUse', r.datePutToUse?.slice(0, 10), 'date')}</td>
            <td>${inputCell(r, 'quantity', r.quantity, 'number')}</td>
            <td class="far-cell-wrap-sm">${inputCell(r, 'voucherNo', r.voucherNo, 'text')}</td>
            <td class="text-center">${rateBadge(r)}</td>
            <td class="far-cell-wrap-sm">${inputCell(r, 'usefulLifeYears', r.usefulLifeYears, 'text')}</td>
            <td>${inputCell(r, 'grossBlockOpening', r.grossBlockOpening, 'number')}</td>
            <td>${inputCell(r, 'additions', r.additions, 'number')}</td>
            <td>${inputCell(r, 'disposalsGross', r.disposalsGross, 'number')}</td>
            <td class="${compBg}">${computedCell(r.I, 'ink')}</td>
            <td>${inputCell(r, 'accDepOpening', r.accDepOpening, 'number')}</td>
            <td class="${compBg}">${computedCell(r.K, 'amber')}</td>
            <td class="${compBg}">${computedCell(r.L, 'rose')}</td>
            <td>${inputCell(r, 'disposalsAccDep', r.disposalsAccDep, 'number')}</td>
            <td class="${compBg}">${computedCell(r.N, 'rose')}</td>
            <td>${inputCell(r, 'netBlockPrevFY', r.netBlockPrevFY, 'number')}</td>
            <td class="${compBg}">${computedCell(r.P, 'emerald')}</td>
            <td>${inputCell(r, 'disposalDate', r.disposalDate?.slice(0, 10), 'date')}</td>
            <td>${inputCell(r, 'proceedsOnDisposal', r.proceedsOnDisposal, 'number')}</td>
            <td class="${compBg}">${computedCell(r.S, 'slate')}</td>
            <td class="far-cell-wrap-sm">${inputCell(r, 'donor', r.donor, 'text')}</td>
            <td>${inputCell(r, 'status', r.status, 'text')}</td>
            ${editable ? `<td class="text-center">${r.locked ? '' : `<button onclick="event.stopPropagation(); app.farDelete('${esc(r.id)}')" class="text-rose-400 hover:text-rose-600" title="Archive row"><span class="material-symbols-outlined text-[16px]">delete</span></button>`}</td>` : '<td></td>'}
        </tr>`;
    }).join('');

    // Totals row — aligned to all 31 columns.
    const cell  = (v) => `<td class="text-tabular text-right">${fmt(v)}</td>`;
    const blank = '<td></td>';
    const footerRow = `
    <tr class="bg-slate-900 text-white font-black sticky bottom-0">
        <td class="sticky left-0 z-10 bg-slate-900 text-[10px] uppercase tracking-widest">Totals · ${rows.length.toLocaleString('en-IN')} rows</td>
        ${blank.repeat(13)}
        ${cell(totals.F)}${cell(totals.G)}${cell(totals.H)}${cell(totals.I)}
        ${cell(totals.J)}${cell(totals.K)}${cell(totals.L)}${cell(totals.M)}${cell(totals.N)}
        ${cell(totals.O)}${cell(totals.P)}
        ${blank}
        ${cell(totals.R)}${cell(totals.S)}
        ${blank.repeat(3)}
    </tr>`;

    return `
    <div class="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/40 flex-shrink-0">
        <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-900">Fixed Asset Register · ${esc(fyLabel(FAR_STATE.fy))}</h3>
        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-200">WDV · ${rows.length.toLocaleString('en-IN')} rows · ${editable ? 'Editable' : 'Read-only'}</span>
    </div>
    <div class="far-table-wrap flex-1 min-h-0">
        <table class="far-table">
            <thead class="far-thead">
                <tr class="far-thead-banner">
                    <th class="sticky left-0 z-20" rowspan="2">Asset Identity</th>
                    <th rowspan="2">Class</th>
                    <th rowspan="2">Description</th>
                    <th rowspan="2">Location</th>
                    <th rowspan="2">Purchase / Kind</th>
                    <th rowspan="2">Acq Date</th>
                    <th rowspan="2">Supplier</th>
                    <th rowspan="2">Bill No.</th>
                    <th rowspan="2">Install Date</th>
                    <th rowspan="2">Put-to-Use</th>
                    <th rowspan="2">Qty</th>
                    <th rowspan="2">Voucher</th>
                    <th rowspan="2">Rate</th>
                    <th rowspan="2">Useful Life</th>
                    <th colspan="4" class="text-center">Assets at Cost (Gross)</th>
                    <th colspan="5" class="text-center">Accumulated Depreciation</th>
                    <th rowspan="2">Net Block prev FY</th>
                    <th rowspan="2">Net Block ${esc(fyLabel(FAR_STATE.fy))}</th>
                    <th colspan="3" class="text-center">Disposal</th>
                    <th rowspan="2">Donor</th>
                    <th rowspan="2">Status</th>
                    <th rowspan="2"></th>
                </tr>
                <tr class="far-thead-cols">
                    <th>F · Opening</th>
                    <th>G · Additions</th>
                    <th>H · Disposals</th>
                    <th class="bg-slate-100">I · Cost Basis</th>
                    <th>J · Opening</th>
                    <th class="bg-slate-100">K · YTD</th>
                    <th class="bg-slate-100">L · Total</th>
                    <th>M · Disposals</th>
                    <th class="bg-slate-100">N · Accumulated</th>
                    <th>Q · Date</th>
                    <th>R · Proceeds</th>
                    <th class="bg-slate-100">S · P/L</th>
                </tr>
            </thead>
            <tbody>${bodyRows || `<tr><td colspan="${TOTAL_COLS}" class="text-center py-12 text-slate-400 text-sm">No rows for ${esc(fyLabel(FAR_STATE.fy))} matching the current filters.</td></tr>`}</tbody>
            <tfoot>${rows.length ? footerRow : ''}</tfoot>
        </table>
    </div>`;
}

export function renderDepreciationSchedulePage(user) {
    // Kick off async load. The render is synchronous; rows populate on resolve.
    queueMicrotask(() => window.app.farInit && window.app.farInit());
    const allFilterRows      = FAR_STATE.rows.map(farToFilterRow);
    const filteredRowsArr    = filteredRows();
    const filteredFilterRows = filteredRowsArr.map(farToFilterRow);
    return `
    <style>
        .far-table-wrap { position: relative; overflow: auto; flex: 1; min-height: 0; border-top: 1px solid #f1f5f9; }
        .far-table { width: max-content; min-width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; }
        .far-thead { position: sticky; top: 0; z-index: 5; background: #0f172a; color: #fff; }
        .far-thead-banner th { padding: 8px 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; font-size: 9px; background: #0f172a; border-right: 1px solid #1e293b; border-bottom: 1px solid #1e293b; }
        .far-thead-cols th { padding: 6px 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 9px; background: #1e293b; border-right: 1px solid #334155; }
        .far-table tbody td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; border-right: 1px solid #f8fafc; vertical-align: middle; white-space: nowrap; }
        .far-cell-wrap { white-space: normal !important; word-break: break-word; max-width: 220px; min-width: 140px; }
        .far-cell-wrap-id { white-space: normal !important; word-break: break-word; max-width: 240px; min-width: 200px; }
        .far-cell-wrap-sm { white-space: normal !important; word-break: break-word; max-width: 150px; min-width: 110px; }
        .far-input { width: 100%; min-width: 80px; padding: 2px 4px; border: 1px solid transparent; background: transparent; font-size: 11px; font-family: inherit; text-align: right; border-radius: 3px; }
        .far-input[type="text"], .far-input[type="date"] { text-align: left; }
        .far-input:hover { background: #f8fafc; border-color: #e2e8f0; }
        .far-input:focus { outline: none; background: #fef3c7; border-color: #f59e0b; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.15); }
        .far-static { font-size: 11px; color: #475569; font-variant-numeric: tabular-nums; }
        .far-derived { font-size: 11px; padding: 2px 4px; font-variant-numeric: tabular-nums; }
        .far-search { font-size: 11px; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; font-weight: 600; height: 36px; color: #0f172a; }
        .far-search::placeholder { color: #94a3b8; font-weight: 500; }
        .far-search:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
        .far-select {
            font-size: 11px;
            padding: 8px 32px 8px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #fff;
            font-weight: 700;
            height: 36px;
            color: #0f172a;
            cursor: pointer;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
            background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
            background-repeat: no-repeat;
            background-position: right 10px center;
            background-size: 12px;
        }
        .far-date-input { font-size: 11px; padding: 4px 6px; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; color: #0f172a; font-weight: 600; height: 28px; }
        .far-date-input:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.15); }
        .far-select:hover { border-color: #94a3b8; }
        .far-select:focus { outline: none; border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
        .far-select option { font-weight: 600; color: #0f172a; padding: 6px; }
        .far-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; transition: all .15s; cursor: pointer; }
        .far-btn-accent { background: #f59e0b; color: white; }
        .far-btn-accent:hover { background: #d97706; }
        .far-btn-warn { background: #dc2626; color: white; }
        .far-btn-warn:hover { background: #b91c1c; }
        .far-btn-ghost { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
        .far-btn-ghost:hover { background: #f8fafc; }
        .far-btn-disabled { background: #f1f5f9; color: #cbd5e1; border: 1px solid #e2e8f0; cursor: not-allowed; }
        .far-row-selected { background: #e0f2fe !important; cursor: pointer; }
        .far-row-selected td { background: #e0f2fe !important; }
        .far-row-editing { background: #fef3c7 !important; outline: 2px solid #f59e0b; outline-offset: -2px; }
        .far-row-editing td { background: #fef3c7 !important; }
        .far-derived-selected { background: #bae6fd !important; }
        .far-derived-editing { background: #fde68a !important; }
        .far-table tbody tr:not(.far-row-editing):not(.far-row-selected):hover td { background: #fffbeb !important; }
    </style>
    <div class="h-full flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 font-sans">
        <div id="far-header">${renderHeader(filteredRowsArr)}</div>
        <div id="far-editbar">${renderEditBar()}</div>

        <div class="flex flex-col md:flex-row gap-3 flex-1 min-h-0">
            <aside id="far-toolbar" class="hidden md:block md:w-60 md:flex-shrink-0 max-h-[55vh] md:max-h-none overflow-y-auto md:overflow-visible">${renderSidebar(allFilterRows, filteredFilterRows)}</aside>

            <div class="bg-white rounded-xl border border-accent/30 overflow-hidden shadow-sm flex flex-col flex-1 min-h-0 min-w-0">
                <div id="far-body" class="flex-1 min-h-0 overflow-hidden flex flex-col">${renderTable()}</div>
            </div>
        </div>
    </div>`;
}

// Re-render only the table+toolbar without a full page swap so the user
// doesn't lose scroll position when editing or filtering.
export function rerenderFAR() {
    const allFilterRows      = FAR_STATE.rows.map(farToFilterRow);
    const filteredRowsArr    = filteredRows();
    const filteredFilterRows = filteredRowsArr.map(farToFilterRow);

    const hdr = document.getElementById('far-header');
    const eb  = document.getElementById('far-editbar');
    const tb  = document.getElementById('far-toolbar');
    const bd  = document.getElementById('far-body');
    if (hdr) hdr.innerHTML = renderHeader(filteredRowsArr);
    if (eb)  eb.innerHTML  = renderEditBar();
    if (tb)  tb.innerHTML  = renderSidebar(allFilterRows, filteredFilterRows);
    if (bd)  bd.innerHTML  = renderTable();
}

// Reset all shared-panel filters; keep FY + acq date range alone.
export function farResetFilters() {
    Object.assign(FAR_STATE, ASSET_FILTER_DEFAULTS());
    rerenderFAR();
}

export function toggleFarFilters() {
    const el = document.getElementById('far-toolbar');
    if (!el) return;
    el.classList.toggle('hidden');
    el.classList.toggle('md:block');
}

// ─── Modals ─────────────────────────────────────────────────
// Both modals follow the project convention: append to body, unique id, animate
// in, remove on close. Backdrop click and Esc close them too.

function mountFarModal(id, html) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.className = 'fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center px-4 opacity-0 transition-opacity duration-200';
    wrap.innerHTML = html;
    wrap.addEventListener('click', (e) => { if (e.target === wrap) closeFarModal(id); });
    document.body.appendChild(wrap);
    requestAnimationFrame(() => { wrap.classList.remove('opacity-0'); });
    const escHandler = (e) => { if (e.key === 'Escape') { closeFarModal(id); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);
}

export function closeFarModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('opacity-0');
    setTimeout(() => el.remove(), 180);
}

const FY_FOR_NEW = () => FAR_STATE.fy || '';

export function openAddRowModal() {
    const fy = FY_FOR_NEW();
    if (!fy) { alert('Select a financial year first.'); return; }
    const classes = [...new Set(FAR_STATE.rows.map(r => r.assetClass).filter(Boolean))].sort();
    const donors  = [...new Set(FAR_STATE.rows.map(r => r.donor).filter(Boolean))].sort();
    const datalistClasses = `<datalist id="far-modal-classes">${classes.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>`;
    const datalistDonors  = `<datalist id="far-modal-donors">${donors.map(d => `<option value="${esc(d)}"></option>`).join('')}</datalist>`;
    const lbl = (t) => `<label class="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">${t}</label>`;
    const inp = (id, type, value, opts = '') => `<input id="${id}" type="${type}" value="${esc(value)}" ${opts} class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />`;
    const sel = (id, opts) => `<select id="${id}" class="far-select w-full">${opts}</select>`;

    mountFarModal('far-add-modal', `
        <div class="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div class="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <div>
                    <h3 class="text-lg font-black text-slate-900 uppercase tracking-tight">Add Asset Row</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">FY ${fy}-${String((fy + 1) % 100).padStart(2, '0')}</p>
                </div>
                <button onclick="app.farCloseAddModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="px-6 py-5 overflow-y-auto flex-1 space-y-5">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Identification</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="md:col-span-2">${lbl('Asset Identification Number *')}${inp('far-new-assetId', 'text', '', 'placeholder="e.g. KALIKE/NRTT/BLR/Item 01" required')}</div>
                        <div>${lbl('Asset Class *')}<input id="far-new-assetClass" type="text" list="far-modal-classes" placeholder="Computers, Furniture..." class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />${datalistClasses}</div>
                        <div>${lbl('Description')}${inp('far-new-description', 'text', '', 'placeholder="Item description"')}</div>
                        <div>${lbl('Location')}${inp('far-new-location', 'text', '', 'placeholder="Office / unit"')}</div>
                        <div>${lbl('Purchase / Kind')}${sel('far-new-purchaseOrKind', `
                            <option value="">—</option>
                            <option value="Purchase">Purchase</option>
                            <option value="Kind">Kind</option>
                        `)}</div>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Procurement &amp; Dates</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>${lbl('Acquisition Date')}${inp('far-new-acqDate', 'date', '')}</div>
                        <div>${lbl('Supplier Name')}${inp('far-new-supplierName', 'text', '')}</div>
                        <div>${lbl('Bill No.')}${inp('far-new-billNo', 'text', '')}</div>
                        <div>${lbl('Voucher No.')}${inp('far-new-voucherNo', 'text', '')}</div>
                        <div>${lbl('Date of Installation')}${inp('far-new-installationDate', 'date', '')}</div>
                        <div>${lbl('Date put to use')}${inp('far-new-datePutToUse', 'date', '')}</div>
                        <div>${lbl('Quantity')}${inp('far-new-quantity', 'number', '1', 'step="1" min="0"')}</div>
                        <div>${lbl('Useful life (years)')}${inp('far-new-usefulLifeYears', 'text', '', 'placeholder="e.g. 5 years"')}</div>
                        <div>${lbl('Depreciation Rate (e.g. 0.40 = 40%) *')}${inp('far-new-depRate', 'number', '0.40', 'step="0.01" min="0" max="1"')}</div>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Assets at Cost</p>
                    <div class="grid grid-cols-3 gap-3">
                        <div>${lbl('F · Gross Opening')}${inp('far-new-grossBlockOpening', 'number', '0', 'step="0.01"')}</div>
                        <div>${lbl('G · Additions')}${inp('far-new-additions', 'number', '0', 'step="0.01"')}</div>
                        <div>${lbl('H · Disposals')}${inp('far-new-disposalsGross', 'number', '0', 'step="0.01"')}</div>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Accumulated Depreciation</p>
                    <div class="grid grid-cols-3 gap-3">
                        <div>${lbl('J · Acc Dep Opening')}${inp('far-new-accDepOpening', 'number', '0', 'step="0.01"')}</div>
                        <div>${lbl('M · Disposals Acc Dep')}${inp('far-new-disposalsAccDep', 'number', '0', 'step="0.01"')}</div>
                        <div>${lbl('O · Net Block Prev FY')}${inp('far-new-netBlockPrevFY', 'number', '0', 'step="0.01"')}</div>
                    </div>
                </div>
                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Disposal &amp; Metadata</p>
                    <div class="grid grid-cols-2 gap-3">
                        <div>${lbl('Q · Disposal Date')}${inp('far-new-disposalDate', 'date', '')}</div>
                        <div>${lbl('R · Proceeds on Disposal')}${inp('far-new-proceedsOnDisposal', 'number', '0', 'step="0.01"')}</div>
                        <div>${lbl('Donor')}<input id="far-new-donor" type="text" list="far-modal-donors" placeholder="Donor name..." class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20" />${datalistDonors}</div>
                        <div>${lbl('Status')}${sel('far-new-status', `
                            <option value="In Use">In Use</option>
                            <option value="Idle">Idle</option>
                            <option value="Under Maintenance">Under Maintenance</option>
                            <option value="Disposed">Disposed</option>
                            <option value="Lost">Lost</option>
                        `)}</div>
                    </div>
                </div>
                <div id="far-add-error" class="hidden text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200"></div>
            </div>
            <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button onclick="app.farCloseAddModal()" class="far-btn far-btn-ghost">Cancel</button>
                <button onclick="app.farSubmitAddModal()" class="far-btn far-btn-accent">
                    <span class="material-symbols-outlined text-sm">save</span> Add row
                </button>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById('far-new-assetId')?.focus(), 50);
}

// ---- Issue New Asset Number ----
// Parses existing FAR IDs to extract distinct funders + sites, generates a
// suggested ID live as the user fills the form, and on save writes 1 FAR
// row (qty=N, total gross) plus N Asset Registry rows (per-unit tracking).

function parseExistingFunders() {
    const set = new Set();
    FAR_STATE.rows.forEach(r => {
        const parts = String(r.assetId || '').split('/');
        if (parts.length >= 2 && parts[0].toUpperCase().startsWith('KALIKE')) {
            const f = parts[1].trim();
            if (f && f.length < 20) set.add(f);
        }
    });
    return [...set].sort();
}
function parseExistingSites() {
    const set = new Set();
    FAR_STATE.rows.forEach(r => {
        const parts = String(r.assetId || '').split('/');
        if (parts.length >= 3 && parts[0].toUpperCase().startsWith('KALIKE')) {
            const s = parts[2].trim();
            if (s && s.length < 20) set.add(s);
        }
    });
    return [...set].sort();
}

function fyLabelForId(fy) {
    return `${fy}-${String((Number(fy) + 1) % 100).padStart(2, '0')}`;
}

// Returns next available sequence number for a (funder, site, FY) combo.
function nextSeqFor(funder, site, fy) {
    const fyTag = fyLabelForId(fy);
    let max = 0;
    const re = new RegExp(`/\\s*(\\d{1,3})(?:\\s+to\\s+(\\d{1,3}))?\\s*/\\s*${fyTag}\\s*$`, 'i');
    FAR_STATE.rows.forEach(r => {
        const id = String(r.assetId || '');
        if (!id.toUpperCase().includes(`/${(funder || '').toUpperCase()}/`)) return;
        if (site && !id.toUpperCase().includes(`/${site.toUpperCase()}/`)) return;
        const m = id.match(re);
        if (m) {
            const end = parseInt(m[2] || m[1], 10);
            if (Number.isFinite(end) && end > max) max = end;
        }
    });
    return max + 1;
}

function shortDesc(desc) {
    return String(desc || 'item').trim().replace(/\s+/g, ' ').slice(0, 40);
}

export function buildAssetIdPreview({ funder, site, description, quantity, fy, startSeq }) {
    if (!funder || !site || !description || !fy) return '';
    const seq = Number(startSeq) > 0 ? Number(startSeq) : nextSeqFor(funder, site, fy);
    const qty = Math.max(1, Number(quantity) || 1);
    const range = qty === 1
        ? String(seq).padStart(2, '0')
        : `${String(seq).padStart(2, '0')} to ${String(seq + qty - 1).padStart(2, '0')}`;
    return `KALIKE/${funder}/${site}/${shortDesc(description)} ${range}/${fyLabelForId(fy)}`;
}

export function openIssueNumberModal() {
    const fy = FY_FOR_NEW();
    if (!fy) { alert('Select a financial year first.'); return; }

    const classes = [...new Set(FAR_STATE.rows.map(r => r.assetClass).filter(Boolean))].sort();
    const donors  = [...new Set(FAR_STATE.rows.map(r => r.donor).filter(Boolean))].sort();
    const funders = parseExistingFunders();
    const sites   = parseExistingSites();
    const fys     = (FAR_STATE.years || []).map(y => y.fy);
    if (!fys.includes(fy)) fys.unshift(fy);

    const lbl = (t) => `<label class="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">${t}</label>`;

    mountFarModal('far-issue-modal', `
        <div class="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
            <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white flex items-center justify-between shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center"><span class="material-symbols-outlined">qr_code_2</span></div>
                    <div>
                        <h3 class="text-lg font-black text-slate-900 uppercase tracking-tight">Issue New Asset Number</h3>
                        <p class="text-[10px] font-bold text-violet-500 uppercase tracking-widest mt-0.5">FAR gets 1 grouped row · Registry gets one row per unit</p>
                    </div>
                </div>
                <button onclick="app.farCloseIssueModal()" class="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>

            <div class="px-6 py-5 overflow-y-auto flex-1 space-y-5">

                <!-- Live ID preview -->
                <div id="iss-preview-wrap" class="bg-slate-900 text-white px-4 py-3 rounded-xl">
                    <p class="text-[9px] font-black text-violet-300 uppercase tracking-widest mb-1">Generated Asset ID</p>
                    <p id="iss-preview" class="text-sm font-black font-mono break-all">—</p>
                    <p id="iss-preview-note" class="text-[9px] text-slate-400 mt-1">Fill category, funder, site, description, qty &amp; FY to see the preview.</p>
                </div>

                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Classification</p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>${lbl('Asset Class *')}
                            <input id="iss-class" list="iss-class-list" placeholder="Pick or type new..." oninput="app.farIssueRefresh()" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
                            <datalist id="iss-class-list">${classes.map(c => `<option value="${esc(c)}"></option>`).join('')}</datalist>
                        </div>
                        <div>${lbl('Funder / Project *')}
                            <input id="iss-funder" list="iss-funder-list" placeholder="NRTT, Titan, FCRA..." oninput="app.farIssueRefresh()" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
                            <datalist id="iss-funder-list">${funders.map(f => `<option value="${esc(f)}"></option>`).join('')}</datalist>
                        </div>
                        <div>${lbl('Site / Location *')}
                            <input id="iss-site" list="iss-site-list" placeholder="BLR, TPS, KSU..." oninput="app.farIssueRefresh()" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
                            <datalist id="iss-site-list">${sites.map(s => `<option value="${esc(s)}"></option>`).join('')}</datalist>
                        </div>
                    </div>
                </div>

                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Product Details</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="md:col-span-2">${lbl('Description / Product Name *')}
                            <input id="iss-desc" type="text" placeholder='e.g. "L Shaped workstation table"' oninput="app.farIssueRefresh()" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
                            <p class="text-[9px] text-slate-400 mt-1">This will also be auto-used as the Asset Name in the Registry.</p>
                        </div>
                        <div>${lbl('Quantity *')}
                            <input id="iss-qty" type="number" value="1" min="1" step="1" oninput="app.farIssueRefresh()" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
                        </div>
                        <div>${lbl('Financial Year *')}
                            <select id="iss-fy" onchange="app.farIssueRefresh()" class="far-select w-full">
                                ${fys.map(y => `<option value="${y}" ${y === fy ? 'selected' : ''}>${fyLabelForId(y)}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Procurement</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>${lbl('Purchase / Kind')}<select id="iss-pok" class="far-select w-full"><option value="Purchase">Purchase</option><option value="Kind">Kind</option></select></div>
                        <div>${lbl('Acquisition Date *')}<input id="iss-acq" type="date" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" /></div>
                        <div>${lbl('Supplier Name')}<input id="iss-supp" type="text" placeholder="Vendor / Supplier" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" /></div>
                        <div>${lbl('Bill No.')}<input id="iss-bill" type="text" placeholder='e.g. "INV-12345"' class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" /></div>
                        <div>${lbl('Voucher No.')}<input id="iss-vou" type="text" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" /></div>
                        <div>${lbl('Date of Installation')}<input id="iss-inst" type="date" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" /></div>
                        <div>${lbl('Date Put to Use')}<input id="iss-put" type="date" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" /></div>
                        <div>${lbl('Useful life (years)')}<input id="iss-life" type="text" placeholder='e.g. "5 years"' class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" /></div>
                        <div>${lbl('Depreciation Rate * (0.40 = 40%)')}<input id="iss-rate" type="number" value="0.40" step="0.01" min="0" max="1" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" /></div>
                    </div>
                </div>

                <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Value</p>
                    <div class="grid grid-cols-2 gap-3">
                        <div>${lbl('Total Amount (₹) — gross block for whole bill *')}<input id="iss-total" type="number" value="0" step="0.01" min="0" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" /></div>
                        <div>${lbl('Donor')}
                            <input id="iss-donor" list="iss-donor-list" placeholder="Donor name..." class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
                            <datalist id="iss-donor-list">${donors.map(d => `<option value="${esc(d)}"></option>`).join('')}</datalist>
                        </div>
                    </div>
                    <p class="text-[9px] text-slate-400 mt-2 italic">Per-unit cost in Registry = Total ÷ Quantity. FAR keeps the total grouped under one row.</p>
                </div>

                <div id="iss-error" class="hidden text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200"></div>
            </div>

            <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                <div class="text-[10px] font-bold text-slate-500" id="iss-summary"></div>
                <div class="flex items-center gap-2">
                    <button onclick="app.farCloseIssueModal()" class="far-btn far-btn-ghost">Cancel</button>
                    <button onclick="app.farIssueSubmit()" class="far-btn" style="background:#7c3aed;color:#fff;">
                        <span class="material-symbols-outlined text-sm">qr_code_2</span> Issue &amp; Register
                    </button>
                </div>
            </div>
        </div>
    `);
    setTimeout(() => {
        document.getElementById('iss-class')?.focus();
        // default acq date = today
        const t = new Date().toISOString().slice(0, 10);
        const acq = document.getElementById('iss-acq');
        if (acq && !acq.value) acq.value = t;
    }, 50);
}

export function refreshIssuePreview() {
    const get = (id) => document.getElementById(id)?.value?.trim() || '';
    const preview = buildAssetIdPreview({
        funder: get('iss-funder'),
        site: get('iss-site'),
        description: get('iss-desc'),
        quantity: get('iss-qty'),
        fy: get('iss-fy')
    });
    const p = document.getElementById('iss-preview');
    const note = document.getElementById('iss-preview-note');
    const sum = document.getElementById('iss-summary');
    if (p) p.textContent = preview || '—';
    if (note) {
        if (preview) {
            const qty = Math.max(1, Number(get('iss-qty')) || 1);
            note.textContent = qty > 1
                ? `Registry will create ${qty} child rows (suffix -01 through -${String(qty).padStart(2,'0')}).`
                : 'Registry will create 1 row.';
        } else {
            note.textContent = 'Fill category, funder, site, description, qty & FY to see the preview.';
        }
    }
    if (sum) {
        const qty = Math.max(1, Number(get('iss-qty')) || 1);
        const total = Number(get('iss-total')) || 0;
        const per = qty > 0 ? total / qty : 0;
        sum.textContent = total > 0
            ? `Total ₹${total.toLocaleString('en-IN')} · per unit ₹${per.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
            : '';
    }
}

export function openDeleteModal(row) {
    if (!row) return;
    mountFarModal('far-delete-modal', `
        <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div class="px-6 py-5 border-b border-slate-100 bg-rose-50 flex items-start gap-3">
                <div class="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined">delete_forever</span>
                </div>
                <div class="flex-1">
                    <h3 class="text-base font-black text-rose-900 uppercase tracking-tight">Archive this row?</h3>
                    <p class="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">A copy is kept in the archive — recoverable.</p>
                </div>
            </div>
            <div class="px-6 py-5 space-y-4">
                <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] space-y-1">
                    <div class="font-black text-slate-900 break-words">${esc(row.assetId)}</div>
                    <div class="text-slate-500">${esc(row.assetClass || '—')} · Rate ${fmtRate(row.depRate)}</div>
                    <div class="text-slate-500">Net block: <span class="font-bold text-slate-900">${fmt(row.P)}</span></div>
                </div>
                <div>
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Reason (optional)</label>
                    <input id="far-del-reason" type="text" placeholder="e.g. Duplicate row, wrong FY..." class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
                </div>
                <div>
                    <label class="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1">Your password *</label>
                    <input id="far-del-password" type="password" placeholder="Confirm with your login password" autocomplete="current-password" class="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-semibold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20" />
                </div>
                <div id="far-del-error" class="hidden text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200"></div>
            </div>
            <div class="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                <button onclick="app.farCloseDeleteModal()" class="far-btn far-btn-ghost">Cancel</button>
                <button onclick="app.farConfirmDelete('${esc(row.id)}')" class="far-btn far-btn-warn">
                    <span class="material-symbols-outlined text-sm">delete_forever</span> Archive row
                </button>
            </div>
        </div>
    `);
    setTimeout(() => document.getElementById('far-del-password')?.focus(), 50);
}
