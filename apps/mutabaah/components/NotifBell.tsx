"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Bell, CalendarClock, ClipboardCheck, ChevronRight, CheckCircle2, Activity, X, RotateCcw } from "lucide-react";
import * as F from "@/lib/fmt";
import { Dialog, Button, cn } from "./ui";

export const Badge = ({ n, className = "" }: { n?: number; className?: string }) =>
  n ? <span className={cn("grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose px-1 text-[10.5px] font-extrabold leading-none text-white ring-2 ring-white", className)}>{n > 99 ? "99+" : n}</span> : null;

type Props = {
  notif: any; admin: boolean;
  openSetor: (t: { tahun: number; bulan: number; pekan: number }, hk?: string) => void;
  openUjian: () => void; openMonitor: () => void;
  onDismiss: (keys: string[]) => Promise<void>; onRestore: () => Promise<void>;
};

export default function NotifBell({ notif, admin, openSetor, openUjian, openMonitor, onDismiss, onRestore }: Props) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const hapus = async (keys: string[]) => { if (!keys.length) return; setBusy(true); try { await onDismiss(keys); } finally { setBusy(false); } };
  const n = notif?.total || 0;
  const ItemRow = ({ onClick, tone, title, sub, tag, keys }: any) => (
    <div className="flex items-stretch gap-1.5">
    <button onClick={() => { setOpen(false); onClick(); }} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-line bg-white px-3 py-2.5 text-left transition hover:border-leaf hover:shadow-sm">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", tone === "rose" ? "bg-rose-soft text-rose" : tone === "amber" ? "bg-saffron-soft text-[#9a5510]" : "bg-sky-soft text-sky")}>
        {tone === "sky" ? <ClipboardCheck className="size-[18px]" /> : <CalendarClock className="size-[18px]" />}
      </span>
      <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-bold">{title}</span><span className="block truncate text-[12px] text-muted">{sub}</span></span>
      {tag && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold", tone === "rose" ? "bg-rose-soft text-rose" : "bg-saffron-soft text-[#9a5510]")}>{tag}</span>}
      <ChevronRight className="size-4 shrink-0 text-muted" />
    </button>
    {keys?.length > 0 && (
      <button aria-label={"Hapus notifikasi " + title} disabled={busy} onClick={() => hapus(keys)}
        className="grid w-10 shrink-0 place-items-center rounded-2xl border border-line bg-white text-muted transition hover:border-rose hover:text-rose disabled:opacity-40"><X className="size-4" /></button>
    )}
    </div>
  );

  const s = notif?.setoran, items: any[] = s?.items || [], hq: any[] = notif?.halaqah || [];
  const lewat = admin ? hq.filter((h) => h.lewat > 0) : items.filter((x) => !x.berjalan);
  const berjalan = admin ? [] : items.filter((x) => x.berjalan);

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={n ? `${n} notifikasi` : "Notifikasi"} className="relative grid size-9 shrink-0 place-items-center rounded-xl text-ink/70 transition hover:bg-white hover:text-ink">
        <motion.span animate={n ? { rotate: [0, -14, 12, -8, 0] } : {}} transition={{ duration: 0.9, repeat: n ? Infinity : 0, repeatDelay: 6 }}><Bell className="size-[20px]" /></motion.span>
        <Badge n={n} className="absolute -right-1 -top-1" />
      </button>

      <Dialog open={open} onOpenChange={setOpen} title="Perlu diisi"
        description={notif ? `${notif.periode.nama} ${notif.periode.tahun_ajaran} · bagian yang periodenya sudah masuk atau lewat` : ""}>
        {!notif ? <p className="text-sm text-muted">Memuat…</p> : (
          <div className="space-y-4">
            {notif.ujian && (
              <ItemRow tone="sky" onClick={openUjian} tag={notif.ujian.lewat ? "lewat" : "akhir semester"} keys={[notif.ujian.kunci]}
                title={`Ujian semester ${notif.ujian.nama.toLowerCase()} ${notif.ujian.tahun_ajaran}`}
                sub={`${notif.ujian.belum} dari ${notif.ujian.total} santri belum dinilai`} />
            )}

            {berjalan.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">Pekan berjalan</p>
                <div className="space-y-2">{berjalan.map((x) => (
                  <ItemRow key={x.ym + x.pekan + x.halaqah_key} tone="amber" tag="berjalan" onClick={() => openSetor(x)} keys={[x.kunci]}
                    title={`Pekan ${x.pekan} · ${F.ymLabel(x.ym)}`} sub={`${x.belum} dari ${x.total} santri belum diisi`} />
                ))}</div>
              </div>
            )}

            {lewat.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-rose">{admin ? `${lewat.length} halaqah punya pekan terlewat` : `${lewat.length} pekan sudah lewat, belum lengkap`}</p>
                <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                  {admin ? lewat.map((h) => {
                    const last = h.pekan.find((x: any) => !x.berjalan) || h.pekan[0];
                    return <ItemRow key={h.halaqah_key} tone="rose" tag={`${h.lewat} pekan`} onClick={() => openSetor(last, h.halaqah_key)} keys={h.pekan.map((x: any) => x.kunci)}
                      title={`${h.halaqah} · ${h.unit} ${h.tingkat}`} sub={`${h.musyrif} · terakhir: Pekan ${last.pekan} ${F.ymLabel(last.ym)}`} />;
                  }) : lewat.map((x) => (
                    <ItemRow key={x.ym + x.pekan + x.halaqah_key} tone="rose" tag="lewat" onClick={() => openSetor(x)} keys={[x.kunci]}
                      title={`Pekan ${x.pekan} · ${F.ymLabel(x.ym)}`} sub={`${x.belum} dari ${x.total} santri belum diisi`} />
                  ))}
                </div>
              </div>
            )}

            {!notif.ujian && !lewat.length && !berjalan.length && (
              <div className="grid place-items-center gap-2 py-8 text-center">
                <CheckCircle2 className="size-10 text-leaf" />
                <p className="font-bold">Semua sudah terisi</p>
                <p className="text-[13px] text-muted">Tidak ada setoran atau ujian yang tertinggal pada semester ini.</p>
              </div>
            )}

            {(lewat.length > 0 || berjalan.length > 0 || notif.ujian) && (
              <div className="rounded-2xl bg-mist px-3 py-2.5 text-[12px] text-muted">
                Ketuk <b>×</b> untuk menghapus notifikasi yang memang tidak perlu diisi (misalnya pekan libur tanpa halaqah).
                <Button variant="ghost" size="sm" disabled={busy} className="mt-1.5 w-full text-rose hover:bg-rose-soft"
                  onClick={() => { if (confirm("Hapus semua notifikasi yang tampil?")) hapus([...(notif.ujian ? [notif.ujian.kunci] : []), ...(admin ? hq.flatMap((h: any) => h.pekan.map((x: any) => x.kunci)) : items.map((x: any) => x.kunci))]); }}>
                  <X className="size-4" />Hapus semua notifikasi
                </Button>
              </div>
            )}
            {notif.diabaikan > 0 && (
              <button disabled={busy} onClick={async () => { setBusy(true); try { await onRestore(); } finally { setBusy(false); } }} className="flex w-full items-center justify-center gap-1.5 text-[12px] font-semibold text-sky hover:underline">
                <RotateCcw className="size-3.5" />Tampilkan lagi {notif.diabaikan} notifikasi yang dihapus
              </button>
            )}
            {admin && <Button variant="outline" className="w-full" onClick={() => { setOpen(false); openMonitor(); }}><Activity className="size-4" />Buka Monitor pekanan</Button>}
          </div>
        )}
      </Dialog>
    </>
  );
}
