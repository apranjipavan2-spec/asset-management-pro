// Fixed Assets — parent-level capital register backed by the FAR table.
// Each row represents a capital-asset lot/parent (one FAR record) with
// gross block, accumulated depreciation, NBV, donor, location, etc.
//
// Unit-level / custodian view lives in AssetRegistry; per-FY working sheet
// lives in DepreciationSchedulePage. This page is the accountant's read-only
// rollup.

import { db } from '../mock/db.js';
import {
    renderAssetFilterPanel,
    passesAssetFilter,
    ASSET_FILTER_DEFAULTS,
    activeAssetFilterCount
} from './components/AssetFilterPanel.js';

const FA_STATE = window.__faState || (window.__faState = ASSET_FILTER_DEFAULTS());
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtShort = (n) => {
    const v = Number(n) || 0;
    const abs = Math.abs(v);
    if (abs >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
    if (abs >= 1e3) return `${(v / 1e3).toFixed(1)} K`;
    return Math.round(v).toLocaleString('en-IN');
};
const fyLabel = (y) => y ? `FY ${y}-${String((Number(y) + 1) % 100).padStart(2, '0')}` : '—';

// Pull a normalized filter row out of a FAR record. Mirrors assetToFilterRow
// but sourced from FAR fields (assetClass, donor, acqDate, etc.).
function farToFilterRow(r) {
    const acq = String(r.acqDate || r.refinedAcqDate || '').slice(0, 10);
    const ym = acq.match(/(\d{4})/);
    let acqFy = '';
    if (acq) {
        const d = new Date(acq);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            acqFy = d.getMonth() >= 3 ? y : y - 1;
        }
    }
    return {
        id: r.assetId || '',
        name: r.description || r.assetId || '',
        category: r.assetClass || '',
        location: r.location || '',
        status: r.status || '',
        assignee: '',                 // FAR rows aren't custodian-assigned
        donor: r.donor || '',
        program: '',
        year: ym ? ym[1] : '',
        acqDate: acq,
        acqFy,
        value: Number(r.I) || (Number(r.grossBlockOpening) + Number(r.additions) - Number(r.disposalsGross)) || 0
    };
}

// Build a normalized "display row" merging FAR fields with computed I/K/L/N/P.
function buildFaRow(r) {
    return {
        raw: r,
        filterRow: farToFilterRow(r),
        assetId: r.assetId || '',
        description: r.description || '',
        assetClass: r.assetClass || '',
        location: r.location || '',
        donor: r.donor || '',
        quantity: Number(r.quantity) || 1,
        acqDate: (r.acqDate || r.refinedAcqDate || '').slice(0, 10),
        fy: r.fy,
        gross: Number(r.I) || (Number(r.grossBlockOpening) + Number(r.additions) - Number(r.disposalsGross)) || 0,
        ytd: Number(r.K) || 0,
        accum: Number(r.N) || 0,
        nbv: Number(r.P) || (Number(r.netBlockPrevFY) || 0),
        depRate: Number(r.depRate) || 0,
        status: r.status || ''
    };
}

function ensureFarLoaded() {
    // If FAR hasn't been hydrated yet (user hasn't visited FAR Schedule),
    // kick off the same init the schedule page uses. Returns a promise that
    // resolves when the data is ready.
    if (Array.isArray(db.assetFar) && db.assetFar.length > 0) {
        return Promise.resolve();
    }
    if (window.app && typeof window.app.farInit === 'function') {
        return window.app.farInit();
    }
    return Promise.resolve();
}

