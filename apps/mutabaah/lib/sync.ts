/** Konfigurasi: dari variabel lingkungan, atau dari tabel meta (Supabase Edge tidak mengizinkan menulis env). */
const CONFIG: Record<string, string> = {};
export function setConfig(v: Record<string, any>) { for (const k of Object.keys(v || {})) if (v[k]) CONFIG[k] = String(v[k]); }
export const envOf = (k: string): string => CONFIG[k] || (typeof process !== "undefined" ? (process.env as any)[k] : "") || "";
import { ARBAIN } from "./arbain";
import { hurufNilai, hurufKeNilai } from "./target";
// Sinkronisasi Netlify Database  <->  Google Spreadsheet (via Apps Script Web App)
import { q, tx, bulk } from "./db";
import { norm, num, ymKey, halaqahKey, normalizeYm, uid, membershipSort, nowWib, DEFAULT_PASSWORD, stripGuard } from "./util";

type Run = (text: string, params?: any[]) => Promise<any[]>;

export function gasConfigured() {
  return !!(envOf("GAS_URL") && (envOf("SYNC_KEY") || envOf("GAS_SECRET")));
}

export async function gas(action: string, body: any = {}, timeoutMs = 25000): Promise<any> {
  if (!gasConfigured()) throw new Error("Koneksi ke Spreadsheet belum diatur (GAS_URL / GAS_SECRET).");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(envOf("GAS_URL"), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret: (envOf("SYNC_KEY") || envOf("GAS_SECRET")), action, ...body }),
      redirect: "follow",
      signal: ctrl.signal,
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error("Respons Apps Script bukan JSON (cek deployment Web App & akses 'Anyone'): " + text.slice(0, 160)); }
    if (!data.ok) throw new Error(data.error || "Apps Script menolak permintaan.");
    return stripHeaderRows(data);
  } finally {
    clearTimeout(t);
  }
}

/** Buang baris yang isinya hanya mengulang nama kolom (judul tabel terduplikasi di sheet). */
function isHeaderRow(r: any) {
  if (!r || typeof r !== "object" || Array.isArray(r)) return false;
  const keys = Object.keys(r).filter((k) => r[k] !== "" && r[k] != null);
  if (keys.length < 2) return false;
  const norm = (x: any) => String(x).trim().toLowerCase().replace(/[\s_]+/g, "_");
  const same = keys.filter((k) => norm(r[k]) === norm(k)).length;
  return same / keys.length >= 0.6;
}
function stripHeaderRows(data: any) {
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (Array.isArray(v)) data[k] = v.filter((r) => !isHeaderRow(r));
    else if (v && typeof v === "object" && k !== "ok") stripHeaderRows(v);
  }
  return data;
}

export async function enqueue(run: Run, sheet: string, op: string, payload: any) {
  await run("INSERT INTO sync_queue (sheet, op, payload) VALUES ($1,$2,$3)", [sheet, op, JSON.stringify(payload)]);
}

/** Proses antrean ke Spreadsheet. Dipanggil oleh background function dan cron. */
/** Hanya satu pengirim antrean pada satu waktu (mencegah rebutan kunci Spreadsheet di Apps Script). */
async function ambilGiliran(menit: number) {
  await q("INSERT INTO meta (key, value, updated_at) VALUES ('drain_lease', '{\"until\":\"2000-01-01T00:00:00Z\"}'::jsonb, now()) ON CONFLICT (key) DO NOTHING");
  const r = await q(`UPDATE meta SET value = jsonb_build_object('until', now() + ($1 || ' minutes')::interval), updated_at = now()
    WHERE key = 'drain_lease' AND (value->>'until')::timestamptz < now() RETURNING key`, [String(menit)]);
  return r.length > 0;
}
async function lepasGiliran() {
  await q("UPDATE meta SET value = jsonb_build_object('until', now() - interval '1 second'), updated_at = now() WHERE key = 'drain_lease'");
}

export async function drainQueue(maxMs = 20000) {
  if (!gasConfigured()) return { processed: 0, skipped: "not-configured" };
  // Giliran 3 menit; paket kecil (20 data) selesai jauh sebelum batas 150 detik fungsi Supabase.
  if (!(await ambilGiliran(3))) return { processed: 0, skipped: "sedang-dikirim" };
  try { return await drainInti(maxMs); } finally { await lepasGiliran().catch(() => {}); }
}

