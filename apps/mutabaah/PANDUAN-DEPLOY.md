# Deploy Mutabaah Tahfidz Nurista ke akun Netlify pesantren

Alamat tujuan: **https://mutabaahtahfidznurista.netlify.app**
Akun: kepesantrenannuris2026@gmail.com

> Netlify Drop (seret-lepas folder) **tidak bisa** dipakai. Aplikasi ini punya server dan database
> yang harus di-*build* oleh Netlify. Gunakan cara GitHub di bawah (tanpa instal apa pun).

---

## Langkah 0 — Perbarui Apps Script (wajib, 3 menit)

1. Buka Spreadsheet mutabaah → **Ekstensi → Apps Script**.
2. Buka file **Api.gs**, hapus semua isinya, lalu tempel isi file `gas/Api.gs` dari paket ini.
3. Klik **Simpan**.
4. **Deploy → Kelola deployment → ikon pensil (Edit) → Versi: Versi baru → Deploy.**
   URL `/exec` **tidak berubah**, jadi tidak perlu disalin ulang.
5. (Opsional) Pilih fungsi `siapkanSheetHadisArbain` lalu **Jalankan** agar sheet `HadisArbain` langsung dibuat.

## Langkah 1 — Unggah kode ke GitHub

1. Masuk/daftar di **github.com** memakai email pesantren.
2. Klik **+** (kanan atas) → **New repository**.
   - Repository name: `mutabaahtahfidznurista`
   - Pilih **Private** (wajib — kode berisi nomor WA musyrif).
   - Klik **Create repository**.
3. Pada halaman repo yang kosong, klik tautan **uploading an existing file**.
4. Ekstrak zip ini di komputer, buka foldernya, **pilih semua isi folder** (bukan foldernya),
   lalu seret ke halaman GitHub. Pastikan folder `app`, `components`, `lib`, `netlify`, `public`
   dan file `package.json`, `netlify.toml` ikut terunggah.
5. Klik **Commit changes**.

## Langkah 2 — Buat project di Netlify

1. Masuk ke **app.netlify.com** dengan akun pesantren.
2. **Add new project → Import an existing project → GitHub** → izinkan akses → pilih repo
   `mutabaahtahfidznurista`.
3. **Project name:** `mutabaahtahfidznurista`
4. Build settings biasanya terisi otomatis dari `netlify.toml`
   (Build command `npm run build`, Publish directory `.next`). Biarkan.
5. Klik **Add environment variables** dan isi **dua** variabel berikut
   (nilainya dikirim terpisah lewat chat, jangan ditulis di GitHub):

   | Key        | Value                                  |
   |------------|----------------------------------------|
   | `GAS_URL`  | URL Web App Apps Script (berakhiran `/exec`) |
   | `SYNC_KEY` | kode rahasia sinkronisasi (sama dengan `SYNC_SECRET` di Apps Script) |

6. Klik **Deploy**. Tunggu ±3–5 menit sampai status **Published**.

> Jika log deploy meminta database diaktifkan, buka menu **Extensions / Database** di project itu,
> aktifkan **Netlify Database**, lalu **Deploys → Trigger deploy**.

**JANGAN login ke aplikasi baru dulu.** Lanjut ke Langkah 3.

## Langkah 3 — Pindahkan data (urutan penting)

1. Kabari admin bahwa situs baru sudah *Published*. Admin menonaktifkan alamat lama
   (`mutabaahnurista.netlify.app`) dan memastikan semua data lama sudah terkirim ke Spreadsheet.
2. Setelah alamat lama nonaktif, **login pertama kali sebagai pimpinan** di
   https://mutabaahtahfidznurista.netlify.app
   Aplikasi otomatis menarik seluruh data (akun, santri, setoran, hafalan, sertifikasi) dari
   Spreadsheet. Tunggu ±1–2 menit, lalu muat ulang halaman.
3. Cek di menu **Akun → Cadangan Spreadsheet**: status **terhubung**, jumlah santri sesuai.
4. Bagikan alamat baru ke musyrif/musyrifah.

Mengapa urutannya begini? Aplikasi baru menyalin data dari Spreadsheet **hanya saat login pertama**.
Jika alamat lama masih dipakai setelah itu, isian baru di alamat lama tidak akan ikut pindah.

---

## Memperbarui aplikasi di kemudian hari
Unggah file yang berubah ke repo GitHub yang sama (Add file → Upload files → Commit).
Netlify otomatis membangun ulang dalam beberapa menit.
