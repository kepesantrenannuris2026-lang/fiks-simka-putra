-- Tanda juz yang sudah diujikan (oranye) untuk santri, dan capaian hafalan peserta halaqah musyrif
ALTER TABLE hafalan ADD COLUMN IF NOT EXISTS juz_diuji TEXT NOT NULL DEFAULT '';
ALTER TABLE hm_anggota ADD COLUMN IF NOT EXISTS target_juz INT NOT NULL DEFAULT 5;
ALTER TABLE hm_anggota ADD COLUMN IF NOT EXISTS juz_selesai TEXT NOT NULL DEFAULT '';
ALTER TABLE hm_anggota ADD COLUMN IF NOT EXISTS juz_diuji TEXT NOT NULL DEFAULT '';
-- Nilai setoran halaqah musyrif (A, B+, B, C)
ALTER TABLE hm_catatan ADD COLUMN IF NOT EXISTS nilai_kelancaran TEXT NOT NULL DEFAULT '';
ALTER TABLE hm_catatan ADD COLUMN IF NOT EXISTS nilai_makhraj TEXT NOT NULL DEFAULT '';
ALTER TABLE hm_catatan ADD COLUMN IF NOT EXISTS nilai_tajwid TEXT NOT NULL DEFAULT '';
