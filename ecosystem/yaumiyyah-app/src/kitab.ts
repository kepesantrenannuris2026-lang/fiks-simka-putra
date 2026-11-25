// Mutabaah Yaumiyyah — Nilai Kajian Kitab per semester (hasil ujian semester kitab, 0–100).
// Disimpan ke Rapor Pesantren (rapor_pesantren.nilai, kelompok 'kitab'): satu sumber nilai, langsung tampil di rapor.
// Akses: kamar ampuan + seluruh kamar di unit yang sama (penguji kitab sering musyrif lain), koordinator, pimpinan.
import { shell, $, $$, esc, icon, I, toast, apiOf, token, needLogin, loading, empty, sessionEnded, unitLabel } from '../../shared/ui';
import { itemsFor, Item } from '../../rapor-pesantren/src/kurikulum';
import { huruf } from '../../shared/skala';
import { APP, navGabungan, bottomOf, segmen } from './nav';

const api = apiOf('https://yvcqcgbzdsrjkskvcmqq.supabase.co/functions/v1/rapor-pesantren/');
const app = document.getElementById('app')!;
const now = new Date(Date.now() + 7 * 3600e3); // WIB
const y0 = now.getUTCFullYear() - (now.getUTCMonth() < 6 ? 1 : 0);
const st: any = { user: null, kamars: [], kur: {}, kamarId: '', students: [], ta: `${y0}/${y0 + 1}`, sem: now.getUTCMonth() >= 6 ? 1 : 2, loading: false, err: '', dirty: new Map<string, Record<string, number | null>>(), saving: false };
try { const k = sessionStorage.getItem('yk-kamar'); if (k) st.kamarId = k; } catch {}

export const kitab = { views: ['kitab'], active: false, started: false, canLeave: () => { if (st.dirty.size) void simpan(); return true; }, show: async (_v: string) => {} };

