/**
 * Aksi POST: login admin bertoken, CRUD tab BUKU/BERITA/DONASI/ALBUM/AGENDA, kelola akun admin, statistik, konfigurasi,
 * serta formulir donasi publik (tanpa token, dibatasi).
 *
 * Body POST = JSON teks: { action, token?, ...payload }
 */

function handleAdmin_(b) {
  const action = String(b.action || '');
  if (action === 'login')  return login_(b.user, b.password);
  if (action === 'donasi') return publicDonasi_(b.data || {});
  if (action === 'kunjungan') return publicKunjungan_(b.baru === true);

  if (!auth_(b.token)) return { ok: false, error: 'Sesi tidak valid. Silakan login ulang.', auth: false };

  switch (action) {
    case 'me':      return { ok: true, user: adminUser_() };
    case 'logout':  CacheService.getScriptCache().remove('tok_' + b.token); return { ok: true };
    case 'list':    return listRows_(b.sheet);
    case 'save':    return saveRow_(b.sheet, b.data || {});
    case 'delete':  return deleteRow_(b.sheet, b.id);
    case 'profil_save': return saveProfil_(b.data || {});
    case 'admin_list':   return utamaOnly_(() => listAdmins_());
    case 'admin_save':   return utamaOnly_(() => saveAdmin_(b.data || {}));
    case 'admin_delete': return utamaOnly_(() => deleteAdmin_(b.username));
    case 'stats':   return { ok: true, stats: buildStats_() };
    case 'config':  return { ok: true, config: buildConfig_() };
    case 'refresh': clearFolderCache_(); clearCache(); getAllData(); logRow_('refresh', '-', '-', 'Cache publik disegarkan'); return { ok: true };
    default:        return { ok: false, error: 'Aksi tidak dikenal' };
  }
}

/* ---------- Autentikasi ---------- */

function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

/** Username admin (Script Properties ADMIN_USER; bawaan "Admin"). Huruf besar/kecil tidak dibedakan. */
function adminName_() {
  return PropertiesService.getScriptProperties().getProperty('ADMIN_USER') || 'Admin';
}

let CURRENT_ADMIN_ = '';   // username admin pada request ini (untuk kolom "oleh" di LOG)

/** Hash password per akun. Username ikut di-hash, jadi mengganti username = password harus diisi ulang. */
function pwHash_(user, pw) {
  return 'sha256:' + sha256_(String(user).trim().toLowerCase() + ':' + String(pw));
}

/**
 * Akun dari tab ADMIN: { sh, cp (indeks kolom password), headers, rows:[{row, username, password, nama, peran, nonaktif}] }.
 * null jika tab belum ada / belum berisi akun → login memakai akun lama di Script Properties.
 */
function adminTable_() {
  const sh = getSS_().getSheetByName(CONFIG.SHEETS.ADMIN);
  if (!sh || sh.getLastRow() < 2) return null;
  const headers = headersOf_(sh);
  const cu = headers.indexOf('username'), cp = headers.indexOf('password'), cn = headers.indexOf('nama'), cx = headers.indexOf('nonaktif'), cr = headers.indexOf('peran');
  if (cu === -1 || cp === -1) return null;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getDisplayValues()
    .map((r, i) => ({ row: i + 2, username: String(r[cu]).trim(), password: String(r[cp]).trim(),
                      nama: cn === -1 ? '' : String(r[cn]).trim(), peran: cr === -1 ? '' : String(r[cr]).trim(),
                      nonaktif: cx !== -1 && parseBool_(r[cx], false) }))
    .filter(r => r.username);
  return rows.length ? { sh, cp, rows, headers } : null;
}

/**
 * Admin utama = baris dengan peran "Utama". Jika belum ada yang ditandai (tab lama tanpa kolom peran),
 * akun di baris pertama dianggap admin utama. Kembalikan daftar username (huruf kecil).
 */
function utamaNames_(t) {
  const u = t.rows.filter(r => r.peran.toLowerCase() === 'utama');
  return (u.length ? u : t.rows.slice(0, 1)).map(r => r.username.toLowerCase());
}

/** Apakah admin pada request ini admin utama (dan akunnya masih aktif)? Tanpa tab ADMIN: akun tunggal = utama. */
function isUtama_() {
  const t = adminTable_();
  if (!t) return true;
  const me = CURRENT_ADMIN_.toLowerCase();
  const a = t.rows.find(r => r.username.toLowerCase() === me);
  return !!a && !a.nonaktif && utamaNames_(t).indexOf(me) !== -1;
}

