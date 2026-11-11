/** Membaca sheet → data bersih untuk web publik + cache 2 lapis. */

function getSS_() {
  return CONFIG.SPREADSHEET_ID ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID) : SpreadsheetApp.getActive();
}

/** Baca satu tab → array objek {header: nilai}. Selalu getDisplayValues() (tanggal tetap teks). */
function readSheet_(name) {
  const sh = getSS_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getDisplayValues();
  const headers = rows.shift().map(h => String(h).trim().toLowerCase());
  return rows
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, String(r[i] == null ? '' : r[i]).trim()])));
}

const isShown_ = r => !parseBool_(r.sembunyikan, false);   // tidak dicentang / kosong = tampil

function buildData_() {
  const S = CONFIG.SHEETS;
  const profilRaw = Object.fromEntries(readSheet_(S.PROFIL).filter(r => r.kunci).map(r => [r.kunci, r.nilai]));
  const bukuRows = readSheet_(S.BUKU).filter(r => r.judul && isShown_(r));

  const profil = Object.assign({}, profilRaw, {
    logo: driveImageUrl(profilRaw.logo_drive_id, 256),
    hero_foto: driveImageUrl(profilRaw.hero_foto_drive_id, 1200),
    whatsapp: normalizeWa_(profilRaw.whatsapp),
    misi: ['misi_1', 'misi_2', 'misi_3'].map(k => profilRaw[k]).filter(Boolean).map(s => {
      const parts = s.split(' — ');
      return { judul: parts[0].trim(), deskripsi: parts.slice(1).join(' — ').trim() };
    })
  });
  // Statistik koleksi: isi manual di PROFIL menang; jika kosong dihitung dari tab BUKU.
  if (!profil.stat_koleksi_buku && bukuRows.length) {
    profil.stat_koleksi_buku = String(bukuRows.reduce((a, r) => a + (toNum_(r.jumlah) || 1), 0));
  }

  const pengurus = readSheet_(S.PENGURUS)
    .filter(r => r.nama && isShown_(r))
    .sort((a, b) => (Number(a.urutan) || 999) - (Number(b.urutan) || 999))
    .map(r => ({ nama: r.nama, jabatan: r.jabatan, periode: r.periode, deskripsi: r.deskripsi,
                 foto: driveImageUrl(r.foto_drive_id, 600) }));

  const relawan = readSheet_(S.RELAWAN)
    .filter(r => r.nama && isShown_(r))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
    .map(r => ({ nama: r.nama, asal_instansi: r.asal_instansi, bidang: r.bidang || 'Lainnya',
                 sejak_tahun: r.sejak_tahun, foto: driveImageUrl(r.foto_drive_id, 400) }));

  const agenda = buildAgenda_(readSheet_(S.AGENDA).filter(r => r.nama_kegiatan && isShown_(r)));
  const galeri = buildGaleri_(
    readSheet_(S.GALERI).filter(r => r.foto_drive_id && isShown_(r)),
    readSheet_(S.ALBUM).filter(r => r.judul && r.folder_drive && isShown_(r))
  );
  const berita = buildBerita_(readSheet_(S.BERITA));

  return { profil, pengurus, relawan, agenda, galeri, berita, dibuat: new Date().toISOString() };
}

function buildAgenda_(rows) {
  const today = todayStr_();
  const items = rows.map(r => {
    const mulai = r.tanggal_mulai, selesai = r.tanggal_selesai || r.tanggal_mulai;
    let status = r.status;
    if (!status && mulai) status = today < mulai ? 'Akan Datang' : today > selesai ? 'Selesai' : 'Berlangsung';
    return {
      tahun: r.tahun || (mulai ? mulai.slice(0, 4) : ''),
      bulan: mulai ? Number(mulai.slice(5, 7)) : 0,
      tanggal_mulai: mulai, tanggal_selesai: r.tanggal_selesai,
      nama_kegiatan: r.nama_kegiatan, lokasi: r.lokasi, kategori: r.kategori || 'Lainnya',
      deskripsi: r.deskripsi, status: status || 'Akan Datang', album_id: r.album_id,
      poster: driveImageUrl(r.poster_drive_id, 900)
    };
  }).sort((a, b) => (a.tanggal_mulai || '9999').localeCompare(b.tanggal_mulai || '9999'));

  const tahunList = [...new Set(items.map(i => i.tahun).filter(Boolean))].sort().reverse();
  const tahunIni = today.slice(0, 4);
  return { items, tahunList, tahunAktif: tahunList.indexOf(tahunIni) !== -1 ? tahunIni : (tahunList[0] || tahunIni) };
}

