/**
 * Generate the main HTML UI template
 */
export function getHtmlTemplate() {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>SDR Agent Console</title>
<style>
:root{
--bg-primary:#f9fafb;
--bg-card:#ffffff;
--bg-input:#ffffff;
--bg-section:#f9fafb;
--bg-pill:#f3f4f6;
--bg-money:#fef3c7;
--text-primary:#0a0a0a;
--text-secondary:#6b7280;
--text-money:#92400e;
--border-primary:#e5e7eb;
--border-secondary:#d1d5db;
--border-money:#fde68a;
--scrollbar-track:#f1f1f1;
--scrollbar-thumb:#888;
--scrollbar-thumb-hover:#555;
--blue-gradient-start:#0055FF;
--blue-gradient-end:#21D6EF;
--blue-50:#eff6ff;
--blue-500:#3b82f6;
--yellow-50:#fef3c7;
--yellow-500:#fbbf24;
--gray-50:#f9fafb;
--gray-100:#f3f4f6;
--gray-200:#e5e7eb;
--gray-300:#d1d5db;
--gray-500:#6b7280;
--gray-700:#374151;
--gray-950:#0a0a0a;
--white-950:#ffffff;
--shadow-sm:0 1px 2px 0 rgba(0,0,0,0.05);
--shadow-md:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);
--shadow-lg:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1);
--shadow-xl:0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1);
--shadow-blue-focus:0 0 0 3px rgba(59,130,246,0.4);
--radius-sm:6px;
--radius-md:8px;
--radius-lg:12px;
--radius-xl:16px;
--radius-2xl:20px;
--radius-3xl:24px;
--space-1:4px;
--space-2:8px;
--space-3:12px;
--space-4:16px;
--space-5:20px;
--space-6:24px;
--space-8:32px;
--space-10:40px;
--space-12:48px;
--font-size-xs:11px;
--font-size-sm:12px;
--font-size-base:14px;
--font-size-md:16px;
--font-size-lg:18px;
--font-size-xl:20px;
--font-size-2xl:24px;
--font-weight-medium:500;
--font-weight-semibold:600;
--font-weight-bold:700;
--line-height-tight:1.25;
--line-height-normal:1.5;
--line-height-relaxed:1.6;
--transition-fast:150ms cubic-bezier(0.4,0,0.2,1);
--transition-base:200ms cubic-bezier(0.4,0,0.2,1);
--transition-slow:300ms cubic-bezier(0.4,0,0.2,1);
}
body.dark-mode{
--bg-primary:#0f172a;
--bg-card:#1e293b;
--bg-input:#334155;
--bg-section:#1e293b;
--bg-pill:#334155;
--bg-money:#422006;
--text-primary:#f1f5f9;
--text-secondary:#94a3b8;
--text-money:#fcd34d;
--border-primary:#334155;
--border-secondary:#475569;
--border-money:#854d0e;
--scrollbar-track:#1e293b;
--scrollbar-thumb:#475569;
--scrollbar-thumb-hover:#64748b;
--blue-50:#1e3a5f;
--blue-500:#60a5fa;
--yellow-50:#422006;
--yellow-500:#fbbf24;
--shadow-md:0 4px 6px -1px rgba(0,0,0,0.3),0 2px 4px -2px rgba(0,0,0,0.3);
--shadow-lg:0 10px 15px -3px rgba(0,0,0,0.3),0 4px 6px -4px rgba(0,0,0,0.3);
--shadow-xl:0 20px 25px -5px rgba(0,0,0,0.3),0 8px 10px -6px rgba(0,0,0,0.3);
}
body{font-family:-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',system-ui,sans-serif;margin:var(--space-6);max-width:100%;background:var(--bg-primary);color:var(--text-primary);transition:background var(--transition-slow),color var(--transition-slow);font-size:var(--font-size-base);line-height:var(--line-height-normal);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
.row{display:flex;gap:var(--space-3);margin-bottom:var(--space-3)}
input,textarea{width:100%;padding:var(--space-3);border:1.5px solid var(--border-secondary);border-radius:var(--radius-md);font-size:var(--font-size-base);background:var(--bg-input);color:var(--text-primary);transition:all var(--transition-base);font-family:inherit;line-height:var(--line-height-normal)}
input:hover,textarea:hover{border-color:var(--gray-300)}
input:focus,textarea:focus{outline:none;border-color:var(--blue-500);box-shadow:var(--shadow-blue-focus)}
input::placeholder,textarea::placeholder{color:var(--text-secondary);opacity:0.6}
input:disabled,textarea:disabled{background:var(--gray-50);cursor:not-allowed;opacity:0.6}
textarea{height:90px;resize:vertical;min-height:60px}
.card{background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:var(--space-6);margin:var(--space-4) 0;box-shadow:var(--shadow-md);transition:all var(--transition-base);position:relative}
.card:hover{box-shadow:var(--shadow-lg);transform:translateY(-2px);border-color:var(--gray-200)}
.card h3{margin:0 0 var(--space-4) 0;font-size:var(--font-size-lg);font-weight:var(--font-weight-semibold);color:var(--text-primary);line-height:var(--line-height-tight)}
button{padding:var(--space-3) var(--space-5);cursor:pointer;border:1.5px solid transparent;border-radius:var(--radius-md);font-size:var(--font-size-sm);font-weight:var(--font-weight-semibold);transition:all var(--transition-base);background:var(--gray-100);color:var(--gray-950);box-shadow:var(--shadow-sm);position:relative;overflow:hidden;font-family:inherit;line-height:var(--line-height-normal);text-align:center}
button:hover{box-shadow:var(--shadow-md);transform:translateY(-1px);background:var(--gray-200)}
button:active{transform:translateY(0) scale(0.98);box-shadow:var(--shadow-sm)}
button:disabled{opacity:0.5;cursor:not-allowed;transform:none!important;box-shadow:var(--shadow-sm)!important}
button:focus-visible{outline:none;box-shadow:var(--shadow-blue-focus)}
body.dark-mode button{background:#475569;color:#f1f5f9;box-shadow:var(--shadow-md)}
body.dark-mode button:hover{background:#64748b;box-shadow:var(--shadow-lg)}
.muted{color:var(--text-secondary);font-size:var(--font-size-sm);line-height:var(--line-height-normal)}
.pill{display:inline-block;padding:var(--space-1) var(--space-2);border-radius:999px;background:var(--bg-pill);font-size:var(--font-size-xs);font-weight:var(--font-weight-semibold);color:var(--text-primary);line-height:1;box-shadow:var(--shadow-sm)}
.ok{color:#059669}
.bad{color:#dc2626}
.layout{display:flex;gap:var(--space-6);align-items:flex-start}
.left{flex:0 0 500px;min-width:500px}
.right{flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-6)}
@media(max-width:1400px){
.right{grid-template-columns:1fr}
.layout{flex-direction:column}
.left{flex:1;min-width:0}
}
.tiny{font-size:var(--font-size-xs);line-height:var(--line-height-normal)}
.kv{display:flex;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-2)}
.money{font-variant-numeric:tabular-nums;background:var(--bg-money);color:var(--text-money);border:1px solid var(--border-money);font-weight:var(--font-weight-semibold)}
.target-card{background:var(--bg-card);border:1.5px solid var(--border-primary);border-radius:var(--radius-lg);padding:var(--space-4);margin:var(--space-3) 0;transition:all var(--transition-base);box-shadow:var(--shadow-sm)}
.target-card:hover{box-shadow:var(--shadow-md);border-color:var(--gray-300);transform:translateY(-1px)}
.target-header{font-weight:var(--font-weight-semibold);font-size:var(--font-size-base);margin-bottom:var(--space-2);color:var(--text-primary);display:flex;align-items:center;flex-wrap:wrap;gap:var(--space-2)}
.x-link{color:#1d9bf0;text-decoration:none;font-size:var(--font-size-xs);margin-right:var(--space-2);font-weight:var(--font-weight-medium);transition:color var(--transition-fast)}
.x-link:hover{text-decoration:underline;color:#1a8cd8}
.web-link{color:#059669;text-decoration:none;font-size:var(--font-size-xs);font-weight:var(--font-weight-medium);transition:color var(--transition-fast)}
.web-link:hover{text-decoration:underline;color:#047857}
.section-header{background:var(--bg-section);padding:var(--space-3);border-radius:var(--radius-md);margin:var(--space-4) 0 var(--space-2) 0;border-left:4px solid var(--blue-500);box-shadow:var(--shadow-sm)}
.section-header h3{margin:0;font-size:var(--font-size-base);font-weight:var(--font-weight-semibold);color:var(--text-primary)}
.section-header .muted{margin-top:var(--space-1)}
.btn-primary{background:linear-gradient(135deg,var(--blue-gradient-start) 0%,var(--blue-gradient-end) 100%);color:var(--white-950);border-color:transparent;box-shadow:var(--shadow-md);font-weight:var(--font-weight-semibold)}
.btn-primary:hover{background:linear-gradient(135deg,#0048dd 0%,#1ac4d8 100%);box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.btn-primary:active{transform:translateY(0) scale(0.98);box-shadow:var(--shadow-md)}
.btn-success{background:#059669;color:white;border-color:transparent;box-shadow:var(--shadow-md)}
.btn-success:hover{background:#047857;box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.btn-info{background:#0284c7;color:white;border-color:transparent;box-shadow:var(--shadow-md)}
.btn-info:hover{background:#0369a1;box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.btn-warning{background:#f59e0b;color:white;border-color:transparent;box-shadow:var(--shadow-md)}
.btn-warning:hover{background:#d97706;box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.btn-danger{background:#dc2626;color:white;border-color:transparent;box-shadow:var(--shadow-md)}
.btn-danger:hover{background:#b91c1c;box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.btn-secondary{background:#6b7280;color:white;border-color:transparent;box-shadow:var(--shadow-md)}
.btn-secondary:hover{background:#4b5563;box-shadow:var(--shadow-lg);transform:translateY(-2px)}
body.dark-mode .btn-primary{background:linear-gradient(135deg,#3b82f6 0%,#38bdf8 100%);color:#0f172a}
body.dark-mode .btn-primary:hover{background:linear-gradient(135deg,#2563eb 0%,#0ea5e9 100%)}
body.dark-mode .btn-success{background:#34d399;color:#0f172a}
body.dark-mode .btn-success:hover{background:#10b981}
body.dark-mode .btn-info{background:#38bdf8;color:#0f172a}
body.dark-mode .btn-info:hover{background:#0ea5e9}
body.dark-mode .btn-warning{background:#fbbf24;color:#0f172a}
body.dark-mode .btn-warning:hover{background:#f59e0b}
body.dark-mode .btn-danger{background:#f87171;color:#0f172a}
body.dark-mode .btn-danger:hover{background:#ef4444}
body.dark-mode .btn-secondary{background:#94a3b8;color:#0f172a}
body.dark-mode .btn-secondary:hover{background:#64748b}
.card-scrollable{max-height:calc(100vh - 200px);overflow-y:auto}
.card-scrollable::-webkit-scrollbar{width:8px}
.card-scrollable::-webkit-scrollbar-track{background:var(--scrollbar-track);border-radius:var(--radius-md)}
.card-scrollable::-webkit-scrollbar-thumb{background:var(--scrollbar-thumb);border-radius:var(--radius-md);transition:background var(--transition-fast)}
.card-scrollable::-webkit-scrollbar-thumb:hover{background:var(--scrollbar-thumb-hover)}
.dark-mode-toggle{position:fixed;top:var(--space-5);right:var(--space-5);background:var(--bg-card);border:1.5px solid var(--border-primary);border-radius:var(--radius-md);padding:var(--space-3);cursor:pointer;font-size:20px;box-shadow:var(--shadow-md);z-index:1000;transition:all var(--transition-base);line-height:1}
.dark-mode-toggle:hover{transform:scale(1.1);box-shadow:var(--shadow-lg);border-color:var(--gray-300)}
.dark-mode-toggle:active{transform:scale(1.05)}
button.loading{position:relative;color:transparent;pointer-events:none}
button.loading::after{content:"";position:absolute;width:14px;height:14px;top:50%;left:50%;margin:-7px 0 0 -7px;border:2px solid currentColor;border-radius:50%;border-right-color:transparent;animation:button-spin 0.6s linear infinite}
@keyframes button-spin{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:var(--space-6);right:var(--space-6);background:var(--bg-card);border:1.5px solid var(--border-primary);border-radius:var(--radius-lg);padding:var(--space-4);box-shadow:var(--shadow-xl);z-index:9999;min-width:300px;animation:toast-slide-in 0.3s cubic-bezier(0.4,0,0.2,1)}
.toast.success{border-left:4px solid #059669}
.toast.error{border-left:4px solid #dc2626}
.toast.info{border-left:4px solid #0284c7}
@keyframes toast-slide-in{from{transform:translateX(400px);opacity:0}to{transform:translateX(0);opacity:1}}
@keyframes toast-slide-out{to{transform:translateX(400px);opacity:0}}
.shimmer{background:linear-gradient(90deg,var(--gray-100) 0%,var(--gray-200) 20%,var(--gray-100) 40%,var(--gray-100) 100%);background-size:200% 100%;animation:shimmer 1.5s ease-in-out infinite}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.focus-ring:focus-visible{outline:none;box-shadow:var(--shadow-blue-focus);border-color:var(--blue-500)}
.focus-ring-purple:focus-visible{outline:none;box-shadow:0 0 0 3px rgba(168,85,247,0.4);border-color:#a855f7}
.gradient-text{background:linear-gradient(135deg,var(--blue-gradient-start) 0%,var(--blue-gradient-end) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:var(--font-weight-semibold)}
.app-container{display:flex;height:100vh;overflow:hidden}
.sidebar{width:220px;background:var(--bg-card);border-right:1px solid var(--border-primary);display:flex;flex-direction:column;padding:var(--space-6) 0;box-shadow:var(--shadow-md)}
.sidebar-nav{display:flex;flex-direction:column;gap:var(--space-2);padding:0 var(--space-4)}
.tab-button{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-4);border:none;border-radius:var(--radius-md);background:transparent;color:var(--text-secondary);font-size:var(--font-size-base);font-weight:var(--font-weight-medium);text-align:left;cursor:pointer;transition:all var(--transition-base);width:100%;box-shadow:none}
.tab-button:hover{background:var(--bg-section);color:var(--text-primary);transform:none}
.tab-button.active{background:linear-gradient(135deg,var(--blue-gradient-start) 0%,var(--blue-gradient-end) 100%);color:white;font-weight:var(--font-weight-semibold);box-shadow:var(--shadow-sm)}
.tab-button.active:hover{transform:translateX(2px);box-shadow:var(--shadow-md)}
.tab-icon{font-size:18px;width:24px;text-align:center}
.tab-label{flex:1}
.main-content{flex:1;overflow-y:auto;padding:var(--space-6);background:var(--bg-primary)}
.tab-content{display:none}
.tab-content.active{display:block}
body.tabbed .layout{display:block;max-width:100%}
body.tabbed .left,body.tabbed .right{flex:none;width:100%;min-width:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(450px,1fr));gap:var(--space-6)}
body.tabbed{margin:0;max-width:none}
.stats-row{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-6);margin-bottom:var(--space-6)}
.stat-card{background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:var(--space-6);box-shadow:var(--shadow-md);display:flex;align-items:center;gap:var(--space-4);transition:all var(--transition-base)}
.stat-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-2px)}
.stat-icon{font-size:48px;opacity:0.9}
.stat-content{flex:1}
.stat-label{font-size:var(--font-size-sm);color:var(--text-secondary);font-weight:var(--font-weight-medium);margin-bottom:var(--space-1)}
.stat-value{font-size:var(--font-size-2xl);font-weight:var(--font-weight-bold);color:var(--text-primary);margin-bottom:var(--space-1)}
.stat-subtitle{font-size:var(--font-size-xs);color:var(--text-secondary)}
@media(max-width:1400px){body.tabbed .left,body.tabbed .right{grid-template-columns:1fr}}
@media(max-width:768px){.sidebar{width:70px}.tab-label{display:none}.tab-button{justify-content:center;padding:var(--space-3)}.stats-row{grid-template-columns:1fr}.app-container{flex-direction:column}.sidebar{width:100%;flex-direction:row;border-right:none;border-bottom:1px solid var(--border-primary);padding:var(--space-3) var(--space-4);overflow-x:auto}.sidebar-nav{flex-direction:row;gap:var(--space-2)}.tab-button{flex-direction:column;gap:var(--space-1);padding:var(--space-2);min-width:60px}.tab-label{display:block;font-size:var(--font-size-xs)}}
</style>
</head>
<body class="tabbed">
<div class="app-container">
<div class="sidebar">
<div style="padding:0 var(--space-4) var(--space-4);display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border-primary);margin-bottom:var(--space-4)">
<img src="/alchemyinc_logo.jpeg" alt="Alchemy" style="width:24px;height:24px">
<span style="font-weight:600;font-size:13px">SDR Console</span>
</div>
<div class="sidebar-nav">
<button class="tab-button active" data-tab="home">
<span class="tab-icon">🏠</span>
<span class="tab-label">Home</span>
</button>
<button class="tab-button" data-tab="followups">
<span class="tab-icon">💬</span>
<span class="tab-label">Follow-ups</span>
</button>
<button class="tab-button" data-tab="targets">
<span class="tab-icon">🎯</span>
<span class="tab-label">Top Targets</span>
</button>
<button class="tab-button" data-tab="active">
<span class="tab-icon">✅</span>
<span class="tab-label">Active Outreach</span>
</button>
<button class="tab-button" data-tab="approved">
<span class="tab-icon">📋</span>
<span class="tab-label">No Outreach</span>
</button>
</div>
</div>
<div class="main-content">
<div class="dark-mode-toggle" onclick="toggleDarkMode()" title="Toggle dark mode">🌙</div>
<div class="tab-content active" data-tab="home">
<div class="stats-row">
<div class="stat-card">
<div class="stat-icon">📨</div>
<div class="stat-content">
<div class="stat-label">Messages Sent</div>
<div class="stat-value" id="messagesSentCount">-</div>
<div class="stat-subtitle">Since 12:00 AM EST</div>
</div>
</div>
<div class="stat-card">
<div class="stat-icon">📋</div>
<div class="stat-content">
<div class="stat-label">Companies to Follow Up</div>
<div class="stat-value" id="followUpCount">-</div>
<div class="stat-subtitle">Awaiting response</div>
</div>
</div>
</div>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-6)">
<div style="display:flex;flex-direction:column;gap:var(--space-6)">
<div class="card">
<h3>Add Contact</h3>
<div class="row">
<input id="name" placeholder="Name (required)">
<input id="company" placeholder="Company (required)">
<input id="tg" placeholder="Telegram handle (@username)">
</div>
<div class="row">
<input id="notes" placeholder="Notes/angle (funding, hiring, chain, infra pain, etc.)">
</div>
<div class="row">
<button onclick="addContact()">Add + Generate Draft</button>
<button onclick="refreshQueue()">Refresh Queue</button>
<button onclick="checkClaude()">Check Claude</button>
</div>
<div id="status" class="muted"></div>
</div>
<div class="card">
<h3>Send Queue</h3>
<div id="queue" class="muted">Loading...</div>
</div>
</div>
<div style="display:flex;flex-direction:column;gap:var(--space-6)">
<div class="card">
<h3>Discover Users from X</h3>
<div class="row">
<input id="xCompanyHandle" placeholder="Company X handle (e.g., @alchemy)">
<button onclick="discoverFromX()">Discover Users</button>
</div>
<div id="xDiscoveryStatus" class="muted"></div>
</div>
<div class="card">
<h3>Sent Messages</h3>
<div class="muted tiny">Successfully sent outreach messages</div>
<div id="sentMessages" class="muted" style="margin-top:8px">Loading...</div>
</div>
</div>
</div>
</div>
<div class="tab-content" data-tab="followups">
<div class="left">
<div class="card">
<h3>Follow-Ups</h3>
<div class="muted tiny">Follow-up messages sent</div>
<div id="followUpMessages" class="muted" style="margin-top:8px">Loading...</div>
</div>
</div>
</div>
<div class="tab-content" data-tab="targets">
<div class="right">
<div class="card">
<h3>Top Target Teams</h3>
<div class="muted tiny">Web3 teams with ≥ $10M raised OR ≥ $500k monthly revenue</div>
<div class="row" style="margin-top:10px">
<button class="btn-secondary" onclick="refreshTargets()">Refresh</button>
<button class="btn-primary" onclick="researchTeams()">🔍 Research</button>
<button class="btn-info" onclick="openImporter()">+ Import</button>
</div>
<div id="researchStatus" class="muted" style="margin-top:8px"></div>
<div id="targets" class="muted card-scrollable" style="margin-top:8px">Loading...</div>
</div>
</div>
</div>
<div class="tab-content" data-tab="active">
<div class="right">
<div class="card">
<h3>✅ Active Outreach</h3>
<div class="muted tiny">Teams with messages sent</div>
<div id="approvedTargetsWithMessages" class="muted card-scrollable" style="margin-top:8px">Loading...</div>
</div>
</div>
</div>
<div class="tab-content" data-tab="approved">
<div class="right">
<div class="card">
<h3>📋 Approved - No Outreach</h3>
<div class="muted tiny">Teams you've approved but haven't contacted</div>
<div id="approvedTargetsNoMessages" class="muted card-scrollable" style="margin-top:8px">Loading...</div>
</div>
</div>
</div>
</div>
</div>
<script>
// Dark mode functionality
function toggleDarkMode(){
const body=document.body;
const toggle=document.querySelector('.dark-mode-toggle');
const isDark=body.classList.toggle('dark-mode');
toggle.textContent=isDark?'☀️':'🌙';
localStorage.setItem('darkMode',isDark?'enabled':'disabled');
}
// Load dark mode preference on page load
(function(){
const darkMode=localStorage.getItem('darkMode');
if(darkMode==='enabled'||(darkMode===null&&window.matchMedia('(prefers-color-scheme: dark)').matches)){
document.body.classList.add('dark-mode');
const toggle=document.querySelector('.dark-mode-toggle');
if(toggle)toggle.textContent='☀️';
}
})();
function fmtMoney(n){
const x=Number(n);
if(!Number.isFinite(x))return"—";
const abs=Math.abs(x);
if(abs>=1e9)return"$"+(x/1e9).toFixed(1).replace(/\\.0$/,"")+"B";
if(abs>=1e6)return"$"+(x/1e6).toFixed(1).replace(/\\.0$/,"")+"M";
if(abs>=1e3)return"$"+Math.round(x/1e3)+"k";
return"$"+Math.round(x);
}
function escapeHtml(s){
return(s||"").replace(/[&<>"']/g,(c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
async function refreshTargets(){
try{
const r=await fetch("/api/targets");
const items=await r.json();
const el=document.getElementById("targets");
if(!el)return;
el.innerHTML="";
if(!items.length){
el.innerHTML="<div class='muted'>No qualifying targets yet. Click Import to add teams.</div>";
return;
}
for(const t of items){
const card=document.createElement("div");
card.className="target-card";
const xLinkHtml=t.x_handle?("<a href='https://x.com/"+escapeHtml(t.x_handle.replace("@",""))+"' target='_blank' class='x-link'>@"+escapeHtml(t.x_handle.replace("@",""))+"</a>"):"";
const webLinkHtml=t.website?("<a href='"+escapeHtml(t.website)+"' target='_blank' class='web-link'>🌐 website</a>"):"";
const linksHtml=(xLinkHtml||webLinkHtml)?("<div style='margin-top:4px'>"+xLinkHtml+webLinkHtml+"</div>"):"";
card.innerHTML="<div class='target-header'>"+escapeHtml(t.team_name)+"</div>"+
linksHtml+
"<div class='kv'>"+
"<span class='pill money'>Raised: "+fmtMoney(t.raised_usd)+"</span>"+
"<span class='pill money'>Rev: "+fmtMoney(t.monthly_revenue_usd)+"/mo</span>"+
"</div>"+
(t.notes?"<div class='muted tiny' style='margin-top:6px'>"+escapeHtml(t.notes)+"</div>":"");
const actions=document.createElement("div");
actions.style.marginTop="8px";
actions.style.display="flex";
actions.style.gap="5px";
actions.style.flexWrap="wrap";
const dismissBtn=document.createElement("button");
dismissBtn.textContent="✕";
dismissBtn.className="btn-secondary";
dismissBtn.title="Dismiss";
dismissBtn.onclick=async()=>{
await fetch("/api/targets/"+t.id+"/dismiss",{method:"POST"});
await refreshTargets();
await refreshApprovedTargets();
};
actions.appendChild(dismissBtn);
if(!t.x_handle){
const findXBtn=document.createElement("button");
findXBtn.textContent="Find X";
findXBtn.className="btn-info";
findXBtn.onclick=async()=>{
findXBtn.textContent="...";
findXBtn.disabled=true;
const r=await fetch("/api/targets/"+t.id+"/find-x-handle",{method:"POST"});
const j=await r.json().catch(()=>({}));
if(r.ok&&j.x_handle){
await refreshTargets();
}else{
findXBtn.textContent="None";
setTimeout(()=>{findXBtn.textContent="Find X";findXBtn.disabled=false},2000);
}
};
actions.appendChild(findXBtn);
}
if(!t.website){
const findWebBtn=document.createElement("button");
findWebBtn.textContent="Find Web";
findWebBtn.className="btn-info";
findWebBtn.onclick=async()=>{
findWebBtn.textContent="...";
findWebBtn.disabled=true;
const r=await fetch("/api/targets/"+t.id+"/find-website",{method:"POST"});
const j=await r.json().catch(()=>({}));
if(r.ok&&j.website){
await refreshTargets();
}else{
findWebBtn.textContent="None";
setTimeout(()=>{findWebBtn.textContent="Find Web";findWebBtn.disabled=false},2000);
}
};
actions.appendChild(findWebBtn);
}
const approveBtn=document.createElement("button");
approveBtn.textContent="✓";
approveBtn.className="btn-success";
approveBtn.title="Approve";
approveBtn.onclick=async()=>{
await fetch("/api/targets/"+t.id+"/approve",{method:"POST"});
await refreshTargets();
await refreshApprovedTargets();
};
actions.appendChild(approveBtn);
card.appendChild(actions);
el.appendChild(card);
}
}catch(e){
console.error("refreshTargets error:",e);
const el=document.getElementById("targets");
if(el)el.innerHTML="<div class='muted bad'>Error loading targets</div>";
}
}
async function refreshApprovedTargets(){
try{
const r=await fetch("/api/targets/approved");
const items=await r.json();
const elWithMessages=document.getElementById("approvedTargetsWithMessages");
const elNoMessages=document.getElementById("approvedTargetsNoMessages");
if(!elWithMessages||!elNoMessages)return;
elWithMessages.innerHTML="";
elNoMessages.innerHTML="";
if(!items.length){
elNoMessages.innerHTML="<div class='muted'>No approved targets yet.</div>";
return;
}
const teamsWithMessages=items.filter(t=>t.messages_sent>0);
const teamsNoMessages=items.filter(t=>!t.messages_sent||t.messages_sent===0);
if(teamsWithMessages.length===0){
elWithMessages.innerHTML="<div class='muted'>No messages sent yet.</div>";
}
if(teamsNoMessages.length===0){
elNoMessages.innerHTML="<div class='muted'>All approved teams have been contacted.</div>";
}
const allTeams=[...teamsWithMessages,...teamsNoMessages];
for(const t of allTeams){
const isWithMessages=t.messages_sent>0;
const el=isWithMessages?elWithMessages:elNoMessages;
const card=document.createElement("div");
card.className="target-card";
card.style.position="relative";
const xLinkHtml=t.x_handle?("<a href='https://x.com/"+escapeHtml(t.x_handle.replace("@",""))+"' target='_blank' class='x-link'>@"+escapeHtml(t.x_handle.replace("@",""))+"</a>"):"";
const webLinkHtml=t.website?("<a href='"+escapeHtml(t.website)+"' target='_blank' class='web-link'>🌐 website</a>"):"";
const linksHtml=(xLinkHtml||webLinkHtml)?("<div style='margin-top:4px'>"+xLinkHtml+webLinkHtml+"</div>"):"";
const messagesSent=t.messages_sent||0;
const messagesBadge=messagesSent>0?("<span style='background:#10a37f;color:white;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:8px;font-weight:600'>"+messagesSent+" message"+(messagesSent===1?"":"s")+" sent</span>"):"";
const hasRaised=t.raised_usd&&t.raised_usd>0;
const hasRevenue=t.monthly_revenue_usd&&t.monthly_revenue_usd>0;
const raisedPill=hasRaised?"<span class='pill money'>Raised: "+fmtMoney(t.raised_usd)+"</span>":"";
const revenuePill=hasRevenue?"<span class='pill money'>Rev: "+fmtMoney(t.monthly_revenue_usd)+"/mo</span>":"";
const fundingPills=(hasRaised||hasRevenue)?"<div class='kv'>"+raisedPill+revenuePill+"</div>":"";
card.innerHTML="<div class='target-header'><span style='cursor:pointer;text-decoration:underline' data-edit-target-id='"+t.id+"'>"+escapeHtml(t.team_name)+"</span>"+messagesBadge+"</div>"+
linksHtml+
fundingPills+
(t.notes?"<div class='muted tiny' style='margin-top:6px'>"+escapeHtml(t.notes)+"</div>":"");
const deleteBtn=document.createElement("button");
deleteBtn.textContent="×";
deleteBtn.style.cssText="position:absolute;top:8px;right:8px;background:#ff4444;color:white;border:none;border-radius:4px;width:24px;height:24px;cursor:pointer;font-size:18px;line-height:1;padding:0;font-weight:bold";
deleteBtn.title="Delete team and all contacts";
deleteBtn.onclick=async()=>{
if(!confirm("Delete "+t.team_name+" and all associated contacts? This cannot be undone.")){
return;
}
try{
const res=await fetch("/api/targets/"+t.id,{
method:"DELETE"
});
if(res.ok){
card.remove();
}else{
const data=await res.json();
alert("Failed to delete: "+data.error);
}
}catch(err){
alert("Error deleting team: "+err.message);
}
};
card.appendChild(deleteBtn);
const editTitleSpan=card.querySelector('[data-edit-target-id]');
if(editTitleSpan){
editTitleSpan.onclick=()=>{
showEditTargetModal(t);
};
}
const actions=document.createElement("div");
actions.style.marginTop="8px";
actions.style.display="flex";
actions.style.gap="5px";
actions.style.flexWrap="wrap";
const quickAddBtn=document.createElement("button");
quickAddBtn.textContent="+ Add";
quickAddBtn.className="btn-primary";
quickAddBtn.onclick=()=>{
showQuickAddModal(t);
};
actions.appendChild(quickAddBtn);
if(t.x_handle){
const discoverBtn=document.createElement("button");
discoverBtn.textContent="🐦 X";
discoverBtn.className="btn-info";
discoverBtn.title="Discover X Users";
discoverBtn.onclick=async()=>{
discoverBtn.textContent="...";
discoverBtn.disabled=true;
try{
const res=await fetch("/api/targets/"+t.id+"/discover-x-users",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({max_users:5})
});
const data=await res.json();
if(res.ok){
alert("Found "+data.valid+" valid users! Check the queue.");
await refreshQueue();
discoverBtn.textContent="🐦 X";
discoverBtn.disabled=false;
}else{
if(data.code==="SEARCH_FAILED"){
alert("Search failed. Please try again or check console for details.");
}else{
alert("Error: "+data.error);
}
discoverBtn.textContent="🐦 X";
discoverBtn.disabled=false;
}
}catch(err){
alert("Error: "+err.message);
discoverBtn.textContent="🐦 X";
discoverBtn.disabled=false;
}
};
actions.appendChild(discoverBtn);
const allContactsBtn=document.createElement("button");
allContactsBtn.textContent="Search";
allContactsBtn.className="btn-success";
allContactsBtn.title="Search All Contacts";
allContactsBtn.onclick=async()=>{
allContactsBtn.textContent="...";
allContactsBtn.disabled=true;
try{
const res=await fetch("/api/targets/"+t.id+"/all-contacts",{
method:"POST",
headers:{"Content-Type":"application/json"}
});
const data=await res.json();
if(res.ok){
if(data.stored===0){
alert("All contacts found - no new contacts to add");
}else{
showAllContactsModal(t,data.contacts);
}
allContactsBtn.textContent="Search";
allContactsBtn.disabled=false;
await refreshQueue();
}else{
alert("Error: "+data.error);
allContactsBtn.textContent="Search";
allContactsBtn.disabled=false;
}
}catch(err){
alert("Error: "+err.message);
allContactsBtn.textContent="Search";
allContactsBtn.disabled=false;
}
};
actions.appendChild(allContactsBtn);
const viewContactsBtn=document.createElement("button");
viewContactsBtn.textContent="👥 View";
viewContactsBtn.className="btn-primary";
viewContactsBtn.title="View Contacts";
viewContactsBtn.onclick=async()=>{
viewContactsBtn.textContent="Loading...";
viewContactsBtn.disabled=true;
try{
const res=await fetch("/api/targets/"+t.id+"/view-contacts");
const data=await res.json();
if(res.ok){
if(data.contacts.length===0){
alert("No contacts found yet. Click 'All Contacts' to search.");
}else{
showAllContactsModal(t,data.contacts);
}
viewContactsBtn.textContent="👥 View";
viewContactsBtn.disabled=false;
}else{
alert("Error: "+data.error);
viewContactsBtn.textContent="👥 View";
viewContactsBtn.disabled=false;
}
}catch(err){
alert("Error: "+err.message);
viewContactsBtn.textContent="👥 View";
viewContactsBtn.disabled=false;
}
};
actions.appendChild(viewContactsBtn);
}
card.appendChild(actions);
el.appendChild(card);
}
}catch(e){
console.error("refreshApprovedTargets error:",e);
const elWithMessages=document.getElementById("approvedTargetsWithMessages");
const elNoMessages=document.getElementById("approvedTargetsNoMessages");
if(elWithMessages)elWithMessages.innerHTML="<div class='muted bad'>Error loading approved targets</div>";
if(elNoMessages)elNoMessages.innerHTML="<div class='muted bad'>Error loading approved targets</div>";
}
}
function showEditTargetModal(team){
const existing=document.getElementById("editTargetModal");
if(existing)existing.remove();
const modal=document.createElement("div");
modal.id="editTargetModal";
modal.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000";
const box=document.createElement("div");
box.style.cssText="background:#1e1e1e;padding:24px;border-radius:8px;width:500px;max-width:90%;max-height:80vh;overflow-y:auto;position:relative";
const closeBtn=document.createElement("button");
closeBtn.textContent="×";
closeBtn.style.cssText="position:absolute;top:12px;right:12px;background:#e0e0e0;color:#333;border:none;border-radius:4px;width:32px;height:32px;cursor:pointer;font-size:24px;line-height:1;padding:0;font-weight:bold";
closeBtn.title="Close";
closeBtn.onclick=()=>modal.remove();
box.appendChild(closeBtn);
const title=document.createElement("h3");
title.textContent="Edit "+team.team_name;
title.style.marginTop="0";
box.appendChild(title);
const form=document.createElement("div");
form.style.display="flex";
form.style.flexDirection="column";
form.style.gap="12px";
const xHandleLabel=document.createElement("label");
xHandleLabel.textContent="X/Twitter Handle:";
xHandleLabel.style.cssText="display:block;color:#fff;margin-bottom:4px;font-weight:500";
const xHandleInput=document.createElement("input");
xHandleInput.type="text";
xHandleInput.value=team.x_handle||"";
xHandleInput.placeholder="@company";
xHandleInput.style.cssText="width:100%;padding:10px;border:1px solid #555;background:#2a2a2a;color:#fff;border-radius:4px;font-size:14px";
form.appendChild(xHandleLabel);
form.appendChild(xHandleInput);
const websiteLabel=document.createElement("label");
websiteLabel.textContent="Website URL:";
websiteLabel.style.cssText="display:block;color:#fff;margin-bottom:4px;font-weight:500";
const websiteInput=document.createElement("input");
websiteInput.type="text";
websiteInput.value=team.website||"";
websiteInput.placeholder="https://example.com";
websiteInput.style.cssText="width:100%;padding:10px;border:1px solid #555;background:#2a2a2a;color:#fff;border-radius:4px;font-size:14px";
form.appendChild(websiteLabel);
form.appendChild(websiteInput);
const notesLabel=document.createElement("label");
notesLabel.textContent="Description (one-liner):";
notesLabel.style.cssText="display:block;color:#fff;margin-bottom:4px;font-weight:500";
const notesInput=document.createElement("textarea");
notesInput.value=team.notes||"";
notesInput.placeholder="Brief description of what the company does";
notesInput.style.cssText="width:100%;padding:10px;border:1px solid #555;background:#2a2a2a;color:#fff;border-radius:4px;min-height:80px;font-size:14px;font-family:inherit";
form.appendChild(notesLabel);
form.appendChild(notesInput);
const raisedLabel=document.createElement("label");
raisedLabel.textContent="Amount Raised (USD):";
raisedLabel.style.cssText="display:block;color:#fff;margin-bottom:4px;font-weight:500";
const raisedInput=document.createElement("input");
raisedInput.type="number";
raisedInput.value=team.raised_usd||0;
raisedInput.placeholder="0";
raisedInput.style.cssText="width:100%;padding:10px;border:1px solid #555;background:#2a2a2a;color:#fff;border-radius:4px;font-size:14px";
form.appendChild(raisedLabel);
form.appendChild(raisedInput);
const revenueLabel=document.createElement("label");
revenueLabel.textContent="Monthly Revenue (USD):";
revenueLabel.style.cssText="display:block;color:#fff;margin-bottom:4px;font-weight:500";
const revenueInput=document.createElement("input");
revenueInput.type="number";
revenueInput.value=team.monthly_revenue_usd||0;
revenueInput.placeholder="0";
revenueInput.style.cssText="width:100%;padding:10px;border:1px solid #555;background:#2a2a2a;color:#fff;border-radius:4px;font-size:14px";
form.appendChild(revenueLabel);
form.appendChild(revenueInput);
const saveBtn=document.createElement("button");
saveBtn.textContent="Save";
saveBtn.className="btn-primary";
saveBtn.style.marginTop="8px";
saveBtn.onclick=async()=>{
saveBtn.textContent="Saving...";
saveBtn.disabled=true;
try{
const res=await fetch("/api/targets/"+team.id,{
method:"PATCH",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
x_handle:xHandleInput.value.trim()||null,
website:websiteInput.value.trim()||null,
notes:notesInput.value.trim()||null,
raised_usd:parseInt(raisedInput.value)||0,
monthly_revenue_usd:parseInt(revenueInput.value)||0
})
});
if(res.ok){
modal.remove();
await refreshApprovedTargets();
}else{
const data=await res.json();
alert("Error: "+data.error);
saveBtn.textContent="Save";
saveBtn.disabled=false;
}
}catch(err){
alert("Error: "+err.message);
saveBtn.textContent="Save";
saveBtn.disabled=false;
}
};
form.appendChild(saveBtn);
box.appendChild(form);
modal.appendChild(box);
document.body.appendChild(modal);
const handleEscape=(e)=>{
if(e.key==="Escape"){
modal.remove();
document.removeEventListener("keydown",handleEscape);
}
};
document.addEventListener("keydown",handleEscape);
modal.addEventListener("click",(e)=>{
if(e.target===modal){
modal.remove();
document.removeEventListener("keydown",handleEscape);
}
});
}
function showQuickAddModal(team){
const existing=document.getElementById("quickAddModal");
if(existing)existing.remove();
const modal=document.createElement("div");
modal.id="quickAddModal";
modal.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000";
const box=document.createElement("div");
box.style.cssText="background:white;border-radius:12px;padding:24px;max-width:450px;width:90%";
const header=document.createElement("h3");
header.textContent="Quick Add Contact at "+team.team_name;
header.style.marginBottom="16px";
box.appendChild(header);
const nameInput=document.createElement("input");
nameInput.placeholder="Name (required)";
nameInput.style.width="100%";
nameInput.style.padding="8px";
nameInput.style.marginBottom="10px";
nameInput.style.boxSizing="border-box";
box.appendChild(nameInput);
const tgInput=document.createElement("input");
tgInput.placeholder="Telegram handle (required, e.g., @jessepollak)";
tgInput.style.width="100%";
tgInput.style.padding="8px";
tgInput.style.marginBottom="16px";
tgInput.style.boxSizing="border-box";
box.appendChild(tgInput);
const btnRow=document.createElement("div");
btnRow.style.display="flex";
btnRow.style.gap="8px";
const addBtn=document.createElement("button");
addBtn.textContent="Add to Queue";
addBtn.style.flex="1";
addBtn.onclick=async()=>{
const name=nameInput.value.trim();
const tgHandle=tgInput.value.trim();
if(!name){
alert("Name is required");
nameInput.focus();
return;
}
if(!tgHandle){
alert("Telegram handle is required");
tgInput.focus();
return;
}
addBtn.textContent="Adding...";
addBtn.disabled=true;
try{
const r=await fetch("/api/contacts",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
name:name,
company:team.team_name,
telegram_handle:tgHandle,
notes:"Quick add from "+team.team_name
})
});
const j=await r.json();
if(!r.ok){
alert("Error: "+(j.error||"Failed to add contact"));
addBtn.textContent="Add to Queue";
addBtn.disabled=false;
return;
}
const g=await fetch("/api/drafts/generate",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({contact_id:j.id})
});
const gj=await g.json();
if(g.ok){
await refreshQueue();
modal.remove();
const status=document.getElementById("status");
if(status){
status.className="muted ok";
status.textContent="Contact added and draft generated ✅";
setTimeout(()=>status.textContent="",3000);
}
}else{
alert("Draft generation failed: "+(gj.error||"Unknown error"));
addBtn.textContent="Add to Queue";
addBtn.disabled=false;
}
}catch(e){
alert("Error: "+e.message);
addBtn.textContent="Add to Queue";
addBtn.disabled=false;
}
};
btnRow.appendChild(addBtn);
const cancelBtn=document.createElement("button");
cancelBtn.textContent="Cancel";
cancelBtn.onclick=()=>modal.remove();
btnRow.appendChild(cancelBtn);
box.appendChild(btnRow);
modal.appendChild(box);
document.body.appendChild(modal);
nameInput.focus();
}
function showManualContactModal(team){
const existing=document.getElementById("manualContactModal");
if(existing)existing.remove();
const modal=document.createElement("div");
modal.id="manualContactModal";
modal.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000";
const box=document.createElement("div");
box.style.cssText="background:white;border-radius:12px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow:auto";
const header=document.createElement("h3");
header.textContent="Add Contact at "+team.team_name;
box.appendChild(header);
const form=document.createElement("div");
form.innerHTML="<div style='margin:12px 0'><input id='manualName' placeholder='Name (required)' style='width:100%;padding:8px'></div>"+
"<div style='margin:12px 0'><input id='manualTitle' placeholder='Title (e.g. CTO, Co-founder)' style='width:100%;padding:8px'></div>"+
"<div style='margin:12px 0'><input id='manualTelegram' placeholder='Telegram handle (@username)' style='width:100%;padding:8px'></div>"+
"<div style='margin:12px 0'><input id='manualNotes' placeholder='Notes (optional)' style='width:100%;padding:8px'></div>"+
"<div style='margin-top:16px;display:flex;gap:8px'><button id='manualAddBtn'>Add Contact</button><button id='manualCancelBtn'>Cancel</button></div>"+
"<div id='manualStatus' class='muted' style='margin-top:8px'></div>";
box.appendChild(form);
modal.appendChild(box);
document.body.appendChild(modal);
document.getElementById("manualCancelBtn").onclick=()=>modal.remove();
document.getElementById("manualAddBtn").onclick=async()=>{
const status=document.getElementById("manualStatus");
const name=document.getElementById("manualName").value.trim();
if(!name){
status.className="muted bad";
status.textContent="Name is required";
return;
}
status.className="muted";
status.textContent="Adding contact...";
const contact={
name:name,
company:team.team_name,
title:document.getElementById("manualTitle").value.trim(),
telegram_handle:document.getElementById("manualTelegram").value.trim(),
notes:document.getElementById("manualNotes").value.trim()
};
const r=await fetch("/api/contacts",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(contact)
});
const j=await r.json();
if(!r.ok){
status.className="muted bad";
status.textContent="Error: "+(j.error||"");
return;
}
status.textContent="Generating draft...";
const g=await fetch("/api/drafts/generate",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({contact_id:j.id})
});
const gj=await g.json();
if(g.ok){
status.className="muted ok";
status.textContent="Draft generated ✅";
await refreshQueue();
setTimeout(()=>modal.remove(),1000);
}else{
status.className="muted bad";
status.textContent="Error: "+(gj.error||"");
}
};
}
function showContactsModal(team,contacts){
const existing=document.getElementById("contactsModal");
if(existing)existing.remove();
const modal=document.createElement("div");
modal.id="contactsModal";
modal.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;overflow:auto";
const box=document.createElement("div");
box.style.cssText="background:white;border-radius:12px;padding:24px;max-width:800px;width:90%;max-height:85vh;overflow:auto;margin:20px";
const header=document.createElement("h3");
header.textContent="Found Contacts at "+team.team_name;
box.appendChild(header);
const subtitle=document.createElement("div");
subtitle.className="muted tiny";
subtitle.style.marginBottom="16px";
subtitle.textContent="Paste Telegram handles and add to queue";
box.appendChild(subtitle);
if(!contacts.length){
const empty=document.createElement("div");
empty.className="muted";
empty.textContent="No contacts found. Try searching manually or checking the company website.";
box.appendChild(empty);
}else{
for(let i=0;i<contacts.length;i++){
const c=contacts[i];
const cCard=document.createElement("div");
cCard.className="card";
cCard.style.margin="12px 0";
cCard.style.background="#f9f9f9";
const topRow=document.createElement("div");
topRow.style.display="flex";
topRow.style.justifyContent="space-between";
topRow.style.alignItems="flex-start";
topRow.style.marginBottom="8px";
const infoDiv=document.createElement("div");
infoDiv.style.flex="1";
const nameDiv=document.createElement("div");
const nameB=document.createElement("b");
nameB.textContent=c.name||"Unknown";
nameDiv.appendChild(nameB);
infoDiv.appendChild(nameDiv);
if(c.title){
const titleDiv=document.createElement("div");
titleDiv.className="muted tiny";
titleDiv.textContent=c.title;
infoDiv.appendChild(titleDiv);
}
topRow.appendChild(infoDiv);
cCard.appendChild(topRow);
const inputRow=document.createElement("div");
inputRow.style.display="flex";
inputRow.style.gap="8px";
inputRow.style.marginTop="8px";
const tgInput=document.createElement("input");
tgInput.placeholder="Paste Telegram handle (@username)";
tgInput.style.flex="1";
tgInput.style.padding="6px 8px";
tgInput.style.fontSize="13px";
tgInput.id="tgInput_"+i;
inputRow.appendChild(tgInput);
const addBtn=document.createElement("button");
addBtn.textContent="Add to Queue";
addBtn.style.fontSize="11px";
addBtn.style.padding="6px 12px";
addBtn.style.whiteSpace="nowrap";
addBtn.onclick=(function(contact,inputId,company){
return async function(){
const input=document.getElementById(inputId);
const tgHandle=input.value.trim();
if(!tgHandle){
alert("Please enter a Telegram handle");
return;
}
addBtn.textContent="Adding...";
addBtn.disabled=true;
await addContactFromModal({
name:contact.name,
title:contact.title||"",
telegram_handle:tgHandle,
notes:contact.notes||""
},company);
addBtn.textContent="Added ✅";
addBtn.style.background="#059669";
addBtn.style.color="white";
input.disabled=true;
};
})(c,"tgInput_"+i,team.team_name);
inputRow.appendChild(addBtn);
cCard.appendChild(inputRow);
box.appendChild(cCard);
}
}
const closeBtn=document.createElement("button");
closeBtn.textContent="Close";
closeBtn.style.marginTop="16px";
closeBtn.onclick=()=>modal.remove();
box.appendChild(closeBtn);
modal.appendChild(box);
document.body.appendChild(modal);
}
async function addContactFromModal(contact,companyName){
const status=document.getElementById("status");
status.className="muted";
status.textContent="Adding contact…";
const body={
name:contact.name,
company:companyName,
title:contact.title||"",
telegram_handle:contact.telegram_handle||"",
notes:contact.notes||"",
};
const r=await fetch("/api/contacts",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(body)
});
const j=await r.json();
if(!r.ok){
status.className="muted bad";
status.textContent="Error: "+(j.error||"");
return;
}
status.textContent="Generating draft with Claude…";
const g=await fetch("/api/drafts/generate",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({contact_id:j.id})
});
const gj=await g.json();
status.className=g.ok?"muted ok":"muted bad";
status.textContent=g.ok?"Draft generated ✅":("Error: "+[gj.error,gj.status,gj.name,gj.message].filter(Boolean).join(" | "));
await refreshQueue();
const modal=document.getElementById("contactsModal");
if(modal)modal.remove();
}
function showAllContactsModal(team,contacts){
const existing=document.getElementById("allContactsModal");
if(existing)existing.remove();
const modal=document.createElement("div");
modal.id="allContactsModal";
modal.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;overflow:auto";
const box=document.createElement("div");
box.style.cssText="background:white;border-radius:12px;padding:24px;max-width:900px;width:90%;max-height:85vh;overflow:auto;margin:20px;position:relative";
const closeBtn=document.createElement("button");
closeBtn.textContent="×";
closeBtn.style.cssText="position:absolute;top:12px;right:12px;background:#e0e0e0;color:#333;border:none;border-radius:4px;width:32px;height:32px;cursor:pointer;font-size:24px;line-height:1;padding:0;font-weight:bold";
closeBtn.title="Close";
closeBtn.onclick=()=>modal.remove();
box.appendChild(closeBtn);
const header=document.createElement("h3");
header.textContent="All Contacts at "+team.team_name;
header.style.marginBottom="8px";
box.appendChild(header);
const subtitle=document.createElement("div");
subtitle.className="muted tiny";
subtitle.style.marginBottom="16px";
subtitle.textContent="Employees found via Apollo, X discovery, Google, and LinkedIn";
box.appendChild(subtitle);
if(!contacts||!contacts.length){
const empty=document.createElement("div");
empty.className="muted";
empty.textContent="No contacts found. This may take a moment on first search.";
box.appendChild(empty);
}else{
for(const c of contacts){
const cCard=document.createElement("div");
cCard.className="card";
cCard.style.margin="12px 0";
cCard.style.background="#f9f9f9";
cCard.style.position="relative";
const deleteBtn=document.createElement("button");
deleteBtn.textContent="×";
deleteBtn.style.cssText="position:absolute;top:8px;right:8px;background:#ff4444;color:white;border:none;border-radius:4px;width:24px;height:24px;cursor:pointer;font-size:18px;line-height:1;padding:0;font-weight:bold";
deleteBtn.title="Remove contact";
deleteBtn.onclick=async()=>{
if(!confirm("Remove "+c.name+" from contacts?")){
return;
}
try{
const res=await fetch("/api/targets/"+team.id+"/contacts/"+c.id,{
method:"DELETE"
});
if(res.ok){
cCard.remove();
if(box.querySelectorAll(".card").length===0){
const empty=document.createElement("div");
empty.className="muted";
empty.textContent="No contacts found.";
box.appendChild(empty);
}
}else{
alert("Failed to delete contact");
}
}catch(err){
alert("Error deleting contact: "+err.message);
}
};
cCard.appendChild(deleteBtn);
const nameRow=document.createElement("div");
nameRow.style.display="flex";
nameRow.style.alignItems="center";
nameRow.style.gap="8px";
nameRow.style.marginBottom="4px";
const name=document.createElement("div");
name.style.fontWeight="600";
name.textContent=c.name;
nameRow.appendChild(name);
if(c.source==="apollo"){
const badge=document.createElement("span");
badge.textContent="Apollo";
badge.style.cssText="background:#4f46e5;color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600";
nameRow.appendChild(badge);
}else if(c.source==="web_search"){
const badge=document.createElement("span");
badge.textContent="Web";
badge.style.cssText="background:#059669;color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600";
nameRow.appendChild(badge);
}else if(c.source==="x_discovery"){
const badge=document.createElement("span");
badge.textContent="X";
badge.style.cssText="background:#1d9bf0;color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:600";
nameRow.appendChild(badge);
}
cCard.appendChild(nameRow);
if(c.apollo_confidence_score&&c.source==="apollo"){
const scoreDiv=document.createElement("div");
scoreDiv.className="muted tiny";
scoreDiv.style.marginTop="2px";
scoreDiv.textContent="Data quality: "+(c.apollo_confidence_score*100).toFixed(0)+"%";
cCard.appendChild(scoreDiv);
}
if(c.title){
const title=document.createElement("div");
title.className="muted tiny";
title.textContent=c.title;
cCard.appendChild(title);
}
const contactInfo=document.createElement("div");
contactInfo.style.marginTop="8px";
contactInfo.style.fontSize="13px";
if(c.email){
const emailDiv=document.createElement("div");
emailDiv.textContent="📧 "+c.email;
contactInfo.appendChild(emailDiv);
}
if(c.phone){
const phoneDiv=document.createElement("div");
phoneDiv.textContent="📞 "+c.phone;
contactInfo.appendChild(phoneDiv);
}
if(c.linkedin){
const linkedinDiv=document.createElement("div");
linkedinDiv.innerHTML="🔗 <a href='"+c.linkedin+"' target='_blank'>LinkedIn</a>";
contactInfo.appendChild(linkedinDiv);
}
if(c.telegram_handle){
const tgDiv=document.createElement("div");
tgDiv.textContent="Telegram: "+c.telegram_handle;
contactInfo.appendChild(tgDiv);
}else if(c.x_username){
const xDiv=document.createElement("div");
xDiv.textContent="X: @"+c.x_username;
contactInfo.appendChild(xDiv);
}
cCard.appendChild(contactInfo);
if(c.telegram_handle){
const draftBtn=document.createElement("button");
draftBtn.textContent="Create Draft";
draftBtn.className="btn-primary";
draftBtn.style.marginTop="8px";
draftBtn.style.fontSize="12px";
draftBtn.onclick=async()=>{
draftBtn.textContent="Adding...";
draftBtn.disabled=true;
try{
const contactData={
name:c.name,
company:team.team_name,
title:c.title||"",
telegram_handle:c.telegram_handle,
notes:c.x_bio||""
};
const contactRes=await fetch("/api/contacts",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(contactData)
});
const contactJson=await contactRes.json();
if(!contactRes.ok){
alert("Failed to add contact: "+(contactJson.error||"Unknown error"));
draftBtn.textContent="Create Draft";
draftBtn.disabled=false;
return;
}
draftBtn.textContent="Generating...";
const draftRes=await fetch("/api/drafts/generate",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({contact_id:contactJson.id})
});
if(draftRes.ok){
await refreshQueue();
modal.remove();
alert("Draft created! Check the queue.");
}else{
const err=await draftRes.json();
alert("Failed to create draft: "+(err.error||"Unknown error"));
draftBtn.textContent="Create Draft";
draftBtn.disabled=false;
}
}catch(err){
alert("Error: "+err.message);
draftBtn.textContent="Create Draft";
draftBtn.disabled=false;
}
};
cCard.appendChild(draftBtn);
}
box.appendChild(cCard);
}
}
modal.appendChild(box);
document.body.appendChild(modal);
const handleEscape=(e)=>{
if(e.key==="Escape"){
modal.remove();
document.removeEventListener("keydown",handleEscape);
}
};
document.addEventListener("keydown",handleEscape);
modal.addEventListener("click",(e)=>{
if(e.target===modal){
modal.remove();
document.removeEventListener("keydown",handleEscape);
}
});
}
async function researchTeams(){
const status=document.getElementById("researchStatus");
status.className="muted";
status.textContent="🔍 Researching web3 teams with Claude...";
try{
const r=await fetch("/api/targets/research",{
method:"POST",
headers:{"Content-Type":"application/json"}
});
const j=await r.json();
if(!r.ok){
status.className="muted bad";
status.textContent="Research failed: "+(j.error||r.status);
return;
}
status.className="muted ok";
status.textContent="✅ Found "+j.found+" teams, imported "+j.inserted+" (skipped: "+j.skipped+")";
await refreshTargets();
await refreshApprovedTargets();
setTimeout(()=>status.textContent="",3000);
}catch(e){
console.error("researchTeams error:",e);
status.className="muted bad";
status.textContent="Research error: "+e.message;
}
}
function openImporter(){
const existing=document.getElementById("importerModal");
if(existing)existing.remove();
const modal=document.createElement("div");
modal.id="importerModal";
modal.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000";
const box=document.createElement("div");
box.style.cssText="background:white;border-radius:12px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow:auto";
box.innerHTML="<h3>Import Target Teams</h3>"+
"<div class='muted tiny'>Paste JSON array with: team_name, raised_usd, monthly_revenue_usd, is_web3, x_handle (optional), website (optional)</div>"+
"<textarea id='importJson' style='height:200px;margin:12px 0;width:100%;font-family:monospace;font-size:12px' placeholder='Paste JSON here'></textarea>"+
"<div style='display:flex;gap:8px'>"+
"<button id='importBtn'>Import</button>"+
"<button id='cancelBtn'>Cancel</button>"+
"</div>"+
"<div id='importStatus' class='muted' style='margin-top:8px'></div>";
modal.appendChild(box);
document.body.appendChild(modal);
document.getElementById("cancelBtn").onclick=()=>modal.remove();
document.getElementById("importBtn").onclick=async()=>{
const status=document.getElementById("importStatus");
status.textContent="Importing…";
let payload;
try{
payload=JSON.parse(document.getElementById("importJson").value);
}catch(e){
status.className="muted bad";
status.textContent="Invalid JSON";
return;
}
const r=await fetch("/api/targets/import",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({items:payload})
});
const j=await r.json().catch(()=>({}));
if(!r.ok){
status.className="muted bad";
status.textContent="Import failed: "+(j.error||r.status);
return;
}
status.className="muted ok";
status.textContent="Imported: "+j.inserted+" (skipped: "+j.skipped+")";
await refreshTargets();
await refreshApprovedTargets();
setTimeout(()=>modal.remove(),1500);
};
}
async function addContact(){
const status=document.getElementById("status");
status.className="muted";
status.textContent="Adding contact…";
const body={
name:document.getElementById("name").value.trim(),
company:document.getElementById("company").value.trim(),
telegram_handle:document.getElementById("tg").value.trim(),
notes:document.getElementById("notes").value.trim(),
};
const r=await fetch("/api/contacts",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(body)
});
const j=await r.json();
if(!r.ok){
status.className="muted bad";
status.textContent="Error: "+(j.error||"");
return;
}
status.textContent="Generating draft with Claude…";
const g=await fetch("/api/drafts/generate",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({contact_id:j.id})
});
const gj=await g.json();
status.className=g.ok?"muted ok":"muted bad";
status.textContent=g.ok?"Draft generated ✅":("Error: "+[gj.error,gj.status,gj.name,gj.message].filter(Boolean).join(" | "));
await refreshQueue();
}
async function checkClaude(){
const status=document.getElementById("status");
status.className="muted";
status.textContent="Checking Claude…";
const r=await fetch("/api/health/claude");
const j=await r.json();
if(r.ok&&j.ok){
status.className="muted ok";
status.textContent="Claude OK ✅";
}else{
status.className="muted bad";
status.textContent="Claude error: "+[j.status,j.name,j.message].filter(Boolean).join(" | ");
}
}
async function discoverFromX(){
const handle=document.getElementById("xCompanyHandle").value.trim();
const statusEl=document.getElementById("xDiscoveryStatus");
if(!handle){
statusEl.className="muted bad";
statusEl.textContent="Please enter a company X handle";
return;
}
statusEl.className="muted";
statusEl.textContent="Searching X and validating Telegram...";
try{
const res=await fetch("/api/workflow/x-discovery",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({x_handle:handle,max_users:5})
});
const data=await res.json();
if(res.ok){
statusEl.className="muted ok";
statusEl.textContent="Found "+data.valid+" valid users, "+data.invalid+" without Telegram. "+data.drafts_generated+" drafts created.";
await refreshQueue();
document.getElementById("xCompanyHandle").value="";
}else{
statusEl.className="muted bad";
if(data.code==="SEARCH_FAILED"){
statusEl.textContent="Search failed. Please try a different company handle.";
}else{
statusEl.textContent="Error: "+data.error;
}
}
}catch(err){
statusEl.className="muted bad";
statusEl.textContent="Error: "+err.message;
}
}
async function refreshFollowUpMessages(){
try{
const r=await fetch("/api/drafts/followups");
const items=await r.json();
const el=document.getElementById("followUpMessages");
if(!el)return;
el.innerHTML="";
if(!items.length){
el.innerHTML="<div class='muted'>No follow-ups sent yet.</div>";
return;
}
// Group follow-ups by contact
const contactGroups=new Map();
for(const it of items){
if(!contactGroups.has(it.contact_id)){
contactGroups.set(it.contact_id,{
contact:it,
followUps:[]
});
}
contactGroups.get(it.contact_id).followUps.push(it);
}
// Display one card per contact with all their follow-ups
for(const[contactId,group]of contactGroups){
const card=document.createElement("div");
card.className="card";
card.style.background="#fef3c7";
card.style.border="1px solid #fbbf24";
const header=document.createElement("div");
const tgShow=group.contact.telegram_handle?("@"+group.contact.telegram_handle.replace("@","")):"no TG handle";
const sentCount=group.followUps.filter(f=>f.prepared_at).length;
header.innerHTML="<b>"+escapeHtml(group.contact.name)+"</b> "+
"<span class='pill' style='background:#fbbf24;color:#78350f'>messages: "+sentCount+"</span><br>"+
"<span class='muted'>"+escapeHtml(tgShow)+"</span>";
card.appendChild(header);
// Show preview of most recent follow-up
const mostRecent=group.followUps[0];
const msgPreview=document.createElement("div");
msgPreview.className="muted tiny";
msgPreview.style.marginTop="6px";
msgPreview.style.padding="6px";
msgPreview.style.background="white";
msgPreview.style.borderRadius="4px";
msgPreview.textContent=mostRecent.message_text.substring(0,100)+(mostRecent.message_text.length>100?"...":"");
card.appendChild(msgPreview);
const btnRow=document.createElement("div");
btnRow.style.marginTop="8px";
btnRow.style.display="flex";
btnRow.style.gap="8px";
const viewHistoryBtn=document.createElement("button");
viewHistoryBtn.textContent="View History ("+sentCount+")";
viewHistoryBtn.style.fontSize="11px";
viewHistoryBtn.style.padding="4px 8px";
viewHistoryBtn.onclick=async()=>{
await showFollowUpHistoryModal(group.contact,group.followUps);
};
btnRow.appendChild(viewHistoryBtn);
const followUpBtn=document.createElement("button");
followUpBtn.textContent="Send Follow-up";
followUpBtn.style.fontSize="11px";
followUpBtn.style.padding="4px 8px";
followUpBtn.onclick=()=>{
showFollowUpModal(mostRecent);
};
btnRow.appendChild(followUpBtn);
const dismissBtn=document.createElement("button");
dismissBtn.textContent="Dismiss All";
dismissBtn.style.fontSize="11px";
dismissBtn.style.padding="4px 8px";
dismissBtn.onclick=async()=>{
// Dismiss all follow-ups for this contact
for(const followUp of group.followUps){
await fetch("/api/drafts/"+followUp.id+"/skip",{method:"POST"});
}
await refreshFollowUpMessages();
await refreshApprovedTargets();
};
btnRow.appendChild(dismissBtn);
card.appendChild(btnRow);
el.appendChild(card);
}
}catch(e){
console.error("refreshFollowUpMessages error:",e);
const el=document.getElementById("followUpMessages");
if(el)el.innerHTML="<div class='muted bad'>Error loading follow-ups</div>";
}
}
async function showFollowUpHistoryModal(contact,followUps){
const existing=document.getElementById("historyModal");
if(existing)existing.remove();
const modal=document.createElement("div");
modal.id="historyModal";
modal.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000";
const box=document.createElement("div");
box.style.cssText="background:var(--bg-card);border-radius:12px;padding:24px;max-width:700px;width:90%;max-height:85vh;overflow:auto;color:var(--text-primary);border:1px solid var(--border-primary)";
const header=document.createElement("h3");
header.textContent="Conversation History: "+contact.name;
header.style.marginBottom="8px";
header.style.color="var(--text-primary)";
box.appendChild(header);
const subtitle=document.createElement("div");
subtitle.className="muted tiny";
subtitle.style.marginBottom="16px";
subtitle.style.color="var(--text-secondary)";
subtitle.textContent=contact.company+" • @"+(contact.telegram_handle||"").replace("@","");
box.appendChild(subtitle);
// Show loading
const loading=document.createElement("div");
loading.className="muted";
loading.textContent="Loading history...";
loading.style.color="var(--text-secondary)";
box.appendChild(loading);
modal.appendChild(box);
document.body.appendChild(modal);
try{
// Fetch full history from backend (original sent + all follow-ups)
const r=await fetch("/api/drafts/contact/"+contact.contact_id+"/history");
const history=await r.json();
loading.remove();
if(!history.length){
const noHistory=document.createElement("div");
noHistory.className="muted";
noHistory.style.color="var(--text-secondary)";
noHistory.textContent="No message history found";
box.appendChild(noHistory);
}else{
// Display messages in chronological order (oldest first)
for(let i=0;i<history.length;i++){
const msg=history[i];
const isOriginal=msg.status==='sent';
const msgCard=document.createElement("div");
msgCard.style.padding="12px";
msgCard.style.background=isOriginal?"var(--blue-50)":"var(--yellow-50)";
msgCard.style.borderRadius="8px";
msgCard.style.marginBottom="12px";
msgCard.style.border=isOriginal?"1px solid var(--blue-500)":"1px solid var(--yellow-500)";
const msgHeader=document.createElement("div");
msgHeader.className="muted tiny";
msgHeader.style.marginBottom="6px";
msgHeader.style.color="var(--text-secondary)";
msgHeader.textContent=(isOriginal?"Original Message":"Follow-up #"+i)+" • "+new Date(msg.updated_at).toLocaleDateString();
msgCard.appendChild(msgHeader);
const msgText=document.createElement("div");
msgText.style.whiteSpace="pre-wrap";
msgText.style.lineHeight="1.5";
msgText.style.color="var(--text-primary)";
msgText.textContent=msg.message_text;
msgCard.appendChild(msgText);
box.appendChild(msgCard);
}
}
}catch(e){
loading.remove();
const errorDiv=document.createElement("div");
errorDiv.className="muted bad";
errorDiv.textContent="Error loading history: "+e.message;
box.appendChild(errorDiv);
}
const closeBtn=document.createElement("button");
closeBtn.textContent="Close";
closeBtn.style.marginTop="16px";
closeBtn.onclick=()=>modal.remove();
box.appendChild(closeBtn);
}
async function refreshSentMessages(){
try{
const r=await fetch("/api/drafts/sent");
const items=await r.json();
const el=document.getElementById("sentMessages");
if(!el)return;
el.innerHTML="";
if(!items.length){
el.innerHTML="<div class='muted'>No sent messages yet.</div>";
return;
}
for(const it of items){
const card=document.createElement("div");
card.className="card";
card.style.background="#f0fdf4";
card.style.border="1px solid #86efac";
const header=document.createElement("div");
const tgShow=it.telegram_handle?("@"+it.telegram_handle.replace("@","")):"no TG handle";
header.innerHTML="<b>"+escapeHtml(it.name)+"</b> "+
"<span class='pill' style='background:#86efac;color:#166534'>sent</span><br>"+
"<span class='muted'>"+escapeHtml(tgShow)+"</span>";
card.appendChild(header);
const msgPreview=document.createElement("div");
msgPreview.className="muted tiny";
msgPreview.style.marginTop="6px";
msgPreview.style.padding="6px";
msgPreview.style.background="var(--bg-section)";
msgPreview.style.borderRadius="4px";
msgPreview.style.cursor="pointer";
msgPreview.style.color="var(--text-secondary)";
msgPreview.textContent=it.message_text.substring(0,100)+(it.message_text.length>100?"... (click to view full)":"");
msgPreview.onclick=()=>{
showFullMessageModal(it);
};
card.appendChild(msgPreview);
const btnRow=document.createElement("div");
btnRow.style.marginTop="8px";
btnRow.style.display="flex";
btnRow.style.gap="8px";
const followUpBtn=document.createElement("button");
followUpBtn.textContent="Send Follow-up";
followUpBtn.style.fontSize="11px";
followUpBtn.style.padding="4px 8px";
followUpBtn.onclick=()=>{
showFollowUpModal(it);
};
btnRow.appendChild(followUpBtn);
btnRow.appendChild(followUpBtn);
const dismissBtn=document.createElement("button");
dismissBtn.textContent="Dismiss";
dismissBtn.style.fontSize="11px";
dismissBtn.style.padding="4px 8px";
dismissBtn.onclick=async()=>{
await fetch("/api/drafts/"+it.id+"/skip",{method:"POST"});
await refreshSentMessages();
await refreshApprovedTargets();
};
btnRow.appendChild(dismissBtn);
card.appendChild(btnRow);
el.appendChild(card);
}
}catch(e){
console.error("refreshSentMessages error:",e);
const el=document.getElementById("sentMessages");
if(el)el.innerHTML="<div class='muted bad'>Error loading sent messages</div>";
}
}
function showFollowUpModal(sentMessage){
const existing=document.getElementById("followUpModal");
if(existing)existing.remove();
const modal=document.createElement("div");
modal.id="followUpModal";
modal.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000";
const box=document.createElement("div");
box.style.cssText="background:var(--bg-card);border-radius:12px;padding:24px;max-width:600px;width:90%;max-height:85vh;overflow:auto;color:var(--text-primary);border:1px solid var(--border-primary)";
const header=document.createElement("h3");
header.textContent="Follow-up to "+sentMessage.name;
header.style.marginBottom="8px";
header.style.color="var(--text-primary)";
box.appendChild(header);
const context=document.createElement("div");
context.className="muted tiny";
context.style.marginBottom="12px";
context.style.color="var(--text-secondary)";
context.textContent="Previous message sent to @"+(sentMessage.telegram_handle||"").replace("@","");
box.appendChild(context);
const prevMsg=document.createElement("div");
prevMsg.style.padding="8px";
prevMsg.style.background="var(--bg-section)";
prevMsg.style.borderLeft="3px solid var(--blue-500)";
prevMsg.style.marginBottom="12px";
prevMsg.style.fontSize="12px";
prevMsg.style.whiteSpace="pre-wrap";
prevMsg.style.color="var(--text-primary)";
prevMsg.textContent=sentMessage.message_text.substring(0,200)+(sentMessage.message_text.length>200?"...":"");
box.appendChild(prevMsg);
const statusDiv=document.createElement("div");
statusDiv.className="muted";
statusDiv.style.marginBottom="12px";
statusDiv.style.color="var(--text-secondary)";
statusDiv.textContent="Generating follow-up with Claude...";
box.appendChild(statusDiv);
const label=document.createElement("div");
label.style.marginBottom="6px";
label.style.fontWeight="500";
label.style.color="var(--text-primary)";
label.textContent="Follow-up message:";
box.appendChild(label);
const textarea=document.createElement("textarea");
textarea.placeholder="Generating...";
textarea.disabled=true;
textarea.style.width="100%";
textarea.style.height="120px";
textarea.style.padding="8px";
textarea.style.boxSizing="border-box";
textarea.style.marginBottom="12px";
textarea.style.fontFamily="inherit";
box.appendChild(textarea);
const btnRow=document.createElement("div");
btnRow.style.display="flex";
btnRow.style.gap="8px";
const sendBtn=document.createElement("button");
sendBtn.textContent="Send Follow-up";
sendBtn.style.flex="1";
sendBtn.disabled=true;
sendBtn.onclick=async()=>{
const followUpText=textarea.value.trim();
if(!followUpText){
alert("Please write a follow-up message");
textarea.focus();
return;
}
sendBtn.textContent="Sending...";
sendBtn.disabled=true;
try{
const r=await fetch("/api/drafts/send-followup",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
contact_id:sentMessage.contact_id,
telegram_handle:sentMessage.telegram_handle,
message_text:followUpText,
original_message:sentMessage.message_text,
contact_name:sentMessage.name,
company:sentMessage.company,
auto_send:true
})
});
const j=await r.json();
if(!r.ok){
alert("Failed: "+(j.error||"Unknown error"));
sendBtn.textContent="Send Follow-up";
sendBtn.disabled=false;
return;
}
modal.remove();
await refreshSentMessages();
await refreshFollowUpMessages();
await refreshApprovedTargets();
}catch(e){
alert("Error: "+e.message);
sendBtn.textContent="Send Follow-up";
sendBtn.disabled=false;
}
};
btnRow.appendChild(sendBtn);
const cancelBtn=document.createElement("button");
cancelBtn.textContent="Cancel";
cancelBtn.onclick=()=>modal.remove();
btnRow.appendChild(cancelBtn);
box.appendChild(btnRow);
modal.appendChild(box);
document.body.appendChild(modal);
(async()=>{
try{
const r=await fetch("/api/drafts/generate-followup",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
contact_name:sentMessage.name,
company:sentMessage.company,
original_message:sentMessage.message_text
})
});
const j=await r.json();
if(r.ok&&j.message_text){
textarea.value=j.message_text;
textarea.disabled=false;
sendBtn.disabled=false;
statusDiv.className="muted ok";
statusDiv.textContent="Follow-up generated ✅ (edit if needed)";
}else{
textarea.value="";
textarea.placeholder="Generation failed, write your follow-up here...";
textarea.disabled=false;
sendBtn.disabled=false;
statusDiv.className="muted bad";
statusDiv.textContent="Generation failed: "+(j.error||"Unknown error");
}
}catch(e){
textarea.value="";
textarea.placeholder="Generation failed, write your follow-up here...";
textarea.disabled=false;
sendBtn.disabled=false;
statusDiv.className="muted bad";
statusDiv.textContent="Error: "+e.message;
}
})();
}
function showFullMessageModal(message){
const existing=document.getElementById("fullMessageModal");
if(existing)existing.remove();
const modal=document.createElement("div");
modal.id="fullMessageModal";
modal.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000";
const box=document.createElement("div");
box.style.cssText="background:var(--bg-card);border-radius:12px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow:auto;color:var(--text-primary);border:1px solid var(--border-primary)";
const header=document.createElement("h3");
header.textContent="Message to "+message.name;
header.style.marginBottom="8px";
header.style.color="var(--text-primary)";
box.appendChild(header);
const company=document.createElement("div");
company.className="muted tiny";
company.style.marginBottom="16px";
company.style.color="var(--text-secondary)";
company.textContent=message.company+(message.telegram_handle?" • @"+message.telegram_handle.replace("@",""):"");
box.appendChild(company);
const msgText=document.createElement("div");
msgText.style.padding="12px";
msgText.style.background="var(--bg-section)";
msgText.style.borderRadius="8px";
msgText.style.whiteSpace="pre-wrap";
msgText.style.lineHeight="1.5";
msgText.style.color="var(--text-primary)";
msgText.textContent=message.message_text;
box.appendChild(msgText);
const closeBtn=document.createElement("button");
closeBtn.textContent="Close";
closeBtn.style.marginTop="16px";
closeBtn.onclick=()=>modal.remove();
box.appendChild(closeBtn);
modal.appendChild(box);
document.body.appendChild(modal);
}
async function refreshQueue(){
try{
const r=await fetch("/api/queue");
const items=await r.json();
const el=document.getElementById("queue");
if(!el)return;
el.innerHTML="";
if(!items.length){
el.innerHTML="<div class='muted'>Queue empty.</div>";
return;
}
for(const it of items){
const card=document.createElement("div");
card.className="card";
card.style.background="#e3f2fd";
card.style.border="1px solid #2196F3";
card.style.textAlign="left";
const header=document.createElement("div");
const tgShow=it.telegram_handle?("@"+it.telegram_handle.replace("@","")):"no TG handle";
header.innerHTML="<b>"+escapeHtml(it.name)+"</b> "+
"<span class='pill' style='background:#2196F3;color:white'>"+escapeHtml(it.status)+"</span><br>"+
"<span class='muted'>"+escapeHtml(tgShow)+"</span>";
card.appendChild(header);
const ta=document.createElement("textarea");
ta.value=it.message_text;
ta.rows=5;
ta.style.marginTop="8px";
ta.style.width="100%";
ta.style.boxSizing="border-box";
ta.onchange=async()=>{
await fetch("/api/drafts/"+it.id+"/update",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({message_text:ta.value})
});
};
card.appendChild(ta);
const row=document.createElement("div");
row.className="row";
row.style.marginTop="8px";
const copyBtn=document.createElement("button");
copyBtn.textContent="Copy";
copyBtn.style.flex="1";
copyBtn.onclick=async()=>{
await navigator.clipboard.writeText(ta.value);
copyBtn.textContent="Copied ✅";
setTimeout(()=>copyBtn.textContent="Copy",900);
};
row.appendChild(copyBtn);
const regenBtn=document.createElement("button");
regenBtn.textContent="Regenerate";
regenBtn.className="btn-info";
regenBtn.style.flex="1";
regenBtn.onclick=async()=>{
const originalText=regenBtn.textContent;
regenBtn.textContent="Generating...";
regenBtn.disabled=true;
try{
const r=await fetch("/api/drafts/"+it.id+"/regenerate",{
method:"POST",
headers:{"Content-Type":"application/json"}
});
const j=await r.json();
if(r.ok&&j.message_text){
ta.value=j.message_text;
regenBtn.textContent="Regenerated ✅";
setTimeout(()=>{
regenBtn.textContent=originalText;
regenBtn.disabled=false;
},1500);
}else{
alert("Failed to regenerate: "+(j.error||"Unknown error"));
regenBtn.textContent=originalText;
regenBtn.disabled=false;
}
}catch(err){
alert("Error: "+err.message);
regenBtn.textContent=originalText;
regenBtn.disabled=false;
}
};
row.appendChild(regenBtn);
const approveBtn=document.createElement("button");
approveBtn.textContent="Approve + Open TG + Paste";
approveBtn.style.flex="1";
approveBtn.onclick=async()=>{
// Try local automation first (Mac)
const r=await fetch("/api/drafts/"+it.id+"/approve-open-telegram",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({message_text:ta.value})
});
const j=await r.json().catch(()=>({}));
// If it fails because not on macOS, use relayer mode
if(!r.ok && j.error && j.error.includes("only on macOS")){
console.log("Not on macOS, using relayer mode");
const r2=await fetch("/api/drafts/"+it.id+"/approve",{method:"POST"});
const j2=await r2.json().catch(()=>({}));
if(!r2.ok){
alert("Failed: "+(j2.error||j2.message||r2.status));
return;
}
alert("✅ Approved! Relayer will send within 10 seconds (make sure relayer is running on your Mac).");
await refreshQueue();
await refreshSentMessages();
await refreshApprovedTargets();
return;
}
if(!r.ok){
alert("Failed: "+(j.error||j.message||r.status));
return;
}
await refreshQueue();
await refreshSentMessages();
await refreshApprovedTargets();
};
row.appendChild(approveBtn);
const dismissBtn=document.createElement("button");
dismissBtn.textContent="Dismiss";
dismissBtn.style.flex="1";
dismissBtn.onclick=async()=>{
await fetch("/api/drafts/"+it.id+"/skip",{method:"POST"});
await refreshQueue();
await refreshSentMessages();
await refreshApprovedTargets();
};
row.appendChild(dismissBtn);
card.appendChild(row);
el.appendChild(card);
}
}catch(e){
console.error("refreshQueue error:",e);
const el=document.getElementById("queue");
if(el)el.innerHTML="<div class='muted bad'>Error loading queue</div>";
}
}
if(document.readyState==="loading"){
document.addEventListener("DOMContentLoaded",function(){
// Refresh stats dashboard
async function refreshStats(){
try{
const followUpsResp=await fetch('/api/drafts/followups');
const followUps=await followUpsResp.json();
// Count unique contacts, not total messages
const uniqueContacts=new Set(followUps.map(f=>f.contact_id));
const followUpCount=uniqueContacts.size;
document.getElementById('followUpCount').textContent=followUpCount;
const sentResp=await fetch('/api/drafts/sent');
const sentMessages=await sentResp.json();
const now=new Date();
const estOffset=-5*60;
const localOffset=now.getTimezoneOffset();
const estTime=new Date(now.getTime()+(localOffset+estOffset)*60000);
const midnightEST=new Date(estTime);
midnightEST.setHours(0,0,0,0);
const midnightLocal=new Date(midnightEST.getTime()-(localOffset+estOffset)*60000);
// Count sent drafts since midnight
const sentDraftsToday=sentMessages.filter(msg=>{
const msgDate=new Date(msg.updated_at);
return msgDate>=midnightLocal;
}).length;
// Count sent follow-ups since midnight (where prepared_at is set)
const sentFollowUpsToday=followUps.filter(f=>{
if(!f.prepared_at)return false;
const msgDate=new Date(f.prepared_at);
return msgDate>=midnightLocal;
}).length;
const totalMessagesToday=sentDraftsToday+sentFollowUpsToday;
document.getElementById('messagesSentCount').textContent=totalMessagesToday;
}catch(e){
console.error('Failed to refresh stats:',e);
document.getElementById('messagesSentCount').textContent='0';
document.getElementById('followUpCount').textContent='0';
}
}
function refreshCurrentTab(tabId){
switch(tabId){
case 'home':
refreshStats();
refreshQueue();
refreshSentMessages();
break;
case 'followups':
refreshFollowUpMessages();
break;
case 'targets':
refreshTargets();
break;
case 'active':
case 'approved':
refreshApprovedTargets();
break;
}
}
document.querySelectorAll('.tab-button').forEach(button=>{
button.addEventListener('click',()=>{
const tabId=button.dataset.tab;
document.querySelectorAll('.tab-button').forEach(btn=>{
btn.classList.remove('active');
});
button.classList.add('active');
document.querySelectorAll('.tab-content').forEach(content=>{
content.classList.remove('active');
});
const targetContent=document.querySelector('.tab-content[data-tab="'+tabId+'"]');
if(targetContent){
targetContent.classList.add('active');
}
refreshCurrentTab(tabId);
});
});
refreshCurrentTab('home');
});
}else{
async function refreshStats(){
try{
const followUpsResp=await fetch('/api/drafts/followups');
const followUps=await followUpsResp.json();
// Count unique contacts, not total messages
const uniqueContacts=new Set(followUps.map(f=>f.contact_id));
const followUpCount=uniqueContacts.size;
document.getElementById('followUpCount').textContent=followUpCount;
const sentResp=await fetch('/api/drafts/sent');
const sentMessages=await sentResp.json();
const now=new Date();
const estOffset=-5*60;
const localOffset=now.getTimezoneOffset();
const estTime=new Date(now.getTime()+(localOffset+estOffset)*60000);
const midnightEST=new Date(estTime);
midnightEST.setHours(0,0,0,0);
const midnightLocal=new Date(midnightEST.getTime()-(localOffset+estOffset)*60000);
// Count sent drafts since midnight
const sentDraftsToday=sentMessages.filter(msg=>{
const msgDate=new Date(msg.updated_at);
return msgDate>=midnightLocal;
}).length;
// Count sent follow-ups since midnight (where prepared_at is set)
const sentFollowUpsToday=followUps.filter(f=>{
if(!f.prepared_at)return false;
const msgDate=new Date(f.prepared_at);
return msgDate>=midnightLocal;
}).length;
const totalMessagesToday=sentDraftsToday+sentFollowUpsToday;
document.getElementById('messagesSentCount').textContent=totalMessagesToday;
}catch(e){
console.error('Failed to refresh stats:',e);
document.getElementById('messagesSentCount').textContent='0';
document.getElementById('followUpCount').textContent='0';
}
}
function refreshCurrentTab(tabId){
switch(tabId){
case 'home':
refreshStats();
refreshQueue();
refreshSentMessages();
break;
case 'followups':
refreshFollowUpMessages();
break;
case 'targets':
refreshTargets();
break;
case 'active':
case 'approved':
refreshApprovedTargets();
break;
}
}
document.querySelectorAll('.tab-button').forEach(button=>{
button.addEventListener('click',()=>{
const tabId=button.dataset.tab;
document.querySelectorAll('.tab-button').forEach(btn=>{
btn.classList.remove('active');
});
button.classList.add('active');
document.querySelectorAll('.tab-content').forEach(content=>{
content.classList.remove('active');
});
const targetContent=document.querySelector('.tab-content[data-tab="'+tabId+'"]');
if(targetContent){
targetContent.classList.add('active');
}
refreshCurrentTab(tabId);
});
});
refreshCurrentTab('home');
}
</script>
</body>
</html>`;
}

export default getHtmlTemplate;
