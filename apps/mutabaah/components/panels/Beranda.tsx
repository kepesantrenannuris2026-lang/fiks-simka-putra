"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { PenLine, BookOpenCheck, Repeat2, Sparkles, ChevronDown } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { useApp } from "../App";
import TargetSemester from "../TargetSemester";
import PekanCarousel from "../PekanCarousel";
import TajwidChart from "../TajwidChart";
import { Card, CardTitle, Select, Segmented, CountUp, Ring, Skeleton, Button, Bar, cn, Field } from "../ui";

const PROG = [
  { k: "tahsin", label: "Tahsin", color: "#EE8A35", soft: "bg-saffron-soft", text: "text-[#9a4f0f]", icon: Sparkles, desc: "Perbaikan bacaan" },
  { k: "ziyadah", label: "Ziyadah", color: "#17873F", soft: "bg-leaf-soft", text: "text-leaf-deep", icon: BookOpenCheck, desc: "Hafalan baru" },
  { k: "murajaah", label: "Murajaah", color: "#2F6BD8", soft: "bg-sky-soft", text: "text-sky", icon: Repeat2, desc: "Mengulang hafalan" },
] as const;

export default function Beranda() {
  const { user, admin, curHq, go, openSetor } = useApp();
  const now = new Date();
  const [mode, setMode] = React.useState<"pekan" | "bulan">("pekan");
  const taNow = F.academicYearOf(now.getFullYear(), now.getMonth() + 1);
  const [ta, setTa] = React.useState(taNow);
  const months = F.academicMonths(ta);
  const endYm = months.includes(F.ymNow()) ? F.ymNow() : months[11];
  const defDari = mode === "bulan" ? months[0] : F.ymFromIndex(Math.max(F.ymIndex(months[0]), F.ymIndex(endYm) - 2));
  const [dari, setDari] = React.useState(defDari);
  const [sampai, setSampai] = React.useState(endYm);
  React.useEffect(() => { setDari(defDari); setSampai(endYm); /* eslint-disable-next-line */ }, [mode, ta]);
  const [d, setD] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [board, setBoard] = React.useState<"ziyadah" | "murajaah" | "hafalan">("ziyadah");
  const req = React.useRef(0);
  // Musyrif: grafik & papan capaian dilipat, baru dimuat lengkap saat dibuka (hemat kuota & lebih cepat)
  const [grafik, setGrafik] = React.useState(false);
  const lengkap = admin || grafik;

  React.useEffect(() => {
    const n = ++req.current;
    setLoading(true);
    rpc("getDashboard", { mode, dari, sampai, lite: !lengkap }, admin ? curHq || undefined : undefined)
      .then((r) => { if (n === req.current) setD(r); })
      .catch((e) => n === req.current && toast.error(e.message))
      .finally(() => n === req.current && setLoading(false));
  }, [mode, dari, sampai, curHq, admin, lengkap]);

  const changeDari = (v: string) => {
    setDari(v);
    if (F.ymIndex(sampai) < F.ymIndex(v)) setSampai(v);
    if (mode === "pekan" && F.ymIndex(sampai) - F.ymIndex(v) > 2) setSampai(F.ymFromIndex(F.ymIndex(v) + 2));
  };
  const changeSampai = (v: string) => {
    setSampai(v);
    if (F.ymIndex(v) < F.ymIndex(dari)) setDari(v);
    if (mode === "pekan" && F.ymIndex(v) - F.ymIndex(dari) > 2) setDari(F.ymFromIndex(F.ymIndex(v) - 2));
  };
  const t = d?.target;
  const pi = d?.pekan_ini;
  const fmt = (n: number) => Number(n || 0).toLocaleString("id-ID");
  const periode = d ? (d.dari === d.sampai ? F.ymLabel(d.dari) : `${F.ymLabel(d.dari)} – ${F.ymLabel(d.sampai)}`) : "";
  const pk = F.pekanNow();
  const scope = curHq ? (curHq.startsWith("scope:") ? "cakupan terpilih" : "halaqah terpilih") : admin ? "seluruh santri" : "halaqah Anda";

  return (
    <div className="space-y-5">
      {/* Hero: kartu pekan yang bisa digeser ke pekan-pekan sebelumnya */}
      <PekanCarousel greeting={`${F.greeting()}, ${user.nama.split(",")[0]}`} weeks={d?.pekan_riwayat}
        onIsi={(w) => openSetor(w)} onSantri={() => go("santri")} />

      {/* Target semester & lulusan */}
      <TargetSemester s={d?.semester} admin={admin} />

      {!lengkap && (
        <button onClick={() => setGrafik(true)} className="flex w-full items-center justify-between rounded-[22px] border border-line bg-white px-5 py-4 text-left shadow-sm transition hover:border-leaf">
          <span><span className="block text-[15px] font-extrabold">Grafik & papan capaian</span><span className="text-[12.5px] text-muted">Tren tahsin/ziyadah/murajaah, capaian tajwid, dan peringkat santri</span></span>
          <ChevronDown className="size-5 text-muted" />
        </button>
      )}
      {lengkap && <>
      {/* Filter */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1fr_1fr] sm:items-end">
          <Field label="Tampilan"><Segmented id="dash" value={mode} onChange={(v) => setMode(v as any)} options={[{ value: "pekan", label: "Per pekan" }, { value: "bulan", label: "Per bulan" }]} className="w-full sm:w-auto" /></Field>
          <Field label="Tahun ajaran"><Select value={ta} onChange={(e) => setTa(Number(e.target.value))}>{[taNow, taNow - 1, taNow - 2].map((y) => <option key={y} value={y}>{y}/{y + 1}</option>)}</Select></Field>
          <Field label="Dari"><Select value={dari} onChange={(e) => changeDari(e.target.value)}>{months.map((m) => <option key={m} value={m}>{F.ymLabel(m)}</option>)}</Select></Field>
          <Field label="Sampai"><Select value={sampai} onChange={(e) => changeSampai(e.target.value)}>{months.map((m) => <option key={m} value={m}>{F.ymLabel(m)}</option>)}</Select></Field>
        </div>
        <p className="mt-2 text-xs text-muted">Capaian {scope} · {mode === "pekan" ? "grafik pekanan maksimal 3 bulan" : "tahun ajaran Juli–Juni"}</p>
      </Card>

      {/* Tiles program */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PROG.map((p) => (
          <Card key={p.k} className="relative overflow-hidden">
            <div className="flex items-center gap-2">
              <span className={cn("grid size-9 place-items-center rounded-xl", p.soft, p.text)}><p.icon className="size-[18px]" /></span>
              <div><p className="text-sm font-bold">{p.label}</p><p className="text-xs text-muted">{p.desc}</p></div>
            </div>
            {loading && !d ? <Skeleton className="mt-4 h-9 w-32" /> : (
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-[34px] font-extrabold leading-none tracking-tight" style={{ color: p.color }}><CountUp value={d?.total[p.k].decimal || 0} decimals={d?.total[p.k].decimal % 1 ? 1 : 0} /></span>
                <span className="text-sm font-semibold text-muted">halaman</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[13px]">
              <span className="text-muted">Nilai rata-rata</span>
              <span className="font-bold tabular">{F.huruf(d?.nilai_rata[p.k])}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Grafik + ringkasan */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle hint="Jumlah halaman yang disetorkan pada tiap periode">Perkembangan capaian</CardTitle>
          <div className="h-[260px] sm:h-[300px]">
            {d ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    {PROG.map((p) => (
                      <linearGradient key={p.k} id={"g-" + p.k} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={p.color} stopOpacity={0.28} /><stop offset="100%" stopColor={p.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="#E6EDE8" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5E6F65" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis tick={{ fontSize: 11, fill: "#5E6F65" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #DCE5DF", fontSize: 13 }} formatter={(v: any, n: any) => [v + " hal", String(n).charAt(0).toUpperCase() + String(n).slice(1)]} />
                  {PROG.map((p) => <Area key={p.k} type="monotone" dataKey={p.k} stroke={p.color} strokeWidth={2.4} fill={`url(#g-${p.k})`} dot={false} activeDot={{ r: 4 }} />)}
                </AreaChart>
              </ResponsiveContainer>
            ) : <Skeleton className="h-full" />}
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
            {PROG.map((p) => <span key={p.k} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: p.color }} />{p.label}</span>)}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardTitle hint={periode ? `${periode} · hanya pekan yang sudah berjalan` : undefined}>Ringkasan pengisian</CardTitle>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ l: "Seharusnya", v: t?.dinilai, c: "text-ink" }, { l: "Sudah diisi", v: t?.terisi, c: "text-leaf-deep" }, { l: "Belum diisi", v: t?.belum_diisi, c: "text-rose" }].map((x) => (
                <div key={x.l} className="rounded-2xl bg-mist px-1 py-3">
                  <div className={cn("text-[22px] font-extrabold leading-tight", x.c)}>{x.v == null ? "–" : <CountUp value={x.v} />}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">{x.l}</div>
                  <div className="text-[10.5px] text-muted/80">setoran</div>
                </div>
              ))}
            </div>
            {t && d && (
              <p className="mt-3 rounded-xl bg-sky-soft/60 px-3 py-2 text-[12px] leading-relaxed text-ink/80">
                Setiap santri diisi <b>1 setoran per pekan</b>. Jadi jumlah santri × pekan yang sudah berjalan = <b>{fmt(t.dinilai)} setoran</b> yang seharusnya ada pada periode ini.
              </p>
            )}
            <div className="mt-4 space-y-3.5 text-[13px]">
              <div>
                <div className="mb-1 flex justify-between gap-2"><span>Kelengkapan pengisian</span><b className="tabular">{t?.persen_pengisian ?? 0}%</b></div>
                <Bar value={t?.persen_pengisian || 0} tone="sky" />
                {t && <p className="mt-1 text-[11.5px] text-muted">{fmt(t.terisi)} dari {fmt(t.dinilai)} setoran sudah diisi</p>}
              </div>
              <div>
                <div className="mb-1 flex justify-between gap-2"><span>Capai target <span className="text-muted">(dari yang sudah diisi)</span></span><b className="tabular">{t?.persen_dari_terisi ?? 0}%</b></div>
                <Bar value={t?.persen_dari_terisi || 0} />
                {t && <p className="mt-1 text-[11.5px] text-muted">{fmt(t.keduanya_tercapai)} dari {fmt(t.terisi)} setoran memenuhi target ziyadah ≥ 1 hal dan murajaah ≥ 5 hal{t.gugur ? `, termasuk ${fmt(t.gugur)} setoran santri yang target pekanannya gugur karena sudah mencapai target lulusan` : ""}.</p>}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Capaian tajwid (makhraj & hukum tajwid) */}
      <TajwidChart t={d?.tajwid} />

      {/* Papan peringkat */}
      <Card>
        <CardTitle hint="Sepuluh santri teratas pada periode terpilih" right={
          <Segmented id="board" value={board} onChange={(v) => setBoard(v as any)} options={[{ value: "ziyadah", label: "Ziyadah" }, { value: "murajaah", label: "Murajaah" }, { value: "hafalan", label: "Total hafalan" }]} />
        }>Papan capaian</CardTitle>
        <AnimatePresence mode="wait">
          <motion.ol key={board + (d ? d.dari + d.sampai : "")} className="grid grid-cols-1 gap-x-8 md:grid-cols-2" initial="h" animate="s" exit={{ opacity: 0 }} variants={{ s: { transition: { staggerChildren: 0.03 } } }}>
            {(board === "hafalan" ? d?.top_hafalan : board === "ziyadah" ? d?.top_ziyadah : d?.top_murajaah)?.map((x: any, i: number) => (
              <motion.li key={x.id} variants={{ h: { opacity: 0, x: -8 }, s: { opacity: 1, x: 0 } }} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold tabular", i === 0 ? "bg-saffron text-pine" : i < 3 ? "bg-leaf-soft text-leaf-deep" : "bg-mist text-muted")}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{x.nama}</p>
                  <p className="truncate text-xs text-muted">{x.unit} {x.tingkat} · {x.halaqah}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold tabular" style={{ color: board === "murajaah" ? "#2F6BD8" : "#17873F" }}>{board === "hafalan" ? x.hafalan.teks : x.capaian.decimal + " hal"}</p>
                  {board !== "hafalan" && <p className="text-[11px] text-muted">{x.rata_per_pekan.decimal} hal/pekan · target {x.target.keduanya_tercapai}/{x.target.dinilai}</p>}
                </div>
              </motion.li>
            )) || null}
          </motion.ol>
        </AnimatePresence>
        {d && !(board === "hafalan" ? d.top_hafalan : board === "ziyadah" ? d.top_ziyadah : d.top_murajaah).length && <p className="py-6 text-center text-sm text-muted">Belum ada setoran pada periode ini.</p>}
      </Card>
      {!admin && <button onClick={() => setGrafik(false)} className="mx-auto block text-[12.5px] font-semibold text-muted hover:text-ink">Lipat grafik</button>}
      </>}
    </div>
  );
}
