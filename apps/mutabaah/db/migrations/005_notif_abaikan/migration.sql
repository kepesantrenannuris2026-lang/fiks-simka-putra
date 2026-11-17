-- Notifikasi yang dihapus/diabaikan pengguna (mis. pekan libur tanpa halaqah)
CREATE TABLE IF NOT EXISTS notif_abaikan (
  username TEXT NOT NULL,
  kunci TEXT NOT NULL,              -- ym|pekan|halaqah_key  atau  ujian|tahun_ajaran|semester
  dibuat TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (username, kunci)
);