async function drainInti(maxMs: number) {
  const start = Date.now();
  let processed = 0;
  while (Date.now() - start < maxMs) {
    const items = await q(
      `UPDATE sync_queue SET status='processing', claimed_at=now(), attempts=attempts+1
       WHERE id IN (
         SELECT id FROM sync_queue
         WHERE (status='pending' OR (status='processing' AND claimed_at < now() - interval '8 minutes'))
           AND attempts < 25
         ORDER BY id LIMIT 150 FOR UPDATE SKIP LOCKED)
       RETURNING id, sheet, op, payload`
    );
    if (!items.length) break;
    items.sort((a, b) => Number(a.id) - Number(b.id));
    // Gabungkan operasi sejenis pada sheet yang sama walau selang-seling dengan sheet lain (Setoran, AuditLog, Setoran, ...).
    // Urutan dalam satu sheet tetap dijaga: hanya digabung bila operasi TERAKHIR pada sheet itu sejenis.
    const ops: any[] = [], opIds: number[][] = [];
    items.forEach((it) => {
      let into = -1;
      if (it.op !== "call" && it.op !== "replace") {
        for (let i = ops.length - 1; i >= 0; i--) {
          if (ops[i].sheet !== it.sheet) continue;
          if (ops[i].op === it.op) into = i;
          break;
        }
      }
      if (into >= 0) { ops[into].rows.push(it.payload); opIds[into].push(Number(it.id)); }
      else { ops.push({ sheet: it.sheet, op: it.op, rows: [it.payload] }); opIds.push([Number(it.id)]); }
    });
    // Baris yang sama muncul berulang dalam satu paket: cukup kirim versi terakhir.
    ops.forEach((o) => {
      if (o.op !== "upsert") return;
      const last = new Map<string, number>();
      o.rows.forEach((r: any, i: number) => { if (r && r.id != null) last.set(String(r.id), i); });
      if (last.size) o.rows = o.rows.filter((r: any, i: number) => !(r && r.id != null) || last.get(String(r.id)) === i);
    });
    const ids = items.map((i) => Number(i.id));
    const markDone = async (done: number[]) => {
      await q("UPDATE sync_queue SET status='done', done_at=now(), last_error='' WHERE id = ANY($1::bigint[])", [done]);
      await q("INSERT INTO meta (key, value, updated_at) VALUES ('last_sync', $1, now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()", [JSON.stringify({ at: new Date().toISOString(), count: done.length })]);
      processed += done.length;
    };
    try {
      await gas("sync", { ops }, 80000);
      await markDone(ids);
    } catch (e: any) {
      // Kirim per kelompok agar satu jenis data yang gagal (mis. sheet belum siap) tidak menahan data lain.
      let anyFail = false;
      if (ops.length > 1) {
        for (let i = 0; i < ops.length; i++) {
          try { await gas("sync", { ops: [ops[i]] }, 80000); await markDone(opIds[i]); }
          catch (e2: any) {
            const msg = String(e2?.message || e2).slice(0, 500);
            // Apps Script lama belum mengenal sheet ini → disisihkan (status 'tunggu_gas'), antrean lain tetap jalan.
            if (/Sheet tidak dikenal/i.test(msg)) { await q("UPDATE sync_queue SET status='tunggu_gas', last_error=$2 WHERE id = ANY($1::bigint[])", [opIds[i], msg]); continue; }
            anyFail = true; await q("UPDATE sync_queue SET status='pending', last_error=$2 WHERE id = ANY($1::bigint[])", [opIds[i], msg]);
          }
        }
      } else {
        const msg = String(e?.message || e).slice(0, 500);
        if (/Sheet tidak dikenal/i.test(msg)) await q("UPDATE sync_queue SET status='tunggu_gas', last_error=$2 WHERE id = ANY($1::bigint[])", [ids, msg]);
        else { anyFail = true; await q("UPDATE sync_queue SET status='pending', last_error=$2 WHERE id = ANY($1::bigint[])", [ids, msg]); }
      }
      if (anyFail) break;
    }
  }
  // Bersihkan antrean yang sudah lama selesai
  await q("DELETE FROM sync_queue WHERE status='done' AND done_at < now() - interval '14 days'");
  return { processed };
}

/** Nilai dari Spreadsheet: huruf A/B+/B/C atau angka lama. */
const nilaiSheet = (v: any) => { const h = hurufKeNilai(v); return h != null ? h : nOrNull(v); };

