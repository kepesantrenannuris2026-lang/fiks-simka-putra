import * as React from "react";
import { LayoutGrid } from "lucide-react";

const PORTAL_URL = "https://kepesantrenannuris.netlify.app/";
const HANDOFF_URL = "https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan/handoff";

const APLIKASI = [
  { id: "beranda", nama: "Kepesantrenan Nuris" },
  { id: "mutabaah", nama: "Mutabaah Tahfidz" },
  { id: "yaumiyyah", nama: "Mutabaah Yaumiyyah" },
  { id: "simka", nama: "SIMKA Putra" },
  { id: "simka-putri", nama: "SIMKA Putri" },
];

export default function AplikasiNuris() {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const root = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const menuId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  async function bukaAplikasi(app: string) {
    if (busy) return;
    if (app === "mutabaah") {
      setOpen(false);
      trigger.current?.focus();
      return;
    }

    const portal = new URL(PORTAL_URL);
    portal.hash = app;
    const token = localStorage.getItem("mut_token");
    if (!token) {
      location.assign(portal);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await fetch(HANDOFF_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: "{}",
        signal: AbortSignal.timeout(20000),
      });
      if (response.status !== 401) {
        const result = await response.json();
        if (!response.ok || typeof result.code !== "string" || !/^[a-f0-9]{64}$/.test(result.code)) {
          throw new Error("Gagal menyiapkan sesi portal");
        }
        portal.hash = new URLSearchParams({ transfer: result.code, app }).toString();
      }
      location.assign(portal);
    } catch {
      setError("Belum dapat membuka aplikasi. Silakan coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={root} className="shrink-0 sm:relative"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }}>
      <button ref={trigger} type="button" aria-label="Aplikasi Nuris" title="Aplikasi Nuris"
        aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}
        className="grid size-9 place-items-center rounded-xl text-leaf-deep hover:bg-leaf-soft aria-expanded:bg-leaf-soft">
        <LayoutGrid className="size-5" aria-hidden="true" />
      </button>
      <nav id={menuId} aria-label="Pindah aplikasi Nuris" aria-busy={busy} hidden={!open}
        className="absolute right-4 top-full mt-2 w-56 rounded-2xl border border-line bg-white p-2 shadow-lg sm:right-0">
        {APLIKASI.map(({ id, nama }) => (
          <button key={id} type="button" aria-disabled={busy} aria-current={id === "mutabaah" ? "page" : undefined}
            onClick={() => void bukaAplikasi(id)}
            className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink hover:bg-mist aria-current:bg-leaf-soft aria-current:text-leaf-deep aria-disabled:cursor-wait">
            {nama}
          </button>
        ))}
        {error && <p role="alert" className="px-3 py-2 text-xs text-rose">{error}</p>}
      </nav>
    </div>
  );
}
