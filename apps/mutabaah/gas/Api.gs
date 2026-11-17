/**
 * ============================================================
 *  API SINKRONISASI  —  Netlify (mutabaahtahfidznurista)  <->  Spreadsheet
 *  Versi 4: + sheet "HadisArbain", "UjianSemester", "PenilaianTajwid" (dibuat otomatis bila belum ada).
 *  Versi 5: aplikasi menjadi sumber utama data santri; tab MASTER_SANTRI ditulis ulang dari aplikasi (cadangan satu arah).
 *  Versi 6: + sheet "JurnalHalaqahMusyrif" & "CapaianHalaqahMusyrif" (halaqah musyrif), kolom Hafalan.juz_diuji (juz yang sudah diujikan).
 *  Versi 7: nilai setoran tampil sebagai huruf (A/B+/B/C); UjianSemester + kolom tahfidz_nilai & rincian_ujian_tahfidz.
 *  Versi 8: lebih hemat sel. AuditLog tidak lagi ditulis ke Spreadsheet (log tersimpan di database aplikasi);
 *           tab Keanggotaan & KeanggotaanHistori tidak dipakai lagi; baris/kolom kosong dipangkas otomatis
 *           (fungsi rapikanSpreadsheet berjalan sekali setelah versi ini dipasang, bisa juga dijalankan manual).
 *  Tambahkan/ganti file ini di project Apps Script yang SAMA dengan Code.gs.
 *  Jangan ubah Code.gs. File ini memakai fungsi yang sudah ada di sana.
 *  Setelah mengganti isi file: Deploy > Manage deployments > (pensil) Edit >
 *  Version: New version > Deploy. URL /exec TIDAK berubah.
 *
 *  Langkah:
 *  1. Project Settings > Script Properties > tambah:
 *        SYNC_SECRET = (kode rahasia yang sama dengan GAS_SECRET di Netlify)
 *  2. Deploy > New deployment > Web app
 *        Execute as: Me   |   Who has access: Anyone
 *  3. Salin URL Web App (berakhiran /exec) -> GAS_URL di Netlify.
 * ============================================================
 */

