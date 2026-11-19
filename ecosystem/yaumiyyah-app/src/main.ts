// Mutabaah Yaumiyyah — catatan ibadah & kebiasaan harian santri (desain Mutabaah). Data tetap di yaumiyyah.daily.
import { activities, monthlyReport, semesterReport, semesterMonths, todayWIB, Entry } from '../../../src/yaumiyyah/model';
import { unduhPdf } from '../../shared/pdf';
import { shell, $, $$, esc, icon, I, toast, apiOf, token, needLogin, loading, empty, appsMenu, sessionEnded, unitLabel } from '../../shared/ui';

const api = apiOf('https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/rapor-pesantren/');
const today = todayWIB();
const st: any = { user: null, students: [], sid: '', view: 'harian', date: today, month: today.slice(0, 7), period: 'month', year: Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 7 ? 1 : 0), sem: Number(today.slice(5, 7)) >= 7 ? 1 : 2, entries: [] as Entry[], draft: null as Entry | null, dirty: false, busy: false, q: '', loading: true, logo: '' };
const app = document.getElementById('app')!;
const fresh = (date: string): Entry => ({ date, values: {}, excused: [], note: '' });
const student = () => st.students.find((s: any) => s.id === st.sid);
const months = () => (st.view !== 'harian' && st.period === 'semester' ? semesterMonths(st.year, st.sem) : [st.view === 'harian' ? st.date.slice(0, 7) : st.month]);
const monthLabel = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const peran = () => (st.user?.admin ? 'Pimpinan · semua santri' : st.user?.koordinator?.length ? `Koordinator ${st.user.koordinator.map(unitLabel).join(', ')}` : 'Musyrif/ah');
const predClass = (p: string) => (p === 'A+' || p === 'A' ? 'a' : p === 'B+' ? 'bp' : p === 'B' ? 'b' : p === 'C' ? 'c' : 'none');

