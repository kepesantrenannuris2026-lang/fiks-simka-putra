"use client";
import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, UserPlus, UserMinus, History, Users, CalendarDays, UserCog, BookOpen } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { useApp } from "../App";
import { catatanHM } from "@/lib/target";
import { Card, CardTitle, Button, Input, Textarea, Select, Field, Dialog, Empty, Skeleton, JuzLattice, JuzLegend, juzCycle, cn } from "../ui";

const KEH: { v: string; l: string; c: string }[] = [
  { v: "hadir", l: "H", c: "border-leaf bg-leaf text-white" },
  { v: "izin", l: "I", c: "border-sky bg-sky text-white" },
  { v: "sakit", l: "S", c: "border-amber bg-amber text-white" },
  { v: "alfa", l: "A", c: "border-rose bg-rose text-white" },
];
const KEH_NAMA: Record<string, string> = { hadir: "Hadir", izin: "Izin", sakit: "Sakit", alfa: "Alfa" };
const bulanLabel = (ym: string) => F.ymLabel(ym);
const pendek = (n: string) => String(n || "").replace(/^(Ust\.|Usth\.)\s*/i, "").split(",")[0];
const sebelum = (m: Mulai, ym: string, p: number) => ym < m.ym || (ym === m.ym && p < m.pekan);
type Mulai = { ym: string; pekan: number; tanggal: string };
const mulaiLabel = (m: Mulai) => `${Number(m.tanggal.slice(8, 10))} ${bulanLabel(m.ym)} (Pekan ${m.pekan})`;
const NILAI = ["A", "B+", "B", "C"];
const ASPEK: [string, string, string][] = [["nilai_kelancaran", "Kelancaran", "Kel."], ["nilai_makhraj", "Makhraj", "Makh."], ["nilai_tajwid", "Tajwid", "Tjw."]];

/** Ringkas capaian: "2/5 juz · 1 diuji". */
function CapaianTeks({ x, className }: { x: any; className?: string }) {
  const sel = x.juz_selesai?.length || 0, uji = x.juz_diuji?.length || 0, perlu = sel - uji;
  return (
    <span className={cn("text-[11.5px] text-muted", className)}>
      <b className={sel >= x.target_juz ? "text-leaf-deep" : "text-ink"}>{sel}/{x.target_juz} juz</b>
      {uji > 0 && <> · <span className="font-semibold text-[#b5600f]">{uji} diuji</span></>}
      {perlu > 0 && <> · <span className="font-semibold text-[#b5600f]">{perlu} perlu ujian</span></>}
      {x.ziyadah_hal > 0 && <> · ziyadah {x.ziyadah_hal} hlm</>}
    </span>
  );
}

