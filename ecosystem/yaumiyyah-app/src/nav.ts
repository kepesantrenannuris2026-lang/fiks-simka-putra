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
// Menu bawah (HP): menu kelompok yang dibuka + pintasan ke kelompok lainnya (+ tombol Menu dari kerangka bersama).
export const bottomOf = (active: string) => {
  const n = navGabungan(); const g = n.find((x) => x.id === active)?.group || G1;
  return g === G1
    ? [...n.filter((x) => x.group === G1), { id: 'peserta', label: 'Ujian Praktik', icon: I.check }]
    : [...n.filter((x) => x.group === G2 && x.id !== 'materi'), { id: 'isian', label: 'Yaumiyyah', icon: I.edit }];
};
// Tab bagian di atas halaman: Mutabaah Yaumiyyah | Ujian Praktik Ibadah (selalu terlihat).
export function segmen(active: string) {
  const g = navGabungan().find((x) => x.id === active)?.group || G1;
  const b = (id: string, label: string, on: boolean) => `<a href="#${id}" data-nav="${id}" class="yg-seg-item${on ? ' on' : ''}"${on ? ' aria-current="true"' : ''}>${label}</a>`;
  return `<nav class="yg-seg" aria-label="Bagian aplikasi">${b('isian', 'Mutabaah Yaumiyyah', g === G1)}${b('peserta', 'Ujian Praktik Ibadah', g === G2)}</nav>`;
}
