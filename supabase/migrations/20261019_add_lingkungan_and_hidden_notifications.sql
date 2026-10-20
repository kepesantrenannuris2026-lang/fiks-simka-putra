-- ==============================================================================
-- SIMKA.ID - PEMISAHAN DATA PUTRA/PUTRI & FITUR SEMBUNYIKAN PEMBERITAHUAN
-- ==============================================================================

-- 1. Tambah kolom 'lingkungan' pada santri, pelanggaran, dan pembinaan
ALTER TABLE public.santri ADD COLUMN IF NOT EXISTS lingkungan TEXT NOT NULL DEFAULT 'PUTRI' CHECK (lingkungan IN ('PUTRA', 'PUTRI'));
ALTER TABLE public.pelanggaran ADD COLUMN IF NOT EXISTS lingkungan TEXT NOT NULL DEFAULT 'PUTRI' CHECK (lingkungan IN ('PUTRA', 'PUTRI'));
ALTER TABLE public.pembinaan ADD COLUMN IF NOT EXISTS lingkungan TEXT NOT NULL DEFAULT 'PUTRI' CHECK (lingkungan IN ('PUTRA', 'PUTRI'));

CREATE INDEX IF NOT EXISTS idx_santri_lingkungan ON public.santri(lingkungan);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_lingkungan ON public.pelanggaran(lingkungan);
CREATE INDEX IF NOT EXISTS idx_pembinaan_lingkungan ON public.pembinaan(lingkungan);

-- 2. Buat tabel hidden_notifications untuk mengarsipkan pemberitahuan yang disembunyikan
CREATE TABLE IF NOT EXISTS public.hidden_notifications (
  id TEXT PRIMARY KEY DEFAULT 'hide-' || substr(md5(random()::text), 1, 8),
  activity_id TEXT NOT NULL,
  source_id TEXT,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('pelanggaran', 'pembinaan')),
  unit TEXT NOT NULL CHECK (unit IN ('SMP', 'MA', 'SMA', 'ALL')),
  lingkungan TEXT NOT NULL CHECK (lingkungan IN ('PUTRA', 'PUTRI')),
  hidden_by_user_id TEXT NOT NULL,
  hidden_by_nama TEXT NOT NULL,
  hidden_by_role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_activity_hidden UNIQUE (activity_id, lingkungan)
);

CREATE INDEX IF NOT EXISTS idx_hidden_notif_lingkungan ON public.hidden_notifications(lingkungan);
CREATE INDEX IF NOT EXISTS idx_hidden_notif_unit ON public.hidden_notifications(unit);

-- 3. RLS untuk hidden_notifications
ALTER TABLE public.hidden_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Anon All hidden_notifications" ON public.hidden_notifications;
CREATE POLICY "Public Anon All hidden_notifications" ON public.hidden_notifications FOR ALL TO anon USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
