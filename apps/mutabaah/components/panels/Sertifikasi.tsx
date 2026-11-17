"use client";
import * as React from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Award, Map } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { useApp } from "../App";
import { Card, Select, Button, Field, Empty, Skeleton, Badge, Dialog, Input, Textarea, CountUp, cn } from "../ui";
import { JuzMapDialog } from "../HafalanDialogs";

const pages = (b: number) => { const a = (b - 1) * 5 + 1; return a + "–" + (a + 4); };

export default function Sertifikasi() {
  const { admin, curHq, user } = useApp();
  const [data, setData] = React.useState<any>(null);
  const [sid, setSid] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [edit, setEdit] = React.useState<{ juz: number; bagian: number } | null>(null);
  const [form, setForm] = React.useState<any>({});
  const [busy, setBusy] = React.useState(false);
  const [juzOpen, setJuzOpen] = React.useState(false);
  const req = React.useRef(0);

  const load = React.useCallback(async (id = sid) => {
    const n = ++req.current; setLoading(true);
    try { const d = await rpc("getSertifikasi", admin ? curHq : "", id); if (n === req.current) { setData(d); setSid(d.selected?.id || ""); } }
    catch (e: any) { toast.error(e.message); } finally { if (n === req.current) setLoading(false); }
  }, [admin, curHq, sid]);
  React.useEffect(() => { load(""); /* eslint-disable-next-line */ }, [curHq]);

  const recMap: Record<string, any> = {};
  (data?.records || []).forEach((r: any) => (recMap[r.juz + "-" + r.bagian] = r));
  const haf: number[] = data?.hafalan?.juz_selesai || [];

  const open = (juz: number, bagian: number) => {
    const r = recMap[juz + "-" + bagian];
    setForm({ tanggal_ujian: r?.tanggal_ujian || F.todayLocal(), nilai: r?.nilai ?? "", status: r?.status || "lulus", penguji: r?.penguji || user.nama, catatan: r?.catatan || "" });
    setEdit({ juz, bagian });
  };
  const sudahAda = !!(edit && recMap[edit.juz + "-" + edit.bagian]);
  const save = async () => {
    if (!edit) return;
    setBusy(true);
    try { await rpc("saveSertifikasi", { santri_id: sid, ...edit, ...form }); toast.success(form.status === "belum" ? "Dikembalikan ke belum diuji" : "Hasil sertifikasi tersimpan"); setEdit(null); load(sid); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Santri kelas 9 dan 12">
            <Select value={sid} onChange={(e) => load(e.target.value)} disabled={!data?.santri?.length}>
              {(data?.santri || []).map((s: any) => <option key={s.id} value={s.id}>{s.nama} · {s.unit} {s.tingkat} · {s.halaqah}</option>)}
            </Select>
          </Field>
          <Button variant="outline" onClick={() => setJuzOpen(true)} disabled={!data?.selected}><Map className="size-4" />Tandai juz selesai</Button>
        </div>
        <p className="mt-2 text-xs text-muted">Tiap juz diuji dalam empat bagian, masing-masing minimal 5 halaman dalam sekali duduk: halaman 1–5, 6–10, 11–15, dan 16–20. Ketuk kotak untuk mengisi hasil.</p>
      </Card>

      {loading && !data ? <Skeleton className="h-96" /> : !data?.selected ? (
        <Empty icon={<Award className="size-8" />} title="Belum ada santri kelas 9 atau 12">Sertifikasi hanya untuk santri tingkat akhir pada halaqah yang dipilih.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[{ v: data.summary.bagian_lulus, t: 120, l: "Bagian lulus", c: "text-leaf" }, { v: data.summary.jumlah_juz_lulus, t: 30, l: "Juz lulus penuh", c: "text-saffron" }, { v: haf.length, t: 30, l: "Juz hafalan selesai", c: "text-sky" }].map((x) => (
              <Card key={x.l} className="p-3 sm:p-4">
                <p className={cn("text-2xl font-extrabold sm:text-3xl", x.c)}><CountUp value={x.v} /><span className="text-base text-muted">/{x.t}</span></p>
                <p className="mt-1 text-xs text-muted sm:text-[13px]">{x.l}</p>
              </Card>
            ))}
          </div>
          <Card className="p-3 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
              <div className="flex-1"><p className="font-bold">{data.selected.nama}</p><p className="text-xs text-muted">{data.selected.unit} · tingkat {data.selected.tingkat} · {data.selected.halaqah}</p></div>
              <div className="flex gap-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-sm bg-leaf" />Lulus</span>
                <span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-sm bg-saffron" />Remedial</span>
                <span className="inline-flex items-center gap-1"><i className="size-2.5 rounded-sm border border-line bg-white" />Belum</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => {
                const all = [1, 2, 3, 4].every((b) => recMap[j + "-" + b]?.status === "lulus");
                return (
                  <div key={j} className={cn("flex items-center gap-2 rounded-2xl border p-2", all ? "border-leaf/40 bg-leaf-soft/60" : "border-line")}>
                    <div className="w-14 shrink-0 pl-1">
                      <p className="text-sm font-extrabold">Juz {j}</p>
                      <p className={cn("text-[10.5px] font-semibold", haf.includes(j) ? "text-sky" : "text-[#a3b0a8]")}>{haf.includes(j) ? "hafal ✓" : "—"}</p>
                    </div>
                    <div className="grid flex-1 grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((b) => {
                        const r = recMap[j + "-" + b];
                        return (
                          <motion.button key={b} whileTap={{ scale: 0.94 }} onClick={() => open(j, b)} title={`Juz ${j}, bagian ${b}/4, halaman ${pages(b)}`}
                            className={cn("h-11 rounded-xl border text-[11px] font-bold leading-tight transition-colors",
                              !r ? "border-line bg-white text-muted hover:border-leaf" : r.status === "lulus" ? "border-leaf bg-leaf text-white" : "border-saffron bg-saffron text-pine")}>
                            ¼·{b}
                            <span className="block text-[10px] font-semibold opacity-80">{r ? (r.nilai != null ? r.nilai : r.status === "lulus" ? "lulus" : "remed") : pages(b)}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)} title={edit ? `Juz ${edit.juz} · bagian ${edit.bagian}/4` : ""} description={edit ? `Halaman ${pages(edit.bagian)} · minimal 5 halaman dalam sekali duduk` : ""}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>Batal</Button><Button onClick={save} loading={busy}>Simpan hasil</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal ujian"><Input type="date" value={form.tanggal_ujian || ""} max={F.todayLocal()} onChange={(e) => setForm({ ...form, tanggal_ujian: e.target.value })} /></Field>
          <Field label="Nilai (0–100)"><Input inputMode="decimal" value={form.nilai ?? ""} placeholder="Opsional" onChange={(e) => setForm({ ...form, nilai: e.target.value.replace(/[^0-9.]/g, "") })} /></Field>
        </div>
        <div className={cn("mt-3 grid gap-2", sudahAda ? "grid-cols-3" : "grid-cols-2")}>
          {([["lulus", "Lulus", "bg-leaf text-white border-leaf"], ["remedial", "Remedial", "bg-saffron text-pine border-saffron"]] as string[][])
            .concat(sudahAda ? [["belum", "Belum", "bg-white text-rose border-rose"]] : []).map(([v, l, c]) => (
            <button key={v} onClick={() => setForm({ ...form, status: v })} className={cn("h-11 rounded-xl border text-sm font-bold transition-colors", form.status === v ? c : "border-line bg-white text-muted")}>{l}</button>
          ))}
        </div>
        {form.status === "belum" && <p className="mt-2 rounded-xl bg-rose-soft px-3 py-2 text-[12.5px] text-rose">Hasil ujian bagian ini akan <b>dihapus</b> dan kembali menjadi <b>belum diuji</b>. Gunakan bila penguji salah memilih santri atau bagian.</p>}
        <Field label="Penguji" className="mt-3"><Input value={form.penguji || ""} onChange={(e) => setForm({ ...form, penguji: e.target.value })} /></Field>
        <Field label="Catatan ujian" className="mt-3"><Textarea rows={3} value={form.catatan || ""} placeholder="Kesalahan, kelancaran, atau tindak lanjut" onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></Field>
      </Dialog>

      <JuzMapDialog santri={juzOpen && data?.selected ? { id: data.selected.id, nama: data.selected.nama, juz: haf, diuji: data?.hafalan?.juz_diuji || [] } : null} onClose={() => setJuzOpen(false)} onSaved={() => load(sid)} />
    </div>
  );
}
