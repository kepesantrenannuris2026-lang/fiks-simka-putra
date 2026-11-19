// Skala nilai bersama ekosistem Nuris (sama dengan Mutabaah Tahfidz & Spesifikasi Ujian Praktik Ibadah):
// A 90–100, B+ 80–89, B 70–79, C < 70.
export const HURUF = ['A', 'B+', 'B', 'C'] as const;
export type Huruf = (typeof HURUF)[number];
export const huruf = (n: number | null | undefined): Huruf | '' => (n == null || !Number.isFinite(Number(n)) ? '' : n >= 90 ? 'A' : n >= 80 ? 'B+' : n >= 70 ? 'B' : 'C');
export const MAKNA: Record<string, string> = { A: 'Sangat baik', 'B+': 'Baik', B: 'Cukup', C: 'Perlu pembinaan' };
export const normHuruf = (v: unknown): Huruf | '' => {
  const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, '').replace(/^B\+$|^BPLUS$/, 'B+');
  return (HURUF as readonly string[]).includes(s) ? (s as Huruf) : '';
};
// Panduan Penilaian Akhlak: skor indikator 1–4, rerata aspek → predikat.
export const hurufAkhlak = (avg: number | null) => (avg == null ? '' : avg >= 3.5 ? 'A' : avg >= 2.75 ? 'B+' : avg >= 2 ? 'B' : 'C');
export const RUBRIK_AKHLAK = [
  { skor: 4, huruf: 'A', label: 'Sangat Baik', rentang: '3,50 – 4,00', pedoman: 'Perilaku tampak konsisten dan umumnya dilakukan atas kesadaran sendiri.' },
  { skor: 3, huruf: 'B+', label: 'Baik', rentang: '2,75 – 3,49', pedoman: 'Perilaku umumnya tampak. Santri sesekali perlu diingatkan dan segera mengikuti arahan.' },
  { skor: 2, huruf: 'B', label: 'Cukup', rentang: '2,00 – 2,74', pedoman: 'Perilaku mulai tampak. Santri masih sering memerlukan pengingat atau pendampingan.' },
  { skor: 1, huruf: 'C', label: 'Perlu Pembinaan', rentang: '1,00 – 1,99', pedoman: 'Perilaku yang diharapkan jarang tampak atau terjadi pelanggaran berulang meski sudah dibina.' },
] as const;
