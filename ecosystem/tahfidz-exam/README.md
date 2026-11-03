## Restart sesi yang belum final

Tombol **Restart / ganti penguji** tersedia pada daftar peserta yang sedang ujian dan halaman pengisian. Pilih alasan salah santri, pergantian penguji atau mengulang penilaian; konfirmasikan pembatalan. Pilihan mulai ulang dengan akun saya membuat sesi baru dengan nilai awal 100. Jika tidak dipilih, peserta kembali tersedia bagi penguji unit yang sama.

Sesi lama berstatus BATAL, catatan/kesalahan tetap tersimpan, tidak dihitung dalam rekap nilai. Pembatalan memeriksa unit, versi data dan kunci baris yang sama dengan finalisasi. Hasil FINAL tidak dapat direstart lewat tombol ini. Daftar riwayat tetap menampilkan sesi batal. Tidak ada sesi operasional yang dibatalkan otomatis saat pemasangan fitur ini.

# Update 3 November 2026: ujian langsung per unit

Periode semester berjalan otomatis tersedia berdasarkan tanggal WIB (Juli–Desember semester 1, Januari–Juni semester 2). Periode 2026/2027 semester 1 dibuka saat perubahan ini. Pengelola tetap dapat menutup periode secara sengaja.

Musyrif melihat seluruh santri aktif dalam unit penugasan yang diturunkan dari master santri dan penugasan petugas di server. MA Ikhwan berbeda dari MA Akhwat maupun SMA/SMP. Hak lintas unit tidak diberikan.

Alur utama: cari santri → Isi ujian → konfirmasi materi → mulai mencatat. Peserta tidak perlu dipersiapkan terlebih dahulu. Pengacakan penguji oleh pengelola tetap tersedia, sedangkan anggota unit dapat mengambil sesi pertama ketika pembagian lapangan berbeda. Penguji aktual dicatat dalam audit. Draf yang sudah dimulai hanya dapat diubah oleh penguji aktual atau pimpinan, sehingga dua penguji tidak menimpa data. Anggota unit lain dapat melihat hasil sesuai unitnya; nilai final dan riwayat remedial tetap dipertahankan.

Daftar seluruh santri menggunakan aksi `roster`; `begin-student` menyiapkan satu peserta secara atomik setelah cakupan dikonfirmasi. Modul lain tidak menerima perluasan izin ini. Netlify tidak diperbarui.

---

# Ujian Tahfidz Semester Nuris

Cloudflare only, 3 November 2026. Netlify is not rebuilt or deployed by this release.

## Operation

Pimpinan opens Ujian Tahfidz → Pengaturan, creates a period (2026/2027, semester 1), and checks “Buka periode”. Optional unit coordinators are assigned here; active musyrif already qualify as examiners for their current units. No new passwords are needed.

Pengelola chooses “Siapkan peserta”, selects students with the same verified coverage, confirms their range and target status, then saves. Examiners are balanced within the exact unit; own halaqah is avoided when another examiner is available. Different coverage should be prepared separately. Full Juz 30 uses 78:1–114:6; other juz and partial ranges are supported. Fewer than approximately five pages uses basic competence. Existing baris/juz fields are context; no undocumented verse range is inferred from them.

Penguji opens their participant, records errors, marks each question complete, reviews and finalizes. Draft changes remain in sessionStorage for that account/tab and can be recovered on refresh for 24 hours. Save and question changes send to the server; individual error taps do not. A successful save is shown only after the server replies. A stale version is rejected; it must be reconciled before overwriting server data.

Khafi −0.5, Jali −1, prompted forgetting −3, unable to answer −10 (once per question). Reclassify the last forgetting incident using the dedicated button; the same event then costs 10 instead of 13. Score starts at 100, minimum zero, KKM 75. The minimum four completed questions is OFF unless explicitly enabled by management. Full basic competence averages Al-Fatihah (memorized) and An-Najm 1–18 (read from mushaf), requires both components, and disallows forgetting penalties for tilawah.

Final results support PDF downloads and scoped CSV recap. Management can schedule a new remedial/revision attempt with examiner, date and reason; previous scores remain immutable. Management explicitly chooses whether to publish a final memorization score to the legacy rapor. Only tahfidz fields change; other aspects remain. Basic competence cannot replace the legacy memorization score. Publishing also queues the existing UjianSemester Sheets synchronization; no new independent Sheets writer is created. Queue delivery itself is not verified by this release.

## Data and security

Existing public.santri, hafalan, akun, sesi and ujian_semester remain the source of identity/student/report data. New private schema tahfidz_exam contains periods, staff, assignments, attempts, questions, error_events, audit and requests. RLS is enabled and anon/authenticated have no schema/table permissions. The authenticated server checks live session and account metadata, exact unit, examiner and musyrif access. Scores are recomputed server-side. Assignment/attempt row locks, expected versions and payload-bound request IDs prevent duplicate or conflicting submissions. Rule and coverage snapshots preserve historical attempts.

