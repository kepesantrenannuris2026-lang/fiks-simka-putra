-- Additive module only: existing operational tables and data are untouched.
BEGIN;
CREATE SCHEMA IF NOT EXISTS tahfidz_exam;
REVOKE ALL ON SCHEMA tahfidz_exam FROM PUBLIC,anon,authenticated;
CREATE TABLE tahfidz_exam.periods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tahun_ajaran text NOT NULL CHECK(tahun_ajaran ~ '^20[0-9]{2}/20[0-9]{2}$'),semester int NOT NULL CHECK(semester IN(1,2)),
 title text NOT NULL,is_open boolean NOT NULL DEFAULT false,rules jsonb NOT NULL,rules_version int NOT NULL DEFAULT 1,created_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tahun_ajaran,semester));
CREATE TABLE tahfidz_exam.staff(username text NOT NULL REFERENCES public.akun(username),unit text NOT NULL CHECK(unit IN('SMP Ikhwan','SMA Ikhwan','MA Ikhwan','SMP Akhwat','SMA Akhwat','MA Akhwat')),role text NOT NULL CHECK(role IN('coordinator','examiner')),PRIMARY KEY(username,unit,role));
CREATE TABLE tahfidz_exam.assignments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),period_id uuid NOT NULL REFERENCES tahfidz_exam.periods(id),santri_id text NOT NULL REFERENCES public.santri(id),unit text NOT NULL,examiner text NOT NULL REFERENCES public.akun(username),exam_type text NOT NULL CHECK(exam_type IN('HAFALAN_5_SOAL','UJI_KOMPETENSI_DASAR')),coverage jsonb NOT NULL,verified_by text NOT NULL,verified_at timestamptz NOT NULL DEFAULT now(),status text NOT NULL DEFAULT 'SUDAH_DITUGASKAN' CHECK(status IN('SUDAH_DITUGASKAN','SEDANG_UJIAN','SELESAI','PERLU_REMEDIAL')),scheduled_date date,version int NOT NULL DEFAULT 1,UNIQUE(period_id,santri_id));
CREATE INDEX exam_assignment_examiner ON tahfidz_exam.assignments(period_id,examiner,status);
CREATE INDEX exam_assignment_unit ON tahfidz_exam.assignments(period_id,unit);
CREATE TABLE tahfidz_exam.attempts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),assignment_id uuid NOT NULL REFERENCES tahfidz_exam.assignments(id),attempt_no int NOT NULL CHECK(attempt_no>0),kind text NOT NULL CHECK(kind IN('PERTAMA','REMEDIAL','REVISI')),reason text NOT NULL DEFAULT '',examiner text NOT NULL REFERENCES public.akun(username),rules jsonb NOT NULL,coverage jsonb NOT NULL,exam_type text NOT NULL,seed text NOT NULL,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN('DRAFT','FINAL')),score numeric(5,2) CHECK(score>=0 AND score<=100),passed boolean,result jsonb,note text NOT NULL DEFAULT '',version int NOT NULL DEFAULT 1,started_at timestamptz NOT NULL DEFAULT now(),finalized_at timestamptz,published_at timestamptz,UNIQUE(assignment_id,attempt_no));
CREATE UNIQUE INDEX exam_one_draft ON tahfidz_exam.attempts(assignment_id) WHERE status='DRAFT';
CREATE TABLE tahfidz_exam.questions(attempt_id uuid NOT NULL REFERENCES tahfidz_exam.attempts(id),n int NOT NULL CHECK(n BETWEEN 1 AND 5),start_key text NOT NULL,end_key text NOT NULL,page int NOT NULL,juz int NOT NULL,group_no int NOT NULL,label text NOT NULL,mode text NOT NULL CHECK(mode IN('hafalan','tilawah')),completed boolean NOT NULL DEFAULT false,PRIMARY KEY(attempt_id,n));
CREATE TABLE tahfidz_exam.error_events(id uuid NOT NULL,attempt_id uuid NOT NULL,question_no int NOT NULL,type text NOT NULL CHECK(type IN('KHAFI','JALI','LUPA','TIDAK_JAWAB')),penalty_units int NOT NULL CHECK(penalty_units>0),occurred_at timestamptz NOT NULL,recorded_by text NOT NULL,voided boolean NOT NULL DEFAULT false,PRIMARY KEY(attempt_id,id),FOREIGN KEY(attempt_id,question_no) REFERENCES tahfidz_exam.questions(attempt_id,n));
CREATE UNIQUE INDEX exam_one_unanswered ON tahfidz_exam.error_events(attempt_id,question_no) WHERE type='TIDAK_JAWAB' AND NOT voided;
CREATE TABLE tahfidz_exam.audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,username text NOT NULL,action text NOT NULL,record_id text NOT NULL,before_data jsonb,after_data jsonb,reason text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX exam_audit_record ON tahfidz_exam.audit(record_id,created_at);
CREATE TABLE tahfidz_exam.requests(username text NOT NULL,request_id uuid NOT NULL,body jsonb NOT NULL,response jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(username,request_id));
ALTER TABLE tahfidz_exam.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahfidz_exam.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahfidz_exam.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahfidz_exam.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahfidz_exam.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahfidz_exam.error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahfidz_exam.audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE tahfidz_exam.requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA tahfidz_exam FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA tahfidz_exam FROM PUBLIC,anon,authenticated;
COMMIT;
