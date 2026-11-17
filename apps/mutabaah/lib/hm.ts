// Halaqah Musyrif: halaqah tahfidz para musyrif & musyrifah, diampu seorang pengampu.
// Sekali sepekan (Pekan 1–4 tiap bulan, sama dengan halaqah santri). Isian: kehadiran, ziyadah, nilai A/B+/B/C, catatan (otomatis, bisa diedit).
// Target hafalan minimal 5 juz (bisa diubah per peserta); tiap juz selesai diujikan (hijau = selesai, oranye = sudah diuji).
import { q, tx } from "./db";
import * as U from "./util";
import { enqueue } from "./sync";

type User = { username: string; nama: string; role: string; musyrif_master?: string };
type Ctx = { kick: () => Promise<void> };
const isPimpinan = (u: User) => u.role === "pimpinan" || u.role === "admin";
export const HM_PEKAN = 4;
/** Pengisian dimulai 12 Oktober 2026 (masuk Pekan 2 Oktober); pekan sebelumnya tidak diisi. */
export const HM_MULAI = { ym: "2026-10", pekan: 2, tanggal: "2026-10-12" };
/** Nilai setoran: kelancaran, makhraj, tajwid — rentang A, B+, B, C (boleh kosong). */
export const HM_NILAI = ["A", "B+", "B", "C"];
const nilai = (v: any) => { const s = String(v ?? "").trim().toUpperCase(); return HM_NILAI.includes(s) ? s : ""; };
export const HM_TARGET_DEFAULT = 5;
const KEHADIRAN = ["hadir", "izin", "sakit", "alfa"];
const teks = (v: any, n = 500) => U.clip(String(v ?? "").replace(/\s+/g, " ").trim(), n);
const cekYm = (ym: any) => { const s = String(ym || ""); if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) throw new Error("Bulan tidak valid."); return s; };
const cekPekan = (p: any) => { const n = Number(p); if (!Number.isInteger(n) || n < 1 || n > HM_PEKAN) throw new Error("Pekan harus 1–4."); return n; };
const sebelumMulai = (ym: string, p: number) => ym < HM_MULAI.ym || (ym === HM_MULAI.ym && p < HM_MULAI.pekan);
const halNum = (v: any) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const juzList = (v: any) => U.parseJuzList(v).filter((j: number) => j >= 1 && j <= 30);

/** Grup yang boleh dikelola: pimpinan semua; pengampu grupnya sendiri. */
async function grupKelola(u: User, grupId: any) {
  const g = (await q("SELECT * FROM hm_grup WHERE id=$1 AND aktif", [Number(grupId) || 0]))[0];
  if (!g) throw new Error("Halaqah tidak ditemukan.");
  if (!isPimpinan(u) && g.pengampu_username !== u.username) throw new Error("Anda bukan pengampu halaqah ini.");
  return g;
}
const sheetRow = (c: any, g: any, a: any) => ({
  id: "HM-" + c.id, halaqah: g.nama, pengampu: g.pengampu_nama, peserta: a.nama, peserta_username: a.username,
  bulan: c.ym, pekan: c.pekan, tanggal: c.tanggal, kehadiran: c.kehadiran, ziyadah_surat: c.surat, ziyadah_hal: c.halaman,
  nilai_kelancaran: c.nilai_kelancaran, nilai_makhraj: c.nilai_makhraj, nilai_tajwid: c.nilai_tajwid,
  keterangan: c.keterangan, dicatat_oleh: c.dicatat_oleh, diperbarui_pada: c.diperbarui_pada,
});
const capaianRow = (a: any, g: any) => ({
  id: "HMA-" + a.id, halaqah: g.nama, peserta: a.nama, peserta_username: a.username,
  target_juz: a.target_juz, juz_selesai: a.juz_selesai, juz_diuji: a.juz_diuji, aktif: a.aktif ? "Y" : "N",
});
/** Ringkasan capaian satu peserta (dihitung di database, hanya angka kecil yang dikirim). */
const capaian = (a: any, totalHal: number) => {
  const sel = juzList(a.juz_selesai), uji = juzList(a.juz_diuji).filter((j: number) => sel.includes(j));
  return { target_juz: Number(a.target_juz) || HM_TARGET_DEFAULT, juz_selesai: sel, juz_diuji: uji, ziyadah_hal: Math.round(totalHal * 10) / 10 };
};
const SQL_TOTAL_HAL = `coalesce((SELECT sum(CASE WHEN replace(c.halaman, ',', '.') ~ '^[0-9]+(\\.[0-9]+)?$' THEN replace(c.halaman, ',', '.')::numeric ELSE 0 END)
  FROM hm_catatan c WHERE c.anggota_id = a.id AND c.kehadiran = 'hadir' AND (c.ym > '${HM_MULAI.ym}' OR (c.ym = '${HM_MULAI.ym}' AND c.pekan >= ${HM_MULAI.pekan}))), 0)::float AS total_hal`;