The independent Supabase Edge Function ujian-tahfidz shares the existing session system. Existing api and kepesantrenan functions were not changed. Cloudflare serves static assets first; there are no new Worker API invocations, realtime subscriptions or polling loops. The initial exam JS is approximately 29 KB before compression; PDF libraries load on demand.

## Sources and selection

quran-metadata.json contains verse IDs, keys, page numbers and juz only, retrieved from the Quran Foundation public v4 by_juz API on 3 November 2026. It contains 6,236 unique verses over 30 juz and no generated Quran text. https://api-docs.quran.com/docs/content_apis_versioned/4.0.0/verses-by-page-number/

Selection splits the available verse metadata by page and half-page candidate groups, and saves its random seed and exact chosen ranges. Verse counts are only an approximation of half a printed page: the examiner must check the requested answer length and page boundaries on the standard 604-page Madani mushaf. Full Juz 30 first four questions are restricted to surah groups 78–81, 82–87, 88–94, 95–114; the fifth is random. Partial ranges spread five locations within the verified range.

## Build and verification

npm run build:ujian
node ecosystem/cloudflare/apply-exam.mjs
npm run test:ujian
npm run test:ekosistem
npm run lint

Twelve tests cover scoring boundaries, selection, unit permissions, real SQL lifecycle in isolated PostgreSQL/PGlite, replay keys, stale writes, competing finalization calls, immutable history, remedial, report integration and denied anon access. The isolated test pool serializes transactions and does not simulate distributed production load. Thirty-one existing ecosystem tests also pass. No production student data is used in tests.

Creating production test accounts/sessions was rejected by automatic review. No such accounts, sessions or students were created. Authenticated production end-to-end testing and physical iPhone acceptance remain for authorized users. Production period, assignment and attempt counts were zero after installing the module; management configuration is still required.

## Deployment and rollback

Additive migration: schema.sql. Supabase function sources: ../functions/ujian-tahfidz. The engine and Quran metadata are copied from core by build.mjs; do not edit the generated copies independently. Frontend output: dist-cloudflare/ujian-tahfidz. Cloudflare-only registry and launcher patches are applied by ../cloudflare/apply-exam.mjs. The latest live header/appearance fixes were retained.

Before this release the active Cloudflare version was 4723982e-4d4e-4db2-b78f-f2e8795e813a. Roll back hosting to that version if needed. Keep the additive exam tables and recorded history; do not drop the schema. Close the exam period to stop writes. Existing Netlify sites remain available.

Baseline verification: public.santri 856, public.akun 64, public.ujian_semester 0; unchanged after migration. Counts are not backups. This release does not claim a full database backup/restore test. No operational records or existing columns were migrated or removed.

## Future Netlify use

The frontend, pure engine and Supabase API are hosting-independent. Netlify can serve the static exam directory and navigation later; add the exact approved origin to the new API CORS allowlist. No second scoring implementation or database is needed. A Netlify deployment/runtime check was intentionally not performed because the user requested Cloudflare first.

## API actions

POST Supabase /functions/v1/ujian-tahfidz with Authorization Bearer existing mut_token.
Read actions: bootstrap, participants, candidates, load, history, report.
Writes (request_id UUID required): period, staff, prepare, reassign, start, save, finalize, publish.
GET returns public module version only. OPTIONS provides exact-origin CORS.


## November 3 usability update

Restart now submits directly without a reason/note screen and returns a first-attempt student to “Belum diuji”. The server records an automatic audit reason, archives the old draft as BATAL, clears it from operational scores, and lets another authorized teacher in the same unit start. Finalized results remain protected. Existing final results are retained if a remedial draft is cancelled. Optimistic locking and idempotency checks remain enforced.

The mobile roster uses full-width student names with actions below, and the exam uses compact error counters. Five-question selection and the current half-point scoring rules are unchanged. The Cloudflare Mutabaah bundle groups monitor rows by teacher and unit; it retains halaqah labels and recomputes counts/status totals. Netlify bundles are unchanged. Tests: 14 exam/SQL tests and 6 portal/navigation/monitor tests, plus TypeScript validation. Production authenticated flows still require the user's session for acceptance.

One certification record for the user-identified class-10 Taqy student was deleted at the owner's explicit request. Its full pre-deletion row is retained in the existing protected database audit, and a matching Spreadsheet delete was queued. Other students and their operational records were not changed.

Release verification: Supabase ujian-tahfidz v5 is active; Cloudflare deployment 8c740e249704437bbd498cdb69b3d758. The deployed exam JS/CSS, monitor helper, Mutabaah HTML/bundle, root HTML and portal script match the prepared source. Public login rendering and practice scoring were checked in the browser; no production credentials were used.
