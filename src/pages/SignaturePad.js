import { db } from '../mock/db.js';

export function showSignatureModal(refId, user, onSave) {
    const modalId = 'sig-modal-' + Date.now();
    const modalHtml = `
    <div id="${modalId}" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in">
            <div class="bg-slate-900 p-6 text-white flex justify-between items-center">
                <div>
                    <h3 class="text-sm font-black uppercase tracking-widest">Institutional Digital Signature</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Legally binding authorization for ${refId}</p>
                </div>
                <button onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <div class="p-8 space-y-6">
                <div class="relative bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl overflow-hidden group">
                    <canvas id="sig-canvas" width="400" height="200" class="w-full h-[200px] cursor-crosshair touch-none"></canvas>
                    <div id="sig-placeholder" class="absolute inset-0 flex flex-col items-center justify-center text-slate-300 pointer-events-none transition-opacity">
                        <span class="material-symbols-outlined text-4xl mb-2">draw</span>
                        <p class="text-[10px] font-black uppercase tracking-widest">Sign inside this box</p>
                    </div>
                </div>

                <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span>Secure Capture Active</span>
                    </div>
                    <button id="sig-clear" class="text-rose-500 hover:text-rose-600 transition-colors">Clear Pad</button>
                </div>

                <div class="flex gap-3 pt-2">
                    <button onclick="document.getElementById('${modalId}').remove()" class="flex-1 py-3 bg-slate-100 text-slate-600 text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                    <button id="sig-save" class="flex-[2] py-3 bg-accent text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:shadow-lg hover:shadow-accent/30 transition-all shadow-md">Confirm Signature</button>
                </div>
            </div>
            <div class="bg-slate-50 px-8 py-4 border-t border-slate-100">
                <p class="text-[9px] text-slate-400 font-medium text-center leading-relaxed">
                    By signing, you confirm authorization of this action. This signature will be timestamped and linked to your employee ID: <span class="font-black text-slate-600">${user.empId}</span>.
                </p>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const canvas = document.getElementById('sig-canvas');
    const ctx = canvas.getContext('2d');
    const placeholder = document.getElementById('sig-placeholder');
    const clearBtn = document.getElementById('sig-clear');
    const saveBtn = document.getElementById('sig-save');

    let drawing = false;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a'; // slate-900

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function startDraw(e) {
        drawing = true;
        placeholder.style.opacity = '0';
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault();
    }

    function draw(e) {
        if (!drawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        e.preventDefault();
    }

    function stopDraw() {
        drawing = false;
    }

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDraw);

    clearBtn.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        placeholder.style.opacity = '1';
    });

    saveBtn.addEventListener('click', () => {
        // Check if canvas is blank (roughly)
        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        if (canvas.toDataURL() === blank.toDataURL()) {
            alert('Please provide a signature');
            return;
        }

        const dataUrl = canvas.toDataURL();
        db.saveSignature(refId, user.empId, user.name, dataUrl);
        document.getElementById(modalId).remove();
        if (onSave) onSave(dataUrl);
    });
}
