// Rapor Tahfidz — rekap per halaqah, pratinjau yang dapat diubah, cetak/PDF satu atau banyak santri (desain Mutabaah).
import { PREDIKAT, PREDIKAT_TAHFIDZ, INDIKATOR_SINGKAT, narasiCatatan } from '../../../apps/mutabaah/lib/target';
import { raporHTML, RAPOR_CSS, SIZE, fitPage } from './rapor';
import { unduhPdf } from '../../shared/pdf';
import { shell, $, $$, esc, icon, I, toast, apiOf, token, needLogin, loading, empty, appsMenu, sessionEnded, unitLabel, download, csvOf } from '../../shared/ui';

const api = apiOf('https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/rapor-tahfidz/');
const ASPEK = ['makhraj', 'tajwid', 'tahfidz', 'murajaah', 'kehadiran', 'perkembangan'];
const LABEL: Record<string, string> = { makhraj: 'Makhraj', tajwid: 'Tajwid', tahfidz: 'Tahfidz', murajaah: 'Murajaah', kehadiran: 'Kehadiran', perkembangan: 'Perkembangan' };
const st: any = { user: null, halaqah: [], view: 'home', hk: '', list: [] as any[], mode: 'rekap', current: '', sel: new Set<string>(), ta: '', sem: 1, logo: '', filter: '', pending: new Map<string, any>(), saving: 0 };
const app = document.getElementById('app')!;
function defaultPeriod() { const d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1; return m >= 7 ? { ta: `${y}/${y + 1}`, sem: 1 } : { ta: `${y - 1}/${y}`, sem: 2 }; }
const byId = (id: string) => st.list.find((r: any) => r.santri.id === id);
const peran = () => (st.user?.admin ? 'Pimpinan · semua halaqah' : st.user?.koordinator?.length ? `Koordinator ${st.user.koordinator.map(unitLabel).join(', ')}` : 'Muhaffiz/ah');
const lengkap = (r: any) => { const n = r.aspek.filter((a: any) => a.predikat).length + (r.ujian.nilai != null ? 1 : 0) + (r.catatan ? 1 : 0); return { n, t: 8, pct: Math.round((n / 8) * 100) }; };
const warna = (p: string) => (p === 'A+' || p === 'A' ? 'a' : p === 'B+' ? 'bp' : p === 'B' ? 'b' : p ? 'c' : 'none');

function periodePicker() {
  const [y] = st.ta.split('/').map(Number);
  return `<select data-act="ta" aria-label="Tahun ajaran" class="rt-sel">${[y - 1, y, y + 1].map((a) => `<option ${a === y ? 'selected' : ''}>${a}/${a + 1}</option>`).join('')}</select>
  <select data-act="sem" aria-label="Semester" class="rt-sel"><option value="1" ${st.sem === 1 ? 'selected' : ''}>Ganjil</option><option value="2" ${st.sem === 2 ? 'selected' : ''}>Genap</option></select>`;
}
function render(body?: string) {
  const h = st.halaqah.find((x: any) => x.key === st.hk);
  const title = st.view === 'halaqah' && h ? `${unitLabel(h.unit)} · ${h.tingkat} · ${h.halaqah}` : 'Rapor Tahfidz';
  app.innerHTML = shell({ app: 'Rapor Tahfidz', title, nav: [{ id: 'home', label: 'Halaqah', icon: I.users }], active: 'home', user: st.user && { nama: st.user.nama, peran: peran() }, actions: periodePicker(), back: st.view === 'halaqah' }, body ?? (st.view === 'halaqah' ? halaqahView() : homeView()));
  if (st.view === 'halaqah' && st.mode === 'rapor') drawPreview();
  saveBar();
}

