/* Local-only preferences: no analytics, requests, timers or database writes. */
(() => {
  const root = document.documentElement;
  const key = 'nuris-appearance';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let mode = 'light', busy = false;
  try { mode = localStorage.getItem(key) || localStorage.getItem('simka_theme') || 'light'; } catch {}
  const button = document.createElement('button');
  button.type = 'button'; button.id = 'nuris-appearance-toggle';
  function apply(next, persist = true) {
    mode = next === 'dark' ? 'dark' : 'light';
    root.dataset.nurisTheme = mode;
    root.classList.toggle('dark', mode === 'dark');
    document.body?.classList.toggle('dark', mode === 'dark');
    root.style.colorScheme = mode;
    button.textContent = mode === 'dark' ? '☀' : '☾';
    button.setAttribute('aria-label', mode === 'dark' ? 'Gunakan mode terang' : 'Gunakan mode gelap');
    button.setAttribute('aria-pressed', String(mode === 'dark'));
    button.title = button.getAttribute('aria-label');
    if (persist) { try { localStorage.setItem(key, mode); localStorage.setItem('simka_theme', mode); } catch {} }
    dispatchEvent(new CustomEvent('nuris-theme', { detail: mode }));
  }
  async function change(next, anchor = button) {
    if (busy || next === mode) return;
    if (!document.startViewTransition || reduced.matches || document.visibilityState !== 'visible') { apply(next); return; }
    busy = true;
    const box = anchor.getBoundingClientRect();
    const x = box.left + box.width / 2, y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth-x), Math.max(y, innerHeight-y));
    root.classList.add('nuris-theme-transition');
    const transition = document.startViewTransition(() => apply(next));
    try {
      await transition.ready;
      await root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${radius}px at ${x}px ${y}px)`]}, {duration:360,easing:'ease-out',pseudoElement:'::view-transition-new(root)'}).finished;
    } catch { /* Theme still applies when snapshots/animations are unsupported. */ }
    finally { await transition.finished.catch(() => {}); root.classList.remove('nuris-theme-transition'); busy = false; }
  }
  window.NurisAppearance = {change, get mode(){return mode;}};
  button.addEventListener('click', () => change(mode === 'dark' ? 'light' : 'dark'));
  addEventListener('storage', e => { if (e.key === key) apply(e.newValue, false); });
  apply(mode, false);
  function mount() {
    if (!document.body) return;
    const header = Array.from(document.querySelectorAll('.nuris-toolbar-actions, .yaum-header, .topbar .profile, header')).find(el => el.getClientRects().length && el.getBoundingClientRect().height > 0);
    const target = header || document.body;
    if (button.parentNode !== target) target.append(button);
    button.classList.toggle('nuris-theme-fallback', !header);
    document.body.classList.toggle('nuris-theme-login', !header);
  }
  document.addEventListener('DOMContentLoaded', () => {
    mount(); apply(mode, false);
    let queued = false;
    new MutationObserver(() => { if (queued) return; queued = true; queueMicrotask(() => {queued=false; mount();}); }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  }, {once:true});
})();
