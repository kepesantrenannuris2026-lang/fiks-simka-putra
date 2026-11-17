// Service worker minimal agar Mutabaah bisa dipasang sebagai aplikasi.
// Tidak menyimpan cache: setiap halaman & data selalu diambil langsung dari server (versi terbaru).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Mutabaah</title><body style='font-family:system-ui;padding:32px;text-align:center;color:#082E1A'><h2>Tidak ada koneksi</h2><p>Periksa internet, lalu muat ulang.</p></body>",
    { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
