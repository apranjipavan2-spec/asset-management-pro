import { db } from '../mock/db.js';

export function renderAnnouncementsPage(user) {
    const isManager = window.app.hasPermission('all') || window.app.hasPermission('manage_users');
    const announcements = db.announcements || [];
    const reads = db.announcementReads || [];

    setTimeout(() => {
        const form = document.getElementById('new-announcement-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                db.addAnnouncement({
                    title: document.getElementById('ann-title').value,
                    content: document.getElementById('ann-content').value,
                    priority: document.getElementById('ann-priority').value,
                    authorId: user.empId,
                    authorName: user.name
                });
                app.renderContent();
            });
        }
    }, 100);

    const markRead = (id) => {
        db.markAnnouncementRead(id, user.empId);
        app.renderContent();
    };

    window.markAnnRead = markRead; // Make it global for inline handlers

    return `
        <div class="w-full space-y-4 fade-in">
            <!-- Header -->
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
                    <span class="material-symbols-outlined text-xl">campaign</span>
                </div>
                <div>
                    <h1 class="page-title">Company Board</h1>
                    <p class="page-subtitle">Official Announcements</p>
                </div>
            </div>

            <div class="flex gap-4 flex-1 min-h-0">
                <!-- Feed -->
                <div class="flex-1 card flex flex-col overflow-hidden">
                    <div class="card-header">
                        <h2 class="card-title flex items-center gap-2">
                            <span class="material-symbols-outlined text-slate-400 text-sm">forum</span>
                            Live Feed
                        </h2>
                    </div>
                    <div class="p-4 overflow-y-auto flex-1 space-y-4">
                        ${announcements.length === 0 ? `
                            <div class="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                                <span class="material-symbols-outlined text-5xl opacity-50">notifications_off</span>
                                <p class="text-sm font-medium uppercase tracking-widest">No announcements yet</p>
                            </div>
                        ` : announcements.map(ann => {
                            const isRead = reads.some(r => r.announcementId === ann.id && r.empId === user.empId);
                            const prioColor = ann.priority === 'High' ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-blue-600 bg-blue-50 border-blue-100';
                            
                            return `
                            <div class="p-5 rounded-2xl border ${isRead ? 'border-slate-100 bg-slate-50/50 opacity-75' : 'border-blue-200 bg-white shadow-sm'} transition-all relative">
                                ${!isRead ? `<div class="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-ping"></div><div class="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full"></div>` : ''}
                                
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="px-2 py-0.5 rounded-md border ${prioColor} text-[9px] font-black uppercase tracking-widest">${ann.priority} Priority</span>
                                            <span class="text-[10px] text-slate-400 font-bold tracking-wider">${new Date(ann.createdAt).toLocaleString()}</span>
                                        </div>
                                        <h3 class="text-lg font-black text-slate-800 tracking-tight">${ann.title}</h3>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-xs font-bold text-slate-700">${ann.authorName}</p>
                                    </div>
                                </div>
                                
                                <div class="text-sm text-slate-600 leading-relaxed mb-4">
                                    ${ann.content}
                                </div>
                                
                                <div class="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <div class="flex items-center gap-2">
                                        ${isManager ? `
                                            <div class="flex -space-x-2">
                                                <div class="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-500" title="Read by ${reads.filter(r => r.announcementId === ann.id).length} users">
                                                    ${reads.filter(r => r.announcementId === ann.id).length}
                                                </div>
                                            </div>
                                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Read Receipts</span>
                                        ` : ''}
                                    </div>
                                    ${!isRead ? `
                                        <button onclick="window.markAnnRead('${ann.id}')" class="btn-primary bg-blue-600 hover:bg-blue-700">
                                            <span class="material-symbols-outlined text-sm">done_all</span>
                                            Mark as Read
                                        </button>
                                    ` : `
                                        <span class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                            <span class="material-symbols-outlined text-sm">check_circle</span> Acknowledged
                                        </span>
                                    `}
                                </div>
                            </div>
                        `}).join('')}
                    </div>
                </div>

                <!-- Admin Panel -->
                ${isManager ? `
                <div class="w-80 card p-4 flex flex-col shrink-0">
                    <h2 class="card-title mb-4 flex items-center gap-2">
                        <span class="material-symbols-outlined text-accent text-sm">edit_note</span>
                        Broadcast Message
                    </h2>

                    <form id="new-announcement-form" class="space-y-3">
                        <div class="form-row">
                            <label class="form-label">Subject</label>
                            <input type="text" id="ann-title" required class="form-input" placeholder="Announcement subject...">
                        </div>
                        <div class="form-row">
                            <label class="form-label">Priority</label>
                            <select id="ann-priority" class="form-input">
                                <option value="Normal">Normal Priority</option>
                                <option value="High">High Priority</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label class="form-label">Message Body</label>
                            <textarea id="ann-content" required rows="3" class="form-input resize-none" placeholder="Type your message here..."></textarea>
                        </div>

                        <button type="submit" class="btn-primary w-full justify-center">
                            <span class="material-symbols-outlined text-sm">send</span>
                            Broadcast
                        </button>
                    </form>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}
