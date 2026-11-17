"use client";
import * as React from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FileText, Search, MoreHorizontal, UserPlus } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { useApp } from "../App";
import { Card, Select, Button, Input, Empty, Skeleton, Badge, JuzLattice, Bar } from "../ui";
import { JuzMapDialog, HafalanAwalDialog, VerifikasiDialog } from "../HafalanDialogs";
import { TajwidDialog, PredChip } from "../TajwidDialog";
import { TambahSantriDialog, EditNamaDialog, PindahKeluarDialog } from "../KelolaSantri";

export default function Santri() {
  const { curHq, openRaport, admin } = useApp();
  const [ym, setYm] = React.useState(F.ymNow());
  const [list, setList] = React.useState<any[] | null>(null);
  const [q, setQ] = React.useState("");
  const [juz, setJuz] = React.useState<any>(null);
  const [awal, setAwal] = React.useState<any>(null);
  const [ver, setVer] = React.useState<any>(null);
  const [tjw, setTjw] = React.useState<any>(null);
  const [tambah, setTambah] = React.useState(false), [editNama, setEditNama] = React.useState<any>(null), [pindah, setPindah] = React.useState<any>(null);
  const [menu, setMenu] = React.useState("");
  const req = React.useRef(0);
  const load = React.useCallback(async () => {
    const n = ++req.current;
    try { const r = await rpc("getRekap", "bulan", { dari: ym, sampai: ym, halaqah_key: curHq || undefined }); if (n === req.current) setList(r.santri); }
    catch (e: any) { toast.error(e.message); }
  }, [ym, curHq]);
  React.useEffect(() => { setList(null); load(); }, [load]);
  const shown = (list || []).filter((s) => s.nama.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama santri" className="pl-9" />
        </div>
        <Select aria-label="Bulan" value={ym} onChange={(e) => setYm(e.target.value)} className="w-auto">{F.recentMonths(18).map((m) => <option key={m} value={m}>{F.ymLabel(m)}</option>)}</Select>
        <Button variant="outline" onClick={() => setTambah(true)}><UserPlus className="size-4" />Tambah santri</Button>
      </div>
      {!list ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-72" />)}</div> : !shown.length ? <Empty title="Tidak ada santri yang cocok" /> : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => {
            const h = s.hafalan || {}, target = h.target_juz || 5, pct = Math.min(100, ((h.total?.juz_decimal || 0) / target) * 100);
            return (
              <Card key={s.id} className="flex flex-col">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{s.nama}</p>
                    <p className="truncate text-xs text-muted">{s.unit} · tingkat {s.tingkat} · {s.halaqah}{s.program ? " · " + s.program : ""}</p>
                  </div>
                  <div className="relative">
                    <Button variant="ghost" size="icon" aria-label="Aksi hafalan" onClick={() => setMenu(menu === s.id ? "" : s.id)}><MoreHorizontal className="size-4" /></Button>
                    {menu === s.id && (
                      <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="absolute right-0 top-10 z-10 w-52 rounded-2xl border border-line bg-white p-1.5 shadow-xl" onMouseLeave={() => setMenu("")}>
                        {[["Penilaian makhraj & tajwid", () => setTjw(s)], ["Edit nama", () => setEditNama(s)], ["Pindah halaqah / keluar", () => setPindah(s)], ["Set hafalan awal", () => setAwal(s)], ["Verifikasi total hafalan", () => setVer(s)], ["Tandai juz selesai", () => setJuz({ id: s.id, nama: s.nama, juz: h.juz_selesai || [], diuji: h.juz_diuji || [] })]].map(([l, f]: any) => (
                          <button key={l} onClick={() => { setMenu(""); f(); }} className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-mist">{l}</button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-mist p-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-lg font-extrabold text-leaf-deep">{h.total?.teks || "0"}</p>
                    <p className="text-xs text-muted">{h.lulus_target ? <span className="font-bold text-leaf-deep">✓ target {target} juz tercapai</span> : <>target lulusan {target} juz{h.tahfidz ? " · PK" : ""}</>}</p>
                    {s.tajwid && <div className="mt-1 flex justify-end gap-1"><PredChip p={s.tajwid.makhraj} label="Makhraj" /><PredChip p={s.tajwid.tajwid} label="Tajwid" /></div>}
                  </div>
                  <Bar value={pct} className="mt-2 bg-white" />
                  <p className="mt-1.5 text-[11.5px] text-muted">{h.terverifikasi ? `Terverifikasi s.d. ${h.terverifikasi_sampai_ym} (${h.basis?.teks}) + ziyadah ${h.ziyadah?.teks}` : `Awal ${h.awal?.teks || "0"} + ziyadah ${h.ziyadah?.teks || "0"}`}</p>
                  <div className="mt-2.5"><JuzLattice selected={h.juz_selesai || []} diuji={h.juz_diuji || []} size={11} /></div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[["Tahsin", s.total.tahsin.decimal, "text-[#C26A1E]"], ["Ziyadah", s.total.ziyadah.decimal, "text-leaf"], ["Murajaah", s.total.murajaah.decimal, "text-sky"]].map(([l, v, c]) => (
                    <div key={l as string}><p className={"text-lg font-extrabold tabular " + c}>{v}</p><p className="text-[11px] text-muted">{l} (hal)</p></div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3 text-xs">
                  <Badge tone="leaf">H {s.total.hadir}</Badge><Badge tone="amber">S {s.total.sakit}</Badge><Badge tone="sky">I {s.total.izin}</Badge><Badge tone="rose">A {s.total.alfa}</Badge>
                  <span className="ml-1 text-muted">Target {s.total.target.keduanya_tercapai}/{s.total.target.dinilai}</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => openRaport(s.id, ym)}><FileText className="size-3.5" />Raport</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <JuzMapDialog santri={juz} onClose={() => setJuz(null)} onSaved={load} />
      <HafalanAwalDialog s={awal} onClose={() => setAwal(null)} onSaved={load} />
      <VerifikasiDialog s={ver} defaultYm={ym} onClose={() => setVer(null)} onSaved={load} />
      <TajwidDialog s={tjw} onClose={() => setTjw(null)} onSaved={load} />
      <TambahSantriDialog open={tambah} onClose={() => setTambah(false)} onSaved={load} defaultHk={curHq} />
      <EditNamaDialog s={editNama} onClose={() => setEditNama(null)} onSaved={load} />
      <PindahKeluarDialog s={pindah} admin={admin} onClose={() => setPindah(null)} onSaved={load} />
    </div>
  );
}
