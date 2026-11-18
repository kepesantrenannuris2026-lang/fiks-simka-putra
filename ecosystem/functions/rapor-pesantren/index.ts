// Rapor Pesantren (per kamar). Sesi & akun = Mutabaah (public.sesi/public.akun). Data di skema privat rapor_pesantren.
// Wali kamar hanya melihat/menyimpan santri kamarnya; pimpinan/admin semua kamar dan pengaturan.
import pg from 'npm:pg@8.13.1';
import { semesterMonths, semesterReport } from './yaumiyyahModel.ts';

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

async function identity(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token || token.length > 512) throw fail('Sesi berakhir. Silakan masuk kembali.', 401);
  const { rows } = await q(`SELECT a.username,a.nama,a.role FROM public.sesi s JOIN public.akun a ON a.username=s.data->>'username'
    WHERE s.token=$1 AND s.expires_at>now() AND upper(a.aktif)<>'N'`, [token]);
  if (!rows.length) throw fail('Sesi berakhir atau akun dinonaktifkan. Silakan masuk kembali.', 401);
  const a = rows[0];
  return { username: a.username as string, nama: a.nama as string, admin: ['pimpinan', 'admin'].includes(String(a.role).toLowerCase()) };
}
type Actor = Awaited<ReturnType<typeof identity>>;

// Santri yang boleh diakses: wali efektif = wali anggota (bila ada) atau wali kamar.
const scopeSql = (a: Actor, args: unknown[]) => {
  if (a.admin) return 'true';
  args.push(a.username);
  return `coalesce(g.wali_username,k.wali_username)=$${args.length}`;
};

const DEFAULTS = {
  umum: {
    judul: 'RAPOR SANTRI', sub: 'PESANTREN NURUL ISLAM TENGARAN', tempat: 'Tengaran', tanggal: '',
    kabid_nama: 'Abdul Fattah Ismail Farras, Lc., M.IRKH', kabid_jabatan: 'Kabid Kepesantrenan', kkm: 75,
    sekolah: { SMP: 'SMP IT NURUL ISLAM TENGARAN', SMA: 'SMA IT NURUL ISLAM TENGARAN', MA: 'MA NURUL ISLAM TENGARAN' },
    hadis_target: { '7': 10, '8': 20, '9': 30, '10': 10, '11': 20, '12': 30 },
  },
};

function periodOf(body: any) {
  const ta = String(body.ta || ''); const sem = Number(body.sem);
  if (!/^\d{4}\/\d{4}$/.test(ta) || Number(ta.slice(5)) !== Number(ta.slice(0, 4)) + 1 || ![1, 2].includes(sem)) throw fail('Tahun ajaran atau semester tidak valid.');
  return { ta, sem };
}

const LETTER = /^(A|B|C|D)$/;
const KEY = /^[a-z0-9_]{1,24}$/;
function cleanData(input: any) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail('Data nilai tidak valid.');
  const out: Record<string, any> = {};
  for (const [group, val] of Object.entries(input)) {
    if (!KEY.test(group)) throw fail('Kelompok nilai tidak dikenal.');
    if (group === 'catatan') { if (typeof val !== 'string' || val.length > 800) throw fail('Catatan maksimal 800 karakter.'); out.catatan = val.trim(); continue; }
    if (group === 'hadir') {
      const h: Record<string, number> = {};
      for (const k of ['sakit', 'izin', 'alpa']) { const v = (val as any)?.[k]; if (v === '' || v == null) continue; if (!Number.isInteger(v) || v < 0 || v > 365) throw fail('Ketidakhadiran tidak valid.'); h[k] = v; }
      out.hadir = h; continue;
    }
    if (!val || typeof val !== 'object' || Array.isArray(val)) throw fail('Data nilai tidak valid.');
    const g: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(val as any)) {
      if (!KEY.test(k)) throw fail('Butir nilai tidak dikenal.');
      if (v === '' || v == null) continue;
      if (typeof v === 'string') { const s = v.trim().toUpperCase(); if (!LETTER.test(s)) throw fail('Predikat harus A, B, C, atau D.'); g[k] = s; }
      else if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100) g[k] = Math.round(v * 100) / 100;
      else throw fail('Nilai angka harus 0–100.');
    }
    out[group] = g;
  }
  return out;
}

const yaumMap: Record<string, string> = { jamaah: 'jamaah', qiyam: 'qiyam', dhuha: 'dhuha', rawatib: 'rawatib', dzikir: 'dzikir', matsurat: 'matsurat', quran: 'tilawah', puasa: 'puasa' };

