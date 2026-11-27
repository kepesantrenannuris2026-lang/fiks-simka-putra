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
  // Warna logo (bagian atas) sesuai logo per aplikasi; strong = tombol/aksen berteks putih (kontras ≥ 4.5:1),
  // soft = latar tipis, light = aksen di atas latar hijau tua. Putih dominan & hijau sekunder tetap.
  const PALET = {
    // Palet permata yang serasi dengan putih (dominan) & hijau pinus (sekunder); semua 'strong' ≥ 5:1 dengan teks putih.
    beranda: { logo: '#ee8a36' },
    mutabaah: { logo: '#1d5fa8', strong: '#1d5fa8', soft: '#e8f0fa', light: '#8fbaf0', ring: '#4a8fe0' }, // biru samudra
    yaumiyyah: { logo: '#0b7285', strong: '#0b7285', soft: '#e3f3f6', light: '#79c8d6', ring: '#1aa3b8' }, // toska petrol
    'rapor-pesantren': { logo: '#6f42a6', strong: '#6f42a6', soft: '#f1ebf8', light: '#c3a5ea', ring: '#9a6fd6' }, // ungu anggur
    simka: { logo: '#b3343a', strong: '#b3343a', soft: '#fbe9ea', light: '#f2a1a5', ring: '#e0565c' }, // merah marun
    infrastruktur: { logo: '#52606d', strong: '#52606d', soft: '#eef1f4', light: '#b9c3d0', ring: '#94a3b8' },
  };
  const WARNA = Object.fromEntries(Object.entries(PALET).map(([k, v]) => [k, v.logo]));
  const p = location.pathname;
  const APP = p.startsWith('/mutabaah') ? 'mutabaah' : p.startsWith('/yaumiyyah') || p.startsWith('/ujian-praktik') ? 'yaumiyyah'
    : p.startsWith('/rapor-pesantren') ? 'rapor-pesantren' : p.startsWith('/simka-putri') ? 'simka-putri' : p.startsWith('/simka') ? 'simka'
    : p.startsWith('/infrastruktur') ? 'infrastruktur' : 'beranda';
  const KUNCI = APP === 'simka-putri' ? 'simka' : APP; // SIMKA Putra & Putri = satu aplikasi, satu warna
  const root = document.documentElement;
  root.dataset.nurisApp = APP; root.dataset.nurisWarna = KUNCI;
  const W = PALET[KUNCI];
  root.style.setProperty('--nuris-accent', W.logo);
  if (W.strong) {
    const set = { '--nuris-accent-ring': W.ring, '--nuris-accent-strong': W.strong, '--nuris-accent-soft': W.soft, '--nuris-accent-light': W.light,
      '--nn-saffron': W.strong, '--nn-ink': '#ffffff',
      '--saffron': W.strong, '--saffron-ink': '#ffffff', '--saffron-soft': W.soft, '--saffron-light': W.light, '--saffron-text': W.strong, // kerangka bersama
      '--color-saffron': W.strong, '--color-saffron-soft': W.soft }; // Mutabaah (Tailwind)
    for (const [k, v] of Object.entries(set)) root.style.setProperty(k, v);
  }
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
    img.dataset.nurisLogo = '1'; img.onerror = null; img.src = '/logo-app/' + KUNCI + '.svg?v=20261124d';
  }
  function favicon() {
    if (APP === 'beranda') return;
    for (const l of document.querySelectorAll('link[rel~="icon"]')) if (!l.dataset.nurisLogo) { l.dataset.nurisLogo = '1'; l.href = '/logo-app/' + KUNCI + '.svg?v=20261124d'; l.type = 'image/svg+xml'; }
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
      if (a.id === KUNCI) return true;
      if (a.admin) return !!akses?.admin;
      if (!akses || akses.anon) return true;
      if (a.varian) return a.varian.some((v) => akses.apps[v.id]);
      return !!akses.apps[a.requires || a.id];
    });
  }
  function html(tema) {
    const items = daftar();
    const row = (id, name, color, cur) => `<a href="/#${esc(id)}" data-nuris-app-link="${esc(id)}" class="nps-item${cur ? ' is-cur' : ''}"${cur ? ' aria-current="true"' : ''} title="${esc(name)}"><i style="background:${color}"></i><span>${esc(name)}</span>${cur ? '<small>Aktif</small>' : ''}</a>`;
    return `<div class="nps nps-${tema}" data-nuris-pindah-list><p class="nps-title">Pindah Aplikasi</p>`
      + row('beranda', 'Beranda Portal', WARNA.beranda, false)
      + items.map((a) => row(a.id, a.name, WARNA[a.id] || WARNA.beranda, a.id === KUNCI)).join('') + '</div>';
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-nuris-app-link]');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    const id = a.dataset.nurisAppLink;
    tutupLaci();
    if (id !== KUNCI) buka(id);
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
    for (const slot of document.querySelectorAll('[data-nuris-pindah]')) pasang(slot, slot.closest('.ns-side') ? 'gelap' : 'terang');
    if (APP === 'mutabaah') {
      pasang(document.querySelector('aside.kufi-pattern > nav'), 'gelap');
      // Laci "Lainnya" (HP): panel putih di bawah layar.
      pasang(document.querySelector(SHEET + ' > div.rounded-t-3xl'), 'terang');
      // Petak "Aplikasi" kini diwakili daftar Pindah Aplikasi di bawahnya.
      for (const t of document.querySelectorAll(SHEET + ' > div.rounded-t-3xl :is(button, a)')) {
        if (t.closest('[data-nuris-pindah-list]') || t.textContent.trim() !== 'Aplikasi' || t.style.display === 'none') continue;
        t.style.display = 'none'; t.setAttribute('aria-hidden', 'true'); t.tabIndex = -1;
      }
    }
    if (APP === 'simka' || APP === 'simka-putri') { pasang(document.querySelector('.nuris-sidebar > nav'), 'gelap'); varian(); }
  }

  /* ---------- SIMKA Putra & Putri dalam satu aplikasi: pilihan bagian di sidebar/laci ---------- */
  const VARIAN = [{ id: 'simka', nama: 'Putra', path: '/simka/' }, { id: 'simka-putri', nama: 'Putri', path: '/simka-putri/' }];
  function varian() {
    const head = document.querySelector('.nuris-sidebar > div:first-child'); if (!head) return;
    const boleh = VARIAN.filter((v) => v.id === APP || !akses || akses.anon || akses.admin || akses.apps[v.id]);
    const sig = boleh.map((v) => v.id).join(',');
    let box = head.nextElementSibling?.matches?.('.nps-varian') ? head.nextElementSibling : null;
    if (box && box.dataset.sig === sig) return;
    if (boleh.length < 2) { box?.remove(); return; }
    const el = document.createElement('div'); el.className = 'nps-varian'; el.dataset.sig = sig; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Bagian SIMKA');
    el.innerHTML = boleh.map((v) => `<button type="button" data-simka-varian="${v.id}" aria-pressed="${v.id === APP}">SIMKA ${v.nama}</button>`).join('');
    if (box) box.replaceWith(el); else head.after(el);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-simka-varian]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const v = VARIAN.find((x) => x.id === b.dataset.simkaVarian); if (!v || v.id === APP) return;
    try { localStorage.setItem('nuris_varian_simka', v.id); } catch {}
    location.assign(v.path); // di dalam bingkai portal: bingkai SIMKA berganti bagian, alamat portal tetap #simka
  }, true);
  if (APP === 'simka' || APP === 'simka-putri') try { localStorage.setItem('nuris_varian_simka', APP); } catch {}

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
  /* ---------- Mutabaah Tahfidz › Ujian Semester: hapus nilai ujian yang sudah final (26 Nov 2026) ----------
     Hasil final terkunci di aplikasi Mutabaah; tombol ini memanggil API Rapor Pesantren (sesi yang sama) untuk
     mengembalikan santri ke "Belum diuji". Hak: penguji yang menginput, musyrif/ah satu unit, koordinator, pimpinan. */
  const UJ_API = 'https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/rapor-pesantren/';
  let ujFinal = null, ujMuat = 0;
  const ujToken = () => { try { return localStorage.getItem('mut_token') || ''; } catch { return ''; } };
  const ujPanggil = (rute, body) => fetch(UJ_API + rute, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + ujToken() }, body: JSON.stringify(body || {}) })
    .then(async (r) => { const j = await r.json().catch(() => ({})); if (!r.ok || j.ok === false) throw new Error(j?.error?.message || 'Gagal menghubungi server.'); return j.data ?? j; });
  const angkaUj = (v) => (v == null ? '' : String(Number(v)).replace('.', ','));
  // Daftar hasil final dimuat saat panel dibuka dan DIMUAT ULANG bila ada santri "Selesai" yang belum dikenal
  // (mis. baru difinalkan setelah daftar dimuat) — paling sering tiap 8 detik.
  function ujDaftar(segarkan) {
    if (!ujToken() || (ujFinal && !segarkan) || Date.now() - ujMuat < (ujFinal ? 8000 : 30000)) return;
    ujMuat = Date.now();
    ujPanggil('tahfidz-final').then((r) => { ujFinal = r.rows || []; jadwal(); }).catch(() => { ujFinal = []; });
  }
  let ujTimer = 0;
  const ujNanti = () => { if (!ujTimer) ujTimer = setTimeout(() => { ujTimer = 0; jadwal(); }, 8100); };
  function ujCari(nama, info, nilai) {
    if (!ujFinal) return null;
    const n = nama.trim().toUpperCase();
    const c = ujFinal.filter((r) => String(r.nama).trim().toUpperCase() === n && (!info || info.includes(`Kelas ${r.tingkat}`)));
    return c.find((r) => nilai == null || angkaUj(r.nilai) === nilai) || c[0] || null;
  }
  const UJ_IKON = {
    hapus: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    buka: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  };
  function ujTombol(r, kecil, jenis) {
    const hapus = jenis === 'hapus', label = hapus ? 'Hapus nilai' : 'Perbaiki';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'nuris-uj-' + jenis + (kecil ? ' sm' : ''); b.dataset.ujId = r.id;
    b.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${UJ_IKON[jenis]}</svg>${label}`;
    b.title = hapus ? 'Hapus nilai ujian ini agar santri dapat diuji ulang dari awal' : 'Buka kembali ujian ini sebagai draft (rincian tetap) untuk diperbaiki';
    b.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const info = `${r.nama} (nilai ${angkaUj(r.nilai)}, ${r.tahun_ajaran} smt ${r.semester})`;
      const tanya = hapus
        ? `Hapus nilai ujian tahfidz ${info}?\n\nSantri kembali berstatus "Belum diuji" dan dapat diuji ulang dari awal. Nilai lama tetap tercatat di riwayat.`
        : `Perbaiki nilai ujian tahfidz ${info}?\n\nUjian dibuka kembali sebagai draft atas nama Anda dengan rincian penilaian tetap. Ketuk "Lanjutkan" pada santri ini, perbaiki, lalu selesaikan lagi.`;
      if (!confirm(tanya)) return;
      b.disabled = true; b.textContent = hapus ? 'Menghapus…' : 'Membuka…';
      try {
        await ujPanggil(hapus ? 'tahfidz-hapus' : 'tahfidz-buka', { id: r.id });
        alert(hapus ? 'Nilai ujian dihapus. Santri kembali berstatus Belum diuji.' : 'Ujian dibuka kembali sebagai draft. Ketuk "Lanjutkan" pada santri ini untuk memperbaiki.');
        location.reload();
      } catch (err) { alert(err.message); b.disabled = false; b.textContent = label; }
    });
    return b;
  }
  function ujian() {
    if (APP !== 'mutabaah') return;
    const lihat = [...document.querySelectorAll('main button, button')].filter((b) => b.textContent.trim() === 'Lihat' && !b.dataset.ujCek);
    const kartu = [...document.querySelectorAll('b')].filter((x) => x.textContent.trim() === 'Ujian sudah final' && !x.dataset.ujCek);
    if (!lihat.length && !kartu.length) return;
    if (!ujFinal) { ujDaftar(); return; }
    for (const b of lihat) {
      const grup = b.parentElement, baris = grup?.parentElement;
      if (!grup || !baris || ![...grup.children].some((x) => x.textContent.trim() === 'Selesai')) continue;
      const p = baris.querySelectorAll('p');
      const nilaiEl = [...grup.children].find((x) => x.tagName === 'SPAN' && /^[\d,]+$/.test(x.textContent.trim()));
      const r = ujCari(p[0]?.textContent || '', p[1]?.textContent || '', nilaiEl ? nilaiEl.textContent.trim() : null);
      if (r) { b.dataset.ujCek = '1'; grup.insertBefore(ujTombol(r, true, 'buka'), b); grup.insertBefore(ujTombol(r, true, 'hapus'), b); continue; }
      // Belum dikenal: coba muat ulang daftar (maks. 3 kali per baris), lalu berhenti (mis. di luar hak pengguna).
      const coba = Number(b.dataset.ujCoba || 0);
      if (coba >= 3) { b.dataset.ujCek = '1'; continue; }
      if (Date.now() - ujMuat >= 8000) { b.dataset.ujCoba = String(coba + 1); ujDaftar(true); } else ujNanti();
    }
    for (const x of kartu) {
      const nama = document.querySelector('main h2, h2')?.textContent || '';
      const m = /nilai\s+([\d,]+)/.exec(x.parentElement?.textContent || '');
      const r = ujCari(nama, '', m ? m[1] : null);
      if (!r) { const coba = Number(x.dataset.ujCoba || 0); if (coba >= 3) x.dataset.ujCek = '1'; else if (Date.now() - ujMuat >= 8000) { x.dataset.ujCoba = String(coba + 1); ujDaftar(true); } else ujNanti(); continue; }
      x.dataset.ujCek = '1';
      if (r) { const w = document.createElement('div'); w.className = 'nuris-uj-wrap'; w.append(ujTombol(r, false, 'buka'), ujTombol(r, false, 'hapus')); x.parentElement.append(w); }
    }
  }

  /* ---------- Mutabaah › Setor Hadis (Arbain): saring santri menurut KAMAR (27 Nov 2026) ----------
     Daftar asli hanya per halaqah. Pilihan kamar menyetel "Semua di unit" lalu menyembunyikan santri di luar kamar. */
  let kmData = null, kmMuat = 0;
  let kmPilih = (() => { try { return sessionStorage.getItem('nuris_kamar_hadis') || ''; } catch { return ''; } })();
  const kmKunci = (nama, unit, tingkat) => `${String(nama).trim().toUpperCase()}|${String(unit).trim()} ${String(tingkat).trim()}`;
  function kmSetel(sel, v) { // ubah <select> React dengan benar
    const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(sel, v);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function hadis() {
    if (APP !== 'mutabaah') return;
    const hero = [...document.querySelectorAll('p')].find((p) => p.textContent.includes('42 hadis pilihan Imam An-Nawawi'));
    if (!hero) return;
    const cari = document.querySelector('input[placeholder="Cari santri"]');
    const bar = cari?.closest('div.flex.flex-wrap'); if (!bar) return;
    if (!kmData) { if (Date.now() - kmMuat > 30000 && ujToken()) { kmMuat = Date.now(); ujPanggil('tahfidz-kamar').then((r) => { kmData = r.kamars || []; jadwal(); }).catch(() => { kmData = []; }); } return; }
    if (!kmData.length) return;
    let sel = bar.querySelector('select.nuris-kamar-sel');
    if (!sel) {
      sel = document.createElement('select'); sel.className = 'nuris-kamar-sel'; sel.setAttribute('aria-label', 'Pilih kamar');
      const opt = (k) => `<option value="${k.id}">${k.nama} · ${k.unit} ${k.lingkungan === 'PUTRA' ? 'Putra' : 'Putri'} ${k.tingkat} (${k.santri.length})</option>`;
      const amp = kmData.filter((k) => k.ampu), lain = kmData.filter((k) => !k.ampu);
      sel.innerHTML = '<option value="">Semua kamar</option>' + (amp.length && lain.length ? `<optgroup label="Kamar ampuan saya">${amp.map(opt).join('')}</optgroup><optgroup label="Kamar lain di unit">${lain.map(opt).join('')}</optgroup>` : kmData.map(opt).join(''));
      if (kmData.some((k) => k.id === kmPilih)) sel.value = kmPilih; else kmPilih = '';
      sel.addEventListener('change', () => {
        kmPilih = sel.value; try { sessionStorage.setItem('nuris_kamar_hadis', kmPilih); } catch {}
        const hq = bar.querySelector('select[aria-label="Pilih halaqah"]');
        if (kmPilih && hq && hq.value !== 'semua') kmSetel(hq, 'semua');
        jadwal();
      });
      const hq = bar.querySelector('select[aria-label="Pilih halaqah"]');
      (hq || bar.firstElementChild).after(sel);
      if (kmPilih && hq && hq.value !== 'semua') kmSetel(hq, 'semua');
    }
    const k = kmData.find((x) => x.id === kmPilih);
    const ada = k ? new Set(k.santri.map((x) => kmKunci(x.n, x.u, x.t))) : null;
    const root = hero.closest('section')?.parentElement || document;
    // Kartu "Isi hafalan" & baris "Rekap per santri": baris kedua = "unit tingkat · halaqah".
    const items = [...root.querySelectorAll('button.min-w-0, tbody tr')];
    let tampil = 0;
    for (const el of items) {
      const p = el.querySelectorAll('p'); if (p.length < 2) continue;
      const info = p[1].textContent.split('·')[0].trim();
      const sembunyi = !!ada && !ada.has(`${p[0].textContent.trim().toUpperCase()}|${info}`);
      el.classList.toggle('nuris-km-sembunyi', sembunyi); if (!sembunyi) tampil++;
    }
    let ket = bar.parentElement.querySelector('.nuris-km-ket');
    if (k) {
      if (!ket) { ket = document.createElement('p'); ket.className = 'nuris-km-ket'; bar.after(ket); }
      const t = `Kamar ${k.nama} · wali kamar ${k.wali || '–'} · ${tampil} dari ${k.santri.length} santri tampil${tampil < k.santri.length ? ' (sisanya di luar unit/halaqah yang dapat Anda buka)' : ''}.`;
      if (ket.textContent !== t) ket.textContent = t;
    } else ket?.remove();
  }

  function sapu() {
    antre = 0;
    favicon();
    for (const img of document.querySelectorAll('img')) logo(img);
    if (APP !== 'beranda') for (const el of document.querySelectorAll(KE_PORTAL)) tandaiLogo(el);
    tempel(); simka(); ujian(); hadis();
  }
  const jadwal = () => { if (!antre) antre = requestAnimationFrame(sapu); };
  function mulai() {
    muatApps(); if (APP !== 'beranda') muatAkses();
    sapu();
    new MutationObserver(jadwal).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) mulai(); else document.addEventListener('DOMContentLoaded', mulai, { once: true });
})();
