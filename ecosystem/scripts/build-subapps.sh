#!/bin/sh
# Bangun subaplikasi berdesain Mutabaah (Rapor Pesantren, Rapor Tahfidz, Ujian Praktik Ibadah, Mutabaah Yaumiyyah)
# dan susun paket aset tambahan di deploy/ (dipasang di atas build Cloudflare yang aktif).
set -e
cd "$(dirname "$0")/../.."
E=${ESBUILD:-npx esbuild}
for d in rapor-pesantren rapor-tahfidz ujian-praktik yaumiyyah-app; do
  cat ecosystem/shared/ui.css ecosystem/$d/src/style.css > /tmp/$d.css
  $E /tmp/$d.css --minify --outfile=ecosystem/$d/dist/app.css --log-level=warning
  $E ecosystem/$d/src/main.ts --bundle --format=iife --charset=utf8 --target=es2020 --minify --outfile=ecosystem/$d/dist/app.js --log-level=warning
done
rm -rf deploy && mkdir -p deploy/_k
for pair in rapor-pesantren:rapor-pesantren rapor-tahfidz:rapor-tahfidz ujian-praktik:ujian-praktik yaumiyyah-app:yaumiyyah; do
  src=${pair%%:*}; dst=${pair##*:}; mkdir -p deploy/$dst
  cp ecosystem/$src/index.html ecosystem/$src/dist/app.js ecosystem/$src/dist/app.css deploy/$dst/
done
cp ecosystem/rapor-tahfidz/edge/dist/rt-*.txt deploy/_k/ 2>/dev/null || true
cp ecosystem/simka-theme/nuris-mutabaah.css deploy/
(cd deploy && find . -type f ! -name files.txt | sed 's|^\.||' | sort > files.txt)
echo "deploy/ siap: $(wc -l < deploy/files.txt) berkas"
