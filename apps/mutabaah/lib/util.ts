export const BARIS_PER_HAL = 15;
export const HAL_PER_JUZ = 20;
export const JUMLAH_PEKAN = 4;
export const MAKS_KEHADIRAN = 20;
export const TARGET_ZIYADAH_BARIS = BARIS_PER_HAL;
export const TARGET_MURAJAAH_BARIS = 5 * BARIS_PER_HAL;
export const MAKS_RENTANG_PEKAN_BULAN = 3;
export const MAKS_RENTANG_BULAN = 12;
export const MAKS_RENTANG_REKAP_BULAN = 24;
export const MAX_HAFALAN_BARIS = 30 * HAL_PER_JUZ * BARIS_PER_HAL;
export const DEFAULT_PASSWORD = "nurista123";
export const UNIT_ORDER = ["SMP Ikhwan", "SMP Akhwat", "SMA Ikhwan", "SMA Akhwat", "MA Ikhwan", "MA Akhwat"];

export const norm = (s: any) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().toLowerCase();
export const num = (v: any) => Math.max(0, parseInt(v, 10) || 0);
export const ymKey = (t: number, b: number) => String(t) + "-" + String(b).padStart(2, "0");
export const halaqahKey = (u: any, t: any, h: any) => [u, t, h].map((x) => String(x == null ? "" : x).trim()).join(" | ");

export function ymIndex(ym: string) {
  const m = String(ym || "").match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!m) throw new Error("Format periode harus yyyy-MM.");
  return Number(m[1]) * 12 + Number(m[2]) - 1;
}
export const ymFromIndex = (i: number) => ymKey(Math.floor(i / 12), (i % 12) + 1);
export function ymRange(dari: string, sampai: string) {
  const a = ymIndex(dari), b = ymIndex(sampai);
  if (b < a) throw new Error("Periode akhir tidak boleh sebelum periode awal.");
  const out: string[] = [];
  for (let i = a; i <= b; i++) out.push(ymFromIndex(i));
  return out;
}
export function normalizeYm(v: any): string {
  if (v == null || v === "") return "";
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (m) return m[1] + "-" + m[2];
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const p = wibParts(d);
    return ymKey(p.tahun, p.bulan);
  }
  m = s.match(/^(\d{4})-(0[1-9]|1[0-2])-\d{1,2}/);
  if (m) return m[1] + "-" + m[2];
  return "";
}

export function wibParts(d = new Date()) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const g = (t: string) => Number(f.find((x) => x.type === t)?.value || 0);
  const tahun = g("year"), bulan = g("month"), hari = g("day");
  return { tahun, bulan, hari, jam: g("hour") % 24, menit: g("minute"), ym: ymKey(tahun, bulan) };
}
export const nowWib = () => wibParts(new Date());
export function wibString(d: any) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return "";
  const p = wibParts(dt);
  return `${ymKey(p.tahun, p.bulan)}-${String(p.hari).padStart(2, "0")} ${String(p.jam).padStart(2, "0")}:${String(p.menit).padStart(2, "0")}`;
}
export function todayWib() {
  const n = nowWib();
  return n.ym + "-" + String(n.hari).padStart(2, "0");
}
export const daysInMonth = (t: number, b: number) => new Date(t, b, 0).getDate();
export const pekanForDay = (h: number) => (h <= 7 ? 1 : h <= 14 ? 2 : h <= 21 ? 3 : JUMLAH_PEKAN);
export function daysInWeek(t: number, b: number, p: number) {
  return p < JUMLAH_PEKAN ? 7 : daysInMonth(t, b) - 21;
}
export function completedWeeks(t: number, b: number) {
  const n = nowWib(), ym = ymKey(t, b);
  if (ym < n.ym) return JUMLAH_PEKAN;
  if (ym > n.ym) return 0;
  return Math.max(0, pekanForDay(n.hari) - 1);
}
export function isRunningWeek(ym: string, pekan: number) {
  const n = nowWib();
  return ym === n.ym && Number(pekan) === pekanForDay(n.hari);
}
export const academicYear = (t: number, b: number) => (b >= 7 ? t : t - 1);
export const academicYearLabel = (t: number, b: number) => { const y = academicYear(t, b); return y + "/" + (y + 1); };

