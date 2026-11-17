/**
 * Aturan target hafalan & ujian semester (dipakai server dan tampilan).
 * Sumber: Panduan Pengisian Rapor Al-Qur'an + keputusan pimpinan.
 * Ubah angka di file ini bila kebijakan berubah.
 */
export const BARIS_PER_JUZ = 300; // 20 halaman x 15 baris

/* ---------- jenis kelas & target lulusan ---------- */
export const jenjangOf = (unit: any) => String(unit || "").trim().split(/\s+/)[0].toUpperCase();
/** Kelas tahfidz = program "PK" (Program Khusus) di data master; kata "tahfidz"/"tahfiz" juga dikenali. */
export const genderOf = (unit: any) => (/akhwat/i.test(String(unit)) ? "Putri" : /ikhwan/i.test(String(unit)) ? "Putra" : "");
export const unitLabel = (unit: any) => `${jenjangOf(unit)} ${genderOf(unit)}`.trim();
export const UNIT_ORDER = ["SMP Ikhwan", "SMP Akhwat", "SMA Ikhwan", "SMA Akhwat", "MA Ikhwan", "MA Akhwat"];
export const isTahfidz = (s: any) => String(s?.program || "").trim().toUpperCase() === "PK" || /tahfi[dz]/i.test(`${s?.program || ""} ${s?.halaqah || ""}`);
export const TARGET_LULUSAN = { reguler: 5, tahfidz: 10 };
export const defaultTargetJuz = (s: any) => (isTahfidz(s) ? TARGET_LULUSAN.tahfidz : TARGET_LULUSAN.reguler);
/** 0/kosong/30 (nilai lama) = pakai default sesuai jenis kelas. */
export const targetLulusanJuz = (s: any, stored: any) => {
  const n = Number(stored) || 0;
  return n > 0 && n !== 30 ? n : defaultTargetJuz(s);
};

/* ---------- semester ---------- */
export const PEKAN_PER_SEMESTER = 24;
export function semesterOf(ym: string) {
  const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7));
  const ganjil = m >= 7, ta = ganjil ? y : y - 1;
  return {
    ta, tahun_ajaran: `${ta}/${ta + 1}`, semester: ganjil ? 1 : 2, nama: ganjil ? "Ganjil" : "Genap",
    dari: ganjil ? `${ta}-07` : `${ta + 1}-01`, sampai: ganjil ? `${ta}-12` : `${ta + 1}-06`,
  };
}
export function parseTa(tahun_ajaran: string, semester: number) {
  const ta = Number(String(tahun_ajaran).slice(0, 4));
  return { ta, tahun_ajaran: `${ta}/${ta + 1}`, semester, nama: semester === 1 ? "Ganjil" : "Genap",
    dari: semester === 1 ? `${ta}-07` : `${ta + 1}-01`, sampai: semester === 1 ? `${ta}-12` : `${ta + 1}-06` };
}
/** Pekan semester yang sudah berjalan (1..24) pada bulan ym & pekan p. */
export function pekanBerjalan(sem: { dari: string }, ym: string, pekan: number) {
  const a = Number(sem.dari.slice(0, 4)) * 12 + Number(sem.dari.slice(5, 7));
  const b = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7));
  return Math.max(0, Math.min(PEKAN_PER_SEMESTER, (b - a) * 4 + pekan));
}
/** Semester ke-1..6 di jenjangnya (SMP: kelas 7-9, SMA/MA: kelas 10-12). 0 bila tidak diketahui. */
export function semesterKe(s: any, semester: number) {
  const t = Number(s?.tingkat), base = jenjangOf(s?.unit) === "SMP" ? 7 : 10;
  if (!t) return 0;
  const k = (t - base) * 2 + semester;
  return k >= 1 && k <= 6 ? k : 0;
}

export type TargetSem =
  | { jenis: "tahsin"; label: string }
  | { jenis: "hafalan"; label: string; baris: number; juz: number }
  | { jenis: "sertifikasi"; label: string }
  | { jenis: "none"; label: string };

export function targetSemester(s: any, semKe: number): TargetSem {
  if (!semKe) return { jenis: "none", label: "Tingkat tidak dikenali" };
  if (semKe === 6) return { jenis: "sertifikasi", label: "Fokus sertifikasi hafalan (kelas akhir)" };
  const tahfidz = isTahfidz(s), juz = tahfidz ? 2 : 1, hal = juz * 20;
  return { jenis: "hafalan", label: `${juz} juz (${hal} halaman)${tahfidz ? " · program khusus" : ""}`, baris: hal * 15, juz };
}

