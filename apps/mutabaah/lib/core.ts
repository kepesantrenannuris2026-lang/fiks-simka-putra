import { waFor, setDirektoriWa, direktoriWaTerisi } from "./waDirectory";
import { ARBAIN_TOTAL } from "./arbain";
import * as T from "./target";
import { q, tx } from "./db";
import * as U from "./util";
import { usernameFromName } from "./sync";
import { enqueue, setoranSheetRow, hafalanSheetRow, sertifikasiSheetRow, arbainSheetRow, akunSheetRow, importAkunOnly, gasConfigured, refreshMasterFromSheet, generateAkunMusyrif, getMeta } from "./sync";

const { norm, num, ymKey, barisToHal, barisToJuz, JUMLAH_PEKAN } = U;
export type User = { username: string; nama: string; role: string; musyrif_master: string };
export type Ctx = { kick: (job?: string) => Promise<void> };

/** Sesi bertahan sampai pengguna menekan Keluar: masa berlaku 365 hari, diperpanjang otomatis setiap dipakai. */
const SESSION_TTL_H = 24 * 365;

/* ============ cache ringan per-instance ============ */
let masterCache: { at: number; rows: any[] } | null = null;
/** Normalisasi teks di SQL (sama dengan fungsi norm di JS: spasi dirapikan, huruf kecil). */
const NS = (col: string) => `lower(regexp_replace(trim(coalesce(${col}, '')), '\\s+', ' ', 'g'))`;
export const isPimpinanUser = (u: User) => isPimpinan(u);
async function readMaster(): Promise<any[]> {
  if (masterCache && Date.now() - masterCache.at < 30000) return masterCache.rows;
  const rows = await q("SELECT id,nama,unit,tingkat,halaqah,halaqah_key,musyrif,program,keterangan FROM santri WHERE aktif ORDER BY urut, nama");
  masterCache = { at: Date.now(), rows };
  return rows;
}
const sessCache = new Map<string, { at: number; u: User }>();

/* ============ auth ============ */
export async function login(username: string, password: string) {
  const uname = norm(username);
  if (!uname) return { ok: false, msg: "Isi username." };
  let rows = await q("SELECT * FROM akun WHERE lower(username)=$1", [uname]);
  if (!rows.length) {
    const cnt = await q("SELECT count(*)::int AS n FROM akun");
    if (cnt[0].n === 0 && gasConfigured()) {
      await importAkunOnly();
      rows = await q("SELECT * FROM akun WHERE lower(username)=$1", [uname]);
    }
  }
  const a = rows[0];
  if (!a || String(a.password) !== String(password) || String(a.aktif).toUpperCase() === "N") return { ok: false, msg: "Username atau password salah." };
  const token = U.uid() + U.uid().slice(0, 8);
  const user: User = { username: a.username, nama: a.nama, role: String(a.role).toLowerCase(), musyrif_master: a.musyrif_master || "" };
  await q("INSERT INTO sesi (token, data, expires_at) VALUES ($1,$2, now() + interval '" + SESSION_TTL_H + " hours')", [token, JSON.stringify(user)]);
  q("DELETE FROM sesi WHERE expires_at < now()").catch(() => {});
  const santriCount = await q("SELECT count(*)::int AS n FROM santri");
  return { ok: true, token, user, perlu_impor: santriCount[0].n === 0 };
}
export async function auth(token: string): Promise<User> {
  if (!token) throw new Error("Sesi berakhir, silakan login kembali.");
  const c = sessCache.get(token);
  if (c && Date.now() - c.at < 60000) return c.u;
  // Satu kueri: ambil sesi, dan perpanjang masa berlakunya bila tersisa < 358 hari (paling sering sekali sepekan per perangkat).
  const r = await q(`WITH s AS (SELECT data FROM sesi WHERE token=$1 AND expires_at > now()),
    p AS (UPDATE sesi SET expires_at = now() + interval '${SESSION_TTL_H} hours' WHERE token=$1 AND expires_at > now() AND expires_at < now() + interval '358 days')
    SELECT data FROM s`, [token]);
  if (!r.length) { sessCache.delete(token); throw new Error("Sesi berakhir, silakan login kembali."); }
  sessCache.set(token, { at: Date.now(), u: r[0].data });
  return r[0].data;
}
export async function logout(token: string) {
  sessCache.delete(token);
  await q("DELETE FROM sesi WHERE token=$1", [token]);
  return { ok: true };
}
const isPimpinan = (u: User) => u.role === "pimpinan" || u.role === "admin";

const santriMusyrifCache = new Map<string, { at: number; rows: any[] }>();
/** Simpan sementara hasil kueri yang jarang berubah (riwayat keanggotaan) agar tidak dibaca berulang dalam satu tampilan. */
const memoQCache = new Map<string, { at: number; p: Promise<any[]> }>();
function memoQ(sql: string, params: any[], ttl = 60000): Promise<any[]> {
  const k = sql + "|" + JSON.stringify(params), c = memoQCache.get(k);
  if (c && Date.now() - c.at < ttl) return c.p;
  const pr = q(sql, params); memoQCache.set(k, { at: Date.now(), p: pr }); pr.catch(() => memoQCache.delete(k));
  if (memoQCache.size > 200) memoQCache.clear();
  return pr;
}
async function santriForUser(u: User) {
  if (isPimpinan(u)) return readMaster();
  // Hemat egress: musyrif hanya membaca santri halaqahnya sendiri (disaring di database).
  const key = norm(u.musyrif_master || u.nama);
  const c = santriMusyrifCache.get(key);
  if (c && Date.now() - c.at < 30000) return c.rows;
  const rows = await q(`SELECT id,nama,unit,tingkat,halaqah,halaqah_key,musyrif,program,keterangan FROM santri WHERE aktif AND ${NS("musyrif")} = $1 ORDER BY urut, nama`, [key]);
  santriMusyrifCache.set(key, { at: Date.now(), rows });
  return rows;
}

export async function getHalaqahList(u: User) {
  const map: Record<string, any> = {};
  (await santriForUser(u)).forEach((s) => {
    if (!map[s.halaqah_key]) map[s.halaqah_key] = { key: s.halaqah_key, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif, jumlah: 0 };
    map[s.halaqah_key].jumlah++;
  });
  const my = norm(u.musyrif_master || u.nama);
  (await q("SELECT key, unit, tingkat, halaqah, musyrif FROM halaqah_def")).forEach((d: any) => {
    if (map[d.key] || (!isPimpinan(u) && norm(d.musyrif) !== my)) return;
    map[d.key] = { key: d.key, unit: d.unit, tingkat: d.tingkat, halaqah: d.halaqah, musyrif: d.musyrif, jumlah: 0 };
  });
  return Object.values(map).sort((a: any, b: any) => {
    const oa = U.UNIT_ORDER.indexOf(a.unit), ob = U.UNIT_ORDER.indexOf(b.unit);
    if (oa !== ob) return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
    if (Number(a.tingkat) !== Number(b.tingkat)) return Number(a.tingkat) - Number(b.tingkat);
    return String(a.halaqah).localeCompare(String(b.halaqah), "id", { numeric: true });
  });
}

/* ============ setoran ============ */
function parseRow(r: any) {
  const d = r.dicatat_pada ? new Date(r.dicatat_pada) : null;
  return {
    ...r,
    nilai_tahsin: r.nilai_tahsin == null ? null : Number(r.nilai_tahsin),
    nilai_ziyadah: r.nilai_ziyadah == null ? null : Number(r.nilai_ziyadah),
    nilai_murajaah: r.nilai_murajaah == null ? null : Number(r.nilai_murajaah),
    dicatat_pada_str: d ? U.wibString(d) : "",
  };
}
type Filter = { dari?: string; sampai?: string; tahun?: number; bulan?: number; pekan?: number; santri_id?: string; halaqah_key?: string };
const DASH_COLS = "ym, tahun, bulan, pekan, santri_id, santri_nama, unit, tingkat, halaqah, halaqah_key, musyrif, dicatat_oleh, hadir, sakit, izin, alfa, tahsin_baris, ziyadah_baris, murajaah_baris, nilai_tahsin, nilai_ziyadah, nilai_murajaah";
async function loadRows(u: User, f: Filter) {
  const where: string[] = [], p: any[] = [];
  const add = (sql: string, v: any) => { p.push(v); where.push(sql.replace("?", "$" + p.length)); };
  if (f.dari) add("ym >= ?", f.dari);
  if (f.sampai) add("ym <= ?", f.sampai);
  if (f.tahun) add("tahun = ?", Number(f.tahun));
  if (f.bulan) add("bulan = ?", Number(f.bulan));
  if (f.pekan) add("pekan = ?", Number(f.pekan));
  if (f.santri_id) add("santri_id = ?", String(f.santri_id));
  const sc = U.parseScope(f.halaqah_key);
  if (sc?.hk) add("halaqah_key = ?", sc.hk);
  if (sc?.unit) add("unit = ?", sc.unit);
  if (sc?.jenjang) add("upper(split_part(trim(unit), ' ', 1)) = ?", sc.jenjang);
  if (sc?.tingkat) add("tingkat = ?", sc.tingkat);
  if (sc?.gender) add("unit ILIKE ?", "%" + sc.gender + "%");
  if (!isPimpinan(u)) {
    const own = (await santriForUser(u)).map((s: any) => s.id);
    p.push(own); const i1 = p.length; p.push(norm(u.username)); const i2 = p.length; p.push(norm(u.musyrif_master || u.nama)); const i3 = p.length;
    where.push(`(santri_id = ANY($${i1}) OR ${NS("dicatat_oleh")} = $${i2} OR ${NS("musyrif")} = $${i2} OR ($${i3} <> '' AND ${NS("musyrif")} = $${i3}))`);
  }
  const W = where.length ? " WHERE " + where.join(" AND ") : "";
  let raw: any[];
  if ((f as any).cols === DASH_COLS) {
    // Hemat egress: teks identitas (nama, unit, halaqah, musyrif, pencatat) hanya dikirim sekali per kelompok yang sama.
    const TX = ["santri_nama", "unit", "tingkat", "halaqah", "halaqah_key", "musyrif", "dicatat_oleh"], tl = TX.join(", ");
    raw = await q(`SELECT ym, tahun, bulan, pekan, santri_id, hadir, sakit, izin, alfa, tahsin_baris, ziyadah_baris, murajaah_baris, nilai_tahsin, nilai_ziyadah, nilai_murajaah,
        dense_rank() OVER (ORDER BY ${tl}) AS g_,
        CASE WHEN row_number() OVER (PARTITION BY ${tl} ORDER BY ym, pekan, santri_id) = 1 THEN json_build_array(${tl}) END AS t_
      FROM setoran${W} ORDER BY ym, pekan, santri_id`, p);
    const kamus: Record<string, any[]> = {};
    raw.forEach((r: any) => { if (r.t_) kamus[r.g_] = r.t_; });
    raw = raw.map((r: any) => { const t = kamus[r.g_] || [], o: any = { ...r }; TX.forEach((k, i) => (o[k] = t[i] ?? "")); delete o.g_; delete o.t_; return o; });
  } else raw = await q(`SELECT ${(f as any).cols || "*"} FROM setoran${W} ORDER BY ym, pekan, santri_id`, p);
  const rows = raw.map(parseRow);
  if (isPimpinan(u)) return rows;
  const allowed: Record<string, boolean> = {};
  (await santriForUser(u)).forEach((s) => (allowed[s.id] = true));
  const uname = norm(u.username), my = norm(u.musyrif_master || u.nama);
  return rows.filter((r) => allowed[r.santri_id] || norm(r.dicatat_oleh) === uname || norm(r.musyrif) === uname || (my && norm(r.musyrif) === my));
}

function snapshot(r: any) {
  return {
    id: String(r.santri_id || r.id || ""), nama: String(r.santri_nama || r.nama || ""), unit: r.unit || "", tingkat: r.tingkat || "",
    halaqah: r.halaqah || "", halaqah_key: r.halaqah_key || U.halaqahKey(r.unit, r.tingkat, r.halaqah), musyrif: r.musyrif || "",
    program: r.program || "", keterangan: r.keterangan || "",
  };
}

async function memberMapByMonth(u: User, months: string[], hk: string | undefined, rows: any[]) {
  const current = await santriForUser(u);
  const out: Record<string, Record<string, any>> = {}, has: Record<string, boolean> = {};
  months.forEach((m) => (out[m] = {}));
  const my = norm(u.musyrif_master || u.nama);
  // Bulan yang sudah punya catatan keanggotaan (cukup daftar bulannya saja)
  if (months.length) (await memoQ("SELECT DISTINCT ym FROM keanggotaan_histori WHERE ym = ANY($1)", [[...months].sort()])).forEach((r: any) => (has[r.ym] = true));
  // Dibaca per bulan agar bulan yang sama cukup dibaca sekali (dipakai ulang oleh dashboard & kartu pekan).
  const hw: string[] = ["ym = $1"], hp: any[] = [];
  const hadd = (sql: string, v: any) => { hp.push(v); hw.push(sql.replace("?", "$" + (hp.length + 1))); };
  if (!isPimpinan(u)) { hp.push(my, norm(u.username)); hw.push(`${NS("musyrif")} IN ($2, $3)`); }
  else if (hk) {
    const sc = U.parseScope(hk);
    if (sc?.hk) hadd("halaqah_key = ?", sc.hk);
    if (sc?.unit) hadd("unit = ?", sc.unit);
    if (sc?.jenjang) hadd("upper(split_part(trim(unit), ' ', 1)) = ?", sc.jenjang);
    if (sc?.tingkat) hadd("tingkat = ?", sc.tingkat);
    if (sc?.gender) hadd("unit ILIKE ?", "%" + sc.gender + "%");
  }
  const HG = "unit, tingkat, halaqah, halaqah_key, musyrif";
  const hsql = `SELECT ym, santri_id, nama, program, keterangan, dense_rank() OVER (ORDER BY ${HG}) AS g_,
      CASE WHEN row_number() OVER (PARTITION BY ${HG} ORDER BY santri_id) = 1 THEN json_build_array(${HG}) END AS t_
    FROM keanggotaan_histori WHERE ${hw.join(" AND ")}`;
  const buka = (rows: any[]) => {
    const kamus: Record<string, any[]> = {};
    rows.forEach((r: any) => { if (r.t_) kamus[r.g_] = r.t_; });
    return rows.map((r: any) => { const t = kamus[r.g_] || []; return { ym: r.ym, santri_id: r.santri_id, nama: r.nama, program: r.program, keterangan: r.keterangan, unit: t[0] ?? "", tingkat: t[1] ?? "", halaqah: t[2] ?? "", halaqah_key: t[3] ?? "", musyrif: t[4] ?? "" }; });
  };
  const hist = ([] as any[]).concat(...(await Promise.all(months.map((m) => (has[m] ? memoQ(hsql, [m, ...hp]).then(buka) : Promise.resolve([]))))));
  hist.forEach((h: any) => {
    if (!isPimpinan(u) && norm(h.musyrif) !== my && norm(h.musyrif) !== norm(u.username)) return;
    if (hk && !U.inScope(h, hk)) return;
    out[h.ym][h.santri_id] = { id: h.santri_id, nama: h.nama, unit: h.unit, tingkat: h.tingkat, halaqah: h.halaqah, halaqah_key: h.halaqah_key, musyrif: h.musyrif, program: h.program, keterangan: h.keterangan };
  });
  months.forEach((m) => { if (!has[m]) current.forEach((s) => { if (!hk || U.inScope(s, hk)) out[m][s.id] = s; }); });
  rows.forEach((r) => { if (!out[r.ym] || (hk && !U.inScope(r, hk))) return; out[r.ym][r.santri_id] = snapshot(r); });
  return out;
}

export async function getSetoranFormData(u: User, tahun: any, bulan: any, pekan: any, hk?: string) {
  tahun = U.requiredInt(tahun, "Tahun", 2000, 2100);
  bulan = U.requiredInt(bulan, "Bulan", 1, 12);
  pekan = U.requiredInt(pekan, "Pekan", 1, JUMLAH_PEKAN);
  let santri = await santriForUser(u);
  if (hk) santri = santri.filter((s) => s.halaqah_key === hk);
  const monthRows = await loadRows(u, { tahun, bulan, halaqah_key: hk });
  const hafalan = await totalHafalanMap(santri);
  const total = santri.length, hit: Record<number, Record<string, boolean>> = {}, last: Record<number, string> = {};
  for (let p = 1; p <= JUMLAH_PEKAN; p++) { hit[p] = {}; last[p] = ""; }
  monthRows.forEach((r) => { if (!hit[r.pekan]) return; hit[r.pekan][r.santri_id] = true; if (r.dicatat_pada_str > last[r.pekan]) last[r.pekan] = r.dicatat_pada_str; });
  const now = U.nowWib(), ym = ymKey(tahun, bulan), due = U.completedWeeks(tahun, bulan);
  const berjalan = ym === now.ym ? U.pekanForDay(now.hari) : ym < now.ym ? JUMLAH_PEKAN : 0;
  const status: Record<number, any> = {};
  for (let p = 1; p <= JUMLAH_PEKAN; p++) {
    const terisi = Object.keys(hit[p]).length;
    status[p] = { terisi, total, terakhir: last[p], lengkap: total > 0 && terisi >= total, sebagian: terisi > 0 && terisi < total, wajib: p <= due, dapat_diisi: p <= berjalan };
  }
  const map: Record<string, any> = {};
  monthRows.filter((r) => r.pekan === pekan).forEach((r) => (map[r.santri_id] = r));
  const rows = santri.map((x) => {
    const r = map[x.id];
    return {
      santri_id: x.id, nama: x.nama, program: x.program, keterangan: x.keterangan, unit: x.unit, tingkat: x.tingkat, halaqah: x.halaqah,
      ada: !!r, hadir: r ? r.hadir : "", sakit: r ? r.sakit : "", izin: r ? r.izin : "", alfa: r ? r.alfa : "",
      tahsin: barisToHal(r ? r.tahsin_baris : 0), ziyadah: barisToHal(r ? r.ziyadah_baris : 0), murajaah: barisToHal(r ? r.murajaah_baris : 0),
      nilai_tahsin: r && r.nilai_tahsin != null ? r.nilai_tahsin : "", nilai_ziyadah: r && r.nilai_ziyadah != null ? r.nilai_ziyadah : "",
      nilai_murajaah: r && r.nilai_murajaah != null ? r.nilai_murajaah : "",
      ziyadah_surat: r ? r.ziyadah_surat : "", murajaah_juz: r ? r.murajaah_juz : "", catatan: r ? r.catatan : "",
      terakhir: r ? r.dicatat_pada_str : "", hafalan: hafalan[x.id]?.total?.teks || "0", lulus_target: !!hafalan[x.id]?.lulus_target, target_lulusan_juz: hafalan[x.id]?.target_juz,
    };
  });
  return { rows, pekan: status, total_santri: total, jumlah_pekan: JUMLAH_PEKAN, hari_pekan: U.daysInWeek(tahun, bulan, pekan), maks_kehadiran: U.MAKS_KEHADIRAN, pekan_berjalan: berjalan };
}

function validateAmount(d: any, prefix: string, label: string) {
  const hal = U.optionalInt(d[prefix + "_hal"], label + " (halaman)", 0, U.MAX_HAFALAN_BARIS / U.BARIS_PER_HAL);
  const baris = U.optionalInt(d[prefix + "_baris"], label + " (baris)", 0, U.BARIS_PER_HAL - 1);
  const t = U.halToBaris(hal, baris);
  if (t > U.MAX_HAFALAN_BARIS) throw new Error(label + " tidak boleh melebihi 30 juz.");
  return t;
}

/** Nilai setoran: huruf A/B+/B/C (baru) atau angka 0–100 (lama). */
function nilaiSetoran(v: any, label: string): any {
  if (v === "" || v == null) return null;
  const h = String(v).trim().toUpperCase();
  if (h in T.NILAI_HURUF) return { huruf: h };
  return U.optionalScore(v, label);
}

export async function saveSetoranBatch(u: User, periode: any, items: any[], ctx: Ctx) {
  periode = periode || {};
  const tahun = U.requiredInt(periode.tahun, "Tahun", 2000, 2100), bulan = U.requiredInt(periode.bulan, "Bulan", 1, 12);
  const pekan = U.requiredInt(periode.pekan, "Pekan", 1, JUMLAH_PEKAN);
  const n = U.nowWib(), ym = ymKey(tahun, bulan);
  if (ym > n.ym || (ym === n.ym && pekan > U.pekanForDay(n.hari))) throw new Error("Setoran untuk pekan yang belum dimulai tidak dapat disimpan.");
  if (!Array.isArray(items) || !items.length || items.length > 500) throw new Error("Jumlah data yang disimpan tidak valid.");
  const sm: Record<string, any> = {};
  (await santriForUser(u)).forEach((x) => (sm[x.id] = x));
  const seen: Record<string, boolean> = {};
  const valid = items.map((d) => {
    const id = String(d?.santri_id || ""), x = sm[id];
    if (!x) throw new Error("Ada santri yang bukan binaan Anda atau sudah tidak aktif. Muat ulang formulir.");
    if (seen[id]) throw new Error("Santri " + x.nama + " dikirim lebih dari sekali.");
    seen[id] = true;
    const L = x.nama + ": ";
    return {
      x, f: {
        hadir: U.optionalInt(d.hadir, L + "hadir", 0, U.MAKS_KEHADIRAN), sakit: U.optionalInt(d.sakit, L + "sakit", 0, U.MAKS_KEHADIRAN),
        izin: U.optionalInt(d.izin, L + "izin", 0, U.MAKS_KEHADIRAN), alfa: U.optionalInt(d.alfa, L + "alfa", 0, U.MAKS_KEHADIRAN),
        tahsin_baris: validateAmount(d, "tahsin", L + "tahsin"), ziyadah_baris: validateAmount(d, "ziyadah", L + "ziyadah"), murajaah_baris: validateAmount(d, "murajaah", L + "murajaah"),
        nilai_tahsin: nilaiSetoran(d.nilai_tahsin, L + "nilai tahsin"), nilai_ziyadah: nilaiSetoran(d.nilai_ziyadah, L + "nilai ziyadah"), nilai_murajaah: nilaiSetoran(d.nilai_murajaah, L + "nilai murajaah"),
        ziyadah_surat: U.safeText(d.ziyadah_surat, 300), murajaah_juz: U.safeText(d.murajaah_juz, 200), catatan: U.safeText(d.catatan, 1000),
      },
    };
  });
  await tx(async (run) => {
    const ids = valid.map((v) => v.x.id);
    const olds = await run("SELECT * FROM setoran WHERE ym=$1 AND pekan=$2 AND santri_id = ANY($3)", [ym, pekan, ids]);
    const om: Record<string, any> = {};
    olds.forEach((o) => (om[o.santri_id] = o));
    const now = new Date().toISOString();
    for (const v of valid) {
      const x = v.x, old = om[x.id];
      // Huruf yang tidak berubah dari nilai lama (mis. 88 = B+) tetap memakai angka lamanya.
      (["nilai_tahsin", "nilai_ziyadah", "nilai_murajaah"] as const).forEach((k) => {
        const f: any = v.f;
        if (f[k] && typeof f[k] === "object") f[k] = old && old[k] != null && T.hurufNilai(old[k]) === f[k].huruf ? Number(old[k]) : T.hurufKeNilai(f[k].huruf);
      });
      const rec: any = {
        id: old ? old.id : U.uid(), tahun, bulan, pekan, ym, santri_id: x.id, santri_nama: U.clip(x.nama, 200), unit: U.clip(x.unit, 100), tingkat: U.clip(x.tingkat, 30),
        halaqah: U.clip(x.halaqah, 100), halaqah_key: x.halaqah_key, musyrif: U.clip(x.musyrif, 200), dicatat_oleh: U.clip(u.username, 100), dicatat_pada: now, ...v.f,
      };
      const cols = Object.keys(rec);
      await run(`INSERT INTO setoran (${cols.join(",")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(",")})
        ON CONFLICT (ym, pekan, santri_id) DO UPDATE SET ${cols.filter((c) => !["id", "ym", "pekan", "santri_id"].includes(c)).map((c) => c + "=EXCLUDED." + c).join(",")}`, cols.map((c) => rec[c]));
      await enqueue(run, "Setoran", "upsert", setoranSheetRow(rec));
      await audit(run, u, old ? "UPDATE" : "CREATE", "Setoran", rec.id, old || null, rec);
    }
  });
  await ctx.kick();
  return { ok: true, count: valid.length, periode: { tahun, bulan, pekan } };
}

