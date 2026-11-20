// Edge Function "cadangan": cadangan database otomatis & arsip audit ke Supabase Storage PRIVAT (bucket "cadangan").
// Dipanggil pg_cron (header x-cadangan-key). Postgres yang menyusun JSON (row_to_json), fungsi hanya mengompres gzip &
// mengunggah per potongan; bila waktu/ukuran per panggilan hampir habis, sisa antrean diteruskan ke panggilan berikutnya.
//  - tugas "harian": semua tabel aplikasi → harian/YYYY-MM-DD/<skema.tabel>.<nnn>.ndjson.gz + _manifest.json.
//    Retensi: 14 cadangan harian terakhir + cadangan tanggal 1 tiap bulan selama 12 bulan.
//  - tugas "arsip": baris audit berumur > 90 hari → arsip/<skema.tabel>/<tanggal>.<nnn>.ndjson.gz, lalu dihapus dari tabel.
import pg from 'npm:pg@8.13.1';
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const SB = Deno.env.get('SUPABASE_URL')!, SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'cadangan';
const SCHEMAS = ['public', 'ibadah', 'rapor_pesantren', 'simka', 'simka_putri', 'tahfidz_exam', 'ujian_praktik', 'yaumiyyah'];
const SKIP = new Set(['public.sync_queue', 'public.cache_hasil']); // sementara/turunan, tidak perlu dicadangkan
const AUDIT: [string, string][] = [['public.audit', 'waktu'], ['rapor_pesantren.audit', 'waktu'], ['ujian_praktik.audit', 'waktu'], ['yaumiyyah.audit', 'waktu'],
  ['simka.audit', 'waktu'], ['simka_putri.audit', 'waktu'], ['tahfidz_exam.audit', 'created_at'], ['ibadah.audit', 'created_at']];
const ROWS = 4000, BUDGET_MS = 25000, BUDGET_BYTES = 12_000_000;

const direct = new URL(Deno.env.get('SUPABASE_DB_URL')!);
const ref = direct.hostname.replace(/^db\./, '').split('.')[0];
let poolP: Promise<any> | null = null;
async function connect() {
  for (const host of ['aws-0-ap-southeast-1.pooler.supabase.com', 'aws-1-ap-southeast-1.pooler.supabase.com']) {
    const p = new pg.Pool({ connectionString: `postgres://postgres.${ref}:${encodeURIComponent(decodeURIComponent(direct.password))}@${host}:6543/postgres`, ssl: { rejectUnauthorized: false }, max: 1, idleTimeoutMillis: 3000, connectionTimeoutMillis: 10000 });
    p.on('error', () => {});
    try { await p.query('SELECT 1'); return p; } catch { await p.end().catch(() => {}); }
  }
  throw new Error('database tidak terjangkau');
}
const q = async (sql: string, args: unknown[] = []) => (await (poolP ??= connect().catch((e) => { poolP = null; throw e; }))).query(sql, args);
const ident = (t: string) => t.split('.').map((x) => '"' + x.replaceAll('"', '""') + '"').join('.');
const tanggalWIB = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

