import React, { useState, useEffect, useMemo } from 'react';
import { RiwayatPelanggaran, Pelanggaran } from '../../types';
import { useApp } from '../../context/AppContext';
import { getOfficialKategori } from '../../lib/exportPelanggaranPdf';
import { PointBadge } from './PointBadge';
import {
  X,
  Edit,
  GraduationCap,
  Calendar,
  AlertTriangle,
  FileText,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Tag
} from 'lucide-react';

interface EditKasusPelanggaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  kasus: RiwayatPelanggaran | null;
}

export const EditKasusPelanggaranModal: React.FC<EditKasusPelanggaranModalProps> = ({
  isOpen,
  onClose,
  kasus
}) => {
  const { pelanggaranList, updateKasusPelanggaran, showToast } = useApp();

  const [selectedPelanggaranId, setSelectedPelanggaranId] = useState('');
  const [jenisPelanggaranNama, setJenisPelanggaranNama] = useState('');
  const [poin, setPoin] = useState<number>(5);
  const [tanggal, setTanggal] = useState('');
  const [hukuman, setHukuman] = useState('');
  const [catatan, setCatatan] = useState('');
  const [status, setStatus] = useState<'Belum Selesai' | 'Selesai'>('Belum Selesai');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form state when a case is loaded
  useEffect(() => {
    if (kasus) {
      setSelectedPelanggaranId(kasus.jenisPelanggaranId || '');
      setJenisPelanggaranNama(kasus.jenisPelanggaranNama || '');
      setPoin(kasus.poin || 5);
      setTanggal(kasus.tanggal || '');
      setHukuman(kasus.hukuman || '');
      setCatatan(kasus.catatan || '');
      setStatus(kasus.status || 'Belum Selesai');
      setIsSubmitting(false);
    }
  }, [kasus, isOpen]);

  // When user selects a different violation type from the master list
  const handleSelectJenisPelanggaran = (id: string) => {
    setSelectedPelanggaranId(id);
    const master = pelanggaranList.find((p) => p.id === id);
    if (master) {
      setJenisPelanggaranNama(master.jenis);
      setPoin(master.poin);
      if (master.konsekuensi && (!hukuman || hukuman === '-' || hukuman === kasus?.hukuman)) {
        setHukuman(master.konsekuensi);
      }
    }
  };

  const kategoriInfo = useMemo(() => {
    return getOfficialKategori(poin);
  }, [poin]);

  if (!isOpen || !kasus) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!jenisPelanggaranNama.trim()) {
      showToast('Form Tidak Lengkap', 'Jenis pelanggaran wajib dipilih atau diisi.', 'error');
      return;
    }

    if (isNaN(poin) || poin < 1) {
      showToast('Poin Tidak Valid', 'Poin pelanggaran harus berupa angka positif minimal 1.', 'error');
      return;
    }

    if (!tanggal.trim()) {
      showToast('Tanggal Tidak Valid', 'Tanggal pencatatan pelanggaran wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateKasusPelanggaran(kasus.id, {
        jenisPelanggaranId: selectedPelanggaranId || undefined,
        jenisPelanggaranNama: jenisPelanggaranNama.trim(),
        poin: Number(poin),
        hukuman: hukuman.trim() || '-',
        catatan: catatan.trim() || undefined,
        tanggal: tanggal.trim(),
        status
      });

      if (result.success) {
        onClose();
      }
    } catch (err: any) {
      showToast('Gagal Memperbarui', err?.message || 'Terjadi kesalahan sistem saat menyimpan ke Supabase.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="edit-kasus-pelanggaran-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        id="edit-kasus-pelanggaran-dialog"
        className="relative w-full max-w-xl bg-white dark:bg-[#101C2F] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1E3048] overflow-hidden animate-in zoom-in-95 duration-150 my-6"
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1E3048] bg-slate-50/70 dark:bg-[#0A1424]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Edit / Revisi Kasus Pelanggaran
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                SIMKA.ID Pro V1 • Sinkronisasi langsung ke database Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Identitas Santri Banner (Readonly Verified) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200/80 dark:border-[#1C2F4D] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white truncate text-sm">
                  {kasus.santriNama}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span>Kelas {kasus.santriKelas}</span>
                  <span>•</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Unit {kasus.santriUnit}</span>
                  {kasus.lingkungan && (
                    <>
                      <span>•</span>
                      <span>Lingkungan {kasus.lingkungan}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 font-mono block">ID Kasus</span>
              <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {kasus.id.slice(0, 12)}
              </span>
            </div>
          </div>

          {/* Jenis Pelanggaran Select */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Pilih Jenis Pelanggaran (Master SIMKA) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedPelanggaranId}
                onChange={(e) => handleSelectJenisPelanggaran(e.target.value)}
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                <option value="">-- Pilih dari Master Pelanggaran --</option>
                {pelanggaranList.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.kode || 'P'}] {p.jenis} ({p.poin} Poin - {p.kategori})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-slate-400">
              Memilih jenis baru otomatis menyelaraskan bobot poin, relasi master, dan konsekuensi sanksi resmi.
            </p>
          </div>

          {/* Nama Pelanggaran Kustom / Detail */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Uraian / Judul Pelanggaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={jenisPelanggaranNama}
              onChange={(e) => setJenisPelanggaranNama(e.target.value)}
              required
              placeholder="Contoh: Terlambat Sholat Berjamaah di Masjid"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* 2-Kolom: Poin & Kategori Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800 dark:text-slate-200">
                Poin Pelanggaran <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={poin}
                  onChange={(e) => setPoin(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                  className="w-28 px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500 transition-colors text-center font-mono"
                />
                <PointBadge points={poin} size="md" />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block font-bold text-slate-800 dark:text-slate-200">
                Kategori Kedisiplinan
              </span>
              <div
                className="px-3 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 w-full justify-center"
                style={{
                  color: `rgb(${kategoriInfo.textColor.join(',')})`,
                  backgroundColor: `rgb(${kategoriInfo.bgColor.join(',')})`
                }}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Kategori: {kategoriInfo.label}</span>
              </div>
            </div>
          </div>

          {/* Tanggal & Waktu Pencatatan */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Waktu Kejadian / Pencatatan <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                placeholder="Contoh: 25 Agu 2026, 16.38 WIB"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Sanksi / Konsekuensi */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Sanksi / Konsekuensi Edukatif
            </label>
            <input
              type="text"
              value={hukuman}
              onChange={(e) => setHukuman(e.target.value)}
              placeholder="Contoh: Membersihkan selasar asrama selama 2 hari"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Catatan / Keterangan Kasus */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Catatan Pembina / Pelapor
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Tambahkan rincian kronologi atau hasil konfirmasi santri..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1E3048] text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Status Pembinaan */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Status Penyelesaian Kasus
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStatus('Belum Selesai')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  status === 'Belum Selesai'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#0A1322] border-slate-200 dark:border-[#1E3048] text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Belum Selesai</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('Selesai')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  status === 'Selesai'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-slate-50 dark:bg-[#0A1322] border-slate-200 dark:border-[#1E3048] text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selesai (Tuntas)</span>
              </button>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[#182740]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1E2E4A] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162540] text-xs font-semibold cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan ke Supabase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
