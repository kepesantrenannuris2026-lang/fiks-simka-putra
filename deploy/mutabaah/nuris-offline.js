// Antrean simpan offline Mutabaah (IndexedDB).
// - Hanya "Simpan setoran pekanan" (saveSetoranBatch) yang diantrekan: penyimpanannya idempoten (upsert per santri/pekan),
//   sehingga aman dikirim ulang.
// - Diantrekan hanya bila permintaan GAGAL KARENA JARINGAN (tidak ada sinyal). Kesalahan dari server tidak diantrekan.
// - Isian dikirim otomatis saat sinyal kembali, berurutan, hanya atas nama akun yang mengisinya. Isian lebih dari 3 hari
//   tidak dikirim otomatis (agar tidak menimpa perbaikan yang dibuat dari perangkat lain); musyrif memilih Kirim atau Buang.
// - Tidak ada data santri lain yang disimpan permanen. Antrean dihapus saat keluar akun dari Mutabaah atau saat akun lain masuk di perangkat ini.
(function () {
  if (window.__nurisOffline || !window.indexedDB) return;
  var URL_RE = /\/functions\/v1\/(api|kepesantrenan\/mutabaah)(\?|$)/, FN = { saveSetoranBatch: 1 };
  var BASI = 3 * 24 * 3600 * 1000, DBN = 'nuris-offline', ST = 'antrean';
  var orig = window.fetch.bind(window), sending = false, lastUrl = '';
  function user() { try { return String(JSON.parse(localStorage.getItem('mut_user') || '{}').username || ''); } catch (e) { return ''; } }
  function token() { return localStorage.getItem('mut_token') || ''; }
  function db() {
    return new Promise(function (ok, no) { var r = indexedDB.open(DBN, 1); r.onupgradeneeded = function () { r.result.createObjectStore(ST, { keyPath: 'id', autoIncrement: true }); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; });
  }
  function tx(mode, f) { return db().then(function (d) { return new Promise(function (ok, no) { var t = d.transaction(ST, mode), s = t.objectStore(ST), out = f(s); t.oncomplete = function () { d.close(); ok(out && out.result !== undefined ? out.result : out); }; t.onerror = function () { d.close(); no(t.error); }; }); }); }
  var all = function () { return tx('readonly', function (s) { return s.getAll(); }); };
  var add = function (e) { return tx('readwrite', function (s) { return s.add(e); }); };
  var del = function (id) { return tx('readwrite', function (s) { return s.delete(id); }); };
  var upd = function (e) { return tx('readwrite', function (s) { return s.put(e); }); };
  function clearAll() { return tx('readwrite', function (s) { return s.clear(); }).then(banner, function () {}); }

  // ---- tampilan ----
  var el = null;
  function banner() {
    return all().then(function (list) {
      var u = user(); list = list.filter(function (e) { return e.user === u; });
      if (!list.length) { if (el) { el.remove(); el = null; } return; }
      if (!el) { el = document.createElement('div'); el.setAttribute('role', 'status'); el.style.cssText = 'position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147483000;max-width:min(560px,calc(100vw - 24px));background:#172c23;color:#fff;border-radius:14px;padding:10px 14px;font:500 13px/1.4 system-ui,sans-serif;box-shadow:0 8px 28px #0003;display:flex;gap:10px;align-items:center;flex-wrap:wrap'; document.body.appendChild(el); }
      var n = list.reduce(function (a, e) { return a + e.n; }, 0), basi = list.filter(function (e) { return Date.now() - e.waktu > BASI || e.gagal; });
      var txt = n + ' isian setoran tersimpan di perangkat ini dan belum terkirim. ' + (basi.length ? 'Sebagian sudah lebih dari 3 hari atau gagal dikirim.' : (navigator.onLine ? 'Sedang mengirim…' : 'Akan dikirim otomatis saat ada sinyal. Jangan keluar akun dulu.'));
      el.innerHTML = ''; var s = document.createElement('span'); s.textContent = txt; s.style.flex = '1 1 220px'; el.appendChild(s);
      var b1 = document.createElement('button'); b1.textContent = 'Kirim sekarang'; b1.style.cssText = 'font:inherit;font-weight:700;border:0;border-radius:9px;padding:6px 10px;background:#fff;color:#0d4a28;cursor:pointer';
      b1.onclick = function () { flush(true); }; el.appendChild(b1);
      if (basi.length) { var b2 = document.createElement('button'); b2.textContent = 'Buang'; b2.style.cssText = 'font:inherit;border:1px solid #fff6;border-radius:9px;padding:6px 10px;background:transparent;color:#fff;cursor:pointer';
        b2.onclick = function () { if (confirm('Buang ' + basi.length + ' simpanan yang belum terkirim? Isian itu tidak akan masuk ke server.')) Promise.all(basi.map(function (e) { return del(e.id); })).then(banner); }; el.appendChild(b2); }
    }).catch(function () {});
  }

  // ---- kirim ulang ----
  function flush(paksa) {
    if (sending || !navigator.onLine) return Promise.resolve();
    var u = user(), t = token(); if (!u || !t) return Promise.resolve();
    sending = true;
    return all().then(function (list) {
      list = list.filter(function (e) { return e.user === u && (paksa || (!e.gagal && Date.now() - e.waktu <= BASI)); }).sort(function (a, b) { return a.id - b.id; });
      var chain = Promise.resolve(true);
      list.forEach(function (e) {
        chain = chain.then(function (lanjut) {
          if (!lanjut) return false;
          return orig(e.url || lastUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, 'x-region': 'ap-southeast-1' }, body: e.body })
            .then(function (r) { return r.json().catch(function () { return {}; }); })
            .then(function (j) {
              if (j.ok) { try { window.__nurisCache && window.__nurisCache.clear(); } catch (x) {} return del(e.id).then(function () { return true; }); }
              if (/Sesi berakhir/i.test(j.error || '')) return false; // tunggu masuk kembali
              e.coba = (e.coba || 0) + 1; e.error = String(j.error || 'gagal'); if (e.coba >= 5) e.gagal = true;
              return upd(e).then(function () { return true; });
            }, function () { return false; }); // jaringan putus lagi: berhenti, coba nanti
        });
      });
      return chain;
    }).catch(function () {}).then(function () { sending = false; return banner(); });
  }

  // ---- penyadap fetch ----
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '', req = null;
    try { if (URL_RE.test(url) && init && typeof init.body === 'string') { req = JSON.parse(init.body); lastUrl = url; } } catch (e) { req = null; }
    if (req && req.fn === 'logout') clearAll();
    if (!req || !FN[req.fn]) return orig(input, init);
    return orig(input, init).catch(function (err) {
      var u = user();
      if (!u || (navigator.onLine && !(err instanceof TypeError))) throw err; // bukan masalah jaringan
      var args = req.args || [], items = Array.isArray(args[1]) ? args[1] : [];
      return add({ user: u, url: url, body: init.body, waktu: Date.now(), n: items.length, periode: args[0] || null }).then(function () {
        banner();
        return new Response(JSON.stringify({ ok: true, data: { ok: true, offline: true, count: items.length, periode: args[0] || {} } }), { status: 200, headers: { 'Content-Type': 'application/json', 'X-Nuris-Offline': 'antre' } });
      }, function () { throw err; });
    });
  };

  // Keluar akun dari Mutabaah: antrean dibuang. Berganti akun: antrean akun lain dibuang (perangkat bisa dipakai bergantian).
  // Sesi berakhir tanpa keluar akun: antrean disimpan dan dikirim setelah akun yang sama masuk kembali.
  function rapikan() { var u = user(); if (!u) return banner(); return all().then(function (l) { return Promise.all(l.filter(function (e) { return e.user !== u; }).map(function (e) { return del(e.id); })); }).then(banner, function () {}); }
  window.addEventListener('storage', function (e) { if (e.key === 'mut_token' || e.key === 'mut_user') rapikan(); });
  window.addEventListener('online', function () { flush(false); });
  window.addEventListener('offline', banner);
  setInterval(function () { if (document.visibilityState === 'visible') flush(false); }, 60000);
  function mulai() { rapikan().then(function () { flush(false); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai); else mulai();
  window.__nurisOffline = { flush: flush, list: all, clear: clearAll };
})();
