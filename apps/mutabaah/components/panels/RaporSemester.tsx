"use client";
/** Rapor Al-Qur'an semester — satu lembar F4 per santri, terisi otomatis dari data aplikasi.
 *  Asatidz cukup melengkapi yang kosong lalu mengunduh PDF satu santri atau satu halaqah sekaligus (tanpa mail-merge Word). */
import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Eye, FileDown, FileText, Printer, RotateCcw, Save, Search, Sparkles } from "lucide-react";
import { rpc } from "@/lib/api";
import * as T from "@/lib/target";
import { useApp } from "../App";
import { Badge, Button, Card, Empty, Field, Input, Select, Skeleton, Textarea, cn } from "../ui";

type Periode = ReturnType<typeof T.parseTa>;
const pilihanPeriode = (): Periode[] => {
  const now = T.semesterOf(new Date().toISOString().slice(0, 7));
  const prev = now.semester === 1 ? T.parseTa(`${now.ta - 1}/${now.ta}`, 2) : T.parseTa(now.tahun_ajaran, 1);
  return [now, prev];
};
const pdf = () => import("@/lib/raporPdf");
/** Lengkapi bidang yang belum dikirim server versi lama (masa transisi saat fungsi API belum dimuat ulang). */
const rapi = (r: any) => ({
  ...r, riwayat: r.riwayat || [], murajaah: r.murajaah || { baris: 0, rata: null, n: 0, halaman: 0, predikat: "" },
  tahsin: r.tahsin || { lulus: r.iqro_lulus ?? null, wajib: !!r.target?.iqro, materi: "", sumber: "" },
  rekap: { murajaah: "0", ...(r.rekap || {}) }, rekap_auto: { murajaah: "0", ...(r.rekap_auto || {}) },
  ujian: { kkm: 75, ...(r.ujian || {}) },
});
const WARNA: Record<string, string> = { "A+": "bg-pine text-white", A: "bg-leaf text-white", "B+": "bg-sky text-white", B: "bg-saffron text-pine", C: "bg-rose text-white" };
const BATAS_CATATAN = 320;

