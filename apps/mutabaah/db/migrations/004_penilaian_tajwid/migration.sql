-- Penilaian makhraj & hukum tajwid (diisi dari menu Santri; satu catatan per santri per bulan)
CREATE TABLE IF NOT EXISTS penilaian_tajwid (
  id TEXT PRIMARY KEY,                    -- santri_id|yyyy-mm
  santri_id TEXT NOT NULL,
  santri_nama TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  tingkat TEXT NOT NULL DEFAULT '',
  halaqah TEXT NOT NULL DEFAULT '',
  musyrif TEXT NOT NULL DEFAULT '',
  ym TEXT NOT NULL,
  tanggal TEXT NOT NULL DEFAULT '',
  makhraj_nilai NUMERIC NULL, makhraj TEXT NOT NULL DEFAULT '', ket_makhraj TEXT NOT NULL DEFAULT '',
  tajwid_nilai NUMERIC NULL, tajwid TEXT NOT NULL DEFAULT '', ket_tajwid TEXT NOT NULL DEFAULT '',
  catatan TEXT NOT NULL DEFAULT '',
  penilai TEXT NOT NULL DEFAULT '',
  diperbarui_oleh TEXT NOT NULL DEFAULT '',
  diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (santri_id, ym)
);
CREATE INDEX IF NOT EXISTS penilaian_tajwid_ym ON penilaian_tajwid (ym);
