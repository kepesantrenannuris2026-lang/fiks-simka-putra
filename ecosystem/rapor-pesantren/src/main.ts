import { BAGIAN, KITAB, KITAB_KELAS, AKHLAK, INDIKATOR_AKHLAK, itemsFor, Santri, Item } from './kurikulum';
import { HURUF, normHuruf, hurufAkhlak, RUBRIK_AKHLAK } from '../../shared/skala';
import { raporHTML, RAPOR_CSS, kelengkapan, nilaiButir, fitPage, rerataAkhlak, pageSize, Ctx } from './rapor';
import { unduhPdf } from '../../shared/pdf';
import { shell as nsShell } from '../../shared/ui';

const API = 'https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/rapor-pesantren/';
const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll(s)) as T[];
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const icon = (d: string) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>', bed: '<path d="M3 18V7m0 7h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>', print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  pdf: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M12 11v6m-3-3 3 3 3-3"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 4a3 3 0 0 1 0 6m2 10a6 6 0 0 0-3-5"/>', grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
  back: '<path d="m15 6-6 6 6 6"/>', spark: '<path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>', down: '<path d="M12 4v12m-5-5 5 5 5-5M5 20h14"/>', check: '<path d="m5 12 4 4 10-10"/>',
};

type Student = Santri & { wali_username?: string; data?: any; version?: string | null; updated_at?: string; updated_by?: string };
const st: any = {
  user: null, kamars: [], settings: {}, akun: [], tanpaKamar: [], tidakCocok: [],
  ta: '', sem: 1, view: 'home', kamarId: '', kamar: null, students: [] as Student[], auto: {}, tab: 'ibadah', mode: 'input',
  dirty: new Set<string>(), saving: false, paper: (localStorage.getItem('rp-paper') as 'A4' | 'F4') || 'A4', sel: new Set<string>(), current: '', filter: '', logo: '',
};

function defaultPeriod() {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1;
  return m >= 7 ? { ta: `${y}/${y + 1}`, sem: 1 } : { ta: `${y - 1}/${y}`, sem: 2 };
}
const token = () => { try { return localStorage.getItem('mut_token') || ''; } catch { return ''; } };
async function api(path: string, body: any = {}) {
  const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token() }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ ok: false, error: { message: 'Respons server tidak terbaca.' } }));
  if (!r.ok || !j.ok) throw Object.assign(new Error(j.error?.message || 'Permintaan gagal.'), { status: r.status });
  return j;
}
function toast(msg: string, kind: 'ok' | 'err' = 'ok') {
  const t = document.createElement('div'); t.className = `rp-toast ${kind}`; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.append(t); setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3700);
}
const kurikulum = () => st.settings?.kurikulum || {};
const ctx = (): Ctx => ({ ta: st.ta, sem: st.sem, kamar: st.kamar, settings: st.settings, logo: st.logo, paper: st.paper });
const studentById = (id: string) => st.students.find((s: Student) => s.id === id) as Student;
const dataOf = (s: Student) => (s.data ??= {});

/* ---------- Kerangka ---------- */
const app = document.getElementById('app')!;
function shell(inner: string) {
  const nav = [{ id: 'home', label: 'Kamar', icon: I.bed }];
  if (st.user?.admin) nav.push({ id: 'kelola', label: 'Kelola kamar', icon: I.users }, { id: 'atur', label: 'Pengaturan', icon: I.gear });
  const k = st.kamar;
  const title = st.view === 'kamar' && k ? `Kamar ${k.nama}` : st.view === 'kelola' ? 'Kelola kamar & wali' : st.view === 'atur' ? 'Pengaturan rapor' : 'Rapor Pesantren';
  const peran = st.user?.admin ? 'Pimpinan · semua kamar' : st.user?.koordinator?.length ? `Koordinator ${st.user.koordinator.map((u: string) => u.replace('Ikhwan', 'Putra').replace('Akhwat', 'Putri')).join(', ')}` : 'Wali kamar';
  return nsShell({ app: 'Rapor Pesantren', title, nav, active: st.view === 'kamar' ? 'home' : st.view, user: st.user && { nama: st.user.nama, peran }, actions: periodPicker(), back: st.view !== 'home' }, inner);
}
function periodPicker() {
  const [y] = st.ta.split('/').map(Number);
  const opts = [y - 1, y, y + 1].map((a) => `<option ${a === y ? 'selected' : ''}>${a}/${a + 1}</option>`).join('');
  return `<label class="rp-period"><span class="sr">Tahun pelajaran</span><select data-act="ta">${opts}</select></label>
  <label class="rp-period"><span class="sr">Semester</span><select data-act="sem"><option value="1" ${st.sem === 1 ? 'selected' : ''}>Ganjil</option><option value="2" ${st.sem === 2 ? 'selected' : ''}>Genap</option></select></label>`;
}
function render() {
  const html = st.view === 'home' ? homeView() : st.view === 'kamar' ? kamarView() : st.view === 'kelola' ? kelolaView() : st.view === 'atur' ? aturView() : '';
  app.innerHTML = shell(html);
  if (st.view === 'kamar' && st.mode === 'rapor') drawPreview();
  saveBar();
}

