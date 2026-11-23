// Mutabaah Yaumiyyah (aplikasi gabungan): menu Yaumiyyah + Ujian Praktik Ibadah dalam satu sub-aplikasi.
import { I, NavItem } from '../../shared/ui';
export const APP = 'Mutabaah Yaumiyyah';
export const bersama = { admin: false };
const G1 = 'Mutabaah Yaumiyyah', G2 = 'Ujian Praktik Ibadah';
export function navGabungan(): NavItem[] {
  const n: NavItem[] = [
    { id: 'isian', label: 'Isian bulanan', icon: I.edit, group: G1 }, { id: 'rekap', label: 'Rekap', icon: I.chart, group: G1 },
    { id: 'peserta', label: 'Peserta', icon: I.users, group: G2 }, { id: 'ujian-rekap', label: 'Rekap', icon: I.chart, group: G2 }, { id: 'rubrik', label: 'Rubrik', icon: I.book, group: G2 },
  ];
  if (bersama.admin) n.push({ id: 'materi', label: 'Periode & materi', icon: I.gear, group: G2 });
  return n;
}
// Menu bawah (HP): item kelompok yang sedang dibuka (+ tombol Menu dari kerangka bersama).
export const bottomOf = (active: string) => { const n = navGabungan(); const g = n.find((x) => x.id === active)?.group; return n.filter((x) => x.group === g).map((x) => (x.id === 'materi' ? { ...x, label: 'Periode' } : x)); };
