#!/bin/sh
# Bundel kode aplikasi untuk dimuat fungsi pemuat Supabase (format IIFE, global __mut).
cd "$(dirname "$0")/.." && npx -y esbuild@0.24.0 edge/app.ts --bundle --format=iife --global-name=__mut --platform=node --target=es2022 \
  --alias:pg=./edge/pg-shim.js --minify --legal-comments=none --outfile=edge/dist/app.js --log-level=warning