/** Ringkas: halaqah yang diampu/dikelola + keikutsertaan sendiri sebagai peserta. */
export async function getHM(u: User) {
  const n = U.nowWib();
  const grup = await q(`SELECT g.id, g.nama, g.jenis, g.pengampu_username, g.pengampu_nama,
      (SELECT count(*)::int FROM hm_anggota a WHERE a.grup_id = g.id AND a.aktif) AS jumlah,
      (SELECT count(DISTINCT c.pekan)::int FROM hm_catatan c WHERE c.grup_id = g.id AND c.ym = $1) AS pekan_terisi,
      (SELECT count(*)::int FROM hm_anggota a WHERE a.grup_id = g.id AND a.aktif AND a.juz_selesai <> '' AND
        EXISTS (SELECT 1 FROM unnest(string_to_array(a.juz_selesai, ',')) j WHERE NOT (j = ANY(string_to_array(a.juz_diuji, ','))))) AS perlu_ujian
    FROM hm_grup g WHERE g.aktif ${isPimpinan(u) ? "" : "AND g.pengampu_username = $2"} ORDER BY g.urut, g.id`, isPimpinan(u) ? [n.ym] : [n.ym, u.username]);
  const saya = await q(`SELECT a.id AS anggota_id, a.target_juz, a.juz_selesai, a.juz_diuji, g.id AS grup_id, g.nama, g.pengampu_nama, ${SQL_TOTAL_HAL}
    FROM hm_anggota a JOIN hm_grup g ON g.id = a.grup_id WHERE a.aktif AND g.aktif AND a.username = $1 ORDER BY g.urut`, [u.username]);
  const peserta = saya.map((a: any) => ({ anggota_id: a.anggota_id, grup_id: a.grup_id, nama: a.nama, pengampu_nama: a.pengampu_nama, ...capaian(a, a.total_hal) }));
  return { ym: n.ym, pekan: U.pekanForDay(n.hari), mulai: HM_MULAI, grup, peserta, pimpinan: isPimpinan(u) };
}

/** Isian satu pekan: daftar peserta + isian pekan itu + capaian hafalan masing-masing. */
export async function getHMForm(u: User, grupId: any, ym: any, pekan: any) {
  const g = await grupKelola(u, grupId), y = cekYm(ym), p = cekPekan(pekan);
  const anggota = await q(`SELECT a.id, a.nama, a.username, a.target_juz, a.juz_selesai, a.juz_diuji, ${SQL_TOTAL_HAL}
    FROM hm_anggota a WHERE a.grup_id=$1 AND a.aktif ORDER BY a.urut, a.id`, [g.id]);
  const ini = sebelumMulai(y, p) ? [] : await q("SELECT anggota_id, tanggal, kehadiran, surat, halaman, nilai_kelancaran, nilai_makhraj, nilai_tajwid, keterangan FROM hm_catatan WHERE grup_id=$1 AND ym=$2 AND pekan=$3", [g.id, y, p]);
  const terisi = await q("SELECT pekan, count(*)::int AS n FROM hm_catatan WHERE grup_id=$1 AND ym=$2 GROUP BY pekan", [g.id, y]);
  const mi: Record<string, any> = {};
  ini.forEach((r: any) => (mi[r.anggota_id] = r));
  return {
    grup: { id: g.id, nama: g.nama, pengampu_nama: g.pengampu_nama, jenis: g.jenis }, ym: y, pekan: p, mulai: HM_MULAI, terkunci: sebelumMulai(y, p),
    tanggal: ini.find((r: any) => r.tanggal)?.tanggal || "",
    terisi: Object.fromEntries(terisi.filter((r: any) => !sebelumMulai(y, r.pekan)).map((r: any) => [r.pekan, r.n])),
    peserta: anggota.map((a: any) => ({ id: a.id, nama: a.nama, username: a.username, isian: mi[a.id] || null, ...capaian(a, a.total_hal) })),
  };
}

