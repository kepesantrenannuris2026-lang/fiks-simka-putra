// Butir rapor pesantren sesuai Panduan Aplikasi Kepesantrenan & format "Rapor Santri" (Pembaharuan Raport).
import { huruf, MAKNA } from '../../shared/skala';
import { RUBRIK, materiOf, grupOf } from '../../ujian-praktik/src/materi';
export type Item = { k: string; id: string; ar: string };
export type Jenis = 'huruf' | 'angka';
export type Bagian = { key: string; kode: string; judul: string; ar: string; jenis: Jenis | 'hadis'; skala: string };

export const BAGIAN: Bagian[] = [
  { key: 'ibadah', kode: 'A', judul: 'Ibadah', ar: 'العبادات', jenis: 'huruf', skala: 'A, B+, B, C' },
  { key: 'akhlak', kode: 'B', judul: 'Akhlak', ar: 'الأخلاق', jenis: 'huruf', skala: 'A, B+, B, C' },
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
// Panduan Penilaian Akhlak Santri: 5 aspek × 4 indikator, skor 1–4.
export const INDIKATOR_AKHLAK: Record<string, string[]> = {
  pergaulan: [
    'Menghormati guru, musyrif, dan orang yang lebih tua serta bersikap ramah dan peduli kepada teman dan santri yang lebih muda.',
    'Menjaga keamanan teman dengan menghindari perundungan, intimidasi, pemaksaan, dan tindakan fisik yang menyakiti.',
    'Menghargai ruang pribadi teman, meminta izin sebelum meminjam, dan mengembalikan barang pinjaman.',
    'Bekerja sama, menyelesaikan perselisihan dengan baik, dan meminta bantuan pembina bila diperlukan.',
  ],
  lisan: [
    'Mengucapkan dan menjawab salam serta bertutur sopan kepada guru, musyrif, dan teman.',
    'Menjaga ucapan dari berkata kasar, berkata buruk, ejekan, atau julukan yang tidak disukai teman.',
    'Berkata jujur dan menjaga diri dari menyebarkan aib atau kabar yang belum jelas.',
    'Menyampaikan pendapat atau keluhan dengan santun dan mendengarkan orang lain.',
  ],
  bersih: [
    'Menjaga kebersihan diri dan pakaian serta berpenampilan rapi sesuai aturan pesantren.',
    'Menata tempat tidur, lemari, sepatu, handuk, dan perlengkapan pribadi pada tempatnya.',
    'Membersihkan alat makan, membuang sampah pada tempatnya, dan menjaga fasilitas bersama.',
    'Menuntaskan piket sesuai jadwal dan menerapkan 5R (Ringkas, Rapi, Resik, Rawat, Rajin).',
  ],
  disiplin: [
    'Hadir tepat waktu dan mengikuti kegiatan wajib, seperti salat berjamaah dan kajian.',
    'Menjaga ketertiban saat antre, mengikuti kegiatan, dan menggunakan fasilitas bersama.',
    'Mematuhi aturan keluar-masuk asrama, waktu istirahat, dan penggunaan barang atau fasilitas.',
    'Mengikuti prosedur perizinan ketika berhalangan dan menindaklanjuti arahan pembina.',
  ],
  mandiri: [
    'Menyiapkan pakaian, perlengkapan ibadah, dan kebutuhan belajar sesuai tanggung jawabnya.',
    'Mengatur waktu belajar, ibadah, istirahat, dan tugas pribadi dengan semakin sedikit pengingat.',
    'Menyelesaikan tugas pribadi dan merawat perlengkapan milik sendiri.',
    'Mencoba mengatasi kendala sesuai kemampuan dan meminta bantuan bila diperlukan.',
  ],
};
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
// SMP & SMA Putri: satu nilai pidato (tanpa pembagian Arab/Inggris). MA Putri tetap dua nilai.
export const PIDATO_TUNGGAL: Item = { k: 'pidato', id: 'Pidato', ar: 'الخطابة' };

// Kitab yang diujikan per jenjang & kelas.
export const KITAB_KELAS: Record<string, string[]> = {
  'SMP-7': ['tajwid', 'safinah'], 'SMP-8': ['safinah', 'taisir'], 'SMP-9': ['mabadi', 'taisir'],
  'SMA-10': ['tajwid', 'yaqut'], 'SMA-11': ['yaqut', 'ayyuhal'], 'SMA-12': ['yaqut', 'ayyuhal'],
  'MA-10': ['tajwid', 'yaqut', 'tafsir'], 'MA-11': ['yaqut', 'ayyuhal', 'tafsir'], 'MA-12': ['yaqut', 'ayyuhal', 'tafsir'],
};

// Materi Ujian Praktik Ibadah: satu baris per subujian (praktik & lisan dinilai terpisah), sesuai aplikasi Ujian Praktik.
export type Santri = { id: string; nama: string; unit: string; tingkat: string; halaqah?: string; wali_nama?: string };
export const jenjang = (s: Santri) => (s.unit || '').trim().split(/\s+/)[0].toUpperCase();
export const gender = (s: Santri) => (/ikhwan|putra/i.test(s.unit) ? 'putra' : 'putri');

export function itemsFor(bagian: string, s: Santri, kur: any = {}): Item[] {
  if (bagian === 'ibadah') return IBADAH;
  if (bagian === 'akhlak') return AKHLAK;
  if (bagian === 'pidato') {
    // Putri: kelas 12 (semua jenjang) tidak ada penilaian pidato; SMP & SMA satu nilai; MA dua nilai (Arab & Inggris).
    if (gender(s) === 'putri') { if (String(s.tingkat) === '12') return []; if (jenjang(s) === 'SMP' || jenjang(s) === 'SMA') return [PIDATO_TUNGGAL]; }
    return PIDATO;
  }
  if (bagian === 'kitab') {
    const keys: string[] = kur?.kitab?.[`${jenjang(s)}-${s.tingkat}`] || KITAB_KELAS[`${jenjang(s)}-${s.tingkat}`] || [];
    return keys.map((k) => KITAB[k]).filter(Boolean);
  }
  if (bagian === 'praktik') {
    return materiOf(kur?.materi_praktik, grupOf(s.unit, s.tingkat)).map((k) => RUBRIK[k]).filter(Boolean)
      .map((r) => ({ k: r.key, id: r.jenis === 'praktik' ? `Praktik ${r.nama}` : r.nama, ar: r.jenis === 'praktik' ? `تطبيق ${r.ar.replace(/^ال/, 'ال')}` : r.ar }));
  }
  return [];
}

// Standar sama dengan Mutabaah Tahfidz & Ujian Praktik: KKM 75; A 90–100, B+ 80–89, B 70–79, C < 70.
export const predikatAngka = huruf;
export const makna = MAKNA;
export const hurufDariSkor = (skor: number) => predikatAngka(skor);
