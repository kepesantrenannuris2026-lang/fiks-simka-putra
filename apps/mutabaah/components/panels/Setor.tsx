"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Check, ChevronDown, Save, UserCheck, Target, Search } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { useApp } from "../App";
import { Card, Select, Stepper, Badge, Button, Skeleton, Empty, Input, Textarea, cn, Bar } from "../ui";
import { hurufNilai, catatanOtomatis, PREDIKAT } from "@/lib/target";

const HURUF_CLS: Record<string, string> = { A: "bg-leaf text-white border-leaf", "B+": "bg-sky text-white border-sky", B: "bg-saffron text-pine border-saffron", C: "bg-rose text-white border-rose" };
const ASPEK_NILAI: [string, string][] = [["nilai_tahsin", "Tahsin"], ["nilai_ziyadah", "Ziyadah"], ["nilai_murajaah", "Murajaah"]];
/** Pilih huruf; catatan ikut terisi otomatis selama belum diubah manual. */
function pilihNilai(r: Row, k: string, h: string): Row {
  const next = { ...r, [k]: r[k] === h ? "" : h };
  const lama = catatanOtomatis(r.nilai_tahsin, r.nilai_ziyadah, r.nilai_murajaah), baru = catatanOtomatis(next.nilai_tahsin, next.nilai_ziyadah, next.nilai_murajaah);
  if (!String(r.catatan || "").trim() || r.catatan === lama) next.catatan = baru;
  return next;
}

type Row = Record<string, any>;
const toForm = (r: any): Row => ({
  santri_id: r.santri_id, nama: r.nama, unit: r.unit, tingkat: r.tingkat, halaqah: r.halaqah, program: r.program, keterangan: r.keterangan, ada: r.ada, terakhir: r.terakhir, hafalan: r.hafalan, lulus_target: r.lulus_target, target_lulusan_juz: r.target_lulusan_juz,
  hadir: String(r.hadir ?? ""), sakit: String(r.sakit ?? ""), izin: String(r.izin ?? ""), alfa: String(r.alfa ?? ""),
  tahsin_hal: r.tahsin.hal ? String(r.tahsin.hal) : "", tahsin_baris: r.tahsin.baris ? String(r.tahsin.baris) : "",
  ziyadah_hal: r.ziyadah.hal ? String(r.ziyadah.hal) : "", ziyadah_baris: r.ziyadah.baris ? String(r.ziyadah.baris) : "",
  murajaah_hal: r.murajaah.hal ? String(r.murajaah.hal) : "", murajaah_baris: r.murajaah.baris ? String(r.murajaah.baris) : "",
  nilai_tahsin: hurufNilai(r.nilai_tahsin), nilai_ziyadah: hurufNilai(r.nilai_ziyadah), nilai_murajaah: hurufNilai(r.nilai_murajaah),
  ziyadah_surat: r.ziyadah_surat || "", murajaah_juz: r.murajaah_juz || "", catatan: r.catatan || "", _dirty: false,
});
const FIELDS = ["hadir", "sakit", "izin", "alfa", "tahsin_hal", "tahsin_baris", "ziyadah_hal", "ziyadah_baris", "murajaah_hal", "murajaah_baris", "nilai_tahsin", "nilai_ziyadah", "nilai_murajaah", "ziyadah_surat", "murajaah_juz", "catatan"];
const baris = (r: Row, p: string) => (Number(r[p + "_hal"]) || 0) * 15 + (Number(r[p + "_baris"]) || 0);