/* ---------------- Format baris untuk sheet ---------------- */
export function setoranSheetRow(r: any) {
  return {
    id: r.id, tahun: r.tahun, bulan: r.bulan, pekan: r.pekan, santri_id: r.santri_id, santri_nama: r.santri_nama,
    unit: r.unit, tingkat: r.tingkat, halaqah: r.halaqah, musyrif: r.musyrif, dicatat_oleh: r.dicatat_oleh,
    hadir: r.hadir, sakit: r.sakit, izin: r.izin, alfa: r.alfa,
    tahsin_baris: r.tahsin_baris, ziyadah_baris: r.ziyadah_baris, murajaah_baris: r.murajaah_baris,
    // Spreadsheet menampilkan huruf (A/B+/B/C); data lama berangka ikut dikonversi
    nilai_tahsin: hurufNilai(r.nilai_tahsin), nilai_ziyadah: hurufNilai(r.nilai_ziyadah), nilai_murajaah: hurufNilai(r.nilai_murajaah),
    ziyadah_surat: r.ziyadah_surat, murajaah_juz: r.murajaah_juz, catatan: r.catatan,
    dicatat_pada: new Date(r.dicatat_pada || Date.now()).toISOString(),
  };
}
export function hafalanSheetRow(h: any) {
  const iso = (d: any) => (d ? new Date(d).toISOString() : "");
  return {
    santri_id: h.santri_id, santri_nama: h.santri_nama, baris_awal: h.baris_awal, keterangan: h.keterangan,
    diperbarui_oleh: h.diperbarui_oleh, diperbarui_pada: iso(h.diperbarui_pada),
    baris_terverifikasi: h.baris_terverifikasi ?? "", terverifikasi_sampai_ym: h.terverifikasi_sampai_ym,
    terverifikasi_oleh: h.terverifikasi_oleh, terverifikasi_pada: iso(h.terverifikasi_pada),
    target_juz: Number(h.target_juz) > 0 && Number(h.target_juz) !== 30 ? h.target_juz : "", juz_selesai: h.juz_selesai, juz_diuji: h.juz_diuji ?? "",
  };
}
export function sertifikasiSheetRow(r: any) {
  return {
    id: r.id, santri_id: r.santri_id, santri_nama: r.santri_nama, unit: r.unit, tingkat: r.tingkat, halaqah: r.halaqah,
    musyrif: r.musyrif, juz: r.juz, bagian: r.bagian, halaman_minimal: r.halaman_minimal, tanggal_ujian: r.tanggal_ujian,
    nilai: r.nilai ?? "", status: r.status, penguji: r.penguji, catatan: r.catatan, dicatat_oleh: r.dicatat_oleh,
    dicatat_pada: new Date(r.dicatat_pada).toISOString(), diperbarui_pada: new Date(r.diperbarui_pada).toISOString(),
  };
}
export function arbainSheetRow(r: any) {
  return {
    id: r.id, santri_id: r.santri_id, santri_nama: r.santri_nama, unit: r.unit, tingkat: r.tingkat, halaqah: r.halaqah, musyrif: r.musyrif,
    nomor: r.nomor, judul: (ARBAIN[Number(r.nomor) - 1] || { judul: "" }).judul, status: r.status, nilai: r.nilai ?? "", tanggal: r.tanggal,
    catatan: r.catatan, diperbarui_oleh: r.diperbarui_oleh, diperbarui_pada: new Date(r.diperbarui_pada).toISOString(),
  };
}
export const akunSheetRow = (a: any) => ({ username: a.username, password: a.password, nama: a.nama, role: a.role, musyrif_master: a.musyrif_master, aktif: a.aktif });

/* ---------------- Master santri ---------------- */
function mapMaster(rows: any[]) {
  return (rows || []).map((s) => {
    const unit = String(s.unit || "").trim(), tingkat = String(s.tingkat || "").trim(), halaqah = String(s.halaqah || "").trim();
    return {
      id: String(s.id).trim(), nama: String(s.nama || "").trim(), unit, tingkat, halaqah,
      halaqah_key: halaqahKey(unit, tingkat, halaqah), musyrif: String(s.musyrif || "").trim(),
      program: String(s.program || "").trim(), keterangan: String(s.keterangan || "").trim(),
    };
  }).filter((s) => s.id && s.nama).sort(membershipSort);
}

