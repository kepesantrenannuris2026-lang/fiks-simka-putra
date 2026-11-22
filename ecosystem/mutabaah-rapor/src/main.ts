// Mutabaah > Rapor semester: "Pratinjau & edit" — rapor F4 tampil seperti hasil cetak dan dapat diubah langsung
// (klik nilai, catatan, kelas, kamar, tanggal, ujian, tahsin, ketidakhadiran), seperti Rapor Pesantren.
// Modul tambahan yang dimuat halaman Mutabaah; memakai API Mutabaah yang sama (getRaporHalaqah / saveRaporSemester)
// dengan sesi pengguna, sehingga hak akses dan data identik dengan editor rapor Mutabaah.
import { PREDIKAT, PREDIKAT_TAHFIDZ, INDIKATOR_SINGKAT, narasiCatatan, IQRO_TOPIK, JALUR } from '../../../apps/mutabaah/lib/target';
import { raporHTML, RAPOR_CSS, SIZE, fitPage } from './rapor';
import { unduhPdf } from '../../shared/pdf';

const API = 'https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/kepesantrenan/mutabaah';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
const SVG = (d: string) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  edit: SVG('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  x: SVG('<path d="M18 6 6 18M6 6l12 12"/>'),
  print: SVG('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/>'),
  pdf: SVG('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15l3 3 3-3"/>'),
  check: SVG('<path d="M20 6 9 17l-5-5"/>'),
};

async function rpc(fn: string, ...args: any[]) {
  const tok = localStorage.getItem('mut_token') || '';
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, 'x-region': 'ap-southeast-1' }, body: JSON.stringify({ fn, args }) });
  let j: any; try { j = await r.json(); } catch { throw new Error('Server tidak merespons. Periksa koneksi internet.'); }
  if (!j.ok) throw new Error(j.error || 'Gagal memuat.');
  return j.data;
}

type Ctx = { hk: string; ta: string; sem: number; halaqah: { key: string; label: string }[] };
const st: any = { open: false, ctx: null as Ctx | null, list: [] as any[], current: '', sel: new Set<string>(), logo: '', pending: new Map<string, any>(), saving: 0, timer: 0, loading: false, last: null as Ctx | null };
/** Sama dengan normalisasi editor rapor Mutabaah. */
const rapi = (r: any) => ({
  ...r, riwayat: r.riwayat || [], murajaah: r.murajaah || { baris: 0, rata: null, n: 0, halaman: 0, predikat: '' },
  tahsin: r.tahsin || { lulus: r.iqro_lulus ?? null, wajib: !!r.target?.iqro, materi: '', sumber: '' },
  rekap: { murajaah: '0', ...(r.rekap || {}) }, rekap_auto: { murajaah: '0', ...(r.rekap_auto || {}) },
  ujian: { kkm: 75, ...(r.ujian || {}) }, absen: { sakit: '', izin: '', alpa: '', otomatis: {}, ...(r.absen || {}) },
});
const REKAP: [string, string][] = [['hafalan_awal', 'Hafalan awal (juz)'], ['ziyadah', 'Ziyadah semester (hlm)'], ['total', 'Total hafalan (juz)'], ['murajaah', 'Total murajaah (hlm)'], ['target_semester', 'Target semester (juz)'], ['capaian', 'Capaian target']];
const byId = (id: string) => st.list.find((r: any) => r.santri.id === id);
const lengkap = (r: any) => { const n = r.aspek.filter((a: any) => a.predikat).length + (r.ujian.nilai != null ? 1 : 0) + (r.catatan ? 1 : 0); return Math.round((n / 8) * 100); };
const bolehPred = (key: string) => (key === 'tahfidz' ? PREDIKAT_TAHFIDZ : PREDIKAT) as readonly string[];

function toast(msg: string, err = false) {
  const t = document.createElement('div'); t.className = 'mrp-toast' + (err ? ' err' : ''); t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.append(t); setTimeout(() => t.remove(), 3200);
}

