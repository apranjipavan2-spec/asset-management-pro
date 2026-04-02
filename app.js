// ===== STATE =====
const ASSETS=[
{id:"AL-00482",name:"Dell Latitude 5540",sub:"Enterprise Workstation",category:"IT Equipment",status:"Active",location:"Main Office, Desk 12",health:"98%",purchaseDate:"2023-01-15",amount:125000,depRate:25,program:"Admin Operations",assignedTo:"Alex Thompson",team:"IT Support",office:"HQ Block A"},
{id:"AL-01293",name:"HP LaserJet Pro MFP",sub:"Office Peripherals",category:"Office Equipment",status:"Active",location:"Finance Dept, Room 4",health:"95%",purchaseDate:"2022-06-10",amount:85000,depRate:20,program:"Finance Ops",assignedTo:"Priya Sharma",team:"Finance",office:"HQ Block B"},
{id:"AL-09821",name:"Toyota Hilux 4x4",sub:"Field Operations Vehicle",category:"Vehicle",status:"Maintenance",location:"Field Office Hubli",health:"62%",purchaseDate:"2021-03-20",amount:1800000,depRate:15,program:"Rural Outreach",assignedTo:"Field Team Alpha",team:"Outreach",office:"Hubli Branch"},
{id:"AL-04412",name:"Epson EB-X51 Projector",sub:"Training & Presentation",category:"IT Equipment",status:"Active",location:"Training Hall, Level 2",health:"90%",purchaseDate:"2023-08-01",amount:75000,depRate:20,program:"Capacity Building",assignedTo:"Training Dept",team:"HR",office:"HQ Block A"},
{id:"AL-07881",name:"Industrial Water Purifier",sub:"Infrastructure Systems",category:"Infrastructure",status:"Storage",location:"Central Warehouse",health:"100%",purchaseDate:"2024-01-10",amount:250000,depRate:10,program:"Clean Water Grant",assignedTo:"Unassigned",team:"Operations",office:"Central Warehouse"},
{id:"AL-05590",name:"Solar Panel Kit 5kW",sub:"Renewable Energy Module",category:"Infrastructure",status:"Active",location:"Dharwad Field Office",health:"88%",purchaseDate:"2022-11-15",amount:450000,depRate:10,program:"Green Energy Initiative",assignedTo:"Dharwad Ops",team:"Energy",office:"Dharwad Branch"},
{id:"AL-03321",name:"Office Furniture Set",sub:"Modular Workspace Config",category:"Furniture",status:"Active",location:"Main Office, Wing A",health:"85%",purchaseDate:"2021-07-01",amount:180000,depRate:10,program:"Admin Operations",assignedTo:"Admin",team:"Admin",office:"HQ Block A"},
{id:"AL-08812",name:"Generator 15KVA Diesel",sub:"Power Backup System",category:"Infrastructure",status:"Maintenance",location:"Belgaum Office",health:"45%",purchaseDate:"2020-09-15",amount:350000,depRate:15,program:"Power Backup",assignedTo:"Belgaum Team",team:"Operations",office:"Belgaum Branch"}
];
const GRANTS=[
{id:"G-2024-CW",name:"Clean Water Program",program:"Water & Sanitation",openingBal:5000000,spent:1250000,items:["Water Purifier Industrial","Pipelines Kit"],date:"2024-01-15"},
{id:"G-2024-GE",name:"Green Energy Initiative",program:"Sustainable Energy",openingBal:8000000,spent:3200000,items:["Solar Panel Kit 5kW","Inverter Sets"],date:"2023-11-01"},
{id:"G-2023-RO",name:"Rural Outreach Fund",program:"Community Development",openingBal:3000000,spent:2100000,items:["Toyota Hilux","Field Kits"],date:"2023-04-20"},
{id:"G-2024-CB",name:"Capacity Building Grant",program:"Education & Training",openingBal:2000000,spent:450000,items:["Projector Epson EB-X51","Training Materials"],date:"2024-03-10"}
];
let maintLogs=JSON.parse(localStorage.getItem('amp_m')||'[]');
let requests=JSON.parse(localStorage.getItem('amp_r')||'[]');
function save(){localStorage.setItem('amp_m',JSON.stringify(maintLogs));localStorage.setItem('amp_r',JSON.stringify(requests))}
let user=JSON.parse(localStorage.getItem('amp_u')||'null');
let page='dashboard';
function fmt(n){return'₹'+n.toLocaleString('en-IN')}
function calcDep(a){let y=(new Date()-new Date(a.purchaseDate))/(365.25*864e5);return Math.min(a.amount,Math.round(a.amount*a.depRate/100*y))}
function nbv(a){return a.amount-calcDep(a)}

// ===== ROUTING =====
function nav(p){page=p;location.hash=p;render()}
function login(r){
const u={employee:{name:'Alex Thompson',role:'employee',title:'Field Employee'},manager:{name:'Sarah Miller',role:'manager',title:'Head of Operations'},finance:{name:'David Chen',role:'finance',title:'Finance Controller'}};
user=u[r];localStorage.setItem('amp_u',JSON.stringify(user));nav('dashboard');
}
function logout(){user=null;localStorage.removeItem('amp_u');nav('login')}
window.addEventListener('hashchange',()=>{page=location.hash.slice(1)||'dashboard';render()});
page=location.hash.slice(1)||(user?'dashboard':'login');

// ===== RENDER =====
function render(){
const el=document.getElementById('app');
if(!user&&page!=='login'){page='login'}
if(page==='login'){renderLogin(el);return}
renderShell(el);
}

