// Kerangka tampilan bersama subaplikasi Kepesantrenan Nuris — standar desain Mutabaah Tahfidz:
// sidebar pine bermotif belah ketupat (desktop), bilah judul bening, menu bawah (HP), kartu putih membulat 18px.
export const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
export const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const icon = (d: string, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const I = {
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>', users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6m2 10a6 6 0 0 0-3-5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', chart: '<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M4.9 19.1 7 17m10-10 2.1-2.1"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
  back: '<path d="m15 6-6 6 6 6"/>', check: '<path d="m5 12 4 4 10-10"/>', print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  pdf: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M12 11v6m-3-3 3 3 3-3"/>', down: '<path d="M12 4v12m-5-5 5 5 5-5M5 20h14"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>', calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4m8-4v4"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 7 5-3 5 3-1.5-7"/>', spark: '<path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  exit: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', bed: '<path d="M3 18V7m0 7h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>',
};

export type NavItem = { id: string; label: string; icon: string; badge?: string | number };
export type Shell = { app: string; title: string; nav: NavItem[]; active: string; user?: { nama: string; peran?: string } | null; actions?: string; back?: boolean };

export function shell(o: Shell, body: string) {
  const nav = o.nav.map((n) => `<a href="#${esc(n.id)}" data-nav="${esc(n.id)}" class="ns-nav-item${n.id === o.active ? ' on' : ''}"${n.id === o.active ? ' aria-current="page"' : ''}>${icon(n.icon)}<span>${esc(n.label)}</span>${n.badge ? `<b class="ns-badge">${esc(n.badge)}</b>` : ''}</a>`).join('');
  const bottom = o.nav.slice(0, 5).map((n) => `<a href="#${esc(n.id)}" data-nav="${esc(n.id)}" class="${n.id === o.active ? 'on' : ''}"${n.id === o.active ? ' aria-current="page"' : ''}>${icon(n.icon, 20)}<span>${esc(n.label)}</span></a>`).join('');
  return `<div class="ns">
  <aside class="ns-side nuris-sidebar" aria-label="Navigasi ${esc(o.app)}">
    <a class="ns-brand" href="/" target="_top" data-portal><span class="ns-mark"><img src="/nuris-mark.svg" alt="" width="26" height="26"></span><span><small>Nurul Islam Tengaran</small><strong>${esc(o.app)}</strong></span></a>
    <nav class="ns-nav" data-nuris-glass="side">${nav}</nav>
    <div class="ns-foot">${o.user ? `<div class="ns-user"><span class="ns-avatar">${esc((o.user.nama.replace(/^Ust(h)?\.?\s*/i, '')[0] || 'N').toUpperCase())}</span><span><b>${esc(o.user.nama)}</b><small>${esc(o.user.peran || '')}</small></span></div>` : ''}
      <a class="ns-portal" href="/" target="_top" data-portal>${icon(I.exit)}<span>Portal Kepesantrenan</span></a></div>
  </aside>
  <div class="ns-main">
    <header class="ns-head">${o.back ? `<button class="ns-icon" data-act="back" aria-label="Kembali">${icon(I.back)}</button>` : ''}
      <span class="ns-headmark"><img src="/nuris-mark.svg" alt="" width="28" height="28"></span>
      <h1>${esc(o.title)}</h1>
      <div class="nuris-toolbar-actions">${o.actions || ''}<button class="ns-icon" data-act="apps" aria-label="Aplikasi Nuris" aria-haspopup="menu">${icon(I.grid)}</button></div></header>
    <main id="main" tabindex="-1">${body}</main>
  </div>
  ${o.nav.length > 1 ? `<nav class="ns-bottom nuris-bottom-nav" aria-label="Menu">${bottom}</nav>` : ''}
</div>`;
}

export function toast(msg: string, kind: 'ok' | 'err' = 'ok') {
  const t = document.createElement('div'); t.className = `ns-toast ${kind}`; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.append(t); setTimeout(() => t.classList.add('out'), 3400); setTimeout(() => t.remove(), 3900);
}
export const token = () => { try { return localStorage.getItem('mut_token') || ''; } catch { return ''; } };
export function apiOf(base: string) {
  return async (path: string, body: any = {}) => {
    const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token() }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({ ok: false, error: { message: 'Respons server tidak terbaca.' } }));
    if (!r.ok || j.ok === false || j.error) throw Object.assign(new Error(j.error?.message || j.error || 'Permintaan gagal.'), { status: r.status });
    return j;
  };
}
export function sessionEnded() { if (window.parent !== window) parent.postMessage({ type: 'nuris:session-ended' }, location.origin); }
export const loading = () => '<div class="ns-loading" aria-busy="true" aria-label="Memuat"><span></span><span></span><span></span></div>';
export const empty = (title: string, text = '', action = '') => `<div class="ns-empty"><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
export function needLogin(app: string) {
  return empty('Silakan masuk terlebih dahulu.', `${app} memakai akun Mutabaah. Masuk melalui portal Kepesantrenan Nuris, lalu buka kembali aplikasi ini.`, '<a class="ns-btn primary" href="/" target="_top">Buka portal</a>');
}

export function appsMenu(btn: HTMLElement, self: string) {
  $('.ns-apps')?.remove();
  const apps: any[] = (window as any).NURIS_APPS || [];
  const m = document.createElement('div'); m.className = 'ns-apps'; m.setAttribute('role', 'menu');
  const framed = window.parent !== window;
  m.innerHTML = `<a role="menuitem" href="/" target="_top" data-app="beranda">${icon(I.home)}Beranda portal</a>` + apps.filter((x) => x.id !== self && (!x.admin || (() => { try { return ['pimpinan', 'admin'].includes(String(JSON.parse(localStorage.getItem('mut_user') || '{}').role || '').toLowerCase()); } catch { return false; } })())).map((x) => `<a role="menuitem" href="${esc(x.path)}" target="_top" data-app="${esc(x.id)}">${icon((I as any)[x.icon] || I.grid)}${esc(x.name)}</a>`).join('');
  if (framed) m.addEventListener('click', (e) => { const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-app]'); if (!a) return; e.preventDefault(); parent.postMessage({ type: 'nuris:navigate', app: a.dataset.app }, location.origin); m.remove(); });
  document.body.append(m);
  const r = btn.getBoundingClientRect(); m.style.top = r.bottom + 8 + 'px'; m.style.right = Math.max(8, innerWidth - r.right) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', function out(ev) { if (!m.contains(ev.target as Node)) { m.remove(); document.removeEventListener('pointerdown', out); } }), 0);
}
// Tautan portal di dalam bingkai portal: kembali tanpa memuat ulang.
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-portal]');
  if (a && window.parent !== window) { e.preventDefault(); parent.postMessage({ type: 'nuris:navigate', app: 'beranda' }, location.origin); }
});
export const unitLabel = (unit: string) => String(unit || '').replace(/\bIkhwan\b/i, 'Putra').replace(/\bAkhwat\b/i, 'Putri');
export function download(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
export const csvOf = (rows: (string | number | null | undefined)[][]) => '﻿' + rows.map((l) => l.map((x) => { const s = String(x ?? ''); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(';')).join('\r\n');
