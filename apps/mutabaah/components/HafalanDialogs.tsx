"use client";
import * as React from "react";
import { toast } from "sonner";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { Dialog, Button, Field, Select, Input, JuzLattice, JuzLegend, juzCycle, Stepper } from "./ui";

export function JuzMapDialog({ santri, onClose, onSaved }: { santri: { id: string; nama: string; juz: number[]; diuji?: number[] } | null; onClose: () => void; onSaved: () => void }) {
  const [sel, setSel] = React.useState<number[]>([]);
  const [uji, setUji] = React.useState<number[]>([]);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (santri) { setSel(santri.juz || []); setUji((santri.diuji || []).filter((j) => (santri.juz || []).includes(j))); } }, [santri]);
  const toggle = (j: number) => { const [a, b] = juzCycle(sel, uji, j); setSel(a); setUji(b); };
  const save = async () => {
    if (!santri) return;
    setBusy(true);
    try { await rpc("saveJuzHafalan", santri.id, sel, santri.diuji === undefined ? null : uji); toast.success("Peta juz hafalan tersimpan"); onSaved(); onClose(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!santri} onOpenChange={(o) => !o && onClose()} title={"Juz hafalan · " + (santri?.nama || "")}
      description="Ketuk sekali bila hafalan juz selesai (hijau). Ketuk lagi bila juz itu sudah diujikan (oranye). Ketuk sekali lagi untuk menghapus tanda."
      footer={<><span className="mr-auto text-sm text-muted">{sel.length} selesai · {uji.length} diuji</span><Button variant="outline" onClick={onClose}>Batal</Button><Button onClick={save} loading={busy}>Simpan peta hafalan</Button></>}>
      <div className="flex flex-col items-center gap-3 py-2"><div className="max-w-[440px]"><JuzLattice selected={sel} diuji={uji} size={26} onToggle={toggle} /></div><JuzLegend /></div>
    </Dialog>
  );
}

export function HafalanAwalDialog({ s, onClose, onSaved }: { s: any | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState({ juz: "0", hal: "0", baris: "0", target: "0" });
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (s) { const a = s.hafalan?.awal || {}; setV({ juz: String(a.juz || 0), hal: String(a.hal || 0), baris: String(a.baris || 0), target: String(s.hafalan?.target_default ? 0 : s.hafalan?.target_tersimpan || s.hafalan?.target_juz || 0) }); } }, [s]);
  const save = async () => {
    setBusy(true);
    try { const r = await rpc("saveHafalanAwal", s.id, v.juz || 0, v.hal || 0, v.baris || 0, Number(v.target), ""); toast.success("Hafalan awal disimpan: " + r.total.teks); onSaved(); onClose(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!s} onOpenChange={(o) => !o && onClose()} title={"Hafalan awal · " + (s?.nama || "")} description="Hafalan yang sudah dimiliki sebelum tercatat di aplikasi."
      footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button onClick={save} loading={busy}>Simpan hafalan awal</Button></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Juz"><Stepper value={v.juz} onChange={(x) => setV({ ...v, juz: x })} max={30} label="Juz" /></Field>
        <Field label="Halaman"><Stepper value={v.hal} onChange={(x) => setV({ ...v, hal: x })} max={19} label="Halaman" /></Field>
        <Field label="Baris"><Stepper value={v.baris} onChange={(x) => setV({ ...v, baris: x })} max={14} label="Baris" /></Field>
      </div>
      <Field label="Target hafalan" className="mt-4">
        <Select value={v.target} onChange={(e) => setV({ ...v, target: e.target.value })}><option value="0">Default ({s?.hafalan?.tahfidz ? "program khusus · 10" : "reguler · 5"} juz)</option>{[5, 10, 15, 20, 25, 30].map((t) => <option key={t} value={t}>{t} juz</option>)}</Select>
      </Field>
    </Dialog>
  );
}

export function VerifikasiDialog({ s, defaultYm, onClose, onSaved }: { s: any | null; defaultYm: string; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState({ juz: "0", hal: "0", baris: "0", ym: defaultYm });
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (s) { const t = s.hafalan?.total || {}; setV({ juz: String(t.juz || 0), hal: String(t.hal || 0), baris: String(t.baris || 0), ym: defaultYm }); } }, [s, defaultYm]);
  const save = async () => {
    setBusy(true);
    try { const r = await rpc("saveHafalanTerverifikasi", s.id, v.juz || 0, v.hal || 0, v.baris || 0, v.ym, ""); toast.success(`Verifikasi tersimpan: ${r.total.teks} s.d. ${F.ymLabel(r.sampai)}`); onSaved(); onClose(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!s} onOpenChange={(o) => !o && onClose()} title={"Verifikasi total hafalan · " + (s?.nama || "")}
      description="Total hasil verifikasi menggantikan perhitungan otomatis sampai akhir bulan yang dipilih. Ziyadah sesudahnya tetap ditambahkan."
      footer={<><Button variant="outline" onClick={onClose}>Batal</Button><Button onClick={save} loading={busy}>Simpan verifikasi</Button></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Juz"><Stepper value={v.juz} onChange={(x) => setV({ ...v, juz: x })} max={30} label="Juz" /></Field>
        <Field label="Halaman"><Stepper value={v.hal} onChange={(x) => setV({ ...v, hal: x })} max={19} label="Halaman" /></Field>
        <Field label="Baris"><Stepper value={v.baris} onChange={(x) => setV({ ...v, baris: x })} max={14} label="Baris" /></Field>
      </div>
      <Field label="Terverifikasi sampai akhir bulan" className="mt-4">
        <Select value={v.ym} onChange={(e) => setV({ ...v, ym: e.target.value })}>{F.recentMonths(18).map((m) => <option key={m} value={m}>{F.ymLabel(m)}</option>)}</Select>
      </Field>
    </Dialog>
  );
}