async function audit(run: any, u: User, aksi: string, entitas: string, id: string, before: any, after: any) {
  const b = before == null ? null : JSON.stringify(before), a = after == null ? null : JSON.stringify(after);
  await run("INSERT INTO audit (username, aksi, entitas, entitas_id, sebelum, sesudah) VALUES ($1,$2,$3,$4,$5,$6)", [u.username, aksi, entitas, id, b, a]);
  // Log perubahan cukup di database (tidak lagi dikirim ke Spreadsheet: hemat sel & lalu lintas data).
}

/* ============ agregasi ============ */
function emptyAgg() {
  return { hadir: 0, sakit: 0, izin: 0, alfa: 0, hari: 0, pekan: 0, expected: 0, tahsin: 0, ziyadah: 0, murajaah: 0, nt: 0, ntc: 0, nz: 0, nzc: 0, nm: 0, nmc: 0, catatan: [] as string[], target_z: 0, target_m: 0, target_keduanya: 0 };
}
function addAgg(a: any, r: any) {
  a.pekan++;
  if (r.nilai_tahsin != null) { a.nt += r.nilai_tahsin; a.ntc++; }
  if (r.nilai_ziyadah != null) { a.nz += r.nilai_ziyadah; a.nzc++; }
  if (r.nilai_murajaah != null) { a.nm += r.nilai_murajaah; a.nmc++; }
  a.hadir += r.hadir; a.sakit += r.sakit; a.izin += r.izin; a.alfa += r.alfa;
  a.hari += r.hadir + r.sakit + r.izin + r.alfa;
  a.tahsin += r.tahsin_baris; a.ziyadah += r.ziyadah_baris; a.murajaah += r.murajaah_baris;
  const t = U.targetStatus(r.ziyadah_baris, r.murajaah_baris);
  if (t.ziyadah) a.target_z++;
  if (t.murajaah) a.target_m++;
  if (t.tercapai) a.target_keduanya++;
  if (r.catatan) a.catatan.push("Pekan " + r.pekan + " (" + r.ym + "): " + r.catatan);
}
function finalizeAgg(a: any) {
  const din = Math.max(0, a.expected || 0), ter = Math.min(a.target_keduanya, din);
  const avg = (s: number, c: number) => (c ? Math.round(s / c) : null);
  return {
    hadir: a.hadir, sakit: a.sakit, izin: a.izin, alfa: a.alfa, hari: a.hari, pekan: a.pekan,
    persen_hadir: a.hari ? Math.round((a.hadir / a.hari) * 100) : 0,
    tahsin: barisToHal(a.tahsin), ziyadah: barisToHal(a.ziyadah), murajaah: barisToHal(a.murajaah),
    rata_pekan: {
      tahsin: barisToHal(a.pekan ? Math.round(a.tahsin / a.pekan) : 0), ziyadah: barisToHal(a.pekan ? Math.round(a.ziyadah / a.pekan) : 0),
      murajaah: barisToHal(a.pekan ? Math.round(a.murajaah / a.pekan) : 0),
    },
    nilai: {
      tahsin: avg(a.nt, a.ntc), ziyadah: avg(a.nz, a.nzc), murajaah: avg(a.nm, a.nmc),
      predikat: { tahsin: U.predikat(a.ntc ? a.nt / a.ntc : null), ziyadah: U.predikat(a.nzc ? a.nz / a.nzc : null), murajaah: U.predikat(a.nmc ? a.nm / a.nmc : null) },
    },
    target: {
      dinilai: din, terisi: a.pekan, ziyadah_tercapai: Math.min(a.target_z, din), murajaah_tercapai: Math.min(a.target_m, din),
      keduanya_tercapai: ter, belum_tercapai: Math.max(0, din - ter), belum_diisi: Math.max(0, din - a.pekan),
      persen: din ? Math.round((ter / din) * 100) : 0,
      minimal_ziyadah: barisToHal(U.TARGET_ZIYADAH_BARIS), minimal_murajaah: barisToHal(U.TARGET_MURAJAAH_BARIS),
    },
    catatan: a.catatan,
  };
}

/* ============ hafalan ============ */
async function hafalanAwalMap(ids: string[]) {
  const m: Record<string, any> = {};
  if (!ids.length) return m;
  (await q("SELECT santri_id, baris_awal, keterangan, baris_terverifikasi, terverifikasi_sampai_ym, target_juz, juz_selesai, juz_diuji FROM hafalan WHERE santri_id = ANY($1)", [ids])).forEach((r: any) => {
    m[r.santri_id] = {
      baris_awal: num(r.baris_awal), keterangan: r.keterangan || "", baris_terverifikasi: r.baris_terverifikasi == null ? null : num(r.baris_terverifikasi),
      terverifikasi_sampai_ym: r.terverifikasi_sampai_ym || "", target_juz: num(r.target_juz) || 0, juz_selesai: U.parseJuzList(r.juz_selesai), juz_diuji: U.parseJuzList(r.juz_diuji),
    };
  });
  return m;
}
async function totalHafalanMap(list: any[]) {
  const ids = list.map((s) => String(s.id));
  const awal = await hafalanAwalMap(ids);
  const zy: Record<string, number> = {};
  // Hemat egress: dijumlahkan di database. Baris bertanda surat dihitung maksimum per surat; sebelum batas verifikasi diabaikan.
  if (ids.length) (await q(`WITH r AS (
      SELECT s.santri_id, s.ziyadah_baris, ${NS("s.ziyadah_surat")} AS loc FROM setoran s LEFT JOIN hafalan h ON h.santri_id = s.santri_id
      WHERE s.ziyadah_baris > 0 AND s.santri_id = ANY($1)
        AND NOT (h.baris_terverifikasi IS NOT NULL AND coalesce(h.terverifikasi_sampai_ym, '') <> '' AND s.ym <= h.terverifikasi_sampai_ym))
    SELECT santri_id, sum(z)::int AS baris FROM (
      SELECT santri_id, sum(ziyadah_baris) AS z FROM r WHERE loc = '' GROUP BY santri_id
      UNION ALL SELECT santri_id, max(ziyadah_baris) FROM r WHERE loc <> '' GROUP BY santri_id, loc) t GROUP BY santri_id`, [ids]))
    .forEach((r: any) => (zy[r.santri_id] = Number(r.baris) || 0));
  const out: Record<string, any> = {};
  list.forEach((s) => {
    const h = awal[s.id] || {}, a = h.baris_awal || 0, z = zy[s.id] || 0;
    const basis = h.baris_terverifikasi != null ? h.baris_terverifikasi : a;
    const total = Math.min(U.MAX_HAFALAN_BARIS, basis + z);
    const js = h.juz_selesai || [];
    out[s.id] = {
      awal: barisToJuz(a), ziyadah: barisToJuz(z), total: barisToJuz(total), keterangan: h.keterangan || "",
      terverifikasi: h.baris_terverifikasi != null, terverifikasi_sampai_ym: h.terverifikasi_sampai_ym || "", basis: barisToJuz(basis),
      target_juz: T.targetLulusanJuz(s, h.target_juz), target_default: !(Number(h.target_juz) > 0 && Number(h.target_juz) !== 30), target_tersimpan: Number(h.target_juz) || 0,
      tahfidz: T.isTahfidz(s), lulus_target: total >= T.targetLulusanJuz(s, h.target_juz) * T.BARIS_PER_JUZ,
      juz_selesai: js, jumlah_juz_selesai: js.length, juz_diuji: (h.juz_diuji || []).filter((j: number) => js.includes(j)),
    };
  });
  return out;
}

async function findSantri(u: User, id: any) {
  const s = (await santriForUser(u)).find((x) => x.id === String(id));
  if (!s) throw new Error("Santri bukan binaan Anda.");
  return s;
}
async function upsertHafalan(u: User, s: any, patch: any, aksi: string, ctx: Ctx) {
  const res = await tx(async (run) => {
    const old = (await run("SELECT * FROM hafalan WHERE santri_id=$1 FOR UPDATE", [s.id]))[0] || null;
    const rec = {
      santri_id: s.id, santri_nama: U.clip(s.nama, 200), baris_awal: 0, keterangan: "", diperbarui_oleh: "", diperbarui_pada: null,
      baris_terverifikasi: null, terverifikasi_sampai_ym: "", terverifikasi_oleh: "", terverifikasi_pada: null, target_juz: 0, juz_selesai: "", juz_diuji: "",
      ...(old || {}), ...patch,
    };
    const cols = Object.keys(rec);
    await run(`INSERT INTO hafalan (${cols.join(",")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(",")})
      ON CONFLICT (santri_id) DO UPDATE SET ${cols.filter((c) => c !== "santri_id").map((c) => c + "=EXCLUDED." + c).join(",")}`, cols.map((c) => (rec as any)[c]));
    await enqueue(run, "Hafalan", "upsert", hafalanSheetRow(rec));
    await audit(run, u, (old ? "" : "CREATE_") + aksi, "Hafalan", s.id, old, rec);
    return rec;
  });
  await ctx.kick();
  return res;
}
export async function saveHafalanAwal(u: User, santri_id: any, juz: any, hal: any, baris: any, target_juz: any, keterangan: any, ctx: Ctx) {
  const s = await findSantri(u, santri_id);
  const total = U.juzToBaris(U.requiredInt(juz, "Juz", 0, 30), U.requiredInt(hal, "Halaman", 0, U.HAL_PER_JUZ - 1), U.requiredInt(baris, "Baris", 0, U.BARIS_PER_HAL - 1));
  if (total > U.MAX_HAFALAN_BARIS) throw new Error("Hafalan tidak boleh melebihi 30 juz.");
  const tj = target_juz === "" || target_juz == null || Number(target_juz) === 0 ? 0 : U.requiredInt(target_juz, "Target Juz", 1, 30);
  await upsertHafalan(u, s, { baris_awal: total, keterangan: U.safeText(keterangan, 1000), target_juz: tj, diperbarui_oleh: U.clip(u.username, 100), diperbarui_pada: new Date().toISOString() }, "UPDATE", ctx);
  return { ok: true, total: barisToJuz(total) };
}
export async function saveHafalanTerverifikasi(u: User, santri_id: any, juz: any, hal: any, baris: any, sampaiYm: any, keterangan: any, ctx: Ctx) {
  const s = await findSantri(u, santri_id);
  U.ymIndex(sampaiYm);
  if (sampaiYm > U.nowWib().ym) throw new Error("Bulan verifikasi tidak boleh melebihi bulan berjalan.");
  const total = U.juzToBaris(U.requiredInt(juz, "Juz", 0, 30), U.requiredInt(hal, "Halaman", 0, U.HAL_PER_JUZ - 1), U.requiredInt(baris, "Baris", 0, U.BARIS_PER_HAL - 1));
  if (total > U.MAX_HAFALAN_BARIS) throw new Error("Hafalan tidak boleh melebihi 30 juz.");
  await upsertHafalan(u, s, { baris_terverifikasi: total, terverifikasi_sampai_ym: sampaiYm, terverifikasi_oleh: U.clip(u.username, 100), terverifikasi_pada: new Date().toISOString(), keterangan: U.safeText(keterangan, 1000) }, "VERIFY", ctx);
  return { ok: true, total: barisToJuz(total), sampai: sampaiYm };
}
/** Peta juz: hijau = hafalan juz selesai, oranye = juz itu sudah diujikan (selalu bagian dari juz selesai). */
export async function saveJuzHafalan(u: User, santri_id: any, juzList: any, diujiList: any, ctx: Ctx) {
  const s = await findSantri(u, santri_id);
  const cek = (l: any) => {
    if (!Array.isArray(l)) throw new Error("Daftar juz tidak valid.");
    const n = l.map(Number);
    if (n.some((x) => !Number.isInteger(x) || x < 1 || x > 30) || new Set(n).size !== n.length) throw new Error("Juz hafalan harus berupa angka 1–30 tanpa duplikasi.");
    return U.parseJuzList(l);
  };
  const juz = cek(juzList);
  const patch: any = { juz_selesai: juz.join(","), diperbarui_oleh: U.clip(u.username, 100), diperbarui_pada: new Date().toISOString() };
  let diuji: number[] | null = null;
  if (diujiList != null) { diuji = cek(diujiList).filter((j) => juz.includes(j)); patch.juz_diuji = diuji.join(","); }
  await upsertHafalan(u, s, patch, "UPDATE_JUZ", ctx);
  return { ok: true, juz_selesai: juz, juz_diuji: diuji, jumlah: juz.length };
}

/* ============ dashboard ============ */
/** Berapa santri (dalam cakupan pengguna) yang sudah disetor pada pekan yang sedang berjalan. */
async function pekanIniStatus(u: User, hk?: string) {
  const n = U.nowWib(), pekan = U.pekanForDay(n.hari);
  const mem = (await memberMapByMonth(u, [n.ym], hk, []))[n.ym] || {};
  const ids = Object.keys(mem);
  const rows = ids.length ? await q("SELECT santri_id, ziyadah_baris, murajaah_baris FROM setoran WHERE ym=$1 AND pekan=$2 AND santri_id = ANY($3)", [n.ym, pekan, ids]) : [];
  const tercapai = rows.filter((r: any) => U.targetStatus(Number(r.ziyadah_baris) || 0, Number(r.murajaah_baris) || 0).tercapai).length;
  return { ym: n.ym, tahun: n.tahun, bulan: n.bulan, pekan, total: ids.length, terisi: rows.length, belum: Math.max(0, ids.length - rows.length), tercapai,
    persen: ids.length ? Math.round((rows.length / ids.length) * 100) : 0 };
}

/** Filter setoran untuk pimpinan (rentang bulan + cakupan unit/jenjang/tingkat/halaqah/putra-putri). */
function whereSetoranCakupan(dari: string, sampai: string, hk?: string) {
  const where: string[] = [], p: any[] = [];
  const add = (sql: string, v: any) => { p.push(v); where.push(sql.replace("?", "$" + p.length)); };
  add("ym >= ?", dari); add("ym <= ?", sampai);
  const sc = U.parseScope(hk);
  if (sc?.hk) add("halaqah_key = ?", sc.hk);
  if (sc?.unit) add("unit = ?", sc.unit);
  if (sc?.jenjang) add("upper(split_part(trim(unit), ' ', 1)) = ?", sc.jenjang);
  if (sc?.tingkat) add("tingkat = ?", sc.tingkat);
  if (sc?.gender) add("unit ILIKE ?", "%" + sc.gender + "%");
  return { W: " WHERE " + where.join(" AND "), p };
}
/** Dashboard pimpinan: setoran dijumlahkan di database (hemat egress) dengan aturan yang sama seperti perhitungan per baris. */
async function agregatPimpinan(hk: string | undefined, dari: string, sampai: string, months: string[], mode: string,
  agg: Record<string, any>, total: any, nilai: any, members: Record<string, Record<string, any>>, listMap: Record<string, any>) {
  const { W, p } = whereSetoranCakupan(dari, sampai, hk);
  const now = U.nowWib(), pk = U.pekanForDay(now.hari);
  // 1) Grafik, total, rata-rata nilai — per (bulan, pekan)
  let jumlah = 0;
  (await q(`SELECT ym, pekan, count(*)::int AS n, sum(tahsin_baris)::bigint AS t, sum(ziyadah_baris)::bigint AS z, sum(murajaah_baris)::bigint AS m,
      sum(nilai_tahsin) AS nt, count(nilai_tahsin)::int AS ntn, sum(nilai_ziyadah) AS nz, count(nilai_ziyadah)::int AS nzn,
      sum(nilai_murajaah) AS nm, count(nilai_murajaah)::int AS nmn
    FROM setoran${W} GROUP BY ym, pekan`, p)).forEach((r: any) => {
    jumlah += r.n;
    const k = mode === "pekan" ? r.ym + "-P" + r.pekan : r.ym;
    if (!agg[k]) return;
    const t = Number(r.t), z = Number(r.z), m = Number(r.m);
    agg[k].tahsin += t; agg[k].ziyadah += z; agg[k].murajaah += m;
    total.tahsin += t; total.ziyadah += z; total.murajaah += m;
    nilai.t += Number(r.nt || 0); nilai.tn += r.ntn; nilai.z += Number(r.nz || 0); nilai.zn += r.nzn; nilai.m += Number(r.nm || 0); nilai.mn += r.nmn;
  });
  // 2) Santri yang menyetor di bulan itu tetapi tidak tercatat di riwayat keanggotaan → ikut dihitung anggota bulan itu
  const pairs = months.flatMap((ym) => Object.keys(members[ym] || {}).map((id) => ym + "|" + id));
  (await q(`SELECT DISTINCT ym, santri_id FROM setoran${W} AND NOT ((ym || '|' || santri_id) = ANY($${p.length + 1}))`, [...p, pairs]))
    .forEach((r: any) => { if (members[r.ym]) members[r.ym][r.santri_id] = members[r.ym][r.santri_id] || { id: r.santri_id }; });
  // 3) Identitas tampilan = setoran terakhir tiap santri (teks halaqah dikirim sekali per halaqah)
  const HG = "unit, tingkat, halaqah, halaqah_key, musyrif";
  const snaps = await q(`SELECT santri_id, santri_nama, dense_rank() OVER (ORDER BY ${HG}) AS g_,
      CASE WHEN row_number() OVER (PARTITION BY ${HG} ORDER BY santri_id) = 1 THEN json_build_array(${HG}) END AS t_
    FROM (SELECT DISTINCT ON (santri_id) santri_id, santri_nama, ${HG} FROM setoran${W} ORDER BY santri_id, ym DESC, pekan DESC) x`, p);
  const kamus: Record<string, any[]> = {};
  snaps.forEach((r: any) => { if (r.t_) kamus[r.g_] = r.t_; });
  snaps.forEach((r: any) => { const t = kamus[r.g_] || []; listMap[r.santri_id] = snapshot({ santri_id: r.santri_id, santri_nama: r.santri_nama, unit: t[0], tingkat: t[1], halaqah: t[2], halaqah_key: t[3], musyrif: t[4] }); });
  // 4) Per santri: jumlah capaian, setoran wajib yang terisi, dan yang memenuhi target (pekan wajib = pekan yang sudah lewat, + pekan berjalan)
  const dues = months.map((ym) => U.completedWeeks(Number(ym.slice(0, 4)), Number(ym.slice(5, 7))));
  const i = p.length, perSantri: Record<string, any> = {};
  (await q(`SELECT santri_id, sum(tahsin_baris)::bigint AS t, sum(ziyadah_baris)::bigint AS z, sum(murajaah_baris)::bigint AS m,
      count(*) FILTER (WHERE e)::int AS n_exp,
      count(*) FILTER (WHERE e AND ziyadah_baris >= $${i + 1})::int AS zt,
      count(*) FILTER (WHERE e AND murajaah_baris >= $${i + 2})::int AS mt,
      count(*) FILTER (WHERE e AND ziyadah_baris >= $${i + 1} AND murajaah_baris >= $${i + 2})::int AS kt,
      count(*) FILTER (WHERE r)::int AS n_run
    FROM (SELECT santri_id, tahsin_baris, ziyadah_baris, murajaah_baris,
            (ym = $${i + 3} AND pekan = $${i + 4}) AS r,
            (pekan <= ($${i + 5}::int[])[array_position($${i + 6}::text[], ym)] OR (ym = $${i + 3} AND pekan = $${i + 4})) AS e
          FROM setoran${W}) x GROUP BY santri_id`, [...p, U.TARGET_ZIYADAH_BARIS, U.TARGET_MURAJAAH_BARIS, now.ym, pk, dues, months]))
    .forEach((r: any) => (perSantri[r.santri_id] = { t: Number(r.t), z: Number(r.z), m: Number(r.m), n_exp: r.n_exp, zt: r.zt, mt: r.mt, kt: r.kt, n_run: r.n_run }));
  return { jumlah, perSantri };
}

