"use client";
import * as React from "react";
import { toast } from "sonner";
import { Save, UserPlus, ArrowRightLeft, LogOut as Exit } from "lucide-react";
import { rpc } from "@/lib/api";
import { Dialog, Button, Input, Select, Textarea, Field, cn } from "./ui";

const hqLabel = (h: any) => `${h.unit} ${h.tingkat} · ${h.halaqah}${h.musyrif ? " — " + String(h.musyrif).split(",")[0] : ""}`;
function useHalaqah(open: boolean) {
  const [list, setList] = React.useState<any[] | null>(null);
  React.useEffect(() => { if (open) rpc("getHalaqahList").then(setList).catch((e) => toast.error(e.message)); }, [open]);
  return list;
}

/** Tambah santri: cukup nama & program; unit, tingkat, halaqah mengikuti halaqah tujuan. */
export function TambahSantriDialog({ open, onClose, onSaved, defaultHk }: { open: boolean; onClose: () => void; onSaved: () => void; defaultHk?: string }) {
  const hqs = useHalaqah(open);
  const [v, setV] = React.useState({ nama: "", program: "Reguler", halaqah_key: "" });
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) setV({ nama: "", program: "Reguler", halaqah_key: defaultHk && !defaultHk.startsWith("scope:") ? defaultHk : "" }); }, [open, defaultHk]);
  React.useEffect(() => { if (hqs?.length === 1) setV((o) => ({ ...o, halaqah_key: hqs[0].key })); }, [hqs]);
  const save = async () => {
    setBusy(true);
    try {
      const r = await rpc("tambahSantri", v);
      toast.success(r.kembali ? "Santri diaktifkan kembali" : "Santri ditambahkan", { description: v.nama.toUpperCase() });
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Tambah santri" description="Unit dan tingkat mengikuti halaqah tujuan. Data otomatis tercadang ke Spreadsheet."
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="accent" loading={busy} disabled={v.nama.trim().length < 3 || !v.halaqah_key} onClick={save}><UserPlus className="size-4" />Tambah</Button></div>}>
      <div className="space-y-3">
        <Field label="Nama lengkap santri"><Input autoFocus value={v.nama} onChange={(e) => setV({ ...v, nama: e.target.value })} placeholder="contoh: AHMAD FAUZAN RAMADHAN" /></Field>
        <Field label="Program">
          <div className="grid grid-cols-2 gap-2">{["Reguler", "PK"].map((p) => (
            <button key={p} onClick={() => setV({ ...v, program: p })} className={cn("h-10 rounded-xl border text-sm font-bold", v.program === p ? "border-leaf bg-leaf text-white" : "border-line bg-white text-muted")}>{p === "PK" ? "PK (tahfidz)" : p}</button>
          ))}</div>
        </Field>
        <Field label="Halaqah">
          {!hqs ? <p className="text-[12px] text-muted">Memuat…</p> : (
            <Select value={v.halaqah_key} onChange={(e) => setV({ ...v, halaqah_key: e.target.value })}>
              <option value="">— pilih halaqah —</option>
              {hqs.map((h: any) => <option key={h.key} value={h.key}>{hqLabel(h)} ({h.jumlah})</option>)}
            </Select>
          )}
        </Field>
      </div>
    </Dialog>
  );
}

export function EditNamaDialog({ s, onClose, onSaved }: { s: any; onClose: () => void; onSaved: () => void }) {
  const [nama, setNama] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (s) setNama(s.nama); }, [s]);
  const save = async () => {
    setBusy(true);
    try { await rpc("editNamaSantri", s.id, nama); toast.success("Nama diperbarui"); onSaved(); onClose(); }
    catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!s} onOpenChange={(o) => !o && onClose()} title="Edit nama santri" description="Riwayat setoran & hafalan tetap tersambung (ID santri tidak berubah)."
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="accent" loading={busy} disabled={nama.trim().length < 3} onClick={save}><Save className="size-4" />Simpan</Button></div>}>
      <Field label="Nama lengkap"><Input autoFocus value={nama} onChange={(e) => setNama(e.target.value)} /></Field>
    </Dialog>
  );
}