function utamaOnly_(fn) {
  if (!isUtama_()) return { ok: false, error: 'Hanya admin utama yang boleh mengelola akun.' };
  return fn();
}

/** Semua sesi milik username ini yang dibuat sebelum sekarang menjadi tidak berlaku (lihat auth_). */
function revokeSessions_(username) {
  PropertiesService.getScriptProperties().setProperty('rev_' + String(username).trim().toLowerCase(), String(Date.now()));
}

/** Password yang diketik polos di tab ADMIN diganti hash (dipanggil saat login berhasil & menu Segarkan). */
function hashAdminPasswords_() {
  const t = adminTable_();
  if (!t) return;
  t.rows.forEach(r => {
    if (r.password && r.password.indexOf('sha256:') !== 0) t.sh.getRange(r.row, t.cp + 1).setValue(pwHash_(r.username, r.password));
  });
}

function login_(user, password) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('login_fail') || 0);
  if (fails >= 5) return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi 5 menit.' };

  const u = String(user || '').trim(), pw = String(password || '');
  const t = adminTable_();
  let ok = false, nama = '';
  if (t) {
    const a = t.rows.find(r => r.username.toLowerCase() === u.toLowerCase() && !r.nonaktif);
    if (a && a.password && pw) {
      ok = a.password.indexOf('sha256:') === 0 ? a.password === pwHash_(a.username, pw) : a.password === pw;
      nama = a.username;
    }
  } else {
    // Akun lama (sebelum ada tab ADMIN): satu akun di Script Properties
    const stored = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD_HASH');
    if (!stored) return { ok: false, error: 'Akun admin belum ada. Buka Sheets → menu Pelita Bangsa → Siapkan Tab Database, lalu isi tab ADMIN.' };
    ok = u.toLowerCase() === adminName_().toLowerCase() && sha256_(pw) === stored;
    nama = adminName_();
  }
  if (!ok) {
    cache.put('login_fail', String(fails + 1), 300);
    return { ok: false, error: 'Username atau password salah.' };
  }
  cache.remove('login_fail');
  if (t) hashAdminPasswords_();
  CURRENT_ADMIN_ = nama;
  const token = Utilities.getUuid().replace(/-/g, '');
  cache.put('tok_' + token, nama + '|' + Date.now(), CONFIG.TOKEN_TTL);   // "username|waktu dibuat"
  logRow_('login', '-', '-', 'Admin masuk');
  return { ok: true, token, expiresIn: CONFIG.TOKEN_TTL, user: adminUser_() };
}

function auth_(token) {
  if (!token || !/^[a-f0-9]{32}$/.test(String(token))) return false;
  const cache = CacheService.getScriptCache();
  const who = cache.get('tok_' + token);
  if (!who) return false;
  const cut = who.lastIndexOf('|');
  const nama = who === '1' ? '' : cut === -1 ? who : who.slice(0, cut);
  const dibuat = cut === -1 ? 0 : Number(who.slice(cut + 1)) || 0;
  // Akun dihapus / dinonaktifkan / ganti password → sesi lamanya ditolak
  const rev = nama ? Number(PropertiesService.getScriptProperties().getProperty('rev_' + nama.toLowerCase()) || 0) : 0;
  if (rev && dibuat <= rev) { cache.remove('tok_' + token); return false; }
  cache.put('tok_' + token, who, CONFIG.TOKEN_TTL);   // sesi bergeser (sliding)
  CURRENT_ADMIN_ = nama;
  return true;
}

function adminUser_() {
  let email = '';
  try { email = Session.getEffectiveUser().getEmail(); } catch (_) {}
  return { nama: CURRENT_ADMIN_ || 'Admin', email, utama: isUtama_() };
}

/* ---------- Kelola akun admin (hanya admin utama; password tidak pernah dikirim ke browser) ---------- */

const PW_MIN_ = 6;

function listAdmins_() {
  const t = adminTable_();
  if (!t) return { ok: false, error: 'Tab ADMIN belum dibuat. Buka Sheets → menu Pelita Bangsa → Siapkan Tab Database.' };
  const utama = utamaNames_(t), me = CURRENT_ADMIN_.toLowerCase();
  return { ok: true, rows: t.rows.map(r => ({
    username: r.username, nama: r.nama, peran: utama.indexOf(r.username.toLowerCase()) !== -1 ? 'Utama' : 'Admin',
    nonaktif: r.nonaktif, password: !!r.password, saya: r.username.toLowerCase() === me })) };
}

