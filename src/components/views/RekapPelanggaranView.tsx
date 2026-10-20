import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PointBadge } from '../common/PointBadge';
import { UnitPesantren, PelanggaranKategori, RiwayatPelanggaran, Santri } from '../../types';
import { exportRiwayatPelanggaranPDF, getOfficialKategori } from '../../lib/exportPelanggaranPdf';
import { generatePembinaanFormData, parseIncidentDate } from '../../lib/pembinaanHelper';
import { exportMutabaahPembinaanPDF } from '../../lib/exportPembinaanPdf';
import { EditKasusPelanggaranModal } from '../common/EditKasusPelanggaranModal';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  GraduationCap,
  Download,
  Filter,
  Calendar,
  Building2,
  Layers,
  RotateCcw,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  Clock,
  Edit,
  FileSpreadsheet
} from 'lucide-react';
import { mapJabatanToRole } from '../../lib/auth';

export const RekapPelanggaranView: React.FC = () => {
  const {
    user,
    usersList,
    riwayatList,
    allRiwayatList,
    deleteRiwayatPelanggaran,
    santriList,
    allSantriList,
    pelanggaranList,
    masterPembinaanList,
    allPembinaanList,
    getPembinaanBySinglePoin,
    setSelectedSantriForDetail,
    showToast,
    markCaseSelesai
  } = useApp();
  
  const userRole = user ? mapJabatanToRole(user.role) : null;
  const isSuperadmin = userRole === 'KASIE_KEPESANTRENAN';
  const isKoordinator = userRole === 'KOORDINATOR';
  const isMusyrif = userRole === 'MUSYRIF';
  const canExport = isSuperadmin || isKoordinator;

  // Izin download Mutabaah Pembinaan
  const canDownloadMutabaah = (log: RiwayatPelanggaran, santri: Santri | undefined) => {
    if (isSuperadmin) return true;
    if (isKoordinator) return user?.unit === log.santriUnit;
    if (isMusyrif) {
      if (!santri || !user) return false;
      const isOwnBinaan =
        (santri.musyrifId && santri.musyrifId === user.id) ||
        (santri.musyrifNama && santri.musyrifNama.toLowerCase().trim() === user.nama.toLowerCase().trim()) ||
        (santri.musyrif && santri.musyrif.toLowerCase().trim() === user.nama.toLowerCase().trim());
      return Boolean(isOwnBinaan && santri.unit === user.unit);
    }
    return false;
  };

  // Izin edit kasus pelanggaran (Hanya Kasie/Superadmin & Koordinator unit)
  const canEditKasus = (logUnit: string) => {
    if (isSuperadmin) return true;
    if (isKoordinator) return user?.unit === logUnit;
    return false; // Musyrif tidak memiliki hak edit melalui revisi ini
  };

  // Izin hapus kasus pelanggaran (Hanya Kasie/Superadmin & Koordinator unit)
  const canDeleteKasus = (logUnit: string) => {
    if (isSuperadmin) return true;
    if (isKoordinator) return user?.unit === logUnit;
    return false; // Musyrif tidak memiliki hak hapus melalui revisi ini
  };

  const canMarkComplete = (logUnit: string) => {
    if (isSuperadmin) return true;
    if (isKoordinator) return user?.unit === logUnit;
    return false;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>(
    isSuperadmin ? 'ALL' : user?.unit || 'ALL'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [editingKasus, setEditingKasus] = useState<RiwayatPelanggaran | null>(null);
  const [isDownloadingMutabaah, setIsDownloadingMutabaah] = useState<string | null>(null);

  const [deletingLog, setDeletingLog] = useState<RiwayatPelanggaran | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [completingLog, setCompletingLog] = useState<RiwayatPelanggaran | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleDownloadMutabaah = (log: RiwayatPelanggaran) => {
    // 1. Resolve santri strictly by ID first, then fallback to name + unit matching
    const santri = allSantriList.find((s) => s.id === log.santriId) ||
      allSantriList.find(
        (s) => s.nama && log.santriNama && s.nama.toLowerCase().trim() === log.santriNama.toLowerCase().trim() && s.unit === log.santriUnit
      ) ||
      allSantriList.find(
        (s) => s.nama && log.santriNama && s.nama.toLowerCase().trim() === log.santriNama.toLowerCase().trim()
      );

    // 1. Validasi hak akses role
    if (!canDownloadMutabaah(log, santri)) {
      if (isMusyrif) {
        showToast('Akses Ditolak', 'Musyrif hanya berwenang mengunduh dokumen Mutabaah untuk santri binaannya.', 'error');
      } else if (isKoordinator) {
        showToast('Akses Ditolak', `Koordinator hanya berwenang mengunduh dokumen untuk santri Unit ${user?.unit}.`, 'error');
      } else {
        showToast('Akses Ditolak', 'Anda tidak memiliki hak untuk mengunduh dokumen mutabaah ini.', 'error');
      }
      return;
    }

    if (!santri) {
      showToast('Data Santri Tidak Ditemukan', 'Data profil santri tidak terdaftar di database.', 'error');
      return;
    }

    // 2. Validasi data pembinaan aktual tersedia di sistem
    const masterRule = getPembinaanBySinglePoin(log.poin);
    const recordedPembinaan = allPembinaanList.find(
      (p) => p.pelanggaranTerkaitId === log.id || (p.santriId === log.santriId && p.santriUnit === log.santriUnit)
    );

    const hasPembinaanData = Boolean(
      (log.rekomendasiPembinaan && log.rekomendasiPembinaan.length > 0) ||
      masterRule ||
      recordedPembinaan
    );

    if (!hasPembinaanData || log.poin < 5) {
      showToast(
        'Data Pembinaan Belum Tersedia',
        `Kasus pelanggaran ini (${log.poin} poin) belum memiliki ketentuan atau catatan tindak lanjut pembinaan resmi di sistem.`,
        'warning'
      );
      return;
    }

    setIsDownloadingMutabaah(log.id);
    try {
      const masterItem = pelanggaranList.find((p) => p.id === log.jenisPelanggaranId);
      const targetPelanggaranObj = {
        id: log.jenisPelanggaranId || log.id,
        kode: masterItem?.kode || 'P-01',
        jenis: log.jenisPelanggaranNama || masterItem?.jenis || 'Pelanggaran Kedisiplinan',
        kategori: (masterItem?.kategori || getOfficialKategori(log.poin).label) as any,
        poin: log.poin, // POIN KASUS ASLI DARI BARIS YANG DIPILIH
        konsekuensi: log.hukuman || masterItem?.konsekuensi || 'Pembinaan edukatif terukur'
      };

      const targetPembinaanObj = masterRule || {
        id: 'pbn-rule',
        tingkat: 1,
        nama_tingkat: log.pembinaanTingkat || 'Tingkat I',
        min_poin: 5,
        max_poin: 10,
        jenis_pembinaan: (log.rekomendasiPembinaan && log.rekomendasiPembinaan.length > 0)
          ? log.rekomendasiPembinaan
          : (recordedPembinaan ? [recordedPembinaan.jenisPembinaan] : ['Pembinaan ibadah dan adab']),
        is_active: true
      };

      // TANGGAL KEJADIAN ASLI: Parse timestamp ISO atau tanggal bahasa Indonesia
      // Menghindari fallback ke new Date() hari ini yang dapat mengubah tanggal/waktu di dokumen
      const incidentDate = parseIncidentDate(log.timestamp, log.tanggal);

      // Gunakan profil santri dengan total poin asli yang tersimpan (tanpa penambahan dobel)
      const targetSantri: Santri = {
        ...santri,
        id: santri.id || log.santriId,
        nama: log.santriNama || santri.nama,
        kelas: log.santriKelas || santri.kelas,
        unit: log.santriUnit || santri.unit,
        totalPoin: Number(santri.totalPoin) || 0
      };

      const formData = generatePembinaanFormData({
        santri: targetSantri,
        pelanggaran: targetPelanggaranObj,
        pembinaan: targetPembinaanObj,
        user,
        usersList,
        startDate: incidentDate,
        tanggalKejadianText: log.tanggal, // Teks asli waktu kejadian, misal: '25 Agu 2026, 16.38 WIB'
        isNewUnrecordedCase: false // Kasus sudah tercatat di sistem, JANGAN menambah poin!
      });

      // Murni operasi READ-ONLY: hanya menghasilkan file PDF untuk diunduh pengguna
      exportMutabaahPembinaanPDF(formData);

      showToast(
        'Mutaba\'ah Pembinaan Diunduh',
        `Dokumen PDF Mutaba\'ah Pembinaan untuk ${santri.nama} (${log.jenisPelanggaranNama}) berhasil dibuat.`,
        'success'
      );
    } catch (err: any) {
      console.error('[MUTABAAH DOWNLOAD ERROR]', err);
      showToast('Gagal Mengunduh Dokumen', err?.message || 'Terjadi kesalahan sistem saat membuat file PDF.', 'error');
    } finally {
      setIsDownloadingMutabaah(null);
    }
  };

  const handleConfirmComplete = async () => {
    if (!completingLog) return;
    setIsCompleting(true);
    try {
      const res = await markCaseSelesai(completingLog.id, 'pelanggaran');
      if (res.success) {
        setCompletingLog(null);
      }
    } finally {
      setIsCompleting(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    return riwayatList.filter((log) => {
      // 1. Search match
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        log.santriNama.toLowerCase().includes(q) ||
        log.jenisPelanggaranNama.toLowerCase().includes(q) ||
        log.santriKelas.toLowerCase().includes(q) ||
        (log.hukuman && log.hukuman.toLowerCase().includes(q)) ||
        (log.catatan && log.catatan.toLowerCase().includes(q));

      // 2. Unit match
      const matchUnit =
        selectedUnit === 'ALL' ||
        log.santriUnit === selectedUnit;

      // 3. Category match
      const calculatedKategori = getOfficialKategori(log.poin).label;
      const matchCategory =
        selectedCategory === 'All' ||
        calculatedKategori === selectedCategory ||
        (log as any).kategori === selectedCategory;

      // 4. Date Range match
      let matchDate = true;
      if (startDate || endDate) {
        const logDateStr = log.tanggal ? log.tanggal.slice(0, 10) : '';
        if (startDate && logDateStr && logDateStr < startDate) {
          matchDate = false;
        }
        if (endDate && logDateStr && logDateStr > endDate) {
          matchDate = false;
        }
      }

      return matchSearch && matchUnit && matchCategory && matchDate;
    });
  }, [riwayatList, searchQuery, selectedUnit, selectedCategory, startDate, endDate]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  const handleExportPDF = () => {
    if (!canExport) {
      showToast('Akses Ditolak', 'Hanya Kasie Kepesantrenan dan Koordinator yang dapat mengekspor laporan PDF.', 'error');
      return;
    }

    if (filteredLogs.length === 0) {
      showToast('Data Kosong', 'Tidak ada data riwayat pelanggaran untuk diekspor ke PDF.', 'warning');
      return;
    }

    try {
      exportRiwayatPelanggaranPDF(filteredLogs, {
        unitFilter: selectedUnit,
        searchQuery: searchQuery,
        userRole: user?.role,
        userName: user?.nama
      });

      showToast(
        'PDF Berhasil Dibuat',
        `Laporan PDF Riwayat Pelanggaran (${filteredLogs.length} data) berhasil diunduh.`,
        'success'
      );
    } catch (err: any) {
      console.error('[EXPORT PDF ERROR]', err);
      showToast('Gagal Membuat PDF', err?.message || 'Terjadi kesalahan sistem.', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLog) return;
    setIsDeleting(true);
    try {
      const success = await deleteRiwayatPelanggaran(deletingLog.id);
      if (success) {
        setDeletingLog(null);
      }
    } catch (err: any) {
      showToast('Gagal Menghapus', err?.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    if (isSuperadmin) setSelectedUnit('ALL');
    setSelectedCategory('All');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Page Header - Compact & Responsive */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-800 to-teal-900 p-4 sm:p-5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-emerald-200 text-[10px] font-bold tracking-wider mb-1">
              <History className="w-3 h-3" />
              <span>Rekam Jejak Kedisiplinan • {user ? (isSuperadmin ? (selectedUnit === 'ALL' ? 'Semua Unit' : `Unit ${selectedUnit}`) : `Unit ${user.unit}`) : ''}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Rekap Riwayat Pelanggaran
            </h1>
            <p className="text-[11px] sm:text-xs text-emerald-100 mt-0.5">
              Riwayat kronologis pencatatan pelanggaran santri dan akumulasi poin kedisiplinan.
            </p>
          </div>

          {/* Export PDF Button - Only for Kasie & Koordinator */}
          {canExport && (
            <button
              id="btn-export-pdf-rekap"
              onClick={handleExportPDF}
              disabled={filteredLogs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white text-emerald-900 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs shadow-md transition-all cursor-pointer self-start sm:self-auto active:scale-95"
              title="Export Rekap Pelanggaran ke Dokumen PDF A4 Standar"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export PDF</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                {filteredLogs.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Filters Card - Compact */}
      <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#101C2F] border border-slate-200/90 dark:border-[#1E3048] shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama santri, kelas, pelanggaran, atau sanksi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Unit Filter (Kasie / Koordinator) */}
          {(isSuperadmin || isKoordinator) && (
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] self-start lg:self-auto shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              {(['ALL', 'SMP', 'MA', 'SMA'] as const).map((unit) => (
                <button
                  key={unit}
                  onClick={() => {
                    setSelectedUnit(unit);
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    selectedUnit === unit
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {unit === 'ALL' ? 'Semua Unit' : unit}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Secondary Filters: Category, Date Range & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#182740] text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">Kategori:</span>
              <select
                id="select-filter-kategori-rekap"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-100 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="All">Semua Kategori</option>
                <option value="Ringan">Ringan (5–49)</option>
                <option value="Sedang">Sedang (50–79)</option>
                <option value="Berat">Berat (80–94)</option>
                <option value="Sangat Berat">Sangat Berat (95–100)</option>
              </select>
            </div>

            {/* Date Range Inputs */}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Dari"
                className="bg-slate-100 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] rounded-lg px-2 py-0.5 text-slate-700 dark:text-slate-300 text-[11px] focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-400 text-[11px]">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Sampai"
                className="bg-slate-100 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] rounded-lg px-2 py-0.5 text-slate-700 dark:text-slate-300 text-[11px] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Reset Filters */}
          {(searchQuery || (isSuperadmin && selectedUnit !== 'ALL') || selectedCategory !== 'All' || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-600 font-semibold cursor-pointer hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl bg-white dark:bg-[#101C2F] border border-slate-200/90 dark:border-[#1E3048] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#0A1322] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-[#182740]">
              <tr>
                <th className="py-2.5 px-3">TGL / WAKTU</th>
                <th className="py-2.5 px-3">NAMA SANTRI</th>
                <th className="py-2.5 px-3">KELAS & UNIT</th>
                <th className="py-2.5 px-3">JENIS PELANGGARAN</th>
                <th className="py-2.5 px-3 text-center">POIN</th>
                <th className="py-2.5 px-3 text-center">KATEGORI</th>
                <th className="py-2.5 px-3">PELAPOR</th>
                <th className="py-2.5 px-3">SANKSI / KONSEKUENSI</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">STATUS</th>
                <th className="py-2.5 px-3 text-center w-36 min-w-[120px] whitespace-nowrap">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#182740] text-slate-800 dark:text-slate-200">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 italic">
                    <p className="font-bold text-slate-600 dark:text-slate-300">Tidak ada catatan pelanggaran ditemukan</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter yang aktif.</p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const santri = santriList.find((s) => s.id === log.santriId || (s.nama && log.santriNama && s.nama.toLowerCase().trim() === log.santriNama.toLowerCase().trim()));
                  const masterItem = pelanggaranList.find((p) => p.id === log.jenisPelanggaranId || (log.jenisPelanggaranNama && p.jenis.toLowerCase().trim() === log.jenisPelanggaranNama.toLowerCase().trim()));
                  
                  // Genuine student identity resolution
                  const isSantriGeneric = !log.santriNama || log.santriNama.toLowerCase() === 'santri' || log.santriNama === '-';
                  const displaySantriNama = santri?.nama || (!isSantriGeneric ? log.santriNama : (log.santriId ? `[Santri: ${log.santriId}]` : '[Santri Tidak Terdaftar]'));
                  const displaySantriKelas = santri?.kelas || (log.santriKelas && log.santriKelas !== '-' ? log.santriKelas : '');
                  const displaySantriUnit = santri?.unit || log.santriUnit || 'SMP';

                  // Genuine violation identity resolution
                  const isJenisGeneric = !log.jenisPelanggaranNama || log.jenisPelanggaranNama.toLowerCase().includes('tata tertib') || log.jenisPelanggaranNama === '-';
                  const displayJenis = masterItem?.jenis || (!isJenisGeneric ? log.jenisPelanggaranNama : (log.jenisPelanggaranId ? `[Pelanggaran: ${log.jenisPelanggaranId}]` : '[Pelanggaran Tidak Terdaftar]'));
                  const displayPoin = log.poin > 0 ? log.poin : (masterItem?.poin || 0);
                  const displayHukuman = (log.hukuman && log.hukuman !== '-') ? log.hukuman : (masterItem?.konsekuensi || '-');

                  const kategoriInfo = getOfficialKategori(displayPoin);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 dark:hover:bg-[#13223A] transition-colors group"
                    >
                      <td className="py-2 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {log.tanggal}
                      </td>

                      <td
                        onClick={() => santri && setSelectedSantriForDetail(santri)}
                        className={`py-2 px-3 max-w-[170px] ${santri ? 'cursor-pointer' : ''}`}
                      >
                        <div className="font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" title={displaySantriNama}>
                          {displaySantriNama}
                        </div>
                      </td>

                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#132138] border border-slate-200 dark:border-[#1E2E4A] font-bold text-[10px] text-slate-700 dark:text-slate-300">
                          <GraduationCap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {displaySantriKelas ? `${displaySantriKelas} (${displaySantriUnit})` : `Unit ${displaySantriUnit}`}
                        </span>
                      </td>

                      <td className="py-2 px-3 max-w-[200px]">
                        <div className="font-semibold text-slate-900 dark:text-white truncate text-xs leading-snug" title={displayJenis}>
                          {displayJenis}
                        </div>
                        {log.catatan && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 truncate" title={log.catatan}>
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{log.catatan}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <PointBadge points={displayPoin} size="sm" />
                      </td>

                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            color: `rgb(${kategoriInfo.textColor.join(',')})`,
                            backgroundColor: `rgb(${kategoriInfo.bgColor.join(',')})`
                          }}
                        >
                          {kategoriInfo.label}
                        </span>
                      </td>

                      <td className="py-2 px-3 max-w-[130px]">
                        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={log.pencatat || 'Petugas'}>
                          {log.pencatat || 'Petugas'}
                        </div>
                      </td>

                      <td className="py-2 px-3 max-w-[160px] text-slate-600 dark:text-slate-300 text-[11px] truncate" title={displayHukuman}>
                        {displayHukuman}
                      </td>

                      {/* Status Column */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {log.status === 'Selesai' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Selesai</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Belum Selesai</span>
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. Download Mutabaah Pembinaan (Musyrif untuk binaan, Koordinator untuk unit, Kasie untuk semua) */}
                          {canDownloadMutabaah(log, santri) && (
                            <button
                              id={`btn-download-mutabaah-${log.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadMutabaah(log);
                              }}
                              disabled={isDownloadingMutabaah === log.id}
                              title="Download Mutabaah Pembinaan (PDF A4)"
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                            >
                              {isDownloadingMutabaah === log.id ? (
                                <RotateCcw className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </button>
                          )}

                          {/* 2. Tandai Pembinaan Selesai (Only for Koordinator unit & Kasie) */}
                          {canMarkComplete(displaySantriUnit) && log.status !== 'Selesai' && (
                            <button
                              id={`btn-complete-riwayat-${log.id}`}
                              type="button"
                              onClick={() => setCompletingLog(log)}
                              title="Tandai Pembinaan Selesai"
                              className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-300/60 dark:border-teal-700/50 transition-colors cursor-pointer shadow-2xs active:scale-95"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            </button>
                          )}

                          {/* 3. Edit / Revisi Kasus Pelanggaran (Koordinator unit & Kasie) */}
                          {canEditKasus(displaySantriUnit) && (
                            <button
                              id={`btn-edit-kasus-${log.id}`}
                              type="button"
                              onClick={() => setEditingKasus(log)}
                              title="Edit / Revisi Catatan Kasus"
                              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300/60 dark:border-blue-700/50 transition-colors cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            </button>
                          )}

                          {/* 4. Hapus Kasus Pelanggaran (Koordinator unit & Kasie) */}
                          {canDeleteKasus(displaySantriUnit) && (
                            <button
                              id={`btn-delete-riwayat-${log.id}`}
                              type="button"
                              onClick={() => setDeletingLog(log)}
                              title="Hapus Catatan Kasus Pelanggaran ini"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700 transition-colors cursor-pointer shadow-2xs active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-[#182740] bg-slate-50 dark:bg-[#0B1322] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Menampilkan <span className="font-bold text-slate-900 dark:text-white">{filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> sampai{' '}
            <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> dari{' '}
            <span className="font-bold text-slate-900 dark:text-white">{filteredLogs.length}</span> log pelanggaran
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1E2E4A] bg-white dark:bg-[#111C31] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#15233C] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="font-bold text-slate-800 dark:text-slate-200 px-2 text-[11px]">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#1E2E4A] bg-white dark:bg-[#111C31] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#15233C] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#111C31] border border-slate-200 dark:border-[#1E2E4A] rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Hapus Catatan Pelanggaran
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Konfirmasi pembatalan / penghapusan riwayat
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeletingLog(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <p>Apakah Anda yakin ingin menghapus catatan pelanggaran ini?</p>
              <div className="bg-white dark:bg-[#0A1322] p-2.5 rounded-lg border border-rose-200/50 dark:border-rose-900/30 font-medium space-y-1">
                <div><span className="text-slate-400">Santri:</span> <strong className="text-slate-900 dark:text-white">{deletingLog.santriNama}</strong> ({deletingLog.santriKelas})</div>
                <div><span className="text-slate-400">Pelanggaran:</span> <span className="text-rose-600 dark:text-rose-400 font-bold">{deletingLog.jenisPelanggaranNama} (+{deletingLog.poin} poin)</span></div>
                <div><span className="text-slate-400">Tanggal:</span> {deletingLog.tanggal}</div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                * Poin santri akan otomatis dikurangi kembali ({deletingLog.poin} poin).
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeletingLog(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#1E2E4A] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162540] text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Catatan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Case Confirmation Modal */}
      {completingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-[#1E3048] rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tandai Pembinaan Selesai
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tandai kasus pelanggaran santri ini sebagai selesai ditindaklanjuti?
                </p>
              </div>
            </div>

            {/* Selected Case Summary */}
            <div className="my-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1C2F4D] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Santri:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                  {completingLog.santriNama} ({completingLog.santriKelas || completingLog.santriUnit})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Jenis Kasus:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                  {completingLog.jenisPelanggaranNama}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Poin Pelanggaran:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  +{completingLog.poin} Poin
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Waktu Catat:</span>
                <span className="text-slate-600 dark:text-slate-400 font-mono">
                  {completingLog.tanggal}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
              Status pembinaan akan diubah menjadi <strong>Selesai</strong> secara permanen di database Supabase dan Dashboard. Catatan tetap tersimpan aman di Rekap Data.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setCompletingLog(null)}
                disabled={isCompleting}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1E3048] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#15253F] text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                disabled={isCompleting}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCompleting ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isCompleting ? 'Menyimpan...' : 'Ya, Tandai Selesai'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Kasus Pelanggaran Modal */}
      {editingKasus && (
        <EditKasusPelanggaranModal
          isOpen={Boolean(editingKasus)}
          onClose={() => setEditingKasus(null)}
          kasus={editingKasus}
        />
      )}
    </div>
  );
};
