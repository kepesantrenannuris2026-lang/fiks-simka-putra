-- ==============================================================================
-- SIMKA.ID PRO V1 - MIGRATION: NOTIFIKASI, SEMBUNYIKAN PEMBERITAHUAN, TUNTAS PEMBINAAN & ISOLASI LINGKUNGAN
-- Tanggal: 20 Oktober 2026
-- Idempotent: Aman dijalankan berulang kali, tidak menghapus data historis
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. TABEL PELANGGARAN: TAMBAHKAN KOLOM LINGKUNGAN, PENYEMBUNYIAN NOTIFIKASI, DAN AUDIT PENYELESAIAN
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS lingkungan TEXT DEFAULT 'PUTRI';
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS is_notif_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS selesai_oleh TEXT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS selesai_oleh_nama TEXT;
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS selesai_pada TIMESTAMPTZ;

-- 3. TABEL SANTRI: TAMBAHKAN KOLOM LINGKUNGAN
ALTER TABLE public.santri ADD COLUMN IF NOT EXISTS lingkungan TEXT DEFAULT 'PUTRI';

-- 4. TABEL PEMBINAAN: TAMBAHKAN KOLOM LINGKUNGAN DAN PENYEMBUNYIAN NOTIFIKASI
ALTER TABLE public.pembinaan ADD COLUMN IF NOT EXISTS lingkungan TEXT DEFAULT 'PUTRI';
ALTER TABLE public.pembinaan ADD COLUMN IF NOT EXISTS is_notif_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE public.pembinaan ADD COLUMN IF NOT EXISTS selesai_oleh TEXT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.pembinaan ADD COLUMN IF NOT EXISTS selesai_oleh_nama TEXT;

-- 5. TABEL HIDDEN NOTIFICATIONS (ARSIP PENYEMBUNYIAN PEMBERITAHUAN DARI PANEL)
CREATE TABLE IF NOT EXISTS public.hidden_notifications (
  id TEXT PRIMARY KEY DEFAULT 'hid-' || substr(md5(random()::text), 1, 8),
  activity_id TEXT NOT NULL UNIQUE,
  activity_type TEXT NOT NULL DEFAULT 'pelanggaran' CHECK (activity_type IN ('pelanggaran', 'pembinaan')),
  hidden_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  hidden_by_nama TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_hidden_notif_activity ON public.hidden_notifications(activity_id);
CREATE INDEX IF NOT EXISTS idx_hidden_notif_user ON public.hidden_notifications(hidden_by);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_lingkungan ON public.pelanggaran(lingkungan);
CREATE INDEX IF NOT EXISTS idx_santri_lingkungan ON public.santri(lingkungan);
CREATE INDEX IF NOT EXISTS idx_pembinaan_lingkungan ON public.pembinaan(lingkungan);

-- 6. KEBIJAKAN RLS UNTUK HIDDEN NOTIFICATIONS
ALTER TABLE public.hidden_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon All hidden_notifications" ON public.hidden_notifications;
CREATE POLICY "Public Anon All hidden_notifications" ON public.hidden_notifications FOR ALL TO anon USING (true) WITH CHECK (true);

-- 7. DEFAULT SINKRONISASI LINGKUNGAN UNTUK DATA YANG ADA
UPDATE public.pelanggaran SET lingkungan = 'PUTRI' WHERE lingkungan IS NULL;
UPDATE public.santri SET lingkungan = 'PUTRI' WHERE lingkungan IS NULL;
UPDATE public.pembinaan SET lingkungan = 'PUTRI' WHERE lingkungan IS NULL;

-- 8. REFRESH SCHEMA CACHE SUPABASE POSTGREST
NOTIFY pgrst, 'reload schema';
