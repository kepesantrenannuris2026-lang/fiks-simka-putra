// Sumber: Daftar Musyrif & Musyrifah 2026/2027 (dokumen WA). Hanya dipakai di server.
/** Direktori WA musyrif dimuat dari database (meta 'wa_direktori'); tidak tertanam di kode agar data pribadi tidak ikut tersebar. */
let WA_DIREKTORI: [nama: string, wa: string, bagian: string][] = [];
export function setDirektoriWa(list: any) { if (Array.isArray(list)) { WA_DIREKTORI = list; IDX = build(); cache.clear(); } }
export const direktoriWaTerisi = () => WA_DIREKTORI.length > 0;

const TITLE = /^(ustadzah|ustadz|usth|ustz|ust)\.?\s+/i;
function base(n: string) {
  return String(n || "").replace(TITLE, "").split(",")[0].toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}
const squash = (s: string) => s.replace(/(.)\1+/g, "$1");
const toks = (s: string) => squash(s).split(" ").filter((t) => t.length > 1);

const build = () => WA_DIREKTORI.map(([nama, wa]) => ({ nama, wa, b: squash(base(nama)), t: toks(base(nama)) }));
let IDX = build();
const cache = new Map<string, string>();

/** Cari nomor WA (format 62xxx) untuk nama musyrif di master. Kosong bila tidak yakin. */
export function waFor(musyrif: string): string {
  if (cache.has(musyrif)) return cache.get(musyrif)!;
  const b = squash(base(musyrif)), t = toks(base(musyrif));
  let hit = IDX.find((x) => x.b === b);
  if (!hit && t.length) {
    const scored = IDX.map((x) => {
      const common = x.t.filter((w) => t.includes(w)).length;
      return { x, s: common / Math.min(x.t.length, t.length), common };
    }).filter((r) => r.s >= 0.99 || (r.common >= 2 && r.s >= 0.66)).sort((a, b2) => b2.s - a.s || b2.common - a.common);
    if (scored.length && (scored.length === 1 || scored[0].s > scored[1].s || scored[0].common > scored[1].common)) hit = scored[0].x;
  }
  const r = hit ? hit.wa : "";
  cache.set(musyrif, r);
  return r;
}
