// Materi & rubrik Ujian Praktik Ibadah — sesuai "Spesifikasi Sistem Penilaian Ujian Praktik Ibadah" (final).
// Dipakai bersama oleh aplikasi Ujian Praktik, Edge Function ujian-praktik, dan Rapor Pesantren.
export type Aspek = { label: string; max: number };
export type Rubrik = { key: string; nama: string; ar: string; jenis: 'praktik' | 'lisan'; aspek: Aspek[]; catatan?: string };
const bersuci: Aspek[] = [
  { label: 'Niat dalam bahasa Arab atau Indonesia', max: 10 },
  { label: 'Melaksanakan rukun dengan sempurna', max: 50 },
  { label: 'Memperbanyak sunnah', max: 20 },
  { label: 'Tertib', max: 10 },
  { label: 'Khusyuk dan menjaga sikap', max: 10 },
];
const lisan: Aspek[] = [
  { label: 'Jawaban pertanyaan pertama', max: 30 },
  { label: 'Jawaban pertanyaan kedua', max: 30 },
  { label: 'Jawaban pertanyaan ketiga', max: 30 },
  { label: 'Adab dan kelancaran menjawab', max: 10 },
];
export const RUBRIK: Record<string, Rubrik> = {
  wudhu: { key: 'wudhu', nama: 'Wudhu', ar: 'الوضوء', jenis: 'praktik', aspek: bersuci },
  tayamum: { key: 'tayamum', nama: 'Tayamum', ar: 'التيمم', jenis: 'praktik', aspek: bersuci },
  mandi: { key: 'mandi', nama: 'Mandi', ar: 'الغسل', jenis: 'praktik', aspek: [
    { label: 'Niat dalam bahasa Arab atau Indonesia', max: 20 },
    { label: 'Melaksanakan tata cara mandi sesuai tuntunan Nabi', max: 60 },
    { label: 'Khusyuk dan menjaga sikap', max: 20 },
  ] },
  jenazah: { key: 'jenazah', nama: 'Salat Jenazah', ar: 'صلاة الجنازة', jenis: 'praktik', aspek: [
    { label: 'Niat dalam bahasa Arab atau Indonesia', max: 20 },
    { label: 'Melaksanakan rukun dan bacaan dengan sempurna', max: 60 },
    { label: 'Tertib', max: 10 },
    { label: 'Khusyuk dan menjaga sikap', max: 10 },
  ] },
  // Kelas 8 Putra (tambahan 27 Nov 2026): rubrik tersendiri agar nilai Salat Jenazah kelas 11 yang sudah ada tidak berubah.
  jenazah8: { key: 'jenazah8', nama: 'Salat Jenazah', ar: 'صلاة الجنازة', jenis: 'praktik', aspek: [
    { label: 'Niat (bahasa Arab atau Indonesia)', max: 10 },
    { label: 'Empat kali takbir', max: 10 },
    { label: 'Membaca doa/bacaan setelah takbir dengan sempurna', max: 60 },
    { label: 'Tertib', max: 10 },
    { label: 'Khusyuk / tidak cengengesan', max: 10 },
  ] },
  azan: { key: 'azan', nama: 'Azan dan Iqamah', ar: 'الأذان والإقامة', jenis: 'praktik', aspek: [
    { label: 'Melaksanakan rukun dan bacaan dengan sempurna', max: 50 },
    { label: 'Memperbanyak sunnah', max: 20 },
    { label: 'Khusyuk dan menjaga sikap', max: 15 },
    { label: 'Membaca doa setelah azan', max: 15 },
  ] },
  haji: { key: 'haji', nama: 'Haji', ar: 'مناسك الحج', jenis: 'praktik', aspek: [
    { label: 'Niat dalam bahasa Arab atau Indonesia', max: 10 },
    { label: 'Melaksanakan manasik haji secara berurutan', max: 50 },
    { label: 'Melaksanakan rukun dengan sempurna', max: 20 },
    { label: 'Khusyuk dan menjaga sikap', max: 20 },
  ] },
  lisan: { key: 'lisan', nama: 'Ujian Lisan', ar: 'الاختبار الشفهي', jenis: 'lisan', aspek: lisan, catatan: 'Tiga pertanyaan sesuai materi yang dipraktikkan.' },
  lisan_fp: { key: 'lisan_fp', nama: 'Lisan Fikih Perempuan', ar: 'الاختبار الشفهي في فقه النساء', jenis: 'lisan', aspek: lisan, catatan: 'Tiga pertanyaan seputar fikih perempuan.' },
  matsurat: { key: 'matsurat', nama: 'Al-Matsurat', ar: 'المأثورات', jenis: 'lisan', catatan: 'Pengganti ujian lisan. Penguji membacakan potongan bacaan; santri melanjutkan (tiga potongan acak).', aspek: [
    { label: 'Melanjutkan bacaan pada pertanyaan acak pertama', max: 30 },
    { label: 'Melanjutkan bacaan pada pertanyaan acak kedua', max: 30 },
    { label: 'Melanjutkan bacaan pada pertanyaan acak ketiga', max: 30 },
    { label: 'Kelancaran dan adab', max: 10 },
  ] },
  doa: { key: 'doa', nama: 'Doa Ba’da Salat', ar: 'الدعاء بعد الصلاة', jenis: 'lisan', catatan: 'Pengganti ujian lisan.', aspek: [
    { label: 'Rukun doa: hamdalah, salawat, dan doa', max: 30 },
    { label: 'Isi doa', max: 50 },
    { label: 'Adab dan kelancaran', max: 20 },
  ] },
};
export const RUBRIK_KEYS = Object.keys(RUBRIK);

