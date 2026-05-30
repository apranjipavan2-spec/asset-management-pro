import { db } from '../mock/db.js';

export function renderPerformanceReviewsPage(user) {
    const isHR = ['hr', 'superadmin'].includes(user.role);
    const isManager = user.role === 'manager' || isHR;
    const isEmployee = !isHR && user.role !== 'manager';
    
    // View logic: HR sees all, Manager sees team, Employee sees own
    let reviews = [];
    if (isHR) {
        reviews = db.performanceReviews;
    } else if (isManager) {
        reviews = db.performanceReviews.filter(r => r.managerId === user.empId || r.empId === user.empId);
    } else {
        reviews = db.performanceReviews.filter(r => r.empId === user.empId);
    }

    // Direct reports for Managers
    let directReports = [];
    if (user.role === 'manager' || isHR) {
        directReports = db.hierarchy.filter(h => h.reportsTo === user.empId);
    }

    window.submitReview = (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
            empId: form.empId.value,
            empName: form.empId.options[form.empId.selectedIndex].text,
            managerId: user.empId,
            period: form.period.value,
            taskScore: parseFloat(form.taskScore.value),
            managerRating: parseFloat(form.rating.value),
            feedback: form.feedback.value,
            status: 'Pending HR'
        };
        db.addPerformanceReview(data);
        app.renderContent();
    };

    window.submitSelfAppraisal = (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
            empId: user.empId,
            empName: user.name,
            managerId: user.reportsTo || 'ADMIN',
            period: form.period.value,
            selfScore: parseFloat(form.selfScore.value),
            selfFeedback: form.selfFeedback.value,
            status: 'Self Submitted'
        };
        db.addPerformanceReview(data);
        app.renderContent();
    };

    window.finalizeReview = (id) => {
        if (confirm('Finalize this appraisal? This will publish it to the employee profile.')) {
            db.finalizePerformanceReview(id, user.empId);
            app.renderContent();
        }
    };

    const statusBadge = (status) => {
        const styles = {
            'Draft': 'bg-slate-100 text-slate-600 border-slate-200',
            'Self Submitted': 'bg-blue-50 text-blue-600 border-blue-100',
            'Pending HR': 'bg-amber-50 text-amber-600 border-amber-100',
            'Published': 'bg-emerald-50 text-emerald-600 border-emerald-100'
        };
        return `<span class="px-2 py-0.5 rounded text-[8px] font-black uppercase border ${styles[status] || styles['Draft']}">${status}</span>`;
    };

    return `
        <div class="w-full space-y-4 animate-in fade-in duration-200">
            <!-- Institutional Header -->
            <header class="flex justify-between items-end">
                <div>
                    <h2 class="page-title">Performance Appraisals</h2>
                    <p class="page-subtitle">Continuous Evaluation & Growth Alignment</p>
                </div>
                <div class="flex gap-2">
                    <div class="flex bg-slate-100 p-1 rounded-xl">
                        <button class="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg bg-white shadow-sm text-slate-900">Current Cycle</button>
                        <button class="px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg text-slate-400 hover:text-slate-600">History</button>
                    </div>
                </div>
            </header>

            <div class="grid grid-cols-12 gap-4 flex-1 min-h-0">
                <!-- Main Content Area: Review Feed -->
                <div class="col-span-8 flex flex-col space-y-4 overflow-y-auto pr-2 scroll-container">
                    ${reviews.length === 0 ? `
                        <div class="card border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-16 text-center">
                            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                <span class="material-symbols-outlined text-4xl">assignment_ind</span>
                            </div>
                            <h3 class="text-sm font-black text-slate-900 uppercase tracking-tight">No active appraisals</h3>
                            <p class="page-subtitle mt-1">Review cycles will appear here once initiated</p>
                        </div>
                    ` : reviews.map(rev => `
                        <div class="card overflow-hidden hover:shadow-md transition-all duration-200">
                            <div class="p-5">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-sm font-black">
                                            ${rev.empName.charAt(0)}
                                        </div>
                                        <div>
                                            <div class="flex items-center gap-2 mb-0.5">
                                                ${statusBadge(rev.status)}
                                                <span class="card-meta font-mono">${rev.period}</span>
                                            </div>
                                            <h3 class="text-sm font-black text-slate-900 uppercase tracking-tight">${rev.empName}</h3>
                                            <p class="card-meta mt-0">${rev.empId}</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-4">
                                        ${rev.managerRating ? `
                                        <div class="text-center">
                                            <p class="stat-value text-lg">${rev.managerRating}<span class="text-xs text-slate-300">/5</span></p>
                                            <p class="stat-label">Overall Rating</p>
                                        </div>
                                        ` : ''}
                                        ${rev.selfScore ? `
                                        <div class="text-center">
                                            <p class="stat-value text-lg text-indigo-600">${rev.selfScore}<span class="text-xs text-indigo-200">/5</span></p>
                                            <p class="stat-label text-indigo-400">Self Score</p>
                                        </div>
                                        ` : ''}
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <div class="flex items-center gap-1.5 mb-2">
                                            <span class="material-symbols-outlined text-sm text-indigo-500">person_search</span>
                                            <p class="stat-label">Self Evaluation</p>
                                        </div>
                                        <div class="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100/50 text-xs text-slate-700 italic leading-relaxed">
                                            ${rev.selfFeedback || 'Awaiting employee self-appraisal submission...'}
                                        </div>
                                    </div>
                                    <div>
                                        <div class="flex items-center gap-1.5 mb-2">
                                            <span class="material-symbols-outlined text-sm text-emerald-500">verified_user</span>
                                            <p class="stat-label">Manager Assessment</p>
                                        </div>
                                        <div class="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/50 text-xs text-slate-700 italic leading-relaxed">
                                            ${rev.feedback || 'Awaiting manager evaluation and task scoring...'}
                                        </div>
                                    </div>
                                </div>

                                ${isHR && rev.status === 'Pending HR' ? `
                                <div class="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                    <button onclick="window.finalizeReview('${rev.id}')" class="btn-primary bg-emerald-600 hover:bg-emerald-700">
                                        <span class="material-symbols-outlined text-sm">fact_check</span>
                                        Finalize & Publish
                                    </button>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Side Panel: Action Center -->
                <div class="col-span-4 space-y-4">
                    ${isEmployee && !reviews.find(r => r.empId === user.empId && r.period === 'Q1 2026') ? `
                    <div class="bg-indigo-600 text-white rounded-xl p-5 shadow-lg shadow-indigo-600/20">
                        <h3 class="text-sm font-black uppercase tracking-tight mb-1">Self Appraisal</h3>
                        <p class="text-indigo-100 text-[10px] font-bold leading-relaxed mb-4">Submit your appraisal for the current cycle.</p>

                        <form onsubmit="window.submitSelfAppraisal(event)" class="space-y-3">
                            <input type="hidden" name="period" value="Q1 2026">
                            <div>
                                <label class="block text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Self Rating (1-5)</label>
                                <input type="number" name="selfScore" min="1" max="5" step="0.5" required class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs focus:bg-white focus:text-slate-900 outline-none transition-all placeholder:text-white/40" placeholder="e.g. 4.0">
                            </div>
                            <div>
                                <label class="block text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Growth Summary</label>
                                <textarea name="selfFeedback" rows="3" required class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs focus:bg-white focus:text-slate-900 outline-none transition-all placeholder:text-white/40 resize-none" placeholder="What were your key achievements?"></textarea>
                            </div>
                            <button type="submit" class="w-full py-2 bg-white text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all">Submit Appraisal</button>
                        </form>
                    </div>
                    ` : ''}

                    ${isManager ? `
                    <div class="card p-4">
                        <h3 class="card-title mb-3 flex items-center gap-2">
                            <span class="material-symbols-outlined text-accent text-sm">edit_note</span>
                            Manager Review
                        </h3>

                        <form onsubmit="window.submitReview(event)" class="space-y-3">
                            <div class="form-row">
                                <label class="form-label">Select Team Member</label>
                                <select name="empId" required class="form-input">
                                    <option value="" disabled selected>Choose Employee</option>
                                    ${directReports.map(dr => `<option value="${dr.empId}">${dr.empName}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-row">
                                <label class="form-label">Review Cycle</label>
                                <select name="period" class="form-input">
                                    <option value="Q1 2026">Q1 2026</option>
                                    <option value="Annual 2025">Annual 2025</option>
                                </select>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="form-row">
                                    <label class="form-label">Task Score</label>
                                    <input type="number" name="taskScore" min="1" max="10" step="0.1" required class="form-input" placeholder="0.0">
                                </div>
                                <div class="form-row">
                                    <label class="form-label">Overall Rating</label>
                                    <input type="number" name="rating" min="1" max="5" step="0.5" required class="form-input" placeholder="0.0">
                                </div>
                            </div>
                            <div class="form-row">
                                <label class="form-label">Manager Feedback</label>
                                <textarea name="feedback" rows="3" required class="form-input resize-none" placeholder="Provide constructive assessment..."></textarea>
                            </div>
                            <button type="submit" class="btn-primary w-full justify-center">Submit to HR</button>
                        </form>
                    </div>
                    ` : ''}

                    <!-- Stats Card -->
                    <div class="stat-tile">
                        <div class="stat-strip bg-slate-900"></div>
                        <p class="stat-label ml-1">Cycle Performance</p>
                        <div class="space-y-2 ml-1">
                            <div class="flex justify-between items-end">
                                <span class="stat-value">84%</span>
                                <span class="text-[10px] font-black text-emerald-500 uppercase">Excellent</span>
                            </div>
                            <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div class="h-full bg-slate-900 rounded-full" style="width: 84%"></div>
                            </div>
                            <p class="form-hint">Aggregate performance index across all institutional departments.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
