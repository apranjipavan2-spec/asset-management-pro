import { db } from '../mock/db.js';

export function renderIssueReportPage(user) {
    const myAssets = db.assets.filter(a => a.assignedTo === user.name);

    return `
        <div class="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h2 class="text-3xl text-slate-900 font-black tracking-tight">Report Equipment Problem</h2>
                <p class="text-rose-500 text-sm mt-1 uppercase tracking-widest font-bold">Critical Incident System</p>
            </header>

            <div class="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 space-y-8">
                <div class="space-y-6">
                    <div class="space-y-3">
                        <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Select Equipment</label>
                        <select id="issue-asset-id" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 outline-none transition-all">
                            ${myAssets.map(a => `<option value="${a.id}">${a.name} (#${a.id})</option>`).join('')}
                        </select>
                    </div>

                    <div class="space-y-3">
                        <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Describe the Issue</label>
                        <textarea id="issue-description" rows="4" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-rose-500 outline-none transition-all" placeholder="What happened? Describe the malfunction or damage..."></textarea>
                    </div>

                    <div class="p-4 bg-rose-50 rounded-xl flex gap-3 items-start border border-rose-100">
                        <span class="material-symbols-outlined text-rose-500">warning</span>
                        <p class="text-xs text-rose-700 leading-relaxed italic font-medium">This report will immediately flag the equipment as "Maintenance" in the Master Registry. The Operations Manager will be notified to assign a technician.</p>
                    </div>
                </div>

                <div class="flex items-center gap-3 justify-end pt-4">
                    <button onclick="app.navigateTo('dashboard')" class="px-6 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Discard</button>
                    <button id="submit-issue-btn" onclick="submitIssue()" class="px-8 py-2.5 bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-500/20 hover:scale-[1.02] transition-all uppercase tracking-widest">Submit Incident Report</button>
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
