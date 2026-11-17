-- Ujian semester v2 (pedoman 2026/2027) + pelengkap rapor Al-Qur'an semester (F5).
-- Sudah diterapkan di produksi pada 8 November 2026 (nama migrasi: ujian_v2_rapor_semester).
ALTER TABLE ujian_semester ADD COLUMN IF NOT EXISTS ujian_status TEXT NOT NULL DEFAULT '';
ALTER TABLE ujian_semester ADD COLUMN IF NOT EXISTS penguji_username TEXT NOT NULL DEFAULT '';
ALTER TABLE ujian_semester ADD COLUMN IF NOT EXISTS ujian_mulai TIMESTAMPTZ NULL;
-- Status lama: ujian yang sudah berisi juz dianggap final (skema lama tetap dihitung dengan aturan lamanya).
UPDATE ujian_semester SET ujian_status = 'final' WHERE ujian_status = '' AND jsonb_typeof(tahfidz_ujian) = 'array' AND jsonb_array_length(tahfidz_ujian) > 0;

CREATE TABLE IF NOT EXISTS rapor_semester (
  santri_id TEXT NOT NULL,
  tahun_ajaran TEXT NOT NULL,
  semester INT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  diperbarui_oleh TEXT NOT NULL DEFAULT '',
  diperbarui_pada TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (santri_id, tahun_ajaran, semester)
);
ALTER TABLE rapor_semester ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON rapor_semester FROM anon, authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mutabaah_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON rapor_semester TO mutabaah_app';
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rapor_semester' AND policyname = 'app_full_access') THEN
      EXECUTE 'CREATE POLICY app_full_access ON rapor_semester FOR ALL TO mutabaah_app USING (true) WITH CHECK (true)';
    END IF;
  END IF;
END $$;
