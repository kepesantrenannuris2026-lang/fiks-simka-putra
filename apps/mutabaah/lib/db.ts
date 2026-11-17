import { Pool } from "pg";

/**
 * Database utama: Supabase Postgres (paket gratis, tanpa biaya "compute").
 * DATABASE_URL = connection string Supavisor (transaction pooler, port 6543).
 * Untuk pengujian lokal, NETLIFY_DB_URL lama masih diterima.
 */
let _pool: Pool | null = null;
let _idx = 0;
/** DATABASE_URL boleh berisi beberapa URL dipisah "|" (mis. dua cluster pooler); dipakai berurutan bila gagal. */
const urls = () => String((globalThis as any).__DATABASE_URL || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.NETLIFY_DB_URL || "").split("|").map((s) => s.trim()).filter(Boolean);
function pool() {
  if (!_pool && (globalThis as any).__POOL) _pool = (globalThis as any).__POOL; // dibagikan oleh loader (1 koneksi per worker)
  if (!_pool) {
    const list = urls();
    if (!list.length) throw new Error("DATABASE_URL belum diatur.");
    const url = list[Math.min(_idx, list.length - 1)];
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    _pool = new Pool({
      connectionString: url,
      ssl: local ? undefined : { rejectUnauthorized: false },
      max: 2,                       // fungsi serverless: koneksi sedikit, pooler yang menampung
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
    _pool.on("error", () => {});
  }
  return _pool;
}
/** Bila cluster pooler salah ("Tenant or user not found") atau tak terjangkau, coba URL berikutnya. */
async function withFailover<T>(fn: (p: Pool) => Promise<T>): Promise<T> {
  let tries = 0;
  for (;;) {
    try { return await fn(pool()); }
    catch (e: any) {
      const msg = String(e?.message || e);
      if (/EMAXCONN|remaining connection slots|too many (clients|connections)|max client connections/i.test(msg) && tries < 5) {
        tries++; await new Promise((r) => setTimeout(r, 120 + Math.random() * 300 * tries)); continue;
      }
      const retryable = /tenant or user not found|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timeout expired|Connection terminated/i.test(msg);
      if (!retryable || _idx >= urls().length - 1) throw e;
      const old = _pool; _pool = null; _idx++;
      try { await old?.end(); } catch {}
    }
  }
}

export async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res: any = await withFailover((p) => p.query(text, params));
  const st = (globalThis as any).__QSTAT; // penghitung data terbaca (hanya untuk pengujian)
  if (st) {
    const b = JSON.stringify(res.rows).length; st.rows += res.rows.length; st.bytes += b; st.log?.push([text.replace(/\s+/g, " ").slice(0, 70), res.rows.length, b]);
    // perkiraan byte di jalur database (protokol Postgres: isi nilai + ±4 byte per kolom)
    st.wire = (st.wire || 0) + res.rows.reduce((t: number, r: any) => t + (Object.values(r) as any[]).reduce((u: number, v: any) => u + 4 + (v == null ? 0 : typeof v === "object" ? JSON.stringify(v).length : String(v).length), 0), 0);
  }
  return res.rows as T[];
}

export async function tx<T>(fn: (query: <R = any>(text: string, params?: any[]) => Promise<R[]>) => Promise<T>): Promise<T> {
  const client: any = await withFailover((p) => p.connect());
  try {
    await client.query("BEGIN");
    const out = await fn(async (text: string, params: any[] = []) => (await client.query(text, params)).rows);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

/** Bulk insert/upsert helper: builds a multi-row VALUES statement in chunks. */
export async function bulk(
  run: (text: string, params: any[]) => Promise<any>,
  table: string,
  cols: string[],
  rows: any[][],
  conflict: string,
  chunk = 300
) {
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const params: any[] = [];
    const tuples = part.map((r) => "(" + r.map((v) => { params.push(v); return "$" + params.length; }).join(",") + ")");
    await run(`INSERT INTO ${table} (${cols.join(",")}) VALUES ${tuples.join(",")} ${conflict}`, params);
  }
}
