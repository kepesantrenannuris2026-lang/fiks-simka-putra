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
