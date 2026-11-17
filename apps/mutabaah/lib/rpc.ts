/** Dispatcher RPC tanpa ketergantungan framework: dipakai Supabase Edge Function & server uji lokal. */
import * as C from "./core";
import * as HM from "./hm";
import { getMeta, gasConfigured, drainQueue, importAll } from "./sync";
import { q } from "./db";

export type Job = "drain" | "import";
const CACHE_FN = new Set(["getDashboard", "getNotifikasi", "getMonitoringPekan", "getPekanRiwayat"]);
const READ_FN = new Set(["getHM", "getHMForm", "getHMRiwayat", "hmAkun", "getKelola", "me", "getHalaqahList", "getSetoranFormData", "getRekap", "getRaport", "getSertifikasi", "getArbain", "getUjian", "getUjianDaftar", "getUjianSantri", "getRaporSemester", "getRaporHalaqah", "getPenilaianTajwid", "getAkunList", "getMusyrifNames", "getSyncStatus"]);
export type Runner = (job: Job) => void; // menjalankan pekerjaan latar (EdgeRuntime.waitUntil / promise biasa)

export function makeCtx(run: Runner): C.Ctx {
  return { kick: async (job?: string) => { if (gasConfigured()) run(job === "import" ? "import" : "drain"); } };
}
export async function runJob(job: Job) {
  try { if (job === "import") await importAll(); await drainQueue(job === "import" ? 120000 : 50000); }
  catch (e) { console.error("job", job, e); }
}

