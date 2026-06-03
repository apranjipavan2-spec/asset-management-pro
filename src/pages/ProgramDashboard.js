// Program Dashboard.
// Scheme-wise read-only view of Kalike's initiatives, achievements and reach.
// Data is loaded from the server (superadmin overrides merged with bundled
// defaults from src/data/programs.js + src/data/program_initiatives.js).

import { loadProgramData, getDefaultProgramData, invalidateProgramCache } from '../data/program_runtime.js';

window.pdState = window.pdState || {
    program: '',
    data: null,
    loading: false,
    userRole: '',
    lockedProgram: '',  // For managers — restricts view to a single program id.
    view: 'list'        // 'list' = tile grid, 'detail' = full program view.
};

const stOf = () => window.pdState;

window.pdSetProgram = (val) => {
    const st = stOf();
    if (st.lockedProgram) return;   // Managers can't switch programs.
    st.program = val || '';
    paintShell();
};

window.pdSelectProgram = (id) => {
    const st = stOf();
    st.program = id;
    st.view = 'detail';
    paintShell();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.pdBackToList = () => {
    const st = stOf();
    if (st.lockedProgram) return;
    st.view = 'list';
    paintShell();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.pdReloadDashboard = async () => {
    invalidateProgramCache();
    stOf().data = await loadProgramData(true);
    paintShell();
};

window.pdOpenEditor = async () => {
    const mod = await import('./components/ProgramDataEditor.js');
    const st = stOf();
    mod.openProgramDataEditor({
        programs: st.data.programs,
        initiatives: st.data.initiatives,
        currentId: st.program || st.data.programs[0]?.id
    });
};

window.pdExportPdf = () => {
    const st = stOf();
    const data = st.data || getDefaultProgramData();
    // Locked managers export their one program. Detail view exports current.
    // List view exports all programs.
    let programs;
    if (st.lockedProgram) {
        programs = data.programs.filter(p => p.id === st.lockedProgram);
    } else if (st.view === 'detail' && st.program) {
        programs = data.programs.filter(p => p.id === st.program);
    } else {
        programs = data.programs;
    }
    if (!programs.length) return;

    const meta = data.meta || {};
    const metaLine = meta.updatedAt
        ? `Last edited ${new Date(meta.updatedAt).toLocaleString()}`
        : 'Source: Kalike Annual Report 2024-25';

    const pages = programs.map(program => {
        const ini = data.initiatives[program.id];
        return `
            <section class="pd-print__page">
                ${renderHero(program, ini)}
                ${renderKPIs(ini)}
                ${renderReach(ini)}
                ${renderInitiatives(ini)}
            </section>`;
    }).join('');

    const container = document.createElement('div');
    container.id = 'pd-print-root';
    container.innerHTML = `
        <div class="pd-print__cover">
            <div class="pd-print__brand">Kalike — Program Dashboard</div>
            <div class="pd-print__title">Program Achievements Report</div>
            <div class="pd-print__sub">${metaLine}</div>
            <div class="pd-print__sub">${programs.length} programme${programs.length === 1 ? '' : 's'} · Exported ${new Date().toLocaleDateString()}</div>
        </div>
        ${pages}`;
    document.body.appendChild(container);

    const cleanup = () => {
        container.remove();
        window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    // Give the browser a tick to lay out the print container before invoking print.
    setTimeout(() => window.print(), 50);
};

const fmtNum = (n) => {
    if (n == null) return '—';
    if (typeof n === 'string') return n;
    return Number(n).toLocaleString('en-IN');
};

const STATUS_STYLES = {
    active:    { bg: '#dcfce7', fg: '#166534', label: 'Active' },
    completed: { bg: '#dbeafe', fg: '#1e40af', label: 'Completed' },
    pilot:     { bg: '#fef3c7', fg: '#92400e', label: 'Pilot' },
    standby:   { bg: '#f1f5f9', fg: '#475569', label: 'Standby' }
};

const KPI_COLORS = {
    emerald: { strip: '#10b981', bg: '#ecfdf5', fg: '#047857' },
    blue:    { strip: '#3b82f6', bg: '#eff6ff', fg: '#1d4ed8' },
    amber:   { strip: '#f59e0b', bg: '#fffbeb', fg: '#b45309' },
    purple:  { strip: '#8b5cf6', bg: '#f5f3ff', fg: '#6d28d9' },
    rose:    { strip: '#f43f5e', bg: '#fff1f2', fg: '#be123c' },
    cyan:    { strip: '#06b6d4', bg: '#ecfeff', fg: '#0e7490' }
};

// Thematic grouping — sub-programmes within the same theme share one colour identity.
// Education (5) · Water (1) · Agriculture (2) · Livelihoods/Skills (3) · Media (1)
const PROGRAM_THEME_GROUPS = {
    'education':        'education',
    'ecd':              'education',
    'tksp':             'education',
    'tn-girls':         'education',
    'gp-libraries':     'education',
    'wash':             'water',
    'csa':              'agriculture',
    'agri-next':        'agriculture',
    'lambani':          'livelihoods',
    'micro-enterprise': 'livelihoods',
    'e3-skill':         'livelihoods',
    'crs':              'media'
};

// Each theme gets a gradient identity — strip + headline pill use the gradient,
// fg is the deep text colour, bgSoft is a tile-wide soft tint.
const THEME_GRADIENTS = {
    education:   { stripGrad: 'linear-gradient(180deg, #6366f1 0%, #2563eb 100%)',
                   bgGrad:    'linear-gradient(135deg, #eef2ff 0%, #dbeafe 100%)',
                   fg: '#1d4ed8', soft: 'rgba(99, 102, 241, 0.05)' },
    water:       { stripGrad: 'linear-gradient(180deg, #06b6d4 0%, #0e7490 100%)',
                   bgGrad:    'linear-gradient(135deg, #ecfeff 0%, #cffafe 100%)',
                   fg: '#0e7490', soft: 'rgba(6, 182, 212, 0.05)' },
    agriculture: { stripGrad: 'linear-gradient(180deg, #84cc16 0%, #15803d 100%)',
                   bgGrad:    'linear-gradient(135deg, #f7fee7 0%, #dcfce7 100%)',
                   fg: '#15803d', soft: 'rgba(34, 197, 94, 0.05)' },
    livelihoods: { stripGrad: 'linear-gradient(180deg, #f97316 0%, #c2410c 100%)',
                   bgGrad:    'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
                   fg: '#c2410c', soft: 'rgba(249, 115, 22, 0.05)' },
    media:       { stripGrad: 'linear-gradient(180deg, #ec4899 0%, #be185d 100%)',
                   bgGrad:    'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
                   fg: '#be185d', soft: 'rgba(236, 72, 153, 0.05)' }
};

const themeFor = (programId) => THEME_GRADIENTS[PROGRAM_THEME_GROUPS[programId]] || THEME_GRADIENTS.education;

function renderProgramSelect(programs) {
    const st = stOf();
    // Managers are locked to a single program — show a static badge instead of a switcher.
    if (st.lockedProgram) {
        const p = programs.find(x => x.id === st.lockedProgram) || programs[0];
        return `
            <div class="td-program-select td-program-select--locked" title="Locked to your assigned program">
                <span class="material-symbols-outlined text-[14px]">lock</span>
                ${p?.label || st.lockedProgram}
            </div>`;
    }
    // On list view, no switcher is needed (tiles do that job).
    if (st.view === 'list') return '';
    const opts = programs
        .map(p => `<option value="${p.id}" ${st.program === p.id ? 'selected' : ''}>${p.label}</option>`)
        .join('');
    return `
        <select class="td-program-select" onchange="pdSetProgram(this.value)">
            ${opts}
        </select>`;
}

function renderBackButton() {
    const st = stOf();
    if (st.lockedProgram || st.view !== 'detail') return '';
    return `
        <button class="td-btn td-btn--ghost pd-back" onclick="pdBackToList()" title="Back to all programmes">
            <span class="material-symbols-outlined text-[16px]">arrow_back</span>
            All Programmes
        </button>`;
}

function renderEditButton() {
    if (stOf().userRole !== 'superadmin') return '';
    return `
        <button class="td-btn td-btn--primary" onclick="pdOpenEditor()" title="Edit program data">
            <span class="material-symbols-outlined text-[16px]">edit</span>
            Edit Data
        </button>`;
}

function renderExportButton() {
    const st = stOf();
    const totalCount = st.data?.programs?.length || 0;
    if (!totalCount) return '';
    let label;
    if (st.lockedProgram || st.view === 'detail') {
        label = 'Export PDF';
    } else {
        label = `Export All (${totalCount})`;
    }
    return `
        <button class="td-btn td-btn--ghost pdf-export-btn" onclick="pdExportPdf()" title="Export to PDF via browser print">
            <span class="material-symbols-outlined text-[16px]">picture_as_pdf</span>
            ${label}
        </button>`;
}

function renderProgramTiles(programs, initiatives) {
    return `
        <div class="pd-tile-grid">
            ${programs.map(program => {
                const ini = initiatives[program.id];
                const theme = themeFor(program.id);
                const stats = program.stats || {};
                const headline = stats.beneficiaries != null ? fmtNum(stats.beneficiaries) : '—';
                const headlineLabel = stats.beneficiariesLabel || 'beneficiaries';
                const initCount = ini?.initiatives?.length || 0;
                return `
                    <button class="pd-tile"
                            style="--pd-tile-strip:${theme.stripGrad}; --pd-tile-bg:${theme.bgGrad}; --pd-tile-fg:${theme.fg}; --pd-tile-soft:${theme.soft};"
                            onclick="pdSelectProgram('${program.id}')">
                        <div class="pd-tile__strip"></div>
                        <div class="pd-tile__head">
                            <div class="pd-tile__label">${program.label}</div>
                            ${program.short ? `<span class="pd-tile__short">${program.short}</span>` : ''}
                        </div>
                        <div class="pd-tile__meta">
                            ${program.donor ? `<span><span class="material-symbols-outlined text-[12px]">favorite</span> ${program.donor}</span>` : ''}
                            ${program.region ? `<span><span class="material-symbols-outlined text-[12px]">place</span> ${program.region}</span>` : ''}
                        </div>
                        <div class="pd-tile__headline">
                            <div class="pd-tile__headline-value">${headline}</div>
                            <div class="pd-tile__headline-label">${headlineLabel}</div>
                        </div>
                        <div class="pd-tile__footer">
                            <span class="pd-tile__count">
                                <span class="material-symbols-outlined text-[14px]">rocket_launch</span>
                                ${initCount} initiative${initCount === 1 ? '' : 's'}
                            </span>
                            <span class="pd-tile__cta">
                                View details
                                <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </span>
                        </div>
                    </button>`;
            }).join('')}
        </div>`;
}

function renderHero(program, ini) {
    const stats = program.stats || {};
    const headline = stats.beneficiaries != null ? fmtNum(stats.beneficiaries) : '—';
    const headlineLabel = stats.beneficiariesLabel || 'beneficiaries';
    return `
        <div class="td-brief">
            <div class="td-brief__top">
                <div style="flex:1; min-width: 240px;">
                    <div class="td-brief__eyebrow">Programme Brief</div>
                    <div class="td-brief__title">
                        ${program.label}
                        ${program.short ? `<span class="td-brief__short">${program.short}</span>` : ''}
                    </div>
                    <div class="td-brief__meta">
                        ${program.donor ? `<span><span class="material-symbols-outlined text-[14px]">favorite</span> ${program.donor}</span>` : ''}
                        ${program.region ? `<span><span class="material-symbols-outlined text-[14px]">place</span> ${program.region}</span>` : ''}
                        ${program.period ? `<span><span class="material-symbols-outlined text-[14px]">calendar_today</span> ${program.period}</span>` : ''}
                    </div>
                </div>
                <div class="td-brief__headline">
                    <div class="td-brief__headline-value">${headline}</div>
                    <div class="td-brief__headline-label">${headlineLabel}</div>
                </div>
            </div>
            <p class="td-brief__desc">${ini?.tagline || program.description || ''}</p>
            ${ini?.partners?.length ? `
                <div style="display:flex; gap:6px; flex-wrap:wrap; padding-top:8px; border-top:1px dashed #cbd5e1;">
                    ${ini.partners.map(p => `<span style="font-size:10px; font-weight:700; padding:3px 9px; background:#fff; border:1px solid #e2e8f0; border-radius:999px; color:#475569;">${p}</span>`).join('')}
                </div>
            ` : ''}
        </div>`;
}

function renderKPIs(ini) {
    if (!ini?.kpis?.length) return '';
    return `
        <div class="pd-kpi-grid">
            ${ini.kpis.map(k => {
                const c = KPI_COLORS[k.color] || KPI_COLORS.blue;
                const v = typeof k.value === 'number' ? fmtNum(k.value) : k.value;
                return `
                    <div class="pd-kpi" style="background:${c.bg};">
                        <div class="pd-kpi__strip" style="background:${c.strip};"></div>
                        <div class="pd-kpi__icon" style="color:${c.fg};">
                            <span class="material-symbols-outlined">${k.icon}</span>
                        </div>
                        <div class="pd-kpi__value" style="color:${c.fg};">${v}</div>
                        <div class="pd-kpi__label">${k.label}</div>
                    </div>`;
            }).join('')}
        </div>`;
}

function renderReach(ini) {
    if (!ini?.reach) return '';
    const r = ini.reach;
    const cells = [
        r.districts != null ? { k: 'Districts', v: r.districts, icon: 'map' } : null,
        r.blocks != null    ? { k: 'Blocks',    v: r.blocks,    icon: 'layers' } : null,
        r.villages != null  ? { k: 'Villages',  v: r.villages,  icon: 'holiday_village' } : null,
        r.sites != null     ? { k: r.sitesLabel || 'Sites', v: r.sites, icon: 'pin_drop' } : null
    ].filter(Boolean);
    if (!cells.length) return '';
    return `
        <div class="pd-reach">
            <div class="pd-reach__title">
                <span class="material-symbols-outlined text-[16px]">explore</span>
                Geographic Reach
            </div>
            <div class="pd-reach__cells">
                ${cells.map(c => `
                    <div class="pd-reach__cell">
                        <span class="material-symbols-outlined pd-reach__icon">${c.icon}</span>
                        <div>
                            <div class="pd-reach__value">${fmtNum(c.v)}</div>
                            <div class="pd-reach__label">${c.k}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function renderInitiatives(ini) {
    if (!ini?.initiatives?.length) return '';
    return `
        <div class="pd-section">
            <div class="pd-section__head">
                <div class="pd-section__title">
                    <span class="material-symbols-outlined text-[18px]">rocket_launch</span>
                    Initiatives & Programmes
                </div>
                <span class="pd-section__count">${ini.initiatives.length} active</span>
            </div>
            <div class="pd-init-grid">
                ${ini.initiatives.map(it => {
                    const s = STATUS_STYLES[it.status] || STATUS_STYLES.active;
                    return `
                        <div class="pd-init">
                            <div class="pd-init__top">
                                <div class="pd-init__title">${it.title}</div>
                                <span class="pd-init__status" style="background:${s.bg}; color:${s.fg};">${s.label}</span>
                            </div>
                            <p class="pd-init__desc">${it.description}</p>
                            ${it.progress != null ? `
                                <div class="pd-init__progress">
                                    <div class="pd-init__progress-meta">
                                        <span>Progress</span>
                                        <span style="font-weight:800; color:#0f172a;">${it.progress}%</span>
                                    </div>
                                    <div class="pd-init__bar">
                                        <div class="pd-init__bar-fill" style="width:${it.progress}%; background:${s.fg};"></div>
                                    </div>
                                </div>
                            ` : ''}
                            ${it.achievements?.length ? `
                                <div class="pd-init__ach">
                                    <div class="pd-init__ach-title">Highlights</div>
                                    <ul class="pd-init__ach-list">
                                        ${it.achievements.map(a => `<li>${a}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>`;
                }).join('')}
            </div>
        </div>`;
}

function paintShell(attempt = 0) {
    const root = document.getElementById('pd-mount');
    if (!root) {
        // The router may set innerHTML *after* renderProgramDashboard returned,
        // so the first paint can race the DOM. Retry a few times.
        if (attempt < 10) setTimeout(() => paintShell(attempt + 1), 16);
        return;
    }
    const st = stOf();

    if (st.loading) {
        root.innerHTML = `
            <div class="td-page">
                <div class="td-skeleton">
                    <div class="td-skeleton__tile"></div>
                    <div class="td-skeleton__tile"></div>
                    <div class="td-skeleton__tile"></div>
                    <div class="td-skeleton__tile"></div>
                </div>
                <div class="td-skeleton__chart"></div>
            </div>`;
        return;
    }

    const data = st.data || getDefaultProgramData();
    const allPrograms = data.programs;
    const initiatives = data.initiatives;

    // Managers only see their assigned program — narrow the program list and force selection.
    let programs = allPrograms;
    let programById = data.programById;
    if (st.lockedProgram) {
        const locked = allPrograms.find(p => p.id === st.lockedProgram);
        if (!locked) {
            root.innerHTML = `
                <div class="td-page">
                    <div class="td-empty">
                        Your assigned program (<code>${st.lockedProgram}</code>) is not configured.
                        Please contact a Superadmin.
                    </div>
                </div>`;
            return;
        }
        programs = [locked];
        programById = { [locked.id]: locked };
        st.program = locked.id;
    }

    if (!programs.length) {
        root.innerHTML = `
            <div class="td-page">
                <div class="td-empty">
                    ${st.userRole === 'manager'
                        ? 'You have not been assigned to a program yet. Please contact a Superadmin or HR.'
                        : 'No programmes yet.'}
                </div>
                ${st.userRole === 'superadmin' ? `<div style="text-align:center; margin-top:14px;">${renderEditButton()}</div>` : ''}
            </div>`;
        return;
    }

    const meta = data.meta || {};

    // LIST VIEW — tile grid of all programmes
    if (st.view === 'list' && !st.lockedProgram) {
        const metaLine = meta.updatedAt
            ? `Last edited ${new Date(meta.updatedAt).toLocaleString()} by ${meta.updatedBy || 'unknown'}`
            : 'Source: Kalike Annual Report 2024-25';
        root.innerHTML = `
            <div class="td-page">
                <div class="td-header">
                    <div>
                        <div class="td-header__title">Program Dashboard</div>
                        <div class="td-header__sub">${programs.length} programmes · Click a tile for details · ${metaLine}</div>
                    </div>
                    <div class="td-header__actions">
                        ${renderExportButton()}
                        ${renderEditButton()}
                    </div>
                </div>

                ${renderProgramTiles(programs, initiatives)}
            </div>`;
        return;
    }

    // DETAIL VIEW — single program with full hero / KPIs / reach / initiatives
    let program = programById[st.program];
    if (!program) {
        st.program = programs[0].id;
        program = programs[0];
    }
    const ini = initiatives[st.program];

    const metaLine = meta.updatedAt
        ? `Last edited ${new Date(meta.updatedAt).toLocaleString()} by ${meta.updatedBy || 'unknown'}`
        : `Source: Annual Report FY ${program.period || ''}`;

    root.innerHTML = `
        <div class="td-page">
            <div class="td-header">
                <div>
                    <div class="td-header__title">Program Dashboard</div>
                    <div class="td-header__sub">Scheme-wise progress, initiatives and reach · ${metaLine}</div>
                </div>
                <div class="td-header__actions">
                    ${renderBackButton()}
                    ${renderProgramSelect(programs)}
                    ${renderExportButton()}
                    ${renderEditButton()}
                </div>
            </div>

            ${renderHero(program, ini)}
            ${renderKPIs(ini)}
            ${renderReach(ini)}
            ${renderInitiatives(ini)}
        </div>`;
}

export function renderProgramDashboard(user) {
    const st = stOf();
    st.userRole = user?.role || '';
    st.loading = true;
    // Managers are scoped to a single program — superadmin/hr/director see them all.
    st.lockedProgram = (st.userRole === 'manager' && user?.program) ? user.program : '';
    // Locked managers skip the tile grid and land straight on their program.
    st.view = st.lockedProgram ? 'detail' : 'list';
    // Default to user's assigned program if any
    if (user?.program) st.program = user.program;

    // Kick off async load
    loadProgramData().then(data => {
        st.data = data;
        st.loading = false;
        if (!st.program && data.programs[0]) st.program = data.programs[0].id;
        paintShell();
    }).catch(err => {
        console.error('Program data load failed:', err);
        st.data = getDefaultProgramData();
        st.loading = false;
        paintShell();
    });

    // Defer first paint until after the router has set innerHTML.
    setTimeout(paintShell, 0);
    return `<div id="pd-mount" class="td-mount"></div>`;
}