export async function getDashboard(u: User, filter: any, hk?: string) {
  const now = U.nowWib();
  filter = filter || {};
  const mode = filter.mode === "pekan" ? "pekan" : "bulan";
  let dari = filter.dari, sampai = filter.sampai;
  if (!dari || !sampai) {
    if (mode === "pekan") { const akhir = now.tahun * 12 + now.bulan - 1; dari = U.ymFromIndex(akhir - 2); sampai = U.ymFromIndex(akhir); }
    else { const ta = U.academicYear(now.tahun, now.bulan); dari = ymKey(ta, 7); sampai = ymKey(ta + 1, 6); }
  }
  const months = U.ymRange(dari, sampai);
  if (mode === "pekan" && months.length > U.MAKS_RENTANG_PEKAN_BULAN) throw new Error("Grafik pekanan maksimal mencakup 3 bulan.");
  if (mode === "bulan" && months.length > U.MAKS_RENTANG_BULAN) throw new Error("Grafik bulanan maksimal mencakup 12 bulan.");
  // Hemat egress: dashboard hanya butuh kolom angka & identitas halaqah (tanpa catatan/surat/waktu).
  // Pimpinan: setoran tidak ditarik per baris; dijumlahkan di database (agregatPimpinan).
  const pim = isPimpinan(u);
  const rows = pim ? [] : await loadRows(u, { dari, sampai, halaqah_key: hk, cols: DASH_COLS } as any);
  const keys: string[] = [], labels: string[] = [];
  const BS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  months.forEach((ym) => {
    const ml = BS[Number(ym.slice(5, 7)) - 1] + " " + ym.slice(2, 4);
    if (mode === "pekan") for (let p = 1; p <= JUMLAH_PEKAN; p++) { keys.push(ym + "-P" + p); labels.push(ml + " P" + p); }
    else { keys.push(ym); labels.push(ml); }
  });
  const agg: Record<string, any> = {};
  keys.forEach((k) => (agg[k] = { tahsin: 0, ziyadah: 0, murajaah: 0 }));
  const total = { tahsin: 0, ziyadah: 0, murajaah: 0 };
  const nilai = { t: 0, tn: 0, z: 0, zn: 0, m: 0, mn: 0 };
  rows.forEach((r) => {
    const k = mode === "pekan" ? r.ym + "-P" + r.pekan : r.ym;
    if (!agg[k]) return;
    agg[k].tahsin += r.tahsin_baris; agg[k].ziyadah += r.ziyadah_baris; agg[k].murajaah += r.murajaah_baris;
    total.tahsin += r.tahsin_baris; total.ziyadah += r.ziyadah_baris; total.murajaah += r.murajaah_baris;
    if (r.nilai_tahsin != null) { nilai.t += r.nilai_tahsin; nilai.tn++; }
    if (r.nilai_ziyadah != null) { nilai.z += r.nilai_ziyadah; nilai.zn++; }
    if (r.nilai_murajaah != null) { nilai.m += r.nilai_murajaah; nilai.mn++; }
  });
  const members = await memberMapByMonth(u, months, hk, rows), listMap: Record<string, any> = {};
  months.forEach((ym) => Object.keys(members[ym] || {}).forEach((id) => (listMap[id] = members[ym][id])));
  rows.forEach((r) => (listMap[r.santri_id] = snapshot(r)));
  const ag = pim ? await agregatPimpinan(hk, dari, sampai, months, mode, agg, total, nilai, members, listMap) : null;
  const list = Object.values(listMap), per: Record<string, any> = {}, exp: Record<string, boolean> = {};
  const bucket = (s: any) => (per[s.id] = per[s.id] || { s, ziyadah: 0, murajaah: 0, tahsin: 0, terisi: 0, expected: 0, tz: 0, tm: 0, tk: 0 });
  list.forEach(bucket);
  months.forEach((ym) => {
    const due = U.completedWeeks(Number(ym.slice(0, 4)), Number(ym.slice(5, 7))), mm = members[ym] || {};
    Object.keys(mm).forEach((id) => { const p = bucket(mm[id]); for (let w = 1; w <= due; w++) { exp[id + "|" + ym + "|P" + w] = true; p.expected++; } });
  });
  rows.forEach((r) => {
    const k = r.santri_id + "|" + r.ym + "|P" + r.pekan;
    if (exp[k] || !per[r.santri_id] || !U.isRunningWeek(r.ym, r.pekan)) return;
    exp[k] = true; per[r.santri_id].expected++;
  });
  let expTambah = 0; // pekan berjalan yang sudah diisi (pimpinan, dari database)
  if (ag) Object.entries(ag.perSantri).forEach(([id, x]: any) => { if (x.n_run && per[id]) { per[id].expected += x.n_run; expTambah += x.n_run; } });
  const haf = await totalHafalanMap(list);
  const target: any = { dinilai: Object.keys(exp).length + expTambah, terisi: 0, ziyadah_tercapai: 0, murajaah_tercapai: 0, keduanya_tercapai: 0, gugur: 0 };
  const GUGUR = { ziyadah: true, murajaah: true, tercapai: true };
  rows.forEach((r) => {
    const p = per[r.santri_id]; if (!p) return;
    p.ziyadah += r.ziyadah_baris; p.murajaah += r.murajaah_baris; p.tahsin += r.tahsin_baris;
    if (!exp[r.santri_id + "|" + r.ym + "|P" + r.pekan]) return;
    p.terisi++; target.terisi++;
    // Santri yang sudah mencapai target lulusan: target pekanan gugur (dihitung tercapai)
    const lulus = haf[r.santri_id]?.lulus_target;
    if (lulus) target.gugur++;
    const t = lulus ? GUGUR : U.targetStatus(r.ziyadah_baris, r.murajaah_baris);
    if (t.ziyadah) { target.ziyadah_tercapai++; p.tz++; }
    if (t.murajaah) { target.murajaah_tercapai++; p.tm++; }
    if (t.tercapai) { target.keduanya_tercapai++; p.tk++; }
  });
  if (ag) Object.entries(ag.perSantri).forEach(([id, x]: any) => {
    const p = per[id]; if (!p) return;
    p.ziyadah += x.z; p.murajaah += x.m; p.tahsin += x.t;
    p.terisi += x.n_exp; target.terisi += x.n_exp;
    const lulus = haf[id]?.lulus_target;
    if (lulus) target.gugur += x.n_exp;
    const zt = lulus ? x.n_exp : x.zt, mt = lulus ? x.n_exp : x.mt, kt = lulus ? x.n_exp : x.kt;
    target.ziyadah_tercapai += zt; target.murajaah_tercapai += mt; target.keduanya_tercapai += kt;
    p.tz += zt; p.tm += mt; p.tk += kt;
  });
  target.belum_tercapai = Math.max(0, target.dinilai - target.keduanya_tercapai);
  target.belum_diisi = Math.max(0, target.dinilai - target.terisi);
  target.persen = target.dinilai ? Math.round((target.keduanya_tercapai / target.dinilai) * 100) : 0;
  target.persen_pengisian = target.dinilai ? Math.round((target.terisi / target.dinilai) * 100) : 0;
  // Persentase capai target dihitung dari setoran yang SUDAH diisi (bukan dari yang seharusnya)
  target.persen_dari_terisi = target.terisi ? Math.round((target.keduanya_tercapai / target.terisi) * 100) : 0;
  target.belum_capai_dari_terisi = Math.max(0, target.terisi - target.keduanya_tercapai);
  target.minimal_ziyadah = barisToHal(U.TARGET_ZIYADAH_BARIS);
  target.minimal_murajaah = barisToHal(U.TARGET_MURAJAAH_BARIS);
  const urutNama = (a: any, b: any) => String(a.nama).localeCompare(String(b.nama), "id") || String(a.id).localeCompare(String(b.id));
  const mk = (k: string) => Object.values(per).filter((p: any) => p[k] > 0).sort((a: any, b: any) => b[k] - a[k] || urutNama(a.s, b.s)).slice(0, 10).map((p: any) => ({
    id: p.s.id, nama: p.s.nama, unit: p.s.unit, tingkat: p.s.tingkat, halaqah: p.s.halaqah, musyrif: p.s.musyrif, capaian: barisToHal(p[k]),
    rata_per_pekan: barisToHal(p.expected ? Math.round(p[k] / p.expected) : p.terisi ? Math.round(p[k] / p.terisi) : 0),
    target: { dinilai: p.expected, terisi: p.terisi, keduanya_tercapai: p.tk },
  }));
  const topHafalan = list.map((s: any) => ({ id: s.id, nama: s.nama, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif, hafalan: haf[s.id].total }))
    .filter((x) => x.hafalan.baris_total > 0).sort((a, b) => b.hafalan.baris_total - a.hafalan.baris_total || urutNama(a, b)).slice(0, 10);
  const totalHaf = list.reduce((t: number, s: any) => t + haf[s.id].total.baris_total, 0);
  return {
    mode, dari, sampai, labels, keys,
    series: keys.map((k, i) => ({ label: labels[i], tahsin: barisToHal(agg[k].tahsin).decimal, ziyadah: barisToHal(agg[k].ziyadah).decimal, murajaah: barisToHal(agg[k].murajaah).decimal })),
    top_ziyadah: mk("ziyadah"), top_murajaah: mk("murajaah"), top_hafalan: topHafalan,
    total_hafalan: barisToJuz(totalHaf), rata_hafalan: barisToJuz(list.length ? Math.round(totalHaf / list.length) : 0),
    total: { tahsin: barisToHal(total.tahsin), ziyadah: barisToHal(total.ziyadah), murajaah: barisToHal(total.murajaah) },
    nilai_rata: { tahsin: nilai.tn ? Math.round(nilai.t / nilai.tn) : null, ziyadah: nilai.zn ? Math.round(nilai.z / nilai.zn) : null, murajaah: nilai.mn ? Math.round(nilai.m / nilai.mn) : null },
    target, jumlah_santri: list.length, jumlah_setoran: ag ? ag.jumlah : rows.length,
    pekan_ini: await pekanIniStatus(u, hk),
    pekan_riwayat: await getPekanRiwayat(u, hk, 8),
    tajwid: filter?.lite ? null : await tajwidChart(list.map((s: any) => s.id), dari, sampai),
    semester: await semesterStatus(u, hk),
  };
}

/* ============ rekap ============ */
export async function getRekap(u: User, mode: string, filter: any) {
  filter = filter || {};
  if (!["pekan", "bulan", "tahun"].includes(mode)) throw new Error("Mode rekap tidak valid.");
  // Hemat egress: pimpinan memilih unit/jenjang/halaqah dulu (rekap seluruh 856 santri sekaligus sangat besar).
  if (isPimpinan(u) && !filter.halaqah_key && !filter.santri_id) return { perlu_cakupan: true, santri: [], periode: null, mode, dari: filter.dari, sampai: filter.sampai };
  const dari = String(filter.dari || ""), sampai = String(filter.sampai || ""), months = U.ymRange(dari, sampai);
  if (months.length > U.MAKS_RENTANG_REKAP_BULAN) throw new Error("Rekap maksimal 24 bulan sekali tampil.");
  const rows = await loadRows(u, { dari, sampai, halaqah_key: filter.halaqah_key, santri_id: filter.santri_id });
  const keyOf = (r: any) => (mode === "pekan" ? r.ym + "-P" + r.pekan : mode === "bulan" ? r.ym : U.academicYearLabel(r.tahun, r.bulan));
  const periode: string[] = [], seenP: Record<string, boolean> = {};
  months.forEach((ym) => {
    const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
    if (mode === "pekan") for (let p = 1; p <= JUMLAH_PEKAN; p++) periode.push(ym + "-P" + p);
    else if (mode === "bulan") periode.push(ym);
    else { const k = U.academicYearLabel(y, m); if (!seenP[k]) { seenP[k] = true; periode.push(k); } }
  });
  const by: Record<string, any> = {};
  const members = await memberMapByMonth(u, months, filter.halaqah_key, rows);
  const ens = (s: any) => {
    if (!s || !s.id) return null;
    if (filter.santri_id && String(s.id) !== String(filter.santri_id)) return null;
    if (!by[s.id]) by[s.id] = { s, per: {}, total: emptyAgg() }; else by[s.id].s = s;
    return by[s.id];
  };
  months.forEach((ym) => {
    const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), due = U.completedWeeks(y, m), mm = members[ym] || {};
    Object.keys(mm).forEach((id) => {
      const b = ens(mm[id]); if (!b) return;
      if (mode === "pekan") for (let p = 1; p <= JUMLAH_PEKAN; p++) { const k = ym + "-P" + p; b.per[k] = b.per[k] || emptyAgg(); if (p <= due) { b.per[k].expected++; b.total.expected++; } }
      else { const k = mode === "bulan" ? ym : U.academicYearLabel(y, m); b.per[k] = b.per[k] || emptyAgg(); b.per[k].expected += due; b.total.expected += due; }
    });
  });
  rows.forEach((r) => {
    const b = ens(snapshot(r)); if (!b) return;
    const k = keyOf(r);
    b.per[k] = b.per[k] || emptyAgg();
    if (U.isRunningWeek(r.ym, r.pekan)) { b.per[k].expected++; b.total.expected++; }
    addAgg(b.per[k], r); addAgg(b.total, r);
  });
  const list = Object.values(by).map((b: any) => b.s);
  const haf = await totalHafalanMap(list);
  const tjw = await latestPenilaianMap(list.map((x: any) => x.id));
  const santri = list.map((s: any) => {
    const b = by[s.id], per: Record<string, any> = {};
    periode.forEach((p) => (per[p] = finalizeAgg(b.per[p] || emptyAgg())));
    return { id: s.id, nama: s.nama, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, halaqah_key: s.halaqah_key, musyrif: s.musyrif, program: s.program, per, total: finalizeAgg(b.total), hafalan: haf[s.id], tajwid: tjw[s.id] || null };
  }).sort((a, b) => (a.unit + a.tingkat + a.halaqah + a.nama).localeCompare(b.unit + b.tingkat + b.halaqah + b.nama, "id", { numeric: true }));
  return { periode, santri, mode, dari, sampai };
}

/* ============ raport ============ */
export async function getRaport(u: User, santri_id: any, dari: string, sampai: string) {
  const id = String(santri_id), months = U.ymRange(dari, sampai);
  const rows = await loadRows(u, { santri_id: id, dari, sampai });
  const current = (await santriForUser(u)).find((x) => x.id === id);
  const members = await memberMapByMonth(u, months, undefined, rows);
  let snap: any = null;
  months.forEach((ym) => { if (members[ym] && members[ym][id]) snap = members[ym][id]; });
  const latest = rows.length ? rows[rows.length - 1] : null;
  const s = latest ? snapshot(latest) : snap || current;
  if (!s) throw new Error("Santri tidak ditemukan atau tidak dapat diakses.");
  const a = emptyAgg();
  months.forEach((ym) => { if (members[ym] && members[ym][id]) a.expected += U.completedWeeks(Number(ym.slice(0, 4)), Number(ym.slice(5, 7))); });
  rows.forEach((r) => { if (U.isRunningWeek(r.ym, r.pekan)) a.expected++; addAgg(a, r); });
  const hafalan = (await totalHafalanMap([s]))[s.id];
  const sert = await sertifikasiFor(u, s.id);
  return {
    santri: s, musyrif: s.musyrif, periode: { dari, sampai }, ringkasan: finalizeAgg(a), hafalan, sertifikasi: sert,
    perkembangan_tajwid: await perkembanganTajwid(s.id, T.semesterOf(sampai || U.nowWib().ym).dari, sampai || U.nowWib().ym),
    arbain: (await q("SELECT nomor, status FROM hadis_arbain WHERE santri_id=$1 ORDER BY nomor", [s.id])).map((r: any) => ({ nomor: Number(r.nomor), status: r.status })),
    ujian: await (async () => {
      const sm = T.semesterOf(sampai || U.nowWib().ym);
      let r = (await q("SELECT * FROM ujian_semester WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3", [s.id, sm.tahun_ajaran, sm.semester]))[0];
      const pn = await penilaianSemester(s.id, sm);
      if (pn) {
        r = r ? { ...r } : {};
        if (!r.makhraj) { r.makhraj = pn.makhraj; r.makhraj_nilai = pn.makhraj_nilai; r.ket_makhraj = pn.ket_makhraj; }
        if (!r.tajwid) { r.tajwid = pn.tajwid; r.tajwid_nilai = pn.tajwid_nilai; r.ket_tajwid = pn.ket_tajwid; }
      }
      return r ? { periode: `${sm.nama} ${sm.tahun_ajaran}`, aspek: T.ASPEK.filter((a) => r[a.key]).map((a) => ({ label: a.label, predikat: r[a.key] || "", skor: a.key === "tahfidz" && r.tahfidz_nilai != null ? Number(r.tahfidz_nilai) : null, keterangan: r["ket_" + a.key] || "" })), catatan: r.catatan, penguji: r.penguji, tanggal: r.tanggal } : null;
    })(),
    pekan: rows.map((r) => ({
      ym: r.ym, pekan: r.pekan, hadir: r.hadir, sakit: r.sakit, izin: r.izin, alfa: r.alfa,
      nilai_tahsin: r.nilai_tahsin, nilai_ziyadah: r.nilai_ziyadah, nilai_murajaah: r.nilai_murajaah,
      tahsin: barisToHal(r.tahsin_baris).teks, ziyadah: barisToHal(r.ziyadah_baris).teks, murajaah: barisToHal(r.murajaah_baris).teks,
      target: U.targetStatus(r.ziyadah_baris, r.murajaah_baris), ziyadah_surat: r.ziyadah_surat, murajaah_juz: r.murajaah_juz, catatan: r.catatan,
    })),
  };
}

/* ============ monitoring ============ */
export async function getMonitoringPekan(u: User, tahun: any, bulan: any) {
  if (!direktoriWaTerisi()) setDirektoriWa((await q("SELECT value FROM meta WHERE key='wa_direktori'"))[0]?.value || []);
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  tahun = U.requiredInt(tahun, "Tahun", 2000, 2100); bulan = U.requiredInt(bulan, "Bulan", 1, 12);
  const now = U.nowWib(), ym = ymKey(tahun, bulan);
  const selesai = U.completedWeeks(tahun, bulan), berjalan = ym === now.ym ? U.pekanForDay(now.hari) : ym < now.ym ? JUMLAH_PEKAN : 0;
  const rows = await loadRows(u, { tahun, bulan });
  const mm = (await memberMapByMonth(u, [ym], undefined, rows))[ym] || {}, hq: Record<string, any> = {};
  const ens = (s: any) => {
    const key = s.halaqah_key || U.halaqahKey(s.unit, s.tingkat, s.halaqah);
    hq[key] = hq[key] || { key, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif, members: {}, pekan: {} };
    hq[key].members[String(s.id)] = true;
  };
  Object.values(mm).forEach(ens);
  rows.forEach((r) => ens(snapshot(r)));
  Object.values(hq).forEach((h: any) => { for (let p = 1; p <= JUMLAH_PEKAN; p++) h.pekan[p] = { ids: {}, terisi: 0, terakhir: "" }; });
  rows.forEach((r) => { const h = hq[r.halaqah_key]; if (!h || !h.pekan[r.pekan]) return; h.pekan[r.pekan].ids[r.santri_id] = true; if (r.dicatat_pada_str > h.pekan[r.pekan].terakhir) h.pekan[r.pekan].terakhir = r.dicatat_pada_str; });
  const out = Object.values(hq).map((h: any) => {
    const jumlah = Object.keys(h.members).length, belum: number[] = [], sebagian: number[] = [], lengkap: number[] = [];
    for (let i = 1; i <= JUMLAH_PEKAN; i++) {
      h.pekan[i].terisi = Object.keys(h.pekan[i].ids).length; delete h.pekan[i].ids;
      h.pekan[i].wajib = i <= selesai; h.pekan[i].berjalan = i === berjalan && ym === now.ym;
      if (i > selesai) continue;
      if (!h.pekan[i].terisi) belum.push(i); else if (h.pekan[i].terisi < jumlah) sebagian.push(i); else lengkap.push(i);
    }
    let status = "sebagian";
    if (ym > now.ym) status = "akan_datang"; else if (selesai === 0) status = "berjalan"; else if (lengkap.length === selesai) status = "lengkap"; else if (belum.length === selesai) status = "kosong";
    return { key: h.key, unit: h.unit, tingkat: h.tingkat, halaqah: h.halaqah, musyrif: h.musyrif, wa: waFor(h.musyrif), jumlah, pekan: h.pekan, belum: belum.concat(sebagian).sort((a, b) => a - b), kosong: belum, sebagian, lengkap, status };
  }).sort((a, b) => (a.unit + a.tingkat + a.halaqah).localeCompare(b.unit + b.tingkat + b.halaqah, "id", { numeric: true }));
  const c = (s: string) => out.filter((x) => x.status === s).length;
  return { tahun, bulan, pekan_selesai: selesai, pekan_berjalan: berjalan, pekan_total: JUMLAH_PEKAN, periode_masa_depan: ym > now.ym, halaqah: out,
    ringkasan: { total_halaqah: out.length, lengkap: c("lengkap"), sebagian: c("sebagian"), kosong: c("kosong"), berjalan: c("berjalan") } };
}

/* ============ sertifikasi ============ */
function sertSummary(records: any[]) {
  const pass: Record<string, boolean> = {}, perJuz: Record<number, boolean> = {};
  records.forEach((r) => { perJuz[r.juz] = true; if (r.status === "lulus") pass[r.juz + "-" + r.bagian] = true; });
  const juzLulus: number[] = [];
  for (let j = 1; j <= 30; j++) if ([1, 2, 3, 4].every((b) => pass[j + "-" + b])) juzLulus.push(j);
  return { bagian_lulus: Object.keys(pass).length, bagian_total: 120, juz_lulus: juzLulus, jumlah_juz_lulus: juzLulus.length, juz_diuji: Object.keys(perJuz).map(Number).sort((a, b) => a - b) };
}
async function sertifikasiFor(_u: User, sid: string) {
  const records = (await q("SELECT id,santri_id,juz,bagian,tanggal_ujian,nilai,status,penguji,catatan FROM sertifikasi WHERE santri_id=$1 ORDER BY juz, bagian", [sid]))
    .map((r: any) => ({ ...r, nilai: r.nilai == null ? null : Number(r.nilai) }));
  return { records, summary: sertSummary(records) };
}
const isTingkatSert = (s: any) => ["9", "12", "IX", "XII", "3"].includes(String(s?.tingkat || "").toUpperCase().trim().replace(/^(KELAS|KLS\.?|TINGKAT)\s*/i, ""));
export async function getSertifikasi(u: User, hk: string, santri_id: string) {
  let list = await santriForUser(u);
  if (hk) list = list.filter((s) => U.inScope(s, hk));
  list = list.filter(isTingkatSert).sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  const selId = santri_id && list.some((s) => s.id === String(santri_id)) ? String(santri_id) : list[0]?.id || "";
  const selected = list.find((s) => s.id === selId) || null;
  const cert = selected ? await sertifikasiFor(u, selId) : { records: [], summary: sertSummary([]) };
  const hafalan = selected ? (await totalHafalanMap([selected]))[selId] : null;
  return { santri: list.map((s) => ({ id: s.id, nama: s.nama, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah })), selected, records: cert.records, summary: cert.summary, hafalan };
}
export async function saveSertifikasi(u: User, data: any, ctx: Ctx) {
  data = data || {};
  const s = await findSantri(u, data.santri_id);
  if (!isTingkatSert(s)) throw new Error("Sertifikasi hanya tersedia untuk santri tingkat 9 dan 12.");
  const juz = U.requiredInt(data.juz, "Juz", 1, 30), bagian = U.requiredInt(data.bagian, "Bagian", 1, 4);
  const tg = String(data.tanggal_ujian || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tg)) throw new Error("Tanggal ujian harus berformat yyyy-MM-dd.");
  if (tg > U.todayWib()) throw new Error("Tanggal ujian tidak boleh melebihi hari ini.");
  const nilai = U.optionalScore(data.nilai, "Nilai sertifikasi");
  const status = norm(data.status);
  if (status === "belum") {
    // Penguji salah memilih santri/bagian: hapus hasil sehingga kembali "belum diuji"
    const jz = U.requiredInt(data.juz, "Juz", 1, 30), bg = U.requiredInt(data.bagian, "Bagian", 1, 4);
    const del = await tx(async (run) => {
      const old = (await run("SELECT * FROM sertifikasi WHERE santri_id=$1 AND juz=$2 AND bagian=$3", [s.id, jz, bg]))[0];
      if (!old) return false;
      await run("DELETE FROM sertifikasi WHERE id=$1", [old.id]);
      await enqueue(run, "Sertifikasi", "delete", { id: old.id });
      await audit(run, u, "DELETE", "Sertifikasi", old.id, old, null);
      return true;
    });
    await ctx.kick();
    return { ok: true, dihapus: del };
  }
  if (!["lulus", "remedial"].includes(status)) throw new Error("Status harus Lulus atau Remedial.");
  const rec = await tx(async (run) => {
    const old = (await run("SELECT * FROM sertifikasi WHERE santri_id=$1 AND juz=$2 AND bagian=$3", [s.id, juz, bagian]))[0] || null;
    const now = new Date().toISOString();
    const r: any = {
      id: old ? old.id : U.uid(), santri_id: s.id, santri_nama: U.clip(s.nama, 200), unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif,
      juz, bagian, halaman_minimal: 5, tanggal_ujian: tg, nilai, status, penguji: U.safeText(data.penguji || u.nama, 200), catatan: U.safeText(data.catatan, 1000),
      dicatat_oleh: U.clip(u.username, 100), dicatat_pada: old ? old.dicatat_pada : now, diperbarui_pada: now,
    };
    const cols = Object.keys(r);
    await run(`INSERT INTO sertifikasi (${cols.join(",")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(",")})
      ON CONFLICT (santri_id, juz, bagian) DO UPDATE SET ${cols.filter((c) => !["id", "santri_id", "juz", "bagian", "dicatat_pada"].includes(c)).map((c) => c + "=EXCLUDED." + c).join(",")}`, cols.map((c) => r[c]));
    await enqueue(run, "Sertifikasi", "upsert", sertifikasiSheetRow(r));
    await audit(run, u, old ? "UPDATE" : "CREATE", "Sertifikasi", r.id, old, r);
    return r;
  });
  await ctx.kick();
  return { ok: true, id: rec.id };
}

