-- Ujian tahfidz semester: juz yang diujikan + jumlah kesalahan; nilai = 100 - (0,5 x kecil + 1 x besar + 1 x lupa)
ALTER TABLE ujian_semester ADD COLUMN IF NOT EXISTS tahfidz_ujian JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE ujian_semester ADD COLUMN IF NOT EXISTS tahfidz_nilai NUMERIC NULL;