function renderLogin(el){
el.innerHTML=`<div class="min-h-screen flex items-center justify-center bg-[#f0f4f7]">
<div class="max-w-md w-full bg-white monolith-shadow p-10 rounded-lg text-center space-y-8 fade-in">
<div><div class="w-14 h-14 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4"><span class="material-symbols-outlined text-white text-2xl" style="font-variation-settings:'FILL' 1">domain</span></div>
<h1 class="text-xl font-bold headline-font text-[#0f172a]">Asset Management Pro</h1>
<p class="text-[10px] uppercase tracking-[.2em] text-outline font-bold mt-2">Institutional Grade Platform</p></div>
<div class="space-y-3">
${[['employee','person','Employee Portal','Request & Track Assets'],['manager','admin_panel_settings','Asset Manager','Operations & Inventory'],['finance','account_balance','Finance Officer','Valuation & Compliance']].map(([r,i,t,s])=>`
<button onclick="login('${r}')" class="w-full py-4 px-5 bg-surface-container-lowest border border-surface-container-high rounded-md hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-4 group text-left">
<span class="material-symbols-outlined text-primary text-xl group-hover:scale-110 transition-transform">${i}</span>
<div><p class="font-bold text-on-surface text-sm">${t}</p><p class="text-[10px] text-on-surface-variant">${s}</p></div>
<span class="material-symbols-outlined ml-auto text-outline-variant group-hover:text-primary text-sm">arrow_forward</span></button>`).join('')}
</div>
<p class="text-[9px] text-outline font-medium tracking-widest uppercase">Secure Encrypted Gateway • v2.0</p>
</div></div>`;
}

function getNavItems(){
const n={employee:[{id:'dashboard',l:'My Assets',i:'inventory'},{id:'request',l:'Request Asset',i:'add_shopping_cart'},{id:'issues',l:'Report Issue',i:'report_problem'}],
manager:[{id:'dashboard',l:'Overview',i:'dashboard'},{id:'registry',l:'Registry',i:'inventory_2'},{id:'transfers',l:'Transfers',i:'swap_horiz'},{id:'maintenance',l:'Maintenance',i:'construction'}],
finance:[{id:'dashboard',l:'Overview',i:'dashboard'},{id:'assets_ledger',l:'Fixed Assets',i:'account_balance'},{id:'depreciation',l:'Depreciation',i:'trending_down'},{id:'grants',l:'Grant Ledger',i:'receipt_long'},{id:'liabilities',l:'Liabilities',i:'payments'},{id:'reports',l:'Reporting',i:'analytics'}]};
return n[user.role];
}

