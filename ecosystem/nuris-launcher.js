(() => {
  'use strict';
  if (window.__nurisLauncherMounted) return;
  window.__nurisLauncherMounted = true;
  const API = 'https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan';
  const PORTAL = 'https://kepesantrenannuris.netlify.app/';
  const embedded = window.top !== window && location.hostname === 'kepesantrenannuris.netlify.app';
  const root = document.createElement('div');
  root.id = 'nuris-app-launcher';
  root.innerHTML = `<button type="button" class="nuris-app-trigger" aria-label="Aplikasi Nuris" title="Aplikasi Nuris" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="3" width="6" height="6" rx="1.5"/><rect x="3" y="15" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/></svg><span>Aplikasi Nuris</span></button><div class="nuris-app-menu" role="menu" aria-label="Aplikasi Kepesantrenan Nuris" hidden><p>Aplikasi Nuris</p><button type="button" role="menuitem" data-nuris-app="beranda"><strong>Kepesantrenan</strong><small>Semua aplikasi Anda</small></button><button type="button" role="menuitem" data-nuris-app="mutabaah" aria-current="page"><strong>Mutabaah Tahfidz</strong><small>Setoran & monitoring hafalan</small></button><button type="button" role="menuitem" data-nuris-app="simka"><strong>SIMKA Putra</strong><small>Karakter & pembinaan santri</small></button><button type="button" role="menuitem" data-nuris-app="simka-putri"><strong>SIMKA Putri</strong><small>Karakter & pembinaan santriwati</small></button><button type="button" role="menuitem" data-nuris-app="yaumiyyah"><strong>Mutabaah Yaumiyyah</strong><small>Ibadah harian & rapor</small></button><div class="nuris-app-error" role="alert" hidden></div></div>`;
  const style = document.createElement('style');
  style.textContent = `#nuris-app-launcher{position:relative;display:inline-flex;flex-shrink:0;color:#0d4a28;font-family:inherit}#nuris-app-launcher [hidden]{display:none!important}.nuris-app-trigger{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-width:36px;height:36px;border:0;border-radius:12px;background:transparent;color:inherit;padding:0 8px;font:inherit;font-size:11px;font-weight:600;cursor:pointer}.nuris-app-trigger:hover,.nuris-app-trigger[aria-expanded=true]{background:#e3f2e8}.nuris-app-trigger svg{width:20px;height:20px;flex-shrink:0}.nuris-app-trigger:focus-visible,.nuris-app-menu button:focus-visible{outline:2px solid #17873f;outline-offset:3px}.nuris-app-menu{position:absolute;right:0;top:44px;z-index:80;width:280px;max-width:calc(100vw - 32px);padding:10px;background:#fff;border:1px solid #dce5df;border-radius:18px;box-shadow:0 12px 40px #082e1a24;color:#122219}.nuris-app-menu>p{margin:6px 10px 10px;font-size:11px;font-weight:700;color:#5e6f65}.nuris-app-menu button{display:block;width:100%;padding:12px;border:0;border-radius:11px;background:transparent;text-align:left;cursor:pointer;font-family:inherit;color:#122219}.nuris-app-menu button:hover,.nuris-app-menu button[aria-current=page]{background:#f2f6f3}.nuris-app-menu button:disabled{opacity:.55;cursor:wait}.nuris-app-menu strong{display:block;font-size:12px;font-weight:700}.nuris-app-menu small{display:block;font-size:10px;margin-top:4px;color:#5e6f65}.nuris-app-error{margin:8px;padding:10px;border-radius:10px;background:#fbe5e5;color:#a62c2c;font-size:11px;line-height:1.6}@media(max-width:767px){.nuris-app-trigger{width:36px;padding:0}.nuris-app-trigger>span{display:none}}`;
  document.head.append(style);
  const trigger = root.querySelector('.nuris-app-trigger');
  const menu = root.querySelector('.nuris-app-menu');
  const error = root.querySelector('.nuris-app-error');
  const close = () => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
  trigger.addEventListener('click', () => {
    menu.hidden = !menu.hidden;
    trigger.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) menu.querySelector('button').focus();
  });
  document.addEventListener('click', e => { if (!root.contains(e.target)) close(); });
  root.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); trigger.focus(); }
    if (['ArrowDown','ArrowUp'].includes(e.key) && !menu.hidden) {
      const items = [...menu.querySelectorAll('button')];
      const i = items.indexOf(document.activeElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
      e.preventDefault();
    }
  });
  let busy = false;
  menu.addEventListener('click', async e => {
    const item = e.target.closest('[data-nuris-app]');
    if (!item || busy) return;
    const app = item.dataset.nurisApp;
    if (embedded) { window.parent.postMessage({type:'nuris:navigate',app},location.origin); close(); return; }
    if (app === 'mutabaah') { close(); return; }
    const token = localStorage.getItem('mut_token');
    if (!token) { location.assign(PORTAL + '#' + app); return; }
    busy = true; error.hidden = true;
    menu.querySelectorAll('button').forEach(b => b.disabled = true);
    trigger.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(API + '/handoff', {method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:'{}',signal:AbortSignal.timeout(20000)});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Belum dapat membuka portal. Silakan coba lagi.');
      location.assign(PORTAL + '#transfer=' + result.code + '&app=' + app);
    } catch (e) { error.textContent = e.message || 'Koneksi terputus. Silakan coba lagi.'; error.hidden = false; }
    finally { busy = false; trigger.removeAttribute('aria-busy'); menu.querySelectorAll('button').forEach(b => b.disabled = false); }
  });
  let scheduled = false;
  const attach = () => {
    scheduled = false;
    const bell = [...document.querySelectorAll('header button[aria-label]')].find(b => /notifikasi|pemberitahuan/i.test(b.getAttribute('aria-label') || ''));
    if (!bell) { if(root.isConnected)root.remove(); close(); return; }
    if (bell.nextElementSibling !== root) bell.insertAdjacentElement('afterend', root);
  };
  new MutationObserver(() => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(attach); }
  }).observe(document.body, {childList:true,subtree:true});
  attach();
})();
