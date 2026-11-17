"use client";
import * as React from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { INDIKATOR, PREDIKAT, predikatNilai } from "@/lib/target";
import { Dialog, Button, Input, Textarea, Field, cn } from "./ui";
import { PerkembanganTajwid } from "./PerkembanganTajwid";

const PRED_CLS: Record<string, string> = { A: "bg-leaf text-white", "B+": "bg-sky text-white", B: "bg-saffron text-pine", C: "bg-rose text-white" };
export const PredChip = ({ p, label }: { p?: string; label?: string }) =>
  p ? <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold", PRED_CLS[p])}>{label && <span className="font-semibold opacity-80">{label}</span>}{p}</span> : null;

/** Penilaian makhraj & hukum tajwid per santri (satu catatan per bulan). */
export function TajwidDialog({ s, onClose, onSaved }: { s: any; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState<any>({});
  const [riwayat, setRiwayat] = React.useState<any[] | null>(null);
  const [perk, setPerk] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!s) return;
    setV({ tanggal: F.todayLocal(), makhraj_nilai: "", makhraj: "", ket_makhraj: "", tajwid_nilai: "", tajwid: "", ket_tajwid: "", catatan: "" });
    setRiwayat(null);
    rpc("getPenilaianTajwid", s.id).then((r) => {
      setRiwayat(r.riwayat); setPerk(r.perkembangan || []);
      const cur = r.riwayat.find((x: any) => x.ym === F.todayLocal().slice(0, 7));
      if (cur) setV((o: any) => ({ ...o, ...cur, makhraj_nilai: cur.makhraj_nilai ?? "", tajwid_nilai: cur.tajwid_nilai ?? "" }));
    }).catch((e) => toast.error(e.message));
  }, [s]);
  if (!s) return <Dialog open={false} onOpenChange={() => {}} title="">{null}</Dialog>;

  const setPred = (k: string, p: string) => setV((o: any) => {
    const auto = INDIKATOR[k]?.[o[k]] || "", next = o[k] === p ? "" : p;
    return { ...o, [k]: next, [k + "_nilai"]: "", ["ket_" + k]: !o["ket_" + k] || o["ket_" + k] === auto ? INDIKATOR[k]?.[next] || "" : o["ket_" + k] };
  });
  const setNilai = (k: string, raw: string) => {
    const n = raw.replace(/[^0-9]/g, "").slice(0, 3), p = predikatNilai(n);
    setV((o: any) => {
      const auto = INDIKATOR[k]?.[o[k]] || "";
      return { ...o, [k + "_nilai"]: n, ...(p ? { [k]: p, ["ket_" + k]: !o["ket_" + k] || o["ket_" + k] === auto ? INDIKATOR[k][p] : o["ket_" + k] } : {}) };
    });
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await rpc("savePenilaianTajwid", s.id, v);
      toast.success("Penilaian tersimpan", { description: `Makhraj ${r.makhraj || "–"} · Tajwid ${r.tajwid || "–"} (${F.ymLabel(r.ym)})` });
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const Aspek = ({ k, label }: { k: string; label: string }) => (
    <div className="rounded-2xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-[13.5px] font-bold">{label}</p>
        <div className="flex gap-1">{PREDIKAT.map((p) => (
          <button key={p} onClick={() => setPred(k, p)} className={cn("h-9 min-w-[38px] rounded-lg border px-2 text-[13px] font-extrabold transition", v[k] === p ? PRED_CLS[p] + " border-transparent" : "border-line bg-white text-muted hover:border-leaf")}>{p}</button>
        ))}</div>
      </div>
      <Textarea rows={2} value={v["ket_" + k] || ""} onChange={(e) => setV((o: any) => ({ ...o, ["ket_" + k]: e.target.value }))} placeholder="Keterangan (terisi otomatis dari indikator)" className="mt-2 text-[13px]" />
    </div>
  );

  return (
    <Dialog open={!!s} onOpenChange={(o) => { if (!o) onClose(); }} wide title="Penilaian makhraj & tajwid" description={`${s.nama} · ${s.unit} ${s.tingkat} · ${s.halaqah}`}
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="accent" onClick={save} loading={busy}><Save className="size-4" />Simpan</Button></div>}>
      <div className="space-y-3">
        <p className="text-[12px] text-muted">Satu penilaian per bulan; menyimpan ulang di bulan yang sama akan memperbarui. Pilih A, B+, B, atau C; keterangan terisi otomatis. Hasil terakhir dalam semester otomatis dipakai di ujian semester & raport.</p>
        <Aspek k="makhraj" label="Makhraj huruf" />
        <Aspek k="tajwid" label="Hukum tajwid" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tanggal penilaian"><Input type="date" value={v.tanggal || ""} max={F.todayLocal()} onChange={(e) => setV((o: any) => ({ ...o, tanggal: e.target.value }))} /></Field>
          <Field label="Catatan"><Input value={v.catatan || ""} onChange={(e) => setV((o: any) => ({ ...o, catatan: e.target.value }))} placeholder="opsional" /></Field>
        </div>
        <div>
          <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-muted">Perkembangan bacaan semester ini</p>
          {riwayat == null ? <p className="text-[12px] text-muted">Memuat…</p> : <PerkembanganTajwid data={perk} />}
        </div>
      </div>
    </Dialog>
  );
}