/* ---------- Konteks dari halaman Rapor semester Mutabaah ---------- */
function readCtx(): Ctx | null {
  const ps = $<HTMLSelectElement>('select[aria-label="Periode"]'), hs = $<HTMLSelectElement>('select[aria-label="Halaqah"]');
  if (!ps || !hs || !hs.value) return null;
  const [ta, s] = ps.value.split('|');
  return { hk: hs.value, ta, sem: Number(s) || 1, halaqah: [...hs.options].map((o) => ({ key: o.value, label: o.textContent || o.value })) };
}
function onRaporPage() { return !!$('select[aria-label="Halaqah"]') && $$('h2').some((h) => h.textContent?.trim() === 'Rapor semester'); }
function editorName(): string | null {
  // Editor rapor satu santri Mutabaah: tombol Pratinjau + PDF + Simpan di bilah bawah, nama santri pada judul.
  if (!$$('button').some((b) => b.textContent?.trim() === 'Pratinjau')) return null;
  const h = $$('h1,h2').find((x) => x.textContent && x.textContent === x.textContent.toUpperCase() && x.textContent.trim().length > 2);
  return h ? h.textContent!.trim() : null;
}

function inject() {
  if (onRaporPage()) {
    st.last = readCtx() || st.last;
    const cetak = $$('button').find((b) => b.textContent?.includes('Cetak 1 halaqah'));
    if (cetak && !$('#mrp-open')) {
      const b = document.createElement('button'); b.id = 'mrp-open'; b.type = 'button'; b.className = cetak.className.replace(/\bbg-\S+/g, '') + ' mrp-entry';
      b.innerHTML = `${IC.edit}Pratinjau &amp; edit`; b.title = 'Rapor F4 seperti hasil cetak; klik nilai atau catatan untuk mengubah';
      b.addEventListener('click', () => openEditor(readCtx()));
      cetak.before(b);
    }
  }
  const nm = editorName();
  if (nm && st.last) {
    const pv = $$('button').find((b) => b.textContent?.trim() === 'Pratinjau');
    if (pv && !$('#mrp-open2')) {
      const b = document.createElement('button'); b.id = 'mrp-open2'; b.type = 'button'; b.className = pv.className + ' mrp-entry2';
      b.innerHTML = `${IC.edit}Pratinjau &amp; edit`;
      b.addEventListener('click', () => openEditor(st.last, nm));
      pv.before(b);
    }
  }
}
let queued = 0;
new MutationObserver(() => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; inject(); }); }).observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject, { once: true }); else inject();
document.addEventListener('change', (e) => { const t = e.target as HTMLElement; if (t.matches?.('select[aria-label="Periode"],select[aria-label="Halaqah"]')) st.last = readCtx(); }, true);

