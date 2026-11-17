-- Target hafalan lulusan: 0 = default (5 juz reguler / 10 juz tahfidz). Nilai lama 30 dianggap default.
ALTER TABLE hafalan ALTER COLUMN target_juz SET DEFAULT 0;
UPDATE hafalan SET target_juz = 0 WHERE target_juz = 30;

-- Ujian/penilaian rapor Al-Qur'an per semester
CREATE TABLE IF NOT EXISTS ujian_semester (
  id TEXT PRIMARY KEY,                    -- santri_id|2026/2027|1
  santri_id TEXT NOT NULL,
  santri_nama TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  tingkat TEXT NOT NULL DEFAULT '',
  halaqah TEXT NOT NULL DEFAULT '',
  musyrif TEXT NOT NULL DEFAULT '',
  tahun_ajaran TEXT NOT NULL,             -- 2026/2027
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  makhraj_nilai NUMERIC NULL, makhraj TEXT NOT NULL DEFAULT '', ket_makhraj TEXT NOT NULL DEFAULT '',
  tajwid_nilai NUMERIC NULL, tajwid TEXT NOT NULL DEFAULT '', ket_tajwid TEXT NOT NULL DEFAULT '',
  tahfidz TEXT NOT NULL DEFAULT '', ket_tahfidz TEXT NOT NULL DEFAULT '',
  kehadiran TEXT NOT NULL DEFAULT '', ket_kehadiran TEXT NOT NULL DEFAULT '',
  perkembangan TEXT NOT NULL DEFAULT '', ket_perkembangan TEXT NOT NULL DEFAULT '',
  catatan TEXT NOT NULL DEFAULT '',
  penguji TEXT NOT NULL DEFAULT '',
  tanggal TEXT NOT NULL DEFAULT '',
  diperbarui_oleh TEXT NOT NULL DEFAULT '',
  diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (santri_id, tahun_ajaran, semester)
);
CREATE INDEX IF NOT EXISTS ujian_semester_periode ON ujian_semester (tahun_ajaran, semester);
