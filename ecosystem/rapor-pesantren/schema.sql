-- Rapor Pesantren (per kamar). Skema privat: hanya Edge Function rapor-pesantren (koneksi server) yang membaca/menulis.
CREATE SCHEMA IF NOT EXISTS rapor_pesantren;
REVOKE ALL ON SCHEMA rapor_pesantren FROM PUBLIC, anon, authenticated;

CREATE TABLE rapor_pesantren.kamar (
  id text PRIMARY KEY,
  nama text NOT NULL CHECK (length(nama) BETWEEN 1 AND 80),
  unit text NOT NULL CHECK (unit IN ('SMP','SMA','MA')),
  lingkungan text NOT NULL CHECK (lingkungan IN ('PUTRA','PUTRI')),
  tingkat text NOT NULL DEFAULT '' CHECK (length(tingkat) <= 4),
  wali_username text REFERENCES public.akun(username) ON UPDATE CASCADE ON DELETE SET NULL,
  wali_label text NOT NULL DEFAULT '',
  urut integer NOT NULL DEFAULT 0,
  aktif boolean NOT NULL DEFAULT true,
  updated_by text NOT NULL DEFAULT 'impor',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX kamar_wali_idx ON rapor_pesantren.kamar (wali_username);

CREATE TABLE rapor_pesantren.anggota (
  santri_id text PRIMARY KEY REFERENCES public.santri(id) ON DELETE CASCADE,
  kamar_id text NOT NULL REFERENCES rapor_pesantren.kamar(id) ON UPDATE CASCADE ON DELETE CASCADE,
  -- Wali kamar khusus santri ini (kamar dengan beberapa wali); kosong = ikut wali kamar.
  wali_username text REFERENCES public.akun(username) ON UPDATE CASCADE ON DELETE SET NULL,
  updated_by text NOT NULL DEFAULT 'impor',
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX anggota_kamar_idx ON rapor_pesantren.anggota (kamar_id);
CREATE INDEX anggota_wali_idx ON rapor_pesantren.anggota (wali_username);

CREATE TABLE rapor_pesantren.nilai (
  santri_id text NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  tahun_ajaran text NOT NULL CHECK (tahun_ajaran ~ '^\d{4}/\d{4}$'),
  semester smallint NOT NULL CHECK (semester IN (1,2)),
  data jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(data) = 'object' AND pg_column_size(data) < 20000),
  version uuid NOT NULL DEFAULT gen_random_uuid(),
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (santri_id, tahun_ajaran, semester)
);

CREATE TABLE rapor_pesantren.pengaturan (
  key text PRIMARY KEY CHECK (length(key) <= 40),
  value jsonb NOT NULL,
  updated_by text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rapor_pesantren.audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username text NOT NULL,
  aksi text NOT NULL,
  ref text NOT NULL DEFAULT '',
  data jsonb,
  waktu timestamptz NOT NULL DEFAULT now()
);

-- Nama dari daftar kamar yang belum cocok dengan data santri Mutabaah (ditangani pimpinan dari aplikasi).
CREATE TABLE rapor_pesantren.impor_tidak_cocok (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kamar_id text NOT NULL REFERENCES rapor_pesantren.kamar(id) ON UPDATE CASCADE ON DELETE CASCADE,
  nama text NOT NULL,
  wali_label text NOT NULL DEFAULT '',
  selesai boolean NOT NULL DEFAULT false
);
CREATE INDEX impor_tidak_cocok_kamar_idx ON rapor_pesantren.impor_tidak_cocok (kamar_id);

ALTER TABLE rapor_pesantren.kamar ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapor_pesantren.anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapor_pesantren.nilai ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapor_pesantren.pengaturan ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapor_pesantren.audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapor_pesantren.impor_tidak_cocok ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA rapor_pesantren FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA rapor_pesantren FROM PUBLIC, anon, authenticated;
