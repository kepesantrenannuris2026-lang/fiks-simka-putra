import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, ShieldCheck, Clock, GraduationCap } from 'lucide-react';
import { ActivityItem } from '../../types';

interface HideNotificationModalProps {
  isOpen: boolean;
  activity: ActivityItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const HideNotificationModal: React.FC<HideNotificationModalProps> = ({
  isOpen,
  activity,
  onClose,
  onConfirm
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !activity) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="hide-notification-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        id="hide-notification-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hide-modal-title"
        className="relative w-full max-w-md bg-white dark:bg-[#101C2F] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#1E3048] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-rose-100 dark:border-rose-950/40 bg-rose-50/70 dark:bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="hide-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                Sembunyikan Pemberitahuan
              </h2>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                Panel Aktivitas & Pemberitahuan
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="text-center sm:text-left">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Sembunyikan pemberitahuan ini dari panel?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Pemberitahuan akan diarsipkan dari daftar aktivitas terbaru agar tidak lagi tampil di dashboard.
            </p>
          </div>

          {/* Activity Preview Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1424] border border-slate-200 dark:border-[#1A2E4C] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {activity.title}
              </span>
              <span className="text-[9.5px] px-2 py-0.5 rounded-md font-bold shrink-0 bg-white dark:bg-[#15253F] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3048]">
                Unit {activity.unit}
              </span>
            </div>

            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {activity.desc}
            </p>

            <div className="flex items-center justify-between gap-2 text-[10.5px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-[#15253F]">
              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <GraduationCap className="w-3 h-3" />
                <span>{activity.santriNama} ({activity.santriKelas || activity.unit})</span>
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{activity.timeFormatted}</span>
              </span>
            </div>
          </div>

          {/* Guarantee Note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-[11px] leading-relaxed">
              <strong>Data aman:</strong> Tindakan ini tidak akan menghapus catatan pelanggaran, data pembinaan, maupun statistik poin santri asli di sistem.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 dark:bg-[#0C1625] border-t border-slate-200 dark:border-[#1E3048]">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sembunyikan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
