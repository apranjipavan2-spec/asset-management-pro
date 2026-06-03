// Team / Program Dashboard.
// Same page is used by managers (auto-scoped to their own program) and by
// superadmin / director / hr (program dropdown — pick any, or "All programs").
// Data comes from GET /api/manager/dashboard?program=… (see server.js).
//
// Charts: ApexCharts (loaded from CDN in index.html). If the lib hasn't
// loaded yet we degrade gracefully — tiles + table still render.
// PDF: html2pdf clones the dashboard root + serialised tile/chart values.

import { PROGRAMS, PROGRAM_BY_ID, programLabel } from '../data/programs.js';

const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('amp_token')}`
});

window.tdState = window.tdState || {
    data: null,
    loading: false,
    error: '',
    program: '',            // '' = all programs (only elevated roles)
    userRole: '',
    userProgram: '',
    canPickProgram: false,
    chartsMounted: false
};

const stOf = () => window.tdState;

function canPickProgram(role) {
    return ['superadmin', 'director', 'hr'].includes(role);
}

async function fetchDashboard() {
    const st = stOf();
    st.loading = true;
    st.error = '';
    paintShell();
    try {
        const qs = st.program ? `?program=${encodeURIComponent(st.program)}` : '';
        const res = await fetch(`/api/manager/dashboard${qs}`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        st.data = await res.json();
        // Manager scoping: server returns the program it used; sync to local state
        if (!st.canPickProgram && st.data?.program) st.program = st.data.program;
    } catch (e) {
        st.error = e.message;
    } finally {
        st.loading = false;
        paintShell();
        mountCharts();
    }
}

window.tdSetProgram = (val) => {
    stOf().program = val || '';
    fetchDashboard();
};

window.tdRefresh = () => fetchDashboard();

// ── Layout helpers ────────────────────────────────────────────────────
const fmtNum = (n) => (Number(n) || 0).toLocaleString('en-IN');
const fmtINR = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

function renderProgramSelect() {
    const st = stOf();
    if (!st.canPickProgram) {
        const label = st.program ? programLabel(st.program) : '— unassigned —';
        return `
            <div class="td-program-pill">
                <span class="material-symbols-outlined text-[16px] text-slate-400">workspaces</span>
                <span class="text-[10px] uppercase tracking-widest font-bold text-slate-500">Program</span>
                <span class="text-xs font-bold text-slate-800">${label}</span>
            </div>`;
    }
    const opts = [`<option value="" ${!st.program ? 'selected' : ''}>All programs (organisation-wide)</option>`]
        .concat(PROGRAMS.map(p => `<option value="${p.id}" ${st.program === p.id ? 'selected' : ''}>${p.label}</option>`))
        .join('');
    return `
        <label class="td-program-pill" title="Filter by program">
            <span class="material-symbols-outlined text-[16px] text-slate-400">workspaces</span>
            <span class="text-[10px] uppercase tracking-widest font-bold text-slate-500">Program</span>
            <select onchange="tdSetProgram(this.value)" class="td-program-select">${opts}</select>
        </label>`;
}

function tile(color, label, value, hint) {
    return `
        <div class="td-tile">
            <span class="td-tile__strip ${color}"></span>
            <div class="td-tile__label">${label}</div>
            <div class="td-tile__value">${value}</div>
            <div class="td-tile__hint">${hint || '&nbsp;'}</div>
        </div>`;
}

function renderProgramBrief() {
    const st = stOf();
    const pid = st.data?.program || st.program;
    if (!pid) return '';
    const p = PROGRAM_BY_ID[pid];
    if (!p) return '';
    const s = p.stats || {};
    const metrics = (s.keyMetrics || []).map(m => `
        <div class="td-brief__metric">
            <div class="td-brief__metric-value">${fmtNum(m.value)}</div>
            <div class="td-brief__metric-label">${esc(m.label)}</div>
        </div>`).join('');
    const headline = s.beneficiaries != null
        ? `<div class="td-brief__headline">
                <div class="td-brief__headline-value">${fmtNum(s.beneficiaries)}</div>
                <div class="td-brief__headline-label">${esc(s.beneficiariesLabel || 'beneficiaries')}</div>
           </div>`
        : `<div class="td-brief__headline td-brief__headline--muted">
                <div class="td-brief__headline-value">—</div>
                <div class="td-brief__headline-label">${esc(s.beneficiariesLabel || 'on demand')}</div>
           </div>`;
    return `
        <section class="td-brief">
            <div class="td-brief__top">
                <div>
                    <div class="td-brief__eyebrow">Program Brief · ${esc(p.period || '')}</div>
                    <div class="td-brief__title">${esc(p.label)} <span class="td-brief__short">${esc(p.short)}</span></div>
                    <div class="td-brief__meta">
                        ${p.donor   ? `<span><span class="material-symbols-outlined text-[14px]">handshake</span> ${esc(p.donor)}</span>` : ''}
                        ${p.region  ? `<span><span class="material-symbols-outlined text-[14px]">location_on</span> ${esc(p.region)}</span>` : ''}
                    </div>
                </div>
                ${headline}
            </div>
            ${p.description ? `<p class="td-brief__desc">${esc(p.description)}</p>` : ''}
            ${metrics ? `<div class="td-brief__metrics">${metrics}</div>` : ''}
        </section>`;
}

function renderTiles() {
    const t = stOf().data?.tiles;
    if (!t) return '<div class="td-empty">No data yet.</div>';
    return `
        <section class="td-tiles">
            ${tile('bg-slate-900',   'Team Size',         fmtNum(t.headcount),                t.headcount === 1 ? '1 member' : `${t.headcount} members`)}
            ${tile('bg-emerald-500', 'Tasks Done',        `${t.tasks.completionPct}%`,        `${fmtNum(t.tasks.completed)} of ${fmtNum(t.tasks.total)}`)}
            ${tile('bg-rose-500',    'Overdue Tasks',     fmtNum(t.tasks.overdue),            t.tasks.overdue ? 'Needs attention' : 'On track')}
            ${tile('bg-amber-500',   'Leaves Pending',    fmtNum(t.leaves.pending),           `${fmtNum(t.leaves.daysTaken)} days approved (YTD)`)}
            ${tile('bg-blue-500',    'Reimb Pending',     fmtNum(t.reimb.pending + t.reimb.approved), fmtINR(t.reimb.pendingAmt) + ' awaiting payout')}
            ${tile('bg-violet-500',  'Worklog Hours',     fmtNum(t.worklogHoursMonth),        `${fmtNum(t.worklogEntriesMonth)} entries · this month`)}
            ${tile('bg-cyan-500',    'Attendance',        `${t.attendancePct}%`,              `${fmtNum(t.attendanceDaysSampled)} days · last 30d`)}
            ${tile('bg-indigo-500',  'Avg Score',         t.avgScore || '—',                  `${fmtNum(t.perfReviewed)} reviewed`)}
        </section>`;
}

function renderChartCards() {
    const t = stOf().data?.tiles;
    if (!t) return '';
    return `
        <section class="td-charts">
            <div class="td-card">
                <div class="td-card__head"><span>Task status</span><span class="td-card__hint">${fmtNum(t.tasks.total)} tasks</span></div>
                <div id="td-chart-tasks" class="td-chart"></div>
            </div>
            <div class="td-card">
                <div class="td-card__head"><span>Worklog hours · last 6 months</span></div>
                <div id="td-chart-worklog" class="td-chart"></div>
            </div>
            <div class="td-card">
                <div class="td-card__head"><span>Reimbursement pipeline</span><span class="td-card__hint">${fmtINR(t.reimb.paidAmt)} paid YTD</span></div>
                <div id="td-chart-reimb" class="td-chart"></div>
            </div>
        </section>`;
}

function renderTeamTable() {
    const team = stOf().data?.team || [];
    if (!team.length) return `
        <section class="td-card">
            <div class="td-card__head"><span>Team members</span></div>
            <div class="p-10 text-center text-sm text-slate-500">
                No team members in this scope. ${stOf().canPickProgram ? 'Pick a program or assign users to one.' : 'Ask HR to assign your team members to a program.'}
            </div>
        </section>`;
    const rows = team.map(m => `
        <tr>
            <td>
                <div class="font-semibold text-slate-800">${esc(m.name)}</div>
                <div class="text-[11px] text-slate-500">${esc(m.designation || m.role)}${m.department ? ' · ' + esc(m.department) : ''}</div>
            </td>
            <td class="text-xs text-slate-600">${esc(m.program ? programLabel(m.program) : '—')}</td>
            <td>
                <div class="flex items-center gap-2">
                    <div class="td-bar"><div class="td-bar__fill" style="width:${m.tasksPct}%"></div></div>
                    <span class="text-[11px] font-mono text-slate-600 whitespace-nowrap">${m.tasksDone}/${m.tasksTotal}</span>
                </div>
            </td>
            <td class="text-right font-mono text-xs text-slate-700">${m.hoursThisMonth}</td>
            <td class="text-right">${m.score != null ? `<span class="td-badge td-badge--score">${m.score}</span>` : '<span class="text-slate-300">—</span>'}</td>
        </tr>`).join('');
    return `
        <section class="td-card">
            <div class="td-card__head">
                <span>Team members</span>
                <span class="td-card__hint">${team.length} ${team.length === 1 ? 'member' : 'members'} · sorted by task completion %</span>
            </div>
            <div class="overflow-x-auto">
                <table class="td-table">
                    <thead>
                        <tr>
                            <th>Member</th>
                            <th>Program</th>
                            <th>Tasks (done/total)</th>
                            <th class="text-right">Hours (mo)</th>
                            <th class="text-right">Score</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </section>`;
}

function paintShell() {
    const root = document.getElementById('td-root');
    if (!root) return;
    const st = stOf();
    const generated = st.data?.generatedAt ? new Date(st.data.generatedAt).toLocaleString() : '—';
    const scopeLabel = st.data?.scope === 'org'    ? 'Organisation-wide'
                     : st.data?.scope === 'program' ? programLabel(st.data.program)
                     : 'My team';
    root.innerHTML = `
        <div class="td-page" id="td-printable">
            <header class="td-header">
                <div>
                    <h1 class="td-header__title">Team Dashboard</h1>
                    <p class="td-header__sub">${scopeLabel} · Generated ${generated}</p>
                </div>
                <div class="td-header__actions">
                    ${renderProgramSelect()}
                    <button onclick="tdRefresh()" class="td-btn td-btn--ghost" ${st.loading ? 'disabled' : ''}>
                        <span class="material-symbols-outlined text-[14px] ${st.loading ? 'td-spin' : ''}">refresh</span> Refresh
                    </button>
                    <button onclick="tdExportPdf()" class="td-btn td-btn--primary pdf-export-btn" ${st.loading || !st.data ? 'disabled' : ''}>
                        <span class="material-symbols-outlined text-[14px]">picture_as_pdf</span> Export PDF
                    </button>
                </div>
            </header>
            ${st.error ? `<div class="td-error">⚠ ${esc(st.error)}</div>` : ''}
            ${st.loading && !st.data ? renderSkeleton() : `
                ${renderProgramBrief()}
                ${renderTiles()}
                ${renderChartCards()}
                ${renderTeamTable()}
            `}
        </div>`;
}

function renderSkeleton() {
    return `
        <div class="td-skeleton">
            ${Array.from({ length: 8 }).map(() => '<div class="td-skeleton__tile"></div>').join('')}
        </div>
        <div class="td-skeleton__chart"></div>`;
}

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Charts ────────────────────────────────────────────────────────────
let _chartRefs = { tasks: null, worklog: null, reimb: null };

function mountCharts() {
    const st = stOf();
    if (!st.data || typeof ApexCharts === 'undefined') return;
    // Destroy prior instances so re-render doesn't leak
    Object.values(_chartRefs).forEach(c => { try { c?.destroy(); } catch {} });
    _chartRefs = { tasks: null, worklog: null, reimb: null };

    const c = st.data.charts;
    // Task status donut
    const taskEl = document.getElementById('td-chart-tasks');
    if (taskEl) {
        _chartRefs.tasks = new ApexCharts(taskEl, {
            chart: { type: 'donut', height: 240, fontFamily: 'inherit' },
            series: c.taskStatus.map(x => x.value),
            labels: c.taskStatus.map(x => x.label),
            colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
            legend: { position: 'bottom', fontSize: '11px' },
            dataLabels: { enabled: true, formatter: (v) => Math.round(v) + '%' },
            plotOptions: { pie: { donut: { size: '62%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '11px' } } } } }
        });
        _chartRefs.tasks.render();
    }
    // Worklog 6-month line
    const wlEl = document.getElementById('td-chart-worklog');
    if (wlEl) {
        _chartRefs.worklog = new ApexCharts(wlEl, {
            chart: { type: 'area', height: 240, fontFamily: 'inherit', toolbar: { show: false } },
            series: [{ name: 'Hours', data: c.worklogTrend.map(p => p.hours) }],
            xaxis: { categories: c.worklogTrend.map(p => p.month), labels: { style: { fontSize: '10px' } } },
            colors: ['#6366f1'],
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05 } },
            dataLabels: { enabled: false },
            grid: { borderColor: '#e2e8f0', strokeDashArray: 4 }
        });
        _chartRefs.worklog.render();
    }
    // Reimb pipeline bar
    const rbEl = document.getElementById('td-chart-reimb');
    if (rbEl) {
        _chartRefs.reimb = new ApexCharts(rbEl, {
            chart: { type: 'bar', height: 240, fontFamily: 'inherit', toolbar: { show: false } },
            series: [{ name: 'Count', data: c.reimbPipeline.map(p => p.value) }],
            xaxis: { categories: c.reimbPipeline.map(p => p.label), labels: { style: { fontSize: '10px' } } },
            colors: ['#0ea5e9'],
            plotOptions: { bar: { borderRadius: 6, columnWidth: '55%', distributed: true } },
            dataLabels: { enabled: true, style: { fontSize: '10px', colors: ['#0f172a'] }, offsetY: -16 },
            grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
            legend: { show: false }
        });
        _chartRefs.reimb.render();
    }
}

// ── PDF Export ────────────────────────────────────────────────────────
window.tdExportPdf = () => {
    const st = stOf();
    if (!st.data || typeof html2pdf === 'undefined') {
        alert('PDF library still loading. Try again in a moment.');
        return;
    }
    const t = st.data.tiles;
    const scopeLabel = st.data.scope === 'org' ? 'Organisation-wide'
                     : st.data.scope === 'program' ? programLabel(st.data.program)
                     : 'My team';
    const generated = new Date(st.data.generatedAt).toLocaleString();
    const pid = st.data.program || st.program;
    const p = pid ? PROGRAM_BY_ID[pid] : null;
    const briefPdf = p ? `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0f172a;padding:14px 16px;margin-bottom:18px;border-radius:6px">
            <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:0.12em;text-transform:uppercase">Program Brief · ${esc(p.period || '')}</div>
            <div style="font-size:15px;font-weight:800;margin-top:4px">${esc(p.label)} <span style="color:#64748b;font-weight:600;font-size:11px">(${esc(p.short)})</span></div>
            <div style="font-size:10px;color:#475569;margin-top:4px">
                ${p.donor  ? `<b>Donor:</b> ${esc(p.donor)} &nbsp;·&nbsp;` : ''}
                ${p.region ? `<b>Region:</b> ${esc(p.region)}` : ''}
            </div>
            ${p.description ? `<div style="font-size:10.5px;color:#334155;margin-top:8px;line-height:1.5">${esc(p.description)}</div>` : ''}
            ${(p.stats?.beneficiaries != null || p.stats?.keyMetrics?.length) ? `
                <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;font-size:10px">
                    ${p.stats.beneficiaries != null ? `<div><b style="font-size:13px">${fmtNum(p.stats.beneficiaries)}</b> <span style="color:#64748b">${esc(p.stats.beneficiariesLabel || '')}</span></div>` : ''}
                    ${(p.stats.keyMetrics || []).map(m => `<div><b>${fmtNum(m.value)}</b> <span style="color:#64748b">${esc(m.label)}</span></div>`).join('')}
                </div>` : ''}
        </div>` : '';
    // Build a print-friendly clone — tiles + simple table. Charts are skipped
    // for the "basic details" PDF as agreed (charts are interactive in-page only).
    const html = `
        <div style="font-family:Inter,Manrope,Arial,sans-serif;color:#0f172a;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:end;border-bottom:3px solid #0f172a;padding-bottom:12px;margin-bottom:18px;">
                <div>
                    <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px">Team Dashboard</div>
                    <div style="font-size:11px;color:#64748b;margin-top:4px">${scopeLabel} · Generated ${generated}</div>
                </div>
                <div style="font-size:10px;color:#64748b;text-align:right">Kalike Asset Management<br/>By ${esc(st.data.generatedBy || '')}</div>
            </div>
            ${briefPdf}
            <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:18px">
                ${pdfRow('Team size', fmtNum(t.headcount))}
                ${pdfRow('Tasks done', `${t.tasks.completed} of ${t.tasks.total}  (${t.tasks.completionPct}%)`)}
                ${pdfRow('Overdue tasks', fmtNum(t.tasks.overdue))}
                ${pdfRow('Leaves pending', fmtNum(t.leaves.pending))}
                ${pdfRow('Leaves approved (YTD days)', fmtNum(t.leaves.daysTaken))}
                ${pdfRow('Reimbursements pending', `${fmtNum(t.reimb.pending + t.reimb.approved)} (${fmtINR(t.reimb.pendingAmt)})`)}
                ${pdfRow('Reimbursements paid YTD', `${fmtNum(t.reimb.paid)} (${fmtINR(t.reimb.paidAmt)})`)}
                ${pdfRow('Worklog hours (this month)', fmtNum(t.worklogHoursMonth))}
                ${pdfRow('Attendance (last 30d)', `${t.attendancePct}%`)}
                ${pdfRow('Avg performance score', `${t.avgScore || '—'}  (${fmtNum(t.perfReviewed)} reviewed)`)}
                ${pdfRow('Assets assigned', fmtNum(t.assets))}
            </table>
            <div style="font-size:11px;font-weight:700;margin-bottom:6px;color:#475569;letter-spacing:0.08em;text-transform:uppercase">Team Members</div>
            <table style="width:100%;border-collapse:collapse;font-size:10px">
                <thead>
                    <tr style="background:#f1f5f9">
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #cbd5e1">Member</th>
                        <th style="text-align:left;padding:6px 8px;border-bottom:1px solid #cbd5e1">Program</th>
                        <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #cbd5e1">Tasks</th>
                        <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #cbd5e1">Hours</th>
                        <th style="text-align:right;padding:6px 8px;border-bottom:1px solid #cbd5e1">Score</th>
                    </tr>
                </thead>
                <tbody>
                    ${(st.data.team || []).map(m => `
                        <tr>
                            <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0">${esc(m.name)} <span style="color:#94a3b8">${esc(m.designation || m.role)}</span></td>
                            <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0">${esc(m.program ? programLabel(m.program) : '—')}</td>
                            <td style="text-align:right;padding:5px 8px;border-bottom:1px solid #e2e8f0">${m.tasksDone}/${m.tasksTotal} (${m.tasksPct}%)</td>
                            <td style="text-align:right;padding:5px 8px;border-bottom:1px solid #e2e8f0">${m.hoursThisMonth}</td>
                            <td style="text-align:right;padding:5px 8px;border-bottom:1px solid #e2e8f0">${m.score != null ? m.score : '—'}</td>
                        </tr>`).join('')}
                </tbody>
            </table>
        </div>`;
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white';
    container.innerHTML = html;
    document.body.appendChild(container);
    const filename = `TeamDashboard_${(st.data.program || 'all')}_${new Date().toISOString().slice(0,10)}.pdf`;
    html2pdf().set({
        margin: 0.4,
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    }).from(container).save().then(() => container.remove()).catch(err => {
        console.error('PDF export failed:', err);
        container.remove();
        alert('Could not generate the PDF. Please try again.');
    });
};

function pdfRow(label, value) {
    return `
        <tr>
            <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;width:55%;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">${label}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e2e8f0;font-weight:700">${value}</td>
        </tr>`;
}

// ── Entry point ──────────────────────────────────────────────────────
export async function renderTeamDashboard(user) {
    const st = stOf();
    st.userRole = user?.role || '';
    st.userProgram = user?.program || '';
    st.canPickProgram = canPickProgram(st.userRole);
    if (!st.canPickProgram && !st.program && st.userProgram) st.program = st.userProgram;

    // Kick off fetch after returning the shell so the page mounts immediately.
    queueMicrotask(() => fetchDashboard());

    return `<div id="td-root" class="td-mount"><div class="p-10 text-center text-sm text-slate-500">Loading dashboard…</div></div>`;
}
