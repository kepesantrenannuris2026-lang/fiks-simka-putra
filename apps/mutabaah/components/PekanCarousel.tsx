"use client";
import * as React from "react";
import { PenLine, ChevronLeft, ChevronRight, Check } from "lucide-react";
import * as F from "@/lib/fmt";
import { Button, Ring, CountUp, cn } from "./ui";

type Week = { ym: string; tahun: number; bulan: number; pekan: number; dari_tgl: number; sampai_tgl: number; berjalan: boolean; total: number; terisi: number; belum: number; persen: number };

/** Kartu pekan di Beranda: geser ke kiri untuk melihat pekan-pekan sebelumnya. */
export default function PekanCarousel({ greeting, weeks, onIsi, onSantri }: {
  greeting: string; weeks: Week[] | undefined;
  onIsi: (w: { tahun: number; bulan: number; pekan: number }) => void; onSantri: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [idx, setIdx] = React.useState(0);
  // Urutan kiri→kanan: pekan terlama → pekan berjalan; mulai di paling kanan, geser ke kanan untuk riwayat.
  const list = weeks && weeks.length ? [...weeks].reverse() : null;
  const last = list ? list.length - 1 : 0;
  React.useLayoutEffect(() => {
    const el = ref.current; if (!el || !list) return;
    el.scrollLeft = el.scrollWidth; setIdx(last);
  }, [list?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    const el = ref.current; if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };
  const goTo = (i: number) => {
    const el = ref.current; if (!el || !list) return;
    const n = Math.max(0, Math.min(list.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section className="kufi-pattern relative overflow-hidden rounded-[26px] text-white">
      <div className="flex items-center justify-between gap-2 px-5 pt-5 sm:px-7 sm:pt-7">
        <p className="text-sm text-white/70">{greeting}</p>
        {list && list.length > 1 && (
          <div className="flex items-center gap-1">
            <button aria-label="Pekan sebelumnya" disabled={idx === 0} onClick={() => goTo(idx - 1)} className="grid size-8 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
            <button aria-label="Pekan sesudahnya" disabled={idx >= list.length - 1} onClick={() => goTo(idx + 1)} className="grid size-8 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 disabled:opacity-30"><ChevronRight className="size-4" /></button>
          </div>
        )}
      </div>

      <div ref={ref} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(list || [null]).map((w, i) => (
          <div key={w ? w.ym + w.pekan : i} className="w-full shrink-0 snap-start px-5 pb-5 pt-1 sm:px-7 sm:pb-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex-1">
                <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                  {w ? <>Pekan {w.pekan} · {F.BULAN[w.bulan - 1]}</> : "Memuat…"}
                  {w && !w.berjalan && <span className="ml-2 align-middle text-xs font-bold uppercase tracking-wide text-saffron">{w.belum ? "terlewat" : "selesai"}</span>}
                </h2>
                {w && <p className="mt-1 text-sm text-white/70">Tanggal {w.dari_tgl}–{w.sampai_tgl} {F.BULAN[w.bulan - 1]} {w.tahun}{w.berjalan ? " · pekan berjalan" : ""}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  {w && (w.berjalan || w.belum > 0
                    ? <Button variant="accent" onClick={() => onIsi(w)}><PenLine className="size-4" />{w.berjalan ? "Isi setoran pekan ini" : `Lengkapi Pekan ${w.pekan}`}</Button>
                    : <Button variant="ghost" className="bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => onIsi(w)}><Check className="size-4" />Lihat setoran</Button>)}
                  <Button variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white" onClick={onSantri}>Lihat santri</Button>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl bg-white/[.06] p-4 sm:bg-transparent sm:p-0">
                <Ring value={w?.total ? w.persen : 0} size={128}>
                  <div>
                    <div className="text-3xl font-extrabold leading-none">{w?.total ? <CountUp value={w.persen} /> : "–"}<span className="text-lg">%</span></div>
                    <div className="mt-1 text-[11px] leading-tight text-white/70">sudah diisi<br />{w?.berjalan ? "pekan ini" : `pekan ${w?.pekan ?? ""}`}</div>
                  </div>
                </Ring>
                <div className="max-w-[190px] text-[13px] leading-snug text-white/75">
                  {w ? (
                    <>
                      <span className="block text-[15px] leading-tight text-white"><b className="text-[19px]">{w.terisi}</b> dari <b>{w.total}</b> santri</span>
                      <span className="mt-0.5 block">sudah disetor pada Pekan {w.pekan}.</span>
                      {w.belum > 0 ? <span className="mt-2 block rounded-lg bg-saffron/20 px-2 py-1 text-[12px] text-white">{w.belum} santri belum diisi</span>
                        : w.total > 0 && <span className="mt-2 block rounded-lg bg-leaf/40 px-2 py-1 text-[12px] text-white">Semua santri sudah diisi ✓</span>}
                    </>
                  ) : <span className="block">Memuat…</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {list && list.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-4">
          {list.map((w, i) => (
            <button key={i} aria-label={`Pekan ${w.pekan} ${F.BULAN[w.bulan - 1]}`} onClick={() => goTo(i)}
              className={cn("h-1.5 rounded-full transition-all", i === idx ? "w-5 bg-saffron" : w.belum > 0 && !w.berjalan ? "w-1.5 bg-rose/80" : "w-1.5 bg-white/35")} />
          ))}
          <span className="ml-2 text-[11px] text-white/50">{idx === last ? "geser → untuk pekan sebelumnya" : ""}</span>
        </div>
      )}
    </section>
  );
}
