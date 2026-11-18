// Butir rapor pesantren sesuai Panduan Aplikasi Kepesantrenan & format "Rapor Santri" (Pembaharuan Raport).
export type Item = { k: string; id: string; ar: string };
export type Jenis = 'huruf' | 'angka';
export type Bagian = { key: string; kode: string; judul: string; ar: string; jenis: Jenis | 'hadis'; skala: string };

export const BAGIAN: Bagian[] = [
  { key: 'ibadah', kode: 'A', judul: 'Ibadah', ar: 'العبادات', jenis: 'huruf', skala: 'A–D' },
  { key: 'akhlak', kode: 'B', judul: 'Akhlak', ar: 'الأخلاق', jenis: 'huruf', skala: 'A–D' },
  { key: 'kitab', kode: 'C', judul: 'Kajian Kitab', ar: 'دراسة الكتب', jenis: 'angka', skala: '1–100' },
  { key: 'praktik', kode: 'D', judul: 'Praktik Ibadah', ar: 'التطبيق العملي للعبادات', jenis: 'angka', skala: '1–100' },
  { key: 'hadis', kode: 'E', judul: 'Hadis Arbain Nawawi', ar: 'الأحاديث الأربعون النووية', jenis: 'hadis', skala: 'hafalan' },
  { key: 'pidato', kode: 'F', judul: 'Pidato', ar: 'الخطابة', jenis: 'angka', skala: '1–100' },
];

export const IBADAH: Item[] = [
  { k: 'jamaah', id: 'Sholat Berjamaah', ar: 'صلاة الجماعة' },
  { k: 'qiyam', id: 'Qiyamul Lail', ar: 'قيام الليل' },
  { k: 'dhuha', id: 'Salat Dhuha', ar: 'صلاة الضحى' },
  { k: 'rawatib', id: 'Sunnah Rawatib', ar: 'السنن الرواتب' },
  { k: 'dzikir', id: "Dzikr Ba'da Sholat", ar: 'الأذكار بعد الصلاة' },
  { k: 'matsurat', id: 'Dzikr Ma’tsurat', ar: 'الأذكار المأثورة' },
  { k: 'tilawah', id: 'Tilawah', ar: 'تلاوة القرآن' },
  { k: 'puasa', id: 'Puasa Sunnah', ar: 'صيام التطوع' },
];
export const AKHLAK: Item[] = [
  { k: 'pergaulan', id: 'Adab Pergaulan', ar: 'آداب المعاشرة' },
  { k: 'lisan', id: 'Adab Lisan', ar: 'آداب اللسان' },
  { k: 'bersih', id: 'Kebersihan dan Kerapian', ar: 'النظافة والترتيب' },
  { k: 'disiplin', id: 'Ketertiban dan Kedisiplinan', ar: 'النظام والانضباط' },
  { k: 'mandiri', id: 'Kemandirian', ar: 'الاعتماد على النفس' },
];
export const KITAB: Record<string, Item> = {
  tajwid: { k: 'tajwid', id: 'Ilmu Tajwid', ar: 'علم التجويد' },
  safinah: { k: 'safinah', id: 'Safinah An-Najah', ar: 'سفينة النجاة' },
  taisir: { k: 'taisir', id: 'Taisir Al-Khallaq', ar: 'تيسير الخلاق' },
  mabadi: { k: 'mabadi', id: 'Al-Mabadi Al-Fiqhiyyah', ar: 'المبادئ الفقهية' },
  yaqut: { k: 'yaqut', id: 'Al-Yaqut An-Nafis', ar: 'الياقوت النفيس' },
  ayyuhal: { k: 'ayyuhal', id: 'Ayyuhal Walad', ar: 'أيها الولد' },
  tafsir: { k: 'tafsir', id: 'Tafsir Al-Qur’an', ar: 'تفسير القرآن' },
  tuhfah: { k: 'tuhfah', id: 'Tuhfatul Athfal', ar: 'تحفة الأطفال' },
};
export const PIDATO: Item[] = [
  { k: 'arab', id: 'Bahasa Arab', ar: 'الخطابة باللغة العربية' },
  { k: 'inggris', id: 'Bahasa Inggris', ar: 'الخطابة باللغة الإنجليزية' },
];

// Kitab yang diujikan per jenjang & kelas.
export const KITAB_KELAS: Record<string, string[]> = {
  'SMP-7': ['tajwid', 'safinah'], 'SMP-8': ['safinah', 'taisir'], 'SMP-9': ['mabadi', 'taisir'],
  'SMA-10': ['tajwid', 'yaqut'], 'SMA-11': ['yaqut', 'ayyuhal'], 'SMA-12': ['yaqut', 'ayyuhal'],
  'MA-10': ['tajwid', 'yaqut', 'tafsir'], 'MA-11': ['yaqut', 'ayyuhal', 'tafsir'], 'MA-12': ['yaqut', 'ayyuhal', 'tafsir'],
};