/* ============ target semester & ujian ============ */
async function semesterProgress(list: any[], sem: { dari: string; sampai: string }) {
  const ids = list.map((s) => String(s.id));
  const out: Record<string, { ziyadah: number; hadir: number; pertemuan: number; setoran: number }> = {};
  ids.forEach((id) => (out[id] = { ziyadah: 0, hadir: 0, pertemuan: 0, setoran: 0 }));
  if (!ids.length) return out;
  (await q(`WITH r AS (SELECT santri_id, ziyadah_baris, hadir, sakit, izin, alfa, ${NS("ziyadah_surat")} AS loc FROM setoran WHERE ym >= $1 AND ym <= $2 AND santri_id = ANY($3)),
      seg AS (SELECT santri_id, max(ziyadah_baris) AS m FROM r WHERE loc <> '' AND ziyadah_baris > 0 GROUP BY santri_id, loc),
      segsum AS (SELECT santri_id, sum(m) AS z FROM seg GROUP BY santri_id)
    SELECT r.santri_id, count(*)::int AS setoran, sum(r.hadir)::int AS hadir, sum(r.hadir + r.sakit + r.izin + r.alfa)::int AS pertemuan,
      (coalesce(sum(r.ziyadah_baris) FILTER (WHERE r.loc = '' AND r.ziyadah_baris > 0), 0) + coalesce(max(ss.z), 0))::int AS ziyadah
    FROM r LEFT JOIN segsum ss ON ss.santri_id = r.santri_id GROUP BY r.santri_id`, [sem.dari, sem.sampai, ids]))
    .forEach((x: any) => { const o = out[x.santri_id]; if (o) { o.setoran = x.setoran; o.hadir = x.hadir; o.pertemuan = x.pertemuan; o.ziyadah = x.ziyadah; } });
  return out;
}
async function sertLulusMap(ids: string[]) {
  const m: Record<string, number> = {};
  if (!ids.length) return m;
  (await q("SELECT santri_id, count(*)::int AS n FROM sertifikasi WHERE status='lulus' AND santri_id = ANY($1) GROUP BY santri_id", [ids])).forEach((r: any) => (m[r.santri_id] = r.n));
  return m;
}
function halTeks(baris: number) { const h = Math.round((baris / 15) * 10) / 10; return (Number.isInteger(h) ? h : h.toFixed(1).replace(".", ",")) + " hal"; }
function statusSantri(s: any, h: any, prog: any, sertLulus: number, sem: any, frac: number, pekanWajib = 0) {
  const semKe = T.semesterKe(s, sem.semester), tgt = T.targetSemester(s, semKe);
  let capai = 0, target = 0, capai_teks = "", target_teks = tgt.label;
  if (tgt.jenis === "hafalan") { capai = prog?.ziyadah || 0; target = tgt.baris; capai_teks = halTeks(capai); target_teks = halTeks(target); }
  else if (tgt.jenis === "sertifikasi") { capai = sertLulus || 0; target = h.target_juz * 4; capai_teks = `${capai} bagian lulus`; target_teks = `${target} bagian (${h.target_juz} juz)`; }
  // Data belum lengkap: setoran yang terisi kurang dari separuh pekan yang sudah lewat → belum bisa dinilai jauh/dekat dari target.
  const setoran = prog?.setoran || 0, kurangData = pekanWajib > 0 && setoran < Math.ceil(pekanWajib / 2);
  const status: T.StatusSem = h.lulus_target ? "lulus" : tgt.jenis === "tahsin" ? "tahsin" : tgt.jenis === "none" ? "none"
    : kurangData ? "belum_lengkap" : T.statusOf(capai, target, frac);
  return {
    id: s.id, nama: s.nama, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif, jenjang: T.jenjangOf(s.unit),
    semester_ke: semKe, jenis_target: tgt.jenis, target_label: tgt.label, capai, target, capai_teks, target_teks,
    persen: target ? Math.round((capai / target) * 100) : null, status, tahfidz: h.tahfidz,
    target_lulusan_juz: h.target_juz, hafalan: h.total.teks, hafalan_juz: h.total.juz_decimal, lulus_target: h.lulus_target,
    setoran, pekan_wajib: pekanWajib, halaqah_key: s.halaqah_key || U.halaqahKey(s.unit, s.tingkat, s.halaqah),
  };
}
async function scopedSantri(u: User, hk?: string) {
  let list = await santriForUser(u);
  if (hk) list = list.filter((s) => U.inScope(s, hk));
  return list;
}
async function latestUjian(ids: string[]) {
  const m: Record<string, any> = {};
  if (!ids.length) return m;
  (await q("SELECT DISTINCT ON (santri_id) santri_id, tahun_ajaran, semester, makhraj, tajwid FROM ujian_semester WHERE santri_id = ANY($1) AND (makhraj <> '' OR tajwid <> '') ORDER BY santri_id, tahun_ajaran DESC, semester DESC", [ids]))
    .forEach((r: any) => (m[r.santri_id] = r));
  // Penilaian makhraj & tajwid (menu Santri) lebih baru dan lebih utama
  (await q("SELECT DISTINCT ON (santri_id) santri_id, ym, makhraj, tajwid FROM penilaian_tajwid WHERE santri_id = ANY($1) ORDER BY santri_id, ym DESC", [ids]))
    .forEach((r: any) => (m[r.santri_id] = { santri_id: r.santri_id, makhraj: r.makhraj || m[r.santri_id]?.makhraj || "", tajwid: r.tajwid || m[r.santri_id]?.tajwid || "", ym: r.ym }));
  return m;
}
function makhrajTajwidRekap(list: any[], uj: Record<string, any>) {
  const byJ: Record<string, any> = {};
  list.forEach((s) => {
    const j = T.jenjangOf(s.unit); if (!T.TARGET_MAKHRAJ_TAJWID[j]) return;
    const akhir = Number(s.tingkat) === (j === "SMP" ? 9 : 12);
    const nol = () => ({ santri: 0, dinilai: 0, makhraj_bplus: 0, tajwid_bplus: 0, makhraj_c: 0, tajwid_c: 0 });
    const g = (byJ[j] = byJ[j] || { jenjang: j, target: T.TARGET_MAKHRAJ_TAJWID[j], lulusan: nol(), semua: nol(), _t: {} as Record<string, any> });
    const t = String(s.tingkat), pt = (g._t[t] = g._t[t] || { tingkat: t, akhir, ...nol() });
    const r = uj[s.id];
    [g.semua, pt, ...(akhir ? [g.lulusan] : [])].forEach((b: any) => {
      b.santri++;
      if (!r) return;
      b.dinilai++;
      if (T.minimalBPlus(r.makhraj)) b.makhraj_bplus++;
      if (T.minimalBPlus(r.tajwid)) b.tajwid_bplus++;
      if (r.makhraj === "C") b.makhraj_c++;
      if (r.tajwid === "C") b.tajwid_c++;
    });
  });
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);
  return ["SMP", "SMA", "MA"].filter((j) => byJ[j]).map((j) => {
    const g = byJ[j];
    g.per_tingkat = Object.values(g._t).sort((a: any, b: any) => Number(a.tingkat) - Number(b.tingkat)); delete g._t;
    [g.lulusan, g.semua, ...g.per_tingkat].forEach((b: any) => { b.persen_makhraj = pct(b.makhraj_bplus, b.dinilai); b.persen_tajwid = pct(b.tajwid_bplus, b.dinilai); });
    return g;
  });
}

export async function semesterStatus(u: User, hk?: string) {
  const n = U.nowWib(), sem = T.semesterOf(n.ym);
  const pb = T.pekanBerjalan(sem, n.ym, U.pekanForDay(n.hari)), frac = pb / T.PEKAN_PER_SEMESTER;
  const list = await scopedSantri(u, hk), ids = list.map((s) => s.id);
  const [haf, prog, sert, uj] = [await totalHafalanMap(list), await semesterProgress(list, sem), await sertLulusMap(ids), await latestUjian(ids)];
  const pekanWajib = Math.max(0, pb - 1);
  const items = list.map((s) => statusSantri(s, haf[s.id], prog[s.id], sert[s.id] || 0, sem, frac, pekanWajib));
  const blank = () => Object.fromEntries(Object.keys(T.STATUS_INFO).map((k) => [k, 0])) as Record<T.StatusSem, number>;
  const counts = blank(), jen: Record<string, any> = {}, unitG: Record<string, any> = {};
  items.forEach((it) => {
    counts[it.status]++;
    const ug = (unitG[it.unit] = unitG[it.unit] || { unit: it.unit, label: T.unitLabel(it.unit), jenjang: it.jenjang, gender: T.genderOf(it.unit), total: 0, counts: blank(), lulusan: { santri: 0, lulus_target: 0 } });
    ug.total++; ug.counts[it.status]++;
    if (it.semester_ke >= 5) { ug.lulusan.santri++; if (it.lulus_target) ug.lulusan.lulus_target++; }
    const g = (jen[it.jenjang] = jen[it.jenjang] || { jenjang: it.jenjang, total: 0, counts: blank(), lulusan: { santri: 0, lulus_target: 0 } });
    g.total++; g.counts[it.status]++;
    if (it.semester_ke >= 5) { g.lulusan.santri++; if (it.lulus_target) g.lulusan.lulus_target++; }
  });
  const bertarget = items.length - counts.tahsin - counts.none - counts.belum_lengkap;
  const aman = counts.lulus + counts.tercapai + counts.on_track;
  // Rincian sesuai pilihan: unit/jenjang → per tingkat; tingkat → per halaqah; putra/putri → per unit & tingkat
  const sc = U.parseScope(hk);
  let rincian: any = null;
  if (sc && !sc.hk) {
    const by = sc.tingkat ? "halaqah" : sc.gender ? "unit_tingkat" : "tingkat";
    const grp: Record<string, any> = {};
    items.forEach((it: any) => {
      const key = by === "halaqah" ? it.halaqah_key : by === "unit_tingkat" ? it.unit + "|" + it.tingkat : String(it.tingkat);
      const label = by === "halaqah" ? it.halaqah + (sc.unit ? "" : " · " + T.unitLabel(it.unit)) : by === "unit_tingkat" ? `${T.unitLabel(it.unit)} · kelas ${it.tingkat}` : `Kelas ${it.tingkat}`;
      const g = (grp[key] = grp[key] || { key, label, sub: by === "halaqah" ? it.musyrif : "", tingkat: Number(it.tingkat) || 0, unit: it.unit, total: 0, counts: blank() });
      g.total++; g.counts[it.status]++;
    });
    const rows = Object.values(grp).map((g: any) => {
      const bt = g.total - g.counts.tahsin - g.counts.none - g.counts.belum_lengkap, am = g.counts.lulus + g.counts.tercapai + g.counts.on_track;
      return { ...g, bertarget: bt, persen_aman: bt ? Math.round((am / bt) * 100) : null };
    }).sort((a: any, b: any) => a.tingkat - b.tingkat || String(a.unit).localeCompare(String(b.unit)) || String(a.label).localeCompare(String(b.label), "id", { numeric: true }));
    rincian = { judul: by === "halaqah" ? "Per halaqah" : by === "unit_tingkat" ? "Per unit & tingkat" : "Per tingkat", baris: rows };
  }
  const hafAwalKosong = ids.length ? (await q("SELECT count(*)::int AS n FROM unnest($1::text[]) AS t(id) WHERE NOT EXISTS (SELECT 1 FROM hafalan h WHERE h.santri_id = t.id AND (h.baris_awal > 0 OR h.baris_terverifikasi IS NOT NULL))", [ids]))[0].n : 0;
  return {
    rincian, hafalan_awal_kosong: hafAwalKosong, pekan_wajib: pekanWajib,
    belum_lengkap_list: items.filter((i: any) => i.status === "belum_lengkap").sort((a: any, b: any) => a.setoran - b.setoran).slice(0, 8),
    periode: { ...sem, pekan_berjalan: pb, total_pekan: T.PEKAN_PER_SEMESTER },
    total: items.length, bertarget, aman, persen_aman: bertarget ? Math.round((aman / bertarget) * 100) : null, counts,
    status_info: T.STATUS_INFO,
    per_jenjang: ["SMP", "SMA", "MA"].filter((j) => jen[j]).map((j) => jen[j]).concat(Object.keys(jen).filter((j) => !["SMP", "SMA", "MA"].includes(j)).map((j) => jen[j])),
    per_unit: Object.values(unitG).sort((a: any, b: any) => (T.UNIT_ORDER.indexOf(a.unit) + 99) % 99 - (T.UNIT_ORDER.indexOf(b.unit) + 99) % 99 || a.unit.localeCompare(b.unit)),
    target_lulusan: { santri: items.length, tercapai: items.filter((i) => i.lulus_target).length, default: T.TARGET_LULUSAN },
    perlu_perhatian: items.filter((i) => i.status === "jauh").sort((a, b) => (a.persen ?? 0) - (b.persen ?? 0)).slice(0, 8),
    makhraj_tajwid: makhrajTajwidRekap(list, uj),
  };
}

const saranKehadiran = (p: number | null) => (p == null ? "" : p >= 95 ? "A" : p >= 85 ? "B+" : p >= 75 ? "B" : "C");
export async function getUjian(u: User, hk: string | undefined, tahunAjaran?: string, semester?: any) {
  const now = T.semesterOf(U.nowWib().ym);
  const sem = tahunAjaran && semester ? T.parseTa(String(tahunAjaran), Number(semester) === 2 ? 2 : 1) : now;
  const isNow = sem.tahun_ajaran === now.tahun_ajaran && sem.semester === now.semester;
  const n = U.nowWib(), pb = isNow ? T.pekanBerjalan(sem, n.ym, U.pekanForDay(n.hari)) : T.PEKAN_PER_SEMESTER;
  const list = await scopedSantri(u, hk), ids = list.map((s) => s.id);
  const [haf, prog, sert] = [await totalHafalanMap(list), await semesterProgress(list, sem), await sertLulusMap(ids)];
  const rows: Record<string, any> = {};
  if (ids.length) (await q("SELECT * FROM ujian_semester WHERE tahun_ajaran=$1 AND semester=$2 AND santri_id = ANY($3)", [sem.tahun_ajaran, sem.semester, ids])).forEach((r: any) => (rows[r.santri_id] = r));
  const santri = list.map((s) => {
    const st = statusSantri(s, haf[s.id], prog[s.id], sert[s.id] || 0, sem, pb / T.PEKAN_PER_SEMESTER), p = prog[s.id];
    const hadirPct = p && p.pertemuan ? Math.round((p.hadir / p.pertemuan) * 100) : null;
    const r = rows[s.id];
    return {
      ...st, keterangan_master: s.keterangan || "",
      juz_selesai: haf[s.id]?.juz_selesai || [], juz_diuji_hafalan: haf[s.id]?.juz_diuji || [],
      saran: {
        tahfidz: st.jenis_target === "tahsin" ? (p?.ziyadah ? "A+" : "") : T.predikatTahfidz(st.capai, st.target, st.semester_ke),
        tahfidz_info: st.jenis_target === "tahsin" ? (p?.ziyadah ? `Semester 1 tanpa target; sudah mulai menghafal (${halTeks(p.ziyadah)}) → A+` : "Semester 1: fokus tahsin, belum ada target hafalan")
          : st.target ? `${st.capai_teks} dari ${st.target_teks} (${st.persen}%)` : "",
        kehadiran: saranKehadiran(hadirPct), kehadiran_info: hadirPct == null ? "Belum ada data kehadiran semester ini" : `Hadir ${hadirPct}% dari ${p.pertemuan} pertemuan`,
      },
      ujian: r ? {
        makhraj_nilai: r.makhraj_nilai == null ? null : Number(r.makhraj_nilai), makhraj: r.makhraj, ket_makhraj: r.ket_makhraj,
        tajwid_nilai: r.tajwid_nilai == null ? null : Number(r.tajwid_nilai), tajwid: r.tajwid, ket_tajwid: r.ket_tajwid,
        tahfidz: r.tahfidz, ket_tahfidz: r.ket_tahfidz, kehadiran: r.kehadiran, ket_kehadiran: r.ket_kehadiran,
        perkembangan: r.perkembangan, ket_perkembangan: r.ket_perkembangan, catatan: r.catatan, penguji: r.penguji, tanggal: r.tanggal,
        diperbarui_oleh: r.diperbarui_oleh, tahfidz_ujian: Array.isArray(r.tahfidz_ujian) ? r.tahfidz_ujian : [],
        ujian_v2: T.isUjianV2(r.tahfidz_ujian), ujian_status: r.ujian_status || "", tahfidz_nilai: r.tahfidz_nilai == null ? null : Number(r.tahfidz_nilai),
      } : null,
    };
  });
  // Makhraj & tajwid: penilaian terakhir dalam semester (diisi di menu Santri)
  const pnRows = ids.length ? await q("SELECT DISTINCT ON (santri_id) santri_id, ym, makhraj_nilai, makhraj, tajwid_nilai, tajwid FROM penilaian_tajwid WHERE santri_id = ANY($1) AND ym >= $2 AND ym <= $3 ORDER BY santri_id, ym DESC", [ids, sem.dari, sem.sampai]) : [];
  const pnMap: Record<string, any> = {};
  pnRows.forEach((r: any) => (pnMap[r.santri_id] = { ym: r.ym, makhraj: r.makhraj, tajwid: r.tajwid, makhraj_nilai: r.makhraj_nilai == null ? null : Number(r.makhraj_nilai), tajwid_nilai: r.tajwid_nilai == null ? null : Number(r.tajwid_nilai) }));
  santri.forEach((x: any) => (x.penilaian = pnMap[x.id] || null));
  const uj: Record<string, any> = {};
  santri.forEach((x) => { if (x.ujian) uj[x.id] = x.ujian; });
  const dist: Record<string, Record<string, number>> = {};
  T.ASPEK.forEach((a) => (dist[a.key] = {}));
  santri.forEach((x) => { if (!x.ujian) return; T.ASPEK.forEach((a) => { const v = (x.ujian as any)[a.key]; if (v) dist[a.key][v] = (dist[a.key][v] || 0) + 1; }); });
  return { periode: sem, sekarang: now, santri, ringkasan: { total: santri.length, dinilai: santri.filter((x) => x.ujian).length, distribusi: dist }, makhraj_tajwid: makhrajTajwidRekap(list, uj) };
}

/** Daftar juz yang diujikan beserta jumlah kesalahan (lupa, besar, kecil). */
function ujianTahfidzValid(v: any): T.UjianJuz[] {
  if (v == null || v === "") return [];
  if (!Array.isArray(v) || v.length > 30) throw new Error("Daftar juz ujian tidak valid.");
  const seen = new Set<number>();
  return v.map((x: any) => {
    const juz = Number(x?.juz);
    if (!Number.isInteger(juz) || juz < 1 || juz > 30 || seen.has(juz)) throw new Error("Juz ujian harus 1–30 tanpa duplikasi.");
    seen.add(juz);
    const n = (k: string, l: string) => U.optionalInt(x?.[k], `Juz ${juz}: ${l}`, 0, 500) || 0;
    return { juz, lupa: n("lupa", "lupa"), besar: n("besar", "kesalahan besar"), kecil: n("kecil", "kesalahan kecil") };
  }).sort((a, b) => b.juz - a.juz);
}

export async function saveUjian(u: User, santriId: any, tahunAjaran: any, semester: any, d: any, ctx: Ctx) {
  const s = await findSantri(u, santriId);
  const sem = T.parseTa(String(tahunAjaran || ""), Number(semester) === 2 ? 2 : 1);
  if (!/^\d{4}\/\d{4}$/.test(sem.tahun_ajaran) || sem.ta < 2020 || sem.ta > 2100) throw new Error("Tahun ajaran tidak valid.");
  d = d || {};
  const pred = (v: any, allowed: readonly string[], label: string) => {
    const x = String(v || "").trim().toUpperCase();
    if (x && !allowed.includes(x)) throw new Error(`Predikat ${label} tidak valid.`);
    return x;
  };
  const nilai = (v: any, label: string) => (v === "" || v == null ? null : U.optionalScore(v, label));
  const pn = await penilaianSemester(s.id, sem);
  if (pn) {
    if (d.makhraj == null || d.makhraj === "") { d.makhraj = pn.makhraj; d.makhraj_nilai = pn.makhraj_nilai ?? ""; d.ket_makhraj = d.ket_makhraj || pn.ket_makhraj; }
    if (d.tajwid == null || d.tajwid === "") { d.tajwid = pn.tajwid; d.tajwid_nilai = pn.tajwid_nilai ?? ""; d.ket_tajwid = d.ket_tajwid || pn.ket_tajwid; }
  }
  const makhraj_nilai = nilai(d.makhraj_nilai, "Nilai makhraj"), tajwid_nilai = nilai(d.tajwid_nilai, "Nilai tajwid");
  const ujianJuz = ujianTahfidzValid(d.tahfidz_ujian);
  const tahfidz_nilai = ujianJuz.length ? T.skorUjianTahfidz(ujianJuz) : null;
  if (tahfidz_nilai != null && !d.tahfidz) d.tahfidz = T.predikatNilai(tahfidz_nilai);
  if (tahfidz_nilai != null && !String(d.ket_tahfidz || "").trim()) d.ket_tahfidz = T.ringkasUjianTahfidz(ujianJuz);
  const rec: any = {
    id: `${s.id}|${sem.tahun_ajaran}|${sem.semester}`, santri_id: s.id, santri_nama: U.clip(s.nama, 200), unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif,
    tahun_ajaran: sem.tahun_ajaran, semester: sem.semester,
    makhraj_nilai, makhraj: pred(d.makhraj, T.PREDIKAT, "makhraj") || T.predikatNilai(makhraj_nilai),
    tajwid_nilai, tajwid: pred(d.tajwid, T.PREDIKAT, "tajwid") || T.predikatNilai(tajwid_nilai),
    tahfidz: pred(d.tahfidz, T.PREDIKAT_TAHFIDZ, "tahfidz"), kehadiran: pred(d.kehadiran, T.PREDIKAT, "kehadiran"), perkembangan: pred(d.perkembangan, T.PREDIKAT, "perkembangan"),
    ket_makhraj: U.safeText(d.ket_makhraj, 600), ket_tajwid: U.safeText(d.ket_tajwid, 600), ket_tahfidz: U.safeText(d.ket_tahfidz, 600),
    ket_kehadiran: U.safeText(d.ket_kehadiran, 600), ket_perkembangan: U.safeText(d.ket_perkembangan, 600),
    catatan: U.safeText(d.catatan, 1000), penguji: U.clip(U.safeText(d.penguji || u.nama, 120), 120),
    tanggal: /^\d{4}-\d{2}-\d{2}$/.test(String(d.tanggal || "")) ? String(d.tanggal) : U.todayWib(),
    diperbarui_oleh: U.clip(u.username, 100), diperbarui_pada: new Date().toISOString(),
    tahfidz_ujian: JSON.stringify(ujianJuz), tahfidz_nilai,
  };
  if (rec.tanggal > U.todayWib()) throw new Error("Tanggal ujian tidak boleh melebihi hari ini.");
  if (!T.ASPEK.some((a) => rec[a.key])) throw new Error("Isi minimal satu predikat aspek.");
  await tx(async (run) => {
    const old = (await run("SELECT * FROM ujian_semester WHERE id=$1", [rec.id]))[0] || null;
    // Ujian format baru (v2, menu Ujian Semester) tidak ditimpa oleh form penilaian lama.
    if (T.isUjianV2(old?.tahfidz_ujian)) { rec.tahfidz_ujian = JSON.stringify(old.tahfidz_ujian); rec.tahfidz_nilai = old.tahfidz_nilai; ujianJuz.length = 0; }
    else if (ujianJuz.length) rec.ujian_status = "final";
    const cols = Object.keys(rec);
    await run(`INSERT INTO ujian_semester (${cols.join(",")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(",")})
      ON CONFLICT (santri_id, tahun_ajaran, semester) DO UPDATE SET ${cols.filter((c) => !["id", "santri_id", "tahun_ajaran", "semester"].includes(c)).map((c) => c + "=EXCLUDED." + c).join(",")}`, cols.map((c) => rec[c]));
    const { tahfidz_ujian: _tj, ...lain } = rec;
    await enqueue(run, "UjianSemester", "upsert", { ...lain, makhraj_nilai: rec.makhraj_nilai ?? "", tajwid_nilai: rec.tajwid_nilai ?? "", tahfidz_nilai: rec.tahfidz_nilai ?? "",
      rincian_ujian_tahfidz: ujianJuz.map((j) => `Juz ${j.juz}: lupa ${j.lupa}, besar ${j.besar}, kecil ${j.kecil}`).join("; "), diperbarui_pada: rec.diperbarui_pada });
    await audit(run, u, old ? "UPDATE" : "CREATE", "UjianSemester", rec.id, old, rec);
  });
  // Juz yang sudah diujikan ikut ditandai oranye di peta juz santri (dan dianggap selesai dihafal).
  if (ujianJuz.length) {
    const h = (await q("SELECT juz_selesai, juz_diuji FROM hafalan WHERE santri_id=$1", [s.id]))[0] || {};
    const sel = U.parseJuzList(h.juz_selesai), uji = U.parseJuzList(h.juz_diuji);
    const ns = U.parseJuzList([...sel, ...ujianJuz.map((j) => j.juz)]), nu = U.parseJuzList([...uji, ...ujianJuz.map((j) => j.juz)]);
    if (ns.join() !== sel.join() || nu.join() !== uji.join())
      await upsertHafalan(u, s, { juz_selesai: ns.join(","), juz_diuji: nu.join(","), diperbarui_oleh: U.clip(u.username, 100), diperbarui_pada: new Date().toISOString() }, "UJIAN_JUZ", ctx);
  }
  await ctx.kick();
  return { ok: true, makhraj: rec.makhraj, tajwid: rec.tajwid, tahfidz: rec.tahfidz, tahfidz_nilai };
}