async function gzip(text: string) { return new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); }
async function put(path: string, body: Uint8Array | string, type = 'application/gzip') {
  const r = await fetch(`${SB}/storage/v1/object/${BUCKET}/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${SR}`, 'Content-Type': type, 'x-upsert': 'true' }, body });
  if (!r.ok) throw new Error(`unggah ${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
}
async function list(prefix: string) {
  const r = await fetch(`${SB}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 1000 }) });
  return r.ok ? (await r.json()) as { name: string; id: string | null }[] : [];
}
async function remove(paths: string[]) {
  for (let i = 0; i < paths.length; i += 500) await fetch(`${SB}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: { Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths.slice(i, i + 500) }) });
}
// Kunci pemanggil disimpan di skema privat cadangan_sistem (tidak terjangkau anon/authenticated); dibaca sekali per worker.
let KEY = '';
async function kunci() { if (!KEY) KEY = (await q(`SELECT nilai FROM cadangan_sistem.pengaturan WHERE kunci='kunci_pemanggil'`)).rows[0]?.nilai || ''; return KEY; }
function next(body: unknown) { // lanjutkan sisa antrean di panggilan baru (tidak ditunggu)
  EdgeRuntime.waitUntil(fetch(`${SB}/functions/v1/cadangan`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cadangan-key': KEY }, body: JSON.stringify(body) }).then((r) => r.text()).catch((e) => console.error('lanjut', e)));
}

type Item = { t: string; part: number; col?: string };
async function harian(body: any, t0: number) {
  const tgl: string = body.tanggal || tanggalWIB();
  let antre: Item[] = body.antre, ringkas: any[] = body.ringkas || [];
  if (!antre) {
    const tabs = (await q(`SELECT table_schema||'.'||table_name AS t FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema=ANY($1) ORDER BY 1`, [SCHEMAS])).rows.map((r: any) => r.t).filter((t: string) => !SKIP.has(t));
    antre = tabs.map((t: string) => ({ t, part: 0 }));
  }
  let bytes = 0;
  while (antre.length && Date.now() - t0 < BUDGET_MS && bytes < BUDGET_BYTES) {
    const it = antre[0];
    const r = (await q(`SELECT count(*)::int AS n, coalesce(string_agg(row_to_json(x)::text, E'\\n'),'') AS s FROM (SELECT * FROM ${ident(it.t)} ORDER BY ctid LIMIT ${ROWS} OFFSET ${it.part * ROWS}) x`)).rows[0];
    if (r.n || it.part === 0) { const gz = await gzip(r.s); await put(`harian/${tgl}/${it.t}.${String(it.part).padStart(3, '0')}.ndjson.gz`, gz); bytes += r.s.length;
      const s = ringkas.find((x) => x.t === it.t) || (ringkas.push({ t: it.t, baris: 0, berkas: 0, gzip: 0 }), ringkas.at(-1)); s.baris += r.n; s.berkas++; s.gzip += gz.length; }
    if (r.n === ROWS) it.part++; else antre.shift();
  }
  if (antre.length) { next({ tugas: 'harian', tanggal: tgl, antre, ringkas }); return { lanjut: antre.length }; }
  await put(`harian/${tgl}/_manifest.json`, JSON.stringify({ tanggal: tgl, dibuat: new Date().toISOString(), tabel: ringkas, cara_pulihkan: 'Setiap baris = satu record JSON (row_to_json). Pulihkan dengan INSERT ... SELECT * FROM json_populate_record(NULL::skema.tabel, baris).' }, null, 1), 'application/json');
  // Retensi: 14 harian terakhir + tanggal 1 tiap bulan (12 bulan).
  const folders = (await list('harian/')).filter((f) => !f.id).map((f) => f.name).sort().reverse();
  const keep = new Set([...folders.slice(0, 14), ...folders.filter((d) => d.endsWith('-01')).slice(0, 12)]);
  const buang: string[] = [];
  for (const d of folders.filter((d) => !keep.has(d))) for (const f of await list(`harian/${d}/`)) buang.push(`harian/${d}/${f.name}`);
  if (buang.length) await remove(buang);
  return { selesai: tgl, tabel: ringkas.length, baris: ringkas.reduce((n, x) => n + x.baris, 0), gzip: ringkas.reduce((n, x) => n + x.gzip, 0), dihapus: buang.length };
}

async function arsip(body: any, t0: number) {
  const tgl: string = body.tanggal || tanggalWIB();
  const antre: Item[] = body.antre || AUDIT.map(([t, col]) => ({ t, col, part: 0 }));
  const hasil: any[] = body.hasil || [];
  while (antre.length && Date.now() - t0 < BUDGET_MS) {
    const it = antre[0];
    const r = (await q(`SELECT count(*)::int AS n, coalesce(string_agg(row_to_json(x)::text, E'\\n'),'') AS s, array_agg(x.ctid::text) AS id
      FROM (SELECT ctid, * FROM ${ident(it.t)} WHERE ${ident(it.col!)} < now() - interval '90 days' ORDER BY ${ident(it.col!)} LIMIT ${ROWS}) x`)).rows[0];
    if (!r.n) { antre.shift(); continue; }
    await put(`arsip/${it.t}/${tgl}.${String(it.part).padStart(3, '0')}.ndjson.gz`, await gzip(r.s)); // hapus hanya setelah unggahan berhasil
    await q(`DELETE FROM ${ident(it.t)} WHERE ctid = ANY($1::tid[])`, [r.id]);
    const h = hasil.find((x) => x.t === it.t) || (hasil.push({ t: it.t, diarsipkan: 0 }), hasil.at(-1)); h.diarsipkan += r.n; it.part++;
  }
  if (antre.length) { next({ tugas: 'arsip', tanggal: tgl, antre, hasil }); return { lanjut: antre.length }; }
  if (hasil.length) await put(`arsip/_log/${tgl}.json`, JSON.stringify(hasil), 'application/json');
  return { selesai: tgl, hasil };
}

Deno.serve(async (req) => {
  const t0 = Date.now();
  try {
    const k = await kunci();
    if (!k || req.headers.get('x-cadangan-key') !== k) return new Response('forbidden', { status: 403 });
    const body = await req.json().catch(() => ({}));
    const out = body.tugas === 'arsip' ? await arsip(body, t0) : await harian(body, t0);
    console.log('cadangan', JSON.stringify(out).slice(0, 300));
    return Response.json({ ok: true, ...out });
  } catch (e) { console.error('cadangan gagal', String((e as any)?.message || e)); return Response.json({ ok: false, error: String((e as any)?.message || e) }, { status: 500 }); }
});