/* ---------- Beranda: daftar kamar ---------- */
function homeView() {
  const u = st.user; const f = st.filter.toLowerCase();
  const groups = new Map<string, any[]>();
  const pisah = !u.admin && st.kamars.some((k: any) => k.ampu) && st.kamars.some((k: any) => !k.ampu);
  for (const k of [...st.kamars].sort((x: any, y: any) => (pisah ? Number(y.ampu) - Number(x.ampu) : 0))) {
    if (f && !`${k.nama} ${k.wali_nama} ${k.unit} ${k.tingkat}`.toLowerCase().includes(f)) continue;
    const g = pisah && k.ampu ? 'Kamar ampuan Anda' : `${pisah ? 'Kamar lain · ' : ''}${k.unit} ${k.lingkungan === 'PUTRA' ? 'Putra' : 'Putri'} · Kelas ${k.tingkat}`;
    (groups.get(g) ?? groups.set(g, []).get(g)!).push(k);
  }
  const milik = pisah ? st.kamars.filter((k: any) => k.ampu) : st.kamars;
  const total = milik.reduce((n: number, k: any) => n + k.jumlah, 0), isi = milik.reduce((n: number, k: any) => n + k.terisi, 0);
  const cards = [...groups].map(([g, ks]) => `<section class="rp-group"><h3>${esc(g)}</h3><div class="rp-cards">${ks.map((k) => {
    const pct = k.jumlah ? Math.round((k.terisi / k.jumlah) * 100) : 0;
    if (k.penuh === false) return `<button class="rp-card lain" data-act="open" data-id="${esc(k.id)}"><span class="rp-card-ic">${icon(I.book)}</span><span class="rp-card-body"><b>${esc(k.nama)}</b><small>${esc(k.wali_nama || 'Wali belum ditetapkan')}</small>
      <span class="rp-meter" aria-label="${k.kitab_terisi} dari ${k.jumlah} santri sudah ada nilai kitab"><i style="width:${k.jumlah ? Math.round((k.kitab_terisi / k.jumlah) * 100) : 0}%"></i></span><small>Kitab ${k.kitab_terisi}/${k.jumlah} · Pidato ${k.pidato_terisi ?? 0}/${k.jumlah}</small></span></button>`;
    return `<button class="rp-card${pisah ? ' ampu' : ''}" data-act="open" data-id="${esc(k.id)}"><span class="rp-card-ic">${icon(I.bed)}</span><span class="rp-card-body"><b>${esc(k.nama)}</b><small>${esc(k.wali_nama || 'Wali belum ditetapkan')}</small>
      <span class="rp-meter" aria-label="${k.terisi} dari ${k.jumlah} santri sudah dinilai"><i style="width:${pct}%"></i></span><small>${k.terisi}/${k.jumlah} santri dinilai</small></span></button>`;
  }).join('')}</div></section>`).join('');
  return `<section class="rp-hero"><div><p class="rp-eyebrow">${st.sem === 1 ? 'Semester ganjil' : 'Semester genap'} ${esc(st.ta)}</p><h1>Assalamu’alaikum, ${esc(u.nama.replace(/^Ust(h)?\.\s*/, ''))}</h1>
  <p>${u.admin ? 'Semua kamar dapat dibuka. Rekap nilai, periksa rapor, lalu cetak per kamar.' : u.koordinator?.length ? `Koordinator ${esc(u.koordinator.join(', '))}: seluruh kamar unit ini dapat dibuka dan dinilai.` : pisah ? 'Kamar ampuan Anda ada di bagian paling atas. Kamar lain di unit yang sama dapat dibuka untuk mengisi nilai Kajian Kitab.' : 'Pilih kamar binaan untuk merekap nilai dan mencetak rapor.'}</p></div>
  <div class="rp-stat"><strong>${total ? Math.round((isi / total) * 100) : 0}%</strong><span>${isi} dari ${total} santri<br>sudah dinilai</span></div></section>
  ${u.admin || u.koordinator?.length || pisah ? `<div class="rp-toolbar"><label class="rp-search"><span class="sr">Cari kamar</span><input type="search" placeholder="Cari kamar, wali, unit…" value="${esc(st.filter)}" data-act="filter"></label>
    ${u.admin ? `<button class="rp-btn ghost" data-act="kelola">${icon(I.users)}Kelola kamar</button><button class="rp-btn ghost" data-act="atur">${icon(I.gear)}Pengaturan rapor</button>` : ''}</div>` : ''}
  ${cards || `<div class="rp-empty"><b>Belum ada kamar binaan.</b><p>Akun ini belum ditetapkan sebagai wali kamar. Hubungi Kasi Kepesantrenan untuk penugasan kamar.</p></div>`}`;
}

/* ---------- Kamar: input nilai & rapor ---------- */
function kamarView() {
  const k = st.kamar;
  const done = st.students.filter((s: Student) => kelengkapan(s, s.data, st.auto[s.id], kurikulum()).pct === 100).length;
  return `<section class="rp-kamarhead"><div><p class="rp-eyebrow">${esc(k.unit)} ${k.lingkungan === 'PUTRA' ? 'Putra' : 'Putri'} · Kelas ${esc(k.tingkat)}</p><h1>Kamar ${esc(k.nama)}</h1><p>${esc(k.wali_nama || '')} · ${st.students.length} santri · ${done} rapor lengkap</p></div>
  <div class="rp-seg" role="tablist" aria-label="Mode kamar" data-nuris-glass>
    <button role="tab" aria-selected="${st.mode === 'input'}" data-act="mode" data-v="input">${icon(I.edit)}Rekap nilai</button>
    <button role="tab" aria-selected="${st.mode === 'rapor'}" data-act="mode" data-v="rapor">${icon(I.print)}Rapor & cetak</button></div></section>
  ${st.mode === 'input' ? inputView() : raporView()}`;
}

function columns(bagian: string): Item[] {
  if (bagian === 'hadis') return [{ k: 'jumlah', id: 'Jumlah hadis hafal', ar: '' }];
  const seen = new Map<string, Item>();
  for (const s of st.students) for (const it of itemsFor(bagian, s, kurikulum())) if (!seen.has(it.k)) seen.set(it.k, it);
  return [...seen.values()];
}
function inputView() {
  const tabs = [...BAGIAN.map((b) => [b.key, b.judul]), ['catatan', 'Catatan']];
  const b = BAGIAN.find((x) => x.key === st.tab);
  const cols = st.tab === 'catatan' ? [] : columns(st.tab);
  const huruf = b?.jenis === 'huruf';
  const ro = st.kamar?.penuh === false && st.tab !== 'kitab' && st.tab !== 'pidato'; // kamar lain di unit: selain Kajian Kitab & Pidato hanya dilihat
  const helper = ro ? '' : st.tab === 'ibadah' ? `<button class="rp-btn soft" data-act="auto">${icon(I.spark)}Isi kosong dari Mutabaah Yaumiyyah</button>`
    : st.tab === 'praktik' ? `<button class="rp-btn soft" data-act="auto">${icon(I.spark)}Isi kosong dari Ujian Praktik Ibadah</button>`
    : st.tab === 'hadis' ? `<button class="rp-btn soft" data-act="auto">${icon(I.spark)}Isi dari setoran Hadis Arbain</button>` : '';
  const fill = st.tab === 'catatan' || ro ? '' : `<label class="rp-fill"><span>Isi semua yang kosong</span><select data-act="fill"><option value="">pilih…</option>${huruf ? HURUF.map((x) => `<option>${x}</option>`).join('') : [95, 90, 85, 80, 75].map((x) => `<option>${x}</option>`).join('')}</select></label>`;
  const head = st.tab === 'catatan' ? '<th>Catatan wali kamar (tampil di rapor)</th>' : cols.map((c) => `<th><span>${esc(c.id)}</span>${c.ar ? `<small lang="ar" dir="rtl">${esc(c.ar)}</small>` : ''}</th>`).join('');
  const rows = st.students.map((s: Student, r: number) => {
    const auto = st.auto[s.id] || {};
    const cells = st.tab === 'catatan'
      ? `<td><textarea data-cell="catatan" data-s="${esc(s.id)}" rows="2" maxlength="800" placeholder="Perkembangan, kekuatan, dan saran untuk santri…"${ro ? ' readonly' : ''}>${esc(s.data?.catatan || '')}</textarea></td>`
      : cols.map((c, ci) => {
        const ok = st.tab === 'hadis' || itemsFor(st.tab, s, kurikulum()).some((x) => x.k === c.k);
        if (!ok) return '<td class="na" title="Tidak diujikan untuk kelas ini">—</td>';
        const isi = s.data?.[st.tab]?.[c.k];
        const saran = nilaiButir(st.tab, c.k, {}, auto).v;
        const hint = saran != null && (isi == null || isi === '') ? `<em title="Saran otomatis">${esc(saran)}</em>` : '';
        const extra = st.tab === 'ibadah' && auto.yaumiyyah?.skor?.[c.k] != null ? ` title="Yaumiyyah: ${auto.yaumiyyah.skor[c.k]}%"` : '';
        return `<td${extra}><input class="${huruf ? 'huruf' : 'angka'}" data-cell="${st.tab}.${c.k}" data-s="${esc(s.id)}" data-r="${r}" data-c="${ci}" value="${esc(isi ?? '')}" ${huruf ? 'maxlength="2" inputmode="text" autocapitalize="characters"' : 'inputmode="decimal"'} aria-label="${esc(c.id)} ${esc(s.nama)}" autocomplete="off"${ro ? ' readonly' : ''}>${hint}</td>`;
      }).join('');
    const kl = kelengkapan(s, s.data, auto, kurikulum());
    const ind = st.tab === 'akhlak' && !ro ? `<button class="rp-mini" data-act="indikator" data-id="${esc(s.id)}" title="Isi skor 20 indikator akhlak (1–4)">Indikator${s.data?.akhlak_skor ? ' ✓' : ''}</button>` : '';
    return `<tr><th scope="row"><span class="rp-nm">${esc(s.nama)}</span><small>${kl.isi}/${kl.total} butir${st.dirty.has(s.id) ? ' · <b>belum disimpan</b>' : ''}</small>${ind}</th>${cells}</tr>`;
  }).join('');
  const lain = st.kamar?.penuh === false ? `<div class="rp-lain">${icon(I.book)}<span><b>Kamar ${esc(st.kamar.nama)} bukan kamar ampuan Anda.</b> Anda dapat mengisi <b>Kajian Kitab</b> (nilai ujian semester kitab) dan <b>Pidato</b> untuk kamar ini; kelompok nilai lain hanya dapat dilihat dan diisi oleh wali kamarnya (${esc(st.kamar.wali_nama || '–')}).</span></div>` : '';
  return `${lain}<div class="rp-tabs" role="tablist" aria-label="Kelompok nilai" data-nuris-glass>${tabs.map(([k, t]) => `<button role="tab" aria-selected="${st.tab === k}" data-act="tab" data-v="${k}">${t}</button>`).join('')}</div>
  <div class="rp-gridbar"><p>${b ? `${esc(b.judul)} <span lang="ar" dir="rtl">${b.ar}</span> · skala ${b.skala}${huruf ? ' — ketik A, B+, B, atau C' : b.jenis === 'hadis' ? ' — jumlah hadis yang sudah disetorkan hafal' : st.tab === 'praktik' ? ' — tiap subujian dinilai terpisah (A 90–100, B+ 80–89, B 70–79, C &lt;70)' : ''}` : 'Catatan singkat wali kamar untuk setiap santri.'}</p>
  <div>${helper}${fill}<button class="rp-btn ghost" data-act="csv">${icon(I.down)}Leger CSV</button></div></div>
  <div class="rp-gridwrap"><table class="rp-grid"><thead><tr><th>Santri</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
  ${st.tab === 'akhlak' ? akhlakLegend() : ''}
  <p class="rp-tip">Tip: tempel (Ctrl+V) blok nilai dari Excel/Google Sheets langsung ke kotak pertama. Enter atau panah untuk pindah. Nilai miring abu-abu adalah saran otomatis; rapor memakainya bila kotak dibiarkan kosong.</p>`;
}