/* ---------- Beranda ---------- */
function homeView() {
  const f = st.filter.toLowerCase();
  const groups = new Map<string, any[]>();
  for (const h of st.halaqah) {
    if (f && !`${h.unit} ${h.tingkat} ${h.halaqah} ${h.musyrif}`.toLowerCase().includes(f)) continue;
    const g = `${unitLabel(h.unit)} · Kelas ${h.tingkat}`; (groups.get(g) ?? groups.set(g, []).get(g)!).push(h);
  }
  const total = st.halaqah.reduce((n: number, h: any) => n + (h.jumlah || 0), 0);
  return `<section class="ns-hero anim-rise"><div><p class="ns-eyebrow">Semester ${st.sem === 1 ? 'ganjil' : 'genap'} ${esc(st.ta)}</p><h2>Rapor Perkembangan Al-Qur'an</h2>
    <p>Pilih halaqah, rekap enam aspek dalam satu tabel, periksa pratinjau rapor F4, lalu cetak atau unduh PDF sekaligus. Nilai otomatis dari Mutabaah dipakai bila tidak diubah.</p></div>
    <div class="ns-kpi"><div><strong>${st.halaqah.length}</strong><span>halaqah</span></div><div><strong>${total}</strong><span>santri</span></div></div></section>
    ${st.halaqah.length > 6 ? `<div class="ns-filters"><label class="ns-field">Cari halaqah<input type="search" data-act="filter" value="${esc(st.filter)}" placeholder="Unit, kelas, halaqah, atau muhaffiz"></label></div>` : ''}
    ${[...groups].map(([g, hs]) => `<div class="ns-section-title"><h3>${esc(g)}</h3></div><div class="rt-cards">${hs.map((h) => `<button class="rt-card" data-act="open" data-id="${esc(h.key)}"><span class="rt-card-ic">${icon(I.book)}</span><span><b>${esc(h.halaqah)}</b><small>${esc(h.musyrif || '—')}</small><small>${h.jumlah} santri</small></span></button>`).join('')}</div>`).join('') || empty('Belum ada halaqah.', 'Akun ini belum memegang halaqah di Mutabaah Tahfidz.')}`;
}

