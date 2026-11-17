"use client";
import * as React from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ClipboardCheck, Search, Download, Save, Sparkles } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { ASPEK, INDIKATOR, PREDIKAT, PREDIKAT_TAHFIDZ, predikatNilai, skorUjianTahfidz, ringkasUjianTahfidz, POTONGAN, type UjianJuz } from "@/lib/target";
import { useApp } from "../App";
import { Card, CardTitle, Button, Empty, Skeleton, Dialog, Input, Select, Textarea, Field, Stepper, cn } from "../ui";

const fmtSkor = (n: number) => String(n).replace(".", ",");
/** Ujian tahfidz: pilih juz yang diujikan, isi jumlah lupa / kesalahan besar / kesalahan kecil. Nilai = 100 − potongan. */
function UjianTahfidz({ s, list, onChange }: { s: any; list: UjianJuz[]; onChange: (l: UjianJuz[]) => void }) {
  const dipilih = new Set(list.map((x) => x.juz)), selesai = new Set<number>(s.juz_selesai || []);
  const toggle = (j: number) => onChange(dipilih.has(j) ? list.filter((x) => x.juz !== j) : [...list, { juz: j, lupa: 0, besar: 0, kecil: 0 }].sort((a, b) => b.juz - a.juz));
  const set = (j: number, k: "lupa" | "besar" | "kecil", v: string) => onChange(list.map((x) => (x.juz === j ? { ...x, [k]: Number(v) || 0 } : x)));
  const skor = list.length ? skorUjianTahfidz(list) : null;
  return (
    <div className="mt-3 rounded-xl bg-mist/60 p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="mr-auto text-[12.5px] font-bold">Ujian tahfidz · juz yang diujikan</p>
        <span className="text-[11px] text-muted">lupa −{POTONGAN.lupa} · kesalahan besar −{POTONGAN.besar} · kesalahan kecil −{fmtSkor(POTONGAN.kecil)}</span>
      </div>
      <div className="mt-2 grid grid-cols-10 gap-1">
        {Array.from({ length: 30 }, (_, i) => 30 - i).map((j) => (
          <button key={j} type="button" onClick={() => toggle(j)} aria-pressed={dipilih.has(j)} title={selesai.has(j) ? `Juz ${j} · hafalan selesai` : `Juz ${j}`}
            className={cn("h-8 rounded-lg border text-[12px] font-bold tabular transition", dipilih.has(j) ? "border-pine bg-pine text-white" : selesai.has(j) ? "border-leaf bg-leaf-soft text-leaf-deep" : "border-line bg-white text-muted hover:border-leaf")}>{j}</button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted">Hijau muda = juz yang hafalannya sudah selesai. Juz yang diujikan otomatis ditandai oranye (sudah diuji) di peta juz santri.</p>
      {list.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="hidden grid-cols-[64px_1fr_1fr_1fr_56px] gap-2 px-1 text-[11px] font-semibold text-muted sm:grid"><span>Juz</span><span>Lupa</span><span>Kesalahan besar</span><span>Kesalahan kecil</span><span className="text-right">Potongan</span></div>
          {list.map((x) => {
            const pot = x.lupa * POTONGAN.lupa + x.besar * POTONGAN.besar + x.kecil * POTONGAN.kecil;
            return (
              <div key={x.juz} className="grid grid-cols-3 items-center gap-2 rounded-lg bg-white p-2 sm:grid-cols-[64px_1fr_1fr_1fr_56px] sm:bg-transparent sm:p-0">
                <span className="col-span-2 text-[13px] font-extrabold sm:col-span-1">Juz {x.juz}</span>
                <span className="text-right text-[12px] font-bold text-rose sm:hidden">−{fmtSkor(pot)}</span>
                {(["lupa", "besar", "kecil"] as const).map((k) => (
                  <label key={k} className="min-w-0"><span className="mb-0.5 block text-[10.5px] text-muted sm:hidden">{k === "lupa" ? "Lupa" : k === "besar" ? "Kesalahan besar" : "Kesalahan kecil"}</span>
                    <Stepper compact tone={k === "kecil" ? "amber" : "rose"} label={`Juz ${x.juz} ${k}`} value={String(x[k] || "")} onChange={(v) => set(x.juz, k, v)} max={500} /></label>
                ))}
                <span className="hidden text-right text-[12.5px] font-bold text-rose sm:block">−{fmtSkor(pot)}</span>
              </div>
            );
          })}
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="text-[12.5px] text-muted">Nilai ujian tahfidz (100 − total potongan)</span>
            <span className="flex items-center gap-2"><b className="text-[20px] tabular">{fmtSkor(skor!)}</b><Chip p={predikatNilai(skor)} /></span>
          </div>
        </div>
      )}
    </div>
  );
}

const PRED_CLS: Record<string, string> = { "A+": "bg-pine text-white", A: "bg-leaf text-white", "B+": "bg-sky text-white", B: "bg-saffron text-pine", C: "bg-rose text-white" };
const Chip = ({ p }: { p?: string }) => <span className={cn("inline-grid h-6 min-w-[28px] place-items-center rounded-md px-1 text-[11.5px] font-extrabold", p ? PRED_CLS[p] : "border border-dashed border-line text-muted")}>{p || "–"}</span>;
const SHORT: Record<string, string> = { makhraj: "Mkh", tajwid: "Tjw", tahfidz: "Thf", kehadiran: "Hdr", perkembangan: "Prk" };

function taOptions() {
  const now = new Date(), y = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return [y, y - 1, y - 2].map((t) => `${t}/${t + 1}`);
}

export default function Ujian() {
  const { admin, curHq, syncTick } = useApp();
  const [ta, setTa] = React.useState("");
  const [sem, setSem] = React.useState("");
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<"semua" | "belum" | "sudah">("semua");
  const [edit, setEdit] = React.useState<any>(null);
  const req = React.useRef(0);

  const load = React.useCallback(async () => {
    const n = ++req.current; setLoading(true);
    try {
      const d = await rpc("getUjian", admin ? curHq || undefined : undefined, ta || undefined, sem || undefined);
      if (n === req.current) { setData(d); if (!ta) { setTa(d.periode.tahun_ajaran); setSem(String(d.periode.semester)); } }
    } catch (e: any) { toast.error(e.message); } finally { if (n === req.current) setLoading(false); }
  }, [admin, curHq, ta, sem]);
  React.useEffect(() => { load(); }, [load]);

  const all: any[] = data?.santri || [];
  const list = all.filter((s) => (!q || s.nama.toLowerCase().includes(q.toLowerCase())) && (filter === "semua" || (filter === "belum" ? !s.ujian : !!s.ujian)));
  const r = data?.ringkasan;

  const csv = () => {
    const head = ["Nama", "Unit", "Tingkat", "Halaqah", "Musyrif", "Semester ke", "Juz diujikan", "Nilai ujian tahfidz", ...ASPEK.flatMap((a) => [a.label, "Keterangan " + a.label]), "Catatan", "Penguji", "Tanggal"];
    const rows = all.map((s) => { const u = s.ujian || {}; return [s.nama, s.unit, s.tingkat, s.halaqah, s.musyrif, s.semester_ke || "", (u.tahfidz_ujian || []).map((j: any) => j.juz).join(" "), u.tahfidz_nilai == null ? "" : fmtSkor(u.tahfidz_nilai), ...ASPEK.flatMap((a) => [u[a.key] || "", u["ket_" + a.key] || ""]), u.catatan || "", u.penguji || "", u.tanggal || ""]; });
    const esc = (v: any) => { const t = String(v ?? ""); return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const blob = new Blob(["\ufeff" + [head, ...rows].map((x) => x.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `ujian-semester-${(ta || "").replace("/", "-")}-S${sem}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="space-y-4">
      <section className="kufi-pattern relative overflow-hidden rounded-[26px] p-5 text-white sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10"><ClipboardCheck className="size-6 text-saffron" /></span>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold leading-tight sm:text-2xl">Ujian semester</h2>
            <p className="mt-0.5 text-[13px] text-white/70">Penilaian rapor Al-Qur'an: makhraj, tajwid, tahfidz, kehadiran & kedisiplinan, dan perkembangan.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Select value={ta} onChange={(e) => setTa(e.target.value)} className="h-10 border-white/20 bg-white/10 text-white [&>option]:text-ink">{taOptions().map((t) => <option key={t} value={t}>{t}</option>)}</Select>
          <Select value={sem} onChange={(e) => setSem(e.target.value)} className="h-10 border-white/20 bg-white/10 text-white [&>option]:text-ink"><option value="1">Semester ganjil</option><option value="2">Semester genap</option></Select>
        </div>
        {r && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15"><motion.div className="h-full rounded-full bg-saffron" initial={{ width: 0 }} animate={{ width: `${r.total ? (r.dinilai / r.total) * 100 : 0}%` }} /></div>
            <span className="shrink-0 text-[13px] text-white/80"><b className="text-white">{r.dinilai}</b>/{r.total} santri dinilai</span>
          </div>
        )}
      </section>

      {r && r.dinilai > 0 && (
        <Card>
          <CardTitle hint="Sebaran predikat pada periode ini">Ringkasan hasil</CardTitle>
          <div className="space-y-2.5">
            {ASPEK.map((a) => {
              const dist = r.distribusi[a.key] || {}, tot = Object.values(dist).reduce((x: number, y: any) => x + y, 0) as number;
              return (
                <div key={a.key} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-[118px] shrink-0 text-muted">{a.label}</span>
                  <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-line">
                    {(a.key === "tahfidz" ? PREDIKAT_TAHFIDZ : PREDIKAT).map((p) => dist[p] ? <div key={p} className={PRED_CLS[p]} style={{ width: `${(dist[p] / tot) * 100}%` }} title={`${p}: ${dist[p]}`} /> : null)}
                  </div>
                  <span className="w-8 shrink-0 text-right tabular text-muted">{tot}</span>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted">{PREDIKAT_TAHFIDZ.map((p) => <span key={p} className="flex items-center gap-1"><Chip p={p} /></span>)}</div>
          </div>
          {data.makhraj_tajwid?.some((g: any) => g.semua.dinilai) && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {data.makhraj_tajwid.filter((g: any) => g.semua.dinilai).map((g: any) => (
                <div key={g.jenjang} className="rounded-2xl bg-mist px-3 py-2.5 text-[12px]">
                  <p className="font-bold">{g.jenjang} <span className="font-normal text-muted">· target ≥ {g.target}% B+</span></p>
                  <p className="mt-1">Makhraj <b className={g.semua.persen_makhraj >= g.target ? "text-leaf-deep" : "text-[#C26A1E]"}>{g.semua.persen_makhraj}%</b> · Tajwid <b className={g.semua.persen_tajwid >= g.target ? "text-leaf-deep" : "text-[#C26A1E]"}>{g.semua.persen_tajwid}%</b></p>
                  <p className="text-[11px] text-muted">dari {g.semua.dinilai} santri dinilai</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari santri" className="pl-9" />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="w-auto"><option value="semua">Semua</option><option value="belum">Belum dinilai</option><option value="sudah">Sudah dinilai</option></Select>
        <Button variant="outline" onClick={csv} disabled={!all.length}><Download className="size-4" />CSV</Button>
      </div>

      {loading && !data ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        : !list.length ? <Empty icon={<ClipboardCheck className="size-8" />} title="Tidak ada santri">{admin && !curHq ? "Pilih jenjang, unit, tingkat, atau halaqah di bagian atas." : "Coba ubah pencarian atau filter."}</Empty>
          : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((s, i) => (
                <motion.button key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
                  onClick={() => setEdit(s)} className={cn("min-w-0 rounded-[var(--radius-card)] border bg-white p-4 text-left transition hover:shadow-md", s.ujian ? "border-leaf/40" : "border-line hover:border-leaf")}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1"><p className="truncate font-bold">{s.nama}</p><p className="truncate text-xs text-muted">{s.unit} {s.tingkat} · {s.halaqah}</p></div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold", s.ujian ? "bg-leaf-soft text-leaf-deep" : "bg-mist text-muted")}>{s.ujian ? "dinilai" : "belum"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ASPEK.map((a) => <span key={a.key} className="flex items-center gap-1 text-[10.5px] text-muted">{SHORT[a.key]}<Chip p={s.ujian?.[a.key]} /></span>)}
                  </div>
                </motion.button>
              ))}
            </div>
          )}

      <UjianDialog s={edit} periode={data?.periode} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); syncTick(); }} />
    </div>
  );
}

function UjianDialog({ s, periode, onClose, onSaved }: { s: any; periode: any; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState<any>({});
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!s) return;
    const u = s.ujian || {};
    setV({
      makhraj_nilai: u.makhraj_nilai ?? "", tajwid_nilai: u.tajwid_nilai ?? "",
      ...Object.fromEntries(ASPEK.flatMap((a) => [[a.key, u[a.key] || ""], ["ket_" + a.key, u["ket_" + a.key] || ""]])),
      catatan: u.catatan || "", penguji: u.penguji || "", tanggal: u.tanggal || F.todayLocal(),
      tahfidz_ujian: Array.isArray(u.tahfidz_ujian) ? u.tahfidz_ujian : [],
    });
  }, [s]);
  if (!s) return <Dialog open={false} onOpenChange={() => {}} title="">{null}</Dialog>;

  const setPred = (key: string, p: string) => setV((o: any) => {
    const prevAuto = INDIKATOR[key]?.[o[key]] || "";
    const ket = !o["ket_" + key] || o["ket_" + key] === prevAuto ? INDIKATOR[key]?.[p] || "" : o["ket_" + key];
    return { ...o, [key]: o[key] === p ? "" : p, ["ket_" + key]: o[key] === p ? (o["ket_" + key] === prevAuto ? "" : o["ket_" + key]) : ket };
  });
  const setNilai = (key: string, val: string) => {
    const clean = val.replace(/[^0-9]/g, "").slice(0, 3);
    setV((o: any) => ({ ...o, [key + "_nilai"]: clean }));
    const p = predikatNilai(clean);
    if (p) setV((o: any) => (o[key] === p ? o : { ...o, [key]: p, ["ket_" + key]: !o["ket_" + key] || o["ket_" + key] === (INDIKATOR[key]?.[o[key]] || "") ? INDIKATOR[key][p] : o["ket_" + key] }));
  };
  const setUjian = (l: UjianJuz[]) => setV((o: any) => {
    const lamaRingkas = ringkasUjianTahfidz(o.tahfidz_ujian || []), lamaPred = (o.tahfidz_ujian || []).length ? predikatNilai(skorUjianTahfidz(o.tahfidz_ujian)) : "";
    const pred = l.length ? predikatNilai(skorUjianTahfidz(l)) : "";
    const ketAuto = !o.ket_tahfidz || o.ket_tahfidz === lamaRingkas || o.ket_tahfidz === (INDIKATOR.tahfidz?.[o.tahfidz] || "");
    return { ...o, tahfidz_ujian: l, tahfidz: !o.tahfidz || o.tahfidz === lamaPred ? pred : o.tahfidz, ket_tahfidz: ketAuto ? ringkasUjianTahfidz(l) : o.ket_tahfidz };
  });
  const save = async () => {
    setBusy(true);
    try {
      // makhraj & tajwid dikosongkan agar server mengambil dari penilaian menu Santri
      const r = await rpc("saveUjian", s.id, periode.tahun_ajaran, periode.semester, { ...v, makhraj: "", makhraj_nilai: "", tajwid: "", tajwid_nilai: "" });
      toast.success("Nilai ujian tersimpan", { description: `Makhraj ${r.makhraj || "–"} · Tajwid ${r.tajwid || "–"}${r.tahfidz_nilai != null ? ` · Tahfidz ${r.tahfidz} (${fmtSkor(r.tahfidz_nilai)})` : ""}` });
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <Dialog open={!!s} onOpenChange={(o) => { if (!o) onClose(); }} wide title={s.nama}
      description={`${s.unit} ${s.tingkat} · ${s.halaqah} · ${periode?.nama} ${periode?.tahun_ajaran}${s.semester_ke ? ` · semester ke-${s.semester_ke}` : ""}`}
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="accent" onClick={save} loading={busy}><Save className="size-4" />Simpan</Button></div>}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-line bg-mist/60 p-3 text-[12.5px]">
          <p className="font-bold">Makhraj & hukum tajwid</p>
          {s.penilaian ? (
            <p className="mt-1 text-muted">Diambil otomatis dari penilaian {F.ymLabel(s.penilaian.ym)}: makhraj <b className="text-ink">{s.penilaian.makhraj || "–"}</b> · tajwid <b className="text-ink">{s.penilaian.tajwid || "–"}</b>.</p>
          ) : <p className="mt-1 text-muted">Belum dinilai semester ini. Isi di menu <b>Santri</b> → <b>⋯</b> → <b>Penilaian makhraj & tajwid</b>.</p>}
        </div>
        {ASPEK.filter((a) => !a.nilai).map((a) => {
          const opts = a.key === "tahfidz" ? PREDIKAT_TAHFIDZ : PREDIKAT;
          const saran = a.key === "tahfidz" ? s.saran?.tahfidz : a.key === "kehadiran" ? s.saran?.kehadiran : "";
          const info = a.key === "tahfidz" ? s.saran?.tahfidz_info : a.key === "kehadiran" ? s.saran?.kehadiran_info : "";
          return (
            <div key={a.key} className="rounded-2xl border border-line p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto text-[13.5px] font-bold">{a.label}</p>
                <div className="flex gap-1">
                  {opts.map((p) => (
                    <button key={p} onClick={() => setPred(a.key, p)} className={cn("h-9 min-w-[38px] rounded-lg border px-2 text-[13px] font-extrabold transition", v[a.key] === p ? PRED_CLS[p] + " border-transparent" : "border-line bg-white text-muted hover:border-leaf")}>{p}</button>
                  ))}
                </div>
              </div>
              {info && (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                  <Sparkles className="size-3.5 text-saffron" />{info}
                  {saran && v[a.key] !== saran && !(a.key === "tahfidz" && (v.tahfidz_ujian || []).length) && <button onClick={() => setPred(a.key, saran)} className="rounded-full bg-saffron-soft px-2 py-0.5 font-bold text-[#9a5510]">Pakai saran: {saran}</button>}
                </p>
              )}
              {a.key === "tahfidz" && <UjianTahfidz s={s} list={v.tahfidz_ujian || []} onChange={setUjian} />}
              <Textarea rows={2} value={v["ket_" + a.key] || ""} onChange={(e) => setV((o: any) => ({ ...o, ["ket_" + a.key]: e.target.value }))} placeholder="Keterangan (terisi otomatis dari indikator, bisa diubah)" className="mt-2 text-[13px]" />
            </div>
          );
        })}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Penguji"><Input value={v.penguji || ""} onChange={(e) => setV((o: any) => ({ ...o, penguji: e.target.value }))} placeholder="Nama penguji (kosong = nama Anda)" /></Field>
          <Field label="Tanggal ujian"><Input type="date" value={v.tanggal || ""} max={F.todayLocal()} onChange={(e) => setV((o: any) => ({ ...o, tanggal: e.target.value }))} /></Field>
        </div>
        <Field label="Catatan umum"><Textarea rows={2} value={v.catatan || ""} onChange={(e) => setV((o: any) => ({ ...o, catatan: e.target.value }))} /></Field>
      </div>
    </Dialog>
  );
}
