// Kode aplikasi yang dimuat dari database oleh fungsi pemuat Supabase.
import { handleRpc, runJob } from "../lib/rpc";
import { q } from "../lib/db";
import { setConfig } from "../lib/sync";
let cfg: Promise<void> | null = null;
export function loadConfig() {
  return (cfg ??= (async () => {
    try {
      const r = await q("SELECT value FROM meta WHERE key='config'");
      const v = r[0]?.value || {};
      setConfig({ GAS_URL: v.GAS_URL, SYNC_KEY: v.SYNC_KEY });
    } catch (e) { cfg = null; console.error("config", e); }
  })());
}
export { handleRpc, runJob };
export { envOf } from "../lib/sync";
