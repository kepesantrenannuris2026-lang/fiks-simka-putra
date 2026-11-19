// Ujian Praktik Ibadah — sesuai "Spesifikasi Sistem Penilaian Ujian Praktik Ibadah" (final).
// Sesi & akun = Mutabaah. Data di skema privat ujian_praktik. Tiap subujian disimpan & dikonversi terpisah (tanpa nilai gabungan).
import pg from 'npm:pg@8.13.1';
import { RUBRIK, GRUP, RUBRIK_KEYS, grupOf, materiOf, totalSkor } from './materi.ts';

const origins = ['https://kepesantrenan-nuris.kepesantrenannuris.workers.dev', 'https://kepesantrenannuris.netlify.app', 'http://localhost:4173', 'http://localhost:3400'];
const direct = new URL(Deno.env.get('SUPABASE_DB_URL')!);
const ref = direct.hostname.replace(/^db\./, '').split('.')[0];
let poolPromise: Promise<any> | null = null;
async function connectPool() {
  for (const host of ['aws-0-ap-southeast-1.pooler.supabase.com', 'aws-1-ap-southeast-1.pooler.supabase.com']) {
    const pool = new pg.Pool({ connectionString: `postgres://postgres.${ref}:${encodeURIComponent(decodeURIComponent(direct.password))}@${host}:6543/postgres`, ssl: { rejectUnauthorized: false }, max: 1, idleTimeoutMillis: 4000, connectionTimeoutMillis: 10000 });
    pool.on('error', () => {});
    try { await pool.query('SELECT 1'); return pool; } catch { await pool.end().catch(() => {}); }
  }
  throw Object.assign(new Error('Server database belum dapat dihubungi. Coba lagi sebentar.'), { status: 503 });
}
const getPool = () => poolPromise ??= connectPool().catch((e) => { poolPromise = null; throw e; });
const q = async (sql: string, args: unknown[] = []) => (await getPool()).query(sql, args);
const fail = (message: string, status = 400) => Object.assign(new Error(message), { status });
function cors(req: Request) {
  const o = req.headers.get('origin') || '';
  return { 'Access-Control-Allow-Origin': origins.includes(o) ? o : origins[0], 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Max-Age': '600', Vary: 'Origin', 'Cache-Control': 'no-store' };
}
const reply = (req: Request, data: unknown, status = 200) => Response.json(data, { status, headers: cors(req) });
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
const KOOR_DEFAULT: Record<string, string[]> = { 'arif.haryadi': ['SMP Ikhwan'], 'muh.hisom': ['SMA Ikhwan'], muhlisin: ['MA Ikhwan'], 'lubna.nadiyatuz': ['SMP Akhwat'], 'hajar.nur': ['SMA Akhwat'], 'siti.muawanah': ['MA Akhwat'] };

async function identity(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token || token.length > 512) throw fail('Sesi berakhir. Silakan masuk kembali.', 401);
  const { rows } = await q(`SELECT a.username,a.nama,a.role,a.musyrif_master,
      ARRAY(SELECT DISTINCT t.unit FROM public.santri t WHERE t.aktif AND lower(trim(t.musyrif))=lower(trim(a.musyrif_master))) AS units_musyrif,
      ARRAY(SELECT DISTINCT k.unit||' '||CASE k.lingkungan WHEN 'PUTRA' THEN 'Ikhwan' ELSE 'Akhwat' END FROM rapor_pesantren.kamar k WHERE k.wali_username=a.username) AS units_wali,
      (SELECT value FROM rapor_pesantren.pengaturan WHERE key='koordinator') AS koor
    FROM public.sesi s JOIN public.akun a ON a.username=s.data->>'username' WHERE s.token=$1 AND s.expires_at>now() AND upper(a.aktif)<>'N'`, [token]);
  if (!rows.length) throw fail('Sesi berakhir atau akun dinonaktifkan. Silakan masuk kembali.', 401);
  const a = rows[0];
  const admin = ['pimpinan', 'admin'].includes(String(a.role).toLowerCase());
  const koordinator: string[] = admin ? [] : ((a.koor || KOOR_DEFAULT)[a.username] || []);
  const units = [...new Set([...koordinator, ...(a.units_musyrif || []), ...(a.units_wali || [])])];
  return { username: a.username as string, nama: a.nama as string, admin, koordinator, units };
}
type Actor = Awaited<ReturnType<typeof identity>>;
const scope = (a: Actor, args: unknown[], al = 's') => { if (a.admin) return 'true'; args.push(a.units); return `${al}.unit=ANY($${args.length}::text[])`; };
const bolehKelola = (a: Actor, unit: string) => a.admin || a.koordinator.includes(unit);

