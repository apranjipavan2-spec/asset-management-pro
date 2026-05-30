// Social Feed home — default landing page for role=employee. Pulls active
// social_accounts rows (managed by superadmin in Settings) and YouTube
// videos from the server-side RSS proxy. Renders profile preview cards
// (X / LinkedIn / Instagram / Facebook) + a grid of latest YouTube videos.

const PLATFORM_META = {
    youtube:   { label: 'YouTube',   accent: 'from-red-500 to-rose-600',           icon: 'play_circle' },
    instagram: { label: 'Instagram', accent: 'from-fuchsia-500 via-pink-500 to-amber-400', icon: 'photo_camera' },
    linkedin:  { label: 'LinkedIn',  accent: 'from-sky-600 to-blue-700',           icon: 'business_center' },
    x:         { label: 'X',         accent: 'from-slate-900 to-black',            icon: 'tag' },
    facebook:  { label: 'Facebook',  accent: 'from-blue-600 to-indigo-700',        icon: 'thumb_up' }
};

const PLATFORM_SVGS = {
    facebook:  `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    x:         `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    linkedin:  `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    instagram: `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    youtube:   `<svg viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
};

async function authFetch(url) {
    const token = localStorage.getItem('amp_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return res.json();
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

// Modal player — opens a YouTube embed in-page so the user doesn't leave.
if (typeof window !== 'undefined') {
    window.openYoutubeEmbed = function(videoId, title) {
        if (!videoId) return;
        const existing = document.getElementById('yt-embed-backdrop');
        if (existing) existing.remove();
        const div = document.createElement('div');
        div.id = 'yt-embed-backdrop';
        div.className = 'fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200';
        div.innerHTML = `
            <div class="w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                <div class="flex items-center justify-between px-5 py-3 bg-slate-950 text-white">
                    <p class="text-xs font-black uppercase tracking-widest truncate">${escapeHtml(title || 'Now playing')}</p>
                    <button onclick="document.getElementById('yt-embed-backdrop')?.remove()"
                        class="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>
                <div class="aspect-video bg-black">
                    <iframe class="w-full h-full" src="https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0"
                        title="YouTube video" frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowfullscreen></iframe>
                </div>
            </div>
        `;
        div.addEventListener('click', (e) => { if (e.target === div) div.remove(); });
        document.body.appendChild(div);
    };
}

function renderVideoCard(v) {
    const safeId = escapeHtml(v.videoId);
    const safeTitle = escapeHtml(v.title);
    const dateStr = v.publishedAt
        ? new Date(v.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
    return `
        <button onclick="window.openYoutubeEmbed('${safeId}', '${safeTitle.replace(/'/g, "\\'")}')"
            class="group text-left bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl hover:border-red-200 transition-all flex flex-col">
            <div class="relative aspect-video bg-slate-100 overflow-hidden">
                <img src="${escapeHtml(v.thumbnail)}" alt="${safeTitle}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 group-hover:scale-110 transition-transform">
                        <span class="material-symbols-outlined text-3xl">play_arrow</span>
                    </div>
                </div>
                <div class="absolute top-2 right-2 px-2 py-0.5 bg-black/70 text-white rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                    ${PLATFORM_SVGS.youtube}
                    YouTube
                </div>
            </div>
            <div class="p-4 flex-1 flex flex-col">
                <h3 class="text-xs font-black text-slate-900 leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">${safeTitle}</h3>
                ${dateStr ? `<p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">${dateStr}</p>` : ''}
            </div>
        </button>
    `;
}

function renderAccountCard(account) {
    const meta = PLATFORM_META[account.platform] || { label: account.platform, accent: 'from-slate-700 to-slate-900', icon: 'public' };
    const svg = PLATFORM_SVGS[account.platform] || `<span class="material-symbols-outlined text-base">${meta.icon}</span>`;
    const handle = account.handle ? escapeHtml(account.handle) : '';
    const name = escapeHtml(account.displayName || meta.label);
    const url = escapeHtml(account.url);
    return `
        <a href="${url}" target="_blank" rel="noopener noreferrer"
            class="group bg-white rounded-2xl border border-slate-100 hover:shadow-xl transition-all overflow-hidden flex flex-col">
            <div class="bg-gradient-to-br ${meta.accent} h-24 relative flex items-end p-4">
                <div class="absolute top-3 right-3 px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[9px] font-black uppercase tracking-widest rounded-md">
                    ${meta.label}
                </div>
                <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-lg group-hover:scale-110 transition-transform">
                    ${svg}
                </div>
            </div>
            <div class="p-4 flex-1 flex flex-col">
                <p class="text-xs font-black text-slate-900 leading-tight">${name}</p>
                ${handle ? `<p class="text-[10px] text-slate-400 font-bold mt-1 truncate">${handle}</p>` : ''}
                <div class="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Open latest</span>
                    <span class="material-symbols-outlined text-sm text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition-all">arrow_forward</span>
                </div>
            </div>
        </a>
    `;
}

export async function renderSocialFeedPage(user) {
    const [accountsResp, ytResp] = await Promise.all([
        authFetch('/api/social_accounts'),
        authFetch('/api/social/youtube')
    ]);

    const accounts = Array.isArray(accountsResp) ? accountsResp : [];
    const active = accounts
        .filter(a => Number(a.isActive) === 1)
        .sort((a, b) => (Number(a.displayOrder) || 0) - (Number(b.displayOrder) || 0));

    const videos = (ytResp && Array.isArray(ytResp.videos)) ? ytResp.videos : [];
    const ytReason = ytResp && ytResp.reason;

    const nonYoutube = active.filter(a => a.platform !== 'youtube');
    const ytAccounts = active.filter(a => a.platform === 'youtube');

    const accountCardsHtml = nonYoutube.length
        ? nonYoutube.map(renderAccountCard).join('')
        : `<div class="col-span-full text-center py-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">No social accounts configured. Ask a superadmin to add them in Settings.</div>`;

    let ytSection;
    if (videos.length) {
        ytSection = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                ${videos.map(renderVideoCard).join('')}
            </div>
        `;
    } else if (ytReason === 'no_channel_configured') {
        const ytLinkHtml = ytAccounts.length
            ? `<a href="${escapeHtml(ytAccounts[0].url)}" target="_blank" class="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all">Open channel <span class="material-symbols-outlined text-sm">open_in_new</span></a>`
            : '';
        ytSection = `
            <div class="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                <span class="material-symbols-outlined text-3xl text-red-400">videocam_off</span>
                <p class="text-xs font-black text-slate-900 mt-2 uppercase tracking-widest">YouTube channel ID not set</p>
                <p class="text-[10px] text-slate-500 mt-1 max-w-md mx-auto">Superadmin: paste the channel ID (starts with <code class="bg-white px-1 rounded">UC…</code>) in Settings → Social Accounts to pull latest videos automatically.</p>
                ${ytLinkHtml}
            </div>
        `;
    } else {
        ytSection = `
            <div class="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                Could not reach YouTube right now. Showing cached or empty.
            </div>
        `;
    }

    return `
        <div class="space-y-8 animate-fade-in-up">
            <section class="space-y-4">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-red-600 text-base">play_circle</span>
                    <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">Watch · YouTube</h3>
                </div>
                ${ytSection}
            </section>

            <section class="space-y-4">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-slate-700 text-base">share</span>
                    <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">Follow & Engage</h3>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    ${accountCardsHtml}
                </div>
            </section>

            <footer class="text-center text-[9px] text-slate-400 font-bold uppercase tracking-[.3em] pt-6">
                Help amplify Kalike — follow, like, and share.
            </footer>
        </div>
    `;
}
