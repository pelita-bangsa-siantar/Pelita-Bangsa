/**
 * API Web Rumah Baca Pelita Bangsa
 * ---------------------------------
 * GET  ?action=all   → seluruh data publik (read-only, cache 10 menit)
 * GET  ?action=ping  → cek hidup
 * POST (body JSON, Content-Type text/plain) → aksi admin bertoken + formulir donasi publik
 *
 * Semua konstanta ada di CONFIG. Tidak ada rahasia di file ini:
 * password admin disimpan di Script Properties (menu "Atur Password Admin").
 */
const CONFIG = {
  SPREADSHEET_ID: '',            // kosong = spreadsheet induk (script terikat)
  CACHE_TTL: 600,                // detik, cache data publik
  TOKEN_TTL: 21600,              // detik, sesi admin (maks CacheService = 6 jam)
  TIMEZONE: 'Asia/Jakarta',
  SHEETS: {
    PROFIL: 'PROFIL', PENGURUS: 'PENGURUS', RELAWAN: 'RELAWAN', AGENDA: 'AGENDA', GALERI: 'GALERI',
    BUKU: 'BUKU', BERITA: 'BERITA', DONASI: 'DONASI', ALBUM: 'ALBUM', ADMIN: 'ADMIN', KUNJUNGAN: 'KUNJUNGAN', LOG: 'LOG'
  },
  // Tab yang boleh DITULIS dari panel admin. Tab fitur wajib tetap diedit langsung di Sheets.
  ADMIN_WRITE: ['BUKU', 'BERITA', 'DONASI', 'ALBUM', 'AGENDA'],   // PROFIL ditulis lewat aksi khusus profil_save
  FOLDER_TTL: 21600,             // detik, cache daftar foto per folder Drive (album)
  ALBUM_MAX_FOTO: 300,           // foto maksimum yang dibaca dari satu folder album
  LOG_MAX: 1000                  // baris LOG maksimum sebelum dipangkas
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'all';
  let out;
  try {
    if (action === 'ping') {
      out = { ok: true, pong: new Date().toISOString() };
    } else if (action === 'all') {
      const r = getAllData();
      out = { ok: true, data: r.data, cached: r.cached, generatedAt: r.data.dibuat };
    } else {
      out = { ok: false, error: 'Aksi tidak dikenal' };
    }
  } catch (err) {
    console.error(err.stack || err);
    out = { ok: false, error: 'Gagal memuat data' };
  }
  return json_(out);
}

function doPost(e) {
  let out;
  try {
    const raw = (e && e.postData && e.postData.contents) || '{}';
    const body = JSON.parse(raw);
    out = handleAdmin_(body);          // Admin.gs
  } catch (err) {
    console.error(err.stack || err);
    out = { ok: false, error: 'Permintaan tidak valid' };
  }
  return json_(out);
}