function renderFaTbody(rows) {
    if (!rows.length) {
        return `<tr><td colspan="12" class="text-center py-10">
            <div class="flex flex-col items-center gap-2 text-slate-400">
                <span class="material-symbols-outlined text-3xl">filter_alt_off</span>
                <p class="text-[11px] font-bold">No fixed-asset records match the current filters</p>
                <button onclick="app.faResetFilters()" class="text-[10px] font-black text-accent hover:underline uppercase tracking-widest">Reset filters</button>
            </div>
        </td></tr>`;
    }
    return rows.map(row => {
        const safeId = (row.raw.assetId || '').replace(/'/g, "\\'");
        const fcra = row.donor && /fcra/i.test(row.donor);
        return `
        <tr class="hover:bg-amber-50/40 cursor-pointer" onclick="app.faShowDetail('${safeId}')">
            <td>
                <div class="flex items-center gap-2">
                    <div class="compact-icon bg-amber-50 text-amber-600 border border-amber-100">
                        <span class="material-symbols-outlined text-sm">account_balance_wallet</span>
                    </div>
                    <div class="max-w-[240px]">
                        <p class="text-[11px] font-black text-slate-900 multiline-name" title="${esc(row.description || row.assetId)}">${esc(row.description || row.assetId)}</p>
                        <p class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest break-all">${esc(row.assetId)}</p>
                    </div>
                </div>
            </td>
            <td class="max-w-[140px]">
                <span class="text-[9px] font-black text-slate-900 uppercase bg-slate-100 px-1.5 py-0.5 rounded inline-block leading-tight" title="${esc(row.assetClass)}">${esc(row.assetClass)}</span>
            </td>
            <td class="text-[10px] font-bold text-slate-600 max-w-[120px] truncate" title="${esc(row.location)}">${esc(row.location) || '—'}</td>
            <td class="max-w-[120px]">
                <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${fcra ? 'bg-violet-50 text-violet-700 border-violet-100' : (row.donor ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100')} inline-block leading-tight" title="${esc(row.donor)}">${esc(row.donor) || 'General'}</span>
            </td>
            <td class="text-center text-[10px] font-black text-slate-700">${fyLabel(row.fy)}</td>
            <td class="text-center text-[11px] font-black text-slate-900 tabular-nums">${row.quantity}</td>
            <td class="text-right text-[11px] font-black text-slate-900 tabular-nums">₹${fmt(row.gross)}</td>
            <td class="text-right text-[10px] font-bold text-amber-600 tabular-nums">₹${fmt(row.ytd)}</td>
            <td class="text-right text-[10px] font-bold text-rose-500 tabular-nums">₹${fmt(row.accum)}</td>
            <td class="text-right text-[11px] font-black text-emerald-600 tabular-nums">₹${fmt(row.nbv)}</td>
            <td class="text-center"><span class="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">${((row.depRate || 0) * 100).toFixed(0)}%</span></td>
            <td class="text-center">
                <span class="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${row.status === 'Disposed' ? 'bg-slate-100 text-slate-500 border-slate-200' : row.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}">${esc(row.status) || 'Active'}</span>
            </td>
        </tr>`;
    }).join('');
}

// Async — waits for FAR data to be hydrated so we can render parent-level rows.
export async function renderAssetsLedger(user) {
    await ensureFarLoaded();

    const all = (db.assetFar || []).map(buildFaRow);
    const filtered = all.filter(r => passesAssetFilter(r.filterRow, FA_STATE));

    const totalGross = filtered.reduce((s, r) => s + r.gross, 0);
    const totalAccum = filtered.reduce((s, r) => s + r.accum, 0);
    const totalNbv = filtered.reduce((s, r) => s + r.nbv, 0);
    const fcraCount = filtered.filter(r => r.donor && /fcra/i.test(r.donor)).length;
    const canExport = window.app.canExportAssets();

    const statChip = (bg, border, iconColor, labelColor, valueColor, icon, label, value) => `
        <div class="${bg} ${border} border rounded-lg px-2.5 py-1.5 flex items-center gap-2 min-w-0 md:flex-1 md:min-w-[110px]">
            <span class="material-symbols-outlined ${iconColor} text-[18px] shrink-0">${icon}</span>
            <div class="leading-tight min-w-0">
                <p class="text-[8px] font-black uppercase tracking-widest ${labelColor} truncate">${label}</p>
                <p class="text-sm font-black ${valueColor} leading-none truncate">${value}</p>
            </div>
        </div>`;

    const emptyState = !all.length ? `
        <div class="p-10 text-center text-slate-400">
            <span class="material-symbols-outlined text-3xl">account_balance_wallet</span>
            <p class="text-[11px] font-bold mt-2">No FAR records loaded yet. Visit FAR Schedule to populate the register.</p>
        </div>` : null;

    return `
        <div class="h-full flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 font-sans">
            <header class="flex flex-col gap-2 md:flex-row md:items-center md:flex-wrap md:gap-3 flex-shrink-0">
                <div class="flex-shrink-0">
                    <h2 class="text-lg md:text-xl text-slate-900 font-black tracking-tight leading-tight">Fixed Assets Ledger</h2>
                    <p class="text-slate-500 text-[10px] font-bold tracking-[.15em] uppercase mt-0.5">Capital Register · ${all.length.toLocaleString('en-IN')} records</p>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:flex md:items-center md:flex-1 md:flex-wrap md:min-w-0">
                    ${statChip('bg-slate-50', 'border-slate-200', 'text-slate-300', 'text-slate-500', 'text-slate-900', 'paid', 'Gross Block', '₹' + fmtShort(totalGross))}
                    ${statChip('bg-rose-50', 'border-rose-200', 'text-rose-400', 'text-rose-700', 'text-rose-900', 'trending_down', 'Accum. Dep', '₹' + fmtShort(totalAccum))}
                    ${statChip('bg-emerald-50', 'border-emerald-200', 'text-emerald-400', 'text-emerald-700', 'text-emerald-900', 'savings', 'Net Book', '₹' + fmtShort(totalNbv))}
                    ${statChip('bg-violet-50', 'border-violet-200', 'text-violet-400', 'text-violet-700', 'text-violet-900', 'verified_user', 'FCRA Lots', fcraCount.toLocaleString('en-IN'))}
                </div>

                <div class="flex items-center gap-1.5 flex-wrap md:flex-shrink-0">
                    <button onclick="app.toggleFaFilters()" class="md:hidden px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-50 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">filter_alt</span>
                        Filters${activeAssetFilterCount(FA_STATE) ? ` (${activeAssetFilterCount(FA_STATE)})` : ''}
                    </button>
                    ${canExport ? `
                    <button onclick="app.exportCSV('finance_assets')" class="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-50 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">csv</span> CSV
                    </button>
                    <button onclick="app.faExportXlsx(event)" class="px-2 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">table_chart</span> XLSX
                    </button>` : ''}
                </div>
            </header>

            <div class="flex flex-col md:flex-row gap-3 flex-1 min-h-0">
                <aside id="fa-toolbar" class="hidden md:block md:w-60 md:flex-shrink-0 max-h-[55vh] md:max-h-none overflow-y-auto md:overflow-visible">
                    ${renderAssetFilterPanel({
                        state: FA_STATE,
                        allRows: all.map(r => r.filterRow),
                        onChange: 'app.faSetFilter',
                        resetFn: 'app.faResetFilters',
                        totalLabel: all.length,
                        filteredLabel: filtered.length
                    })}
                </aside>

                <div class="bg-white rounded-xl border border-accent/30 overflow-hidden shadow-sm flex flex-col flex-1 min-h-0 min-w-0">
                    <div class="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/40 flex-shrink-0">
                        <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-900">Capital Asset Register</h3>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-200">${filtered.length.toLocaleString('en-IN')} of ${all.length.toLocaleString('en-IN')}</span>
                    </div>

                    ${emptyState || `
                    <div class="flex-1 min-h-0 overflow-y-auto">
                        <table class="dense-table">
                            <thead class="sticky-header">
                                <tr>
                                    <th>Asset Identity</th>
                                    <th>Class</th>
                                    <th>Location</th>
                                    <th>Donor / Fund</th>
                                    <th class="text-center">FY</th>
                                    <th class="text-center">Qty</th>
                                    <th class="text-right">Gross Block</th>
                                    <th class="text-right">YTD Dep</th>
                                    <th class="text-right">Accum. Dep</th>
                                    <th class="text-right">Net Book</th>
                                    <th class="text-center">Rate</th>
                                    <th class="text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody id="fa-tbody">${renderFaTbody(filtered)}</tbody>
                        </table>
                    </div>`}
                </div>
            </div>
        </div>
    `;
}

// ─── Public helpers (wired in main.js) ───────────────────────
export function faSetFilter(key, value) {
    if (!(key in FA_STATE)) return;
    FA_STATE[key] = value;
    rerenderFa();
}

export function faResetFilters() {
    Object.assign(FA_STATE, ASSET_FILTER_DEFAULTS());
    rerenderFa();
}

export function rerenderFa() {
    const all = (db.assetFar || []).map(buildFaRow);
    const filtered = all.filter(r => passesAssetFilter(r.filterRow, FA_STATE));
    const tb = document.getElementById('fa-toolbar');
    const body = document.getElementById('fa-tbody');
    if (tb) tb.innerHTML = renderAssetFilterPanel({
        state: FA_STATE,
        allRows: all.map(r => r.filterRow),
        onChange: 'app.faSetFilter',
        resetFn: 'app.faResetFilters',
        totalLabel: all.length,
        filteredLabel: filtered.length
    });
    if (body) body.innerHTML = renderFaTbody(filtered);
}

export function toggleFaFilters() {
    const aside = document.getElementById('fa-toolbar');
    if (aside) aside.classList.toggle('hidden');
}

// Open the related per-unit asset modal if any unit ties back to this FAR
// parent. Otherwise fall back to the FAR-row modal.
export function faShowDetail(farAssetId) {
    if (!farAssetId) return;
    const childUnit = (db.assets || []).find(a => a.parentAssetId === farAssetId);
    if (childUnit && window.app.showAssetModal) {
        window.app.showAssetModal(childUnit.id);
        return;
    }
    const r = (db.assetFar || []).find(x => x.assetId === farAssetId);
    if (!r) return;
    alert(`Fixed Asset Lot\n\nID: ${r.assetId}\nClass: ${r.assetClass}\nDonor: ${r.donor || '—'}\nGross: ₹${fmt(Number(r.I) || 0)}\nNet Book: ₹${fmt(Number(r.P) || 0)}\n\n(Visit FAR Schedule for the full editable row.)`);
}

// Filtered XLSX export — same row shape as the table.
export function faExportXlsx(btn) {
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
        const all = (db.assetFar || []).map(buildFaRow);
        const rows = all.filter(r => passesAssetFilter(r.filterRow, FA_STATE));
        const data = rows.map(r => ({
            'Asset ID': r.assetId,
            'Description': r.description,
            'Class': r.assetClass,
            'Location': r.location,
            'Donor / Fund': r.donor,
            'FY': r.fy,
            'Quantity': r.quantity,
            'Acquisition Date': r.acqDate,
            'Gross Block': Number(r.gross.toFixed(2)),
            'YTD Depreciation': Number(r.ytd.toFixed(2)),
            'Accumulated Dep': Number(r.accum.toFixed(2)),
            'Net Book Value': Number(r.nbv.toFixed(2)),
            'Dep Rate': r.depRate,
            'Status': r.status
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'FixedAssets');
        XLSX.writeFile(wb, `kalike_fixed_assets_${new Date().toISOString().split('T')[0]}.xlsx`);
        if (btn) btn.classList.remove('animate-export-pulse');
    }, 400);
}
