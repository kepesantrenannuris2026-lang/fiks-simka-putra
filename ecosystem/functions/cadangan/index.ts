// Edge Function "cadangan": cadangan database, arsip, salinan luar (Cloudflare D1) & status untuk Infrastructure Manager.
// Postgres yang menyusun JSON (row_to_json); fungsi hanya mengompres gzip & mengunggah per potongan. Bila waktu/ukuran
// per panggilan hampir habis, sisa antrean diteruskan ke panggilan berikutnya.
// Pemanggil:
//  - pg_cron / rantai internal: header x-cadangan-key (kunci di cadangan_sistem.pengaturan).
//  - Infrastructure Manager: Authorization: Bearer <token sesi Mutabaah>, hanya akun pimpinan/admin.
// Tugas:
//  - "harian": semua tabel aplikasi → harian/YYYY-MM-DD/<skema.tabel>.<nnn>.ndjson.gz + _manifest.json.
//    Retensi Supabase: 14 harian + tgl 1 tiap bulan (12 bulan). Retensi D1: 7 harian + tgl 1 tiap bulan (12 bulan).
//  - "arsip": baris audit lebih tua dari `hari` (bawaan 90, minimal 14) → arsip/<skema.tabel>/<tanggal>.<nnn>.ndjson.gz,
//    disalin ke Supabase Storage DAN D1; baris dihapus hanya setelah kedua salinan berhasil.
//  - "salin": salinan permanen tabel tertentu → salinan/<label>/... (dipakai sebelum perubahan besar).
//  - "arsip_ta": salin data satu tahun ajaran yang SUDAH SELESAI → ta/<YYYY-YYYY>/..., diverifikasi jumlah barisnya.
//    Tidak menghapus apa pun; tahun ajaran aktif ditolak.
//  - "status": ringkasan kapasitas & kesehatan untuk Infrastructure Manager (hanya baca).
import pg from 'npm:pg@8.13.1';
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };

const SB = Deno.env.get('SUPABASE_URL')!, SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'cadangan';
const SCHEMAS = ['public', 'ibadah', 'rapor_pesantren', 'simka', 'simka_putri', 'tahfidz_exam', 'ujian_praktik', 'yaumiyyah'];
const SKIP = new Set(['public.sync_queue', 'public.cache_hasil']); // sementara/turunan, tidak perlu dicadangkan
const AUDIT: [string, string][] = [['public.audit', 'waktu'], ['rapor_pesantren.audit', 'waktu'], ['ujian_praktik.audit', 'waktu'], ['yaumiyyah.audit', 'waktu'],
  ['simka.audit', 'waktu'], ['simka_putri.audit', 'waktu'], ['tahfidz_exam.audit', 'created_at'], ['ibadah.audit', 'created_at']];
