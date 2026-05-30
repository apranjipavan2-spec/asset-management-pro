import { db } from '../mock/db.js';

export function renderPayrollPage(user) {
    const isAdmin = window.app.hasPermission('manage_payroll');
    const slips = isAdmin ? db.payroll : db.payroll.filter(p => p.empId === user.empId);
    const employees = db.users.filter(u => u.role === 'employee');
    const currentMonth = new Date().toISOString().slice(0, 7);

    window.exportPayslip = (id) => {
        const p = db.payroll.find(x => x.id === id);
        if (!p) return;

        function numberToWords(num) {
            var a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
            var b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
            if ((num = num.toString()).length > 9) return 'overflow';
            var n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            if (!n) return; var str = '';
            str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
            str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
            str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
            str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
            str += (n[5] != 0) ? ((str != '') ? '' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
            return (str.trim() + ' Only').replace('  ', ' ');
        }

        const dateObj = new Date(p.month + '-01');
        const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

        const content = document.createElement('div');
        content.style.padding = '40px';
        content.style.fontFamily = '"Times New Roman", Times, serif';
        content.style.color = '#000';
        content.style.width = '800px';
        content.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 22px; font-weight: bold; margin: 0; letter-spacing: 1px;">KALIKE</h1>
                <p style="font-size: 12px; margin: 2px 0;">#72 2nd Cross near GKW layout bus stop<br>GKW Layout Vijayanagar<br>Bengaluru-560040</p>
                <h2 style="font-size: 16px; font-weight: bold; margin: 15px 0 0 0;">Payslip for the month of ${monthName}</h2>
            </div>
            
            <div style="border: 1px solid #000; border-bottom: none;">
                <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                    <tr>
                        <td style="width: 25%; padding: 5px; border-right: none;">Name:</td>
                        <td style="width: 25%; padding: 5px; border-right: 1px solid #000;">${p.empName}</td>
                        <td style="width: 25%; padding: 5px; border-right: none;">Employee No:</td>
                        <td style="width: 25%; padding: 5px;">${p.empId}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; border-right: none;">Joining Date:</td>
                        <td style="padding: 5px; border-right: 1px solid #000;">${p.joiningDate || 'N/A'}</td>
                        <td style="padding: 5px; border-right: none;">Bank Name:</td>
                        <td style="padding: 5px;">${p.bankName || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; border-right: none;">Designation:</td>
                        <td style="padding: 5px; border-right: 1px solid #000;">${p.designation || 'N/A'}</td>
                        <td style="padding: 5px; border-right: none;">Bank Account No:</td>
                        <td style="padding: 5px;">${p.bankAccount || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; border-right: none;">Department:</td>
                        <td style="padding: 5px; border-right: 1px solid #000;">${p.department || 'N/A'}</td>
                        <td style="padding: 5px; border-right: none;">PAN Number:</td>
                        <td style="padding: 5px;">${p.panNumber || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; border-right: none;">Location:</td>
                        <td style="padding: 5px; border-right: 1px solid #000;">${p.location || 'N/A'}</td>
                        <td style="padding: 5px; border-right: none;">PF No:</td>
                        <td style="padding: 5px;">${p.pfNo || ''}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; border-right: none;">Effective Work Days:</td>
                        <td style="padding: 5px; border-right: 1px solid #000;">${p.effectiveWorkDays || 30}</td>
                        <td style="padding: 5px; border-right: none;">PF UAN:</td>
                        <td style="padding: 5px;">${p.pfUan || ''}</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px; border-right: none;">LOP:</td>
                        <td style="padding: 5px; border-right: 1px solid #000;">${p.lop || 0}</td>
                        <td style="padding: 5px; border-right: none;"></td>
                        <td style="padding: 5px;"></td>
                    </tr>
                </table>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #000;">
                <tr style="border-bottom: 1px solid #000; font-weight: bold;">
                    <td style="padding: 5px; border-right: none; width: 35%; text-align: center;">Earnings</td>
                    <td style="padding: 5px; border-right: none; width: 10%; text-align: right;">Master</td>
                    <td style="padding: 5px; border-right: 1px solid #000; width: 10%; text-align: right;">Actual</td>
                    <td style="padding: 5px; border-right: none; width: 35%; text-align: center;">Deductions</td>
                    <td style="padding: 5px; width: 10%; text-align: right;">Actual</td>
                </tr>
                <tr>
                    <td style="padding: 5px; border-right: none;">BASIC</td>
                    <td style="padding: 5px; border-right: none; text-align: right;">${p.basicSalary}</td>
                    <td style="padding: 5px; border-right: 1px solid #000; text-align: right;">${p.basicSalary}</td>
                    <td style="padding: 5px; border-right: none;">PF</td>
                    <td style="padding: 5px; text-align: right;">${p.pf || ''}</td>
                </tr>
                <tr>
                    <td style="padding: 5px; border-right: none;">HRA</td>
                    <td style="padding: 5px; border-right: none; text-align: right;">${p.hra}</td>
                    <td style="padding: 5px; border-right: 1px solid #000; text-align: right;">${p.hra}</td>
                    <td style="padding: 5px; border-right: none;">PROF TAX</td>
                    <td style="padding: 5px; text-align: right;">${p.professionalTax || ''}</td>
                </tr>
                <tr>
                    <td style="padding: 5px; border-right: none;">SPECIAL ALLOWANCE</td>
                    <td style="padding: 5px; border-right: none; text-align: right;">${p.specialAllowance}</td>
                    <td style="padding: 5px; border-right: 1px solid #000; text-align: right;">${p.specialAllowance}</td>
                    <td style="padding: 5px; border-right: none;"></td>
                    <td style="padding: 5px; text-align: right;"></td>
                </tr>
                <tr>
                    <td style="padding: 5px; border-right: none;">COMMUNICATION ALLOWANCE</td>
                    <td style="padding: 5px; border-right: none; text-align: right;"></td>
                    <td style="padding: 5px; border-right: 1px solid #000; text-align: right;">${p.communicationAllowance || ''}</td>
                    <td style="padding: 5px; border-right: none;"></td>
                    <td style="padding: 5px; text-align: right;"></td>
                </tr>
                <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000;">
                    <td style="padding: 5px; border-right: none;">Total Earnings:INR.</td>
                    <td style="padding: 5px; border-right: none; text-align: right;">${(p.basicSalary+p.hra+p.specialAllowance)}</td>
                    <td style="padding: 5px; border-right: 1px solid #000; text-align: right;">${p.grossSalary}</td>
                    <td style="padding: 5px; border-right: none;">Total Deductions:INR.</td>
                    <td style="padding: 5px; text-align: right;">${p.totalDeductions}</td>
                </tr>
                <tr>
                    <td colspan="5" style="padding: 10px 5px 5px 5px;">
                        Net Pay for the month ( Total Earnings - Total Deductions): <strong>${p.netSalary}</strong>
                    </td>
                </tr>
                <tr style="border-bottom: 1px solid #000;">
                    <td colspan="5" style="padding: 5px 5px 10px 5px; font-style: italic;">
                        (Rupees ${numberToWords(p.netSalary)})
                    </td>
                </tr>
            </table>
            
            <p style="font-size: 11px; text-align: center; margin-top: 5px;">This is a system generated payslip and does not require signature.</p>
        `;

        document.body.appendChild(content);
        
        const opt = {
            margin:       0.5,
            filename:     `Payslip_${p.empName.replace(/\s+/g, '_')}_${p.month}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(content).save().then(() => {
            document.body.removeChild(content);
        }).catch(err => {
            console.error('Payslip PDF generation failed:', err);
            if (content.parentNode) document.body.removeChild(content);
            alert('Could not generate the payslip PDF. Please try again.');
        });
    };

    return `
    <div class="w-full space-y-4 animate-fade-in-up">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="page-title">Payroll & Salary Slips</h1>
                <p class="page-subtitle">${isAdmin ? 'Generate & Distribute Salary Slips' : 'View Your Salary Slips'}</p>
            </div>
            ${isAdmin ? `<div class="flex gap-2"><button onclick="document.getElementById('master-salary-modal').classList.toggle('hidden')" class="btn-primary bg-indigo-600 hover:bg-indigo-700">
                <span class="material-symbols-outlined text-sm">edit_document</span> Update Salary Master
            </button>
            <button onclick="document.getElementById('pay-form').classList.toggle('hidden')" class="btn-primary">
                <span class="material-symbols-outlined text-sm">add</span> Generate Slip
            </button></div>` : ''}
        </div>

        <!-- Update Salary Master Form (Admin/Finance) -->
        ${isAdmin ? `
        <div id="master-salary-modal" class="hidden card p-4 space-y-3 border-indigo-100">
            <h3 class="card-title text-indigo-900">Update Employee Salary Structure</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="form-row">
                    <label class="form-label">Select Employee</label>
                    <select id="master-emp" class="form-input" onchange="(() => {
                        const opt = this.options[this.selectedIndex];
                        if (!opt.value) return;
                        document.getElementById('m-basic').value = opt.dataset.basebasic || 0;
                        document.getElementById('m-hra').value = opt.dataset.basehra || 0;
                        document.getElementById('m-conv').value = opt.dataset.baseconv || 0;
                        document.getElementById('m-special').value = opt.dataset.basespecial || 0;
                        document.getElementById('m-comm').value = opt.dataset.basecomm || 0;
                        document.getElementById('m-bank').value = opt.dataset.bank || '';
                        document.getElementById('m-pfno').value = opt.dataset.pf || '';
                        document.getElementById('m-pfuan').value = opt.dataset.uan || '';
                    }).call(this)">
                        <option value="">Select Employee</option>
                        ${employees.map(e => `<option value="${e.id}" data-basebasic="${e.baseBasic||0}" data-basehra="${e.baseHra||0}" data-baseconv="${e.baseConveyance||0}" data-basespecial="${e.baseSpecial||0}" data-basecomm="${e.baseComm||0}" data-bank="${e.bankName||''}" data-pf="${e.pfNo||''}" data-uan="${e.pfUan||''}">${e.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                <div class="form-row"><label class="form-label">Base Basic (₹)</label><input type="number" id="m-basic" class="form-input" /></div>
                <div class="form-row"><label class="form-label">Base HRA (₹)</label><input type="number" id="m-hra" class="form-input" /></div>
                <div class="form-row"><label class="form-label">Base Conv (₹)</label><input type="number" id="m-conv" class="form-input" /></div>
                <div class="form-row"><label class="form-label">Base Special (₹)</label><input type="number" id="m-special" class="form-input" /></div>
                <div class="form-row"><label class="form-label">Base Comm (₹)</label><input type="number" id="m-comm" class="form-input" /></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="form-row"><label class="form-label">Bank Name</label><input type="text" id="m-bank" class="form-input" /></div>
                <div class="form-row"><label class="form-label">PF No</label><input type="text" id="m-pfno" class="form-input" /></div>
                <div class="form-row"><label class="form-label">PF UAN</label><input type="text" id="m-pfuan" class="form-input" /></div>
            </div>
            <button onclick="(() => {
                const empId = document.getElementById('master-emp').value;
                if(!empId) return alert('Select an employee');
                const v = id => parseFloat(document.getElementById(id).value) || 0;
                db.updateSalaryMaster(empId, {
                    baseBasic: v('m-basic'), baseHra: v('m-hra'), baseConveyance: v('m-conv'), baseSpecial: v('m-special'), baseComm: v('m-comm'),
                    bankName: document.getElementById('m-bank').value, pfNo: document.getElementById('m-pfno').value, pfUan: document.getElementById('m-pfuan').value
                });
                alert('Salary Master Updated!');
                app.navigateTo('payroll');
            })()" class="btn-primary bg-indigo-600 hover:bg-indigo-700">Save Structure</button>
        </div>` : ''}

        <!-- Generate Payslip Form (Admin/Finance) -->
        ${isAdmin ? `
        <div id="pay-form" class="hidden card p-4 space-y-3">
            <h3 class="card-title">Generate Salary Slip</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="form-row">
                    <label class="form-label">Employee</label>
                    <select id="pay-emp" class="form-input" onchange="(() => {
                        const opt = this.options[this.selectedIndex];
                        if (!opt.value) return;
                        document.getElementById('pay-basic').value = opt.dataset.basebasic || 0;
                        document.getElementById('pay-hra').value = opt.dataset.basehra || 0;
                        document.getElementById('pay-conv').value = opt.dataset.baseconv || 0;
                        document.getElementById('pay-special').value = opt.dataset.basespecial || 0;
                        document.getElementById('pay-comm').value = opt.dataset.basecomm || 0;
                        if(window.updateAttendanceMetrics) window.updateAttendanceMetrics();
                    }).call(this)">
                        <option value="">Select Employee</option>
                        ${employees.map(e => `<option value="${e.id}" data-name="${e.name}" data-desg="${e.designation || ''}" data-dept="${e.department || ''}" data-loc="${e.location || ''}" data-join="${e.joiningDate || ''}" data-bank="${e.bankName || ''}" data-acc="${e.bankAccount || ''}" data-pan="${e.panNumber || ''}" data-pf="${e.pfNo || ''}" data-uan="${e.pfUan || ''}" data-basebasic="${e.baseBasic || 0}" data-basehra="${e.baseHra || 0}" data-baseconv="${e.baseConveyance || 0}" data-basespecial="${e.baseSpecial || 0}" data-basecomm="${e.baseComm || 0}">${e.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <label class="form-label">Month</label>
                    <input type="month" id="pay-month" value="${currentMonth}" class="form-input" onchange="(() => {
                        if(window.updateAttendanceMetrics) window.updateAttendanceMetrics();
                    })()" />
                </div>
                <div class="form-row">
                    <label class="form-label">Basic Salary (₹)</label>
                    <input type="number" id="pay-basic" placeholder="0" class="form-input" />
                </div>
            </div>
            
            <script>
                window.updateAttendanceMetrics = () => {
                    const empId = document.getElementById('pay-emp')?.value;
                    const month = document.getElementById('pay-month')?.value;
                    if (!empId || !month) return;
                    
                    const [year, m] = month.split('-');
                    const daysInMonth = new Date(year, m, 0).getDate();
                    
                    const records = db.attendance.filter(a => a.empId === empId && a.date.startsWith(month));
                    const wInput = document.getElementById('pay-workdays');
                    const lInput = document.getElementById('pay-lop');
                    
                    if (!wInput || !lInput) return;

                    if (records.length === 0) {
                        wInput.value = daysInMonth;
                        lInput.value = 0;
                        return;
                    }
                    
                    const presentDays = records.filter(a => a.status === 'Present').length;
                    const approvedLeaves = db.leaves.filter(l => l.empId === empId && l.status === 'Approved' && l.fromDate.startsWith(month));
                    const leaveDays = approvedLeaves.reduce((sum, l) => sum + (parseFloat(l.days) || 0), 0);
                    
                    const effectiveDays = presentDays + leaveDays;
                    wInput.value = effectiveDays;
                    
                    // Simple heuristic: assuming standard 22 working days for LOP calculation if records exist. 
                    // Actually, if we use total days, it subtracts weekends. For MVP, we'll let LOP = daysInMonth - effectiveDays (assuming 30-day continuous tracking)
                    lInput.value = Math.max(0, daysInMonth - effectiveDays);
                };
            </script>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="form-row"><label class="form-label">HRA</label><input type="number" id="pay-hra" placeholder="0" class="form-input" /></div>
                <div class="form-row"><label class="form-label">Conveyance</label><input type="number" id="pay-conv" placeholder="0" class="form-input" /></div>
                <div class="form-row"><label class="form-label">Special Allow.</label><input type="number" id="pay-special" placeholder="0" class="form-input" /></div>
                <div class="form-row"><label class="form-label">Comm. Allow.</label><input type="number" id="pay-comm" placeholder="0" class="form-input" /></div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div class="form-row"><label class="form-label">PF</label><input type="number" id="pay-pf" placeholder="0" class="form-input" /></div>
                <div class="form-row"><label class="form-label">ESI</label><input type="number" id="pay-esi" placeholder="0" class="form-input" /></div>
                <div class="form-row"><label class="form-label">TDS</label><input type="number" id="pay-tds" placeholder="0" class="form-input" /></div>
                <div class="form-row"><label class="form-label">Prof. Tax</label><input type="number" id="pay-pt" placeholder="0" class="form-input" /></div>
                <div class="form-row"><label class="form-label">Other Ded.</label><input type="number" id="pay-other-d" placeholder="0" class="form-input" /></div>
                <div class="form-row"><label class="form-label">Effective Days</label><input type="number" id="pay-workdays" placeholder="30" class="form-input" /></div>
                <div class="form-row"><label class="form-label">LOP (Days)</label><input type="number" id="pay-lop" placeholder="0" class="form-input" /></div>
            </div>
            <button onclick="(() => {
                const sel = document.getElementById('pay-emp');
                const empId = sel.value;
                const opt = sel.options[sel.selectedIndex];
                if (!empId) { alert('Select an employee'); return; }
                const v = (id) => parseFloat(document.getElementById(id).value) || 0;
                db.generatePayslip({ 
                    empId, 
                    empName: opt.dataset.name, 
                    designation: opt.dataset.desg, 
                    department: opt.dataset.dept,
                    location: opt.dataset.loc,
                    joiningDate: opt.dataset.join,
                    bankName: opt.dataset.bank,
                    bankAccount: opt.dataset.acc,
                    panNumber: opt.dataset.pan,
                    pfNo: opt.dataset.pf,
                    pfUan: opt.dataset.uan,
                    month: document.getElementById('pay-month').value, 
                    basicSalary: v('pay-basic'), 
                    hra: v('pay-hra'), 
                    conveyanceAllowance: v('pay-conv'), 
                    specialAllowance: v('pay-special'), 
                    communicationAllowance: v('pay-comm'), 
                    pf: v('pay-pf'), 
                    esi: v('pay-esi'), 
                    tds: v('pay-tds'), 
                    professionalTax: v('pay-pt'), 
                    otherDeductions: v('pay-other-d'),
                    effectiveWorkDays: v('pay-workdays'),
                    lop: v('pay-lop')
                });
                app.navigateTo('payroll');
            })()" class="btn-primary bg-fuchsia-600 hover:bg-fuchsia-700">Generate Payslip</button>
        </div>` : ''}

        <!-- Payslip List -->
        <div class="space-y-4">
            ${slips.length > 0 ? slips.map(p => `
                <div class="card overflow-hidden hover:shadow-md transition-all">
                    <div class="p-5">
                        <div class="flex items-center justify-between mb-4">
                            <div>
                                <h3 class="text-sm font-black text-slate-900">${p.empName}</h3>
                                <p class="text-[10px] text-slate-400">${p.designation || ''} • ${p.month}</p>
                            </div>
                            <div class="text-right">
                                <p class="text-lg font-black text-emerald-600 tabular-nums">₹${(p.netSalary || 0).toLocaleString('en-IN')}</p>
                                <span class="px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${p.status === 'Sent' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}">${p.status}</span>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-4 text-[11px]">
                            <div class="space-y-1">
                                <p class="text-[9px] font-black text-emerald-500 uppercase mb-1">Earnings</p>
                                <div class="flex justify-between"><span class="text-slate-500">Basic</span><span class="font-bold text-slate-900 tabular-nums">₹${(p.basicSalary||0).toLocaleString('en-IN')}</span></div>
                                <div class="flex justify-between"><span class="text-slate-500">HRA</span><span class="font-bold text-slate-900 tabular-nums">₹${(p.hra||0).toLocaleString('en-IN')}</span></div>
                                <div class="flex justify-between"><span class="text-slate-500">Conveyance</span><span class="font-bold text-slate-900 tabular-nums">₹${(p.conveyanceAllowance||0).toLocaleString('en-IN')}</span></div>
                                <div class="flex justify-between"><span class="text-slate-500">Special</span><span class="font-bold text-slate-900 tabular-nums">₹${(p.specialAllowance||0).toLocaleString('en-IN')}</span></div>
                                <div class="flex justify-between border-t border-slate-100 pt-1 mt-1"><span class="font-black text-slate-900">Gross</span><span class="font-black text-slate-900 tabular-nums">₹${(p.grossSalary||0).toLocaleString('en-IN')}</span></div>
                            </div>
                            <div class="space-y-1">
                                <p class="text-[9px] font-black text-rose-500 uppercase mb-1">Deductions</p>
                                <div class="flex justify-between"><span class="text-slate-500">PF</span><span class="font-bold text-slate-900 tabular-nums">₹${(p.pf||0).toLocaleString('en-IN')}</span></div>
                                <div class="flex justify-between"><span class="text-slate-500">ESI</span><span class="font-bold text-slate-900 tabular-nums">₹${(p.esi||0).toLocaleString('en-IN')}</span></div>
                                <div class="flex justify-between"><span class="text-slate-500">TDS</span><span class="font-bold text-slate-900 tabular-nums">₹${(p.tds||0).toLocaleString('en-IN')}</span></div>
                                <div class="flex justify-between"><span class="text-slate-500">Prof. Tax</span><span class="font-bold text-slate-900 tabular-nums">₹${(p.professionalTax||0).toLocaleString('en-IN')}</span></div>
                                <div class="flex justify-between border-t border-slate-100 pt-1 mt-1"><span class="font-black text-slate-900">Total Ded.</span><span class="font-black text-rose-600 tabular-nums">₹${(p.totalDeductions||0).toLocaleString('en-IN')}</span></div>
                            </div>
                        </div>
                        <div class="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                            <button onclick="window.exportPayslip('${p.id}')" class="btn-primary"><span class="material-symbols-outlined text-[12px]">download</span> Export PDF</button>
                            ${isAdmin && p.status !== 'Sent' ? `
                                <button onclick="db.markPayslipSent('${p.id}');app.navigateTo('payroll')" class="btn-primary bg-emerald-600 hover:bg-emerald-700"><span class="material-symbols-outlined text-sm">send</span>Mark as Sent</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('') : '<div class="card p-12 text-center text-xs text-slate-400 italic uppercase tracking-widest">No salary slips generated</div>'}
        </div>
    </div>`;
}
