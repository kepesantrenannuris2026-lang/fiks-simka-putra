"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { Target, TriangleAlert, GraduationCap, Mic2, ChevronDown, ClipboardList } from "lucide-react";
import { Card, CardTitle, CountUp, cn } from "./ui";

const ORDER = ["lulus", "tercapai", "on_track", "tertinggal", "jauh", "belum_lengkap"] as const;
const fmt = (n: any) => Number(n || 0).toLocaleString("id-ID");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

function Stack({ counts, info, total }: { counts: any; info: any; total: number }) {
  return (
    <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-line">
      {ORDER.map((k, i) => counts[k] ? (
        <motion.div key={k} title={`${info[k].label}: ${counts[k]}`} style={{ background: info[k].warna }}
          initial={{ width: 0 }} animate={{ width: `${(counts[k] / Math.max(1, total)) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }} />
      ) : null)}
    </div>
  );
}

export default function TargetSemester({ s, admin }: { s: any; admin: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [openBL, setOpenBL] = React.useState(false);
  if (!s) return <Card className="h-48 animate-pulse bg-white/60" />;
  const info = s.status_info, per = s.periode;
  const totalBar = ORDER.reduce((t, k) => t + (s.counts[k] || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle hint={`${per.nama} ${per.tahun_ajaran} · pekan ${per.pekan_berjalan} dari ${per.total_pekan} berjalan`}
          right={<span className="grid size-9 place-items-center rounded-xl bg-leaf-soft text-leaf-deep"><Target className="size-5" /></span>}>
          Target hafalan semester
        </CardTitle>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:items-center">
          <div>
            <div className="text-[40px] font-extrabold leading-none text-leaf-deep">{s.persen_aman == null ? "–" : <><CountUp value={s.persen_aman} /><span className="text-2xl">%</span></>}</div>
            <p className="mt-1.5 text-[13px] leading-snug text-muted">
              <b className="text-ink">{fmt(s.aman)}</b> dari <b className="text-ink">{fmt(s.bertarget)}</b> santri bertarget sudah <b className="text-ink">aman</b> (target lulusan tercapai, target semester tercapai, atau on the track).
            </p>
          </div>
          <div className="min-w-0">
            <Stack counts={s.counts} info={info} total={totalBar} />
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
              {ORDER.map((k) => (
                <div key={k} className="flex min-w-0 items-start gap-2">
                  <span className="mt-1 size-2.5 shrink-0 rotate-45 rounded-[2px]" style={{ background: info[k].warna }} />
                  <div className="min-w-0 leading-tight">
                    <div className="text-[15px] font-extrabold tabular">{fmt(s.counts[k])} <span className="text-[11px] font-semibold text-muted">{pct(s.counts[k], k === "belum_lengkap" ? s.total : s.bertarget)}%</span></div>
                    <div className="truncate text-[11.5px] text-muted">{info[k].label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {admin && (s.per_unit || s.per_jenjang).length > 1 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead><tr className="border-y border-line bg-mist text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-3 py-2">Jenjang · putra/putri</th><th className="px-2 py-2">Santri</th><th className="px-2 py-2 w-[38%]">Sebaran status</th><th className="px-2 py-2">Aman</th><th className="px-3 py-2">Kelas akhir capai target lulusan</th>
              </tr></thead>
              <tbody>
                {(s.per_unit || s.per_jenjang).map((g: any) => {
                  const bt = g.total - (g.counts.tahsin || 0) - (g.counts.none || 0) - (g.counts.belum_lengkap || 0);
                  const aman = (g.counts.lulus || 0) + (g.counts.tercapai || 0) + (g.counts.on_track || 0);
                  return (
                    <tr key={g.unit || g.jenjang} className="border-b border-line/70">
                      <td className="px-3 py-2.5 font-bold">{g.label || g.jenjang}</td>
                      <td className="px-2 py-2.5 tabular">{fmt(g.total)}</td>
                      <td className="px-2 py-2.5"><Stack counts={g.counts} info={info} total={ORDER.reduce((t, k) => t + (g.counts[k] || 0), 0)} /></td>
                      <td className="px-2 py-2.5"><b className="tabular">{pct(aman, bt)}%</b> <span className="text-[11px] text-muted">({aman}/{bt})</span></td>
                      <td className="px-3 py-2.5"><b className="tabular">{pct(g.lulusan.lulus_target, g.lulusan.santri)}%</b> <span className="text-[11px] text-muted">({g.lulusan.lulus_target}/{g.lulusan.santri})</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {admin && s.rincian?.baris?.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-[13px]">
              <thead><tr className="border-y border-line bg-mist text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-3 py-2">{s.rincian.judul}</th><th className="px-2 py-2">Santri</th><th className="px-2 py-2 w-[36%]">Sebaran status</th><th className="px-2 py-2">Aman</th><th className="px-3 py-2">Data belum lengkap</th>
              </tr></thead>
              <tbody>
                {s.rincian.baris.map((g: any) => (
                  <tr key={g.key} className="border-b border-line/70">
                    <td className="px-3 py-2.5"><b>{g.label}</b>{g.sub && <p className="text-[11px] text-muted">{g.sub}</p>}</td>
                    <td className="px-2 py-2.5 tabular">{fmt(g.total)}</td>
                    <td className="px-2 py-2.5"><Stack counts={g.counts} info={info} total={ORDER.reduce((t, k) => t + (g.counts[k] || 0), 0)} /></td>
                    <td className="px-2 py-2.5"><b className="tabular">{g.persen_aman ?? 0}%</b> <span className="text-[11px] text-muted">({g.bertarget})</span></td>
                    <td className="px-3 py-2.5 tabular">{g.counts.belum_lengkap ? <span className="font-bold text-[#5E6B77]">{g.counts.belum_lengkap}</span> : <span className="text-muted">–</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {s.perlu_perhatian.length > 0 && (
          <div className="mt-4 rounded-2xl border border-rose/20 bg-rose-soft/50">
            <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-bold text-rose">
              <TriangleAlert className="size-4" />Perlu perhatian: {fmt(s.counts.jauh)} santri jauh dari target
              <ChevronDown className={cn("ml-auto size-4 transition", open && "rotate-180")} />
            </button>
            {open && (
              <div className="divide-y divide-rose/10 px-4 pb-2">
                {s.perlu_perhatian.map((x: any) => (
                  <div key={x.id} className="flex items-center gap-3 py-2 text-[13px]">
                    <div className="min-w-0 flex-1"><p className="truncate font-semibold">{x.nama}</p><p className="truncate text-[11.5px] text-muted">{x.unit} {x.tingkat} · {x.halaqah}</p></div>
                    <div className="shrink-0 text-right"><b className="tabular text-rose">{x.persen ?? 0}%</b><p className="text-[11px] text-muted">{x.capai_teks} / {x.target_teks}</p></div>
                  </div>
                ))}
                <p className="py-2 text-[11.5px] text-muted">Menampilkan 8 santri dengan capaian terendah.</p>
              </div>
            )}
          </div>
        )}

        {(s.counts.belum_lengkap > 0 || s.hafalan_awal_kosong > 0) && (
          <div className="mt-3 rounded-2xl border border-[#7C8B99]/25 bg-[#EEF1F4]">
            <button onClick={() => setOpenBL((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-bold text-[#46525D]">
              <ClipboardList className="size-4" />Perlu dilengkapi: {fmt(s.counts.belum_lengkap || 0)} santri data setorannya belum lengkap
              <ChevronDown className={cn("ml-auto size-4 transition", openBL && "rotate-180")} />
            </button>
            {openBL && (
              <div className="px-4 pb-3 text-[13px]">
                <p className="pb-1 text-[12px] text-[#5E6B77]">Setoran terisi kurang dari separuh dari {s.pekan_wajib} pekan yang sudah lewat, jadi capaiannya belum bisa dinilai. Yang perlu ditegur adalah kelengkapan pengisiannya, bukan hafalan santrinya.</p>
                <div className="divide-y divide-[#7C8B99]/15">
                  {(s.belum_lengkap_list || []).map((x: any) => (
                    <div key={x.id} className="flex items-center gap-3 py-2">
                      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{x.nama}</p><p className="truncate text-[11.5px] text-muted">{x.unit} {x.tingkat} · {x.halaqah} · {x.musyrif}</p></div>
                      <b className="shrink-0 tabular text-[#46525D]">{x.setoran}/{x.pekan_wajib} pekan</b>
                    </div>
                  ))}
                </div>
                {s.hafalan_awal_kosong > 0 && <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[12px] text-[#46525D]"><b>{fmt(s.hafalan_awal_kosong)} santri</b> belum diisi hafalan awalnya (menu Santri → ⋯ → Set hafalan awal), sehingga total hafalan & target lulusan mereka belum akurat.</p>}
              </div>
            )}
          </div>
        )}

        <details className="mt-4 text-[12px] text-muted">
          <summary className="cursor-pointer font-semibold text-ink/80">Aturan target yang dipakai</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Semester 1–5: 1 juz (20 halaman) per semester untuk reguler, 2 juz (40 halaman) untuk program khusus (PK).</li>
            <li>Semester 6 (kelas 9/12 genap): fokus sertifikasi hafalan (4 bagian per juz dari target lulusan).</li>
            <li><b>On the track</b> = capaian ≥ 90% dari yang seharusnya dicapai sampai pekan ini; <b>tertinggal</b> 60–89%; <b>jauh</b> &lt; 60%.</li>
            <li><b>Data belum lengkap</b> = setoran yang terisi kurang dari separuh pekan yang sudah lewat; tidak dihitung dalam persentase aman.</li>
            <li>Santri yang total hafalannya sudah ≥ target lulusan ({s.target_lulusan.default.reguler} juz reguler / {s.target_lulusan.default.tahfidz} juz program khusus) dianggap aman, dan target pekanannya gugur.</li>
          </ul>
        </details>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="kufi-pattern border-0 text-white">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/10"><GraduationCap className="size-5 text-saffron" /></span>
            <div className="min-w-0">
              <p className="text-sm text-white/70">Target hafalan lulusan</p>
              <p className="mt-0.5 text-[26px] font-extrabold leading-tight"><CountUp value={s.target_lulusan.tercapai} /> <span className="text-base font-semibold text-white/70">dari {fmt(s.target_lulusan.santri)} santri</span></p>
              <p className="mt-1 text-[12.5px] leading-snug text-white/70">sudah mencapai target lulusan ({s.target_lulusan.default.reguler} juz reguler · {s.target_lulusan.default.tahfidz} juz PK). Target pekanan mereka gugur.</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
            <motion.div className="h-full rounded-full bg-saffron" initial={{ width: 0 }} animate={{ width: `${pct(s.target_lulusan.tercapai, s.target_lulusan.santri)}%` }} transition={{ duration: 0.9 }} />
          </div>
        </Card>

        <Card>
          <CardTitle hint="Persentase santri berpredikat B+ ke atas, dari penilaian terakhir di menu Santri"
            right={<span className="grid size-9 place-items-center rounded-xl bg-sky-soft text-sky"><Mic2 className="size-5" /></span>}>
            Target makhraj & tajwid
          </CardTitle>
          {!s.makhraj_tajwid.length ? <p className="text-[13px] text-muted">Belum ada data.</p> : (
            <div className="space-y-5">
              {s.makhraj_tajwid.map((g: any) => (
                <div key={g.jenjang}>
                  <div className="mb-2 flex items-baseline justify-between gap-2 text-[13px]">
                    <b>{g.jenjang}</b>
                    <span className="text-[11.5px] text-muted">target lulusan ≥ {g.target}% B+ · {g.semua.dinilai}/{g.semua.santri} dinilai</span>
                  </div>
                  <div className="space-y-2.5">
                    {(g.per_tingkat || []).map((t: any) => (
                      <div key={t.tingkat} className={cn("rounded-xl px-2.5 py-2", t.akhir ? "bg-sky-soft/60 ring-1 ring-sky/20" : "bg-mist/70")}>
                        <div className="mb-1 flex items-baseline justify-between text-[12px]">
                          <span className="font-bold">Kelas {t.tingkat}{t.akhir && <span className="ml-1.5 rounded-full bg-sky px-1.5 py-px text-[10px] font-bold text-white">kelas akhir</span>}</span>
                          <span className="text-[11px] text-muted">{t.dinilai}/{t.santri} dinilai</span>
                        </div>
                        {t.dinilai === 0 ? <p className="text-[11.5px] text-muted">Belum ada penilaian.</p> : ["makhraj", "tajwid"].map((k) => {
                          const v = t["persen_" + k] ?? 0, ok = v >= g.target, c = t[k + "_c"];
                          return (
                            <div key={k} className="mb-1 flex items-center gap-2 text-[12px]">
                              <span className="w-14 shrink-0 capitalize text-muted">{k}</span>
                              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-line">
                                <motion.div className={cn("h-full rounded-full", ok ? "bg-leaf" : "bg-saffron")} initial={{ width: 0 }} animate={{ width: `${v}%` }} transition={{ duration: 0.8 }} />
                                <span className="absolute inset-y-0 w-[2px] bg-pine" style={{ left: `${g.target}%` }} title={`Target ${g.target}%`} />
                              </div>
                              <b className={cn("w-10 shrink-0 text-right tabular", ok ? "text-leaf-deep" : "text-[#C26A1E]")}>{v}%</b>
                              {c > 0 && <span className="shrink-0 rounded-full bg-rose-soft px-1.5 text-[10px] font-bold text-rose" title="Predikat C">{c} C</span>}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-muted">Garis gelap = target lulusan jenjang. Kelas sebelumnya ditampilkan agar progresnya terpantau sejak awal.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
