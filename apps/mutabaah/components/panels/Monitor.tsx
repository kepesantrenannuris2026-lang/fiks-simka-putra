"use client";
import * as React from "react";
import { toast } from "sonner";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { MessageCircle } from "lucide-react";
import { Card, Select, Input, Skeleton, CountUp, cn, Field } from "../ui";

const appUrl = () => (typeof window !== "undefined" ? window.location.origin : "");
function waText(x: any, bulan: number, tahun: number) {
  const periode = `${F.BULAN[bulan - 1]} ${tahun}`;
  const salam = `Assalamu'alaikum warahmatullahi wabarakatuh, ${x.musyrif}.`;
  const hq = `halaqah ${x.halaqah} (${x.unit} ${x.tingkat}, ${x.jumlah} santri)`;
  let isi: string;
  if (x.status === "lengkap") isi = `Jazakumullahu khairan, mutabaah ${hq} untuk ${periode} sudah lengkap.`;
  else if (x.belum?.length) {
    const rinci = x.belum.map((i: number) => `P${i} (${x.pekan[i].terisi}/${x.jumlah})`).join(", ");
    isi = `Afwan, mengingatkan pengisian mutabaah ${hq} bulan ${periode}. Pekan yang belum lengkap: ${rinci}.\n\nMohon dilengkapi melalui ${appUrl()}\n\nJazakumullahu khairan.`;
  } else isi = `Mengingatkan pengisian mutabaah ${hq} bulan ${periode} melalui ${appUrl()}\n\nJazakumullahu khairan.`;
  return `${salam}\n\n${isi}`;
}
const waLink = (x: any, bulan: number, tahun: number) => `https://wa.me/${x.wa}?text=${encodeURIComponent(waText(x, bulan, tahun))}`;