/* ---------- status capaian ---------- */
export type StatusSem = "lulus" | "tercapai" | "on_track" | "tertinggal" | "jauh" | "belum_lengkap" | "tahsin" | "none";
export const STATUS_INFO: Record<StatusSem, { label: string; warna: string; urut: number }> = {
  lulus: { label: "Target lulusan tercapai", warna: "#0D4A28", urut: 0 },
  tercapai: { label: "Target semester tercapai", warna: "#17873F", urut: 1 },
  on_track: { label: "On the track", warna: "#2F6BD8", urut: 2 },
  tertinggal: { label: "Tertinggal", warna: "#EE8A35", urut: 3 },
  jauh: { label: "Jauh dari target", warna: "#D14343", urut: 4 },
  belum_lengkap: { label: "Data belum lengkap", warna: "#7C8B99", urut: 5 },
  tahsin: { label: "Fokus tahsin", warna: "#9AA8A0", urut: 6 },
  none: { label: "Tanpa target", warna: "#C9D3CD", urut: 7 },
};
/** capai & target dalam satuan yang sama; frac = porsi semester yang sudah berjalan (0..1). */
export function statusOf(capai: number, target: number, frac: number): StatusSem {
  if (target <= 0) return "none";
  const p = capai / target;
  if (p >= 1) return "tercapai";
  const r = p / Math.max(frac, 1 / PEKAN_PER_SEMESTER);
  return r >= 0.9 ? "on_track" : r >= 0.6 ? "tertinggal" : "jauh";
}

/* ---------- predikat rapor ---------- */
export const PREDIKAT = ["A", "B+", "B", "C"] as const;
export const PREDIKAT_TAHFIDZ = ["A+", "A", "B+", "B", "C"] as const;
export const predikatNilai = (n: any) => {
  const v = Number(n);
  if (n === "" || n == null || isNaN(v)) return "";
  return v >= 90 ? "A" : v >= 80 ? "B+" : v >= 70 ? "B" : "C";
};
/** Predikat tahfidz dari persentase capaian target semester. */
export const predikatTahfidz = (capai: number, target: number, semKe: number) => {
  if (target <= 0) return "";
  const p = capai / target;
  return p > 1 ? "A+" : p >= 0.9 ? "A" : p >= 0.8 ? "B+" : p >= 0.7 ? "B" : "C";
};
export const predikatRank = (p: string) => ({ "A+": 5, A: 4, "B+": 3, B: 2, C: 1 } as any)[p] || 0;
export const minimalBPlus = (p: string) => predikatRank(p) >= 3;

/** Target lulusan aspek makhraj & tajwid: persen santri kelas akhir dengan predikat B+ atau lebih. */
export const TARGET_MAKHRAJ_TAJWID: Record<string, number> = { MA: 90, SMA: 85, SMP: 80 };

/* ---------- ringkasan indikator (isi otomatis kolom keterangan) ---------- */
export const ASPEK = [
  { key: "makhraj", label: "Makhraj huruf", nilai: true },
  { key: "tajwid", label: "Hukum tajwid", nilai: true },
  { key: "tahfidz", label: "Tahfidz/hafalan", nilai: false },
  { key: "kehadiran", label: "Kehadiran & kedisiplinan", nilai: false },
  { key: "perkembangan", label: "Perkembangan", nilai: false },
] as const;
export const INDIKATOR: Record<string, Record<string, string>> = {
  makhraj: {
    A: "Semua huruf keluar dari makhraj yang tepat dan tepat membedakan huruf yang serupa.",
    "B+": "Hampir semua huruf tepat; beberapa huruf kurang jelas dan makhraj serupa kadang tertukar, namun tidak mengganggu bacaan.",
    B: "Mayoritas huruf tepat, namun kesalahan masih terlihat dan makhraj huruf serupa sering tertukar. Perlu penguatan dasar makhraj.",
    C: "Banyak huruf keluar dari makhraj yang kurang tepat sehingga bunyi berubah. Perlu bimbingan khusus.",
  },
  tajwid: {
    A: "Menerapkan hukum tajwid dengan benar dan konsisten; panjang pendek mad sangat terkontrol.",
    "B+": "Menerapkan tajwid dengan kesalahan minor sesekali (ikhfa'/idgham kurang sempurna, mad kurang pas).",
    B: "Menerapkan banyak hukum tajwid, tetapi kesalahan cukup sering (mad tidak stabil, dengung kadang hilang). Perlu latihan penguatan.",
    C: "Hukum tajwid belum diterapkan. Perlu pembinaan dasar dari awal.",
  },
  tahfidz: {
    "A+": "Istimewa: hafalan melampaui target semester.",
    A: "Sangat baik: hafalan mencapai 90–100% target semester.",
    "B+": "Baik sekali: hafalan mencapai 80–89% target semester.",
    B: "Baik: hafalan mencapai 70–79% target semester.",
    C: "Cukup: hafalan di bawah 70% target semester.",
  },
  kehadiran: {
    A: "Kehadiran ≥95% dan tepat waktu, selalu membawa mushaf, setoran teratur, adab sangat baik.",
    "B+": "Kehadiran sangat baik dan jarang terlambat; mushaf hampir selalu dibawa; adab baik, sesekali perlu diingatkan.",
    B: "Kehadiran cukup, beberapa kali terlambat; mushaf kadang lupa; setoran belum stabil; adab perlu diarahkan rutin.",
    C: "Kehadiran rendah dan sering terlambat; mushaf sering tidak dibawa; setoran sering tidak dilakukan. Prioritas pembinaan.",
  },
  perkembangan: {
    A: "Perkembangan signifikan dan konsisten; ada kemajuan nyata setiap pekan; sangat serius dan tugas selalu tuntas.",
    "B+": "Perkembangan stabil meski belum maksimal; kemajuan rutin dengan sesekali melambat.",
    B: "Perkembangan lambat dan tidak stabil; sering stagnan dan kurang konsisten.",
    C: "Perkembangan minimal atau stagnan; target tidak tercapai. Perlu perbaikan.",
  },
};

