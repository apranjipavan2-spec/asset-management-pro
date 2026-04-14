import { db } from '../mock/db.js';

export function renderAnalyticsDashboard() {
    const assets = db.assets;
    let totalAssets = assets.length;
    let totalValue = assets.reduce((s, a) => s + parseFloat(a.amount), 0);

    const groupBy = (key) => {
        const groups = {};
        assets.forEach(a => {
            const val = a[key] || 'Unassigned';
            if (!groups[val]) groups[val] = { count: 0, val: 0 };
            groups[val].count++;
            groups[val].val += parseFloat(a.amount);
        });
        return Object.entries(groups).map(([name, data]) => ({ name, ...data })).sort((a,b) => b.val - a.val);
    };

    const byProgram = groupBy('program');
    const byLocation = groupBy('location');
    const byCategory = groupBy('category');

    const uniqueEmployeesMap = new Map();
    assets.forEach(a => {
        if (!uniqueEmployeesMap.has(a.assignedTo)) {
            uniqueEmployeesMap.set(a.assignedTo, a.assignedToId || 'N/A');
        }
    });
    const uniqueEmployees = Array.from(uniqueEmployeesMap.entries())
        .map(([name, id]) => ({ name, id }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const renderCard = (title, data, filterKey) => `
        <div class="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 h-full">
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">${title}</h3>
            <div class="space-y-2">
                ${data.map(item => {
                    const pct = totalValue > 0 ? ((item.val / totalValue) * 100).toFixed(1) : 0;
                    return `
                        <div onclick="window.openDrillModal('${filterKey}', '${item.name.replace(/'/g, "\\'")}')" class="cursor-pointer group hover:bg-slate-50 p-3 -mx-3 rounded-xl transition-colors">
                            <div class="flex justify-between items-end mb-2">
                                <div>
                                    <p class="text-xs font-black text-slate-900 leading-none uppercase group-hover:text-accent transition-colors">${item.name}</p>
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">${item.count} Assets Assigned</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs font-black text-slate-900 leading-none">₹${item.val.toLocaleString()}</p>
                                    <p class="text-[10px] font-bold text-accent uppercase tracking-widest mt-1.5">${pct}% Allocation</p>
                                </div>
                            </div>
                            <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div class="bg-slate-900 h-full rounded-full transition-all group-hover:bg-accent" style="width: ${pct}%"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    return `
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <header>
                <h2 class="text-3xl text-slate-900 font-black tracking-tight uppercase">Global Analytics Matrix</h2>
                <p class="text-slate-500 text-sm mt-1 font-bold tracking-widest uppercase">Cross-Sectional Deployment Visualizations & Audits</p>
            </header>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div class="bg-slate-900 rounded-3xl shadow-lg shadow-slate-900/20 p-8 flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Active Global Fleet</p>
                        <p class="text-4xl font-black text-white mt-2">${totalAssets} <span class="text-xl text-slate-500">Units</span></p>
                    </div>
                    <div class="w-16 h-16 rounded-2xl border border-slate-700 bg-slate-800 flex items-center justify-center text-white">
                        <span class="material-symbols-outlined text-2xl">public</span>
                    </div>
                </div>
                 <div class="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex items-center justify-between">
                    <div>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Combined Fleet Valuation</p>
                        <p class="text-4xl font-black text-accent mt-2 tabular-nums">₹${totalValue.toLocaleString()}</p>
                    </div>
                    <div class="w-16 h-16 rounded-2xl border border-accent/20 bg-accent/5 flex items-center justify-center text-accent">
                        <span class="material-symbols-outlined text-2xl">monitoring</span>
                    </div>
                </div>
                
                <!-- Personnel Security Audit PDF Tool -->
                <div class="bg-indigo-50 border border-indigo-100 rounded-3xl shadow-sm p-6 flex flex-col justify-center">
                    <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span class="material-symbols-outlined text-sm">print</span> Personnel Audit Report</p>
                    <div class="flex gap-2 relative">
                        <input type="text" id="audit-employee-select" list="audit-employees-list" autocomplete="off" placeholder="Search by Name or ID..." class="flex-1 bg-white border border-indigo-100 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700 w-full shadow-sm focus:border-indigo-400 transition-colors">
                        <datalist id="audit-employees-list">
                            ${uniqueEmployees.map(e => `<option value="${e.name} [${e.id}]"></option>`).join('')}
                        </datalist>
                        <button onclick="window.generateAuditPDF()" class="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-indigo-700 transition-colors text-center shrink-0">PDF Out</button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                ${renderCard('Deployment By Program', byProgram, 'program')}
                ${renderCard('Asset Geographical Distribution', byLocation, 'location')}
                ${renderCard('Equipment Classification Matrix', byCategory, 'category')}
            </div>
            
            <!-- Global Drill Down Modal -->
            <div id="analytics-drill-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] hidden flex items-center justify-center opacity-0 transition-opacity duration-300">
               <div class="bg-white w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden scale-95 transition-transform duration-300 mx-4" id="analytics-drill-content">
                   <div class="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 gap-4">
                       <div>
                           <h3 class="text-lg font-black text-slate-900 uppercase tracking-tight break-all" id="drill-title">Category Details</h3>
                           <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1" id="drill-subtitle">Filtered View</p>
                       </div>
                       <div class="flex items-center gap-4">
                          <button onclick="window.exportDrillCSV()" class="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors uppercase tracking-widest shadow-sm">
                            <span class="material-symbols-outlined text-sm">download</span> Export CSV
                          </button>
                          <button onclick="window.closeDrillModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-rose-100 hover:text-rose-500 transition-colors">
                              <span class="material-symbols-outlined text-sm">close</span>
                          </button>
                       </div>
                   </div>
                   <div class="overflow-y-auto flex-1 p-0">
                       <table class="w-full text-left">
                           <thead class="sticky top-0 bg-white shadow-sm z-10">
                               <tr class="bg-slate-50 w-full">
                                   <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Asset</th>
                                   <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Assignee / Location</th>
                                   <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">Status</th>
                                   <th class="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">Value (₹)</th>
                               </tr>
                           </thead>
                           <tbody class="divide-y divide-slate-100" id="drill-table-body">
                           </tbody>
                       </table>
                   </div>
               </div>
            </div>

            <!-- PDF Print Container -->
            <div id="pdf-print-container" class="hidden print:block absolute inset-0 bg-white p-12 z-[9999]">
                 <div id="pdf-content"></div>
            </div>
        </div>
    `;
}

// Global modal and PDF handlers
window.openDrillModal = (filterType, filterValue) => {
    window.currentDrillData = db.assets.filter(a => a[filterType] === filterValue);
    document.getElementById('drill-title').innerText = filterValue;
    document.getElementById('drill-subtitle').innerText = `Filtered by Matrix Node: ${filterType}`;
    
    const tbody = document.getElementById('drill-table-body');
    tbody.innerHTML = window.currentDrillData.map(a => `
        <tr class="hover:bg-slate-50/80 transition-colors">
            <td class="px-8 py-4">
                <p class="text-xs font-bold text-slate-900">${a.name}</p>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${a.id}</p>
            </td>
            <td class="px-8 py-4">
                <p class="text-xs font-bold text-slate-600">${a.assignedTo}</p>
                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">${a.location}</p>
            </td>
            <td class="px-8 py-4">
                <span class="px-2 py-0.5 ${a.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : (a.status === 'Maintenance' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-100 text-slate-600 border-slate-200')} text-[9px] font-bold rounded uppercase border">
                    ${a.status}
                </span>
            </td>
            <td class="px-8 py-4 text-xs font-bold text-slate-900 text-right tabular-nums">₹${parseFloat(a.amount).toLocaleString()}</td>
        </tr>
    `).join('');
    
    const modal = document.getElementById('analytics-drill-modal');
    modal.classList.remove('hidden');
    // force reflow
    void modal.offsetWidth; 
    modal.classList.remove('opacity-0');
    document.getElementById('analytics-drill-content').classList.remove('scale-95');
};

window.closeDrillModal = () => {
    const modal = document.getElementById('analytics-drill-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    document.getElementById('analytics-drill-content').classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
};

window.exportDrillCSV = () => {
    if (!window.currentDrillData || window.currentDrillData.length === 0) return;
    const title = document.getElementById('drill-title').innerText.replace(/\s+/g, '_').toLowerCase();
    const data = window.currentDrillData.map(a => ({
        ID: a.id,
        Name: a.name,
        Category: a.category,
        Status: a.status,
        Location: a.location,
        Assignee: a.assignedTo,
        Amount: a.amount
    }));
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\\n');
    const csvContent = `${headers}\\n${rows}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_export_${title}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.generateAuditPDF = () => {
    const inputField = document.getElementById('audit-employee-select');
    const rawVal = inputField.value.trim();
    if (!rawVal) {
        alert('Please search for an employee by name or ID first.');
        return;
    }

    // Try finding exact match by the fully assembled string, or fallback to exact name or ID match
    let employeeAssets = db.assets.filter(a => {
        const fullString = `${a.assignedTo} [${a.assignedToId || 'N/A'}]`;
        return fullString === rawVal || a.assignedTo.toLowerCase() === rawVal.toLowerCase() || (a.assignedToId && a.assignedToId.toLowerCase() === rawVal.toLowerCase());
    });

    if (employeeAssets.length === 0) {
        alert('No assets found for the specified employee or ID.');
        return;
    }

    const employeeName = employeeAssets[0].assignedTo;
    const employeeId = employeeAssets[0].assignedToId || 'N/A';
    const employeeDesig = employeeAssets[0].assignedToDesignation || 'Staff Member';
    const totalVal = employeeAssets.reduce((sum, a) => sum + parseFloat(a.amount), 0);
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build standalone printable HTML template
    const pdfHtml = `
        <div class="max-w-4xl mx-auto font-sans text-slate-900 bg-white min-h-screen">
            <div class="flex justify-between items-end border-b-4 border-slate-900 pb-6 mb-8 pt-8">
                <div>
                    <h1 class="text-4xl font-black uppercase tracking-tight">Personnel Asset Ledger</h1>
                    <p class="text-xs uppercase tracking-widest text-slate-500 font-bold mt-2">Institutional Security Audit — Confidentially Generated</p>
                </div>
                <div class="text-right">
                    <p class="text-lg font-black uppercase">${employeeName}</p>
                    <p class="text-[10px] font-bold text-slate-400 font-mono mt-0.5">${employeeId}</p>
                    <p class="text-xs font-black text-indigo-600 mt-2 uppercase tracking-widest">${employeeDesig}</p>
                    <p class="text-xs uppercase tracking-widest text-slate-500 font-bold mt-1">${date}</p>
                </div>
            </div>
            
            <div class="flex gap-10 mb-12">
                 <div>
                    <p class="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Assigned Units</p>
                    <p class="text-2xl font-black">${employeeAssets.length}</p>
                 </div>
                 <div>
                    <p class="text-[10px] uppercase font-black tracking-widest text-slate-400">Gross Liability Value</p>
                    <p class="text-2xl font-black tabular-nums">₹${totalVal.toLocaleString()}</p>
                 </div>
            </div>

            <table class="w-full text-left text-sm border-collapse">
                <thead>
                    <tr class="bg-slate-100 border-y border-slate-300">
                        <th class="py-3 px-4 font-black uppercase tracking-widest text-[10px] text-slate-500">Asset Identity</th>
                        <th class="py-3 px-4 font-black uppercase tracking-widest text-[10px] text-slate-500">Classification</th>
                        <th class="py-3 px-4 font-black uppercase tracking-widest text-[10px] text-slate-500">Status</th>
                        <th class="py-3 px-4 font-black uppercase tracking-widest text-[10px] text-slate-500 text-right">Valuation</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200">
                    ${employeeAssets.map(a => `
                        <tr>
                            <td class="py-4 px-4">
                                <p class="font-bold">${a.name}</p>
                                <p class="text-[10px] text-slate-500 font-mono mt-0.5">${a.id}</p>
                            </td>
                            <td class="py-4 px-4 text-slate-600">${a.category}</td>
                            <td class="py-4 px-4">
                                <span class="uppercase text-[10px] font-bold ${a.status === 'Active' ? 'text-emerald-600' : 'text-slate-500'}">${a.status}</span>
                            </td>
                            <td class="py-4 px-4 text-right font-bold tabular-nums">₹${parseFloat(a.amount).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="mt-16 pt-8 border-t border-slate-200 text-center">
                 <p class="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-4">Official Verification Signatures</p>
                 <div class="flex justify-around mt-8">
                     <div class="w-48 border-t-2 border-slate-300 pt-2"><p class="text-xs font-bold text-slate-500 uppercase">Employee Signature</p></div>
                     <div class="w-48 border-t-2 border-slate-300 pt-2"><p class="text-xs font-bold text-slate-500 uppercase">Finance Officer</p></div>
                 </div>
            </div>
        </div>
        <style>
           @media print {
               body * { visibility: hidden; }
               #pdf-print-container, #pdf-print-container * { visibility: visible; }
               #pdf-print-container { position: absolute; left: 0; top: 0; width: 100%; width: 100vw; background: white; margin: 0; padding: 0.5in; }
               aside, header { display: none !important; }
           }
        </style>
    `;
    
    document.getElementById('pdf-content').innerHTML = pdfHtml;
    
    // Slight delay to allow DOM to inject HTML and styles before invoking native print
    setTimeout(() => {
        window.print();
        // Clean up UI instantly after print dialog resolves
        document.getElementById('pdf-content').innerHTML = '';
    }, 200);
};
