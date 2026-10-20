-- ==============================================================================
-- SIMKA.ID PRO V1 - MIGRATION: REVISI REKAP PELANGGARAN
-- File: /supabase/migrations/20261021_simka_pro_revisi_rekap_pelanggaran.sql
-- Fitur: Download Mutabaah Pembinaan, Edit/Revisi Kasus, dan Hapus Kasus
-- Berlaku aman (Idempotent), menjaga integritas relasi dan RLS
-- ==============================================================================

-- 1. PASTIKAN TABEL PELANGGARAN MEMILIKI KOLOM SNAPSHOT & RELASI LENGKAP
CREATE TABLE IF NOT EXISTS public.pelanggaran (
  id TEXT PRIMARY KEY DEFAULT 'log-' || substr(md5(random()::text), 1, 8),
  santri_id TEXT NOT NULL REFERENCES public.santri(id) ON DELETE CASCADE,
  santri_unit TEXT NOT NULL CHECK (santri_unit IN ('SMP', 'MA', 'SMA')),
  lingkungan TEXT NOT NULL DEFAULT 'PUTRI' CHECK (lingkungan IN ('PUTRA', 'PUTRI')),
  pelanggaran_id TEXT REFERENCES public.master_pelanggaran(id) ON DELETE SET NULL,
  jenis_pelanggaran_id TEXT REFERENCES public.master_pelanggaran(id) ON DELETE SET NULL,
  jenis_pelanggaran_nama TEXT,
  tanggal_waktu TIMESTAMPTZ DEFAULT NOW(),
  poin INTEGER NOT NULL CHECK (poin > 0),
  hukuman TEXT,
  status TEXT NOT NULL DEFAULT 'Belum Selesai' CHECK (status IN ('Belum Selesai', 'Selesai')),
  catatan TEXT,
  dicatat_oleh TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  pencatat_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  pencatat_nama TEXT,
  santri_nama TEXT,
  santri_kelas TEXT,
  pembinaan_tingkat VARCHAR(50),
  rekomendasi_pembinaan JSONB DEFAULT '[]'::jsonb,
  diselesaikan_pada TIMESTAMPTZ,
  diselesaikan_oleh TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  penyelesai_nama TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom-kolom penting ada
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS jenis_pelanggaran_id TEXT REFERENCES public.master_pelanggaran(id) ON DELETE SET NULL;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS jenis_pelanggaran_nama TEXT;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Belum Selesai';
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS catatan TEXT;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS hukuman TEXT;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS pembinaan_tingkat VARCHAR(50);
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS rekomendasi_pembinaan JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS diselesaikan_pada TIMESTAMPTZ;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS diselesaikan_oleh TEXT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS penyelesai_nama TEXT;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. INDEX UNTUK AKSELERASI QUERY REKAP
CREATE INDEX IF NOT EXISTS idx_pelanggaran_santri_id ON public.pelanggaran(santri_id);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_unit_status ON public.pelanggaran(santri_unit, status);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_tanggal_waktu ON public.pelanggaran(tanggal_waktu DESC);

-- 3. ROW LEVEL SECURITY (RLS) KEBIJAKAN
ALTER TABLE public.pelanggaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon All pelanggaran" ON public.pelanggaran;
CREATE POLICY "Public Anon All pelanggaran" ON public.pelanggaran FOR ALL TO anon USING (true) WITH CHECK (true);