/* ---------- nilai setoran pekanan: huruf A / B+ / B / C ----------
 * Disimpan sebagai angka wakil (agar rata-rata & data lama tetap terbaca), ditampilkan sebagai huruf.
 * Nilai lama 0–100 dikonversi dengan rentang yang sama: 90–100 A · 80–89 B+ · 70–79 B · <70 C. */
export const NILAI_HURUF: Record<string, number> = { A: 95, "B+": 85, B: 75, C: 65 };
export const hurufKeNilai = (h: any): number | null => { const k = String(h ?? "").trim().toUpperCase(); return k in NILAI_HURUF ? NILAI_HURUF[k] : null; };
/** Angka → huruf ("" bila kosong). Sama dengan predikatNilai, nama lain agar maksudnya jelas di tampilan. */
export const hurufNilai = (n: any) => predikatNilai(n);

/** Deskripsi otomatis catatan setoran per aspek & huruf. */
export const DESKRIPSI_SETORAN: Record<string, Record<string, string>> = {
  tahsin: {
    A: "Bacaan tartil; makhraj dan hukum tajwid sudah tepat.",
    "B+": "Bacaan baik; sesekali makhraj atau tajwid kurang tepat.",
    B: "Bacaan cukup; masih ada kesalahan makhraj/tajwid yang perlu dibenahi.",
    C: "Bacaan perlu bimbingan intensif pada makhraj dan tajwid.",
  },
  ziyadah: {
    A: "Hafalan baru sangat lancar tanpa kesalahan.",
    "B+": "Hafalan baru lancar, sedikit tersendat.",
    B: "Hafalan baru cukup lancar, beberapa kali lupa/tersendat.",
    C: "Hafalan baru belum lancar; perlu diulang sebelum menambah.",
  },
  murajaah: {
    A: "Murajaah sangat lancar, hafalan lama terjaga.",
    "B+": "Murajaah lancar, sesekali perlu dituntun.",
    B: "Murajaah cukup; beberapa bagian mulai lupa.",
    C: "Murajaah lemah; hafalan lama perlu dikuatkan.",
  },
};
export function catatanOtomatis(t: string, z: string, m: string) {
  return [DESKRIPSI_SETORAN.tahsin[t], DESKRIPSI_SETORAN.ziyadah[z], DESKRIPSI_SETORAN.murajaah[m]].filter(Boolean).join(" ");
}

/** Deskripsi otomatis nilai halaqah musyrif (kelancaran, makhraj, tajwid). */
export const DESKRIPSI_HM: Record<string, Record<string, string>> = {
  kelancaran: {
    A: "Hafalan sangat lancar, tanpa tersendat.",
    "B+": "Hafalan lancar, sesekali tersendat.",
    B: "Hafalan cukup lancar, beberapa kali lupa/tersendat.",
    C: "Hafalan belum lancar, sering lupa; perlu diulang.",
  },
  makhraj: {
    A: "Makhraj huruf tepat dan jelas.",
    "B+": "Makhraj baik, sesekali kurang tepat.",
    B: "Masih ada makhraj yang kurang tepat.",
    C: "Banyak makhraj yang perlu dibenahi.",
  },
  tajwid: {
    A: "Hukum tajwid diterapkan dengan tepat.",
    "B+": "Tajwid baik, sesekali terlewat.",
    B: "Beberapa hukum tajwid belum tepat.",
    C: "Banyak hukum tajwid yang perlu dibenahi.",
  },
};
export function catatanHM(kelancaran: string, makhraj: string, tajwid: string) {
  return [DESKRIPSI_HM.kelancaran[kelancaran], DESKRIPSI_HM.makhraj[makhraj], DESKRIPSI_HM.tajwid[tajwid]].filter(Boolean).join(" ");
}

