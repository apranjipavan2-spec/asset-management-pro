import { db } from '../mock/db.js';

export function renderRequestPage(user) {
    return `
        <div class="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h2 class="text-3xl text-slate-900 font-black tracking-tight">Request New Asset</h2>
                <p class="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Equipment Requisition System</p>
            </header>

            <div class="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 space-y-8">
                <div class="space-y-6">
                    <div class="space-y-3">
                        <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Asset Category</label>
                        <select id="request-category" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all">
                            <option value="IT Equipment">IT Equipment (Laptop, Monitor, Hub)</option>
                            <option value="Infrastructure">Infrastructure (Network, Power, Server)</option>
                            <option value="Logistics">Logistics (Transport, Hauler, Tooling)</option>
                            <option value="Office">Office (Furniture, Stationery)</option>
                        </select>
                    </div>

                    <div class="space-y-3">
                        <label class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Business Justification</label>
                        <textarea id="request-reason" rows="4" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-all" placeholder="Reason for requisition..."></textarea>
                    </div>

                    <div class="p-4 bg-slate-50 rounded-xl flex gap-3 items-start border border-slate-200">
                        <span class="material-symbols-outlined text-slate-400">info</span>
                        <p class="text-xs text-slate-500 leading-relaxed italic">Once submitted, this request will be forwarded to the Head of Operations for approval. You will be notified via the "My Assets" portal upon status change.</p>
                    </div>
                </div>

                <div class="flex items-center gap-3 justify-end pt-4">
                    <button onclick="app.navigateTo('dashboard')" class="px-6 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all">Discard</button>
                    <button id="submit-request-btn" onclick="submitRequisition()" class="px-8 py-2.5 bg-accent text-white text-xs font-bold rounded-xl shadow-lg shadow-accent/20 hover:scale-[1.02] transition-all uppercase tracking-widest">Submit Requisition</button>
                </div>
            </div>

            <div class="space-y-4">
                <h4 class="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Submission History</h4>
                <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <table class="w-full text-left">
                        <tbody class="divide-y divide-slate-50">
                            ${db.requests.filter(r => r.user === user.name).length > 0 ? db.requests.filter(r => r.user === user.name).map(r => `
                                <tr>
                                    <td class="px-6 py-4">
                                        <p class="text-xs font-bold text-slate-900">${r.category}</p>
                                        <p class="text-[10px] text-slate-400 uppercase font-bold">${new Date(r.date).toLocaleDateString()}</p>
                                    </td>
                                    <td class="px-6 py-4">
                                        <span class="px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${r.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}">
                                            ${r.status}
                                        </span>
                                    </td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td class="px-6 py-6 text-center text-[10px] text-slate-400 uppercase tracking-widest">No recent submissions</td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Global scope logic for form submission
window.submitRequisition = () => {
    const category = document.getElementById('request-category').value;
    const reason = document.getElementById('request-reason').value;
    
    if (!reason.trim()) {
        alert('Please provide a business justification.');
        return;
    }

    db.requestAsset(category, reason, window.app.user.name);
    window.app.navigateTo('dashboard');
};
