"use client";
import * as React from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Toaster, toast } from "sonner";
import { Home, PenLine, BarChart3, BadgeCheck, Users, LayoutGrid, UserRound, UserCog, GraduationCap, Menu, X, LogOut, CloudCheck, CloudUpload, CloudAlert, BookOpenText, ClipboardCheck, FileText } from "lucide-react";
import { asset, PORTAL, kePortal, kabariPortal } from "@/lib/base";
import { rpc, setToken, setOnExpired } from "@/lib/api";
import { cn, Select } from "./ui";
import Login from "./Login";
import Beranda from "./panels/Beranda";
import Setor from "./panels/Setor";
import Rekap from "./panels/Rekap";
import Sertifikasi from "./panels/Sertifikasi";
import Arbain from "./panels/Arbain";
import UjianSemester from "./panels/UjianSemester";
import NotifBell, { Badge } from "./NotifBell";
import AplikasiNuris from "./AplikasiNuris";
import { TombolPasang } from "./InstallApp";
import Santri from "./panels/Santri";
import RaporSemester from "./panels/RaporSemester";
import Monitor from "./panels/Monitor";
import Akun from "./panels/Akun";
import Kelola from "./panels/Kelola";
import HalaqahMusyrif from "./panels/HalaqahMusyrif";

export type User = { username: string; nama: string; role: string; musyrif_master: string };
export type HQ = { key: string; unit: string; tingkat: string; halaqah: string; musyrif: string; jumlah: number };
export type Panel = "beranda" | "setor" | "rekap" | "sertifikasi" | "arbain" | "ujian" | "santri" | "raport" | "monitor" | "kelola" | "hm" | "akun";

type Ctx = {
  user: User; admin: boolean; hq: HQ[]; curHq: string; setCurHq: (k: string) => void;
  go: (p: Panel, keepRaport?: boolean) => void; openRaport: (id: string, ym: string) => void; raport: { id: string; ym: string } | null;
  reloadHq: () => Promise<void>; dirty: React.MutableRefObject<boolean>; logout: () => void; syncTick: () => void;
  notif: any; setorTarget: { tahun: number; bulan: number; pekan: number } | null; clearSetorTarget: () => void;
  openSetor: (t: { tahun: number; bulan: number; pekan: number }) => void;
};
export const AppCtx = React.createContext<Ctx>(null as any);
export const useApp = () => React.useContext(AppCtx);

const NAV: { id: Panel; label: string; icon: any; admin?: boolean }[] = [
  { id: "beranda", label: "Beranda", icon: Home },
  { id: "setor", label: "Isi setoran", icon: PenLine },
  { id: "arbain", label: "Hadis Arbain", icon: BookOpenText },
  { id: "santri", label: "Santri", icon: Users },
  { id: "ujian", label: "Ujian Semester", icon: ClipboardCheck },
  { id: "raport", label: "Rapor semester", icon: FileText },
  { id: "sertifikasi", label: "Sertifikasi", icon: BadgeCheck },
  { id: "rekap", label: "Rekap", icon: BarChart3 },
  { id: "hm", label: "Halaqah Musyrif", icon: GraduationCap },
  { id: "monitor", label: "Monitor", icon: LayoutGrid, admin: true },
  { id: "kelola", label: "Kelola", icon: UserCog, admin: true },
  { id: "akun", label: "Akun", icon: UserRound },
];
const TITLES: Record<Panel, string> = { beranda: "Beranda", setor: "Setoran pekanan", rekap: "Rekap capaian", ujian: "Ujian semester", arbain: "Hadis Arbain", sertifikasi: "Sertifikasi hafalan", santri: "Santri binaan", raport: "Rapor semester", monitor: "Monitor pengisian", kelola: "Kelola santri & musyrif", hm: "Halaqah musyrif & musyrifah", akun: "Akun & pengaturan" };

export default function App() {
  const [ready, setReady] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  React.useEffect(() => {
    const t = localStorage.getItem("mut_token"), u = localStorage.getItem("mut_user");
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
    setReady(true);
  }, []);
  const logout = React.useCallback(() => {
    rpc("logout").catch(() => {});
    localStorage.removeItem("mut_token"); localStorage.removeItem("mut_user"); setToken(""); setUser(null);
    if (PORTAL) { kabariPortal("nuris:logout"); kePortal("beranda"); }
  }, []);
  React.useEffect(() => setOnExpired(() => { kabariPortal("nuris:session-ended"); localStorage.removeItem("mut_token"); localStorage.removeItem("mut_user"); setUser(null); toast.error("Sesi berakhir, silakan masuk kembali."); }), []);
  if (!ready) return null;
  return (
    <MotionConfig reducedMotion="user">
      <Toaster position="top-center" richColors closeButton />
      {user ? <Shell user={user} logout={logout} /> : <Login onLogin={(t, u) => { localStorage.setItem("mut_token", t); localStorage.setItem("mut_user", JSON.stringify(u)); setToken(t); setUser(u); }} />}
    </MotionConfig>
  );
}

