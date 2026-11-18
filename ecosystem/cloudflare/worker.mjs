// Kepesantrenan Nuris — Worker di depan aset statis (aset selalu dilayani lebih dulu).
// Worker hanya berjalan bila path tidak ada sebagai aset: fallback rute SPA modul.
// Tidak ada data/kunci di sini; respons API tidak pernah di-cache.
const sec = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' };
const SPA = ['simka', 'simka-putri', 'yaumiyyah', 'ujian-praktik', 'rapor-pesantren'];
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD', ...sec } });
    const module = SPA.find((id) => p === `/${id}` || p.startsWith(`/${id}/`));
    if (module && !p.split('/').at(-1).includes('.')) {
      url.pathname = `/${module}/`;
      return env.ASSETS.fetch(new Request(url, request));
    }
    return new Response('Halaman tidak ditemukan', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', ...sec } });
  },
};
