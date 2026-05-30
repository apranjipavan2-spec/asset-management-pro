import { db } from '../mock/db.js';

export function renderCalendarPage(user) {
    const isManager = user.role === 'manager' || user.role === 'finance';
    const events = db.calendarEvents || [];

    // Mock initial events if empty
    if (events.length === 0) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        db.addCalendarEvent({
            title: "Q3 Strategy Meeting",
            description: "All-hands meeting to discuss Q3 goals.",
            date: tomorrow.toISOString().split('T')[0],
            type: "Meeting",
            creatorId: "admin"
        });
    }

    setTimeout(() => {
        const form = document.getElementById('new-event-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                db.addCalendarEvent({
                    title: document.getElementById('evt-title').value,
                    description: document.getElementById('evt-desc').value,
                    date: document.getElementById('evt-date').value,
                    type: document.getElementById('evt-type').value,
                    creatorId: user.empId
                });
                app.renderContent();
            });
        }
    }, 100);

    const typeColor = (type) => {
        if (type === 'Holiday') return 'text-rose-600 bg-rose-50 border-rose-200';
        if (type === 'Event') return 'text-purple-600 bg-purple-50 border-purple-200';
        if (type === 'Deadline') return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-blue-600 bg-blue-50 border-blue-200'; // Meeting
    };

    return `
        <div class="page page-narrow space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <header>
                <h2 class="page-title">Organizational Calendar</h2>
                <p class="page-subtitle">Shared Schedules & Deadlines</p>
            </header>

            <div class="grid grid-cols-1 ${isManager ? 'lg:grid-cols-[1fr_320px]' : ''} gap-3 items-start">
                <!-- Upcoming Events List -->
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-slate-400 text-base">event_upcoming</span>
                            Upcoming Agenda
                        </h3>
                        <span class="card-meta">${events.length} event${events.length === 1 ? '' : 's'}</span>
                    </div>
                    <div class="divide-y divide-slate-100 max-h-[520px] overflow-y-auto scroll-container">
                        ${events.length === 0 ? `
                            <div class="px-4 py-10 text-center text-slate-400 flex flex-col items-center gap-2">
                                <span class="material-symbols-outlined text-3xl opacity-50">event_busy</span>
                                <p class="text-[10px] font-bold uppercase tracking-widest">No upcoming events</p>
                            </div>
                        ` : events.sort((a,b) => new Date(a.date) - new Date(b.date)).map(evt => `
                            <div class="px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50/60 transition-colors">
                                <div class="w-11 h-11 rounded-md flex flex-col items-center justify-center border border-slate-200 bg-slate-50 shrink-0">
                                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">${new Date(evt.date).toLocaleString('default', { month: 'short' })}</span>
                                    <span class="text-base font-black text-slate-800 leading-tight mt-0.5">${new Date(evt.date).getDate()}</span>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-0.5">
                                        <span class="px-1.5 py-0.5 rounded border ${typeColor(evt.type)} text-[8px] font-black uppercase tracking-widest">${evt.type}</span>
                                    </div>
                                    <p class="text-[12px] font-black text-slate-900 truncate">${evt.title}</p>
                                    <p class="text-[10px] text-slate-500 truncate mt-0.5">${evt.description || '—'}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Add Event Panel -->
                ${isManager ? `
                <div class="card p-0">
                    <div class="card-header">
                        <h3 class="card-title flex items-center gap-1.5">
                            <span class="material-symbols-outlined text-accent text-base">edit_calendar</span>
                            Schedule Event
                        </h3>
                    </div>
                    <form id="new-event-form" class="p-3 space-y-3">
                        <div class="form-row">
                            <label class="form-label">Event Title</label>
                            <input type="text" id="evt-title" required class="form-input" placeholder="E.g. Diwali Holiday">
                        </div>
                        <div class="form-row">
                            <label class="form-label">Date</label>
                            <input type="date" id="evt-date" required class="form-input">
                        </div>
                        <div class="form-row">
                            <label class="form-label">Event Type</label>
                            <select id="evt-type" class="form-input">
                                <option value="Meeting">Meeting</option>
                                <option value="Holiday">Holiday</option>
                                <option value="Deadline">Deadline</option>
                                <option value="Event">General Event</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <label class="form-label">Description</label>
                            <textarea id="evt-desc" rows="3" class="form-input resize-none" placeholder="Details..."></textarea>
                        </div>
                        <button type="submit" class="btn-primary w-full">
                            <span class="material-symbols-outlined text-sm">add</span>
                            Add to Calendar
                        </button>
                    </form>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}
