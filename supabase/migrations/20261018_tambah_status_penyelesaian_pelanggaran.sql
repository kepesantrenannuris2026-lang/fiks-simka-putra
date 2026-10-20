-- ==============================================================================
-- SIMKA.ID PRO V1 - MIGRATION: STATUS PENYELESAIAN PEMBINAAN PELANGGARAN
-- File: /supabase/migrations/20261018_tambah_status_penyelesaian_pelanggaran.sql
-- Tanggal: 18 Oktober 2026
-- Idempotent & Non-destructive: Mempertahankan seluruh data historis pelanggaran
-- ==============================================================================

-- 1. Pastikan kolom status memiliki nilai default dan constraint yang tepat
ALTER TABLE public.pelanggaran 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Belum Selesai';

-- Pastikan CHECK constraint untuk status jika belum ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pelanggaran_status_check'
  ) THEN
    ALTER TABLE public.pelanggaran 
      ADD CONSTRAINT pelanggaran_status_check CHECK (status IN ('Belum Selesai', 'Selesai'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tambahkan kolom pencatatan waktu dan aktor penyelesaian (Audit Trail)
ALTER TABLE public.pelanggaran 
  ADD COLUMN IF NOT EXISTS diselesaikan_pada TIMESTAMPTZ;

ALTER TABLE public.pelanggaran 
  ADD COLUMN IF NOT EXISTS diselesaikan_oleh TEXT REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.pelanggaran 
  ADD COLUMN IF NOT EXISTS penyelesai_nama TEXT;

ALTER TABLE public.pelanggaran 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Indeks untuk mempercepat filter status dan agregasi dashboard
CREATE INDEX IF NOT EXISTS idx_pelanggaran_status ON public.pelanggaran(status);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_status_unit ON public.pelanggaran(santri_unit, status);

-- 4. Pastikan RLS mengizinkan operasi update status untuk anon key
ALTER TABLE public.pelanggaran ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon All pelanggaran" ON public.pelanggaran;
CREATE POLICY "Public Anon All pelanggaran" ON public.pelanggaran FOR ALL TO anon USING (true) WITH CHECK (true);

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
