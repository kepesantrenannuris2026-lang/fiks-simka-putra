"use client";
import * as React from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { BookOpenText, Download, Search, Save, CheckCheck } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { ARBAIN } from "@/lib/arbain";
import { useApp } from "../App";
import { Card, CardTitle, Button, Empty, Skeleton, Dialog, Input, Select, CountUp, Segmented, Field, cn } from "../ui";

type St = "" | "hafal" | "mengulang";
const NEXT: Record<string, St> = { "": "hafal", hafal: "mengulang", mengulang: "" };
const cellCls = (s: St) => (s === "hafal" ? "bg-leaf text-white border-leaf" : s === "mengulang" ? "bg-saffron text-pine border-saffron" : "bg-white text-muted border-line");

function Strip({ hadis, size = 7 }: { hadis: Record<number, any>; size?: number }) {
  return (
    <div className="flex flex-wrap gap-[2px]" aria-hidden>
      {ARBAIN.map((h) => {
        const s = hadis[h.n]?.status;
        return <span key={h.n} style={{ width: size, height: size }} className={cn("rounded-[2px]", s === "hafal" ? "bg-leaf" : s === "mengulang" ? "bg-saffron" : "bg-line")} />;
      })}
    </div>
  );
}

export default function Arbain() {
  const { admin, curHq, syncTick } = useApp();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [mode, setMode] = React.useState<"isi" | "rekap">("isi");
  const [q, setQ] = React.useState("");
  const [hqf, setHqf] = React.useState("milik"); // musyrif: "milik" | "semua" | halaqah_key
  const [edit, setEdit] = React.useState<any>(null);
  const req = React.useRef(0);

  const load = React.useCallback(async () => {
    const n = ++req.current; setLoading(true);
    try { const d = await rpc("getArbain", admin ? curHq || undefined : undefined); if (n === req.current) setData(d); }
    catch (e: any) { toast.error(e.message); } finally { if (n === req.current) setLoading(false); }
  }, [admin, curHq]);
  React.useEffect(() => { load(); }, [load]);

  const hqOpts: any[] = Array.from(new Map((data?.santri || []).map((s: any) => [s.halaqah_key, s])).values());
  const list: any[] = (data?.santri || []).filter((s: any) => (!q || s.nama.toLowerCase().includes(q.toLowerCase()))
    && (admin || hqf === "semua" || (hqf === "milik" ? s.milik : s.halaqah_key === hqf)));
  const r = data?.ringkasan;

  const csv = () => {
    const head = ["Nama", "Unit", "Tingkat", "Halaqah", "Musyrif", "Hafal", "Perlu diulang", "Setoran terakhir", ...ARBAIN.map((h) => "H" + h.n)];
    const rows = (data?.santri || []).map((s: any) => [s.nama, s.unit, s.tingkat, s.halaqah, s.musyrif, s.hafal, s.mengulang, s.terakhir,
      ...ARBAIN.map((h) => (s.hadis[h.n]?.status === "hafal" ? "hafal" : s.hadis[h.n]?.status === "mengulang" ? "ulang" : ""))]);
    const esc = (v: any) => { const t = String(v ?? ""); return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const blob = new Blob(["\ufeff" + [head, ...rows].map((x) => x.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `rekap-hadis-arbain-${F.todayLocal()}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="space-y-4">
      <section className="kufi-pattern relative overflow-hidden rounded-[26px] p-5 text-white sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10"><BookOpenText className="size-6 text-saffron" /></span>
          <div>
            <h2 className="text-xl font-extrabold leading-tight sm:text-2xl">Hadis Arbain An-Nawawiyah</h2>
            <p className="mt-0.5 text-[13px] text-white/70">42 hadis pilihan Imam An-Nawawi. Tandai hadis yang sudah disetorkan santri.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { l: "Santri", v: r?.santri, d: 0 },
            { l: "Rata-rata hafal", v: r?.rata, d: 1, suf: " / 42" },
            { l: "Khatam 42 hadis", v: r?.khatam, d: 0 },
            { l: "Belum mulai", v: r?.belum_mulai, d: 0 },
          ].map((x) => (
            <div key={x.l} className="rounded-2xl bg-white/[.07] px-3 py-2.5">
              <div className="text-[22px] font-extrabold leading-tight">{x.v == null ? "–" : <CountUp value={x.v} decimals={x.d} />}<span className="text-sm font-semibold text-white/60">{x.suf || ""}</span></div>
              <div className="text-[11.5px] text-white/65">{x.l}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented id="arbain-mode" value={mode} onChange={(v) => setMode(v as any)} options={[{ value: "isi", label: "Isi hafalan" }, { value: "rekap", label: "Rekap" }]} />
        {!admin && hqOpts.length > 1 && (
          <Select value={hqf} onChange={(e) => setHqf(e.target.value)} className="w-auto max-w-[220px]" aria-label="Pilih halaqah">
            <option value="milik">Halaqah saya</option>
            <option value="semua">Semua di unit ({data?.santri?.length || 0})</option>
            {hqOpts.map((h: any) => <option key={h.halaqah_key} value={h.halaqah_key}>{h.tingkat} · {h.halaqah} — {String(h.musyrif).split(",")[0]}</option>)}
          </Select>
        )}
        <div className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari santri" className="pl-9" />
        </div>
        {mode === "rekap" && <Button variant="outline" onClick={csv} disabled={!data?.santri?.length}><Download className="size-4" />CSV</Button>}
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : !list.length ? (
        <Empty icon={<BookOpenText className="size-8" />} title={q ? "Tidak ada santri yang cocok" : "Belum ada santri binaan"}>
          {admin && !curHq ? "Pilih unit, tingkat, atau halaqah di bagian atas untuk mempersempit daftar." : "Santri binaan akan muncul di sini."}
        </Empty>
      ) : mode === "isi" ? (
        <>
          <p className="text-xs text-muted">Ketuk nama santri untuk membuka 42 hadis. <span className="font-semibold text-leaf-deep">Hijau</span> = hafal, <span className="font-semibold text-[#C26A1E]">oranye</span> = perlu diulang.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((s: any, i: number) => (
              <motion.button key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
                onClick={() => setEdit(s)} className="min-w-0 rounded-[var(--radius-card)] border border-line bg-white p-4 text-left transition hover:border-leaf hover:shadow-md">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1"><p className="truncate font-bold">{s.nama}</p><p className="truncate text-xs text-muted">{s.unit} {s.tingkat} · {s.halaqah}</p></div>
                  <div className="shrink-0 text-right"><span className="text-xl font-extrabold text-leaf-deep tabular">{s.hafal}</span><span className="text-xs text-muted">/42</span></div>
                </div>
                <div className="mt-2.5"><Strip hadis={s.hadis} /></div>
                <p className="mt-2 text-[11.5px] text-muted">{s.mengulang ? `${s.mengulang} perlu diulang · ` : ""}{s.terakhir ? `terakhir ${F.dateShort(s.terakhir)}` : "belum ada setoran"}</p>
              </motion.button>
            ))}
          </div>
        </>
      ) : (
        <Rekap list={list} perHadis={r?.per_hadis || []} total={r?.santri || 0} />
      )}

      <EditDialog santri={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); syncTick(); }} />
    </div>
  );
}

function EditDialog({ santri, onClose, onSaved }: { santri: any; onClose: () => void; onSaved: () => void }) {
  const [state, setState] = React.useState<Record<number, St>>({});
  const [focus, setFocus] = React.useState<number | null>(null);
  const [tanggal, setTanggal] = React.useState(F.todayLocal());
  const [sampai, setSampai] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!santri) return;
    const s: Record<number, St> = {};
    ARBAIN.forEach((h) => (s[h.n] = (santri.hadis[h.n]?.status || "") as St));
    setState(s); setFocus(null); setTanggal(F.todayLocal()); setSampai("");
  }, [santri]);

  if (!santri) return <Dialog open={false} onOpenChange={() => {}} title="">{null}</Dialog>;
  const orig = (n: number) => (santri.hadis[n]?.status || "") as St;
  const changed = ARBAIN.filter((h) => state[h.n] !== orig(h.n)).map((h) => h.n);
  const hafal = ARBAIN.filter((h) => state[h.n] === "hafal").length;

  const tap = (n: number) => { setState((s) => ({ ...s, [n]: NEXT[s[n] || ""] })); setFocus(n); };
  const fillTo = () => {
    const n = Number(sampai);
    if (!n || n < 1 || n > 42) return toast.error("Isi nomor 1–42.");
    setState((s) => { const x = { ...s }; for (let i = 1; i <= n; i++) if (x[i] !== "hafal") x[i] = "hafal"; return x; });
    setFocus(n);
  };
  const save = async () => {
    if (!changed.length) return onClose();
    setBusy(true);
    try {
      const items = changed.map((n) => ({ nomor: n, status: state[n], tanggal, nilai: santri.hadis[n]?.nilai ?? "", catatan: santri.hadis[n]?.catatan || "" }));
      const r = await rpc("saveArbain", santri.id, items);
      toast.success(`Tersimpan: ${r.saved} hadis${r.removed ? `, ${r.removed} dihapus` : ""}`, { description: "Salinan ke Spreadsheet dikirim otomatis." });
      onSaved();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const fh = focus ? ARBAIN[focus - 1] : null;

  return (
    <Dialog open={!!santri} onOpenChange={(o) => { if (!o) onClose(); }} wide
      title={<span className="flex items-baseline gap-2">{santri.nama}<span className="text-sm font-semibold text-leaf-deep tabular">{hafal}/42</span></span>}
      description={`${santri.unit} ${santri.tingkat} · ${santri.halaqah}`}
      footer={
        <div className="flex w-full items-center gap-2">
          <span className="flex-1 text-[13px] text-muted">{changed.length ? <><b className="text-ink">{changed.length}</b> hadis berubah</> : "Belum ada perubahan"}</span>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button variant="accent" onClick={save} loading={busy} disabled={!changed.length}><Save className="size-4" />Simpan</Button>
        </div>
      }>
      <p className="mb-2 text-[12.5px] text-muted">Ketuk nomor untuk mengubah: kosong → <b className="text-leaf-deep">hafal</b> → <b className="text-[#C26A1E]">perlu diulang</b> → kosong.</p>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-7">
        {ARBAIN.map((h) => {
          const s = state[h.n] || "", dirty = s !== orig(h.n);
          return (
            <motion.button key={h.n} whileTap={{ scale: 0.9 }} onClick={() => tap(h.n)} title={h.judul} aria-label={`Hadis ${h.n}: ${h.judul}`}
              className={cn("relative grid h-11 place-items-center rounded-xl border text-[15px] font-extrabold tabular transition-colors", cellCls(s), focus === h.n && "ring-2 ring-pine ring-offset-1")}>
              {h.n}
              {dirty && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-sky" />}
            </motion.button>
          );
        })}
      </div>
      <div className="mt-3 min-h-[44px] rounded-xl bg-mist px-3 py-2 text-[13px]">
        {fh ? <><b>Hadis {fh.n}</b> · {fh.judul} <span className="text-muted">— {state[fh.n] === "hafal" ? "hafal" : state[fh.n] === "mengulang" ? "perlu diulang" : "belum"}</span></> : <span className="text-muted">Tema hadis tampil di sini setelah nomor diketuk.</span>}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tanggal setoran" hint="Berlaku untuk hadis yang diubah."><Input type="date" value={tanggal} max={F.todayLocal()} onChange={(e) => setTanggal(e.target.value)} /></Field>
        <Field label="Isi cepat" hint="Tandai hadis 1 sampai nomor ini sebagai hafal.">
          <div className="flex gap-2"><Input inputMode="numeric" placeholder="mis. 10" value={sampai} onChange={(e) => setSampai(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} />
            <Button variant="outline" onClick={fillTo}><CheckCheck className="size-4" />Terapkan</Button></div>
        </Field>
      </div>
    </Dialog>
  );
}

function Rekap({ list, perHadis, total }: { list: any[]; perHadis: number[]; total: number }) {
  const [sort, setSort] = React.useState<"hafal" | "nama">("hafal");
  const rows = [...list].sort((a, b) => (sort === "hafal" ? b.hafal - a.hafal || a.nama.localeCompare(b.nama) : a.nama.localeCompare(b.nama)));
  const max = Math.max(1, ...perHadis);
  return (
    <div className="space-y-4">
      <Card>
        <CardTitle hint={`Jumlah santri yang sudah hafal tiap hadis (dari ${total} santri)`}>Sebaran per hadis</CardTitle>
        <div className="overflow-x-auto pb-1">
          <div className="flex h-36 min-w-[560px] items-end gap-[3px]">
            {perHadis.map((v, i) => (
              <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`Hadis ${i + 1}: ${ARBAIN[i].judul} — ${v} santri`}>
                <span className="text-[9px] font-bold text-muted opacity-0 transition group-hover:opacity-100">{v}</span>
                <motion.div className="w-full rounded-t-[4px] bg-leaf" initial={{ height: 0 }} animate={{ height: `${(v / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.01 }} style={{ minHeight: v ? 3 : 0 }} />
                <span className="text-[9px] tabular text-muted">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <p className="font-bold">Rekap per santri</p>
          <Segmented id="arbain-sort" value={sort} onChange={(v) => setSort(v as any)} options={[{ value: "hafal", label: "Terbanyak" }, { value: "nama", label: "Nama" }]} />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13px]">
            <thead><tr className="border-y border-line bg-mist text-left text-[11.5px] uppercase tracking-wide text-muted">
              <th className="px-4 py-2">Santri</th><th className="px-2 py-2">Hafal</th><th className="px-2 py-2 w-[34%]">Peta 42 hadis</th><th className="px-2 py-2">Ulang</th><th className="px-4 py-2">Terakhir</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-line/70">
                  <td className="px-4 py-2.5"><p className="font-semibold">{s.nama}</p><p className="text-[11.5px] text-muted">{s.unit} {s.tingkat} · {s.halaqah}</p></td>
                  <td className="px-2 py-2.5"><b className="text-leaf-deep tabular">{s.hafal}</b><span className="text-muted">/42</span>
                    <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-leaf" style={{ width: `${(s.hafal / 42) * 100}%` }} /></div></td>
                  <td className="px-2 py-2.5"><Strip hadis={s.hadis} size={8} /></td>
                  <td className="px-2 py-2.5 tabular">{s.mengulang || <span className="text-muted">–</span>}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-muted">{s.terakhir ? F.dateShort(s.terakhir) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
