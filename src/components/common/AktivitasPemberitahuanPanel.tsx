import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ActivityItem } from '../../types';
import { mapJabatanToRole } from '../../lib/auth';
import {
  Bell,
  Sparkles,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RotateCw,
  Clock,
  ShieldAlert,
  HeartHandshake,
  User,
  GraduationCap,
  X,
  Building2,
  Check
} from 'lucide-react';

interface AktivitasPemberitahuanPanelProps {
  variant?: 'dashboard' | 'popover';
  onClose?: () => void;
  maxItems?: number;
}

export const AktivitasPemberitahuanPanel: React.FC<AktivitasPemberitahuanPanelProps> = ({
  variant = 'dashboard',
  onClose,
  maxItems = 8
}) => {
  const {
    getRecentActivities,
    user,
    refreshData,
    isLoadingData,
    activityQueryError,
    hideNotificationItem,
    markCaseSelesai,
    setSelectedSantriForDetail,
    allSantriList
  } = useApp();

  const activities = getRecentActivities();
  const displayedActivities = activities.slice(0, maxItems);

  // Authorization check for actions
  const userRole = user ? mapJabatanToRole(user.role) : null;
  const canManageNotif = userRole === 'KOORDINATOR' || userRole === 'KASIE_KEPESANTRENAN';

  // Modal State: Sembunyikan Pemberitahuan
  const [hideTarget, setHideTarget] = useState<ActivityItem | null>(null);
  const [isHiding, setIsHiding] = useState(false);

  // Modal State: Tandai Pembinaan Selesai
  const [completeTarget, setCompleteTarget] = useState<ActivityItem | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Execute Hide
  const handleConfirmHide = async () => {
    if (!hideTarget) return;
    setIsHiding(true);
    try {
      const res = await hideNotificationItem(hideTarget.id, hideTarget.type, hideTarget.sourceId);
      if (res.success) {
        setHideTarget(null);
      }
    } finally {
      setIsHiding(false);
    }
  };

  // Execute Complete Case
  const handleConfirmComplete = async () => {
    if (!completeTarget) return;
    setIsCompleting(true);
    try {
      const res = await markCaseSelesai(completeTarget.sourceId, completeTarget.type);
      if (res.success) {
        setCompleteTarget(null);
      }
    } finally {
      setIsCompleting(false);
    }
  };

  const handleOpenSantriDetail = (santriId: string, santriNama: string) => {
    const matched = allSantriList.find(
      (s) => s.id === santriId || (s.nama && santriNama && s.nama.toLowerCase().trim() === santriNama.toLowerCase().trim())
    );
    if (matched) {
      setSelectedSantriForDetail(matched);
      if (onClose) onClose();
    }
  };

  // Check if Koordinator has permission for specific item unit
  const canManageItem = (itemUnit: string) => {
    if (userRole === 'KASIE_KEPESANTRENAN') return true;
    if (userRole === 'KOORDINATOR') return user?.unit === itemUnit;
    return false;
  };

  const isPopover = variant === 'popover';

  return (
    <div
      className={
        isPopover
          ? 'w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-[#1E3048] shadow-2xl p-4'
          : 'rounded-xl sm:rounded-2xl bg-white dark:bg-[#101C2F] border border-slate-200/90 dark:border-[#1E3048] p-4 sm:p-6 shadow-xs flex flex-col justify-between'
      }
    >
      {/* HEADER PANEL */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1C2F4D]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Aktivitas & Pemberitahuan</span>
              {activities.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
                  {activities.length}
                </span>
              )}
            </h3>
            {!isPopover && (
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Data aktual tersimpan di Supabase • Unit {user?.unit === 'ALL' ? 'Semua Unit' : user?.unit || 'Pesantren'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => refreshData()}
            disabled={isLoadingData}
            title="Sinkronisasi data Supabase terbaru"
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#15253F] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer disabled:opacity-40"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          {isPopover && onClose && (
            <button
              onClick={onClose}
              title="Tutup Panel"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#15253F] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ERROR MESSAGE (WHEN QUERY FAILS) */}
      {activityQueryError && (
        <div className="my-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Aktivitas gagal dimuat. Silakan coba lagi.</p>
            <button
              onClick={() => refreshData()}
              className="mt-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 underline cursor-pointer"
            >
              Muat Ulang Sekarang
            </button>
          </div>
        </div>
      )}

      {/* BODY / ACTIVITIES LIST */}
      <div
        className={`divide-y divide-slate-100 dark:divide-[#192A45] ${
          isPopover ? 'max-h-80 overflow-y-auto mt-2 pr-0.5' : 'mt-3 space-y-2 max-h-[380px] overflow-y-auto pr-1'
        }`}
      >
        {isLoadingData && activities.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-2">
            <RotateCw className="w-5 h-5 mx-auto animate-spin text-emerald-500" />
            <p className="text-xs">Memuat aktivitas terbaru dari database...</p>
          </div>
        ) : activities.length === 0 ? (
          /* EMPTY STATE STRICTLY AS SPECIFIED */
          <div className="py-8 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-[#13233D] flex items-center justify-center mx-auto text-slate-400 mb-2">
              <Sparkles className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Belum ada aktivitas terbaru untuk unit Anda.
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Aktivitas pelanggaran atau pembinaan yang dicatat akan langsung tampil di sini.
            </p>
          </div>
        ) : (
          displayedActivities.map((act) => {
            const hasAuthority = canManageItem(act.unit);

            return (
              <div
                key={act.id}
                className={`py-2.5 px-2 rounded-xl transition-colors group ${
                  isPopover
                    ? 'hover:bg-slate-50 dark:hover:bg-[#13233D]'
                    : 'bg-slate-50/70 dark:bg-[#0A1322]/70 border border-slate-200/60 dark:border-[#1A2D48] hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  {/* Left: Content */}
                  <div className="min-w-0 flex-1">
                    {/* Header bar of item */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                          act.type === 'pelanggaran'
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                            : 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                        }`}
                      >
                        {act.type === 'pelanggaran' ? (
                          <ShieldAlert className="w-2.5 h-2.5" />
                        ) : (
                          <HeartHandshake className="w-2.5 h-2.5" />
                        )}
                        <span>{act.type}</span>
                      </span>

                      <span className="text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
                        Unit {act.unit}
                      </span>

                      {/* Status Indicator */}
                      {act.isSelesai ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold text-[9.5px]">
                          <Check className="w-2.5 h-2.5" />
                          <span>Selesai</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold text-[9.5px]">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Belum Selesai</span>
                        </span>
                      )}
                    </div>

                    {/* Student Name */}
                    <h4
                      onClick={() => handleOpenSantriDetail(act.santriId, act.santriNama)}
                      className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
                      title={act.santriNama}
                    >
                      {act.santriNama}{' '}
                      <span className="text-[10px] font-normal text-slate-500">
                        ({act.santriKelas})
                      </span>
                    </h4>

                    {/* Detail Description */}
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2 leading-snug">
                      {act.desc}
                    </p>

                    {/* Timestamp */}
                    <span className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-1 inline-block font-mono">
                      {act.timeFormatted}
                    </span>
                  </div>

                  {/* Right: Action Area (Hanya Koordinator, Kasie, Superadmin) */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {/* Action 1: Tandai Pembinaan Selesai */}
                    {hasAuthority && !act.isSelesai && (
                      <button
                        type="button"
                        onClick={() => setCompleteTarget(act)}
                        title="Tandai Pembinaan Selesai"
                        className="p-1 sm:px-2 sm:py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/50 text-[10px] font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1 active:scale-95"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="hidden sm:inline">Tuntas</span>
                      </button>
                    )}

                    {/* Action 2: Sembunyikan Pemberitahuan (Trash Icon) */}
                    {hasAuthority && (
                      <button
                        type="button"
                        onClick={() => setHideTarget(act)}
                        title="Sembunyikan pemberitahuan"
                        className="p-1.5 rounded-lg text-rose-500/80 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER LINK (IF NOT POPOVER) */}
      {!isPopover && activities.length > maxItems && (
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-[#1C2F4D] text-center text-xs text-slate-400">
          <span>Menampilkan {maxItems} dari total {activities.length} aktivitas aktif</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: KONFIRMASI SEMBUNYIKAN PEMBERITAHUAN                             */}
      {/* ========================================================================= */}
      {hideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-[#1E3048] shadow-2xl p-5 sm:p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sembunyikan Pemberitahuan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Sembunyikan pemberitahuan ini dari panel?
                </p>
              </div>
            </div>

            {/* Selected Activity Summary */}
            <div className="my-4 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1C2F4D] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Santri:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                  {hideTarget.santriNama} ({hideTarget.santriKelas})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Kasus/Tindakan:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                  {hideTarget.caseType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Unit / Waktu:</span>
                <span className="text-slate-600 dark:text-slate-400">
                  Unit {hideTarget.unit} • {hideTarget.timeFormatted}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>Penting:</strong> Fitur ini hanya menyembunyikan pemberitahuan dari panel notifikasi. Catatan pelanggaran, rekap data, dan poin santri tetap aman tersimpan di database.
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setHideTarget(null)}
                disabled={isHiding}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#1E3048] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#15253F] text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmHide}
                disabled={isHiding}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isHiding ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isHiding ? 'Menyembunyikan...' : 'Ya, Sembunyikan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KONFIRMASI TANDAI PEMBINAAN SELESAI                               */}
      {/* ========================================================================= */}
      {completeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0E1A2E] border border-slate-200 dark:border-[#1E3048] shadow-2xl p-5 sm:p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Tandai Pembinaan Selesai
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tandai kasus pembinaan ini sebagai selesai ditindaklanjuti?
                </p>
              </div>
            </div>

            {/* Selected Activity Summary */}
            <div className="my-4 p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-[#1C2F4D] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Santri:</span>
                <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]">
                  {completeTarget.santriNama} ({completeTarget.santriKelas})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Jenis Kasus:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                  {completeTarget.caseType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Unit / Waktu:</span>
                <span className="text-slate-600 dark:text-slate-400">
                  Unit {completeTarget.unit} • {completeTarget.timeFormatted}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
              Status pembinaan akan diubah menjadi <strong>Selesai</strong> secara permanen di database Supabase dan Dashboard. Jumlah kasus Belum Selesai akan berkurang.
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setCompleteTarget(null)}
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
                {isCompleting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{isCompleting ? 'Menyimpan...' : 'Ya, Tandai Selesai'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
