-- Cache hasil tampilan berat pimpinan (5 menit), dipakai bersama semua worker
CREATE TABLE IF NOT EXISTS cache_hasil (
  kunci TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  kadaluarsa TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS cache_hasil_kadaluarsa ON cache_hasil (kadaluarsa);