function render() {
  const title = { harian: 'Catatan harian', rekap: 'Rekap', rapor: 'Rapor PDF' }[st.view as string] || '';
  const nav = [{ id: 'harian', label: 'Catatan harian', icon: I.edit }, { id: 'rekap', label: 'Rekap', icon: I.chart }, { id: 'rapor', label: 'Rapor PDF', icon: I.pdf }];
  app.innerHTML = shell({ app: 'Mutabaah Yaumiyyah', title, nav, active: st.view, user: st.user && { nama: st.user.nama, peran: peran() } }, body());
}
function picker() {
  const q = st.q.toLowerCase();
  const list = st.students.filter((s: any) => !q || `${s.nama} ${s.unit} ${s.kelas} ${s.kamar} ${s.halaqah}`.toLowerCase().includes(q));
  const s = student();
  return `<section class="ns-card yw-pick"><div class="ns-filters" style="margin:0"><label class="ns-field">Cari santri<input type="search" data-act="q" value="${esc(st.q)}" placeholder="Nama, kelas, kamar, atau unit"></label>
    <label class="ns-field">Santri<select data-act="sid">${s && !list.includes(s) ? `<option value="${esc(s.id)}">${esc(s.nama)}</option>` : ''}${list.slice(0, 600).map((x: any) => `<option value="${esc(x.id)}" ${x.id === st.sid ? 'selected' : ''}>${esc(x.nama)} · ${esc(x.kelas)} · ${esc(unitLabel(x.unit))}${x.kamar ? ' · ' + esc(x.kamar) : ''}</option>`).join('')}</select></label></div>
    ${s ? `<p class="ns-muted yw-who">${esc(unitLabel(s.unit))} · Kelas ${esc(s.kelas)}${s.kamar ? ` · Kamar ${esc(s.kamar)}` : ''} · Musyrif/ah: ${esc(s.musyrif || '–')}</p>` : ''}</section>`;
}
function body() {
  if (st.loading && !st.students.length) return loading();
  if (!st.students.length) return empty('Belum ada santri binaan.', 'Akun ini belum memegang santri, kamar, atau unit. Hubungi pimpinan melalui Mutabaah Tahfidz.');
  return `<section class="ns-hero anim-rise"><div><p class="ns-eyebrow">Kepesantrenan Nuris</p><h2>Kebiasaan baik, dicatat setiap hari.</h2><p>15 aktivitas dari buku mutabaah. Isian tersimpan per tanggal; rekap dan rapor dihitung otomatis.</p></div>${heroScore()}</section>
    ${picker()}${st.loading ? loading() : st.view === 'harian' ? harian() : st.view === 'rekap' ? rekap() : rapor()}`;
}
function heroScore() {
  if (st.loading || !st.entries) return '';
  const r = monthlyReport(st.date.slice(0, 7), st.entries);
  return `<div class="ns-kpi"><div><strong>${r.score == null ? '–' : r.score.toFixed(0)}</strong><span>skor ${monthLabel(st.date.slice(0, 7)).split(' ')[0]}</span></div><div><strong class="acc">${r.predikat}</strong><span>predikat</span></div><div><strong>${r.coverage}%</strong><span>terisi</span></div></div>`;
}
function harian() {
  const d = st.draft || fresh(st.date);
  const cards = activities.map((a, i) => {
    const ex = d.excused.includes(a.id), v = d.values[a.id];
    const bin = a.max === 1;
    const ctrl = ex ? '<span class="ns-pill none">Izin / udzur</span>' : bin
      ? `<div class="ns-seg yw-bin"><button type="button" data-v="${a.id}" data-n="1" aria-selected="${v === 1}">Ya</button><button type="button" data-v="${a.id}" data-n="0" aria-selected="${v === 0}">Tidak</button></div>`
      : `<div class="yw-step"><button type="button" data-step="${a.id}" data-d="-1" aria-label="Kurangi">−</button><input inputmode="numeric" data-val="${a.id}" value="${v ?? ''}" placeholder="–" aria-label="${esc(a.name)}"><button type="button" data-step="${a.id}" data-d="1" aria-label="Tambah">+</button><small>${esc(a.unit)}</small></div>`;
    return `<article class="yw-act${ex ? ' ex' : ''}"><header><span class="yw-no">${String(i + 1).padStart(2, '0')}</span><div><b>${esc(a.name)}</b><small>Target ${esc(a.label)}</small></div></header>
      <div class="yw-row">${ctrl}<label class="yw-ex"><input type="checkbox" data-ex="${a.id}" ${ex ? 'checked' : ''}>Izin</label></div></article>`;
  }).join('');
  return `<div class="ns-section-title"><label class="ns-field" style="flex-direction:row;align-items:center;gap:8px">Tanggal (WIB)<input type="date" data-act="date" value="${st.date}" max="${today}" style="width:auto"></label>
    <span class="ns-muted">Isi jumlah sebenarnya. 0 = belum terlaksana, kosong = belum dicatat.</span></div>
    <div class="yw-grid">${cards}</div>
    <label class="ns-field" style="margin-top:12px">Catatan (opsional)<textarea rows="2" maxlength="2000" data-act="note">${esc(d.note || '')}</textarea></label>
    <div class="yw-savebar ${st.dirty ? 'dirty' : ''}"><span>${st.dirty ? 'Ada isian belum disimpan' : d.version ? 'Catatan tanggal ini tersimpan' : 'Belum ada catatan untuk tanggal ini'}</span><button class="ns-btn primary" data-act="save" ${st.busy ? 'disabled' : ''}>${icon(I.check, 16)}Simpan catatan</button></div>`;
}
function periodBar() {
  const yOpts = [st.year - 1, st.year, st.year + 1].map((y) => `<option value="${y}" ${y === st.year ? 'selected' : ''}>${y}/${y + 1}</option>`).join('');
  return `<div class="ns-section-title"><div class="ns-seg" role="tablist" data-nuris-glass><button role="tab" aria-selected="${st.period === 'month'}" data-act="period" data-v="month">Bulanan</button><button role="tab" aria-selected="${st.period === 'semester'}" data-act="period" data-v="semester">Semester</button></div>
    ${st.period === 'month' ? `<input type="month" data-act="month" value="${st.month}" class="yw-in">` : `<span><select data-act="year" class="yw-in">${yOpts}</select> <select data-act="semx" class="yw-in"><option value="1" ${st.sem === 1 ? 'selected' : ''}>Ganjil (Jul–Des)</option><option value="2" ${st.sem === 2 ? 'selected' : ''}>Genap (Jan–Jun)</option></select></span>`}</div>`;
}
function report() { const m = months(); return m.length > 1 ? semesterReport(m, st.entries) : monthlyReport(m[0], st.entries); }
function rekap() {
  const r: any = report(), m = months(), sem = m.length > 1;
  const rows = r.rows.map((x: any) => `<tr><td><b>${esc(x.name)}</b><small>Target ${esc(x.label)}</small></td>${sem ? x.months.map((v: any) => `<td class="tabular">${v == null ? '–' : Math.round(v)}</td>`).join('') : `<td class="tabular">${x.observed}/${x.eligible}</td><td class="tabular">${x.actual}</td>`}<td class="tabular"><b>${x.score == null ? '–' : x.score.toFixed(1).replace('.', ',')}</b></td><td><span class="ns-pill ${predClass(x.predikat)}">${x.predikat}</span></td></tr>`).join('');
  return `${periodBar()}<div class="ns-stats"><div class="ns-stat"><strong>${r.score == null ? '–' : r.score.toFixed(2).replace('.', ',')}</strong><span>nilai rata-rata</span></div><div class="ns-stat acc"><strong>${r.predikat}</strong><span>predikat</span></div><div class="ns-stat"><strong>${r.observed}/${r.eligible}</strong><span>isian dinilai</span></div><div class="ns-stat"><strong>${r.provisional ? 'Sementara' : 'Lengkap'}</strong><span>status data</span></div></div>
    <div class="ns-table-wrap"><table class="ns-table"><thead><tr><th>Aktivitas</th>${sem ? m.map((x) => `<th>${monthLabel(x).split(' ')[0].slice(0, 3)}</th>`).join('') : '<th>Hari terisi</th><th>Jumlah</th>'}<th>Nilai</th><th>Predikat</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="ns-muted" style="font-size:13px">Predikat: A+ ≥ 95 · A ≥ 85 · B+ ≥ 75 · B ≥ 65 · C &lt; 65. Aktivitas yang diizinkan (udzur) tidak dihitung. Isian kosong dihitung 0 pada rerata sementara.</p>`;
}
function raporHTML() {
  const s = student(), r: any = report(), m = months(), sem = m.length > 1;
  const rows = r.rows.map((x: any, i: number) => `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td>${esc(x.label)}</td>${sem ? x.months.map((v: any) => `<td>${v == null ? '–' : Math.round(v)}</td>`).join('') : `<td>${x.observed}/${x.eligible}</td>`}<td><b>${x.score == null ? '–' : x.score.toFixed(1).replace('.', ',')}</b></td><td><b>${x.predikat}</b></td></tr>`).join('');
  const notes = (r.notes || r.reports?.flatMap((x: any) => x.notes) || []).slice(-6);
  return `<article class="yw-page"><header class="yw-kop"><img src="${st.logo}" alt=""><div><h1>PESANTREN NURUL ISLAM TENGARAN</h1><h2>RAPOR MUTABAAH YAUMIYYAH ${sem ? 'SEMESTER' : 'BULANAN'}</h2><p>${sem ? `${monthLabel(m[0])} – ${monthLabel(m[m.length - 1])}` : monthLabel(m[0])}</p></div></header>
  <section class="yw-id"><b>${esc(s.nama)}</b><span>Kelas ${esc(s.kelas)} · ${esc(unitLabel(s.unit))}${s.kamar ? ` · Kamar ${esc(s.kamar)}` : ''} · Musyrif/ah: ${esc(s.musyrif || '-')}</span></section>
  <section class="yw-score"><div><small>NILAI RATA-RATA</small><b>${r.score == null ? 'Belum dinilai' : r.score.toFixed(2).replace('.', ',') + ' / 100'}</b><em>${r.provisional ? 'Rapor sementara' : 'Data lengkap'} · terisi ${r.observed} dari ${r.eligible} isian · batas data ${today}</em></div><strong>${r.predikat}</strong></section>
  <table class="yw-tab"><thead><tr><th>No</th><th>Aktivitas</th><th>Target</th>${sem ? m.map((x) => `<th>${monthLabel(x).split(' ')[0].slice(0, 3)}</th>`).join('') : '<th>Terisi</th>'}<th>Nilai</th><th>Pred.</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="yw-leg">Predikat: A+ ≥ 95 · A ≥ 85 · B+ ≥ 75 · B ≥ 65 · C &lt; 65. Aktivitas berizin/udzur tidak dihitung.</p>
  ${notes.length ? `<section class="yw-notes"><b>Catatan musyrif/ah</b>${notes.map((n: any) => `<p><small>${esc(n.date)}</small> ${esc(n.note)}</p>`).join('')}</section>` : ''}
  <footer class="yw-ttd"><div><p>Orang Tua/Wali</p><p class="yw-nm">……………………………</p></div><div><p>Tengaran, ${new Date(today + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</p><p>Musyrif/ah</p><p class="yw-nm">${esc(s.musyrif || '……………………………')}</p></div></footer></article>`;
}
const RAPOR_CSS = `.yw-page{box-sizing:border-box;width:210mm;height:297mm;padding:13mm 15mm;background:#fff;color:#122219;font-family:NurisJakarta,"Plus Jakarta Sans",Arial,sans-serif;font-size:10pt;line-height:1.3;display:flex;flex-direction:column}
.yw-page *{box-sizing:border-box}.yw-kop{display:flex;gap:12px;align-items:center;border-bottom:2.5px solid #0d4a28;padding-bottom:8px;margin-bottom:10px}.yw-kop img{width:56px;height:56px;object-fit:contain}
.yw-kop h1{margin:0;font-size:1.35em;color:#082e1a}.yw-kop h2{margin:2px 0 0;font-size:1.05em;color:#0d4a28}.yw-kop p{margin:2px 0 0;color:#5e6f65;font-size:.9em}
.yw-id b{display:block;font-size:1.25em}.yw-id span{color:#3c4d43;font-size:.92em}
.yw-score{display:flex;justify-content:space-between;align-items:center;background:#e3f2e8;border-radius:10px;padding:10px 16px;margin:10px 0}.yw-score small{color:#0d4a28;font-weight:700;font-size:.8em}.yw-score b{display:block;font-size:1.6em;color:#082e1a}.yw-score em{font-style:normal;font-size:.8em;color:#5e6f65}.yw-score strong{font-size:2.4em;color:#0d4a28}
.yw-tab{width:100%;border-collapse:collapse;font-size:.92em}.yw-tab th{background:#0d4a28;color:#fff;padding:5px 6px;text-align:left}.yw-tab td{border-bottom:1px solid #d3ded7;padding:5px 6px}.yw-tab td:nth-child(n+4),.yw-tab th:nth-child(n+4){text-align:center}
.yw-leg{font-size:.78em;color:#5e6f65;margin:6px 0}.yw-notes{border:1px solid #d3ded7;border-radius:8px;padding:6px 10px;font-size:.88em}.yw-notes p{margin:3px 0}.yw-notes small{color:#5e6f65}
.yw-ttd{margin-top:auto;display:grid;grid-template-columns:1fr 1fr;text-align:center}.yw-ttd p{margin:0}.yw-nm{margin-top:4em!important;font-weight:700}`;
function rapor() {
  return `${periodBar()}<div class="rt-actions" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap"><button class="ns-btn primary" data-act="pdf">${icon(I.pdf, 16)}Unduh PDF</button><button class="ns-btn" data-act="print">${icon(I.print, 16)}Cetak</button></div>
    <div class="yw-scroll"><div id="preview">${raporHTML()}</div></div>`;
}
function fitPreview() { const sc = $('.yw-scroll'), b = $('#preview'), pg = $('#preview .yw-page'); if (!sc || !b || !pg) return; const k = Math.min(1, (sc.clientWidth - 8) / pg.offsetWidth); b.style.transform = `scale(${k})`; b.style.height = pg.offsetHeight * k + 'px'; }

