// Mutabaah Yaumiyyah — model BULANAN (berlaku mulai 22 Nov 2026).
// 8 ibadah sama persis dengan aspek Ibadah di Rapor Pesantren. Isian = jumlah pelaksanaan dalam satu bulan.
// Target bulanan:  harian × hari di pondok · pekanan × jumlah pekan penuh (⌊hari/7⌋, umumnya 4) · bulanan apa adanya.
// Predikat memakai skala bersama rapor: A ≥ 90 · B+ 80–89 · B 70–79 · C < 70 (persentase capaian target).
// Model harian lama disimpan di model-harian.ts (dipakai hanya untuk konversi data lama).
export type Per = 'day' | 'week' | 'month';
export const activities = [
  { id: 'jamaah', rapor: 'jamaah', name: 'Sholat Berjamaah', detail: 'Shalat 5 waktu berjamaah (tidak masbuk)', target: 5, per: 'day', unit: 'kali', maxDay: 5 },
  { id: 'qiyam', rapor: 'qiyam', name: 'Qiyamul Lail', detail: 'Shalat tahajjud/qiyamullail', target: 2, per: 'week', unit: 'kali', maxDay: 1 },
  { id: 'dhuha', rapor: 'dhuha', name: 'Salat Dhuha', detail: 'Shalat Dhuha', target: 4, per: 'week', unit: 'kali', maxDay: 1 },
  { id: 'rawatib', rapor: 'rawatib', name: 'Sunnah Rawatib', detail: 'Shalat sunnah rawatib', target: 4, per: 'day', unit: 'kali', maxDay: 5 },
  { id: 'dzikir', rapor: 'dzikir', name: "Dzikr Ba'da Sholat", detail: 'Dzikir setelah shalat fardhu', target: 5, per: 'day', unit: 'kali', maxDay: 5 },
  { id: 'matsurat', rapor: 'matsurat', name: 'Dzikr Ma’tsurat', detail: 'Al-Ma’tsurat pagi dan petang', target: 2, per: 'day', unit: 'kali', maxDay: 2 },
  { id: 'quran', rapor: 'tilawah', name: 'Tilawah', detail: 'Tilawah / murajaah Al-Qur’an', target: 10, per: 'day', unit: 'halaman', maxDay: 604 },
  { id: 'puasa', rapor: 'puasa', name: 'Puasa Sunnah', detail: 'Puasa sunnah', target: 2, per: 'month', unit: 'hari', maxDay: 1 },
] as const;
export type Activity = (typeof activities)[number];
export type MonthEntry = { month: string; values: Record<string, number | null>; izin: number; note?: string; version?: string };