export default function RaporSemester() {
  const { raport, hq, curHq } = useApp();
  const [periode, setPeriode] = React.useState<Periode>(() => (raport?.ym ? T.semesterOf(raport.ym) : pilihanPeriode()[0]));
  const [hk, setHk] = React.useState(() => (curHq && !curHq.startsWith("scope:") ? curHq : hq[0]?.key || ""));
  const [list, setList] = React.useState<any[] | null>(null);
  const [buka, setBuka] = React.useState<string | null>(raport?.id || null);
  const [cari, setCari] = React.useState("");
  const [cetak, setCetak] = React.useState(false);
  React.useEffect(() => { if (!hk && hq[0]) setHk(hq[0].key); }, [hq, hk]);
  const muat = React.useCallback(async () => {
    if (!hk) return;
    try { setList((await rpc("getRaporHalaqah", hk, periode.tahun_ajaran, periode.semester)).santri.map(rapi)); } catch (e: any) { toast.error(e.message); setList([]); }
  }, [hk, periode]);
  React.useEffect(() => { setList(null); muat(); }, [muat]);

  if (buka) return <EditorRapor id={buka} periode={periode} onBack={(ubah) => { setBuka(null); if (ubah) muat(); }} />;

  const h = hq.find((x) => x.key === hk);
  const tampil = (list || []).filter((r) => !cari || r.santri.nama.toLowerCase().includes(cari.toLowerCase()));
  const terisi = (r: any) => r.aspek.filter((a: any) => a.predikat).length;
  const cetakHalaqah = async () => {
    if (!list?.length) return;
    setCetak(true);
    try {
      await (await pdf()).unduhRapor(list, `Rapor_${h?.halaqah || "halaqah"}_${h?.unit || ""}_kelas_${h?.tingkat || ""}`);
      toast.success(`PDF ${list.length} rapor siap`, { description: "Satu lembar per santri. Cetak pada kertas F4 (215 × 330 mm), skala 100%." });
    } catch (e: any) { toast.error(e.message); } finally { setCetak(false); }
  };

  return (
    <div className="space-y-4">
      <div className="anim-rise">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-leaf">Rapor Al-Qur'an</p>
        <h2 className="text-2xl font-extrabold tracking-tight">Rapor semester</h2>
        <p className="text-[13px] text-muted">Satu lembar F4 per santri, terisi otomatis dari setoran, murajaah, penilaian, sertifikasi, dan ujian semester. Lengkapi yang kosong, lalu unduh PDF satu santri atau satu halaqah sekaligus — tanpa mail-merge Word.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select aria-label="Periode" className="w-auto" value={`${periode.tahun_ajaran}|${periode.semester}`} onChange={(e) => { const [ta, s] = e.target.value.split("|"); setPeriode(T.parseTa(ta, Number(s))); }}>
          {pilihanPeriode().map((p) => <option key={p.tahun_ajaran + p.semester} value={`${p.tahun_ajaran}|${p.semester}`}>{p.tahun_ajaran} · Semester {p.semester} ({p.nama})</option>)}
        </Select>
        <Select aria-label="Halaqah" className="min-w-[220px] flex-[2]" value={hk} onChange={(e) => setHk(e.target.value)}>
          {hq.map((x) => <option key={x.key} value={x.key}>{x.unit} · {x.tingkat} · {x.halaqah} ({x.jumlah})</option>)}
        </Select>
        <Button variant="accent" loading={cetak} disabled={!list?.length} onClick={cetakHalaqah}><Printer className="size-4" />Cetak 1 halaqah</Button>
      </div>
      {list && list.length > 6 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input className="pl-9" placeholder="Cari santri…" value={cari} onChange={(e) => setCari(e.target.value)} />
        </div>
      )}
      {!list ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !list.length ? (
        <Empty icon={<FileText className="size-8" />} title="Belum ada santri">Pilih halaqah binaan Anda.</Empty>
      ) : (
        <Card className="divide-y divide-line p-0">
          {tampil.map((r, i) => (
            <motion.div key={r.santri.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.03 * Math.min(i, 12) } }} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1 basis-[200px]">
                <p className="truncate text-[14px] font-bold uppercase">{r.santri.nama}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {r.aspek.map((a: any) => (
                    <span key={a.key} title={a.label} className={cn("inline-grid h-5 min-w-[22px] place-items-center rounded px-1 text-[10.5px] font-bold", a.predikat ? WARNA[a.predikat] : "border border-dashed border-line text-muted")}>{a.predikat || "·"}</span>
                  ))}
                  <span className="ml-1 text-[11.5px] text-muted">{terisi(r)}/6 aspek · ujian {r.ujian.nilai == null ? "–" : String(r.ujian.nilai).replace(".", ",")} · murajaah {r.rekap.murajaah} hlm</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="ghost" onClick={async () => { try { await (await pdf()).unduhRapor([r], `Rapor_${r.santri.nama}_${r.periode.label}`); } catch (e: any) { toast.error(e.message); } }}><FileDown className="size-3.5" />PDF</Button>
                <Button size="sm" variant={terisi(r) < 6 ? "dark" : "outline"} onClick={() => setBuka(r.santri.id)}>{terisi(r) < 6 ? "Lengkapi" : "Ubah"}</Button>
              </div>
            </motion.div>
          ))}
        </Card>
      )}
    </div>
  );
}

const salin = (x: any) => JSON.parse(JSON.stringify(x ?? {}));

