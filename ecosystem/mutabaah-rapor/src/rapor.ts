// Tata letak Rapor Perkembangan Al-Qur'an (F4 215 × 330 mm, satu lembar) — sama dengan PDF Mutabaah Tahfidz,
// berupa HTML agar dapat dipratinjau & diubah langsung di Mutabaah > Rapor semester, lalu dicetak/diunduh PDF. Cap & tanda tangan Kabid disertakan.
import { tanggalPanjang } from '../../../apps/mutabaah/lib/target';
import { CAP, TTD_KABID } from '../../shared/pengesahan';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const angka = (x: any) => String(x ?? '').replace('.', ',');
export const SIZE = { w: 215, h: 330 };

export function raporHTML(r: any, logo: string, edit = false) {
  const e = (key: string, label: string) => (edit ? ` data-edit="${key}" tabindex="0" role="button" aria-label="Ubah ${esc(label)}"` : '');
  const k = r.rekap, u = r.ujian, th = r.tahsin, ab = r.absen;
  const sel = [
    { l: 'Hafalan awal', v: `${angka(k.hafalan_awal)} juz` }, { l: 'Ziyadah semester', v: `${angka(k.ziyadah)} hlm` }, { l: 'Total hafalan', v: `${angka(k.total)} juz` },
    { l: 'Total murajaah', v: `${angka(k.murajaah)} hlm`, s: r.murajaah?.sertifikasi_hal ? `+ sertifikasi ${r.murajaah.sertifikasi_hal} hlm` : '' },
    { l: 'Target semester', v: r.target?.semester ? `${angka(k.target_semester)} juz` : 'Sertifikasi', s: k.capaian || '' },
  ];
  const ev = [
    { j: 'UJIAN SEMESTER', key: 'ujian', v: u.nilai == null ? 'Belum ada nilai' : `Nilai ${angka(u.nilai)}`, s: u.nilai == null ? (u.draft ? 'Ujian sedang berjalan' : 'Kelulusan belum ditentukan') : u.lulus ? `Lulus KKM ${u.kkm}` : `Belum mencapai KKM ${u.kkm}`, bad: u.lulus === false },
    { j: "TAHSIN / IQRO'", key: 'tahsin', v: th.lulus === true ? 'Lulus' : th.lulus === false ? 'Belum lulus' : 'Belum ada hasil', s: [r.jalur && r.jalur !== 'reguler' ? r.jalur_label : '', th.aktif && th.persen != null ? `Ketuntasan ${th.persen}% (${th.tuntas}/${th.total})` : '', th.materi ? `Materi: ${th.materi}` : th.sumber === 'ujian' ? 'Dari ujian tahsin semester' : !th.aktif ? 'Tidak dalam tahap tahsin' : th.wajib ? 'Syarat target semester ini' : 'Status kelulusan tahsin'].filter(Boolean).join(' · '), bad: th.lulus === false },
    { j: 'KETIDAKHADIRAN', key: 'absen', v: `S: ${ab.sakit}&nbsp;&nbsp; I: ${ab.izin}&nbsp;&nbsp; A: ${ab.alpa}`, s: 'Sakit · Izin · Alpa', bad: false, raw: true },
  ];
  const rw: any[] = (r.riwayat || []).slice(0, 4);
  return `<article class="rt-page" data-santri="${esc(r.santri.id)}">
  <header class="rt-kop"><img src="${logo}" alt="" class="rt-logo"><div><h1>RAPOR PERKEMBANGAN AL-QUR'AN</h1><h2>PESANTREN NURUL ISLAM TENGARAN</h2><p>Semester ${esc(r.periode.nama)} · Tahun Ajaran ${esc(r.periode.tahun_ajaran)}</p></div></header>
  <table class="rt-id"><tr><th>NAMA</th><td class="rt-nm">${esc(String(r.santri.nama).toUpperCase())}</td><th>KELAS</th><td${e('kelas', 'kelas')}>${esc(r.identitas.kelas || '-')}</td></tr>
  <tr><th>KAMAR</th><td${e('kamar', 'kamar')}>${esc(r.identitas.kamar || '-')}</td><th>SEMESTER</th><td>${esc(r.periode.nama)}</td></tr></table>
  <h3 class="rt-bag">A. RINGKASAN CAPAIAN</h3>
  <div class="rt-boxes rt-5"${e('rekap', 'ringkasan capaian')}>${sel.map((c) => `<div><small>${c.l}</small><b>${esc(c.v)}</b>${c.s ? `<em class="${c.s === 'Tercapai' ? 'ok' : c.s === 'Belum tercapai' ? 'bad' : ''}">${esc(c.s)}</em>` : ''}</div>`).join('')}</div>
  <h3 class="rt-bag">B. PENILAIAN UTAMA</h3>
  <table class="rt-tab"><thead><tr><th>Aspek Penilaian</th><th class="rt-n">Nilai</th><th>Catatan singkat</th></tr></thead><tbody>
  ${r.aspek.map((a: any) => `<tr><td>${esc(a.label)}</td><td class="rt-n${a.otomatis ? ' rt-auto' : ''}"${e('aspek.' + a.key, a.label)}>${esc(a.predikat || '—')}</td><td class="rt-ket${a.keterangan ? '' : ' rt-muted'}"${e('aspek.' + a.key, a.label)}>${esc(a.keterangan || (a.predikat ? '' : 'Belum ada predikat'))}</td></tr>`).join('')}
  </tbody></table>
  <h3 class="rt-bag">C. EVALUASI &amp; KETIDAKHADIRAN</h3>
  <div class="rt-boxes rt-3">${ev.map((x) => `<div${x.key === 'ujian' && u.sumber === 'aplikasi' ? '' : e(x.key, x.j)}><small>${x.j}</small><b class="${x.bad ? 'bad' : ''}">${x.raw ? x.v : esc(x.v)}</b><em>${esc(x.s)}</em></div>`).join('')}</div>
  <h3 class="rt-bag">D. RIWAYAT HAFALAN</h3>
  <div class="rt-riwayat${r.riwayat_diubah ? '' : ' rt-auto-box'}"${e('riwayat', 'riwayat hafalan')}>${rw.length ? rw.map((x) => `<p><b>${esc(x.judul)}</b><span>${esc(x.isi)}</span></p>`).join('') : '<p class="rt-muted">Belum ada nilai hafalan per surat atau sertifikasi pada semester ini.</p>'}</div>
  <h3 class="rt-bag">E. CATATAN PEMBINAAN</h3>
  <div class="rt-catatan${r.catatan_otomatis ? ' rt-auto' : ''}"${e('catatan', 'catatan pembinaan')}>${esc(r.catatan || '-')}</div>
  <footer class="rt-ttd">
    <div><p>&nbsp;</p><p>${esc(r.ttd.kepala.jabatan)}</p><div class="rt-sah"><img class="rt-cap" src="${CAP}" alt=""><img class="rt-ttdimg" src="${TTD_KABID}" alt=""></div><p class="rt-nama">${esc(r.ttd.kepala.nama)}</p></div>
    <div><p${e('tanggal', 'tanggal rapor')}>${esc(r.ttd.tempat)}, ${esc(tanggalPanjang(r.ttd.tanggal))}</p><p>${esc(r.ttd.label_muhaffiz)}</p><div class="rt-sah"></div><p class="rt-nama">${esc(r.ttd.muhaffiz || '........................................')}</p></div>
  </footer>
  <div class="rt-kaki"><span>Rapor Al-Qur'an · ${esc(String(r.santri.nama).slice(0, 48))} · ${esc(r.periode.label)}</span><span>F4 · 1 lembar</span></div>
</article>`;
}

