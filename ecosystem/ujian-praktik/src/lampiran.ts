// Lampiran Ujian Praktik & Lisan Semester 1 2026/2027 — berkas di Google Drive Kepesantrenan
// (folder "UJIAN PRAKTIK DAN LISAN SMTR 1 26-27", akses: siapa saja yang memiliki tautan dapat melihat).
// - Bank soal lisan dicocokkan per TINGKAT & jenis kelamin (grup "7-putra", "8-putri", …) dan tampil pada subujian lisan.
// - Panduan materi praktik dicocokkan per MATERI (kunci rubrik) dan tampil pada subujian praktik yang sama.
// - Juklak berlaku untuk semua tingkat.
import { GRUP } from './materi';

export type Lampiran = { id: string; judul: string; jenis: 'bank' | 'panduan' | 'juklak'; berkas: 'pdf' | 'gambar'; grup?: string[]; materi?: string[] };
export const FOLDER = 'https://drive.google.com/drive/folders/1DqDIF63uJdvJRaN02E6zgUs9GpAgmFud';

export const LAMPIRAN: Lampiran[] = [
  { id: '1_2_vvSGng9x_cqQ60GG3X68Or0kXZD62', judul: 'Bank Soal Ujian Lisan Kelas 7 (Putra-Putri)', jenis: 'bank', berkas: 'pdf', grup: ['7-putra', '7-putri'] },
  { id: '1BVLbWQMra0-esN6itp_SMrzlwjfYPm8l', judul: 'Bank Soal Ujian Lisan Kelas 8 Putra', jenis: 'bank', berkas: 'pdf', grup: ['8-putra'] },
  { id: '1J70wbY-LVpnIQt8w-dJj4tk_L4Va6bS8', judul: 'Bank Soal Ujian Lisan Kelas 8 Putri (kajian & fikih perempuan)', jenis: 'bank', berkas: 'pdf', grup: ['8-putri'] },
  { id: '1fEf4e7z2m5nwprJbQiYOjY7htuEzmDD9', judul: 'Bank Soal Ujian Lisan Al-Matsurat Kelas 9', jenis: 'bank', berkas: 'pdf', grup: ['9-putra', '9-putri'] },
  { id: '1r_U1KNce8HZ7xe5VlxIhwA1wCMAgxeVT', judul: 'Bank Soal Ujian Lisan Kelas 10 (Putra-Putri)', jenis: 'bank', berkas: 'pdf', grup: ['10-putra', '10-putri'] },
  { id: '1KZyBrrqVq4Ra3bT6iabZ0BwBNlMpsClJ', judul: 'Bank Soal Ujian Lisan Kelas 11 Putra', jenis: 'bank', berkas: 'pdf', grup: ['11-putra'] },
  { id: '15jeUY2tVOABYeNyNQvqP-3Iihm4fqtI9', judul: 'Bank Soal Ujian Lisan Kelas 11 Putri (kajian & fikih perempuan)', jenis: 'bank', berkas: 'pdf', grup: ['11-putri'] },
  { id: '1_bqkC7UjYkzjJOXfBdmEBgAeX5Lbn7ov', judul: 'Fikih Azan dan Iqamah', jenis: 'panduan', berkas: 'pdf', materi: ['azan'] },
  { id: '1J_FBW51k5OC8HAgxAnCbMXEhencpSvPz', judul: 'Ringkasan Salat Jenazah', jenis: 'panduan', berkas: 'pdf', materi: ['jenazah'] },
  { id: '1_40nsrVSyJXsJH_6ktqjjkjOysspwjOT', judul: 'Panduan Ujian Praktik Haji', jenis: 'panduan', berkas: 'pdf', materi: ['haji'] },
  { id: '1WEqY47VhiU3HSp9kPcBhMz8gL0ym2rA8', judul: 'Gambar Manasik Haji', jenis: 'panduan', berkas: 'pdf', materi: ['haji'] },
  { id: '1660LkHzisF4XUHYA1SMpUnE95GA2bYp_', judul: 'Ilustrasi Urutan Manasik Haji', jenis: 'panduan', berkas: 'gambar', materi: ['haji'] },
  { id: '1WmCBquL_AXdi5RQg8h0B6uniuyMDLkOc', judul: 'Juklak Ujian Praktik & Lisan Fikih', jenis: 'juklak', berkas: 'pdf' },
];

export const lihatUrl = (l: Lampiran) => `https://drive.google.com/file/d/${l.id}/view`;
export const pratinjauUrl = (l: Lampiran) => `https://drive.google.com/file/d/${l.id}/preview`;
export const unduhUrl = (l: Lampiran) => `https://drive.google.com/uc?export=download&id=${l.id}`;

// Bank soal untuk satu grup (tingkat-jenis kelamin).
export const bankSoalOf = (grup: string | null) => (grup ? LAMPIRAN.filter((l) => l.jenis === 'bank' && l.grup?.includes(grup)) : []);
// Lampiran untuk satu subujian santri: subujian lisan → bank soal tingkatnya; subujian praktik → panduan materinya.
export function lampiranSub(grup: string | null, key: string, jenis: 'praktik' | 'lisan') {
  return jenis === 'lisan' ? bankSoalOf(grup) : LAMPIRAN.filter((l) => l.jenis === 'panduan' && l.materi?.includes(key));
}
// Semua lampiran satu grup sesuai materi yang berlaku (untuk halaman Bank soal).
export function lampiranGrup(grup: string, materi: string[]) {
  const panduan = LAMPIRAN.filter((l) => l.jenis === 'panduan' && l.materi?.some((m) => materi.includes(m)));
  return { bank: bankSoalOf(grup), panduan };
}
export const JUKLAK = LAMPIRAN.filter((l) => l.jenis === 'juklak');
export const GRUP_TANPA_BANK = GRUP.filter((g) => !bankSoalOf(g).length);
