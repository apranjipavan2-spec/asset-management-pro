import { db } from '../mock/db.js';
import {
    renderAssetFilterPanel,
    assetToFilterRow,
    passesAssetFilter,
    ASSET_FILTER_DEFAULTS,
    activeAssetFilterCount
} from './components/AssetFilterPanel.js';

const REG_STATE = window.__regState || (window.__regState = ASSET_FILTER_DEFAULTS());
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

window.showQRCode = (assetId) => {
    const asset = db.assets.find(a => a.id === assetId);
    if (!asset) return;
    
    const qrData = `KALIKE-ASSET:${asset.id}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${qrData}&bgcolor=f8fafc`;
    
    const modalHtml = `
        <div id="qr-modal-backdrop" class="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div class="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden p-10 flex flex-col items-center animate-in zoom-in-95 duration-300 border border-slate-200">
                <div class="w-full flex justify-between items-center mb-8">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-[.2em]">Institutional Tag Generator</p>
                    </div>
                    <button onclick="document.getElementById('qr-modal-backdrop').remove()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all">
                        <span class="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
                
                <div class="relative group">
                    <div class="absolute inset-0 bg-indigo-600/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div class="relative p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 mb-8">
                        <img src="${qrUrl}" alt="Asset QR Code" class="w-48 h-48 mix-blend-multiply" />
                        <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
                            <p class="text-[8px] font-black text-slate-900 uppercase tracking-widest font-mono">${asset.id}</p>
                        </div>
                    </div>
                </div>
                
                <div class="text-center space-y-2 mb-10">
                    <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">${asset.name}</h3>
                    <div class="flex items-center justify-center gap-2">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg">${asset.category}</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-3 w-full">
                    <button onclick="window.print()" class="py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-[.25em] flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10">
                        <span class="material-symbols-outlined text-sm">print</span>
                        Print Tag
                    </button>
                    <button onclick="window.copyQRLink('${qrUrl}')" class="py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl text-[9px] font-black uppercase tracking-[.25em] flex items-center justify-center gap-2 hover:border-indigo-600 hover:text-indigo-600 transition-all">
                        <span class="material-symbols-outlined text-sm">content_copy</span>
                        Copy Link
                    </button>
                </div>
                
                <p class="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-8 text-center leading-relaxed">Scan to verify asset authenticity via Kalike Institutional Guardian Protocol</p>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);
};

window.copyQRLink = (url) => {
    navigator.clipboard.writeText(url).then(() => {
        alert('Institutional QR Link copied to clipboard.');
    }).catch(err => {
        console.error('Clipboard write failed:', err);
        alert('Could not copy link. Please copy manually:\n\n' + url);
    });
};

function buildRegRows() {
    return db.assets.map(a => ({ asset: a, filterRow: assetToFilterRow(a) }));
}

// Cross-navigation cache. Keyed off db._dataVersion (bumped by every
// syncToCloud call), so repeat visits with no mutations reuse the build.
let _regCache = null;
function _getRegCache() {
    const v = db._dataVersion || 0;
    if (_regCache && _regCache.version === v) return _regCache;
    const rows = buildRegRows();
    _regCache = { version: v, rows, filterRows: rows.map(r => r.filterRow) };
    return _regCache;
}

function renderRegistryTbody(rows) {
    if (!rows.length) {
        return `<tr><td colspan="8" class="text-center py-10">
            <div class="flex flex-col items-center gap-2 text-slate-400">
                <span class="material-symbols-outlined text-3xl">filter_alt_off</span>
                <p class="text-[11px] font-bold">No assets match the current filters</p>
                <button onclick="app.regResetFilters()" class="text-[10px] font-black text-accent hover:underline uppercase tracking-widest">Reset filters</button>
            </div>
        </td></tr>`;
    }
    return rows.map(({ asset }) => {
        const gross = parseFloat(asset.grossBlock || asset.amount || 0);
        const accumDep = parseFloat(asset.accumulatedDepreciation || asset.depreciation || 0);
        const net = parseFloat(asset.netBlock || (gross - accumDep) || 0);
        const isAssigned = !!(asset.assignedTo && String(asset.assignedTo).trim());
        const safeId = (asset.id || '').replace(/'/g, "\\'");
        return `
        <tr onclick="app.showAssetModal('${safeId}')"
            class="${asset.status === 'Disposed' ? 'opacity-50 grayscale hover:opacity-100 transition-opacity' : ''} ${!isAssigned ? 'registry-row-unassigned' : ''} registry-row group">
            <td class="px-3" onclick="event.stopPropagation()">
                <input type="checkbox" class="asset-checkbox w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900" value="${esc(asset.id)}" onchange="window.updateSelectionState()" />
            </td>
            <td>
                <div class="flex items-center gap-2">
                    <div class="compact-icon bg-slate-100 text-slate-400 group-hover:bg-slate-900 group-hover:text-white">
                        <span class="material-symbols-outlined text-sm">inventory_2</span>
                    </div>
                    <div class="max-w-[220px]">
                        <p class="text-[11px] font-black text-slate-900 multiline-name" title="${esc(asset.name)}">${esc(asset.name)}</p>
                        <p class="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest break-all">${esc(asset.id)}</p>
                    </div>
                </div>
            </td>
            <td class="text-[10px] font-bold text-slate-600 max-w-[140px] truncate" title="${esc(asset.location)}">${esc(asset.location)}</td>
            <td class="max-w-[120px]">
                <span class="text-[9px] font-black text-slate-900 uppercase bg-slate-100 px-1.5 py-0.5 rounded inline-block leading-tight" title="${esc(asset.category)}">${esc(asset.category)}</span>
            </td>
            <td>
                <div class="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mb-0.5">
                    <div class="h-full ${parseFloat(asset.health) > 80 ? 'bg-emerald-500' : 'bg-rose-500'}" style="width: ${esc(asset.health)}"></div>
                </div>
                <span class="text-[8px] font-black text-slate-400 uppercase">${esc(asset.health)}</span>
            </td>
            <td>
                <span class="px-1.5 py-0.5 ${asset.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : asset.status === 'Maintenance' ? 'bg-rose-50 text-rose-700 border-rose-100' : asset.status === 'Disposed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-100'} text-[9px] font-black rounded-full uppercase border">
                    ${esc(asset.status)}
                </span>
            </td>
            ${window.app.hasPermission('view_global_stats') ? `
            <td class="text-right">
                <p class="text-[11px] font-black text-slate-900 tabular-nums">₹${gross.toLocaleString('en-IN')}</p>
                <p class="text-[9px] font-bold text-emerald-600 tabular-nums">NBV ₹${net.toLocaleString('en-IN')}</p>
            </td>
            ` : ''}
            <td class="text-right pr-3">
                <div class="flex items-center justify-end gap-2">
                    <div class="flex flex-col items-end">
                        ${isAssigned
                            ? `<p class="text-[10px] font-black text-slate-900 truncate max-w-[120px]" title="${esc(asset.assignedTo)}">${esc(asset.assignedTo)}</p>
                               <p class="text-[8px] text-emerald-600 font-bold uppercase tracking-widest">Assigned</p>`
                            : `<span class="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-widest">Unassigned</span>`}
                    </div>
                    ${window.app.hasPermission('manage_assets') ? `
                    <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="event.stopPropagation(); window.showQRCode('${safeId}')" title="QR Tag" class="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 flex items-center justify-center transition-all">
                            <span class="material-symbols-outlined text-[13px]">qr_code_2</span>
                        </button>
                        <button onclick="event.stopPropagation(); window.exportAssetPDF('${safeId}')" title="Export PDF" class="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 flex items-center justify-center transition-all">
                            <span class="material-symbols-outlined text-[13px]">picture_as_pdf</span>
                        </button>
                        <button onclick="event.stopPropagation(); app.showEditAssetModal('${safeId}')" title="Edit" class="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 flex items-center justify-center transition-all">
                            <span class="material-symbols-outlined text-[13px]">edit</span>
                        </button>
                        <button onclick="event.stopPropagation(); app.deleteAssetRequest('${safeId}')" title="Delete" class="w-6 h-6 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center justify-center transition-all">
                            <span class="material-symbols-outlined text-[13px]">delete</span>
                        </button>
                    </div>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

export function renderAssetRegistry() {
    const { rows: all, filterRows } = _getRegCache();
    const totalCount = all.length;
    const assignedCount = all.filter(r => r.filterRow.assignee).length;
    const unassignedCount = totalCount - assignedCount;
    const filtered = all.filter(r => passesAssetFilter(r.filterRow, REG_STATE));
    const canExport = window.app.canExportAssets();
    const canManage = window.app.hasPermission('manage_assets');

    const statChip = (bg, border, iconColor, labelColor, valueColor, icon, label, value) => `
        <div class="${bg} ${border} border rounded-lg px-2.5 py-1.5 flex items-center gap-2 flex-1 min-w-[110px]">
            <span class="material-symbols-outlined ${iconColor} text-[18px]">${icon}</span>
            <div class="leading-tight">
                <p class="text-[8px] font-black uppercase tracking-widest ${labelColor}">${label}</p>
                <p class="text-sm font-black ${valueColor} leading-none">${value}</p>
            </div>
        </div>`;

    return `
        <div class="h-full flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 font-sans">
            <header class="flex items-center gap-3 flex-wrap flex-shrink-0">
                <div class="flex-shrink-0">
                    <h2 class="text-xl text-slate-900 font-black tracking-tight leading-tight">Master Asset Registry</h2>
                    <p class="text-slate-500 text-[10px] font-bold tracking-[.15em] uppercase mt-0.5">Institutional Inventory · ${totalCount.toLocaleString('en-IN')} records</p>
                </div>

                <div class="flex items-center gap-2 flex-1 flex-wrap min-w-0">
                    ${statChip('bg-emerald-50', 'border-emerald-200', 'text-emerald-400', 'text-emerald-700', 'text-emerald-900', 'verified', 'Assigned', assignedCount.toLocaleString('en-IN'))}
                    ${statChip(unassignedCount ? 'bg-amber-50' : 'bg-slate-50', unassignedCount ? 'border-amber-200' : 'border-slate-200', unassignedCount ? 'text-amber-400' : 'text-slate-300', unassignedCount ? 'text-amber-700' : 'text-slate-500', unassignedCount ? 'text-amber-900' : 'text-slate-900', 'person_off', 'Unassigned', unassignedCount.toLocaleString('en-IN'))}
                    ${statChip('bg-slate-50', 'border-slate-200', 'text-slate-300', 'text-slate-500', 'text-slate-900', 'visibility', 'Showing', filtered.length.toLocaleString('en-IN'))}
                </div>

                <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button onclick="app.toggleRegFilters()" class="md:hidden px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-50 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">filter_alt</span>
                        Filters${activeAssetFilterCount(REG_STATE) ? ` (${activeAssetFilterCount(REG_STATE)})` : ''}
                    </button>
                    ${window.app.canExportFinance() ? `
                    <button onclick="app.exportSourceFormat()" title="Source-format XLSX (Finance/ED/Superadmin)" class="px-2 py-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-800 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">download</span> Source
                    </button>` : ''}
                    ${canExport ? `
                    <button onclick="app.exportCSV('assets')" class="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-slate-50 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">csv</span> CSV
                    </button>
                    <button onclick="app.exportExcel(event)" class="px-2 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">table_chart</span> Excel
                    </button>` : ''}
                    ${canManage ? `
                    <button onclick="app.showAddAssetModal()" class="px-2.5 py-1 bg-accent text-white text-[9px] font-black uppercase tracking-wider rounded-md hover:bg-blue-700 transition-all flex items-center gap-1 shadow-sm">
                        <span class="material-symbols-outlined text-[13px]">add</span> Add Asset
                    </button>` : ''}
                </div>
            </header>

            <!-- Bulk action toolbar -->
            <div id="bulk-toolbar" class="bg-slate-900 text-white px-4 py-2 rounded-xl hidden items-center justify-between animate-in slide-in-from-top-2 duration-200 flex-shrink-0">
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-accent text-[18px]">fact_check</span>
                        <span id="bulk-count" class="text-[11px] font-black uppercase tracking-widest">0 Assets Selected</span>
                    </div>
                    <div class="h-3 w-px bg-white/20"></div>
                    <button onclick="window.bulkUpdate('Geography')" class="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[9px] font-black uppercase tracking-wider border border-white/10 transition-all">Mass Move</button>
                    <button onclick="window.bulkUpdate('Class')" class="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded text-[9px] font-black uppercase tracking-wider border border-white/10 transition-all">Re-Classify</button>
                </div>
                <button onclick="window.clearSelection()" class="text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors">Clear</button>
            </div>

            <div class="flex flex-col md:flex-row gap-3 flex-1 min-h-0">
                <aside id="reg-toolbar" class="hidden md:block md:w-60 md:flex-shrink-0">
                    ${renderAssetFilterPanel({
                        state: REG_STATE,
                        allRows: filterRows,
                        onChange: 'app.regSetFilter',
                        resetFn: 'app.regResetFilters',
                        totalLabel: totalCount,
                        filteredLabel: filtered.length
                    })}
                </aside>

                <div class="bg-white rounded-xl border border-accent/30 overflow-hidden shadow-sm flex flex-col flex-1 min-h-0 min-w-0">
                    <div class="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/40 flex-shrink-0">
                        <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-900">Asset Inventory</h3>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-200">${filtered.length.toLocaleString('en-IN')} of ${totalCount.toLocaleString('en-IN')}</span>
                    </div>
                    <div class="flex-1 min-h-0 overflow-y-auto">
                        <table class="dense-table">
                            <thead class="sticky-header">
                                <tr>
                                    <th class="w-8 px-3"><input type="checkbox" id="select-all-assets" onchange="window.toggleAllSelections()" class="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900" /></th>
                                    <th>Asset Identity</th>
                                    <th>Location</th>
                                    <th>Class</th>
                                    <th>Health</th>
                                    <th>Status</th>
                                    ${window.app.hasPermission('view_global_stats') ? '<th class="text-right">Gross / NBV</th>' : ''}
                                    <th class="text-right pr-3">Custodian</th>
                                </tr>
                            </thead>
                            <tbody id="registry-tbody" class="divide-y divide-slate-100">${renderRegistryTbody(filtered)}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ─── Public helpers (wired in main.js) ───────────────────────
export function regSetFilter(key, value) {
    if (!(key in REG_STATE)) return;
    REG_STATE[key] = value;
    rerenderRegistry();
}

export function regResetFilters() {
    Object.assign(REG_STATE, ASSET_FILTER_DEFAULTS());
    rerenderRegistry();
}

export function rerenderRegistry() {
    const { rows: all, filterRows } = _getRegCache();
    const filtered = all.filter(r => passesAssetFilter(r.filterRow, REG_STATE));
    const tb = document.getElementById('reg-toolbar');
    const body = document.getElementById('registry-tbody');
    if (tb) tb.innerHTML = renderAssetFilterPanel({
        state: REG_STATE,
        allRows: filterRows,
        onChange: 'app.regSetFilter',
        resetFn: 'app.regResetFilters',
        totalLabel: all.length,
        filteredLabel: filtered.length
    });
    if (body) body.innerHTML = renderRegistryTbody(filtered);
}

export function toggleRegFilters() {
    const aside = document.getElementById('reg-toolbar');
    if (aside) aside.classList.toggle('hidden');
}

// --- Bulk Selection & Operations ---
window.updateSelectionState = () => {
    const selected = document.querySelectorAll('.asset-checkbox:checked');
    const toolbar = document.getElementById('bulk-toolbar');
    const countDisplay = document.getElementById('bulk-count');
    
    if (selected.length > 0) {
        toolbar.classList.remove('hidden');
        toolbar.classList.add('flex');
        countDisplay.innerText = `${selected.length} Assets Selected`;
    } else {
        toolbar.classList.add('hidden');
        toolbar.classList.remove('flex');
    }
};

window.toggleAllSelections = () => {
    const master = document.getElementById('select-all-assets');
    const visibleCheckboxes = Array.from(document.querySelectorAll('.registry-row'))
        .filter(row => row.style.display !== 'none')
        .map(row => row.querySelector('.asset-checkbox'));
    
    visibleCheckboxes.forEach(cb => { if(cb) cb.checked = master.checked; });
    window.updateSelectionState();
};

window.clearSelection = () => {
    document.querySelectorAll('.asset-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('select-all-assets').checked = false;
    window.updateSelectionState();
};

window.bulkUpdate = (field) => {
    const selectedIds = Array.from(document.querySelectorAll('.asset-checkbox:checked')).map(cb => cb.value);
    const newValue = prompt(`Mass Update ${field}:\n\nEnter new ${field} for the ${selectedIds.length} selected assets:`);
    
    if (newValue) {
        if (confirm(`Institutional Confirmation:\n\nAre you sure you want to update ${field} to "${newValue}" for ${selectedIds.length} assets? This action is persistent.`)) {
            selectedIds.forEach(id => {
                const asset = db.assets.find(a => a.id === id);
                if (asset) {
                    if (field === 'Geography') asset.location = newValue;
                    if (field === 'Class') asset.category = newValue;
                }
            });
            
            db._logActivity('Bulk Correction Applied', `Mass updated ${field} for ${selectedIds.length} assets to "${newValue}"`);
            db.syncToCloud();
            window.app.render();
        }
    }
};

// Legacy filterRegistryTable/filterRegistryByStatus replaced by app.regSetFilter
// (state-driven sidebar in AssetFilterPanel).
