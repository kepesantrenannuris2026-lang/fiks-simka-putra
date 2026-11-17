"use client";
/** Ujian Tahfidz Semester — Pedoman 2026/2027.
 *  5 soal per juz, nilai awal 100: khafī −0,5 · jalī −1 · lupa sambungan −3 · tidak menjawab −10. KKM 75.
 *  Penguji boleh menguji seluruh santri di unit penugasannya; draft bisa dilanjutkan atau di-restart, hasil final terkunci. */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronRight, ClipboardCheck, Minus, Play, Plus, RotateCcw, Search } from "lucide-react";
import { rpc } from "@/lib/api";
import * as T from "@/lib/target";
import { useApp } from "../App";
import { Badge, Button, Card, Dialog, Empty, Input, Segmented, Select, Skeleton, Textarea, cn } from "../ui";

const angka = (n: any) => (n == null ? "–" : String(n).replace(".", ","));
const STATUS: Record<string, { label: string; tone: "muted" | "saffron" | "leaf" }> = {
  belum: { label: "Belum diuji", tone: "muted" },
  draft: { label: "Sedang ujian", tone: "saffron" },
  final: { label: "Selesai", tone: "leaf" },
};
type Periode = ReturnType<typeof T.parseTa>;
/** Periode berjalan dan periode sebelumnya. */
const pilihanPeriode = (): Periode[] => {
  const now = T.semesterOf(new Date().toISOString().slice(0, 7));
  const prev = now.semester === 1 ? T.parseTa(`${now.ta - 1}/${now.ta}`, 2) : T.parseTa(now.tahun_ajaran, 1);
  return [now, prev];
};

