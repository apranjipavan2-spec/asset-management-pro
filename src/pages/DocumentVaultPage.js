import { db } from '../mock/db.js';
import { showSignatureModal } from './SignaturePad.js';

export function renderDocumentVaultPage(user) {
    const isManager = user.role === 'manager' || user.role === 'finance';
    
    // Employee sees their own docs, Manager/Finance see all docs
    const docs = isManager ? db.documents : db.documents.filter(d => d.empId === user.empId);

    window.acknowledgeDoc = (docId) => {
        showSignatureModal(docId, user, () => {
            app.renderContent();
        });
    };

    const fileIcon = (type) => {
        if (type.includes('pdf')) return 'picture_as_pdf';
        if (type.includes('word') || type.includes('doc')) return 'description';
        if (type.includes('image') || type.includes('png') || type.includes('jpg')) return 'image';
        return 'draft';
    };

    const fileColor = (type) => {
        if (type.includes('pdf')) return 'text-red-500 bg-red-50 border-red-100';
        if (type.includes('word') || type.includes('doc')) return 'text-blue-500 bg-blue-50 border-blue-100';
        if (type.includes('image')) return 'text-purple-500 bg-purple-50 border-purple-100';
        return 'text-slate-500 bg-slate-50 border-slate-100';
    };

    setTimeout(() => {
        const form = document.getElementById('upload-doc-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const title = document.getElementById('doc-title').value;
                const type = document.getElementById('doc-type').value;
                // Mock file upload processing
                db.addDocument({
                    empId: user.empId,
                    title: title,
                    type: type,
                    url: '#',
                    uploadedBy: user.name
                });
                app.renderContent();
            });
        }
    }, 100);

    return `
        <div class="h-full flex flex-col space-y-6 fade-in">
            <!-- Header -->
            <div class="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner">
                        <span class="material-symbols-outlined text-2xl">folder_shared</span>
                    </div>
                    <div>
                        <h1 class="text-2xl font-black text-slate-900 tracking-tight uppercase">Document Vault</h1>
                        <p class="text-xs text-slate-500 font-bold tracking-widest uppercase mt-1">Secure Institutional Storage</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2">
                        <span class="material-symbols-outlined text-slate-400 text-sm">search</span>
                        <input type="text" placeholder="Search documents..." class="bg-transparent border-none outline-none text-sm text-slate-700 w-48 font-medium">
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                
                <!-- Main Vault -->
                <div class="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                    <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <span class="material-symbols-outlined text-slate-400">inventory_2</span>
                            Stored Documents
                        </h2>
                        <span class="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">${docs.length} Files</span>
                    </div>
                    <div class="p-5 overflow-y-auto flex-1">
                        ${docs.length === 0 ? `
                            <div class="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                                <span class="material-symbols-outlined text-5xl opacity-50">folder_open</span>
                                <p class="text-sm font-medium uppercase tracking-widest">Vault is empty</p>
                            </div>
                        ` : `
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                ${docs.map(doc => {
                                    const sig = db.signatures.find(s => s.refId === doc.id);
                                    return `
                                    <div class="p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all bg-white group flex flex-col gap-4">
                                        <div class="flex gap-4 items-start">
                                            <div class="w-10 h-10 rounded-xl flex items-center justify-center border ${fileColor(doc.type)} shrink-0">
                                                <span class="material-symbols-outlined">${fileIcon(doc.type)}</span>
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <h3 class="text-sm font-bold text-slate-800 truncate">${doc.title}</h3>
                                                <div class="flex items-center gap-2 mt-1">
                                                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${doc.type}</span>
                                                    <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span class="text-[10px] text-slate-400 font-medium">${new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                                </div>
                                                ${isManager ? `<p class="text-[10px] text-slate-400 mt-1 truncate">ID: ${doc.empId}</p>` : ''}
                                            </div>
                                            <button class="w-8 h-8 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100">
                                                <span class="material-symbols-outlined text-lg">download</span>
                                            </button>
                                        </div>
                                        
                                        ${sig ? `
                                            <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                                                <div class="flex items-center gap-2">
                                                    <span class="material-symbols-outlined text-emerald-600 text-sm">verified</span>
                                                    <div>
                                                        <p class="text-[9px] font-black text-emerald-700 uppercase leading-none">Acknowledged</p>
                                                        <p class="text-[8px] text-emerald-600 mt-1">${new Date(sig.signedAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <img src="${sig.signatureData}" class="h-6 object-contain mix-blend-multiply grayscale opacity-60" />
                                            </div>
                                        ` : `
                                            <button onclick="window.acknowledgeDoc('${doc.id}')" class="w-full py-2 bg-slate-50 text-slate-600 text-[10px] font-black rounded-xl uppercase tracking-widest border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all flex items-center justify-center gap-2">
                                                <span class="material-symbols-outlined text-sm">draw</span> Acknowledge
                                            </button>
                                        `}
                                    </div>
                                `;}).join('')}
                            </div>
                        `}
                    </div>
                </div>

                <!-- Upload Panel -->
                <div class="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col p-6">
                    <h2 class="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span class="material-symbols-outlined text-accent">upload_file</span>
                        Upload to Vault
                    </h2>
                    
                    <form id="upload-doc-form" class="space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Document Title</label>
                            <input type="text" id="doc-title" required class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all" placeholder="e.g., Q1 Policy Update">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Document Type</label>
                            <select id="doc-type" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all">
                                <option value="application/pdf">PDF Document</option>
                                <option value="application/msword">Word Document</option>
                                <option value="image/png">Image (PNG/JPG)</option>
                                <option value="text/plain">Text File</option>
                            </select>
                        </div>
                        
                        <div class="mt-4 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-colors cursor-pointer group">
                            <div class="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-transform mb-3">
                                <span class="material-symbols-outlined">cloud_upload</span>
                            </div>
                            <p class="text-sm font-bold text-slate-700">Click to browse or drag file</p>
                            <p class="text-xs text-slate-400 mt-1">Max file size: 50MB</p>
                        </div>

                        <button type="submit" class="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-accent transition-all shadow-md mt-6 flex items-center justify-center gap-2">
                            <span class="material-symbols-outlined text-sm">lock</span>
                            Secure Upload
                        </button>
                    </form>
                    
                    <div class="mt-auto pt-6 border-t border-slate-100">
                        <div class="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <span class="material-symbols-outlined text-amber-500">security</span>
                            <p class="text-xs text-amber-700 font-medium leading-tight">All documents are encrypted at rest and bound by Kalike's data retention policies.</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;
}
