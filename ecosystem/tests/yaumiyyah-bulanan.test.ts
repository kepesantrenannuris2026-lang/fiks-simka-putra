import { test } from 'node:test'; import assert from 'node:assert/strict';
import { activities, monthTarget, kategori, scoreOf, grade, monthlyReport, semesterReport, validateMonth, semesterMonths } from '../../src/yaumiyyah/model';
import { konversiBulan } from '../../src/yaumiyyah/konversi';
const A = (id: string) => activities.find((a) => a.id === id)!;
test('8 ibadah sama dengan aspek Ibadah rapor', () => {
  assert.deepEqual(activities.map((a) => a.rapor), ['jamaah', 'qiyam', 'dhuha', 'rawatib', 'dzikir', 'matsurat', 'tilawah', 'puasa']);
});
test('target bulanan sesuai jumlah hari: berjamaah 5×hari, tahajjud 2×4 pekan', () => {
  assert.equal(monthTarget(A('jamaah'), '2026-11'), 150); assert.equal(monthTarget(A('jamaah'), '2026-12'), 155); assert.equal(monthTarget(A('jamaah'), '2027-02'), 140);
  for (const m of ['2026-11', '2026-12', '2027-02']) { assert.equal(monthTarget(A('qiyam'), m), 8); assert.equal(monthTarget(A('dhuha'), m), 16); assert.equal(monthTarget(A('puasa'), m), 2); }
  assert.equal(monthTarget(A('quran'), '2026-11'), 300);
  assert.equal(monthTarget(A('jamaah'), '2026-11', 10), 100); assert.equal(monthTarget(A('qiyam'), '2026-11', 10), 4); assert.equal(monthTarget(A('puasa'), '2026-11', 15), 1);
});
test('rincian kategori A/B+/B/C sesuai skala rapor', () => {
  assert.deepEqual(kategori(A('jamaah'), '2026-11').map((k) => k.p + ' ' + k.teks), ['A ≥ 135', 'B+ 120–134', 'B 105–119', 'C ≤ 104']);
  assert.deepEqual(kategori(A('qiyam'), '2026-11').map((k) => k.p + ' ' + k.teks), ['A ≥ 8', 'B+ 7', 'B 6', 'C ≤ 5']);
  for (const [n, g] of [[90, 'A'], [89.99, 'B+'], [80, 'B+'], [79.99, 'B'], [70, 'B'], [69.99, 'C']] as const) assert.equal(grade(n), g);
  assert.equal(grade(scoreOf(A('jamaah'), '2026-11', 135)), 'A'); assert.equal(grade(scoreOf(A('jamaah'), '2026-11', 134)), 'B+');
});
test('validasi: maksimal sesuai hari di pondok, bulan depan ditolak', () => {
  assert.throws(() => validateMonth({ month: '2026-11', izin: 0, values: { jamaah: 151 } }, '2026-11-22'));
  assert.throws(() => validateMonth({ month: '2026-12', izin: 0, values: {} }, '2026-11-22'));
  assert.equal(validateMonth({ month: '2026-11', izin: 0, values: { jamaah: 150 } }, '2026-11-22').values.jamaah, 150);
});
test('semester = rata-rata bulan yang terisi', () => {
  const m = semesterMonths(2026, 1);
  const r = semesterReport(m, [{ month: '2026-10', izin: 0, values: { jamaah: 155 } }, { month: '2026-11', izin: 0, values: { jamaah: 75 } }]);
  assert.equal(r.rows[0].score, 75); assert.equal(r.rows[0].bulanTerisi, 2); assert.equal(r.rows[1].score, null);
  assert.equal(monthlyReport('2026-11', { month: '2026-11', izin: 0, values: { jamaah: 150, puasa: 1 } }).score, 75);
});
test('konversi harian → bulanan mempertahankan capaian', () => {
  const k = konversiBulan('2026-11', [{ date: '2026-11-20', values: { jamaah: 5, qiyam: 1, quran: 5, puasa: 0, olahraga: 15 }, excused: ['dhuha'], note: 'baik' }])!;
  assert.equal(k.values.jamaah, 150); assert.equal(k.values.qiyam, 8); assert.equal(k.values.quran, 150); assert.equal(k.values.puasa, 0);
  assert.equal(k.values.dhuha, null); assert.equal(k.values.rawatib, null); assert.match(k.note!, /Dikonversi dari isian harian \(1 hari: 2026-11-20\)/);
  assert.equal(konversiBulan('2026-10', []), null);
});