function cleanMateri(raw: any) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const [g, list] of Object.entries(raw)) {
    if (!GRUP.includes(g)) throw fail('Kelompok kelas tidak dikenal.');
    if (!Array.isArray(list) || !list.length || list.length > 6 || (list as any[]).some((k) => !RUBRIK_KEYS.includes(k)) || new Set(list).size !== list.length) throw fail(`Periksa materi kelas ${g.replace('-', ' ')}.`);
    out[g] = list as string[];
  }
  return out;
}

async function periode(id: unknown) {
  if (!uuid(id)) throw fail('Pilih periode ujian.');
  const p = (await q('SELECT * FROM ujian_praktik.periode WHERE id=$1', [id])).rows[0];
  if (!p) throw fail('Periode tidak ditemukan.', 404);
  return p;
}

async function handle(path: string, a: Actor, body: any) {
  if (path === 'boot') {
    const periodes = (await q('SELECT id,nama,tahun_ajaran,semester,aktif,materi FROM ujian_praktik.periode ORDER BY tahun_ajaran DESC,semester DESC,dibuat_pada DESC')).rows;
    return { user: a, periodes };
  }
  if (path === 'peserta') {
    const p = await periode(body.periode);
    const args: unknown[] = [p.id];
    const rows = (await q(`SELECT s.id,s.nama,s.unit,s.tingkat,s.halaqah,s.musyrif,coalesce(k.nama,'') AS kamar,coalesce(ps.kelas_pagi,'') AS kelas_pagi,
        n.skor,n.nilai,n.penguji,n.catatan,n.version,n.diperbarui_oleh,n.diperbarui_pada
      FROM public.santri s LEFT JOIN rapor_pesantren.anggota g ON g.santri_id=s.id LEFT JOIN rapor_pesantren.kamar k ON k.id=g.kamar_id
      LEFT JOIN ujian_praktik.peserta ps ON ps.santri_id=s.id LEFT JOIN ujian_praktik.nilai n ON n.periode_id=$1 AND n.santri_id=s.id
      WHERE s.aktif AND ${scope(a, args)} ORDER BY array_position(ARRAY['SMP Ikhwan','SMA Ikhwan','MA Ikhwan','SMP Akhwat','SMA Akhwat','MA Akhwat'],s.unit),s.tingkat,lower(s.nama)`, args)).rows;
    const akun = (await q(`SELECT username,nama FROM public.akun WHERE username=ANY($1::text[])`, [[...new Set(rows.flatMap((r: any) => Object.values(r.penguji || {})).concat(rows.map((r: any) => r.diperbarui_oleh)).filter(Boolean))]])).rows;
    return { periode: p, peserta: rows, penguji: Object.fromEntries(akun.map((x: any) => [x.username, x.nama])) };
  }
  if (path === 'simpan') {
    const p = await periode(body.periode);
    if (!p.aktif) throw fail('Periode ujian sudah ditutup.', 409);
    const id = String(body.santri || '');
    const args: unknown[] = [id];
    const s = (await q(`SELECT s.id,s.unit,s.tingkat FROM public.santri s WHERE s.id=$1 AND s.aktif AND ${scope(a, args)}`, args)).rows[0];
    if (!s) throw fail('Santri berada di luar unit yang ditugaskan.', 403);
    const keys = materiOf(p.materi, grupOf(s.unit, s.tingkat));
    if (!keys.length) throw fail('Lengkapi unit dan tingkat kelas santri di Mutabaah.');
    const input = body.skor || {};
    if (typeof input !== 'object' || Array.isArray(input)) throw fail('Nilai tidak valid.');
    const version = body.version ?? null;
    if (version !== null && !uuid(version)) throw fail('Versi nilai tidak valid.');
    const catatan = typeof body.catatan === 'string' ? body.catatan.trim().slice(0, 1000) : '';
    const client = await (await getPool()).connect();
    try {
      await client.query('BEGIN');
      const lama = (await client.query('SELECT * FROM ujian_praktik.nilai WHERE periode_id=$1 AND santri_id=$2 FOR UPDATE', [p.id, id])).rows[0];
      if (lama && lama.version !== version) throw fail('Nilai santri ini baru saja diubah penguji lain. Muat ulang sebelum menyimpan.', 409);
      if (!lama && version !== null) throw fail('Nilai telah berubah. Muat ulang sebelum menyimpan.', 409);
      const skor: Record<string, (number | null)[]> = { ...(lama?.skor || {}) }, penguji = { ...(lama?.penguji || {}) };
      for (const [k, arr] of Object.entries(input)) {
        if (!keys.includes(k)) throw fail(`${RUBRIK[k]?.nama || k} tidak diujikan untuk kelas ini.`);
        const r = RUBRIK[k];
        if (arr === null) { delete skor[k]; delete penguji[k]; continue; }
        if (!Array.isArray(arr) || arr.length !== r.aspek.length) throw fail(`Lengkapi isian ${r.nama}.`);
        const clean = (arr as any[]).map((v, i) => {
          if (v === null || v === '') return null;
          if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > r.aspek[i].max) throw fail(`${r.nama}: “${r.aspek[i].label}” maksimal ${r.aspek[i].max} poin.`);
          return Math.round(v * 100) / 100;
        });
        if (clean.every((v) => v === null)) { delete skor[k]; delete penguji[k]; continue; }
        if (JSON.stringify(clean) !== JSON.stringify(skor[k] || null)) penguji[k] = a.username;
        skor[k] = clean;
      }
      const nilai: Record<string, number> = {};
      for (const k of keys) { const t = totalSkor(k, skor[k]); if (t != null) nilai[k] = t; }
      const row = (await client.query(`INSERT INTO ujian_praktik.nilai(periode_id,santri_id,skor,nilai,penguji,catatan,diperbarui_oleh) VALUES($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6,$7)
        ON CONFLICT(periode_id,santri_id) DO UPDATE SET skor=excluded.skor,nilai=excluded.nilai,penguji=excluded.penguji,catatan=excluded.catatan,diperbarui_oleh=excluded.diperbarui_oleh,diperbarui_pada=now(),version=gen_random_uuid()
        RETURNING skor,nilai,penguji,catatan,version,diperbarui_oleh,diperbarui_pada`, [p.id, id, JSON.stringify(skor), JSON.stringify(nilai), JSON.stringify(penguji), catatan, a.username])).rows[0];
      await client.query('INSERT INTO ujian_praktik.audit(periode_id,santri_id,username,data) VALUES($1,$2,$3,$4::jsonb)', [p.id, id, a.username, JSON.stringify({ skor, nilai })]);
      await client.query('COMMIT');
      return { nilai: row };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }
  if (path === 'kelas-pagi') {
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 900) throw fail('Daftar kelas pagi tidak valid.');
    const ids = body.items.map((x: any) => String(x.santri || ''));
    const units = new Map((await q('SELECT id,unit FROM public.santri WHERE aktif AND id=ANY($1::text[])', [ids])).rows.map((r: any) => [r.id, r.unit]));
    let n = 0;
    for (const it of body.items) {
      const unit = units.get(String(it.santri));
      if (!unit || !bolehKelola(a, unit as string)) throw fail('Kelas pagi hanya dapat diubah pimpinan atau koordinator unitnya.', 403);
      const kp = String(it.kelas_pagi || '').trim().toUpperCase().slice(0, 20);
      await q(`INSERT INTO ujian_praktik.peserta(santri_id,kelas_pagi,diperbarui_oleh) VALUES($1,$2,$3) ON CONFLICT(santri_id) DO UPDATE SET kelas_pagi=excluded.kelas_pagi,diperbarui_oleh=excluded.diperbarui_oleh,diperbarui_pada=now()`, [it.santri, kp, a.username]);
      n++;
    }
    return { disimpan: n };
  }
  if (path === 'periode-simpan') {
    if (!a.admin) throw fail('Hanya pimpinan yang dapat mengatur periode dan materi.', 403);
    const nama = String(body.nama || '').trim();
    const ta = String(body.tahun_ajaran || ''), sem = Number(body.semester);
    if (!nama || nama.length > 120 || !/^\d{4}\/\d{4}$/.test(ta) || ![1, 2].includes(sem)) throw fail('Lengkapi nama, tahun ajaran, dan semester.');
    const materi = cleanMateri(body.materi), aktif = body.aktif !== false;
    const row = body.id
      ? (await q('UPDATE ujian_praktik.periode SET nama=$2,tahun_ajaran=$3,semester=$4,aktif=$5,materi=$6::jsonb WHERE id=$1 RETURNING id,nama,tahun_ajaran,semester,aktif,materi', [(await periode(body.id)).id, nama, ta, sem, aktif, JSON.stringify(materi)])).rows[0]
      : (await q('INSERT INTO ujian_praktik.periode(nama,tahun_ajaran,semester,aktif,materi,dibuat_oleh) VALUES($1,$2,$3,$4,$5::jsonb,$6) RETURNING id,nama,tahun_ajaran,semester,aktif,materi', [nama, ta, sem, aktif, JSON.stringify(materi), a.username])).rows[0];
    return { periode: row };
  }
  throw fail('Rute tidak dikenal.', 404);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return reply(req, { ok: true, app: 'Ujian Praktik Ibadah Nuris' });
  try {
    if (Number(req.headers.get('content-length')) > 300000) throw fail('Permintaan terlalu besar.');
    const body = await req.json();
    const path = new URL(req.url).pathname.split('/').pop() || '';
    const a = await identity(req);
    return reply(req, { ok: true, ...(await handle(path, a, body)) });
  } catch (e: any) {
    console.error('ujian-praktik', e.status || e.code || 'error');
    const msg = e.status ? e.message : /^(23505|23503|23514|23502)$/.test(e.code || '') ? 'Data tidak valid atau berhubungan dengan data lain.' : e.message || 'Permintaan gagal.';
    return reply(req, { ok: false, error: { message: msg } }, e.status || 400);
  }
});