export async function handleRpc(body: any, authHeader: string, run: Runner): Promise<{ ok: boolean; data?: any; error?: string }> {
  const ctx = makeCtx(run);
  const fn = String(body?.fn || ""), a: any[] = Array.isArray(body?.args) ? body.args : [];
  try {
    if (fn === "health") {
      const [ak] = await q("SELECT count(*)::int AS n FROM akun");
      const [sa] = await q("SELECT count(*)::int AS n FROM santri WHERE aktif");
      return { ok: true, data: { gas: gasConfigured(), akun: ak.n, santri: sa.n, runtime: "supabase-edge" } };
    }
    if (fn === "login") {
      const r: any = await C.login(a[0], a[1]);
      if (r.ok && r.perlu_impor) {
        const imp = await getMeta("import");
        if (!imp || !["antre", "berjalan"].includes(imp.status)) await C.startImport({ ...r.user, role: "pimpinan" }, ctx).catch(() => {});
      }
      return { ok: true, data: r };
    }
    const token = String(authHeader || "").replace(/^Bearer\s+/i, "");
    if (fn === "logout") return { ok: true, data: await C.logout(token) };
    const u = await C.auth(token);
    const map: Record<string, () => Promise<any>> = {
      me: async () => u,
      getHalaqahList: () => C.getHalaqahList(u),
      getSetoranFormData: () => C.getSetoranFormData(u, a[0], a[1], a[2], a[3]),
      saveSetoranBatch: () => C.saveSetoranBatch(u, a[0], a[1], ctx),
      getDashboard: () => C.getDashboard(u, a[0], a[1]),
      getPekanRiwayat: () => C.getPekanRiwayat(u, a[0], a[1]),
      getRekap: () => C.getRekap(u, a[0], a[1]),
      getRaport: () => C.getRaport(u, a[0], a[1], a[2]),
      getMonitoringPekan: () => C.getMonitoringPekan(u, a[0], a[1]),
      getSertifikasi: () => C.getSertifikasi(u, a[0], a[1]),
      saveSertifikasi: () => C.saveSertifikasi(u, a[0], ctx),
      getArbain: () => C.getArbain(u, a[0]),
      getUjian: () => C.getUjian(u, a[0], a[1], a[2]),
      getNotifikasi: () => C.getNotifikasi(u, a[0]),
      dismissNotif: () => C.dismissNotif(u, a[0]),
      restoreNotif: () => C.restoreNotif(u),
      saveUjian: () => C.saveUjian(u, a[0], a[1], a[2], a[3], ctx),
      getUjianDaftar: () => C.getUjianDaftar(u, a[0], a[1]),
      getUjianSantri: () => C.getUjianSantri(u, a[0], a[1], a[2]),
      saveUjianV2: () => C.saveUjianV2(u, a[0], a[1], a[2], a[3], a[4], ctx),
      restartUjian: () => C.restartUjian(u, a[0], a[1], a[2], ctx),
      getRaporSemester: () => C.getRaporSemester(u, a[0], a[1], a[2]),
      getRaporHalaqah: () => C.getRaporHalaqah(u, a[0], a[1], a[2]),
      saveRaporSemester: () => C.saveRaporSemester(u, a[0], a[1], a[2], a[3], ctx),
      saveArbain: () => C.saveArbain(u, a[0], a[1], ctx),
      getPenilaianTajwid: () => C.getPenilaianTajwid(u, a[0]),
      savePenilaianTajwid: () => C.savePenilaianTajwid(u, a[0], a[1], ctx),
      saveHafalanAwal: () => C.saveHafalanAwal(u, a[0], a[1], a[2], a[3], a[4], a[5], ctx),
      saveHafalanTerverifikasi: () => C.saveHafalanTerverifikasi(u, a[0], a[1], a[2], a[3], a[4], a[5], ctx),
      saveJuzHafalan: () => C.saveJuzHafalan(u, a[0], a[1], a[2], ctx),
      getAkunList: () => C.getAkunList(u),
      saveAkun: () => C.saveAkun(u, a[0], ctx),
      setAkunAktif: () => C.setAkunAktif(u, a[0], a[1], ctx),
      getMusyrifNames: () => C.getMusyrifNames(u),
      generateAkunFromUI: () => C.generateAkunFromUI(u, ctx),
      refreshMaster: async () => { throw new Error("Aplikasi kini menjadi sumber utama data. Gunakan \"Kirim data master ke Spreadsheet\"."); },
      kirimMasterSpreadsheet: () => C.kirimMasterSpreadsheet(u, ctx),
      tambahSantri: () => C.tambahSantri(u, a[0], ctx),
      editNamaSantri: () => C.editNamaSantri(u, a[0], a[1], ctx),
      keluarkanSantri: () => C.keluarkanSantri(u, a[0], a[1], ctx),
      pindahkanSantri: () => C.pindahkanSantri(u, a[0], a[1], ctx),
      batalkanStatusSantri: () => C.batalkanStatusSantri(u, a[0], ctx),
      getKelola: () => C.getKelola(u),
      getHM: () => HM.getHM(u),
      getHMForm: () => HM.getHMForm(u, a[0], a[1], a[2]),
      saveHM: () => HM.saveHM(u, a[0], a[1], a[2], a[3], ctx),
      getHMRiwayat: () => HM.getHMRiwayat(u, a[0]),
      hmAnggota: () => HM.hmAnggota(u, a[0], a[1], a[2]),
      hmAturGrup: () => HM.hmAturGrup(u, a[0], a[1]),
      hmAkun: () => HM.hmAkun(u),
      hmJuz: () => HM.hmJuz(u, a[0], a[1], a[2], a[3], ctx),
      tambahMusyrif: () => C.tambahMusyrif(u, a[0], ctx),
      hapusMusyrif: () => C.hapusMusyrif(u, a[0], a[1], ctx),
      getSyncStatus: () => C.getSyncStatus(u),
      startImport: () => C.startImport(u, ctx),
      triggerSync: () => C.triggerSync(u, ctx),
    };
    if (!map[fn]) throw new Error("Fungsi tidak dikenal: " + fn);
    // Hemat egress: tampilan berat pimpinan disimpan 5 menit (dibagi semua worker); perubahan data oleh pimpinan mengosongkan cache-nya.
    if (C.isPimpinanUser(u)) {
      const prefix = u.username + "|";
      if (CACHE_FN.has(fn)) {
        const kunci = prefix + fn + "|" + JSON.stringify(a);
        const hit = (await q("SELECT data FROM cache_hasil WHERE kunci=$1 AND kadaluarsa > now()", [kunci]))[0];
        if (hit) return { ok: true, data: hit.data };
        const data = await map[fn]();
        await q("INSERT INTO cache_hasil (kunci, data, kadaluarsa) VALUES ($1, $2, now() + interval '5 minutes') ON CONFLICT (kunci) DO UPDATE SET data=EXCLUDED.data, kadaluarsa=EXCLUDED.kadaluarsa", [kunci, JSON.stringify(data)]);
        if (Math.random() < 0.05) await q("DELETE FROM cache_hasil WHERE kadaluarsa < now() - interval '1 hour'");
        return { ok: true, data };
      }
      if (!READ_FN.has(fn)) await q("DELETE FROM cache_hasil WHERE kunci LIKE $1", [prefix + "%"]);
    }
    return { ok: true, data: await map[fn]() };
  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error(fn, msg);
    return { ok: false, error: msg };
  }
}
