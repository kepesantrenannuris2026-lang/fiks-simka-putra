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
// Panduan Penilaian Akhlak (revisi Nov 2026): skor indikator 1–4; keempat indikator wajib diberi skor,
// JUMLAH skor satu aspek (4–16) dikonversi: 14–16 A, 11–13 B+, 8–10 B, 4–7 C (setara rerata 3,50 / 2,75 / 2,00).
export const hurufAkhlakJumlah = (jml: number | null) => (jml == null ? '' : jml >= 14 ? 'A' : jml >= 11 ? 'B+' : jml >= 8 ? 'B' : 'C');
export const RUBRIK_AKHLAK = [
  { skor: 4, huruf: 'A', label: 'Sangat Baik', jumlah: '14 – 16', pedoman: 'Perilaku tampak konsisten dan umumnya dilakukan atas kesadaran sendiri.' },
  { skor: 3, huruf: 'B+', label: 'Baik', jumlah: '11 – 13', pedoman: 'Perilaku umumnya tampak. Santri sesekali perlu diingatkan dan segera mengikuti arahan.' },
  { skor: 2, huruf: 'B', label: 'Cukup', jumlah: '8 – 10', pedoman: 'Perilaku mulai tampak. Santri masih sering harus diingatkan atau didampingi.' },
  { skor: 1, huruf: 'C', label: 'Perlu Pembinaan', jumlah: '4 – 7', pedoman: 'Perilaku yang diharapkan jarang tampak atau masih terjadi kejadian berulang meski sudah diingatkan.' },
] as const;
