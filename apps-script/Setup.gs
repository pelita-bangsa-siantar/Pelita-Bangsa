/** Skema tab database, pembuatan tab otomatis, dan menu di Google Sheets. */

const SCHEMA = {
  PROFIL:   ['kunci', 'nilai'],
  PENGURUS: ['urutan', 'nama', 'jabatan', 'periode', 'foto_drive_id', 'deskripsi', 'sembunyikan'],
  RELAWAN:  ['nama', 'asal_instansi', 'bidang', 'sejak_tahun', 'foto_drive_id', 'sembunyikan'],
  AGENDA:   ['tahun', 'tanggal_mulai', 'tanggal_selesai', 'nama_kegiatan', 'lokasi', 'kategori', 'deskripsi', 'status', 'album_id', 'sembunyikan'],
  GALERI:   ['album_id', 'judul_album', 'tanggal', 'foto_drive_id', 'keterangan', 'sampul', 'sembunyikan'],
  // Tab tambahan (dikelola dari panel admin, boleh juga diedit langsung di Sheets)
  BUKU:     ['id', 'isbn', 'judul', 'penulis', 'penerbit_tahun', 'kategori', 'rak', 'jumlah', 'dipinjam', 'sumber', 'catatan', 'sembunyikan'],
  BERITA:   ['id', 'tanggal', 'judul', 'kategori', 'penulis', 'lokasi', 'ringkasan', 'isi', 'foto_drive_id', 'status', 'sembunyikan'],
  DONASI:   ['id', 'tanggal', 'nama', 'whatsapp', 'asal', 'jenis', 'kategori_buku', 'jumlah', 'logistik', 'resi', 'status', 'apresiasi', 'catatan', 'sumber'],
  // Album galeri = satu folder Google Drive (link ditempel dari panel admin; foto dibaca otomatis)
  ALBUM:    ['id', 'tanggal', 'judul', 'folder_drive', 'sembunyikan'],
  // Akun panel admin. Password diketik biasa di sel, otomatis diganti hash saat login pertama.
  // Tab ini TIDAK PERNAH keluar lewat API (bukan ?action=all, bukan action=list).
  ADMIN:    ['username', 'password', 'nama', 'nonaktif'],
  // Penghitung pengunjung (hanya ditulis server). Satu baris = satu hari.
  // pengunjung = perangkat unik hari itu; pengunjung_baru = perangkat yang pertama kali datang di bulan itu.
  KUNJUNGAN: ['tanggal', 'pengunjung', 'pengunjung_baru'],
  LOG:      ['waktu', 'aksi', 'tab', 'id', 'keterangan', 'oleh']
};

const SCHEMA_DESC = {
  PROFIL: 'Identitas, kontak, statistik', PENGURUS: 'Struktur kepengurusan', RELAWAN: 'Relawan aktif',
  AGENDA: 'Agenda kegiatan tahunan', GALERI: 'Foto per album', BUKU: 'Katalog koleksi buku',
  BERITA: 'Berita & artikel', DONASI: 'Donatur & logistik buku', ALBUM: 'Album galeri dari folder Drive', ADMIN: 'Akun login panel admin', KUNJUNGAN: 'Pengunjung web per hari',
  LOG: 'Jejak audit panel admin'
};

const PROFIL_KEYS = [
  'nama_organisasi', 'tagline', 'deskripsi_singkat', 'tahun_berdiri', 'sejarah', 'visi',
  'misi_1', 'misi_2', 'misi_3', 'alamat', 'jam_operasional', 'whatsapp', 'email', 'rekening',
  'instagram', 'facebook', 'youtube', 'tiktok', 'maps_embed',
  'logo_drive_id', 'hero_foto_drive_id',
  'stat_koleksi_buku', 'stat_anak_terbina', 'stat_relawan'
];

const DROPDOWN = {
  'RELAWAN.bidang':    ['Pengajar', 'Dongeng', 'Literasi Digital', 'Dokumentasi', 'Logistik', 'Lainnya'],
  'AGENDA.kategori':   ['Literasi Anak', 'Literasi Digital', 'Pemberdayaan Warga', 'Perayaan', 'Lainnya'],
  'AGENDA.status':     ['Akan Datang', 'Berlangsung', 'Selesai', 'Ditunda', 'Dibatalkan'],
  'BUKU.kategori':     ['Fabel & Dongeng', 'Sains & Alam', 'Komik Edukasi', 'Cerita Rakyat', 'Ensiklopedi & Kamus', 'Pelajaran', 'Sastra Remaja', 'Lainnya'],
  'BUKU.sumber':       ['Donasi Publik', 'CSR Mitra', 'Kas Swadaya', 'Hadiah Festival', 'Lainnya'],
  'BERITA.kategori':   ['Kabar Komunitas', 'Kegiatan', 'Laporan Donasi', 'Opini Edukasi', 'Pojok Baca'],
  'BERITA.status':     ['Terbit', 'Draf'],
  'DONASI.jenis':      ['Donasi Buku', 'Relawan Mengajar', 'Rak & Alat Tulis', 'Dukungan Operasional', 'Kemitraan / CSR'],
  'DONASI.logistik':   ['Antar Langsung', 'Dijemput Relawan', 'JNE', 'J&T', 'SiCepat', 'Pos Indonesia', 'Lainnya'],
  'DONASI.status':     ['Baru', 'Dikonfirmasi', 'Dalam Pengiriman', 'Diterima', 'Terkatalog', 'Dibatalkan'],
  'DONASI.apresiasi':  ['Belum', 'Terkirim']
};

