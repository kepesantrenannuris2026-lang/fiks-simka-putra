// Ujian Praktik Ibadah — aplikasi penguji & pengelola (desain Mutabaah).
import { RUBRIK, MATERI_DEFAULT, GRUP, grupOf, materiOf, totalSkor } from './materi';
import { huruf, MAKNA } from '../../shared/skala';
import { shell, $, $$, esc, icon, I, toast, apiOf, token, needLogin, loading, empty, appsMenu, sessionEnded, unitLabel, download, csvOf } from '../../shared/ui';

const api = apiOf('https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/ujian-praktik/');
const UNITS = ['SMP Ikhwan', 'SMA Ikhwan', 'MA Ikhwan', 'SMP Akhwat', 'SMA Akhwat', 'MA Akhwat'];
type P = { id: string; nama: string; unit: string; tingkat: string; halaqah: string; musyrif: string; kamar: string; kelas_pagi: string; skor?: any; nilai?: any; penguji?: any; catatan?: string; version?: string | null; diperbarui_oleh?: string; diperbarui_pada?: string };
const st: any = { user: null, periodes: [], periode: null, peserta: [] as P[], penguji: {}, view: 'peserta', f: { unit: '', kamar: '', halaqah: '', tingkat: '', kp: '', q: '', status: '' }, rekapBy: 'unit', loaded: false };
const app = document.getElementById('app')!;
const materiFor = (s: P) => materiOf(st.periode?.materi, grupOf(s.unit, s.tingkat));
const statusOf = (s: P) => { const m = materiFor(s); const n = m.filter((k) => s.nilai?.[k] != null).length; return !m.length ? 'na' : n === 0 ? 'belum' : n < m.length ? 'sebagian' : 'lengkap'; };
const pill = (v: number | null | undefined) => { if (v == null) return '<span class="ns-pill none">Belum dinilai</span>'; const h = huruf(v); return `<span class="ns-pill ${h === 'A' ? 'a' : h === 'B+' ? 'bp' : h === 'B' ? 'b' : 'c'}">${fmt(v)} (${h})</span>`; };
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','));
const canKelola = (unit: string) => st.user?.admin || st.user?.koordinator?.includes(unit);
const peran = () => (st.user?.admin ? 'Pimpinan · semua unit' : st.user?.koordinator?.length ? `Koordinator ${st.user.koordinator.map(unitLabel).join(', ')}` : 'Penguji');

function nav() {
  const n = [{ id: 'peserta', label: 'Peserta', icon: I.users }, { id: 'rekap', label: 'Rekap', icon: I.chart }, { id: 'rubrik', label: 'Rubrik', icon: I.book }];
  if (st.user?.admin) n.push({ id: 'materi', label: 'Periode & materi', icon: I.gear });
  return n;
}
function periodePicker() {
  if (!st.periodes.length) return '';
  return `<label class="ns-field" style="flex-direction:row;align-items:center"><span class="sr">Periode ujian</span><select data-act="periode" style="height:38px;min-width:200px">${st.periodes.map((p: any) => `<option value="${p.id}" ${p.id === st.periode?.id ? 'selected' : ''}>${esc(p.nama)}${p.aktif ? '' : ' (ditutup)'}</option>`).join('')}</select></label>`;
}
function render() {
  const title = { peserta: 'Penilaian peserta', rekap: 'Rekap hasil ujian', rubrik: 'Rubrik & konversi nilai', materi: 'Periode & materi ujian' }[st.view as string] || 'Ujian Praktik Ibadah';
  const body = !st.loaded ? loading() : st.view === 'rekap' ? rekapView() : st.view === 'rubrik' ? rubrikView() : st.view === 'materi' ? materiView() : pesertaView();
  app.innerHTML = shell({ app: 'Ujian Praktik Ibadah', title, nav: nav(), active: st.view, user: st.user && { nama: st.user.nama, peran: peran() }, actions: periodePicker() }, body);
}

