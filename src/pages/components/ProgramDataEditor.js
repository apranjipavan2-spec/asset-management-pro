// Program Data Editor — superadmin-only structured form modal.
// Lets you add / edit / remove programs, KPIs and initiatives without
// touching JSON or source files.

import { saveProgramOverrides, invalidateProgramCache } from '../../data/program_runtime.js';

const ICON_CHOICES = [
    'child_care', 'school', 'home_work', 'group', 'how_to_reg', 'volunteer_activism',
    'auto_stories', 'menu_book', 'cast_for_education', 'library_books', 'local_library',
    'female', 'work', 'apartment', 'devices',
    'home', 'water_drop', 'groups', 'groups_3',
    'agriculture', 'grass', 'solar_power', 'pets', 'eco',
    'palette', 'group_work', 'storefront', 'category', 'event',
    'elderly', 'badge', 'local_hospital', 'medical_services',
    'graphic_eq', 'mic', 'campaign', 'forum', 'phone_iphone',
    'crisis_alert', 'map', 'place', 'pin_drop', 'layers', 'holiday_village',
    'rocket_launch', 'favorite', 'savings', 'account_balance', 'analytics'
];

const COLOR_CHOICES = ['emerald', 'blue', 'amber', 'purple', 'rose', 'cyan'];
const STATUS_CHOICES = [
    { value: 'active',    label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'pilot',     label: 'Pilot' },
    { value: 'standby',   label: 'Standby' }
];

window.pdEditorState = window.pdEditorState || null;

const stOf = () => window.pdEditorState;

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function paint() {
    const st = stOf();
    const root = document.getElementById('pde-mount');
    if (!root || !st) return;

    const cur = st.programs.find(p => p.id === st.currentId) || st.programs[0];
    if (!cur) {
        root.innerHTML = renderEmpty();
        return;
    }
    if (!st.currentId) st.currentId = cur.id;
    const ini = st.initiatives[cur.id] || { tagline: '', reach: {}, partners: [], kpis: [], initiatives: [] };

    root.innerHTML = `
        <div class="pde-overlay" onclick="if(event.target===this) pdEditorClose()">
            <div class="pde-modal">
                <header class="pde-header">
                    <div>
                        <div class="pde-eyebrow">Program Dashboard Editor</div>
                        <h2 class="pde-title">Edit Program Data</h2>
                    </div>
                    <button class="pde-x" onclick="pdEditorClose()">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </header>

                <div class="pde-body">
                    <aside class="pde-sidebar">
                        <div class="pde-sidebar__head">
                            <span>Programmes</span>
                            <button class="pde-icon-btn" onclick="pdEditorAddProgram()" title="Add new program">
                                <span class="material-symbols-outlined text-[18px]">add</span>
                            </button>
                        </div>
                        <div class="pde-sidebar__list">
                            ${st.programs.map(p => `
                                <button class="pde-side-item ${p.id === cur.id ? 'is-active' : ''}" onclick="pdEditorSelect('${esc(p.id)}')">
                                    <span class="pde-side-item__label">${esc(p.label || p.id)}</span>
                                    <span class="pde-side-item__short">${esc(p.short || '')}</span>
                                </button>
                            `).join('')}
                        </div>
                    </aside>

                    <main class="pde-form">
                        ${renderBriefSection(cur, ini)}
                        ${renderReachSection(ini.reach || {})}
                        ${renderPartnersSection(ini.partners || [])}
                        ${renderKpisSection(ini.kpis || [])}
                        ${renderInitiativesSection(ini.initiatives || [])}

                        <div class="pde-danger">
                            <button class="pde-btn pde-btn--danger" onclick="pdEditorRemoveProgram('${esc(cur.id)}')">
                                <span class="material-symbols-outlined text-[16px]">delete</span>
                                Delete this program entry
                            </button>
                            <span class="pde-danger__hint">Removes ${esc(cur.label || cur.id)} from the dashboard. You can re-add it later.</span>
                        </div>
                    </main>
                </div>

                <footer class="pde-footer">
                    <div class="pde-footer__status">
                        ${st.saving ? '<span class="material-symbols-outlined td-spin text-[14px]">progress_activity</span> Saving…' : ''}
                        ${st.error ? `<span class="pde-error">⚠ ${esc(st.error)}</span>` : ''}
                    </div>
                    <div class="pde-footer__actions">
                        <button class="pde-btn pde-btn--ghost" onclick="pdEditorClose()">Cancel</button>
                        <button class="pde-btn pde-btn--primary" onclick="pdEditorSave()" ${st.saving ? 'disabled' : ''}>
                            <span class="material-symbols-outlined text-[16px]">save</span>
                            Save Changes
                        </button>
                    </div>
                </footer>
            </div>
        </div>`;
}

