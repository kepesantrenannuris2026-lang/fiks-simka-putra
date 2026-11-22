// Mutabaah Yaumiyyah — 8 ibadah sesuai aspek Ibadah Rapor Pesantren, diisi PER BULAN (jumlah pelaksanaan sebulan).
// Data di yaumiyyah.bulanan; isian harian lama sudah dikonversi. Target & rincian predikat dihitung otomatis per bulan.
import { activities, monthlyReport, semesterReport, semesterMonths, todayWIB, MonthEntry, monthTarget, monthMax, kategori, scoreOf, grade, hadir, daysInMonth, targetLabel, SKALA } from '../../../src/yaumiyyah/model';
import { shell, $, $$, esc, icon, I, toast, apiOf, token, needLogin, loading, empty, appsMenu, sessionEnded, unitLabel } from '../../shared/ui';

const api = apiOf('https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/rapor-pesantren/');
const today = todayWIB(), thisMonth = today.slice(0, 7);
const st: any = { user: null, students: [], sid: '', view: 'isian', month: thisMonth, period: 'month', year: Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 7 ? 1 : 0), sem: Number(today.slice(5, 7)) >= 7 ? 1 : 2, entries: [] as MonthEntry[], draft: null as MonthEntry | null, dirty: false, busy: false, loading: true, logo: '', rincian: false };
const app = document.getElementById('app')!;
const fresh = (month: string): MonthEntry => ({ month, values: {}, izin: 0, note: '' });
const student = () => st.students.find((s: any) => s.id === st.sid);
const months = () => (st.view !== 'isian' && st.period === 'semester' ? semesterMonths(st.year, st.sem) : [st.month]);
const monthLabel = (m: string) => new Date(m + '-01T00:00:00Z').toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const peran = () => (st.user?.admin ? 'Pimpinan · semua santri' : st.user?.koordinator?.length ? `Koordinator ${st.user.koordinator.map(unitLabel).join(', ')}` : 'Musyrif/ah');
const predClass = (p: string) => (p === 'A' ? 'a' : p === 'B+' ? 'bp' : p === 'B' ? 'b' : p === 'C' ? 'c' : 'none');
const fmt = (n: number | null | undefined, d = 1) => (n == null ? '–' : n.toFixed(d).replace('.', ','));

