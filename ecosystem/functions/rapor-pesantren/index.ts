// Rapor Pesantren (per kamar). Sesi & akun = Mutabaah (public.sesi/public.akun). Data di skema privat rapor_pesantren.
// Wali kamar: akses PENUH untuk kamar ampuannya, dan dapat membuka seluruh kamar di unit yang sama (mis. MA Putra)
// khusus untuk mengisi nilai Kajian Kitab & Pidato (penguji sering musyrif lain). Koordinator unit & pimpinan: penuh.
import pg from 'npm:pg@8.13.1';
import { semesterMonths, semesterReport, validateMonth, validMonth } from './yaumiyyahModel.ts';

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
  const { rows } = await q(`SELECT a.username,a.nama,a.role,a.musyrif_master FROM public.sesi s JOIN public.akun a ON a.username=s.data->>'username'
    WHERE s.token=$1 AND s.expires_at>now() AND upper(a.aktif)<>'N'`, [token]);
  if (!rows.length) throw fail('Sesi berakhir atau akun dinonaktifkan. Silakan masuk kembali.', 401);
  const a = rows[0];
  const admin = ['pimpinan', 'admin'].includes(String(a.role).toLowerCase());
  const koor: string[] = admin ? [] : (await koordinatorMap())[a.username] || [];
  // Unit kamar ampuan (wali kamar atau wali anggota): seluruh kamar di unit itu dapat dibuka untuk Kajian Kitab.
  const ampu: string[] = admin ? [] : (await q(`SELECT DISTINCT ${KAMAR_UNIT} AS u FROM rapor_pesantren.kamar k WHERE k.aktif AND (k.wali_username=$1
      OR EXISTS (SELECT 1 FROM rapor_pesantren.anggota x WHERE x.kamar_id=k.id AND x.wali_username=$1))`, [a.username])).rows.map((r: any) => r.u);
  return { username: a.username as string, nama: a.nama as string, admin, koordinator: koor, unitAmpu: ampu, units: [...new Set([...koor, ...ampu])], musyrif: String(a.musyrif_master || '') };
}
// Koordinator unit (Pengaturan > Koordinator): username → ['MA Ikhwan', ...]. Bawaan sesuai daftar koordinator SIMKA.
export const KOOR_UNITS = ['SMP Ikhwan', 'SMA Ikhwan', 'MA Ikhwan', 'SMP Akhwat', 'SMA Akhwat', 'MA Akhwat'];
const KOOR_DEFAULT: Record<string, string[]> = { 'arif.haryadi': ['SMP Ikhwan'], 'muh.hisom': ['SMA Ikhwan'], muhlisin: ['MA Ikhwan'], 'lubna.nadiyatuz': ['SMP Akhwat'], 'hajar.nur': ['SMA Akhwat'], 'siti.muawanah': ['MA Akhwat'] };
let koorCache: { at: number; map: Record<string, string[]> } | null = null;
async function koordinatorMap() {
  if (koorCache && Date.now() - koorCache.at < 30000) return koorCache.map;
  const row = (await q(`SELECT value FROM rapor_pesantren.pengaturan WHERE key='koordinator'`)).rows[0];
  koorCache = { at: Date.now(), map: row?.value || KOOR_DEFAULT };
  return koorCache.map;
}
// Unit kamar ('MA' + 'PUTRA') dalam penamaan santri ('MA Ikhwan').
const KAMAR_UNIT = `(k.unit||' '||CASE k.lingkungan WHEN 'PUTRA' THEN 'Ikhwan' ELSE 'Akhwat' END)`;
type Actor = Awaited<ReturnType<typeof identity>>;

// Santri yang boleh DIBUKA: wali efektif (wali anggota bila ada, atau wali kamar), unit koordinasi, atau unit kamar ampuan.
const scopeSql = (a: Actor, args: unknown[]) => {
  if (a.admin) return 'true';
  args.push(a.username, a.units);
  return `(coalesce(g.wali_username,k.wali_username)=$${args.length - 1} OR ${KAMAR_UNIT}=ANY($${args.length}::text[]))`;
};
// Akses PENUH (semua kelompok nilai): wali efektif santri, koordinator unitnya, atau pimpinan. Selain itu hanya Kajian Kitab.
const penuhSql = (a: Actor, args: unknown[]) => {
  if (a.admin) return 'true';
  args.push(a.username, a.koordinator);
  return `(coalesce(g.wali_username,k.wali_username)=$${args.length - 1} OR ${KAMAR_UNIT}=ANY($${args.length}::text[]))`;
};
export const KITAB_KEYS = ['tajwid', 'safinah', 'taisir', 'mabadi', 'yaqut', 'ayyuhal', 'tafsir', 'tuhfah'];
// Kelompok nilai yang boleh diisi penguji dari kamar lain di unit yang sama (juga lewat Mutabaah Yaumiyyah).
export const GRUP_UNIT: Record<string, string[]> = { kitab: KITAB_KEYS, pidato: ['arab', 'inggris', 'pidato'] };