// Materi semester I per tingkat & jenis kelamin (tabel "Materi Ujian Praktik Fikih").
export const MATERI_DEFAULT: Record<string, string[]> = {
  '7-putra': ['wudhu', 'tayamum', 'lisan'], '7-putri': ['wudhu', 'tayamum', 'lisan'],
  '8-putra': ['azan', 'jenazah8', 'lisan'], '8-putri': ['mandi', 'lisan_fp'],
  '9-putra': ['haji', 'matsurat'], '9-putri': ['haji', 'matsurat'],
  '10-putra': ['wudhu', 'tayamum', 'mandi', 'lisan'], '10-putri': ['wudhu', 'tayamum', 'mandi', 'lisan'],
  '11-putra': ['azan', 'jenazah', 'lisan'], '11-putri': ['jenazah', 'lisan_fp'],
  '12-putra': ['haji', 'doa'], '12-putri': ['haji', 'doa'],
};
export const GRUP = Object.keys(MATERI_DEFAULT);

export const genderOf = (unit: string) => (/\b(ikhwan|putra)\b/i.test(unit) ? 'putra' : /\b(akhwat|putri)\b/i.test(unit) ? 'putri' : '');
export function grupOf(unit: string, tingkat: string): string | null {
  const g = genderOf(unit); const t = String(tingkat || '').trim().toUpperCase().replace(/^(KELAS|TINGKAT)\s+/, '');
  const rom: Record<string, number> = { VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
  const k = `${rom[t] || Number(t)}-${g}`;
  return MATERI_DEFAULT[k] ? k : null;
}
export const materiOf = (materi: Record<string, string[]> | null | undefined, grup: string | null) => (grup ? (materi?.[grup]?.length ? materi[grup] : MATERI_DEFAULT[grup]) || [] : []);
export const unitLabel = (unit: string) => String(unit || '').replace(/\bIkhwan\b/i, 'Putra').replace(/\bAkhwat\b/i, 'Putri');

// Jumlahkan poin aspek (tiap aspek dibatasi poin maksimal); null bila belum ada satu pun aspek terisi.
export function totalSkor(key: string, poin: (number | null | undefined)[] | null | undefined): number | null {
  const r = RUBRIK[key]; if (!r || !Array.isArray(poin)) return null;
  let ada = false, n = 0;
  r.aspek.forEach((a, i) => { const v = poin[i]; if (typeof v === 'number' && Number.isFinite(v)) { ada = true; n += Math.min(Math.max(v, 0), a.max); } });
  return ada ? Math.round(n * 100) / 100 : null;
}
export const lengkap = (key: string, poin: any) => Array.isArray(poin) && RUBRIK[key]?.aspek.every((_, i) => typeof poin[i] === 'number');
