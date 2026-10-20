export type UserRole = 'MUSYRIF' | 'KOORDINATOR' | 'KASIE_KEPESANTRENAN';
export type UnitPesantren = 'SMP' | 'MA' | 'SMA';
export type UnitFilter = 'ALL' | 'SMP' | 'MA' | 'SMA';

export interface UserAccount {
  id: string;
  nama: string;
  username: string;
  role: UserRole;
  unit: 'ALL' | UnitPesantren;
  is_active: boolean;
  email?: string;
  title?: string;
  password_hash?: string; // only stored locally or in DB, never exposed in public profile
  created_at?: string;
  updated_at?: string;
}

export interface Santri {
  id: string;
  nis: string; // alias kode_santri
  nama: string;
  kelas: string; // e.g. "7A", "8B", "10.1", "11.1", "12.3"
  unit: UnitPesantren;  // 'SMP' | 'MA' | 'SMA'
  totalPoin: number;
  statusPembinaan?: 'Baik' | 'Peringatan Lisan' | 'SP 1' | 'SP 2' | 'SP 3' | string;
  lingkungan?: 'PUTRA' | 'PUTRI';
  musyrifId?: string;
  musyrifNama?: string;
  musyrif?: string;
  asrama?: string;
  keterangan?: string;
  kamar?: string;
}

export type PelanggaranKategori = 'Ringan' | 'Sedang' | 'Berat' | 'Sangat Berat' | 'Sangat Ringan';

export interface Pelanggaran {
  id: string;
  kode: string;
  jenis: string;
  kategori: PelanggaranKategori;
  poin: number;
  konsekuensi: string;
}

export interface MasterPembinaan {
  id: string;
  tingkat: number;
  nama_tingkat: string;
  min_poin: number;
  max_poin: number;
  jenis_pembinaan: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  minPoin?: number;
  maxPoin?: number;
  konsekuensi?: string;
  kategori?: string;
  rentangPoin?: string;
  pembina?: string;
}

export interface RiwayatPelanggaran {
  id: string;
  tanggal: string; // e.g. "25 Agu 2026, 16.38 WIB"
  timestamp: string; // ISO date for sorting
  santriId: string;
  santriNama: string;
  santriKelas: string;
  santriUnit: UnitPesantren;
  lingkungan?: 'PUTRA' | 'PUTRI';
  jenisPelanggaranId: string;
  jenisPelanggaranNama: string;
  poin: number;
  hukuman: string;
  pembinaanTingkat?: string;
  rekomendasiPembinaan?: string[];
  status: 'Selesai' | 'Belum Selesai';
  selesaiOleh?: string;
  selesaiOlehNama?: string;
  selesaiPada?: string;
  isNotifHidden?: boolean;
  catatan?: string;
  pencatat: string;
  pencatatId?: string;
}

export interface PembinaanRecord {
  id: string;
  santriId: string;
  santriNama: string;
  santriKelas: string;
  santriUnit: UnitPesantren;
  lingkungan?: 'PUTRA' | 'PUTRI';
  pelanggaranTerkaitId?: string;
  pelanggaranTerkaitJenis?: string;
  jenisPembinaan: string; // 'Teguran/Nasihat' | 'Peringatan' | 'Tugas pembinaan' | 'Hafalan' | 'Kebersihan' | 'Konseling' | 'Surat Pernyataan' | 'Pemanggilan orang tua/wali' | 'Pembinaan khusus'
  tanggal: string;
  tanggalTargetSelesai?: string;
  pembina: string;
  pembinaId?: string;
  catatan: string;
  status: 'BELUM DIMULAI' | 'PROSES' | 'SELESAI';
  tanggalSelesai?: string;
  selesaiOleh?: string;
  isNotifHidden?: boolean;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  sourceId: string;
  title: string;
  desc: string;
  timestamp: string;
  timeFormatted: string;
  type: 'pelanggaran' | 'pembinaan';
  unit: UnitPesantren;
  lingkungan?: 'PUTRA' | 'PUTRI';
  santriId: string;
  santriNama: string;
  santriKelas: string;
  caseType: string;
  poin?: number;
  status: 'Selesai' | 'Belum Selesai' | 'SELESAI' | 'PROSES' | 'BELUM DIMULAI' | string;
  isSelesai: boolean;
  pencatatOrPembina: string;
  pencatatId?: string;
  musyrifId?: string;
}

export type ThemeMode = 'light' | 'dark';

export type PageRoute = 
  | 'login'
  | 'dashboard'
  | 'data-santri'
  | 'catat-pelanggaran'
  | 'rekap-pelanggaran'
  | 'data-pelanggaran'
  | 'kamus-pelanggaran'
  | 'input-mutabaah'
  | 'data-pembinaan'
  | 'riwayat-pembinaan'
  | 'laporan-pembinaan'
  | 'manajemen-user'
  | 'akun';

export interface UserProfile extends UserAccount {
  // Backwards compatibility alias for components
}


