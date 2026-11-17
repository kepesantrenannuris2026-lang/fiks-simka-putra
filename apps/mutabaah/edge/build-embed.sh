#!/bin/sh
# Bangun fungsi Supabase "rpc" dengan kode aplikasi tertanam -> edge/dist/index-embed.ts
cd "$(dirname "$0")/.." && sh edge/build.sh && V=$(date +%Y%m%d%H%M) && B64=$(gzip -9 -c edge/dist/app.js | base64 -w0) && \
python3 -c "import sys; s=open('edge/loader-embed.ts').read(); open('edge/dist/index-embed.ts','w').write(s.replace('__KODE__', sys.argv[1]).replace('__VERSI__', sys.argv[2]))" "$B64" "$V" && wc -c edge/dist/index-embed.ts