function doPost(e) {
  var out;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var secret = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
    if (!secret || body.secret !== secret) throw new Error('Akses ditolak: SYNC_SECRET tidak cocok.');
    switch (body.action) {
      case 'ping':   out = { ok: true, now: new Date().toISOString() }; break;
      case 'akun':   out = { ok: true, akun: readAll_(SHEET.AKUN) }; break;
      case 'master': out = apiMaster_(); break;
      case 'export': out = apiExport_(); break;
      case 'sync':   rapikanSekali_(); out = apiSync_(body.ops || []); break;
      default: throw new Error('Aksi tidak dikenal: ' + body.action);
    }
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function apiMaster_() {
  CacheService.getScriptCache().removeAll(['master_rows', 'master_sheet']);
  clearMemo_();
  return { ok: true, master: readMaster_() };
}

function apiExport_() {
  CacheService.getScriptCache().removeAll(['master_rows', 'master_sheet']);
  clearMemo_();
  return {
    ok: true,
    master: readMaster_(),
    akun: readAll_(SHEET.AKUN),
    setoran: readAll_(SHEET.SETORAN),
    hafalan: readAll_(SHEET.HAFALAN),
    sertifikasi: readAll_(SHEET.SERTIFIKASI).map(function (r) { r.tanggal_ujian = dateCellText_(r.tanggal_ujian); return r; }),
    arbain: (function () { try { return extraReadAll_('HadisArbain'); } catch (e) { return []; } })(),
    ujian: (function () { try { return extraReadAll_('UjianSemester'); } catch (e) { return []; } })(),
    tajwid: (function () { try { return extraReadAll_('PenilaianTajwid'); } catch (e) { return []; } })(),
    histori: (function () { try { return readMembership_(); } catch (e) { return []; } })()
  };
}

var API_SHEETS_ = {
  Setoran:     { key: 'SETORAN',     id: ['id'],          dates: ['dicatat_pada'] },
  Hafalan:     { key: 'HAFALAN',     id: ['santri_id'],   dates: ['diperbarui_pada', 'terverifikasi_pada'], extra: ['juz_diuji'] },
  Sertifikasi: { key: 'SERTIFIKASI', id: ['id'],          dates: ['dicatat_pada', 'diperbarui_pada'] },
  Akun:        { key: 'AKUN',        id: ['username'],    dates: [] }
};
var API_TEXT_ = ['santri_nama', 'unit', 'tingkat', 'halaqah', 'musyrif', 'dicatat_oleh', 'ziyadah_surat', 'murajaah_juz', 'catatan',
  'keterangan', 'diperbarui_oleh', 'terverifikasi_oleh', 'penguji', 'nama', 'musyrif_master', 'judul'];

function apiCell_(field, v, dates) {
  if (v === null || v === undefined) return '';
  if (dates.indexOf(field) > -1 && v !== '') { var d = new Date(v); return isNaN(d.getTime()) ? '' : d; }
  if (typeof v === 'string' && API_TEXT_.indexOf(field) > -1) return clipText_(v, 20000);
  return v;
}

function apiSync_(ops) {
  return withDocumentLock_(function () {
    clearMemo_();
    var done = 0;
    ops.forEach(function (op) {
      // Versi 8: snapshot keanggotaan & log perubahan cukup disimpan di database aplikasi (tidak ditulis ke sheet).
      if (op.op === 'call' || op.sheet === 'AuditLog') { done += op.rows.length; return; }
      if (op.op === 'replace' && op.sheet === 'MASTER_SANTRI') {
        var akhir = op.rows[op.rows.length - 1] || {};
        masterReplace_(akhir.rows || []);
        done += op.rows.length; return;
      }
      if (EXTRA_SHEETS_[op.sheet]) {
        var ex = extraSheet_(op.sheet), exDef = EXTRA_SHEETS_[op.sheet].def;
        if (op.op === 'upsert' || op.op === 'append') apiUpsert_(ex.sh, ex.head, exDef, op.rows);
        else if (op.op === 'delete') apiDelete_(ex.sh, ex.head, exDef, op.rows);
        done += op.rows.length; return;
      }
      var def = API_SHEETS_[op.sheet];
      if (!def) throw new Error('Sheet tidak dikenal: ' + op.sheet);
      var sh = getSheet_(SHEET[def.key]);
      muatKolom_(sh, HEADER[def.key].length + (def.extra ? def.extra.length : 0));
      var head = ensureHeaders_(sh, HEADER[def.key], null);
      if (def.extra) {
        // Kolom tambahan (mis. juz_diuji) ditambahkan otomatis di ujung kanan bila belum ada
        var kurang = def.extra.filter(function (h) { return head.indexOf(h) < 0; });
        if (kurang.length) { muatKolom_(sh, head.length + kurang.length); sh.getRange(1, head.length + 1, sh.getMaxRows(), kurang.length).setNumberFormat('@'); sh.getRange(1, head.length + 1, 1, kurang.length).setValues([kurang]); head = head.concat(kurang); }
      }
      if (op.op === 'append') {
        var vals = op.rows.map(function (r) { return head.map(function (h) { return apiCell_(h, r[h], def.dates); }); });
        if (vals.length) { muatBaris_(sh, sh.getLastRow() + vals.length); sh.getRange(sh.getLastRow() + 1, 1, vals.length, head.length).setValues(vals); }
      } else if (op.op === 'upsert') {
        apiUpsert_(sh, head, def, op.rows);
      } else if (op.op === 'delete') {
        apiDelete_(sh, head, def, op.rows);
      }
      done += op.rows.length;
    });
    clearMemo_();
    return { ok: true, done: done };
  });
}

function apiKeyOf_(obj, fields) {
  return fields.map(function (f) { return norm_(obj[f]); }).join('|');
}

function apiUpsert_(sh, head, def, rows) {
  var data = sh.getDataRange().getValues();
  var colIdx = def.id.map(function (f) { return head.indexOf(f); });
  var index = {};
  for (var i = 1; i < data.length; i++) {
    var k = colIdx.map(function (c) { return norm_(data[i][c]); }).join('|');
    if (k.replace(/\|/g, '')) index[k] = i;
  }
  var updates = {}, appends = [], appendIdx = {};
  rows.forEach(function (r) {
    var k = apiKeyOf_(r, def.id), at = index[k];
    var base = at != null ? data[at] : (appendIdx[k] != null ? appends[appendIdx[k]] : null);
    var rec = head.map(function (h, c) {
      return Object.prototype.hasOwnProperty.call(r, h) ? apiCell_(h, r[h], def.dates) : (base ? base[c] : '');
    });
    if (at != null) { data[at] = rec; updates[at] = true; }
    else if (appendIdx[k] != null) appends[appendIdx[k]] = rec;
    else { appendIdx[k] = appends.length; appends.push(rec); }
  });
  var upd = Object.keys(updates).map(Number);
  if (upd.length > 25) {
    sh.getRange(2, 1, data.length - 1, head.length).setValues(data.slice(1).map(function (r) { var x = r.slice(0, head.length); while (x.length < head.length) x.push(''); return x; }));
  } else {
    upd.forEach(function (i) { sh.getRange(i + 1, 1, 1, head.length).setValues([data[i].slice(0, head.length)]); });
  }
  if (appends.length) { muatBaris_(sh, sh.getLastRow() + appends.length); sh.getRange(sh.getLastRow() + 1, 1, appends.length, head.length).setValues(appends); }
}

function apiDelete_(sh, head, def, rows) {
  var data = sh.getDataRange().getValues();
  var colIdx = def.id.map(function (f) { return head.indexOf(f); });
  var want = {};
  rows.forEach(function (r) { want[apiKeyOf_(r, def.id)] = true; });
  var del = [];
  for (var i = 1; i < data.length; i++) {
    var k = colIdx.map(function (c) { return norm_(data[i][c]); }).join('|');
    if (want[k]) del.push(i + 1);
  }
  del.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
}

/** Jalankan sekali dari editor untuk membuat SYNC_SECRET acak (lihat hasilnya di Log). */
function buatSyncSecret() {
  var s = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('SYNC_SECRET', s);
  Logger.log('SYNC_SECRET = ' + s);
  return s;
}


/* ============================================================
 *  SHEET TAMBAHAN — dibuat otomatis bila belum ada.
 *  HadisArbain   : satu baris = satu hadis per santri
 *  UjianSemester : satu baris = penilaian rapor satu santri per semester
 *  Tidak bergantung pada Code.gs selain apiUpsert_/apiDelete_/norm_.
 * ============================================================ */
var EXTRA_SHEETS_ = {
  HadisArbain: {
    header: ['id', 'santri_id', 'santri_nama', 'unit', 'tingkat', 'halaqah', 'musyrif', 'nomor', 'judul', 'status', 'nilai',
      'tanggal', 'catatan', 'diperbarui_oleh', 'diperbarui_pada'],
    def: { id: ['id'], dates: ['diperbarui_pada'] }, text: ['tanggal']
  },
  UjianSemester: {
    header: ['id', 'santri_id', 'santri_nama', 'unit', 'tingkat', 'halaqah', 'musyrif', 'tahun_ajaran', 'semester',
      'makhraj_nilai', 'makhraj', 'ket_makhraj', 'tajwid_nilai', 'tajwid', 'ket_tajwid', 'tahfidz', 'ket_tahfidz',
      'kehadiran', 'ket_kehadiran', 'perkembangan', 'ket_perkembangan', 'catatan', 'penguji', 'tanggal',
      'diperbarui_oleh', 'diperbarui_pada', 'tahfidz_nilai', 'rincian_ujian_tahfidz'],
    def: { id: ['id'], dates: ['diperbarui_pada'] }, text: ['tahun_ajaran', 'tanggal']
  },
  JurnalHalaqahMusyrif: {
    header: ['id', 'halaqah', 'pengampu', 'peserta', 'peserta_username', 'bulan', 'pekan', 'tanggal', 'kehadiran',
      'ziyadah_surat', 'ziyadah_hal', 'nilai_kelancaran', 'nilai_makhraj', 'nilai_tajwid', 'keterangan', 'dicatat_oleh', 'diperbarui_pada'],
    def: { id: ['id'], dates: ['diperbarui_pada'] }, text: ['bulan', 'tanggal', 'ziyadah_hal', 'nilai_kelancaran', 'nilai_makhraj', 'nilai_tajwid']
  },
  CapaianHalaqahMusyrif: {
    header: ['id', 'halaqah', 'peserta', 'peserta_username', 'target_juz', 'juz_selesai', 'juz_diuji', 'aktif'],
    def: { id: ['id'], dates: [] }, text: ['juz_selesai', 'juz_diuji']
  },
  PenilaianTajwid: {
    header: ['id', 'santri_id', 'santri_nama', 'unit', 'tingkat', 'halaqah', 'musyrif', 'ym', 'tanggal', 'makhraj_nilai', 'makhraj', 'ket_makhraj',
      'tajwid_nilai', 'tajwid', 'ket_tajwid', 'catatan', 'penilai', 'diperbarui_oleh', 'diperbarui_pada'],
    def: { id: ['id'], dates: ['diperbarui_pada'] }, text: ['ym', 'tanggal']
  }
};

function extraSpreadsheet_() {
  var ss = null;
  try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { ss = null; }
  if (!ss) ss = SpreadsheetApp.openById('15C4_evwRExmW8W86VaLaQ78BqPvJY-sIhcQleRbioEM');
  return ss;
}

function extraSheet_(name) {
  var cfg = EXTRA_SHEETS_[name];
  var ss = extraSpreadsheet_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    // Sheet baru dibuat ramping: cukup selebar kolom data, 100 baris (bertambah otomatis saat diisi).
    if (sh.getMaxColumns() > cfg.header.length) sh.deleteColumns(cfg.header.length + 1, sh.getMaxColumns() - cfg.header.length);
    if (sh.getMaxRows() > 100) sh.deleteRows(101, sh.getMaxRows() - 100);
    sh.getRange(1, 1, 1, cfg.header.length).setValues([cfg.header]).setFontWeight('bold').setBackground('#0D4A28').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    cfg.text.forEach(function (h) { var c = cfg.header.indexOf(h) + 1; if (c > 0) sh.getRange(1, c, sh.getMaxRows(), 1).setNumberFormat('@'); });
  }
  var last = Math.max(1, sh.getLastColumn());
  var head = sh.getRange(1, 1, 1, last).getValues()[0].map(function (h) { return String(h || '').trim(); }).filter(function (h) { return h; });
  if (!head.length) { head = cfg.header.slice(); sh.getRange(1, 1, 1, head.length).setValues([head]); }
  var missing = cfg.header.filter(function (h) { return head.indexOf(h) < 0; });
  if (missing.length) { muatKolom_(sh, head.length + missing.length); sh.getRange(1, head.length + 1, 1, missing.length).setValues([missing]); head = head.concat(missing); }
  return { sh: sh, head: head };
}

