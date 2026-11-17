-- Rekap hafalan Hadis Arbain An-Nawawiyah (42 hadis)
CREATE TABLE IF NOT EXISTS hadis_arbain (
  id TEXT PRIMARY KEY,                       -- santri_id|nomor
  santri_id TEXT NOT NULL,
  santri_nama TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  tingkat TEXT NOT NULL DEFAULT '',
  halaqah TEXT NOT NULL DEFAULT '',
  musyrif TEXT NOT NULL DEFAULT '',
  nomor INT NOT NULL CHECK (nomor BETWEEN 1 AND 42),
  status TEXT NOT NULL DEFAULT 'hafal',      -- hafal | mengulang
  nilai NUMERIC NULL,
  tanggal TEXT NOT NULL DEFAULT '',          -- yyyy-MM-dd
  catatan TEXT NOT NULL DEFAULT '',
  diperbarui_oleh TEXT NOT NULL DEFAULT '',
  diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (santri_id, nomor)
);
CREATE INDEX IF NOT EXISTS hadis_arbain_santri ON hadis_arbain (santri_id);