/* ---------- Peserta ---------- */
function filtered() {
  const f = st.f, q = f.q.trim().toLowerCase();
  return st.peserta.filter((s: P) => (!f.unit || s.unit === f.unit) && (!f.kamar || s.kamar === f.kamar) && (!f.halaqah || s.halaqah === f.halaqah) && (!f.tingkat || String(s.tingkat) === f.tingkat)
    && (!f.kp || s.kelas_pagi === f.kp) && (!f.status || statusOf(s) === f.status) && (!q || s.nama.toLowerCase().includes(q)));
}
const opsi = (key: keyof P, label: string, cur: string, scopeUnit = true) => {
  const vals = [...new Set(st.peserta.filter((s: P) => !scopeUnit || !st.f.unit || s.unit === st.f.unit).map((s: P) => String(s[key] || '')).filter(Boolean))].sort((a: any, b: any) => a.localeCompare(b, 'id', { numeric: true }));
  return `<option value="">${label}</option>` + vals.map((v: any) => `<option ${v === cur ? 'selected' : ''} value="${esc(v)}">${esc(key === 'unit' ? unitLabel(v) : v)}</option>`).join('');
};
function filterBar() {
  const f = st.f;
  return `<div class="ns-filters">
    <label class="ns-field">Cari santri<input type="search" data-f="q" value="${esc(f.q)}" placeholder="Ketik nama santri"></label>
    <label class="ns-field">Unit<select data-f="unit">${`<option value="">Semua unit</option>` + UNITS.filter((u) => st.peserta.some((s: P) => s.unit === u)).map((u) => `<option value="${u}" ${u === f.unit ? 'selected' : ''}>${unitLabel(u)}</option>`).join('')}</select></label>
    <label class="ns-field">Kamar<select data-f="kamar">${opsi('kamar', 'Semua kamar', f.kamar)}</select></label>
    <label class="ns-field">Halaqah Al-Qur’an<select data-f="halaqah">${opsi('halaqah', 'Semua halaqah', f.halaqah)}</select></label>
    <label class="ns-field">Tingkat kelas<select data-f="tingkat">${opsi('tingkat', 'Semua tingkat', f.tingkat)}</select></label>
    <label class="ns-field">Kelas pagi<select data-f="kp">${opsi('kelas_pagi', 'Semua kelas pagi', f.kp)}</select></label>
    <label class="ns-field">Status<select data-f="status"><option value="">Semua status</option>${[['belum', 'Belum dinilai'], ['sebagian', 'Sebagian'], ['lengkap', 'Lengkap']].map(([v, t]) => `<option value="${v}" ${v === f.status ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
  </div>`;
}
function pesertaView() {
  if (!st.periode) return empty('Belum ada periode ujian.', st.user?.admin ? 'Buat periode pada menu Periode & materi.' : 'Pimpinan belum membuka periode Ujian Praktik Ibadah.');
  const list = filtered();
  const c = { belum: 0, sebagian: 0, lengkap: 0 } as any; list.forEach((s: P) => { const x = statusOf(s); if (x in c) c[x]++; });
  const rows = list.slice(0, 400).map((s: P) => {
    const m = materiFor(s);
    const kp = canKelola(s.unit) ? `<input class="up-kp" data-kp="${esc(s.id)}" value="${esc(s.kelas_pagi)}" maxlength="20" placeholder="mis. 7A" aria-label="Kelas pagi ${esc(s.nama)}">` : esc(s.kelas_pagi || '–');
    return `<tr><td><b>${esc(s.nama)}</b><small>${esc(unitLabel(s.unit))} · Kelas ${esc(s.tingkat)}</small></td>
      <td>${esc(s.kamar || '–')}<small>${esc(s.halaqah || '')}</small></td><td>${kp}</td>
      <td><div class="up-pills">${m.length ? m.map((k) => `<span class="up-sub"><small>${esc(RUBRIK[k].nama)}</small>${pill(s.nilai?.[k])}</span>`).join('') : '<span class="ns-muted">Materi belum ditetapkan</span>'}</div></td>
      <td><button class="ns-btn sm ${statusOf(s) === 'lengkap' ? '' : 'primary'}" data-act="nilai" data-id="${esc(s.id)}" ${m.length && st.periode.aktif ? '' : 'disabled'}>${icon(I.edit, 16)}${statusOf(s) === 'belum' ? 'Nilai' : 'Ubah'}</button></td></tr>`;
  }).join('');
  return `<section class="ns-hero anim-rise"><div><p class="ns-eyebrow">${esc(st.periode.nama)}${st.periode.aktif ? '' : ' · ditutup'}</p><h2>Ujian Praktik Ibadah</h2><p>Setiap subujian dinilai dan dikonversi sendiri (A 90–100, B+ 80–89, B 70–79, C &lt;70), tanpa nilai gabungan. Saring peserta, buka santri, lalu isi poin tiap aspek rubrik.</p></div>
    <div class="ns-kpi"><div><strong>${list.length}</strong><span>peserta</span></div><div><strong>${c.lengkap}</strong><span>lengkap</span></div><div><strong class="acc">${c.belum + c.sebagian}</strong><span>belum selesai</span></div></div></section>
    ${filterBar()}
    <div class="ns-section-title"><h3>${list.length} santri${list.length > 400 ? ' (400 pertama ditampilkan; persempit saringan)' : ''}</h3>${st.user?.admin || st.user?.koordinator?.length ? `<button class="ns-btn sm ghost" data-act="kp-paste">${icon(I.edit, 16)}Tempel kelas pagi</button>` : ''}</div>
    ${list.length ? `<div class="ns-table-wrap"><table class="ns-table up-table"><thead><tr><th>Santri</th><th>Kamar / halaqah</th><th>Kelas pagi</th><th>Nilai subujian</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : empty('Tidak ada santri yang cocok.', 'Ubah saringan di atas.')}`;
}

/* ---------- Dialog penilaian ---------- */
function nilaiDialog(id: string) {
  const s: P = st.peserta.find((x: P) => x.id === id); if (!s) return;
  const keys = materiFor(s);
  const draft: Record<string, (number | null)[]> = {};
  keys.forEach((k) => (draft[k] = RUBRIK[k].aspek.map((_, i) => (typeof s.skor?.[k]?.[i] === 'number' ? s.skor[k][i] : null))));
  let catatan = s.catatan || '';
  const m = document.createElement('div'); m.className = 'ns-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Penilaian ' + s.nama);
  const sub = (k: string) => {
    const r = RUBRIK[k], t = totalSkor(k, draft[k]);
    const who = s.penguji?.[k] ? st.penguji[s.penguji[k]] || s.penguji[k] : '';
    return `<section class="up-rub"><header><div><small>${r.jenis === 'praktik' ? 'Praktik' : 'Lisan'}</small><h3>${esc(r.nama)} <span lang="ar" dir="rtl">${r.ar}</span></h3>${r.catatan ? `<p>${esc(r.catatan)}</p>` : ''}</div>
      <div class="up-total" data-total="${k}">${t == null ? '<b>–</b><small>Belum dinilai</small>' : `<b>${fmt(t)}</b><small>${huruf(t)} · ${MAKNA[huruf(t)]}</small>`}</div></header>
      ${r.aspek.map((a, i) => `<label class="up-asp"><span>${esc(a.label)}</span><span class="up-inp"><input type="number" inputmode="decimal" min="0" max="${a.max}" step="1" data-k="${k}" data-i="${i}" value="${draft[k][i] ?? ''}" aria-label="${esc(a.label)} (maks ${a.max})"><small>/ ${a.max}</small><button type="button" class="up-max" data-max="${k}.${i}" title="Isi poin penuh">maks</button></span></label>`).join('')}
      ${who ? `<p class="up-who">Penguji: ${esc(who)}</p>` : ''}</section>`;
  };
  const idx = filtered().findIndex((x: P) => x.id === id), next = filtered()[idx + 1];
  m.innerHTML = `<div class="ns-modal-box up-box"><header><div><small>${esc(unitLabel(s.unit))} · Kelas ${esc(s.tingkat)} · ${esc(s.kamar || 'tanpa kamar')} · ${esc(s.halaqah || '')}</small><h2>${esc(s.nama)}</h2></div><button class="ns-icon" data-x="tutup" aria-label="Tutup">${icon(I.x)}</button></header>
    <div class="ns-modal-body">${keys.map(sub).join('')}<label class="ns-field">Catatan penguji (opsional)<textarea rows="2" maxlength="1000" data-catatan>${esc(catatan)}</textarea></label></div>
    <footer><small class="ns-muted">Poin tiap aspek tidak bisa melebihi batas rubrik. Kosongkan semua aspek untuk menghapus nilai subujian.</small><span class="ns-grow"></span><button class="ns-btn" data-x="tutup">Batal</button>${next ? '<button class="ns-btn pine" data-x="next">Simpan & berikutnya</button>' : ''}<button class="ns-btn primary" data-x="ok">${icon(I.check, 16)}Simpan</button></footer></div>`;
  document.body.append(m); (m.querySelector('input') as HTMLInputElement)?.focus();
  const refresh = (k: string) => { const t = totalSkor(k, draft[k]); const el = m.querySelector(`[data-total="${k}"]`)!; el.innerHTML = t == null ? '<b>–</b><small>Belum dinilai</small>' : `<b>${fmt(t)}</b><small>${huruf(t)} · ${MAKNA[huruf(t)]}</small>`; };
  m.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.dataset.catatan !== undefined) { catatan = t.value; return; }
    if (!t.dataset.k) return;
    const k = t.dataset.k, i = Number(t.dataset.i), max = RUBRIK[k].aspek[i].max;
    let v = t.value === '' ? null : Number(t.value.replace(',', '.'));
    if (v != null && (!Number.isFinite(v) || v < 0)) v = null;
    if (v != null && v > max) { v = max; t.value = String(max); t.classList.add('bad'); setTimeout(() => t.classList.remove('bad'), 600); toast(`Maksimal ${max} poin untuk aspek ini.`, 'err'); }
    draft[k][i] = v; refresh(k);
  });
  m.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') m.remove();
    const t = e.target as HTMLInputElement;
    if (e.key === 'Enter' && t.dataset.k) { e.preventDefault(); const all = $$<HTMLInputElement>('input[data-k]', m); const n = all[all.indexOf(t) + 1]; if (n) { n.focus(); n.select(); } else (m.querySelector('[data-x=ok]') as HTMLElement).focus(); }
  });
  m.addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null; if (!b) { if (e.target === m) m.remove(); return; }
    if (b.dataset.max) { const [k, i] = b.dataset.max.split('.'); const max = RUBRIK[k].aspek[Number(i)].max; draft[k][Number(i)] = max; (m.querySelector(`input[data-k="${k}"][data-i="${i}"]`) as HTMLInputElement).value = String(max); refresh(k); return; }
    if (b.dataset.x === 'tutup') return m.remove();
    if (b.dataset.x === 'ok' || b.dataset.x === 'next') {
      b.disabled = true;
      const skor: Record<string, (number | null)[] | null> = {};
      keys.forEach((k) => (skor[k] = draft[k].every((v) => v == null) ? null : draft[k]));
      try {
        const r = await api('simpan', { periode: st.periode.id, santri: s.id, skor, catatan, version: s.version || null });
        Object.assign(s, r.nilai); st.penguji[st.user.username] = st.user.nama;
        toast(`Nilai ${s.nama} tersimpan.`); m.remove(); render();
        if (b.dataset.x === 'next' && next) nilaiDialog(next.id);
      } catch (er: any) { toast(er.message, 'err'); b.disabled = false; if (er.status === 409) loadPeserta(); }
    }
  });
}

