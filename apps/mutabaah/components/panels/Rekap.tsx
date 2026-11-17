"use client";
import * as React from "react";
import { toast } from "sonner";
import { Download, Table2 } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { useApp } from "../App";
import { Card, Select, Segmented, Button, Field, Empty, Skeleton, Badge, cn } from "../ui";

type Mode = "pekan" | "bulan" | "tahun";

export default function Rekap() {
  const { curHq } = useApp();
  const months = F.recentMonths(24);
  const [mode, setMode] = React.useState<Mode>("bulan");
  const [dari, setDari] = React.useState(F.ymNow());
  const [sampai, setSampai] = React.useState(F.ymNow());
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const changeMode = (m: Mode) => {
    setMode(m);
    if (m === "tahun") {
      const ta = F.academicYearOf(Number(sampai.slice(0, 4)), Number(sampai.slice(5, 7)));
      const am = F.academicMonths(ta);
      if (months.includes(am[0])) setDari(am[0]);
      setSampai(months.includes(am[11]) ? am[11] : F.ymNow());
    }
  };
  const load = async () => {
    if (F.ymIndex(dari) > F.ymIndex(sampai)) { toast.error("Bulan akhir tidak boleh sebelum bulan awal."); return; }
    setLoading(true);
    try { setData(await rpc("getRekap", mode, { dari, sampai, halaqah_key: curHq || undefined })); }
    catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };
  React.useEffect(() => { load(); /* eslint-disable-next-line */ }, [curHq]);

  const plabel = (p: string) => data?.mode === "pekan" ? F.BULAN_SG[Number(p.slice(5, 7)) - 1] + " P" + p.slice(-1) : data?.mode === "bulan" ? F.ymLabelShort(p) : p;

  const csv = () => {
    if (!data) return;
    const cell = (v: any) => { let s = v == null ? "" : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const P = data.periode;
    const head = ["Nama", "Unit", "Tingkat", "Halaqah", "Musyrif", "Hadir", "Sakit", "Izin", "Alfa", "%Hadir"];
    P.forEach((p: string) => head.push(p + " Tahsin", p + " Ziyadah", p + " Murajaah"));
    head.push("Total Tahsin (hal)", "Total Ziyadah (hal)", "Total Murajaah (hal)", "Nilai Tahsin", "Nilai Ziyadah", "Nilai Murajaah", "Target tercapai", "Target dinilai", "Target %", "Total Hafalan", "Juz Hafalan Selesai", "Catatan");
    const lines = [head.map(cell).join(";")];
    data.santri.forEach((s: any) => {
      const r: any[] = [s.nama, s.unit, s.tingkat, s.halaqah, s.musyrif, s.total.hadir, s.total.sakit, s.total.izin, s.total.alfa, s.total.persen_hadir];
      P.forEach((p: string) => { const a = s.per[p]; r.push(a.tahsin.decimal, a.ziyadah.decimal, a.murajaah.decimal); });
      r.push(s.total.tahsin.decimal, s.total.ziyadah.decimal, s.total.murajaah.decimal, F.huruf(s.total.nilai.tahsin), F.huruf(s.total.nilai.ziyadah), F.huruf(s.total.nilai.murajaah),
        s.total.target.keduanya_tercapai, s.total.target.dinilai, s.total.target.persen, s.hafalan?.total.teks || "", (s.hafalan?.juz_selesai || []).join(", "), s.total.catatan.join(" | "));
      lines.push(r.map(cell).join(";"));
    });
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `rekap_${data.mode}_${data.dari}_${data.sampai}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
          <Field label="Jenis rekap"><Segmented id="rk" value={mode} onChange={changeMode} className="w-full" options={[{ value: "pekan", label: "Pekanan" }, { value: "bulan", label: "Bulanan" }, { value: "tahun", label: "Tahun ajaran" }]} /></Field>
          <Field label="Dari bulan"><Select value={dari} onChange={(e) => setDari(e.target.value)}>{months.map((m) => <option key={m} value={m}>{F.ymLabel(m)}</option>)}</Select></Field>
          <Field label="Sampai bulan"><Select value={sampai} onChange={(e) => setSampai(e.target.value)}>{months.map((m) => <option key={m} value={m}>{F.ymLabel(m)}</option>)}</Select></Field>
          <div className="flex gap-2">
            <Button onClick={load} loading={loading} className="flex-1"><Table2 className="size-4" />Tampilkan</Button>
            <Button variant="outline" onClick={csv} disabled={!data}><Download className="size-4" />CSV</Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">{mode === "pekan" ? "Satu bulan dipecah menjadi 4 pekan." : mode === "bulan" ? "Rekap per bulan kalender." : "Tahun ajaran Juli–Juni."} Angka capaian dalam halaman.</p>
      </Card>

      {loading && !data ? <Skeleton className="h-80" /> : !data ? null : data.perlu_cakupan ? <Empty title="Pilih unit, jenjang, atau halaqah di bagian atas">Rekap ditampilkan per cakupan agar cepat dan hemat kuota.</Empty> : !data.santri.length ? <Empty title="Tidak ada santri pada rentang ini" /> : (
        <Card className="p-0">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-2 pt-4 text-xs text-muted sm:px-5">
            <span className="font-semibold text-ink">{data.santri.length} santri · {F.ymLabel(data.dari)} s.d. {F.ymLabel(data.sampai)}</span>
            <span className="inline-flex items-center gap-1"><i className="size-2 rounded-full bg-saffron" />tahsin</span>
            <span className="inline-flex items-center gap-1"><i className="size-2 rounded-full bg-leaf" />ziyadah</span>
            <span className="inline-flex items-center gap-1"><i className="size-2 rounded-full bg-sky" />murajaah</span>
          </div>
          <div className="scroll-thin max-h-[70dvh] overflow-auto border-t border-line">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead className="sticky top-0 z-10 bg-[#F6F9F7] text-[11.5px] text-muted">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[180px] border-b border-line bg-[#F6F9F7] px-3 py-2.5 text-left font-semibold">Santri</th>
                  <th className="border-b border-line px-3 py-2.5 text-left font-semibold">Kehadiran</th>
                  {data.periode.map((p: string) => <th key={p} className="whitespace-nowrap border-b border-line px-3 py-2.5 text-right font-semibold">{plabel(p)}</th>)}
                  <th className="border-b border-line px-3 py-2.5 text-right font-semibold">Total</th>
                  <th className="border-b border-line px-3 py-2.5 text-right font-semibold">Nilai</th>
                  <th className="border-b border-line px-3 py-2.5 text-right font-semibold">Target</th>
                  <th className="whitespace-nowrap border-b border-line px-3 py-2.5 text-right font-semibold">Hafalan</th>
                </tr>
              </thead>
              <tbody>
                {data.santri.map((s: any) => (
                  <tr key={s.id} className="group">
                    <td className="sticky left-0 border-b border-line bg-white px-3 py-2.5 group-hover:bg-mist">
                      <p className="font-semibold">{s.nama}</p><p className="text-xs text-muted">{s.unit} {s.tingkat} · {s.halaqah}</p>
                    </td>
                    <td className="border-b border-line px-3 py-2.5 group-hover:bg-mist">
                      <div className="flex gap-1 tabular">
                        <Badge tone="leaf">{s.total.hadir}</Badge><Badge tone="amber">{s.total.sakit}</Badge><Badge tone="sky">{s.total.izin}</Badge><Badge tone="rose">{s.total.alfa}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">{s.total.persen_hadir}% hadir</p>
                    </td>
                    {data.periode.map((p: string) => {
                      const a = s.per[p], kosong = a.target.dinilai && !a.pekan;
                      return (
                        <td key={p} className={cn("border-b border-line px-3 py-2.5 text-right tabular leading-tight group-hover:bg-mist", kosong && "bg-rose-soft/50")}>
                          {kosong ? <span className="text-xs font-semibold text-rose">kosong</span> : a.pekan ? (<>
                            <span className="block text-[#C26A1E]">{a.tahsin.decimal}</span><span className="block text-leaf">{a.ziyadah.decimal}</span><span className="block text-sky">{a.murajaah.decimal}</span>
                          </>) : <span className="text-[#b9c4bd]">·</span>}
                        </td>
                      );
                    })}
                    <td className="border-b border-line px-3 py-2.5 text-right font-bold tabular leading-tight group-hover:bg-mist">
                      <span className="block text-[#C26A1E]">{s.total.tahsin.teks}</span><span className="block text-leaf">{s.total.ziyadah.teks}</span><span className="block text-sky">{s.total.murajaah.teks}</span>
                    </td>
                    <td className="border-b border-line px-3 py-2.5 text-right tabular leading-tight group-hover:bg-mist">
                      <span className="block font-bold text-[#C26A1E]">{F.huruf(s.total.nilai.tahsin)}</span><span className="block font-bold text-leaf">{F.huruf(s.total.nilai.ziyadah)}</span><span className="block font-bold text-sky">{F.huruf(s.total.nilai.murajaah)}</span>
                    </td>
                    <td className="border-b border-line px-3 py-2.5 text-right tabular group-hover:bg-mist">
                      <b>{s.total.target.keduanya_tercapai}/{s.total.target.dinilai}</b><p className="text-xs text-muted">{s.total.target.persen}%</p>
                    </td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-2.5 text-right group-hover:bg-mist">
                      <Badge tone="leaf">{s.hafalan?.total.teks || "–"}</Badge>
                      <p className="mt-1 text-xs text-muted">{s.hafalan?.juz_selesai?.length ? s.hafalan.juz_selesai.length + " juz ditandai" : "belum ditandai"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
