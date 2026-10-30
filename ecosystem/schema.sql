-- Private SIMKA data, sharing identity and student master with Mutabaah.
CREATE SCHEMA IF NOT EXISTS simka;
REVOKE ALL ON SCHEMA simka FROM PUBLIC, anon, authenticated;
CREATE TABLE simka.master_pelanggaran (
 id text primary key default gen_random_uuid()::text, kode text unique not null,
 jenis text, nama text, kategori text not null default 'Ringan', poin integer not null check(poin between 1 and 100),
 konsekuensi text, hukuman text, created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
CREATE TABLE simka.master_pembinaan (
 id uuid primary key default gen_random_uuid(),tingkat integer unique not null,nama_tingkat text not null,
 min_poin integer not null,max_poin integer not null,jenis_pembinaan jsonb not null default '[]',
 is_active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
CREATE TABLE simka.pelanggaran (
 id text primary key default gen_random_uuid()::text, santri_id text not null,santri_unit text not null check(santri_unit in ('SMP','MA','SMA')),
 lingkungan text not null default 'PUTRA' check(lingkungan='PUTRA'),pelanggaran_id text references simka.master_pelanggaran(id),
 jenis_pelanggaran_id text references simka.master_pelanggaran(id),jenis_pelanggaran_nama text,
 tanggal_waktu timestamptz not null default now(),poin integer not null check(poin between 1 and 100),hukuman text,
 status text not null default 'Belum Selesai' check(status in ('Belum Selesai','Selesai')),catatan text,
 dicatat_oleh text,pencatat_id text,pencatat_nama text,santri_nama text,santri_kelas text,pembinaan_tingkat text,
 rekomendasi_pembinaan jsonb default '[]',diselesaikan_pada timestamptz,diselesaikan_oleh text,penyelesai_nama text,
 selesai_oleh text,selesai_oleh_nama text,selesai_pada timestamptz,is_notif_hidden boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
CREATE INDEX ON simka.pelanggaran(santri_id);
CREATE INDEX ON simka.pelanggaran(santri_unit,tanggal_waktu desc);
CREATE TABLE simka.pembinaan (
 id text primary key default gen_random_uuid()::text,santri_id text not null,santri_nama text not null,santri_kelas text not null,
 santri_unit text not null check(santri_unit in ('SMP','MA','SMA')),lingkungan text not null default 'PUTRA' check(lingkungan='PUTRA'),
 pelanggaran_terkait_id text references simka.pelanggaran(id) on delete set null,pelanggaran_terkait_jenis text,
 jenis_pembinaan text not null,tanggal text not null,tanggal_target_selesai text,pembina text not null,pembina_id text,
 catatan text,status text not null default 'BELUM DIMULAI' check(status in ('BELUM DIMULAI','PROSES','SELESAI')),
 tanggal_selesai text,selesai_oleh text,selesai_oleh_nama text,is_notif_hidden boolean not null default false,created_at timestamptz not null default now()
);
CREATE INDEX ON simka.pembinaan(santri_id);
CREATE INDEX ON simka.pembinaan(santri_unit);
CREATE TABLE simka.hidden_notifications (
 id text primary key default gen_random_uuid()::text,activity_id text not null,source_id text,
 activity_type text not null check(activity_type in ('pelanggaran','pembinaan')),unit text not null,
 lingkungan text not null default 'PUTRA' check(lingkungan='PUTRA'),hidden_by_user_id text not null,
 hidden_by_nama text not null,hidden_by_role text not null,created_at timestamptz not null default now(),unique(activity_id,lingkungan)
);
CREATE TABLE simka.audit (
 id bigint generated always as identity primary key,waktu timestamptz not null default now(),username text not null,
 tabel text not null,aksi text not null,record_id text
);
CREATE VIEW simka.users WITH(security_invoker=true) AS
 SELECT md5('akun:'||a.username)::uuid::text as id,a.nama,a.username,
 CASE WHEN lower(a.role) in ('pimpinan','admin') THEN 'KASIE_KEPESANTRENAN' ELSE 'MUSYRIF' END as jabatan,
 CASE WHEN lower(a.role) in ('pimpinan','admin') THEN 'ALL' ELSE (
 SELECT split_part(s.unit,' ',1) FROM public.santri s WHERE s.aktif AND s.unit ilike '%ikhwan%'
 AND lower(trim(s.musyrif))=lower(trim(a.musyrif_master)) ORDER BY s.unit LIMIT 1) END as unit,
 upper(a.aktif)<>'N' as is_active,'2026-10-28T00:00:00Z'::timestamptz as created_at
 FROM public.akun a WHERE lower(a.role) in ('pimpinan','admin') OR EXISTS (
 SELECT 1 FROM public.santri s WHERE s.aktif AND s.unit ilike '%ikhwan%' AND lower(trim(s.musyrif))=lower(trim(a.musyrif_master)));
CREATE VIEW simka.santri WITH(security_invoker=true) AS
 SELECT md5('santri:'||s.id)::uuid::text as id,s.id as kode_santri,s.nama,s.tingkat as kelas,
 split_part(s.unit,' ',1) as unit,'PUTRA'::text as lingkungan,s.musyrif,s.musyrif as musyrif_nama,
 (SELECT u.id FROM simka.users u JOIN public.akun a ON a.username=u.username WHERE lower(trim(a.musyrif_master))=lower(trim(s.musyrif)) LIMIT 1) as musyrif_id,
 ''::text as asrama,''::text as kamar,
 coalesce((SELECT sum(p.poin)::int FROM simka.pelanggaran p WHERE p.santri_id=md5('santri:'||s.id)::uuid::text),0) as total_poin,
 'Baik'::text as status_pembinaan,s.keterangan,'2026-10-28T00:00:00Z'::timestamptz as created_at
 FROM public.santri s WHERE s.aktif AND s.unit ilike '%ikhwan%';
ALTER TABLE simka.master_pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE simka.master_pembinaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE simka.pelanggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE simka.pembinaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE simka.hidden_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE simka.audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA simka FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA simka FROM PUBLIC,anon,authenticated;
COMMENT ON SCHEMA simka IS 'Private server-only SIMKA Putra. Mutabaah remains the identity and student source of truth.';
CREATE TABLE simka.login_limits(k text primary key,attempts int not null,started_at timestamptz not null);
ALTER TABLE simka.login_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON simka.login_limits FROM PUBLIC,anon,authenticated;
CREATE TABLE simka.handoffs(code_hash text primary key,token text not null,expires_at timestamptz not null);
ALTER TABLE simka.handoffs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON simka.handoffs FROM PUBLIC,anon,authenticated;
