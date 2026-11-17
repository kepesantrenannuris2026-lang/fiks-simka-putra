CREATE TABLE IF NOT EXISTS akun (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  nama TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'musyrif',
  musyrif_master TEXT NOT NULL DEFAULT '',
  aktif TEXT NOT NULL DEFAULT 'Y'
);
CREATE UNIQUE INDEX IF NOT EXISTS akun_username_lower ON akun (lower(username));

CREATE TABLE IF NOT EXISTS santri (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  tingkat TEXT NOT NULL DEFAULT '',
  halaqah TEXT NOT NULL DEFAULT '',
  halaqah_key TEXT NOT NULL DEFAULT '',
  musyrif TEXT NOT NULL DEFAULT '',
  program TEXT NOT NULL DEFAULT '',
  keterangan TEXT NOT NULL DEFAULT '',
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  urut INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS keanggotaan_histori (
  ym TEXT NOT NULL,
  santri_id TEXT NOT NULL,
  nama TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  tingkat TEXT NOT NULL DEFAULT '',
  halaqah TEXT NOT NULL DEFAULT '',
  halaqah_key TEXT NOT NULL DEFAULT '',
  musyrif TEXT NOT NULL DEFAULT '',
  program TEXT NOT NULL DEFAULT '',
  keterangan TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (ym, santri_id)
);

CREATE TABLE IF NOT EXISTS setoran (
  id TEXT PRIMARY KEY,
  tahun INT NOT NULL,
  bulan INT NOT NULL,
  pekan INT NOT NULL,
  ym TEXT NOT NULL,
  santri_id TEXT NOT NULL,
  santri_nama TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  tingkat TEXT NOT NULL DEFAULT '',
  halaqah TEXT NOT NULL DEFAULT '',
  halaqah_key TEXT NOT NULL DEFAULT '',
  musyrif TEXT NOT NULL DEFAULT '',
  dicatat_oleh TEXT NOT NULL DEFAULT '',
  hadir INT NOT NULL DEFAULT 0,
  sakit INT NOT NULL DEFAULT 0,
  izin INT NOT NULL DEFAULT 0,
  alfa INT NOT NULL DEFAULT 0,
  tahsin_baris INT NOT NULL DEFAULT 0,
  ziyadah_baris INT NOT NULL DEFAULT 0,
  murajaah_baris INT NOT NULL DEFAULT 0,
  nilai_tahsin NUMERIC NULL,
  nilai_ziyadah NUMERIC NULL,
  nilai_murajaah NUMERIC NULL,
  ziyadah_surat TEXT NOT NULL DEFAULT '',
  murajaah_juz TEXT NOT NULL DEFAULT '',
  catatan TEXT NOT NULL DEFAULT '',
  dicatat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ym, pekan, santri_id)
);
CREATE INDEX IF NOT EXISTS setoran_ym ON setoran (ym);
CREATE INDEX IF NOT EXISTS setoran_santri ON setoran (santri_id);

CREATE TABLE IF NOT EXISTS hafalan (
  santri_id TEXT PRIMARY KEY,
  santri_nama TEXT NOT NULL DEFAULT '',
  baris_awal INT NOT NULL DEFAULT 0,
  keterangan TEXT NOT NULL DEFAULT '',
  diperbarui_oleh TEXT NOT NULL DEFAULT '',
  diperbarui_pada TIMESTAMPTZ NULL,
  baris_terverifikasi INT NULL,
  terverifikasi_sampai_ym TEXT NOT NULL DEFAULT '',
  terverifikasi_oleh TEXT NOT NULL DEFAULT '',
  terverifikasi_pada TIMESTAMPTZ NULL,
  target_juz INT NOT NULL DEFAULT 30,
  juz_selesai TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sertifikasi (
  id TEXT PRIMARY KEY,
  santri_id TEXT NOT NULL,
  santri_nama TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  tingkat TEXT NOT NULL DEFAULT '',
  halaqah TEXT NOT NULL DEFAULT '',
  musyrif TEXT NOT NULL DEFAULT '',
  juz INT NOT NULL,
  bagian INT NOT NULL,
  halaman_minimal INT NOT NULL DEFAULT 5,
  tanggal_ujian TEXT NOT NULL DEFAULT '',
  nilai NUMERIC NULL,
  status TEXT NOT NULL DEFAULT 'remedial',
  penguji TEXT NOT NULL DEFAULT '',
  catatan TEXT NOT NULL DEFAULT '',
  dicatat_oleh TEXT NOT NULL DEFAULT '',
  dicatat_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (santri_id, juz, bagian)
);

CREATE TABLE IF NOT EXISTS audit (
  id BIGSERIAL PRIMARY KEY,
  waktu TIMESTAMPTZ NOT NULL DEFAULT now(),
  username TEXT NOT NULL DEFAULT '',
  aksi TEXT NOT NULL DEFAULT '',
  entitas TEXT NOT NULL DEFAULT '',
  entitas_id TEXT NOT NULL DEFAULT '',
  sebelum JSONB NULL,
  sesudah JSONB NULL
);

CREATE TABLE IF NOT EXISTS sesi (
  token TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id BIGSERIAL PRIMARY KEY,
  sheet TEXT NOT NULL,
  op TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ NULL,
  done_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS sync_queue_status ON sync_queue (status, id);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