/** Jalankan manual dari editor atau menu. Aman diulang: tab yang sudah ada tidak ditimpa. */
function setupSpreadsheet() {
  const ss = getSS_();
  let dibuat = 0;
  Object.keys(SCHEMA).forEach(name => {
    if (ss.getSheetByName(name)) return;
    const headers = SCHEMA[name];
    const sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#FEF3C7');
    sh.setFrozenRows(1);

    headers.forEach((h, i) => {
      const col = sh.getRange(2, i + 1, 999, 1);
      if (/tanggal|waktu/.test(h)) col.setNumberFormat('@');          // Plain text
      if (['sembunyikan', 'sampul', 'nonaktif'].indexOf(h) !== -1) col.insertCheckboxes();
      const list = DROPDOWN[name + '.' + h];
      if (list) col.setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build()
      );
    });

    if (name === 'PROFIL') {
      sh.getRange(2, 1, PROFIL_KEYS.length, 1).setValues(PROFIL_KEYS.map(k => [k]));
      sh.setColumnWidth(1, 200).setColumnWidth(2, 520);
    }
    if (name === 'ADMIN') {
      // Satu akun awal; password sengaja kosong (belum bisa login) sampai diisi sendiri di sel B2.
      sh.getRange(2, 1, 1, 3).setValues([['Admin', '', 'Administrator']]);
      sh.getRange('B2').setNote('Ketik password di sini. Setelah login pertama, isinya otomatis berubah jadi kode acak (hash) — itu normal.');
      sh.getRange(2, 1, 999, 2).setNumberFormat('@');   // teks biasa: password angka tidak berubah bentuk
      sh.setColumnWidth(2, 260);
    }
    if (name === 'LOG' || name === 'KUNJUNGAN') sh.protect().setWarningOnly(true);
    dibuat++;
  });
  ['Sheet1', 'Lembar1'].forEach(n => {
    const s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  try { SpreadsheetApp.getUi().alert(dibuat ? dibuat + ' tab database dibuat. Silakan isi datanya.' : 'Semua tab sudah ada.'); } catch (_) {}
}

const WEB_URL = 'https://<user>.github.io/<repo>/';   // isi setelah GitHub Pages aktif

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Pelita Bangsa')
    .addItem('🔄 Segarkan Web (hapus cache)', 'menuRefresh')
    .addItem('🌐 Buka Website', 'menuOpenWeb')
    .addSeparator()
    .addItem('⚙️ Siapkan Tab Database', 'setupSpreadsheet')
    .addItem('🔑 Atur Password Admin', 'menuSetPassword')
    .addToUi();
}

function menuRefresh() {
  hashAdminPasswords_(); // password polos di tab ADMIN → hash
  clearFolderCache_();   // baca ulang isi folder album Drive
  clearCache();
  getAllData();   // panaskan cache
  SpreadsheetApp.getActive().toast('Data baru siap. Muat ulang halaman website untuk melihatnya.', 'Pelita Bangsa', 6);
}

function menuOpenWeb() {
  const html = HtmlService.createHtmlOutput(
    '<p style="font-family:sans-serif">Website: <a href="' + WEB_URL + '" target="_blank">' + WEB_URL + '</a><br>' +
    'Panel admin: <a href="' + WEB_URL + 'admin/" target="_blank">' + WEB_URL + 'admin/</a></p>'
  ).setWidth(460).setHeight(140);
  SpreadsheetApp.getUi().showModalDialog(html, 'Website Pelita Bangsa');
}

/** Password admin disimpan di Script Properties, tidak pernah di kode / repo. */
function menuSetPassword() {
  const ui = SpreadsheetApp.getUi();
  const u = ui.prompt('Akun Admin (1/2)', 'Username panel admin (kosongkan = "Admin"). Username baru = akun baru di tab ADMIN:', ui.ButtonSet.OK_CANCEL);
  if (u.getSelectedButton() !== ui.Button.OK) return;
  const user = String(u.getResponseText() || '').trim() || 'Admin';
  if (!/^[A-Za-z0-9._-]{3,30}$/.test(user)) { ui.alert('Username 3–30 karakter: huruf, angka, titik, garis.'); return; }
  const res = ui.prompt('Akun Admin (2/2)', 'Password untuk "' + user + '" (minimal 5 karakter; dianjurkan 8+ dan tidak sama dengan username):', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const pw = String(res.getResponseText() || '').trim();
  if (pw.length < 5) { ui.alert('Password terlalu pendek (minimal 5 karakter).'); return; }
  setAdminPassword(pw, user);
  ui.alert('Akun admin tersimpan.\nUsername: ' + user + '\nSesi admin yang sedang aktif tetap berlaku sampai 6 jam.');
}

/**
 * Simpan/ubah password satu akun di tab ADMIN (langsung sebagai hash); akun belum ada → baris baru.
 * Jika tab ADMIN belum dibuat, disimpan sebagai akun tunggal di Script Properties (cara lama).
 */
function setAdminPassword(pw, user) {
  user = String(user || 'Admin').trim();
  const sh = getSS_().getSheetByName(CONFIG.SHEETS.ADMIN);
  if (!sh) {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('ADMIN_PASSWORD_HASH', sha256_(String(pw)));
    props.setProperty('ADMIN_USER', user);
    return;
  }
  const headers = headersOf_(sh), t = adminTable_();
  const a = t && t.rows.find(r => r.username.toLowerCase() === user.toLowerCase());
  if (a) { sh.getRange(a.row, t.cp + 1).setValue(pwHash_(a.username, pw)); return; }
  const baru = { username: user, password: pwHash_(user, pw), nama: user, nonaktif: false };
  sh.appendRow(headers.map(h => (h in baru ? baru[h] : '')));
}