function extraReadAll_(name) {
  var cfg = EXTRA_SHEETS_[name];
  var sh = extraSpreadsheet_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var data = sh.getDataRange().getValues();
  var head = data[0].map(function (h) { return String(h || '').trim(); });
  var tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var o = {};
    head.forEach(function (h, c) {
      if (!h) return;
      var v = data[i][c];
      if (v instanceof Date) v = cfg.text.indexOf(h) >= 0 ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : v.toISOString();
      o[h] = v;
    });
    if (o.santri_id) out.push(o);
  }
  return out;
}

/** Jalankan sekali dari editor (opsional) untuk membuat semua sheet tambahan sekarang juga. */
function siapkanSheetTambahan() {
  Object.keys(EXTRA_SHEETS_).forEach(function (n) { var x = extraSheet_(n); Logger.log('Sheet ' + n + ' siap: ' + x.head.length + ' kolom'); });
}
/** Nama lama, tetap ada agar tidak membingungkan. */
function siapkanSheetHadisArbain() { siapkanSheetTambahan(); }


/** Versi 5: tulis ulang tab MASTER_SANTRI dari data aplikasi (kolom dicocokkan lewat nama judul kolom). */
function masterReplace_(rows) {
  var ss = extraSpreadsheet_();
  var sh = ss.getSheetByName('MASTER_SANTRI');
  var head;
  if (!sh) {
    sh = ss.insertSheet('MASTER_SANTRI');
    head = ['ID_SANTRI', 'UNIT', 'TINGKAT', 'HALAQAH', 'MUSYRIF', 'NAMA_SANTRI', 'PROGRAM', 'KETERANGAN', 'SUMBER_SHEET', 'SUMBER_BARIS', 'AKTIF'];
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  } else {
    head = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(function (h) { return String(h || '').trim(); });
  }
  var up = head.map(function (h) { return h.toUpperCase(); });
  var data = rows.map(function (r) { return up.map(function (h) { var v = r[h]; return v == null ? '' : v; }); });
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, head.length).clearContent();
  if (data.length) {
    var idCol = up.indexOf('ID_SANTRI');
    if (idCol >= 0) sh.getRange(2, idCol + 1, data.length, 1).setNumberFormat('@');
    muatBaris_(sh, data.length + 1);
    sh.getRange(2, 1, data.length, head.length).setValues(data);
  }
  // Buang baris sisa di bawah data (santri yang keluar/dihapus) agar tidak menyisakan sel kosong.
  if (sh.getMaxRows() > data.length + 21) sh.deleteRows(data.length + 22, sh.getMaxRows() - data.length - 21);
  try { CacheService.getScriptCache().removeAll(['master_rows', 'master_sheet']); } catch (e) {}
}