export function requiredInt(v: any, label: string, min: number, max: number) {
  if (v === "" || v == null || !/^[-+]?\d+$/.test(String(v).trim())) throw new Error(label + " harus berupa bilangan bulat.");
  const n = Number(v);
  if (n < min || n > max) throw new Error(label + " harus antara " + min + " dan " + max + ".");
  return n;
}
export const optionalInt = (v: any, label: string, min: number, max: number) => (v === "" || v == null ? 0 : requiredInt(v, label, min, max));
export function optionalScore(v: any, label: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v);
  if (!isFinite(n) || n < 0 || n > 100) throw new Error(label + " harus antara 0 dan 100.");
  return Math.round(n * 100) / 100;
}
export function safeText(v: any, max: number) {
  const s = String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (s.length > max) throw new Error("Isian teks maksimal " + max + " karakter.");
  return s;
}
export function clip(v: any, max: number) {
  let s = String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, "");
  if (s.length > max) s = s.slice(0, max - 1) + "…";
  return s;
}
export const stripGuard = (v: any) => { const s = String(v == null ? "" : v); return /^'[=+\-@]/.test(s) ? s.slice(1) : s; };

export type Hal = { baris_total: number; hal: number; baris: number; decimal: number; teks: string };
export function barisToHal(total: any): Hal {
  total = Number(total) || 0;
  const hal = Math.floor(total / BARIS_PER_HAL), brs = total % BARIS_PER_HAL;
  return { baris_total: total, hal, baris: brs, decimal: Math.round((total / BARIS_PER_HAL) * 100) / 100, teks: brs === 0 ? hal + " hal" : hal + " hal " + brs + " brs" };
}
export const halToBaris = (h: any, b: any) => (Number(h) || 0) * BARIS_PER_HAL + (Number(b) || 0);
export const juzToBaris = (j: any, h: any, b: any) => (Number(j) || 0) * HAL_PER_JUZ * BARIS_PER_HAL + halToBaris(h, b);
export function parseJuzList(v: any): number[] {
  let raw = v;
  if (Array.isArray(raw)) raw = raw.join(",");
  const seen: Record<number, boolean> = {}, out: number[] = [];
  String(raw == null ? "" : raw).split(/[^0-9]+/).forEach((x) => {
    if (!x) return;
    const n = Number(x);
    if (n >= 1 && n <= 30 && !seen[n]) { seen[n] = true; out.push(n); }
  });
  return out.sort((a, b) => a - b);
}
export type Juz = { baris_total: number; juz: number; hal: number; baris: number; hal_total: number; juz_decimal: number; teks: string };
export function barisToJuz(total: any): Juz {
  total = Number(total) || 0;
  const per = HAL_PER_JUZ * BARIS_PER_HAL;
  const juz = Math.floor(total / per), sisa = total % per;
  const hal = Math.floor(sisa / BARIS_PER_HAL), brs = sisa % BARIS_PER_HAL;
  const parts: string[] = [];
  if (juz) parts.push(juz + " juz");
  if (hal) parts.push(hal + " hal");
  if (brs) parts.push(brs + " brs");
  return { baris_total: total, juz, hal, baris: brs, hal_total: Math.round((total / BARIS_PER_HAL) * 100) / 100, juz_decimal: Math.round((total / per) * 100) / 100, teks: parts.join(" ") || "0" };
}
export const predikat = (n: number | null) => (n == null || isNaN(n) ? "-" : n >= 90 ? "A" : n >= 80 ? "B" : n >= 70 ? "C" : n > 0 ? "D" : "-");
export function targetStatus(z: any, m: any) {
  const zz = num(z), mm = num(m);
  return {
    ziyadah: zz >= TARGET_ZIYADAH_BARIS, murajaah: mm >= TARGET_MURAJAAH_BARIS,
    tercapai: zz >= TARGET_ZIYADAH_BARIS && mm >= TARGET_MURAJAAH_BARIS,
  };
}
export function membershipSort(a: any, b: any) {
  const ta = Number(a.tingkat) || 999, tb = Number(b.tingkat) || 999;
  if (ta !== tb) return ta - tb;
  const ua = UNIT_ORDER.indexOf(a.unit), ub = UNIT_ORDER.indexOf(b.unit);
  if (ua !== ub) return (ua < 0 ? 99 : ua) - (ub < 0 ? 99 : ub);
  const o = { sensitivity: "base" as const, numeric: true };
  let c = String(a.musyrif || "").localeCompare(String(b.musyrif || ""), "id", o);
  if (c) return c;
  c = String(a.halaqah || "").localeCompare(String(b.halaqah || ""), "id", o);
  if (c) return c;
  return String(a.nama || "").localeCompare(String(b.nama || ""), "id", o);
}
export const uid = () => (globalThis.crypto as any).randomUUID();

/* ===== Cakupan filter pimpinan: halaqah_key biasa, atau "scope:<jenjang|unit>|<tingkat>" ===== */
export const jenjangOf = (unit: any) => String(unit || "").trim().split(/\s+/)[0].toUpperCase();
export function parseScope(hk?: string): { hk?: string; jenjang?: string; unit?: string; tingkat?: string; gender?: string } | null {
  if (!hk) return null;
  if (!String(hk).startsWith("scope:")) return { hk };
  const [a = "", t = ""] = String(hk).slice(6).split("|");
  const out: any = {};
  if (a.startsWith("j:")) out.jenjang = a.slice(2).toUpperCase();
  else if (a.startsWith("g:")) out.gender = a.slice(2);
  else if (a) out.unit = a;
  if (t) out.tingkat = t;
  return out;
}
/** Apakah santri/baris (punya unit, tingkat, halaqah_key) masuk cakupan hk. */
export function inScope(x: any, hk?: string) {
  const s = parseScope(hk);
  if (!s) return true;
  if (s.hk) return x.halaqah_key === s.hk;
  if (s.jenjang && jenjangOf(x.unit) !== s.jenjang) return false;
  if (s.unit && String(x.unit) !== s.unit) return false;
  if (s.gender && !String(x.unit).toLowerCase().includes(s.gender.toLowerCase())) return false;
  if (s.tingkat && String(x.tingkat) !== s.tingkat) return false;
  return true;
}