function renderEmpty() {
    return `
        <div class="pde-overlay" onclick="if(event.target===this) pdEditorClose()">
            <div class="pde-modal" style="max-width:480px;">
                <header class="pde-header">
                    <h2 class="pde-title">No programmes yet</h2>
                    <button class="pde-x" onclick="pdEditorClose()"><span class="material-symbols-outlined">close</span></button>
                </header>
                <div class="pde-body" style="padding:30px;">
                    <button class="pde-btn pde-btn--primary" onclick="pdEditorAddProgram()">
                        <span class="material-symbols-outlined text-[16px]">add</span> Add First Programme
                    </button>
                </div>
            </div>
        </div>`;
}

function renderBriefSection(p, ini) {
    return `
        <section class="pde-section">
            <header class="pde-section__head">
                <span class="material-symbols-outlined">badge</span>
                <h3>Programme Brief</h3>
            </header>
            <div class="pde-grid">
                <div class="pde-field">
                    <label>ID (unique)</label>
                    <input type="text" value="${esc(p.id)}" onchange="pdEditorPatchProgram('id', this.value)" />
                    <span class="pde-hint">Used to link rows. Lowercase, hyphens OK.</span>
                </div>
                <div class="pde-field">
                    <label>Short Code</label>
                    <input type="text" value="${esc(p.short || '')}" onchange="pdEditorPatchProgram('short', this.value)" placeholder="ECD" />
                </div>
                <div class="pde-field pde-field--wide">
                    <label>Display Label</label>
                    <input type="text" value="${esc(p.label || '')}" onchange="pdEditorPatchProgram('label', this.value)" placeholder="Early Childhood Development" />
                </div>
                <div class="pde-field">
                    <label>Donor / Funder</label>
                    <input type="text" value="${esc(p.donor || '')}" onchange="pdEditorPatchProgram('donor', this.value)" />
                </div>
                <div class="pde-field">
                    <label>Region</label>
                    <input type="text" value="${esc(p.region || '')}" onchange="pdEditorPatchProgram('region', this.value)" />
                </div>
                <div class="pde-field">
                    <label>Reporting Period</label>
                    <input type="text" value="${esc(p.period || '')}" onchange="pdEditorPatchProgram('period', this.value)" placeholder="2022-23" />
                </div>
                <div class="pde-field pde-field--wide">
                    <label>Description</label>
                    <textarea rows="2" onchange="pdEditorPatchProgram('description', this.value)">${esc(p.description || '')}</textarea>
                </div>
                <div class="pde-field pde-field--wide">
                    <label>Tagline (shown above hero)</label>
                    <input type="text" value="${esc(ini.tagline || '')}" onchange="pdEditorPatchIni('tagline', this.value)" />
                </div>
                <div class="pde-field">
                    <label>Headline Beneficiary (number)</label>
                    <input type="number" value="${p.stats?.beneficiaries ?? ''}" onchange="pdEditorPatchStats('beneficiaries', this.value)" />
                </div>
                <div class="pde-field">
                    <label>Beneficiary Label</label>
                    <input type="text" value="${esc(p.stats?.beneficiariesLabel || '')}" onchange="pdEditorPatchStats('beneficiariesLabel', this.value)" placeholder="children reached" />
                </div>
            </div>
        </section>`;
}