/* ---------- Rekap ---------- */
function rekapView() {
  if (!st.periode) return empty('Belum ada periode ujian.');
  const by = st.rekapBy as keyof P, list = filtered();
  const keys = [...new Set(list.flatMap((s: P) => materiFor(s)))] as string[];
  const groups = new Map<string, P[]>();
  list.forEach((s: P) => { const g = String(s[by] || '(belum diisi)'); (groups.get(g) ?? groups.set(g, []).get(g)!).push(s); });
  const sorted = [...groups].sort((a, b) => a[0].localeCompare(b[0], 'id', { numeric: true }));
  const cell = (ss: P[], k: string) => {
    const v = ss.filter((s) => materiFor(s).includes(k)); if (!v.length) return '<td class="ns-muted">—</td>';
    const n = v.map((s) => s.nilai?.[k]).filter((x) => x != null) as number[];
    const d: any = { A: 0, 'B+': 0, B: 0, C: 0 }; n.forEach((x) => d[huruf(x)]++);
    const avg = n.length ? n.reduce((a, b) => a + b, 0) / n.length : null;
    return `<td><b>${avg == null ? '–' : fmt(Math.round(avg * 10) / 10)}</b> <small>${n.length}/${v.length} dinilai · A ${d.A} · B+ ${d['B+']} · B ${d.B} · C ${d.C}</small></td>`;
  };
  return `${filterBar()}
  <div class="ns-section-title"><div class="ns-seg" role="tablist" aria-label="Rekap berdasarkan" data-nuris-glass>${[['unit', 'Unit'], ['kamar', 'Kamar'], ['halaqah', 'Halaqah'], ['tingkat', 'Tingkat'], ['kelas_pagi', 'Kelas pagi']].map(([v, t]) => `<button role="tab" aria-selected="${st.rekapBy === v}" data-act="rekapby" data-v="${v}">${t}</button>`).join('')}</div>
  <button class="ns-btn sm" data-act="csv">${icon(I.down, 16)}Unduh leger (CSV)</button></div>
  ${sorted.length ? `<div class="ns-table-wrap"><table class="ns-table"><thead><tr><th>${esc({ unit: 'Unit', kamar: 'Kamar', halaqah: 'Halaqah', tingkat: 'Tingkat', kelas_pagi: 'Kelas pagi' }[st.rekapBy as string])}</th><th>Santri</th>${keys.map((k) => `<th>${esc(RUBRIK[k].nama)}<small>rerata · sebaran</small></th>`).join('')}</tr></thead>
  <tbody>${sorted.map(([g, ss]) => `<tr><td><b>${esc(by === 'unit' ? unitLabel(g) : g)}</b></td><td>${ss.length}</td>${keys.map((k) => cell(ss, k)).join('')}</tr>`).join('')}</tbody></table></div>` : empty('Belum ada data.')}`;
}
function csv() {
  const keys = [...new Set(st.peserta.flatMap((s: P) => materiFor(s)))] as string[];
  const head = ['No', 'Nama', 'Unit', 'Kelas', 'Kelas pagi', 'Kamar', 'Halaqah', ...keys.flatMap((k) => [RUBRIK[k].nama, `${RUBRIK[k].nama} (huruf)`]), 'Catatan'];
  const rows = filtered().map((s: P, i: number) => [i + 1, s.nama, unitLabel(s.unit), s.tingkat, s.kelas_pagi, s.kamar, s.halaqah, ...keys.flatMap((k) => { const v = materiFor(s).includes(k) ? s.nilai?.[k] : undefined; return v == null ? [materiFor(s).includes(k) ? 'Belum dinilai' : '', ''] : [String(v).replace('.', ','), huruf(v)]; }), s.catatan || '']);
  download(`Leger Ujian Praktik ${st.periode.nama}.csv`, csvOf([head, ...rows]));
}

