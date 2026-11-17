// Supabase Edge Function "rpc" — pemuat kecil. Kode aplikasi disimpan di tabel `kode` dan dimuat sekali per worker.
import pg from "npm:pg@8.13.1";
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

/** Koneksi admin (postgres) sementara: hanya saat worker baru bangun & saat unggah kode; ditutup otomatis setelah 1 detik tidak dipakai. */
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

/** Kode aplikasi terenkripsi (AES-256-GCM, gzip) diambil dari aset statis Cloudflare saat worker menyala —
 *  tidak memakai egress Supabase. Cadangan: tabel `kode` (hanya dipakai bila Cloudflare tidak terjangkau). */
const KODE_VERSI = "__VERSI__";
const KODE_URL = "__URL__";
const KODE_KUNCI = "__KUNCI__";
async function bukaKode(teks: string) {
  const b = Uint8Array.from(atob(teks.trim()), (c) => c.charCodeAt(0));
  const k = await crypto.subtle.importKey("raw", Uint8Array.from(atob(KODE_KUNCI), (c) => c.charCodeAt(0)), "AES-GCM", false, ["decrypt"]);
  const gz = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(0, 12) }, k, b.slice(12));
  return await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}
async function ambilKode() {
  try {
    const r = await fetch(KODE_URL, { signal: AbortSignal.timeout(6000) });
    if (r.ok) return await bukaKode(await r.text());
  } catch (e) { console.error("kode cf", String((e as any)?.message || e)); }
  const a = await admin();
  const row = (await a.query("SELECT isi FROM kode WHERE nama = $1", ["api-" + KODE_VERSI])).rows[0];
  if (!row) throw new Error("Kode aplikasi tidak dapat dimuat.");
  return await bukaKode(row.isi);
}
let modP: Promise<any> | null = null;
function getMod() {
  return (modP ??= (async () => {
    const isi = await ambilKode();
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
        // Dijalankan di proses utama (ditunggu): lebih andal daripada tugas latar.
        const t0 = Date.now();
        await m.runJob(job);
        return Response.json({ ok: true, ms: Date.now() - t0 }, { headers: h });
      }
      runner(job);
      return new Response("ok", { headers: h });
    }
    if (req.method !== "POST") return new Response("Mutabaah API v" + KODE_VERSI + (poolerHost ? " (pooler)" : " (langsung)"), { headers: h });
    let body: any;
    try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Permintaan tidak valid." }, { status: 400, headers: h }); }
    return jsonOut(await m.handleRpc(body, req.headers.get("authorization") || "", runner), h, req);
  } catch (e) {
    console.error("loader", e);
    return Response.json({ ok: false, error: "Server sedang bermasalah: " + String((e as any)?.message || e) }, { status: 200, headers: h });
  }
});
