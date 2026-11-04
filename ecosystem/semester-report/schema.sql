-- Additive: report supplements do not modify exam grades, weekly records, or Netlify.
CREATE TABLE IF NOT EXISTS tahfidz_exam.semester_reports (
 santri_id text NOT NULL REFERENCES public.santri(id),
 tahun_ajaran text NOT NULL CHECK(tahun_ajaran ~ '^20[0-9]{2}/20[0-9]{2}$'),
 semester integer NOT NULL CHECK(semester IN(1,2)),
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 version integer NOT NULL DEFAULT 1,
 updated_by text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(santri_id,tahun_ajaran,semester)
);
ALTER TABLE tahfidz_exam.semester_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tahfidz_exam.semester_reports FROM PUBLIC,anon,authenticated;
