// Kepesantrenan Nuris — Worker di depan aset statis.
// Aset lama tetap dilayani apa adanya. Worker hanya menangani:
//  - /rapor-pesantren/* (subapp Rapor Pesantren, disertakan sebagai modul teks),
//  - /nuris-glass.js|css (Liquid Glass v2), /apps.js (menambah kartu Rapor Pesantren ke registri),
//  - fallback rute SPA modul.
// Tidak ada data/kunci di sini; respons API tidak pernah di-cache.
import RAPOR_HTML from './rapor-index.html.txt';
import RAPOR_JS from './rapor-app.js.txt';
import RAPOR_CSS from './rapor-app.css.txt';
import GLASS_JS from './nuris-glass.js.txt';
import GLASS_CSS from './nuris-glass.css.txt';

const APP_ENTRY = {
  id: 'rapor-pesantren', name: 'Rapor Pesantren', short: 'Rapor Pesantren', path: '/rapor-pesantren/', requires: 'mutabaah', nav: false, icon: 'award',
  description: 'Rekap nilai ibadah, akhlak, kajian kitab, praktik ibadah, hadis arbain, dan pidato per kamar. Pratinjau dan ubah rapor, lalu cetak atau unduh PDF.',
  label: 'Rapor kepesantrenan',
};
const APPS_ADDON = `\n;(function(){var a=window.NURIS_APPS;if(!Array.isArray(a)||a.some(function(x){return x.id==='rapor-pesantren'}))return;var i=a.findIndex(function(x){return x.id==='yaumiyyah'});a.splice(i<0?a.length:i+1,0,${JSON.stringify(APP_ENTRY)});})();\n`;

const sec = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' };
const file = (body, type, cache = 'no-cache', status = 200) => new Response(body, { status, headers: { 'Content-Type': type, 'Cache-Control': cache, ...sec } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    if (p === '/rapor-pesantren') return Response.redirect(url.origin + '/rapor-pesantren/' + url.search + url.hash, 301);
    if (p === '/rapor-pesantren/' || p === '/rapor-pesantren/index.html') return file(RAPOR_HTML, 'text/html; charset=utf-8');
    if (p === '/rapor-pesantren/app.js') return file(RAPOR_JS, 'text/javascript; charset=utf-8');
    if (p === '/rapor-pesantren/app.css') return file(RAPOR_CSS, 'text/css; charset=utf-8');
    if (p === '/rapor-pesantren/glass.js' || p === '/nuris-glass.js') return file(GLASS_JS, 'text/javascript; charset=utf-8');
    if (p === '/rapor-pesantren/glass.css' || p === '/nuris-glass.css') return file(GLASS_CSS, 'text/css; charset=utf-8');
    if (p === '/apps.js') {
      const r = await env.ASSETS.fetch(request);
      if (!r.ok) return r;
      return file((await r.text()) + APPS_ADDON, 'text/javascript; charset=utf-8');
    }
    if (p.startsWith('/rapor-pesantren/')) return file('Halaman tidak ditemukan', 'text/plain; charset=utf-8', 'no-cache', 404);
    const module = ['simka', 'simka-putri', 'yaumiyyah', 'ujian-praktik'].find((id) => p === `/${id}` || p.startsWith(`/${id}/`));
    if (module && !p.split('/').at(-1).includes('.')) {
      url.pathname = `/${module}/index.html`;
      return env.ASSETS.fetch(new Request(url, request));
    }
    return new Response('Halaman tidak ditemukan', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...sec } });
  },
};
