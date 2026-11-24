#!/bin/sh
# Bangun subaplikasi berdesain Mutabaah (Rapor Pesantren, Ujian Praktik Ibadah, Mutabaah Yaumiyyah) dan susun paket aset
# tambahan di deploy/ (dipasang di atas build Cloudflare yang aktif). Rapor Al-Qur'an & Ujian Semester tahfidz berada di Mutabaah.
set -e
cd "$(dirname "$0")/../.."
E=${ESBUILD:-npx esbuild}
# Rapor Pesantren
cat ecosystem/shared/ui.css ecosystem/rapor-pesantren/src/style.css > /tmp/rapor-pesantren.css
$E /tmp/rapor-pesantren.css --minify --outfile=ecosystem/rapor-pesantren/dist/app.css --log-level=warning
$E ecosystem/rapor-pesantren/src/main.ts --bundle --format=iife --charset=utf8 --target=es2020 --minify --outfile=ecosystem/rapor-pesantren/dist/app.js --log-level=warning
# Mutabaah Yaumiyyah (gabungan Yaumiyyah + Ujian Praktik Ibadah, 2026-11-24)
cat ecosystem/shared/ui.css ecosystem/yaumiyyah-app/src/style.css ecosystem/ujian-praktik/src/style.css > /tmp/yaumiyyah-app.css
$E /tmp/yaumiyyah-app.css --minify --outfile=ecosystem/yaumiyyah-app/dist/app.css --log-level=warning
$E ecosystem/yaumiyyah-app/src/gabung.ts --bundle --format=iife --charset=utf8 --target=es2020 --minify --outfile=ecosystem/yaumiyyah-app/dist/app.js --log-level=warning
# Modul "Pratinjau & edit" Rapor Al-Qur'an yang dimuat di halaman Mutabaah.
$E ecosystem/mutabaah-rapor/src/main.ts --bundle --format=iife --charset=ascii --target=es2020 --minify --outfile=ecosystem/mutabaah-rapor/dist/rapor-edit.js --log-level=warning
$E ecosystem/mutabaah-rapor/src/style.css --minify --charset=ascii --outfile=ecosystem/mutabaah-rapor/dist/rapor-edit.css --log-level=warning
rm -rf deploy && mkdir -p deploy/rapor-tahfidz deploy/_patch deploy/mutabaah
cp ecosystem/mutabaah-rapor/dist/rapor-edit.js ecosystem/mutabaah-rapor/dist/rapor-edit.css deploy/mutabaah/
# Cache terkontrol panggilan API Mutabaah (dimuat paling awal di <head> halaman Mutabaah).
cp ecosystem/mutabaah-rapor/src/cache.js deploy/mutabaah/nuris-cache.js
# Antrean simpan offline setoran (IndexedDB).
cp ecosystem/mutabaah-rapor/src/offline.js deploy/mutabaah/nuris-offline.js
# Alamat lama Ujian Praktik → menu Ujian Praktik di Mutabaah Yaumiyyah.
mkdir -p deploy/ujian-praktik && cp ecosystem/ujian-praktik/index.html deploy/ujian-praktik/
for pair in rapor-pesantren:rapor-pesantren yaumiyyah-app:yaumiyyah; do
  src=${pair%%:*}; dst=${pair##*:}; mkdir -p deploy/$dst
  cp ecosystem/$src/index.html ecosystem/$src/dist/app.js ecosystem/$src/dist/app.css deploy/$dst/
done
cp ecosystem/simka-theme/nuris-mutabaah.css deploy/
cp ecosystem/glass/nuris-glass.css ecosystem/glass/nuris-glass.js deploy/
# Tampilan selalu terang (fitur siang/malam dihapus).
cp ecosystem/cloudflare/baseline-nuris-appearance.js deploy/nuris-appearance.js
# Lapisan bersama semua aplikasi: warna aplikasi, logo ke Portal, Pindah Aplikasi di menu, penyeragaman SIMKA.
cp ecosystem/glass/nuris-shell.js ecosystem/glass/nuris-shell.css deploy/
mkdir -p deploy/logo-app && cp ecosystem/glass/logo-app/*.svg deploy/logo-app/
# Portal (salinan live 24 Nov + aplikasi bervarian SIMKA Putra/Putri).
cp ecosystem/portal/portal.js deploy/portal.js
cp ecosystem/portal/apps.js deploy/
# Infrastructure Manager (khusus pimpinan/admin).
mkdir -p deploy/infrastruktur && cp ecosystem/portal/infrastruktur/index.html deploy/infrastruktur/
# Beranda Kepesantrenan sebagai aplikasi terpasang (PWA, cakupan "/").
cp ecosystem/portal/manifest.webmanifest ecosystem/portal/sw.js ecosystem/portal/offline.html ecosystem/portal/nuris-install.js ecosystem/portal/nuris-pindah.js deploy/
# Alamat lama Rapor Tahfidz dialihkan ke menu Rapor semester di Mutabaah.
printf '%s' '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Mengalihkan…</title><script>location.replace("/mutabaah/?tool=raport")</script><meta http-equiv="refresh" content="0;url=/mutabaah/?tool=raport"><a href="/mutabaah/?tool=raport">Lanjutkan ke Rapor semester</a>' > deploy/rapor-tahfidz/index.html
# Tambalan build Mutabaah aktif (cap & tanda tangan Kabid pada PDF Rapor Al-Qur'an).
python3 ecosystem/cloudflare/tambalan-mutabaah.py deploy/_patch/mutabaah.json
(cd deploy && find . -type f ! -name files.txt | sed 's|^\.||' | sort > files.txt)
echo "deploy/ siap: $(wc -l < deploy/files.txt) berkas"
