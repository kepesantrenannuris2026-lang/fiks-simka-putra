// Mutabaah Yaumiyyah (aplikasi gabungan): Ibadah bulanan + Ujian Praktik Ibadah dalam satu sub-aplikasi.
import { I, NavItem, esc } from '../../shared/ui';
export const APP = 'Mutabaah Yaumiyyah';
export const bersama = { admin: false };
// Jembatan antarmodul: santri yang sama dibuka di Ibadah bulanan ⇄ Ujian praktik (id = public.santri.id di keduanya).
export const jembatan: { keUjian: { id: string; nama: string } | null; keIbadah: string | null; ringkasUjian: ((id: string) => string) | null; onUjian: (() => void) | null } = { keUjian: null, keIbadah: null, ringkasUjian: null, onUjian: null };
const G1 = 'Ibadah bulanan', G2 = 'Ujian praktik ibadah', G3 = 'Nilai rapor semester';
const UJIAN = ['peserta', 'ujian-rekap', 'rubrik', 'bank-soal', 'materi'];
export function navGabungan(): NavItem[] {
  const n: NavItem[] = [
    { id: 'isian', label: 'Isian bulanan', icon: I.edit, group: G1 }, { id: 'rekap', label: 'Rekap ibadah', icon: I.chart, group: G1 },
    { id: 'kitab', label: 'Nilai kajian kitab', icon: I.book, group: G3 }, { id: 'pidato', label: 'Nilai pidato', icon: I.mic, group: G3 },
    { id: 'peserta', label: 'Peserta ujian', icon: I.users, group: G2 }, { id: 'ujian-rekap', label: 'Rekap ujian', icon: I.list, group: G2 }, { id: 'rubrik', label: 'Rubrik', icon: I.book, group: G2 }, { id: 'bank-soal', label: 'Bank soal & panduan', icon: I.pdf, group: G2 },
  ];
  if (bersama.admin) n.push({ id: 'materi', label: 'Periode & materi', icon: I.gear, group: G2 });
  return n;
}
// Menu bawah (HP) tetap sama di semua halaman: Isian · Rekap · Nilai (kitab/pidato) · Ujian · Menu.
export const bottomOf = (_active: string): NavItem[] => [
  { id: 'isian', label: 'Isian', icon: I.edit }, { id: 'rekap', label: 'Rekap', icon: I.chart }, { id: 'kitab', label: 'Nilai', icon: I.book, also: ['pidato'] },
  { id: 'peserta', label: 'Ujian', icon: I.award, also: UJIAN },
];
// Sub-menu Ujian di atas halaman (Peserta · Rekap · Rubrik · Bank soal · Periode), hanya saat bagian Ujian dibuka.
export function segmen(active: string) {
  if (active === 'kitab' || active === 'pidato') return `<nav class="yg-seg" aria-label="Nilai rapor semester">${[['kitab', 'Kajian kitab'], ['pidato', 'Pidato']].map(([id, l]) => `<a href="#${id}" data-nav="${id}" class="yg-seg-item${id === active ? ' on' : ''}"${id === active ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
  if (!UJIAN.includes(active)) return '';
  const items = navGabungan().filter((x) => x.group === G2);
  const short: Record<string, string> = { peserta: 'Peserta', 'ujian-rekap': 'Rekap', rubrik: 'Rubrik', 'bank-soal': 'Bank soal', materi: 'Periode' };
  return `<nav class="yg-seg" aria-label="Menu ujian praktik">${items.map((x) => `<a href="#${x.id}" data-nav="${x.id}" class="yg-seg-item${x.id === active ? ' on' : ''}"${x.id === active ? ' aria-current="page"' : ''}>${esc(short[x.id] || x.label)}</a>`).join('')}</nav>`;
}
