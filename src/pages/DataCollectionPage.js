export function renderDataCollectionPage(user) {
    return `
    <div class="space-y-6 animate-fade-in-up">
        <div>
            <h1 class="text-xl font-black text-slate-900 uppercase tracking-tight">Data Collection</h1>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">FieldGovern Survey & Data Collection Platform</p>
        </div>

        <div class="bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-50 rounded-3xl border border-indigo-100 p-8 text-center">
            <div class="w-20 h-20 rounded-3xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-600/20">
                <span class="material-symbols-outlined text-4xl">poll</span>
            </div>
            <h2 class="text-xl font-black text-slate-900 mb-2">FieldGovern Platform</h2>
            <p class="text-sm text-slate-500 max-w-md mx-auto mb-6">Access the FieldGovern platform for field surveys, data collection forms, and monitoring activities.</p>
            
            <a href="https://app.fieldgovern.com" target="_blank" class="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 hover:shadow-2xl hover:shadow-indigo-600/30 hover:-translate-y-0.5">
                <span class="material-symbols-outlined">open_in_new</span> Open FieldGovern
            </a>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 text-left">
                <div class="bg-white/80 rounded-xl p-4 border border-indigo-100/50">
                    <span class="material-symbols-outlined text-indigo-600 mb-2">assignment</span>
                    <h3 class="text-xs font-black text-slate-900 mb-1">Field Surveys</h3>
                    <p class="text-[10px] text-slate-500">Create and fill field surveys with offline support</p>
                </div>
                <div class="bg-white/80 rounded-xl p-4 border border-indigo-100/50">
                    <span class="material-symbols-outlined text-indigo-600 mb-2">bar_chart</span>
                    <h3 class="text-xs font-black text-slate-900 mb-1">Data Analytics</h3>
                    <p class="text-[10px] text-slate-500">Real-time dashboards and data visualization</p>
                </div>
                <div class="bg-white/80 rounded-xl p-4 border border-indigo-100/50">
                    <span class="material-symbols-outlined text-indigo-600 mb-2">location_on</span>
                    <h3 class="text-xs font-black text-slate-900 mb-1">GPS Tracking</h3>
                    <p class="text-[10px] text-slate-500">Geo-tagged data collection with location verification</p>
                </div>
            </div>
        </div>
    </div>`;
}
