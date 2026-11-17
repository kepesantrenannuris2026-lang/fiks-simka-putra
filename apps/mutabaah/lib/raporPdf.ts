/**
 * Rapor Perkembangan Al-Qur'an — PDF vektor SATU LEMBAR F5 (165 × 210 mm) per santri.
 * Sudut kotak tegas (tanpa rounded), garis tabel penuh, aman untuk printer hitam-putih.
 * Isi diambil dari getRaporSemester / getRaporHalaqah (lihat susunRapor di lib/core.ts).
 */
import type { jsPDF as JsPDF } from "jspdf";
import * as T from "./target";
import { asset } from "./base";

export const F5 = { w: 165, h: 210 };
const M = { l: 9, r: 9, t: 9, b: 9 };
const LEBAR = F5.w - M.l - M.r;
type RGB = [number, number, number];
const PINE: RGB = [8, 46, 26], LEAF: RGB = [13, 74, 40], INK: RGB = [18, 34, 25], MUTED: RGB = [94, 111, 101], GARIS: RGB = [120, 140, 128], SOFT: RGB = [236, 244, 239], ROSE: RGB = [170, 40, 40];

/** Helvetica standar hanya mendukung WinAnsi: ganti karakter di luar itu. */
const aman = (s: any) => String(s ?? "")
  .replace(/[āĀ]/g, "a").replace(/[īĪ]/g, "i").replace(/[ūŪ]/g, "u").replace(/[ḥḤ]/g, "h").replace(/[ṣṢ]/g, "s").replace(/[ṭṬ]/g, "t").replace(/[ḍḌ]/g, "d").replace(/[ẓẒ]/g, "z")
  .replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/−/g, "-").replace(/[ʼʻ`]/g, "'").replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—‘’“”•…]/g, "");
const angka = (x: any) => String(x ?? "").replace(".", ",");

let logoCache: string | null | undefined;
async function logo(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const b = await (await fetch(asset("/logo-mark.png"))).blob();
    logoCache = await new Promise<string>((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = no; r.readAsDataURL(b); });
  } catch { logoCache = null; }
  return logoCache;
}

function teks(d: JsPDF, s: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: RGB; align?: "left" | "center" | "right"; maxW?: number } = {}) {
  d.setFont("helvetica", o.bold ? "bold" : "normal"); d.setFontSize(o.size || 8); d.setTextColor(...(o.color || INK));
  d.text(o.maxW ? d.splitTextToSize(aman(s), o.maxW) : aman(s), x, y, { align: o.align || "left", baseline: "alphabetic" });
}
/** Kotak bersudut tegas. */
function kotak(d: JsPDF, x: number, y: number, w: number, h: number, isi?: RGB, garis: RGB | null = GARIS, tebal = 0.25) {
  if (isi) { d.setFillColor(...isi); }
  if (garis) { d.setDrawColor(...garis); d.setLineWidth(tebal); }
  d.rect(x, y, w, h, isi && garis ? "FD" : isi ? "F" : "S");
}
function judulBagian(d: JsPDF, y: number, s: string) {
  teks(d, s, M.l, y + 3, { size: 7.8, bold: true, color: LEAF });
  d.setDrawColor(...GARIS); d.setLineWidth(0.2); d.line(M.l, y + 4.1, F5.w - M.r, y + 4.1);
  return y + 5.5;
}

/** Satu halaman rapor. Tata letak tetap; teks panjang dibungkus dan, bila perlu, diperkecil agar tetap satu lembar. */
function halaman(d: JsPDF, r: any, lg: string | null, rapat = 0) {
  const sp = (n: number) => Math.max(n - rapat, n * 0.55); // jarak antarbagian, mengecil bila konten padat
  let y = M.t;

  // ---------- Kop ----------
  if (lg) d.addImage(lg, "PNG", M.l, y, 13.5, 13.5);
  const kx = M.l + 17;
  teks(d, "RAPOR PERKEMBANGAN AL-QUR'AN", kx, y + 4.6, { size: 11.6, bold: true, color: PINE });
  teks(d, "PESANTREN NURUL ISLAM TENGARAN", kx, y + 8.9, { size: 8.4, bold: true, color: LEAF });
  teks(d, `Semester ${r.periode.nama} · Tahun Ajaran ${r.periode.tahun_ajaran}`, kx, y + 12.6, { size: 7.4, color: MUTED });
  y += 15.6;
  d.setDrawColor(...PINE); d.setLineWidth(0.7); d.line(M.l, y, F5.w - M.r, y);
  d.setLineWidth(0.2); d.line(M.l, y + 1, F5.w - M.r, y + 1);
  y += sp(3);

  // ---------- Identitas ----------
  const cLbl = 17, cKls = 19, cVal2 = 24, cNama = LEBAR - cLbl - cKls - cVal2;
  d.setFont("helvetica", "bold"); d.setFontSize(9);
  const nama = d.splitTextToSize(aman(r.santri.nama.toUpperCase()), cNama - 4).slice(0, 2);
  const h1 = nama.length > 1 ? 9.6 : 6.6, h2 = 6.6;
  const baris = [
    { y: y, h: h1, a: "NAMA", b: nama, c: "KELAS", d: r.identitas.kelas || "-" },
    { y: y + h1, h: h2, a: "KAMAR", b: [r.identitas.kamar || "-"], c: "SEMESTER", d: r.periode.nama },
  ];
  baris.forEach((b, i) => {
    kotak(d, M.l, b.y, cLbl, b.h, SOFT); kotak(d, M.l + cLbl, b.y, cNama, b.h); kotak(d, M.l + cLbl + cNama, b.y, cKls, b.h, SOFT); kotak(d, M.l + cLbl + cNama + cKls, b.y, cVal2, b.h);
    const ty = b.y + (b.h - (b.b.length - 1) * 3.8) / 2 + 1.3;
    teks(d, b.a, M.l + 2, b.y + b.h / 2 + 1.1, { size: 6.8, bold: true, color: MUTED });
    teks(d, b.c, M.l + cLbl + cNama + 2, b.y + b.h / 2 + 1.1, { size: 6.8, bold: true, color: MUTED });
    d.setFont("helvetica", i === 0 ? "bold" : "normal"); d.setFontSize(i === 0 ? 9 : 8.4); d.setTextColor(...INK);
    d.text(b.b, M.l + cLbl + 2, ty);
    teks(d, b.d, M.l + cLbl + cNama + cKls + 2, b.y + b.h / 2 + 1.3, { size: 8.6, bold: true });
  });
  y += h1 + h2 + sp(2.8);

  // ---------- A. Ringkasan capaian ----------
  y = judulBagian(d, y, "A. RINGKASAN CAPAIAN");
  const k = r.rekap, cap = k.capaian;
  const sel = [
    { l: "Hafalan awal", v: `${angka(k.hafalan_awal)} juz` },
    { l: "Ziyadah semester", v: `${angka(k.ziyadah)} hlm` },
    { l: "Total hafalan", v: `${angka(k.total)} juz` },
    { l: "Total murajaah", v: `${angka(k.murajaah)} hlm` },
    { l: "Target semester", v: r.target.semester ? `${angka(k.target_semester)} juz` : "Sertifikasi", s: cap || "" },
  ];
  const wS = LEBAR / sel.length, hS = 11.2;
  sel.forEach((c, i) => {
    const x = M.l + i * wS;
    kotak(d, x, y, wS, hS, SOFT);
    teks(d, c.l, x + 2, y + 3.4, { size: 6.4, color: MUTED });
    teks(d, c.v, x + 2, y + (c.s ? 7.3 : 8.3), { size: 9.6, bold: true, color: PINE });
    if (c.s) teks(d, c.s, x + 2, y + 10.1, { size: 5.8, bold: true, color: c.s === "Tercapai" ? LEAF : ROSE });
  });
  y += hS + sp(2.8);

  // ---------- B. Penilaian utama (enam aspek) ----------
  y = judulBagian(d, y, "B. PENILAIAN UTAMA");
  const cA = 44, cN = 15, cK = LEBAR - cA - cN, hH = 5.8;
  kotak(d, M.l, y, LEBAR, hH, PINE, PINE);
  teks(d, "Aspek Penilaian", M.l + 2.5, y + 3.9, { size: 7.4, bold: true, color: [255, 255, 255] });
  teks(d, "Nilai", M.l + cA + cN / 2, y + 3.9, { size: 7.4, bold: true, color: [255, 255, 255], align: "center" });
  teks(d, "Catatan singkat", M.l + cA + cN + 2.5, y + 3.9, { size: 7.4, bold: true, color: [255, 255, 255] });
  y += hH;
  d.setFont("helvetica", "normal"); d.setFontSize(7.2);
  r.aspek.forEach((a: any, i: number) => {
    const ket = d.splitTextToSize(aman(a.keterangan || (a.predikat ? "" : "Belum ada predikat")), cK - 4).slice(0, 2);
    const hR = ket.length > 1 ? 7.9 : 5.4;
    const bg: RGB | undefined = i % 2 ? [248, 251, 249] : undefined;
    kotak(d, M.l, y, cA, hR, bg, GARIS); kotak(d, M.l + cA, y, cN, hR, bg, GARIS); kotak(d, M.l + cA + cN, y, cK, hR, bg, GARIS);
    teks(d, a.label, M.l + 2.5, y + hR / 2 + 1.1, { size: 7.6 });
    teks(d, a.predikat || "—", M.l + cA + cN / 2, y + hR / 2 + 1.3, { size: 8.8, bold: true, color: PINE, align: "center" });
    d.setFont("helvetica", "normal"); d.setFontSize(7.2); d.setTextColor(...(a.keterangan ? INK : MUTED));
    d.text(ket, M.l + cA + cN + 2.5, y + (hR - (ket.length - 1) * 2.9) / 2 + 1.1);
    y += hR;
  });
  y += sp(2.8);

  // ---------- C. Evaluasi & ketidakhadiran ----------
  y = judulBagian(d, y, "C. EVALUASI & KETIDAKHADIRAN");
  const u = r.ujian, th = r.tahsin, ab = r.absen;
  const ev = [
    { j: "UJIAN SEMESTER", v: u.nilai == null ? "Belum ada nilai" : `Nilai ${angka(u.nilai)}`, s: u.nilai == null ? (u.draft ? "Ujian sedang berjalan" : "Kelulusan belum ditentukan") : u.lulus ? `Lulus KKM ${u.kkm}` : `Belum mencapai KKM ${u.kkm}`, warna: u.lulus === false ? ROSE : PINE },
    { j: "TAHSIN / IQRO'", v: th.lulus === true ? "Lulus" : th.lulus === false ? "Belum lulus" : "Belum ada hasil", s: th.materi ? `Materi: ${th.materi}` : th.sumber === "ujian" ? "Dari ujian tahsin semester" : th.wajib ? "Syarat target semester ini" : "Status kelulusan tahsin", warna: th.lulus === false ? ROSE : PINE },
    { j: "KETIDAKHADIRAN", v: `S: ${ab.sakit}   I: ${ab.izin}   A: ${ab.alpa}`, s: "Sakit · Izin · Alpa", warna: PINE },
  ];
  const wE = LEBAR / 3, hE = 11.8;
  ev.forEach((e, i) => {
    const x = M.l + i * wE;
    kotak(d, x, y, wE, hE, SOFT);
    teks(d, e.j, x + 2.5, y + 3.5, { size: 6.2, bold: true, color: MUTED });
    teks(d, e.v, x + 2.5, y + 7.7, { size: 9.2, bold: true, color: e.warna });
    teks(d, e.s, x + 2.5, y + 10.4, { size: 6, color: MUTED });
  });
  y += hE + sp(2.8);

  // ---------- D. Riwayat hafalan ----------
  y = judulBagian(d, y, "D. RIWAYAT HAFALAN");
  const rw: { judul: string; isi: string }[] = (r.riwayat || []).slice(0, 4);
  d.setFont("helvetica", "normal"); d.setFontSize(7.4);
  const cJ = 24, wIsi = LEBAR - cJ - 5;
  const isiRw = rw.map((x) => d.splitTextToSize(aman(x.isi), wIsi).slice(0, 2));
  const hRw = rw.length ? isiRw.reduce((a, l) => a + 1 + l.length * 3.1, 0) + 2.2 : 7;
  kotak(d, M.l, y, LEBAR, hRw);
  if (!rw.length) teks(d, "Belum ada nilai hafalan per surat atau sertifikasi pada semester ini.", M.l + 2.5, y + 4.4, { size: 7.2, color: MUTED });
  let yy = y + 1.1;
  rw.forEach((x, i) => {
    yy += 1;
    teks(d, x.judul, M.l + 2.5, yy + 2.5, { size: 7.6, bold: true, color: PINE });
    d.setFont("helvetica", "normal"); d.setFontSize(7.4); d.setTextColor(...INK);
    d.text(isiRw[i], M.l + cJ + 2.5, yy + 2.5);
    yy += isiRw[i].length * 3.1;
  });
  y += hRw + sp(2.8);

  // ---------- E. Catatan pembinaan ----------
  y = judulBagian(d, y, "E. CATATAN PEMBINAAN");
  const kalimat = aman(r.catatan || "-").split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/).filter(Boolean);
  // Sisakan ruang tetap untuk tanda tangan (± 30 mm) agar rapor selalu satu lembar.
  const ruangTtd = 26, sisa = F5.h - M.b - ruangTtd - y - 3;
  let fs = 7.8, baris2: string[] = [];
  for (; fs >= 6; fs -= 0.2) {
    d.setFont("helvetica", "normal"); d.setFontSize(fs);
    baris2 = kalimat.flatMap((s) => d.splitTextToSize(s, LEBAR - 5));
    if (baris2.length * fs * 0.42 + 4 <= sisa) break;
  }
  const lh = fs * 0.42, hC = Math.min(sisa, Math.max(12, baris2.length * lh + 4));
  kotak(d, M.l, y, LEBAR, hC);
  d.setFont("helvetica", "normal"); d.setFontSize(fs); d.setTextColor(...INK);
  const muat = Math.floor((hC - 3) / lh), tampil = baris2.slice(0, muat);
  if (baris2.length > muat && tampil.length) tampil[tampil.length - 1] = tampil[tampil.length - 1].replace(/\s*\S*$/, " …");
  d.text(tampil, M.l + 2.5, y + 2.4 + lh * 0.75);
  y += hC + 3;

  // ---------- Tanda tangan ----------
  const yT = Math.max(y, F5.h - M.b - ruangTtd + 2);
  const kiri = M.l + LEBAR * 0.25, kanan = M.l + LEBAR * 0.75;
  teks(d, `${r.ttd.tempat}, ${T.tanggalPanjang(r.ttd.tanggal)}`, kanan, yT, { size: 7.6, align: "center" });
  teks(d, r.ttd.kepala.jabatan, kiri, yT + 4.2, { size: 7.6, align: "center" });
  teks(d, r.ttd.label_muhaffiz, kanan, yT + 4.2, { size: 7.6, align: "center" });
  const yN = yT + 19;
  const ttd = (nama: string, x: number) => {
    d.setFont("helvetica", "bold"); d.setFontSize(7.8);
    const t = aman(nama || "........................................"), w = Math.max(d.getTextWidth(t), 40);
    d.setDrawColor(...INK); d.setLineWidth(0.25); d.line(x - w / 2, yN - 3.6, x + w / 2, yN - 3.6);
    d.setTextColor(...INK); d.text(t, x, yN, { align: "center" });
  };
  ttd(r.ttd.kepala.nama, kiri);
  ttd(r.ttd.muhaffiz || "", kanan);

  // ---------- Kaki ----------
  d.setDrawColor(...PINE); d.setLineWidth(0.4); d.line(M.l, F5.h - M.b + 1.5, F5.w - M.r, F5.h - M.b + 1.5);
  teks(d, `Rapor Al-Qur'an · ${String(r.santri.nama).slice(0, 48)} · ${r.periode.label}`, M.l, F5.h - M.b + 4.6, { size: 6, color: MUTED });
  teks(d, "F5 · 1 lembar", F5.w - M.r, F5.h - M.b + 4.6, { size: 6, color: MUTED, align: "right" });
  return y;
}

/** Bangun PDF untuk satu atau banyak santri (satu lembar per santri). */
export async function buatRaporPdf(list: any[], logoData?: string | null) {
  const { jsPDF } = await import("jspdf");
  const d = new jsPDF({ unit: "mm", format: [F5.w, F5.h], orientation: "portrait", compress: true });
  d.setProperties({ title: "Rapor Al-Qur'an", subject: "Rapor Perkembangan Al-Qur'an — Pesantren Nurul Islam Tengaran", creator: "Mutabaah Tahfidz Nurista" });
  const lg = logoData !== undefined ? logoData : await logo();
  list.forEach((r, i) => {
    if (i) d.addPage([F5.w, F5.h], "portrait");
    halaman(d, r, lg);
  });
  return d;
}
const namaBerkas = (s: string) => s.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_").slice(0, 80) || "Rapor";
export async function unduhRapor(list: any[], judul: string) {
  const d = await buatRaporPdf(list);
  d.save(namaBerkas(judul) + ".pdf");
}
export async function bukaRapor(list: any[]) {
  const d = await buatRaporPdf(list);
  const url = URL.createObjectURL(d.output("blob"));
  const w = window.open(url, "_blank");
  if (!w) location.assign(url);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