function raporView() {
  if (!st.current || !studentById(st.current)) st.current = st.students[0]?.id || '';
  const list = st.students.map((s: Student) => {
    const kl = kelengkapan(s, s.data, st.auto[s.id], kurikulum());
    return `<li class="${s.id === st.current ? 'on' : ''}"><label class="rp-chk"><input type="checkbox" data-act="sel" data-id="${esc(s.id)}" ${st.sel.has(s.id) ? 'checked' : ''}><span class="sr">Pilih ${esc(s.nama)}</span></label>
    <button data-act="cur" data-id="${esc(s.id)}"><b>${esc(s.nama)}</b><span class="rp-meter sm"><i style="width:${kl.pct}%"></i></span><small>${kl.pct}% lengkap</small></button></li>`;
  }).join('');
  const n = st.sel.size;
  return `<div class="rp-print-layout"><aside class="rp-list"><div class="rp-list-head"><label class="rp-chk"><input type="checkbox" data-act="selall" ${n === st.students.length && n ? 'checked' : ''}><span>Pilih semua</span></label><small>${n} dipilih</small></div><ul>${list}</ul></aside>
  <section class="rp-preview"><div class="rp-actions">
    <div class="rp-seg sm" role="tablist" aria-label="Ukuran kertas" data-nuris-glass><button role="tab" aria-selected="${st.paper === 'A4'}" data-act="paper" data-v="A4">A4</button><button role="tab" aria-selected="${st.paper === 'F4'}" data-act="paper" data-v="F4">F4</button></div>
    <span class="rp-grow"></span>
    <button class="rp-btn ghost" data-act="print1">${icon(I.print)}Cetak santri ini</button>
    <button class="rp-btn ghost" data-act="pdf1">${icon(I.pdf)}PDF santri ini</button>
    <button class="rp-btn primary" data-act="printsel" ${n ? '' : 'disabled'}>${icon(I.print)}Cetak ${n || ''} terpilih</button>
    <button class="rp-btn primary" data-act="pdfsel" ${n ? '' : 'disabled'}>${icon(I.pdf)}PDF ${n || ''} terpilih</button></div>
    <p class="rp-tip">Klik nilai atau catatan pada rapor untuk mengubahnya sebelum dicetak. Perubahan tersimpan otomatis.</p>
    <div class="rp-paper-scroll"><div id="preview" class="editing"></div></div></section></div>`;
}
function drawPreview() {
  const box = $('#preview'); if (!box) return;
  const s = studentById(st.current); if (!s) { box.innerHTML = '<div class="rp-empty">Belum ada santri di kamar ini.</div>'; return; }
  box.innerHTML = raporHTML(s, s.data, st.auto[s.id], ctx(), true);
  const pg = $('.rp-page', box); if (pg) fitPage(pg);
  fitPreview();
}
function fitPreview() {
  const scroll = $('.rp-paper-scroll'), page = $('#preview .rp-page');
  if (!scroll || !page) return;
  const w = scroll.clientWidth - 8, pw = page.offsetWidth;
  const k = Math.min(1, w / pw);
  ($('#preview') as HTMLElement).style.transform = `scale(${k})`;
  ($('#preview') as HTMLElement).style.height = page.offsetHeight * k + 'px';
}

