// Bangun kode API terenkripsi untuk pemuat jarak jauh fungsi Supabase "api".
// Pemakaian (kunci & id diambil dari pemuat yang SUDAH terpasang; jangan commit kunci):
//   KODE_KUNCI=<base64 32 byte> KODE_ID=<id berkas> node edge/build-remote.mjs
// Hasil: edge/dist/kode-<id>.txt → unggah sebagai aset Cloudflare /_k/<id>.txt (lewat rakit-perbaikan.mjs, env KODE_API).
// Tanpa KODE_KUNCI: kunci & id baru dibuat, dan pemuat edge/dist/index-remote.ts perlu dideploy ulang ke Supabase.
import fs from 'node:fs'; import zlib from 'node:zlib'; import crypto from 'node:crypto'; import { execSync } from 'node:child_process';
execSync('sh edge/build.sh', { stdio: 'inherit' });
const baru = !process.env.KODE_KUNCI;
const kunci = baru ? crypto.randomBytes(32) : Buffer.from(process.env.KODE_KUNCI, 'base64');
const id = process.env.KODE_ID || crypto.randomBytes(12).toString('hex');
const iv = crypto.randomBytes(12), gz = zlib.gzipSync(fs.readFileSync('edge/dist/app.js'), { level: 9 });
const c = crypto.createCipheriv('aes-256-gcm', kunci, iv); const ct = Buffer.concat([c.update(gz), c.final(), c.getAuthTag()]);
fs.writeFileSync(`edge/dist/kode-${id}.txt`, Buffer.concat([iv, ct]).toString('base64'));
if (baru) {
  const versi = new Date(Date.now() + 7 * 3600e3).toISOString().replace(/\D/g, '').slice(0, 12);
  const url = `https://kepesantrenan-nuris.kepesantrenannuris.workers.dev/_k/${id}.txt`;
  fs.writeFileSync('edge/dist/index-remote.ts', fs.readFileSync('edge/loader-remote.ts', 'utf8').replace('__VERSI__', versi).replace('__URL__', url).replace('__KUNCI__', kunci.toString('base64')));
}
console.log(JSON.stringify({ id, baru, bytes: fs.statSync(`edge/dist/kode-${id}.txt`).size }));