function SyncPill({ tick }: { tick: number }) {
  const [s, setS] = React.useState<any>(null);
  React.useEffect(() => {
    let alive = true, t: any;
    // Hemat kuota: cek sering hanya saat ada antrean; berhenti saat tab tidak dilihat.
    let pending = 0;
    const load = async () => {
      clearTimeout(t);
      if (document.hidden) return;
      try { const r = await rpc("getSyncStatus"); if (alive) { setS(r); pending = Number(r?.pending) || 0; } } catch {}
      if (alive) t = setTimeout(load, pending > 0 ? 30000 : 300000);
    };
    const onVis = () => { if (!document.hidden && alive) load(); };
    document.addEventListener("visibilitychange", onVis);
    load();
    return () => { alive = false; clearTimeout(t); document.removeEventListener("visibilitychange", onVis); };
  }, [tick]);
  if (!s) return null;
  const Icon = !s.configured || s.last_error ? CloudAlert : s.pending ? CloudUpload : CloudCheck;
  const txt = !s.configured ? "Spreadsheet belum terhubung" : s.pending ? `${s.pending} perubahan menunggu dikirim ke Spreadsheet` : "Semua data sudah tercadang di Spreadsheet";
  return (
    <span title={txt + (s.last_error ? " — " + s.last_error : "")} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", !s.configured || s.last_error ? "bg-rose-soft text-rose" : s.pending ? "bg-amber-soft text-amber" : "bg-leaf-soft text-leaf-deep")}>
      <Icon className="size-3.5" /><span className="hidden sm:inline">{!s.configured ? "Belum terhubung" : s.pending ? `${s.pending} antre` : "Tercadang"}</span>
    </span>
  );
}