/* ---------- ujian tahfidz semester: 100 poin dikurangi kesalahan ---------- */
export const POTONGAN = { kecil: 0.5, besar: 1, lupa: 1 } as const;
export type UjianJuz = { juz: number; kecil: number; besar: number; lupa: number };
export function skorUjianTahfidz(list: UjianJuz[]) {
  const pot = list.reduce((a, r) => a + r.kecil * POTONGAN.kecil + r.besar * POTONGAN.besar + r.lupa * POTONGAN.lupa, 0);
  return Math.max(0, Math.round((100 - pot) * 10) / 10);
}
export function ringkasUjianTahfidz(list: UjianJuz[]) {
  if (!list.length) return "";
  const s = (k: keyof UjianJuz) => list.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const juz = list.map((r) => r.juz).join(", ");
  return `Diuji juz ${juz}: ${s("lupa")} lupa, ${s("besar")} kesalahan besar, ${s("kecil")} kesalahan kecil. Nilai ${String(skorUjianTahfidz(list)).replace(".", ",")}.`;
}

/* =====================================================================
 * UJIAN TAHFIDZ SEMESTER v2 — Pedoman Ujian Tahfidz Semester 2026/2027
 * 5 soal per juz, nilai awal 100. Potongan: khafī −0,5 · jalī −1 · lupa sambungan −3 · tidak menjawab −10. KKM 75.
 * ===================================================================== */
export const POTONGAN_V2 = { khafi: 0.5, jali: 1, lupa: 3, tidak: 10 } as const;
export const KKM = 75;
export const SOAL_PER_JUZ = 5;
export type Soal = { khafi: number; jali: number; lupa: number; tidak: number };
export type UjianItem = { kind: "juz" | "sebagian" | "fatihah" | "najm"; juz?: number; bagian?: number[]; soal: Soal[] };
export type UjianV2 = { v: 2; mode: "juz" | "sebagian" | "tahsin"; items: UjianItem[]; catatan?: string };
export const MODE_UJIAN = [
  { id: "juz", label: "Hafalan per juz", info: "Untuk juz yang sudah dihafal utuh. Tiap juz 5 soal, nilai awal 100." },
  { id: "sebagian", label: "Belum satu juz", info: "Khusus Juz 30: pilih ¼, ½, atau ¾ sesuai kelompok surat yang sudah dikuasai. Tetap 5 soal, nilai awal 100." },
  { id: "tahsin", label: "Tahsin / dasar", info: "Hafalan < ¼ juz: setor Al-Fatihah (hafalan) dan baca An-Najm ayat 1–18 (mushaf). Nilai akhir = rata-rata keduanya." },
] as const;
/** Juz 30 dibagi empat kelompok surat untuk ujian "belum satu juz". */
export const KELOMPOK_JUZ30 = [
  { no: 1, label: "An-Naba' – At-Takwir", dari: 78, sampai: 81 },
  { no: 2, label: "Al-Infithar – Al-A'la", dari: 82, sampai: 87 },
  { no: 3, label: "Al-Ghasyiyah – Al-Insyirah", dari: 88, sampai: 94 },
  { no: 4, label: "At-Tin – An-Nas", dari: 95, sampai: 114 },
];
export const soalKosong = (): Soal => ({ khafi: 0, jali: 0, lupa: 0, tidak: 0 });
const bulat1 = (n: number) => Math.round(n * 10) / 10;
export const potonganSoal = (s: Soal) =>
  (Number(s.khafi) || 0) * POTONGAN_V2.khafi + (Number(s.jali) || 0) * POTONGAN_V2.jali + (Number(s.lupa) || 0) * POTONGAN_V2.lupa + (Number(s.tidak) || 0) * POTONGAN_V2.tidak;