// Data per tahun ajaran. $1 = awal (YYYY-07-01), $2 = akhir (YYYY+1-07-01), $3 = 'YYYY/YYYY+1'.
const TA: [string, string][] = [
  ['public.setoran', `make_date(tahun, bulan, 1) >= $1::text::date AND make_date(tahun, bulan, 1) < $2::text::date`],
  ['public.hm_catatan', `(ym || '-01')::date >= $1::text::date AND (ym || '-01')::date < $2::text::date`],
  ['public.keanggotaan_histori', `(ym || '-01')::date >= $1::text::date AND (ym || '-01')::date < $2::text::date`],
  ['public.penilaian_tajwid', `(ym || '-01')::date >= $1::text::date AND (ym || '-01')::date < $2::text::date`],
  ['public.hadis_arbain', `tanggal >= $1::text AND tanggal < $2::text`],
  ['public.rapor_semester', `tahun_ajaran = $3`],
  ['public.ujian_semester', `tahun_ajaran = $3`],
  ['rapor_pesantren.nilai', `tahun_ajaran = $3`],
  ['tahfidz_exam.periods', `tahun_ajaran = $3`],
  ['tahfidz_exam.semester_reports', `tahun_ajaran = $3`],
  ['tahfidz_exam.assignments', `period_id IN (SELECT id FROM tahfidz_exam.periods WHERE tahun_ajaran = $3)`],
  ['tahfidz_exam.attempts', `assignment_id IN (SELECT a.id FROM tahfidz_exam.assignments a JOIN tahfidz_exam.periods p ON p.id = a.period_id WHERE p.tahun_ajaran = $3)`],
  ['ujian_praktik.periode', `tahun_ajaran = $3`],
  ['ujian_praktik.nilai', `periode_id IN (SELECT id FROM ujian_praktik.periode WHERE tahun_ajaran = $3)`],
  ['yaumiyyah.daily', `tanggal >= $1::text::date AND tanggal < $2::text::date`],
  ['simka.pelanggaran', `tanggal_waktu >= $1::text::date AND tanggal_waktu < $2::text::date`],
  ['simka.pembinaan', `created_at >= $1::text::date AND created_at < $2::text::date`],
  ['simka_putri.pelanggaran', `tanggal_waktu >= $1::text::date AND tanggal_waktu < $2::text::date`],
  ['simka_putri.pembinaan', `created_at >= $1::text::date AND created_at < $2::text::date`],
];
const ROWS = 4000, BUDGET_MS = 25000, BUDGET_BYTES = 12_000_000;
const ORIGINS = ['https://kepesantrenan-nuris.kepesantrenannuris.workers.dev', 'https://kepesantrenannuris.netlify.app'];

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
const nomor = (n: number) => String(n).padStart(3, '0');

// ---- pengaturan rahasia (skema privat cadangan_sistem; tidak terjangkau anon/authenticated) ----
let CFG: Record<string, string> | null = null;
async function cfg() {
  if (!CFG) CFG = Object.fromEntries((await q(`SELECT kunci, nilai FROM cadangan_sistem.pengaturan`)).rows.map((r: any) => [r.kunci, r.nilai]));
  return CFG!;
}