/* ---------- Rubrik ---------- */
function rubrikView() {
  const rub = Object.values(RUBRIK).map((r) => `<section class="ns-card up-ref"><h3>${esc(r.nama)} <span lang="ar" dir="rtl">${r.ar}</span><span class="ns-pill">${r.jenis === 'praktik' ? 'Praktik' : 'Lisan / pengganti lisan'}</span></h3>${r.catatan ? `<p class="ns-muted">${esc(r.catatan)}</p>` : ''}
    <table class="ns-table"><tbody>${r.aspek.map((a) => `<tr><td>${esc(a.label)}</td><td class="tabular" style="text-align:right"><b>${a.max}</b></td></tr>`).join('')}<tr><td><b>Total</b></td><td style="text-align:right"><b>100</b></td></tr></tbody></table></section>`).join('');
  const materi = GRUP.map((g) => `<tr><td>Kelas ${g.split('-')[0]} ${g.endsWith('putra') ? 'Putra' : 'Putri'}</td><td>${materiOf(st.periode?.materi, g).map((k) => RUBRIK[k].nama).join(', ')}</td></tr>`).join('');
  return `<div class="up-ref-grid"><section class="ns-card"><h3>Konversi nilai</h3><table class="ns-table"><thead><tr><th>Huruf</th><th>Rentang</th><th>Makna</th></tr></thead><tbody>
    ${[['A', '90–100'], ['B+', '80–89'], ['B', '70–79'], ['C', 'di bawah 70']].map(([h, r]) => `<tr><td>${pill(h === 'A' ? 95 : h === 'B+' ? 85 : h === 'B' ? 75 : 60).replace(/\d+ \(/, '(')}</td><td>${r}</td><td>${MAKNA[h]}</td></tr>`).join('')}</tbody></table>
    <p class="ns-muted">Nilai praktik dan nilai lisan ditampilkan per komponen, tanpa rata-rata gabungan atau bobot persentase. Skala ini menjadi dasar nilai di Rapor Pesantren.</p></section>
    <section class="ns-card"><h3>Materi ${esc(st.periode?.nama || 'semester I')}</h3><table class="ns-table"><tbody>${materi}</tbody></table></section></div>
    <div class="up-ref-grid">${rub}</div>`;
}

/* ---------- Periode & materi (pimpinan) ---------- */
function materiView() {
  const p = st.edit || st.periode || { nama: '', tahun_ajaran: '', semester: 1, aktif: true, materi: {} };
  const rows = GRUP.map((g) => { const cur = materiOf(p.materi, g); return `<tr><th>Kelas ${g.split('-')[0]} ${g.endsWith('putra') ? 'Putra' : 'Putri'}</th><td>${Object.values(RUBRIK).map((r) => `<label class="up-tag"><input type="checkbox" name="m:${g}" value="${r.key}" ${cur.includes(r.key) ? 'checked' : ''}>${esc(r.nama)}</label>`).join('')}</td></tr>`; }).join('');
  return `<form class="ns-card up-form" data-form="periode"><input type="hidden" name="id" value="${esc(p.id || '')}">
    <div class="ns-filters"><label class="ns-field">Nama periode<input name="nama" required maxlength="120" value="${esc(p.nama)}" placeholder="mis. Semester 1 2026/2027"></label>
    <label class="ns-field">Tahun ajaran<input name="tahun_ajaran" required pattern="\\d{4}/\\d{4}" value="${esc(p.tahun_ajaran)}" placeholder="2026/2027"></label>
    <label class="ns-field">Semester<select name="semester"><option value="1" ${p.semester == 1 ? 'selected' : ''}>1 (Ganjil)</option><option value="2" ${p.semester == 2 ? 'selected' : ''}>2 (Genap)</option></select></label>
    <label class="ns-field">Status<select name="aktif"><option value="1" ${p.aktif ? 'selected' : ''}>Dibuka (bisa dinilai)</option><option value="0" ${p.aktif ? '' : 'selected'}>Ditutup</option></select></label></div>
    <h3>Materi per tingkat & jenis kelamin</h3><div class="ns-table-wrap"><table class="ns-table up-materi"><tbody>${rows}</tbody></table></div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="ns-btn primary">${icon(I.check, 16)}Simpan periode</button><button type="button" class="ns-btn" data-act="baru">Periode baru</button><button type="button" class="ns-btn ghost" data-act="bawaan">Kembalikan materi bawaan</button></div></form>`;
}

/* ---------- Data ---------- */
async function loadPeserta() {
  if (!st.periode) { st.peserta = []; render(); return; }
  const r = await api('peserta', { periode: st.periode.id });
  st.peserta = r.peserta; st.penguji = r.penguji; st.periode = r.periode; render();
}
async function boot() {
  if (!token()) { app.innerHTML = shell({ app: 'Ujian Praktik Ibadah', title: 'Ujian Praktik Ibadah', nav: [], active: '' }, needLogin('Ujian Praktik Ibadah')); return; }
  st.view = (location.hash.slice(1) || 'peserta'); render();
  try {
    const r = await api('boot');
    st.user = r.user; st.periodes = r.periodes;
    const saved = sessionStorage.getItem('up-periode');
    st.periode = st.periodes.find((p: any) => p.id === saved) || st.periodes.find((p: any) => p.aktif) || st.periodes[0] || null;
    if (!st.user.admin && st.view === 'materi') st.view = 'peserta';
    if (!st.user.admin && st.user.units.length === 1) st.f.unit = st.user.units[0];
    await loadPeserta(); st.loaded = true; render();
  } catch (e: any) {
    if (e.status === 401) sessionEnded();
    st.loaded = true;
    app.innerHTML = shell({ app: 'Ujian Praktik Ibadah', title: 'Ujian Praktik Ibadah', nav: [], active: '' }, empty(e.status === 401 ? 'Sesi berakhir.' : 'Data ujian belum dapat dimuat.', e.message, e.status === 401 ? '<a class="ns-btn primary" href="/" target="_top">Masuk kembali</a>' : '<button class="ns-btn primary" data-act="reload">Coba lagi</button>'));
  }
}
function kpPaste() {
  const m = document.createElement('div'); m.className = 'ns-modal';
  m.innerHTML = `<div class="ns-modal-box"><header><div><small>Kelas pagi</small><h2>Tempel daftar kelas pagi</h2></div><button class="ns-icon" data-x="tutup" aria-label="Tutup">${icon(I.x)}</button></header>
  <div class="ns-modal-body"><p class="ns-muted">Salin dua kolom dari Excel/Google Sheets: <b>Nama santri</b> dan <b>Kelas pagi</b> (mis. 7A). Nama dicocokkan dengan peserta di unit Anda.</p><textarea rows="12" style="width:100%;border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--card)" placeholder="AHMAD FAUZI&#9;7A"></textarea><p class="up-hasil ns-muted"></p></div>
  <footer><span class="ns-grow"></span><button class="ns-btn" data-x="tutup">Batal</button><button class="ns-btn primary" data-x="ok">Simpan</button></footer></div>`;
  document.body.append(m);
  m.addEventListener('click', async (e) => {
    const b = (e.target as HTMLElement).closest('button') as HTMLElement | null; if (!b) return;
    if (b.dataset.x === 'tutup') return m.remove();
    if (b.dataset.x !== 'ok') return;
    const norm = (x: string) => x.toUpperCase().replace(/[^A-Z]/g, '');
    const map = new Map(st.peserta.filter((s: P) => canKelola(s.unit)).map((s: P) => [norm(s.nama), s]));
    const items: any[] = [], miss: string[] = [];
    for (const line of (m.querySelector('textarea') as HTMLTextAreaElement).value.split(/\r?\n/)) {
      const [nama, kp] = line.split('\t'); if (!nama?.trim() || !kp?.trim()) continue;
      const s: any = map.get(norm(nama)); if (s) items.push({ santri: s.id, kelas_pagi: kp.trim() }); else miss.push(nama.trim());
    }
    if (!items.length) { (m.querySelector('.up-hasil') as HTMLElement).textContent = 'Tidak ada nama yang cocok.'; return; }
    try { await api('kelas-pagi', { items }); toast(`${items.length} kelas pagi disimpan${miss.length ? `, ${miss.length} nama tidak ditemukan` : ''}.`); m.remove(); loadPeserta(); } catch (er: any) { toast(er.message, 'err'); }
  });
}

/* ---------- Peristiwa ---------- */
document.addEventListener('click', (e) => {
  const navEl = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
  if (navEl) { e.preventDefault(); st.view = navEl.dataset.nav; st.edit = null; history.replaceState(null, '', '#' + st.view); render(); ($('#main') as HTMLElement)?.focus(); return; }
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]'); if (!t) return;
  const a = t.dataset.act;
  if (a === 'apps') appsMenu(t, 'ujian-praktik');
  else if (a === 'nilai') nilaiDialog(t.dataset.id!);
  else if (a === 'rekapby') { st.rekapBy = t.dataset.v; render(); }
  else if (a === 'csv') csv();
  else if (a === 'kp-paste') kpPaste();
  else if (a === 'reload') location.reload();
  else if (a === 'baru') { st.edit = { nama: '', tahun_ajaran: st.periode?.tahun_ajaran || '', semester: st.periode?.semester === 1 ? 2 : 1, aktif: true, materi: {} }; render(); }
  else if (a === 'bawaan') { st.edit = { ...(st.edit || st.periode), materi: {} }; render(); }
});
let kpT: Record<string, number> = {};
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.f) {
    st.f[t.dataset.f] = t.value;
    if (t.dataset.f === 'unit') Object.assign(st.f, { kamar: '', halaqah: '', kp: '' });
    if (t.tagName === 'INPUT') { const pos = t.selectionStart; render(); const n = $<HTMLInputElement>(`[data-f="${t.dataset.f}"]`); n?.focus(); n?.setSelectionRange(pos, pos); } else render();
  } else if (t.dataset.kp) {
    const id = t.dataset.kp; clearTimeout(kpT[id]);
    kpT[id] = window.setTimeout(async () => { try { await api('kelas-pagi', { items: [{ santri: id, kelas_pagi: t.value }] }); const s = st.peserta.find((x: P) => x.id === id); if (s) s.kelas_pagi = t.value.trim().toUpperCase(); t.classList.add('ok'); setTimeout(() => t.classList.remove('ok'), 900); } catch (er: any) { toast(er.message, 'err'); } }, 700);
  }
});
document.addEventListener('change', async (e) => {
  const t = e.target as HTMLSelectElement;
  if (t.dataset.act === 'periode') { st.periode = st.periodes.find((p: any) => p.id === t.value); sessionStorage.setItem('up-periode', t.value); st.loaded = false; render(); await loadPeserta().catch((er) => toast(er.message, 'err')); st.loaded = true; render(); }
});
document.addEventListener('submit', async (e) => {
  const f = e.target as HTMLFormElement; if (f.dataset.form !== 'periode') return; e.preventDefault();
  const fd = new FormData(f); const materi: Record<string, string[]> = {};
  for (const g of GRUP) { const v = fd.getAll('m:' + g).map(String); if (!v.length) { toast(`Pilih minimal satu materi untuk kelas ${g.replace('-', ' ')}.`, 'err'); return; } if (JSON.stringify(v) !== JSON.stringify(MATERI_DEFAULT[g])) materi[g] = v; }
  try {
    const r = await api('periode-simpan', { id: fd.get('id') || undefined, nama: fd.get('nama'), tahun_ajaran: fd.get('tahun_ajaran'), semester: Number(fd.get('semester')), aktif: fd.get('aktif') === '1', materi });
    const i = st.periodes.findIndex((p: any) => p.id === r.periode.id); if (i >= 0) st.periodes[i] = r.periode; else st.periodes.unshift(r.periode);
    st.periode = r.periode; st.edit = null; sessionStorage.setItem('up-periode', r.periode.id); toast('Periode disimpan.'); await loadPeserta();
  } catch (er: any) { toast(er.message, 'err'); }
});
addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== st.view && ['peserta', 'rekap', 'rubrik', 'materi'].includes(v)) { st.view = v; render(); } });
boot();