function renderShell(el){
const items=getNavItems();
const isFinance=user.role==='finance';
const title=items.find(n=>n.id===page)?.l||page;
// Finance uses Equity Ledger branding, Manager uses Asset Ledger
const brand=isFinance?{name:'Equity Ledger',sub:'Financial Control'}:{name:'Asset Ledger',sub:'Institutional Grade'};

el.innerHTML=`<div class="flex h-screen overflow-hidden">
<!-- SIDEBAR: White bg matching originals -->
<aside class="fixed left-0 top-0 h-full w-64 bg-white shadow-[4px_0_24px_rgba(42,52,57,0.04)] flex flex-col py-8 px-4 z-50 ${isFinance?'border-r border-[#e2e8f0]':''}">
<div class="mb-10 px-4">
${isFinance?`<div class="flex items-center gap-3"><div class="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center"><span class="material-symbols-outlined text-white" style="font-variation-settings:'FILL' 1">account_balance</span></div><div><h1 class="font-bold tracking-tight text-[#0F172A] text-lg headline-font leading-tight">${brand.name}</h1><p class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">${brand.sub}</p></div></div>`
:`<h1 class="text-lg font-bold text-[#0f172a] headline-font leading-tight">${brand.name}</h1><p class="text-[10px] font-medium uppercase tracking-widest text-slate-400 mt-1">${brand.sub}</p>`}
</div>
<nav class="flex-1 space-y-1">
${items.map(n=>{
const active=page===n.id;
if(isFinance){
return`<a onclick="nav('${n.id}')" class="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all rounded-lg text-sm ${active?'bg-[#f1f5f9] text-[#0F172A] font-bold shadow-sm border border-[#e2e8f0]':'text-[#475569] hover:bg-[#f1f5f9]'} font-medium">
<span class="material-symbols-outlined text-[20px]" ${active?'style="font-variation-settings:\'FILL\' 1"':''}>${n.i}</span><span>${n.l}</span></a>`;
} else {
return`<a onclick="nav('${n.id}')" class="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all text-sm ${active?'bg-[#f0f4f7] text-[#000060] rounded-md border-l-4 border-[#000060] font-medium':'text-slate-600 hover:bg-[#f7f9fb] font-medium'}">
<span class="material-symbols-outlined" ${active?'style="font-variation-settings:\'FILL\' 1"':''}>${n.i}</span><span>${n.l}</span></a>`;
}}).join('')}
</nav>
<div class="mt-auto px-4 pt-6 border-t border-surface-container-high">
<div class="flex items-center gap-3 mb-3">
<div class="w-10 h-10 rounded-md bg-surface-container-highest flex items-center justify-center text-xs font-bold">${user.name.split(' ').map(w=>w[0]).join('')}</div>
<div><p class="text-sm font-bold text-on-surface">${user.name}</p><p class="text-[10px] text-on-surface-variant font-medium">${user.title}</p></div>
</div>
<button onclick="logout()" class="w-full py-2 text-xs font-medium text-on-surface-variant hover:text-error hover:bg-error/5 rounded-md transition-all flex items-center justify-center gap-2">
<span class="material-symbols-outlined text-sm">logout</span>Sign Out</button>
</div>
</aside>
<!-- MAIN -->
<div class="ml-64 flex flex-col min-h-screen flex-1">
<header class="flex justify-between items-center w-full px-8 h-16 bg-[#f7f9fb] sticky top-0 z-40">
<div class="flex items-center gap-6">
<h2 class="headline-font font-bold text-lg text-[#0f172a] tracking-tight">${title}</h2>
<div class="relative hidden lg:block">
<span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
<input class="bg-surface-container-low border-none rounded-md px-4 py-2 pl-10 text-sm focus:ring-1 focus:ring-primary/20 w-64" placeholder="Search registry..." type="text"/>
</div></div>
<div class="flex items-center gap-4">
<button class="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-[#e1e9ee] rounded-md transition-colors relative">
<span class="material-symbols-outlined">notifications</span>
<span class="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-[#f7f9fb]"></span>
</button>
<button class="w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-[#e1e9ee] rounded-md transition-colors">
<span class="material-symbols-outlined">account_circle</span></button>
</div></header>
<main class="flex-1 p-8 overflow-y-auto"><div id="content" class="fade-in"></div></main>
</div></div>`;
renderPage();
}

// ===== HELPERS =====
function metricCard(label,value,icon,borderColor){
return`<div class="bg-surface-container-lowest p-6 monolith-shadow relative overflow-hidden border-l-4 ${borderColor}">
<p class="text-[10px] font-medium text-on-surface-variant uppercase tracking-wider mb-1 font-label">${label}</p>
<h3 class="text-3xl font-extrabold headline-font text-on-surface">${value}</h3>
<div class="absolute -right-4 -bottom-4 opacity-5"><span class="material-symbols-outlined text-8xl">${icon}</span></div></div>`;
}
function badge(s){
const m={Active:'bg-primary-container text-on-primary-container',Healthy:'bg-primary-container text-on-primary-container',Maintenance:'bg-tertiary-container text-on-tertiary-container',Pending:'bg-tertiary-container text-on-tertiary-container',Storage:'bg-surface-container-highest text-on-surface-variant',Overdue:'bg-error-container text-on-error-container',Resolved:'bg-secondary-container text-[#386254]','In Progress':'bg-primary-container text-on-primary-container'};
return`<span class="px-2.5 py-0.5 rounded-sm text-[10px] font-bold ${m[s]||'bg-surface-container-high text-on-surface-variant'}">${s}</span>`;
}
function tblWrap(title,inner,actions){
return`<div class="bg-surface-container-lowest monolith-shadow rounded-sm overflow-hidden">
${title?`<div class="px-6 py-4 bg-surface-container-low flex items-center justify-between"><h4 class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest headline-font">${title}</h4>${actions||''}</div>`:''}
<div class="overflow-x-auto">${inner}</div></div>`;
}

// ===== PAGE ROUTER =====
function renderPage(){
const c=document.getElementById('content');if(!c)return;
const key=user.role+'_'+page;
const pages={
employee_dashboard:pgEmpDash,employee_request:pgEmpReq,employee_issues:pgEmpIssue,
manager_dashboard:pgMgrDash,manager_registry:pgMgrReg,manager_transfers:pgMgrTrans,manager_maintenance:pgMgrMaint,
finance_dashboard:pgFinDash,finance_assets_ledger:pgFinAssets,finance_depreciation:pgFinDep,finance_grants:pgFinGrants,finance_liabilities:pgFinLiab,finance_reports:pgFinReports
};
const fn=pages[key];
c.innerHTML=fn?fn():'<p class="text-center text-on-surface-variant py-20">Page not found</p>';
}

// ===== EMPLOYEE =====
function pgEmpDash(){
const my=ASSETS.filter(a=>a.assignedTo===user.name);
return`<div class="space-y-8">
<div><h2 class="headline-font font-extrabold text-2xl text-on-surface tracking-tight">Welcome back, ${user.name.split(' ')[0]}</h2>
<p class="text-sm text-on-surface-variant mt-1">Your assigned equipment and operational status.</p></div>
<div class="grid grid-cols-3 gap-4">
${metricCard('Assigned Assets',my.length,'inventory','border-primary')}
${metricCard('Issues Reported',maintLogs.filter(m=>m.reporter===user.name).length,'report','border-error')}
${metricCard('Pending Requests',requests.filter(r=>r.user===user.name&&r.status==='Pending').length,'hourglass_top','border-tertiary-dim')}
</div>
${tblWrap('Assigned Equipment',`<table class="w-full text-left border-collapse"><thead class="bg-surface-container-low"><tr>
<th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Asset</th>
<th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Location</th>
<th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
<th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Action</th>
</tr></thead><tbody class="divide-y divide-surface-container-low">${my.length?my.map(a=>`<tr class="hover:bg-surface-container-low transition-colors">
<td class="py-4 px-6"><span class="font-bold text-on-surface text-sm block">${a.name}</span><span class="text-[10px] text-on-surface-variant font-medium">${a.sub}</span></td>
<td class="py-4 px-6 text-xs text-on-surface-variant">${a.location}</td>
<td class="py-4 px-6">${badge(a.status)}</td>
<td class="py-4 px-6"><button onclick="nav('issues')" class="text-xs font-bold text-primary hover:underline">Report Issue</button></td>
</tr>`).join(''):'<tr><td colspan="4" class="py-10 text-center text-sm text-on-surface-variant italic">No assets assigned to you.</td></tr>'}</tbody></table>`)}
</div>`;
}
function pgEmpReq(){
return`<div class="space-y-8">
<div><h2 class="headline-font font-extrabold text-2xl tracking-tight">Request New Asset</h2><p class="text-sm text-on-surface-variant mt-1">Submit a formal equipment requisition.</p></div>
<div class="bg-surface-container-lowest monolith-shadow p-8 rounded-sm max-w-2xl space-y-5">
<div><label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Category</label>
<select id="rC" class="w-full bg-surface-container-low border-none rounded-md px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20"><option>IT Equipment</option><option>Office Equipment</option><option>Vehicle</option><option>Furniture</option><option>Infrastructure</option></select></div>
<div><label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Justification</label>
<textarea id="rR" rows="4" class="w-full bg-surface-container-low border-none rounded-md px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20" placeholder="Explain reason..."></textarea></div>
<div><label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Program</label>
<input id="rP" class="w-full bg-surface-container-low border-none rounded-md px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20" placeholder="e.g. Rural Outreach"/></div>
<button onclick="submitReq()" class="bg-primary text-on-primary text-xs font-bold px-6 py-3 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"><span class="material-symbols-outlined text-sm">send</span>Submit Request</button>
</div>
${requests.filter(r=>r.user===user.name).length?tblWrap('Your Requests',`<table class="w-full text-left"><thead class="bg-surface-container-low"><tr><th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">ID</th><th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Category</th><th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Date</th><th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th></tr></thead><tbody class="divide-y divide-surface-container-low">${requests.filter(r=>r.user===user.name).map(r=>`<tr><td class="py-4 px-6 text-xs font-mono font-medium text-primary">${r.id}</td><td class="py-4 px-6 text-xs">${r.category}</td><td class="py-4 px-6 text-xs text-on-surface-variant">${new Date(r.date).toLocaleDateString()}</td><td class="py-4 px-6">${badge(r.status)}</td></tr>`).join('')}</tbody></table>`):''}
</div>`;
}
function pgEmpIssue(){
return`<div class="space-y-8">
<div><h2 class="headline-font font-extrabold text-2xl tracking-tight">Report an Issue</h2><p class="text-sm text-on-surface-variant mt-1">Log damage or maintenance request.</p></div>
<div class="bg-surface-container-lowest monolith-shadow p-8 rounded-sm max-w-2xl space-y-5">
<div><label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Select Asset</label>
<select id="iA" class="w-full bg-surface-container-low border-none rounded-md px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20">${ASSETS.map(a=>`<option value="${a.id}">${a.name} (${a.id})</option>`).join('')}</select></div>
<div><label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Issue Description</label>
<textarea id="iD" rows="4" class="w-full bg-surface-container-low border-none rounded-md px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20" placeholder="Describe the problem..."></textarea></div>
<div><label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Urgency</label>
<select id="iU" class="w-full bg-surface-container-low border-none rounded-md px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20"><option>LOW</option><option>MEDIUM</option><option selected>HIGH</option><option>CRITICAL</option></select></div>
<button onclick="submitIssue()" class="bg-error text-white text-xs font-bold px-6 py-3 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"><span class="material-symbols-outlined text-sm">report</span>Submit Report</button>
</div></div>`;
}

// ===== MANAGER =====
function pgMgrDash(){
const ac=ASSETS.filter(a=>a.status==='Active').length,mt=ASSETS.filter(a=>a.status==='Maintenance').length;
return`<div class="space-y-8">
<div class="grid grid-cols-4 gap-4">
${metricCard('Total Fleet Volume',ASSETS.length.toLocaleString(),'inventory','border-primary')}
${metricCard('Active Deployment',ac,'verified_user','border-tertiary')}
${metricCard('In Maintenance',mt,'build','border-[#005f44]')}
${metricCard('Pending Requests',requests.filter(r=>r.status==='Pending').length,'hourglass_top','border-outline')}
</div>
<div class="grid grid-cols-3 gap-4">
${['Main Office','Field Office Hubli','Dharwad'].map(loc=>`<div class="relative overflow-hidden rounded-md bg-surface-container-low group cursor-pointer h-36">
<div class="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent z-10"></div>
<div class="absolute bottom-0 left-0 p-4 w-full z-20">
<p class="text-[10px] font-bold text-primary-dim uppercase">${loc}</p>
<p class="text-lg font-bold text-on-surface">${ASSETS.filter(a=>a.location.toLowerCase().includes(loc.split(' ').pop().toLowerCase())).length} Assets</p>
</div></div>`).join('')}
</div>
${tblWrap('Active Asset Registry',`<table class="w-full text-left border-collapse"><thead class="bg-surface-container-low"><tr>
<th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Asset ID</th>
<th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Name</th>
<th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Category</th>
<th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
<th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Assignee</th>
<th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Location</th>
</tr></thead><tbody class="divide-y divide-surface-container-low">${ASSETS.map(a=>`<tr class="hover:bg-surface-container-low transition-colors">
<td class="py-4 px-6 font-mono text-xs font-medium text-primary">#${a.id}</td>
<td class="py-4 px-6"><span class="font-bold text-on-surface text-sm block">${a.name}</span><span class="text-[10px] text-on-surface-variant font-medium">${a.sub}</span></td>
<td class="py-4 px-6 text-xs font-medium">${a.category}</td>
<td class="py-4 px-6">${badge(a.status)}</td>
<td class="py-4 px-6"><div class="flex items-center gap-2"><div class="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold">${a.assignedTo.split(' ').map(w=>w[0]).join('').slice(0,2)}</div><span class="text-xs font-medium">${a.assignedTo}</span></div></td>
<td class="py-4 px-6 text-xs text-on-surface-variant">${a.location}</td>
</tr>`).join('')}</tbody></table>`,`<div class="flex gap-2"><button class="bg-primary text-on-primary text-xs font-bold px-6 py-2 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"><span class="material-symbols-outlined text-sm">add</span>Register New Asset</button></div>`)}
</div>`;
}
function pgMgrReg(){return pgMgrDash()}
function pgMgrTrans(){
return`<div class="space-y-8">
<div class="flex justify-between items-end"><div><h2 class="headline-font font-extrabold text-2xl tracking-tight">Assignment & Transfer Ledger</h2><p class="text-sm text-on-surface-variant mt-1">Execute check-ins, check-outs, and inter-departmental transfers.</p></div></div>
<div class="bg-surface-container-lowest monolith-shadow p-8 rounded-sm max-w-2xl space-y-5">
<div><label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Select Asset</label>
<select class="w-full bg-surface-container-low border-none rounded-md px-4 py-3 text-sm">${ASSETS.map(a=>`<option>${a.name} (#${a.id}) — ${a.location}</option>`).join('')}</select></div>
<div><label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Transfer To (Location)</label>
<input class="w-full bg-surface-container-low border-none rounded-md px-4 py-3 text-sm" placeholder="New location"/></div>
<div><label class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">Assign To (Person/Team)</label>
<input class="w-full bg-surface-container-low border-none rounded-md px-4 py-3 text-sm" placeholder="Person or team"/></div>
<button onclick="alert('Transfer recorded!')" class="bg-primary text-on-primary text-xs font-bold px-6 py-3 rounded-md hover:opacity-90 flex items-center gap-2 shadow-sm"><span class="material-symbols-outlined text-sm">swap_horiz</span>Execute Transfer</button>
</div>
${tblWrap('Current Assignments',`<table class="w-full text-left"><thead class="bg-surface-container-low"><tr><th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Asset</th><th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Location</th><th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Assigned To</th><th class="py-4 px-6 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Office</th></tr></thead><tbody class="divide-y divide-surface-container-low">${ASSETS.map(a=>`<tr class="hover:bg-surface-container-low transition-colors"><td class="py-4 px-6 text-sm font-bold">${a.name}</td><td class="py-4 px-6 text-xs">${a.location}</td><td class="py-4 px-6 text-xs">${a.assignedTo}</td><td class="py-4 px-6 text-xs text-on-surface-variant">${a.office}</td></tr>`).join('')}</tbody></table>`)}
</div>`;
}
function pgMgrMaint(){
const pending=maintLogs.filter(m=>m.status==='Pending'),inProg=maintLogs.filter(m=>m.status==='In Progress'),resolved=maintLogs.filter(m=>m.status==='Resolved');
function kanbanCard(m,border){return`<div class="bg-surface-container-lowest p-4 rounded shadow-sm border-l-4 ${border} hover:shadow-md transition-shadow cursor-pointer"><div class="flex justify-between items-start mb-2"><span class="text-[10px] font-bold text-outline uppercase font-label">#${m.id}</span><span class="text-[9px] px-2 py-0.5 ${m.urgency==='CRITICAL'||m.urgency==='HIGH'?'bg-error-container text-on-error-container':'bg-surface-container-highest text-on-surface-variant'} font-bold rounded">${m.urgency||'MEDIUM'}</span></div><h4 class="font-body font-semibold text-sm text-on-surface mb-3 leading-snug">${m.description?.slice(0,60)||'Issue reported'}</h4><div class="flex justify-between items-center text-[10px] text-outline font-medium"><span>${m.assetId}</span><span>${new Date(m.date).toLocaleDateString()}</span></div></div>`}
return`<div class="space-y-8">
<div class="flex justify-between items-end"><div><h2 class="headline-font font-extrabold text-2xl tracking-tight">Active Maintenance Workflow</h2><p class="text-sm text-outline mt-1">Operational status across all tracked assets.</p></div>
<div class="flex gap-3"><button class="flex items-center gap-2 bg-gradient-to-br from-[#000060] to-[#485367] text-white font-bold px-6 py-2 rounded-md monolith-shadow hover:opacity-90 text-sm"><span class="material-symbols-outlined text-lg">add</span>New Ticket</button></div></div>
<div class="grid grid-cols-4 gap-4 min-h-[400px]">
<div class="bg-surface-container-low rounded-lg p-4 flex flex-col gap-4"><div class="flex items-center justify-between mb-2"><h3 class="headline-font font-bold text-xs uppercase tracking-widest text-outline">Reported (${pending.length})</h3></div><div class="flex flex-col gap-3 overflow-y-auto">${pending.length?pending.map(m=>kanbanCard(m,'border-error')).join(''):'<p class="text-xs text-on-surface-variant italic text-center py-4">No tickets</p>'}</div></div>
<div class="bg-surface-container-low rounded-lg p-4 flex flex-col gap-4"><div class="flex items-center justify-between mb-2"><h3 class="headline-font font-bold text-xs uppercase tracking-widest text-outline">In Progress (${inProg.length})</h3></div><div class="flex flex-col gap-3 overflow-y-auto">${inProg.length?inProg.map(m=>kanbanCard(m,'border-primary')).join(''):'<p class="text-xs text-on-surface-variant italic text-center py-4">No tickets</p>'}</div></div>
<div class="bg-surface-container-low rounded-lg p-4 flex flex-col gap-4"><div class="flex items-center justify-between mb-2"><h3 class="headline-font font-bold text-xs uppercase tracking-widest text-outline">Awaiting Parts (0)</h3></div><p class="text-xs text-on-surface-variant italic text-center py-4">No tickets</p></div>
<div class="bg-surface-container-low rounded-lg p-4 flex flex-col gap-4"><div class="flex items-center justify-between mb-2"><h3 class="headline-font font-bold text-xs uppercase tracking-widest text-outline">Resolved (${resolved.length})</h3></div><div class="flex flex-col gap-3 overflow-y-auto opacity-70">${resolved.length?resolved.map(m=>kanbanCard(m,'border-tertiary')).join(''):'<p class="text-xs text-on-surface-variant italic text-center py-4">No tickets</p>'}</div></div>
</div></div>`;
}