export default function UjianSemester() {
  const [periode, setPeriode] = React.useState<Periode>(() => pilihanPeriode()[0]);
  const [data, setData] = React.useState<any>(null);
  const [hk, setHk] = React.useState("");
  const [cari, setCari] = React.useState("");
  const [filter, setFilter] = React.useState<"semua" | "belum" | "draft" | "final">("semua");
  const [buka, setBuka] = React.useState<string | null>(null);
  const [restart, setRestart] = React.useState<any>(null);
  const muat = React.useCallback(async () => {
    try { setData(await rpc("getUjianDaftar", periode.tahun_ajaran, periode.semester)); } catch (e: any) { toast.error(e.message); }
  }, [periode]);
  React.useEffect(() => { setData(null); muat(); }, [muat]);

  if (buka) return <FormUjian id={buka} periode={periode} onBack={(ubah) => { setBuka(null); if (ubah) muat(); }} />;

  const list = (data?.santri || []).filter((s: any) => (!hk || s.halaqah_key === hk) && (filter === "semua" || s.status === filter) && (!cari || s.nama.toLowerCase().includes(cari.toLowerCase())));
  const persen = data?.ringkasan.total ? Math.round((data.ringkasan.selesai / data.ringkasan.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="anim-rise flex flex-wrap items-end gap-3">
        <div className="min-w-0 grow basis-[280px]">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-leaf">Kepesantrenan Nuris</p>
          <h2 className="text-2xl font-extrabold tracking-tight">Ujian tahfidz semester</h2>
          <p className="text-[13px] text-muted">Cari santri di unit Anda, lalu tekan <b>Isi ujian</b>. 5 soal per juz · Khafī −0,5 · Jalī −1 · Lupa −3 · Tidak menjawab −10 · KKM 75.</p>
        </div>
        <Select aria-label="Periode" className="w-full sm:w-auto" value={`${periode.tahun_ajaran}|${periode.semester}`} onChange={(e) => { const [ta, s] = e.target.value.split("|"); setPeriode(T.parseTa(ta, Number(s))); }}>
          {pilihanPeriode().map((p) => <option key={p.tahun_ajaran + p.semester} value={`${p.tahun_ajaran}|${p.semester}`}>Ujian {p.tahun_ajaran} · Semester {p.semester === 1 ? "1 (Ganjil)" : "2 (Genap)"}</option>)}
        </Select>
      </div>

      {!data ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data.santri.length ? (
        <Empty icon={<ClipboardCheck className="size-8" />} title="Belum ada santri di unit Anda">Ujian semester dapat diisi musyrif/ah untuk seluruh santri di unit penugasannya.</Empty>
      ) : (
        <>
          <Card className="anim-rise space-y-3 bg-leaf-soft/60 p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              <b className="text-leaf-deep">{data.units.join(", ")}</b>
              <span>{data.ringkasan.total} santri</span>
              <span className="text-leaf-deep">{data.ringkasan.selesai} selesai</span>
              {data.ringkasan.draft > 0 && <span className="text-[#9a4f0f]">{data.ringkasan.draft} sedang ujian</span>}
              <span className="ml-auto font-bold tabular">{persen}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white">
              <motion.div className="h-full rounded-full bg-leaf" initial={{ width: 0 }} animate={{ width: persen + "%" }} transition={{ duration: 0.8, ease: "easeOut" }} />
            </div>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Select aria-label="Halaqah" className="min-w-[200px] flex-[2]" value={hk} onChange={(e) => setHk(e.target.value)}>
              <option value="">Semua halaqah ({data.santri.length})</option>
              {data.halaqah.map((h: any) => <option key={h.key} value={h.key}>{h.tingkat} · {h.halaqah} — {h.musyrif} ({h.selesai}/{h.jumlah})</option>)}
            </Select>
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input aria-label="Cari santri" className="pl-9" placeholder="Cari nama santri…" value={cari} onChange={(e) => setCari(e.target.value)} />
            </div>
          </div>
          <Segmented id="ujian-filter" className="w-full sm:w-auto" value={filter} onChange={(v) => setFilter(v as any)}
            options={[{ value: "semua", label: "Semua" }, { value: "belum", label: "Belum" }, { value: "draft", label: "Sedang" }, { value: "final", label: "Selesai" }]} />
          <Card className="divide-y divide-line p-0">
            {list.length === 0 && <p className="p-5 text-center text-[13px] text-muted">Tidak ada santri yang cocok.</p>}
            <AnimatePresence initial={false}>
              {list.map((s: any, i: number) => (
                <motion.div key={s.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.025 * Math.min(i, 12) } }} exit={{ opacity: 0 }}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-[180px]">
                    <p className="truncate text-[14px] font-bold uppercase">{s.nama}</p>
                    <p className="truncate text-[12px] text-muted">{s.unit} · Kelas {s.tingkat} · {s.halaqah}</p>
                    {s.status !== "belum" && <p className="truncate text-[11.5px] text-muted">Penguji: {s.penguji || "-"}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge>
                    {s.status === "final" && <span className={cn("rounded-lg px-2 py-0.5 text-[13px] font-extrabold tabular", (s.nilai ?? 0) >= T.KKM ? "bg-leaf text-white" : "bg-rose text-white")}>{angka(s.nilai)}</span>}
                    {s.status === "draft" && <Button size="sm" variant="ghost" onClick={() => setRestart(s)}><RotateCcw className="size-3.5" />Restart</Button>}
                    <Button size="sm" variant={s.status === "belum" ? "accent" : s.status === "draft" ? "dark" : "outline"} onClick={() => setBuka(s.id)}>
                      {s.status === "belum" ? <><Play className="size-3.5" />Isi ujian</> : s.status === "draft" ? <>Lanjutkan<ChevronRight className="size-3.5" /></> : "Lihat"}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </Card>
        </>
      )}

      <Dialog open={!!restart} onOpenChange={(o) => !o && setRestart(null)} title="Restart ujian?"
        description={restart ? `${restart.nama} kembali berstatus Belum diuji. Draft penguji ${restart.penguji || "sebelumnya"} dihapus; penguji lain dapat mengambil alih.` : ""}
        footer={<>
          <Button variant="ghost" onClick={() => setRestart(null)}>Batal</Button>
          <Button variant="danger" onClick={async () => {
            try { await rpc("restartUjian", restart.id, periode.tahun_ajaran, periode.semester); toast.success("Ujian dikembalikan ke Belum diuji"); setRestart(null); muat(); }
            catch (e: any) { toast.error(e.message); }
          }}><RotateCcw className="size-4" />Restart</Button>
        </>}>
        <p className="text-[13px] text-muted">Hasil yang sudah final tidak terpengaruh.</p>
      </Dialog>
    </div>
  );
}

const soalBaru = () => Array.from({ length: T.SOAL_PER_JUZ }, T.soalKosong);
const URUT_MODE = T.MODE_UJIAN.map((m) => m.id);

function FormUjian({ id, periode, onBack }: { id: string; periode: Periode; onBack: (ubah: boolean) => void }) {
  const { admin, dirty } = useApp();
  const [d, setD] = React.useState<any>(null);
  const [mode, setMode] = React.useState<"juz" | "sebagian" | "tahsin">("juz");
  const [juz, setJuz] = React.useState<Record<number, T.Soal[]>>({});
  const [bagian, setBagian] = React.useState<number[]>([1]);
  const [porsi, setPorsi] = React.useState(1);
  const [soal30, setSoal30] = React.useState<T.Soal[]>(soalBaru());
  const [tahsin, setTahsin] = React.useState({ fatihah: T.soalKosong(), najm: T.soalKosong() });
  const [catatan, setCatatan] = React.useState("");
  const [catatanAuto, setCatatanAuto] = React.useState(true);
  const [simpan, setSimpan] = React.useState(false);
  const [konfirmasi, setKonfirmasi] = React.useState(false);

  React.useEffect(() => {
    rpc("getUjianSantri", id, periode.tahun_ajaran, periode.semester).then((r: any) => {
      setD(r);
      const u = r.ujian?.data;
      if (u) {
        setMode(u.mode);
        if (u.mode === "juz") setJuz(Object.fromEntries(u.items.map((it: any) => [it.juz, it.soal])));
        if (u.mode === "sebagian") { setBagian(u.items[0].bagian); setPorsi(u.items[0].bagian.length); setSoal30(u.items[0].soal); }
        if (u.mode === "tahsin") setTahsin({ fatihah: u.items.find((x: any) => x.kind === "fatihah")?.soal[0] || T.soalKosong(), najm: u.items.find((x: any) => x.kind === "najm")?.soal[0] || T.soalKosong() });
        if (u.catatan) { setCatatan(u.catatan); setCatatanAuto(false); }
      } else {
        setMode(r.saran_mode);
        if (r.saran_mode === "juz") {
          // Usulan: juz selesai terbaru yang belum diuji, atau Juz 30.
          const belum = (r.hafalan.juz_selesai || []).filter((j: number) => !(r.hafalan.juz_diuji || []).includes(j));
          setJuz(Object.fromEntries((belum.length ? [Math.max(...belum)] : [30]).map((j: number) => [j, soalBaru()])));
        }
      }
    }).catch((e) => { toast.error(e.message); onBack(false); });
    return () => { dirty.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const ujian: T.UjianV2 = React.useMemo(() => ({
    v: 2, mode, catatan,
    items: mode === "juz" ? Object.entries(juz).map(([j, s]) => ({ kind: "juz" as const, juz: Number(j), soal: s })).sort((a, b) => b.juz - a.juz)
      : mode === "sebagian" ? [{ kind: "sebagian" as const, juz: 30, bagian, soal: soal30 }]
      : [{ kind: "fatihah" as const, soal: [tahsin.fatihah] }, { kind: "najm" as const, soal: [tahsin.najm] }],
  }), [mode, juz, bagian, soal30, tahsin, catatan]);
  const nilai = T.nilaiUjianV2(ujian);
  const ringkas = T.ringkasUjianV2(ujian);
  React.useEffect(() => { if (catatanAuto) setCatatan(ringkas); }, [ringkas, catatanAuto]);
  const ubah = () => { dirty.current = true; };

  if (!d) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  const final = d.ujian?.status === "final", kunci = final && !admin;

  const kirim = async (selesai: boolean) => {
    if (mode === "sebagian" && bagian.length !== porsi) return toast.error(`Pilih ${porsi} kelompok surat sesuai porsi ${porsi}/4 juz.`);
    setSimpan(true);
    try {
      const r = await rpc("saveUjianV2", id, periode.tahun_ajaran, periode.semester, ujian, selesai);
      dirty.current = false;
      toast.success(selesai ? `Ujian selesai · nilai ${angka(r.nilai)}` : "Draft ujian tersimpan", { description: selesai ? (r.nilai >= T.KKM ? "Memenuhi KKM 75." : "Di bawah KKM 75.") : undefined });
      if (selesai) onBack(true); else setD((x: any) => ({ ...x, ujian: { ...(x.ujian || {}), status: "draft" } }));
    } catch (e: any) { toast.error(e.message); }
    finally { setSimpan(false); setKonfirmasi(false); }
  };
  const geser = (arah: number) => {
    const i = URUT_MODE.indexOf(mode) + arah;
    if (i >= 0 && i < URUT_MODE.length && !kunci) { ubah(); setMode(URUT_MODE[i] as any); }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="anim-rise flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-leaf">Kepesantrenan Nuris</p>
          <h2 className="truncate text-xl font-extrabold uppercase tracking-tight sm:text-2xl">{d.santri.nama}</h2>
          <p className="text-[13px] text-muted">{d.santri.unit} · Kelas {d.santri.tingkat} · {d.santri.halaqah} · hafalan {d.hafalan.teks}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { if (!dirty.current || confirm("Ada isian yang belum disimpan. Kembali ke daftar?")) onBack(false); }}><ArrowLeft className="size-4" />Daftar peserta</Button>
      </div>

      <Card className="anim-rise border-dashed bg-mist/60 p-4">
        <p className="text-[13px] font-bold">Makhraj & hukum tajwid</p>
        <p className="text-[12.5px] text-muted">
          {d.penilaian?.makhraj || d.penilaian?.tajwid
            ? <>Penilaian semester ini: makhraj <b className="text-ink">{d.penilaian.makhraj || "–"}</b> · tajwid <b className="text-ink">{d.penilaian.tajwid || "–"}</b>.</>
            : "Belum ada penilaian makhraj & tajwid semester ini (diisi dari menu Santri)."}
        </p>
      </Card>

      {final && (
        <Card className="border-leaf/40 bg-leaf-soft/70 p-4 text-[13px]">
          <b>Ujian sudah final</b> · nilai {angka(d.ujian.nilai)} · penguji {d.ujian.penguji}. {kunci ? "Hanya pimpinan yang dapat mengubah hasil final." : "Anda (pimpinan) dapat mengoreksi hasil ini."}
        </Card>
      )}

      <Card className="anim-rise space-y-4">
        <p className="text-[15px] font-bold">Materi ujian</p>
        <Segmented id="mode-ujian" className="flex w-full" value={mode} onChange={(v) => { if (!kunci) { ubah(); setMode(v as any); } }}
          options={T.MODE_UJIAN.map((m) => ({ value: m.id, label: <><span className="sm:hidden">{({ juz: "Per juz", sebagian: "Belum 1 juz", tahsin: "Tahsin" } as any)[m.id]}</span><span className="hidden sm:inline">{m.label}</span></> }))} />
        <p className="text-center text-[11.5px] text-muted">Geser ke kiri/kanan atau ketuk untuk memilih materi.</p>
        <motion.div drag={kunci ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} className="touch-pan-y"
          onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 70) geser(info.offset.x < 0 ? 1 : -1); }}>
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }} className="space-y-4">
              <p className="rounded-xl bg-mist px-3 py-2 text-[12.5px] text-muted">{T.MODE_UJIAN.find((m) => m.id === mode)!.info}</p>

              {mode === "juz" && (
                <>
                  <div>
                    <p className="mb-2 text-[13px] font-bold">Juz yang diujikan</p>
                    <div className="grid grid-cols-10 gap-1.5">
                      {Array.from({ length: 30 }, (_, i) => 30 - i).map((j) => {
                        const pilih = !!juz[j], selesai = d.hafalan.juz_selesai.includes(j), diuji = d.hafalan.juz_diuji.includes(j);
                        return (
                          <motion.button key={j} whileTap={{ scale: 0.88 }} type="button" disabled={kunci} aria-pressed={pilih} aria-label={`Juz ${j}`}
                            onClick={() => { if (kunci) return; ubah(); setJuz((x) => { const n = { ...x }; if (n[j]) delete n[j]; else n[j] = soalBaru(); return n; }); }}
                            className={cn("tabular h-9 rounded-lg border text-[13px] font-bold transition-colors",
                              pilih ? "border-pine bg-pine text-white shadow-sm" : diuji ? "border-saffron/50 bg-saffron-soft text-[#9a4f0f]" : selesai ? "border-leaf/40 bg-leaf-soft text-leaf-deep" : "border-line bg-white text-muted hover:border-leaf")}>
                            {j}
                          </motion.button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11.5px] text-muted">Hijau muda = juz sudah selesai dihafal · oranye = sudah diuji. Juz yang lulus otomatis ditandai sudah diuji.</p>
                  </div>
                  <AnimatePresence initial={false}>
                    {Object.keys(juz).map(Number).sort((a, b) => b - a).map((j) => (
                      <motion.div key={j} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}>
                        <KartuSoal judul={`Juz ${j}`} soal={juz[j]} kunci={kunci} onChange={(s) => { ubah(); setJuz((x) => ({ ...x, [j]: s })); }} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </>
              )}

              {mode === "sebagian" && (
                <>
                  <div>
                    <p className="mb-2 text-[13px] font-bold">Hafalan sebagian · Juz 30</p>
                    <Segmented id="porsi" className="flex w-full" value={String(porsi)}
                      onChange={(v) => { if (kunci) return; ubah(); const n = Number(v); setPorsi(n); setBagian((b) => (b.length > n ? b.slice(0, n) : b)); }}
                      options={[{ value: "1", label: "¼ juz" }, { value: "2", label: "½ juz" }, { value: "3", label: "¾ juz" }]} />
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {T.KELOMPOK_JUZ30.map((k) => {
                        const on = bagian.includes(k.no);
                        return (
                          <motion.button key={k.no} whileTap={{ scale: 0.97 }} type="button" disabled={kunci}
                            onClick={() => { ubah(); setBagian((b) => (on ? b.filter((x) => x !== k.no) : b.length >= porsi ? [...b.slice(1), k.no] : [...b, k.no]).sort()); }}
                            className={cn("flex items-start gap-2 rounded-xl border p-3 text-left transition-colors", on ? "border-leaf bg-leaf-soft" : "border-line bg-white hover:border-leaf")}>
                            <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-leaf bg-leaf text-white" : "border-line")}>{on && <Check className="size-3.5" />}</span>
                            <span><b className="block text-[13px]">Kelompok {k.no}</b><span className="text-[12px] text-muted">{k.label}</span></span>
                          </motion.button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11.5px] text-muted">Pilih {porsi} kelompok surat yang benar-benar sudah dikuasai. Ujian tetap 5 soal dengan nilai awal 100.</p>
                  </div>
                  <KartuSoal judul={`Juz 30 · ${porsi}/4 bagian`} soal={soal30} kunci={kunci} onChange={(s) => { ubah(); setSoal30(s); }} />
                </>
              )}

              {mode === "tahsin" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <KartuSoal judul="A. Setor Al-Fatihah" sub="Tanpa melihat mushaf" soal={[tahsin.fatihah]} kunci={kunci} tunggal onChange={(s) => { ubah(); setTahsin((x) => ({ ...x, fatihah: s[0] })); }} />
                  <KartuSoal judul="B. Baca An-Najm 1–18" sub="Dengan melihat mushaf" soal={[tahsin.najm]} kunci={kunci} tunggal onChange={(s) => { ubah(); setTahsin((x) => ({ ...x, najm: s[0] })); }} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div>
          <p className="mb-1 text-[13px] font-bold">Catatan penguji</p>
          <Textarea rows={3} disabled={kunci} value={catatan} onChange={(e) => { ubah(); setCatatanAuto(false); setCatatan(e.target.value); }} placeholder="Terisi otomatis dari hasil ujian" />
          {!catatanAuto && !kunci && <button className="mt-1 text-[12px] font-semibold text-leaf hover:underline" onClick={() => setCatatanAuto(true)}>Kembalikan ke catatan otomatis</button>}
        </div>
      </Card>

      {!kunci && (
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="no-print fixed inset-x-0 z-20 px-3 md:left-[84px] lg:left-[248px]"
          style={{ bottom: "calc(var(--nav-h, 0px) + 10px + var(--fab-lift, 0px))" }}>
          <div className="mx-auto flex max-w-[1180px] items-center gap-2 rounded-2xl bg-pine p-2 pl-4 text-white shadow-2xl shadow-pine/30">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[11px] text-white/70">Nilai ujian (100 − potongan)</p>
              <p className="flex items-center gap-2 text-xl font-extrabold tabular">
                <motion.span key={String(nilai)} initial={{ scale: 1.25 }} animate={{ scale: 1 }}>{angka(nilai)}</motion.span>
                {nilai != null && <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-bold", nilai >= T.KKM ? "bg-leaf" : "bg-rose")}>{nilai >= T.KKM ? "Lulus" : "< KKM"}</span>}
              </p>
            </div>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" loading={simpan} onClick={() => kirim(false)} disabled={!ujian.items.length}>Simpan draft</Button>
            <Button size="sm" variant="accent" onClick={() => setKonfirmasi(true)} disabled={!ujian.items.length || simpan}><Check className="size-4" />Selesai</Button>
          </div>
        </motion.div>
      )}

      <Dialog open={konfirmasi} onOpenChange={setKonfirmasi} title="Selesaikan ujian?" description={`${d.santri.nama} · nilai ${angka(nilai)}. Hasil final tidak dapat diubah kecuali oleh pimpinan.`}
        footer={<>
          <Button variant="ghost" onClick={() => setKonfirmasi(false)}>Periksa lagi</Button>
          <Button loading={simpan} onClick={() => kirim(true)}><Check className="size-4" />Ya, selesai</Button>
        </>}>
        <p className="text-[13px] text-ink">{ringkas}</p>
      </Dialog>
    </div>
  );
}

const JENIS = [
  { k: "khafi", label: "Khafī", pot: "−0,5" },
  { k: "jali", label: "Jalī", pot: "−1" },
  { k: "lupa", label: "Lupa", pot: "−3" },
] as const;

function KartuSoal({ judul, sub, soal, onChange, kunci, tunggal }: { judul: string; sub?: string; soal: T.Soal[]; onChange: (s: T.Soal[]) => void; kunci: boolean; tunggal?: boolean }) {
  const nilai = T.nilaiItem({ soal }), potong = Math.round((100 - nilai) * 10) / 10;
  const set = (i: number, k: keyof T.Soal, v: number) => onChange(soal.map((s, j) => (j === i ? { ...s, [k]: Math.max(0, Math.min(k === "tidak" ? 1 : 99, v)) } : s)));
  return (
    <div className="rounded-2xl border border-line bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold">{judul}</p>
          {sub && <p className="text-[11.5px] text-muted">{sub}</p>}
        </div>
        <span className="text-[12px] font-bold text-rose tabular">−{String(potong).replace(".", ",")}</span>
        <motion.span key={nilai} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className={cn("rounded-lg px-2 py-0.5 text-[15px] font-extrabold tabular", nilai >= T.KKM ? "bg-leaf-soft text-leaf-deep" : "bg-rose-soft text-rose")}>{String(nilai).replace(".", ",")}</motion.span>
      </div>
      <div className="space-y-2">
        {soal.map((s, i) => (
          <div key={i} className={cn("rounded-xl bg-mist/70 p-2", s.tidak ? "ring-1 ring-rose/40" : "")}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[12px] font-bold text-muted">{tunggal ? "Kesalahan" : `Soal ${i + 1}`}</span>
              <button type="button" disabled={kunci} onClick={() => set(i, "tidak", s.tidak ? 0 : 1)} aria-pressed={!!s.tidak}
                className={cn("rounded-lg px-2 py-0.5 text-[11.5px] font-bold transition-colors", s.tidak ? "bg-rose text-white" : "bg-white text-muted ring-1 ring-line")}>Tidak menjawab −10</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {JENIS.map((j) => (
                <div key={j.k}>
                  <p className="mb-0.5 text-center text-[10.5px] text-muted">{j.label} <span className="text-rose">{j.pot}</span></p>
                  <div className="flex h-9 items-center rounded-lg border border-line bg-white">
                    <button type="button" disabled={kunci} aria-label={`Kurangi ${j.label} ${judul} soal ${i + 1}`} onClick={() => set(i, j.k, s[j.k] - 1)} className="grid h-full w-8 place-items-center text-muted active:scale-90"><Minus className="size-3.5" /></button>
                    <motion.span key={s[j.k]} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex-1 text-center text-[15px] font-bold tabular">{s[j.k]}</motion.span>
                    <button type="button" disabled={kunci} aria-label={`Tambah ${j.label} ${judul} soal ${i + 1}`} onClick={() => set(i, j.k, s[j.k] + 1)} className="grid h-full w-8 place-items-center text-leaf active:scale-90"><Plus className="size-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
