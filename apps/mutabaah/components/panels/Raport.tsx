"use client";
import { asset } from "@/lib/base";
import * as React from "react";
import { toast } from "sonner";
import { ArrowLeft, Printer } from "lucide-react";
import { rpc } from "@/lib/api";
import * as F from "@/lib/fmt";
import { useApp } from "../App";
import { Button, Skeleton, Diamond } from "../ui";
import { PerkembanganTajwid } from "../PerkembanganTajwid";

const Th = (p: any) => <th className="border border-line bg-[#F1F6F2] px-2 py-1.5 text-left text-[11.5px] font-semibold text-muted" {...p} />;
const Td = (p: any) => <td className="border border-line px-2 py-1.5 align-top" {...p} />;
const H3 = ({ children }: any) => <h3 className="mb-2 mt-6 text-[15px] font-extrabold text-leaf-deep">{children}</h3>;

export default function Raport() {
  const { raport, go } = useApp();
  const [d, setD] = React.useState<any>(null);
  React.useEffect(() => {
    if (!raport) return;
    rpc("getRaport", raport.id, raport.ym, raport.ym).then(setD).catch((e) => toast.error(e.message));
  }, [raport]);
  if (!raport) return null;
  const R = d?.ringkasan;
  const cm: Record<string, any> = {};
  (d?.sertifikasi?.records || []).forEach((r: any) => (cm[r.juz + "-" + r.bagian] = r));
  const certJuz = Array.from({ length: 30 }, (_, i) => i + 1).filter((j) => [1, 2, 3, 4].some((b) => cm[j + "-" + b]));
  return (
    <div>
      <div className="no-print mb-4 flex items-center gap-2">
        <Button variant="outline" onClick={() => go("santri")}><ArrowLeft className="size-4" />Kembali</Button>
        <div className="flex-1" />
        <Button onClick={() => window.print()} disabled={!d}><Printer className="size-4" />Cetak / simpan PDF</Button>
      </div>
      {!d ? <Skeleton className="h-[80vh]" /> : (
        <div className="print-area mx-auto max-w-[820px] rounded-3xl border border-line bg-white p-5 text-[13px] sm:p-10">
          <div className="border-b-[3px] border-double border-leaf pb-4 text-center">
            <img src={asset("/logo-full.png")} alt="Pesantren Nurul Islam Tengaran" className="mx-auto h-14 w-auto object-contain" />
            <h2 className="mt-3 text-xl font-extrabold text-leaf-deep">Raport Mutabaah Al-Qur&apos;an</h2>
            <p className="text-muted">Periode {F.ymLabel(raport.ym)}</p>
          </div>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            {[["Nama", <b key="n">{d.santri.nama}</b>], ["Unit / tingkat", `${d.santri.unit} · ${d.santri.tingkat}`], ["Halaqah", d.santri.halaqah || "-"], ["Musyrif", d.musyrif || "-"], ["Program", (d.santri.program || "-") + (d.santri.keterangan ? " · " + d.santri.keterangan : "")]].map(([k, v]: any) => (
              <React.Fragment key={k}><dt className="text-muted">{k}</dt><dd>{v}</dd></React.Fragment>
            ))}
          </dl>

          <H3>Kehadiran</H3>
          <table className="w-full border-collapse"><thead><tr><Th>Hadir</Th><Th>Sakit</Th><Th>Izin</Th><Th>Alfa</Th><Th>Total pertemuan</Th><Th>Persentase</Th></tr></thead>
            <tbody><tr><Td>{R.hadir}</Td><Td>{R.sakit}</Td><Td>{R.izin}</Td><Td>{R.alfa}</Td><Td>{R.hari}</Td><Td>{R.persen_hadir}%</Td></tr></tbody></table>

          <H3>Capaian bulan ini</H3>
          <table className="w-full border-collapse"><thead><tr><Th>Program</Th><Th>Total halaman</Th><Th>Setara</Th><Th>Rata-rata per pekan</Th><Th>Nilai</Th></tr></thead>
            <tbody>{[["Tahsin", "tahsin"], ["Ziyadah (hafalan baru)", "ziyadah"], ["Murajaah", "murajaah"]].map(([l, k]) => (
              <tr key={k}><Td>{l}</Td><Td>{R[k].decimal}</Td><Td>{R[k].teks}</Td><Td>{R.rata_pekan[k].teks}</Td><Td><b>{F.huruf(R.nilai[k])}</b></Td></tr>
            ))}</tbody></table>

          <H3>Ketercapaian target pekanan</H3>
          <table className="w-full border-collapse"><thead><tr><Th>Pekan dinilai</Th><Th>Pekan terisi</Th><Th>Target tercapai</Th><Th>Persentase</Th><Th>Minimal per pekan</Th></tr></thead>
            <tbody><tr><Td>{R.target.dinilai}</Td><Td>{R.target.terisi}</Td><Td>{R.target.keduanya_tercapai}</Td><Td>{R.target.persen}%</Td><Td>{R.target.minimal_ziyadah.teks} ziyadah + {R.target.minimal_murajaah.teks} murajaah</Td></tr></tbody></table>

          <H3>Total hafalan yang dimiliki</H3>
          <table className="w-full border-collapse"><thead><tr><Th>Basis {d.hafalan.terverifikasi ? `(terverifikasi s.d. ${d.hafalan.terverifikasi_sampai_ym})` : "(hafalan awal)"}</Th><Th>Ziyadah tercatat</Th><Th>Total</Th><Th>Target</Th></tr></thead>
            <tbody><tr><Td>{d.hafalan.basis.teks}</Td><Td>{d.hafalan.ziyadah.teks}</Td><Td><b>{d.hafalan.total.teks}</b> (≈ {d.hafalan.total.juz_decimal} juz)</Td><Td>{d.hafalan.target_juz} juz</Td></tr></tbody></table>
          <div className="mt-3 flex flex-wrap gap-0.5">{Array.from({ length: 30 }, (_, i) => i + 1).map((j) => <Diamond key={j} on={d.hafalan.juz_selesai.includes(j)} tone={(d.hafalan.juz_diuji || []).includes(j) ? "saffron" : "leaf"} size={15} label={j} />)}</div>
          <p className="mt-1 text-xs text-muted">Belah ketupat hijau = hafalan juz selesai · oranye = juz sudah diujikan.</p>

          <H3>Perkembangan bacaan (tahsin, makhraj & tajwid)</H3>
          <PerkembanganTajwid data={d.perkembangan_tajwid || []} cetak />

          {d.ujian && (
            <>
              <H3>Penilaian rapor Al-Qur'an · {d.ujian.periode}</H3>
              <table className="w-full border-collapse text-[12.5px]">
                <thead><tr className="bg-mist text-left"><Th>Aspek</Th><Th>Predikat</Th><Th>Keterangan</Th></tr></thead>
                <tbody>{d.ujian.aspek.map((a: any) => (
                  <tr key={a.label}><Td>{a.label}{a.skor != null ? ` · nilai ujian ${String(a.skor).replace(".", ",")}` : ""}</Td><Td><b>{a.predikat || "–"}</b></Td><Td>{a.keterangan || "–"}</Td></tr>
                ))}</tbody>
              </table>
              {(d.ujian.catatan || d.ujian.penguji) && <p className="mt-1 text-xs text-muted">{d.ujian.catatan}{d.ujian.penguji ? ` · Penguji: ${d.ujian.penguji}` : ""}{d.ujian.tanggal ? `, ${d.ujian.tanggal}` : ""}</p>}
            </>
          )}

          <H3>Hafalan Hadis Arbain</H3>
          {(() => {
            const ar: any[] = d.arbain || [], hafal = ar.filter((x) => x.status === "hafal").map((x) => x.nomor), ulang = ar.filter((x) => x.status === "mengulang").map((x) => x.nomor);
            return (
              <>
                <p className="mb-2 text-muted">{hafal.length}/42 hadis hafal{ulang.length ? ` · ${ulang.length} perlu diulang` : ""}</p>
                <div className="flex flex-wrap gap-[3px]">{Array.from({ length: 42 }, (_, i) => i + 1).map((n) => (
                  <span key={n} className={"grid size-[21px] place-items-center rounded-[5px] text-[9.5px] font-bold " + (hafal.includes(n) ? "bg-leaf text-white" : ulang.includes(n) ? "bg-saffron text-pine" : "border border-line text-muted")}>{n}</span>
                ))}</div>
                <p className="mt-1 text-xs text-muted">Hijau = hafal · oranye = perlu diulang.</p>
              </>
            );
          })()}

          <H3>Hasil sertifikasi per ¼ juz</H3>
          <p className="mb-2 text-muted">{d.sertifikasi.summary.bagian_lulus}/120 bagian lulus · {d.sertifikasi.summary.jumlah_juz_lulus}/30 juz lulus lengkap</p>
          <table className="w-full border-collapse"><thead><tr><Th>Juz</Th><Th>¼-1 (hal. 1–5)</Th><Th>¼-2 (hal. 6–10)</Th><Th>¼-3 (hal. 11–15)</Th><Th>¼-4 (hal. 16–20)</Th></tr></thead>
            <tbody>{certJuz.length ? certJuz.map((j) => (
              <tr key={j}><Td>Juz {j}</Td>{[1, 2, 3, 4].map((b) => { const r = cm[j + "-" + b]; return <Td key={b}>{r ? <><b>{r.status === "lulus" ? "Lulus" : "Remedial"}{r.nilai != null ? " · " + r.nilai : ""}</b><br /><span className="text-muted">{r.tanggal_ujian}</span></> : <span className="text-muted">—</span>}</Td>; })}</tr>
            )) : <tr><Td colSpan={5}><span className="text-muted">Belum ada hasil sertifikasi.</span></Td></tr>}</tbody></table>

          <H3>Rekap pekanan</H3>
          <div className="overflow-x-auto"><table className="w-full border-collapse"><thead><tr><Th>Pekan</Th><Th>H</Th><Th>S</Th><Th>I</Th><Th>A</Th><Th>Tahsin</Th><Th>Ziyadah</Th><Th>Murajaah</Th><Th>Nilai T/Z/M</Th><Th>Target</Th></tr></thead>
            <tbody>{d.pekan.length ? d.pekan.map((p: any) => (
              <tr key={p.ym + p.pekan}><Td>Pekan {p.pekan}</Td><Td>{p.hadir}</Td><Td>{p.sakit}</Td><Td>{p.izin}</Td><Td>{p.alfa}</Td><Td>{p.tahsin}</Td>
                <Td>{p.ziyadah}{p.ziyadah_surat && <span className="block text-muted">{p.ziyadah_surat}</span>}</Td>
                <Td>{p.murajaah}{p.murajaah_juz && <span className="block text-muted">{p.murajaah_juz}</span>}</Td>
                <Td><b>{F.huruf(p.nilai_tahsin)} / {F.huruf(p.nilai_ziyadah)} / {F.huruf(p.nilai_murajaah)}</b>{p.catatan && <span className="block text-muted">{p.catatan}</span>}</Td><Td>{p.target.tercapai ? "Tercapai" : "Belum"}</Td></tr>
            )) : <tr><Td colSpan={10}><span className="text-muted">Belum ada setoran pada bulan ini.</span></Td></tr>}</tbody></table></div>

          <H3>Catatan musyrif</H3>
          <p>{R.catatan.length ? R.catatan.map((c: string, i: number) => <span key={i} className="block">{c}</span>) : <span className="text-muted">—</span>}</p>

          <div className="mt-12 grid grid-cols-2 gap-6 text-center">
            <div>Musyrif<div className="h-16" />{d.musyrif}</div>
            <div>Orang tua / wali<div className="h-16" />(………………………)</div>
          </div>
        </div>
      )}
    </div>
  );
}
