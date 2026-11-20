// Service worker aplikasi Kepesantrenan Nuris (cakupan "/").
// Sengaja minimal: semua permintaan tetap ke jaringan (data selalu terbaru); hanya bila offline, halaman navigasi
// menampilkan pemberitahuan. Data API (Supabase, lintas origin) tidak pernah disimpan. Mutabaah memakai service
// worker-nya sendiri di /mutabaah/ (cakupan lebih spesifik), jadi tidak terpengaruh.
const VERSI = 'nuris-20261120';
const OFFLINE = '/offline.html';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSI).then((c) => c.addAll([OFFLINE, '/logo.svg', '/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('nuris-') && k !== VERSI).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || r.mode !== 'navigate' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(fetch(r).catch(() => caches.match(OFFLINE)));
});
