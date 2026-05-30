import { db } from '../mock/db.js';

// Per-asset value via the FAR-fallback aware computeAssetDepreciation.
// Returns gross block (cost basis) — same number shown as "Cost Basis" in the modal.
function assetValue(a) {
    const dep = window.app?.computeAssetDepreciation?.(a);
    if (dep && (dep.gross || dep.nbv)) return Number(dep.gross) || Number(dep.nbv) || 0;
    return parseFloat(a.grossBlock || a.amount || 0) || 0;
}

// Crisp Indian-format helper: ₹1.79 Cr / ₹71.87 L / ₹4.5 K
const fmtShort = (n) => {
    const v = Number(n) || 0;
    const abs = Math.abs(v);
    if (abs >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
    if (abs >= 1e3) return `${(v / 1e3).toFixed(1)} K`;
    return Math.round(v).toLocaleString('en-IN');
};

export function renderAnalyticsDashboard() {
    const assets = db.assets;
    const totalAssets = assets.length;
    const totalValue = assets.reduce((s, a) => s + assetValue(a), 0);

    // Status breakdown
    const statusGroups = {};
    assets.forEach(a => {
        const s = a.status || 'Unknown';
        if (!statusGroups[s]) statusGroups[s] = { count: 0, val: 0 };
        statusGroups[s].count++;
        statusGroups[s].val += assetValue(a);
    });
    const statusStyle = {
        'Active':      'bg-emerald-500',
        'Maintenance': 'bg-amber-400',
        'Retired':     'bg-slate-400',
        'Disposed':    'bg-rose-400',
    };
    const activeCount = statusGroups['Active']?.count || 0;
    const maintCount  = statusGroups['Maintenance']?.count || 0;

    // Group by helper — top 10 by count
    const groupBy = (key) => {
        const g = {};
        assets.forEach(a => {
            const v = a[key] || 'Unassigned';
            if (!g[v]) g[v] = { count: 0, val: 0 };
            g[v].count++;
            g[v].val += assetValue(a);
        });
        return Object.entries(g)
            .map(([name, d]) => ({ name, ...d }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 12);
    };

    const byProgram  = groupBy('program');
    const byLocation = groupBy('location');
    const byCategory = groupBy('category');

    // Custodians
    const custMap = {};
    assets.forEach(a => {
        const name = a.assignedTo || 'Unassigned';
        if (!custMap[name]) custMap[name] = { id: a.assignedToId || '', count: 0, val: 0 };
        custMap[name].count++;
        custMap[name].val += assetValue(a);
    });
    const topCustodians = Object.entries(custMap)
        .map(([name, d]) => ({ name, ...d }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 10);
    const maxCustVal = topCustodians[0]?.val || 1;

    const uniqueEmployees = Object.entries(custMap)
        .map(([name, d]) => ({ name, id: d.id }))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Fleet health rows
    const healthHtml = Object.entries(statusGroups)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([status, d]) => {
            const pct = ((d.count / totalAssets) * 100).toFixed(1);
            const bar = statusStyle[status] || 'bg-violet-400';
            return `
            <div onclick="window.openDrillModal('status','${status}')"
                 class="cursor-pointer group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all">
                <div class="w-2 h-2 rounded-full ${bar} shrink-0"></div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[10px] font-bold text-slate-700 uppercase tracking-wider group-hover:text-accent transition-colors">${status}</span>
                        <span class="text-[9px] font-bold text-slate-400">${d.count} · ${pct}%</span>
                    </div>
                    <div class="w-full bg-slate-100 h-0.5 rounded-full overflow-hidden">
                        <div class="${bar} h-full rounded-full" style="width:${pct}%"></div>
                    </div>
                </div>
            </div>`;
        }).join('');

    // Distribution rows
    const distRows = (data, key) => {
        const maxC = data[0]?.count || 1;
        return data.map(item => {
            const pct  = ((item.count / totalAssets) * 100).toFixed(1);
            const barW = ((item.count / maxC) * 100).toFixed(1);
            return `
            <div onclick="window.openDrillModal('${key}','${item.name.replace(/'/g, "\\'")}')"
                 class="cursor-pointer group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all">
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[10px] font-bold text-slate-800 truncate pr-2 group-hover:text-accent transition-colors">${item.name}</span>
                        <span class="text-[9px] font-bold text-slate-400 shrink-0">${item.count} · ${pct}%</span>
                    </div>
                    <div class="w-full bg-slate-100 h-0.5 rounded-full overflow-hidden">
                        <div class="bg-slate-700 group-hover:bg-accent h-full rounded-full transition-colors duration-500" style="width:${barW}%"></div>
                    </div>
                </div>
            </div>`;
        }).join('');
    };

    return `
    <div class="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <header>
            <h2 class="text-2xl text-slate-900 font-black tracking-tight uppercase">Global Analytics Matrix</h2>
            <p class="text-slate-400 text-[9px] mt-0.5 font-bold tracking-widest uppercase">Cross-Sectional Deployment Visualizations & Audits</p>
        </header>

        <!-- KPI strip -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-slate-900 rounded-xl px-4 py-3">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Fleet</p>
                <p class="text-2xl font-black text-white mt-0.5">${totalAssets}</p>
            </div>
            <div class="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fleet Value</p>
                <p class="text-2xl font-black text-accent mt-0.5 tabular-nums" title="₹${totalValue.toLocaleString('en-IN')}">₹${fmtShort(totalValue)}</p>
            </div>
            <div class="bg-emerald-50 rounded-xl border border-emerald-100 px-4 py-3">
                <p class="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active Units</p>
                <p class="text-2xl font-black text-emerald-700 mt-0.5">${activeCount} <span class="text-xs font-bold text-emerald-400">${totalAssets > 0 ? ((activeCount / totalAssets) * 100).toFixed(0) : 0}%</span></p>
            </div>
            <div class="bg-amber-50 rounded-xl border border-amber-100 px-4 py-3">
                <p class="text-[9px] font-black text-amber-600 uppercase tracking-widest">In Maintenance</p>
                <p class="text-2xl font-black text-amber-700 mt-0.5">${maintCount}</p>
            </div>
        </div>

        <!-- Main 3-column grid -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">

            <!-- Fleet Health -->
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-4 py-2 border-b border-slate-100 bg-slate-50">
                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-[.2em]">Fleet Health Status</h3>
                </div>
                <div class="p-2 space-y-0.5">${healthHtml}</div>
            </div>

            <!-- Distribution (toggle tabs) -->
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div class="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-[.2em]">Distribution</h3>
                    <div class="flex gap-1">
                        ${['program','location','category'].map((k, i) => `
                            <button onclick="window.switchDistTab('${k}')" id="dist-tab-${k}"
                                class="dist-tab px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider transition-colors ${i === 0 ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'}">
                                ${k[0].toUpperCase() + k.slice(1)}
                            </button>`).join('')}
                    </div>
                </div>
                <div class="overflow-y-auto max-h-60 p-2">
                    <div id="dist-program"   class="dist-panel space-y-0.5">${distRows(byProgram,  'program')}</div>
                    <div id="dist-location"  class="dist-panel space-y-0.5 hidden">${distRows(byLocation, 'location')}</div>
                    <div id="dist-category"  class="dist-panel space-y-0.5 hidden">${distRows(byCategory, 'category')}</div>
                </div>
            </div>

            <!-- Top Custodians + PDF Audit -->
            <div class="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
                <div class="px-4 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 class="text-[9px] font-black text-slate-400 uppercase tracking-[.2em]">Top Custodians</h3>
                    <span class="text-[9px] text-slate-300 font-bold">by liability value</span>
                </div>
                <div class="overflow-y-auto p-2 space-y-0.5 flex-1">
                    ${topCustodians.map(c => {
                        const barW = ((c.val / maxCustVal) * 100).toFixed(1);
                        return `
                        <div onclick="window.selectCustodian('${c.name.replace(/'/g, "\\'")}','${c.id}')"
                             class="cursor-pointer group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition-all">
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-center mb-1">
                                    <span class="text-[10px] font-bold text-slate-800 truncate pr-2 group-hover:text-accent transition-colors">${c.name}</span>
                                    <span class="text-[9px] font-bold text-slate-400 shrink-0 tabular-nums" title="₹${c.val.toLocaleString('en-IN')}">₹${fmtShort(c.val)}</span>
                                </div>
                                <div class="w-full bg-slate-100 h-0.5 rounded-full overflow-hidden">
                                    <div class="bg-slate-700 group-hover:bg-accent h-full rounded-full transition-colors duration-500" style="width:${barW}%"></div>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                <!-- PDF Audit strip -->
                <div class="border-t border-slate-100 px-3 py-2.5 bg-slate-50 shrink-0">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <span class="material-symbols-outlined text-xs">print</span> Personnel Audit PDF
                    </p>
                    <div class="flex gap-2">
                        <input type="text" id="audit-employee-select" list="audit-employees-list" autocomplete="off"
                            placeholder="Click custodian or type name…"
                            class="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-medium outline-none text-slate-700 focus:border-accent transition-colors min-w-0">
                        <datalist id="audit-employees-list">
                            ${uniqueEmployees.map(e => `<option value="${e.name} [${e.id}]"></option>`).join('')}
                        </datalist>
                        <button onclick="window.generateAuditPDF()"
                            class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-accent transition-colors shrink-0">PDF</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Drill-down Modal -->
        <div id="analytics-drill-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] hidden flex items-center justify-center opacity-0 transition-opacity duration-300">
            <div class="bg-white w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden scale-95 transition-transform duration-300 mx-4" id="analytics-drill-content">
                <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 gap-4">
                    <div>
                        <h3 class="text-sm font-black text-slate-900 uppercase tracking-tight break-all" id="drill-title">Details</h3>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5" id="drill-subtitle">Filtered View</p>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                        <button onclick="window.exportDrillCSV()" class="px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg flex items-center gap-1.5 hover:bg-slate-700 transition-colors uppercase tracking-widest">
                            <span class="material-symbols-outlined text-sm">download</span> CSV
                        </button>
                        <button onclick="window.closeDrillModal()" class="w-7 h-7 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                </div>
                <div class="overflow-y-auto flex-1">
                    <table class="w-full text-left">
                        <thead class="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                            <tr>
                                <th class="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset</th>
                                <th class="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Assignee / Location</th>
                                <th class="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th class="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100" id="drill-table-body"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>`;
}

// --- Tab switching ---
window.switchDistTab = (key) => {
    document.querySelectorAll('.dist-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.dist-tab').forEach(b => {
        b.classList.remove('bg-slate-900', 'text-white');
        b.classList.add('text-slate-400');
    });
    document.getElementById(`dist-${key}`).classList.remove('hidden');
    const btn = document.getElementById(`dist-tab-${key}`);
    btn.classList.add('bg-slate-900', 'text-white');
    btn.classList.remove('text-slate-400');
};

// --- Custodian click → pre-fill PDF input ---
window.selectCustodian = (name, id) => {
    const input = document.getElementById('audit-employee-select');
    if (!input) return;
    input.value = id ? `${name} [${id}]` : name;
    input.focus();
};

// --- Drill modal ---
window.openDrillModal = (filterType, filterValue) => {
    window.currentDrillData = db.assets.filter(a => (a[filterType] || 'Unknown') === filterValue);
    document.getElementById('drill-title').innerText = filterValue;
    document.getElementById('drill-subtitle').innerText = `Filtered by: ${filterType}`;

    document.getElementById('drill-table-body').innerHTML = window.currentDrillData.map(a => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-3">
                <p class="text-xs font-bold text-slate-900">${a.name}</p>
                <p class="text-[9px] text-slate-400 font-mono mt-0.5">${a.id}</p>
            </td>
            <td class="px-6 py-3">
                <p class="text-xs text-slate-700">${a.assignedTo || '—'}</p>
                <p class="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">${a.location || '—'}</p>
            </td>
            <td class="px-6 py-3">
                <span class="px-2 py-0.5 text-[9px] font-bold rounded uppercase border ${
                    a.status === 'Active'      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    a.status === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                 'bg-slate-100 text-slate-600 border-slate-200'}">${a.status}</span>
            </td>
            <td class="px-6 py-3 text-xs font-bold text-slate-900 text-right tabular-nums">₹${assetValue(a).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
        </tr>`).join('');

    const modal = document.getElementById('analytics-drill-modal');
    modal.classList.remove('hidden');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    document.getElementById('analytics-drill-content').classList.remove('scale-95');
};

window.closeDrillModal = () => {
    const modal = document.getElementById('analytics-drill-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    document.getElementById('analytics-drill-content').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.exportDrillCSV = () => {
    if (!window.currentDrillData?.length) return;
    const title = document.getElementById('drill-title').innerText.replace(/\s+/g, '_').toLowerCase();
    const headers = ['ID', 'Name', 'Category', 'Status', 'Location', 'Assignee', 'Gross', 'NBV'];
    const rows = window.currentDrillData.map(a => {
        const dep = window.app?.computeAssetDepreciation?.(a) || { gross: 0, nbv: 0 };
        return [a.id, a.name, a.category, a.status, a.location, a.assignedTo, dep.gross, dep.nbv]
            .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `analytics_${title}.csv` });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- PDF Audit (programmatic jsPDF — no popup, no html2canvas) ---
window.generateAuditPDF = () => {
    const rawVal = document.getElementById('audit-employee-select').value.trim();
    if (!rawVal) { alert('Please select or type an employee name/ID first.'); return; }

    const employeeAssets = db.assets.filter(a => {
        const full = `${a.assignedTo} [${a.assignedToId || 'N/A'}]`;
        return full === rawVal
            || a.assignedTo?.toLowerCase() === rawVal.toLowerCase()
            || a.assignedToId?.toLowerCase() === rawVal.toLowerCase();
    });
    if (!employeeAssets.length) { alert('No assets found for the specified employee.'); return; }

    const jsPDFCtor = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFCtor) { alert('PDF library still loading — try again in a moment.'); return; }

    const { assignedTo: name, assignedToId: empId, assignedToDesignation: desig } = employeeAssets[0];
    const enriched = employeeAssets.map(a => {
        const dep = window.app?.computeAssetDepreciation?.(a) || { gross: 0, nbv: 0 };
        return { a, gross: Number(dep.gross) || 0, nbv: Number(dep.nbv) || 0 };
    });
    const totalGross = enriched.reduce((s, r) => s + r.gross, 0);
    const totalNbv   = enriched.reduce((s, r) => s + r.nbv,   0);
    const date = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const fmtINR = (n) => 'INR ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

    const doc = new jsPDFCtor({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 12;
    let y = margin;
    const ensureSpace = (need) => { if (y + need > pageH - margin) { doc.addPage(); y = margin; } };

    // Header band
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 26, 'F');
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('KALIKE ASSET MANAGEMENT · PERSONNEL ASSET LEDGER (CONFIDENTIAL)', margin, 8);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text(String(name || '—'), margin, 16);
    doc.setTextColor(203, 213, 225);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${empId || 'N/A'}${desig ? ' · ' + desig : ''}`, margin, 22);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.text(date, pageW - margin, 8, { align: 'right' });
    y = 32;

    // Summary chips
    const chip = (label, value, x) => {
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, 55, 14, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(label.toUpperCase(), x + 3, y + 5);
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(String(value), x + 3, y + 11);
    };
    chip('Total Units', enriched.length, margin);
    chip('Gross Liability', fmtINR(totalGross), margin + 60);
    chip('Net Book Value', fmtINR(totalNbv), margin + 120);
    y += 20;

    // Table header
    const colX = { name: margin, cat: margin + 70, status: margin + 115, gross: margin + 140, nbv: margin + 165 };
    const drawTableHeader = () => {
        doc.setFillColor(15, 23, 42);
        doc.rect(margin, y, pageW - margin * 2, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text('ASSET IDENTITY', colX.name + 1, y + 5);
        doc.text('CLASS', colX.cat + 1, y + 5);
        doc.text('STATUS', colX.status + 1, y + 5);
        doc.text('GROSS', pageW - margin - 28, y + 5, { align: 'right' });
        doc.text('NBV', pageW - margin - 1, y + 5, { align: 'right' });
        y += 9;
    };
    drawTableHeader();

    // Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    enriched.forEach(({ a, gross, nbv }) => {
        const nameLines = doc.splitTextToSize(String(a.name || '—'), 65);
        const idLine = String(a.id || '');
        const catLines = doc.splitTextToSize(String(a.category || '—'), 40);
        const rowH = Math.max(nameLines.length * 3.5 + 4, catLines.length * 3.5 + 2, 8);
        ensureSpace(rowH + 2);

        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(nameLines, colX.name, y + 3);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(idLine, colX.name, y + 3 + nameLines.length * 3.5);
        doc.setFontSize(8);

        doc.setTextColor(71, 85, 105);
        doc.text(catLines, colX.cat, y + 3);

        const statusColor = a.status === 'Active' ? [5, 150, 105] : [100, 116, 139];
        doc.setTextColor(...statusColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.text(String(a.status || '—').toUpperCase(), colX.status, y + 3);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        doc.setTextColor(15, 23, 42);
        doc.text(fmtINR(gross), pageW - margin - 28, y + 3, { align: 'right' });
        doc.text(fmtINR(nbv), pageW - margin - 1, y + 3, { align: 'right' });

        y += rowH;
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y, pageW - margin, y);
        y += 1;
    });

    // Signatures
    ensureSpace(40);
    y += 8;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('OFFICIAL VERIFICATION SIGNATURES', pageW / 2, y, { align: 'center' });
    y += 18;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 10, y, margin + 70, y);
    doc.line(pageW - margin - 70, y, pageW - margin - 10, y);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Employee', margin + 40, y + 4, { align: 'center' });
    doc.text('Finance Officer', pageW - margin - 40, y + 4, { align: 'center' });

    const safeName = String(name || 'employee').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
    doc.save(`Personnel_Audit_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
};