async function writeMaster(run: Run, master: any[]) {
  await run("UPDATE santri SET aktif=false");
  await bulk(run, "santri", ["id", "nama", "unit", "tingkat", "halaqah", "halaqah_key", "musyrif", "program", "keterangan", "aktif", "urut"],
    master.map((s, i) => [s.id, s.nama, s.unit, s.tingkat, s.halaqah, s.halaqah_key, s.musyrif, s.program, s.keterangan, true, i]),
    `ON CONFLICT (id) DO UPDATE SET nama=EXCLUDED.nama, unit=EXCLUDED.unit, tingkat=EXCLUDED.tingkat, halaqah=EXCLUDED.halaqah,
     halaqah_key=EXCLUDED.halaqah_key, musyrif=EXCLUDED.musyrif, program=EXCLUDED.program, keterangan=EXCLUDED.keterangan, aktif=true, urut=EXCLUDED.urut`);
  const ym = nowWib().ym;
  await run("DELETE FROM keanggotaan_histori WHERE ym=$1", [ym]);
  await bulk(run, "keanggotaan_histori", ["ym", "santri_id", "nama", "unit", "tingkat", "halaqah", "halaqah_key", "musyrif", "program", "keterangan"],
    master.map((s) => [ym, s.id, s.nama, s.unit, s.tingkat, s.halaqah, s.halaqah_key, s.musyrif, s.program, s.keterangan]),
    "ON CONFLICT (ym, santri_id) DO NOTHING");
}

export function usernameFromName(nama: string) {
  let s = String(nama).replace(/^(ustadzah|ustadz|usth|ust)\.?\s*/i, "");
  s = s.split(",")[0].replace(/[^a-zA-Z\s]/g, " ").trim().toLowerCase();
  return s.split(/\s+/).filter(Boolean).slice(0, 2).join(".") || "musyrif";
}
export async function generateAkunMusyrif(run: Run) {
  const existing = await run("SELECT username, musyrif_master FROM akun");
  const usedUser: Record<string, boolean> = {}, usedM: Record<string, boolean> = {};
  existing.forEach((a) => { usedUser[norm(a.username)] = true; usedM[norm(a.musyrif_master)] = true; });
  const musyrifs = (await run("SELECT DISTINCT musyrif FROM santri WHERE aktif AND musyrif <> ''")).map((r) => r.musyrif);
  let n = 0;
  for (const m of musyrifs) {
    if (usedM[norm(m)]) continue;
    const base = usernameFromName(m);
    let user = base, i = 2;
    while (usedUser[user]) user = base + i++;
    usedUser[user] = true; usedM[norm(m)] = true;
    const a = { username: user, password: DEFAULT_PASSWORD, nama: m, role: "musyrif", musyrif_master: m, aktif: "Y" };
    await run("INSERT INTO akun (username,password,nama,role,musyrif_master,aktif) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
      [a.username, a.password, a.nama, a.role, a.musyrif_master, a.aktif]);
    await enqueue(run, "Akun", "upsert", akunSheetRow(a));
    n++;
  }
  return n;
}

export async function refreshMasterFromSheet() {
  const data = await gas("master");
  const master = mapMaster(data.master);
  if (!master.length) throw new Error("Master santri di Spreadsheet kosong. Data tidak diubah.");
  const baru = await tx(async (run) => {
    await writeMaster(run, master);
    const n = await generateAkunMusyrif(run);
    return n;
  });
  return { jumlah: master.length, akun_baru: baru };
}

/* ---------------- Impor penuh dari Spreadsheet ---------------- */
async function setMeta(key: string, value: any) {
  await q("INSERT INTO meta (key, value, updated_at) VALUES ($1,$2,now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()", [key, JSON.stringify(value)]);
}
export async function getMeta(key: string) {
  const r = await q("SELECT value, updated_at FROM meta WHERE key=$1", [key]);
  return r[0] ? { ...r[0].value, updated_at: r[0].updated_at } : null;
}

export async function importAkunOnly() {
  const data = await gas("akun");
  const rows = (data.akun || []).filter((a: any) => a.username);
  await tx(async (run) => {
    await bulk(run, "akun", ["username", "password", "nama", "role", "musyrif_master", "aktif"],
      rows.map((a: any) => [String(a.username).trim(), String(a.password ?? ""), String(a.nama || ""), String(a.role || "musyrif").toLowerCase(), String(a.musyrif_master || ""), String(a.aktif || "Y").toUpperCase() === "N" ? "N" : "Y"]),
      "ON CONFLICT (username) DO NOTHING");
  });
  return rows.length;
}