/* ---------- Halaqah ---------- */
function halaqahView() {
  const done = st.list.filter((r: any) => lengkap(r).pct === 100).length;
  return `<section class="rt-head anim-rise"><div><p class="ns-muted">${st.list.length} santri · ${done} rapor lengkap</p></div>
    <div class="ns-seg" role="tablist" aria-label="Mode" data-nuris-glass><button role="tab" aria-selected="${st.mode === 'rekap'}" data-act="mode" data-v="rekap">${icon(I.edit, 16)}Rekap nilai</button><button role="tab" aria-selected="${st.mode === 'rapor'}" data-act="mode" data-v="rapor">${icon(I.print, 16)}Rapor & cetak</button></div></section>
    ${st.mode === 'rekap' ? rekapView() : raporView()}`;
}
function rekapView() {
  const rows = st.list.map((r: any, ri: number) => {
    const cells = ASPEK.map((k, ci) => { const a = r.aspek.find((x: any) => x.key === k); return `<td><input class="rt-in ${warna(a.predikat)}${a.otomatis ? ' auto' : ''}" data-a="${k}" data-s="${esc(r.santri.id)}" data-r="${ri}" data-c="${ci}" value="${esc(a.predikat)}" maxlength="2" autocomplete="off" aria-label="${LABEL[k]} ${esc(r.santri.nama)}" title="${esc(a.keterangan || '')}${a.otomatis ? ' (otomatis)' : ''}"></td>`; }).join('');
    const uj = r.ujian.sumber === 'aplikasi' ? `<span class="ns-pill ${r.ujian.lulus ? 'a' : 'c'}">${String(r.ujian.nilai).replace('.', ',')}</span>` : `<input class="rt-in num" data-u="${esc(r.santri.id)}" value="${esc(r.ujian_manual)}" inputmode="decimal" placeholder="–" aria-label="Nilai ujian manual ${esc(r.santri.nama)}" title="Belum ada ujian final di aplikasi; isi nilai manual bila diuji di luar aplikasi">`;
    const ab = ['sakit', 'izin', 'alpa'].map((k) => `<td><input class="rt-in num sm" data-ab="${k}" data-s="${esc(r.santri.id)}" value="${esc(r.absen[k])}" inputmode="numeric" aria-label="${k} ${esc(r.santri.nama)}"></td>`).join('');
    const l = lengkap(r);
    return `<tr><th scope="row"><b>${esc(r.santri.nama)}</b><small>${l.n}/${l.t} isian${st.pending.has(r.santri.id) ? ' · <i>belum disimpan</i>' : ''}</small></th>${cells}<td>${uj}</td>${ab}<td><button class="ns-btn sm ghost" data-act="catatan" data-id="${esc(r.santri.id)}" title="${esc(r.catatan)}">${r.catatan ? (r.catatan_otomatis ? 'Otomatis' : 'Ubah') : 'Tulis'}</button></td></tr>`;
  }).join('');
  return `<div class="rt-bar"><p class="ns-muted">Ketik A+, A, B+, B, atau C (A+ hanya untuk tahfidz). Teks hijau miring = otomatis dari Mutabaah. Enter/panah untuk pindah; tempel blok dari Excel didukung.</p>
    <span class="ns-grow"></span><label class="ns-field rt-fill">Isi kosong<select data-act="fill"><option value="">aspek…</option>${ASPEK.map((k) => `<option value="${k}">${LABEL[k]}</option>`).join('')}</select></label>
    <button class="ns-btn sm" data-act="csv">${icon(I.down, 16)}Leger CSV</button></div>
    <div class="ns-table-wrap"><table class="ns-table rt-grid"><thead><tr><th>Santri</th>${ASPEK.map((k) => `<th>${LABEL[k]}</th>`).join('')}<th>Ujian</th><th>S</th><th>I</th><th>A</th><th>Catatan</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}
function raporView() {
  if (!st.current || !byId(st.current)) st.current = st.list[0]?.santri.id || '';
  const n = st.sel.size;
  const list = st.list.map((r: any) => { const l = lengkap(r); return `<li class="${r.santri.id === st.current ? 'on' : ''}"><label class="rt-chk"><input type="checkbox" data-act="sel" data-id="${esc(r.santri.id)}" ${st.sel.has(r.santri.id) ? 'checked' : ''}><span class="sr">Pilih ${esc(r.santri.nama)}</span></label>
    <button data-act="cur" data-id="${esc(r.santri.id)}"><b>${esc(r.santri.nama)}</b><span class="rt-meter"><i style="width:${l.pct}%"></i></span><small>${l.pct}% lengkap</small></button></li>`; }).join('');
  return `<div class="rt-layout"><aside class="rt-list"><div class="rt-list-head"><label class="rt-chk"><input type="checkbox" data-act="selall" ${n && n === st.list.length ? 'checked' : ''}><span>Pilih semua</span></label><small>${n} dipilih</small></div><ul>${list}</ul></aside>
  <section class="rt-preview"><div class="rt-actions"><span class="ns-muted">F4 · 215 × 330 mm · 1 lembar</span><span class="ns-grow"></span>
    <button class="ns-btn sm" data-act="print1">${icon(I.print, 16)}Cetak santri ini</button><button class="ns-btn sm" data-act="pdf1">${icon(I.pdf, 16)}PDF santri ini</button>
    <button class="ns-btn sm primary" data-act="printsel" ${n ? '' : 'disabled'}>${icon(I.print, 16)}Cetak ${n || ''} terpilih</button><button class="ns-btn sm primary" data-act="pdfsel" ${n ? '' : 'disabled'}>${icon(I.pdf, 16)}PDF ${n || ''} terpilih</button></div>
    <p class="ns-muted rt-tip">Klik nilai, catatan, kelas, kamar, tanggal, ujian, tahsin, atau ketidakhadiran pada rapor untuk mengubahnya. Perubahan tersimpan otomatis.</p>
    <div class="rt-scroll"><div id="preview"></div></div></section></div>`;
}
function drawPreview() {
  const box = $('#preview'); if (!box) return;
  const r = byId(st.current); if (!r) { box.innerHTML = empty('Belum ada santri.'); return; }
  box.innerHTML = raporHTML(r, st.logo, true);
  const pg = $('.rt-page', box); if (pg) fitPage(pg);
  const sc = $('.rt-scroll'); if (sc && pg) { const k = Math.min(1, (sc.clientWidth - 8) / pg.offsetWidth); box.style.transform = `scale(${k})`; box.style.height = pg.offsetHeight * k + 'px'; }
}

/* ---------- Ubah & simpan ---------- */
// Perubahan dikumpulkan per santri lalu dikirim dengan format yang sama seperti editor rapor Mutabaah.
function queue(id: string, f: (b: any) => void) {
  const b = st.pending.get(id) || { pelengkap: {}, aspek: {} }; f(b); st.pending.set(id, b); saveBar();
  clearTimeout(st.timer); st.timer = setTimeout(flush, 1200);
}
async function flush() {
  if (st.saving || !st.pending.size) return;
  const jobs = [...st.pending]; st.pending.clear(); st.saving = jobs.length; saveBar();
  for (const [id, data] of jobs) {
    try {
      const r = await api('simpan', { santri: id, ta: st.ta, sem: st.sem, data });
      const i = st.list.findIndex((x: any) => x.santri.id === id); if (i >= 0) st.list[i] = r.rapor;
    } catch (e: any) { toast(e.message, 'err'); }
    st.saving--; saveBar();
  }
  if (st.mode === 'rapor') drawPreview(); else refreshGrid();
}
function refreshGrid() { const a = document.activeElement as HTMLInputElement | null; const key = a?.dataset ? [a.dataset.a || a.dataset.ab || (a.dataset.u ? 'u' : ''), a.dataset.s || a.dataset.u].join('|') : ''; render(); if (key) { const [k, s] = key.split('|'); const n = $<HTMLInputElement>(`[data-s="${CSS.escape(s)}"][data-a="${k}"],[data-s="${CSS.escape(s)}"][data-ab="${k}"],[data-u="${CSS.escape(s)}"]`); n?.focus(); } }
function setAspek(r: any, key: string, p: string, ket?: string) {
  const a = r.aspek.find((x: any) => x.key === key);
  a.predikat = p; a.otomatis = false;
  if (ket !== undefined) { a.keterangan = ket; a.ket_otomatis = false; } else if (a.ket_otomatis || !a.keterangan) { a.keterangan = p ? INDIKATOR_SINGKAT[key]?.[p] || '' : ''; a.ket_otomatis = true; }
  queue(r.santri.id, (b) => (b.aspek[key] = { p: a.predikat, k: a.keterangan }));
}
const bolehPred = (key: string) => (key === 'tahfidz' ? PREDIKAT_TAHFIDZ : PREDIKAT) as readonly string[];
function saveBar() {
  let bar = $('#rt-save');
  if (st.view !== 'halaqah') { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'rt-save'; bar.setAttribute('aria-live', 'polite'); document.body.append(bar); }
  bar.className = st.saving ? 'busy' : st.pending.size ? 'dirty' : 'clean';
  bar.innerHTML = st.saving ? '<span class="rt-dot"></span>Menyimpan…' : st.pending.size ? `<span class="rt-dot"></span>${st.pending.size} santri belum disimpan <button data-act="save">Simpan</button>` : `${icon(I.check, 16)}Semua tersimpan`;
}
function popover(target: HTMLElement) {
  const key = target.dataset.edit!; const r = byId(st.current); if (!r) return;
  $('.rt-pop')?.remove();
  const pop = document.createElement('div'); pop.className = 'rt-pop'; pop.setAttribute('role', 'dialog');
  const btns = '<div class="rt-pop-act"><button class="ns-btn sm" data-x="batal">Batal</button><button class="ns-btn sm primary" data-x="ok">Simpan</button></div>';
  if (key.startsWith('aspek.')) {
    const k = key.slice(6), a = r.aspek.find((x: any) => x.key === k);
    pop.innerHTML = `<b>${esc(a.label)}</b><div class="rt-choice">${bolehPred(k).map((p) => `<button type="button" data-p="${p}" class="${a.predikat === p ? 'on' : ''}">${p}</button>`).join('')}<button type="button" data-p="" class="soft">kosong</button></div>
      <label>Catatan singkat<textarea rows="3" maxlength="200">${esc(a.keterangan)}</textarea></label>${btns}`;
  } else if (key === 'catatan') pop.innerHTML = `<b>Catatan pembinaan</b><textarea rows="6" maxlength="1000">${esc(r.catatan)}</textarea><button type="button" class="ns-btn sm ghost" data-x="auto">Susun otomatis</button>${btns}`;
  else if (key === 'absen') pop.innerHTML = `<b>Ketidakhadiran</b><div class="rt-trio">${['sakit', 'izin', 'alpa'].map((k) => `<label>${k[0].toUpperCase() + k.slice(1)}<input inputmode="numeric" data-k="${k}" value="${esc(r.absen[k])}"><small>otomatis ${r.absen.otomatis[k]}</small></label>`).join('')}</div>${btns}`;
  else if (key === 'ujian') pop.innerHTML = `<b>Nilai ujian manual (0–100)</b><p class="ns-muted">Belum ada ujian final di menu Ujian Semester. Isi bila santri diuji di luar aplikasi.</p><input inputmode="decimal" value="${esc(r.ujian_manual)}">${btns}`;
  else if (key === 'tahsin') pop.innerHTML = `<b>Status tahsin / Iqro'</b><select><option value="">Belum ada hasil</option><option value="1" ${r.iqro_lulus === true ? 'selected' : ''}>Lulus</option><option value="0" ${r.iqro_lulus === false ? 'selected' : ''}>Belum lulus</option></select><label>Materi terakhir<input data-k="materi" maxlength="60" value="${esc(r.tahsin.materi)}"></label>${btns}`;
  else if (key === 'kelas' || key === 'kamar') pop.innerHTML = `<b>${key === 'kelas' ? 'Kelas' : 'Kamar'}</b><input maxlength="${key === 'kelas' ? 12 : 40}" value="${esc(r.identitas[key])}">${btns}`;
  else if (key === 'tanggal') pop.innerHTML = `<b>Tanggal rapor</b><input type="date" value="${esc(r.ttd.tanggal)}">${btns}`;
  document.body.append(pop);
  const b = target.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, b.left + b.width / 2 - pop.offsetWidth / 2)) + 'px';
  pop.style.top = Math.max(8, Math.min(innerHeight - pop.offsetHeight - 8, b.bottom + 8)) + 'px';
  (pop.querySelector('textarea,input,select,button') as HTMLElement)?.focus();
  let pred: string | null = null;
  const close = () => { pop.remove(); };
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  pop.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('button') as HTMLElement | null; if (!t) return;
    if (t.dataset.p !== undefined) { pred = t.dataset.p; $$('.rt-choice button', pop).forEach((x) => x.classList.toggle('on', x === t && !!pred)); const k = key.slice(6); const ta = pop.querySelector('textarea') as HTMLTextAreaElement; const a = r.aspek.find((x: any) => x.key === k); if (ta && (a.ket_otomatis || !ta.value)) ta.value = pred ? INDIKATOR_SINGKAT[k]?.[pred] || '' : ''; return; }
    if (t.dataset.x === 'batal') return close();
    if (t.dataset.x === 'auto') { const p = Object.fromEntries(r.aspek.map((a: any) => [a.key, a.predikat])); (pop.querySelector('textarea') as HTMLTextAreaElement).value = narasiCatatan(p, r.santri.gender, { ziyadah_hal: Number(String(r.rekap.ziyadah).replace(',', '.')) || 0, target_juz: r.target.semester, murajaah_rata: r.murajaah.rata, murajaah_n: r.murajaah.n, ujian: r.ujian.nilai }); return; }
    if (t.dataset.x !== 'ok') return;
    const id = r.santri.id;
    if (key.startsWith('aspek.')) { const k = key.slice(6), a = r.aspek.find((x: any) => x.key === k); const ket = (pop.querySelector('textarea') as HTMLTextAreaElement).value; setAspek(r, k, pred ?? a.predikat, ket !== a.keterangan ? ket : undefined); }
    else if (key === 'catatan') { r.catatan = (pop.querySelector('textarea') as HTMLTextAreaElement).value; r.catatan_otomatis = false; queue(id, (b) => (b.catatan = r.catatan)); }
    else if (key === 'absen') { const v: any = {}; $$<HTMLInputElement>('input', pop).forEach((x) => (v[x.dataset.k!] = x.value.replace(/\D/g, ''))); Object.assign(r.absen, v); queue(id, (b) => (b.pelengkap.absen = { sakit: r.absen.sakit, izin: r.absen.izin, alpa: r.absen.alpa })); }
    else if (key === 'ujian') { const v = (pop.querySelector('input') as HTMLInputElement).value.trim(); if (v && !(Number(v.replace(',', '.')) >= 0 && Number(v.replace(',', '.')) <= 100)) { toast('Nilai 0–100.', 'err'); return; } r.ujian_manual = v; queue(id, (b) => (b.pelengkap.ujian_manual = v)); }
    else if (key === 'tahsin') { const s = (pop.querySelector('select') as HTMLSelectElement).value; r.iqro_lulus = s === '' ? null : s === '1'; r.tahsin.lulus = r.iqro_lulus; r.tahsin.materi = (pop.querySelector('[data-k=materi]') as HTMLInputElement).value; queue(id, (b) => { b.pelengkap.iqro_lulus = r.iqro_lulus; b.pelengkap.tahsin_materi = r.tahsin.materi; }); }
    else if (key === 'kelas' || key === 'kamar') { r.identitas[key] = (pop.querySelector('input') as HTMLInputElement).value; queue(id, (b) => (b.pelengkap[key] = r.identitas[key])); }
    else if (key === 'tanggal') { r.ttd.tanggal = (pop.querySelector('input') as HTMLInputElement).value; queue(id, (b) => (b.pelengkap.tanggal = r.ttd.tanggal)); }
    close(); drawPreview();
  });
  setTimeout(() => document.addEventListener('pointerdown', function out(ev) { if (!pop.contains(ev.target as Node)) { pop.remove(); document.removeEventListener('pointerdown', out); } }), 0);
}
function catatanDialog(id: string) { st.current = id; st.mode = 'rapor'; render(); setTimeout(() => { const t = $<HTMLElement>('#preview [data-edit=catatan]'); if (t) popover(t); }, 60); }