/* ---------- Data ---------- */
async function load() {
  if (!st.sid) return;
  st.loading = true; render();
  try { const r = await api('yaum-load', { santri_id: st.sid, months: months() }); st.entries = r.entries; st.draft = structuredClone(st.entries.find((e: Entry) => e.date === st.date) || fresh(st.date)); st.dirty = false; }
  catch (e: any) { toast(e.message, 'err'); st.entries = []; }
  st.loading = false; render(); if (st.view === 'rapor') fitPreview();
}
const leave = () => !st.dirty || confirm('Ada isian belum tersimpan. Tinggalkan perubahan?');
async function save() {
  if (!st.draft || st.busy) return; st.busy = true; render();
  try { const r = await api('yaum-save', { santri_id: st.sid, entry: st.draft }); st.entries = [...st.entries.filter((e: Entry) => e.date !== r.entry.date), r.entry]; st.draft = structuredClone(r.entry); st.dirty = false; toast('Catatan tersimpan.'); }
  catch (e: any) { toast(e.message, 'err'); }
  st.busy = false; render();
}
async function boot() {
  if (!token()) { app.innerHTML = shell({ app: 'Mutabaah Yaumiyyah', title: 'Mutabaah Yaumiyyah', nav: [], active: '' }, needLogin('Mutabaah Yaumiyyah')); return; }
  st.view = ['harian', 'rekap', 'rapor'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'harian'; render();
  fetch('/logo-mark.png').then((r) => r.blob()).then((b) => new Promise<string>((ok) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.readAsDataURL(b); })).then((u) => { st.logo = u; if (st.view === 'rapor') render(); }).catch(() => {});
  try {
    const r = await api('yaum-students'); st.user = r.user; st.students = r.students;
    st.sid = sessionStorage.getItem('yw-sid') && st.students.some((s: any) => s.id === sessionStorage.getItem('yw-sid')) ? sessionStorage.getItem('yw-sid') : st.students[0]?.id || '';
    st.loading = false; await load();
  } catch (e: any) {
    if (e.status === 401) sessionEnded();
    app.innerHTML = shell({ app: 'Mutabaah Yaumiyyah', title: 'Mutabaah Yaumiyyah', nav: [], active: '' }, empty(e.status === 401 ? 'Sesi berakhir.' : 'Data belum dapat dimuat.', e.message, '<a class="ns-btn primary" href="/" target="_top">Buka portal</a>'));
  }
}

