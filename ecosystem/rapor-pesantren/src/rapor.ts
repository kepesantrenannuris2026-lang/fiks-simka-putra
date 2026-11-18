import { BAGIAN, itemsFor, predikatAngka, makna, jenjang, Santri } from './kurikulum';

export type Ctx = { ta: string; sem: number; kamar: any; settings: any; logo: string; paper: 'A4' | 'F4' };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const tanggalID = (iso: string) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return isNaN(+d) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Nilai efektif sebuah butir: isian musyrif > saran otomatis (Yaumiyyah / Ujian Praktik / Hadis).
export function nilaiButir(bagian: string, k: string, data: any, auto: any): { v: string | number | null; auto: boolean } {
  const isi = data?.[bagian]?.[k];
  if (isi !== undefined && isi !== null && isi !== '') return { v: isi, auto: false };
  if (bagian === 'ibadah' && auto?.yaumiyyah?.skor?.[k] != null) return { v: predikatAngka(auto.yaumiyyah.skor[k]), auto: true };
  if (bagian === 'praktik' && auto?.praktik && auto.praktik[k === 'praktik' ? 'practice' : 'oral'] != null) return { v: Number(auto.praktik[k === 'praktik' ? 'practice' : 'oral']), auto: true };
  if (bagian === 'hadis' && k === 'jumlah' && auto?.hadis?.hafal != null) return { v: auto.hadis.hafal, auto: true };
  return { v: null, auto: false };
}

export function keterangan(bagian: string, v: any, s: Santri, settings: any) {
  if (v == null || v === '') return '';
  const kkm = Number(settings?.umum?.kkm) || 75;
  if (bagian === 'hadis') {
    const target = Number(settings?.umum?.hadis_target?.[s.tingkat]) || 0;
    return target ? (Number(v) >= target ? `Tuntas (target ${target})` : `Belum tuntas (target ${target})`) : '';
  }
  if (typeof v === 'number') return `${predikatAngka(v)} · ${v >= kkm ? 'Tuntas' : 'Belum tuntas'}`;
  return makna[String(v)] || '';
}

export function kelengkapan(s: Santri, data: any, auto: any, kur: any) {
  let isi = 0, total = 0;
  for (const b of BAGIAN) {
    const items = b.key === 'hadis' ? [{ k: 'jumlah' }] : itemsFor(b.key, s, kur);
    for (const it of items) { total++; if (nilaiButir(b.key, it.k, data, auto).v != null) isi++; }
  }
  return { isi, total, pct: total ? Math.round((isi / total) * 100) : 0 };
}

const fmt = (v: any) => (v == null || v === '' ? '' : typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',')) : String(v));

export function raporHTML(s: Santri, data: any, auto: any, c: Ctx, editable = false) {
  const u = c.settings?.umum || {};
  const kur = c.settings?.kurikulum || {};
  const sekolah = u.sekolah?.[jenjang(s)] || '';
  const kamar = `${s.tingkat}${c.kamar?.nama ? ' / ' + c.kamar.nama : ''}`;
  const cell = (b: string, k: string) => {
    const { v, auto: a } = nilaiButir(b, k, data, auto);
    const text = b === 'hadis' ? (v == null ? '' : `${v} hadis`) : fmt(v);
    return `<td class="rp-nilai${a ? ' rp-auto' : ''}"${editable ? ` data-edit="${b}.${k}" tabindex="0" role="button" aria-label="Ubah nilai"` : ''}>${esc(text) || (editable ? '<span class="rp-kosong">isi</span>' : '')}</td><td class="rp-ket">${esc(keterangan(b, v, s, c.settings))}</td>`;
  };
  let rows = '';
  for (const b of BAGIAN) {
    if (b.key === 'hadis') {
      rows += `<tr class="rp-bag"><td class="rp-no">${b.kode}</td><td>${esc(b.judul)}</td><td class="rp-ar" dir="rtl" lang="ar">${b.ar}</td>${cell('hadis', 'jumlah')}</tr>`;
      continue;
    }
    const items = itemsFor(b.key, s, kur);
    rows += `<tr class="rp-bag"><td class="rp-no">${b.kode}</td><td>${esc(b.judul)}</td><td class="rp-ar" dir="rtl" lang="ar">${b.ar}</td><td></td><td></td></tr>`;
    items.forEach((it, i) => {
      rows += `<tr><td></td><td class="rp-item">${i + 1}. ${esc(it.id)}</td><td class="rp-ar" dir="rtl" lang="ar">${esc(it.ar)}</td>${cell(b.key, it.k)}</tr>`;
    });
    if (!items.length) rows += `<tr><td></td><td class="rp-item rp-kosong" colspan="4">Belum ada materi untuk kelas ini</td></tr>`;
  }
  const catatan = data?.catatan || '';
  const tgl = tanggalID(u.tanggal) || '…………………';
  return `<article class="rp-page rp-${c.paper}" data-santri="${esc(s.id)}">
  <header class="rp-head"><img src="${c.logo}" alt="" class="rp-logo"><div><h1>${esc(u.judul || 'RAPOR SANTRI')}</h1><h2>${esc(u.sub || '')}</h2><p class="rp-ar rp-arhead" dir="rtl" lang="ar">كشف نتائج الطالب في المعهد</p></div></header>
  <table class="rp-id"><tr><td>Nama Peserta Didik</td><td>: <b>${esc(s.nama)}</b></td><td>Tahun Pelajaran</td><td>: ${esc(c.ta)}</td></tr>
  <tr><td>Sekolah</td><td>: ${esc(sekolah)}</td><td>Semester</td><td>: ${c.sem === 1 ? 'Ganjil' : 'Genap'}</td></tr>
  <tr><td>Kamar Asrama</td><td>: ${esc(c.kamar?.nama || '-')}</td><td>Kelas</td><td>: ${esc(kamar.split(' / ')[0])}</td></tr></table>
  <table class="rp-tab"><thead><tr><th class="rp-no">No</th><th colspan="2">Kurikulum Pesantren <span class="rp-ar" lang="ar">المنهج</span></th><th>Nilai</th><th>Keterangan</th></tr></thead><tbody>${rows}</tbody></table>
  <section class="rp-catatan"${editable ? ' data-edit="catatan" tabindex="0" role="button" aria-label="Ubah catatan"' : ''}><b>Catatan Wali Kamar</b><p>${esc(catatan) || (editable ? '<span class="rp-kosong">Tulis catatan…</span>' : '&nbsp;')}</p></section>
  <footer class="rp-ttd"><div><p>&nbsp;</p><p>Orang Tua/Wali</p><p class="rp-nama">……………………………</p></div>
  <div><p>${esc(u.tempat || '')}, ${esc(tgl)}</p><p>Wali Kamar</p><p class="rp-nama">${esc(s.wali_nama || c.kamar?.wali_nama || '……………………………')}</p></div>
  <div class="rp-kabid"><p>Mengetahui,</p><p>${esc(u.kabid_jabatan || 'Kabid Kepesantrenan')}</p><p class="rp-nama">${esc(u.kabid_nama || '')}</p></div></footer>
</article>`;
}