const DEFAULTS = {
  umum: {
    judul: 'RAPOR SANTRI', sub: 'PESANTREN NURUL ISLAM TENGARAN', tempat: 'Tengaran', tanggal: '',
    kabid_nama: 'Abdul Fattah Ismail Farros, Lc., M.IRKH', kabid_jabatan: 'Kepala Bidang Kepesantrenan', kkm: 75,
    sekolah: { SMP: 'SMP IT NURUL ISLAM TENGARAN', SMA: 'SMA IT NURUL ISLAM TENGARAN', MA: 'MA NURUL ISLAM TENGARAN' },
    hadis_target: { '7': 10, '8': 20, '9': 30, '10': 10, '11': 20, '12': 30 },
  },
};

function periodOf(body: any) {
  const ta = String(body.ta || ''); const sem = Number(body.sem);
  if (!/^\d{4}\/\d{4}$/.test(ta) || Number(ta.slice(5)) !== Number(ta.slice(0, 4)) + 1 || ![1, 2].includes(sem)) throw fail('Tahun ajaran atau semester tidak valid.');
  return { ta, sem };
}

const LETTER = /^(A|B\+|B|C)$/;
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
      if (typeof v === 'string') { const s = v.trim().toUpperCase(); if (!LETTER.test(s)) throw fail('Predikat harus A, B+, B, atau C.'); g[k] = s; }
      else if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100) g[k] = Math.round(v * 100) / 100;
      else throw fail('Nilai angka harus 0–100.');
    }
    out[group] = g;
  }
  return out;
}

async function autoSources(ids: string[], ta: string, sem: number) {
  const out: Record<string, any> = Object.fromEntries(ids.map((id) => [id, {}]));
  if (!ids.length) return out;
  // Mutabaah Yaumiyyah (isian bulanan, 8 ibadah = aspek Ibadah rapor) → saran predikat: rata-rata nilai bulan yang terisi.
  const months = semesterMonths(Number(ta.slice(0, 4)), sem);
  const bulanan = (await q(`SELECT santri_id,bulan AS month,aktivitas AS values,izin FROM yaumiyyah.bulanan
    WHERE santri_id=ANY($1::text[]) AND bulan=ANY($2::text[])`, [ids, months])).rows;
  const by = new Map<string, any[]>();
  for (const r of bulanan) (by.get(r.santri_id) ?? by.set(r.santri_id, []).get(r.santri_id)!).push(r);
  for (const [id, entries] of by) {
    const rep = semesterReport(months, entries);
    const ibadah: Record<string, number> = {};
    for (const row of rep.rows) if (row.score != null) ibadah[row.rapor] = row.score;
    out[id].yaumiyyah = { skor: ibadah, bulan: rep.bulanTerisi, sementara: rep.provisional };
  }
  // Ujian Praktik Ibadah → nilai tiap subujian (wudhu, tayamum, lisan, …) pada periode tahun ajaran & semester yang sama.
  const ent = (await q(`SELECT n.santri_id,n.nilai,p.nama FROM ujian_praktik.nilai n JOIN ujian_praktik.periode p ON p.id=n.periode_id
      WHERE p.tahun_ajaran=$1 AND p.semester=$2 AND n.santri_id=ANY($3::text[]) ORDER BY p.dibuat_pada`, [ta, sem, ids])).rows;
  for (const e of ent) out[e.santri_id].praktik = { nilai: { ...(out[e.santri_id].praktik?.nilai || {}), ...(e.nilai || {}) }, periode: e.nama };
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
  s.koordinator ??= KOOR_DEFAULT;
  if (/Farras/.test(s.umum.kabid_nama || '')) s.umum.kabid_nama = DEFAULTS.umum.kabid_nama;
  return s;
}