/* ---------- Lapisan editor ---------- */
async function openEditor(ctx: Ctx | null, nama?: string) {
  if (!ctx) { toast('Pilih halaqah terlebih dahulu.', true); return; }
  st.ctx = { ...ctx }; st.open = true; st.sel = new Set(); st.current = '';
  if (!$('#mrp-style')) document.head.insertAdjacentHTML('beforeend', `<style id="mrp-style">${RAPOR_CSS}</style>`);
  if (!st.logo) fetch('/logo-mark.png').then((r) => r.blob()).then((b) => new Promise<string>((ok) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.readAsDataURL(b); })).then((u) => { st.logo = u; draw(); }).catch(() => {});
  document.documentElement.classList.add('mrp-lock');
  await load(nama);
}
async function load(nama?: string) {
  shell('<div class="mrp-loading"><span></span>Memuat rapor…</div>');
  try {
    const d = await rpc('getRaporHalaqah', st.ctx.hk, st.ctx.ta, st.ctx.sem);
    st.list = (d.santri || []).map(rapi);
    const hit = nama && st.list.find((r: any) => String(r.santri.nama).toUpperCase() === nama.toUpperCase());
    st.current = hit ? hit.santri.id : st.list[0]?.santri.id || '';
    render();
  } catch (e: any) { shell(`<div class="mrp-empty"><b>Rapor belum dapat dimuat.</b><p>${esc(e.message)}</p><button class="mrp-btn primary" data-a="reload">Coba lagi</button></div>`); }
}
function shell(body: string) {
  let root = $('#mrp');
  if (!root) { root = document.createElement('div'); root.id = 'mrp'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Pratinjau dan edit rapor'); document.body.append(root); }
  const c = st.ctx as Ctx;
  const pOpt = (() => { const [y] = c.ta.split('/').map(Number); const out: string[] = []; for (const a of [y - 1, y, y + 1]) for (const s of [1, 2]) out.push(`<option value="${a}/${a + 1}|${s}" ${`${a}/${a + 1}` === c.ta && s === c.sem ? 'selected' : ''}>${a}/${a + 1} · Semester ${s} (${s === 1 ? 'Ganjil' : 'Genap'})</option>`); return out.join(''); })();
  root.innerHTML = `<header class="mrp-head"><div class="mrp-title"><small>Rapor Al-Qur'an</small><b>Pratinjau &amp; edit</b></div>
    <select data-a="periode" aria-label="Periode">${pOpt}</select>
    <select data-a="halaqah" aria-label="Halaqah">${c.halaqah.map((h) => `<option value="${esc(h.key)}" ${h.key === c.hk ? 'selected' : ''}>${esc(h.label)}</option>`).join('')}</select>
    <span class="mrp-grow"></span><button class="mrp-btn" data-a="close">${IC.x}Tutup</button></header><div class="mrp-body">${body}</div>`;
  saveBar();
}
function render() {
  if (!st.list.length) { shell('<div class="mrp-empty"><b>Belum ada santri pada halaqah ini.</b></div>'); return; }
  const n = st.sel.size;
  const items = st.list.map((r: any) => { const p = lengkap(r); return `<li class="${r.santri.id === st.current ? 'on' : ''}"><label class="mrp-chk"><input type="checkbox" data-a="sel" data-id="${esc(r.santri.id)}" ${st.sel.has(r.santri.id) ? 'checked' : ''}><span class="mrp-sr">Pilih ${esc(r.santri.nama)}</span></label>
    <button data-a="cur" data-id="${esc(r.santri.id)}"><b>${esc(r.santri.nama)}</b><span class="mrp-meter"><i style="width:${p}%"></i></span><small>${p}% lengkap${st.pending.has(r.santri.id) ? ' · belum disimpan' : ''}</small></button></li>`; }).join('');
  shell(`<div class="mrp-layout"><aside class="mrp-list"><div class="mrp-list-head"><label class="mrp-chk"><input type="checkbox" data-a="selall" ${n && n === st.list.length ? 'checked' : ''}><span>Pilih semua</span></label><small>${n} dipilih</small></div><ul>${items}</ul></aside>
    <section class="mrp-preview"><div class="mrp-actions"><span class="mrp-muted">F4 · 215 × 330 mm · 1 lembar</span><span class="mrp-grow"></span>
      <button class="mrp-btn" data-a="print1">${IC.print}Cetak santri ini</button><button class="mrp-btn" data-a="pdf1">${IC.pdf}PDF santri ini</button>
      <button class="mrp-btn primary" data-a="printsel" ${n ? '' : 'disabled'}>${IC.print}Cetak ${n || ''} terpilih</button><button class="mrp-btn primary" data-a="pdfsel" ${n ? '' : 'disabled'}>${IC.pdf}PDF ${n || ''} terpilih</button></div>
      <p class="mrp-muted mrp-tip">Klik nilai, catatan, kelas, kamar, tanggal, ujian, tahsin (termasuk jalur santri &amp; Iqro'), atau ketidakhadiran pada rapor untuk mengubahnya. Perubahan tersimpan otomatis ke Mutabaah. Teks hijau = otomatis dari aplikasi.</p>
      <div class="mrp-scroll"><div id="mrp-preview"></div></div></section></div>`);
  draw();
}
function draw() {
  const box = $('#mrp-preview'); if (!box) return;
  const r = byId(st.current); if (!r) { box.innerHTML = ''; return; }
  box.innerHTML = raporHTML(r, st.logo, true);
  const pg = $<HTMLElement>('.rt-page', box); if (pg) fitPage(pg);
  const sc = $<HTMLElement>('.mrp-scroll'); if (sc && pg) { const k = Math.min(1, (sc.clientWidth - 10) / pg.offsetWidth); box.style.transform = `scale(${k})`; box.style.height = pg.offsetHeight * k + 'px'; }
}
async function close() {
  await flush();
  $('#mrp')?.remove(); $('#mrp-save')?.remove(); $('.mrp-pop')?.remove();
  document.documentElement.classList.remove('mrp-lock'); st.open = false;
  // Muat ulang daftar Mutabaah agar nilai baru tampil: pilih ulang halaqah yang sama.
  const hs = $<HTMLSelectElement>('select[aria-label="Halaqah"]');
  if (hs) { const v = hs.value; const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!; const other = [...hs.options].find((o) => o.value !== v); if (other) { setter.call(hs, other.value); hs.dispatchEvent(new Event('change', { bubbles: true })); setter.call(hs, v); hs.dispatchEvent(new Event('change', { bubbles: true })); } }
}

/* ---------- Ubah & simpan (format sama dengan editor rapor Mutabaah) ---------- */
function queue(id: string, f: (b: any) => void) {
  const b = st.pending.get(id) || { pelengkap: {}, aspek: {} }; f(b); st.pending.set(id, b); saveBar();
  clearTimeout(st.timer); st.timer = setTimeout(flush, 1200) as any;
}
async function flush() {
  if (st.saving || !st.pending.size) return;
  const jobs = [...st.pending]; st.pending.clear(); st.saving = jobs.length; saveBar();
  for (const [id, data] of jobs) {
    try {
      const baru = await rpc('saveRaporSemester', id, st.ctx.ta, st.ctx.sem, data);
      const i = st.list.findIndex((x: any) => x.santri.id === id); if (i >= 0 && baru?.santri) st.list[i] = rapi(baru);
    } catch (e: any) { toast(e.message, true); st.pending.set(id, data); }
    st.saving--; saveBar();
  }
  if (st.open) { draw(); $$('#mrp .mrp-list li').forEach((li) => { const id = li.querySelector('[data-a=cur]')?.getAttribute('data-id') || ''; const r = byId(id); const s = li.querySelector('small'); if (r && s) s.textContent = `${lengkap(r)}% lengkap${st.pending.has(id) ? ' · belum disimpan' : ''}`; const m = li.querySelector<HTMLElement>('.mrp-meter i'); if (r && m) m.style.width = lengkap(r) + '%'; }); }
}
function setAspek(r: any, key: string, p: string, ket?: string) {
  const a = r.aspek.find((x: any) => x.key === key);
  a.predikat = p; a.otomatis = false;
  if (ket !== undefined) { a.keterangan = ket; a.ket_otomatis = false; } else if (a.ket_otomatis || !a.keterangan) { a.keterangan = p ? INDIKATOR_SINGKAT[key]?.[p] || '' : ''; a.ket_otomatis = true; }
  queue(r.santri.id, (b) => (b.aspek[key] = { p: a.predikat, k: a.keterangan }));
}
function saveBar() {
  let bar = $('#mrp-save');
  if (!st.open) { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'mrp-save'; bar.setAttribute('aria-live', 'polite'); document.body.append(bar); }
  bar.className = st.saving ? 'busy' : st.pending.size ? 'dirty' : 'clean';
  bar.innerHTML = st.saving ? '<span class="mrp-dot"></span>Menyimpan…' : st.pending.size ? `<span class="mrp-dot"></span>${st.pending.size} santri belum disimpan <button data-a="save">Simpan</button>` : `${IC.check}Semua tersimpan`;
}
function popover(target: HTMLElement) {
  const key = target.dataset.edit!; const r = byId(st.current); if (!r) return;
  $('.mrp-pop')?.remove();
  const pop = document.createElement('div'); pop.className = 'mrp-pop'; pop.setAttribute('role', 'dialog');
  const btns = '<div class="mrp-pop-act"><button class="mrp-btn" data-x="batal">Batal</button><button class="mrp-btn accent" data-x="ok">Simpan</button></div>';
  if (key.startsWith('aspek.')) {
    const k = key.slice(6), a = r.aspek.find((x: any) => x.key === k);
    pop.innerHTML = `<b>${esc(a.label)}</b><div class="mrp-choice">${bolehPred(k).map((p) => `<button type="button" data-p="${p}" class="${a.predikat === p ? 'on' : ''}">${p}</button>`).join('')}</div>
      <label>Catatan singkat<textarea rows="3" maxlength="200">${esc(a.keterangan)}</textarea></label><div class="mrp-pop-act"><button class="mrp-btn" data-x="kosong">Kosongkan</button><span class="mrp-grow"></span><button class="mrp-btn" data-x="batal">Batal</button><button class="mrp-btn accent" data-x="ok">Simpan</button></div>`;
  } else if (key === 'catatan') pop.innerHTML = `<b>Catatan pembinaan</b><textarea rows="7" maxlength="1000">${esc(r.catatan)}</textarea><button type="button" class="mrp-btn ghost" data-x="auto">Susun otomatis dari nilai</button>${btns}`;
  else if (key === 'absen') pop.innerHTML = `<b>Ketidakhadiran</b><div class="mrp-trio">${['sakit', 'izin', 'alpa'].map((k) => `<label>${k[0].toUpperCase() + k.slice(1)}<input inputmode="numeric" data-k="${k}" value="${esc(r.absen[k])}"><small>otomatis ${esc(r.absen.otomatis?.[k] ?? '')}</small></label>`).join('')}</div>${btns}`;
  else if (key === 'ujian') pop.innerHTML = `<b>Nilai ujian manual (0–100)</b><p class="mrp-muted">Belum ada ujian final di menu Ujian Semester. Isi bila santri diuji di luar aplikasi.</p><input inputmode="decimal" value="${esc(r.ujian_manual)}">${btns}`;
  else if (key === 'tahsin') {
    // Jalur santri & blok Iqro'/Tahsin klasikal (Draf Revisi Panduan Rapor Al-Qur'an 2026/2027).
    const th = r.tahsin, bawaan = !!th.bawaan, iq = r.iqro || {};
    pop.classList.add('mrp-pop-wide');
    pop.innerHTML = `<b>Jalur & tahsin / Iqro'</b>
      <label>Jalur santri<select data-k="jalur">${JALUR.map((j) => `<option value="${j.id}" ${r.jalur === j.id ? 'selected' : ''}>${j.label}</option>`).join('')}</select></label>
      <p class="mrp-muted mrp-small">Fokus Tahsin/Talaqqi: ziyadah kosong tidak otomatis C, predikat tahfidz dari ketuntasan tahsin. Fokus Sertifikasi: predikat dari capaian murajaah (5 hlm/pekan) dan sertifikasi.</p>
      <label class="mrp-check"><input type="checkbox" data-k="aktif" ${th.aktif ? 'checked' : ''} ${bawaan ? 'disabled' : ''}> Masih tahap Tahsin/Iqro' ${bawaan ? '<small>(otomatis aktif untuk kelas 7 &amp; 10)</small>' : '<small>(centang untuk kelas 8, 9, 11, 12 yang masih tahsin)</small>'}</label>
      <div class="mrp-iqro" ${th.aktif ? '' : 'hidden'}><small class="mrp-muted">Penilaian Iqro'/Tahsin klasikal (hal. 15–54) · ${th.tuntas || 0}/${th.total || IQRO_TOPIK.length} tuntas (B ke atas)</small>
        ${IQRO_TOPIK.map((t) => `<div class="mrp-iq-row"><span>${esc(t.tema)} <small>hal. ${t.hal}</small></span><span class="mrp-iq-p" data-topik="${t.id}">${PREDIKAT.map((p) => `<button type="button" data-iq="${p}" class="${iq[t.id]?.p === p ? 'on' : ''}">${p}</button>`).join('')}</span></div>`).join('')}</div>
      <label>Status lulus tahsin / Iqro'<select data-k="lulus"><option value="">Belum ada hasil</option><option value="1" ${r.iqro_lulus === true ? 'selected' : ''}>Lulus</option><option value="0" ${r.iqro_lulus === false ? 'selected' : ''}>Belum lulus</option></select></label>
      <label>Materi terakhir<input data-k="materi" maxlength="60" value="${esc(th.materi)}"></label>${btns}`;
    pop.addEventListener('change', (ev) => { const t = ev.target as HTMLElement; if ((t as HTMLInputElement).dataset.k === 'aktif' || (t as HTMLSelectElement).dataset.k === 'jalur') { const on = bawaan || (pop.querySelector('[data-k=aktif]') as HTMLInputElement).checked || (pop.querySelector('[data-k=jalur]') as HTMLSelectElement).value === 'tahsin'; (pop.querySelector('.mrp-iqro') as HTMLElement).hidden = !on; } });
  }
  else if (key === 'kelas' || key === 'kamar') pop.innerHTML = `<b>${key === 'kelas' ? 'Kelas' : 'Kamar'}</b><input maxlength="${key === 'kelas' ? 12 : 40}" value="${esc(r.identitas[key])}">${btns}`;
  else if (key === 'rekap') pop.innerHTML = `<b>Ringkasan capaian</b><p class="mrp-muted">Otomatis dari setoran & sertifikasi; ubah bila perlu. Kosongkan untuk kembali ke nilai otomatis.</p><div class="mrp-duo">${REKAP.map(([k, l]) => `<label>${l}<input data-k="${k}" value="${esc(r.rekap[k])}" ${k === 'capaian' ? 'maxlength="30"' : 'inputmode="decimal" maxlength="8"'}><small>otomatis ${esc(r.rekap_auto?.[k] ?? '')}</small></label>`).join('')}</div>${btns}`;
  else if (key === 'tanggal') pop.innerHTML = `<b>Tanggal rapor</b><input type="date" value="${esc(r.ttd.tanggal)}">${btns}`;
  else return;
  document.body.append(pop);
  const b = target.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, b.left + b.width / 2 - pop.offsetWidth / 2)) + 'px';
  pop.style.top = Math.max(8, Math.min(innerHeight - pop.offsetHeight - 8, b.bottom + 8)) + 'px';
  (pop.querySelector('textarea,input,select,button') as HTMLElement)?.focus();
  let pred: string | null = null;
  const done = () => pop.remove();
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(); } });
  pop.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('button') as HTMLElement | null; if (!t) return;
    const k = key.slice(6), ta = pop.querySelector('textarea') as HTMLTextAreaElement | null;
    if (t.dataset.iq !== undefined) { const row = t.parentElement!; const was = t.classList.contains('on'); $$('button', row).forEach((x) => x.classList.remove('on')); if (!was) t.classList.add('on'); return; }
    if (t.dataset.p !== undefined) { pred = t.dataset.p; $$('.mrp-choice button', pop).forEach((x) => x.classList.toggle('on', x === t)); const a = r.aspek.find((x: any) => x.key === k); if (ta && (a.ket_otomatis || !ta.value)) ta.value = INDIKATOR_SINGKAT[k]?.[pred] || ''; return; }
    if (t.dataset.x === 'batal') return done();
    if (t.dataset.x === 'kosong') { pred = ''; $$('.mrp-choice button', pop).forEach((x) => x.classList.remove('on')); if (ta) ta.value = ''; return; }
    if (t.dataset.x === 'auto' && ta) { const p = Object.fromEntries(r.aspek.map((a: any) => [a.key, a.predikat])); ta.value = narasiCatatan(p, r.santri.gender, { ziyadah_hal: Number(String(r.rekap.ziyadah).replace(',', '.')) || 0, target_juz: r.target?.semester, murajaah_rata: r.murajaah?.rata, murajaah_n: r.murajaah?.n, ujian: r.ujian.nilai }); return; }
    if (t.dataset.x !== 'ok') return;
    const id = r.santri.id;
    if (key.startsWith('aspek.')) { const a = r.aspek.find((x: any) => x.key === k); const ket = ta!.value; setAspek(r, k, pred ?? a.predikat, ket !== a.keterangan ? ket : undefined); }
    else if (key === 'catatan') { r.catatan = ta!.value; r.catatan_otomatis = false; queue(id, (x) => (x.catatan = r.catatan)); }
    else if (key === 'absen') { const v: any = {}; $$<HTMLInputElement>('input', pop).forEach((x) => (v[x.dataset.k!] = x.value.replace(/\D/g, ''))); Object.assign(r.absen, v); queue(id, (x) => (x.pelengkap.absen = { sakit: r.absen.sakit, izin: r.absen.izin, alpa: r.absen.alpa })); }
    else if (key === 'ujian') { const v = (pop.querySelector('input') as HTMLInputElement).value.trim(); const n = Number(v.replace(',', '.')); if (v && !(n >= 0 && n <= 100)) { toast('Nilai ujian 0–100.', true); return; } r.ujian_manual = v; queue(id, (x) => (x.pelengkap.ujian_manual = v)); }
    else if (key === 'tahsin') {
      const s = (pop.querySelector('[data-k=lulus]') as HTMLSelectElement).value; r.iqro_lulus = s === '' ? null : s === '1'; r.tahsin.lulus = r.iqro_lulus; r.tahsin.materi = (pop.querySelector('[data-k=materi]') as HTMLInputElement).value;
      const jalur = (pop.querySelector('[data-k=jalur]') as HTMLSelectElement).value, aktif = (pop.querySelector('[data-k=aktif]') as HTMLInputElement).checked;
      const iqro: Record<string, { p: string; k: string }> = {}; $$('[data-topik]', pop).forEach((row) => { const on = row.querySelector('button.on') as HTMLElement | null; if (on) iqro[row.dataset.topik!] = { p: on.dataset.iq!, k: r.iqro?.[row.dataset.topik!]?.k || '' }; });
      r.jalur = jalur; r.iqro = iqro;
      queue(id, (x) => { x.pelengkap.iqro_lulus = r.iqro_lulus; x.pelengkap.tahsin_materi = r.tahsin.materi; x.pelengkap.jalur = jalur; if (!r.tahsin.bawaan) x.pelengkap.tahsin_aktif = aktif; x.pelengkap.iqro = iqro; });
    }
    else if (key === 'kelas' || key === 'kamar') { r.identitas[key] = (pop.querySelector('input') as HTMLInputElement).value; queue(id, (x) => (x.pelengkap[key] = r.identitas[key])); }
    else if (key === 'rekap') { const rk: any = {}; $$<HTMLInputElement>('input', pop).forEach((x) => { const k2 = x.dataset.k!; const v = x.value.trim() || String(r.rekap_auto?.[k2] ?? ''); if (v !== String(r.rekap[k2] ?? '')) { rk[k2] = v; r.rekap[k2] = v; } }); if (Object.keys(rk).length) queue(id, (x) => (x.pelengkap.rekap = { ...(x.pelengkap.rekap || {}), ...rk })); }
    else if (key === 'tanggal') { r.ttd.tanggal = (pop.querySelector('input') as HTMLInputElement).value; queue(id, (x) => (x.pelengkap.tanggal = r.ttd.tanggal)); }
    done(); draw();
  });
  setTimeout(() => document.addEventListener('pointerdown', function out(ev) { if (!pop.contains(ev.target as Node)) { pop.remove(); document.removeEventListener('pointerdown', out); } }), 0);
}