const peran = () => (st.user?.admin ? 'Pimpinan · semua kamar' : st.user?.koordinator?.length ? `Koordinator ${st.user.koordinator.map(unitLabel).join(', ')}` : 'Musyrif/ah');
const kamar = () => st.kamars.find((k: any) => k.id === st.kamarId);
function render() {
  if (!kitab.active) return;
  app.innerHTML = shell({ app: APP, title: 'Nilai kajian kitab', nav: navGabungan(), bottom: bottomOf('kitab'), active: 'kitab', top: segmen('kitab'), user: st.user && { nama: st.user.nama, peran: peran() } }, body());
  saveBar();
}
function periode() {
  const ys = [y0 + 1, y0, y0 - 1].map((y) => `${y}/${y + 1}`);
  return `<div class="yk-periode"><label class="ns-field"><span>Tahun ajaran</span><select data-yk="ta">${ys.map((t) => `<option ${t === st.ta ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
    <label class="ns-field"><span>Semester</span><select data-yk="sem"><option value="1" ${st.sem === 1 ? 'selected' : ''}>1 (ganjil)</option><option value="2" ${st.sem === 2 ? 'selected' : ''}>2 (genap)</option></select></label></div>`;
}
function pilihKamar() {
  const opt = (k: any) => `<option value="${esc(k.id)}" ${k.id === st.kamarId ? 'selected' : ''}>${esc(k.nama)} · ${esc(k.unit)} ${k.lingkungan === 'PUTRA' ? 'Putra' : 'Putri'} ${esc(k.tingkat)} · ${k.kitab_terisi}/${k.jumlah}</option>`;
  const ampu = st.kamars.filter((k: any) => k.ampu), lain = st.kamars.filter((k: any) => !k.ampu);
  const grup = ampu.length && lain.length ? `<optgroup label="Kamar ampuan Anda">${ampu.map(opt).join('')}</optgroup><optgroup label="Kamar lain di unit">${lain.map(opt).join('')}</optgroup>` : st.kamars.map(opt).join('');
  return `<label class="ns-field yk-kamar"><span>Kamar</span><select data-yk="kamar"><option value="">Pilih kamar…</option>${grup}</select></label>`;
}
function kolom(): Item[] {
  const seen = new Map<string, Item>();
  for (const s of st.students) for (const it of itemsFor('kitab', s, st.kur)) if (!seen.has(it.k)) seen.set(it.k, it);
  return [...seen.values()];
}
function tabel() {
  if (!st.kamarId) return empty('Pilih kamar', 'Pilih kamar untuk mengisi nilai ujian semester kajian kitab.');
  if (st.loading) return loading();
  if (!st.students.length) return empty('Belum ada santri di kamar ini.');
  const cols = kolom();
  if (!cols.length) return empty('Belum ada kitab yang diujikan untuk kelas ini.', 'Atur daftar kitab per kelas di Rapor Pesantren › Pengaturan rapor.');
  const rows = st.students.map((s: any, r: number) => {
    const isi = cols.map((c, ci) => {
      if (!itemsFor('kitab', s, st.kur).some((x) => x.k === c.k)) return '<td class="na" title="Tidak diujikan untuk kelas ini">—</td>';
      const v = s.kitab?.[c.k];
      return `<td><input class="yk-in" inputmode="decimal" data-s="${esc(s.id)}" data-k="${c.k}" data-r="${r}" data-c="${ci}" value="${esc(v ?? '')}" aria-label="${esc(c.id)} ${esc(s.nama)}" autocomplete="off"><small class="yk-h">${v != null && v !== '' ? huruf(Number(v)) : ''}</small></td>`;
    }).join('');
    const n = cols.filter((c) => s.kitab?.[c.k] != null).length, t = itemsFor('kitab', s, st.kur).length;
    return `<tr><th scope="row"><span>${esc(s.nama)}</span><small>Kelas ${esc(s.tingkat)} · ${n}/${t} kitab${st.dirty.has(s.id) ? ' · <b>belum disimpan</b>' : ''}</small></th>${isi}</tr>`;
  }).join('');
  const k = kamar();
  return `${k && !k.ampu && !st.user?.admin ? `<p class="yk-note">${icon(I.book, 16)}<span>Kamar ${esc(k.nama)} diampu ${esc(k.wali_nama || '–')}. Anda mengisi nilai Kajian Kitab untuk kamar ini.</span></p>` : ''}
  <div class="ns-table-wrap yk-wrap"><table class="ns-table yk-grid"><thead><tr><th>Santri</th>${cols.map((c) => `<th><span>${esc(c.id)}</span><small lang="ar" dir="rtl">${esc(c.ar)}</small></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
  <p class="ns-muted yk-tip">Nilai 0–100 dari ujian semester kitab; predikat (A ≥90, B+ 80–89, B 70–79, C &lt;70) muncul otomatis. Tersimpan otomatis dan langsung masuk ke Rapor Pesantren bagian C · Kajian Kitab. Tempel (Ctrl+V) dari Excel didukung; Enter/panah untuk pindah.</p>`;
}
function body() {
  if (!st.user) return st.err ? empty('Gagal memuat.', st.err, '<button class="ns-btn" data-yk="ulang">Coba lagi</button>') : loading();
  if (!st.kamars.length) return empty('Belum ada kamar.', 'Akun ini belum memegang kamar atau unit. Hubungi pimpinan untuk penugasan kamar.');
  return `<section class="ns-hero anim-rise"><div><p class="ns-eyebrow">Semester ${st.sem} · ${esc(st.ta)}</p><h2>Nilai kajian kitab</h2><p>Isi nilai ujian semester kitab per santri. Kamar ampuan Anda di atas; kamar lain di unit yang sama juga dapat diisi.</p></div></section>
  <section class="ns-card yk-pilih">${periode()}${pilihKamar()}</section>${tabel()}`;
}
function saveBar() {
  let bar = $('#yk-save');
  if (!kitab.active || (!st.dirty.size && !st.saving && !st.simpanTerakhir)) { bar?.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'yk-save'; bar.className = 'yk-savebar'; bar.setAttribute('aria-live', 'polite'); document.body.append(bar); }
  bar.classList.toggle('dirty', !!st.dirty.size); bar.innerHTML = st.saving ? '<span>Menyimpan…</span>' : st.dirty.size ? `<span>${st.dirty.size} santri belum disimpan</span><button class="ns-btn primary" data-yk="simpan">Simpan</button>` : `<span>${icon(I.check, 16)} Nilai kitab tersimpan</span>`;
}
let timer = 0;
function ubah(inp: HTMLInputElement) {
  const s = st.students.find((x: any) => x.id === inp.dataset.s); if (!s) return;
  const raw = inp.value.trim().replace(',', '.');
  const v = raw === '' ? null : Number(raw);
  if (v !== null && (!Number.isFinite(v) || v < 0 || v > 100)) { toast('Nilai kitab harus 0–100.', 'err'); inp.value = s.kitab?.[inp.dataset.k!] ?? ''; return; }
  const lama = s.kitab?.[inp.dataset.k!] ?? null;
  if (lama === v) return;
  s.kitab = { ...(s.kitab || {}) }; if (v === null) delete s.kitab[inp.dataset.k!]; else s.kitab[inp.dataset.k!] = v;
  const d = st.dirty.get(s.id) || {}; d[inp.dataset.k!] = v; st.dirty.set(s.id, d);
  const h = inp.nextElementSibling; if (h) h.textContent = v == null ? '' : huruf(v);
  st.simpanTerakhir = false; saveBar(); clearTimeout(timer); timer = window.setTimeout(simpan, 1200);
}
async function simpan() {
  if (st.saving || !st.dirty.size) return;
  st.saving = true; saveBar();
  const batch = [...st.dirty]; st.dirty.clear();
  const { ta, sem } = st;
  try {
    for (let i = 0; i < batch.length; i += 60) await api('yaum-kitab-save', { ta, sem, items: batch.slice(i, i + 60).map(([santri_id, kb]) => ({ santri_id, kitab: kb })) });
    st.simpanTerakhir = true; setTimeout(() => { st.simpanTerakhir = false; saveBar(); }, 2500);
    const k = kamar(); if (k && ta === st.ta && sem === st.sem) k.kitab_terisi = st.students.filter((s: any) => Object.keys(s.kitab || {}).length).length;
  } catch (e: any) {
    for (const [id, kb] of batch) st.dirty.set(id, { ...kb, ...(st.dirty.get(id) || {}) });
    if (e.status === 401) sessionEnded(); toast(e.message, 'err');
  } finally { st.saving = false; saveBar(); }
}
async function muatKamar() {
  if (!st.kamarId) { st.students = []; render(); return; }
  st.loading = true; render();
  try { st.students = (await api('yaum-kitab-load', { ta: st.ta, sem: st.sem, kamar: st.kamarId })).students; }
  catch (e: any) { st.students = []; toast(e.message, 'err'); if (e.status === 401) sessionEnded(); }
  finally { st.loading = false; render(); }
}
async function muatDaftar() {
  try {
    const r = await api('yaum-kitab-kamar', { ta: st.ta, sem: st.sem });
    st.user = r.user; st.kamars = r.kamars; st.kur = r.kurikulum || {}; st.err = '';
    if (!kamar()) st.kamarId = (st.kamars.find((k: any) => k.ampu) || (st.kamars.length === 1 ? st.kamars[0] : null))?.id || '';
  } catch (e: any) { st.err = e.message; if (e.status === 401) sessionEnded(); }
}
kitab.show = async () => {
  if (!token()) { app.innerHTML = shell({ app: APP, title: APP, nav: [], active: '' }, needLogin(APP)); return; }
  if (!kitab.started || st.err) { kitab.started = true; render(); await muatDaftar(); if (st.kamarId) return muatKamar(); }
  render(); ($('#main') as HTMLElement)?.focus();
};
async function gantiPeriode() { await simpan(); st.students = []; await muatDaftar(); await muatKamar(); }

document.addEventListener('change', (e) => {
  if (!kitab.active) return;
  const t = e.target as HTMLElement;
  if (t.matches('.yk-in')) return ubah(t as HTMLInputElement);
  const k = t.dataset?.yk;
  if (k === 'kamar') { void simpan().then(() => { st.kamarId = (t as HTMLSelectElement).value; try { sessionStorage.setItem('yk-kamar', st.kamarId); } catch {} void muatKamar(); }); }
  if (k === 'ta') { st.ta = (t as HTMLSelectElement).value; void gantiPeriode(); }
  if (k === 'sem') { st.sem = Number((t as HTMLSelectElement).value); void gantiPeriode(); }
});
document.addEventListener('click', (e) => {
  if (!kitab.active) return;
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-yk]'); if (!b || b.tagName === 'SELECT') return;
  if (b.dataset.yk === 'simpan') void simpan();
  if (b.dataset.yk === 'ulang') { st.err = ''; kitab.started = false; void kitab.show('kitab'); }
});
// Enter/panah: pindah sel seperti lembar kerja.
document.addEventListener('keydown', (e) => {
  if (!kitab.active) return;
  const t = e.target as HTMLInputElement; if (!t.matches?.('.yk-in')) return;
  const r = Number(t.dataset.r), c = Number(t.dataset.c);
  const ke = e.key === 'Enter' || e.key === 'ArrowDown' ? [r + 1, c] : e.key === 'ArrowUp' ? [r - 1, c] : e.key === 'ArrowRight' && t.selectionStart === t.value.length ? [r, c + 1] : e.key === 'ArrowLeft' && t.selectionStart === 0 ? [r, c - 1] : null;
  if (!ke) return;
  const n = $<HTMLInputElement>(`.yk-in[data-r="${ke[0]}"][data-c="${ke[1]}"]`); if (!n) return;
  e.preventDefault(); ubah(t); n.focus(); n.select();
});
// Tempel blok dari Excel/Google Sheets mulai dari sel yang aktif.
document.addEventListener('paste', (e) => {
  if (!kitab.active) return;
  const t = e.target as HTMLInputElement; if (!t.matches?.('.yk-in')) return;
  const txt = e.clipboardData?.getData('text') || ''; if (!/[\t\n]/.test(txt.trim())) return;
  e.preventDefault();
  const r0 = Number(t.dataset.r), c0 = Number(t.dataset.c);
  txt.replace(/\r/g, '').split('\n').filter((l, i, a) => l !== '' || i < a.length - 1).forEach((line, i) => line.split('\t').forEach((v, j) => {
    const n = $<HTMLInputElement>(`.yk-in[data-r="${r0 + i}"][data-c="${c0 + j}"]`); if (n) { n.value = v.trim(); ubah(n); }
  }));
});
void $$;