// Satu sumber gaya untuk layar, cetak, dan PDF (dipakai juga di dalam foreignObject).
export const RAPOR_CSS = `
.rp-page{box-sizing:border-box;width:210mm;height:297mm;padding:12mm 15mm 11mm;background:#fff;color:#14231a;font-family:NurisJakarta,"Plus Jakarta Sans",system-ui,sans-serif;font-size:var(--rp-fs,10pt);line-height:1.3;display:flex;flex-direction:column;overflow:hidden}
.rp-page.rp-F4{height:330mm}
.rp-page *{box-sizing:border-box}
.rp-ar{font-family:"Amiri","Noto Naskh Arabic","Geeza Pro","Segoe UI","Arial",sans-serif;font-size:1.22em;line-height:1.2;text-align:right;direction:rtl}
.rp-head{display:flex;align-items:center;gap:12px;border-bottom:2.5px solid #0d4a28;padding-bottom:.6em;margin-bottom:.8em}
.rp-logo{width:54px;height:54px;object-fit:contain}
.rp-head h1{margin:0;font-size:1.55em;letter-spacing:.02em;color:#082e1a}
.rp-head h2{margin:2px 0 0;font-size:1.05em;font-weight:600;color:#0d4a28}
.rp-arhead{margin:1px 0 0;text-align:left;direction:rtl;font-size:1.05em;color:#0d4a28}
.rp-id{width:100%;border-collapse:collapse;margin-bottom:.8em;font-size:.95em}
.rp-id td{padding:1px 4px;vertical-align:top}.rp-id td:nth-child(1),.rp-id td:nth-child(3){white-space:nowrap;color:#3c4d43;width:1%}
.rp-tab{width:100%;border-collapse:collapse;font-size:.95em}
.rp-tab th{background:#0d4a28;color:#fff;font-weight:700;padding:.4em .55em;text-align:left;border:1px solid #0d4a28}
.rp-tab th .rp-ar{color:#fff;margin-inline-start:6px}
.rp-tab td{border:1px solid #c9d6cd;padding:.26em .55em;vertical-align:middle}
.rp-tab .rp-no{width:28px;text-align:center}
.rp-bag td{background:#e6f1e9;font-weight:700;color:#082e1a}
.rp-item{padding-left:1em!important}
.rp-tab td.rp-ar{width:33%}
.rp-nilai{width:62px;text-align:center;font-weight:700}
.rp-ket{width:118px;font-size:.88em;color:#3c4d43;font-weight:500}
.rp-catatan{margin-top:.7em;border:1px solid #c9d6cd;border-radius:6px;padding:.45em .7em;min-height:3.6em;font-size:.95em}
.rp-catatan p{margin:2px 0 0;white-space:pre-wrap}
.rp-ttd{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;grid-template-areas:"ortu wali" "kabid kabid";gap:2px 20px;font-size:.95em;text-align:center;padding-top:.8em}
.rp-ttd>div:nth-child(1){grid-area:ortu}.rp-ttd>div:nth-child(2){grid-area:wali}.rp-kabid{grid-area:kabid;margin-top:.4em}
.rp-ttd p{margin:0}.rp-nama{margin-top:3.6em!important;font-weight:700;text-decoration:underline;text-underline-offset:3px}
.rp-kabid .rp-nama{margin-top:3.2em!important}
.rp-kosong{color:#9aa9a0;font-weight:400;font-style:italic}
`;

export const pageSize = (paper: 'A4' | 'F4') => (paper === 'F4' ? { w: 210, h: 330 } : { w: 210, h: 297 });

// Muatkan isi ke satu halaman: kecilkan huruf bertahap (10pt → 7,6pt) bila isi melebihi tinggi kertas.
export function fitPage(el: HTMLElement) {
  let fs = 10; el.style.setProperty('--rp-fs', fs + 'pt');
  while (el.scrollHeight > el.clientHeight + 1 && fs > 7.6) { fs = Math.round((fs - 0.2) * 10) / 10; el.style.setProperty('--rp-fs', fs + 'pt'); }
}
