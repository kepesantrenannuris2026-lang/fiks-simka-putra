// Rakit paket Cloudflare Kepesantrenan Nuris yang bersih (perbaikan 8 November 2026).
// - Portal + SIMKA Putra/Putri + Yaumiyyah dibangun dari sumber di repo ini.
// - Mutabaah Tahfidz dibangun dari kode sumber aslinya (Next.js, basePath /mutabaah) — BUKAN salinan bundle Netlify yang ditambal.
//   Ujian Semester & Rapor Al-Qur'an semester (F5) sudah menjadi fitur bawaan Mutabaah, jadi tidak ada lagi iframe/tambalan
//   (mutabaah-patch.js, liquid-glass.js, nuris-motion.js, route-semester-*.mjs, /rapor/ terpisah).
// Pemakaian: MUTABAAH_OUT=/path/ke/mutabaah/out node ecosystem/cloudflare/rakit-perbaikan.mjs
// Netlify tidak disentuh: skrip ini hanya menulis ke dist-cloudflare.
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { Resvg } from '@resvg/resvg-js';
const root = process.cwd(), out = path.join(root, 'dist-cloudflare'), cf = 'ecosystem/cloudflare';
const mut = process.env.MUTABAAH_OUT; if (!mut || !fs.existsSync(path.join(mut, 'index.html'))) throw Error('Set MUTABAAH_OUT ke folder hasil build Mutabaah (NEXT_PUBLIC_BASE_PATH=/mutabaah).');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const vite = (env) => { const r = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: { ...process.env, VITE_KEPESANTRENAN_PORTAL: 'true', VITE_APP_ENVIRONMENT: env } }); if (r.status !== 0) process.exit(r.status || 1); };
vite('PUTRA'); fs.cpSync('dist', path.join(out, 'simka'), { recursive: true });
vite('PUTRI'); fs.cpSync('dist', path.join(out, 'simka-putri'), { recursive: true });
fs.mkdirSync(path.join(out, 'yaumiyyah'), { recursive: true }); fs.copyFileSync(path.join(out, 'simka/index.html'), path.join(out, 'yaumiyyah/index.html'));
fs.cpSync('public', out, { recursive: true });
fs.cpSync('ecosystem/portal', out, { recursive: true });
// Portal: versi Git terakhir yang terverifikasi + registri aplikasi + motion ringan.
for (const [name, src] of Object.entries({ 'index.html': 'baseline-index.html', 'portal.css': 'baseline-portal.css', 'portal.js': 'exam-portal.js', 'nuris-appearance.js': 'baseline-nuris-appearance.js', 'nuris-appearance.css': 'baseline-nuris-appearance.css' })) fs.copyFileSync(path.join(cf, src), path.join(out, name));
fs.copyFileSync(path.join(cf, 'portal-apps.js'), path.join(out, 'apps.js'));
fs.copyFileSync(path.join(cf, 'portal-motion.css'), path.join(out, 'portal-motion.css'));
let portalJs = fs.readFileSync(path.join(out, 'portal.js'), 'utf8');
// Aplikasi turunan (Ujian, Rapor) memakai hak akses Mutabaah.
portalJs = portalJs.replaceAll('session.apps[app.id]', 'session.apps[app.requires||app.id]');
if (!portalJs.includes('session.apps[app.requires||app.id]')) throw Error('portal.js berubah; periksa pemetaan hak akses');
// Ikon tambahan, kartu turunan tidak masuk menu navigasi, dan pembukaan fitur Mutabaah tanpa memuat ulang.
const ganti = (from, to) => { if (!portalJs.includes(from)) throw Error('portal.js berubah: ' + from.slice(0, 40)); portalJs = portalJs.replace(from, to); };
ganti("const icons={home:", "const icons={award:'<circle cx=\"12\" cy=\"9\" r=\"6\"/><path d=\"m8.5 14 -1.5 7 5-3 5 3-1.5-7\"/>',check:'<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2\"/><path d=\"m8 12 3 3 5-6\"/>',calendar:'<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 10h18M8 3v4m8-4v4\"/>',home:");
ganti("for(const app of window.NURIS_APPS)nav.append(navLink(app.id,app.short,app.icon));", "for(const app of window.NURIS_APPS.filter(a=>a.nav!==false))nav.append(navLink(app.id,app.short,app.icon));");
ganti("const rawId=location.hash.slice(1)||desired,legacyExam=rawId==='ujian-tahfidz',id=legacyExam?'mutabaah':rawId;", "const rawId=location.hash.slice(1)||desired,sub=window.NURIS_APPS.find(a=>a.id===rawId&&a.requires==='mutabaah'),legacyExam=rawId==='ujian-tahfidz'||!!sub,subPath=sub?sub.path:'/mutabaah/?tool=ujian',subTool=new URL(subPath,location.origin).searchParams.get('tool'),id=legacyExam?'mutabaah':rawId;");
ganti("if(legacyExam&&existingFrame)existingFrame.src='/mutabaah/?tool=ujian';", "if(legacyExam&&existingFrame)existingFrame.contentWindow.postMessage({type:'nuris:tool',tool:subTool},location.origin);");
ganti("f.src=legacyExam?'/mutabaah/?tool=ujian':app.path;", "f.src=legacyExam?subPath:app.path;");
fs.writeFileSync(path.join(out, 'portal.js'), portalJs);
let portalHtml = fs.readFileSync(path.join(out, 'index.html'), 'utf8').replace('<link rel="stylesheet" href="/portal.css?v=20261030b">', '<link rel="stylesheet" href="/portal.css?v=20261108"><link rel="stylesheet" href="/portal-motion.css?v=20261108b">').replaceAll('portal.js?v=20261030b', 'portal.js?v=20261108').replace('src="/apps.js"', 'src="/apps.js?v=20261108"');
fs.writeFileSync(path.join(out, 'index.html'), portalHtml);
// Mutabaah: hasil build asli di /mutabaah/ (aset di /mutabaah/_next).
fs.cpSync(mut, path.join(out, 'mutabaah'), { recursive: true });
// Alamat lama tetap berfungsi: diarahkan ke fitur bawaan Mutabaah.
const alih = (dir, to) => { fs.mkdirSync(path.join(out, dir), { recursive: true }); fs.writeFileSync(path.join(out, dir, 'index.html'), `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Mengalihkan…</title><script>location.replace(${JSON.stringify(to)})</script><meta http-equiv="refresh" content="0;url=${to}"><a href="${to}">Lanjutkan</a>`); };
alih('rapor', '/mutabaah/?tool=raport'); alih('ujian-tahfidz', '/mutabaah/?tool=ujian'); alih('mutabaah/ujian', '/mutabaah/?tool=ujian'); alih('mutabaah/rapor', '/mutabaah/?tool=raport');
// Identitas & ikon bersama
const logo = fs.readFileSync('ecosystem/portal/logo.svg');
for (const size of [192, 512]) { fs.mkdirSync(path.join(out, 'icons'), { recursive: true }); fs.writeFileSync(path.join(out, `icon-${size}.png`), new Resvg(logo, { fitTo: { mode: 'width', value: size } }).render().asPng()); }
for (const target of [out, path.join(out, 'simka'), path.join(out, 'simka-putri')]) {
  fs.copyFileSync('public/logo-nuris.svg', path.join(target, 'favicon-simka.svg')); fs.copyFileSync('public/logo-nuris.svg', path.join(target, 'favicon.svg'));
  for (const [size, file] of [[16, 'favicon-simka-16x16.png'], [32, 'favicon-simka-32x32.png'], [180, 'apple-touch-icon.png']]) fs.writeFileSync(path.join(target, file), new Resvg(logo, { fitTo: { mode: 'width', value: size } }).render().asPng());
}
fs.copyFileSync('public/logo-nuris.svg', path.join(out, 'nuris-mark.svg')); fs.copyFileSync('public/logo-nuris.png', path.join(out, 'logo-mark.png'));
// Tombol tema bersama hanya di portal & Yaumiyyah (di header-nya sendiri). SIMKA sudah punya ThemeSwitcher sendiri yang membaca
// preferensi 'nuris-appearance', jadi tidak disuntik tombol kedua (dulu menumpuk di sidebar/header SIMKA).
for (const f of ['simka/index.html', 'simka-putri/index.html', 'yaumiyyah/index.html']) {
  const p = path.join(out, f); let s = fs.readFileSync(p, 'utf8');
  if (f.startsWith('yaumiyyah') && !s.includes('/nuris-appearance.js')) s = s.replace('</head>', '<link rel="stylesheet" href="/nuris-appearance.css"><script src="/nuris-appearance.js"></script></head>');
  s = s.replace('</head>', '<link rel="stylesheet" href="/portal-motion.css?v=20261108b"></head>');
  fs.writeFileSync(p, s);
}
// Kode API Mutabaah terenkripsi (dimuat fungsi Supabase "api" saat menyala; tanpa egress Supabase). KODE_API=/path/kode-<id>.txt
if (process.env.KODE_API) { fs.mkdirSync(path.join(out, '_k'), { recursive: true }); fs.copyFileSync(process.env.KODE_API, path.join(out, '_k', path.basename(process.env.KODE_API).replace(/^kode-/, ''))); }
fs.rmSync(path.join(out, '_redirects'), { force: true });
// Header cache: aset ber-hash disimpan lama, HTML & skrip identitas selalu divalidasi ulang. Respons API tidak pernah di-cache.
fs.writeFileSync(path.join(out, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: same-origin
/index.html
  Cache-Control: no-cache
/apps.js
  Cache-Control: no-cache
/portal.js
  Cache-Control: no-cache
/portal.css
  Cache-Control: no-cache
/portal-motion.css
  Cache-Control: no-cache
/nuris-appearance.js
  Cache-Control: no-cache
/nuris-appearance.css
  Cache-Control: no-cache
/mutabaah/*
  Cache-Control: no-cache
/mutabaah/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
/simka/*
  Cache-Control: no-cache
/simka/assets/*
  Cache-Control: public, max-age=31536000, immutable
/simka-putri/*
  Cache-Control: no-cache
/simka-putri/assets/*
  Cache-Control: public, max-age=31536000, immutable
/yaumiyyah/*
  Cache-Control: no-cache
/fonts/*
  Cache-Control: public, max-age=604800
`);
// Pastikan tidak ada sisa tambalan lama di paket.
for (const bad of ['mutabaah-patch.js', 'liquid-glass.js', 'nuris-motion.js', 'monitor-groups.js']) if (fs.existsSync(path.join(out, bad))) fs.rmSync(path.join(out, bad));
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(out); const bytes = files.reduce((a, f) => a + fs.statSync(f).size, 0);
const html = files.filter((f) => f.endsWith('.html')).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
for (const bad of ['mutabaah-patch', 'liquid-glass', 'nuris-motion.js', 'nuris-launcher.js']) if (html.includes(bad)) throw Error('Masih ada rujukan ke ' + bad);
console.log(`dist-cloudflare siap: ${files.length} file, ${(bytes / 1048576).toFixed(1)} MB. Netlify tidak diubah.`);