// Materi Ujian Praktik Ibadah semester I per kelas & lingkungan (sama dengan aplikasi Ujian Praktik).
const L = { id: 'Ujian Lisan', ar: 'الاختبار الشفهي' };
const DARAH = { id: 'Lisan Fikih Darah', ar: 'الاختبار الشفهي في فقه الدماء' };
const HAJI = { id: 'Praktik Manasik Haji', ar: 'تطبيق مناسك الحج' };
export const PRAKTIK_KELAS: Record<string, { praktik: { id: string; ar: string }; lisan: { id: string; ar: string } }> = {
  '7-putra': { praktik: { id: 'Praktik Wudhu dan Tayamum', ar: 'تطبيق الوضوء والتيمم' }, lisan: L },
  '7-putri': { praktik: { id: 'Praktik Wudhu dan Tayamum', ar: 'تطبيق الوضوء والتيمم' }, lisan: L },
  '8-putra': { praktik: { id: 'Praktik Azan dan Iqamah', ar: 'تطبيق الأذان والإقامة' }, lisan: L },
  '8-putri': { praktik: { id: 'Praktik Mandi Wajib', ar: 'تطبيق الغسل' }, lisan: DARAH },
  '9-putra': { praktik: HAJI, lisan: { id: 'Hafalan Al-Ma’tsurat', ar: 'حفظ المأثورات' } },
  '9-putri': { praktik: HAJI, lisan: { id: 'Hafalan Al-Ma’tsurat', ar: 'حفظ المأثورات' } },
  '10-putra': { praktik: { id: 'Praktik Wudhu, Tayamum, dan Mandi', ar: 'تطبيق الوضوء والتيمم والغسل' }, lisan: L },
  '10-putri': { praktik: { id: 'Praktik Wudhu, Tayamum, dan Mandi', ar: 'تطبيق الوضوء والتيمم والغسل' }, lisan: L },
  '11-putra': { praktik: { id: 'Praktik Azan dan Salat Jenazah', ar: 'تطبيق الأذان وصلاة الجنازة' }, lisan: L },
  '11-putri': { praktik: { id: 'Praktik Salat Jenazah', ar: 'تطبيق صلاة الجنازة' }, lisan: DARAH },
  '12-putra': { praktik: HAJI, lisan: { id: 'Doa Ba’da Salat', ar: 'الدعاء بعد الصلاة' } },
  '12-putri': { praktik: HAJI, lisan: { id: 'Doa Ba’da Salat', ar: 'الدعاء بعد الصلاة' } },
};

export type Santri = { id: string; nama: string; unit: string; tingkat: string; halaqah?: string; wali_nama?: string };
export const jenjang = (s: Santri) => (s.unit || '').trim().split(/\s+/)[0].toUpperCase();
export const gender = (s: Santri) => (/ikhwan|putra/i.test(s.unit) ? 'putra' : 'putri');

export function itemsFor(bagian: string, s: Santri, kur: any = {}): Item[] {
  if (bagian === 'ibadah') return IBADAH;
  if (bagian === 'akhlak') return AKHLAK;
  if (bagian === 'pidato') return PIDATO;
  if (bagian === 'kitab') {
    const keys: string[] = kur?.kitab?.[`${jenjang(s)}-${s.tingkat}`] || KITAB_KELAS[`${jenjang(s)}-${s.tingkat}`] || [];
    return keys.map((k) => KITAB[k]).filter(Boolean);
  }
  if (bagian === 'praktik') {
    const p = { ...PRAKTIK_KELAS[`${s.tingkat}-${gender(s)}`], ...(kur?.praktik?.[`${s.tingkat}-${gender(s)}`] || {}) };
    if (!p.praktik) return [];
    return [{ k: 'praktik', ...p.praktik }, { k: 'lisan', ...p.lisan }];
  }
  return [];
}

// Standar sama dengan Mutabaah Tahfidz: KKM 75; predikat angka A ≥90, B ≥80, C ≥70, D <70.
export const predikatAngka = (n: number | null | undefined) => (n == null || isNaN(n as number) ? '' : n >= 90 ? 'A' : n >= 80 ? 'B' : n >= 70 ? 'C' : 'D');
export const makna: Record<string, string> = { A: 'Sangat baik', B: 'Baik', C: 'Cukup', D: 'Perlu bimbingan' };
export const hurufDariSkor = (skor: number) => predikatAngka(skor);
