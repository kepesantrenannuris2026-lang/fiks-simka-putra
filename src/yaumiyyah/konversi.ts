// Konversi isian HARIAN lama → isian BULANAN baru (sekali jalan, 22 Nov 2026).
// Nilai capaian tiap ibadah dari hari-hari yang terisi (aturan lama) dipertahankan, lalu diubah ke jumlah sebulan:
// jumlah = nilai% × target bulanan. Contoh: berjamaah 5/hari terisi → 5 × 30 = 150; qiyam tercapai → 2 × 4 pekan = 8.
import * as harian from './model-harian';
import { activities, monthTarget, MonthEntry } from './model';
export function konversiBulan(month: string, entries: harian.Entry[]): MonthEntry | null {
  const own = entries.filter((e) => e.date.startsWith(month));
  if (!own.length) return null;
  const rep = harian.monthlyReport(month, own, '9999-12-31');
  const values: Record<string, number | null> = {};
  for (const a of activities) {
    const r = rep.rows.find((x) => x.id === a.id);
    values[a.id] = r && r.score != null ? Math.round((r.score / 100) * monthTarget(a, month, 0)) : null;
  }
  const tanggal = own.map((e) => e.date).sort();
  const catatan = own.filter((e) => e.note).map((e) => `${e.date}: ${e.note}`);
  return { month, values, izin: 0, note: [`Dikonversi dari isian harian (${own.length} hari: ${tanggal[0]}${tanggal.length > 1 ? ' s.d. ' + tanggal.at(-1) : ''}).`, ...catatan].join('\n').slice(0, 2000) };
}