function Shell({ user, logout }: { user: User; logout: () => void }) {
  const admin = user.role === "pimpinan" || user.role === "admin";
  // Portal dapat membuka fitur tertentu langsung: /mutabaah/?tool=ujian
  const [panel, setPanel] = React.useState<Panel>(() => {
    const t = typeof location === "undefined" ? "" : new URLSearchParams(location.search).get("tool") || "";
    return (["ujian", "raport", "arbain", "santri", "setor", "sertifikasi", "rekap", "hm"].includes(t) ? t : "beranda") as Panel;
  });
  const [hq, setHq] = React.useState<HQ[]>([]);
  const [curHq, setCurHq] = React.useState("");
  const [raport, setRaport] = React.useState<{ id: string; ym: string } | null>(null);
  const [menu, setMenu] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const [notif, setNotif] = React.useState<any>(null);
  const [setorTarget, setSetorTarget] = React.useState<{ tahun: number; bulan: number; pekan: number } | null>(null);
  React.useEffect(() => {
    // Hemat kuota: muat saat dibuka, setelah menyimpan, dan saat aplikasi dilihat lagi (maks. tiap 10 menit)
    let alive = true, last = 0;
    const load = async (force = false) => {
      if (document.hidden || (!force && Date.now() - last < 600000)) return;
      last = Date.now();
      try { const r = await rpc("getNotifikasi"); if (alive) setNotif(r); } catch {}
    };
    const onVis = () => load();
    load(true);
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVis); };
  }, [tick]);
  const dirty = React.useRef(false);

  const pertama = React.useRef(true);
  const reloadHq = React.useCallback(async () => {
    try {
      const l = await rpc("getHalaqahList"); setHq(l);
      if (pertama.current) { pertama.current = false; if (!admin && !l.length) setPanel("hm"); }
    } catch (e: any) { toast.error(e.message); }
  }, [admin]);
  React.useEffect(() => { reloadHq(); }, [reloadHq]);
  React.useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const go = (p: Panel, keepRaport = false) => {
    if (p === "raport" && !keepRaport) setRaport(null);
    if (["setor", "hm", "ujian", "raport"].includes(panel) && p !== panel && dirty.current && !confirm("Ada isian yang belum disimpan. Tinggalkan halaman dan buang perubahan?")) return;
    if (p !== "setor") dirty.current = false;
    setPanel(p); setMenu(false); window.scrollTo({ top: 0 });
  };
  // Pesan dari portal Kepesantrenan: buka fitur tanpa memuat ulang aplikasi.
  React.useEffect(() => {
    const h = (e: MessageEvent) => { if (e.origin === location.origin && e.source === window.parent && e.data?.type === "nuris:tool" && typeof e.data.tool === "string") go(e.data.tool as Panel); };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  });
  const ctx: Ctx = { user, admin, hq, curHq, setCurHq, go, raport, openRaport: (id, ym) => { setRaport({ id, ym }); go("raport", true); }, reloadHq, dirty, logout, syncTick: () => setTick((t) => t + 1),
    notif, setorTarget, clearSetorTarget: () => setSetorTarget(null),
    openSetor: (t: { tahun: number; bulan: number; pekan: number }) => { setSetorTarget({ tahun: t.tahun, bulan: t.bulan, pekan: t.pekan }); go("setor"); } };
  const nav = NAV.filter((n) => !n.admin || admin);
  const badgeOf = (id: string): number => {
    if (!notif) return 0;
    const lewatHq = (notif.halaqah || []).filter((h: any) => h.lewat > 0).length;
    if (id === "setor") return admin ? 0 : notif.setoran?.pekan_lewat || 0;
    if (id === "monitor") return admin ? lewatHq : 0;
    if (id === "ujian") return notif.ujian?.belum || 0;
    return 0;
  };
  // Tinggi menu bawah yang sebenarnya (termasuk area garis "home" iPhone) → variabel CSS --nav-h,
  // dipakai bilah simpan agar selalu tepat di atas menu & tombol Setor yang menonjol.
  const navRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const el = navRef.current, root = document.documentElement;
    if (!el) return;
    const set = () => root.style.setProperty("--nav-h", (getComputedStyle(el).display === "none" ? 0 : el.offsetHeight) + "px");
    set();
    const ro = new ResizeObserver(set); ro.observe(el);
    window.addEventListener("resize", set); window.visualViewport?.addEventListener("resize", set);
    return () => { ro.disconnect(); window.removeEventListener("resize", set); window.visualViewport?.removeEventListener("resize", set); };
  }, []);
  const showHq = admin && !["raport", "akun", "monitor", "kelola", "hm", "ujian"].includes(panel);

  const Body = { beranda: Beranda, setor: Setor, rekap: Rekap, ujian: UjianSemester, arbain: Arbain, sertifikasi: Sertifikasi, santri: Santri, raport: RaporSemester, monitor: Monitor, kelola: Kelola, hm: HalaqahMusyrif, akun: Akun }[panel];

  return (
    <AppCtx.Provider value={ctx}>
      <div className="min-h-dvh md:pl-[84px] lg:pl-[248px]">
        {/* Sidebar tablet/laptop */}
        <aside className="kufi-pattern no-print fixed inset-y-0 left-0 z-30 hidden w-[84px] flex-col text-white md:flex lg:w-[248px]">
          <div className="flex items-center gap-3 px-4 pb-6 pt-6 lg:px-5">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white p-1.5"><img src={asset("/logo-mark.png")} alt="Logo Nurul Islam" className="size-full object-contain" /></div>
            <div className="hidden min-w-0 lg:block">
              <p className="text-[13px] leading-tight text-white/70">Nurul Islam Tengaran</p>
              <p className="font-bold leading-tight">Mutabaah Santri</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {nav.map((n) => {
              const on = panel === n.id;
              return (
                <button key={n.id} onClick={() => go(n.id)} className={cn("relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors justify-center lg:justify-start", on ? "text-pine" : "text-white/75 hover:bg-white/10 hover:text-white")} title={n.label}>
                  {on && <motion.span layoutId="side-nav" className="absolute inset-0 rounded-xl bg-white" transition={{ type: "spring", bounce: 0.18, duration: 0.45 }} />}
                  <n.icon className="relative size-5 shrink-0" />
                  <span className="relative hidden lg:inline">{n.label}</span>
                  {badgeOf(n.id) > 0 && <Badge n={badgeOf(n.id)} className="absolute right-1 top-1 lg:relative lg:right-auto lg:top-auto lg:ml-auto" />}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-white/10 p-3">
            <div className="hidden px-2 pb-2 lg:block">
              <p className="truncate text-sm font-semibold">{user.nama}</p>
              <p className="text-xs capitalize text-white/60">{user.role}</p>
            </div>
            <TombolPasang variant="side" />
            <button onClick={logout} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white lg:justify-start lg:px-2"><LogOut className="size-4" /><span className="hidden lg:inline">Keluar</span></button>
          </div>
        </aside>

        {/* Header */}
        <header className="no-print sticky top-0 z-20 border-b border-line bg-mist/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] sm:px-6">
            <img src={asset("/logo-mark.png")} alt="" className="size-9 md:hidden" />
            <h1 className="flex-1 truncate text-lg font-extrabold tracking-tight sm:text-xl">{TITLES[panel]}</h1>
            <NotifBell notif={notif} admin={admin}
              openSetor={(t, hk) => { if (dirty.current && !confirm("Ada isian setoran yang belum disimpan. Tinggalkan dan buang perubahan?")) return; dirty.current = false; if (hk) setCurHq(hk); setSetorTarget({ tahun: t.tahun, bulan: t.bulan, pekan: t.pekan }); go("setor"); }}
              openUjian={() => go("ujian")} openMonitor={() => go("monitor")}
              onDismiss={async (keys) => { try { await rpc("dismissNotif", keys); toast.success("Notifikasi dihapus"); setTick((t) => t + 1); } catch (e: any) { toast.error(e.message); } }}
              onRestore={async () => { try { const r = await rpc("restoreNotif"); toast.success(`${r.jumlah} notifikasi dimunculkan lagi`); setTick((t) => t + 1); } catch (e: any) { toast.error(e.message); } }} />
            {PORTAL ? (
              <button type="button" onClick={() => kePortal("beranda")} title="Aplikasi Kepesantrenan" aria-label="Aplikasi Kepesantrenan" className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white text-leaf-deep">
                <LayoutGrid className="size-4" />
              </button>
            ) : (
              <AplikasiNuris />
            )}
            <TombolPasang variant="pill" />
            <SyncPill tick={tick} />
          </div>
          {showHq && (
            <div className="mx-auto max-w-[1180px] px-4 pb-3 sm:px-6"><HqPicker /></div>
          )}
        </header>

        <main className="mx-auto max-w-[1180px] px-4 pb-32 pt-5 sm:px-6 md:pb-12">
          <AnimatePresence mode="wait">
            <motion.div key={panel} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
              <Body />
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom nav HP */}
        <nav ref={navRef} className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="grid grid-cols-5 items-end px-1 pt-1.5">
            {(["beranda", "ujian", "setor", "santri"] as Panel[]).map((id) => {
              const n = NAV.find((x) => x.id === id)!;
              const on = panel === id;
              if (id === "setor") return (
                <button key={id} onClick={() => go("setor")} className="-mt-5 flex flex-col items-center gap-1 pb-1.5 text-[11px] font-bold text-pine">
                  <span className={cn("relative grid size-14 place-items-center rounded-2xl shadow-lg shadow-pine/20 transition-colors", on ? "bg-pine text-white" : "bg-saffron text-pine")}><PenLine className="size-6" /><Badge n={badgeOf("setor")} className="absolute -right-1.5 -top-1.5" /></span>
                  Setor
                </button>
              );
              return (
                <button key={id} onClick={() => go(id)} className={cn("flex flex-col items-center gap-1 pb-1.5 pt-1 text-[11px] font-semibold", on ? "text-leaf-deep" : "text-muted")}>
                  <span className="relative"><n.icon className="size-[22px]" />{id === "ujian" && <Badge n={badgeOf("ujian")} className="absolute -right-2.5 -top-1.5" />}</span>{id === "ujian" ? "Ujian" : n.label}
                </button>
              );
            })}
            <button onClick={() => setMenu(true)} className="flex flex-col items-center gap-1 pb-1.5 pt-1 text-[11px] font-semibold text-muted"><span className="relative"><Menu className="size-[22px]" /><Badge n={badgeOf("monitor")} className="absolute -right-2.5 -top-1.5" /></span>Lainnya</button>
          </div>
        </nav>

        <AnimatePresence>
          {menu && (
            <motion.div className="fixed inset-0 z-40 bg-pine/50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenu(false)}>
              <motion.div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]" initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: "spring", bounce: 0.12, duration: 0.4 }} onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center">
                  <div className="flex-1"><p className="font-bold">{user.nama}</p><p className="text-xs capitalize text-muted">{user.role}</p></div>
                  <button aria-label="Tutup" onClick={() => setMenu(false)} className="grid size-9 place-items-center rounded-xl bg-mist"><X className="size-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {nav.filter((n) => ["arbain", "raport", "rekap", "sertifikasi", "hm", "monitor", "kelola", "akun"].includes(n.id)).map((n) => (
                    <button key={n.id} onClick={() => go(n.id)} className="relative flex flex-col items-center gap-2 rounded-2xl bg-mist px-2 py-4 text-[13px] font-semibold"><n.icon className="size-6 text-leaf" />{n.label}<Badge n={badgeOf(n.id)} className="absolute right-2 top-2" /></button>
                  ))}
                  {PORTAL && (
                    <button type="button" onClick={() => kePortal("beranda")} className="flex flex-col items-center gap-2 rounded-2xl bg-leaf-soft px-2 py-4 text-[13px] font-semibold text-leaf-deep"><LayoutGrid className="size-6" />Aplikasi</button>
                  )}
                  <TombolPasang variant="tile" />
                  <button onClick={logout} className="flex flex-col items-center gap-2 rounded-2xl bg-rose-soft px-2 py-4 text-[13px] font-semibold text-rose"><LogOut className="size-6" />Keluar</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppCtx.Provider>
  );
}

