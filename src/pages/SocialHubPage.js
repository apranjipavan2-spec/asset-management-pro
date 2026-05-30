import { db } from '../mock/db.js';

export function renderSocialHubPage(user) {
    return `
    <div class="space-y-6 animate-fade-in-up">
        <div>
            <h1 class="text-xl font-black text-slate-900 uppercase tracking-tight">Social Media Hub</h1>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Kalike's Digital Presence & Employee Advocacy</p>
        </div>

        <!-- Social Media Quick Links -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="https://www.facebook.com/KalikeFdn" target="_blank" class="group bg-white p-5 rounded-2xl border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all text-center">
                <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-600/20">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <p class="text-xs font-black text-slate-900">Facebook</p>
                <p class="text-[9px] text-slate-400 mt-1">Follow & Share</p>
            </a>
            <a href="https://twitter.com/KalikeFdn" target="_blank" class="group bg-white p-5 rounded-2xl border border-slate-100 hover:shadow-xl hover:border-slate-300 transition-all text-center">
                <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-slate-900/20">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <p class="text-xs font-black text-slate-900">X / Twitter</p>
                <p class="text-[9px] text-slate-400 mt-1">Engage & Retweet</p>
            </a>
            <a href="https://www.linkedin.com/company/kalike/" target="_blank" class="group bg-white p-5 rounded-2xl border border-slate-100 hover:shadow-xl hover:border-blue-200 transition-all text-center">
                <div class="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-700/20">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </div>
                <p class="text-xs font-black text-slate-900">LinkedIn</p>
                <p class="text-[9px] text-slate-400 mt-1">Professional Network</p>
            </a>
            <a href="https://www.instagram.com/kalikefdn/" target="_blank" class="group bg-white p-5 rounded-2xl border border-slate-100 hover:shadow-xl hover:border-pink-200 transition-all text-center">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </div>
                <p class="text-xs font-black text-slate-900">Instagram</p>
                <p class="text-[9px] text-slate-400 mt-1">Visual Stories</p>
            </a>
        </div>

        <!-- Employee Advocacy Section -->
        <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-6">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center"><span class="material-symbols-outlined">campaign</span></div>
                <div>
                    <h3 class="text-sm font-black text-slate-900 uppercase tracking-tight">Employee Advocacy Program</h3>
                    <p class="text-[10px] text-slate-400">Help amplify Kalike's reach — share our content on your personal profiles!</p>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-white rounded-xl p-4 border border-indigo-100">
                    <h4 class="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Why Share?</h4>
                    <ul class="space-y-2 text-[11px] text-slate-600">
                        <li class="flex items-start gap-2"><span class="text-indigo-500">✓</span>Increases Kalike's visibility by 561% (LinkedIn data)</li>
                        <li class="flex items-start gap-2"><span class="text-indigo-500">✓</span>Builds your professional brand alongside Kalike</li>
                        <li class="flex items-start gap-2"><span class="text-indigo-500">✓</span>Helps attract donors, partners & talent</li>
                        <li class="flex items-start gap-2"><span class="text-indigo-500">✓</span>Top advocates earn recognition in monthly reviews</li>
                    </ul>
                </div>
                <div class="bg-white rounded-xl p-4 border border-indigo-100">
                    <h4 class="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">How to Participate</h4>
                    <ul class="space-y-2 text-[11px] text-slate-600">
                        <li class="flex items-start gap-2"><span class="text-indigo-500">1.</span>Follow Kalike on all platforms above</li>
                        <li class="flex items-start gap-2"><span class="text-indigo-500">2.</span>Like, comment & share at least 2 posts per week</li>
                        <li class="flex items-start gap-2"><span class="text-indigo-500">3.</span>Tag @KalikeFdn when sharing field stories</li>
                        <li class="flex items-start gap-2"><span class="text-indigo-500">4.</span>Use hashtags: #Kalike #Education #India</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Website -->
        <div class="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 class="text-xs font-black text-slate-900 uppercase tracking-[.15em] mb-4">Kalike Official Website</h3>
            <a href="https://kalike.org" target="_blank" class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all group">
                <div class="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined text-2xl">language</span>
                </div>
                <div>
                    <p class="text-sm font-black text-slate-900">kalike.org</p>
                    <p class="text-[10px] text-slate-400">Visit our official website</p>
                </div>
                <span class="material-symbols-outlined ml-auto text-slate-400 group-hover:text-accent">open_in_new</span>
            </a>
        </div>
    </div>`;
}