/* ---------- Cetak & PDF ---------- */
function pagesHTML(ids: string[]) { return ids.map((id) => raporHTML(byId(id), st.logo, false)).join(''); }
async function printPages(ids: string[]) {
  await flush();
  $('#rt-print')?.remove();
  const host = document.createElement('div'); host.id = 'rt-print';
  host.innerHTML = `<style>@page{size:215mm 330mm;margin:0}</style>` + pagesHTML(ids);
  document.body.append(host); $$('.rt-page', host).forEach(fitPage);
  const done = () => { host.remove(); removeEventListener('afterprint', done); }; addEventListener('afterprint', done);
  document.fonts.ready.then(() => setTimeout(() => print(), 80));
}
async function pdf(ids: string[]) {
  await flush();
  const host = document.createElement('div'); host.className = 'rt-offscreen'; host.innerHTML = pagesHTML(ids); document.body.append(host);
  const bar = document.createElement('div'); bar.className = 'ns-toast'; bar.setAttribute('role', 'status'); document.body.append(bar);
  try {
    await document.fonts.ready; $$('.rt-page', host).forEach(fitPage);
    const h = st.halaqah.find((x: any) => x.key === st.hk);
    const nama = ids.length === 1 ? `Rapor Al-Qur'an ${byId(ids[0]).santri.nama} ${st.ta.replace('/', '-')} S${st.sem}` : `Rapor Al-Qur'an ${h ? `${h.unit} ${h.tingkat} ${h.halaqah}` : 'Halaqah'} ${st.ta.replace('/', '-')} S${st.sem}`;
    await unduhPdf($$('.rt-page', host), SIZE, RAPOR_CSS, nama, (i, n) => { bar.textContent = `Menyusun PDF ${i + 1} dari ${n}…`; });
    bar.textContent = 'PDF siap diunduh.';
  } catch { bar.textContent = 'Browser belum bisa menyusun PDF langsung. Membuka dialog cetak: pilih “Simpan sebagai PDF”.'; printPages(ids); }
  finally { host.remove(); setTimeout(() => bar.remove(), 2600); }
}
function csv() {
  const head = ['No', 'Nama', 'Kelas', 'Kamar', ...ASPEK.map((k) => LABEL[k]), 'Nilai ujian', 'Lulus KKM', 'Tahsin', 'Hafalan awal (juz)', 'Ziyadah (hlm)', 'Total (juz)', 'Murajaah (hlm)', 'Target (juz)', 'Capaian', 'Sakit', 'Izin', 'Alpa', 'Catatan'];
  const rows = st.list.map((r: any, i: number) => [i + 1, r.santri.nama, r.identitas.kelas, r.identitas.kamar, ...ASPEK.map((k) => r.aspek.find((a: any) => a.key === k)?.predikat || ''), r.ujian.nilai ?? '', r.ujian.lulus == null ? '' : r.ujian.lulus ? 'Ya' : 'Belum', r.tahsin.lulus == null ? '' : r.tahsin.lulus ? 'Lulus' : 'Belum', r.rekap.hafalan_awal, r.rekap.ziyadah, r.rekap.total, r.rekap.murajaah, r.rekap.target_semester, r.rekap.capaian, r.absen.sakit, r.absen.izin, r.absen.alpa, r.catatan]);
  const h = st.halaqah.find((x: any) => x.key === st.hk);
  download(`Leger Rapor Tahfidz ${h ? `${h.unit} ${h.tingkat} ${h.halaqah}` : ''} ${st.ta.replace('/', '-')} S${st.sem}.csv`, csvOf([head, ...rows]));
}