/** Tambah (data.baru = true) atau ubah satu akun. Username tidak bisa diganti; password kosong saat ubah = tetap. */
function saveAdmin_(d) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSS_().getSheetByName(CONFIG.SHEETS.ADMIN);
    if (!sh) throw new Error('Tab ADMIN belum dibuat. Buka Sheets → menu Pelita Bangsa → Siapkan Tab Database.');
    ensureSchemaCols_('ADMIN', sh);
    const t = adminTable_() || { sh, rows: [], headers: headersOf_(sh) };
    const col = h => t.headers.indexOf(h) + 1;
    const username = String(d.username || '').trim(), nama = clip_(d.nama, 80), pw = String(d.password || '');
    const peran = String(d.peran || '').toLowerCase() === 'utama' ? 'Utama' : 'Admin';
    const nonaktif = parseBool_(d.nonaktif, false), me = CURRENT_ADMIN_.toLowerCase();
    if (!/^[A-Za-z][A-Za-z0-9._-]{2,29}$/.test(username)) throw new Error('Username 3–30 karakter, diawali huruf; boleh huruf, angka, titik, garis.');
    const a = t.rows.find(r => r.username.toLowerCase() === username.toLowerCase());
    if (d.baru && a) throw new Error('Username "' + a.username + '" sudah dipakai.');
    if (!d.baru && !a) throw new Error('Akun tidak ditemukan. Muat ulang daftar.');
    if ((d.baru || pw) && pw.length < PW_MIN_) throw new Error('Password minimal ' + PW_MIN_ + ' karakter.');
    if (pw && pw.toLowerCase() === username.toLowerCase()) throw new Error('Password tidak boleh sama dengan username.');

    // Tandai admin utama secara tertulis lebih dulu (tab lama: baris pertama dianggap utama)
    const utama = t.rows.length ? utamaNames_(t) : [];
    t.rows.forEach(r => {
      if (utama.indexOf(r.username.toLowerCase()) !== -1 && r.peran.toLowerCase() !== 'utama') { sh.getRange(r.row, col('peran')).setValue('Utama'); }
      r.peran = utama.indexOf(r.username.toLowerCase()) !== -1 ? 'Utama' : 'Admin';
    });

    if (a) {
      const saya = a.username.toLowerCase() === me;
      if (saya && nonaktif) throw new Error('Anda tidak bisa menonaktifkan akun sendiri.');
      if (saya && peran !== 'Utama') throw new Error('Anda tidak bisa menurunkan peran akun sendiri.');
      const sisa = t.rows.filter(r => r !== a && r.peran === 'Utama' && !r.nonaktif && r.password).length;
      if (a.peran === 'Utama' && (peran !== 'Utama' || nonaktif) && !sisa) throw new Error('Harus ada minimal satu admin utama yang aktif.');
      sh.getRange(a.row, col('nama')).setValue(nama);
      sh.getRange(a.row, col('peran')).setValue(peran);
      sh.getRange(a.row, col('nonaktif')).setValue(nonaktif);
      if (pw) sh.getRange(a.row, col('password')).setValue(pwHash_(a.username, pw));
      if ((pw || nonaktif) && !saya) revokeSessions_(a.username);
      logRow_('ubah', 'ADMIN', a.username, (pw ? 'password diganti · ' : '') + peran + (nonaktif ? ' · nonaktif' : ''));
    } else {
      const baru = { username, password: pwHash_(username, pw), nama: nama || username, peran: t.rows.length ? peran : 'Utama', nonaktif };
      sh.appendRow(t.headers.map(h => (h in baru ? baru[h] : '')));
      logRow_('tambah', 'ADMIN', username, baru.peran);
    }
    return listAdmins_();
  } catch (err) {
    return { ok: false, error: err.message };
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

function deleteAdmin_(username) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const t = adminTable_();
    if (!t) throw new Error('Tab ADMIN belum dibuat.');
    const u = String(username || '').trim().toLowerCase();
    const a = t.rows.find(r => r.username.toLowerCase() === u);
    if (!a) throw new Error('Akun tidak ditemukan. Muat ulang daftar.');
    if (u === CURRENT_ADMIN_.toLowerCase()) throw new Error('Anda tidak bisa menghapus akun sendiri.');
    const utama = utamaNames_(t);
    if (utama.indexOf(u) !== -1 && !t.rows.some(r => r !== a && utama.indexOf(r.username.toLowerCase()) !== -1 && !r.nonaktif && r.password)) {
      throw new Error('Harus ada minimal satu admin utama yang aktif.');
    }
    // Jika yang tersisa belum bertanda "Utama", tandai dulu supaya peran tidak berpindah diam-diam
    const cr = t.headers.indexOf('peran');
    if (cr !== -1) t.rows.forEach(r => { if (r !== a && utama.indexOf(r.username.toLowerCase()) !== -1 && r.peran.toLowerCase() !== 'utama') t.sh.getRange(r.row, cr + 1).setValue('Utama'); });
    t.sh.deleteRow(a.row);
    revokeSessions_(a.username);
    logRow_('hapus', 'ADMIN', a.username, '');
    return listAdmins_();
  } catch (err) {
    return { ok: false, error: err.message };
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

/* ---------- CRUD generik berdasarkan kolom id ---------- */

function sheetFor_(name, write) {
  const key = String(name || '').toUpperCase();
  if (!SCHEMA[key]) throw new Error('Tab tidak dikenal');
  if (key === 'ADMIN') throw new Error('Tab ADMIN (akun & password) hanya bisa dibuka di Google Sheets');
  if (write && CONFIG.ADMIN_WRITE.indexOf(key) === -1) throw new Error('Tab ' + key + ' hanya bisa diedit langsung di Google Sheets');
  const sh = getSS_().getSheetByName(key);
  if (!sh) throw new Error('Tab ' + key + ' belum dibuat. Jalankan Siapkan Tab Database.');
  return { key, sh };
}

function headersOf_(sh) {
  const last = sh.getLastColumn();
  if (!last) return [];
  return sh.getRange(1, 1, 1, last).getDisplayValues()[0].map(h => String(h).trim().toLowerCase());
}

function listRows_(name) {
  try {
    const { key, sh } = sheetFor_(name, false);
    if (CONFIG.ADMIN_WRITE.indexOf(key) !== -1) ensureIds_(key, sh);   // baris buatan Sheets tanpa id → diberi id
    const headers = headersOf_(sh);
    const n = sh.getLastRow();
    const rows = [];
    if (n >= 2) {
      sh.getRange(2, 1, n - 1, headers.length).getDisplayValues().forEach((r, i) => {
        if (!r.some(c => String(c).trim() !== '')) return;
        const o = { _row: i + 2 };
        headers.forEach((h, j) => { o[h] = String(r[j] == null ? '' : r[j]).trim(); });
        rows.push(o);
      });
    }
    if (key === 'ALBUM' && rows.length) {
      // Jumlah foto per album dari cache folder (kosong jika belum pernah dibaca)
      const fid = rows.map(o => driveFolderId_(o.folder_drive));
      const hit = CacheService.getScriptCache().getAll(fid.filter(Boolean).map(id => 'fld_' + id));
      rows.forEach((o, i) => { const v = hit['fld_' + fid[i]]; o._foto = v == null ? '' : v === '-' ? '0' : String(v.split(',').length); });
    }
    return { ok: true, sheet: key, headers, rows, writable: CONFIG.ADMIN_WRITE.indexOf(key) !== -1 };
  } catch (err) { return { ok: false, error: err.message }; }
}

const ID_PREFIX = { BUKU: 'BK', BERITA: 'PB', DONASI: 'DN', ALBUM: 'AL', AGENDA: 'AG' };

/**
 * Tab yang boleh ditulis panel wajib punya kolom id yang terisi, supaya baris yang dibuat langsung
 * di Sheets (mis. agenda) tetap bisa diedit/dihapus dari panel. Kolom skema yang hilang ditambahkan.
 */
function ensureIds_(key, sh) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    ensureSchemaCols_(key, sh);
    const headers = headersOf_(sh), col = headers.indexOf('id'), n = sh.getLastRow();
    if (col === -1 || n < 2) return;
    const data = sh.getRange(2, 1, n - 1, headers.length).getDisplayValues();
    const used = {};
    data.forEach(r => { used[String(r[col]).trim()] = true; });
    data.forEach((r, i) => {
      // lewati baris kosong (kotak centang yang belum dicentang terbaca "FALSE")
      if (String(r[col]).trim() || !r.some(c => String(c).trim() !== '' && String(c).trim() !== 'FALSE')) return;
      let id;
      do { id = newId_(ID_PREFIX[key] || 'ID'); } while (used[id]);
      used[id] = true;
      sh.getRange(i + 2, col + 1).setValue(id);
    });
  } catch (err) {
    console.error('ensureIds gagal: ' + err);
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

/** Validasi agenda: nama wajib, tahun diisi dari tanggal mulai, pilihan kategori/status sesuai daftar. */
function checkAgenda_(clean, isUpdate) {
  if ((!isUpdate || 'nama_kegiatan' in clean) && !clean.nama_kegiatan) throw new Error('Nama kegiatan wajib diisi');
  if (clean.tanggal_mulai && clean.tanggal_selesai && clean.tanggal_selesai < clean.tanggal_mulai) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai');
  if (clean.tanggal_mulai) clean.tahun = clean.tanggal_mulai.slice(0, 4);
  else if (clean.tahun && !/^\d{4}$/.test(clean.tahun)) throw new Error('Tahun harus 4 angka, mis. 2026');
  else if (!clean.tahun && (!isUpdate || 'tahun' in clean)) clean.tahun = todayStr_().slice(0, 4);
  ['kategori', 'status'].forEach(h => {
    if (clean[h] && DROPDOWN['AGENDA.' + h].indexOf(clean[h]) === -1) throw new Error('Pilihan ' + h + ' tidak dikenal');
  });
}

/**
 * Simpan isi beranda (tab PROFIL, bentuk kunci–nilai) dari panel admin, termasuk foto beranda & logo.
 * Hanya kunci di PROFIL_KEYS; kunci yang tidak dikirim tidak diubah. Kembalikan { ok, profil }.
 */
function saveProfil_(data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const sh = getSS_().getSheetByName(CONFIG.SHEETS.PROFIL);
    if (!sh) throw new Error('Tab PROFIL belum dibuat. Jalankan Siapkan Tab Database.');
    const headers = headersOf_(sh), ck = headers.indexOf('kunci'), cv = headers.indexOf('nilai');
    if (ck === -1 || cv === -1) throw new Error('Tab PROFIL harus punya kolom kunci dan nilai');
    const clean = {};
    Object.keys(data || {}).forEach(k => {
      if (PROFIL_KEYS.indexOf(k) === -1) return;
      let v = clip_(data[k], 5000);
      if (k === 'whatsapp') v = normalizeWa_(v);
      if (/^(stat_|tahun_berdiri)/.test(k) && v && !/^\d{1,7}$/.test(v)) throw new Error(k + ' harus berupa angka');
      if (/^(instagram|facebook|youtube|tiktok|maps_embed)$/.test(k) && v && !/^https:\/\//i.test(v)) throw new Error(k + ' harus berupa link https://');
      clean[k] = v;
    });
    const keys = Object.keys(clean);
    if (!keys.length) throw new Error('Tidak ada isian yang dikirim');
    const n = sh.getLastRow();
    const kunci = n >= 2 ? sh.getRange(2, ck + 1, n - 1, 1).getDisplayValues().map(r => String(r[0]).trim()) : [];
    const baru = [];
    keys.forEach(k => {
      const i = kunci.indexOf(k);
      // Awalan ' memaksa teks biasa: nomor WA/angka tidak berubah bentuk, teks berawalan "=" tidak jadi rumus
      const cell = clean[k] === '' ? '' : "'" + clean[k];
      if (i !== -1) sh.getRange(i + 2, cv + 1).setValue(cell);
      else baru.push(headers.map(h => (h === 'kunci' ? k : h === 'nilai' ? cell : '')));
    });
    if (baru.length) sh.getRange(sh.getLastRow() + 1, 1, baru.length, headers.length).setValues(baru);
    clearCache();
    logRow_('ubah', 'PROFIL', '-', clip_(keys.join(', '), 200));
    return { ok: true, profil: clean };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

/**
 * Validasi album: judul + link folder Drive yang bisa dibaca dan berisi foto.
 * Link dinormalkan, daftar foto dibaca ulang. Kembalikan { foto, publik } untuk respons.
 */
function checkAlbum_(clean, isUpdate) {
  if ((!isUpdate || 'judul' in clean) && !clean.judul) throw new Error('Judul album wajib diisi');
  if (!isUpdate && !clean.folder_drive) throw new Error('Link folder Google Drive wajib diisi');
  if (!('folder_drive' in clean)) return {};
  const fid = driveFolderId_(clean.folder_drive);
  if (!fid) throw new Error('Link folder tidak dikenali. Tempel link seperti https://drive.google.com/drive/folders/...');
  let folder, ids;
  try {
    folder = DriveApp.getFolderById(fid);
    ids = folderFotoIds_(fid, true);
  } catch (err) {
    console.error(err.stack || err);
    throw new Error('Folder Drive tidak bisa dibuka. Pastikan itu link FOLDER, dibagikan "Siapa saja yang memiliki link", dan izin Drive script sudah disetujui.');
  }
  if (!ids.length) throw new Error('Folder belum berisi foto (JPG/PNG). Upload foto dulu ke folder itu.');
  clean.folder_drive = 'https://drive.google.com/drive/folders/' + fid;
  let publik = true;
  try {
    const a = folder.getSharingAccess();
    publik = a === DriveApp.Access.ANYONE || a === DriveApp.Access.ANYONE_WITH_LINK;
  } catch (_) {}
  return { foto: ids.length, publik };
}

function saveRow_(name, data) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const { key, sh } = sheetFor_(name, true);
    ensureSchemaCols_(key, sh);
    const headers = headersOf_(sh);
    const clean = sanitizeRow_(key, data);
    let row = clean.id ? findRowById_(sh, headers, clean.id) : 0;
    const isUpdate = row > 0;
    const extra = key === 'ALBUM' ? checkAlbum_(clean, isUpdate) : {};
    if (key === 'AGENDA') checkAgenda_(clean, isUpdate);
    if (!clean.id) clean.id = newId_(ID_PREFIX[key] || 'ID');
    const values = headers.map(h => {
      if (h === 'sembunyikan') return parseBool_(clean[h], false);
      return clean[h] != null ? clean[h] : '';
    });
    if (isUpdate) {
      // Pertahankan nilai kolom yang tidak dikirim (mis. kolom baru yang ditambah manual di Sheets)
      const old = sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0];
      headers.forEach((h, i) => {
        if (h in clean) return;
        values[i] = h === 'sembunyikan' ? parseBool_(old[i], false) : old[i];
      });
      sh.getRange(row, 1, 1, headers.length).setValues([values]);
    } else {
      sh.appendRow(values);
      row = sh.getLastRow();
    }
    clearCache();
    logRow_(isUpdate ? 'ubah' : 'tambah', key, clean.id, clip_(clean.judul || clean.nama || clean.nama_kegiatan || '', 80));
    const saved = { _row: row };
    headers.forEach((h, i) => { saved[h] = String(values[i]); });
    if (extra.foto != null) saved._foto = String(extra.foto);
    return Object.assign({ ok: true, row: saved }, extra);
  } catch (err) {
    return { ok: false, error: err.message };
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

function deleteRow_(name, id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const { key, sh } = sheetFor_(name, true);
    const headers = headersOf_(sh);
    const row = findRowById_(sh, headers, id);
    if (!row) return { ok: false, error: 'Baris tidak ditemukan' };
    sh.deleteRow(row);
    clearCache();
    logRow_('hapus', key, id, '');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

function findRowById_(sh, headers, id) {
  const col = headers.indexOf('id');
  if (col === -1 || !id) return 0;
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const ids = sh.getRange(2, col + 1, n - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]).trim() === String(id).trim()) return i + 2;
  return 0;
}

/** Batasi panjang & bentuk nilai per tab. Nilai tak dikenal diabaikan. */
function sanitizeRow_(key, data) {
  const out = {};
  const allow = SCHEMA[key];
  Object.keys(data || {}).forEach(k => {
    const h = String(k).toLowerCase();
    if (allow.indexOf(h) === -1 || h === '_row') return;
    let v = data[k];
    if (typeof v === 'boolean') v = v ? 'TRUE' : 'FALSE';
    v = clip_(v, h === 'isi' ? 20000 : 1000);
    if (/^(jumlah|dipinjam)$/.test(h)) v = String(Math.max(0, Math.floor(toNum_(v))));
    if (h === 'whatsapp') v = normalizeWa_(v);
    if (/tanggal/.test(h) && v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error('Format tanggal harus yyyy-mm-dd');
    out[h] = v;
  });
  if (key === 'BUKU' && out.jumlah != null && out.dipinjam != null && toNum_(out.dipinjam) > toNum_(out.jumlah)) {
    throw new Error('Jumlah dipinjam melebihi jumlah eksemplar');
  }
  return out;
}

/* ---------- Formulir donasi publik (tanpa login) ---------- */

function publicDonasi_(d) {
  if (String(d.website || '').trim() !== '') return { ok: true };   // honeypot: bot mengisi field tersembunyi
  const nama = clip_(d.nama, 80), wa = normalizeWa_(d.whatsapp);
  if (nama.length < 2) return { ok: false, error: 'Nama terlalu pendek' };
  if (wa.length < 10 || wa.length > 15) return { ok: false, error: 'Nomor WhatsApp tidak valid' };
  const jenisList = DROPDOWN['DONASI.jenis'];
  const jenis = jenisList.indexOf(d.jenis) !== -1 ? d.jenis : jenisList[0];

  const cache = CacheService.getScriptCache();
  const k = 'don_' + sha256_(wa).slice(0, 16);
  if (cache.get(k)) return { ok: false, error: 'Formulir baru saja dikirim. Coba lagi beberapa menit.' };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const { sh } = sheetFor_('DONASI', true);
    const headers = headersOf_(sh);
    const row = {
      id: newId_('DN'), tanggal: todayStr_(), nama, whatsapp: wa, asal: clip_(d.asal, 120), jenis,
      kategori_buku: clip_(d.kategori_buku, 80), jumlah: d.jumlah ? String(Math.floor(toNum_(d.jumlah))) : '',
      logistik: '', resi: '', status: 'Baru', apresiasi: 'Belum', catatan: clip_(d.catatan, 500), sumber: 'web'
    };
    sh.appendRow(headers.map(h => row[h] != null ? row[h] : ''));
    cache.put(k, '1', 180);
    logRow_('donasi-web', 'DONASI', row.id, nama + ' · ' + jenis, 'web');
    return { ok: true, id: row.id };
  } catch (err) {
    console.error(err.stack || err);
    return { ok: false, error: 'Gagal menyimpan formulir' };
  } finally { try { lock.releaseLock(); } catch (_) {} }
}

/* ---------- Penghitung pengunjung (tanpa login, tanpa data pribadi) ---------- */

/** +1 pengunjung hari ini di tab KUNJUNGAN; baru = perangkat pertama kali datang bulan ini. Selalu { ok:true }. */
function publicKunjungan_(baru) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
    const sh = getSS_().getSheetByName(CONFIG.SHEETS.KUNJUNGAN);
    if (!sh) return { ok: true };
    const headers = headersOf_(sh);
    const ct = headers.indexOf('tanggal'), cp = headers.indexOf('pengunjung'), cb = headers.indexOf('pengunjung_baru');
    if (ct === -1 || cp === -1) return { ok: true };
    const today = todayStr_(), n = sh.getLastRow();
    let row = 0;
    if (n >= 2) {   // baris hari ini selalu di bagian paling bawah
      const from = Math.max(2, n - 4);
      const tgl = sh.getRange(from, ct + 1, n - from + 1, 1).getDisplayValues();
      for (let i = tgl.length - 1; i >= 0; i--) if (String(tgl[i][0]).trim() === today) { row = from + i; break; }
    }
    if (row) {
      const add = c => { const cell = sh.getRange(row, c + 1); cell.setValue(toNum_(cell.getDisplayValue()) + 1); };
      add(cp);
      if (baru && cb !== -1) add(cb);
    } else {
      const v = { tanggal: today, pengunjung: 1, pengunjung_baru: baru ? 1 : 0 };
      sh.appendRow(headers.map(h => (h in v ? v[h] : '')));
    }
  } catch (err) {
    console.error('kunjungan gagal: ' + err);
  } finally { try { lock.releaseLock(); } catch (_) {} }
  return { ok: true };
}

