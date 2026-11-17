/** Jalur dasar aplikasi: "" di Netlify, "/mutabaah" di portal Cloudflare. */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const asset = (p: string) => BASE + p;
/** true bila dibangun untuk portal Kepesantrenan (Cloudflare). */
export const PORTAL = process.env.NEXT_PUBLIC_PORTAL === "1";
/** Berjalan di dalam iframe portal (satu origin). */
export function diPortal() {
  try { return PORTAL && typeof window !== "undefined" && window.parent !== window && window.parent.location.origin === location.origin; } catch { return false; }
}
/** Kembali ke portal: lewat pesan bila di dalam iframe, atau pindah halaman. */
export function kePortal(app = "beranda") {
  if (diPortal()) window.parent.postMessage({ type: "nuris:navigate", app }, location.origin);
  else location.assign("/" + (app === "beranda" ? "" : "#" + app));
}
export function kabariPortal(type: string) {
  if (diPortal()) window.parent.postMessage({ type }, location.origin);
}
