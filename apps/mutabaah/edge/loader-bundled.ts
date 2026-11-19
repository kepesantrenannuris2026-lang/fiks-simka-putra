// Supabase Edge Function "api" — pemuat Mutabaah. Kode aplikasi DIBUNDEL saat deploy (impor modul di bawah),
// sehingga tidak ada lagi pengambilan kode saat runtime (dulu: aset Cloudflare /_k/*.txt atau tabel `kode`).
// Modul: apps/mutabaah/edge/dist/api-<versi>.enc.js di GitHub (terenkripsi; kunci hanya di fungsi Supabase, tidak di-commit).
// Memperbarui kode: bangun & enkripsi dengan edge/build-remote.mjs, commit modulnya, lalu deploy ulang dengan URL commit baru.
import pg from "npm:pg@8.13.1";
import KODE_TERENKRIPSI from "__KODE_URL__";
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };
(globalThis as any).__pgPool = pg.Pool;
const DIRECT = Deno.env.get("SUPABASE_DB_URL") || "";
const base = { ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const sibuk = (e: any) => /EMAXCONN|remaining connection slots|too many (clients|connections)|max client connections/i.test(String(e?.message || e));
function parts() {
  const u = new URL(DIRECT);
  return { ref: u.hostname.replace(/^db\./, "").split(".")[0], pw: decodeURIComponent(u.password) };
}
const poolerHosts = ["aws-1-ap-southeast-1.pooler.supabase.com", "aws-0-ap-southeast-1.pooler.supabase.com"];
let poolerHost = "";

/** Koneksi admin (postgres) sementara: hanya saat worker baru bangun; ditutup otomatis setelah 1 detik tidak dipakai. */
let adminP: Promise<any> | null = null;
function admin() { return (adminP ??= connectAdmin().catch((e) => { adminP = null; throw e; })); }
async function connectAdmin() {
  const { ref, pw } = parts();
  let busy = false;
  for (const h of poolerHosts) {
    for (let t = 0; t < 5; t++) {
      const p = new pg.Pool({ ...base, max: 1, idleTimeoutMillis: 1000, connectionString: `postgres://postgres.${ref}:${encodeURIComponent(pw)}@${h}:6543/postgres` });
      p.on("error", () => {});
      try { await p.query("SELECT 1"); poolerHost = h; return p; }
      catch (e) { await p.end().catch(() => {}); if (!sibuk(e)) break; busy = true; await sleep(150 + Math.random() * 350 * (t + 1)); }
    }
  }
  if (busy) throw new Error("Server sedang padat, coba lagi sebentar.");
  const p = new pg.Pool({ ...base, max: 1, idleTimeoutMillis: 1000, connectionString: DIRECT }); p.on("error", () => {});
  await p.query("SELECT 1"); return p;
}

/** Pool aplikasi: 1 koneksi per worker (akun database khusus aplikasi, lewat pooler). Dipakai bersama oleh loader dan kode aplikasi. */
let appP: Promise<any> | null = null;
function app() { return (appP ??= connectApp().catch((e) => { appP = null; throw e; })); }
async function connectApp() {
  const a = await admin();
  const { ref, pw } = parts();
  const appPw = (await a.query("SELECT value->>'DB_APP_PASSWORD' AS k FROM meta WHERE key='config'")).rows[0]?.k || "";
  const mk = (url: string) => { const p = new pg.Pool({ ...base, max: 1, idleTimeoutMillis: 4000, connectionString: url }); p.on("error", () => {}); return p; };
  if (appPw && poolerHost) {
    const p = mk(`postgres://mutabaah_app.${ref}:${encodeURIComponent(appPw)}@${poolerHost}:6543/postgres`);
    try { await p.query("SELECT 1 FROM akun LIMIT 1"); return p; } catch (e) { await p.end().catch(() => {}); if (sibuk(e)) throw e; }
  }
  return mk(poolerHost ? `postgres://postgres.${ref}:${encodeURIComponent(pw)}@${poolerHost}:6543/postgres` : DIRECT);
}

/** Respons JSON; dikompres gzip bila browser mendukung (hemat egress ±80% untuk data besar). */
function jsonOut(obj: unknown, h: Record<string, string>, req: Request) {
  const body = JSON.stringify(obj);
  const headers: Record<string, string> = { ...h, "Content-Type": "application/json", Vary: "Origin, Accept-Encoding" };
  if (body.length > 2048 && /\bgzip\b/.test(req.headers.get("accept-encoding") || "")) {
    const stream = new Blob([body]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Response(stream, { headers: { ...headers, "Content-Encoding": "gzip" } });
  }
  return new Response(body, { headers });
}

const ORIGINS = ["https://mutabaahtahfidznurista.netlify.app", "http://localhost:3400"];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && (ORIGINS.includes(o) || /--mutabaahtahfidznurista\.netlify\.app$/.test(o)) ? o : ORIGINS[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey, x-sync-key, x-deploy-key, x-region",
  "Access-Control-Max-Age": "86400", Vary: "Origin",
});

const KODE_VERSI = "202611080009";
const KODE_KUNCI = "__KUNCI__";
/** Dekripsi lokal (AES-256-GCM + gzip) dari modul yang sudah dibundel — tanpa akses jaringan. */
async function bukaKode(teks: string) {
  const b = Uint8Array.from(atob(teks.trim()), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey("raw", Uint8Array.from(atob(KODE_KUNCI), (c) => c.charCodeAt(0)), "AES-GCM", false, ["decrypt"]);
  const gz = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(0, 12) }, k, b.slice(12));
  return await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}
let modP: Promise<any> | null = null;
function getMod() {
  return (modP ??= (async () => {
    const isi = await bukaKode(KODE_TERENKRIPSI);
    (globalThis as any).__POOL = await app(); // kode aplikasi memakai pool ini
    const m = new Function(isi + "\nreturn __mut;")();
    await m.loadConfig();
    return m;
  })().catch((e) => { modP = null; throw e; }));
}

Deno.serve(async (req: Request) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  const url = new URL(req.url);
  try {
    const m = await getMod();
    const runner = (job: string) => EdgeRuntime.waitUntil(m.runJob(job));
    if (url.pathname.endsWith("/cron")) {
      const sk = m.envOf("SYNC_KEY");
      if (!sk || req.headers.get("x-sync-key") !== sk) return new Response("forbidden", { status: 403 });
      const job = url.searchParams.get("job") === "import" ? "import" : "drain";
      if (url.searchParams.get("wait") === "1") {
        const t0 = Date.now();
        await m.runJob(job);
        return Response.json({ ok: true, ms: Date.now() - t0 }, { headers: h });
      }
      runner(job);
      return new Response("ok", { headers: h });
    }
    if (req.method !== "POST") return new Response("Mutabaah API v" + KODE_VERSI + " (terbundel)" + (poolerHost ? " (pooler)" : " (langsung)"), { headers: h });
    let body: any;
    try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Permintaan tidak valid." }, { status: 400, headers: h }); }
    return jsonOut(await m.handleRpc(body, req.headers.get("authorization") || "", runner), h, req);
  } catch (e) {
    console.error("loader", e);
    return Response.json({ ok: false, error: "Server sedang bermasalah: " + String((e as any)?.message || e) }, { status: 200, headers: h });
  }
});
