CREATE SCHEMA yaumiyyah;
REVOKE ALL ON SCHEMA yaumiyyah FROM PUBLIC,anon,authenticated;
CREATE TABLE yaumiyyah.daily (
 santri_id text NOT NULL REFERENCES public.santri(id),tanggal date NOT NULL,
 aktivitas jsonb NOT NULL DEFAULT '{}',izin jsonb NOT NULL DEFAULT '[]',catatan text NOT NULL DEFAULT '',
 updated_by text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),version uuid NOT NULL DEFAULT gen_random_uuid(),
 PRIMARY KEY(santri_id,tanggal),CHECK(jsonb_typeof(aktivitas)='object'),CHECK(jsonb_typeof(izin)='array'),CHECK(length(catatan)<=2000)
);
CREATE TABLE yaumiyyah.audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,username text NOT NULL,santri_id text NOT NULL,tanggal date NOT NULL,waktu timestamptz NOT NULL DEFAULT now());
ALTER TABLE yaumiyyah.daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE yaumiyyah.audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA yaumiyyah FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA yaumiyyah FROM PUBLIC,anon,authenticated;