function renderReachSection(reach) {
    return `
        <section class="pde-section">
            <header class="pde-section__head">
                <span class="material-symbols-outlined">explore</span>
                <h3>Geographic Reach</h3>
            </header>
            <div class="pde-grid">
                <div class="pde-field">
                    <label>Districts</label>
                    <input type="number" value="${reach.districts ?? ''}" onchange="pdEditorPatchReach('districts', this.value)" />
                </div>
                <div class="pde-field">
                    <label>Blocks</label>
                    <input type="number" value="${reach.blocks ?? ''}" onchange="pdEditorPatchReach('blocks', this.value)" />
                </div>
                <div class="pde-field">
                    <label>Villages</label>
                    <input type="number" value="${reach.villages ?? ''}" onchange="pdEditorPatchReach('villages', this.value)" />
                </div>
                <div class="pde-field">
                    <label>Sites Count</label>
                    <input type="number" value="${reach.sites ?? ''}" onchange="pdEditorPatchReach('sites', this.value)" />
                </div>
                <div class="pde-field pde-field--wide">
                    <label>Sites Label</label>
                    <input type="text" value="${esc(reach.sitesLabel || '')}" onchange="pdEditorPatchReach('sitesLabel', this.value)" placeholder="Anganwadi Centres" />
                </div>
            </div>
        </section>`;
}

function renderPartnersSection(partners) {
    return `
        <section class="pde-section">
            <header class="pde-section__head">
                <span class="material-symbols-outlined">handshake</span>
                <h3>Partners</h3>
                <button class="pde-icon-btn pde-icon-btn--add" onclick="pdEditorPartnerAdd()" title="Add partner">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                </button>
            </header>
            <div class="pde-rows">
                ${partners.length === 0 ? '<div class="pde-empty">No partners yet — click + to add.</div>' : ''}
                ${partners.map((name, i) => `
                    <div class="pde-row">
                        <input type="text" value="${esc(name)}" onchange="pdEditorPartnerSet(${i}, this.value)" placeholder="Partner name" />
                        <button class="pde-icon-btn pde-icon-btn--remove" onclick="pdEditorPartnerRemove(${i})">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                `).join('')}
            </div>
        </section>`;
}