/* ---------- Cetak & PDF ---------- */
const pagesHTML = (ids: string[]) => ids.map((id) => raporHTML(byId(id), st.logo, false)).join('');
async function printPages(ids: string[]) {
  await flush();
  $('#mrp-print')?.remove();
  const host = document.createElement('div'); host.id = 'mrp-print';
  host.innerHTML = `<style>@page{size:215mm 330mm;margin:0}</style>` + pagesHTML(ids);
  document.body.append(host); $$<HTMLElement>('.rt-page', host).forEach(fitPage);
  const fin = () => { host.remove(); removeEventListener('afterprint', fin); }; addEventListener('afterprint', fin);
  document.fonts.ready.then(() => setTimeout(() => print(), 80));
}
async function pdf(ids: string[]) {
  await flush();
  const host = document.createElement('div'); host.className = 'mrp-offscreen'; host.innerHTML = pagesHTML(ids); document.body.append(host);
  const bar = document.createElement('div'); bar.className = 'mrp-toast'; bar.setAttribute('role', 'status'); document.body.append(bar);
  try {
    await document.fonts.ready; $$<HTMLElement>('.rt-page', host).forEach(fitPage);
    const h = st.ctx.halaqah.find((x: any) => x.key === st.ctx.hk);
    const nama = ids.length === 1 ? `Rapor Al-Qur'an ${byId(ids[0]).santri.nama} ${st.ctx.ta.replace('/', '-')} S${st.ctx.sem}` : `Rapor Al-Qur'an ${h ? h.label.replace(/\s*\(\d+\)$/, '') : 'Halaqah'} ${st.ctx.ta.replace('/', '-')} S${st.ctx.sem}`;
    await unduhPdf($$<HTMLElement>('.rt-page', host), SIZE, RAPOR_CSS, nama, (i, n) => { bar.textContent = `Menyusun PDF ${i + 1} dari ${n}…`; });
    bar.textContent = 'PDF siap diunduh.';
  } catch { bar.textContent = 'Browser belum bisa menyusun PDF langsung. Membuka dialog cetak: pilih "Simpan sebagai PDF".'; printPages(ids); }
  finally { host.remove(); setTimeout(() => bar.remove(), 2600); }
}