/** Ringkasan pengunjung untuk panel admin: 14 hari terakhir + 6 bulan terakhir. */
function buildKunjungan_(months) {
  const perHari = {}, perBulan = {};
  readSheet_(CONFIG.SHEETS.KUNJUNGAN).filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.tanggal)).forEach(r => {
    perHari[r.tanggal] = (perHari[r.tanggal] || 0) + toNum_(r.pengunjung);
    const m = r.tanggal.slice(0, 7);
    perBulan[m] = (perBulan[m] || 0) + toNum_(r.pengunjung_baru);
  });
  const harian = [];
  for (let i = 13; i >= 0; i--) {
    const t = Utilities.formatDate(new Date(Date.now() - i * 86400000), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    harian.push({ tanggal: t, n: perHari[t] || 0 });
  }
  const bulanan = months.map(m => ({ bulan: m, n: perBulan[m] || 0 }));
  return {
    hariIni: harian[13].n, kemarin: harian[12].n,
    bulanIni: bulanan[bulanan.length - 1].n, bulanLalu: bulanan.length > 1 ? bulanan[bulanan.length - 2].n : 0,
    harian, bulanan
  };
}

/* ---------- Log audit ---------- */

function logRow_(aksi, tab, id, ket, oleh) {
  try {
    const sh = getSS_().getSheetByName(CONFIG.SHEETS.LOG);
    if (!sh) return;
    sh.appendRow([nowStr_(), aksi, tab, id, ket || '', oleh || CURRENT_ADMIN_ || 'admin']);
    const n = sh.getLastRow();
    if (n > CONFIG.LOG_MAX + 1) sh.deleteRows(2, n - CONFIG.LOG_MAX - 1);
  } catch (err) { console.error('log gagal: ' + err); }
}

