/* Nuris Shell — lapisan bersama semua aplikasi Kepesantrenan Nuris (24 Nov 2026).
   1) Warna khas tiap aplikasi: bagian atas logo & gelembung tab bar (bagian bawah logo tetap hijau).
   2) Logo pojok kiri atas = kembali ke Beranda Portal.
   3) Tombol "Aplikasi Nuris" di bilah atas dihapus; gantinya bagian "Pindah Aplikasi" di sidebar & laci menu,
      dari satu sumber (/apps.js) dan disaring sesuai hak akses akun.
   4) SIMKA Putra/Putri: sidebar hijau tua ala Mutabaah, lencana unit kontras, menu buntu dihapus, label ringkas.
   Hanya tampilan & navigasi: tidak mengubah sesi, data, atau API. */
(() => {
  if (window.__nurisShell) return; window.__nurisShell = 1;
  const API = 'https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan/session';
  const WARNA = { beranda: '#ee8a36', mutabaah: '#2b7bd6', yaumiyyah: '#0e9494', 'rapor-pesantren': '#7c4dcc', simka: '#c4473a', 'simka-putri': '#e0528a', infrastruktur: '#64748b' };
  const p = location.pathname;
  const APP = p.startsWith('/mutabaah') ? 'mutabaah' : p.startsWith('/yaumiyyah') || p.startsWith('/ujian-praktik') ? 'yaumiyyah'
    : p.startsWith('/rapor-pesantren') ? 'rapor-pesantren' : p.startsWith('/simka-putri') ? 'simka-putri' : p.startsWith('/simka') ? 'simka'
    : p.startsWith('/infrastruktur') ? 'infrastruktur' : 'beranda';
  const root = document.documentElement;
  root.dataset.nurisApp = APP;
  root.style.setProperty('--nuris-accent', WARNA[APP]);
  root.style.setProperty('--nn-saffron', WARNA[APP]);
  if (APP !== 'beranda') root.style.setProperty('--nn-ink', '#ffffff');
  const framed = window.parent !== window;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Navigasi antaraplikasi (tanpa login ulang: token yang sama) ---------- */
  function buka(id) {
    if (framed) parent.postMessage({ type: 'nuris:navigate', app: id }, location.origin);
    else location.assign('/#' + id);
  }

  /* ---------- 1) Logo per aplikasi (hanya di bilah/menu, bukan di rapor/cetakan) ---------- */
  const LOGO = /\/(nuris-mark\.svg|logo\.svg|favicon\.svg|logo-nuris\.svg|logo-nuris\.png|logo-mark\.png)(\?.*)?$/;
  const CHROME = 'aside, header, .nuris-toolbar, .ns-head, .ns-side, .ns-drawer, .nuris-sidebar, .nps-logo';
  function logo(img) {
    if (APP === 'beranda' || img.dataset.nurisLogo) return;
    const src = img.getAttribute('src') || '';
    if (!LOGO.test(src) || !img.closest(CHROME) || img.closest('#preview, .rapor, .rp-page, [data-rapor]')) return;
    img.dataset.nurisLogo = '1'; img.onerror = null; img.src = '/logo-app/' + APP + '.svg';
  }
  function favicon() {
    if (APP === 'beranda') return;
    for (const l of document.querySelectorAll('link[rel~="icon"]')) if (!l.dataset.nurisLogo) { l.dataset.nurisLogo = '1'; l.href = '/logo-app/' + APP + '.svg'; l.type = 'image/svg+xml'; }
  }

  /* ---------- 2) Logo pojok kiri atas → Beranda Portal ---------- */
  const KE_PORTAL = [
    'aside.kufi-pattern > div:first-child', // Mutabaah: logo + nama di sidebar
    'header img.size-9', // Mutabaah: logo bilah atas (HP)
    '.nuris-sidebar > div:first-child > div:first-child', // SIMKA: logo + nama di sidebar/laci
    '.nuris-toolbar > div:first-child img', // SIMKA: logo bilah atas (HP)
    '.nps-logo',
  ].join(',');
  function tandaiLogo(el) {
    if (el.dataset.nurisPortal) return;
    el.dataset.nurisPortal = '1'; el.title = 'Kembali ke Beranda Portal'; el.setAttribute('role', 'link'); el.tabIndex = 0;
    el.setAttribute('aria-label', 'Kembali ke Beranda Portal');
  }
  document.addEventListener('click', (e) => {
    if (APP === 'beranda') return;
    const el = e.target.closest && e.target.closest(KE_PORTAL);
    if (!el) return;
    e.preventDefault(); e.stopPropagation(); buka('beranda');
  }, true);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.nurisPortal) { e.preventDefault(); buka('beranda'); }
  }, true);

  /* ---------- 3) Pindah Aplikasi (satu sumber: /apps.js + hak akses akun) ---------- */
  let apps = null, akses = null, memuat = false;
  function muatApps() {
    if (window.NURIS_APPS) { apps = window.NURIS_APPS; return; }
    if (memuat) return; memuat = true;
    const s = document.createElement('script'); s.src = '/apps.js'; s.onload = () => { apps = window.NURIS_APPS || []; tempel(); }; document.head.append(s);
  }
  async function muatAkses() {
    try { const c = JSON.parse(sessionStorage.getItem('nuris_akses') || 'null'); if (c && Date.now() - c.t < 10 * 60 * 1000) { akses = c; return; } } catch {}
    let token = ''; try { token = localStorage.getItem('mut_token') || ''; } catch {}
    if (!token) { akses = { apps: {}, admin: false, anon: true }; return; }
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: '{}' }).then((x) => x.json());
      const role = String(r?.mutabaahUser?.role || '').toLowerCase();
      akses = { t: Date.now(), apps: r?.apps || {}, admin: role === 'pimpinan' || role === 'admin' };
      try { sessionStorage.setItem('nuris_akses', JSON.stringify(akses)); } catch {}
    } catch { akses = null; } // gagal: tampilkan semua aplikasi umum; portal tetap memeriksa akses saat dibuka
    tempel();
  }
  const SHEET = 'div.fixed.inset-0.z-40.md\\:hidden';
  // Sama dengan kartu Beranda Portal: aplikasi admin hanya untuk pimpinan; lainnya sesuai penugasan (requires = induk).
  // Bila akses belum/tidak dapat dibaca, tampilkan aplikasi umum; portal tetap memeriksa akses saat dibuka.
  function daftar() {
    return (apps || []).filter((a) => !a.alias).filter((a) => {
      if (a.id === APP) return true;
      if (a.admin) return !!akses?.admin;
      if (!akses || akses.anon) return true;
      return !!akses.apps[a.requires || a.id];
    });
  }
  function html(tema) {
    const items = daftar();
    const row = (id, name, color, cur) => `<a href="/#${esc(id)}" data-nuris-app-link="${esc(id)}" class="nps-item${cur ? ' is-cur' : ''}"${cur ? ' aria-current="true"' : ''} title="${esc(name)}"><i style="background:${color}"></i><span>${esc(name)}</span>${cur ? '<small>Aktif</small>' : ''}</a>`;
    return `<div class="nps nps-${tema}" data-nuris-pindah-list><p class="nps-title">Pindah Aplikasi</p>`
      + row('beranda', 'Beranda Portal', WARNA.beranda, false)
      + items.map((a) => row(a.id, a.name, WARNA[a.id] || WARNA.beranda, a.id === APP)).join('') + '</div>';
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-nuris-app-link]');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    const id = a.dataset.nurisAppLink;
    tutupLaci();
    if (id !== APP) buka(id);
  }, true);
  function tutupLaci() {
    // Laci Mutabaah ("Lainnya") tertutup bila latarnya diketuk; laci SIMKA lewat tombol "Tutup Menu"; laci bersama lewat data-act.
    const sheet = document.querySelector(SHEET); if (sheet) sheet.click();
    const t = document.querySelector('.nuris-sidebar button[aria-label="Tutup Menu"]'); if (t && t.offsetParent) t.click();
    const d = document.querySelector('#ns-drawer:not([hidden]) [data-act=drawer-close]'); if (d) d.click();
  }
  function pasang(host, tema, posisi = 'append') {
    if (!host || !apps) return;
    let box = posisi === 'after' ? (host.nextElementSibling?.matches?.('[data-nuris-pindah-list]') ? host.nextElementSibling : null) : host.querySelector(':scope > [data-nuris-pindah-list]');
    const isi = html(tema);
    if (box && box.dataset.sig === isi) return;
    const tmp = document.createElement('div'); tmp.innerHTML = isi; const baru = tmp.firstElementChild; baru.dataset.sig = isi;
    if (box) box.replaceWith(baru); else if (posisi === 'after') host.after(baru); else host.append(baru);
  }
  function tempel() {
    if (APP === 'beranda' || !apps) return;
    for (const slot of document.querySelectorAll('[data-nuris-pindah]')) pasang(slot, slot.closest('.ns-drawer, .ns-side') ? 'gelap' : 'terang');
    if (APP === 'mutabaah') {
      pasang(document.querySelector('aside.kufi-pattern > nav'), 'gelap');
      // Laci "Lainnya" (HP): panel putih di bawah layar.
      pasang(document.querySelector(SHEET + ' > div.rounded-t-3xl'), 'terang');
    }
    if (APP === 'simka' || APP === 'simka-putri') pasang(document.querySelector('.nuris-sidebar > nav'), 'gelap');
  }

  /* ---------- 4) SIMKA: label & copy ---------- */
  const PUTRI = APP === 'simka-putri';
  function simka() {
    if (APP !== 'simka' && !PUTRI) return;
    for (const b of document.querySelectorAll('.nuris-sidebar nav button')) {
      const label = b.querySelector('span.truncate'), t = label?.textContent || '';
      if (t === 'Mutabaah Tahfidz' && /Coming Soon/.test(b.textContent)) { if (b.style.display !== 'none') { b.style.display = 'none'; b.setAttribute('aria-hidden', 'true'); b.tabIndex = -1; } }
      else if (t === 'Data Pelanggaran (Master)') { label.textContent = 'Master Pelanggaran'; b.title = 'Data Pelanggaran (Master)'; }
    }
    for (const s of document.querySelectorAll('.nuris-sidebar button span')) if (s.textContent === 'Keluar Sistem') s.textContent = 'Keluar';
    if (PUTRI) {
      const SEL = '.nuris-dashboard-intro h2, .nuris-dashboard-intro p, .nuris-sidebar > div:first-child p, .nuris-toolbar p';
      for (const el of document.querySelectorAll(SEL)) {
        const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          const v = n.nodeValue.replace(/\b([Ss])antri(?!wati)\b/g, '$1antriwati').replace(/Santriwati Putra\b/g, 'Santriwati');
          if (v !== n.nodeValue) n.nodeValue = v;
        }
      }
    }
  }

  /* ---------- Jalankan & pantau perubahan DOM aplikasi ---------- */
  let antre = 0;
  function sapu() {
    antre = 0;
    favicon();
    for (const img of document.querySelectorAll('img')) logo(img);
    if (APP !== 'beranda') for (const el of document.querySelectorAll(KE_PORTAL)) tandaiLogo(el);
    tempel(); simka();
  }
  const jadwal = () => { if (!antre) antre = requestAnimationFrame(sapu); };
  function mulai() {
    muatApps(); if (APP !== 'beranda') muatAkses();
    sapu();
    new MutationObserver(jadwal).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) mulai(); else document.addEventListener('DOMContentLoaded', mulai, { once: true });
})();