/** Simpan satu pekan. Baris kosong (hadir tanpa ziyadah) = belum diisi → isian lama dihapus. */
export async function saveHM(u: User, grupId: any, ym: any, pekan: any, d: any, ctx: Ctx) {
  const g = await grupKelola(u, grupId), y = cekYm(ym), p = cekPekan(pekan);
  if (sebelumMulai(y, p) || U.todayWib() < HM_MULAI.tanggal) throw new Error("Pengisian halaqah musyrif dimulai 12 Oktober 2026.");
  if (y > U.nowWib().ym) throw new Error("Bulan belum berjalan.");
  d = d || {};
  const tanggal = String(d.tanggal || "").trim();
  if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error("Tanggal tidak valid.");
  if (tanggal && tanggal > U.todayWib()) throw new Error("Tanggal tidak boleh melebihi hari ini.");
  if (tanggal && tanggal < HM_MULAI.tanggal) throw new Error("Tanggal halaqah paling awal 12 Oktober 2026.");
  const rows = Array.isArray(d.rows) ? d.rows.slice(0, 60) : [];
  const anggota = await q("SELECT id, nama, username FROM hm_anggota WHERE grup_id=$1", [g.id]);
  const am: Record<string, any> = {}; anggota.forEach((a: any) => (am[a.id] = a));
  let disimpan = 0, dihapus = 0;
  await tx(async (run) => {
    for (const r of rows) {
      const a = am[Number(r.anggota_id)]; if (!a) continue;
      const kehadiran = KEHADIRAN.includes(r.kehadiran) ? r.kehadiran : "hadir";
      const hadir = kehadiran === "hadir";
      const surat = hadir ? teks(r.surat, 200) : "";
      let halaman = hadir ? teks(r.halaman, 10).replace(",", ".") : "";
      if (halaman) {
        const n = Number(halaman);
        if (!Number.isFinite(n) || n < 0 || n > 40) throw new Error(`Ziyadah ${a.nama}: jumlah halaman harus angka 0–40.`);
        halaman = n ? String(Math.round(n * 10) / 10) : "";
      }
      const nk = hadir ? nilai(r.nilai_kelancaran) : "", nm = hadir ? nilai(r.nilai_makhraj) : "", nt = hadir ? nilai(r.nilai_tajwid) : "";
      const ket = teks(r.keterangan, 300);
      const kosong = hadir && !surat && !halaman && !nk && !nm && !nt && !ket;
      const old = (await run("SELECT * FROM hm_catatan WHERE anggota_id=$1 AND ym=$2 AND pekan=$3", [a.id, y, p]))[0];
      if (kosong) {
        if (old) { await run("DELETE FROM hm_catatan WHERE id=$1", [old.id]); await enqueue(run, "JurnalHalaqahMusyrif", "delete", { id: "HM-" + old.id }); dihapus++; }
        continue;
      }
      if (old && old.kehadiran === kehadiran && old.surat === surat && old.halaman === halaman && old.tanggal === tanggal
        && old.nilai_kelancaran === nk && old.nilai_makhraj === nm && old.nilai_tajwid === nt && old.keterangan === ket) continue;
      const c = (await run(`INSERT INTO hm_catatan (anggota_id, grup_id, ym, pekan, tanggal, kehadiran, surat, halaman, dicatat_oleh, nilai_kelancaran, nilai_makhraj, nilai_tajwid, keterangan, diperbarui_pada)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now())
        ON CONFLICT (anggota_id, ym, pekan) DO UPDATE SET tanggal=EXCLUDED.tanggal, kehadiran=EXCLUDED.kehadiran, surat=EXCLUDED.surat, halaman=EXCLUDED.halaman,
          nilai_kelancaran=EXCLUDED.nilai_kelancaran, nilai_makhraj=EXCLUDED.nilai_makhraj, nilai_tajwid=EXCLUDED.nilai_tajwid, keterangan=EXCLUDED.keterangan, dicatat_oleh=EXCLUDED.dicatat_oleh, diperbarui_pada=now() RETURNING *`,
        [a.id, g.id, y, p, tanggal, kehadiran, surat, halaman, u.username, nk, nm, nt, ket]))[0];
      await enqueue(run, "JurnalHalaqahMusyrif", "upsert", sheetRow(c, g, a));
      disimpan++;
    }
    // Tanggal halaqah berlaku untuk semua peserta yang sudah tercatat di pekan ini
    if (tanggal) await run("UPDATE hm_catatan SET tanggal=$4 WHERE grup_id=$1 AND ym=$2 AND pekan=$3 AND tanggal <> $4", [g.id, y, p, tanggal]);
  });
  await ctx.kick();
  return { ok: true, disimpan, dihapus };
}

