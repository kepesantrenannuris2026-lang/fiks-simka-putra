"use client";
import * as React from "react";
import { toast } from "sonner";
import { UserPlus, UserMinus, Undo2, ArrowRightLeft, Clock, LogOut as Exit, Users } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { useApp } from "../App";
import { Card, CardTitle, Button, Input, Select, Field, Dialog, Empty, Skeleton, cn } from "../ui";

const hqLabel = (h: any) => `${h.unit} ${h.tingkat} · ${h.halaqah}${h.musyrif ? " — " + String(h.musyrif).split(",")[0] : ""}`;
const waktu = (t: any) => (t ? F.dateShort ? F.dateShort(String(t).slice(0, 10)) : String(t).slice(0, 10) : "");

/** Halaman pimpinan: penempatan santri, santri keluar, dan kelola musyrif/ah. */
export default function Kelola() {
  const { reloadHq } = useApp();
  const [d, setD] = React.useState<any>(null);
  const [tujuan, setTujuan] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState("");
  const [tambah, setTambah] = React.useState(false), [hapus, setHapus] = React.useState<any>(null);
  const load = React.useCallback(async () => { try { setD(await rpc("getKelola")); } catch (e: any) { toast.error(e.message); } }, []);
  React.useEffect(() => { load(); }, [load]);
  const act = async (k: string, f: () => Promise<any>, ok: (r: any) => string) => {
    setBusy(k);
    try { const r = await f(); toast.success(ok(r)); await load(); reloadHq(); } catch (e: any) { toast.error(e.message); } finally { setBusy(""); }
  };
  if (!d) return <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>;
  const aktif = d.musyrif.filter((m: any) => m.aktif === "Y");

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle hint="Santri yang diajukan musyrif untuk pindah halaqah" right={<span className="grid size-9 place-items-center rounded-xl bg-saffron-soft text-[#9a5510]"><Clock className="size-5" /></span>}>
          Menunggu penempatan ({d.menunggu.length})
        </CardTitle>
        {!d.menunggu.length ? <p className="text-[13px] text-muted">Tidak ada santri yang menunggu.</p> : (
          <div className="divide-y divide-line">
            {d.menunggu.map((s: any) => (
              <div key={s.id} className="py-3">
                <p className="font-bold">{s.nama}</p>
                <p className="text-[12px] text-muted">Dari {s.status_sebelum ? hqLabel(s.status_sebelum) : `${s.unit} ${s.tingkat} · ${s.halaqah}`} · {waktu(s.status_pada)} oleh {s.status_oleh}</p>
                {s.status_alasan && <p className="mt-0.5 text-[12.5px]">“{s.status_alasan}”</p>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Select value={tujuan[s.id] || ""} onChange={(e) => setTujuan({ ...tujuan, [s.id]: e.target.value })} className="min-w-0 flex-1" aria-label="Halaqah tujuan">
                    <option value="">— pilih halaqah tujuan —</option>
                    {d.halaqah.map((h: any) => <option key={h.key} value={h.key}>{hqLabel(h)} ({h.jumlah})</option>)}
                  </Select>
                  <Button variant="accent" disabled={!tujuan[s.id]} loading={busy === "t" + s.id} onClick={() => act("t" + s.id, () => rpc("pindahkanSantri", s.id, tujuan[s.id]), (r) => `Ditempatkan di ${r.halaqah}`)}><ArrowRightLeft className="size-4" />Tempatkan</Button>
                  <Button variant="ghost" loading={busy === "b" + s.id} onClick={() => act("b" + s.id, () => rpc("batalkanStatusSantri", s.id), () => "Dikembalikan ke halaqah semula")}><Undo2 className="size-4" />Batalkan</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle hint="Musyrif/ah aktif dan jumlah binaannya" right={<Button variant="accent" onClick={() => setTambah(true)}><UserPlus className="size-4" />Tambah musyrif/ah</Button>}>
          Musyrif/ah ({aktif.length})
        </CardTitle>
        <div className="divide-y divide-line">
          {aktif.map((m: any) => (
            <div key={m.username} className="flex items-center gap-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mist text-leaf"><Users className="size-4" /></span>
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{m.nama}</p><p className="truncate text-[12px] text-muted">@{m.username} · {m.halaqah} halaqah · {m.santri} santri</p></div>
              <Button variant="ghost" size="sm" className="text-rose hover:bg-rose-soft" onClick={() => setHapus(m)}><UserMinus className="size-4" />Hapus</Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle hint="Riwayat setoran tetap tersimpan; status bisa dibatalkan" right={<span className="grid size-9 place-items-center rounded-xl bg-rose-soft text-rose"><Exit className="size-5" /></span>}>
          Santri keluar ({d.keluar.length})
        </CardTitle>
        {!d.keluar.length ? <p className="text-[13px] text-muted">Belum ada.</p> : (
          <div className="divide-y divide-line">
            {d.keluar.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{s.nama}</p><p className="truncate text-[12px] text-muted">{s.unit} {s.tingkat} · {s.halaqah} · {waktu(s.status_pada)}{s.status_alasan ? ` · “${s.status_alasan}”` : ""}</p></div>
                <Button variant="ghost" size="sm" loading={busy === "k" + s.id} onClick={() => act("k" + s.id, () => rpc("batalkanStatusSantri", s.id), () => "Santri diaktifkan kembali")}><Undo2 className="size-4" />Batalkan</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <TambahMusyrifDialog open={tambah} d={d} onClose={() => setTambah(false)} onSaved={() => { load(); reloadHq(); }} />
      <HapusMusyrifDialog m={hapus} aktif={aktif} onClose={() => setHapus(null)} onSaved={() => { load(); reloadHq(); }} />
    </div>
  );
}

function TambahMusyrifDialog({ open, d, onClose, onSaved }: { open: boolean; d: any; onClose: () => void; onSaved: () => void }) {
  const kosong = { nama: "", username: "", password: "", mode: "baru", halaqah_key: "", unit: "", tingkat: "", halaqah: "" };
  const [v, setV] = React.useState<any>(kosong);
  const [busy, setBusy] = React.useState(false), [hasil, setHasil] = React.useState<any>(null);
  React.useEffect(() => { if (open) { setV(kosong); setHasil(null); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    setBusy(true);
    try { const r = await rpc("tambahMusyrif", v); setHasil(r); toast.success("Musyrif/ah ditambahkan"); onSaved(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const valid = v.nama.trim().length >= 4 && (v.mode === "tanpa" || (v.mode === "ambil" ? !!v.halaqah_key : !!(v.unit && v.tingkat && v.halaqah.trim().length >= 3)));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Tambah musyrif/ah" description="Membuat akun sekaligus menetapkan halaqahnya."
      footer={hasil ? <Button className="w-full" onClick={onClose}>Selesai</Button> : <div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="accent" loading={busy} disabled={!valid} onClick={save}><UserPlus className="size-4" />Tambah</Button></div>}>
      {hasil ? (
        <div className="space-y-2 text-[13.5px]">
          <p>Akun berhasil dibuat. Sampaikan ke musyrif/ah:</p>
          <div className="rounded-2xl bg-mist p-3 font-mono text-[13px]">Username: <b>{hasil.username}</b><br />Password: <b>{hasil.password}</b></div>
          {hasil.halaqah && <p className="text-muted">Halaqah: {hasil.halaqah}{hasil.santri_dipindah ? ` (${hasil.santri_dipindah} santri)` : " (belum ada santri; musyrif/ah bisa menambah santri sendiri)"}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="Nama lengkap dengan gelar"><Input autoFocus value={v.nama} onChange={(e) => setV({ ...v, nama: e.target.value })} placeholder="contoh: Usth. Fatimah Az-Zahra, S.Ag" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Username" hint="kosongkan = otomatis"><Input value={v.username} onChange={(e) => setV({ ...v, username: e.target.value })} placeholder="otomatis" /></Field>
            <Field label="Password" hint="kosongkan = nurista123"><Input value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} placeholder="nurista123" /></Field>
          </div>
          <Field label="Halaqah">
            <div className="grid grid-cols-3 gap-1.5">{[["baru", "Halaqah baru"], ["ambil", "Ambil alih"], ["tanpa", "Nanti saja"]].map(([k, l]) => (
              <button key={k} onClick={() => setV({ ...v, mode: k })} className={cn("h-9 rounded-xl border text-[12.5px] font-bold", v.mode === k ? "border-leaf bg-leaf text-white" : "border-line bg-white text-muted")}>{l}</button>
            ))}</div>
          </Field>
          {v.mode === "baru" && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Unit"><Select value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })}><option value="">— unit —</option>{d.units.map((u: string) => <option key={u}>{u}</option>)}</Select></Field>
              <Field label="Tingkat"><Select value={v.tingkat} onChange={(e) => setV({ ...v, tingkat: e.target.value })}><option value="">— kelas —</option>{(v.unit.startsWith("SMP") ? ["7", "8", "9"] : ["10", "11", "12"]).map((t) => <option key={t}>{t}</option>)}</Select></Field>
              <Field label="Nama halaqah" className="col-span-2"><Input value={v.halaqah} onChange={(e) => setV({ ...v, halaqah: e.target.value })} placeholder="contoh: HALAQAH 6" /></Field>
            </div>
          )}
          {v.mode === "ambil" && (
            <Field label="Halaqah yang diambil alih" hint="Seluruh santri halaqah ini pindah ke musyrif/ah baru.">
              <Select value={v.halaqah_key} onChange={(e) => setV({ ...v, halaqah_key: e.target.value })}><option value="">— pilih halaqah —</option>{d.halaqah.map((h: any) => <option key={h.key} value={h.key}>{hqLabel(h)} ({h.jumlah})</option>)}</Select>
            </Field>
          )}
        </div>
      )}
    </Dialog>
  );
}

function HapusMusyrifDialog({ m, aktif, onClose, onSaved }: { m: any; aktif: any[]; onClose: () => void; onSaved: () => void }) {
  const [p, setP] = React.useState(""), [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (m) setP(""); }, [m]);
  const save = async () => {
    setBusy(true);
    try { const r = await rpc("hapusMusyrif", m.username, p); toast.success("Musyrif/ah dinonaktifkan", { description: `${r.santri_dipindah} santri diserahkan ke ${r.pengganti}` }); onSaved(); onClose(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!m} onOpenChange={(o) => !o && onClose()} title="Hapus musyrif/ah" description={m ? `${m.nama} · ${m.halaqah} halaqah · ${m.santri} santri` : ""}
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="accent" loading={busy} disabled={!p} onClick={save}><UserMinus className="size-4" />Hapus & serahkan</Button></div>}>
      {m && (
        <div className="space-y-3 text-[13px]">
          <p className="rounded-xl bg-rose-soft px-3 py-2 text-rose">Akun dinonaktifkan (tidak bisa login). Riwayat setoran tetap tersimpan. Semua halaqah & santrinya wajib diserahkan ke musyrif/ah pengganti.</p>
          <Field label="Musyrif/ah pengganti">
            <Select value={p} onChange={(e) => setP(e.target.value)}><option value="">— pilih pengganti —</option>{aktif.filter((x) => x.username !== m.username).map((x) => <option key={x.username} value={x.username}>{x.nama} ({x.santri} santri)</option>)}</Select>
          </Field>
        </div>
      )}
    </Dialog>
  );
}