/* ---------- Edit nilai di pratinjau ---------- */
function editPopover(target: HTMLElement) {
  const key = target.dataset.edit!; const s = studentById(st.current);
  if (!bolehUbah(s, key)) { toast(PESAN_KITAB, 'err'); return; }
  $('.rp-pop')?.remove();
  const pop = document.createElement('div'); pop.className = 'rp-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Ubah nilai');
  if (key === 'catatan') {
    pop.innerHTML = `<label>Catatan wali kamar<textarea rows="5" maxlength="800">${esc(s.data?.catatan || '')}</textarea></label><div><button class="rp-btn ghost" data-x="batal">Batal</button><button class="rp-btn primary" data-x="ok">Simpan</button></div>`;
  } else {
    const [b, k] = key.split('.');
    const bag = BAGIAN.find((x) => x.key === b)!;
    const cur = s.data?.[b]?.[k] ?? '';
    const saran = nilaiButir(b, k, {}, st.auto[s.id]).v;
    pop.innerHTML = `<label>${esc(bag.judul)}${bag.jenis === 'huruf' ? `<span class="rp-choice">${HURUF.map((x) => `<button type="button" data-v="${x}" class="${cur === x ? 'on' : ''}">${x}</button>`).join('')}</span>` : `<input type="number" min="0" max="100" step="1" value="${esc(cur)}" placeholder="${saran != null ? 'saran ' + saran : '0–100'}">`}</label>
      ${saran != null ? `<small>Saran otomatis: <b>${esc(saran)}</b> (dipakai bila dikosongkan)</small>` : ''}<div><button class="rp-btn ghost" data-x="kosong">Kosongkan</button><button class="rp-btn primary" data-x="ok">Simpan</button></div>`;
  }
  document.body.append(pop);
  const r = target.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(innerWidth - pop.offsetWidth - 8, r.left + r.width / 2 - pop.offsetWidth / 2)) + 'px';
  pop.style.top = Math.min(innerHeight - pop.offsetHeight - 8, r.bottom + 8) + 'px';
  (pop.querySelector('textarea,input,button') as HTMLElement)?.focus();
  const close = () => { pop.remove(); target.focus(); };
  pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) (pop.querySelector('[data-x=ok]') as HTMLElement).click(); });
  pop.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('button'); if (!t) return;
    if (t.dataset.v) { setValue(s, key, t.dataset.v); close(); drawPreview(); return; }
    if (t.dataset.x === 'batal') return close();
    if (t.dataset.x === 'kosong') { setValue(s, key, ''); close(); drawPreview(); return; }
    if (t.dataset.x === 'ok') {
      const el = pop.querySelector('textarea,input') as HTMLInputElement | null;
      if (el && !setValue(s, key, el.value)) return;
      close(); drawPreview();
    }
  });
  setTimeout(() => document.addEventListener('pointerdown', function out(ev) { if (!pop.contains(ev.target as Node)) { pop.remove(); document.removeEventListener('pointerdown', out); } }), 0);
}

/* ---------- Akhlak: rubrik & 20 indikator ---------- */
const KOOR_UNITS = ['SMP Ikhwan', 'SMA Ikhwan', 'MA Ikhwan', 'SMP Akhwat', 'SMA Akhwat', 'MA Akhwat'];
function akhlakLegend() {
  return `<details class="rp-legend" open><summary>Rubrik penilaian akhlak (Panduan Penilaian Akhlak Santri)</summary>
  <table><thead><tr><th>Skor</th><th>Predikat</th><th>Pedoman pemberian skor</th><th>Rentang rerata aspek</th></tr></thead><tbody>
  ${RUBRIK_AKHLAK.map((r) => `<tr><td>${r.skor}</td><td><b>${r.huruf}</b> ${r.label}</td><td>${r.pedoman}</td><td>${r.rentang}</td></tr>`).join('')}</tbody></table>
  <p>Nilai aspek = jumlah skor indikator yang teramati ÷ banyaknya indikator yang teramati (dua angka di belakang koma), lalu dicocokkan dengan rentang. Sakit atau udzur syar'i tidak dihitung sebagai pelanggaran. Gunakan tombol <b>Indikator</b> pada nama santri, atau ketik langsung huruf A, B+, B, C.</p></details>`;
}
function indikatorDialog(s: Student) {
  $('.rp-modal')?.remove();
  const d = dataOf(s); const skor = { ...(d.akhlak_skor || {}) };
  const m = document.createElement('div'); m.className = 'rp-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Skor indikator akhlak');
  const body = () => AKHLAK.map((a, ai) => {
    const avg = rerataAkhlak({ akhlak_skor: skor }, a.k);
    return `<fieldset><legend>Aspek ${ai + 1}. ${esc(a.id)} <span lang="ar" dir="rtl">${a.ar}</span><b class="rp-avg">${avg == null ? 'belum teramati' : `${String(avg.toFixed(2)).replace('.', ',')} → ${hurufAkhlak(avg)}`}</b></legend>
    ${INDIKATOR_AKHLAK[a.k].map((t, i) => { const key = `${a.k}_${i + 1}`; return `<div class="rp-ind"><span><small>${ai + 1}.${i + 1}</small> ${esc(t)}</span><span class="rp-choice">${[4, 3, 2, 1].map((n) => `<button type="button" data-k="${key}" data-n="${n}" class="${skor[key] === n ? 'on' : ''}" aria-label="Skor ${n}">${n}</button>`).join('')}<button type="button" data-k="${key}" data-n="0" class="${skor[key] == null ? 'on soft' : 'soft'}" title="Belum cukup teramati">–</button></span></div>`; }).join('')}</fieldset>`;
  }).join('');
  const draw = () => { m.innerHTML = `<div class="rp-modal-box"><header><div><small>Akhlak · skor 1–4 per indikator</small><h2>${esc(s.nama)}</h2></div><button class="rp-iconbtn" data-x="tutup" aria-label="Tutup">✕</button></header>
    <div class="rp-modal-body">${body()}</div><footer><small>4 Sangat Baik · 3 Baik · 2 Cukup · 1 Perlu Pembinaan · – belum teramati</small><span class="rp-grow"></span><button class="rp-btn ghost" data-x="tutup">Batal</button><button class="rp-btn primary" data-x="ok">Terapkan ke rapor</button></footer></div>`; };
  draw(); document.body.append(m); (m.querySelector('[data-n]') as HTMLElement)?.focus();
  m.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('button') as HTMLElement | null; if (!t) { if (e.target === m) m.remove(); return; }
    if (t.dataset.k) { const n = Number(t.dataset.n); if (n) skor[t.dataset.k] = n; else delete skor[t.dataset.k]; const y = (m.querySelector('.rp-modal-body') as HTMLElement).scrollTop; draw(); (m.querySelector('.rp-modal-body') as HTMLElement).scrollTop = y; return; }
    if (t.dataset.x === 'tutup') return m.remove();
    if (t.dataset.x === 'ok') {
      d.akhlak_skor = Object.keys(skor).length ? skor : undefined; if (!d.akhlak_skor) delete d.akhlak_skor;
      d.akhlak ??= {};
      for (const a of AKHLAK) { const avg = rerataAkhlak(d, a.k); if (avg != null) d.akhlak[a.k] = hurufAkhlak(avg); }
      markDirty(s.id); m.remove(); render(); toast('Skor indikator diterapkan ke predikat akhlak.');
    }
  });
  m.addEventListener('keydown', (e) => { if (e.key === 'Escape') m.remove(); });
}

