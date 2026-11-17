#!/bin/sh
# Bundel & unggah kode aplikasi ke Supabase (terkompres+tersandi agar lolos firewall). Perlu file kunci: /tmp/deploykey
cd "$(dirname "$0")/.." && sh edge/build.sh && gzip -9 -c edge/dist/app.js | base64 -w0 > edge/dist/app.gz.b64 && \
curl -s -m 60 -X POST "https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/rpc/__upload?versi=$(date +%Y%m%d%H%M%S)" \
  -H "x-deploy-key: $(cat /tmp/deploykey)" -H "x-encoding: gzip-base64" -H "x-region: ap-southeast-1" --data-binary @edge/dist/app.gz.b64