/** Pindah halaqah / keluar. Musyrif: pindah antar-halaqahnya sendiri, atau minta ditempatkan pimpinan. Pimpinan: langsung ke halaqah mana pun. */
export function PindahKeluarDialog({ s, admin, onClose, onSaved }: { s: any; admin: boolean; onClose: () => void; onSaved: () => void }) {
  const hqs = useHalaqah(!!s);
  const [mode, setMode] = React.useState<"pindah" | "minta" | "keluar">("pindah");
  const [hk, setHk] = React.useState(""), [alasan, setAlasan] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const tujuan = (hqs || []).filter((h: any) => h.key !== s?.halaqah_key);
  React.useEffect(() => { if (s) { setHk(""); setAlasan(""); } }, [s]);
  React.useEffect(() => { if (hqs && !admin && !tujuan.length) setMode("minta"); }, [hqs]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    setBusy(true);
    try {
      if (mode === "pindah") { const r = await rpc("pindahkanSantri", s.id, hk); toast.success("Santri dipindahkan", { description: r.halaqah }); }
      else { await rpc("keluarkanSantri", s.id, { jenis: mode === "minta" ? "pindah" : "keluar", alasan }); toast.success(mode === "minta" ? "Diajukan ke pimpinan untuk ditempatkan" : "Santri ditandai keluar", { description: "Riwayatnya tetap tersimpan; pimpinan bisa membatalkan." }); }
      onSaved(); onClose();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  const opsi: [string, string, any][] = [
    ...((admin || tujuan.length) ? [["pindah", admin ? "Pindahkan ke halaqah lain" : "Pindah ke halaqah saya yang lain", ArrowRightLeft] as [string, string, any]] : []),
    ...(!admin ? [["minta", "Pindah halaqah (ditempatkan pimpinan)", ArrowRightLeft] as [string, string, any]] : []),
    ["keluar", "Keluar", Exit],
  ];
  const valid = mode === "pindah" ? !!hk : alasan.trim().length >= 3;
  return (
    <Dialog open={!!s} onOpenChange={(o) => !o && onClose()} title="Pindah halaqah / keluar" description={s ? `${s.nama} · ${s.unit} ${s.tingkat} · ${s.halaqah}` : ""}
      footer={<div className="flex w-full justify-end gap-2"><Button variant="ghost" onClick={onClose}>Batal</Button><Button variant="accent" loading={busy} disabled={!valid} onClick={save}>Simpan</Button></div>}>
      {s && (
        <div className="space-y-3">
          <div className="grid gap-2">{opsi.map(([k, l, Ic]) => (
            <button key={k} onClick={() => setMode(k as any)} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[13.5px] font-semibold", mode === k ? (k === "keluar" ? "border-rose bg-rose-soft text-rose" : "border-leaf bg-leaf/10 text-leaf-deep") : "border-line bg-white text-muted")}><Ic className="size-4" />{l}</button>
          ))}</div>
          {mode === "pindah" ? (
            <Field label="Halaqah tujuan">
              {!hqs ? <p className="text-[12px] text-muted">Memuat…</p> : (
                <Select value={hk} onChange={(e) => setHk(e.target.value)}>
                  <option value="">— pilih halaqah —</option>
                  {tujuan.map((h: any) => <option key={h.key} value={h.key}>{hqLabel(h)} ({h.jumlah})</option>)}
                </Select>
              )}
            </Field>
          ) : (
            <Field label="Alasan" hint={mode === "minta" ? "Santri masuk daftar tunggu; pimpinan menempatkannya ke halaqah baru." : "Santri tidak lagi dihitung; riwayat setoran tetap tersimpan."}>
              <Textarea rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder={mode === "minta" ? "contoh: naik ke kelas tahfidz" : "contoh: pindah sekolah"} />
            </Field>
          )}
        </div>
      )}
    </Dialog>
  );
}