export const nilaiItem = (it: { soal?: Soal[] }) => Math.max(0, bulat1(100 - (it.soal || []).reduce((a, s) => a + potonganSoal(s), 0)));
export function isUjianV2(v: any): v is UjianV2 { return !!v && typeof v === "object" && !Array.isArray(v) && v.v === 2; }
/** Nilai akhir = rata-rata nilai semua item (juz / bagian Juz 30 / Al-Fatihah + An-Najm). */
export function nilaiUjianV2(u: UjianV2 | null | undefined): number | null {
  if (!u || !u.items?.length) return null;
  return bulat1(u.items.reduce((a, it) => a + nilaiItem(it), 0) / u.items.length);
}
export const labelItem = (it: UjianItem) =>
  it.kind === "juz" ? `Juz ${it.juz}` : it.kind === "sebagian" ? `Juz 30 (${(it.bagian || []).length}/4: kelompok ${(it.bagian || []).join(", ")})` : it.kind === "fatihah" ? "Al-Fatihah (hafalan)" : "An-Najm 1–18 (tilawah)";
export function ringkasUjianV2(u: UjianV2 | null | undefined) {
  if (!u || !u.items?.length) return "";
  const n = nilaiUjianV2(u) as number, f = (x: number) => String(x).replace(".", ",");
  const bagian = u.items.map((it) => `${labelItem(it)} ${f(nilaiItem(it))}${it.kind === "fatihah" || it.kind === "najm" ? "" : nilaiItem(it) >= KKM ? " (lulus)" : " (belum lulus)"}`);
  return `${bagian.join("; ")}. Nilai ujian ${f(n)}${n >= KKM ? ", memenuhi KKM 75." : ", di bawah KKM 75."}`;
}
/** Nilai ujian apa pun formatnya (v2 baru atau daftar juz lama). */
export function nilaiUjianApaSaja(v: any): number | null {
  if (isUjianV2(v)) return nilaiUjianV2(v);
  if (Array.isArray(v) && v.length) return skorUjianTahfidz(v as UjianJuz[]);
  return null;
}

/* =====================================================================
 * RAPOR AL-QUR'AN SEMESTER (F4)
 * ===================================================================== */
