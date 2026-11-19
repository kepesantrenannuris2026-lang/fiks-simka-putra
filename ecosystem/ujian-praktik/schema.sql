-- Ujian Praktik Ibadah (spesifikasi final). Skema privat: hanya Edge Function ujian-praktik yang membaca/menulis.
create schema if not exists ujian_praktik;
revoke all on schema ujian_praktik from public, anon, authenticated;
create table if not exists ujian_praktik.periode (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (length(nama) between 1 and 120),
  tahun_ajaran text not null check (tahun_ajaran ~ '^\d{4}/\d{4}$'),
  semester smallint not null check (semester in (1,2)),
  aktif boolean not null default true,
  materi jsonb not null default '{}'::jsonb,           -- {"7-putra":["wudhu","tayamum","lisan"],...}; kosong = bawaan
  dibuat_oleh text, dibuat_pada timestamptz not null default now()
);
create table if not exists ujian_praktik.nilai (
  periode_id uuid not null references ujian_praktik.periode(id) on delete cascade,
  santri_id text not null references public.santri(id) on delete cascade,
  skor jsonb not null default '{}'::jsonb,             -- {"wudhu":[10,45,15,10,8],...} poin per aspek rubrik
  nilai jsonb not null default '{}'::jsonb,            -- {"wudhu":88,...} jumlah poin per subujian (1–100)
  penguji jsonb not null default '{}'::jsonb,          -- {"wudhu":"username",...}
  catatan text not null default '' check (length(catatan) <= 1000),
  version uuid not null default gen_random_uuid(),
  diperbarui_oleh text, diperbarui_pada timestamptz not null default now(),
  primary key (periode_id, santri_id)
);
create index if not exists nilai_santri_idx on ujian_praktik.nilai(santri_id);
create table if not exists ujian_praktik.peserta (
  santri_id text primary key references public.santri(id) on delete cascade,
  kelas_pagi text not null default '' check (length(kelas_pagi) <= 20),
  diperbarui_oleh text, diperbarui_pada timestamptz not null default now()
);
create table if not exists ujian_praktik.audit (
  id bigint generated always as identity primary key,
  periode_id uuid, santri_id text, username text, data jsonb, waktu timestamptz not null default now()
);
create index if not exists audit_ref_idx on ujian_praktik.audit(periode_id, santri_id);
revoke all on all tables in schema ujian_praktik from public, anon, authenticated;
insert into ujian_praktik.periode(nama, tahun_ajaran, semester, dibuat_oleh)
  select 'Semester 1 2026/2027', '2026/2027', 1, 'sistem' where not exists (select 1 from ujian_praktik.periode);