/* ============ notifikasi: bagian yang belum diisi padahal periodenya sudah masuk/lewat ============ */
/** Syarat SQL cakupan (unit/jenjang/tingkat/halaqah/putra-putri) + kepemilikan musyrif, untuk tabel ber-kolom unit/tingkat/halaqah_key/musyrif.
 *  `start` = nomor parameter pertama ($start). `hist` = true untuk riwayat keanggotaan (musyrif dicocokkan dengan nama ATAU username). */
function filterSantriSql(u: User, hk: string | undefined, al: string, start: number, hist = false) {
  const parts: string[] = [], params: any[] = [];
  const add = (sql: string, v: any) => { params.push(v); parts.push(sql.replace("?", "$" + (start + params.length - 1))); };
  if (!isPimpinan(u)) {
    const my = norm(u.musyrif_master || u.nama);
    if (hist) { params.push(my, norm(u.username)); parts.push(`${NS(al + ".musyrif")} IN ($${start + params.length - 2}, $${start + params.length - 1})`); }
    else add(`${NS(al + ".musyrif")} = ?`, my);
  }
  const sc = U.parseScope(hk);
  if (sc?.hk) add(`${al}.halaqah_key = ?`, sc.hk);
  else {
    if (sc?.unit) add(`${al}.unit = ?`, sc.unit);
    if (sc?.jenjang) add(`upper(split_part(trim(${al}.unit), ' ', 1)) = ?`, sc.jenjang);
    if (sc?.tingkat) add(`${al}.tingkat = ?`, sc.tingkat);
    if (sc?.gender) add(`lower(${al}.unit) LIKE ?`, "%" + sc.gender.toLowerCase() + "%");
  }
  return { sql: parts.length ? " AND " + parts.join(" AND ") : "", params };
}
/** Per bulan: tiap halaqah → jumlah anggota & jumlah yang sudah disetor tiap pekan (f1..f4). Anggota bulan itu diambil dari
 *  riwayat keanggotaan bila ada, selain itu dari data santri saat ini (aturan yang sama dengan memberMapByMonth). */
async function ringkasPengisian(u: User, hk: string | undefined, months: string[]) {
  const out: Record<string, any[]> = {};
  if (!months.length) return out;
  const has = new Set((await memoQ("SELECT DISTINCT ym FROM keanggotaan_histori WHERE ym = ANY($1)", [[...months].sort()])).map((r: any) => r.ym));
  const ada = months.filter((m) => has.has(m)), tidak = months.filter((m) => !has.has(m));
  const fh = filterSantriSql(u, hk, "h", 2, true);
  const fs = filterSantriSql(u, hk, "s", 2 + fh.params.length + 1);
  const KEY = (al: string) => `coalesce(nullif(${al}.halaqah_key, ''), concat_ws(' | ', trim(${al}.unit), trim(${al}.tingkat), trim(${al}.halaqah)))`;
  const fcols = Array.from({ length: U.JUMLAH_PEKAN }, (_, i) => `count(DISTINCT st.santri_id) FILTER (WHERE st.pekan = ${i + 1})::int AS f${i + 1}`).join(", ");
  const sql = `WITH m AS (
      SELECT h.ym, h.santri_id, ${KEY("h")} AS hk, h.unit, h.tingkat, h.halaqah, h.musyrif FROM keanggotaan_histori h WHERE h.ym = ANY($1)${fh.sql}
      UNION ALL
      SELECT x.ym, s.id, ${KEY("s")}, s.unit, s.tingkat, s.halaqah, s.musyrif FROM santri s CROSS JOIN unnest($${2 + fh.params.length}::text[]) AS x(ym) WHERE s.aktif${fs.sql})
    SELECT m.ym, m.hk AS halaqah_key, min(m.unit) AS unit, min(m.tingkat) AS tingkat, min(m.halaqah) AS halaqah, min(m.musyrif) AS musyrif,
      count(DISTINCT m.santri_id)::int AS total, ${fcols}
    FROM m LEFT JOIN setoran st ON st.ym = m.ym AND st.santri_id = m.santri_id
    GROUP BY m.ym, m.hk`;
  (await q(sql, [ada, ...fh.params, tidak, ...fs.params])).forEach((r: any) => (out[r.ym] = out[r.ym] || []).push(r));
  return out;
}

/** Notifikasi hanya menghitung pekan mulai Pekan 3 Juli 2026 (keputusan pimpinan). */
const NOTIF_MULAI = { ym: "2026-07", pekan: 3 };
export async function getNotifikasi(u: User, hk?: string) {
  const n = U.nowWib(), sem = T.semesterOf(n.ym), pk = U.pekanForDay(n.hari);
  const months = U.ymRange(sem.dari, n.ym);
  // Hemat egress: jumlah anggota & yang sudah disetor per (bulan, halaqah, pekan) dihitung di database.
  const ring = await ringkasPengisian(u, hk, months);
  const abaikan = new Set((await q("SELECT kunci FROM notif_abaikan WHERE username=$1", [u.username])).map((r: any) => r.kunci));
  let diabaikan = 0;
  const per: any[] = [], hq: Record<string, any> = {};
  months.forEach((ym) => {
    const grp = ring[ym] || [], weeks = ym < n.ym ? U.JUMLAH_PEKAN : pk;
    for (let w = 1; w <= weeks; w++) {
      if (ym < NOTIF_MULAI.ym || (ym === NOTIF_MULAI.ym && w < NOTIF_MULAI.pekan)) continue; // pekan sebelum hitungan dimulai
      grp.forEach((g: any) => {
        const k = g.halaqah_key, belum = g.total - (Number(g["f" + w]) || 0);
        if (belum <= 0) return;
        if (abaikan.has(`${ym}|${w}|${k}`)) { diabaikan++; return; }
        const it = { kunci: `${ym}|${w}|${k}`, ym, tahun: Number(ym.slice(0, 4)), bulan: Number(ym.slice(5, 7)), pekan: w, belum, total: g.total, berjalan: ym === n.ym && w === pk,
          halaqah_key: k, halaqah: g.halaqah, unit: g.unit, tingkat: g.tingkat, musyrif: g.musyrif };
        per.push(it);
        const h = (hq[k] = hq[k] || { halaqah_key: k, halaqah: g.halaqah, unit: g.unit, tingkat: g.tingkat, musyrif: g.musyrif, pekan: [], belum: 0, lewat: 0 });
        h.pekan.push(it); h.belum += belum; if (!it.berjalan) h.lewat++;
      });
    }
  });
  per.sort((a, b) => (b.ym + b.pekan).localeCompare(a.ym + a.pekan) || String(a.halaqah_key).localeCompare(String(b.halaqah_key)));
  // Ujian semester: diingatkan pada bulan terakhir semester (Des/Jun) dan bulan pertama semester berikutnya (Jul/Jan).
  let ujian: any = null;
  const bulan = n.bulan;
  const target = bulan === 12 || bulan === 6 ? sem : bulan === 7 || bulan === 1 ? T.semesterOf(bulan === 1 ? `${n.tahun - 1}-12` : `${n.tahun}-06`) : null;
  if (target) {
    // Hemat egress: cukup jumlahnya (dihitung di database), bukan daftar santri.
    const f = filterSantriSql(u, hk, "s", 3);
    const c = (await q(`SELECT count(*)::int AS total, count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ujian_semester x WHERE x.santri_id = s.id AND x.tahun_ajaran = $1 AND x.semester = $2))::int AS done
      FROM santri s WHERE s.aktif${f.sql}`, [target.tahun_ajaran, target.semester, ...f.params]))[0];
    const kj = `ujian|${target.tahun_ajaran}|${target.semester}`;
    if (c.total - c.done > 0) { if (abaikan.has(kj)) diabaikan++; else ujian = { kunci: kj, tahun_ajaran: target.tahun_ajaran, semester: target.semester, nama: target.nama, belum: c.total - c.done, total: c.total, lewat: target !== sem }; }
  }
  const lewat = per.filter((x) => !x.berjalan);
  return {
    periode: { ...sem, pekan: pk, ym: n.ym },
    setoran: { pekan_belum: per.length, pekan_lewat: lewat.length, santri_pekan_belum: per.reduce((t, x) => t + x.belum, 0), items: per.slice(0, 30) },
    halaqah: Object.values(hq).sort((a: any, b: any) => b.lewat - a.lewat || b.belum - a.belum || String(a.halaqah_key).localeCompare(String(b.halaqah_key))).slice(0, 40), halaqah_count: Object.keys(hq).length,
    ujian, diabaikan,
    total: (isPimpinan(u) ? Object.values(hq).filter((h: any) => h.lewat > 0).length : lewat.length) + (ujian ? 1 : 0),
  };
}