function Bagian({ judul, ringkas, buka: awal = false, children }: { judul: string; ringkas?: React.ReactNode; buka?: boolean; children: React.ReactNode }) {
  const [buka, setBuka] = React.useState(awal);
  return (
    <Card className="anim-rise p-0">
      <button type="button" onClick={() => setBuka(!buka)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold">{judul}</p>
          {ringkas && <p className="truncate text-[12px] text-muted">{ringkas}</p>}
        </div>
        <motion.span animate={{ rotate: buka ? 180 : 0 }}><ChevronDown className="size-4 text-muted" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {buka && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-line px-4 py-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function EditorRapor({ id, periode, onBack }: { id: string; periode: Periode; onBack: (ubah: boolean) => void }) {
  const { dirty } = useApp();
  const [r, setR] = React.useState<any>(null);
  const [asal, setAsal] = React.useState<any>(null);
  const [simpan, setSimpan] = React.useState(false);
  const [ubahan, setUbahan] = React.useState(false);
  React.useEffect(() => {
    rpc("getRaporSemester", id, periode.tahun_ajaran, periode.semester).then((x: any) => { setR(salin(rapi(x))); setAsal(salin(rapi(x))); }).catch((e) => { toast.error(e.message); onBack(false); });
    return () => { dirty.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const ubah = (f: (x: any) => void) => { setR((x: any) => { const n = salin(x); f(n); return n; }); dirty.current = true; };

  if (!r) return <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  const aspekPredikat = Object.fromEntries(r.aspek.map((a: any) => [a.key, a.predikat]));
  const susunCatatan = () => ubah((x) => { x.catatan = T.narasiCatatan(aspekPredikat, x.santri.gender, { ziyadah_hal: Number(String(x.rekap.ziyadah).replace(",", ".")) || 0, target_juz: x.target.semester, murajaah_rata: x.murajaah.rata, murajaah_n: x.murajaah.n, ujian: x.ujian.nilai }); });

  /** Hanya bagian yang berubah yang dikirim (hemat data). */
  const kirim = async () => {
    const pelengkap: any = {}, aspek: any = {};
    const beda = (a: any, b: any) => JSON.stringify(a ?? "") !== JSON.stringify(b ?? "");
    (["kelas", "kamar"] as const).forEach((k) => { if (beda(r.identitas[k], asal.identitas[k])) pelengkap[k] = r.identitas[k]; });
    if (beda(r.ttd.tanggal, asal.ttd.tanggal)) pelengkap.tanggal = r.ttd.tanggal;
    if (beda(r.absen, asal.absen)) pelengkap.absen = { sakit: r.absen.sakit, izin: r.absen.izin, alpa: r.absen.alpa };
    if (beda(r.iqro_lulus, asal.iqro_lulus)) pelengkap.iqro_lulus = r.iqro_lulus;
    if (beda(r.tahsin.materi, asal.tahsin.materi)) pelengkap.tahsin_materi = r.tahsin.materi;
    if (beda(r.ujian_manual, asal.ujian_manual)) pelengkap.ujian_manual = r.ujian_manual;
    const rk: any = {};
    ["hafalan_awal", "ziyadah", "total", "murajaah", "target_semester", "capaian"].forEach((k) => { if (beda(r.rekap[k], asal.rekap[k])) rk[k] = r.rekap[k]; });
    if (Object.keys(rk).length) pelengkap.rekap = rk;
    r.aspek.forEach((a: any, i: number) => { const o = asal.aspek[i]; if (beda(a.predikat, o.predikat) || beda(a.keterangan, o.keterangan)) aspek[a.key] = { p: a.predikat, k: a.keterangan }; });
    const body: any = { pelengkap, aspek };
    if (beda(r.catatan, asal.catatan) || r.catatan_otomatis) body.catatan = r.catatan;
    setSimpan(true);
    try {
      const baru = await rpc("saveRaporSemester", id, periode.tahun_ajaran, periode.semester, body);
      setR(salin(rapi(baru))); setAsal(salin(rapi(baru))); dirty.current = false; setUbahan(true);
      toast.success("Rapor tersimpan");
    } catch (e: any) { toast.error(e.message); } finally { setSimpan(false); }
  };

  const kurangLengkap = [
    ...r.aspek.filter((a: any) => !a.predikat).map((a: any) => a.label),
    ...(r.ujian.nilai == null ? ["Nilai ujian semester"] : []),
    ...(r.tahsin.wajib && r.tahsin.lulus == null ? ["Status tahsin/Iqro'"] : []),
  ];
  const panjangCatatan = (r.catatan || "").length;

  return (
    <div className="space-y-4 pb-28">
      <div className="anim-rise flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-leaf">Rapor {r.periode.label}</p>
          <h2 className="truncate text-xl font-extrabold uppercase tracking-tight sm:text-2xl">{r.santri.nama}</h2>
          <p className="text-[13px] text-muted">{r.santri.unit} · Kelas {r.santri.tingkat} · {r.santri.halaqah} · {r.santri.musyrif}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { if (!dirty.current || confirm("Ada isian yang belum disimpan. Kembali ke daftar?")) onBack(ubahan); }}><ArrowLeft className="size-4" />Kembali</Button>
      </div>

      <Card className="anim-rise border-leaf/30 bg-leaf-soft/60 p-4 text-[13px]">
        <p className="flex items-start gap-2"><Sparkles className="mt-0.5 size-4 shrink-0 text-leaf" /><span>Isian bertanda <b>otomatis</b> diambil dari data aplikasi: makhraj/tajwid dari penilaian bulanan, tahfidz dari capaian target, murajaah dari rerata nilai murajaah setoran, kehadiran dari setoran pekanan, dan riwayat hafalan dari nilai surat serta sertifikasi. Ubah bila perlu; yang diubah tersimpan sebagai pelengkap.</span></p>
        {kurangLengkap.length > 0 && <p className="mt-2 text-[12.5px] text-[#9a4f0f]">Belum lengkap: {kurangLengkap.join(", ")}.</p>}
      </Card>

      <Bagian judul="Identitas" ringkas={`Kelas ${r.identitas.kelas || "-"} · kamar ${r.identitas.kamar || "-"} · ${T.tanggalPanjang(r.ttd.tanggal)}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Kelas"><Input value={r.identitas.kelas} maxLength={12} onChange={(e) => ubah((x) => (x.identitas.kelas = e.target.value))} /></Field>
          <Field label="Kamar"><Input value={r.identitas.kamar} maxLength={40} placeholder="mis. Al-Fatih 3" onChange={(e) => ubah((x) => (x.identitas.kamar = e.target.value))} /></Field>
          <Field label="Tanggal rapor"><Input type="date" value={r.ttd.tanggal} onChange={(e) => ubah((x) => (x.ttd.tanggal = e.target.value))} /></Field>
        </div>
      </Bagian>

      <Bagian judul="A. Ringkasan capaian" ringkas={`Awal ${r.rekap.hafalan_awal} juz · ziyadah ${r.rekap.ziyadah} hlm · total ${r.rekap.total} juz · murajaah ${r.rekap.murajaah} hlm · target ${r.rekap.target_semester} juz`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["hafalan_awal", "Hafalan awal (juz)"], ["ziyadah", "Ziyadah semester (hlm)"], ["total", "Total hafalan (juz)"],
            ["murajaah", "Total murajaah (hlm)"], ["target_semester", "Target semester (juz)"], ["capaian", "Capaian target"],
          ].map(([k, l]) => (
            <Field key={k} label={l} hint={r.rekap[k] !== r.rekap_auto[k] ? <button className="text-leaf hover:underline" onClick={() => ubah((x) => (x.rekap[k] = x.rekap_auto[k]))}>Otomatis: {r.rekap_auto[k] || "–"}</button> : "otomatis"}>
              {k === "capaian"
                ? <Select value={r.rekap.capaian} onChange={(e) => ubah((x) => (x.rekap.capaian = e.target.value))}><option value="">—</option><option>Tercapai</option><option>Belum tercapai</option></Select>
                : <Input value={r.rekap[k]} maxLength={10} onChange={(e) => ubah((x) => (x.rekap[k] = e.target.value))} />}
            </Field>
          ))}
        </div>
        <p className="text-[12px] text-muted">Murajaah dihitung per halaman (15 baris = 1 halaman, dibulatkan) dari {r.murajaah.n} catatan setoran semester ini{r.murajaah.rata != null ? `, rerata nilai ${String(r.murajaah.rata).replace(".", ",")}` : ""}.</p>
      </Bagian>

      <Bagian judul="B. Penilaian enam aspek" buka ringkas={r.aspek.map((a: any) => `${a.label.split(" ")[0]} ${a.predikat || "–"}`).join(" · ")}>
        {r.aspek.map((a: any, i: number) => {
          const pil = a.key === "tahfidz" ? T.PREDIKAT_TAHFIDZ : T.PREDIKAT;
          return (
            <div key={a.key} className="rounded-xl border border-line p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="flex-1 text-[14px] font-bold">{a.label}</p>
                {a.otomatis && <Badge tone="leaf">otomatis</Badge>}
                <div className="flex gap-1">
                  {pil.map((p) => (
                    <motion.button key={p} whileTap={{ scale: 0.9 }} type="button" onClick={() => ubah((x) => { x.aspek[i].predikat = x.aspek[i].predikat === p ? "" : p; x.aspek[i].otomatis = false; if (x.aspek[i].ket_otomatis || !x.aspek[i].keterangan) { x.aspek[i].keterangan = x.aspek[i].predikat ? T.INDIKATOR_SINGKAT[a.key]?.[x.aspek[i].predikat] || "" : ""; x.aspek[i].ket_otomatis = true; } })}
                      className={cn("h-8 min-w-9 rounded-lg border px-2 text-[13px] font-bold transition-colors", a.predikat === p ? "border-transparent " + WARNA[p] : "border-line bg-white text-muted hover:border-leaf")}>{p}</motion.button>
                  ))}
                </div>
              </div>
              <Textarea rows={2} maxLength={200} value={a.keterangan} placeholder="Catatan singkat (terisi otomatis sesuai predikat)" onChange={(e) => ubah((x) => { x.aspek[i].keterangan = e.target.value; x.aspek[i].ket_otomatis = false; })} />
              {a.key === "murajaah" && <p className="mt-1 text-[11.5px] text-muted">Otomatis dari rerata nilai murajaah setoran: A ≥ 90 · B+ 80–89 · B 70–79 · C &lt; 70.</p>}
            </div>
          );
        })}
      </Bagian>

      <Bagian judul="C. Evaluasi & ketidakhadiran" ringkas={`Ujian ${r.ujian.nilai == null ? "belum ada" : String(r.ujian.nilai).replace(".", ",")} · tahsin ${r.tahsin.lulus == null ? "belum ada hasil" : r.tahsin.lulus ? "lulus" : "belum lulus"} · S ${r.absen.sakit} I ${r.absen.izin} A ${r.absen.alpa}`}>
        <div className="rounded-xl bg-mist p-3 text-[13px]">
          {r.ujian.sumber === "aplikasi"
            ? <>Nilai ujian semester <b>{String(r.ujian.nilai).replace(".", ",")}</b> dari menu Ujian Semester ({r.ujian.lulus ? "lulus KKM 75" : "di bawah KKM 75"}{r.ujian.penguji ? ` · penguji ${r.ujian.penguji}` : ""}).</>
            : <>{r.ujian.draft ? "Ujian semester masih berstatus draft. " : "Belum ada ujian final di menu Ujian Semester. "}Bila ujian dilakukan di luar aplikasi, isi nilainya di sini.</>}
        </div>
        {r.ujian.sumber !== "aplikasi" && (
          <Field label="Nilai ujian manual (0–100)"><Input inputMode="decimal" value={r.ujian_manual} onChange={(e) => ubah((x) => (x.ujian_manual = e.target.value))} /></Field>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`Status tahsin / Iqro'${r.tahsin.wajib ? " (syarat semester ini)" : ""}`}>
            <Select value={r.iqro_lulus == null ? "" : r.iqro_lulus ? "1" : "0"} onChange={(e) => ubah((x) => { x.iqro_lulus = e.target.value === "" ? null : e.target.value === "1"; x.tahsin.lulus = x.iqro_lulus; })}>
              <option value="">Belum ada hasil</option><option value="1">Lulus</option><option value="0">Belum lulus</option>
            </Select>
          </Field>
          <Field label="Materi tahsin terakhir (opsional)"><Input maxLength={60} value={r.tahsin.materi} placeholder="mis. Iqro' 6 · Idghom" onChange={(e) => ubah((x) => (x.tahsin.materi = e.target.value))} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["sakit", "izin", "alpa"] as const).map((k) => (
            <Field key={k} label={k[0].toUpperCase() + k.slice(1)} hint={`otomatis ${r.absen.otomatis[k]}`}>
              <Input inputMode="numeric" value={r.absen[k]} onChange={(e) => ubah((x) => (x.absen[k] = e.target.value.replace(/\D/g, "")))} />
            </Field>
          ))}
        </div>
      </Bagian>

      <Bagian judul="D. Riwayat hafalan" ringkas={r.riwayat.length ? r.riwayat.map((x: any) => x.judul).join(" · ") : "Belum ada nilai surat atau sertifikasi"}>
        {r.riwayat.length ? (
          <div className="divide-y divide-line rounded-xl border border-line">
            {r.riwayat.map((x: any) => <div key={x.judul} className="flex gap-3 px-3 py-2 text-[13px]"><b className="w-24 shrink-0 text-leaf-deep">{x.judul}</b><span>{x.isi}</span></div>)}
          </div>
        ) : <p className="text-[13px] text-muted">Belum ada nilai hafalan per surat (dari kolom surat setoran) atau sertifikasi perempat juz pada semester ini.</p>}
        <p className="text-[12px] text-muted">Riwayat disusun otomatis dari nilai ziyadah per surat dan sertifikasi. Rincian per surat tetap tersedia di menu Santri; rapor cetak hanya menampilkan ringkasannya agar tetap satu lembar.</p>
      </Bagian>

      <Bagian judul="E. Catatan pembinaan" buka ringkas={r.catatan}>
        <Textarea rows={4} value={r.catatan} onChange={(e) => ubah((x) => { x.catatan = e.target.value; x.catatan_otomatis = false; })} />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={susunCatatan}><RotateCcw className="size-3.5" />Susun otomatis</Button>
          <span className={cn("ml-auto text-[12px] tabular", panjangCatatan > BATAS_CATATAN ? "font-bold text-rose" : "text-muted")}>{panjangCatatan}/{BATAS_CATATAN} karakter{panjangCatatan > BATAS_CATATAN ? " — ringkas agar muat satu lembar" : ""}</span>
        </div>
      </Bagian>

      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="no-print fixed inset-x-0 z-20 px-3 md:left-[84px] lg:left-[248px]" style={{ bottom: "calc(var(--nav-h, 0px) + 10px + var(--fab-lift, 0px))" }}>
        <div className="mx-auto flex max-w-[1180px] items-center gap-2 rounded-2xl bg-pine p-2 pl-4 text-white shadow-2xl shadow-pine/30">
          <p className="min-w-0 flex-1 truncate text-[12px] text-white/75">F4 · 215 × 330 mm · 1 lembar</p>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={async () => { try { await (await pdf()).bukaRapor([r]); } catch (e: any) { toast.error(e.message); } }}><Eye className="size-4" /><span className="hidden sm:inline">Pratinjau</span></Button>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={async () => { try { await (await pdf()).unduhRapor([r], `Rapor_${r.santri.nama}_${r.periode.label}`); } catch (e: any) { toast.error(e.message); } }}><FileDown className="size-4" />PDF</Button>
          <Button size="sm" variant="accent" loading={simpan} onClick={kirim}><Save className="size-4" />Simpan</Button>
        </div>
      </motion.div>
    </div>
  );
}
