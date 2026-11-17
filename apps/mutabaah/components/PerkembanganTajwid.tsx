"use client";
import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import * as F from "@/lib/fmt";
import { cn } from "./ui";

const CLS: Record<string, string> = { A: "bg-leaf text-white", "B+": "bg-sky text-white", B: "bg-saffron text-pine", C: "bg-rose text-white" };
const RANK: Record<string, number> = { A: 4, "B+": 3, B: 2, C: 1 };
const Chip = ({ h, kecil }: { h?: string; kecil?: boolean }) =>
  h ? <span className={cn("inline-grid place-items-center rounded-md font-extrabold", kecil ? "h-6 min-w-[24px] px-0.5 text-[10.5px]" : "h-6 min-w-[30px] text-[12px]", CLS[h])}>{h}</span>
    : <span className={cn("inline-grid place-items-center rounded-md border border-dashed border-line text-muted", kecil ? "h-6 min-w-[24px] text-[10.5px]" : "h-6 min-w-[30px] text-[12px]")}>·</span>;

/** Skor gabungan satu bulan untuk arah tren (rata-rata huruf yang ada). */
const skor = (b: any) => { const v = [b.rata, b.makhraj, b.tajwid].map((h: string) => RANK[h]).filter(Boolean); return v.length ? v.reduce((a: number, x: number) => a + x, 0) / v.length : null; };

/** Tabel perkembangan bacaan per bulan: tahsin tiap pekan, makhraj, tajwid, dan arah tren. */
export function PerkembanganTajwid({ data, cetak }: { data: any[]; cetak?: boolean }) {
  if (!data?.length) return <p className="text-[12.5px] text-muted">Belum ada nilai tahsin pekanan atau penilaian makhraj/tajwid pada semester ini.</p>;
  return (
    <div className={cn(!cetak && "scroll-thin overflow-x-auto")}>
      <table className="w-full min-w-[330px] border-collapse text-[12.5px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
            <th className="py-1.5 pr-2 font-semibold">Bulan</th>
            <th className="px-1 py-1.5 font-semibold">Tahsin P1–P4</th>
            <th className="px-1 py-1.5 text-center font-semibold" title="Rata-rata tahsin bulan ini">Rata</th>
            <th className="px-1 py-1.5 text-center font-semibold">Makh.</th>
            <th className="px-1 py-1.5 text-center font-semibold">Tjw.</th>
            <th className="py-1.5 pl-1 text-center font-semibold">Tren</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b, i) => {
            const now = skor(b), prev = i ? skor(data[i - 1]) : null;
            const arah = now == null || prev == null ? 0 : now > prev + 0.01 ? 1 : now < prev - 0.01 ? -1 : 0;
            return (
              <tr key={b.ym} className="border-t border-line">
                <td className="whitespace-nowrap py-2 pr-2 font-semibold">{F.BULAN_SG[Number(b.ym.slice(5, 7)) - 1]} {b.ym.slice(2, 4)}</td>
                <td className="px-1 py-2"><div className="flex items-center gap-0.5">{[1, 2, 3, 4].map((p) => <Chip key={p} h={b.tahsin?.[p]} kecil />)}</div></td>
                <td className="px-1 py-2 text-center"><Chip h={b.rata} /></td>
                <td className="px-1 py-2 text-center"><Chip h={b.makhraj} /></td>
                <td className="px-1 py-2 text-center"><Chip h={b.tajwid} /></td>
                <td className="py-2 pl-1 text-center">
                  {i === 0 || now == null ? <span className="text-[11px] text-muted">–</span>
                    : arah > 0 ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-leaf-deep"><TrendingUp className="size-3.5" /><span className="hidden sm:inline">naik</span></span>
                    : arah < 0 ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose"><TrendingDown className="size-3.5" /><span className="hidden sm:inline">turun</span></span>
                    : <span className="inline-flex items-center gap-1 text-[11px] text-muted"><Minus className="size-3.5" /><span className="hidden sm:inline">tetap</span></span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted">Tahsin dari nilai setoran pekanan; makhraj & tajwid dari penilaian bulanan. Tren membandingkan rata-rata huruf dengan bulan sebelumnya.</p>
    </div>
  );
}
