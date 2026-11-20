// Cache terkontrol untuk panggilan API Mutabaah di browser (hemat invocations Edge Function & trafik Supabase).
// - Hanya fungsi BACA yang di-cache, dengan umur singkat per jenis (dashboard 2 menit, daftar halaqah 5 menit, dst.).
// - Permintaan identik yang berjalan bersamaan digabung menjadi satu.
// - Setiap fungsi TULIS (simpan setoran, nilai, akun, dsb.) mengosongkan seluruh cache, sehingga data tidak pernah basi
//   setelah ada perubahan dari tab ini. Status sinkron & login tidak pernah di-cache.
// - Cache per tab (memori + sessionStorage), dipisah per sesi login; hilang saat tab/sesi ditutup.
(function () {
  if (window.__nurisCache) return;
  var TTL = { getDashboard: 120, getNotifikasi: 120, getMonitoringPekan: 120, getPekanRiwayat: 300, getHalaqahList: 300, me: 300, getMusyrifNames: 600,
    getKelola: 60, getRekap: 60, getSertifikasi: 60, getArbain: 60, getUjianDaftar: 60, getRaporHalaqah: 60, getPenilaianTajwid: 60, getHM: 60, getHMRiwayat: 60 };
  var READ = /^(get|hm|me$)/; // fungsi baca lain (tanpa TTL) tidak di-cache tetapi juga tidak mengosongkan cache
  var URL_RE = /\/functions\/v1\/(api|kepesantrenan\/mutabaah)(\?|$)/;
  var mem = new Map(), inflight = new Map(), hit = 0, miss = 0;
  var SS = 'nuris-cache:';
  function hdr(h, k) { if (!h) return ''; if (typeof h.get === 'function') return h.get(k) || ''; for (var x in h) if (x.toLowerCase() === k) return h[x]; return ''; }
  function clear() { mem.clear(); try { for (var i = sessionStorage.length - 1; i >= 0; i--) { var k = sessionStorage.key(i); if (k && k.indexOf(SS) === 0) sessionStorage.removeItem(k); } } catch (e) {} }
  function get(key) {
    var e = mem.get(key);
    if (!e) { try { var s = sessionStorage.getItem(SS + key); if (s) { e = JSON.parse(s); mem.set(key, e); } } catch (x) {} }
    if (e && e.exp > Date.now()) return e.body;
    if (e) { mem.delete(key); try { sessionStorage.removeItem(SS + key); } catch (x) {} }
    return null;
  }
  function put(key, body, ttl) {
    var e = { exp: Date.now() + ttl * 1000, body: body }; mem.set(key, e);
    if (body.length < 400000) try { sessionStorage.setItem(SS + key, JSON.stringify(e)); } catch (x) {}
  }
  function reply(body) { return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json', 'X-Nuris-Cache': 'hit' } }); }
  var orig = window.fetch.bind(window);
  window.fetch = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = (init && init.method) || (input && input.method) || 'GET';
      if (!URL_RE.test(url) || method.toUpperCase() !== 'POST' || !init || typeof init.body !== 'string') return orig(input, init);
      var req = JSON.parse(init.body), fn = String(req && req.fn || '');
      if (!fn || fn === 'login' || fn === 'logout' || fn === 'getSyncStatus') { if (fn === 'login' || fn === 'logout') clear(); return orig(input, init); }
      var ttl = TTL[fn];
      if (!ttl) {
        if (READ.test(fn)) return orig(input, init);
        // Fungsi tulis: kosongkan cache setelah selesai (berhasil atau tidak).
        return orig(input, init).then(function (r) { clear(); return r; }, function (e) { clear(); throw e; });
      }
      var key = (hdr(init.headers, 'authorization') || '').slice(-24) + '|' + fn + '|' + JSON.stringify(req.args || []);
      var cached = get(key);
      if (cached) { hit++; return Promise.resolve(reply(cached)); }
      if (inflight.has(key)) { hit++; return inflight.get(key).then(function (b) { return b == null ? orig(input, init) : reply(b); }); }
      miss++;
      var res = orig(input, init);
      var p = res.then(function (r) {
        if (!r.ok) return null;
        return r.clone().text().then(function (b) { try { if (JSON.parse(b).ok) { put(key, b, ttl); return b; } } catch (e) {} return null; });
      }).catch(function () { return null; }).finally(function () { inflight.delete(key); });
      inflight.set(key, p);
      return res; // pemanggil pertama selalu menerima respons asli
    } catch (e) { return orig(input, init); }
  };
  window.__nurisCache = { clear: clear, stats: function () { return { hit: hit, miss: miss, entri: mem.size }; } };
})();