export default function Monitor() {
  const now = new Date();
  const [tahun, setTahun] = React.useState(now.getFullYear());
  const [bulan, setBulan] = React.useState(now.getMonth() + 1);
  const [d, setD] = React.useState<any>(null);
  const [unit, setUnit] = React.useState("");
  const [cari, setCari] = React.useState("");
  const [only, setOnly] = React.useState(false);
  React.useEffect(() => { setD(null); rpc("getMonitoringPekan", tahun, bulan).then(setD).catch((e) => toast.error(e.message)); }, [tahun, bulan]);
  const units = Array.from(new Set((d?.halaqah || []).map((h: any) => h.unit))) as string[];
  const list = (d?.halaqah || []).filter((x: any) => (!only || !["lengkap", "akan_datang"].includes(x.status)) && (!unit || x.unit === unit) && (!cari || `${x.musyrif} ${x.halaqah} ${x.unit}`.toLowerCase().includes(cari.toLowerCase())));
  const R = d?.ringkasan;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Tahun"><Select value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>{[now.getFullYear(), now.getFullYear() - 1].map((y) => <option key={y}>{y}</option>)}</Select></Field>
          <Field label="Bulan"><Select value={bulan} onChange={(e) => setBulan(Number(e.target.value))}>{F.BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}</Select></Field>
          <Field label="Unit"><Select value={unit} onChange={(e) => setUnit(e.target.value)}><option value="">Semua unit</option>{units.map((u) => <option key={u}>{u}</option>)}</Select></Field>
          <Field label="Cari musyrif / halaqah"><Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Ketik nama" /></Field>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} className="size-4 accent-[#17873F]" />Hanya yang belum lengkap</label>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Total halaqah", R?.total_halaqah, "text-ink"], ["Lengkap", R?.lengkap, "text-leaf"], ["Sebagian", R?.sebagian, "text-amber"], ["Belum isi", R?.kosong, "text-rose"]].map(([l, v, c]: any) => (
          <Card key={l} className="p-4"><p className={cn("text-3xl font-extrabold", c)}>{v == null ? "–" : <CountUp value={v} />}</p><p className="text-[13px] text-muted">{l}</p></Card>
        ))}
      </div>
      {!d ? <Skeleton className="h-96" /> : d.periode_masa_depan ? <Card className="text-muted">Periode ini belum berjalan.</Card> : (
        <Card className="p-0">
          <p className="px-4 pt-4 text-[13px] text-muted sm:px-5">{F.BULAN[d.bulan - 1]} {d.tahun} · pekan yang sudah berakhir: {d.pekan_selesai} dari 4{d.pekan_berjalan ? ` · pekan berjalan: P${d.pekan_berjalan}` : ""}. Angka = santri terisi / anggota halaqah.</p>
          <div className="scroll-thin mt-3 overflow-x-auto border-t border-line">
            <table className="w-full min-w-[620px] text-[13px]">
              <thead className="bg-[#F6F9F7] text-xs text-muted"><tr><th className="px-4 py-2.5 text-left font-semibold">Musyrif / halaqah</th>{[1, 2, 3, 4].map((p) => <th key={p} className="w-20 px-2 py-2.5 text-center font-semibold">P{p}</th>)}<th className="px-4 py-2.5 text-left font-semibold">Keterangan</th></tr></thead>
              <tbody>
                {list.map((x: any) => (
                  <tr key={x.key} className="border-t border-line">
                    <td className="px-4 py-2.5"><div className="flex items-center gap-2"><span className={cn("h-8 w-1 rounded-full", x.status === "lengkap" ? "bg-leaf" : x.status === "kosong" ? "bg-rose" : x.status === "sebagian" ? "bg-saffron" : "bg-line")} />
                      <div className="min-w-0 flex-1"><p className="font-semibold">{x.musyrif}</p><p className="text-xs text-muted">{x.unit} {x.tingkat} · {x.halaqah} · {x.jumlah} santri</p></div>
                      {x.wa ? (
                        <a href={waLink(x, d.bulan, d.tahun)} target="_blank" rel="noopener noreferrer" title={x.status === "lengkap" ? "Kirim apresiasi via WhatsApp" : "Kirim pengingat via WhatsApp"}
                          className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0",
                            x.status === "lengkap" || x.status === "berjalan" ? "bg-[#E7F7EE] text-[#128C4A]" : "bg-[#25D366] text-white shadow-sm")}>
                          <MessageCircle className="size-3.5" /><span className="hidden sm:inline">{x.status === "lengkap" ? "WA" : "Ingatkan"}</span>
                        </a>
                      ) : <span className="shrink-0 text-[11px] text-muted" title="Nomor WA belum terdaftar">—</span>}
                    </div></td>
                    {[1, 2, 3, 4].map((i) => {
                      const p = x.pekan[i];
                      let cls = "text-[#c3cdc7]", txt = "·";
                      if (p.wajib) { txt = `${p.terisi}/${x.jumlah}`; cls = p.terisi >= x.jumlah && x.jumlah ? "bg-leaf-soft text-leaf-deep" : p.terisi ? "bg-amber-soft text-amber" : "bg-rose-soft text-rose"; }
                      else if (p.berjalan) { txt = `${p.terisi}/${x.jumlah}`; cls = "bg-sky-soft text-sky"; }
                      return <td key={i} className="px-1.5 py-1.5"><div title={p.terakhir ? "Terakhir: " + p.terakhir : ""} className={cn("rounded-lg py-2 text-center text-xs font-bold tabular", cls)}>{txt}</div></td>;
                    })}
                    <td className="px-4 py-2.5 text-xs">{x.status === "berjalan" ? <span className="text-muted">Pekan pertama belum berakhir</span> : x.belum.length ? <span className="font-semibold text-rose">Kurang: {x.belum.map((i: number) => "P" + i).join(", ")}</span> : <span className="font-semibold text-leaf">Lengkap</span>}</td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Tidak ada halaqah yang cocok dengan filter.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-4 px-4 py-3 text-xs text-muted sm:px-5">
            <span className="inline-flex items-center gap-1"><i className="size-2.5 rounded bg-leaf-soft" />lengkap</span><span className="inline-flex items-center gap-1"><i className="size-2.5 rounded bg-amber-soft" />sebagian</span>
            <span className="inline-flex items-center gap-1"><i className="size-2.5 rounded bg-rose-soft" />kosong</span><span className="inline-flex items-center gap-1"><i className="size-2.5 rounded bg-sky-soft" />pekan berjalan</span>
          </div>
        </Card>
      )}
    </div>
  );
}