/* ============ riwayat pekan (kartu beranda yang bisa digeser) ============ */
export async function getPekanRiwayat(u: User, hk?: string, n = 8) {
  const now = U.nowWib(), pk = U.pekanForDay(now.hari);
  const weeks: { ym: string; pekan: number }[] = [];
  let ym = now.ym, w = pk;
  for (let i = 0; i < Math.min(Math.max(Number(n) || 8, 1), 16); i++) {
    weeks.push({ ym, pekan: w });
    w--; if (w < 1) { w = U.JUMLAH_PEKAN; const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)); ym = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`; }
  }
  const months = Array.from(new Set(weeks.map((x) => x.ym)));
  const members = await memberMapByMonth(u, months, hk, []);
  // Hemat egress: jumlah terisi & tercapai per pekan dihitung di database (hanya anggota halaqah pada bulan itu).
  const pairs = months.flatMap((m) => Object.keys(members[m] || {}).map((id) => m + "|" + id));
  const haf = await totalHafalanMap(await santriForUser(u));
  const lulus = Object.keys(haf).filter((id) => haf[id]?.lulus_target);
  const cnt: Record<string, any> = {};
  if (pairs.length) (await q(`SELECT ym, pekan, count(*)::int AS terisi,
      count(*) FILTER (WHERE santri_id = ANY($2) OR (ziyadah_baris >= $3 AND murajaah_baris >= $4))::int AS tercapai
    FROM setoran WHERE ym = ANY($5) AND (ym || '|' || santri_id) = ANY($1) GROUP BY ym, pekan`,
    [pairs, lulus, U.TARGET_ZIYADAH_BARIS, U.TARGET_MURAJAAH_BARIS, months])).forEach((r: any) => (cnt[r.ym + "|" + r.pekan] = r));
  return weeks.map(({ ym, pekan }) => {
    const sid = Object.keys(members[ym] || {}), c = cnt[ym + "|" + pekan];
    const terisi = c?.terisi || 0, tercapai = c?.tercapai || 0;
    const tahun = Number(ym.slice(0, 4)), bulan = Number(ym.slice(5, 7));
    const akhir = pekan < U.JUMLAH_PEKAN ? pekan * 7 : new Date(tahun, bulan, 0).getDate();
    return { ym, tahun, bulan, pekan, dari_tgl: (pekan - 1) * 7 + 1, sampai_tgl: akhir, berjalan: ym === now.ym && pekan === pk,
      total: sid.length, terisi, belum: Math.max(0, sid.length - terisi), tercapai, persen: sid.length ? Math.round((terisi / sid.length) * 100) : 0 };
  });
}

/* ============ penilaian makhraj & tajwid (menu Santri) ============ */
async function latestPenilaianMap(ids: string[]) {
  const m: Record<string, any> = {};
  if (!ids.length) return m;
  (await q("SELECT DISTINCT ON (santri_id) santri_id, ym, tanggal, makhraj_nilai, makhraj, tajwid_nilai, tajwid FROM penilaian_tajwid WHERE santri_id = ANY($1) ORDER BY santri_id, ym DESC", [ids]))
    .forEach((r: any) => (m[r.santri_id] = { ym: r.ym, tanggal: r.tanggal, makhraj: r.makhraj, tajwid: r.tajwid,
      makhraj_nilai: r.makhraj_nilai == null ? null : Number(r.makhraj_nilai), tajwid_nilai: r.tajwid_nilai == null ? null : Number(r.tajwid_nilai) }));
  return m;
}
async function tajwidChart(ids: string[], dari: string, sampai: string) {
  const months = U.ymRange(dari, sampai);
  const out = { labels: months.map((m) => ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][Number(m.slice(5, 7)) - 1] + " " + m.slice(2, 4)), keys: months, makhraj_avg: [] as (number | null)[], tajwid_avg: [] as (number | null)[],
    makhraj_bplus: [] as (number | null)[], tajwid_bplus: [] as (number | null)[], dinilai: [] as number[], total_dinilai: 0 };
  const rows = ids.length ? await q("SELECT santri_id, ym, makhraj_nilai, makhraj, tajwid_nilai, tajwid FROM penilaian_tajwid WHERE ym >= $1 AND ym <= $2 AND santri_id = ANY($3)", [dari, sampai, ids]) : [];
  const by: Record<string, any[]> = {};
  rows.forEach((r: any) => (by[r.ym] = by[r.ym] || []).push(r));
  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
  const pct = (a: any[], k: string) => { const v = a.filter((r) => r[k]); return v.length ? Math.round((v.filter((r) => T.minimalBPlus(r[k])).length / v.length) * 100) : null; };
  months.forEach((m) => {
    const a = by[m] || [];
    out.makhraj_avg.push(avg(a.filter((r) => r.makhraj_nilai != null).map((r) => Number(r.makhraj_nilai))));
    out.tajwid_avg.push(avg(a.filter((r) => r.tajwid_nilai != null).map((r) => Number(r.tajwid_nilai))));
    out.makhraj_bplus.push(pct(a, "makhraj")); out.tajwid_bplus.push(pct(a, "tajwid")); out.dinilai.push(a.length);
  });
  out.total_dinilai = rows.length;
  return out;
}
export async function getPenilaianTajwid(u: User, santriId: any) {
  const s = await findSantri(u, santriId);
  const rows = await q("SELECT ym, tanggal, makhraj_nilai, makhraj, ket_makhraj, tajwid_nilai, tajwid, ket_tajwid, catatan, penilai FROM penilaian_tajwid WHERE santri_id=$1 ORDER BY ym DESC LIMIT 24", [s.id]);
  return {
    santri: { id: s.id, nama: s.nama },
    riwayat: rows.map((r: any) => ({ ...r, makhraj_nilai: r.makhraj_nilai == null ? null : Number(r.makhraj_nilai), tajwid_nilai: r.tajwid_nilai == null ? null : Number(r.tajwid_nilai) })),
    perkembangan: await perkembanganTajwid(s.id, T.semesterOf(U.nowWib().ym).dari, U.nowWib().ym),
  };
}
/** Perkembangan bacaan per bulan: huruf tahsin tiap pekan (dari setoran) + penilaian makhraj & tajwid bulanan.
 *  Dihitung di database; yang dikirim hanya huruf ringkas (hemat egress). */
export async function perkembanganTajwid(santriId: string, dari: string, sampai: string) {
  const pekan = await q(`SELECT ym, pekan, nilai_tahsin FROM setoran WHERE santri_id=$1 AND ym >= $2 AND ym <= $3 AND nilai_tahsin IS NOT NULL ORDER BY ym, pekan`, [santriId, dari, sampai]);
  const pn = await q(`SELECT ym, makhraj, tajwid FROM penilaian_tajwid WHERE santri_id=$1 AND ym >= $2 AND ym <= $3`, [santriId, dari, sampai]);
  const m: Record<string, any> = {};
  const get = (ym: string) => (m[ym] ??= { ym, tahsin: {} as Record<number, string>, rata: "", makhraj: "", tajwid: "" });
  const sum: Record<string, number[]> = {};
  pekan.forEach((r: any) => { get(r.ym).tahsin[r.pekan] = T.hurufNilai(r.nilai_tahsin); (sum[r.ym] ??= []).push(Number(r.nilai_tahsin)); });
  Object.entries(sum).forEach(([ym, v]) => (m[ym].rata = T.hurufNilai(v.reduce((a, b) => a + b, 0) / v.length)));
  pn.forEach((r: any) => { const x = get(r.ym); x.makhraj = r.makhraj || ""; x.tajwid = r.tajwid || ""; });
  return Object.values(m).sort((a: any, b: any) => (a.ym < b.ym ? -1 : 1));
}
export async function savePenilaianTajwid(u: User, santriId: any, d: any, ctx: Ctx) {
  const s = await findSantri(u, santriId);
  d = d || {};
  const tanggal = /^\d{4}-\d{2}-\d{2}$/.test(String(d.tanggal || "")) ? String(d.tanggal) : U.todayWib();
  if (tanggal > U.todayWib()) throw new Error("Tanggal penilaian tidak boleh melebihi hari ini.");
  const pred = (v: any, label: string) => { const x = String(v || "").trim().toUpperCase(); if (x && !T.PREDIKAT.includes(x as any)) throw new Error(`Predikat ${label} tidak valid.`); return x; };
  const nilai = (v: any, label: string) => (v === "" || v == null ? null : U.optionalScore(v, label));
  const mn = nilai(d.makhraj_nilai, "Nilai makhraj"), tn = nilai(d.tajwid_nilai, "Nilai tajwid");
  const rec: any = {
    id: `${s.id}|${tanggal.slice(0, 7)}`, santri_id: s.id, santri_nama: U.clip(s.nama, 200), unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif,
    ym: tanggal.slice(0, 7), tanggal,
    makhraj_nilai: mn, makhraj: pred(d.makhraj, "makhraj") || T.predikatNilai(mn), ket_makhraj: U.safeText(d.ket_makhraj, 600),
    tajwid_nilai: tn, tajwid: pred(d.tajwid, "tajwid") || T.predikatNilai(tn), ket_tajwid: U.safeText(d.ket_tajwid, 600),
    catatan: U.safeText(d.catatan, 600), penilai: U.clip(U.safeText(d.penilai || u.nama, 120), 120),
    diperbarui_oleh: U.clip(u.username, 100), diperbarui_pada: new Date().toISOString(),
  };
  if (!rec.makhraj && !rec.tajwid) throw new Error("Isi nilai atau predikat makhraj/tajwid.");
  await tx(async (run) => {
    const old = (await run("SELECT * FROM penilaian_tajwid WHERE id=$1", [rec.id]))[0] || null;
    const cols = Object.keys(rec);
    await run(`INSERT INTO penilaian_tajwid (${cols.join(",")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(",")})
      ON CONFLICT (santri_id, ym) DO UPDATE SET ${cols.filter((c) => !["id", "santri_id", "ym"].includes(c)).map((c) => c + "=EXCLUDED." + c).join(",")}`, cols.map((c) => rec[c]));
    await enqueue(run, "PenilaianTajwid", "upsert", { ...rec, makhraj_nilai: rec.makhraj_nilai ?? "", tajwid_nilai: rec.tajwid_nilai ?? "" });
    await audit(run, u, old ? "UPDATE" : "CREATE", "PenilaianTajwid", rec.id, old, rec);
  });
  await ctx.kick();
  return { ok: true, makhraj: rec.makhraj, tajwid: rec.tajwid, ym: rec.ym };
}
/** Penilaian terakhir dalam rentang semester (untuk ujian & raport). */
async function penilaianSemester(santriId: string, sem: { dari: string; sampai: string }) {
  return (await q("SELECT makhraj_nilai, makhraj, ket_makhraj, tajwid_nilai, tajwid, ket_tajwid FROM penilaian_tajwid WHERE santri_id=$1 AND ym >= $2 AND ym <= $3 ORDER BY ym DESC LIMIT 1", [santriId, sem.dari, sem.sampai]))[0] || null;
}

/* ============ cakupan unit (Hadis Arbain bisa diakses semua musyrif satu unit) ============ */
async function santriSatuUnit(u: User) {
  if (isPimpinan(u)) return santriForUser(u);
  const mine = await santriForUser(u), units = Array.from(new Set(mine.map((s) => s.unit)));
  if (!units.length) return mine;
  const own = new Set(mine.map((s) => s.id));
  const rows = await q("SELECT id,nama,unit,tingkat,halaqah,halaqah_key,musyrif,program,keterangan FROM santri WHERE aktif AND unit = ANY($1) ORDER BY urut, nama", [units]);
  return rows.map((s: any) => ({ ...s, milik: own.has(s.id) }));
}

/** Hapus (abaikan) notifikasi tertentu; kunci dari getNotifikasi. */
export async function dismissNotif(u: User, keys: any) {
  const list = (Array.isArray(keys) ? keys : [keys]).map((k) => String(k || "").trim()).filter((k) => /^(\d{4}-\d{2}\|[1-4]\||ujian\|)/.test(k)).slice(0, 500);
  if (!list.length) throw new Error("Tidak ada notifikasi yang dipilih.");
  await q("INSERT INTO notif_abaikan (username, kunci) SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING", [u.username, list]);
  return { ok: true, jumlah: list.length };
}
/** Munculkan kembali semua notifikasi yang pernah dihapus. */
export async function restoreNotif(u: User) {
  const r = await q("DELETE FROM notif_abaikan WHERE username=$1 RETURNING kunci", [u.username]);
  return { ok: true, jumlah: r.length };
}

/* ============ kelola santri & musyrif (aplikasi = sumber utama data; Spreadsheet = cadangan satu arah) ============ */
/** MD5 (heksadesimal) — untuk ID santri: "S-" + 16 karakter pertama MD5("unit|nama" huruf kecil), sama dengan rumus Spreadsheet. */
export function md5hex(str: string): string {
  const msg = new TextEncoder().encode(str), len = msg.length, nb = ((len + 8) >> 6) + 1;
  const w = new Uint32Array(nb * 16);
  for (let i = 0; i < len; i++) w[i >> 2] |= msg[i] << ((i % 4) * 8);
  w[len >> 2] |= 0x80 << ((len % 4) * 8); w[nb * 16 - 2] = len * 8;
  const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let b = 0; b < nb; b++) {
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = (F + A + K[i] + w[b * 16 + g]) >>> 0; A = D; D = C; C = B;
      const r = S[(i >> 4) * 4 + (i % 4)]; B = (B + ((F << r) | (F >>> (32 - r)))) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  return [a0, b0, c0, d0].map((x) => [0, 8, 16, 24].map((k) => ((x >>> k) & 0xff).toString(16).padStart(2, "0")).join("")).join("");
}
export const santriIdOf = (unit: string, nama: string) => "S-" + md5hex(`${unit}|${nama}`.toLowerCase()).slice(0, 16).toUpperCase();
const rapikanNama = (v: any) => U.clip(String(v || "").replace(/\s+/g, " ").trim().toUpperCase(), 120);
function bersihkanCacheMaster() { masterCache = null; santriMusyrifCache.clear(); memoQCache.clear(); }

/** Semua halaqah: dari santri aktif + halaqah yang sudah dibuat (walau belum ada santri). */
async function daftarHalaqah() {
  const map: Record<string, any> = {};
  (await q("SELECT halaqah_key AS key, unit, tingkat, halaqah, max(musyrif) AS musyrif, count(*)::int AS jumlah FROM santri WHERE aktif GROUP BY 1,2,3,4")).forEach((r: any) => (map[r.key] = r));
  (await q("SELECT key, unit, tingkat, halaqah, musyrif FROM halaqah_def")).forEach((d: any) => { if (!map[d.key]) map[d.key] = { ...d, jumlah: 0 }; });
  return Object.values(map).sort((a: any, b: any) => (U.UNIT_ORDER.indexOf(a.unit) + 99) % 99 - (U.UNIT_ORDER.indexOf(b.unit) + 99) % 99 || Number(a.tingkat) - Number(b.tingkat) || String(a.halaqah).localeCompare(String(b.halaqah), "id", { numeric: true }));
}
async function halaqahMilik(u: User) {
  const all = await daftarHalaqah();
  if (isPimpinan(u)) return all;
  const my = norm(u.musyrif_master || u.nama);
  return all.filter((h: any) => norm(h.musyrif) === my);
}
/** Pastikan riwayat keanggotaan bulan ini sudah lengkap sebelum diubah satu per satu. */
async function pastikanHistoriBulanIni(run: any) {
  const ym = U.nowWib().ym;
  const ada = (await run("SELECT 1 FROM keanggotaan_histori WHERE ym=$1 LIMIT 1", [ym])).length;
  if (!ada) await run(`INSERT INTO keanggotaan_histori (ym, santri_id, nama, unit, tingkat, halaqah, halaqah_key, musyrif, program, keterangan)
    SELECT $1, id, nama, unit, tingkat, halaqah, halaqah_key, musyrif, program, keterangan FROM santri WHERE aktif ON CONFLICT DO NOTHING`, [ym]);
  return ym;
}
async function setHistoriBulanIni(run: any, s: any) {
  const ym = await pastikanHistoriBulanIni(run);
  await run(`INSERT INTO keanggotaan_histori (ym, santri_id, nama, unit, tingkat, halaqah, halaqah_key, musyrif, program, keterangan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (ym, santri_id) DO UPDATE SET nama=EXCLUDED.nama, unit=EXCLUDED.unit, tingkat=EXCLUDED.tingkat, halaqah=EXCLUDED.halaqah, halaqah_key=EXCLUDED.halaqah_key, musyrif=EXCLUDED.musyrif, program=EXCLUDED.program, keterangan=EXCLUDED.keterangan`,
    [ym, s.id, s.nama, s.unit, s.tingkat, s.halaqah, s.halaqah_key, s.musyrif, s.program || "", s.keterangan || ""]);
}
/** Kirim seluruh data master santri ke tab MASTER_SANTRI (menimpa; hanya antrean terbaru yang dikirim). */
async function antreMaster(ctx?: Ctx) {
  const rows = await q("SELECT id, unit, tingkat, halaqah, musyrif, nama, program, keterangan FROM santri WHERE aktif ORDER BY unit, tingkat, halaqah, nama");
  const data = rows.map((r: any) => ({ ID_SANTRI: r.id, UNIT: r.unit, TINGKAT: r.tingkat, HALAQAH: r.halaqah, MUSYRIF: r.musyrif, NAMA_SANTRI: r.nama, PROGRAM: r.program, KETERANGAN: r.keterangan, SUMBER_SHEET: "APLIKASI", SUMBER_BARIS: "", AKTIF: true }));
  await q("DELETE FROM sync_queue WHERE sheet='MASTER_SANTRI' AND status='pending'");
  await q("INSERT INTO sync_queue (sheet, op, payload) VALUES ('MASTER_SANTRI', 'replace', $1)", [JSON.stringify({ rows: data })]);
  bersihkanCacheMaster();
  if (ctx) await ctx.kick();
  return data.length;
}
const snapSantri = (r: any) => ({ id: r.id, nama: r.nama, unit: r.unit, tingkat: r.tingkat, halaqah: r.halaqah, halaqah_key: r.halaqah_key, musyrif: r.musyrif, program: r.program, keterangan: r.keterangan });

export async function tambahSantri(u: User, d: any, ctx: Ctx) {
  d = d || {};
  const nama = rapikanNama(d.nama);
  if (nama.length < 3) throw new Error("Nama santri minimal 3 huruf.");
  const program = String(d.program || "").toUpperCase() === "PK" ? "PK" : "Reguler";
  const hqs = await halaqahMilik(u);
  const hq: any = d.halaqah_key ? hqs.find((h: any) => h.key === d.halaqah_key) : hqs.length === 1 ? hqs[0] : null;
  if (!hq) throw new Error(hqs.length ? "Pilih halaqah tujuan." : "Anda belum memiliki halaqah.");
  const id = santriIdOf(hq.unit, nama);
  const res = await tx(async (run) => {
    const old = (await run("SELECT * FROM santri WHERE id=$1 FOR UPDATE", [id]))[0] || null;
    if (old && old.aktif) throw new Error(`${nama} sudah terdaftar di ${old.unit} ${old.tingkat} · ${old.halaqah}.`);
    const rec = { id, nama, unit: hq.unit, tingkat: String(hq.tingkat), halaqah: hq.halaqah, halaqah_key: hq.key, musyrif: hq.musyrif, program, keterangan: "" };
    if (old) await run(`UPDATE santri SET nama=$2, unit=$3, tingkat=$4, halaqah=$5, halaqah_key=$6, musyrif=$7, program=$8, aktif=true, status='aktif', status_alasan='', status_pada=now(), status_oleh=$9, status_sebelum=NULL WHERE id=$1`,
      [id, rec.nama, rec.unit, rec.tingkat, rec.halaqah, rec.halaqah_key, rec.musyrif, program, u.username]);
    else await run(`INSERT INTO santri (id, nama, unit, tingkat, halaqah, halaqah_key, musyrif, program, keterangan, aktif, urut, status, status_pada, status_oleh)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'',true,(SELECT coalesce(max(urut),0)+1 FROM santri),'aktif',now(),$9)`, [id, rec.nama, rec.unit, rec.tingkat, rec.halaqah, rec.halaqah_key, rec.musyrif, program, u.username]);
    await setHistoriBulanIni(run, rec);
    await audit(run, u, old ? "AKTIFKAN" : "TAMBAH", "Santri", id, old ? snapSantri(old) : null, rec);
    return { id, kembali: !!old };
  });
  await antreMaster(ctx);
  return { ok: true, ...res };
}
export async function editNamaSantri(u: User, santriId: any, namaBaru: any, ctx: Ctx) {
  const s = await findSantri(u, santriId), nama = rapikanNama(namaBaru);
  if (nama.length < 3) throw new Error("Nama santri minimal 3 huruf.");
  if (nama === s.nama) return { ok: true, sama: true };
  await tx(async (run) => {
    await run("UPDATE santri SET nama=$2 WHERE id=$1", [s.id, nama]);
    await setHistoriBulanIni(run, { ...s, nama });
    await audit(run, u, "UBAH NAMA", "Santri", s.id, { nama: s.nama }, { nama });
  });
  await antreMaster(ctx);
  return { ok: true, nama };
}
/** Musyrif/pimpinan: tandai santri keluar, atau pindah (masuk daftar tunggu penempatan pimpinan). Riwayat tetap tersimpan. */
export async function keluarkanSantri(u: User, santriId: any, d: any, ctx: Ctx) {
  const s = await findSantri(u, santriId); d = d || {};
  const jenis = d.jenis === "pindah" ? "pindah" : "keluar", alasan = U.safeText(d.alasan, 300);
  if (alasan.length < 3) throw new Error("Tuliskan alasannya (minimal 3 huruf).");
  await tx(async (run) => {
    const ym = await pastikanHistoriBulanIni(run);
    await run("UPDATE santri SET aktif=false, status=$2, status_alasan=$3, status_pada=now(), status_oleh=$4, status_sebelum=$5 WHERE id=$1",
      [s.id, jenis, alasan, u.username, JSON.stringify(snapSantri(s))]);
    await run("DELETE FROM keanggotaan_histori WHERE ym=$1 AND santri_id=$2", [ym, s.id]);
    await audit(run, u, jenis === "pindah" ? "PINDAH (MENUNGGU)" : "KELUAR", "Santri", s.id, snapSantri(s), { status: jenis, alasan });
  });
  await antreMaster(ctx);
  return { ok: true, status: jenis };
}
/** Pindahkan santri ke halaqah lain. Pimpinan: ke halaqah mana pun (termasuk dari daftar tunggu). Musyrif: antar-halaqahnya sendiri. */
export async function pindahkanSantri(u: User, santriId: any, halaqahKey: any, ctx: Ctx) {
  const id = String(santriId || ""), hqs = await halaqahMilik(u), hq: any = hqs.find((h: any) => h.key === String(halaqahKey || ""));
  if (!hq) throw new Error(isPimpinan(u) ? "Halaqah tujuan tidak ditemukan." : "Anda hanya bisa memindahkan ke halaqah Anda sendiri. Untuk halaqah lain, pilih \"Pindah halaqah\" agar ditempatkan pimpinan.");
  const row = (await q("SELECT * FROM santri WHERE id=$1", [id]))[0];
  if (!row) throw new Error("Santri tidak ditemukan.");
  if (!isPimpinan(u)) await findSantri(u, id); // musyrif hanya santrinya sendiri
  else if (!row.aktif && row.status === "keluar") throw new Error("Santri berstatus keluar. Batalkan statusnya dulu.");
  const rec = { ...snapSantri(row), unit: hq.unit, tingkat: String(hq.tingkat), halaqah: hq.halaqah, halaqah_key: hq.key, musyrif: hq.musyrif };
  await tx(async (run) => {
    await run("UPDATE santri SET unit=$2, tingkat=$3, halaqah=$4, halaqah_key=$5, musyrif=$6, aktif=true, status='aktif', status_alasan='', status_pada=now(), status_oleh=$7 WHERE id=$1",
      [id, rec.unit, rec.tingkat, rec.halaqah, rec.halaqah_key, rec.musyrif, u.username]);
    await setHistoriBulanIni(run, rec);
    await audit(run, u, "PINDAH HALAQAH", "Santri", id, snapSantri(row), rec);
  });
  await antreMaster(ctx);
  return { ok: true, halaqah: `${hq.unit} ${hq.tingkat} · ${hq.halaqah}` };
}
/** Pimpinan: batalkan status keluar/pindah → kembali ke halaqah sebelumnya. */
export async function batalkanStatusSantri(u: User, santriId: any, ctx: Ctx) {
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  const row = (await q("SELECT * FROM santri WHERE id=$1", [String(santriId || "")]))[0];
  if (!row || row.aktif) throw new Error("Santri tidak sedang berstatus keluar/pindah.");
  const prev = row.status_sebelum || {};
  const rec = { ...snapSantri(row), ...["unit", "tingkat", "halaqah", "halaqah_key", "musyrif"].reduce((o: any, k) => (prev[k] ? { ...o, [k]: prev[k] } : o), {}) };
  await tx(async (run) => {
    await run("UPDATE santri SET unit=$2, tingkat=$3, halaqah=$4, halaqah_key=$5, musyrif=$6, aktif=true, status='aktif', status_alasan='', status_pada=now(), status_oleh=$7, status_sebelum=NULL WHERE id=$1",
      [row.id, rec.unit, rec.tingkat, rec.halaqah, rec.halaqah_key, rec.musyrif, u.username]);
    await setHistoriBulanIni(run, rec);
    await audit(run, u, "BATAL " + String(row.status).toUpperCase(), "Santri", row.id, { status: row.status }, rec);
  });
  await antreMaster(ctx);
  return { ok: true };
}
/** Pimpinan: data halaman Kelola. */
export async function getKelola(u: User) {
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  const cols = "id, nama, unit, tingkat, halaqah, program, status, status_alasan, status_pada, status_oleh, status_sebelum";
  const [menunggu, keluar, akun, jumlah] = [
    await q(`SELECT ${cols} FROM santri WHERE NOT aktif AND status='pindah' ORDER BY status_pada DESC`),
    await q(`SELECT ${cols} FROM santri WHERE NOT aktif AND status='keluar' ORDER BY status_pada DESC LIMIT 100`),
    await q("SELECT username, nama, musyrif_master, aktif FROM akun WHERE role='musyrif' ORDER BY aktif DESC, nama"),
    await q(`SELECT ${NS("musyrif")} AS m, count(*)::int AS n, count(DISTINCT halaqah_key)::int AS h FROM santri WHERE aktif GROUP BY 1`),
  ];
  const jm: Record<string, any> = {}; jumlah.forEach((r: any) => (jm[r.m] = r));
  return {
    menunggu, keluar, halaqah: await daftarHalaqah(), units: U.UNIT_ORDER,
    musyrif: akun.map((a: any) => ({ ...a, santri: jm[norm(a.musyrif_master || a.nama)]?.n || 0, halaqah: jm[norm(a.musyrif_master || a.nama)]?.h || 0 })),
  };
}
/** Pimpinan: tambah musyrif sekaligus menetapkan halaqahnya (ambil alih halaqah yang ada, atau buat halaqah baru). */
export async function tambahMusyrif(u: User, d: any, ctx: Ctx) {
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  d = d || {};
  const nama = U.clip(String(d.nama || "").replace(/\s+/g, " ").trim(), 120);
  if (nama.length < 4) throw new Error("Nama musyrif/ah minimal 4 huruf (contoh: Ust. Ahmad Fauzi).");
  let username = String(d.username || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "") || usernameFromName(nama);
  const pakai = new Set((await q("SELECT lower(username) AS u FROM akun")).map((r: any) => r.u));
  if (d.username && pakai.has(username)) throw new Error(`Username ${username} sudah dipakai.`);
  for (let i = 2; pakai.has(username); i++) username = username.replace(/\d+$/, "") + i;
  if ((await q(`SELECT 1 FROM akun WHERE ${NS("musyrif_master")} = $1 AND aktif='Y'`, [norm(nama)])).length) throw new Error("Musyrif dengan nama itu sudah ada.");
  const password = String(d.password || "").trim() || U.DEFAULT_PASSWORD;
  const all = await daftarHalaqah();
  let hq: any = null;
  if (d.mode === "ambil") {
    hq = all.find((h: any) => h.key === d.halaqah_key);
    if (!hq) throw new Error("Pilih halaqah yang akan diambil alih.");
  } else if (d.mode === "baru") {
    const unit = String(d.unit || ""), tingkat = String(d.tingkat || "").trim(), halaqah = U.clip(String(d.halaqah || "").replace(/\s+/g, " ").trim().toUpperCase(), 80);
    if (!U.UNIT_ORDER.includes(unit) || !/^\d{1,2}$/.test(tingkat) || halaqah.length < 3) throw new Error("Lengkapi unit, tingkat, dan nama halaqah baru.");
    const key = U.halaqahKey(unit, tingkat, halaqah);
    if (all.some((h: any) => h.key === key)) throw new Error("Halaqah dengan nama itu sudah ada; pilih \"ambil alih\".");
    hq = { key, unit, tingkat, halaqah, baru: true };
  }
  const akun = { username, password, nama, role: "musyrif", musyrif_master: nama, aktif: "Y" };
  let pindah = 0;
  await tx(async (run) => {
    await run("INSERT INTO akun (username, password, nama, role, musyrif_master, aktif) VALUES ($1,$2,$3,$4,$5,$6)", [akun.username, akun.password, akun.nama, akun.role, akun.musyrif_master, akun.aktif]);
    await enqueue(run, "Akun", "upsert", akunSheetRow(akun));
    if (hq) {
      await run("INSERT INTO halaqah_def (key, unit, tingkat, halaqah, musyrif) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (key) DO UPDATE SET musyrif=EXCLUDED.musyrif", [hq.key, hq.unit, String(hq.tingkat), hq.halaqah, nama]);
      if (!hq.baru) {
        const ym = await pastikanHistoriBulanIni(run);
        pindah = (await run("UPDATE santri SET musyrif=$2 WHERE aktif AND halaqah_key=$1 RETURNING id", [hq.key, nama])).length;
        await run("UPDATE keanggotaan_histori SET musyrif=$3 WHERE ym=$1 AND halaqah_key=$2", [ym, hq.key, nama]);
      }
    }
    await audit(run, u, "TAMBAH MUSYRIF", "Akun", username, null, { username, nama, halaqah: hq?.key || "" });
  });
  await antreMaster(ctx);
  return { ok: true, username, password, santri_dipindah: pindah, halaqah: hq ? `${hq.unit} ${hq.tingkat} · ${hq.halaqah}` : "" };
}
/** Pimpinan: nonaktifkan musyrif; seluruh halaqahnya wajib diserahkan ke musyrif pengganti. */
export async function hapusMusyrif(u: User, username: any, pengganti: any, ctx: Ctx) {
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  const a = (await q("SELECT * FROM akun WHERE username=$1 AND role='musyrif'", [String(username || "")]))[0];
  if (!a || a.aktif !== "Y") throw new Error("Akun musyrif tidak ditemukan atau sudah nonaktif.");
  const p = (await q("SELECT * FROM akun WHERE username=$1 AND role='musyrif' AND aktif='Y'", [String(pengganti || "")]))[0];
  if (!p || p.username === a.username) throw new Error("Pilih musyrif pengganti yang aktif.");
  const lama = norm(a.musyrif_master || a.nama), baru = p.musyrif_master || p.nama;
  let n = 0;
  await tx(async (run) => {
    const ym = await pastikanHistoriBulanIni(run);
    n = (await run(`UPDATE santri SET musyrif=$2 WHERE aktif AND ${NS("musyrif")} = $1 RETURNING id`, [lama, baru])).length;
    await run(`UPDATE keanggotaan_histori SET musyrif=$3 WHERE ym=$1 AND ${NS("musyrif")} = $2`, [ym, lama, baru]);
    await run(`UPDATE halaqah_def SET musyrif=$2 WHERE ${NS("musyrif")} = $1`, [lama, baru]);
    await run("UPDATE akun SET aktif='N' WHERE username=$1", [a.username]);
    await run("DELETE FROM sesi WHERE data->>'username' = $1", [a.username]);
    await enqueue(run, "Akun", "upsert", akunSheetRow({ ...a, aktif: "N" }));
    await audit(run, u, "HAPUS MUSYRIF", "Akun", a.username, { aktif: "Y" }, { aktif: "N", pengganti: p.username, santri_dipindah: n });
  });
  await antreMaster(ctx);
  return { ok: true, santri_dipindah: n, pengganti: baru };
}
/** Pimpinan: kirim ulang seluruh data master & akun ke Spreadsheet (cadangan). */
export async function kirimMasterSpreadsheet(u: User, ctx: Ctx) {
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  const akun = await q("SELECT * FROM akun ORDER BY username");
  await tx(async (run) => { for (const a of akun) await enqueue(run, "Akun", "upsert", akunSheetRow(a)); });
  await q("UPDATE sync_queue SET status='pending', attempts=0 WHERE status='tunggu_gas'");
  // Jurnal halaqah musyrif: kirim ulang seluruhnya (jumlahnya kecil)
  await q(`DELETE FROM sync_queue WHERE sheet='JurnalHalaqahMusyrif' AND status IN ('pending','tunggu_gas')`);
  await q(`INSERT INTO sync_queue (sheet, op, payload)
    SELECT 'JurnalHalaqahMusyrif', 'upsert', jsonb_build_object('id', 'HM-' || c.id, 'halaqah', g.nama, 'pengampu', g.pengampu_nama, 'peserta', a.nama,
      'peserta_username', a.username, 'bulan', c.ym, 'pekan', c.pekan, 'tanggal', c.tanggal, 'kehadiran', c.kehadiran, 'ziyadah_surat', c.surat,
      'ziyadah_hal', c.halaman, 'nilai_kelancaran', c.nilai_kelancaran, 'nilai_makhraj', c.nilai_makhraj, 'nilai_tajwid', c.nilai_tajwid, 'keterangan', c.keterangan, 'dicatat_oleh', c.dicatat_oleh, 'diperbarui_pada', c.diperbarui_pada)
    FROM hm_catatan c JOIN hm_anggota a ON a.id = c.anggota_id JOIN hm_grup g ON g.id = c.grup_id ORDER BY c.id`);
  await q(`DELETE FROM sync_queue WHERE sheet='CapaianHalaqahMusyrif' AND status IN ('pending','tunggu_gas')`);
  await q(`INSERT INTO sync_queue (sheet, op, payload)
    SELECT 'CapaianHalaqahMusyrif', 'upsert', jsonb_build_object('id', 'HMA-' || a.id, 'halaqah', g.nama, 'peserta', a.nama, 'peserta_username', a.username,
      'target_juz', a.target_juz, 'juz_selesai', a.juz_selesai, 'juz_diuji', a.juz_diuji, 'aktif', CASE WHEN a.aktif THEN 'Y' ELSE 'N' END)
    FROM hm_anggota a JOIN hm_grup g ON g.id = a.grup_id ORDER BY a.id`);
  const n = await antreMaster(ctx);
  return { ok: true, santri: n, akun: akun.length };
}

/* ============ hadis arbain ============ */
export async function getArbain(u: User, hk?: string) {
  let santri: any[] = await santriSatuUnit(u);
  if (hk) santri = santri.filter((s) => U.inScope(s, hk));
  const ids = santri.map((s) => s.id);
  const rows = ids.length ? await q("SELECT santri_id, nomor, status, nilai, tanggal, catatan, diperbarui_pada FROM hadis_arbain WHERE santri_id = ANY($1)", [ids]) : [];
  const by: Record<string, any> = {};
  rows.forEach((r: any) => {
    const b = (by[r.santri_id] = by[r.santri_id] || { hadis: {}, hafal: 0, mengulang: 0, terakhir: "" });
    b.hadis[r.nomor] = { status: r.status, nilai: r.nilai == null ? null : Number(r.nilai), tanggal: r.tanggal, catatan: r.catatan };
    if (r.status === "hafal") b.hafal++; else b.mengulang++;
    if (r.tanggal > b.terakhir) b.terakhir = r.tanggal;
  });
  const perHadis = Array.from({ length: ARBAIN_TOTAL }, () => 0);
  rows.forEach((r: any) => { if (r.status === "hafal") perHadis[r.nomor - 1]++; });
  const list = santri.map((s) => {
    const b = by[s.id] || { hadis: {}, hafal: 0, mengulang: 0, terakhir: "" };
    return { id: s.id, nama: s.nama, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, halaqah_key: s.halaqah_key, musyrif: s.musyrif, milik: s.milik !== false, ...b };
  }).sort((a, b) => (a.unit + a.tingkat + a.halaqah).localeCompare(b.unit + b.tingkat + b.halaqah) || a.nama.localeCompare(b.nama));
  const totalHafal = list.reduce((t, s) => t + s.hafal, 0);
  return {
    total_hadis: ARBAIN_TOTAL, santri: list,
    ringkasan: {
      santri: list.length, total_hafal: totalHafal, rata: list.length ? Math.round((totalHafal / list.length) * 10) / 10 : 0,
      khatam: list.filter((s) => s.hafal >= ARBAIN_TOTAL).length, belum_mulai: list.filter((s) => s.hafal === 0 && s.mengulang === 0).length,
      per_hadis: perHadis,
    },
  };
}

export async function saveArbain(u: User, santriId: any, items: any, ctx: Ctx) {
  const s = (await santriSatuUnit(u)).find((x: any) => x.id === String(santriId));
  if (!s) throw new Error("Santri tidak berada di unit Anda.");
  if (!Array.isArray(items) || !items.length) throw new Error("Tidak ada perubahan yang disimpan.");
  if (items.length > ARBAIN_TOTAL) throw new Error("Maksimal 42 hadis per penyimpanan.");
  const today = U.todayWib();
  const clean = items.map((it: any) => {
    const nomor = U.requiredInt(it?.nomor, "Nomor hadis", 1, ARBAIN_TOTAL);
    const status = norm(it?.status);
    if (status && !["hafal", "mengulang"].includes(status)) throw new Error("Status hadis harus Hafal atau Mengulang.");
    const tanggal = String(it?.tanggal || today).trim();
    if (status && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error("Tanggal harus berformat yyyy-MM-dd.");
    if (status && tanggal > today) throw new Error("Tanggal setoran hadis tidak boleh melebihi hari ini.");
    return { nomor, status, tanggal, nilai: status ? U.optionalScore(it?.nilai, "Nilai hadis " + nomor) : null, catatan: U.safeText(it?.catatan, 500) };
  });
  const res = await tx(async (run) => {
    let saved = 0, removed = 0;
    const now = new Date().toISOString();
    for (const it of clean) {
      const id = s.id + "|" + it.nomor;
      const old = (await run("SELECT * FROM hadis_arbain WHERE id=$1", [id]))[0] || null;
      if (!it.status) {
        if (old) {
          await run("DELETE FROM hadis_arbain WHERE id=$1", [id]);
          await enqueue(run, "HadisArbain", "delete", { id });
          await audit(run, u, "DELETE", "HadisArbain", id, old, null);
          removed++;
        }
        continue;
      }
      const r: any = { id, santri_id: s.id, santri_nama: U.clip(s.nama, 200), unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif,
        nomor: it.nomor, status: it.status, nilai: it.nilai, tanggal: it.tanggal, catatan: it.catatan, diperbarui_oleh: U.clip(u.username, 100), diperbarui_pada: now };
      const cols = Object.keys(r);
      await run(`INSERT INTO hadis_arbain (${cols.join(",")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(",")})
        ON CONFLICT (santri_id, nomor) DO UPDATE SET ${cols.filter((c) => !["id", "santri_id", "nomor"].includes(c)).map((c) => c + "=EXCLUDED." + c).join(",")}`, cols.map((c) => r[c]));
      await enqueue(run, "HadisArbain", "upsert", arbainSheetRow(r));
      await audit(run, u, old ? "UPDATE" : "CREATE", "HadisArbain", id, old, r);
      saved++;
    }
    return { saved, removed };
  });
  await ctx.kick();
  return { ok: true, ...res };
}

/* ============ akun & admin ============ */
export async function getAkunList(u: User) {
  if (!isPimpinan(u)) return [{ ...u, aktif: "Y" }];
  return q("SELECT username,nama,role,musyrif_master,aktif FROM akun ORDER BY role DESC, nama");
}
export async function saveAkun(u: User, data: any, ctx: Ctx) {
  data = data || {};
  const uname = String(data.username || "").trim();
  if (!uname) throw new Error("Username wajib diisi.");
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(uname)) throw new Error("Username 3–40 karakter: huruf, angka, titik, garis bawah, atau strip.");
  if (!isPimpinan(u) && norm(uname) !== norm(u.username)) throw new Error("Anda hanya dapat mengubah akun sendiri.");
  if (data.password && String(data.password).length < 4) throw new Error("Password minimal 4 karakter.");
  await tx(async (run) => {
    const old = (await run("SELECT * FROM akun WHERE lower(username)=$1", [norm(uname)]))[0];
    let rec: any;
    if (old) {
      rec = {
        username: old.username, password: data.password || old.password, nama: data.nama || old.nama,
        role: isPimpinan(u) ? data.role || old.role : old.role,
        musyrif_master: isPimpinan(u) ? (data.musyrif_master !== undefined ? data.musyrif_master : old.musyrif_master) : old.musyrif_master,
        aktif: old.aktif,
      };
      await run("UPDATE akun SET password=$2, nama=$3, role=$4, musyrif_master=$5 WHERE username=$1", [rec.username, rec.password, rec.nama, rec.role, rec.musyrif_master]);
    } else {
      if (!isPimpinan(u)) throw new Error("Hanya pimpinan yang dapat membuat akun.");
      rec = { username: uname, password: data.password || U.DEFAULT_PASSWORD, nama: data.nama || uname, role: data.role || "musyrif", musyrif_master: data.musyrif_master || "", aktif: "Y" };
      await run("INSERT INTO akun (username,password,nama,role,musyrif_master,aktif) VALUES ($1,$2,$3,$4,$5,$6)", [rec.username, rec.password, rec.nama, rec.role, rec.musyrif_master, rec.aktif]);
    }
    await enqueue(run, "Akun", "upsert", akunSheetRow(rec));
    await audit(run, u, old ? "UPDATE" : "CREATE", "Akun", rec.username, old ? { role: old.role, musyrif_master: old.musyrif_master } : null, { role: rec.role, musyrif_master: rec.musyrif_master });
  });
  await ctx.kick();
  return { ok: true };
}
export async function setAkunAktif(u: User, username: string, aktif: boolean, ctx: Ctx) {
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  const st = aktif ? "Y" : "N";
  if (norm(username) === norm(u.username) && st === "N") throw new Error("Akun yang sedang dipakai tidak dapat dinonaktifkan.");
  await tx(async (run) => {
    const a = (await run("SELECT * FROM akun WHERE lower(username)=$1", [norm(username)]))[0];
    if (!a) throw new Error("Akun tidak ditemukan.");
    await run("UPDATE akun SET aktif=$2 WHERE username=$1", [a.username, st]);
    if (st === "N") { await run("DELETE FROM sesi WHERE lower(data->>'username')=$1", [norm(a.username)]); sessCache.clear(); }
    await enqueue(run, "Akun", "upsert", akunSheetRow({ ...a, aktif: st }));
    await audit(run, u, st === "Y" ? "ACTIVATE" : "DEACTIVATE", "Akun", a.username, { aktif: a.aktif }, { aktif: st });
  });
  await ctx.kick();
  return { ok: true, aktif: st };
}
export async function getMusyrifNames(u: User) {
  if (!isPimpinan(u)) return [];
  return Array.from(new Set((await readMaster()).map((s) => s.musyrif).filter(Boolean))).sort();
}
export async function generateAkunFromUI(u: User, ctx: Ctx) {
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  const n = await tx((run) => generateAkunMusyrif(run));
  await ctx.kick();
  return { ok: true, baru: n };
}
export async function refreshMaster(u: User, ctx: Ctx) {
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  const r = await refreshMasterFromSheet();
  masterCache = null;
  await ctx.kick();
  return { ok: true, ...r };
}
export async function getSyncStatus(u: User) {
  const counts = await q("SELECT status, count(*)::int AS n, max(last_error) AS err FROM sync_queue WHERE status <> 'done' GROUP BY status");
  const tunggu = counts.find((c: any) => c.status === "tunggu_gas")?.n || 0;
  const aktif = counts.filter((c: any) => c.status !== "tunggu_gas");
  const pending = aktif.reduce((a: number, c: any) => a + c.n, 0);
  const lastErr = aktif.find((c: any) => c.err)?.err || "";
  const last = await getMeta("last_sync");
  const imp = isPimpinan(u) ? await getMeta("import") : null;
  const santri = (await q("SELECT count(*)::int AS n FROM santri WHERE aktif"))[0].n;
  return { configured: gasConfigured(), pending, tunggu_gas: tunggu, last_error: lastErr, last_sync: last, import: imp, santri };
}
export async function startImport(u: User, ctx: Ctx) {
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  const pend = await q("SELECT count(*)::int AS n FROM sync_queue WHERE status <> 'done'");
  if (pend[0].n > 0) throw new Error("Masih ada " + pend[0].n + " perubahan yang sedang dikirim ke Spreadsheet. Coba lagi setelah selesai.");
  await q("INSERT INTO meta (key, value, updated_at) VALUES ('import', $1, now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()", [JSON.stringify({ status: "antre" })]);
  masterCache = null;
  await ctx.kick("import");
  return { ok: true };
}
export async function triggerSync(_u: User, ctx: Ctx) {
  // Beri kesempatan ulang untuk antrean yang sempat gagal berkali-kali (mis. Apps Script baru saja diperbarui)
  await q("UPDATE sync_queue SET attempts=0, status='pending' WHERE (status='pending' AND attempts >= 20) OR status='tunggu_gas'");
  await ctx.kick();
  return { ok: true };
}

/* =====================================================================
 * UJIAN SEMESTER v2 (Pedoman 2026/2027) & RAPOR AL-QUR'AN SATU LEMBAR F4
 * ===================================================================== */
const semDari = (ta?: any, sem?: any) => (ta && sem ? T.parseTa(String(ta), Number(sem) === 2 ? 2 : 1) : T.semesterOf(U.nowWib().ym));
const statusUjian = (r: any) => (!r ? "belum" : r.ujian_status === "final" ? "final" : r.ujian_status === "draft" ? "draft" : "belum");
/** Penguji boleh menguji semua santri di unit penugasannya. */
async function santriUjian(u: User, id: any) {
  const s = (await santriSatuUnit(u)).find((x: any) => x.id === String(id));
  if (!s) throw new Error("Santri di luar unit penugasan Anda.");
  return s;
}

export async function getUjianDaftar(u: User, ta?: any, sem?: any) {
  const periode = semDari(ta, sem), list: any[] = await santriSatuUnit(u), ids = list.map((s) => s.id);
  const rows: Record<string, any> = {};
  if (ids.length) (await q("SELECT santri_id, ujian_status, tahfidz_ujian, tahfidz_nilai, penguji, penguji_username, tanggal FROM ujian_semester WHERE tahun_ajaran=$1 AND semester=$2 AND santri_id = ANY($3)", [periode.tahun_ajaran, periode.semester, ids]))
    .forEach((r: any) => (rows[r.santri_id] = r));
  const santri = list.map((s) => {
    const r = rows[s.id], st = statusUjian(r);
    return {
      id: s.id, nama: s.nama, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, halaqah_key: s.halaqah_key, musyrif: s.musyrif, milik: s.milik !== false,
      status: st, nilai: st === "belum" || r.tahfidz_nilai == null ? null : Number(r.tahfidz_nilai),
      penguji: st === "belum" ? "" : r.penguji, penguji_username: st === "belum" ? "" : r.penguji_username,
      mode: T.isUjianV2(r?.tahfidz_ujian) ? r.tahfidz_ujian.mode : Array.isArray(r?.tahfidz_ujian) && r.tahfidz_ujian.length ? "lama" : "",
    };
  });
  const hq: Record<string, any> = {};
  santri.forEach((s) => {
    const h = (hq[s.halaqah_key] = hq[s.halaqah_key] || { key: s.halaqah_key, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif, jumlah: 0, selesai: 0 });
    h.jumlah++; if (s.status === "final") h.selesai++;
  });
  return {
    periode, sekarang: T.semesterOf(U.nowWib().ym), units: Array.from(new Set(santri.map((s) => s.unit))), halaqah: Object.values(hq), santri,
    ringkasan: { total: santri.length, selesai: santri.filter((s) => s.status === "final").length, draft: santri.filter((s) => s.status === "draft").length },
  };
}

export async function getUjianSantri(u: User, santriId: any, ta?: any, sem?: any) {
  const periode = semDari(ta, sem), s = await santriUjian(u, santriId);
  const h = (await totalHafalanMap([s]))[s.id];
  const r = (await q("SELECT * FROM ujian_semester WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3", [s.id, periode.tahun_ajaran, periode.semester]))[0] || null;
  const pn = await penilaianSemester(s.id, periode);
  const juz = h?.total?.juz_decimal || 0;
  const saran = h?.juz_selesai?.length || juz >= 1 ? "juz" : juz >= 0.25 ? "sebagian" : "tahsin";
  return {
    periode, santri: { id: s.id, nama: s.nama, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif },
    hafalan: { teks: h?.total?.teks || "0", juz, juz_selesai: h?.juz_selesai || [], juz_diuji: h?.juz_diuji || [] },
    penilaian: pn ? { makhraj: pn.makhraj || r?.makhraj || "", tajwid: pn.tajwid || r?.tajwid || "" } : r ? { makhraj: r.makhraj, tajwid: r.tajwid } : null,
    saran_mode: saran,
    ujian: r ? {
      status: statusUjian(r), data: T.isUjianV2(r.tahfidz_ujian) ? r.tahfidz_ujian : null, lama: Array.isArray(r.tahfidz_ujian) && r.tahfidz_ujian.length ? r.tahfidz_ujian : null,
      nilai: r.tahfidz_nilai == null ? null : Number(r.tahfidz_nilai), penguji: r.penguji, penguji_username: r.penguji_username, tanggal: r.tanggal,
    } : null,
  };
}

function hitungSoal(v: any, label: string) {
  const n = Number(v ?? 0);
  if (!Number.isInteger(n) || n < 0 || n > 99) throw new Error(`${label} harus bilangan 0–99.`);
  return n;
}
function validSoal(list: any, jumlah: number, label: string): T.Soal[] {
  if (!Array.isArray(list) || list.length !== jumlah) throw new Error(`${label}: jumlah soal harus ${jumlah}.`);
  return list.map((x: any, i: number) => ({
    khafi: hitungSoal(x?.khafi, `${label} soal ${i + 1} khafī`), jali: hitungSoal(x?.jali, `${label} soal ${i + 1} jalī`),
    lupa: hitungSoal(x?.lupa, `${label} soal ${i + 1} lupa`), tidak: hitungSoal(x?.tidak, `${label} soal ${i + 1} tidak menjawab`) > 0 ? 1 : 0,
  }));
}
function validUjianV2(d: any): T.UjianV2 {
  const mode = String(d?.mode || "");
  if (!["juz", "sebagian", "tahsin"].includes(mode)) throw new Error("Pilih materi ujian.");
  const items: T.UjianItem[] = [];
  if (mode === "juz") {
    const seen = new Set<number>();
    (Array.isArray(d.items) ? d.items : []).forEach((it: any) => {
      const j = Number(it?.juz);
      if (!Number.isInteger(j) || j < 1 || j > 30 || seen.has(j)) throw new Error("Juz ujian harus 1–30 tanpa duplikasi.");
      seen.add(j); items.push({ kind: "juz", juz: j, soal: validSoal(it.soal, T.SOAL_PER_JUZ, `Juz ${j}`) });
    });
    if (!items.length) throw new Error("Pilih minimal satu juz yang diujikan.");
    items.sort((a, b) => (b.juz || 0) - (a.juz || 0));
  } else if (mode === "sebagian") {
    const it = (d.items || [])[0] || {};
    const bagian = Array.from(new Set((Array.isArray(it.bagian) ? it.bagian : []).map(Number))).filter((b: any) => [1, 2, 3, 4].includes(b)).sort() as number[];
    if (bagian.length < 1 || bagian.length > 3) throw new Error("Pilih ¼, ½, atau ¾ Juz 30 (1–3 kelompok surat).");
    items.push({ kind: "sebagian", juz: 30, bagian, soal: validSoal(it.soal, T.SOAL_PER_JUZ, "Juz 30") });
  } else {
    const by: Record<string, any> = {};
    (d.items || []).forEach((it: any) => (by[it?.kind] = it));
    for (const k of ["fatihah", "najm"] as const) items.push({ kind: k, soal: validSoal(by[k]?.soal, 1, k === "fatihah" ? "Al-Fatihah" : "An-Najm") });
  }
  return { v: 2, mode: mode as any, items, catatan: U.safeText(d.catatan, 600) };
}

export async function saveUjianV2(u: User, santriId: any, ta: any, sem: any, d: any, final: any, ctx: Ctx) {
  const periode = semDari(ta, sem), s = await santriUjian(u, santriId);
  if (!/^\d{4}\/\d{4}$/.test(periode.tahun_ajaran)) throw new Error("Tahun ajaran tidak valid.");
  const data = validUjianV2(d), nilai = T.nilaiUjianV2(data), selesai = !!final, now = new Date().toISOString();
  const id = `${s.id}|${periode.tahun_ajaran}|${periode.semester}`;
  await tx(async (run) => {
    const old = (await run("SELECT * FROM ujian_semester WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3 FOR UPDATE", [s.id, periode.tahun_ajaran, periode.semester]))[0] || null;
    if (old?.ujian_status === "final" && !isPimpinan(u)) throw new Error("Ujian santri ini sudah final. Hubungi pimpinan bila perlu dibuka kembali.");
    if (old?.ujian_status === "draft" && old.penguji_username && old.penguji_username !== u.username && !isPimpinan(u))
      throw new Error(`Sedang diuji oleh ${old.penguji || old.penguji_username}. Gunakan Restart untuk mengambil alih.`);
    const rec: any = {
      id, santri_id: s.id, santri_nama: U.clip(s.nama, 200), unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif,
      tahun_ajaran: periode.tahun_ajaran, semester: periode.semester, tahfidz_ujian: JSON.stringify(data), tahfidz_nilai: nilai,
      ujian_status: selesai ? "final" : "draft", penguji: U.clip(u.nama, 120), penguji_username: U.clip(u.username, 100), tanggal: U.todayWib(),
      ujian_mulai: old?.ujian_mulai || now, diperbarui_oleh: U.clip(u.username, 100), diperbarui_pada: now,
    };
    const cols = Object.keys(rec), upd = cols.filter((c) => !["id", "santri_id", "tahun_ajaran", "semester", "ujian_mulai"].includes(c));
    await run(`INSERT INTO ujian_semester (${cols.join(",")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(",")})
      ON CONFLICT (santri_id, tahun_ajaran, semester) DO UPDATE SET ${upd.map((c) => c + "=EXCLUDED." + c).join(",")}`, cols.map((c) => rec[c]));
    if (selesai) await enqueue(run, "UjianSemester", "upsert", {
      id, santri_id: s.id, santri_nama: rec.santri_nama, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif, tahun_ajaran: periode.tahun_ajaran, semester: periode.semester,
      penguji: rec.penguji, tanggal: rec.tanggal, tahfidz_nilai: nilai ?? "", rincian_ujian_tahfidz: T.ringkasUjianV2(data), diperbarui_oleh: rec.diperbarui_oleh, diperbarui_pada: now,
    });
    await audit(run, u, selesai ? "UJIAN_FINAL" : "UJIAN_DRAFT", "UjianSemester", id, old ? { status: old.ujian_status, nilai: old.tahfidz_nilai } : null, { status: rec.ujian_status, nilai, mode: data.mode });
  });
  if (selesai) { try { await antreRaporSheet((await susunRapor([s], periode))[0], u); } catch (e) { console.error("rapor sheet", e); } }
  // Juz utuh yang lulus KKM ditandai sudah diuji pada peta juz santri.
  if (selesai && data.mode === "juz") {
    const lulus = data.items.filter((it) => T.nilaiItem(it) >= T.KKM).map((it) => it.juz as number);
    if (lulus.length) {
      const h = (await q("SELECT juz_selesai, juz_diuji FROM hafalan WHERE santri_id=$1", [s.id]))[0] || {};
      const sel = U.parseJuzList(h.juz_selesai), uji = U.parseJuzList(h.juz_diuji);
      const ns = U.parseJuzList([...sel, ...lulus]), nu = U.parseJuzList([...uji, ...lulus]);
      if (ns.join() !== sel.join() || nu.join() !== uji.join())
        await upsertHafalan(u, s, { juz_selesai: ns.join(","), juz_diuji: nu.join(","), diperbarui_oleh: U.clip(u.username, 100), diperbarui_pada: new Date().toISOString() }, "UJIAN_JUZ", ctx);
    }
  }
  await ctx.kick();
  return { ok: true, status: selesai ? "final" : "draft", nilai };
}

export async function restartUjian(u: User, santriId: any, ta: any, sem: any, ctx: Ctx) {
  const periode = semDari(ta, sem), s = await santriUjian(u, santriId), id = `${s.id}|${periode.tahun_ajaran}|${periode.semester}`;
  await tx(async (run) => {
    const old = (await run("SELECT * FROM ujian_semester WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3 FOR UPDATE", [s.id, periode.tahun_ajaran, periode.semester]))[0];
    if (!old || old.ujian_status !== "draft") throw new Error("Tidak ada ujian yang sedang berjalan untuk santri ini.");
    await run("UPDATE ujian_semester SET tahfidz_ujian='[]'::jsonb, tahfidz_nilai=NULL, ujian_status='', penguji_username='', ujian_mulai=NULL, diperbarui_oleh=$4, diperbarui_pada=now() WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3",
      [s.id, periode.tahun_ajaran, periode.semester, U.clip(u.username, 100)]);
    await audit(run, u, "UJIAN_RESTART", "UjianSemester", id, { status: old.ujian_status, penguji: old.penguji_username, data: old.tahfidz_ujian }, null);
  });
  await ctx.kick();
  return { ok: true };
}

/* ---------------- Rapor satu lembar ---------------- */
const angkaId = (n: number) => { const r = Math.round(n * 10) / 10; return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ","); };
const akhirBulan = (ym: string) => { const [y, m] = ym.split("-").map(Number); return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`; };
const LABEL_ASPEK: Record<string, string> = { makhraj: "Makhraj Huruf", tajwid: "Hukum Tajwid", tahfidz: "Tahfidz / Hafalan", murajaah: "Murajaah", kehadiran: "Kehadiran & Kedisiplinan", perkembangan: "Perkembangan" };

