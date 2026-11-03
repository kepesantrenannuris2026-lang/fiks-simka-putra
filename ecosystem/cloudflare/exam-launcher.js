/* Mutabaah header integration. Local UI only: no API calls or data writes. */
(() => {
  'use strict';
  if (window.NurisHeaderLauncher) return;
  window.NurisHeaderLauncher = true;
  const style = document.createElement('style');
  style.textContent = `
    .nuris-mutabaah-toolbar{gap:8px!important;min-width:0;min-height:64px;padding-right:76px!important}
    .nuris-mutabaah-toolbar h1{min-width:0}
    .nuris-launcher-actions{display:inline-flex;align-items:center;gap:4px;flex-shrink:0}
    .nuris-mutabaah-header>#nuris-appearance-toggle,.nuris-apps-toggle{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;min-width:40px;flex-shrink:0;padding:0;margin:0;border:1px solid var(--color-line,#dce5df);border-radius:12px;background:var(--color-mist,#f2f6f3);color:var(--color-ink,#122219);cursor:pointer}
    .nuris-mutabaah-header>#nuris-appearance-toggle{position:absolute!important;top:max(.75rem,env(safe-area-inset-top));right:max(24px,calc((100% - 1180px)/2 + 24px))}
    .nuris-apps-toggle:hover{background:var(--color-leaf-soft,#e4f1e8)}
    .nuris-apps-toggle svg{width:20px;height:20px}
    .nuris-apps-toggle:focus-visible,.nuris-apps-panel a:focus-visible{outline:3px solid #17873f;outline-offset:3px}
    .nuris-apps-panel{position:absolute;right:12px;top:calc(100% + 6px);z-index:60;width:min(340px,calc(100vw - 24px));max-height:calc(100dvh - 100px);overflow:auto;padding:10px;border:1px solid var(--color-line,#dce5df);border-radius:16px;background:var(--nuris-panel-bg,#fff);color:var(--color-ink,#122219);box-shadow:0 12px 32px #082e1a20}
    .nuris-apps-panel[hidden]{display:none!important}
    .nuris-apps-panel p{margin:4px 10px 8px;font-size:12px;font-weight:700;color:var(--color-muted,#68796e)}
    .nuris-apps-panel a{display:flex;align-items:center;gap:12px;min-height:48px;padding:10px;border-radius:10px;color:inherit;text-decoration:none;font-size:14px;font-weight:600}
    .nuris-apps-panel a:hover,.nuris-apps-panel a[aria-current=page]{background:var(--color-leaf-soft,#e4f1e8)}
    .nuris-apps-panel a[aria-current=page]::after{content:'Aktif';margin-left:auto;font-size:11px;color:var(--color-leaf-deep,#16743a)}
    .nuris-apps-panel svg{width:20px;height:20px;flex-shrink:0}
    html[data-nuris-theme=dark] .nuris-apps-panel{--nuris-panel-bg:#10281a}
    @media(max-width:640px){.nuris-mutabaah-toolbar{gap:4px!important;padding-left:12px!important;padding-right:60px!important}.nuris-mutabaah-header>#nuris-appearance-toggle{right:12px}.nuris-mutabaah-toolbar h1{font-size:16px}.nuris-mutabaah-toolbar>img{width:28px;height:28px}.nuris-mutabaah-toolbar>span[title]>span{display:none!important}}
    @media print{.nuris-launcher-actions,.nuris-apps-panel{display:none!important}}
/* Mutabaah dark palette: surface roles stay separate from action/text roles. */
@media screen {
  html[data-nuris-theme=dark] {
    --nuris-canvas:#101a16;
    --nuris-surface:#192621;
    --nuris-raised:#21322a;
    --nuris-border:#344b3e;
    --nuris-text:#e6eee9;
    --nuris-muted:#a8bcb0;
    --nuris-green:#98d5b0;
    --nuris-panel-bg:#192621;
    --pine:#98d5b0;--ink:#e6eee9;--muted:#a8bcb0;--line:#344b3e;
    --canvas:#101a16;--surface:#192621;--soft:#21372b;
    --color-mist:#101a16;--color-ink:#e6eee9;--color-muted:#a8bcb0;
    --color-line:#344b3e;--color-pine:#173b29;
    --color-leaf:#347a50;--color-leaf-deep:#285f3f;--color-leaf-soft:#21372b;
    --color-saffron:#dca164;--color-saffron-soft:#3c2c1e;
    --color-sky:#416eaf;--color-sky-soft:#202f45;
    --color-rose:#b84e59;--color-rose-soft:#3b252c;
    --color-amber:#b18442;--color-amber-soft:#362e20;
    background:var(--nuris-canvas);color:var(--nuris-text);
  }
  html[data-nuris-theme=dark] body {background:var(--nuris-canvas);color:var(--nuris-text)}
  html[data-nuris-theme=dark] .bg-white,
  html[data-nuris-theme=dark] .nuris-apps-panel,
  html[data-nuris-theme=dark] #nuris-appearance-toggle {
    background-color:var(--nuris-surface)!important;color:var(--nuris-text);border-color:var(--nuris-border);
  }
  /* These opacity utilities previously kept the bottom navigation white. */
  html[data-nuris-theme=dark] :is([class~="bg-white/95"],[class~="bg-white/90"],[class~="bg-white/85"],[class~="bg-white/80"],[class~="bg-white/70"],[class~="bg-white/60"],[class~="bg-white/50"]) {
    background-color:var(--nuris-surface);color:var(--nuris-text);
  }
  html[data-nuris-theme=dark] .bg-mist {background-color:var(--nuris-canvas)}
  html[data-nuris-theme=dark] :is(.bg-leaf-soft,[class~="bg-leaf-soft/60"]) {background-color:#21372b}
  html[data-nuris-theme=dark] :is(.text-pine,.text-leaf,.text-leaf-deep) {color:var(--nuris-green)}
  html[data-nuris-theme=dark] .text-muted {color:var(--nuris-muted)}
  html[data-nuris-theme=dark] .text-saffron {color:#efb780}
  html[data-nuris-theme=dark] .text-sky {color:#9abcf1}
  html[data-nuris-theme=dark] .text-rose {color:#f0a1a5}
  html[data-nuris-theme=dark] .text-amber {color:#e4c48b}
  html[data-nuris-theme=dark] [class~="hover:bg-white"]:hover {background-color:var(--nuris-raised)}
  html[data-nuris-theme=dark] :is([class~="hover:text-leaf"],[class~="hover:text-leaf-deep"]):hover {color:var(--nuris-green)}
  html[data-nuris-theme=dark] .bg-saffron {
    background-color:#dca164;color:#241b11!important;
  }
  html[data-nuris-theme=dark] .bg-saffron :is(.text-pine,.text-leaf,.text-leaf-deep) {color:#241b11!important}
  html[data-nuris-theme=dark] :is(.bg-leaf,.bg-leaf-deep,.bg-sky,.bg-rose).text-white {color:#fff}
  html[data-nuris-theme=dark] .nuris-mutabaah-header {
    background:#15211b!important;border-color:var(--nuris-border);
    backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  }
  html[data-nuris-theme=dark] nav[class~="fixed"][class~="bottom-0"] {
    background:#192621!important;border-color:var(--nuris-border);
    backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  }
  html[data-nuris-theme=dark] .nuris-apps-panel {--nuris-panel-bg:#192621}
  /* A quiet pattern retains Nuris' identity without a bright checkerboard. */
  html[data-nuris-theme=dark] .kufi-pattern {
    background-color:#193525!important;
    background-image:linear-gradient(45deg,#ffffff03 25%,transparent 25% 75%,#ffffff03 75%),linear-gradient(45deg,#ffffff03 25%,transparent 25% 75%,#ffffff03 75%);
    color:var(--nuris-text);
  }
  html[data-nuris-theme=dark] .kufi-pattern :is([class~="bg-white/[.06]"],[class~="bg-white/[.07]"]) {background-color:#ffffff08}
  html[data-nuris-theme=dark] .kufi-pattern [class~="bg-saffron/20"] {background-color:#3c2c1e;color:#f4d2a9}
  html[data-nuris-theme=dark] .kufi-pattern [class~="text-white/50"] {color:#a8bcb0}
  html[data-nuris-theme=dark] :is(input,select,textarea) {
    background-color:var(--nuris-surface);color:var(--nuris-text);border-color:#425e4c;
  }
  html[data-nuris-theme=dark] :is(input,textarea)::placeholder {color:#9bad9f;opacity:1}
  html[data-nuris-theme=dark] :is(button,a,input,select,textarea):focus-visible {outline-color:#dca164}
  html[data-nuris-theme=dark] [class~="bg-[#EEF1F4]"] {background-color:#222d30}
  html[data-nuris-theme=dark] :is([class~="text-[#46525D]"],[class~="text-[#5E6B77]"]) {color:#b8c6cf}
  html[data-nuris-theme=dark] :is([class~="text-[#9a5510]"],[class~="text-[#C26A1E]"]) {color:#efb780}
  /* Chart axes and tooltips have inline light-theme colors. */
  html[data-nuris-theme=dark] .recharts-cartesian-axis-tick text {fill:#a8bcb0!important}
  html[data-nuris-theme=dark] .recharts-cartesian-grid line {stroke:#344b3e!important}
  html[data-nuris-theme=dark] .recharts-default-tooltip {
    background-color:#21322a!important;border-color:#425e4c!important;color:#e6eee9!important;
  }
  html[data-nuris-theme=dark] .recharts-tooltip-label {color:#e6eee9!important}
  html[data-nuris-theme=dark] [style*="color: rgb(23, 135, 63)"] {color:#98d5b0!important}
  html[data-nuris-theme=dark] [style*="color: rgb(47, 107, 216)"] {color:#9abcf1!important}
  html[data-nuris-theme=dark] [style*="color: rgb(238, 138, 53)"] {color:#efb780!important}
}
  `;
  document.head.append(style);

  // The portal hides its own header while a module is open. Hide its fallback
  // theme button as well, rather than overlaying the module's theme button.
  try {
    if (window.parent !== window && window.parent.location.origin === location.origin) {
      const parentDoc = window.parent.document;
      if (!parentDoc.getElementById('nuris-module-header-fix')) {
        const parentStyle = parentDoc.createElement('style');
        parentStyle.id = 'nuris-module-header-fix';
        parentStyle.textContent = '.module-open>#nuris-appearance-toggle{display:none!important}.module-open.nuris-theme-login{padding-top:0!important}';
        parentDoc.head.append(parentStyle);
      }
    }
  } catch { /* Standalone and cross-origin embedding keep their own header. */ }

  const svg = paths => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
  const icons = {
    apps: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    home: '<path d="m3 10 9-7 9 7v10H4V10m5 10v-7h6v7"/>',
    book: '<path d="M12 6C9 4 5 3 2 4v15c3-1 7 0 10 2 3-2 7-3 10-2V4c-3-1-7 0-10 2zm0 0v15"/>',
    shield: '<path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z"/><path d="m8 12 3 3 5-6"/>'
  };
  const registry = [
    {id:'beranda',name:'Beranda Kepesantrenan',icon:'home'},
    {id:'yaumiyyah',name:'Mutabaah Yaumiyyah',icon:'book'},
    {id:'mutabaah',name:'Mutabaah Tahfidz',icon:'book'},
    {id:'simka',name:'SIMKA Putra',icon:'shield'},
    {id:'simka-putri',name:'SIMKA Putri',icon:'shield'}
  ];
  const actions = document.createElement('div');
  actions.className = 'nuris-launcher-actions';
  const button = document.createElement('button');
  button.id = 'nuris-apps-toggle'; button.type = 'button';
  button.className = 'nuris-apps-toggle';
  button.title = 'Aplikasi Nuris';
  button.setAttribute('aria-label','Aplikasi Nuris');
  button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-controls','nuris-apps-panel');
  button.innerHTML = svg(icons.apps);
  actions.append(button);
  const panel = document.createElement('nav');
  panel.id = 'nuris-apps-panel'; panel.className = 'nuris-apps-panel';
  panel.setAttribute('aria-label','Aplikasi kepesantrenan'); panel.hidden = true;
  const heading = document.createElement('p');
  heading.textContent = 'Aplikasi Nuris'; panel.append(heading);
  function close(restoreFocus = false) {
    panel.hidden = true; button.setAttribute('aria-expanded','false');
    if (restoreFocus && button.isConnected) button.focus();
  }
  for (const app of registry) {
    const link = document.createElement('a');
    link.href = '/#'+app.id;
    link.innerHTML = svg(icons[app.icon]);
    const label = document.createElement('span');label.textContent = app.name;link.append(label);
    if (app.id === 'mutabaah') link.setAttribute('aria-current','page');
    link.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();close();
      if (app.id === 'mutabaah') { button.focus(); return; }
      try {
        if (window.parent !== window && window.parent.location.origin === location.origin && window.parent.document.getElementById('frames')) {
          window.parent.postMessage({type:'nuris:navigate',app:app.id},location.origin);
          return;
        }
      } catch {}
      // Normal navigation preserves the app's unsaved-form beforeunload guard.
      window.location.assign(link.href);
    });
    panel.append(link);
  }
  function open() {
    panel.hidden = false;button.setAttribute('aria-expanded','true');
    panel.querySelector('a').focus();
  }
  button.addEventListener('click',()=>panel.hidden?open():close(true));
  button.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();open();}});
  document.addEventListener('keydown',event=>{
    if(panel.hidden)return;
    if(event.key==='Escape'){event.preventDefault();close(true);}
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&panel.contains(document.activeElement)){
      event.preventDefault();const links=Array.from(panel.querySelectorAll('a'));
      const index=links.indexOf(document.activeElement);
      links[event.key==='Home'?0:event.key==='End'?links.length-1:(index+(event.key==='ArrowDown'?1:-1)+links.length)%links.length].focus();
    }
  });
  document.addEventListener('click',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!button.contains(event.target))close();});
  document.addEventListener('focusin',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!button.contains(event.target))close();});
  let queued = false;
  function mount() {
    const header = document.querySelector('header');
    const row = header?.querySelector('h1')?.parentElement;
    if (!row) {close();actions.remove();panel.remove();return;}
    header.classList.add('nuris-mutabaah-header');
    row.classList.add('nuris-mutabaah-toolbar');
    const bell = row.querySelector('button[aria-label*="otifikasi"]');
    if (actions.parentNode !== row) {
      if (bell) bell.after(actions); else row.append(actions);
    }
    if (panel.parentNode !== header) header.append(panel);
  }
  function start() {
    mount();
    new MutationObserver(()=>{
      if(queued)return;queued=true;
      queueMicrotask(()=>{queued=false;mount();});
    }).observe(document.body,{childList:true,subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
