// Rapor Tahfidz (Rapor Perkembangan Al-Qur'an) — logika server memakai kode Mutabaah Tahfidz apa adanya
// (getHalaqahList, getRaporHalaqah, saveRaporSemester dari apps/mutabaah/lib/core.ts), ditambah akses koordinator unit.
// Dibundel (IIFE, global __rt), dienkripsi, dan dimuat fungsi Supabase "rapor-tahfidz" seperti fungsi "api" Mutabaah.
import { getHalaqahList, getRaporHalaqah, saveRaporSemester } from '../../../apps/mutabaah/lib/core';
import { q } from '../../../apps/mutabaah/lib/db';

const KOOR_DEFAULT: Record<string, string[]> = { 'arif.haryadi': ['SMP Ikhwan'], 'muh.hisom': ['SMA Ikhwan'], muhlisin: ['MA Ikhwan'], 'lubna.nadiyatuz': ['SMP Akhwat'], 'hajar.nur': ['SMA Akhwat'], 'siti.muawanah': ['MA Akhwat'] };
const fail = (message: string, status = 400) => Object.assign(new Error(message), { status });
const norm = (s: any) => String(s || '').trim().toLowerCase();

async function identity(token: string) {
  if (!token || token.length > 512) throw fail('Sesi berakhir. Silakan masuk kembali.', 401);
  const rows = await q(`SELECT a.username,a.nama,a.role,a.musyrif_master,(SELECT value FROM rapor_pesantren.pengaturan WHERE key='koordinator') AS koor
    FROM sesi s JOIN akun a ON a.username=s.data->>'username' WHERE s.token=$1 AND s.expires_at>now() AND upper(a.aktif)<>'N'`, [token]);
  if (!rows.length) throw fail('Sesi berakhir atau akun dinonaktifkan. Silakan masuk kembali.', 401);
  const a: any = rows[0];
  const u = { username: a.username, nama: a.nama, role: String(a.role).toLowerCase(), musyrif_master: a.musyrif_master || '' };
  const admin = u.role === 'pimpinan' || u.role === 'admin';
  const koordinator: string[] = admin ? [] : ((a.koor || KOOR_DEFAULT)[u.username] || []);
  return { u, admin, koordinator };
}
type Id = Awaited<ReturnType<typeof identity>>;
const ctx = { kick: async () => {} }; // antrean sinkron spreadsheet dikosongkan oleh cron fungsi "api"
const luas = (i: Id) => ({ ...i.u, role: 'pimpinan' }); // akses baca/tulis seluruh santri; dibatasi unit oleh pemeriksaan di bawah
const milik = (i: Id, h: { unit?: string; musyrif?: string }) => i.admin || i.koordinator.includes(String(h.unit)) || norm(h.musyrif) === norm(i.u.musyrif_master || i.u.nama);

export async function handle(path: string, body: any, token: string) {
  const i = await identity(token);
  const user = { username: i.u.username, nama: i.u.nama, admin: i.admin, koordinator: i.koordinator };
  if (path === 'halaqah') {
    const list = i.admin ? await getHalaqahList(i.u) : i.koordinator.length ? (await getHalaqahList(luas(i))).filter((h: any) => milik(i, h)) : await getHalaqahList(i.u);
    return { user, halaqah: list };
  }
  if (path === 'rapor') {
    const hk = String(body.halaqah || '');
    if (i.koordinator.length && !i.admin) {
      const h = (await getHalaqahList(luas(i))).find((x: any) => x.key === hk);
      if (!h || !milik(i, h)) throw fail('Halaqah di luar unit koordinasi Anda.', 403);
      return getRaporHalaqah(luas(i), hk, body.ta, body.sem);
    }
    return getRaporHalaqah(i.u, hk, body.ta, body.sem);
  }
  if (path === 'simpan') {
    const id = String(body.santri || '');
    let u: any = i.u;
    if (i.koordinator.length && !i.admin) {
      const s: any = (await q('SELECT unit,musyrif FROM santri WHERE id=$1 AND aktif', [id]))[0];
      if (!s || !milik(i, s)) throw fail('Santri di luar unit koordinasi Anda.', 403);
      u = luas(i);
    }
    return { rapor: await saveRaporSemester(u, id, body.ta, body.sem, body.data || {}, ctx) };
  }
  throw fail('Rute tidak dikenal.', 404);
}
