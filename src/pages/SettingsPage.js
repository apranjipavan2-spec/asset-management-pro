import { showSignatureModal } from './SignaturePad.js';
import { db } from '../mock/db.js';

const SOCIAL_PLATFORMS = ['youtube', 'instagram', 'linkedin', 'x', 'facebook'];

async function fetchSocialAccounts() {
    const token = localStorage.getItem('amp_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
        const res = await fetch('/api/social_accounts', { headers });
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function escapeAttr(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

function renderSocialAccountRow(account) {
    const id = escapeAttr(account.id);
    const platform = (account.platform || '').toLowerCase();
    const isYouTube = platform === 'youtube';
    return `
        <div class="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3" data-row-id="${id}">
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div class="md:col-span-2">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Platform</label>
                    <select data-field="platform" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold">
                        ${SOCIAL_PLATFORMS.map(p => `<option value="${p}" ${p === platform ? 'selected' : ''}>${p.charAt(0).toUpperCase() + p.slice(1)}</option>`).join('')}
                    </select>
                </div>
                <div class="md:col-span-3">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Display Name</label>
                    <input type="text" data-field="displayName" value="${escapeAttr(account.displayName)}" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold" placeholder="Kalike Foundation" />
                </div>
                <div class="md:col-span-2">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Handle</label>
                    <input type="text" data-field="handle" value="${escapeAttr(account.handle)}" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold" placeholder="@KalikeFdn" />
                </div>
                <div class="md:col-span-4">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Profile URL</label>
                    <input type="url" data-field="url" value="${escapeAttr(account.url)}" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold" placeholder="https://..." />
                </div>
                <div class="md:col-span-1">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Order</label>
                    <input type="number" data-field="displayOrder" value="${escapeAttr(account.displayOrder ?? 0)}" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold" />
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div class="md:col-span-7 ${isYouTube ? '' : 'opacity-50'}">
                    <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                        YouTube Channel ID <span class="text-slate-300 normal-case tracking-normal">(required for auto-feed — starts with <code class="bg-slate-200 px-1 rounded">UC…</code>)</span>
                    </label>
                    <input type="text" data-field="youtubeChannelId" value="${escapeAttr(account.youtubeChannelId)}" class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold font-mono" placeholder="UCxxxxxxxxxxxxxxxxxxxxxx" ${isYouTube ? '' : 'disabled'} />
                </div>
                <div class="md:col-span-2">
                    <label class="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <input type="checkbox" data-field="isActive" ${Number(account.isActive) === 1 ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300" />
                        Active
                    </label>
                </div>
                <div class="md:col-span-3 flex gap-2 justify-end">
                    <button onclick="window.saveSocialAccount('${id}')" class="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-1.5">
                        <span class="material-symbols-outlined text-sm">save</span>Save
                    </button>
                    <button onclick="window.deleteSocialAccount('${id}')" class="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black rounded-lg uppercase tracking-widest hover:bg-rose-100 transition-all">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderSocialAccountsAdmin(accounts) {
    const sorted = [...accounts].sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));
    const rows = sorted.length
        ? sorted.map(renderSocialAccountRow).join('')
        : `<p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center py-6">No accounts yet. Click "Add account" to seed one.</p>`;
    return `
        <div class="card p-4 lg:col-span-2">
            <div class="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                        <span class="material-symbols-outlined text-sm">public</span>
                    </div>
                    <div>
                        <h3 class="card-title">Social Accounts</h3>
                        <p class="form-hint">Controls the Social home feed for employees</p>
                    </div>
                </div>
                <button onclick="window.addSocialAccount()" class="btn-primary bg-violet-600 hover:bg-violet-700">
                    <span class="material-symbols-outlined text-sm">add</span>Add account
                </button>
            </div>
            <div class="space-y-3">
                ${rows}
            </div>
        </div>
    `;
}

export async function renderSettingsPage(user) {
    const hasSignature = user.defaultSignature ? true : false;
    const isSuperadmin = user.role === 'superadmin';
    const socialAccounts = isSuperadmin ? await fetchSocialAccounts() : [];
    const socialAdminHtml = isSuperadmin ? renderSocialAccountsAdmin(socialAccounts) : '';

    return `
        <div class="w-full space-y-4">
            <header>
                <h2 class="page-title">System Preferences</h2>
                <p class="page-subtitle">Platform Configuration & Identity Settings</p>
            </header>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Theme & Data -->
                <div class="space-y-4">
                    <div class="card p-4">
                        <div class="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <span class="material-symbols-outlined text-sm">palette</span>
                            </div>
                            <div>
                                <h3 class="card-title">Interface Theme</h3>
                                <p class="form-hint">Visual presentation of the dashboard</p>
                            </div>
                        </div>
                        <div class="form-row">
                            <select id="settings-theme" class="form-input">
                                <option>Light / Institutional (Default)</option>
                                <option>Dark / Tactical</option>
                                <option>System Adaptive</option>
                            </select>
                        </div>
                    </div>

                    <div class="card p-4">
                        <div class="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <span class="material-symbols-outlined text-sm">sync</span>
                            </div>
                            <div>
                                <h3 class="card-title">Data Synchronization</h3>
                                <p class="form-hint">Cloud linkage and fetch frequency</p>
                            </div>
                        </div>
                        <div class="form-row">
                            <select id="settings-sync" class="form-input">
                                <option>Real-time (WebSocket Active)</option>
                                <option>Polled (Every 5 Minutes)</option>
                                <option>Manual Refresh Only</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Digital Signature -->
                <div class="card p-4 flex flex-col h-full">
                    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <span class="material-symbols-outlined text-sm">draw</span>
                        </div>
                        <div>
                            <h3 class="card-title">Institutional Signature</h3>
                            <p class="form-hint">Capture your digital sign for approvals</p>
                        </div>
                    </div>

                    <div class="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 relative group overflow-hidden">
                        ${hasSignature ? `
                            <img src="${user.defaultSignature}" class="h-28 object-contain mix-blend-multiply transition-transform group-hover:scale-110 duration-500" />
                            <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onclick="window.configureSignature()" class="btn-primary">Update Signature</button>
                            </div>
                        ` : `
                            <div class="text-center space-y-3">
                                <span class="material-symbols-outlined text-4xl text-slate-300">gesture</span>
                                <p class="text-[10px] text-slate-400 font-black uppercase tracking-widest">No Signature Saved</p>
                                <button onclick="window.configureSignature()" class="btn-primary">Configure Now</button>
                            </div>
                        `}
                    </div>
                    <p class="form-hint mt-3 text-center">Your signature is stored securely and used exclusively for institutional authorizations.</p>
                </div>

                <!-- Password -->
                <div class="card p-4 lg:col-span-2">
                    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                        <div class="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                            <span class="material-symbols-outlined text-sm">vpn_key</span>
                        </div>
                        <div>
                            <h3 class="card-title">Identity Security</h3>
                            <p class="form-hint">Modify your access credentials</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="form-row">
                            <label class="form-label">Current Password</label>
                            <input type="password" id="settings-current-pwd" class="form-input" placeholder="••••••••" />
                        </div>
                        <div></div>
                        <div class="form-row">
                            <label class="form-label">New Password</label>
                            <input type="password" id="settings-new-pwd" class="form-input" placeholder="••••••••" />
                        </div>
                        <div class="form-row">
                            <label class="form-label">Confirm New Password</label>
                            <input type="password" id="settings-confirm-pwd" class="form-input" placeholder="••••••••" />
                        </div>
                    </div>
                </div>

                ${socialAdminHtml}
            </div>

            <div class="flex justify-end">
                <button onclick="window.saveSystemSettings()" class="btn-primary">
                    <span class="material-symbols-outlined text-sm">save</span>
                    Persist Configuration
                </button>
            </div>
        </div>
    `;
}

window.configureSignature = () => {
    const user = JSON.parse(localStorage.getItem('amp_user'));
    showSignatureModal('DEFAULT_PROFILE', user, (sigData) => {
        db.saveDefaultSignature(user.empId, sigData);
        // Update local user object too
        user.defaultSignature = sigData;
        localStorage.setItem('amp_user', JSON.stringify(user));
        alert('Institutional Digital Signature saved to your profile.');
        window.app.renderContent();
    });
};

window.saveSystemSettings = () => {
    alert('System Configuration has been updated and applied to the Asset Manager.');
    window.app.render();
};

function collectRowPayload(rowEl) {
    const payload = { id: rowEl.dataset.rowId };
    rowEl.querySelectorAll('[data-field]').forEach(el => {
        const k = el.dataset.field;
        if (el.type === 'checkbox') payload[k] = el.checked ? 1 : 0;
        else if (el.type === 'number') payload[k] = Number(el.value) || 0;
        else payload[k] = el.value.trim();
    });
    payload.updatedAt = new Date().toISOString();
    return payload;
}

async function postSocialAccount(payload) {
    const token = localStorage.getItem('amp_token');
    const res = await fetch('/api/social_accounts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
    });
    return res.ok;
}

window.saveSocialAccount = async (id) => {
    const row = document.querySelector(`[data-row-id="${CSS.escape(id)}"]`);
    if (!row) return;
    const payload = collectRowPayload(row);
    if (!payload.url) {
        alert('Profile URL is required.');
        return;
    }
    const ok = await postSocialAccount(payload);
    if (ok) {
        await window.app.renderContent();
    } else {
        alert('Save failed. You may not have permission.');
    }
};

window.deleteSocialAccount = async (id) => {
    if (!confirm('Remove this social account from the feed?')) return;
    const token = localStorage.getItem('amp_token');
    const res = await fetch(`/api/social_accounts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) {
        await window.app.renderContent();
    } else {
        alert('Delete failed.');
    }
};

window.addSocialAccount = async () => {
    const platform = prompt('Platform (youtube, instagram, linkedin, x, facebook):', 'instagram');
    if (!platform) return;
    const normalized = platform.toLowerCase().trim();
    if (!SOCIAL_PLATFORMS.includes(normalized)) {
        alert(`Unknown platform. Use one of: ${SOCIAL_PLATFORMS.join(', ')}`);
        return;
    }
    const url = prompt('Profile URL:', 'https://');
    if (!url) return;
    const now = new Date().toISOString();
    const payload = {
        id: `social_${normalized}_${Date.now()}`,
        platform: normalized,
        displayName: '',
        handle: '',
        url: url.trim(),
        youtubeChannelId: '',
        isActive: 1,
        displayOrder: 99,
        createdAt: now,
        updatedAt: now
    };
    const ok = await postSocialAccount(payload);
    if (ok) {
        await window.app.renderContent();
    } else {
        alert('Add failed. Only superadmin can manage social accounts.');
    }
};