/**
 * ID file gambar di satu folder Drive, urut nama file. Di-cache per folder (CONFIG.FOLDER_TTL)
 * supaya Drive tidak dibaca setiap cache publik dibangun ulang. fresh = true → paksa baca ulang.
 */
function folderFotoIds_(folderId, fresh) {
  const cache = CacheService.getScriptCache(), key = 'fld_' + folderId;
  if (!fresh) {
    const hit = cache.get(key);
    if (hit != null) return hit === '-' ? [] : hit.split(',');
  }
  const files = [], it = DriveApp.getFolderById(folderId).getFiles();
  while (it.hasNext() && files.length < CONFIG.ALBUM_MAX_FOTO) {
    const f = it.next();
    if (String(f.getMimeType()).indexOf('image/') === 0) files.push({ id: f.getId(), nama: f.getName() });
  }
  files.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { numeric: true }));
  const ids = files.map(f => f.id);
  cache.put(key, ids.join(',') || '-', CONFIG.FOLDER_TTL);
  return ids;
}

/** Hapus cache daftar foto semua folder album (dipakai tombol/menu "Segarkan"). */
function clearFolderCache_() {
  const keys = readSheet_(CONFIG.SHEETS.ALBUM).map(r => driveFolderId_(r.folder_drive)).filter(Boolean).map(id => 'fld_' + id);
  if (keys.length) CacheService.getScriptCache().removeAll(keys);
}

/** Album dari tab ALBUM (folder Drive) + album lama per-foto dari tab GALERI, terbaru dulu. */
function buildGaleri_(rows, albumRows) {
  const map = new Map();
  (albumRows || []).forEach(r => {
    const fid = driveFolderId_(r.folder_drive);
    const id = r.id || slugify_(r.judul);
    if (!fid || map.has(id)) return;
    let ids;
    try { ids = folderFotoIds_(fid); } catch (err) { console.error('Album ' + id + ': folder tidak bisa dibaca — ' + err); return; }
    if (!ids.length) return;
    map.set(id, { id, judul: r.judul, tanggal: r.tanggal, sampul: driveImageUrl(ids[0], 600),
                  foto: ids.map(x => ({ url: driveImageUrl(x, 600), ket: '' })) });
  });
  rows.forEach(r => {
    const id = r.album_id || slugify_(r.judul_album || 'dokumentasi');
    if (!map.has(id)) map.set(id, { id, judul: r.judul_album || 'Dokumentasi', tanggal: r.tanggal, foto: [], sampul: '' });
    const a = map.get(id);
    const url = driveImageUrl(r.foto_drive_id, 600);
    a.foto.push({ url, ket: r.keterangan });
    if (!a.sampul && parseBool_(r.sampul, false)) a.sampul = url;
    if (!a.tanggal && r.tanggal) a.tanggal = r.tanggal;
  });
  return [...map.values()]
    .map(a => Object.assign(a, { sampul: a.sampul || a.foto[0].url, jumlah: a.foto.length }))
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
}

/** Berita publik: hanya status "Terbit" dan tidak disembunyikan, terbaru dulu. */
function buildBerita_(rows) {
  return rows
    .filter(r => r.judul && isShown_(r) && (r.status || 'Terbit').toLowerCase() === 'terbit')
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
    .map(r => ({
      id: r.id || slugify_(r.judul), tanggal: r.tanggal, judul: r.judul, kategori: r.kategori || 'Kabar Komunitas',
      penulis: r.penulis, lokasi: r.lokasi, ringkasan: r.ringkasan, isi: r.isi,
      foto: driveImageUrl(r.foto_drive_id, 900)
    }));
}

/** Kembalikan { data, cached }. Payload dipecah per 90 KB (batas CacheService 100 KB/kunci). */
function getAllData() {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('data_meta') || 0);
  if (n) {
    const keys = Array.from({ length: n }, (_, i) => 'data_' + i);
    const parts = cache.getAll(keys);
    if (Object.keys(parts).length === n) {
      return { data: JSON.parse(keys.map(k => parts[k]).join('')), cached: true };
    }
  }
  const data = buildData_();
  const json = JSON.stringify(data), size = 90000, chunks = {};
  for (let i = 0; i * size < json.length; i++) chunks['data_' + i] = json.slice(i * size, (i + 1) * size);
  chunks.data_meta = String(Object.keys(chunks).length);
  cache.putAll(chunks, CONFIG.CACHE_TTL);
  return { data, cached: false };
}

function clearCache() {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('data_meta') || 0);
  cache.removeAll(['data_meta'].concat(Array.from({ length: n }, (_, i) => 'data_' + i)));
}

/** Jalankan manual dari editor untuk melihat JSON hasil bacaan. */
function testData() { console.log(JSON.stringify(buildData_(), null, 2)); }