// Daftar kamar yang dapat dibuka; ampu = kamar binaan sendiri, penuh = boleh mengisi semua kelompok nilai.
async function kamarList(a: Actor, ta: string, sem: number) {
  return (await q(`SELECT k.id,k.nama,k.unit,k.lingkungan,k.tingkat,k.wali_username,coalesce(w.nama,k.wali_label) AS wali_nama,k.urut,
        (coalesce(k.wali_username=$1,false) OR coalesce(bool_or(g.wali_username=$1),false)) AS ampu,
        ($2 OR coalesce(k.wali_username=$1,false) OR coalesce(bool_or(g.wali_username=$1),false) OR ${KAMAR_UNIT}=ANY($6::text[])) AS penuh,
        count(s.id) FILTER (WHERE $2 OR coalesce(g.wali_username,k.wali_username)=$1 OR ${KAMAR_UNIT}=ANY($5::text[]))::int AS jumlah,
        count(n.santri_id) FILTER (WHERE $2 OR coalesce(g.wali_username,k.wali_username)=$1 OR ${KAMAR_UNIT}=ANY($5::text[]))::int AS terisi,
        count(n.santri_id) FILTER (WHERE n.data ? 'kitab' AND n.data->'kitab'<>'{}'::jsonb)::int AS kitab_terisi,
        count(n.santri_id) FILTER (WHERE n.data ? 'pidato' AND n.data->'pidato'<>'{}'::jsonb)::int AS pidato_terisi
        FROM rapor_pesantren.kamar k LEFT JOIN public.akun w ON w.username=k.wali_username
        LEFT JOIN rapor_pesantren.anggota g ON g.kamar_id=k.id LEFT JOIN public.santri s ON s.id=g.santri_id AND s.aktif
        LEFT JOIN rapor_pesantren.nilai n ON n.santri_id=s.id AND n.tahun_ajaran=$3 AND n.semester=$4
        WHERE k.aktif AND ($2 OR k.wali_username=$1 OR ${KAMAR_UNIT}=ANY($5::text[]) OR EXISTS (SELECT 1 FROM rapor_pesantren.anggota x WHERE x.kamar_id=k.id AND x.wali_username=$1))
        GROUP BY k.id,w.nama ORDER BY k.lingkungan,array_position(ARRAY['SMP','SMA','MA'],k.unit),k.tingkat::int,k.urut`, [a.username, a.admin, ta, sem || 0, a.units, a.koordinator])).rows;
}
// Santri satu kamar beserta hak penuh per santri.
async function kamarStudents(a: Actor, kamarId: string, ta: string, sem: number) {
  const args: unknown[] = [kamarId, ta, sem];
  const scope = scopeSql(a, args), penuh = penuhSql(a, args);
  return (await q(`SELECT s.id,s.nama,s.unit,s.tingkat,s.halaqah,g.wali_username,coalesce(gw.nama,kw.nama,k.wali_label) AS wali_nama,
        n.data,n.version,n.updated_at,n.updated_by,coalesce(${penuh},false) AS penuh
        FROM rapor_pesantren.anggota g JOIN rapor_pesantren.kamar k ON k.id=g.kamar_id JOIN public.santri s ON s.id=g.santri_id AND s.aktif
        LEFT JOIN public.akun gw ON gw.username=g.wali_username LEFT JOIN public.akun kw ON kw.username=k.wali_username
        LEFT JOIN rapor_pesantren.nilai n ON n.santri_id=s.id AND n.tahun_ajaran=$2 AND n.semester=$3
        WHERE g.kamar_id=$1 AND ${scope} ORDER BY s.nama`, args)).rows;
}

