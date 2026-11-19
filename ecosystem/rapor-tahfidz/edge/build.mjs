// Bangun kode server Rapor Tahfidz terenkripsi (AES-256-GCM + gzip) untuk pemuat fungsi Supabase "rapor-tahfidz".
// Pemakaian: RT_KUNCI=<base64 32 byte> RT_ID=<id> node build.mjs  (tanpa variabel: kunci & id baru, lalu perbarui loader.ts)
import fs from 'node:fs'; import zlib from 'node:zlib'; import crypto from 'node:crypto'; import { execSync } from 'node:child_process';
const here = new URL('.', import.meta.url).pathname;
execSync(`/opt/npm-tools/node_modules/.bin/esbuild ${here}entry.ts --bundle --format=iife --global-name=__rt --platform=node --target=es2022 --alias:pg=${here}../../../apps/mutabaah/edge/pg-shim.js --minify --legal-comments=none --outfile=${here}dist/app.js --log-level=warning`);
const kunci = process.env.RT_KUNCI ? Buffer.from(process.env.RT_KUNCI, 'base64') : crypto.randomBytes(32);
const id = process.env.RT_ID || 'rt-' + crypto.randomBytes(10).toString('hex');
const iv = crypto.randomBytes(12), gz = zlib.gzipSync(fs.readFileSync(here + 'dist/app.js'), { level: 9 });
const c = crypto.createCipheriv('aes-256-gcm', kunci, iv); const ct = Buffer.concat([c.update(gz), c.final(), c.getAuthTag()]);
fs.writeFileSync(`${here}dist/${id}.txt`, Buffer.concat([iv, ct]).toString('base64'));
console.log(JSON.stringify({ id, kunci: process.env.RT_KUNCI ? '(tetap)' : kunci.toString('base64'), bytes: fs.statSync(`${here}dist/${id}.txt`).size }));