async function susunRapor(list: any[], periode: any) {
  const ids = list.map((s) => String(s.id));
  if (!ids.length) return [];
  const akhir = akhirBulan(periode.sampai), kini = U.nowWib().ym;
  const [haf, prog] = [await totalHafalanMap(list), await semesterProgress(list, periode)];
  const uj: Record<string, any> = {}, pn: Record<string, any> = {}, sup: Record<string, any> = {}, abs: Record<string, any> = {}, zSesudah: Record<string, number> = {};
  const surat: Record<string, Record<number, number[]>> = {}, sert: Record<string, Record<number, Record<number, number>>> = {}, mur: Record<string, any> = {};
  (await q("SELECT * FROM ujian_semester WHERE tahun_ajaran=$1 AND semester=$2 AND santri_id = ANY($3)", [periode.tahun_ajaran, periode.semester, ids])).forEach((r: any) => (uj[r.santri_id] = r));
  (await q("SELECT DISTINCT ON (santri_id) santri_id, makhraj, tajwid, ket_makhraj, ket_tajwid FROM penilaian_tajwid WHERE santri_id = ANY($1) AND ym >= $2 AND ym <= $3 ORDER BY santri_id, ym DESC", [ids, periode.dari, periode.sampai])).forEach((r: any) => (pn[r.santri_id] = r));
  (await q("SELECT santri_id, data FROM rapor_semester WHERE tahun_ajaran=$1 AND semester=$2 AND santri_id = ANY($3)", [periode.tahun_ajaran, periode.semester, ids])).forEach((r: any) => (sup[r.santri_id] = r.data || {}));
  // Ketidakhadiran, murajaah (rerata nilai & total baris) dalam satu kueri ringkas.
  (await q(`SELECT santri_id, sum(sakit)::int s, sum(izin)::int i, sum(alfa)::int a, sum(murajaah_baris)::int mb,
      avg(nilai_murajaah)::float mr, count(nilai_murajaah)::int mn FROM setoran WHERE ym >= $1 AND ym <= $2 AND santri_id = ANY($3) GROUP BY santri_id`, [periode.dari, periode.sampai, ids]))
    .forEach((r: any) => { abs[r.santri_id] = r; mur[r.santri_id] = { baris: r.mb || 0, rata: r.mr == null ? null : Math.round(r.mr * 10) / 10, n: r.mn || 0 }; });
  if (periode.sampai < kini) (await q("SELECT santri_id, sum(ziyadah_baris)::int z FROM setoran WHERE ym > $1 AND santri_id = ANY($2) GROUP BY santri_id", [periode.sampai, ids])).forEach((r: any) => (zSesudah[r.santri_id] = r.z || 0));
  (await q("SELECT santri_id, ziyadah_surat, nilai_ziyadah FROM setoran WHERE ym >= $1 AND ym <= $2 AND santri_id = ANY($3) AND ziyadah_surat <> '' AND nilai_ziyadah IS NOT NULL", [periode.dari, periode.sampai, ids]))
    .forEach((r: any) => { const m = (surat[r.santri_id] = surat[r.santri_id] || {}); T.suratDariTeks(r.ziyadah_surat).forEach((id) => (m[id] = m[id] || []).push(Number(r.nilai_ziyadah))); });
  (await q("SELECT DISTINCT ON (santri_id, juz, bagian) santri_id, juz, bagian, nilai FROM sertifikasi WHERE santri_id = ANY($1) AND tanggal_ujian <= $2 AND nilai IS NOT NULL ORDER BY santri_id, juz, bagian, tanggal_ujian DESC", [ids, akhir]))
    .forEach((r: any) => { const m = (sert[r.santri_id] = sert[r.santri_id] || {}); (m[r.juz] = m[r.juz] || {})[r.bagian] = Number(r.nilai); });
  const hariIni = U.todayWib();

  return list.map((s) => {
    const r = uj[s.id] || {}, p = prog[s.id] || { ziyadah: 0, hadir: 0, pertemuan: 0, setoran: 0 }, h = haf[s.id], d = sup[s.id] || {};
    const semKe = T.semesterKe(s, periode.semester), tgt = T.targetRapor(s, semKe), gender = T.genderOf(s.unit);
    const hadirPct = p.pertemuan ? Math.round((p.hadir / p.pertemuan) * 100) : null;
    const m = mur[s.id] || { baris: 0, rata: null, n: 0 };
    const otomatis: Record<string, string> = {
      makhraj: pn[s.id]?.makhraj || "", tajwid: pn[s.id]?.tajwid || "",
      tahfidz: tgt.semester ? T.predikatTahfidz(p.ziyadah, tgt.semester * T.BARIS_PER_JUZ, semKe) : "",
      murajaah: T.predikatMurajaah(m.rata), kehadiran: saranKehadiran(hadirPct), perkembangan: "",
    };
    // Sumber: isian rapor/penilaian semester (ujian_semester) → otomatis dari data aplikasi.
    const simpan = (k: string) => (k === "murajaah" ? d.murajaah?.p || "" : r[k] || "");
    const ketSimpan = (k: string) => (k === "murajaah" ? d.murajaah?.k || "" : k === "tahfidz" && /^Diuji juz/.test(r.ket_tahfidz || "") ? "" : r["ket_" + k] || "");
    const aspek = T.ASPEK_RAPOR.map((a) => {
      const pred = simpan(a.key) || otomatis[a.key] || "";
      let ket = ketSimpan(a.key);
      if (!ket && pred) ket = a.key === "murajaah" && m.rata != null ? `${T.INDIKATOR_SINGKAT.murajaah[pred]}; rerata ${angkaId(m.rata)} dari ${m.n} penilaian` : T.INDIKATOR_SINGKAT[a.key]?.[pred] || "";
      return { key: a.key, label: LABEL_ASPEK[a.key], predikat: pred, keterangan: ket, otomatis: !simpan(a.key) && !!pred, ket_otomatis: !ketSimpan(a.key) };
    });
    const pred = Object.fromEntries(aspek.map((a) => [a.key, a.predikat]));

    // Ujian semester: hanya nilai final (atau nilai manual pelengkap) yang dianggap ada.
    const v2 = T.isUjianV2(r.tahfidz_ujian) ? r.tahfidz_ujian : null;
    const nilaiApp = r.ujian_status === "final" || (Array.isArray(r.tahfidz_ujian) && r.tahfidz_ujian.length) ? (r.tahfidz_nilai == null ? null : Number(r.tahfidz_nilai)) : null;
    const nilaiManual = d.ujian_manual != null && d.ujian_manual !== "" ? Number(d.ujian_manual) : null;
    const nilaiUjian = nilaiApp ?? nilaiManual;
    const ujian = {
      nilai: nilaiUjian, sumber: nilaiApp != null ? "aplikasi" : nilaiManual != null ? "manual" : "", kkm: T.KKM,
      lulus: nilaiUjian == null ? null : nilaiUjian >= T.KKM,
      mode: v2?.mode || (Array.isArray(r.tahfidz_ujian) && r.tahfidz_ujian.length ? "lama" : ""),
      rincian: v2 && r.ujian_status === "final" ? v2.items.map((it: T.UjianItem) => ({ label: T.labelItem(it), nilai: T.nilaiItem(it), lulus: T.nilaiItem(it) >= T.KKM })) : [],
      penguji: r.ujian_status === "final" ? r.penguji : "", draft: r.ujian_status === "draft",
    };

    // Nilai per surat (rerata nilai ziyadah setoran) dan perempat juz (sertifikasi) — dasar riwayat hafalan.
    const suratAuto: Record<number, any> = {};
    Object.entries(surat[s.id] || {}).forEach(([id, arr]) => { const n = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length); suratAuto[Number(id)] = { n: String(n), k: T.hurufNilai(n) }; });
    const suratAll: Record<number, any> = { ...suratAuto, ...(d.surat || {}) };
    const perempat: Record<number, Record<number, any>> = {};
    Object.entries(sert[s.id] || {}).forEach(([j, b]) => Object.entries(b).forEach(([bg, n]) => ((perempat[Number(j)] = perempat[Number(j)] || {})[Number(bg)] = { n: String(n), k: T.hurufNilai(n) })));
    Object.entries(d.perempat || {}).forEach(([j, b]: any) => (perempat[Number(j)] = { ...(perempat[Number(j)] || {}), ...b }));

    // Ringkasan hafalan (halaman/juz)
    const totalBaris = h?.total?.baris_total || 0, totalAkhir = Math.max(0, totalBaris - (zSesudah[s.id] || 0)), awal = Math.max(0, totalAkhir - p.ziyadah);
    // 20 halaman = 1 juz. Capaian dibandingkan dengan angka halaman yang tercetak (dibulatkan 0,1), agar "20 hlm" untuk target 1 juz = Tercapai.
    const zHal = Math.round((p.ziyadah / 15) * 10) / 10;
    const tuntasHafalan = tgt.semester ? zHal >= tgt.semester * 20 : null;
    // Status tahsin: isian pelengkap; bila kosong, dari ujian semester materi "Tahsin / dasar" yang sudah final.
    const tahsinUjian = v2?.mode === "tahsin" && r.ujian_status === "final" && r.tahfidz_nilai != null ? Number(r.tahfidz_nilai) >= T.KKM : null;
    const iqroLulus = d.iqro_lulus == null ? tahsinUjian : !!d.iqro_lulus;
    // Status tahsin/Iqro' ditampilkan terpisah (bagian C), tidak memengaruhi capaian target hafalan.
    const capaian = tgt.semester === 0 ? "" : tuntasHafalan ? "Tercapai" : "Belum tercapai";
    const rekapAuto = {
      hafalan_awal: angkaId(awal / T.BARIS_PER_JUZ), ziyadah: angkaId(p.ziyadah / 15), total: angkaId(totalAkhir / T.BARIS_PER_JUZ),
      murajaah: String(T.halamanBulat(m.baris)), target_semester: String(tgt.semester), target_tahunan: String(tgt.tahunan), capaian,
    };
    const rekap = { ...rekapAuto, ...Object.fromEntries(Object.entries(d.rekap || {}).filter(([, v]) => v !== "" && v != null)) };

    // Riwayat hafalan: ringkas per juz yang punya data (maks. 4 baris di cetakan).
    const riwayat: { judul: string; isi: string }[] = [];
    const juzSel: number[] = h?.juz_selesai || [], juzUji: number[] = h?.juz_diuji || [];
    if (juzSel.length) riwayat.push({ judul: "Juz tuntas", isi: `${juzSel.length} juz: ${[...juzSel].sort((a, b) => b - a).join(", ")}${juzUji.length ? ` · sudah diuji: ${[...juzUji].sort((a, b) => b - a).join(", ")}` : ""}` });
    T.JUZ_SURAT_RAPOR.forEach((j) => {
      const daftar = T.SURAT_RAPOR.filter((x) => x.juz === j), nilai = daftar.filter((x) => suratAll[x.id]?.n !== undefined && suratAll[x.id]?.n !== "");
      if (!nilai.length) return;
      const rata = Math.round(nilai.reduce((a, x) => a + Number(suratAll[x.id].n), 0) / nilai.length);
      const rentang = nilai.length === 1 ? nilai[0].nama : `${nilai[0].nama} s.d. ${nilai[nilai.length - 1].nama}`;
      riwayat.push({ judul: `Juz ${j}`, isi: `${nilai.length}/${daftar.length} surat dinilai (${rentang}); rerata ${rata}` });
    });
    const juzSert = Object.keys(perempat).map(Number).sort((a, b) => b - a);
    if (juzSert.length) {
      const bagian = juzSert.reduce((a, j) => a + Object.keys(perempat[j]).length, 0);
      const semua = juzSert.flatMap((j) => Object.values(perempat[j]).map((x: any) => Number(x.n)).filter((x) => isFinite(x)));
      riwayat.push({ judul: "Sertifikasi", isi: `${bagian} bagian (¼ juz) pada juz ${juzSert.join(", ")}${semua.length ? `; rerata ${Math.round(semua.reduce((a, b) => a + b, 0) / semua.length)}` : ""}` });
    }

    const tahsin = { lulus: iqroLulus, wajib: !!tgt.iqro, materi: d.tahsin_materi || "", sumber: d.iqro_lulus != null ? "isian" : tahsinUjian != null ? "ujian" : "" };
    const catatanAuto = T.narasiCatatan(pred, gender, { ziyadah_hal: Math.round((p.ziyadah / 15) * 10) / 10, target_juz: tgt.semester, murajaah_rata: m.rata, murajaah_n: m.n, ujian: nilaiUjian });
    const ab = abs[s.id] || { s: 0, i: 0, a: 0 }, abM = d.absen || {}, pilih = (x: any, y: any) => (x == null || x === "" ? y : x);

    return {
      santri: { id: s.id, nama: s.nama, unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, halaqah_key: s.halaqah_key, musyrif: s.musyrif, program: s.program, gender },
      periode: { tahun_ajaran: periode.tahun_ajaran, semester: periode.semester, nama: periode.nama, label: `${periode.tahun_ajaran.replace("/", "-")}/${periode.nama}`, semester_ke: semKe },
      identitas: { kelas: d.kelas || T.romawi(s.tingkat), kamar: d.kamar || "", nomor: d.nomor || "" },
      templat: d.templat || T.templatOtomatis(s.tingkat, totalAkhir / T.BARIS_PER_JUZ),
      aspek, ujian, target: tgt, tahsin,
      murajaah: { ...m, halaman: T.halamanBulat(m.baris), predikat: pred.murajaah || "" },
      absen: { sakit: Number(pilih(abM.sakit, ab.s)) || 0, izin: Number(pilih(abM.izin, ab.i)) || 0, alpa: Number(pilih(abM.alpa, ab.a)) || 0, otomatis: { sakit: ab.s || 0, izin: ab.i || 0, alpa: ab.a || 0 } },
      surat: suratAll, surat_auto: suratAuto, perempat, iqro: d.iqro || {}, iqro_lulus: iqroLulus,
      rekap, rekap_auto: rekapAuto, riwayat,
      catatan: r.catatan || catatanAuto, catatan_otomatis: !r.catatan, catatan_auto: catatanAuto,
      ttd: { tempat: "Tengaran", tanggal: d.tanggal || hariIni, kepala: T.KEPALA_KEPESANTRENAN, muhaffiz: s.musyrif, label_muhaffiz: gender === "Putri" ? "Muhaffizhah" : "Muhaffiz" },
      ujian_manual: d.ujian_manual ?? "", diperbarui: d.diperbarui || null,
    };
  });
}


