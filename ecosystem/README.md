# Kepesantrenan Nuris

Satu portal untuk Mutabaah Tahfidz dan SIMKA Putra. Sumber akun dan password tetap `public.akun` Mutabaah. Portal dan kedua modul memakai satu token sesi Mutabaah. Tidak ada salinan password dalam kode, browser, tabel SIMKA, atau Git.

SIMKA memakai skema privat `simka`; master santri dibaca langsung dari Mutabaah (santri aktif Ikhwan). Data pelanggaran dan pembinaan terpisah. Pimpinan mendapat akses semua unit Putra; musyrif hanya unit Putra yang ditugaskan dalam Mutabaah. Akun tanpa penugasan Putra tetap dapat menggunakan Mutabaah.

## Build

Dari root repositori: `npm ci && npm run build:ekosistem`. Hasil ada di `dist-ekosistem`. Netlify: publish `dist-ekosistem`, command `npm run build:ekosistem`.

Backend: Supabase Edge Function `kepesantrenan`, autentikasi sesi dan pemeriksaan akun aktif dilakukan di server pada setiap permintaan. Migration `ecosystem/schema.sql` membuat schema privat tanpa membuka akses anon.

Daftar aplikasi ada di `portal/apps.js`. Untuk menambahkan aplikasi, tambahkan entri registry dan adapter autentikasi yang memverifikasi sesi server.

## Sumber visual

Identitas dari SIMKA Putra dan Mutabaah Nuris yang sudah ada: logo resmi, hijau tua, latar putih, huruf sans, navigasi rapat. Panduan Refero craft-details untuk formulir berlabel, focus-visible, target sentuh dan URL navigasi. Refero live tidak tersedia karena langganan tidak aktif; tidak diperlukan untuk mempertahankan desain produk yang ada.

## Batas migrasi

Tidak ditemukan database SIMKA produksi pada akun Supabase Kepesantrenan Nuris. Integrasi ini tidak mengimpor atau mengganti data SIMKA dari akun lain. Riwayat pelanggaran dan pembinaan baru mulai kosong. Jangan jalankan SQL lama SIMKA yang memberi anon akses penuh atau membuat akun contoh.

## SIMKA Putri — 29 October 2026
The portal now has Mutabaah, SIMKA Putra (/simka/) and SIMKA Putri (/simka-putri/). The two SIMKA modules share the Mutabaah design and maintained application core, with separate build identities, separate session keys, separate private schemas and server-derived campus assignments. Putri violation and coaching master data are preserved from https://github.com/mlwildan12-arch/NEW-SIMKA-PUTRI-V1 at commit 6b41d701de50e3d1ee774a7f5b2f38388304881a. No sample credentials or students are used. Existing histories from a separate legacy Putri database are not imported.

The additive putri-schema.sql + putri-catalogues.sql migration has been applied. Do not rerun it in the dashboard. The kepesantrenan Edge Function v3 supports both modules and normalizes legacy localized incident dates. The original Mutabaah API is unchanged.

Deploy the complete dist-ekosistem output to the existing kepesantrenannuris project and complete dist-mutabaah output to mutabaahtahfidznurista. Each ZIP has index.html at its root; do not upload only /simka-putri/ over the entire portal. No manual SQL or account/password reset is needed.

## Mutabaah Yaumiyyah and liquid glass navigation
New /yaumiyyah/ module uses Mutabaah session and exact musyrif-to-student assignment (both campuses); leaders retain global access. Data is in the private yaumiyyah schema; no existing student, tahfidz or SIMKA rows are changed. Each daily record has optimistic version checks and audit logging.

The module records the booklet's 15 activities, with explicit empty, zero and non-assessed values. Monthly and academic-semester PDF reports include the official Nuris mark, grade, coverage, provisional status, daily notes, musyrif and the six official coordinator mappings. Thresholds: A+ >=95, A >=85, B+ >=75, B >=65, C below65. Scores cap each assessment period at 100%; all activity weights are equal. Incomplete reports are provisional. The PDF sample files use only fictional students.

liquid-glass.js is copied and injected into the portal and all four app entrypoints and the legacy Mutabaah site. Deploy the complete v4 portal ZIP and legacy navigation ZIP to their existing projects. No manual SQL is needed; the additive schema and Edge Function v4 have already been applied.