const nOrNull = (v: any) => (v === "" || v == null || isNaN(Number(v)) ? null : Number(v));
const dateOrNull = (v: any) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString(); };
function dateText(v: any) {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(d);
}

export async function importAll() {
  const pending = await q("SELECT count(*)::int AS n FROM sync_queue WHERE status <> 'done'");
  if (pending[0].n > 0) throw new Error("Masih ada " + pending[0].n + " perubahan yang belum terkirim ke Spreadsheet. Tunggu sinkronisasi selesai sebelum menarik ulang data.");
  await setMeta("import", { status: "berjalan", started_at: new Date().toISOString() });
  try {
    const data = await gas("export", {}, 240000);
    const master = mapMaster(data.master);

    // Setoran: dedupe + gabungkan pekan > 4 ke pekan 4 (sama seperti logika Apps Script lama)
    const raw = (data.setoran || []).map((r: any, i: number) => {
      const tahun = num(r.tahun), bulan = num(r.bulan), pekanAsli = num(r.pekan);
      return {
        __i: i, id: String(r.id || "") || uid(), tahun, bulan, pekan_asli: pekanAsli, pekan: Math.min(4, pekanAsli),
        ym: tahun ? ymKey(tahun, bulan) : "", santri_id: String(r.santri_id || "").trim(),
        santri_nama: stripGuard(r.santri_nama), unit: stripGuard(r.unit), tingkat: stripGuard(r.tingkat), halaqah: stripGuard(r.halaqah),
        musyrif: stripGuard(r.musyrif), dicatat_oleh: stripGuard(r.dicatat_oleh),
        hadir: num(r.hadir), sakit: num(r.sakit), izin: num(r.izin), alfa: num(r.alfa),
        tahsin_baris: num(r.tahsin_baris), ziyadah_baris: num(r.ziyadah_baris), murajaah_baris: num(r.murajaah_baris),
        nilai_tahsin: nilaiSheet(r.nilai_tahsin), nilai_ziyadah: nilaiSheet(r.nilai_ziyadah), nilai_murajaah: nilaiSheet(r.nilai_murajaah),
        ziyadah_surat: stripGuard(r.ziyadah_surat), murajaah_juz: stripGuard(r.murajaah_juz), catatan: stripGuard(r.catatan),
        dicatat_pada: dateOrNull(r.dicatat_pada),
      };
    }).filter((r: any) => r.tahun && r.bulan >= 1 && r.bulan <= 12 && r.pekan >= 1 && r.santri_id);
    const dedup: Record<string, any> = {};
    raw.forEach((r: any) => {
      const k = r.ym + "-P" + r.pekan_asli + "-" + r.santri_id, o = dedup[k];
      const rt = r.dicatat_pada ? Date.parse(r.dicatat_pada) : 0, ot = o && o.dicatat_pada ? Date.parse(o.dicatat_pada) : 0;
      if (!o || rt > ot || (rt === ot && r.__i > o.__i)) dedup[k] = r;
    });
    const merged: Record<string, any> = {}, legacyDeletes: string[] = [], legacyUpserts: any[] = [];
    Object.values(dedup).sort((a: any, b: any) => a.pekan_asli - b.pekan_asli).forEach((r: any) => {
      const k = r.ym + "-P" + r.pekan + "-" + r.santri_id;
      if (!merged[k]) { merged[k] = r; if (r.pekan_asli > 4) r.__legacy = true; return; }
      const a = merged[k];
      ["hadir", "sakit", "izin", "alfa", "tahsin_baris", "ziyadah_baris", "murajaah_baris"].forEach((f) => (a[f] += r[f]));
      ["nilai_tahsin", "nilai_ziyadah", "nilai_murajaah"].forEach((f) => {
        const vals = [a[f], r[f]].filter((v) => v != null);
        a[f] = vals.length ? Math.round(vals.reduce((x: number, y: number) => x + y, 0) / vals.length) : null;
      });
      ["ziyadah_surat", "murajaah_juz", "catatan"].forEach((f) => {
        const u: string[] = [];
        [a[f], r[f]].filter(Boolean).forEach((v) => { if (u.indexOf(v) < 0) u.push(v); });
        a[f] = u.join(" | ");
      });
      if (r.dicatat_pada && (!a.dicatat_pada || r.dicatat_pada > a.dicatat_pada)) a.dicatat_pada = r.dicatat_pada;
      legacyDeletes.push(r.id);
      a.__legacy = true;
    });
    const setoranRows = Object.values(merged).map((r: any) => {
      r.halaqah_key = halaqahKey(r.unit, r.tingkat, r.halaqah);
      r.dicatat_pada = r.dicatat_pada || new Date(0).toISOString();
      if (r.__legacy) legacyUpserts.push(r);
      return r;
    });

    const hafalan = (data.hafalan || []).filter((h: any) => h.santri_id).map((h: any) => [
      String(h.santri_id).trim(), stripGuard(h.santri_nama), num(h.baris_awal), stripGuard(h.keterangan), stripGuard(h.diperbarui_oleh),
      dateOrNull(h.diperbarui_pada), h.baris_terverifikasi === "" || h.baris_terverifikasi == null ? null : num(h.baris_terverifikasi),
      normalizeYm(h.terverifikasi_sampai_ym), stripGuard(h.terverifikasi_oleh), dateOrNull(h.terverifikasi_pada),
      num(h.target_juz) === 30 ? 0 : num(h.target_juz) || 0, String(h.juz_selesai ?? ""), String(h.juz_diuji ?? ""),
    ]);
    // Kolom juz_diuji baru ada di Spreadsheet setelah Api.gs v6; bila belum ada, nilai di aplikasi dipertahankan.
    const adaDiuji = (data.hafalan || []).some((h: any) => h && Object.prototype.hasOwnProperty.call(h, "juz_diuji"));

    const sertLatest: Record<string, any> = {};
    (data.sertifikasi || []).forEach((r: any, i: number) => {
      const juz = num(r.juz), bagian = num(r.bagian), sid = String(r.santri_id || "").trim();
      if (!sid || juz < 1 || juz > 30 || bagian < 1 || bagian > 4) return;
      sertLatest[sid + "-" + juz + "-" + bagian] = [
        String(r.id || "") || uid(), sid, stripGuard(r.santri_nama), stripGuard(r.unit), stripGuard(r.tingkat), stripGuard(r.halaqah), stripGuard(r.musyrif),
        juz, bagian, 5, dateText(r.tanggal_ujian), nOrNull(r.nilai), norm(r.status) === "lulus" ? "lulus" : "remedial",
        stripGuard(r.penguji), stripGuard(r.catatan), stripGuard(r.dicatat_oleh), dateOrNull(r.dicatat_pada) || new Date().toISOString(),
        dateOrNull(r.diperbarui_pada) || dateOrNull(r.dicatat_pada) || new Date().toISOString(),
      ];
    });

    const arbainLatest: Record<string, any[]> = {};
    (data.arbain || []).forEach((r: any) => {
      const sid = String(r.santri_id || "").trim(), nomor = num(r.nomor);
      if (!sid || nomor < 1 || nomor > 42) return;
      const st = norm(r.status) === "mengulang" ? "mengulang" : norm(r.status) === "hafal" ? "hafal" : "";
      if (!st) return;
      arbainLatest[sid + "|" + nomor] = [sid + "|" + nomor, sid, stripGuard(r.santri_nama), stripGuard(r.unit), stripGuard(r.tingkat), stripGuard(r.halaqah),
        stripGuard(r.musyrif), nomor, st, nOrNull(r.nilai), dateText(r.tanggal), stripGuard(r.catatan), stripGuard(r.diperbarui_oleh),
        dateOrNull(r.diperbarui_pada) || new Date().toISOString()];
    });

    const UJ_COLS = ["id", "santri_id", "santri_nama", "unit", "tingkat", "halaqah", "musyrif", "tahun_ajaran", "semester", "makhraj_nilai", "makhraj", "ket_makhraj",
      "tajwid_nilai", "tajwid", "ket_tajwid", "tahfidz", "ket_tahfidz", "kehadiran", "ket_kehadiran", "perkembangan", "ket_perkembangan", "catatan", "penguji", "tanggal",
      "diperbarui_oleh", "diperbarui_pada"];
    const ujianLatest: Record<string, any[]> = {};
    (data.ujian || []).forEach((r: any) => {
      const sid = String(r.santri_id || "").trim(), ta = String(r.tahun_ajaran || "").trim(), sem = num(r.semester);
      if (!sid || !/^\d{4}\/\d{4}$/.test(ta) || (sem !== 1 && sem !== 2)) return;
      const id = `${sid}|${ta}|${sem}`;
      ujianLatest[id] = UJ_COLS.map((c) => c === "id" ? id : c === "santri_id" ? sid : c === "tahun_ajaran" ? ta : c === "semester" ? sem
        : c.endsWith("_nilai") ? nOrNull(r[c]) : c === "tanggal" ? dateText(r[c]) : c === "diperbarui_pada" ? dateOrNull(r[c]) || new Date().toISOString() : stripGuard(r[c]));
    });

    const PT_COLS = ["id", "santri_id", "santri_nama", "unit", "tingkat", "halaqah", "musyrif", "ym", "tanggal", "makhraj_nilai", "makhraj", "ket_makhraj",
      "tajwid_nilai", "tajwid", "ket_tajwid", "catatan", "penilai", "diperbarui_oleh", "diperbarui_pada"];
    const ptLatest: Record<string, any[]> = {};
    (data.tajwid || []).forEach((r: any) => {
      const sid = String(r.santri_id || "").trim(), ym = String(r.ym || dateText(r.tanggal).slice(0, 7) || "").trim();
      if (!sid || !/^\d{4}-\d{2}$/.test(ym)) return;
      const id = `${sid}|${ym}`;
      ptLatest[id] = PT_COLS.map((c) => c === "id" ? id : c === "santri_id" ? sid : c === "ym" ? ym : c.endsWith("_nilai") ? nOrNull(r[c])
        : c === "tanggal" ? dateText(r[c]) : c === "diperbarui_pada" ? dateOrNull(r[c]) || new Date().toISOString() : stripGuard(r[c]));
    });

    const histori = (data.histori || []).map((h: any) => {
      const ym = normalizeYm(h.ym);
      return [ym, String(h.id || "").trim(), stripGuard(h.nama), stripGuard(h.unit), stripGuard(h.tingkat), stripGuard(h.halaqah),
        String(h.halaqah_key || halaqahKey(h.unit, h.tingkat, h.halaqah)), stripGuard(h.musyrif), stripGuard(h.program), stripGuard(h.keterangan)];
    }).filter((h: any[]) => h[0] && h[1]);

    const akun = (data.akun || []).filter((a: any) => a.username);

    await tx(async (run) => {
      await bulk(run, "akun", ["username", "password", "nama", "role", "musyrif_master", "aktif"],
        akun.map((a: any) => [String(a.username).trim(), String(a.password ?? ""), String(a.nama || ""), String(a.role || "musyrif").toLowerCase(), String(a.musyrif_master || ""), String(a.aktif || "Y").toUpperCase() === "N" ? "N" : "Y"]),
        `ON CONFLICT (username) DO UPDATE SET password=EXCLUDED.password, nama=EXCLUDED.nama, role=EXCLUDED.role, musyrif_master=EXCLUDED.musyrif_master, aktif=EXCLUDED.aktif`);
      if (master.length) await writeMaster(run, master);
      await bulk(run, "keanggotaan_histori", ["ym", "santri_id", "nama", "unit", "tingkat", "halaqah", "halaqah_key", "musyrif", "program", "keterangan"], histori,
        "ON CONFLICT (ym, santri_id) DO UPDATE SET nama=EXCLUDED.nama, unit=EXCLUDED.unit, tingkat=EXCLUDED.tingkat, halaqah=EXCLUDED.halaqah, halaqah_key=EXCLUDED.halaqah_key, musyrif=EXCLUDED.musyrif, program=EXCLUDED.program, keterangan=EXCLUDED.keterangan");
      const scols = ["id", "tahun", "bulan", "pekan", "ym", "santri_id", "santri_nama", "unit", "tingkat", "halaqah", "halaqah_key", "musyrif", "dicatat_oleh",
        "hadir", "sakit", "izin", "alfa", "tahsin_baris", "ziyadah_baris", "murajaah_baris", "nilai_tahsin", "nilai_ziyadah", "nilai_murajaah",
        "ziyadah_surat", "murajaah_juz", "catatan", "dicatat_pada"];
      await bulk(run, "setoran", scols, setoranRows.map((r: any) => scols.map((c) => r[c])),
        `ON CONFLICT (ym, pekan, santri_id) DO UPDATE SET ${scols.filter((c) => !["ym", "pekan", "santri_id"].includes(c)).map((c) => c + "=EXCLUDED." + c).join(",")}
         WHERE setoran.dicatat_pada <= EXCLUDED.dicatat_pada`, 150);
      await bulk(run, "hafalan", ["santri_id", "santri_nama", "baris_awal", "keterangan", "diperbarui_oleh", "diperbarui_pada", "baris_terverifikasi",
        "terverifikasi_sampai_ym", "terverifikasi_oleh", "terverifikasi_pada", "target_juz", "juz_selesai", "juz_diuji"], hafalan,
        `ON CONFLICT (santri_id) DO UPDATE SET santri_nama=EXCLUDED.santri_nama, baris_awal=EXCLUDED.baris_awal, keterangan=EXCLUDED.keterangan,
         diperbarui_oleh=EXCLUDED.diperbarui_oleh, diperbarui_pada=EXCLUDED.diperbarui_pada, baris_terverifikasi=EXCLUDED.baris_terverifikasi,
         terverifikasi_sampai_ym=EXCLUDED.terverifikasi_sampai_ym, terverifikasi_oleh=EXCLUDED.terverifikasi_oleh, terverifikasi_pada=EXCLUDED.terverifikasi_pada,
         target_juz=EXCLUDED.target_juz, juz_selesai=EXCLUDED.juz_selesai${adaDiuji ? ", juz_diuji=EXCLUDED.juz_diuji" : ""}`);
      await bulk(run, "sertifikasi", ["id", "santri_id", "santri_nama", "unit", "tingkat", "halaqah", "musyrif", "juz", "bagian", "halaman_minimal", "tanggal_ujian",
        "nilai", "status", "penguji", "catatan", "dicatat_oleh", "dicatat_pada", "diperbarui_pada"], Object.values(sertLatest),
        `ON CONFLICT (santri_id, juz, bagian) DO UPDATE SET id=EXCLUDED.id, tanggal_ujian=EXCLUDED.tanggal_ujian, nilai=EXCLUDED.nilai, status=EXCLUDED.status,
         penguji=EXCLUDED.penguji, catatan=EXCLUDED.catatan, diperbarui_pada=EXCLUDED.diperbarui_pada WHERE sertifikasi.diperbarui_pada <= EXCLUDED.diperbarui_pada`);
      await bulk(run, "hadis_arbain", ["id", "santri_id", "santri_nama", "unit", "tingkat", "halaqah", "musyrif", "nomor", "status", "nilai", "tanggal",
        "catatan", "diperbarui_oleh", "diperbarui_pada"], Object.values(arbainLatest),
        `ON CONFLICT (santri_id, nomor) DO UPDATE SET status=EXCLUDED.status, nilai=EXCLUDED.nilai, tanggal=EXCLUDED.tanggal, catatan=EXCLUDED.catatan,
         diperbarui_oleh=EXCLUDED.diperbarui_oleh, diperbarui_pada=EXCLUDED.diperbarui_pada WHERE hadis_arbain.diperbarui_pada <= EXCLUDED.diperbarui_pada`);
      await bulk(run, "ujian_semester", UJ_COLS, Object.values(ujianLatest),
        `ON CONFLICT (santri_id, tahun_ajaran, semester) DO UPDATE SET ${UJ_COLS.filter((c) => !["id", "santri_id", "tahun_ajaran", "semester"].includes(c)).map((c) => c + "=EXCLUDED." + c).join(",")}
         WHERE ujian_semester.diperbarui_pada <= EXCLUDED.diperbarui_pada`);
      await bulk(run, "penilaian_tajwid", PT_COLS, Object.values(ptLatest),
        `ON CONFLICT (santri_id, ym) DO UPDATE SET ${PT_COLS.filter((c) => !["id", "santri_id", "ym"].includes(c)).map((c) => c + "=EXCLUDED." + c).join(",")}
         WHERE penilaian_tajwid.diperbarui_pada <= EXCLUDED.diperbarui_pada`);
      // Rapikan data lama pekan ke-5 di Spreadsheet
      for (const r of legacyUpserts) await enqueue(run, "Setoran", "upsert", setoranSheetRow(r));
      for (const id of legacyDeletes) await enqueue(run, "Setoran", "delete", { id });
    });
    const counts = { akun: akun.length, santri: master.length, setoran: setoranRows.length, hafalan: hafalan.length, sertifikasi: Object.keys(sertLatest).length, arbain: Object.keys(arbainLatest).length, ujian: Object.keys(ujianLatest).length, tajwid: Object.keys(ptLatest).length, histori: histori.length };
    await setMeta("import", { status: "selesai", finished_at: new Date().toISOString(), counts });
    return counts;
  } catch (e: any) {
    await setMeta("import", { status: "gagal", error: String(e?.message || e).slice(0, 500), finished_at: new Date().toISOString() });
    throw e;
  }
}