/* ---------- Data ---------- */
async function boot() {
  const p = defaultPeriod(); st.ta = sessionStorage.getItem('rt-ta') || p.ta; st.sem = Number(sessionStorage.getItem('rt-sem')) || p.sem;
  if (!token()) { app.innerHTML = shell({ app: 'Rapor Tahfidz', title: 'Rapor Tahfidz', nav: [], active: '' }, needLogin('Rapor Tahfidz')); return; }
  render(loading());
  fetch('/logo-mark.png').then((r) => r.blob()).then((b) => new Promise<string>((ok) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.readAsDataURL(b); })).then((u) => { st.logo = u; if (st.mode === 'rapor') drawPreview(); }).catch(() => {});
  try {
    const r = await api('halaqah'); st.user = r.user; st.halaqah = r.halaqah;
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash.startsWith('h=')) return openHalaqah(hash.slice(2));
    if (st.halaqah.length === 1 && !st.user.admin) return openHalaqah(st.halaqah[0].key);
    render();
  } catch (e: any) {
    if (e.status === 401) sessionEnded();
    render(empty(e.status === 401 ? 'Sesi berakhir.' : 'Rapor belum dapat dimuat.', e.message, e.status === 401 ? '<a class="ns-btn primary" href="/" target="_top">Masuk kembali</a>' : '<button class="ns-btn primary" data-act="reload">Coba lagi</button>'));
  }
}
async function openHalaqah(hk: string) {
  await flush();
  st.view = 'halaqah'; st.hk = hk; st.sel = new Set(); st.current = ''; render(loading());
  try { const r = await api('rapor', { halaqah: hk, ta: st.ta, sem: st.sem }); st.list = r.santri; history.replaceState(null, '', '#h=' + encodeURIComponent(hk)); render(); ($('#main') as HTMLElement)?.focus(); }
  catch (e: any) { toast(e.message, 'err'); st.view = 'home'; render(); }
}

