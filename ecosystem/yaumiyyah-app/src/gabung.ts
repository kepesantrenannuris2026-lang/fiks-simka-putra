// Mutabaah Yaumiyyah — aplikasi gabungan: Isian/Rekap ibadah bulanan (Yaumiyyah) + Ujian Praktik Ibadah.
// Alamat: #isian #rekap (Yaumiyyah) · #peserta #ujian-rekap #rubrik #materi (Ujian Praktik). Tautan lama
// /ujian-praktik/#x dialihkan ke sini (#rekap lama Ujian → #ujian-rekap).
import { yaum } from './main';
import { ujian } from '../../ujian-praktik/src/main';

type Mod = typeof yaum;
const ROUTE: Record<string, [Mod, string]> = {
  isian: [yaum, 'isian'], rekap: [yaum, 'rekap'], rapor: [yaum, 'rekap'],
  peserta: [ujian as Mod, 'peserta'], 'ujian-rekap': [ujian as Mod, 'rekap'], rubrik: [ujian as Mod, 'rubrik'], materi: [ujian as Mod, 'materi'],
};
let cur: Mod | null = null, curHash = '';
async function go(hash: string) {
  const key = ROUTE[hash] ? hash : 'isian';
  const [m, view] = ROUTE[key];
  if (cur && cur !== m && !cur.canLeave()) { history.replaceState(null, '', '#' + curHash); return; }
  if (cur !== m) { if (cur) cur.active = false; m.active = true; cur = m; }
  curHash = key === 'rapor' ? 'rekap' : key;
  if (location.hash.slice(1) !== curHash) history.replaceState(null, '', '#' + curHash);
  await m.show(view);
}
// Perpindahan menu (sidebar, laci, menu bawah) untuk kedua modul.
document.addEventListener('click', (e) => {
  const nv = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
  if (!nv) return;
  e.preventDefault(); e.stopImmediatePropagation(); document.documentElement.classList.remove('ns-drawer-open');
  if (nv.dataset.nav !== curHash) void go(nv.dataset.nav!);
}, true);
addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== curHash) void go(h); });
// Dari tautan lama Beranda Portal (#ujian-praktik): buka menu Ujian Praktik.
let awal = location.hash.slice(1);
try { const v = sessionStorage.getItem('nuris_yaum_awal'); if (v) { sessionStorage.removeItem('nuris_yaum_awal'); if (!awal) awal = v; } } catch {}
void go(awal);