async function autoSources(ids: string[], ta: string, sem: number) {
  const out: Record<string, any> = Object.fromEntries(ids.map((id) => [id, {}]));
  if (!ids.length) return out;
  // Mutabaah Yaumiyyah → saran predikat ibadah (rerata skor semester, batas 100%).
  const months = semesterMonths(Number(ta.slice(0, 4)), sem);
  const daily = (await q(`SELECT santri_id,to_char(tanggal,'YYYY-MM-DD') AS date,aktivitas AS values,izin AS excused FROM yaumiyyah.daily
    WHERE santri_id=ANY($1::text[]) AND to_char(tanggal,'YYYY-MM')=ANY($2::text[])`, [ids, months])).rows;
  const by = new Map<string, any[]>();
  for (const r of daily) (by.get(r.santri_id) ?? by.set(r.santri_id, []).get(r.santri_id)!).push(r);
  for (const [id, entries] of by) {
    const rep = semesterReport(months, entries);
    const ibadah: Record<string, number> = {};
    for (const row of rep.rows) if (yaumMap[row.id] && row.score != null) ibadah[yaumMap[row.id]] = row.score;
    out[id].yaumiyyah = { skor: ibadah, hari: entries.length, sementara: rep.provisional };
  }
  // Ujian Praktik Ibadah → nilai praktik & lisan (periode yang namanya memuat semester & tahun ajaran, bila tidak ada: terbaru).
  const periods = (await q('SELECT id,name,configs,created_at FROM ibadah.periods ORDER BY created_at DESC')).rows;
  const match = periods.find((p: any) => p.name.includes(ta) && new RegExp(`semester\\s*${sem}\\b|${sem === 1 ? 'ganjil' : 'genap'}`, 'i').test(p.name));
  const period = match || null;
  if (period) {
    const ent = (await q('SELECT santri_id,result FROM ibadah.entries WHERE period_id=$1 AND santri_id=ANY($2::text[])', [period.id, ids])).rows;
    for (const e of ent) out[e.santri_id].praktik = { ...e.result, periode: period.name };
  }
  // Hadis Arbain (Mutabaah) → jumlah hadis yang sudah disetorkan hafal.
  const hadis = (await q(`SELECT santri_id,count(*) FILTER (WHERE status='hafal')::int AS hafal,
      array_agg(nomor ORDER BY nomor) FILTER (WHERE status='hafal') AS nomor FROM public.hadis_arbain WHERE santri_id=ANY($1::text[]) GROUP BY 1`, [ids])).rows;
  for (const h of hadis) out[h.santri_id].hadis = { hafal: h.hafal, nomor: h.nomor || [] };
  return out;
}

async function settings() {
  const rows = (await q('SELECT key,value FROM rapor_pesantren.pengaturan')).rows;
  const s: Record<string, any> = { ...DEFAULTS };
  for (const r of rows) s[r.key] = r.key === 'umum' ? { ...DEFAULTS.umum, ...r.value } : r.value;
  return s;
}

