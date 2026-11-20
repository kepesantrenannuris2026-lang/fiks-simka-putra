// nuris-arsip — penyimpanan salinan luar (Cloudflare D1) untuk cadangan & arsip Kepesantrenan Nuris.
// Hanya menerima panggilan dari Edge Function "cadangan" (header x-kunci = secret KUNCI). Tidak ada akses publik.
// Berkas disimpan sebagai BLOB per bagian (≤ 1,9 MB, batas baris D1 2 MB).
const PART = 1_900_000;
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS berkas (path TEXT NOT NULL, bagian INTEGER NOT NULL DEFAULT 0, ukuran INTEGER NOT NULL, sha256 TEXT, dibuat TEXT NOT NULL DEFAULT (datetime('now')), isi BLOB NOT NULL, PRIMARY KEY (path, bagian))`,
  `CREATE TABLE IF NOT EXISTS catatan (id INTEGER PRIMARY KEY AUTOINCREMENT, waktu TEXT NOT NULL DEFAULT (datetime('now')), jenis TEXT, isi TEXT)`,
];
let siap = false;
async function init(db) { if (!siap) { await db.batch(SCHEMA.map((s) => db.prepare(s))); siap = true; } }
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const json = (o, s = 200) => Response.json(o, { status: s, headers: { 'cache-control': 'no-store' } });
function sama(a, b) { if (!a || !b || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

export default {
  async fetch(req, env) {
    const u = new URL(req.url), p = u.searchParams.get('p') || '';
    if (!sama(req.headers.get('x-kunci') || '', env.KUNCI || '')) return new Response('forbidden', { status: 403 });
    const db = env.DB; await init(db);
    const cmd = u.pathname.replace(/^\/+/, '');
    if (cmd === 'simpan' && req.method === 'POST') {
      if (!/^[\w./-]{3,300}$/.test(p)) return json({ ok: false, error: 'path' }, 400);
      const buf = await req.arrayBuffer(); const sha = hex(await crypto.subtle.digest('SHA-256', buf));
      const st = [db.prepare('DELETE FROM berkas WHERE path=?').bind(p)];
      for (let i = 0, n = 0; i < Math.max(buf.byteLength, 1); i += PART, n++) st.push(db.prepare('INSERT INTO berkas(path,bagian,ukuran,sha256,isi) VALUES(?,?,?,?,?)').bind(p, n, buf.byteLength, sha, buf.slice(i, i + PART)));
      await db.batch(st);
      return json({ ok: true, path: p, ukuran: buf.byteLength, sha256: sha });
    }
    if (cmd === 'ambil') {
      const r = (await db.prepare('SELECT isi FROM berkas WHERE path=? ORDER BY bagian').bind(p).all()).results;
      if (!r.length) return json({ ok: false, error: 'tidak ada' }, 404);
      return new Response(new Blob(r.map((x) => new Uint8Array(x.isi))), { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } });
    }
    if (cmd === 'daftar') {
      const a = (u.searchParams.get('awalan') || '') + '%';
      return json({ ok: true, berkas: (await db.prepare('SELECT path, max(ukuran) ukuran, max(sha256) sha256, max(dibuat) dibuat FROM berkas WHERE path LIKE ? GROUP BY path ORDER BY path').bind(a).all()).results });
    }
    if (cmd === 'pangkas' && req.method === 'POST') { // hapus folder harian/ yang tidak ada di daftar simpan
      const { simpan = [] } = await req.json();
      const folders = (await db.prepare(`SELECT DISTINCT substr(path, 8, instr(substr(path, 8), '/') - 1) f FROM berkas WHERE path LIKE 'harian/%'`).all()).results.map((x) => x.f);
      const buang = folders.filter((f) => f && !simpan.includes(f));
      for (const f of buang) await db.prepare('DELETE FROM berkas WHERE path LIKE ?').bind(`harian/${f}/%`).run();
      return json({ ok: true, dibuang: buang });
    }
    if (cmd === 'catat' && req.method === 'POST') { const b = await req.json(); await db.prepare('INSERT INTO catatan(jenis,isi) VALUES(?,?)').bind(String(b.jenis || ''), JSON.stringify(b.isi ?? null)).run(); return json({ ok: true }); }
    if (cmd === 'status') {
      const s = await db.prepare(`SELECT count(DISTINCT path) berkas, coalesce(sum(length(isi)),0) bytes, max(dibuat) terakhir,
        count(DISTINCT CASE WHEN path LIKE 'harian/%' THEN substr(path, 8, 10) END) harian FROM berkas`).first();
      const m = await db.prepare('SELECT 1').run();
      const log = (await db.prepare('SELECT waktu, jenis, isi FROM catatan ORDER BY id DESC LIMIT 10').all()).results;
      return json({ ok: true, ...s, db_bytes: m.meta?.size_after ?? null, batas_bytes: 500 * 1024 * 1024, catatan: log });
    }
    return json({ ok: false, error: '?' }, 404);
  },
};