/* ============================================================
 *  VERSI 8 — HEMAT SEL
 *  Google Sheets menghitung SEMUA sel di grid (termasuk yang kosong) ke batas 10 juta sel.
 *  Tab bawaan berukuran 1000 baris x 26 kolom walau datanya sedikit; fungsi di bawah memangkasnya.
 * ============================================================ */
/** Pastikan grid punya cukup baris/kolom sebelum menulis (sheet dipangkas rapat). */
function muatBaris_(sh, n) { var m = sh.getMaxRows(); if (n > m) sh.insertRowsAfter(m, n - m); }
function muatKolom_(sh, n) { var m = sh.getMaxColumns(); if (n > m) sh.insertColumnsAfter(m, n - m); }

var TAB_TIDAK_DIPAKAI_ = ['AuditLog', 'Keanggotaan', 'KeanggotaanHistori'];

/**
 * Jalankan dari editor (atau otomatis sekali setelah Versi 8 dipasang):
 * 1) hapus tab yang tidak dipakai lagi, 2) hapus pemicu (trigger) snapshot keanggotaan,
 * 3) pangkas baris & kolom kosong di semua tab. Hasil ringkas ada di Log.
 */
function rapikanSpreadsheet() {
  var ss = extraSpreadsheet_(), log = [];
  var sel = function () { return ss.getSheets().reduce(function (n, sh) { return n + sh.getMaxRows() * sh.getMaxColumns(); }, 0); };
  var awal = sel();
  TAB_TIDAK_DIPAKAI_.forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (sh && ss.getSheets().length > 1) { ss.deleteSheet(sh); log.push('Hapus tab ' + n); }
  });
  try {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      var f = t.getHandlerFunction();
      if (/membership|keanggotaan|snapshot|histori/i.test(f)) { ScriptApp.deleteTrigger(t); log.push('Hapus pemicu ' + f); }
    });
  } catch (e) { log.push('Pemicu tidak diperiksa: ' + e.message); }
  ss.getSheets().forEach(function (sh) {
    var lr = Math.max(sh.getLastRow(), sh.getFrozenRows(), 1), lc = Math.max(sh.getLastColumn(), sh.getFrozenColumns() + 1, 1); // sisakan ≥1 kolom tak beku
    var sisa = 20; // sedikit ruang kosong di bawah data
    if (sh.getMaxRows() > lr + sisa) sh.deleteRows(lr + sisa + 1, sh.getMaxRows() - lr - sisa);
    if (sh.getMaxColumns() > lc) sh.deleteColumns(lc + 1, sh.getMaxColumns() - lc);
  });
  var akhir = sel();
  log.push('Sel: ' + awal + ' -> ' + akhir + ' (hemat ' + (awal - akhir) + ')');
  Logger.log(log.join('\n'));
  return log;
}

/** Dipanggil di awal setiap sinkron: rapikan sekali saja setelah Versi 8 terpasang. */
function rapikanSekali_() {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('RAPIKAN_V8')) return;
  p.setProperty('RAPIKAN_V8', new Date().toISOString());
  try { rapikanSpreadsheet(); } catch (e) { Logger.log('rapikanSpreadsheet gagal: ' + e.message); }
}
