# Mutabaah Tahfidz — build untuk portal Cloudflare

Sumber aplikasi Mutabaah (Next.js statis + kode API untuk fungsi Supabase `api`).

## Frontend (portal Cloudflare, /mutabaah)
```
cd apps/mutabaah && npm ci
NEXT_PUBLIC_BASE_PATH=/mutabaah NEXT_PUBLIC_PORTAL=1 \
NEXT_PUBLIC_API_URL=https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan/mutabaah npm run build
```
Netlify memakai build biasa (`npm run build` tanpa variabel di atas).

## Kode API
Fungsi Supabase `api` adalah pemuat kecil (`edge/loader-remote.ts`) yang mengambil kode aplikasi terenkripsi
dari aset Cloudflare `/_k/<id>.txt` (tanpa egress Supabase; cadangan di tabel `kode`).
```
KODE_KUNCI=<kunci pemuat terpasang> KODE_ID=<id> node edge/build-remote.mjs
```
lalu rakit paket: `MUTABAAH_OUT=apps/mutabaah/out KODE_API=apps/mutabaah/edge/dist/kode-<id>.txt node ecosystem/cloudflare/rakit-perbaikan.mjs`.
Kunci TIDAK disimpan di repo.

## Rapor
`lib/raporPdf.ts` — rapor Al-Qur'an satu lembar F4 (215 × 330 mm) per santri; data dari `susunRapor` di `lib/core.ts`.
Ringkasan rapor ikut tersalin ke tab `UjianSemester` di spreadsheet (kolom murajaah, status ujian/tahsin, S/I/A, kamar).
