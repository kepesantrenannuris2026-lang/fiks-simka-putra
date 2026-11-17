"use client";
import * as React from "react";
import { toast } from "sonner";
import { KeyRound, RefreshCcw, UserPlus, DatabaseZap, CloudUpload, LogOut, Sheet } from "lucide-react";
import { rpc } from "@/lib/api";
import { useApp } from "../App";
import { Card, CardTitle, Button, Input, Field, Select, Badge, cn } from "../ui";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/15C4_evwRExmW8W86VaLaQ78BqPvJY-sIhcQleRbioEM/edit";

export default function Akun() {
  const { user, admin, logout, reloadHq, syncTick } = useApp();
  const [pass, setPass] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [akun, setAkun] = React.useState<any[]>([]);
  const [names, setNames] = React.useState<string[]>([]);
  const [st, setSt] = React.useState<any>(null);
  const [na, setNa] = React.useState({ username: "", nama: "", password: "", role: "musyrif", musyrif_master: "" });

  const loadAdmin = React.useCallback(async () => {
    if (!admin) return;
    try { const [a, n, s] = await Promise.all([rpc("getAkunList"), rpc("getMusyrifNames"), rpc("getSyncStatus")]); setAkun(a); setNames(n); setSt(s); }
    catch (e: any) { toast.error(e.message); }
  }, [admin]);
  React.useEffect(() => { loadAdmin(); }, [loadAdmin]);
  React.useEffect(() => {
    if (!admin || !st?.import || !["antre", "berjalan"].includes(st.import.status)) return;
    const t = setTimeout(loadAdmin, 5000);
    return () => clearTimeout(t);
  }, [st, admin, loadAdmin]);

  const act = async (key: string, fn: () => Promise<any>, ok: (r: any) => string) => {
    setBusy(key);
    try { const r = await fn(); toast.success(ok(r)); await loadAdmin(); syncTick(); }
    catch (e: any) { toast.error(e.message, { duration: 7000 }); } finally { setBusy(""); }
  };

  const imp = st?.import;
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[360px_1fr]">
      <div className="space-y-5">
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-leaf-soft text-lg font-extrabold text-leaf-deep">{user.nama.replace(/^(ust\.?|usth\.?)\s*/i, "").charAt(0)}</div>
            <div className="min-w-0"><p className="truncate font-bold">{user.nama}</p><p className="text-xs text-muted">@{user.username} · {user.role}</p></div>
          </div>
          {user.musyrif_master && <p className="mt-3 text-xs text-muted">Terhubung ke musyrif: {user.musyrif_master}</p>}
          <Field label="Ganti password" className="mt-4">
            <div className="flex gap-2"><Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password baru" autoComplete="new-password" />
              <Button loading={busy === "pass"} onClick={() => { if (pass.length < 4) return toast.error("Password minimal 4 karakter."); act("pass", () => rpc("saveAkun", { username: user.username, password: pass }), () => { setPass(""); return "Password diperbarui"; }); }}><KeyRound className="size-4" /></Button></div>
          </Field>
          <Button variant="outline" className="mt-4 w-full" onClick={logout}><LogOut className="size-4" />Keluar</Button>
        </Card>

        {admin && (
          <Card>
            <CardTitle hint="Setiap penyimpanan langsung masuk ke database aplikasi, lalu disalin otomatis ke Google Spreadsheet.">Cadangan Spreadsheet</CardTitle>
            {st && (
              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between"><span className="text-muted">Koneksi</span>{st.configured ? <Badge tone="leaf">terhubung</Badge> : <Badge tone="rose">belum diatur</Badge>}</div>
                <div className="flex justify-between"><span className="text-muted">Antrean dikirim</span><b className="tabular">{st.pending}</b></div>
                <div className="flex justify-between"><span className="text-muted">Pengiriman terakhir</span><span>{st.last_sync?.at ? new Date(st.last_sync.at).toLocaleString("id-ID") : "–"}</span></div>
                <div className="flex justify-between"><span className="text-muted">Santri di database</span><b className="tabular">{st.santri}</b></div>
                {st.last_error && <p className="rounded-xl bg-rose-soft px-3 py-2 text-xs text-rose">{st.last_error}</p>}
                {imp && <p className={cn("rounded-xl px-3 py-2 text-xs", imp.status === "gagal" ? "bg-rose-soft text-rose" : imp.status === "selesai" ? "bg-leaf-soft text-leaf-deep" : "bg-amber-soft text-amber")}>
                  Tarik data dari Spreadsheet: <b>{imp.status}</b>{imp.counts ? ` · ${imp.counts.setoran} setoran, ${imp.counts.santri} santri, ${imp.counts.akun} akun` : ""}{imp.error ? " · " + imp.error : ""}
                </p>}
              </div>
            )}
            <div className="mt-4 grid gap-2">
              <Button variant="outline" loading={busy === "sync"} onClick={() => act("sync", () => rpc("triggerSync"), () => "Pengiriman antrean dimulai")}><CloudUpload className="size-4" />Kirim antrean sekarang</Button>
              <Button variant="outline" loading={busy === "imp"} onClick={() => { if (confirm("Tarik ulang seluruh data dari Spreadsheet ke aplikasi? Data yang lebih baru di aplikasi tidak akan ditimpa.")) act("imp", () => rpc("startImport"), () => "Penarikan data dimulai di latar belakang"); }}><DatabaseZap className="size-4" />Tarik ulang data dari Spreadsheet</Button>
              <Button variant="ghost" asChild><a href={SHEET_URL} target="_blank" rel="noreferrer"><Sheet className="size-4" />Buka Spreadsheet</a></Button>
            </div>
          </Card>
        )}
      </div>

      {admin && (
        <div className="space-y-5">
          <Card>
            <CardTitle hint="Aplikasi adalah sumber utama data santri & halaqah (kelola di menu Santri dan Kelola). Spreadsheet hanya cadangan otomatis satu arah.">Data santri & halaqah</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button loading={busy === "master"} onClick={() => act("master", () => rpc("kirimMasterSpreadsheet"), (r) => `Dikirim ke Spreadsheet: ${r.santri} santri & ${r.akun} akun (masuk dalam beberapa menit)`)}><RefreshCcw className="size-4" />Kirim data master ke Spreadsheet</Button>
              <Button variant="outline" loading={busy === "gen"} onClick={() => act("gen", () => rpc("generateAkunFromUI"), (r) => `${r.baru} akun musyrif baru dibuat`)}><UserPlus className="size-4" />Buat akun musyrif yang belum ada</Button>
            </div>
          </Card>

          <Card>
            <CardTitle hint="Username baru memakai password default bila kolom password dikosongkan.">Tambah atau ubah akun</CardTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Username"><Input value={na.username} onChange={(e) => setNa({ ...na, username: e.target.value })} /></Field>
              <Field label="Nama"><Input value={na.nama} onChange={(e) => setNa({ ...na, nama: e.target.value })} /></Field>
              <Field label="Password"><Input value={na.password} onChange={(e) => setNa({ ...na, password: e.target.value })} placeholder="Kosongkan untuk password default" /></Field>
              <Field label="Peran"><Select value={na.role} onChange={(e) => setNa({ ...na, role: e.target.value })}><option value="musyrif">Musyrif</option><option value="pimpinan">Pimpinan</option></Select></Field>
              <Field label="Nama musyrif di sheet master" className="sm:col-span-2" hint="Harus sama persis dengan kolom MUSYRIF agar santri binaan muncul.">
                <Input list="musyrif-list" value={na.musyrif_master} onChange={(e) => setNa({ ...na, musyrif_master: e.target.value })} placeholder="mis. Ust. Ahmad Fauzi, Lc" />
                <datalist id="musyrif-list">{names.map((n) => <option key={n} value={n} />)}</datalist>
              </Field>
            </div>
            <Button className="mt-4" loading={busy === "na"} onClick={() => act("na", () => rpc("saveAkun", na), () => { setNa({ username: "", nama: "", password: "", role: "musyrif", musyrif_master: "" }); return "Akun tersimpan"; })}>Simpan akun</Button>
          </Card>

          <Card className="p-0">
            <div className="px-4 pt-4 sm:px-5"><CardTitle>{akun.length} akun</CardTitle></div>
            <div className="scroll-thin max-h-[60vh] overflow-auto border-t border-line">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead className="sticky top-0 bg-[#F6F9F7] text-xs text-muted"><tr><th className="px-4 py-2 text-left font-semibold">Akun</th><th className="px-4 py-2 text-left font-semibold">Musyrif master</th><th className="px-4 py-2 text-left font-semibold">Status</th><th /></tr></thead>
                <tbody>{akun.map((a) => {
                  const off = String(a.aktif).toUpperCase() === "N";
                  return (
                    <tr key={a.username} className="border-t border-line">
                      <td className="px-4 py-2"><p className="font-semibold">{a.nama}</p><p className="text-xs text-muted">@{a.username} · {a.role}</p></td>
                      <td className="px-4 py-2 text-xs">{a.musyrif_master || <span className="text-muted">–</span>}</td>
                      <td className="px-4 py-2">{off ? <Badge tone="rose">nonaktif</Badge> : <Badge tone="leaf">aktif</Badge>}</td>
                      <td className="px-4 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setNa({ username: a.username, nama: a.nama, password: "", role: a.role, musyrif_master: a.musyrif_master })}>Ubah</Button>
                        <Button size="sm" variant="ghost" onClick={() => { if (confirm((off ? "Aktifkan" : "Nonaktifkan") + " akun " + a.username + "?")) act("t" + a.username, () => rpc("setAkunAktif", a.username, off), () => "Status akun diperbarui"); }}>{off ? "Aktifkan" : "Nonaktifkan"}</Button>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