export default function Setor() {
  const { admin, curHq, hq, dirty, setorTarget, clearSetorTarget, syncTick } = useApp();
  const now = new Date();
  const [tahun, setTahun] = React.useState(now.getFullYear());
  const [bulan, setBulan] = React.useState(now.getMonth() + 1);
  const [pekan, setPekan] = React.useState(F.pekanNow());
  React.useEffect(() => {
    if (!setorTarget) return;
    setTahun(setorTarget.tahun); setBulan(setorTarget.bulan); setPekan(setorTarget.pekan); clearSetorTarget();
  }, [setorTarget, clearSetorTarget]);
  const [data, setData] = React.useState<any>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const req = React.useRef(0);
  const ym = F.ymValue(tahun, bulan);

  const load = React.useCallback(async () => {
    const n = ++req.current;
    if (admin && (!curHq || curHq.startsWith("scope:"))) { setData(null); setRows([]); return; }
    setLoading(true);
    try {
      const d = await rpc("getSetoranFormData", tahun, bulan, pekan, admin ? curHq : undefined);
      if (n !== req.current) return;
      setData(d); setRows(d.rows.map(toForm)); dirty.current = false;
    } catch (e: any) { if (n === req.current) toast.error(e.message); }
    finally { if (n === req.current) setLoading(false); }
  }, [tahun, bulan, pekan, curHq, admin, dirty]);
  React.useEffect(() => { load(); }, [load]);

  const guard = (fn: () => void) => { if (dirty.current && !confirm("Ada isian yang belum disimpan. Pindah periode dan buang perubahan?")) return; dirty.current = false; fn(); };
  const upd = (i: number, patch: Row) => { dirty.current = true; setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch, _dirty: true } : r))); };
  const hari = data?.hari_pekan || 7;
  const fillHadirAll = () => { dirty.current = true; setRows((rs) => rs.map((r) => (r.hadir || r.sakit || r.izin || r.alfa ? r : { ...r, hadir: String(hari), _dirty: true }))); toast.success(`Hadir ${hari} pertemuan diisikan untuk santri yang masih kosong`); };

  const save = async () => {
    const items = rows.filter((r) => r.ada || r._dirty).map((r) => {
      const o: any = { santri_id: r.santri_id };
      FIELDS.forEach((f) => (o[f] = String(r[f] ?? "").trim()));
      return o;
    }).filter((o, i) => rows.find((r) => r.santri_id === o.santri_id)?.ada || FIELDS.some((f) => o[f]));
    if (!items.length) { toast.info("Belum ada isian untuk disimpan."); return; }
    setSaving(true);
    try {
      const r = await rpc("saveSetoranBatch", { tahun, bulan, pekan }, items);
      dirty.current = false;
      toast.success(`Tersimpan: ${r.count} setoran pekan ${r.periode.pekan}`, { description: "Salinan ke Spreadsheet dikirim otomatis di latar belakang." });
      load(); syncTick();
    } catch (e: any) { toast.error(e.message, { duration: 7000 }); }
    finally { setSaving(false); }
  };

  const st = data?.pekan?.[pekan];
  const changed = rows.filter((r) => r._dirty).length;
  const filtered = rows.map((r, i) => ({ r, i })).filter(({ r }) => !q || r.nama.toLowerCase().includes(q.toLowerCase()));
  const years = [now.getFullYear(), now.getFullYear() - 1];

  return (
    <div className="space-y-4">
      {!admin && (
        <div className="rounded-2xl border border-leaf/20 bg-leaf-soft px-4 py-3 text-[13px] text-leaf-deep">
          {hq.length ? <>Halaqah Anda: {hq.map((h) => `${h.unit} tingkat ${h.tingkat}, ${h.halaqah} (${h.jumlah} santri)`).join("; ")}</> : "Halaqah belum terhubung. Minta pimpinan menyamakan nama musyrif pada akun Anda dengan kolom MUSYRIF di sheet master."}
        </div>
      )}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[140px_180px_1fr]">
          <Select aria-label="Tahun" value={tahun} onChange={(e) => guard(() => setTahun(Number(e.target.value)))}>{years.map((y) => <option key={y}>{y}</option>)}</Select>
          <Select aria-label="Bulan" value={bulan} onChange={(e) => guard(() => setBulan(Number(e.target.value)))}>{F.BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}</Select>
          <div className="col-span-2 grid grid-cols-4 gap-2 sm:col-span-1">
            {[1, 2, 3, 4].map((p) => {
              const s = data?.pekan?.[p];
              const disabled = s && s.dapat_diisi === false;
              return (
                <button key={p} disabled={disabled} onClick={() => guard(() => setPekan(p))}
                  className={cn("relative rounded-xl border px-2 py-1.5 text-left transition-colors disabled:opacity-40", pekan === p ? "border-pine bg-pine text-white" : "border-line bg-white hover:border-leaf")}>
                  <span className="block text-[13px] font-bold">Pekan {p}</span>
                  <span className={cn("block text-[11px] tabular", pekan === p ? "text-white/70" : "text-muted")}>{s ? `${s.terisi}/${s.total}` : F.pekanRange(ym, p)}</span>
                  {s && s.lengkap && <span className="absolute right-2 top-2 size-2 rounded-full bg-leaf" />}
                  {s && !s.lengkap && s.dapat_diisi !== false && s.total > 0 && (
                    <span title={`${s.total - s.terisi} santri belum diisi`} className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose px-1 text-[10px] font-extrabold text-white ring-2 ring-mist">{s.total - s.terisi}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {st && (
          <div className="mt-4">
            <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <span className="font-semibold">Pekan {pekan}, tanggal {F.pekanRange(ym, pekan)} {F.BULAN[bulan - 1]}</span>
              <span className="text-muted">{st.terisi} dari {st.total} santri sudah terisi{st.terakhir ? ` · terakhir ${st.terakhir}` : ""}</span>
            </div>
            <Bar value={st.total ? (st.terisi / st.total) * 100 : 0} />
          </div>
        )}
      </Card>

      {admin && (!curHq || curHq.startsWith("scope:")) ? (
        <Empty icon={<UserCheck className="size-8" />} title="Pilih satu halaqah dulu">Setoran diisi per halaqah. Gunakan pilihan unit, tingkat, dan halaqah di bagian atas.</Empty>
      ) : loading && !rows.length ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}</div>
      ) : !rows.length ? (
        <Empty title="Belum ada santri binaan">Pastikan nama musyrif pada akun sama persis dengan kolom MUSYRIF di sheet master santri.</Empty>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari santri" className="pl-9" />
            </div>
            <Button variant="outline" onClick={fillHadirAll}><UserCheck className="size-4" />Hadir semua ({hari})</Button>
          </div>
          <p className="text-xs text-muted">Kehadiran = jumlah pertemuan (maks. 20 per kolom). Capaian diisi halaman + baris, 1 halaman = 15 baris. Target pekanan: ziyadah ≥ 1 hal dan murajaah ≥ 5 hal.</p>
          <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
            {filtered.map(({ r, i }) => <SantriForm key={r.santri_id} r={r} i={i} upd={upd} open={!!open[r.santri_id]} toggle={() => setOpen((o) => ({ ...o, [r.santri_id]: !o[r.santri_id] }))} />)}
          </div>
        </>
      )}

      {/* Bar simpan */}
      {rows.length > 0 && (
        <>
        {/* ruang kosong di akhir daftar agar santri terakhir tidak tertutup bilah simpan */}
        <div aria-hidden className="h-24 md:h-16" />
        <div className="no-print fixed inset-x-0 bottom-[calc(var(--nav-h,64px)+30px)] z-20 px-4 md:bottom-4 md:left-[84px] lg:left-[248px]">
          <motion.div layout className="mx-auto flex max-w-[1132px] items-center gap-3 rounded-2xl bg-pine p-2 pl-4 text-white shadow-xl shadow-pine/25">
            <div className="min-w-0 flex-1 text-[13px]">
              <AnimatePresence mode="wait">
                <motion.span key={changed} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="block truncate">
                  {changed ? <><b>{changed}</b> santri berubah, belum disimpan</> : "Tidak ada perubahan"}
                </motion.span>
              </AnimatePresence>
            </div>
            <Button variant="accent" onClick={save} loading={saving} disabled={!changed && !saving}><Save className="size-4" />Simpan pekan {pekan}</Button>
          </motion.div>
        </div>
        </>
      )}
    </div>
  );
}

const SantriForm = React.memo(function SantriForm({ r, i, upd, open, toggle }: { r: Row; i: number; upd: (i: number, p: Row) => void; open: boolean; toggle: () => void }) {
  const z = baris(r, "ziyadah"), m = baris(r, "murajaah");
  const zOk = z >= 15, mOk = m >= 75;
  const set = (k: string) => (v: string) => upd(i, { [k]: v });
  const prog = (p: string, label: string, tone: any, color: string) => (
    <div key={p}>
      <p className="mb-1 text-xs font-bold" style={{ color }}>{label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        <div><Stepper compact tone={tone} label={label + " halaman"} value={r[p + "_hal"]} onChange={set(p + "_hal")} max={600} /><span className="mt-0.5 block text-center text-[10.5px] text-muted">hal</span></div>
        <div><Stepper compact tone={tone} label={label + " baris"} value={r[p + "_baris"]} onChange={set(p + "_baris")} max={14} /><span className="mt-0.5 block text-center text-[10.5px] text-muted">baris</span></div>
      </div>
    </div>
  );
  return (
    <motion.div layout="position" className={cn("min-w-0 rounded-[var(--radius-card)] border bg-white p-4 transition-colors", r._dirty ? "border-saffron" : r.ada ? "border-leaf/40" : "border-line")}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{r.nama}</p>
          <p className="truncate text-xs text-muted">{r.halaqah}{r.program ? " · " + r.program : ""} · hafalan {r.hafalan}</p>
        </div>
        {r._dirty ? <Badge tone="saffron">diubah</Badge> : r.ada ? <Badge tone="leaf"><Check className="size-3" />tersimpan</Badge> : <Badge>belum</Badge>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 min-[460px]:grid-cols-4 min-[460px]:gap-1.5">
        {[{ k: "hadir", l: "Hadir", t: "leaf", c: "text-leaf-deep" }, { k: "sakit", l: "Sakit", t: "amber", c: "text-amber" }, { k: "izin", l: "Izin", t: "sky", c: "text-sky" }, { k: "alfa", l: "Alfa", t: "rose", c: "text-rose" }].map((x) => (
          <div key={x.k}><span className={cn("mb-1 block text-center text-[11px] font-bold", x.c)}>{x.l}</span><Stepper compact tone={x.t as any} label={x.l} value={r[x.k]} onChange={set(x.k)} max={20} /></div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-3">
        {prog("tahsin", "Tahsin", "saffron", "#C26A1E")}
        {prog("ziyadah", "Ziyadah", "leaf", "#17873F")}
        {prog("murajaah", "Murajaah", "sky", "#2F6BD8")}
      </div>

      {r.lulus_target ? (
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px]">
        <Target className="size-3.5 text-leaf-deep" />
        <span className="rounded-full bg-leaf px-2 py-0.5 font-bold text-white">Target lulusan {r.target_lulusan_juz} juz tercapai</span>
        <span className="text-muted">target pekanan gugur; murajaah tetap dicatat</span>
      </div>
      ) : (
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px]">
        <Target className="size-3.5 text-muted" />
        <span className={cn("rounded-full px-2 py-0.5 font-semibold", zOk ? "bg-leaf-soft text-leaf-deep" : "bg-mist text-muted")}>Ziyadah {zOk ? "✓" : `${z}/15 brs`}</span>
        <span className={cn("rounded-full px-2 py-0.5 font-semibold", mOk ? "bg-sky-soft text-sky" : "bg-mist text-muted")}>Murajaah {mOk ? "✓" : `${Math.floor(m / 15)}/5 hal`}</span>
        <AnimatePresence>{zOk && mOk && <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="rounded-full bg-saffron px-2 py-0.5 font-bold text-pine">Target tercapai</motion.span>}</AnimatePresence>
      </div>
      )}

      <button onClick={toggle} className="mt-3 flex w-full items-center gap-2 border-t border-line pt-3 text-[13px] font-semibold text-muted hover:text-ink" aria-expanded={open}>
        Nilai, surat, dan catatan
        {ASPEK_NILAI.some(([k]) => r[k]) ? (
          <span className="flex gap-1">{ASPEK_NILAI.map(([k, l]) => r[k] && <span key={k} title={l} className={cn("rounded px-1.5 text-[10.5px] font-extrabold leading-5", HURUF_CLS[r[k]])}>{l[0]} {r[k]}</span>)}</span>
        ) : r.catatan ? <span className="size-1.5 rounded-full bg-leaf" /> : null}
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="ml-auto"><ChevronDown className="size-4" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid gap-2 pt-3">
              <div className="grid gap-1.5">
                {ASPEK_NILAI.map(([k, l]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-[68px] shrink-0 text-[12px] font-semibold text-muted">{l}</span>
                    <div className="grid flex-1 grid-cols-4 gap-1" role="group" aria-label={"Nilai " + l}>
                      {PREDIKAT.map((h) => (
                        <button key={h} type="button" aria-pressed={r[k] === h} onClick={() => upd(i, pilihNilai(r, k, h))}
                          className={cn("h-8 rounded-lg border text-[13px] font-extrabold transition", r[k] === h ? HURUF_CLS[h] : "border-line bg-white text-muted hover:border-leaf")}>{h}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <Input placeholder="Surat/ayat ziyadah, mis. Al-Mulk 1–15" value={r.ziyadah_surat} onChange={(e) => upd(i, { ziyadah_surat: e.target.value })} />
                <Input placeholder="Juz murajaah, mis. Juz 30" value={r.murajaah_juz} onChange={(e) => upd(i, { murajaah_juz: e.target.value })} />
              </div>
              <Textarea rows={2} className="text-[13px]" placeholder="Catatan untuk santri (terisi otomatis dari nilai, boleh diubah)" value={r.catatan} onChange={(e) => upd(i, { catatan: e.target.value })} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
