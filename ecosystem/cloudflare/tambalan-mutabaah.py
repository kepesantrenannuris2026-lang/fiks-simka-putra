#!/usr/bin/env python3
"""Tambalan untuk build Mutabaah yang sedang aktif di Cloudflare (sumber build f73a8f1 tidak tersedia, jadi build tidak diganti).

1. Chunk lazy yang hilang dari deployment (jsPDF & dependensinya) diambil dari build Netlify lama dengan nama-hash yang sama
   (nama berisi hash isi, jadi isinya identik). Tanpa ini Pratinjau/PDF Rapor semester tidak menampilkan apa pun.
2. PDF Rapor Al-Qur'an: cap & tanda tangan Kabid (Ust. Farros) dicetak di atas nama, ukuran lazim rapor
   (cap ±32 mm, tanda tangan ±28 mm). Satuan PDF = 215/165 mm.
Keluaran: JSON yang dibaca pembantu deploy ({fetch:[...], patch:[...]}).
"""
import json, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parents[1]
src = (root / 'shared' / 'pengesahan.ts').read_text()
def data_url(name):
    m = re.search(name + r"\s*=\s*['\"`](data:image/png;base64,[A-Za-z0-9+/=]+)", src)
    if not m: raise SystemExit('gambar tidak ditemukan: ' + name)
    return m.group(1)
CAP, TTD = data_url('CAP'), data_url('TTD_KABID')

U = 215 / 165  # mm per satuan logis
cap_mm, ttd_w_mm, ttd_h_mm = 32, 28, 28 * 202 / 180
cap, tw, th = cap_mm / U, ttd_w_mm / U, ttd_h_mm / U
# $ = tengah kolom kiri (Kabid), X = garis dasar nama. Cap sedikit ke kiri, tanda tangan di tengah, keduanya menimpa nama.
inject = (f'e.addImage({json.dumps(CAP)},"PNG",$-{cap*0.86:.2f},X-{cap*0.9:.2f},{cap:.2f},{cap:.2f},"nuris-cap","FAST"),'
          f'e.addImage({json.dumps(TTD)},"PNG",$-{tw*0.2:.2f},X-{th*0.87:.2f},{tw:.2f},{th:.2f},"nuris-ttd","FAST"),')
CH = '/mutabaah/_next/static/chunks/'
out = {
    'fetch': [
        {'from': 'https://mutabaahtahfidznurista.netlify.app/_next/static/chunks/' + n, 'to': CH + n}
        for n in ('164f4fb6.8af40f7df63a03b3.js', 'bc98253f.d6fc8a0138855acd.js')
    ],
    'patch': [
        {'path': CH + '443.c56b9f41dc7a083f.js', 'find': 'ee(a.ttd.kepala.nama,$),', 'replace': 'ee(a.ttd.kepala.nama,$),' + inject, 'marker': 'nuris-cap'},
    ],
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(out))
print('tambalan:', len(out['fetch']), 'ambil,', len(out['patch']), 'ubah;', f'cap {cap:.1f} satuan, ttd {tw:.1f}x{th:.1f}')