async function handle(path: string, a: Actor, body: any) {
  if (path === 'boot') {
    let ta = '', sem = 0;
    try { ({ ta, sem } = periodOf(body)); } catch { /* tanpa periode: jumlah terisi tidak dihitung */ }
    const kamars = await kamarList(a, ta, sem);
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
    const kamar = (await q(`SELECT k.*,coalesce(w.nama,k.wali_label) AS wali_nama FROM rapor_pesantren.kamar k LEFT JOIN public.akun w ON w.username=k.wali_username WHERE k.id=$1`, [body.kamar])).rows[0];
    if (!kamar) throw fail('Kamar tidak ditemukan.', 404);
    const students = await kamarStudents(a, body.kamar, ta, sem);
    if (!a.admin && !students.length) throw fail('Kamar ini bukan binaan atau unit akun Anda.', 403);
    kamar.ampu = !a.admin && (kamar.wali_username === a.username || students.some((s: any) => s.wali_username === a.username));
    kamar.penuh = students.every((s: any) => s.penuh);
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
        const scope = scopeSql(a, args), penuhQ = penuhSql(a, args);
        const hak = (await client.query(`SELECT coalesce(${penuhQ},false) AS penuh FROM rapor_pesantren.anggota g JOIN rapor_pesantren.kamar k ON k.id=g.kamar_id JOIN public.santri s ON s.id=g.santri_id AND s.aktif WHERE g.santri_id=$1 AND ${scope}`, args)).rows[0];
        if (!hak) throw fail('Ada santri di luar kamar binaan atau unit Anda.', 403);
        if (!hak.penuh) {
          // Kamar lain di unit yang sama: hanya Kajian Kitab & Pidato yang boleh berubah; kelompok lain tetap seperti tersimpan.
          const lama = (await client.query('SELECT data FROM rapor_pesantren.nilai WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3', [id, ta, sem])).rows[0]?.data || {};
          const baru: Record<string, any> = {}; for (const g of Object.keys(GRUP_UNIT)) baru[g] = data[g];
          for (const key of Object.keys(data)) delete data[key]; Object.assign(data, lama);
          for (const g of Object.keys(GRUP_UNIT)) { if (baru[g] && Object.keys(baru[g]).length) data[g] = baru[g]; else delete data[g]; }
        }
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
  // Mutabaah Yaumiyyah (aplikasi baru): binaan musyrif, anggota kamar yang diwalikan, atau seluruh unit koordinator.
  const gm = /^yaum-(kitab|pidato)-(kamar|load|save)$/.exec(path);
  if (gm) return nilaiUnit(gm[1], gm[2], a, body);
  if (path.startsWith('yaum-')) return yaumiyyah(path, a, body);
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
    if (!['umum', 'kurikulum', 'koordinator'].includes(body.key) || !body.value || typeof body.value !== 'object' || Array.isArray(body.value) || JSON.stringify(body.value).length > 20000) throw fail('Pengaturan tidak valid.');
    if (body.key === 'koordinator') {
      for (const [u, units] of Object.entries(body.value)) if (!/^[\w.@-]{1,120}$/.test(u) || !Array.isArray(units) || (units as any[]).some((x) => !KOOR_UNITS.includes(x))) throw fail('Daftar koordinator tidak valid.');
      koorCache = null;
    }
    await q(`INSERT INTO rapor_pesantren.pengaturan(key,value,updated_by) VALUES($1,$2::jsonb,$3) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=now()`, [body.key, JSON.stringify(body.value), a.username]);
    return { settings: await settings() };
  }
  throw fail('Rute tidak dikenal.', 404);
}