/** Pengampu/pimpinan: simpan peta juz (selesai = hijau, sudah diuji = oranye) dan target juz satu peserta. */
export async function hmJuz(u: User, anggotaId: any, selesai: any, diuji: any, target: any, ctx: Ctx) {
  const a = (await q("SELECT * FROM hm_anggota WHERE id=$1 AND aktif", [Number(anggotaId) || 0]))[0];
  if (!a) throw new Error("Peserta tidak ditemukan.");
  const g = await grupKelola(u, a.grup_id);
  const cek = (l: any) => {
    if (!Array.isArray(l)) throw new Error("Daftar juz tidak valid.");
    const n = l.map(Number);
    if (n.some((x) => !Number.isInteger(x) || x < 1 || x > 30) || new Set(n).size !== n.length) throw new Error("Juz harus angka 1–30 tanpa duplikasi.");
    return U.parseJuzList(n);
  };
  const sel = cek(selesai), uji = cek(diuji || []).filter((j: number) => sel.includes(j));
  const t = target === undefined || target === null || target === "" ? Number(a.target_juz) || HM_TARGET_DEFAULT : Number(target);
  if (!Number.isInteger(t) || t < 1 || t > 30) throw new Error("Target hafalan harus 1–30 juz.");
  await tx(async (run) => {
    const r = (await run("UPDATE hm_anggota SET juz_selesai=$2, juz_diuji=$3, target_juz=$4 WHERE id=$1 RETURNING *", [a.id, sel.join(","), uji.join(","), t]))[0];
    await enqueue(run, "CapaianHalaqahMusyrif", "upsert", capaianRow(r, g));
  });
  await ctx.kick();
  return { ok: true, juz_selesai: sel, juz_diuji: uji, target_juz: t };
}