/** Ringkasan rapor ke tab UjianSemester (kolom tambahan dibaca dari header sheet; tidak perlu memperbarui Apps Script). */
async function antreRaporSheet(r: any, u: User) {
  const a = Object.fromEntries(r.aspek.map((x: any) => [x.key, x]));
  const row: any = {
    id: `${r.santri.id}|${r.periode.tahun_ajaran}|${r.periode.semester}`, santri_id: r.santri.id, santri_nama: U.clip(r.santri.nama, 200), unit: r.santri.unit, tingkat: r.santri.tingkat,
    halaqah: r.santri.halaqah, musyrif: r.santri.musyrif, tahun_ajaran: r.periode.tahun_ajaran, semester: r.periode.semester,
    makhraj: a.makhraj?.predikat || "", tajwid: a.tajwid?.predikat || "", tahfidz: a.tahfidz?.predikat || "", kehadiran: a.kehadiran?.predikat || "", perkembangan: a.perkembangan?.predikat || "",
    murajaah: a.murajaah?.predikat || "", ket_murajaah: a.murajaah?.keterangan || "", murajaah_rata: r.murajaah.rata ?? "", murajaah_hal: r.rekap.murajaah,
    ziyadah_hal: r.rekap.ziyadah, total_juz: r.rekap.total, target_semester_juz: r.rekap.target_semester, capaian_target: r.rekap.capaian,
    nilai_ujian: r.ujian.nilai ?? "", status_ujian: r.ujian.nilai == null ? "Belum ada nilai" : r.ujian.lulus ? "Lulus KKM" : "Belum KKM",
    status_tahsin: r.tahsin.lulus == null ? "" : r.tahsin.lulus ? "Lulus" : "Belum lulus",
    sakit: r.absen.sakit, izin: r.absen.izin, alpa: r.absen.alpa, kamar: r.identitas.kamar, catatan: r.catatan,
    diperbarui_oleh: U.clip(u.username, 100), diperbarui_pada: new Date().toISOString(),
  };
  await tx(async (run) => { await enqueue(run, "UjianSemester", "upsert", row); });
}

export async function getRaporSemester(u: User, santriId: any, ta?: any, sem?: any) {
  const periode = semDari(ta, sem), s = await findSantri(u, santriId);
  return (await susunRapor([s], periode))[0];
}
export async function getRaporHalaqah(u: User, hk: any, ta?: any, sem?: any) {
  const periode = semDari(ta, sem), key = String(hk || "");
  const list = (await santriForUser(u)).filter((s: any) => s.halaqah_key === key);
  if (!list.length) throw new Error("Halaqah tidak ditemukan atau bukan binaan Anda.");
  return { periode, santri: await susunRapor(list, periode) };
}

const nilai100 = (v: any, label: string) => {
  if (v === "" || v == null) return "";
  const n = Number(String(v).replace(",", "."));
  if (!isFinite(n) || n < 0 || n > 100) throw new Error(`${label}: nilai harus 0–100.`);
  return String(Math.round(n * 10) / 10);
};
const predikatValid = (v: any, label: string, boleh: readonly string[] = T.PREDIKAT) => {
  const x = String(v || "").trim().toUpperCase();
  if (x && !boleh.includes(x)) throw new Error(`Predikat ${label} tidak valid.`);
  return x;
};
const isianNilai = (v: any, label: string) => ({ n: nilai100(v?.n, label), k: U.clip(U.safeText(v?.k, 80), 80) });

/** Simpan pelengkap rapor (identitas, ketidakhadiran, status tahsin, murajaah) dan predikat aspek. Yang disimpan hanya bagian yang diubah. */
export async function saveRaporSemester(u: User, santriId: any, ta: any, sem: any, d: any, ctx: Ctx) {
  const periode = semDari(ta, sem), s = await findSantri(u, santriId);
  d = d || {};
  const pl = d.pelengkap || {}, patch: any = {};
  if (pl.kelas != null) patch.kelas = U.clip(U.safeText(pl.kelas, 12), 12);
  if (pl.kamar != null) patch.kamar = U.clip(U.safeText(pl.kamar, 40), 40);
  if (pl.nomor != null) patch.nomor = U.clip(U.safeText(pl.nomor, 20), 20);
  if (pl.templat) { if (!T.TEMPLAT_RAPOR.some((t) => t.id === pl.templat)) throw new Error("Templat rapor tidak dikenal."); patch.templat = pl.templat; }
  if (pl.tanggal) { if (!/^\d{4}-\d{2}-\d{2}$/.test(pl.tanggal)) throw new Error("Tanggal rapor tidak valid."); patch.tanggal = pl.tanggal; }
  if (pl.ujian_manual !== undefined) patch.ujian_manual = nilai100(pl.ujian_manual, "Nilai ujian manual");
  if (pl.absen) patch.absen = Object.fromEntries(["sakit", "izin", "alpa"].filter((k) => pl.absen[k] !== "" && pl.absen[k] != null).map((k) => [k, U.optionalInt(pl.absen[k], k, 0, 500)]));
  if (pl.surat) { patch.surat = {}; Object.entries(pl.surat).forEach(([id, v]) => { if (!T.SURAT_RAPOR.some((x) => x.id === Number(id))) throw new Error("Surat tidak dikenal."); patch.surat[Number(id)] = isianNilai(v, `Surat ${id}`); }); }
  if (pl.perempat) {
    patch.perempat = {};
    Object.entries(pl.perempat).forEach(([j, b]: any) => {
      const juz = Number(j); if (!Number.isInteger(juz) || juz < 1 || juz > 30) throw new Error("Juz tidak valid.");
      patch.perempat[juz] = {};
      Object.entries(b || {}).forEach(([bg, v]) => { const n = Number(bg); if (!Number.isInteger(n) || n < 1 || n > 4) throw new Error("Bagian juz tidak valid."); patch.perempat[juz][n] = isianNilai(v, `Juz ${juz} bagian ${n}`); });
    });
  }
  if (pl.iqro) { patch.iqro = {}; Object.entries(pl.iqro).forEach(([k, v]: any) => { if (!T.IQRO_TOPIK.some((t) => t.id === k)) throw new Error("Topik Iqro' tidak dikenal."); patch.iqro[k] = { p: predikatValid(v?.p, "Iqro'"), k: U.clip(U.safeText(v?.k, 160), 160) }; }); }
  if (pl.iqro_lulus !== undefined) patch.iqro_lulus = pl.iqro_lulus === null ? null : !!pl.iqro_lulus;
  if (pl.tahsin_materi !== undefined) patch.tahsin_materi = U.clip(U.safeText(pl.tahsin_materi, 60), 60);
  if (pl.rekap) patch.rekap = Object.fromEntries(["hafalan_awal", "ziyadah", "total", "murajaah", "target_semester", "target_tahunan", "capaian"].filter((k) => pl.rekap[k] !== undefined).map((k) => [k, U.clip(U.safeText(pl.rekap[k], 30), 30)]));
  const aspek = d.aspek || {};
  if (aspek.murajaah) patch.murajaah = { p: predikatValid(aspek.murajaah.p, "murajaah"), k: U.clip(U.safeText(aspek.murajaah.k, 200), 200) };
  patch.diperbarui = { oleh: u.nama, pada: new Date().toISOString() };
  const id = `${s.id}|${periode.tahun_ajaran}|${periode.semester}`;
  const kolom = T.ASPEK.map((a) => a.key).filter((k) => aspek[k]);
  await tx(async (run) => {
    const lama = (await run("SELECT data FROM rapor_semester WHERE santri_id=$1 AND tahun_ajaran=$2 AND semester=$3 FOR UPDATE", [s.id, periode.tahun_ajaran, periode.semester]))[0]?.data || {};
    await run(`INSERT INTO rapor_semester (santri_id, tahun_ajaran, semester, data, diperbarui_oleh, diperbarui_pada) VALUES ($1,$2,$3,$4,$5,now())
      ON CONFLICT (santri_id, tahun_ajaran, semester) DO UPDATE SET data=EXCLUDED.data, diperbarui_oleh=EXCLUDED.diperbarui_oleh, diperbarui_pada=now()`,
      [s.id, periode.tahun_ajaran, periode.semester, JSON.stringify({ ...lama, ...patch }), U.clip(u.username, 100)]);
    if (kolom.length || d.catatan !== undefined) {
      const rec: any = { id, santri_id: s.id, santri_nama: U.clip(s.nama, 200), unit: s.unit, tingkat: s.tingkat, halaqah: s.halaqah, musyrif: s.musyrif, tahun_ajaran: periode.tahun_ajaran, semester: periode.semester,
        diperbarui_oleh: U.clip(u.username, 100), diperbarui_pada: new Date().toISOString() };
      kolom.forEach((k) => { rec[k] = predikatValid(aspek[k].p, k, k === "tahfidz" ? T.PREDIKAT_TAHFIDZ : T.PREDIKAT); rec["ket_" + k] = U.safeText(aspek[k].k, 600); });
      if (d.catatan !== undefined) rec.catatan = U.safeText(d.catatan, 1000);
      const cols = Object.keys(rec), upd = cols.filter((c) => !["id", "santri_id", "tahun_ajaran", "semester"].includes(c));
      await run(`INSERT INTO ujian_semester (${cols.join(",")}) VALUES (${cols.map((_, i) => "$" + (i + 1)).join(",")})
        ON CONFLICT (santri_id, tahun_ajaran, semester) DO UPDATE SET ${upd.map((c) => c + "=EXCLUDED." + c).join(",")}`, cols.map((c) => rec[c]));
    }
    await audit(run, u, "UPDATE", "RaporSemester", id, null, { bagian: Object.keys(patch), aspek: Object.keys(aspek) });
  });
  const hasil = (await susunRapor([s], periode))[0];
  await antreRaporSheet(hasil, u);
  await ctx.kick();
  return hasil;
}
