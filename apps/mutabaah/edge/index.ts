// Supabase Edge Function "rpc": seluruh API aplikasi Mutabaah (menggantikan Netlify Functions).
import { handleRpc, runJob, type Job } from "../lib/rpc";
import { q } from "../lib/db";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void };
const ALLOWED = ["https://mutabaahtahfidznurista.netlify.app", "http://localhost:3200", "http://localhost:3400"];
const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && (ALLOWED.includes(origin) || /--mutabaahtahfidznurista\.netlify\.app$/.test(origin)) ? origin : ALLOWED[0],
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey, x-sync-key",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

let cfg: Promise<void> | null = null;
function loadConfig() {
  // GAS_URL & SYNC_KEY disimpan di tabel meta (key 'config'), hanya terbaca oleh peran database.
  return (cfg ??= (async () => {
    try {
      const r = await q("SELECT value FROM meta WHERE key='config'");
      const v = r[0]?.value || {};
      for (const k of ["GAS_URL", "SYNC_KEY"]) if (v[k] && !process.env[k]) process.env[k] = String(v[k]);
    } catch (e) { cfg = null; console.error("config", e); }
  })());
}
const runner = (job: Job) => EdgeRuntime.waitUntil(runJob(job));

Deno.serve(async (req: Request) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  await loadConfig();
  const url = new URL(req.url);
  if (url.pathname.endsWith("/cron")) {
    if (!process.env.SYNC_KEY || req.headers.get("x-sync-key") !== process.env.SYNC_KEY) return new Response("forbidden", { status: 403 });
    runner(url.searchParams.get("job") === "import" ? "import" : "drain");
    return new Response("ok", { headers: h });
  }
  if (req.method !== "POST") return new Response("Mutabaah API", { headers: h });
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Permintaan tidak valid." }, { status: 400, headers: h }); }
  const res = await handleRpc(body, req.headers.get("authorization") || "", runner);
  return Response.json(res, { headers: h });
});
