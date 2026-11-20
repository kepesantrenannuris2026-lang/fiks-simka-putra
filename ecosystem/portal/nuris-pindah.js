// Pemberitahuan pindah alamat: aplikasi yang dibuka lewat Netlify diarahkan ke alamat utama Cloudflare.
// Hanya aktif di *.netlify.app dan hanya di jendela teratas (tidak dobel di dalam bingkai portal).
// Tombol "Pindah sekarang" memindahkan sesi lewat kode sekali pakai (handoff, berlaku 90 detik) sehingga tidak perlu masuk ulang.
(function () {
  'use strict';
  if (!/\.netlify\.app$/i.test(location.hostname) || window.top !== window) return;
  var CF = 'https://kepesantrenan-nuris.kepesantrenannuris.workers.dev';
  var API = 'https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan/handoff';
  var APPS = ['mutabaah', 'ujian-praktik', 'yaumiyyah', 'rapor-pesantren', 'simka', 'simka-putri', 'infrastruktur'];

  function appSekarang() {
    var seg = location.pathname.split('/')[1] || '';
    if (APPS.indexOf(seg) >= 0) return seg;
    var h = location.hash.slice(1);
    return APPS.indexOf(h) >= 0 ? h : 'beranda';
  }
  function tujuanTanpaSesi() {
    // Halaman yang sama di alamat baru.
    return CF + location.pathname + location.search + location.hash;
  }
  function pindah(btn) {
    btn.disabled = true; btn.textContent = 'Memindahkan…';
    var token = ''; try { token = localStorage.getItem('mut_token') || ''; } catch (e) {}
    if (!token) { location.href = tujuanTanpaSesi(); return; }
    var selesai = false;
    var batas = setTimeout(function () { if (!selesai) { selesai = true; location.href = tujuanTanpaSesi(); } }, 8000);
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: '{}' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (selesai) return; selesai = true; clearTimeout(batas);
        if (!(j && j.ok && j.code)) { location.href = tujuanTanpaSesi(); return; }
        // Sesi berlanjut di alamat baru; salinan di alamat lama dihapus agar perangkat bersama tetap aman.
        try { localStorage.removeItem('mut_token'); localStorage.removeItem('mut_user'); } catch (e) {}
        location.href = CF + '/#transfer=' + encodeURIComponent(j.code) + '&app=' + encodeURIComponent(appSekarang());
      })
      .catch(function () { if (!selesai) { selesai = true; clearTimeout(batas); location.href = tujuanTanpaSesi(); } });
  }

  function tampil() {
    if (document.getElementById('nuris-pindah')) return;
    var st = document.createElement('style');
    st.textContent = '#nuris-pindah{position:fixed;left:50%;bottom:calc(18px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483646;width:min(520px,calc(100vw - 24px));background:#0d4a28;color:#fff;border-radius:18px;padding:16px 18px;box-shadow:0 14px 40px #0d4a2855;font:500 14px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;animation:np-in .35s ease-out}'
      + '#nuris-pindah strong{display:block;font-size:15px;margin-bottom:3px}#nuris-pindah p{margin:0 0 12px;color:#ffffffd9}'
      + '#nuris-pindah .np-a{display:flex;gap:8px;flex-wrap:wrap}#nuris-pindah button{font:inherit;font-weight:700;border-radius:11px;padding:9px 14px;cursor:pointer;border:0}'
      + '#nuris-pindah .np-go{background:#fff;color:#0d4a28}#nuris-pindah .np-x{background:transparent;color:#fff;border:1px solid #ffffff59}'
      + '#nuris-pindah button:focus-visible{outline:3px solid #9be3b4;outline-offset:2px}#nuris-pindah button:disabled{opacity:.7;cursor:wait}'
      + '@keyframes np-in{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}@media (prefers-reduced-motion:reduce){#nuris-pindah{animation:none}}';
    document.head.appendChild(st);
    var el = document.createElement('div'); el.id = 'nuris-pindah'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', 'np-judul');
    el.innerHTML = '<strong id="np-judul">Kepesantrenan Nuris pindah alamat</strong>'
      + '<p>Mulai sekarang buka aplikasi di <b>kepesantrenan-nuris.kepesantrenannuris.workers.dev</b>. Data dan akun Anda tetap sama, dan Anda tidak perlu masuk ulang. Setelah pindah, pasang ulang aplikasi dari alamat baru bila sebelumnya dipasang di layar utama.</p>'
      + '<div class="np-a"><button type="button" class="np-go">Pindah sekarang →</button><button type="button" class="np-x">Nanti</button></div>';
    el.querySelector('.np-go').addEventListener('click', function () { pindah(this); });
    el.querySelector('.np-x').addEventListener('click', function () { el.remove(); });
    document.body.appendChild(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tampil); else tampil();
})();