// ===== FINANCE =====
function pgFinDash(){
const tv=ASSETS.reduce((s,a)=>s+a.amount,0),td=ASSETS.reduce((s,a)=>s+calcDep(a),0),nv=tv-td;
const cats=[...new Set(ASSETS.map(a=>a.category))];
return`<div class="space-y-10">
<div class="flex justify-between items-end"><div><h2 class="headline-font font-extrabold text-4xl text-[#0F172A] tracking-tight">Financial Overview</h2><p class="text-on-surface-variant text-base mt-2 font-medium">Real-time consolidated balance of organizational fixed assets.</p></div>
<div class="flex gap-3 text-[11px] font-extrabold uppercase tracking-widest"><span class="px-3 py-1.5 bg-[#e2e8f0] text-[#475569] rounded-lg">Fiscal Year 2024</span><span class="px-3 py-1.5 bg-[#0F172A] text-white rounded-lg shadow-sm">Active Period</span></div></div>
<div class="grid grid-cols-4 gap-6">${[['Total Purchase Value',fmt(tv),'border-[#0F172A]','+2.4%','vs. last quarter','text-emerald-600'],['Total Depreciation','-'+fmt(td),'border-[#94a3b8]',(td/tv*100).toFixed(1)+'%','accum. rate','text-error'],['Current Net Book Value',fmt(nv),'border-[#0F172A]',(nv/tv*100).toFixed(0)+'%','value retention','text-emerald-600'],['Active Assets',ASSETS.length,'border-[#1e293b]','','Last audit: 12 days ago','']].map(([l,v,b,t,s,c])=>`<div class="bg-white p-7 rounded-xl shadow-sm border border-[#e2e8f0] flex flex-col relative overflow-hidden"><div class="absolute left-0 top-0 bottom-0 w-[4px] ${b}"></div><span class="text-[11px] font-extrabold uppercase tracking-widest text-[#94a3b8] mb-2">${l}</span><span class="text-2xl headline-font font-extrabold text-[#0F172A] tabular-nums tracking-tight">${v}</span><div class="mt-5 flex items-center gap-2 text-xs font-bold text-[#94a3b8]">${t?`<span class="${c} font-extrabold">${t}</span>`:''} ${s}</div></div>`).join('')}</div>
<div class="grid grid-cols-3 gap-6"><div class="col-span-2 bg-white p-8 rounded-xl shadow-sm border border-[#e2e8f0]"><h3 class="text-base font-extrabold headline-font text-[#0F172A] mb-8">Asset Value by Category</h3><div class="space-y-6">${cats.map(cat=>{const cv=ASSETS.filter(a=>a.category===cat).reduce((s,a)=>s+a.amount,0);const pct=(cv/tv*100).toFixed(0);return`<div><div class="flex justify-between text-xs mb-2"><span class="font-extrabold text-[#0F172A]">${cat}</span><span class="text-[#94a3b8] font-bold tabular-nums">${fmt(cv)}</span></div><div class="w-full bg-[#f1f5f9] h-2 rounded-full overflow-hidden"><div class="bg-[#0F172A] h-full" style="width:${pct}%"></div></div></div>`}).join('')}</div></div>
<div class="bg-white p-8 rounded-xl shadow-sm border border-[#e2e8f0]"><h3 class="text-base font-extrabold headline-font text-[#0F172A] mb-8">Quick Summary</h3><div class="space-y-4">
<div class="bg-[#f8fafc] p-4 rounded-lg"><p class="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider">Value Retention</p><p class="text-lg font-extrabold text-emerald-600">${(nv/tv*100).toFixed(1)}%</p></div>
<div class="bg-[#f8fafc] p-4 rounded-lg"><p class="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider">Avg Dep. Rate</p><p class="text-lg font-extrabold">${(ASSETS.reduce((s,a)=>s+a.depRate,0)/ASSETS.length).toFixed(1)}%</p></div>
<div class="bg-[#f8fafc] p-4 rounded-lg"><p class="text-[10px] text-[#94a3b8] uppercase font-bold tracking-wider">Total Grants</p><p class="text-lg font-extrabold text-[#395ca9]">${fmt(GRANTS.reduce((s,g)=>s+g.openingBal,0))}</p></div>
</div></div></div></div>`;
}
function pgFinAssets(){
return`<div class="space-y-8"><h2 class="headline-font font-extrabold text-4xl text-[#0F172A] tracking-tight">Fixed Assets Ledger</h2>
<div class="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-[#f1f5f9]/50 border-b border-[#e2e8f0]">
<th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest">Asset ID</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest">Asset Name</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest">Purchase Date</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest">Cost Basis</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest text-right">Accum. Dep.</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest text-right">Net Book Value</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest text-center">Status</th>
</tr></thead><tbody class="divide-y divide-[#e2e8f0]/30">${ASSETS.map(a=>`<tr class="hover:bg-[#f1f5f9]/30 transition-colors">
<td class="px-8 py-6 text-xs font-extrabold tabular-nums text-[#0F172A]">${a.id}</td>
<td class="px-8 py-6"><div class="text-sm font-bold text-[#0F172A] mb-0.5">${a.name}</div><div class="text-[10px] text-[#475569] font-medium">${a.category} · ${a.office}</div></td>
<td class="px-8 py-6 text-xs tabular-nums text-[#475569] font-medium">${new Date(a.purchaseDate).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
<td class="px-8 py-6 text-sm font-bold tabular-nums text-[#0F172A]">${fmt(a.amount)}</td>
<td class="px-8 py-6 text-sm tabular-nums text-right text-error font-bold">-${fmt(calcDep(a))}</td>
<td class="px-8 py-6 text-sm font-extrabold tabular-nums text-right text-[#0F172A]">${fmt(nbv(a))}</td>
<td class="px-8 py-6 text-center"><span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${a.status==='Active'?'bg-[#0F172A] text-white':'bg-[#e2e8f0] text-[#475569]'}">${a.status}</span></td>
</tr>`).join('')}</tbody></table></div></div></div>`;
}
function pgFinDep(){
return`<div class="space-y-10">
<div class="flex justify-between items-start"><div><h2 class="headline-font font-extrabold text-4xl text-[#0F172A] tracking-tight mb-3">Depreciation Schedules</h2><p class="text-[#475569] max-w-2xl text-lg font-medium leading-relaxed">Automated calculation of periodic value adjustments across the complete asset register.</p></div>
<div class="flex flex-col gap-4"><div class="bg-white px-6 py-4 rounded-xl border border-[#e2e8f0] shadow-sm flex items-center gap-5 min-w-[280px]"><div class="w-1.5 h-10 bg-[#0F172A] rounded-full"></div><div><p class="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-1">Total Net Book Value</p><p class="text-2xl font-extrabold headline-font tabular-nums text-[#0F172A]">${fmt(ASSETS.reduce((s,a)=>s+nbv(a),0))}</p></div></div></div></div>
<div class="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden"><div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-[#f1f5f9]/50 border-b border-[#e2e8f0]">
<th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest">Asset</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest">Cost Basis</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest text-center">Method</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest text-center">Rate</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest text-right">Accum. Dep.</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest text-right">NBV</th><th class="px-8 py-5 text-[11px] font-bold text-[#475569] uppercase tracking-widest text-center">Status</th>
</tr></thead><tbody class="divide-y divide-[#e2e8f0]/30">${ASSETS.map(a=>`<tr class="hover:bg-[#f1f5f9]/30 transition-colors">
<td class="px-8 py-6"><div class="text-sm font-bold text-[#0F172A]">${a.name}</div><div class="text-[10px] text-[#475569]">${a.category} · ${a.office}</div></td>
<td class="px-8 py-6 text-sm font-bold tabular-nums text-[#0F172A]">${fmt(a.amount)}</td>
<td class="px-8 py-6 text-center"><span class="text-[10px] font-bold px-2 py-1 bg-[#f1f5f9] rounded uppercase tracking-wider text-[#475569]">SLM</span></td>
<td class="px-8 py-6 text-xs tabular-nums text-center font-bold">${a.depRate}%</td>
<td class="px-8 py-6 text-sm tabular-nums text-right text-error font-bold">-${fmt(calcDep(a))}</td>
<td class="px-8 py-6 text-sm font-extrabold tabular-nums text-right text-[#0F172A]">${fmt(nbv(a))}</td>
<td class="px-8 py-6 text-center"><span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#0F172A] text-white">Active</span></td>
</tr>`).join('')}</tbody></table></div></div></div>`;
}
function pgFinGrants(){
return`<div class="space-y-10">
<div class="flex flex-col md:flex-row md:items-end justify-between gap-8"><div><h2 class="headline-font font-extrabold text-4xl text-[#0F172A] tracking-tight">Active Grant Portfolio</h2><p class="text-[#475569] text-base mt-2 max-w-xl">Institutional funding oversight and program expenditure analysis.</p></div>
<div class="flex gap-6"><div class="bg-white p-6 min-w-[240px] shadow-sm border border-[#e2e8f0] rounded-xl relative overflow-hidden"><div class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0F172A]"></div><p class="text-[10px] font-bold text-[#475569] uppercase tracking-widest mb-2">Total Managed Capital</p><p class="text-3xl font-extrabold tabular-nums text-[#0F172A]">${fmt(GRANTS.reduce((s,g)=>s+g.openingBal,0))}</p></div></div></div>
<div class="bg-white border border-[#e2e8f0] rounded-xl shadow-sm overflow-hidden"><div class="px-8 py-5 border-b border-[#f1f5f9] flex justify-between items-center bg-[#f8fafc]/50"><h3 class="text-xs font-black uppercase tracking-[.2em] text-[#0F172A]">Primary Ledger Table</h3></div>
<div class="overflow-x-auto"><table class="w-full text-left border-collapse"><thead><tr class="bg-[#f8fafc]/30"><th class="px-8 py-5 text-[10px] font-black text-[#475569] uppercase tracking-widest border-b border-[#f1f5f9]">Grant Name</th><th class="px-8 py-5 text-[10px] font-black text-[#475569] uppercase tracking-widest border-b border-[#f1f5f9]">Program</th><th class="px-8 py-5 text-[10px] font-black text-[#475569] uppercase tracking-widest border-b border-[#f1f5f9] text-right">Opening Balance</th><th class="px-8 py-5 text-[10px] font-black text-[#475569] uppercase tracking-widest border-b border-[#f1f5f9] text-right">Expenditures</th><th class="px-8 py-5 text-[10px] font-black text-[#475569] uppercase tracking-widest border-b border-[#f1f5f9]">Utilization</th><th class="px-8 py-5 text-[10px] font-black text-[#475569] uppercase tracking-widest border-b border-[#f1f5f9] text-right">Closing Balance</th><th class="px-8 py-5 text-[10px] font-black text-[#475569] uppercase tracking-widest border-b border-[#f1f5f9] text-center">Status</th></tr></thead>
<tbody class="divide-y divide-[#f1f5f9]">${GRANTS.map(g=>{const pct=(g.spent/g.openingBal*100).toFixed(0);return`<tr class="hover:bg-[#f8fafc] transition-colors">
<td class="px-8 py-6"><div class="flex items-center gap-4"><div class="w-8 h-8 bg-[#f1f5f9] rounded-lg flex items-center justify-center text-[#0F172A]"><span class="material-symbols-outlined text-lg">description</span></div><span class="text-sm font-bold text-[#0F172A]">${g.name}</span></div></td>
<td class="px-8 py-6 text-sm font-medium text-[#64748b]">${g.program}</td>
<td class="px-8 py-6 text-sm tabular-nums font-medium text-[#0F172A] text-right">${fmt(g.openingBal)}</td>
<td class="px-8 py-6 text-sm tabular-nums font-bold text-error text-right">-${fmt(g.spent)}</td>
<td class="px-8 py-6"><div class="w-36"><div class="flex justify-between mb-1.5"><span class="text-[10px] font-extrabold text-[#0F172A] tabular-nums">${pct}%</span></div><div class="h-2 w-full bg-[#f1f5f9] rounded-full overflow-hidden"><div class="h-full ${parseInt(pct)>80?'bg-error':'bg-[#0F172A]'}" style="width:${pct}%"></div></div></div></td>
<td class="px-8 py-6 text-sm tabular-nums font-black text-[#0F172A] text-right">${fmt(g.openingBal-g.spent)}</td>
<td class="px-8 py-6 text-center"><span class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">Active</span></td>
</tr>`}).join('')}</tbody></table></div></div></div>`;
}
function pgFinLiab(){
const tv=ASSETS.reduce((s,a)=>s+a.amount,0),td=ASSETS.reduce((s,a)=>s+calcDep(a),0);
return`<div class="space-y-8"><h2 class="headline-font font-extrabold text-4xl text-[#0F172A] tracking-tight">Liabilities Overview</h2>
<div class="grid grid-cols-3 gap-6">
${metricCard('Outstanding Maintenance',fmt(maintLogs.filter(m=>m.status==='Pending').length*15000),'build','border-error')}
${metricCard('Pending Procurements',fmt(requests.filter(r=>r.status==='Pending').length*50000),'shopping_cart','border-[#005f44]')}
${metricCard('Net Liability',fmt(maintLogs.filter(m=>m.status==='Pending').length*15000+requests.filter(r=>r.status==='Pending').length*50000),'warning','border-[#0F172A]')}
</div>
<div class="bg-white rounded-xl border border-[#e2e8f0] p-8 shadow-sm"><h3 class="text-sm font-extrabold uppercase tracking-tight mb-4">Depreciation Liabilities</h3><p class="text-sm text-[#475569] mb-6">Total accumulated depreciation represents reduction in net worth.</p>
<div class="grid grid-cols-2 gap-4"><div class="p-4 bg-[#f8fafc] rounded-lg"><p class="text-[10px] text-[#94a3b8] uppercase font-bold">Gross Asset Value</p><p class="text-xl font-extrabold">${fmt(tv)}</p></div><div class="p-4 bg-red-50 rounded-lg"><p class="text-[10px] text-[#94a3b8] uppercase font-bold">Accumulated Depreciation</p><p class="text-xl font-extrabold text-error">-${fmt(td)}</p></div></div></div></div>`;
}
function pgFinReports(){
return`<div class="space-y-8"><h2 class="headline-font font-extrabold text-4xl text-[#0F172A] tracking-tight">Reporting Center</h2>
<div class="grid grid-cols-2 gap-6">${['Asset Register Summary','Depreciation Schedule','Grant Utilization Report','Maintenance Cost Report'].map(r=>`<div class="bg-white rounded-xl border border-[#e2e8f0] p-6 hover:shadow-md transition-all cursor-pointer group shadow-sm"><div class="flex items-center gap-4"><div class="w-12 h-12 bg-[#f1f5f9] rounded-xl flex items-center justify-center group-hover:bg-[#0F172A] group-hover:text-white transition-all"><span class="material-symbols-outlined">description</span></div><div><p class="text-sm font-bold text-[#0F172A]">${r}</p><p class="text-[10px] text-[#94a3b8]">Generate & Download</p></div><span class="material-symbols-outlined ml-auto text-[#cbd5e1] group-hover:text-[#0F172A]">download</span></div></div>`).join('')}</div></div>`;
}

// ===== ACTIONS =====
function submitReq(){
const c=document.getElementById('rC')?.value,r=document.getElementById('rR')?.value;
if(!r){alert('Please provide justification');return}
requests.unshift({id:'REQ-'+Date.now(),category:c,reason:r,user:user.name,date:new Date().toISOString(),status:'Pending'});save();alert('Request submitted!');nav('request');
}
function submitIssue(){
const a=document.getElementById('iA')?.value,d=document.getElementById('iD')?.value,u=document.getElementById('iU')?.value;
if(!d){alert('Describe the issue');return}
maintLogs.unshift({id:'T-'+Date.now(),assetId:a,description:d,urgency:u,reporter:user.name,date:new Date().toISOString(),status:'Pending'});save();alert('Issue reported! Manager notified.');nav('issues');
}

render();
