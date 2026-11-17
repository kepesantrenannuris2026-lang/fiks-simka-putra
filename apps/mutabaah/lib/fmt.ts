export const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const BULAN_SG = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const JUMLAH_PEKAN = 4;
/** Nilai setoran tampil sebagai huruf A / B+ / B / C (angka lama dikonversi). */
export const huruf = (n: any) => { const v = Number(n); return n === "" || n == null || isNaN(v) ? "–" : v >= 90 ? "A" : v >= 80 ? "B+" : v >= 70 ? "B" : "C"; };
export const ymValue = (y: number, m: number) => y + "-" + String(m).padStart(2, "0");
export function ymNow() { const d = new Date(); return ymValue(d.getFullYear(), d.getMonth() + 1); }
export function ymIndex(ym: string) { const p = String(ym).split("-"); return Number(p[0]) * 12 + Number(p[1]) - 1; }
export const ymFromIndex = (i: number) => ymValue(Math.floor(i / 12), (i % 12) + 1);
export const ymLabel = (ym: string) => BULAN[Number(ym.slice(5, 7)) - 1] + " " + ym.slice(0, 4);
export const ymLabelShort = (ym: string) => BULAN_SG[Number(ym.slice(5, 7)) - 1] + " " + ym.slice(2, 4);
export const academicYearOf = (y: number, m: number) => (m >= 7 ? y : y - 1);
export function academicMonths(start: number) { const out: string[] = []; for (let i = 0; i < 12; i++) out.push(ymFromIndex(start * 12 + 6 + i)); return out; }
export function pekanRange(ym: string, p: number) {
  const y = Number(ym.slice(0, 4)), m = Number(ym.slice(5, 7)), last = new Date(y, m, 0).getDate();
  return p < JUMLAH_PEKAN ? (p - 1) * 7 + 1 + "–" + p * 7 : "22–" + last;
}
export const pekanNow = () => Math.min(JUMLAH_PEKAN, Math.ceil(new Date().getDate() / 7));
export function recentMonths(n = 18) { const d = new Date(), base = d.getFullYear() * 12 + d.getMonth(); return Array.from({ length: n }, (_, i) => ymFromIndex(base - i)); }
export const nv = (v: any) => (v == null || v === "" ? "–" : v);
export function todayLocal() { const d = new Date(), p = (n: number) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
export function greeting() { const h = new Date().getHours(); return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam"; }
/** "2026-09-29" -> "29 Sep 2026" */
export function dateShort(d: string) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || "")); return m ? `${Number(m[3])} ${BULAN_SG[Number(m[2]) - 1]} ${m[1]}` : String(d || ""); }