function renderKpisSection(kpis) {
    const iconOpts = ICON_CHOICES.map(i => `<option value="${i}">${i}</option>`).join('');
    const colorOpts = COLOR_CHOICES.map(c => `<option value="${c}">${c}</option>`).join('');
    return `
        <section class="pde-section">
            <header class="pde-section__head">
                <span class="material-symbols-outlined">leaderboard</span>
                <h3>KPI Tiles</h3>
                <button class="pde-icon-btn pde-icon-btn--add" onclick="pdEditorKpiAdd()" title="Add KPI">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                </button>
            </header>
            <div class="pde-rows">
                ${kpis.length === 0 ? '<div class="pde-empty">No KPI tiles yet — click + to add.</div>' : ''}
                ${kpis.map((k, i) => `
                    <div class="pde-row pde-row--grid4">
                        <div class="pde-field">
                            <label>Label</label>
                            <input type="text" value="${esc(k.label || '')}" onchange="pdEditorKpiSet(${i}, 'label', this.value)" />
                        </div>
                        <div class="pde-field">
                            <label>Value</label>
                            <input type="text" value="${esc(k.value ?? '')}" onchange="pdEditorKpiSet(${i}, 'value', this.value)" placeholder="123 or text" />
                        </div>
                        <div class="pde-field">
                            <label>Icon</label>
                            <select onchange="pdEditorKpiSet(${i}, 'icon', this.value)">
                                <option value="">— pick —</option>
                                ${ICON_CHOICES.map(ic => `<option value="${ic}" ${k.icon === ic ? 'selected' : ''}>${ic}</option>`).join('')}
                            </select>
                        </div>
                        <div class="pde-field">
                            <label>Color</label>
                            <select onchange="pdEditorKpiSet(${i}, 'color', this.value)">
                                ${COLOR_CHOICES.map(c => `<option value="${c}" ${k.color === c ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <button class="pde-icon-btn pde-icon-btn--remove pde-row__remove" onclick="pdEditorKpiRemove(${i})">
                            <span class="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    </div>
                `).join('')}
            </div>
        </section>`;
}

function renderInitiativesSection(initiatives) {
    return `
        <section class="pde-section">
            <header class="pde-section__head">
                <span class="material-symbols-outlined">rocket_launch</span>
                <h3>Initiatives</h3>
                <button class="pde-icon-btn pde-icon-btn--add" onclick="pdEditorInitAdd()" title="Add initiative">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                </button>
            </header>
            <div class="pde-rows">
                ${initiatives.length === 0 ? '<div class="pde-empty">No initiatives yet — click + to add.</div>' : ''}
                ${initiatives.map((it, i) => `
                    <div class="pde-init-card">
                        <div class="pde-init-card__head">
                            <span class="pde-init-card__num">#${i + 1}</span>
                            <button class="pde-icon-btn pde-icon-btn--remove" onclick="pdEditorInitRemove(${i})">
                                <span class="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        <div class="pde-grid">
                            <div class="pde-field pde-field--wide">
                                <label>Initiative Title</label>
                                <input type="text" value="${esc(it.title || '')}" onchange="pdEditorInitSet(${i}, 'title', this.value)" />
                            </div>
                            <div class="pde-field">
                                <label>Status</label>
                                <select onchange="pdEditorInitSet(${i}, 'status', this.value)">
                                    ${STATUS_CHOICES.map(s => `<option value="${s.value}" ${it.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                                </select>
                            </div>
                            <div class="pde-field">
                                <label>Progress (%)</label>
                                <input type="number" min="0" max="100" value="${it.progress ?? 0}" onchange="pdEditorInitSet(${i}, 'progress', this.value)" />
                            </div>
                            <div class="pde-field pde-field--wide">
                                <label>Description</label>
                                <textarea rows="2" onchange="pdEditorInitSet(${i}, 'description', this.value)">${esc(it.description || '')}</textarea>
                            </div>
                        </div>

                        <div class="pde-subsection">
                            <div class="pde-subsection__head">
                                <span>Achievements / Highlights</span>
                                <button class="pde-icon-btn pde-icon-btn--add" onclick="pdEditorAchAdd(${i})">
                                    <span class="material-symbols-outlined text-[16px]">add</span>
                                </button>
                            </div>
                            ${(it.achievements || []).length === 0 ? '<div class="pde-empty pde-empty--sub">No highlights yet.</div>' : ''}
                            ${(it.achievements || []).map((a, ai) => `
                                <div class="pde-row">
                                    <input type="text" value="${esc(a)}" onchange="pdEditorAchSet(${i}, ${ai}, this.value)" placeholder="One-line achievement" />
                                    <button class="pde-icon-btn pde-icon-btn--remove" onclick="pdEditorAchRemove(${i}, ${ai})">
                                        <span class="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>`;
}

// ── Mutation handlers ──────────────────────────────────────────────────

function curProgram() {
    const st = stOf();
    return st.programs.find(p => p.id === st.currentId);
}

function curIni() {
    const st = stOf();
    const id = st.currentId;
    if (!st.initiatives[id]) {
        st.initiatives[id] = { tagline: '', reach: {}, partners: [], kpis: [], initiatives: [] };
    }
    return st.initiatives[id];
}

window.pdEditorSelect = (id) => {
    stOf().currentId = id;
    paint();
};

window.pdEditorAddProgram = () => {
    const st = stOf();
    const idBase = 'program' + (st.programs.length + 1);
    const newP = {
        id: idBase, label: 'New Programme', short: 'NEW',
        donor: '', region: '', period: '',
        description: '', stats: { beneficiaries: null, beneficiariesLabel: '', keyMetrics: [] }
    };
    st.programs.push(newP);
    st.initiatives[idBase] = { tagline: '', reach: {}, partners: [], kpis: [], initiatives: [] };
    st.currentId = idBase;
    paint();
};

window.pdEditorRemoveProgram = (id) => {
    if (!confirm(`Delete programme "${id}"? This removes its tile from the dashboard until re-added.`)) return;
    const st = stOf();
    st.programs = st.programs.filter(p => p.id !== id);
    delete st.initiatives[id];
    st.currentId = st.programs[0]?.id || '';
    paint();
};

window.pdEditorPatchProgram = (key, val) => {
    const p = curProgram();
    if (!p) return;
    const oldId = p.id;
    p[key] = val;
    if (key === 'id' && val && val !== oldId) {
        // Rename: move initiatives entry too
        const st = stOf();
        st.initiatives[val] = st.initiatives[oldId] || {};
        delete st.initiatives[oldId];
        st.currentId = val;
    }
    paint();
};

window.pdEditorPatchStats = (key, val) => {
    const p = curProgram();
    if (!p) return;
    if (!p.stats) p.stats = {};
    p.stats[key] = key === 'beneficiaries' ? (val === '' ? null : Number(val)) : val;
    paint();
};

window.pdEditorPatchIni = (key, val) => {
    const ini = curIni();
    ini[key] = val;
    paint();
};

window.pdEditorPatchReach = (key, val) => {
    const ini = curIni();
    if (!ini.reach) ini.reach = {};
    if (['districts', 'blocks', 'villages', 'sites'].includes(key)) {
        ini.reach[key] = val === '' ? null : Number(val);
    } else {
        ini.reach[key] = val;
    }
    paint();
};

window.pdEditorPartnerAdd = () => {
    const ini = curIni();
    if (!Array.isArray(ini.partners)) ini.partners = [];
    ini.partners.push('');
    paint();
};
window.pdEditorPartnerSet = (i, val) => { curIni().partners[i] = val; };
window.pdEditorPartnerRemove = (i) => { curIni().partners.splice(i, 1); paint(); };

window.pdEditorKpiAdd = () => {
    const ini = curIni();
    if (!Array.isArray(ini.kpis)) ini.kpis = [];
    ini.kpis.push({ label: 'New KPI', value: 0, icon: 'analytics', color: 'blue' });
    paint();
};
window.pdEditorKpiSet = (i, key, val) => {
    const k = curIni().kpis[i];
    if (key === 'value' && val !== '' && !isNaN(Number(val))) k.value = Number(val);
    else k[key] = val;
};
window.pdEditorKpiRemove = (i) => { curIni().kpis.splice(i, 1); paint(); };

window.pdEditorInitAdd = () => {
    const ini = curIni();
    if (!Array.isArray(ini.initiatives)) ini.initiatives = [];
    ini.initiatives.push({ title: 'New Initiative', status: 'active', progress: 50, description: '', achievements: [] });
    paint();
};
window.pdEditorInitSet = (i, key, val) => {
    const it = curIni().initiatives[i];
    if (key === 'progress') it.progress = Math.max(0, Math.min(100, Number(val) || 0));
    else it[key] = val;
};
window.pdEditorInitRemove = (i) => { curIni().initiatives.splice(i, 1); paint(); };

window.pdEditorAchAdd = (i) => {
    const it = curIni().initiatives[i];
    if (!Array.isArray(it.achievements)) it.achievements = [];
    it.achievements.push('');
    paint();
};
window.pdEditorAchSet = (i, ai, val) => {
    curIni().initiatives[i].achievements[ai] = val;
};
window.pdEditorAchRemove = (i, ai) => {
    curIni().initiatives[i].achievements.splice(ai, 1);
    paint();
};

window.pdEditorSave = async () => {
    const st = stOf();
    st.saving = true;
    st.error = '';
    paint();
    try {
        await saveProgramOverrides({ programs: st.programs, initiatives: st.initiatives });
        invalidateProgramCache();
        st.saving = false;
        pdEditorClose();
        if (typeof window.pdReloadDashboard === 'function') window.pdReloadDashboard();
    } catch (e) {
        st.saving = false;
        st.error = e.message;
        paint();
    }
};

window.pdEditorClose = () => {
    window.pdEditorState = null;
    const m = document.getElementById('pde-mount');
    if (m) m.remove();
};

export function openProgramDataEditor({ programs, initiatives, currentId }) {
    window.pdEditorState = {
        programs: deepClone(programs || []),
        initiatives: deepClone(initiatives || {}),
        currentId: currentId || programs[0]?.id || '',
        saving: false,
        error: ''
    };
    let mount = document.getElementById('pde-mount');
    if (!mount) {
        mount = document.createElement('div');
        mount.id = 'pde-mount';
        document.body.appendChild(mount);
    }
    paint();
}