/* ---------- Peristiwa ---------- */
document.addEventListener('click', async (e) => {
  const navEl = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
  if (navEl) { e.preventDefault(); await flush(); st.view = 'home'; history.replaceState(null, '', location.pathname); render(); return; }
  const ed = (e.target as HTMLElement).closest<HTMLElement>('#preview [data-edit]'); if (ed) return popover(ed);
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!t) return;
  const a = t.dataset.act;
  if (a === 'apps') appsMenu(t, 'rapor');
  else if (a === 'back') { await flush(); st.view = 'home'; history.replaceState(null, '', location.pathname); render(); }
  else if (a === 'open') openHalaqah(t.dataset.id!);
  else if (a === 'mode') { await flush(); st.mode = t.dataset.v; render(); }
  else if (a === 'cur') { st.current = t.dataset.id; $$('.rt-list li').forEach((li) => li.classList.toggle('on', !!li.querySelector(`[data-id="${CSS.escape(st.current)}"]`))); drawPreview(); }
  else if (a === 'catatan') catatanDialog(t.dataset.id!);
  else if (a === 'save') flush();
  else if (a === 'csv') csv();
  else if (a === 'print1') printPages([st.current]);
  else if (a === 'pdf1') pdf([st.current]);
  else if (a === 'printsel') printPages(st.list.filter((r: any) => st.sel.has(r.santri.id)).map((r: any) => r.santri.id));
  else if (a === 'pdfsel') pdf(st.list.filter((r: any) => st.sel.has(r.santri.id)).map((r: any) => r.santri.id));
  else if (a === 'reload') location.reload();
});
document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLInputElement;
  if ((e.key === 'Enter' || e.key === ' ') && t.dataset?.edit && t.closest('#preview')) { e.preventDefault(); popover(t); return; }
  if (!(t instanceof HTMLInputElement) || !t.dataset.a) return;
  const r = Number(t.dataset.r), c = Number(t.dataset.c);
  const go = (dr: number, dc: number) => { const n = $<HTMLInputElement>(`.rt-grid input[data-r="${r + dr}"][data-c="${c + dc}"]`); if (n) { n.focus(); n.select(); return true; } return false; };
  if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); go(1, 0); } else if (e.key === 'ArrowUp') { e.preventDefault(); go(-1, 0); }
  else if (e.key === 'ArrowRight' && t.selectionStart === t.value.length) go(0, 1); else if (e.key === 'ArrowLeft' && !t.selectionStart) go(0, -1);
});
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.act === 'filter') { st.filter = t.value; const pos = t.selectionStart; render(); const n = $<HTMLInputElement>('[data-act=filter]'); n?.focus(); n?.setSelectionRange(pos, pos); return; }
  if (t.dataset.a) {
    const v = t.value.toUpperCase().replace(/\s/g, ''); t.value = v;
    if (v && !/^(A\+?|B\+?|C)$/.test(v)) { t.value = ''; t.classList.add('bad'); setTimeout(() => t.classList.remove('bad'), 500); return; }
    if (v === 'A+' && t.dataset.a !== 'tahfidz') { t.value = 'A'; }
    const r = byId(t.dataset.s!); setAspek(r, t.dataset.a, t.value); t.className = `rt-in ${warna(t.value)}`;
    if (t.value && t.value !== 'B' && !(t.value === 'A' && t.dataset.a === 'tahfidz')) { const n = $<HTMLInputElement>(`.rt-grid input[data-r="${Number(t.dataset.r) + 1}"][data-c="${t.dataset.c}"]`); n?.focus(); n?.select(); }
  } else if (t.dataset.ab) { t.value = t.value.replace(/\D/g, ''); const r = byId(t.dataset.s!); r.absen[t.dataset.ab] = t.value; queue(r.santri.id, (b) => (b.pelengkap.absen = { sakit: r.absen.sakit, izin: r.absen.izin, alpa: r.absen.alpa })); }
  else if (t.dataset.u) { const r = byId(t.dataset.u); const v = t.value.trim(); if (v && !(Number(v.replace(',', '.')) >= 0 && Number(v.replace(',', '.')) <= 100)) { t.classList.add('bad'); return; } t.classList.remove('bad'); r.ujian_manual = v; queue(r.santri.id, (b) => (b.pelengkap.ujian_manual = v)); }
});
document.addEventListener('change', async (e) => {
  const t = e.target as HTMLInputElement;
  const a = t.dataset.act;
  if (a === 'ta' || a === 'sem') { await flush(); if (a === 'ta') st.ta = t.value; else st.sem = Number(t.value); sessionStorage.setItem('rt-ta', st.ta); sessionStorage.setItem('rt-sem', String(st.sem)); if (st.view === 'halaqah') openHalaqah(st.hk); else render(); }
  else if (a === 'sel') { t.checked ? st.sel.add(t.dataset.id) : st.sel.delete(t.dataset.id); render(); }
  else if (a === 'selall') { st.sel = t.checked ? new Set(st.list.map((r: any) => r.santri.id)) : new Set(); render(); }
  else if (a === 'fill' && t.value) {
    const k = t.value; const pick = prompt(`Isi semua ${LABEL[k]} yang kosong dengan predikat (${bolehPred(k).join(', ')}):`, 'B+'); t.value = '';
    const p = String(pick || '').toUpperCase().trim(); if (!p) return; if (!bolehPred(k).includes(p)) { toast('Predikat tidak valid.', 'err'); return; }
    let n = 0; st.list.forEach((r: any) => { const x = r.aspek.find((y: any) => y.key === k); if (!x.predikat) { setAspek(r, k, p); n++; } }); toast(`${n} isian ${LABEL[k]} diisi ${p}.`); render();
  }
});
document.addEventListener('paste', (e) => {
  const t = e.target as HTMLInputElement; if (!t.dataset?.a) return;
  const text = e.clipboardData?.getData('text') || ''; if (!/[\t\n]/.test(text)) return; e.preventDefault();
  const rows = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((l) => l.split('\t')); const r0 = Number(t.dataset.r), c0 = Number(t.dataset.c); let n = 0;
  rows.forEach((row, dr) => row.forEach((v, dc) => { const el = $<HTMLInputElement>(`.rt-grid input[data-r="${r0 + dr}"][data-c="${c0 + dc}"]`); const p = v.trim().toUpperCase(); if (el && bolehPred(el.dataset.a!).includes(p)) { setAspek(byId(el.dataset.s!), el.dataset.a!, p); n++; } }));
  toast(`${n} nilai ditempel.`); render();
});
addEventListener('resize', () => st.mode === 'rapor' && drawPreview());
addEventListener('beforeunload', (e) => { if (st.pending.size) { flush(); e.preventDefault(); } });
document.head.insertAdjacentHTML('beforeend', `<style>${RAPOR_CSS}</style>`);
boot();
