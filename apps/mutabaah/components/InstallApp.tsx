"use client";
import * as React from "react";
import { toast } from "sonner";
import { Download, Share, PlusSquare, MoreVertical } from "lucide-react";
import { asset } from "@/lib/base";
import { Dialog, Button, cn } from "./ui";

/* Pasang web sebagai aplikasi (PWA): layar penuh dengan ikon logo Nuris di layar utama. */
let deferred: any = null;
const subs = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: any) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()); });
  window.addEventListener("appinstalled", () => { deferred = null; subs.forEach((f) => f()); toast.success("Aplikasi terpasang di layar utama"); });
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register(asset("/sw.js")).catch(() => {}));
}
const standalone = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true);
const ios = () => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) || (typeof navigator !== "undefined" && navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);

export function useInstall() {
  const [, setN] = React.useState(0);
  const [panduan, setPanduan] = React.useState(false);
  React.useEffect(() => { const f = () => setN((n) => n + 1); subs.add(f); f(); return () => { subs.delete(f); }; }, []);
  const terpasang = standalone();
  const pasang = async () => {
    if (deferred) {
      const e = deferred; deferred = null; subs.forEach((f) => f());
      e.prompt();
      try { const r = await e.userChoice; if (r?.outcome !== "accepted") toast("Pemasangan dibatalkan"); } catch { /* abaikan */ }
      return;
    }
    setPanduan(true); // iPhone/iPad atau browser yang tidak mendukung tombol langsung
  };
  return { terpasang, pasang, panduan, setPanduan, langsung: !!deferred, ios: ios() };
}

export function PanduanPasang({ open, onClose, iosDevice }: { open: boolean; onClose: () => void; iosDevice: boolean }) {
  const langkah = iosDevice
    ? [[Share, "Buka di Safari, lalu ketuk tombol Bagikan (kotak dengan panah ke atas) di bagian bawah layar."], [PlusSquare, "Gulir ke bawah, pilih “Tambahkan ke Layar Utama”."], [Download, "Ketuk “Tambah”. Ikon logo Nuris muncul di layar utama; buka dari sana agar tampil seperti aplikasi."]]
    : [[MoreVertical, "Di Chrome, ketuk menu titik tiga di pojok kanan atas."], [PlusSquare, "Pilih “Instal aplikasi” atau “Tambahkan ke layar utama”."], [Download, "Konfirmasi “Instal”. Buka aplikasi dari ikon logo Nuris di layar utama."]];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Pasang sebagai aplikasi" description="Mutabaah akan terbuka layar penuh seperti aplikasi, dengan ikon logo Nuris."
      footer={<Button onClick={onClose}>Mengerti</Button>}>
      <ol className="space-y-3">
        {langkah.map(([Icon, t]: any, i) => (
          <li key={i} className="flex items-start gap-3 text-[13.5px]">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-leaf-soft text-leaf-deep"><Icon className="size-4" /></span>
            <span className="pt-1"><b>{i + 1}.</b> {t}</span>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}

/** Tombol pasang; tersembunyi bila sudah dibuka sebagai aplikasi. */
export function TombolPasang({ variant = "pill", className }: { variant?: "pill" | "tile" | "side" | "link"; className?: string }) {
  const x = useInstall();
  if (x.terpasang) return null;
  const btn = {
    pill: <button onClick={x.pasang} aria-label="Pasang aplikasi" title="Pasang sebagai aplikasi" className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-leaf text-white shadow-sm md:hidden", className)}><Download className="size-4" /></button>,
    tile: <button onClick={x.pasang} className={cn("flex flex-col items-center gap-2 rounded-2xl bg-leaf-soft px-2 py-4 text-[13px] font-semibold text-leaf-deep", className)}><Download className="size-6" />Pasang aplikasi</button>,
    side: <button onClick={x.pasang} className={cn("flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm text-white/80 hover:bg-white/10 hover:text-white lg:justify-start lg:px-2", className)}><Download className="size-4" /><span className="hidden lg:inline">Pasang aplikasi</span></button>,
    link: <button onClick={x.pasang} className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold text-leaf-deep hover:underline", className)}><Download className="size-4" />Pasang sebagai aplikasi di HP</button>,
  }[variant];
  return <>{btn}<PanduanPasang open={x.panduan} onClose={() => x.setPanduan(false)} iosDevice={x.ios} /></>;
}
