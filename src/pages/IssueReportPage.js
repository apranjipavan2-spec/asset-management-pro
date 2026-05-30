import { db } from '../mock/db.js';

window.filterIssueAssets = function(query) {
    const q = query.toLowerCase();
    const options = document.querySelectorAll('.issue-asset-option');
    options.forEach(opt => {
        const text = opt.innerText.toLowerCase();
        opt.style.display = text.includes(q) ? '' : 'none';
    });
};

export function renderIssueReportPage(user) {
    const myAssets = db.assets.filter(a => a.assignedTo === user.name);
    const myReports = (db.maintenanceLogs || [])
        .filter(l => l.reporter === user.name)
        .slice(0, 12);

    const statusPill = (status) => {
        const s = (status || '').toLowerCase();
        if (s.includes('resolved')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (s.includes('progress')) return 'bg-amber-50 text-amber-600 border-amber-100';
        if (s.includes('reject')) return 'bg-rose-50 text-rose-600 border-rose-100';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    return `
        <div class="w-full space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <header>
                <h2 class="text-xl text-slate-900 font-black tracking-tight">Report Equipment Problem</h2>
                <p class="text-rose-500 text-[10px] mt-0.5 uppercase tracking-widest font-bold">Critical Incident System</p>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <!-- Left: incident form -->
                <div class="bg-white p-5 rounded-xl border border-accent/30 shadow-sm space-y-4 hover:border-accent transition-all">
                    <div class="space-y-4">
                        <div class="space-y-1.5 relative">
                            <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Select Equipment</label>

                            <div class="relative w-full group/dropdown">
                                <input type="hidden" id="issue-asset-id" value="${myAssets.length > 0 ? myAssets[0].id : ''}" />

                                <button type="button" onclick="const menu = document.getElementById('issue-asset-menu'); menu.classList.toggle('hidden');" class="w-full text-left bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none transition-all flex justify-between items-center text-slate-700 hover:border-rose-500">
                                    <span id="issue-asset-label" class="font-bold">${myAssets.length > 0 ? `${myAssets[0].name.replace(/'/g, "\\'")} (#${myAssets[0].id})` : '-- No Equipment Assigned --'}</span>
                                    <span class="material-symbols-outlined text-slate-400 text-base">expand_more</span>
                                </button>

                                <div id="issue-asset-menu" class="hidden absolute z-50 left-0 right-0 mt-2 bg-white border-2 border-accent/30 rounded-2xl shadow-xl max-h-[400px] overflow-hidden flex flex-col">
                                    <div class="p-2 border-b border-slate-100 bg-slate-50 sticky top-0">
                                        <div class="relative">
                                            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[14px]">search</span>
                                            <input type="text" placeholder="Search assigned equipment..." oninput="window.filterIssueAssets(this.value)" class="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:border-rose-500 outline-none transition-all" onclick="event.stopPropagation()" />
                                        </div>
                                    </div>
                                    <div class="overflow-y-auto scroll-container flex-1">
                                        ${myAssets.length > 0 ? myAssets.map(a => `
                                            <div class="issue-asset-option cursor-pointer p-3 border-b border-slate-100 hover:bg-rose-50 transition-all last:border-0" onclick="
                                                document.getElementById('issue-asset-id').value = '${a.id}';
                                                document.getElementById('issue-asset-label').innerText = '${a.name.replace(/'/g, "\\'")} (#${a.id})';
                                                document.getElementById('issue-asset-menu').classList.add('hidden');
                                            ">
                                                <p class="text-[11px] font-black text-slate-900 leading-snug mb-1">${a.name} <span class="text-slate-400">#${a.id}</span></p>
                                                <div class="flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-widest">
                                                    <span class="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">${a.category}</span>
                                                </div>
                                            </div>
                                        `).join('') : '<div class="p-4 text-xs font-bold text-slate-400 text-center uppercase tracking-widest">No equipment assigned</div>'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Describe the Issue</label>
                            <textarea id="issue-description" rows="4" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:border-rose-500 outline-none transition-all" placeholder="What happened? Describe the malfunction or damage..."></textarea>
                        </div>

                        <div class="p-3 bg-rose-50 rounded-lg flex gap-2 items-start border border-rose-100">
                            <span class="material-symbols-outlined text-rose-500 text-base">warning</span>
                            <p class="text-[11px] text-rose-700 leading-snug font-medium">This report will immediately flag the equipment as "Maintenance" in the Master Registry. The Operations Manager will be notified to assign a technician.</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 justify-end pt-1">
                        <button onclick="app.navigateTo('dashboard')" class="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Discard</button>
                        <button id="submit-issue-btn" onclick="submitIssue()" class="px-5 py-2 bg-rose-500 text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-rose-600 transition-all uppercase tracking-widest">Submit Incident Report</button>
                    </div>
                </div>

                <!-- Right: recent reports -->
                <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div class="px-4 py-2.5 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                        <h3 class="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest">My Recent Reports</h3>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${myReports.length} total</span>
                    </div>
                    <div class="divide-y divide-slate-100 max-h-[420px] overflow-y-auto scroll-container">
                        ${myReports.length > 0 ? myReports.map(l => `
                            <div class="px-4 py-2.5 hover:bg-slate-50/60 transition-colors">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0 flex-1">
                                        <p class="text-[11px] font-black text-slate-900 truncate">${(l.assetName || l.assetId || 'Asset').toString()}</p>
                                        <p class="text-[10px] text-slate-500 line-clamp-2 mt-0.5">${(l.description || '').toString()}</p>
                                        <p class="text-[9px] text-slate-400 uppercase font-bold tracking-widest mt-1">${l.date ? new Date(l.date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : '—'}</p>
                                    </div>
                                    <span class="px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${statusPill(l.status)} shrink-0">${l.status || 'Open'}</span>
                                </div>
                            </div>
                        `).join('') : `<div class="px-4 py-8 text-center text-[10px] text-slate-400 uppercase tracking-widest">No reports submitted yet</div>`}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Global scope logic for issue submission
window.submitIssue = () => {
    const assetId = document.getElementById('issue-asset-id').value;
    const description = document.getElementById('issue-description').value;
    
    if (!description.trim()) {
        alert('Please describe the issue.');
        return;
    }

    db.reportIssue(assetId, description, window.app.user.name);
    window.app.navigateTo('dashboard');
};