// Nilai Kajian Kitab (hasil ujian semester kitab) & Pidato dari Mutabaah Yaumiyyah, 0–100. Disimpan ke rapor_pesantren.nilai
// kelompok 'kitab' / 'pidato' — satu sumber dengan Rapor Pesantren. Hanya butir yang diubah yang digabung (tidak menimpa nilai lain).
async function nilaiUnit(grup: string, aksi: string, a: Actor, body: any) {
  const KUNCI = GRUP_UNIT[grup];
  const { ta, sem } = periodOf(body);
  if (aksi === 'kamar') return { user: { username: a.username, nama: a.nama, admin: a.admin, koordinator: a.koordinator }, kamars: await kamarList(a, ta, sem), kurikulum: (await settings()).kurikulum || {} };
  if (aksi === 'load') {
    if (typeof body.kamar !== 'string' || body.kamar.length > 120) throw fail('Pilih kamar.');
    const students = await kamarStudents(a, body.kamar, ta, sem);
    if (!a.admin && !students.length) throw fail('Kamar ini bukan binaan atau unit akun Anda.', 403);
    return { students: students.map((s: any) => ({ id: s.id, nama: s.nama, unit: s.unit, tingkat: s.tingkat, nilai: s.data?.[grup] || {}, kitab: s.data?.kitab || {}, updated_by: s.updated_by, updated_at: s.updated_at })) };
  }
  if (aksi === 'save') {
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > 80) throw fail('Maksimal 80 santri per simpan.');
    const client = await (await getPool()).connect();
    const saved: any[] = [];
    try {
      await client.query('BEGIN');
      for (const item of body.items) {
        const id = String(item.santri_id || '');
        const ubah = item.nilai ?? item.kitab;
        if (!ubah || typeof ubah !== 'object' || Array.isArray(ubah)) throw fail('Data nilai tidak valid.');
        for (const [k, v] of Object.entries(ubah)) {
          if (!KUNCI.includes(k)) throw fail(grup === 'kitab' ? 'Kitab tidak dikenal.' : 'Butir pidato tidak dikenal.');
          if (v !== null && !(typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100)) throw fail('Nilai harus 0–100.');
        }
        const args: unknown[] = [id];
        const ok = (await client.query(`SELECT 1 FROM rapor_pesantren.anggota g JOIN rapor_pesantren.kamar k ON k.id=g.kamar_id JOIN public.santri s ON s.id=g.santri_id AND s.aktif WHERE g.santri_id=$1 AND ${scopeSql(a, args)}`, args)).rows.length;
        if (!ok) throw fail('Ada santri di luar kamar binaan atau unit Anda.', 403);
        await client.query(`INSERT INTO rapor_pesantren.nilai(santri_id,tahun_ajaran,semester,data,updated_by) VALUES($1,$2,$3,'{}'::jsonb,$4) ON CONFLICT DO NOTHING`, [id, ta, sem, a.username]);
        const lama = (await client.query('SELECT data FROM rapor_pesantren.nilai WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3 FOR UPDATE', [id, ta, sem])).rows[0].data || {};
        const kb: Record<string, number> = { ...(lama[grup] || {}) };
        for (const [k, v] of Object.entries(ubah)) { if (v === null) delete kb[k]; else kb[k] = Math.round((v as number) * 100) / 100; }
        const data = { ...lama, [grup]: kb };
        const r = (await client.query(`UPDATE rapor_pesantren.nilai SET data=$4::jsonb,updated_by=$5,updated_at=now(),version=gen_random_uuid()
            WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3 RETURNING santri_id,data->$6 AS nilai,updated_at,updated_by`, [id, ta, sem, JSON.stringify(data), a.username, grup])).rows[0];
        await client.query('INSERT INTO rapor_pesantren.audit(username,aksi,ref,data) VALUES($1,$2,$3,$4::jsonb)', [a.username, grup, `${id}|${ta}|${sem}`, JSON.stringify(ubah)]);
        saved.push(r);
      }
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    return { saved };
  }
  throw fail('Rute tidak dikenal.', 404);
}

