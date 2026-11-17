-- Aplikasi menjadi sumber utama data santri & halaqah
ALTER TABLE santri ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aktif';      -- aktif | keluar | pindah (menunggu penempatan)
ALTER TABLE santri ADD COLUMN IF NOT EXISTS status_alasan TEXT NOT NULL DEFAULT '';
ALTER TABLE santri ADD COLUMN IF NOT EXISTS status_pada TIMESTAMPTZ NULL;
ALTER TABLE santri ADD COLUMN IF NOT EXISTS status_oleh TEXT NOT NULL DEFAULT '';
ALTER TABLE santri ADD COLUMN IF NOT EXISTS status_sebelum JSONB NULL;                 -- penempatan sebelum keluar/pindah (untuk dibatalkan)
CREATE TABLE IF NOT EXISTS halaqah_def (                                              -- halaqah yang dibuat pimpinan (boleh belum ada santri)
  key TEXT PRIMARY KEY, unit TEXT NOT NULL, tingkat TEXT NOT NULL, halaqah TEXT NOT NULL, musyrif TEXT NOT NULL DEFAULT '',
  dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT now()
);
