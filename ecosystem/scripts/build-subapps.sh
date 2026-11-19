#!/bin/sh
# Bangun subaplikasi berdesain Mutabaah (Rapor Pesantren, Ujian Praktik Ibadah, Mutabaah Yaumiyyah) dan susun paket aset
# tambahan di deploy/ (dipasang di atas build Cloudflare yang aktif). Rapor Al-Qur'an & Ujian Semester tahfidz berada di Mutabaah.
set -e
cd "$(dirname "$0")/../.."
E=${ESBUILD:-npx esbuild}
for d in rapor-pesantren ujian-praktik yaumiyyah-app; do
  cat ecosystem/shared/ui.css ecosystem/$d/src/style.css > /tmp/$d.css
  $E /tmp/$d.css --minify --outfile=ecosystem/$d/dist/app.css --log-level=warning
  $E ecosystem/$d/src/main.ts --bundle --format=iife --charset=utf8 --target=es2020 --minify --outfile=ecosystem/$d/dist/app.js --log-level=warning
done
rm -rf deploy && mkdir -p deploy/rapor-tahfidz deploy/_patch
for pair in rapor-pesantren:rapor-pesantren ujian-praktik:ujian-praktik yaumiyyah-app:yaumiyyah; do
  src=${pair%%:*}; dst=${pair##*:}; mkdir -p deploy/$dst
  cp ecosystem/$src/index.html ecosystem/$src/dist/app.js ecosystem/$src/dist/app.css deploy/$dst/
done
cp ecosystem/simka-theme/nuris-mutabaah.css deploy/
cp ecosystem/glass/nuris-glass.css ecosystem/glass/nuris-glass.js deploy/
cp ecosystem/portal/apps.js deploy/
# Alamat lama Rapor Tahfidz dialihkan ke menu Rapor semester di Mutabaah.
printf '%s' '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Mengalihkan…</title><script>location.replace("/mutabaah/?tool=raport")</script><meta http-equiv="refresh" content="0;url=/mutabaah/?tool=raport"><a href="/mutabaah/?tool=raport">Lanjutkan ke Rapor semester</a>' > deploy/rapor-tahfidz/index.html
# Tambalan build Mutabaah aktif (cap & tanda tangan Kabid pada PDF Rapor Al-Qur'an).
python3 ecosystem/cloudflare/tambalan-mutabaah.py deploy/_patch/mutabaah.json
(cd deploy && find . -type f ! -name files.txt | sed 's|^\.||' | sort > files.txt)
echo "deploy/ siap: $(wc -l < deploy/files.txt) berkas"