// Santri Mutabaah Yaumiyyah mengikuti KAMAR (wali kamar / wali anggota), bukan halaqah tahfidz (26 Nov 2026).
// Koordinator unit & pimpinan tetap seluruh unitnya.
function yaumScope(a: Actor, args: unknown[]) {
  if (a.admin) return 'true';
  args.push(a.koordinator, a.username);
  const k = args.length - 1, w = args.length;
  return `(s.unit=ANY($${k}::text[])
    OR EXISTS (SELECT 1 FROM rapor_pesantren.anggota g JOIN rapor_pesantren.kamar k ON k.id=g.kamar_id WHERE g.santri_id=s.id AND coalesce(g.wali_username,k.wali_username)=$${w}))`;
}
async function yaumiyyah(path: string, a: Actor, body: any) {
  if (path === 'yaum-students') {
    const args: unknown[] = [];
    const scope = yaumScope(a, args); args.push(a.username);
    const students = (await q(`SELECT s.id,s.nama,s.tingkat AS kelas,s.unit,s.halaqah,s.musyrif,coalesce(k.nama,'') AS kamar,g.kamar_id,
      coalesce(gw.nama,kw.nama,k.wali_label,'') AS wali,coalesce(coalesce(g.wali_username,k.wali_username)=$${args.length},false) AS ampu FROM public.santri s
      LEFT JOIN rapor_pesantren.anggota g ON g.santri_id=s.id LEFT JOIN rapor_pesantren.kamar k ON k.id=g.kamar_id
      LEFT JOIN public.akun gw ON gw.username=g.wali_username LEFT JOIN public.akun kw ON kw.username=k.wali_username
      WHERE s.aktif AND ${scope} ORDER BY array_position(ARRAY['SMP Ikhwan','SMA Ikhwan','MA Ikhwan','SMP Akhwat','SMA Akhwat','MA Akhwat'],s.unit),s.tingkat,k.urut,k.nama,s.nama LIMIT 5000`, args)).rows;
    return { user: { username: a.username, nama: a.nama, admin: a.admin, koordinator: a.koordinator }, students };
  }
  if (path === 'yaum-rekap-kamar') {
    // Rekap ibadah satu kamar (seluruh santri kamar yang boleh diakses) untuk 1–6 bulan.
    if (typeof body.kamar !== 'string' || !body.kamar || body.kamar.length > 120) throw fail('Pilih kamar.');
    if (!Array.isArray(body.months) || body.months.length < 1 || body.months.length > 6 || new Set(body.months).size !== body.months.length || !body.months.every((m: any) => validMonth(String(m)))) throw fail('Pilih maksimal enam bulan.');
    const args: unknown[] = [body.kamar];
    const students = (await q(`SELECT s.id,s.nama,s.tingkat AS kelas,s.unit FROM public.santri s JOIN rapor_pesantren.anggota g0 ON g0.santri_id=s.id
      WHERE g0.kamar_id=$1 AND s.aktif AND ${yaumScope(a, args)} ORDER BY s.nama`, args)).rows;
    if (!students.length) throw fail('Kamar ini bukan binaan atau unit Anda.', 403);
    const entries = (await q(`SELECT santri_id,bulan AS month,aktivitas AS values,izin FROM yaumiyyah.bulanan WHERE santri_id=ANY($1::text[]) AND bulan=ANY($2::text[])`, [students.map((x: any) => x.id), body.months])).rows;
    return { students, entries };
  }
  const id = String(body.santri_id || '');
  if (!id || id.length > 150) throw fail('Pilih santri.');
  const args: unknown[] = [id];
  const student = (await q(`SELECT s.id,s.nama,s.tingkat AS kelas,s.unit,s.musyrif FROM public.santri s WHERE s.id=$1 AND s.aktif AND ${yaumScope(a, args)}`, args)).rows[0];
  if (!student) throw fail('Santri tidak termasuk binaan atau unit Anda.', 403);
  if (path === 'yaum-load') {
    if (!Array.isArray(body.months) || body.months.length < 1 || body.months.length > 6 || new Set(body.months).size !== body.months.length || !body.months.every((m: any) => validMonth(String(m)))) throw fail('Pilih maksimal enam bulan.');
    const entries = (await q(`SELECT bulan AS month,aktivitas AS values,izin,catatan AS note,version FROM yaumiyyah.bulanan WHERE santri_id=$1 AND bulan=ANY($2::text[]) ORDER BY bulan`, [id, body.months])).rows;
    return { student, entries };
  }
  if (path === 'yaum-save') {
    let entry;
    try { entry = validateMonth(body.entry || {}); } catch (e: any) { throw fail(e.message); }
    const version = body.entry?.version ?? null;
    if (version !== null && !/^[0-9a-f-]{36}$/i.test(version)) throw fail('Versi data tidak valid.');
    const vals: unknown[] = [id, entry.month, JSON.stringify(entry.values), entry.izin, entry.note, a.username, version];
    const scope = yaumScope(a, vals);
    const rows = (await q(`WITH saved AS (INSERT INTO yaumiyyah.bulanan(santri_id,bulan,aktivitas,izin,catatan,updated_by)
        SELECT $1,$2,$3::jsonb,$4,$5,$6 FROM public.santri s WHERE s.id=$1 AND s.aktif AND ${scope}
        ON CONFLICT(santri_id,bulan) DO UPDATE SET aktivitas=excluded.aktivitas,izin=excluded.izin,catatan=excluded.catatan,updated_by=excluded.updated_by,updated_at=now(),version=gen_random_uuid()
        WHERE $7::uuid IS NOT NULL AND yaumiyyah.bulanan.version=$7::uuid RETURNING *),
      audit AS (INSERT INTO yaumiyyah.audit(username,santri_id,tanggal,bulan) SELECT updated_by,santri_id,(bulan||'-01')::date,bulan FROM saved)
      SELECT bulan AS month,aktivitas AS values,izin,catatan AS note,version FROM saved`, vals)).rows;
    if (!rows.length) throw fail('Isian bulan ini telah berubah di perangkat lain atau penugasan diperbarui. Muat ulang sebelum menyimpan.', 409);
    return { entry: rows[0] };
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