/** Riwayat satu peserta. Boleh: pimpinan, pengampu grupnya, atau peserta itu sendiri. */
export async function getHMRiwayat(u: User, anggotaId: any) {
  const a = (await q(`SELECT a.*, g.nama AS grup_nama, g.pengampu_nama, g.pengampu_username, ${SQL_TOTAL_HAL}
    FROM hm_anggota a JOIN hm_grup g ON g.id = a.grup_id WHERE a.id=$1`, [Number(anggotaId) || 0]))[0];
  if (!a) throw new Error("Peserta tidak ditemukan.");
  if (!isPimpinan(u) && a.pengampu_username !== u.username && a.username !== u.username) throw new Error("Tidak berhak melihat catatan ini.");
  const catatan = await q(`SELECT ym, pekan, tanggal, kehadiran, surat, halaman, nilai_kelancaran, nilai_makhraj, nilai_tajwid, keterangan FROM hm_catatan WHERE anggota_id=$1
    AND (ym > $2 OR (ym = $2 AND pekan >= $3)) ORDER BY ym DESC, pekan DESC LIMIT 60`, [a.id, HM_MULAI.ym, HM_MULAI.pekan]);
  return { peserta: { id: a.id, nama: a.nama, ...capaian(a, a.total_hal) }, grup: { nama: a.grup_nama, pengampu_nama: a.pengampu_nama }, catatan };
}

/** Pengampu/pimpinan: tambah atau keluarkan peserta. */
export async function hmAnggota(u: User, grupId: any, aksi: any, d: any) {
  const g = await grupKelola(u, grupId); d = d || {};
  if (aksi === "hapus") {
    const r = await q("UPDATE hm_anggota SET aktif=false WHERE id=$1 AND grup_id=$2 RETURNING id", [Number(d.anggota_id) || 0, g.id]);
    if (!r.length) throw new Error("Peserta tidak ditemukan.");
    return { ok: true };
  }
  let nama = teks(d.nama, 120), username = String(d.username || "").trim();
  if (username) {
    const ak = (await q("SELECT username, nama FROM akun WHERE username=$1 AND aktif='Y'", [username]))[0];
    if (!ak) throw new Error("Akun tidak ditemukan.");
    nama = ak.nama;
    const ada = (await q("SELECT id, aktif FROM hm_anggota WHERE grup_id=$1 AND username=$2", [g.id, username]))[0];
    if (ada?.aktif) throw new Error("Sudah menjadi peserta halaqah ini.");
    if (ada) { await q("UPDATE hm_anggota SET aktif=true WHERE id=$1", [ada.id]); return { ok: true, id: ada.id }; }
  }
  if (nama.length < 3) throw new Error("Nama peserta minimal 3 huruf.");
  const r = await q("INSERT INTO hm_anggota (grup_id, nama, username, urut) VALUES ($1,$2,$3,(SELECT coalesce(max(urut),0)+1 FROM hm_anggota WHERE grup_id=$1)) RETURNING id", [g.id, nama, username]);
  return { ok: true, id: r[0].id };
}

/** Pimpinan: ganti pengampu (akun aktif) dan/atau nama halaqah. */
export async function hmAturGrup(u: User, grupId: any, d: any) {
  if (!isPimpinan(u)) throw new Error("Hanya pimpinan.");
  const g = await grupKelola(u, grupId); d = d || {};
  let pu = g.pengampu_username, pn = g.pengampu_nama;
  if (d.pengampu_username !== undefined && d.pengampu_username !== pu) {
    const ak = (await q("SELECT username, nama FROM akun WHERE username=$1 AND aktif='Y'", [String(d.pengampu_username)]))[0];
    if (!ak) throw new Error("Akun pengampu tidak ditemukan.");
    pu = ak.username; pn = ak.nama;
  }
  const nama = d.nama ? teks(d.nama, 80) : g.nama;
  await q("UPDATE hm_grup SET pengampu_username=$2, pengampu_nama=$3, nama=$4 WHERE id=$1", [g.id, pu, pn, nama]);
  return { ok: true };
}

/** Daftar akun musyrif aktif (untuk memilih peserta/pengampu). */
export async function hmAkun(u: User) {
  if (!isPimpinan(u)) {
    const g = await q("SELECT 1 FROM hm_grup WHERE aktif AND pengampu_username=$1 LIMIT 1", [u.username]);
    if (!g.length) throw new Error("Hanya pengampu atau pimpinan.");
  }
  return q("SELECT username, nama FROM akun WHERE aktif='Y' AND role='musyrif' ORDER BY nama");
}