/** Halaqah Musyrif: pengampu mengisi kehadiran & ziyadah sepekan sekali; peserta melihat capaiannya sendiri. */
export default function HalaqahMusyrif() {
  const [d, setD] = React.useState<any>(null);
  const [buka, setBuka] = React.useState<any>(null);
  const [riwayat, setRiwayat] = React.useState<any>(null);
  const load = React.useCallback(async () => { try { setD(await rpc("getHM")); } catch (e: any) { toast.error(e.message); } }, []);
  React.useEffect(() => { load(); }, [load]);
  if (buka) return <IsianPekan grup={buka} pimpinan={d?.pimpinan} mulai={d.mulai} onBack={() => { setBuka(null); load(); }} onRiwayat={setRiwayat} riwayatEl={<RiwayatDialog id={riwayat} onClose={() => setRiwayat(null)} />} />;
  if (!d) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  const belumMulai = F.todayLocal() < d.mulai.tanggal;

  return (
    <div className="space-y-4">
      {belumMulai && (
        <div className="rounded-2xl border border-saffron/40 bg-saffron-soft px-4 py-3 text-[13px] text-[#8a4a0c]">
          Pengisian halaqah musyrif dimulai <b>{mulaiLabel(d.mulai)}</b>. Halaqah sekali sepekan; isian berisi kehadiran, ziyadah, nilai (kelancaran, makhraj, tajwid: A/B+/B/C), dan catatan yang terisi otomatis dari nilai (tetap bisa diubah). Target hafalan minimal 5 juz, tiap juz selesai diujikan.
        </div>
      )}
      {d.grup.length > 0 && (
        <Card>
          <CardTitle hint={d.pimpinan ? "Semua halaqah musyrif & musyrifah" : "Ketuk halaqah untuk mengisi kehadiran & ziyadah pekan ini"}
            right={<span className="grid size-9 place-items-center rounded-xl bg-leaf-soft text-leaf-deep"><Users className="size-5" /></span>}>
            {d.pimpinan ? "Halaqah musyrif & musyrifah" : "Halaqah yang saya ampu"}
          </CardTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            {d.grup.map((g: any) => (
              <button key={g.id} onClick={() => setBuka(g)} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left transition hover:border-leaf hover:shadow-sm">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold", g.jenis === "akhwat" ? "bg-rose-soft text-rose" : "bg-sky-soft text-sky")}>{g.jumlah}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{g.nama}</p>
                  <p className="truncate text-[12px] text-muted">Pengampu: {pendek(g.pengampu_nama)} · {g.jumlah} peserta</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {!belumMulai && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", g.pekan_terisi ? "bg-leaf-soft text-leaf-deep" : "bg-mist text-muted")}>{g.pekan_terisi} pekan terisi</span>}
                  {g.perlu_ujian > 0 && <span className="rounded-full bg-saffron-soft px-2 py-0.5 text-[11px] font-bold text-[#b5600f]">{g.perlu_ujian} perlu ujian</span>}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle hint="Target hafalan dan juz yang sudah selesai/diujikan" right={<span className="grid size-9 place-items-center rounded-xl bg-saffron-soft text-[#9a5510]"><BookOpen className="size-5" /></span>}>
          Capaian hafalan saya
        </CardTitle>
        {!d.peserta.length ? <p className="text-[13px] text-muted">Anda belum terdaftar sebagai peserta halaqah musyrif.</p> : (
          <div className="grid gap-3">
            {d.peserta.map((p: any) => (
              <div key={p.anggota_id} className="rounded-2xl border border-line bg-white p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1"><p className="truncate font-bold">{p.nama}</p><p className="text-[12px] text-muted">Pengampu: {pendek(p.pengampu_nama)}</p><CapaianTeks x={p} /></div>
                  <Button variant="outline" size="sm" onClick={() => setRiwayat(p.anggota_id)}><History className="size-4" />Riwayat</Button>
                </div>
                <div className="mt-2.5"><JuzLattice selected={p.juz_selesai} diuji={p.juz_diuji} size={16} /></div>
                <JuzLegend className="mt-2" />
              </div>
            ))}
          </div>
        )}
      </Card>
      <RiwayatDialog id={riwayat} onClose={() => setRiwayat(null)} />
    </div>
  );
}

function IsianPekan({ grup, pimpinan, mulai, onBack, onRiwayat, riwayatEl }: { grup: any; pimpinan: boolean; mulai: Mulai; onBack: () => void; onRiwayat: (id: number) => void; riwayatEl: React.ReactNode }) {
  const { dirty } = useApp();
  const now = F.todayLocal().slice(0, 7), pNow = F.pekanNow();
  const bulanPilihan = F.recentMonths(12).filter((m) => m >= mulai.ym);
  const [ym, setYm] = React.useState(now < mulai.ym ? mulai.ym : now);
  const [p, setP] = React.useState<number | null>(null);
  const [f, setF] = React.useState<any>(null);
  const [rows, setRows] = React.useState<Record<number, any>>({});
  const [awal, setAwal] = React.useState<string>("{}");
  const [tanggal, setTanggal] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [kelola, setKelola] = React.useState(false);
  const [atur, setAtur] = React.useState(false);
  const [juz, setJuz] = React.useState<any>(null);
  const bisa = (y: string, i: number) => F.todayLocal() >= mulai.tanggal && !sebelum(mulai, y, i) && (y < now || (y === now && i <= pNow));

  const load = React.useCallback(async (y: string, pp: number | null) => {
    try {
      // Tanpa pilihan: bulan ini → pekan berjalan; bulan lalu → pekan pertama yang belum terisi
      if (!pp) pp = y === now ? Math.max(pNow, y === mulai.ym ? mulai.pekan : 1) : y === mulai.ym ? mulai.pekan : 1;
      let r = await rpc("getHMForm", grup.id, y, pp);
      if (y !== now) { const k = [1, 2, 3, 4].find((i) => bisa(y, i) && !r.terisi[i]); if (k && k !== pp) { r = await rpc("getHMForm", grup.id, y, k); pp = k; } }
      const m: Record<number, any> = {};
      r.peserta.forEach((x: any) => (m[x.id] = { kehadiran: x.isian?.kehadiran || "hadir", surat: x.isian?.surat || "", halaman: x.isian?.halaman || "",
        nilai_kelancaran: x.isian?.nilai_kelancaran || "", nilai_makhraj: x.isian?.nilai_makhraj || "", nilai_tajwid: x.isian?.nilai_tajwid || "", keterangan: x.isian?.keterangan || "" }));
      setF(r); setP(pp); setRows(m); setAwal(JSON.stringify(m)); setTanggal(r.tanggal || ""); dirty.current = false;
    } catch (e: any) { toast.error(e.message); }
  }, [grup.id, dirty]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { load(ym, null); }, [ym]); // eslint-disable-line react-hooks/exhaustive-deps

  const terkunci = !p || !bisa(ym, p);
  const berubah = f ? Object.keys(rows).filter((k) => JSON.stringify(rows[+k]) !== JSON.stringify(JSON.parse(awal)[k])).length + (tanggal !== (f.tanggal || "") ? 1 : 0) : 0;
  React.useEffect(() => { dirty.current = berubah > 0; }, [berubah, dirty]);
  const ganti = (fn: () => void) => { if (berubah && !confirm("Ada isian yang belum disimpan. Buang perubahan?")) return; fn(); };
  const upd = (id: number, k: string, v: string) => setRows((r) => ({ ...r, [id]: { ...r[id], [k]: v } }));
  /** Nilai atau kehadiran berubah: catatan ikut diperbarui selama masih berupa teks otomatis (belum diedit sendiri). */
  const updOtomatis = (id: number, k: string, v: string) => setRows((r) => {
    const o = r[id], auto = catatanHM(o.nilai_kelancaran, o.nilai_makhraj, o.nilai_tajwid), n = { ...o, [k]: v };
    const otomatis = !o.keterangan || o.keterangan === auto;
    if (otomatis) n.keterangan = n.kehadiran === "hadir" ? catatanHM(n.nilai_kelancaran, n.nilai_makhraj, n.nilai_tajwid) : "";
    return { ...r, [id]: n };
  });
  const semuaHadir = () => setRows((r) => Object.fromEntries(Object.entries(r).map(([k, v]: any) => [k, { ...v, kehadiran: "hadir" }])));
  const save = async () => {
    setBusy(true);
    try {
      const r = await rpc("saveHM", grup.id, ym, p, { tanggal, rows: Object.entries(rows).map(([id, v]) => ({ anggota_id: +id, ...v })) });
      toast.success(`Pekan ${p} tersimpan`, { description: `${r.disimpan} peserta${r.dihapus ? `, ${r.dihapus} dikosongkan` : ""}` });
      await load(ym, p);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => ganti(onBack)}><ArrowLeft className="size-4" />Kembali</Button>
        <div className="min-w-0 flex-1"><p className="truncate text-[17px] font-extrabold">{grup.nama}</p><p className="truncate text-[12px] text-muted">Pengampu: {pendek(grup.pengampu_nama)} · sekali sepekan</p></div>
        <Button variant="outline" size="sm" onClick={() => setKelola(true)}><Users className="size-4" />Peserta</Button>
        {pimpinan && <Button variant="outline" size="sm" onClick={() => setAtur(true)}><UserCog className="size-4" />Pengampu</Button>}
      </div>

      <Card className="p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select aria-label="Bulan" value={ym} onChange={(e) => { const v = e.target.value; ganti(() => setYm(v)); }} className="w-full sm:w-auto">
            {bulanPilihan.map((m) => <option key={m} value={m}>{bulanLabel(m)}</option>)}
          </Select>
          <div className="grid flex-1 grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <button key={i} disabled={!bisa(ym, i)} onClick={() => ganti(() => load(ym, i))}
                className={cn("min-w-0 rounded-xl border px-1.5 py-1.5 text-center text-[12px] font-bold leading-tight transition disabled:cursor-not-allowed disabled:opacity-40", p === i ? "border-pine bg-pine text-white" : "border-line bg-white text-ink hover:border-leaf")}>
                Pekan {i}<span className={cn("block text-[11px] font-semibold", p === i ? "text-white/70" : "text-muted")}>{sebelum(mulai, ym, i) ? "—" : f?.terisi?.[i] ? `${f.terisi[i]}/${f.peserta.length}` : "belum"}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px]">
          <CalendarDays className="size-4 text-muted" /><span className="text-muted">Tanggal halaqah</span>
          <Input type="date" value={tanggal} min={mulai.tanggal} max={F.todayLocal()} onChange={(e) => setTanggal(e.target.value)} className="h-9 w-auto" disabled={terkunci} />
          {!terkunci && <Button variant="ghost" size="sm" className="ml-auto" onClick={semuaHadir}>Semua hadir</Button>}
        </div>
        {F.todayLocal() < mulai.tanggal || sebelum(mulai, ym, p || 1) ? <p className="mt-2 text-[12px] font-semibold text-[#b5600f]">Pengisian dimulai {mulaiLabel(mulai)}.</p> : null}
      </Card>

      {!f ? <Skeleton className="h-64" /> : !f.peserta.length ? <Empty title="Belum ada peserta">Tambahkan peserta lewat tombol Peserta.</Empty> : (
        <Card className="overflow-hidden p-0">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_140px_minmax(0,1.4fr)_216px] gap-3 border-b border-line bg-mist/60 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-muted md:grid">
            <span>Peserta · capaian</span><span>Kehadiran</span><span>Ziyadah (surat/ayat · halaman)</span><span>Nilai · A / B+ / B / C</span>
          </div>
          <div className="divide-y divide-line">
            {f.peserta.map((x: any) => {
              const v = rows[x.id] || {};
              return (
                <div key={x.id} className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_140px_minmax(0,1.4fr)_216px] md:items-center md:gap-3">
                  <div className="flex min-w-0 items-start gap-1">
                    <button onClick={() => setJuz(x)} className="min-w-0 flex-1 text-left" title="Atur juz selesai / diuji">
                      <p className="truncate font-bold leading-snug">{x.nama}</p>
                      <CapaianTeks x={x} className="block truncate" />
                    </button>
                    <button onClick={() => onRiwayat(x.id)} className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-mist hover:text-ink" aria-label={"Riwayat " + x.nama}><History className="size-4" /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {KEH.map((k) => <button key={k.v} disabled={terkunci} title={KEH_NAMA[k.v]} onClick={() => updOtomatis(x.id, "kehadiran", k.v)} className={cn("h-8 rounded-lg border text-[12px] font-bold disabled:opacity-50", v.kehadiran === k.v ? k.c : "border-line bg-white text-muted")}>{k.l}</button>)}
                  </div>
                  {v.kehadiran === "hadir" ? (
                    <div className="grid grid-cols-[1fr_76px] gap-2">
                      <Input value={v.surat} disabled={terkunci} onChange={(e) => upd(x.id, "surat", e.target.value)} placeholder="Surat/ayat, mis. Al-Mulk 1–15" aria-label={"Ziyadah surat/ayat " + x.nama} className="h-9" />
                      <Input value={v.halaman} disabled={terkunci} inputMode="decimal" onChange={(e) => upd(x.id, "halaman", e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="Hlm" aria-label={"Ziyadah halaman " + x.nama} className="h-9" />
                    </div>
                  ) : <p className="text-[12px] text-muted md:col-span-2">{KEH_NAMA[v.kehadiran]} — tanpa ziyadah & nilai</p>}
                  {v.kehadiran === "hadir" && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {ASPEK.map(([k, l, sk]) => (
                        <label key={k} className="min-w-0">
                          <span className="mb-0.5 block truncate text-[10.5px] font-semibold text-muted"><span className="md:hidden">{l}</span><span className="hidden md:inline">{sk}</span></span>
                          <Select value={v[k]} disabled={terkunci} onChange={(e) => updOtomatis(x.id, k, e.target.value)} aria-label={l + " " + x.nama}
                            className={cn("h-9 px-2 text-center font-bold", v[k] === "A" ? "text-leaf-deep" : v[k] === "C" ? "text-rose" : "")}>
                            <option value="">–</option>{NILAI.map((n) => <option key={n} value={n}>{n}</option>)}
                          </Select>
                        </label>
                      ))}
                    </div>
                  )}
                  <Textarea rows={2} value={v.keterangan || ""} disabled={terkunci} maxLength={300} aria-label={"Catatan " + x.nama}
                    onChange={(e) => upd(x.id, "keterangan", e.target.value)}
                    placeholder={v.kehadiran === "hadir" ? "Catatan (terisi otomatis dari nilai, bisa diubah)" : "Catatan (opsional)"}
                    className="min-h-0 py-1.5 text-[12.5px] md:col-span-4" />
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <p className="px-1 text-[11.5px] text-muted">Ketuk nama peserta untuk menandai juz selesai (hijau) dan juz yang sudah diujikan (oranye). Target default 5 juz.</p>
      <div aria-hidden className="h-24 md:h-16" />
      <div className="no-print fixed inset-x-0 bottom-[calc(var(--nav-h,64px)+30px)] z-20 px-4 md:bottom-4 md:left-[84px] lg:left-[248px]">
        <div className="mx-auto flex max-w-[1132px] items-center gap-3 rounded-2xl bg-pine p-2 pl-4 text-white shadow-xl shadow-pine/25">
          <span className="min-w-0 flex-1 truncate text-[13px]">{terkunci ? "Pekan ini belum bisa diisi" : berubah ? <><b>{berubah}</b> perubahan belum disimpan</> : "Tidak ada perubahan"}</span>
          <Button variant="accent" onClick={save} loading={busy} disabled={!berubah || terkunci}><Save className="size-4" />Simpan pekan {p || ""}</Button>
        </div>
      </div>
      {riwayatEl}
      <JuzPeserta x={juz} onClose={() => setJuz(null)} onSaved={() => load(ym, p)} />
      <KelolaPeserta open={kelola} grup={grup} peserta={f?.peserta || []} onClose={() => setKelola(false)} onSaved={() => load(ym, p)} />
      {pimpinan && <AturPengampu open={atur} grup={grup} onClose={() => setAtur(false)} />}
    </div>
  );
}

/** Peta juz satu peserta: ketuk = selesai (hijau), ketuk lagi = sudah diuji (oranye), ketuk lagi = hapus. */
function JuzPeserta({ x, onClose, onSaved }: { x: any; onClose: () => void; onSaved: () => void }) {
  const [sel, setSel] = React.useState<number[]>([]), [uji, setUji] = React.useState<number[]>([]);
  const [target, setTarget] = React.useState("5"), [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (x) { setSel(x.juz_selesai || []); setUji(x.juz_diuji || []); setTarget(String(x.target_juz || 5)); } }, [x]);
  const save = async () => {
    setBusy(true);
    try { await rpc("hmJuz", x.id, sel, uji, Number(target)); toast.success("Capaian hafalan tersimpan"); onSaved(); onClose(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!x} onOpenChange={(o) => !o && onClose()} title={"Juz hafalan · " + (x?.nama || "")}
      description="Ketuk sekali bila hafalan juz selesai (hijau). Ketuk lagi bila juz itu sudah diujikan (oranye). Ketuk sekali lagi untuk menghapus."
      footer={<><span className="mr-auto text-sm text-muted">{sel.length}/{target} juz · {uji.length} diuji</span><Button variant="outline" onClick={onClose}>Batal</Button><Button onClick={save} loading={busy}>Simpan</Button></>}>
      <div className="flex flex-col items-center gap-3 py-1">
        <div className="max-w-[440px]"><JuzLattice selected={sel} diuji={uji} size={26} onToggle={(j) => { const [a, b] = juzCycle(sel, uji, j); setSel(a); setUji(b); }} /></div>
        <JuzLegend />
        <Field label="Target hafalan minimal">
          <Select value={target} onChange={(e) => setTarget(e.target.value)} className="w-40">{Array.from({ length: 30 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} juz{n === 5 ? " (default)" : ""}</option>)}</Select>
        </Field>
      </div>
    </Dialog>
  );
}

function RiwayatDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const [r, setR] = React.useState<any>(null);
  React.useEffect(() => { setR(null); if (id) rpc("getHMRiwayat", id).then(setR).catch((e) => { toast.error(e.message); onClose(); }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()} title={r ? r.peserta.nama : "Riwayat"} description={r ? `${r.grup.nama} · pengampu ${pendek(r.grup.pengampu_nama)}` : ""} wide>
      {!r ? <Skeleton className="h-40" /> : (
        <div className="space-y-3">
          <div className="rounded-xl border border-line p-3"><CapaianTeks x={r.peserta} className="block" /><div className="mt-2"><JuzLattice selected={r.peserta.juz_selesai} diuji={r.peserta.juz_diuji} size={13} /></div><JuzLegend className="mt-2" /></div>
          {!r.catatan.length ? <p className="text-[13px] text-muted">Belum ada isian pekanan.</p> : (
            <div className="max-h-[50vh] divide-y divide-line overflow-y-auto">
              {r.catatan.map((c: any, i: number) => (
                <div key={i} className="flex items-baseline justify-between gap-2 py-2 text-[13px]">
                  <div className="min-w-0"><b>{bulanLabel(c.ym)} · Pekan {c.pekan}</b>{c.tanggal && <span className="ml-1.5 text-[11.5px] text-muted">{c.tanggal}</span>}
                    {(c.surat || c.halaman) && <p className="text-ink/80">Ziyadah: {c.surat}{c.halaman ? ` · ${c.halaman} hlm` : ""}</p>}
                    {(c.nilai_kelancaran || c.nilai_makhraj || c.nilai_tajwid) && <p className="text-[12px] text-muted">Kelancaran <b className="text-ink">{c.nilai_kelancaran || "–"}</b> · Makhraj <b className="text-ink">{c.nilai_makhraj || "–"}</b> · Tajwid <b className="text-ink">{c.nilai_tajwid || "–"}</b></p>}
                    {c.keterangan && <p className="mt-0.5 text-[12.5px] italic text-ink/75">“{c.keterangan}”</p>}</div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", c.kehadiran === "hadir" ? "bg-leaf-soft text-leaf-deep" : c.kehadiran === "alfa" ? "bg-rose-soft text-rose" : "bg-sky-soft text-sky")}>{KEH_NAMA[c.kehadiran] || c.kehadiran}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

function KelolaPeserta({ open, grup, peserta, onClose, onSaved }: { open: boolean; grup: any; peserta: any[]; onClose: () => void; onSaved: () => void }) {
  const [akun, setAkun] = React.useState<any[] | null>(null);
  const [pilih, setPilih] = React.useState(""), [nama, setNama] = React.useState(""), [busy, setBusy] = React.useState("");
  React.useEffect(() => { if (open && !akun) rpc("hmAkun").then(setAkun).catch((e) => toast.error(e.message)); }, [open, akun]);
  const act = async (k: string, f: () => Promise<any>, ok: string) => { setBusy(k); try { await f(); toast.success(ok); setPilih(""); setNama(""); onSaved(); } catch (e: any) { toast.error(e.message); } finally { setBusy(""); } };
  const ada = new Set(peserta.map((x) => x.username).filter(Boolean));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Peserta halaqah" description={grup.nama}>
      <div className="space-y-3">
        <div className="max-h-[38vh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {peserta.map((x) => (
            <div key={x.id} className="flex items-center gap-2 px-3 py-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate">{x.nama}{!x.username && <span className="ml-1 text-[11px] text-muted">(tanpa akun)</span>}</span>
              <Button variant="ghost" size="sm" className="text-rose hover:bg-rose-soft" loading={busy === "h" + x.id}
                onClick={() => confirm(`Keluarkan ${x.nama} dari halaqah ini? Catatannya tetap tersimpan.`) && act("h" + x.id, () => rpc("hmAnggota", grup.id, "hapus", { anggota_id: x.id }), "Peserta dikeluarkan")}><UserMinus className="size-4" /></Button>
            </div>
          ))}
        </div>
        <Field label="Tambah dari akun musyrif/ah">
          <div className="flex gap-2">
            <Select value={pilih} onChange={(e) => setPilih(e.target.value)} className="min-w-0 flex-1"><option value="">— pilih —</option>{(akun || []).filter((a) => !ada.has(a.username)).map((a) => <option key={a.username} value={a.username}>{a.nama}</option>)}</Select>
            <Button variant="accent" disabled={!pilih} loading={busy === "a"} onClick={() => act("a", () => rpc("hmAnggota", grup.id, "tambah", { username: pilih }), "Peserta ditambahkan")}><UserPlus className="size-4" /></Button>
          </div>
        </Field>
        <Field label="Atau tulis nama (tanpa akun)">
          <div className="flex gap-2">
            <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" />
            <Button variant="outline" disabled={nama.trim().length < 3} loading={busy === "n"} onClick={() => act("n", () => rpc("hmAnggota", grup.id, "tambah", { nama }), "Peserta ditambahkan")}><UserPlus className="size-4" /></Button>
          </div>
        </Field>
      </div>
    </Dialog>
  );
}

function AturPengampu({ open, grup, onClose }: { open: boolean; grup: any; onClose: () => void }) {
  const [akun, setAkun] = React.useState<any[] | null>(null);
  const [u, setU] = React.useState(grup.pengampu_username), [nama, setNama] = React.useState(grup.nama), [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open && !akun) rpc("hmAkun").then(setAkun).catch((e) => toast.error(e.message)); }, [open, akun]);
  const save = async () => { setBusy(true); try { await rpc("hmAturGrup", grup.id, { pengampu_username: u, nama }); toast.success("Disimpan — buka ulang halaman untuk melihat perubahan"); onClose(); } catch (e: any) { toast.error(e.message); } finally { setBusy(false); } };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Pengampu & nama halaqah" footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="accent" loading={busy} onClick={save}>Simpan</Button></div>}>
      <div className="space-y-3">
        <Field label="Nama halaqah"><Input value={nama} onChange={(e) => setNama(e.target.value)} /></Field>
        <Field label="Pengampu"><Select value={u} onChange={(e) => setU(e.target.value)}>{(akun || [{ username: grup.pengampu_username, nama: grup.pengampu_nama }]).map((a: any) => <option key={a.username} value={a.username}>{a.nama}</option>)}</Select></Field>
      </div>
    </Dialog>
  );
}