// ---- penyimpanan: Supabase Storage (utama) + Cloudflare D1 (salinan luar) ----
async function gzip(text: string) { return new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); }
async function putStorage(path: string, body: Uint8Array | string, type: string) {
  const r = await fetch(`${SB}/storage/v1/object/${BUCKET}/${path}`, { method: 'POST', headers: { Authorization: `Bearer ${SR}`, 'Content-Type': type, 'x-upsert': 'true' }, body });
  if (!r.ok) throw new Error(`unggah ${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
}
async function d1(path: string, init: RequestInit = {}) {
  const c = await cfg(); if (!c.url_arsip_d1 || !c.kunci_arsip_d1) throw new Error('D1 belum dikonfigurasi');
  const r = await fetch(c.url_arsip_d1 + path, { ...init, headers: { ...(init.headers || {}), 'x-kunci': c.kunci_arsip_d1 } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error(`D1 ${path.split('?')[0]}: ${r.status} ${j.error || ''}`);
  return j;
}
const putD1 = (path: string, body: Uint8Array | string) => d1(`/simpan?p=${encodeURIComponent(path)}`, { method: 'POST', body });
// wajibD1: true untuk arsip/salinan (gagal = berhenti, tidak ada yang dihapus); false untuk cadangan harian (dicatat saja).
async function put(path: string, body: Uint8Array | string, type = 'application/gzip', wajibD1 = false, stat?: any) {
  await putStorage(path, body, type);
  try { await putD1(path, body); if (stat) stat.d1 = (stat.d1 || 0) + 1; }
  catch (e) { if (wajibD1) throw e; if (stat) { stat.d1_gagal = (stat.d1_gagal || 0) + 1; stat.d1_error = String((e as any)?.message || e).slice(0, 160); } }
}
async function list(prefix: string) {
  const r = await fetch(`${SB}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: 'name', order: 'asc' } }) });
  return r.ok ? (await r.json()) as { name: string; id: string | null; metadata?: any; created_at?: string }[] : [];
}
async function getJSON(path: string) {
  const r = await fetch(`${SB}/storage/v1/object/${BUCKET}/${path}`, { headers: { Authorization: `Bearer ${SR}` } });
  return r.ok ? await r.json().catch(() => null) : null;
}
async function remove(paths: string[]) {
  for (let i = 0; i < paths.length; i += 500) await fetch(`${SB}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: { Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: paths.slice(i, i + 500) }) });
}
function next(body: unknown) { // lanjutkan sisa antrean di panggilan baru (tidak ditunggu)
  EdgeRuntime.waitUntil(cfg().then((c) => fetch(`${SB}/functions/v1/cadangan`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-cadangan-key': c.kunci_pemanggil }, body: JSON.stringify(body) })).then((r) => r.text()).catch((e) => console.error('lanjut', e)));
}
async function log(jenis: string, isi: unknown) {
  await q(`INSERT INTO cadangan_sistem.log(jenis, isi) VALUES ($1, $2::jsonb)`, [jenis, JSON.stringify(isi)]).catch(() => {});
}

type Item = { t: string; part: number; col?: string };
async function harian(body: any, t0: number) {
  const tgl: string = body.tanggal || tanggalWIB();
  let antre: Item[] = body.antre, ringkas: any[] = body.ringkas || [];
  const d1stat = body.d1stat || {};
  if (!antre) {
    const tabs = (await q(`SELECT table_schema||'.'||table_name AS t FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema=ANY($1) ORDER BY 1`, [SCHEMAS])).rows.map((r: any) => r.t).filter((t: string) => !SKIP.has(t));
    antre = tabs.map((t: string) => ({ t, part: 0 }));
  }
  let bytes = 0;
  while (antre.length && Date.now() - t0 < BUDGET_MS && bytes < BUDGET_BYTES) {
    const it = antre[0];
    const r = (await q(`SELECT count(*)::int AS n, coalesce(string_agg(row_to_json(x)::text, E'\\n'),'') AS s FROM (SELECT * FROM ${ident(it.t)} ORDER BY ctid LIMIT ${ROWS} OFFSET ${it.part * ROWS}) x`)).rows[0];
    if (r.n || it.part === 0) { const gz = await gzip(r.s); await put(`harian/${tgl}/${it.t}.${nomor(it.part)}.ndjson.gz`, gz, 'application/gzip', false, d1stat); bytes += r.s.length;
      const s = ringkas.find((x) => x.t === it.t) || (ringkas.push({ t: it.t, baris: 0, berkas: 0, gzip: 0 }), ringkas.at(-1)); s.baris += r.n; s.berkas++; s.gzip += gz.length; }
    if (r.n === ROWS) it.part++; else antre.shift();
  }
  if (antre.length) { next({ tugas: 'harian', tanggal: tgl, antre, ringkas, d1stat }); return { lanjut: antre.length }; }
  const manifest = { tanggal: tgl, dibuat: new Date().toISOString(), tabel: ringkas, salinan_d1: d1stat, cara_pulihkan: 'Setiap baris = satu record JSON (row_to_json). Pulihkan dengan INSERT ... SELECT * FROM json_populate_record(NULL::skema.tabel, baris).' };
  await put(`harian/${tgl}/_manifest.json`, JSON.stringify(manifest, null, 1), 'application/json', false, d1stat);
  // Retensi Supabase: 14 harian terakhir + tanggal 1 tiap bulan (12 bulan).
  const folders = (await list('harian/')).filter((f) => !f.id).map((f) => f.name).sort().reverse();
  const keep = new Set([...folders.slice(0, 14), ...folders.filter((d) => d.endsWith('-01')).slice(0, 12)]);
  const buang: string[] = [];
  for (const d of folders.filter((d) => !keep.has(d))) for (const f of await list(`harian/${d}/`)) buang.push(`harian/${d}/${f.name}`);
  if (buang.length) await remove(buang);
  // Retensi D1 (lebih hemat): 7 harian + tanggal 1 tiap bulan (12 bulan).
  let d1buang: string[] = [];
  try { d1buang = (await d1('/pangkas', { method: 'POST', body: JSON.stringify({ simpan: [...folders.slice(0, 7), ...folders.filter((d) => d.endsWith('-01')).slice(0, 12)] }) })).dibuang; } catch (e) { d1stat.pangkas_error = String(e).slice(0, 160); }
  const out = { selesai: tgl, tabel: ringkas.length, baris: ringkas.reduce((n, x) => n + x.baris, 0), gzip: ringkas.reduce((n, x) => n + x.gzip, 0), dihapus: buang.length, d1: d1stat, d1_dibuang: d1buang };
  await log('harian', out);
  return out;
}

async function arsip(body: any, t0: number) {
  const tgl: string = body.tanggal || tanggalWIB();
  const hari = Math.max(14, Math.min(3650, Number(body.hari) || 90));
  const antre: Item[] = body.antre || AUDIT.map(([t, col]) => ({ t, col, part: 0 }));
  const hasil: any[] = body.hasil || [];
  while (antre.length && Date.now() - t0 < BUDGET_MS) {
    const it = antre[0];
    const r = (await q(`SELECT count(*)::int AS n, coalesce(string_agg(row_to_json(x)::text, E'\\n'),'') AS s, array_agg(x.ctid::text) AS id
      FROM (SELECT ctid, * FROM ${ident(it.t)} WHERE ${ident(it.col!)} < now() - make_interval(days => $1) ORDER BY ${ident(it.col!)} LIMIT ${ROWS}) x`, [hari])).rows[0];
    if (!r.n) { antre.shift(); continue; }
    // Hapus hanya setelah salinan Storage DAN D1 berhasil.
    await put(`arsip/${it.t}/${tgl}-${hari}h.${nomor(it.part)}.ndjson.gz`, await gzip(r.s), 'application/gzip', true);
    await q(`DELETE FROM ${ident(it.t)} WHERE ctid = ANY($1::tid[])`, [r.id]);
    const h = hasil.find((x) => x.t === it.t) || (hasil.push({ t: it.t, diarsipkan: 0 }), hasil.at(-1)); h.diarsipkan += r.n; it.part++;
  }
  if (antre.length) { next({ tugas: 'arsip', tanggal: tgl, hari, antre, hasil }); return { lanjut: antre.length }; }
  if (hasil.length) await put(`arsip/_log/${tgl}-${hari}h.json`, JSON.stringify(hasil), 'application/json', true);
  const out = { selesai: tgl, hari, hasil };
  await log('arsip', out);
  return out;
}

// Salinan permanen tabel tertentu (semua baris), diverifikasi jumlah baris; wajib tersalin juga ke D1.
async function salin(body: any, t0: number) {
  const label = String(body.label || '').replace(/[^\w-]/g, '');
  if (!label) throw new Error('label wajib');
  const tabs: string[] = body.tabel || [];
  const antre: Item[] = body.antre || tabs.map((t) => ({ t, part: 0 }));
  const hasil: any[] = body.hasil || [];
  while (antre.length && Date.now() - t0 < BUDGET_MS) {
    const it = antre[0];
    if (it.part === 0 && !hasil.find((x) => x.t === it.t)) hasil.push({ t: it.t, sumber: (await q(`SELECT count(*)::int n FROM ${ident(it.t)}`)).rows[0].n, baris: 0, berkas: 0 });
    const r = (await q(`SELECT count(*)::int AS n, coalesce(string_agg(row_to_json(x)::text, E'\\n'),'') AS s FROM (SELECT * FROM ${ident(it.t)} ORDER BY ctid LIMIT ${ROWS} OFFSET ${it.part * ROWS}) x`)).rows[0];
    const h = hasil.find((x) => x.t === it.t);
    if (r.n || it.part === 0) { await put(`salinan/${label}/${it.t}.${nomor(it.part)}.ndjson.gz`, await gzip(r.s), 'application/gzip', true); h.baris += r.n; h.berkas++; }
    if (r.n === ROWS) it.part++; else antre.shift();
  }
  if (antre.length) { next({ tugas: 'salin', label, antre, hasil }); return { lanjut: antre.length }; }
  const out = { selesai: label, hasil, cocok: hasil.every((h) => h.baris === h.sumber) };
  await put(`salinan/${label}/_manifest.json`, JSON.stringify({ ...out, dibuat: new Date().toISOString() }, null, 1), 'application/json', true);
  await log('salin', out);
  return out;
}

function rentangTA(ta: string) {
  const m = /^(\d{4})\/(\d{4})$/.exec(ta || '');
  if (!m || +m[2] !== +m[1] + 1) throw new Error('Format tahun ajaran harus YYYY/YYYY, misalnya 2025/2026.');
  return { awal: `${m[1]}-07-01`, akhir: `${m[2]}-07-01`, folder: `${m[1]}-${m[2]}` };
}
async function arsipTA(body: any, t0: number) {
  const ta = String(body.ta || ''); const { awal, akhir, folder } = rentangTA(ta);
  if (tanggalWIB() < akhir) throw new Error(`Tahun ajaran ${ta} belum selesai (berakhir ${akhir}). Data tahun ajaran aktif tidak diarsipkan.`);
  const antre: Item[] = body.antre || TA.map(([t], i) => ({ t, part: 0, col: String(i) }));
  const hasil: any[] = body.hasil || [];
  const args = [awal, akhir, ta];
  while (antre.length && Date.now() - t0 < BUDGET_MS) {
    const it = antre[0]; const where = `(${TA[Number(it.col)][1]}) AND $1::text <> '' AND $2::text <> '' AND $3::text <> ''`; // semua parameter selalu dirujuk
    if (it.part === 0 && !hasil.find((x) => x.t === it.t)) hasil.push({ t: it.t, sumber: (await q(`SELECT count(*)::int n FROM ${ident(it.t)} WHERE ${where}`, args)).rows[0].n, baris: 0, berkas: 0 });
    const h = hasil.find((x) => x.t === it.t);
    if (!h.sumber) { antre.shift(); continue; }
    const r = (await q(`SELECT count(*)::int AS n, coalesce(string_agg(row_to_json(x)::text, E'\\n'),'') AS s FROM (SELECT * FROM ${ident(it.t)} WHERE ${where} ORDER BY ctid LIMIT ${ROWS} OFFSET ${it.part * ROWS}) x`, args)).rows[0];
    if (r.n) { await put(`ta/${folder}/${it.t}.${nomor(it.part)}.ndjson.gz`, await gzip(r.s), 'application/gzip', true); h.baris += r.n; h.berkas++; }
    if (r.n === ROWS) it.part++; else antre.shift();
  }
  if (antre.length) { next({ tugas: 'arsip_ta', ta, antre, hasil }); return { lanjut: antre.length }; }
  const isi = hasil.filter((h) => h.sumber);
  const out = { selesai: ta, tabel: isi, total: isi.reduce((n, h) => n + h.baris, 0), cocok: isi.every((h) => h.baris === h.sumber), dihapus_dari_supabase: 0 };
  await put(`ta/${folder}/_manifest.json`, JSON.stringify({ ...out, rentang: [awal, akhir], dibuat: new Date().toISOString(), catatan: 'Salinan terverifikasi. Data di Supabase belum dihapus.' }, null, 1), 'application/json', true);
  await log('arsip_ta', out);
  return out;
}

async function status() {
  const db = (await q(`SELECT cadangan_sistem.ringkasan() AS r`)).rows[0].r;
  const harianFolders = (await list('harian/')).filter((f) => !f.id).map((f) => f.name).sort().reverse();
  const terakhir = harianFolders[0] ? await getJSON(`harian/${harianFolders[0]}/_manifest.json`) : null;
  const ta = (await list('ta/')).filter((f) => !f.id).map((f) => f.name);
  const taInfo = []; for (const f of ta) { const m = await getJSON(`ta/${f}/_manifest.json`); if (m) taInfo.push({ ta: m.selesai, total: m.total, cocok: m.cocok, dibuat: m.dibuat }); }
  let d1s: any = null; try { d1s = await d1('/status'); } catch (e) { d1s = { ok: false, error: String((e as any)?.message || e) }; }
  return { ...db, cadangan: { harian: harianFolders, terakhir: terakhir && { tanggal: terakhir.tanggal, dibuat: terakhir.dibuat, tabel: terakhir.tabel?.length, baris: terakhir.tabel?.reduce((n: number, x: any) => n + x.baris, 0), gzip: terakhir.tabel?.reduce((n: number, x: any) => n + x.gzip, 0), salinan_d1: terakhir.salinan_d1 } }, arsip_ta: taInfo, d1: d1s };
}

// ---- akses Infrastructure Manager (token sesi Mutabaah, hanya pimpinan/admin) ----
async function admin(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token || token.length > 512) return null;
  const r = (await q(`SELECT a.username, a.role FROM public.sesi s JOIN public.akun a ON a.username = s.data->>'username'
    WHERE s.token = $1 AND s.expires_at > now() AND upper(a.aktif) <> 'N' AND lower(a.role) IN ('pimpinan','admin') AND lower(s.data->>'role') = lower(a.role)`, [token])).rows[0];
  return r || null;
}
function cors(req: Request) {
  const o = req.headers.get('origin') || '';
  return { 'Access-Control-Allow-Origin': ORIGINS.includes(o) || /^https:\/\/[a-z0-9-]+--kepesantrenannuris\.netlify\.app$/.test(o) ? o : ORIGINS[0], 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Vary': 'Origin', 'Cache-Control': 'no-store' };
}

Deno.serve(async (req) => {
  const t0 = Date.now();
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  try {
    const body = await req.json().catch(() => ({}));
    const c = await cfg();
    const kunciOk = !!c.kunci_pemanggil && req.headers.get('x-cadangan-key') === c.kunci_pemanggil;
    if (!kunciOk) { // jalur Infrastructure Manager
      const a = await admin(req);
      if (!a) return Response.json({ ok: false, error: 'Hanya pimpinan/admin.' }, { status: 403, headers: cors(req) });
      if (body.tugas === 'status') return Response.json({ ok: true, ...(await status()) }, { headers: cors(req) });
      const izin: Record<string, any> = { harian: {}, arsip: { hari: 90 }, arsip_ta: { ta: String(body.ta || '') } };
      if (!(body.tugas in izin)) return Response.json({ ok: false, error: 'tugas tidak dikenal' }, { status: 400, headers: cors(req) });
      if (body.tugas === 'arsip_ta') { const { akhir } = rentangTA(izin.arsip_ta.ta);
        if (tanggalWIB() < akhir) return Response.json({ ok: false, error: `Tahun ajaran ${izin.arsip_ta.ta} belum selesai (berakhir ${akhir}).` }, { status: 400, headers: cors(req) }); }
      await log('manual', { oleh: a.username, tugas: body.tugas, ...izin[body.tugas] });
      next({ tugas: body.tugas, ...izin[body.tugas] });
      return Response.json({ ok: true, dimulai: body.tugas }, { headers: cors(req) });
    }
    const out = body.tugas === 'arsip' ? await arsip(body, t0) : body.tugas === 'salin' ? await salin(body, t0)
      : body.tugas === 'arsip_ta' ? await arsipTA(body, t0) : body.tugas === 'status' ? await status() : await harian(body, t0);
    console.log('cadangan', JSON.stringify(out).slice(0, 300));
    return Response.json({ ok: true, ...out });
  } catch (e) {
    const msg = String((e as any)?.message || e); console.error('cadangan gagal', msg);
    await log('gagal', { tugas: 'cadangan', error: msg });
    return Response.json({ ok: false, error: msg }, { status: 500, headers: cors(req) });
  }
});