/* ---------- Peristiwa ---------- */
document.addEventListener('click', (e) => {
  if (!st.open) return;
  const ed = (e.target as HTMLElement).closest<HTMLElement>('#mrp-preview [data-edit]'); if (ed) { popover(ed); return; }
  const t = (e.target as HTMLElement).closest<HTMLElement>('#mrp [data-a], #mrp-save [data-a]'); if (!t) return;
  const a = t.dataset.a, sel = () => st.list.filter((r: any) => st.sel.has(r.santri.id)).map((r: any) => r.santri.id);
  if (a === 'close') close();
  else if (a === 'reload') load();
  else if (a === 'save') flush();
  else if (a === 'cur') { st.current = t.dataset.id; $$('#mrp .mrp-list li').forEach((li) => li.classList.toggle('on', !!li.querySelector(`[data-id="${CSS.escape(st.current)}"]`))); draw(); }
  else if (a === 'print1') printPages([st.current]);
  else if (a === 'pdf1') pdf([st.current]);
  else if (a === 'printsel') printPages(sel());
  else if (a === 'pdfsel') pdf(sel());
});
document.addEventListener('change', async (e) => {
  if (!st.open) return;
  const t = e.target as HTMLInputElement; const a = t.dataset?.a; if (!a || !t.closest('#mrp')) return;
  if (a === 'sel') { t.checked ? st.sel.add(t.dataset.id) : st.sel.delete(t.dataset.id); render(); }
  else if (a === 'selall') { st.sel = t.checked ? new Set(st.list.map((r: any) => r.santri.id)) : new Set(); render(); }
  else if (a === 'periode' || a === 'halaqah') { await flush(); if (a === 'halaqah') st.ctx.hk = t.value; else { const [ta, s] = t.value.split('|'); st.ctx.ta = ta; st.ctx.sem = Number(s); } st.sel = new Set(); load(); }
});
document.addEventListener('keydown', (e) => {
  if (!st.open) return;
  const t = e.target as HTMLElement;
  if ((e.key === 'Enter' || e.key === ' ') && t.dataset?.edit && t.closest('#mrp-preview')) { e.preventDefault(); popover(t); }
  else if (e.key === 'Escape' && !$('.mrp-pop')) close();
});
addEventListener('resize', () => st.open && draw());
addEventListener('beforeunload', (e) => { if (st.pending.size) { flush(); e.preventDefault(); } });