function HqPicker() {
  const { hq, curHq, setCurHq, dirty } = useApp();
  const [unit, setUnit] = React.useState(""); // "", "j:SMP", atau nama unit
  const [ting, setTing] = React.useState("");
  const jenjangOf = (u: string) => String(u || "").trim().split(/\s+/)[0].toUpperCase();
  const units = Array.from(new Set(hq.map((h) => h.unit)));
  const jenjangs = Array.from(new Set(units.map(jenjangOf))).filter((j) => units.filter((u) => jenjangOf(u) === j).length > 1);
  const unitOk = (h: any) => !unit || (unit.startsWith("j:") ? jenjangOf(h.unit) === unit.slice(2) : unit.startsWith("g:") ? String(h.unit).toLowerCase().includes(unit.slice(2).toLowerCase()) : h.unit === unit);
  const tings = Array.from(new Set(hq.filter(unitOk).map((h) => h.tingkat))).sort((a, b) => Number(a) - Number(b));
  const list = hq.filter((h) => unitOk(h) && (!ting || h.tingkat === ting));
  const scopeOf = (u: string, t: string) => (u || t ? `scope:${u}|${t}` : "");
  const pick = (k: string) => {
    if (dirty.current && !confirm("Ada isian setoran yang belum disimpan. Ganti halaqah dan buang perubahan?")) return false;
    dirty.current = false; setCurHq(k); return true;
  };
  const isScope = curHq.startsWith("scope:");
  const cur = hq.find((h) => h.key === curHq);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select aria-label="Unit" className="h-9 w-auto min-w-[130px] flex-1 sm:flex-none" value={unit} onChange={(e) => { const v = e.target.value; if (pick(scopeOf(v, ""))) { setUnit(v); setTing(""); } }}>
        <option value="">Semua unit</option>
        <optgroup label="Putra / putri"><option value="g:Ikhwan">Semua Putra (Ikhwan)</option><option value="g:Akhwat">Semua Putri (Akhwat)</option></optgroup>
        {jenjangs.length > 0 && <optgroup label="Per jenjang">{jenjangs.map((j) => <option key={j} value={"j:" + j}>Semua {j}</option>)}</optgroup>}
        <optgroup label="Per unit">{units.map((u) => <option key={u} value={u}>{u}</option>)}</optgroup>
      </Select>
      <Select aria-label="Tingkat" className="h-9 w-auto min-w-[120px] flex-1 sm:flex-none" value={ting} onChange={(e) => { const v = e.target.value; if (pick(scopeOf(unit, v))) setTing(v); }}>
        <option value="">Semua tingkat</option>{tings.map((t) => <option key={t} value={t}>Tingkat {t}</option>)}
      </Select>
      <Select aria-label="Halaqah" className="h-9 w-auto min-w-[200px] flex-[2]" value={isScope ? "" : curHq} onChange={(e) => pick(e.target.value || scopeOf(unit, ting))}>
        <option value="">{unit || ting ? "Semua halaqah terpilih" : "Semua halaqah"} ({list.reduce((a, h) => a + h.jumlah, 0)} santri)</option>
        {list.map((h) => <option key={h.key} value={h.key}>{h.halaqah} · {h.musyrif} ({h.jumlah})</option>)}
      </Select>
      {cur && <span className="hidden text-xs text-muted xl:inline">{cur.unit}, tingkat {cur.tingkat}</span>}
    </div>
  );
}