/** Surat Juz 26–30 (nomor, nama sesuai templat rapor, juz). */
export const SURAT_RAPOR = ([
  [46, "Al Ahqaaf", 26], [47, "Muhammad", 26], [48, "Al Fath", 26], [49, "Al Hujuraat", 26], [50, "Qaaf", 26],
  [51, "Adz Dzaariyaat", 27], [52, "Ath Thuur", 27], [53, "An Najm", 27], [54, "Al Qamar", 27], [55, "Ar Rahmaan", 27], [56, "Al Waaqi'ah", 27], [57, "Al Hadiid", 27],
  [58, "Al Mujaadilah", 28], [59, "Al Hasyr", 28], [60, "Al Mumtahanah", 28], [61, "Ash Shaff", 28], [62, "Al Jumu'ah", 28], [63, "Al Munaafiquun", 28], [64, "At Taghaabun", 28], [65, "Ath Thalaaq", 28], [66, "At Tahriim", 28],
  [67, "Al Mulk", 29], [68, "Al Qalam", 29], [69, "Al Haaqqah", 29], [70, "Al Ma'aarij", 29], [71, "Nuuh", 29], [72, "Al Jinn", 29], [73, "Al Muzzammil", 29], [74, "Al Muddatstsir", 29], [75, "Al Qiyaamah", 29], [76, "Al Insaan", 29], [77, "Al Mursalaat", 29],
  [78, "An Naba'", 30], [79, "An Naazi'aat", 30], [80, "'Abasa", 30], [81, "At Takwiir", 30], [82, "Al Infithaar", 30], [83, "Al Muthaffifiin", 30], [84, "Al Insyiqaaq", 30], [85, "Al Buruuj", 30], [86, "Ath Thaariq", 30], [87, "Al A'laa", 30],
  [88, "Al Ghaasyiyah", 30], [89, "Al Fajr", 30], [90, "Al Balad", 30], [91, "Asy Syams", 30], [92, "Al Lail", 30], [93, "Adh Dhuha", 30], [94, "Al Insyiraah", 30], [95, "At Tiin", 30], [96, "Al 'Alaq", 30], [97, "Al Qadr", 30],
  [98, "Al Bayyinah", 30], [99, "Az Zalzalah", 30], [100, "Al 'Aadiyaat", 30], [101, "Al Qaari'ah", 30], [102, "At Takaatsur", 30], [103, "Al 'Ashr", 30], [104, "Al Humazah", 30], [105, "Al Fiil", 30], [106, "Al Quraisy", 30],
  [107, "Al Maa'uun", 30], [108, "Al Kautsar", 30], [109, "Al Kaafiruun", 30], [110, "An Nashr", 30], [111, "Al Lahab", 30], [112, "Al Ikhlaash", 30], [113, "Al Falaq", 30], [114, "An Naas", 30],
] as [number, string, number][]).map(([id, nama, juz]) => ({ id, nama, juz }));
export const JUZ_SURAT_RAPOR = [30, 29, 28, 27, 26];
/** Ejaan lain yang sering ditulis musyrif pada kolom surat setoran. */
export const ALIAS_SURAT: Record<number, string[]> = {
  67: ["tabarak"], 68: ["nun"], 69: ["haqqoh", "haqoh", "haqah"], 71: ["nooh"], 74: ["mudatsir", "mudatsir", "mudasir", "muddassir"], 84: ["insyiqoq", "insiqaq"],
  88: ["ghosiyah", "gosyiah", "ghasiah"], 93: ["duha", "dhuha", "duhaa", "dzuha"], 94: ["alamnasyrah", "nasyrah", "syarh", "insyirah"], 99: ["zalzalah", "zilzal", "zalzala"],
  101: ["qoriah", "qariah"], 102: ["takasur", "takatsur"], 106: ["quraish", "kuraisy"], 107: ["maun"], 111: ["masad", "lahab"], 112: ["ikhlas"], 113: ["falak"], 114: ["nas", "annas"],
  48: ["fatah", "fath"], 58: ["mujadalah", "mujadilah", "mujadala"], 62: ["jumah", "jumuah", "jumuat"], 91: ["syam", "sams"], 97: ["qadar", "qodar", "qodr"], 109: ["khafirun", "kafirun"],
  50: ["qof"], 52: ["tur", "thur"], 55: ["rohman", "rahman"], 56: ["waqiah", "waqiaah", "wakiah"], 61: ["shaf", "saff", "shoff"], 63: ["munafikun", "munafiqun"], 65: ["tolaq", "talak"],
};
const KATA_ABAI = new Set(["al", "an", "at", "ad", "as", "asy", "ash", "az", "ath", "adz", "adh", "ar", "ats", "a", "surah", "surat", "qs", "juz", "ayat"]);
/** Lipat transliterasi agar "Adh-Dhuha", "duha", "dzuha" dianggap sama. */
export function lipat(s: string) {
  let x = s.toLowerCase().replace(/['’‘`ʼʻ]/g, "");
  x = x.replace(/dz/g, "z").replace(/dh/g, "d").replace(/ts/g, "s").replace(/th/g, "t").replace(/sy/g, "s").replace(/sh/g, "s").replace(/kh/g, "h").replace(/gh/g, "g")
    .replace(/q/g, "k").replace(/o/g, "a").replace(/e/g, "i").replace(/iy/g, "i").replace(/y$/g, "i");
  return x.replace(/(.)\1+/g, "$1");
}
const KAMUS_SURAT = (() => {
  const out: { id: number; k: string }[] = [];
  SURAT_RAPOR.forEach((s) => {
    const kata = s.nama.toLowerCase().replace(/['’]/g, "").split(/[^a-z]+/).filter((w) => w && !KATA_ABAI.has(w));
    out.push({ id: s.id, k: lipat(kata.join("")) });
    (ALIAS_SURAT[s.id] || []).forEach((a) => out.push({ id: s.id, k: lipat(a) }));
  });
  return out;
})();
/** Nomor surat (46–114) yang disebut dalam teks setoran, mis. "An-Naba' 1-20", "78:1", "Al-Mulk s.d. Al-Qalam". */
export function suratDariTeks(teks: string): number[] {
  const s = String(teks || "");
  if (!s.trim()) return [];
  const hasil = new Set<number>();
  for (const m of s.matchAll(/\b(\d{1,3})\s*:\s*\d{1,3}/g)) { const n = Number(m[1]); if (n >= 46 && n <= 114) hasil.add(n); }
  const kata = s.toLowerCase().replace(/['’‘`]/g, "").split(/[^a-z]+/).filter(Boolean);
  for (let i = 0; i < kata.length; i++) {
    if (KATA_ABAI.has(kata[i])) continue;
    const calon = [kata[i], kata[i].replace(/^(asy|ash|ath|adz|adh|al|an|at|as|ad|ar|az)/, ""), kata[i] + (kata[i + 1] || "")];
    for (const c of calon) {
      if (!c || c.length < 2) continue;
      const k = lipat(c), hit = KAMUS_SURAT.find((x) => x.k === k);
      if (hit) { hasil.add(hit.id); break; }
    }
  }
  const urut = [...hasil].sort((a, b) => a - b);
  // Rentang "A – B" / "A s.d. B": isi surat di antaranya.
  if (urut.length >= 2 && /[-–—]|s\.?d|sampai|hingga/i.test(s) && urut[urut.length - 1] - urut[0] <= 40)
    return Array.from({ length: urut[urut.length - 1] - urut[0] + 1 }, (_, i) => urut[0] + i);
  return urut;
}
export const IQRO_TOPIK = [
  { id: "huruf", hal: "15", tema: "Huruf Hijaiyah" }, { id: "sambung", hal: "16", tema: "Huruf Sambung" }, { id: "mad_asli", hal: "19", tema: "Mad Asli" },
  { id: "mad_silah", hal: "22", tema: "Mad Silah" }, { id: "mad_lin", hal: "22", tema: "Mad Lin" }, { id: "mim_mati", hal: "27", tema: "Mim Mati dan Lin" },
  { id: "qolqolah", hal: "31", tema: "Qolqolah" }, { id: "ghunnah", hal: "36", tema: "Ghunnah" }, { id: "lafadz_allah", hal: "39", tema: "Lafadz Allah" },
  { id: "idghom", hal: "44", tema: "Idghom" }, { id: "ikhfa", hal: "49", tema: "Ikhfa" }, { id: "tes_akhir", hal: "54", tema: "Tes Akhir" },
];
export const TEMPLAT_RAPOR = [
  { id: "7-10", label: "Kelas 7 & 10", info: "Nilai per surat Juz 30–26, perempat juz, dan Iqro'" },
  { id: "8-11", label: "Kelas 8 & 11", info: "Nilai per surat Juz 30–26 dan perempat juz" },
  { id: "9-12", label: "Kelas 9 & 12", info: "Sertifikasi per ½ juz (Juz 1–30)" },
  { id: "7juz", label: "7 juz ke atas", info: "Blok perempat juz untuk seluruh juz yang dihafal" },
];
export function templatOtomatis(tingkat: any, juz: number) {
  if (juz >= 7) return "7juz";
  const t = Number(tingkat);
  return t === 7 || t === 10 ? "7-10" : t === 8 || t === 11 ? "8-11" : t === 9 || t === 12 ? "9-12" : "8-11";
}
export const romawi = (t: any) => (({ 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII" } as any)[Number(t)] || String(t || ""));
/** Target rapor (arahan pengelola 2026/2027): reguler 1 juz/semester, 2 juz/tahun; PK/Tahfidz 2 juz/semester, 4 juz/tahun.
 *  Semester 1 kelas 7/10: lulus Iqro/Tahsin + tuntas Juz 30 (reguler) atau 2 juz (PK). Semester ke-6: fokus sertifikasi. */
export function targetRapor(s: any, semKe: number) {
  const pk = isTahfidz(s), sem = pk ? 2 : 1, tahun = pk ? 4 : 2;
  if (semKe === 6) return { semester: 0, tahunan: tahun, iqro: false, label: "Fokus sertifikasi hafalan" };
  return { semester: sem, tahunan: tahun, iqro: semKe === 1, label: semKe === 1 ? `Lulus Iqro/Tahsin dan ${pk ? "2 juz" : "tuntas Juz 30"}` : `${sem} juz` };
}

/* ---------- Rapor satu lembar: enam aspek, termasuk murajaah ---------- */
export const ASPEK_RAPOR = [
  { key: "makhraj", label: "Makhraj huruf" },
  { key: "tajwid", label: "Hukum tajwid" },
  { key: "tahfidz", label: "Tahfidz / hafalan" },
  { key: "murajaah", label: "Murajaah" },
  { key: "kehadiran", label: "Kehadiran & kedisiplinan" },
  { key: "perkembangan", label: "Perkembangan" },
] as const;
/** Keterangan singkat untuk rapor cetak (satu baris per aspek). */
export const INDIKATOR_SINGKAT: Record<string, Record<string, string>> = {
  makhraj: { A: "Makhraj tepat; huruf serupa terbedakan", "B+": "Hampir tepat; beberapa huruf masih tertukar", B: "Huruf serupa tertukar; perlu penguatan", C: "Makhraj perlu bimbingan khusus" },
  tajwid: { A: "Tajwid benar dan konsisten", "B+": "Kesalahan ringan ikhfa', idgham, atau mad", B: "Mad/dengung belum stabil; perlu latihan", C: "Perlu pembinaan tajwid dasar" },
  tahfidz: { "A+": "Hafalan melampaui target semester", A: "Hafalan memenuhi target semester", "B+": "Hafalan mendekati target semester", B: "Hafalan bertambah, belum sesuai target", C: "Capaian hafalan perlu ditingkatkan" },
  murajaah: { A: "Murajaah sangat baik dan konsisten", "B+": "Murajaah baik; jaga konsistensi", B: "Murajaah cukup; perlu penguatan", C: "Murajaah perlu pembinaan intensif" },
  kehadiran: { A: "Disiplin, setoran teratur, adab sangat baik", "B+": "Disiplin baik; sesekali perlu diingatkan", B: "Kedisiplinan setoran belum stabil", C: "Perlu pendampingan disiplin halaqah" },
  perkembangan: { A: "Kemajuan konsisten dan signifikan", "B+": "Perkembangan cukup stabil", B: "Kemajuan masih lambat atau belum stabil", C: "Perkembangan minimal; perlu pembinaan" },
};
/** Predikat murajaah dari rerata nilai murajaah setoran: A ≥90 · B+ 80–89 · B 70–79 · C <70 (sama dengan konversi nilai setoran). */
export const BATAS_MURAJAAH = [{ min: 90, p: "A" }, { min: 80, p: "B+" }, { min: 70, p: "B" }, { min: 0, p: "C" }];
export const predikatMurajaah = (rata: number | null) => (rata == null || !isFinite(rata) ? "" : BATAS_MURAJAAH.find((b) => rata >= b.min)!.p);
/** Baris → halaman dibulatkan (15 baris = 1 halaman). */
export const halamanBulat = (baris: number) => Math.round((Number(baris) || 0) / 15);

/** Catatan pembinaan otomatis, paling banyak empat kalimat singkat (tanpa AI). */
export function narasiCatatan(p: Record<string, string>, _gender = "", info: { ziyadah_hal?: number; target_juz?: number; murajaah_rata?: number | null; murajaah_n?: number; ujian?: number | null } = {}) {
  const r = (x: string) => predikatRank(x || "");
  const ada = ["makhraj", "tajwid", "tahfidz", "murajaah", "kehadiran", "perkembangan"].map((k) => r(p[k])).filter((x) => x > 0);
  if (!ada.length) return "";
  const rata = ada.reduce((a, b) => a + b, 0) / ada.length;
  const k1 = info.ziyadah_hal != null && info.ziyadah_hal > 0
    ? `Hafalan bertambah ${String(info.ziyadah_hal).replace(".", ",")} halaman${info.target_juz ? ` (target semester ${info.target_juz} juz)` : ""}${r(p.kehadiran) >= 4 ? "; disiplin halaqah sangat baik" : ""}.`
    : rata >= 3.6 ? "Ananda menunjukkan perkembangan sangat baik dalam bacaan dan hafalan Al-Qur'an." : rata >= 2.6 ? "Ananda menunjukkan perkembangan yang baik dalam bacaan dan hafalan Al-Qur'an." : "Ananda masih memerlukan bimbingan dalam bacaan dan hafalan Al-Qur'an.";
  const lemah = (["makhraj", "tajwid"] as const).filter((k) => p[k] && r(p[k]) <= 3);
  const k2 = lemah.length ? `Perlu memperkuat ${lemah.map((k) => (k === "makhraj" ? "ketepatan makhraj huruf serupa" : "ketelitian hukum tajwid")).join(" dan ")}.` : "Kualitas makhraj dan tajwid sudah baik; pertahankan dengan latihan rutin.";
  const k3 = p.murajaah ? `Murajaah ${p.murajaah}${info.murajaah_rata != null ? ` (rerata ${String(info.murajaah_rata).replace(".", ",")} dari ${info.murajaah_n || 0} penilaian)` : ""}; ${r(p.murajaah) <= 2 ? "tingkatkan pengulangan hafalan secara rutin" : "jaga pengulangan hafalan secara rutin"}.` : "Murajaah perlu lebih rutin dicatat agar kekuatan hafalan terpantau.";
  const k4 = info.ujian != null ? (info.ujian >= KKM ? "Ujian semester lulus KKM; lanjutkan ke target berikutnya." : "Ujian semester belum mencapai KKM; perlu remedial dan pendampingan.") : rata >= 3.6 ? "Semester depan disarankan meningkatkan target hafalan dengan tetap menjaga kualitas bacaan." : "Semester depan disarankan fokus pada tajwid dan murajaah hafalan secara rutin.";
  return [k1, k2, k3, k4].join(" ");
}
export const BULAN_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const tanggalPanjang = (iso: string) => { const [y, m, d] = String(iso || "").split("-").map(Number); return y && m && d ? `${d} ${BULAN_ID[m - 1]} ${y}` : ""; };
export const KEPALA_KEPESANTRENAN = { nama: "Abdul Fattah Ismail Farros, Lc., M.IRKH", jabatan: "Kepala Bidang Kepesantrenan" };