function render() {
  const title = { isian: 'Isian bulanan', rekap: 'Rekap' }[st.view as string] || '';
  const nav = [{ id: 'isian', label: 'Isian bulanan', icon: I.edit }, { id: 'rekap', label: 'Rekap', icon: I.chart }];
  app.innerHTML = shell({ app: 'Mutabaah Yaumiyyah', title, nav, active: st.view, user: st.user && { nama: st.user.nama, peran: peran() } }, body());
}
// Pilih santri: satu kolom yang bisa diketik; daftar nama yang cocok muncul di bawahnya (tanpa kolom "Cari santri" terpisah).
const sLabel = (x: any) => `${x.nama} · ${x.kelas} · ${unitLabel(x.unit)}${x.kamar ? ' · ' + x.kamar : ''}`;
function picker() {
  const s = student();
  return `<section class="ns-card yw-pick"><div class="ns-field yw-combo"><label for="yw-santri">Santri</label>
    <input id="yw-santri" type="text" data-act="sq" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="yw-opts" autocomplete="off" spellcheck="false" value="${esc(s?.nama || '')}" placeholder="Ketik nama santri">
    <div id="yw-opts" class="yw-opts" role="listbox" hidden></div></div>
    ${s ? `<p class="ns-muted yw-who">${esc(unitLabel(s.unit))} · Kelas ${esc(s.kelas)}${s.kamar ? ` · Kamar ${esc(s.kamar)}` : ''} · Musyrif/ah: ${esc(s.musyrif || '–')}</p>` : ''}</section>`;
}
const combo = { hi: 0, list: [] as any[] };
function comboShow(q: string) {
  const box = $('#yw-opts'), inp = $<HTMLInputElement>('#yw-santri'); if (!box || !inp) return;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  combo.list = st.students.filter((x: any) => { const t = `${x.nama} ${x.kelas} ${unitLabel(x.unit)} ${x.unit} ${x.kamar || ''} ${x.halaqah || ''}`.toLowerCase(); return words.every((w) => t.includes(w)); });
  combo.hi = Math.max(0, combo.list.findIndex((x: any) => x.id === st.sid && !words.length));
  const shown = combo.list.slice(0, 60);
  box.innerHTML = shown.length ? shown.map((x: any, i: number) => `<div role="option" id="yw-o${i}" data-sid="${esc(x.id)}" aria-selected="${x.id === st.sid}" class="${i === combo.hi ? 'hi' : ''}"><b>${esc(x.nama)}</b><small>${esc(x.kelas)} · ${esc(unitLabel(x.unit))}${x.kamar ? ' · ' + esc(x.kamar) : ''}</small></div>`).join('') + (combo.list.length > 60 ? `<p class="yw-opt-more">${combo.list.length - 60} santri lain, ketik nama untuk mempersempit.</p>` : '')
    : '<p class="yw-opt-more">Tidak ada santri yang cocok.</p>';
  box.hidden = false; inp.setAttribute('aria-expanded', 'true'); inp.setAttribute('aria-activedescendant', shown.length ? 'yw-o' + combo.hi : '');
  box.querySelector('.hi')?.scrollIntoView({ block: 'nearest' });
}
function comboHide() { const box = $('#yw-opts'), inp = $<HTMLInputElement>('#yw-santri'); if (box) box.hidden = true; if (inp) { inp.setAttribute('aria-expanded', 'false'); inp.value = student()?.nama || ''; } }
async function comboPick(id: string) {
  comboHide();
  if (!id || id === st.sid) return;
  if (!leave()) return;
  st.sid = id; sessionStorage.setItem('yw-sid', st.sid); await load();
}
function body() {
  if (st.loading && !st.students.length) return loading();
  if (!st.students.length) return empty('Belum ada santri binaan.', 'Akun ini belum memegang santri, kamar, atau unit. Hubungi pimpinan melalui Mutabaah Tahfidz.');
  return `<section class="ns-hero anim-rise"><div><p class="ns-eyebrow">Kepesantrenan Nuris</p><h2>Ibadah santri, dicatat setiap bulan.</h2><p>8 ibadah sesuai Rapor Pesantren. Isi jumlah pelaksanaan dalam sebulan; target, nilai, dan predikat dihitung otomatis.</p></div>${heroScore()}</section>
    ${picker()}${st.loading ? loading() : st.view === 'isian' ? isian() : rekap()}`;
}
function heroScore() {
  if (st.loading || !st.entries) return '';
  const r = monthlyReport(st.month, st.view === 'isian' ? st.draft : st.entries.find((e: MonthEntry) => e.month === st.month));
  return `<div class="ns-kpi"><div><strong>${r.score == null ? '–' : r.score.toFixed(0)}</strong><span>nilai ${monthLabel(st.month).split(' ')[0]}</span></div><div><strong class="acc">${r.predikat}</strong><span>predikat</span></div><div><strong>${r.filled}/8</strong><span>ibadah terisi</span></div></div>`;
}
function rincianTabel(month: string, izin: number) {
  return `<div class="ns-table-wrap"><table class="ns-table yw-rinci"><thead><tr><th>Ibadah</th><th>Target</th>${SKALA.map((k) => `<th><span class="ns-pill ${predClass(k.p)}">${k.p}</span></th>`).join('')}</tr></thead><tbody>
    ${activities.map((a) => { const ks = kategori(a, month, izin); const t = monthTarget(a, month, izin); return `<tr><td><b>${esc(a.name)}</b><small>${esc(targetLabel(a))}</small></td><td class="tabular">${t || '–'} ${esc(a.unit)}</td>${SKALA.map((k) => `<td class="tabular">${esc(ks.find((x) => x.p === k.p)?.teks || '–')}</td>`).join('')}</tr>`; }).join('')}
  </tbody></table></div><p class="ns-muted" style="font-size:12.5px">Predikat dari persentase capaian target bulan ini: A ≥ 90% · B+ 80–89% · B 70–79% · C &lt; 70% (skala Rapor Pesantren). Target = harian × ${hadir(month, izin)} hari di pondok; pekanan × ${Math.floor(hadir(month, izin) / 7)} pekan; puasa sunnah per bulan.</p>`;
}
function isian() {
  const d = st.draft || fresh(st.month), m = st.month, izin = d.izin || 0;
  const cards = activities.map((a, i) => {
    const v = d.values[a.id], t = monthTarget(a, m, izin), sc = scoreOf(a, m, v, izin), p = grade(sc), ks = kategori(a, m, izin);
    return `<article class="yw-act"><header><span class="yw-no">${i + 1}</span><div><b>${esc(a.name)}</b><small>${esc(a.detail)} · ${esc(targetLabel(a))}</small></div><span class="ns-pill ${predClass(p)}" title="Nilai ${fmt(sc)}">${sc == null ? '–' : p}</span></header>
      <div class="yw-row"><div class="yw-step"><button type="button" data-step="${a.id}" data-d="-1" aria-label="Kurangi">−</button><input inputmode="numeric" data-val="${a.id}" value="${v ?? ''}" placeholder="–" aria-label="${esc(a.name)} sebulan"><button type="button" data-step="${a.id}" data-d="1" aria-label="Tambah">+</button></div>
        <span class="yw-tgt">dari target <b>${t}</b> ${esc(a.unit)}${sc != null ? ` · ${fmt(sc, 0)}%` : ''}</span></div>
      <div class="yw-kat">${ks.map((k) => `<span class="${p === k.p && sc != null ? 'on ' : ''}${predClass(k.p)}"><b>${k.p}</b> ${esc(k.teks)}</span>`).join('')}</div></article>`;
  }).join('');
  const r = monthlyReport(m, d);
  return `<div class="ns-section-title"><label class="ns-field" style="flex-direction:row;align-items:center;gap:8px">Bulan<input type="month" data-act="month" value="${m}" max="${thisMonth}" class="yw-in"></label>
    <label class="ns-field" style="flex-direction:row;align-items:center;gap:8px">Hari izin/pulang<input inputmode="numeric" data-act="izin" value="${izin}" class="yw-in" style="width:70px" aria-describedby="yw-izin-help"></label>
    <span class="ns-muted" id="yw-izin-help">${hadir(m, izin)} dari ${daysInMonth(m)} hari di pondok. Kosong = belum dicatat, 0 = tidak terlaksana.</span>
    <button class="ns-btn" data-act="rincian" aria-expanded="${st.rincian}">${st.rincian ? 'Tutup' : 'Lihat'} rincian kategori</button></div>
    ${st.rincian ? `<section class="ns-card" style="padding:12px;margin-bottom:12px"><h3 style="margin:0 0 8px;font-size:15px">Rincian kategori nilai ${esc(monthLabel(m))}</h3>${rincianTabel(m, izin)}</section>` : ''}
    <div class="yw-grid">${cards}</div>
    <label class="ns-field" style="margin-top:12px">Catatan (opsional)<textarea rows="2" maxlength="2000" data-act="note">${esc(d.note || '')}</textarea></label>
    <div class="yw-savebar ${st.dirty ? 'dirty' : ''}"><span>${st.dirty ? 'Ada isian belum disimpan' : d.version ? `Isian ${monthLabel(m)} tersimpan · nilai ${fmt(r.score)} (${r.predikat})` : `Belum ada isian untuk ${monthLabel(m)}`}</span><button class="ns-btn primary" data-act="save" ${st.busy ? 'disabled' : ''}>${icon(I.check, 16)}Simpan bulan ini</button></div>`;
}
function periodBar() {
  const yOpts = [st.year - 1, st.year, st.year + 1].map((y) => `<option value="${y}" ${y === st.year ? 'selected' : ''}>${y}/${y + 1}</option>`).join('');
  return `<div class="ns-section-title"><div class="ns-seg" role="tablist" data-nuris-glass><button role="tab" aria-selected="${st.period === 'month'}" data-act="period" data-v="month">Bulanan</button><button role="tab" aria-selected="${st.period === 'semester'}" data-act="period" data-v="semester">Semester</button></div>
    ${st.period === 'month' ? `<input type="month" data-act="month" value="${st.month}" class="yw-in">` : `<span><select data-act="year" class="yw-in">${yOpts}</select> <select data-act="semx" class="yw-in"><option value="1" ${st.sem === 1 ? 'selected' : ''}>Ganjil (Jul–Des)</option><option value="2" ${st.sem === 2 ? 'selected' : ''}>Genap (Jan–Jun)</option></select></span>`}</div>`;
}
function report() { const m = months(); return m.length > 1 ? semesterReport(m, st.entries) : null; }
function rows() {
  const m = months();
  if (m.length > 1) { const r: any = semesterReport(m, st.entries); return { sem: true, r, list: r.rows.map((x: any) => ({ ...x, cells: x.months })) }; }
  const r: any = monthlyReport(m[0], st.entries.find((e: MonthEntry) => e.month === m[0])); return { sem: false, r, list: r.rows };
}
function rekap() {
  const { sem, r, list } = rows(), m = months();
  const body = list.map((x: any) => `<tr><td><b>${esc(x.name)}</b><small>Target ${esc(x.label)}</small></td>${sem ? x.cells.map((v: any) => `<td class="tabular">${v == null ? '–' : Math.round(v)}</td>`).join('') : `<td class="tabular">${x.value ?? '–'}</td><td class="tabular">${x.target || '–'}</td>`}<td class="tabular"><b>${fmt(x.score)}</b></td><td><span class="ns-pill ${predClass(x.predikat)}">${x.predikat}</span></td></tr>`).join('');
  return `${periodBar()}<div class="ns-stats"><div class="ns-stat"><strong>${fmt(r.score, 2)}</strong><span>nilai rata-rata</span></div><div class="ns-stat acc"><strong>${r.predikat}</strong><span>predikat</span></div><div class="ns-stat"><strong>${sem ? `${r.bulanTerisi}/6` : `${r.filled}/8`}</strong><span>${sem ? 'bulan terisi' : 'ibadah terisi'}</span></div><div class="ns-stat"><strong>${sem ? (r.provisional ? 'Sementara' : 'Lengkap') : `${r.hadir} hari`}</strong><span>${sem ? 'status data' : 'di pondok'}</span></div></div>
    <div class="ns-table-wrap"><table class="ns-table"><thead><tr><th>Ibadah</th>${sem ? m.map((x) => `<th>${monthLabel(x).split(' ')[0].slice(0, 3)}</th>`).join('') : '<th>Jumlah</th><th>Target</th>'}<th>Nilai</th><th>Predikat</th></tr></thead><tbody>${body}</tbody></table></div>
    <p class="ns-muted" style="font-size:13px">Predikat: A ≥ 90 · B+ 80–89 · B 70–79 · C &lt; 70 (skala Rapor Pesantren). ${sem ? 'Nilai semester = rata-rata bulan yang terisi.' : ''}</p>
    ${sem ? '' : `<details class="ns-card" style="padding:10px 12px"><summary style="cursor:pointer;font-weight:700">Rincian kategori nilai ${esc(monthLabel(m[0]))}</summary>${rincianTabel(m[0], r.izin)}</details>`}`;
}
/* ---------- Data ---------- */
async function load() {
  if (!st.sid) return;
  st.loading = true; render();
  try { const r = await api('yaum-load', { santri_id: st.sid, months: months() }); st.entries = r.entries; st.draft = structuredClone(st.entries.find((e: MonthEntry) => e.month === st.month) || fresh(st.month)); st.dirty = false; }
  catch (e: any) { toast(e.message, 'err'); st.entries = []; }
  st.loading = false; render();
}
const leave = () => !st.dirty || confirm('Ada isian belum tersimpan. Tinggalkan perubahan?');
async function save() {
  if (!st.draft || st.busy) return; st.busy = true; render();
  try { const r = await api('yaum-save', { santri_id: st.sid, entry: st.draft }); st.entries = [...st.entries.filter((e: MonthEntry) => e.month !== r.entry.month), r.entry]; st.draft = structuredClone(r.entry); st.dirty = false; toast('Isian bulan ini tersimpan.'); }
  catch (e: any) { toast(e.message, 'err'); }
  st.busy = false; render();
}
async function boot() {
  if (!token()) { app.innerHTML = shell({ app: 'Mutabaah Yaumiyyah', title: 'Mutabaah Yaumiyyah', nav: [], active: '' }, needLogin('Mutabaah Yaumiyyah')); return; }
  const h = location.hash.slice(1); // Rapor Yaumiyyah sudah terwakili Rapor Pesantren; tautan lama #rapor diarahkan ke Rekap.
  st.view = h === 'rekap' || h === 'rapor' ? 'rekap' : 'isian'; if (h === 'rapor') history.replaceState(null, '', '#rekap'); render();
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
function setVal(id: string, v: number | null) { const a = activities.find((x) => x.id === id)!; if (v != null) v = Math.max(0, Math.min(monthMax(a, st.month, st.draft.izin || 0), Math.round(v))); st.draft.values[id] = v; st.dirty = true; }
function refreshCard() { const y = scrollY; render(); scrollTo(0, y); }
document.addEventListener('click', async (e) => {
  const nv = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
  if (nv) { e.preventDefault(); if (!leave()) return; st.view = nv.dataset.nav; history.replaceState(null, '', '#' + st.view); await load(); return; }
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-step]'); if (!t) return;
  if (t.dataset.step) { const id = t.dataset.step; setVal(id, (st.draft.values[id] ?? 0) + Number(t.dataset.d)); refreshCard(); ($(`[data-val="${id}"]`) as HTMLInputElement)?.focus(); return; }
  const a = t.dataset.act;
  if (a === 'apps') appsMenu(t, 'yaumiyyah');
  else if (a === 'save') save();
  else if (a === 'rincian') { st.rincian = !st.rincian; refreshCard(); }
  else if (a === 'period') { st.period = t.dataset.v; await load(); }
});
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.act === 'sq') comboShow(t.value);
  else if (t.dataset.val) { const v = t.value.replace(/\D/g, ''); t.value = v; setVal(t.dataset.val, v === '' ? null : Number(v)); $('.yw-savebar')?.classList.add('dirty'); }
  else if (t.dataset.act === 'note') { st.draft.note = t.value; st.dirty = true; $('.yw-savebar')?.classList.add('dirty'); }
});
document.addEventListener('change', async (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.val) { refreshCard(); return; }
  const a = t.dataset.act;
  if (a === 'izin') { const n = Math.max(0, Math.min(daysInMonth(st.month), Number(t.value.replace(/\D/g, '')) || 0)); st.draft.izin = n; for (const x of activities) if (st.draft.values[x.id] != null) setVal(x.id, st.draft.values[x.id]); st.dirty = true; refreshCard(); }
  else if (a === 'month') { if (!t.value || t.value > thisMonth) { toast('Bulan tidak boleh melewati bulan ini.', 'err'); render(); return; } if (!leave()) { render(); return; } st.month = t.value; await load(); }
  else if (a === 'year') { st.year = Number(t.value); await load(); }
  else if (a === 'semx') { st.sem = Number(t.value); await load(); }
});
document.addEventListener('focusin', (e) => { const t = e.target as HTMLInputElement; if (t.dataset?.act === 'sq') { t.select(); comboShow(''); } });
document.addEventListener('focusout', (e) => { const t = e.target as HTMLInputElement; if (t.dataset?.act === 'sq') setTimeout(() => { if (document.activeElement !== t) comboHide(); }, 120); });
// mousedown (bukan click) agar pilihan terambil sebelum kolom kehilangan fokus
document.addEventListener('mousedown', (e) => { const o = (e.target as HTMLElement).closest<HTMLElement>('#yw-opts [data-sid]'); if (o) { e.preventDefault(); comboPick(o.dataset.sid!); } });
document.addEventListener('click', (e) => { const o = (e.target as HTMLElement).closest<HTMLElement>('#yw-opts [data-sid]'); if (o) comboPick(o.dataset.sid!); });
document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLInputElement; if (t.dataset?.act !== 'sq') return;
  const box = $('#yw-opts'); const n = Math.min(60, combo.list.length);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (box?.hidden) { comboShow(t.value); return; } if (!n) return; combo.hi = (combo.hi + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; $$('#yw-opts [data-sid]').forEach((o, i) => o.classList.toggle('hi', i === combo.hi)); t.setAttribute('aria-activedescendant', 'yw-o' + combo.hi); $('#yw-opts .hi')?.scrollIntoView({ block: 'nearest' }); }
  else if (e.key === 'Enter') { e.preventDefault(); const x = combo.list[combo.hi]; if (x && !box?.hidden) comboPick(x.id); }
  else if (e.key === 'Escape') { comboHide(); t.blur(); }
});
addEventListener('beforeunload', (e) => { if (st.dirty) e.preventDefault(); });
boot();