const PER_LABEL: Record<Per, string> = { day: 'hari', week: 'pekan', month: 'bulan' };
export const targetLabel = (a: Activity) => `${a.target} ${a.unit}/${PER_LABEL[a.per as Per]}`;
export function todayWIB() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
export function validMonth(m: string) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(m); }
export function daysInMonth(month: string) { if (!validMonth(month)) throw new Error('Bulan tidak valid.'); const [y, m] = month.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
export function daysOfMonth(month: string) { const n = daysInMonth(month); return Array.from({ length: n }, (_, i) => month + '-' + String(i + 1).padStart(2, '0')); }
export function grade(score: number | null) { return score == null ? '--' : score >= 90 ? 'A' : score >= 80 ? 'B+' : score >= 70 ? 'B' : 'C'; }
export const SKALA = [{ p: 'A', min: 90, makna: 'Sangat baik' }, { p: 'B+', min: 80, makna: 'Baik' }, { p: 'B', min: 70, makna: 'Cukup' }, { p: 'C', min: 0, makna: 'Perlu pembinaan' }] as const;

/** Hari di pondok = jumlah hari bulan itu dikurangi hari izin/pulang. */
export function hadir(month: string, izin = 0) { return Math.max(0, daysInMonth(month) - Math.max(0, Math.round(izin || 0))); }
/** Target satu bulan. Contoh 30 hari: berjamaah 5 × 30 = 150; qiyamul lail 2 × 4 pekan = 8; puasa 2. */
export function monthTarget(a: Activity, month: string, izin = 0) {
  const days = daysInMonth(month), h = hadir(month, izin);
  if (a.per === 'day') return a.target * h;
  if (a.per === 'week') return a.target * Math.floor(h / 7);
  return h ? Math.max(1, Math.round((a.target * h) / days)) : 0;
}
export function monthMax(a: Activity, month: string, izin = 0) { return a.maxDay * hadir(month, izin); }
/** Rincian kategori per ibadah untuk satu bulan: batas bawah jumlah pelaksanaan tiap predikat. */
export function kategori(a: Activity, month: string, izin = 0) {
  const t = monthTarget(a, month, izin);
  if (!t) return [];
  const minA = Math.ceil(t * 0.9), minBp = Math.ceil(t * 0.8), minB = Math.ceil(t * 0.7);
  return [
    { p: 'A', dari: minA, sampai: null as number | null, teks: `≥ ${minA}` },
    { p: 'B+', dari: minBp, sampai: minA - 1, teks: minBp < minA - 1 ? `${minBp}–${minA - 1}` : `${minBp}` },
    { p: 'B', dari: minB, sampai: minBp - 1, teks: minB < minBp - 1 ? `${minB}–${minBp - 1}` : `${minB}` },
    { p: 'C', dari: 0, sampai: minB - 1, teks: `≤ ${minB - 1}` },
  ].filter((k) => k.sampai == null || k.sampai >= k.dari);
}
export function scoreOf(a: Activity, month: string, value: number | null | undefined, izin = 0) {
  const t = monthTarget(a, month, izin);
  if (value == null || !t) return null;
  return Math.round((Math.min(value, t) / t) * 10000) / 100;
}
export function validateMonth(input: any, asOf = todayWIB()) {
  const month = String(input?.month || '');
  if (!validMonth(month) || month > asOf.slice(0, 7)) throw new Error('Bulan harus valid dan tidak melewati bulan ini.');
  const izin = Number(input.izin ?? 0);
  if (!Number.isInteger(izin) || izin < 0 || izin > daysInMonth(month)) throw new Error('Jumlah hari izin tidak valid.');
  if (!input.values || typeof input.values !== 'object' || Array.isArray(input.values)) throw new Error('Isian ibadah tidak valid.');
  const ids = activities.map((a) => a.id as string);
  if (Object.keys(input.values).some((k) => !ids.includes(k))) throw new Error('Ibadah tidak dikenal.');
  const values: Record<string, number | null> = {};
  for (const a of activities) {
    const v = input.values[a.id];
    if (v != null && (!Number.isInteger(v) || v < 0 || v > monthMax(a, month, izin))) throw new Error(`Jumlah ${a.name} tidak valid (maksimal ${monthMax(a, month, izin)} ${a.unit} untuk ${hadir(month, izin)} hari di pondok).`);
    values[a.id] = v ?? null;
  }
  const note = typeof input.note === 'string' ? input.note : '';
  if (note.length > 2000) throw new Error('Catatan maksimal 2.000 karakter.');
  return { month, values, izin, note };
}
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100 : null);
export function monthlyReport(month: string, entry: MonthEntry | null | undefined) {
  const izin = entry?.izin ?? 0;
  const rows = activities.map((a) => {
    const value = entry?.values?.[a.id] ?? null, target = monthTarget(a, month, izin), score = scoreOf(a, month, value, izin);
    return { ...a, label: targetLabel(a), value, target, score, predikat: grade(score), kategori: kategori(a, month, izin) };
  });
  const score = avg(rows.filter((r) => r.score != null).map((r) => r.score!));
  const filled = rows.filter((r) => r.value != null).length;
  return { month, izin, hadir: hadir(month, izin), rows, score, predikat: grade(score), filled, total: rows.length, note: entry?.note || '' };
}
/** Semester: per ibadah, rata-rata nilai bulan yang terisi (bulan tanpa isian tidak dihitung). */
export function semesterReport(months: string[], entries: MonthEntry[]) {
  const reports = months.map((m) => monthlyReport(m, entries.find((e) => e.month === m)));
  const rows = activities.map((a) => {
    const per = reports.map((r) => r.rows.find((x) => x.id === a.id)!);
    const score = avg(per.filter((x) => x.score != null).map((x) => x.score!));
    return { ...a, label: targetLabel(a), months: per.map((x) => x.score), values: per.map((x) => x.value), score, predikat: grade(score), bulanTerisi: per.filter((x) => x.score != null).length };
  });
  const score = avg(rows.filter((r) => r.score != null).map((r) => r.score!));
  const bulanTerisi = reports.filter((r) => r.filled > 0).length;
  return { reports, rows, score, predikat: grade(score), bulanTerisi, provisional: bulanTerisi < months.length };
}
export function semesterMonths(year: number, semester: number) { if (!Number.isInteger(year) || year < 2000 || year > 2100 || ![1, 2].includes(semester)) throw new Error('Semester tidak valid.'); return Array.from({ length: 6 }, (_, i) => (semester === 1 ? year : year + 1) + '-' + String((semester === 1 ? 7 : 1) + i).padStart(2, '0')); }