/* ---------- Nilai ---------- */
// Kamar lain di unit yang sama (bukan ampuan): hanya Kajian Kitab yang boleh diisi.
const bolehUbah = (s: Student, key: string) => (s as any).penuh !== false || key.startsWith('kitab.') || key.startsWith('pidato.');
const PESAN_KITAB = 'Kamar ini bukan ampuan Anda: hanya nilai Kajian Kitab dan Pidato yang dapat diisi.';
function setValue(s: Student, key: string, raw: string): boolean {
  if (!bolehUbah(s, key)) { toast(PESAN_KITAB, 'err'); return false; }
  const d = dataOf(s);
  if (key === 'catatan') { d.catatan = raw.slice(0, 800); markDirty(s.id); return true; }
  const [b, k] = key.split('.');
  const bag = BAGIAN.find((x) => x.key === b)!;
  const v = raw.trim().toUpperCase().replace(',', '.');
  d[b] ??= {};
  if (v === '') delete d[b][k];
  else if (bag.jenis === 'huruf') { const h = normHuruf(v); if (!h) { toast('Predikat hanya A, B+, B, atau C.', 'err'); return false; } d[b][k] = h; }
  else { const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > 100 || (b === 'hadis' && (!Number.isInteger(n) || n > 42))) { toast(b === 'hadis' ? 'Jumlah hadis 0–42.' : 'Nilai harus 0–100.', 'err'); return false; } d[b][k] = n; }
  markDirty(s.id); return true;
}
let saveTimer = 0;
function markDirty(id: string) { st.dirty.add(id); saveBar(); clearTimeout(saveTimer); saveTimer = window.setTimeout(save, 1400); }
async function save() {
  if (st.saving || !st.dirty.size) return;
  st.saving = true; saveBar();
  const ids = [...st.dirty]; st.dirty.clear();
  try {
    for (let i = 0; i < ids.length; i += 50) {
      const items = ids.slice(i, i + 50).map((id) => { const s = studentById(id); return { santri_id: id, data: s.data || {}, version: s.version || null }; });
      const r = await api('save', { ta: st.ta, sem: st.sem, items });
      for (const x of r.saved) { const s = studentById(x.santri_id); s.version = x.version; s.updated_at = x.updated_at; }
      if (r.conflicts.length) toast(`${r.conflicts.length} santri diubah di perangkat lain. Muat ulang kamar untuk melihat versi terbaru.`, 'err');
    }
    const k = st.kamars.find((x: any) => x.id === st.kamarId); if (k) k.terisi = st.students.filter((s: Student) => s.version).length;
  } catch (e: any) { ids.forEach((id) => st.dirty.add(id)); toast(e.message, 'err'); }
  finally { st.saving = false; saveBar(); }
}
function saveBar() {
  let bar = $('#rp-save');
  if (st.view !== 'kamar') { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'rp-save'; bar.setAttribute('aria-live', 'polite'); document.body.append(bar); }
  bar.className = st.saving ? 'busy' : st.dirty.size ? 'dirty' : 'clean';
  bar.innerHTML = st.saving ? '<span class="rp-dot"></span>Menyimpan…' : st.dirty.size ? `<span class="rp-dot"></span>${st.dirty.size} santri belum disimpan <button data-act="save">Simpan sekarang</button>` : `${icon(I.check)}Semua nilai tersimpan`;
}