/* ---------- Peristiwa ---------- */
function setVal(id: string, v: number | null) { const a = activities.find((x) => x.id === id)!; if (v != null) v = Math.max(0, Math.min(a.max, Math.round(v))); st.draft.values[id] = v; st.dirty = true; }
document.addEventListener('click', async (e) => {
  const nv = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
  if (nv) { e.preventDefault(); if (!leave()) return; const old = st.view; st.view = nv.dataset.nav; history.replaceState(null, '', '#' + st.view); if ((old === 'harian') !== (st.view === 'harian') || st.period === 'semester') await load(); else { render(); if (st.view === 'rapor') fitPreview(); } return; }
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-v],[data-step]'); if (!t) return;
  if (t.dataset.v && t.dataset.n) { setVal(t.dataset.v, Number(t.dataset.n)); render(); return; }
  if (t.dataset.step) { const id = t.dataset.step; setVal(id, (st.draft.values[id] ?? 0) + Number(t.dataset.d)); render(); ($(`[data-val="${id}"]`) as HTMLInputElement)?.focus(); return; }
  const a = t.dataset.act;
  if (a === 'apps') appsMenu(t, 'yaumiyyah');
  else if (a === 'save') save();
  else if (a === 'period') { st.period = t.dataset.v; await load(); }
  else if (a === 'pdf' || a === 'print') {
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-10000px;top:0'; host.innerHTML = raporHTML(); document.body.append(host);
    const s = student(); const nama = `Rapor Yaumiyyah ${s.nama} ${months().length > 1 ? `${st.year}-${st.year + 1} S${st.sem}` : st.month}`;
    try { if (a === 'print') throw 0; await document.fonts.ready; await unduhPdf($$('.yw-page', host), { w: 210, h: 297 }, RAPOR_CSS, nama); }
    catch { const w = window.open('', '_blank'); if (w) { w.document.write(`<title>${esc(nama)}</title><style>@page{size:A4;margin:0}body{margin:0}${RAPOR_CSS}</style>${raporHTML()}`); w.document.close(); setTimeout(() => w.print(), 300); } }
    finally { host.remove(); }
  }
});
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.act === 'q') { st.q = t.value; const p = t.selectionStart; render(); const n = $<HTMLInputElement>('[data-act=q]'); n?.focus(); n?.setSelectionRange(p, p); }
  else if (t.dataset.val) { const v = t.value.replace(/\D/g, ''); t.value = v; setVal(t.dataset.val, v === '' ? null : Number(v)); $('.yw-savebar')?.classList.add('dirty'); }
  else if (t.dataset.act === 'note') { st.draft.note = t.value; st.dirty = true; $('.yw-savebar')?.classList.add('dirty'); }
});
document.addEventListener('change', async (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.ex) { const id = t.dataset.ex; const ex = new Set(st.draft.excused); t.checked ? ex.add(id) : ex.delete(id); st.draft.excused = [...ex]; if (t.checked) st.draft.values[id] = null; st.dirty = true; render(); return; }
  const a = t.dataset.act;
  if (a === 'sid') { if (!leave()) { render(); return; } st.sid = t.value; sessionStorage.setItem('yw-sid', st.sid); await load(); }
  else if (a === 'date') { if (!t.value || t.value > today) { toast('Tanggal tidak boleh melewati hari ini.', 'err'); render(); return; } if (!leave()) { render(); return; } const pm = st.date.slice(0, 7); st.date = t.value; if (pm !== st.date.slice(0, 7)) await load(); else { st.draft = structuredClone(st.entries.find((x: Entry) => x.date === st.date) || fresh(st.date)); st.dirty = false; render(); } }
  else if (a === 'month') { st.month = t.value; await load(); }
  else if (a === 'year') { st.year = Number(t.value); await load(); }
  else if (a === 'semx') { st.sem = Number(t.value); await load(); }
});
addEventListener('beforeunload', (e) => { if (st.dirty) e.preventDefault(); });
addEventListener('resize', fitPreview);
document.head.insertAdjacentHTML('beforeend', `<style>${RAPOR_CSS}</style>`);
boot();