/* ---------- Statistik & konfigurasi untuk panel admin ---------- */

function monthKey_(tgl) { return /^\d{4}-\d{2}/.test(tgl || '') ? tgl.slice(0, 7) : ''; }

function lastMonths_(n) {
  const out = [], d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(Utilities.formatDate(x, CONFIG.TIMEZONE, 'yyyy-MM'));
  }
  return out;
}

function buildStats_() {
  const S = CONFIG.SHEETS;
  const profil = Object.fromEntries(readSheet_(S.PROFIL).filter(r => r.kunci).map(r => [r.kunci, r.nilai]));
  const buku = readSheet_(S.BUKU).filter(r => r.judul);
  const berita = readSheet_(S.BERITA).filter(r => r.judul);
  const donasi = readSheet_(S.DONASI).filter(r => r.nama);
  const relawan = readSheet_(S.RELAWAN).filter(r => r.nama && isShown_(r));
  const agenda = readSheet_(S.AGENDA).filter(r => r.nama_kegiatan && isShown_(r));
  let galeri = [];   // album publik (tab ALBUM + GALERI) dari data yang sudah di-cache
  try { galeri = getAllData().data.galeri || []; } catch (err) { console.error(err.stack || err); }
  const log = readSheet_(S.LOG);
  const months = lastMonths_(6);

  const kategori = {}, zona = {};
  let total = 0, dipinjam = 0;
  buku.forEach(r => {
    const j = toNum_(r.jumlah) || 1, p = Math.min(toNum_(r.dipinjam), j);
    total += j; dipinjam += p;
    const k = r.kategori || 'Lainnya';
    kategori[k] = (kategori[k] || 0) + j;
    const z = (String(r.rak || '').replace(/^rak\s*/i, '').charAt(0) || '-').toUpperCase();
    zona[z] = zona[z] || { total: 0, siap: 0 };
    zona[z].total += j; zona[z].siap += j - p;
  });

  const perBulan = arr => months.map(m => ({ bulan: m, n: arr.filter(r => monthKey_(r.tanggal) === m).length }));
  const bukuDonasi = donasi.filter(r => /buku/i.test(r.jenis || '') && r.status !== 'Dibatalkan')
    .reduce((a, r) => a + toNum_(r.jumlah), 0);
  const today = todayStr_();

  const rows = {};
  Object.keys(SCHEMA).forEach(k => {
    const sh = getSS_().getSheetByName(k);
    rows[k] = sh ? Math.max(0, sh.getLastRow() - 1) : -1;   // -1 = tab belum ada
  });

  return {
    koleksi: { total, judul: buku.length, tersedia: total - dipinjam, dipinjam, kategori, zona },
    anak_terbina: profil.stat_anak_terbina || '',
    relawan: relawan.length || toNum_(profil.stat_relawan),
    berita: { total: berita.length, terbit: berita.filter(r => (r.status || 'Terbit') === 'Terbit').length,
              draf: berita.filter(r => r.status === 'Draf').length, perBulan: perBulan(berita) },
    donasi: { total: donasi.length, buku: bukuDonasi, baru: donasi.filter(r => r.status === 'Baru').length,
              perBulan: perBulan(donasi) },
    agenda: { total: agenda.length, akanDatang: agenda.filter(r => (r.tanggal_mulai || '') > today).length },
    galeri: { album: galeri.length, foto: galeri.reduce((a, g) => a + (g.jumlah || 0), 0) },
    kunjungan: buildKunjungan_(months),
    rows, bulan: months,
    log: log.slice(-8).reverse(),
    cache: { ttl: CONFIG.CACHE_TTL, aktif: !!CacheService.getScriptCache().get('data_meta') },
    dibuat: new Date().toISOString()
  };
}

function buildConfig_() {
  const ss = getSS_();
  let url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (_) {}
  const tabs = Object.keys(SCHEMA).map(k => {
    const sh = ss.getSheetByName(k);
    return { nama: k, ada: !!sh, baris: sh ? Math.max(0, sh.getLastRow() - 1) : 0,
             kolom: sh ? headersOf_(sh) : SCHEMA[k], skema: SCHEMA[k], deskripsi: SCHEMA_DESC[k] || '',
             bisaTulis: CONFIG.ADMIN_WRITE.indexOf(k) !== -1 };
  });
  return {
    spreadsheet: { nama: ss.getName(), id: ss.getId(), url: ss.getUrl() },
    api: { url, cacheTtl: CONFIG.CACHE_TTL, tokenTtl: CONFIG.TOKEN_TTL, timezone: CONFIG.TIMEZONE },
    user: adminUser_(),
    tabs,
    log: readSheet_(CONFIG.SHEETS.LOG).slice(-20).reverse(),
    passwordDiatur: ((adminTable_() || {}).rows || []).some(r => r.password && !r.nonaktif) ||
                    !!PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD_HASH')
  };
}
