# Rapor Pesantren (per kamar)

Subapp baru di `/rapor-pesantren/`. Musyrif (wali kamar) merekap nilai santri kamarnya, memeriksa rapor, mengubah langsung di pratinjau, lalu mencetak atau mengunduh PDF (satu santri atau sekamar). Pimpinan membuka semua kamar, mengatur wali kamar, memindahkan santri, dan mengisi pengaturan rapor.

## Isi rapor (Panduan Aplikasi Kepesantrenan + format "Rapor Santri")
| Bagian | Skala | Sumber otomatis (dipakai bila kotak dikosongkan) |
|---|---|---|
| A. Ibadah (8 butir) | A–D | Mutabaah Yaumiyyah semester (skor % → A ≥90, B ≥80, C ≥70, D <70) |
| B. Akhlak (5 butir) | A–D | — |
| C. Kajian Kitab (per jenjang & kelas) | 1–100 | — (daftar kitab dapat diubah di Pengaturan) |
| D. Praktik Ibadah (praktik + lisan sesuai kelas/putra-putri) | 1–100 | Ujian Praktik Ibadah (periode yang namanya memuat semester & tahun ajaran) |
| E. Hadis Arbain Nawawi | jumlah hadis | Setoran hadis `hafal` di Mutabaah Tahfidz; tuntas bila ≥ target kelas |
| F. Pidato (Arab, Inggris) | 1–100 | — |

Standar ketuntasan sama dengan Mutabaah Tahfidz: KKM 75; predikat angka A ≥90, B ≥80, C ≥70, D <70. Semua butir dan judul bagian disertai terjemahan Arab.

## Komponen
- `src/` — TypeScript tanpa dependensi (UI, rapor, PDF). Build: `npx esbuild src/main.ts --bundle --format=iife --charset=utf8 --target=es2020 --outfile=dist/app.js` dan `npx esbuild src/style.css --minify --outfile=dist/app.css`.
- PDF dibuat di browser (halaman HTML → kanvas → JPEG → PDF). Bila browser menolak, otomatis membuka dialog cetak.
- Backend: Supabase Edge Function `rapor-pesantren` (`ecosystem/functions/rapor-pesantren`), sesi akun Mutabaah. Skema privat `rapor_pesantren` (`schema.sql`): `kamar`, `anggota`, `nilai` (berversi, cegah tabrakan), `pengaturan`, `audit`, `impor_tidak_cocok`.
- Data kamar 2026/2027 diimpor dari spreadsheet "2027" (112 kamar, 847 dari 850 santri aktif cocok otomatis).

## Status hosting (18 November 2026)
Versi Cloudflare yang tayang (commit f73a8f1, Ujian Praktik Ibadah) tidak ada di GitHub, jadi aset lama dipertahankan (`keep_assets`) dan Worker melayani `/rapor-pesantren/*` sebagai modul teks. Konsekuensi: `/apps.js` dan `/nuris-glass.*` lama tetap dilayani apa adanya (Cloudflare mengabaikan `run_worker_first` saat `keep_assets`). Liquid Glass v2 baru aktif di Rapor Pesantren.

Untuk mengaktifkan kartu di portal dan Liquid Glass v2 di semua aplikasi, pada rakitan penuh `dist-cloudflare` (dari sumber f73a8f1):
1. salin `dist/app.js`, `dist/app.css`, `index.html` ke `dist-cloudflare/rapor-pesantren/`;
2. ganti `dist-cloudflare/nuris-glass.js` dan `nuris-glass.css` dengan `ecosystem/glass/nuris-glass.js` dan `ecosystem/glass/dist/nuris-glass.css`;
3. tambahkan entri berikut ke `window.NURIS_APPS` di `apps.js` (setelah `yaumiyyah`):
   `{id:'rapor-pesantren',name:'Rapor Pesantren',short:'Rapor Pesantren',path:'/rapor-pesantren/',requires:'mutabaah',nav:false,icon:'award',description:'Rekap nilai ibadah, akhlak, kajian kitab, praktik ibadah, hadis arbain, dan pidato per kamar. Pratinjau dan ubah rapor, lalu cetak atau unduh PDF.',label:'Rapor kepesantrenan'}`
4. `wrangler deploy` dengan `ecosystem/cloudflare/worker.mjs` (atau Worker lama; berkas rapor menjadi aset biasa).