async function handle(path: string, a: Actor, body: any) {
  if (path === 'boot') {
    let ta = '', sem = 0;
    try { ({ ta, sem } = periodOf(body)); } catch { /* tanpa periode: jumlah terisi tidak dihitung */ }
    const kamars = (await q(`SELECT k.id,k.nama,k.unit,k.lingkungan,k.tingkat,k.wali_username,coalesce(w.nama,k.wali_label) AS wali_nama,k.urut,
        count(s.id) FILTER (WHERE $2 OR coalesce(g.wali_username,k.wali_username)=$1)::int AS jumlah,
        count(n.santri_id) FILTER (WHERE $2 OR coalesce(g.wali_username,k.wali_username)=$1)::int AS terisi
        FROM rapor_pesantren.kamar k LEFT JOIN public.akun w ON w.username=k.wali_username
        LEFT JOIN rapor_pesantren.anggota g ON g.kamar_id=k.id LEFT JOIN public.santri s ON s.id=g.santri_id AND s.aktif
        LEFT JOIN rapor_pesantren.nilai n ON n.santri_id=s.id AND n.tahun_ajaran=$3 AND n.semester=$4
        WHERE k.aktif AND ($2 OR k.wali_username=$1 OR EXISTS (SELECT 1 FROM rapor_pesantren.anggota x WHERE x.kamar_id=k.id AND x.wali_username=$1))
        GROUP BY k.id,w.nama ORDER BY k.lingkungan,array_position(ARRAY['SMP','SMA','MA'],k.unit),k.tingkat::int,k.urut`, [a.username, a.admin, ta, sem || 0])).rows;
    const extra: any = {};
    if (a.admin) {
      extra.akun = (await q(`SELECT username,nama FROM public.akun WHERE upper(aktif)<>'N' ORDER BY nama`)).rows;
      extra.tanpaKamar = (await q(`SELECT s.id,s.nama,s.unit,s.tingkat FROM public.santri s WHERE s.aktif AND NOT EXISTS (SELECT 1 FROM rapor_pesantren.anggota g WHERE g.santri_id=s.id) ORDER BY s.unit,s.tingkat,s.nama`)).rows;
      extra.tidakCocok = (await q('SELECT id,kamar_id,nama FROM rapor_pesantren.impor_tidak_cocok WHERE NOT selesai ORDER BY id')).rows;
    }
    return { user: a, kamars, settings: await settings(), ...extra };
  }
  if (path === 'kamar') {
    const { ta, sem } = periodOf(body);
    if (typeof body.kamar !== 'string' || body.kamar.length > 120) throw fail('Pilih kamar.');
    const args: unknown[] = [body.kamar];
    const scope = scopeSql(a, args);
    const kamar = (await q(`SELECT k.*,coalesce(w.nama,k.wali_label) AS wali_nama FROM rapor_pesantren.kamar k LEFT JOIN public.akun w ON w.username=k.wali_username WHERE k.id=$1`, [body.kamar])).rows[0];
    if (!kamar) throw fail('Kamar tidak ditemukan.', 404);
    args.push(ta, sem);
    const students = (await q(`SELECT s.id,s.nama,s.unit,s.tingkat,s.halaqah,g.wali_username,coalesce(gw.nama,kw.nama,k.wali_label) AS wali_nama,
        n.data,n.version,n.updated_at,n.updated_by
        FROM rapor_pesantren.anggota g JOIN rapor_pesantren.kamar k ON k.id=g.kamar_id JOIN public.santri s ON s.id=g.santri_id AND s.aktif
        LEFT JOIN public.akun gw ON gw.username=g.wali_username LEFT JOIN public.akun kw ON kw.username=k.wali_username
        LEFT JOIN rapor_pesantren.nilai n ON n.santri_id=s.id AND n.tahun_ajaran=$${args.length - 1} AND n.semester=$${args.length}
        WHERE g.kamar_id=$1 AND ${scope} ORDER BY s.nama`, args)).rows;
    if (!a.admin && !students.length) throw fail('Kamar ini bukan binaan akun Anda.', 403);
    return { kamar, students, auto: await autoSources(students.map((s: any) => s.id), ta, sem) };
  }
  if (path === 'save') {
    const { ta, sem } = periodOf(body);
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 60) throw fail('Maksimal 60 santri per simpan.');
    const client = await (await getPool()).connect();
    const saved: any[] = [], conflicts: string[] = [];
    try {
      await client.query('BEGIN');
      for (const item of body.items) {
        const id = String(item.santri_id || '');
        const data = cleanData(item.data);
        const version = item.version ?? null;
        if (version !== null && !/^[0-9a-f-]{36}$/i.test(version)) throw fail('Versi data tidak valid.');
        const args: unknown[] = [id];
        const allowed = (await client.query(`SELECT 1 FROM rapor_pesantren.anggota g JOIN rapor_pesantren.kamar k ON k.id=g.kamar_id JOIN public.santri s ON s.id=g.santri_id AND s.aktif WHERE g.santri_id=$1 AND ${scopeSql(a, args)}`, args)).rows.length;
        if (!allowed) throw fail('Ada santri di luar kamar binaan Anda.', 403);
        const r = (await client.query(`INSERT INTO rapor_pesantren.nilai(santri_id,tahun_ajaran,semester,data,updated_by) SELECT $1,$2,$3,$4::jsonb,$5 WHERE $6::uuid IS NULL
            ON CONFLICT (santri_id,tahun_ajaran,semester) DO NOTHING RETURNING santri_id,version,updated_at,updated_by`, [id, ta, sem, JSON.stringify(data), a.username, version])).rows[0]
          || (await client.query(`UPDATE rapor_pesantren.nilai SET data=$4::jsonb,updated_by=$5,updated_at=now(),version=gen_random_uuid()
            WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3 AND version=$6::uuid RETURNING santri_id,version,updated_at,updated_by`, [id, ta, sem, JSON.stringify(data), a.username, version])).rows[0];
        if (!r) { conflicts.push(id); continue; }
        await client.query('INSERT INTO rapor_pesantren.audit(username,aksi,ref,data) VALUES($1,$2,$3,$4::jsonb)', [a.username, 'nilai', `${id}|${ta}|${sem}`, JSON.stringify(data)]);
        saved.push(r);
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    return { saved, conflicts };
  }
  if (!a.admin) throw fail('Hanya pimpinan yang dapat mengatur kamar dan rapor.', 403);
  if (path === 'kamar-save') {
    const k = body.kamar || {};
    const nama = String(k.nama || '').trim();
    if (!nama || nama.length > 80 || !['SMP', 'SMA', 'MA'].includes(k.unit) || !['PUTRA', 'PUTRI'].includes(k.lingkungan) || !/^(7|8|9|10|11|12)$/.test(String(k.tingkat))) throw fail('Lengkapi nama, unit, lingkungan, dan kelas kamar.');
    const wali = k.wali_username ? String(k.wali_username) : null;
    const id = k.id ? String(k.id) : `${k.lingkungan}-${k.unit}-${nama.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
    const row = (await q(`INSERT INTO rapor_pesantren.kamar(id,nama,unit,lingkungan,tingkat,wali_username,urut,updated_by) VALUES($1,$2,$3,$4,$5,$6,999,$7)
      ON CONFLICT(id) DO UPDATE SET nama=excluded.nama,unit=excluded.unit,lingkungan=excluded.lingkungan,tingkat=excluded.tingkat,wali_username=excluded.wali_username,updated_by=excluded.updated_by,updated_at=now() RETURNING *`,
      [id, nama, k.unit, k.lingkungan, String(k.tingkat), wali, a.username])).rows[0];
    await q('INSERT INTO rapor_pesantren.audit(username,aksi,ref,data) VALUES($1,$2,$3,$4::jsonb)', [a.username, 'kamar', id, JSON.stringify(row)]);
    return { kamar: row };
  }
  if (path === 'anggota-save') {
    const id = String(body.santri_id || '');
    if (!(await q('SELECT 1 FROM public.santri WHERE id=$1 AND aktif', [id])).rows.length) throw fail('Santri tidak ditemukan.');
    if (body.kamar_id === null) await q('DELETE FROM rapor_pesantren.anggota WHERE santri_id=$1', [id]);
    else await q(`INSERT INTO rapor_pesantren.anggota(santri_id,kamar_id,wali_username,updated_by) VALUES($1,$2,$3,$4)
      ON CONFLICT(santri_id) DO UPDATE SET kamar_id=excluded.kamar_id,wali_username=excluded.wali_username,updated_by=excluded.updated_by,updated_at=now()`,
      [id, String(body.kamar_id), body.wali_username || null, a.username]);
    if (body.tidak_cocok) await q('UPDATE rapor_pesantren.impor_tidak_cocok SET selesai=true WHERE id=$1', [Number(body.tidak_cocok)]);
    await q('INSERT INTO rapor_pesantren.audit(username,aksi,ref,data) VALUES($1,$2,$3,$4::jsonb)', [a.username, 'anggota', id, JSON.stringify(body)]);
    return {};
  }
  if (path === 'santri-cari') {
    const s = String(body.q || '').trim();
    if (s.length < 2 || s.length > 60) return { santri: [] };
    return { santri: (await q(`SELECT s.id,s.nama,s.unit,s.tingkat,g.kamar_id FROM public.santri s LEFT JOIN rapor_pesantren.anggota g ON g.santri_id=s.id WHERE s.aktif AND s.nama ILIKE $1 ORDER BY s.nama LIMIT 20`, ['%' + s.replace(/[%_]/g, '') + '%'])).rows };
  }
  if (path === 'settings-save') {
    if (!['umum', 'kurikulum'].includes(body.key) || !body.value || typeof body.value !== 'object' || JSON.stringify(body.value).length > 20000) throw fail('Pengaturan tidak valid.');
    await q(`INSERT INTO rapor_pesantren.pengaturan(key,value,updated_by) VALUES($1,$2::jsonb,$3) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=now()`, [body.key, JSON.stringify(body.value), a.username]);
    return { settings: await settings() };
  }
  throw fail('Rute tidak dikenal.', 404);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== 'POST') return reply(req, { ok: true, app: 'Rapor Pesantren Nuris' });
  try {
    if (Number(req.headers.get('content-length')) > 400000) throw fail('Permintaan terlalu besar.');
    const body = await req.json();
    const path = new URL(req.url).pathname.split('/').pop() || '';
    const a = await identity(req);
    return reply(req, { ok: true, ...(await handle(path, a, body)) });
  } catch (e: any) {
    console.error('rapor-pesantren', e.status || e.code || 'error');
    const msg = e.status ? e.message : /^(23505|23503|23514|23502)$/.test(e.code || '') ? 'Data tidak valid atau berhubungan dengan data lain.' : e.message || 'Permintaan gagal.';
    return reply(req, { ok: false, error: { message: msg } }, e.status || 400);
  }
});
