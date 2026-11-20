// Pasang Beranda Kepesantrenan sebagai aplikasi (PWA). Semua aplikasi (Mutabaah, Yaumiyyah, Ujian Praktik, Rapor Pesantren,
// SIMKA Putra & Putri) berada dalam cakupan "/", sehingga dibuka di dalam jendela aplikasi yang sama.
(function () {
  if (window.__nurisInstall) return; window.__nurisInstall = 1;
  var standalone = matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;
  if ('serviceWorker' in navigator) addEventListener('load', function () { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {}); });
  if (standalone) { document.documentElement.classList.add('nuris-app'); return; }

  var ua = navigator.userAgent, ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var safari = ios && !/crios|fxios|edgios/i.test(ua);
  var deferred = null;
  var css = '.ni-btn{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:12px;border:1px solid #cfe3d6;background:#fff;color:#0d4a28;font:700 13.5px/1 inherit;cursor:pointer;white-space:nowrap}' +
    '.ni-btn:hover{border-color:#17873f}.ni-btn svg{flex:none}.ni-login{width:100%;justify-content:center;margin-top:10px;height:44px}' +
    '.ni-sheet{position:fixed;inset:0;z-index:1000;display:grid;place-items:end center;background:#0b1f1466;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))}' +
    '.ni-card{width:min(440px,100%);background:#fff;color:#122219;border-radius:22px;padding:20px;box-shadow:0 24px 60px -20px #0008;font:15px/1.5 inherit}' +
    '.ni-card h2{margin:0 0 6px;font-size:18px;color:#082e1a}.ni-card p{margin:0 0 12px;color:#5e6f65}.ni-card ol{margin:0 0 16px;padding-left:20px}.ni-card li{margin:6px 0}' +
    '.ni-card b{color:#0d4a28}.ni-card button{width:100%;height:44px;border:0;border-radius:14px;background:#0d4a28;color:#fff;font:700 15px inherit;cursor:pointer}' +
    '@media (max-width:640px){.profile .ni-btn span{display:none}.profile .ni-btn{padding:0 10px}}';
  var ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';

  function sheet() {
    var d = document.createElement('div'); d.className = 'ni-sheet'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'ni-title');
    d.innerHTML = '<div class="ni-card"><h2 id="ni-title">Pasang di iPhone / iPad</h2><p>Kepesantrenan Nuris akan tampil sebagai aplikasi di layar utama, dan semua aplikasinya dibuka di dalamnya.</p>' +
      '<ol><li>Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas) di Safari.</li><li>Pilih <b>Tambah ke Layar Utama</b>.</li><li>Ketuk <b>Tambah</b>, lalu buka ikon <b>Kepesantrenan</b>.</li></ol>' +
      '<button type="button">Mengerti</button></div>';
    function tutup() { d.remove(); }
    d.addEventListener('click', function (e) { if (e.target === d || e.target.tagName === 'BUTTON') tutup(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') tutup(); });
    document.body.appendChild(d); d.querySelector('button').focus();
  }
  async function pasang() {
    if (deferred) { deferred.prompt(); var r = await deferred.userChoice; deferred = null; if (r.outcome === 'accepted') hapus(); return; }
    if (safari) sheet();
  }
  function buat(cls, label) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'ni-btn ' + cls; b.innerHTML = ICON + '<span>' + label + '</span>';
    b.title = 'Pasang Kepesantrenan Nuris sebagai aplikasi'; b.addEventListener('click', pasang); return b;
  }
  function tampil() {
    if (!deferred && !safari) return;
    if (!document.getElementById('ni-style')) { var s = document.createElement('style'); s.id = 'ni-style'; s.textContent = css; document.head.appendChild(s); }
    var logout = document.getElementById('logout');
    if (logout && !document.getElementById('ni-top')) { var b = buat('', 'Pasang aplikasi'); b.id = 'ni-top'; logout.parentNode.insertBefore(b, logout); }
    var form = document.getElementById('login-form');
    if (form && !document.getElementById('ni-login')) { var c = buat('ni-login', 'Pasang sebagai aplikasi'); c.id = 'ni-login'; var sub = document.getElementById('submit'); if (sub) sub.insertAdjacentElement('afterend', c); }
  }
  function hapus() { ['ni-top', 'ni-login'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); }); }
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; tampil(); });
  addEventListener('appinstalled', function () { deferred = null; hapus(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tampil); else tampil();
})();