function applyAuto() {
  let n = 0;
  for (const s of st.students) {
    const auto = st.auto[s.id] || {};
    const cols = st.tab === 'hadis' ? [{ k: 'jumlah' }] : itemsFor(st.tab, s, kurikulum());
    for (const c of cols) {
      const isi = s.data?.[st.tab]?.[c.k];
      const v = nilaiButir(st.tab, c.k, {}, auto).v;
      if ((isi == null || isi === '') && v != null) { dataOf(s)[st.tab] ??= {}; s.data[st.tab][c.k] = v; markDirty(s.id); n++; }
    }
  }
  toast(n ? `${n} nilai diisi dari data otomatis.` : st.tab === 'ibadah' ? 'Belum ada data Mutabaah Yaumiyyah untuk semester ini.' : st.tab === 'praktik' ? 'Belum ada nilai Ujian Praktik Ibadah untuk semester ini.' : 'Belum ada setoran hadis yang tercatat.', n ? 'ok' : 'err');
  render();
}
function fillEmpty(v: string) {
  let n = 0;
  for (const s of st.students) {
    const cols = st.tab === 'hadis' ? [{ k: 'jumlah' }] : itemsFor(st.tab, s, kurikulum());
    for (const c of cols) { const isi = s.data?.[st.tab]?.[c.k]; if (isi == null || isi === '') { if (setValue(s, `${st.tab}.${c.k}`, v)) n++; } }
  }
  toast(`${n} kotak kosong diisi ${v}.`); render();
}
function csv() {
  const head = ['No', 'Nama', 'Unit', 'Kelas', 'Kamar'];
  const cols: [string, Item][] = [];
  for (const b of BAGIAN) for (const c of columns(b.key)) { cols.push([b.key, c]); head.push(`${b.judul}: ${c.id}`); }
  head.push('Catatan');
  const lines = [head];
  st.students.forEach((s: Student, i: number) => lines.push([String(i + 1), s.nama, s.unit, s.tingkat, st.kamar.nama, ...cols.map(([b, c]) => String(nilaiButir(b, c.k, s.data, st.auto[s.id]).v ?? '')), s.data?.catatan || '']));
  const text = '﻿' + lines.map((l) => l.map((x) => /[",;\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = `Leger ${st.kamar.nama} ${st.ta.replace('/', '-')} S${st.sem}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}

/* ---------- Cetak & PDF ---------- */
function printPages(ids: string[]) {
  let host = $('#rp-print'); host?.remove();
  host = document.createElement('div'); host.id = 'rp-print';
  host.innerHTML = `<style>@page{size:${st.paper === 'F4' ? '210mm 330mm' : 'A4'};margin:0}</style>` + ids.map((id) => { const s = studentById(id); return raporHTML(s, s.data, st.auto[id], ctx(), false); }).join('');
  document.body.append(host);
  $$('.rp-page', host).forEach(fitPage);
  const done = () => { host!.remove(); removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  document.fonts.ready.then(() => setTimeout(() => print(), 60));
}
async function pdf(ids: string[]) {
  await save();
  const host = document.createElement('div'); host.className = 'rp-offscreen';
  host.innerHTML = ids.map((id) => { const s = studentById(id); return raporHTML(s, s.data, st.auto[id], ctx(), false); }).join('');
  document.body.append(host);
  const bar = document.createElement('div'); bar.className = 'rp-toast'; bar.setAttribute('role', 'status'); document.body.append(bar);
  try {
    await document.fonts.ready;
    $$('.rp-page', host).forEach(fitPage);
    const nama = ids.length === 1 ? `Rapor ${studentById(ids[0]).nama} ${st.ta.replace('/', '-')} S${st.sem}` : `Rapor Kamar ${st.kamar.nama} ${st.ta.replace('/', '-')} S${st.sem}`;
    await unduhPdf($$('.rp-page', host), pageSize(st.paper), RAPOR_CSS, nama, (i, n) => { bar.textContent = `Menyusun PDF ${i + 1} dari ${n}…`; });
    bar.textContent = 'PDF siap diunduh.';
  } catch (e) {
    bar.textContent = 'Browser ini belum bisa menyusun PDF langsung. Membuka dialog cetak: pilih “Simpan sebagai PDF”.';
    printPages(ids);
  } finally { host.remove(); setTimeout(() => bar.remove(), 2600); }
}

/* ---------- Kelola kamar (pimpinan) ---------- */
function kelolaView() {
  const opt = (sel: string) => `<option value="">— tanpa wali —</option>` + st.akun.map((a: any) => `<option value="${esc(a.username)}" ${a.username === sel ? 'selected' : ''}>${esc(a.nama)}</option>`).join('');
  const kamarOpt = (unitHint = '') => st.kamars.map((k: any) => `<option value="${esc(k.id)}" ${unitHint && !unitHint.startsWith(k.unit) ? 'hidden' : ''}>${esc(k.nama)} · ${k.unit} ${k.lingkungan === 'PUTRA' ? 'Pa' : 'Pi'} ${k.tingkat}</option>`).join('');
  const assign = (s: any, extra = '') => `<li><span><b>${esc(s.nama)}</b><small>${esc(s.unit || '')} ${esc(s.tingkat || '')}${extra}</small></span><select data-act="pindah" data-id="${esc(s.id)}"><option value="">pilih kamar…</option>${kamarOpt()}</select></li>`;
  return `<section class="rp-kamarhead"><div><p class="rp-eyebrow">Pimpinan</p><h1>Kelola kamar & wali</h1><p>Data awal diimpor dari daftar kamar 2026/2027. Perubahan di sini langsung berlaku untuk rapor.</p></div></section>
  <div class="rp-two">
  <section class="rp-panel"><h3>Santri belum punya kamar <span class="rp-badge">${st.tanpaKamar.length}</span></h3>${st.tanpaKamar.length ? `<ul class="rp-assign">${st.tanpaKamar.map((s: any) => assign(s)).join('')}</ul>` : '<p class="rp-muted">Semua santri aktif sudah masuk kamar.</p>'}
    ${st.tidakCocok.length ? `<h3>Nama di daftar kamar yang tidak ditemukan <span class="rp-badge">${st.tidakCocok.length}</span></h3><ul class="rp-assign">${st.tidakCocok.map((t: any) => `<li><span><b>${esc(t.nama)}</b><small>${esc(st.kamars.find((k: any) => k.id === t.kamar_id)?.nama || t.kamar_id)} — cari nama santri yang benar di bawah, lalu pindahkan ke kamar ini</small></span></li>`).join('')}</ul>` : ''}
    <h3>Pindahkan santri</h3><label class="rp-search"><span class="sr">Cari santri</span><input type="search" placeholder="Ketik minimal 2 huruf nama santri" data-act="cari"></label><ul class="rp-assign" id="hasil-cari"></ul></section>
  <section class="rp-panel"><h3>Wali kamar</h3><div class="rp-table-wrap"><table class="rp-list-table"><thead><tr><th>Kamar</th><th>Kelas</th><th>Santri</th><th>Wali kamar</th></tr></thead><tbody>
    ${st.kamars.map((k: any) => `<tr><td><b>${esc(k.nama)}</b><small>${k.unit} ${k.lingkungan === 'PUTRA' ? 'Putra' : 'Putri'}</small></td><td>${esc(k.tingkat)}</td><td>${k.jumlah}</td><td><select data-act="wali" data-id="${esc(k.id)}" aria-label="Wali kamar ${esc(k.nama)}">${opt(k.wali_username)}</select></td></tr>`).join('')}
    </tbody></table></div>
    <h3>Tambah kamar</h3><form class="rp-form" data-form="kamar"><label>Nama kamar<input name="nama" required maxlength="80" placeholder="mis. Khalid 13"></label>
    <label>Jenjang<select name="unit"><option>SMP</option><option>SMA</option><option>MA</option></select></label><label>Lingkungan<select name="lingkungan"><option value="PUTRA">Putra</option><option value="PUTRI">Putri</option></select></label>
    <label>Kelas<select name="tingkat">${[7, 8, 9, 10, 11, 12].map((x) => `<option>${x}</option>`).join('')}</select></label><label>Wali<select name="wali_username">${opt('')}</select></label><button class="rp-btn primary">Simpan kamar</button></form></section></div>`;
}

/* ---------- Pengaturan rapor (pimpinan) ---------- */
function aturView() {
  const u = st.settings.umum || {}; const kur = kurikulum();
  const kelas = Object.keys(KITAB_KELAS);
  const kitabRows = kelas.map((kk) => {
    const sel: string[] = kur.kitab?.[kk] || KITAB_KELAS[kk];
    return `<tr><th>${kk.replace('-', ' kelas ')}</th><td>${Object.values(KITAB).map((it) => `<label class="rp-tag"><input type="checkbox" name="kitab:${kk}" value="${it.k}" ${sel.includes(it.k) ? 'checked' : ''}>${esc(it.id)}</label>`).join('')}</td></tr>`;
  }).join('');
  return `<section class="rp-kamarhead"><div><p class="rp-eyebrow">Pimpinan</p><h1>Pengaturan rapor</h1><p>Berlaku untuk semua kamar. Pratinjau rapor langsung mengikuti perubahan.</p></div></section>
  <form class="rp-panel rp-form wide" data-form="umum">
    <h3>Identitas & tanda tangan</h3>
    <label>Judul rapor<input name="judul" value="${esc(u.judul)}"></label><label>Subjudul<input name="sub" value="${esc(u.sub)}"></label>
    <label>Tempat<input name="tempat" value="${esc(u.tempat)}"></label><label>Tanggal rapor<input type="date" name="tanggal" value="${esc(u.tanggal)}"></label>
    <label>Nama Kabid Kepesantrenan<input name="kabid_nama" value="${esc(u.kabid_nama)}"></label><label>Jabatan<input name="kabid_jabatan" value="${esc(u.kabid_jabatan)}"></label>
    <label>Sekolah SMP<input name="sekolah.SMP" value="${esc(u.sekolah?.SMP)}"></label><label>Sekolah SMA<input name="sekolah.SMA" value="${esc(u.sekolah?.SMA)}"></label><label>Sekolah MA<input name="sekolah.MA" value="${esc(u.sekolah?.MA)}"></label>
    <h3>Ketuntasan</h3><label>KKM nilai angka<input type="number" name="kkm" min="0" max="100" value="${esc(u.kkm)}"></label>
    ${[7, 8, 9, 10, 11, 12].map((t) => `<label>Target hadis kelas ${t}<input type="number" min="0" max="42" name="hadis.${t}" value="${esc(u.hadis_target?.[t] ?? '')}"></label>`).join('')}
    <p class="rp-muted span">Predikat mengikuti Mutabaah Tahfidz dan Ujian Praktik Ibadah: A 90–100, B+ 80–89, B 70–79, C &lt; 70. Saran Ibadah dari Mutabaah Yaumiyyah memakai batas yang sama atas persentase capaian. Akhlak memakai rubrik 20 indikator (skor 1–4).</p>
    <h3>Koordinator unit</h3><p class="rp-muted span">Koordinator dapat membuka dan menilai seluruh kamar di unitnya (juga di Ujian Praktik dan Rapor Tahfidz).</p>
    ${KOOR_UNITS.map((un) => `<label>${un.replace('Ikhwan', 'Putra').replace('Akhwat', 'Putri')}<select name="koor.${un}"><option value="">— belum ditetapkan —</option>${st.akun.map((a: any) => `<option value="${esc(a.username)}" ${(st.settings.koordinator?.[a.username] || []).includes(un) ? 'selected' : ''}>${esc(a.nama)}</option>`).join('')}</select></label>`).join('')}
    <h3>Kitab yang diujikan</h3><table class="rp-kitab span"><tbody>${kitabRows}</tbody></table>
    <div class="span"><button class="rp-btn primary">Simpan pengaturan</button></div></form>`;
}

/* ---------- Alur data ---------- */
async function boot() {
  const p = defaultPeriod(); st.ta = sessionStorage.getItem('rp-ta') || p.ta; st.sem = Number(sessionStorage.getItem('rp-sem')) || p.sem;
  if (!token()) { app.innerHTML = shell(`<div class="rp-empty"><b>Silakan masuk terlebih dahulu.</b><p>Rapor Pesantren memakai akun Mutabaah. Masuk melalui portal Kepesantrenan Nuris, lalu buka kembali aplikasi ini.</p><a class="rp-btn primary" href="/">Buka portal</a></div>`); return; }
  app.innerHTML = shell('<div class="rp-loading" aria-busy="true"><span></span><span></span><span></span></div>');
  try {
    fetch('/nuris-mark.svg').then((r) => r.blob()).then((b) => new Promise<string>((ok) => { const f = new FileReader(); f.onload = () => ok(String(f.result)); f.readAsDataURL(b); })).then((u) => { st.logo = u; if (st.mode === 'rapor') drawPreview(); }).catch(() => {});
    const r = await api('boot', { ta: st.ta, sem: st.sem });
    Object.assign(st, { user: r.user, kamars: r.kamars, settings: r.settings, akun: r.akun || [], tanpaKamar: r.tanpaKamar || [], tidakCocok: r.tidakCocok || [] });
    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash.startsWith('kamar=')) return openKamar(hash.slice(6));
    if (!st.user.admin && st.kamars.length === 1) return openKamar(st.kamars[0].id);
    st.view = 'home'; render();
  } catch (e: any) {
    if (e.status === 401 && window.parent !== window) parent.postMessage({ type: 'nuris:session-ended' }, location.origin);
    app.innerHTML = shell(`<div class="rp-empty"><b>${e.status === 401 ? 'Sesi berakhir.' : 'Rapor belum dapat dimuat.'}</b><p>${esc(e.message)}</p>${e.status === 401 ? '<a class="rp-btn primary" href="/">Masuk kembali</a>' : '<button class="rp-btn primary" data-act="reload">Coba lagi</button>'}</div>`);
  }
}
async function openKamar(id: string) {
  await save();
  st.view = 'kamar'; st.kamarId = id; st.sel = new Set(); st.current = '';
  app.innerHTML = shell('<div class="rp-loading" aria-busy="true"><span></span><span></span><span></span></div>');
  try {
    const r = await api('kamar', { ta: st.ta, sem: st.sem, kamar: id });
    st.kamar = r.kamar; st.students = r.students; st.auto = r.auto;
    if (r.kamar.penuh === false) { st.tab = 'kitab'; st.mode = 'input'; }
    history.replaceState(null, '', '#kamar=' + encodeURIComponent(id));
    render(); ($('#main') as HTMLElement)?.focus();
  } catch (e: any) { toast(e.message, 'err'); st.view = 'home'; render(); }
}
async function reloadBoot() { const r = await api('boot', { ta: st.ta, sem: st.sem }); Object.assign(st, { kamars: r.kamars, settings: r.settings, akun: r.akun || [], tanpaKamar: r.tanpaKamar || [], tidakCocok: r.tidakCocok || [] }); }

/* ---------- Peristiwa ---------- */
document.addEventListener('click', async (e) => {
  const nv = (e.target as HTMLElement).closest<HTMLElement>('[data-nav]');
  if (nv) { e.preventDefault(); await save(); const v = nv.dataset.nav!; if (v === 'home') { st.view = 'home'; history.replaceState(null, '', location.pathname); await reloadBoot().catch(() => {}); } else st.view = v; render(); return; }
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act],[data-edit]'); if (!t) return;
  if (t.dataset.edit && t.closest('#preview')) return editPopover(t);
  const a = t.dataset.act;
  if (a === 'home' || a === 'back') { await save(); st.view = 'home'; history.replaceState(null, '', location.pathname); await reloadBoot().catch(() => {}); render(); }
  else if (a === 'open') openKamar(t.dataset.id!);
  else if (a === 'mode') { st.mode = t.dataset.v; render(); }
  else if (a === 'tab') { st.tab = t.dataset.v; render(); ($('.rp-grid input,.rp-grid textarea') as HTMLElement)?.focus(); }
  else if (a === 'auto') applyAuto();
  else if (a === 'csv') csv();
  else if (a === 'save') save();
  else if (a === 'cur') { st.current = t.dataset.id; $$('.rp-list li').forEach((li) => li.classList.toggle('on', !!li.querySelector(`[data-id="${CSS.escape(st.current)}"]`))); drawPreview(); }
  else if (a === 'paper') { st.paper = t.dataset.v; localStorage.setItem('rp-paper', st.paper); render(); }
  else if (a === 'print1') { await save(); printPages([st.current]); }
  else if (a === 'pdf1') pdf([st.current]);
  else if (a === 'printsel') { await save(); printPages(st.students.filter((s: Student) => st.sel.has(s.id)).map((s: Student) => s.id)); }
  else if (a === 'pdfsel') pdf(st.students.filter((s: Student) => st.sel.has(s.id)).map((s: Student) => s.id));
  else if (a === 'kelola') { st.view = 'kelola'; render(); }
  else if (a === 'atur') { st.view = 'atur'; render(); }
  else if (a === 'reload') location.reload();
  else if (a === 'apps') appsMenu(t);
  else if (a === 'indikator') { const s = studentById(t.dataset.id!); if (bolehUbah(s, 'akhlak.x')) indikatorDialog(s); else toast(PESAN_KITAB, 'err'); }
});
document.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement;
  if ((e.key === 'Enter' || e.key === ' ') && t.dataset?.edit && t.closest('#preview')) { e.preventDefault(); editPopover(t); return; }
  if (!(t instanceof HTMLInputElement) || !t.dataset.cell) return;
  const r = Number(t.dataset.r), c = Number(t.dataset.c);
  const go = (dr: number, dc: number) => { const n = $<HTMLInputElement>(`.rp-grid input[data-r="${r + dr}"][data-c="${c + dc}"]`); if (n) { n.focus(); n.select(); return true; } return false; };
  if (e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); go(1, 0) || go(-r + 0, 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); go(-1, 0); }
  else if (e.key === 'ArrowRight' && (t.selectionStart === t.value.length)) go(0, 1);
  else if (e.key === 'ArrowLeft' && !t.selectionStart) go(0, -1);
});
document.addEventListener('input', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.act === 'filter') { st.filter = t.value; const pos = t.selectionStart; render(); const n = $<HTMLInputElement>('[data-act=filter]'); n?.focus(); n?.setSelectionRange(pos, pos); return; }
  if (t.dataset.act === 'cari') return cari(t.value);
  if (!t.dataset.cell) return;
  const s = studentById(t.dataset.s!);
  if (t.classList.contains('huruf')) {
    t.value = t.value.toUpperCase().replace(/\s/g, '');
    if (t.value && !/^(A|B\+?|C)$/.test(t.value)) { t.value = ''; t.classList.add('bad'); setTimeout(() => t.classList.remove('bad'), 500); return; }
    setValue(s, t.dataset.cell, t.value); t.nextElementSibling?.remove();
    if (t.value && t.value !== 'B') { const n = $<HTMLInputElement>(`.rp-grid input[data-r="${Number(t.dataset.r) + 1}"][data-c="${t.dataset.c}"]`); n?.focus(); n?.select(); }
  } else if (t.tagName === 'TEXTAREA') setValue(s, 'catatan', t.value);
});
document.addEventListener('change', async (e) => {
  const t = e.target as HTMLInputElement;
  if (t.dataset.cell && t.classList.contains('angka')) { const s = studentById(t.dataset.s!); if (!setValue(s, t.dataset.cell, t.value)) t.value = String(s.data?.[t.dataset.cell.split('.')[0]]?.[t.dataset.cell.split('.')[1]] ?? ''); return; }
  const a = t.dataset.act;
  if (a === 'ta' || a === 'sem') {
    await save();
    if (a === 'ta') st.ta = t.value; else st.sem = Number(t.value);
    sessionStorage.setItem('rp-ta', st.ta); sessionStorage.setItem('rp-sem', String(st.sem));
    await reloadBoot().catch((er) => toast(er.message, 'err'));
    if (st.view === 'kamar') openKamar(st.kamarId); else render();
  } else if (a === 'fill' && t.value) fillEmpty(t.value);
  else if (a === 'sel') { t.checked ? st.sel.add(t.dataset.id) : st.sel.delete(t.dataset.id); render(); }
  else if (a === 'selall') { st.sel = t.checked ? new Set(st.students.map((s: Student) => s.id)) : new Set(); render(); }
  else if (a === 'wali') {
    const k = st.kamars.find((x: any) => x.id === t.dataset.id);
    try { await api('kamar-save', { kamar: { ...k, wali_username: t.value || null } }); k.wali_username = t.value; k.wali_nama = st.akun.find((x: any) => x.username === t.value)?.nama || ''; toast(`Wali kamar ${k.nama} disimpan.`); } catch (er: any) { toast(er.message, 'err'); }
  } else if (a === 'pindah' && t.value) {
    try { await api('anggota-save', { santri_id: t.dataset.id, kamar_id: t.value }); toast('Santri dipindahkan.'); await reloadBoot(); render(); } catch (er: any) { toast(er.message, 'err'); }
  }
});
document.addEventListener('paste', (e) => {
  const t = e.target as HTMLInputElement; if (!t.dataset?.cell || t.tagName !== 'INPUT') return;
  const text = e.clipboardData?.getData('text') || ''; if (!/[\t\n]/.test(text)) return;
  e.preventDefault();
  const rows = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((l) => l.split('\t'));
  const r0 = Number(t.dataset.r), c0 = Number(t.dataset.c); let n = 0;
  rows.forEach((row, dr) => row.forEach((v, dc) => { const el = $<HTMLInputElement>(`.rp-grid input[data-r="${r0 + dr}"][data-c="${c0 + dc}"]`); if (el && setValue(studentById(el.dataset.s!), el.dataset.cell!, v)) n++; }));
  toast(`${n} nilai ditempel.`); render();
});
document.addEventListener('submit', async (e) => {
  const f = e.target as HTMLFormElement; e.preventDefault();
  const fd = new FormData(f);
  try {
    if (f.dataset.form === 'kamar') {
      await api('kamar-save', { kamar: Object.fromEntries(fd) }); f.reset(); await reloadBoot(); toast('Kamar disimpan.'); render();
    } else if (f.dataset.form === 'umum') {
      const u: any = { sekolah: {}, hadis_target: {} };
      for (const [k, v] of fd) {
        if (k.startsWith('kitab:') || k.startsWith('koor.')) continue;
        if (k.startsWith('sekolah.')) u.sekolah[k.slice(8)] = v; else if (k.startsWith('hadis.')) u.hadis_target[k.slice(6)] = Number(v) || 0;
        else u[k] = k === 'kkm' ? Number(v) || 75 : v;
      }
      const kitab: Record<string, string[]> = {};
      for (const kk of Object.keys(KITAB_KELAS)) kitab[kk] = fd.getAll('kitab:' + kk).map(String);
      await api('settings-save', { key: 'umum', value: u });
      const koor: Record<string, string[]> = {};
      for (const un of KOOR_UNITS) { const who = String(fd.get('koor.' + un) || ''); if (who) (koor[who] ??= []).push(un); }
      await api('settings-save', { key: 'koordinator', value: koor });
      const r = await api('settings-save', { key: 'kurikulum', value: { ...kurikulum(), kitab } });
      st.settings = r.settings; toast('Pengaturan rapor disimpan.');
    }
  } catch (er: any) { toast(er.message, 'err'); }
});
let cariT = 0;
function cari(v: string) {
  clearTimeout(cariT); cariT = window.setTimeout(async () => {
    const box = $('#hasil-cari'); if (!box) return;
    const r = await api('santri-cari', { q: v }).catch(() => ({ santri: [] }));
    box.innerHTML = r.santri.map((s: any) => `<li><span><b>${esc(s.nama)}</b><small>${esc(s.unit)} ${esc(s.tingkat)} · ${esc(st.kamars.find((k: any) => k.id === s.kamar_id)?.nama || 'tanpa kamar')}</small></span><select data-act="pindah" data-id="${esc(s.id)}"><option value="">pindah ke…</option>${st.kamars.map((k: any) => `<option value="${esc(k.id)}">${esc(k.nama)} · ${k.unit} ${k.lingkungan === 'PUTRA' ? 'Pa' : 'Pi'} ${k.tingkat}</option>`).join('')}</select></li>`).join('') || (v.length > 1 ? '<li class="rp-muted">Tidak ditemukan.</li>' : '');
  }, 280);
}
function appsMenu(btn: HTMLElement) {
  $('.rp-apps')?.remove();
  const apps: any[] = (window as any).NURIS_APPS || [];
  const m = document.createElement('div'); m.className = 'rp-apps'; m.setAttribute('role', 'menu');
  const framed = window.parent !== window;
  m.innerHTML = `<a role="menuitem" href="/" target="_top" data-app="beranda">Beranda portal</a>` + apps.filter((x) => x.id !== 'rapor-pesantren' && (!x.admin || (() => { try { return ['pimpinan', 'admin'].includes(String(JSON.parse(localStorage.getItem('mut_user') || '{}').role || '').toLowerCase()); } catch { return false; } })())).map((x) => `<a role="menuitem" href="${esc(x.path)}" target="_top" data-app="${esc(x.id)}">${esc(x.name)}</a>`).join('');
  if (framed) m.addEventListener('click', (e) => { const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[data-app]'); if (!a) return; e.preventDefault(); parent.postMessage({ type: 'nuris:navigate', app: a.dataset.app }, location.origin); m.remove(); });
  document.body.append(m);
  const r = btn.getBoundingClientRect(); m.style.top = r.bottom + 8 + 'px'; m.style.right = Math.max(8, innerWidth - r.right) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', function out(ev) { if (!m.contains(ev.target as Node)) { m.remove(); document.removeEventListener('pointerdown', out); } }), 0);
}
addEventListener('resize', () => fitPreview());
addEventListener('beforeunload', (e) => { if (st.dirty.size) { save(); e.preventDefault(); } });
document.head.insertAdjacentHTML('beforeend', `<style>${RAPOR_CSS}</style>`);
boot();
