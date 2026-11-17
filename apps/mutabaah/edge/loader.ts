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
    try { await p.query("SELECT count(*) FROM kode"); return p; } catch (e) { await p.end().catch(() => {}); if (sibuk(e)) throw e; }
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

let mod: Promise<any> | null = null, modVer = "", checkedAt = 0;
async function getMod() {
  const now = Date.now();
  if (mod && now - checkedAt < 60000) return mod;
  checkedAt = now;
  const v = (await (await app()).query("SELECT versi FROM kode WHERE nama='rpc'")).rows[0]?.versi || "";
  if (!mod || v !== modVer) {
    modVer = v;
    mod = (async () => {
      const ap = await app();
      const isi = (await ap.query("SELECT isi FROM kode WHERE nama='rpc'")).rows[0]?.isi;
      if (!isi) throw new Error("Kode aplikasi belum diunggah.");
      (globalThis as any).__POOL = ap; // kode aplikasi memakai pool ini (Supabase Edge melarang mengubah variabel lingkungan)
      const m = new Function(isi + "\nreturn __mut;")();
      await m.loadConfig();
      return m;
    })();
    mod.catch(() => { mod = null; });
  }
  return mod;
}
async function deployKey() {
  return (await (await app()).query("SELECT value->>'DEPLOY_KEY' AS k FROM meta WHERE key='config'")).rows[0]?.k || "";
}

Deno.serve(async (req: Request) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  const url = new URL(req.url);
  try {
    if (url.pathname.endsWith("/__upload")) {
      const k = await deployKey();
      if (!k || req.headers.get("x-deploy-key") !== k) return new Response("forbidden", { status: 403 });
      let isi = await req.text();
      const versi = url.searchParams.get("versi") || String(Date.now());
      // Kode dikirim terkompres & tersandi agar tidak ditolak firewall (kueri SQL di dalam kode mirip pola serangan).
      if (req.headers.get("x-encoding") === "gzip-base64") {
        const bytes = Uint8Array.from(atob(isi.trim()), (c) => c.charCodeAt(0));
        isi = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
      }
      await (await admin()).query("INSERT INTO kode (nama, isi, versi, diperbarui) VALUES ('rpc', $1, $2, now()) ON CONFLICT (nama) DO UPDATE SET isi=EXCLUDED.isi, versi=EXCLUDED.versi, diperbarui=now()", [isi, versi]);
      mod = null;
      return Response.json({ ok: true, versi, bytes: isi.length, koneksi: poolerHost ? "pooler" : "langsung" });
    }
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
    if (req.method !== "POST") return new Response("Mutabaah API v" + modVer + (poolerHost ? " (pooler)" : " (langsung)"), { headers: h });
    let body: any;
    try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Permintaan tidak valid." }, { status: 400, headers: h }); }
    return jsonOut(await m.handleRpc(body, req.headers.get("authorization") || "", runner), h, req);
  } catch (e) {
    console.error("loader", e);
    return Response.json({ ok: false, error: "Server sedang bermasalah: " + String((e as any)?.message || e) }, { status: 200, headers: h });
  }
});