export const RAPOR_CSS = `
.rt-page{box-sizing:border-box;width:215mm;height:330mm;padding:11.7mm 11.7mm 9mm;background:#fff;color:#122219;font-family:NurisJakarta,"Plus Jakarta Sans",Helvetica,Arial,sans-serif;font-size:var(--rt-fs,10pt);line-height:1.3;display:flex;flex-direction:column;overflow:hidden}
.rt-page *{box-sizing:border-box}
.rt-kop{display:flex;align-items:center;gap:4.4mm;padding-bottom:2.2mm;border-bottom:.9mm double #082e1a;margin-bottom:3.6mm}
.rt-logo{width:17.5mm;height:17.5mm;object-fit:contain}
.rt-kop h1{margin:0;font-size:1.5em;color:#082e1a;letter-spacing:.01em}.rt-kop h2{margin:1px 0 0;font-size:1.08em;color:#0d4a28}.rt-kop p{margin:2px 0 0;font-size:.95em;color:#5e6f65}
.rt-id{width:100%;border-collapse:collapse;margin-bottom:3.4mm}
.rt-id th,.rt-id td{border:.3mm solid #788c80;padding:1.6mm 2.4mm;text-align:left}.rt-id th{background:#ecf4ef;color:#5e6f65;font-size:.86em;width:21mm;white-space:nowrap}
.rt-id td{font-weight:700}.rt-id td.rt-nm{font-size:1.15em}.rt-id td:last-child{width:31mm}
.rt-bag{margin:3.2mm 0 1.8mm;padding-bottom:1.2mm;border-bottom:.25mm solid #788c80;font-size:1em;color:#0d4a28;letter-spacing:.02em}
.rt-boxes{display:grid;border:.3mm solid #788c80}.rt-5{grid-template-columns:repeat(5,1fr)}.rt-3{grid-template-columns:repeat(3,1fr)}
.rt-boxes>div{background:#ecf4ef;padding:1.8mm 2.6mm;border-right:.3mm solid #788c80;min-height:16mm}.rt-boxes>div:last-child{border-right:0}
.rt-boxes small{display:block;font-size:.8em;color:#5e6f65;font-weight:700}.rt-boxes b{display:block;font-size:1.22em;color:#082e1a;margin-top:.6mm}.rt-boxes b.bad{color:#aa2828}
.rt-boxes em{display:block;font-style:normal;font-size:.76em;font-weight:700;color:#5e6f65;margin-top:.4mm}.rt-boxes em.ok{color:#0d4a28}.rt-boxes em.bad{color:#aa2828}
.rt-tab{width:100%;border-collapse:collapse}
.rt-tab th{background:#082e1a;color:#fff;text-align:left;padding:1.6mm 3.2mm;font-size:.94em}
.rt-tab td{border:.3mm solid #788c80;padding:1.6mm 3.2mm;vertical-align:middle}.rt-tab tbody tr:nth-child(even) td{background:#f8fbf9}
.rt-tab .rt-n{width:19mm;text-align:center;font-weight:800;font-size:1.12em;color:#082e1a}.rt-tab th.rt-n{color:#fff;font-size:.94em}.rt-tab td:first-child{width:56mm}
.rt-ket{font-size:.92em}.rt-muted{color:#5e6f65}
.rt-riwayat{border:.3mm solid #788c80;padding:1.6mm 3.2mm;min-height:9mm}.rt-riwayat p{margin:.6mm 0;display:flex;gap:3mm;font-size:.95em}.rt-riwayat b{width:28mm;flex:none;color:#082e1a}
.rt-catatan{border:.3mm solid #788c80;padding:2.2mm 3.2mm;min-height:24mm;white-space:pre-wrap;font-size:.98em}
.rt-ttd{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;text-align:center;font-size:.97em;padding-top:3mm}
.rt-ttd p{margin:0}.rt-sah{position:relative;height:20mm;width:60mm;margin:0 auto}
/* Cap ±32 mm & tanda tangan ±28 mm, boleh menimpa jabatan & nama seperti tinta asli. */
.rt-cap{position:absolute;left:3mm;top:-1.5mm;width:32mm;height:32mm;object-fit:contain;opacity:.9;mix-blend-mode:multiply;z-index:1}.rt-ttdimg{position:absolute;left:22mm;top:-2.5mm;width:28mm;height:31.5mm;object-fit:contain;mix-blend-mode:multiply;z-index:2}
.rt-nama{font-weight:800;display:inline-block;border-top:.3mm solid #122219;padding-top:1mm;min-width:52mm}
.rt-kaki{display:flex;justify-content:space-between;border-top:.45mm solid #082e1a;margin-top:2.4mm;padding-top:1mm;font-size:.72em;color:#5e6f65}
.rt-auto{color:#3c6b4d}
`;

export function fitPage(el: HTMLElement) {
  let fs = 10; el.style.setProperty('--rt-fs', fs + 'pt');
  while (el.scrollHeight > el.clientHeight + 1 && fs > 7.4) { fs = Math.round((fs - 0.2) * 10) / 10; el.style.setProperty('--rt-fs', fs + 'pt'); }
}
