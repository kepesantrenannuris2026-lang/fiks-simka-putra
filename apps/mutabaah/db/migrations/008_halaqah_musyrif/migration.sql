-- Halaqah khusus musyrif/musyrifah (pembinaan tahsin para pengajar), diampu oleh seorang pengampu
CREATE TABLE IF NOT EXISTS hm_grup (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL,
  jenis TEXT NOT NULL DEFAULT 'ikhwan',            -- ikhwan | akhwat
  pengampu_username TEXT NOT NULL DEFAULT '',
  pengampu_nama TEXT NOT NULL DEFAULT '',
  urut INT NOT NULL DEFAULT 0,
  aktif BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS hm_anggota (
  id SERIAL PRIMARY KEY,
  grup_id INT NOT NULL REFERENCES hm_grup(id),
  nama TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',               -- akun musyrif bila cocok (untuk melihat catatannya sendiri)
  urut INT NOT NULL DEFAULT 0,
  aktif BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS hm_anggota_grup ON hm_anggota (grup_id);
CREATE INDEX IF NOT EXISTS hm_anggota_user ON hm_anggota (username);
CREATE TABLE IF NOT EXISTS hm_catatan (
  id SERIAL PRIMARY KEY,
  anggota_id INT NOT NULL REFERENCES hm_anggota(id),
  grup_id INT NOT NULL REFERENCES hm_grup(id),
  ym TEXT NOT NULL,
  pekan INT NOT NULL,
  tanggal TEXT NOT NULL DEFAULT '',
  kehadiran TEXT NOT NULL DEFAULT 'hadir',         -- hadir | izin | sakit | alfa
  surat TEXT NOT NULL DEFAULT '',
  halaman TEXT NOT NULL DEFAULT '',
  keterangan TEXT NOT NULL DEFAULT '',
  dicatat_oleh TEXT NOT NULL DEFAULT '',
  diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (anggota_id, ym, pekan)
);
CREATE INDEX IF NOT EXISTS hm_catatan_grup ON hm_catatan (grup_id, ym, pekan);
