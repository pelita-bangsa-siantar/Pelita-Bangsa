/* Mode demo panel admin TANPA Apps Script (hanya localhost). Password demo: demo1234.
   Aktifkan: localStorage.pb_admin_dev = '1' di console, lalu muat ulang admin/. Data hanya di memori. */
(function () {
  const today = new Date(), ym = d => d.toISOString().slice(0, 7);
  const ago = n => { const d = new Date(today); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); };
  const DB = {
    BUKU: [
      { id: 'BK-251010-A1B', isbn: '978-602-03-8812-4', judul: 'Dongeng Si Kantil & Pohon Raksasa', penulis: 'Tioria Simanjuntak', penerbit_tahun: 'Gramedia Pustaka, 2021', kategori: 'Fabel & Dongeng', rak: 'Rak A2', jumlah: '10', dipinjam: '2', sumber: 'Donasi Publik', catatan: '', sembunyikan: 'FALSE' },
      { id: 'BK-251010-C2D', isbn: '978-623-24-4119-9', judul: 'Asal-Usul Danau Toba & Pulau Samosir', penulis: 'Marbun Saragih', penerbit_tahun: 'Dian Aksara, 2020', kategori: 'Cerita Rakyat', rak: 'Rak B3', jumlah: '15', dipinjam: '3', sumber: 'CSR Mitra', catatan: '', sembunyikan: 'FALSE' },
      { id: 'BK-251010-E3F', isbn: '978-602-45-2980-1', judul: 'Seri Tubuh Manusia: Kenapa Kita Bisa Bersin?', penulis: 'Dr. Hendrik Purba', penerbit_tahun: 'BIP Kids, 2022', kategori: 'Sains & Alam', rak: 'Rak C1', jumlah: '6', dipinjam: '5', sumber: 'Donasi Publik', catatan: 'Sampul agak lecek', sembunyikan: 'FALSE' },
      { id: 'BK-251010-G4H', isbn: '978-979-30-6218-0', judul: 'Kamus Bergambar 3 Bahasa: Indonesia - Batak - Inggris', penulis: 'Tim Bahasa Daerah', penerbit_tahun: 'Balai Pustaka, 2023', kategori: 'Ensiklopedi & Kamus', rak: 'Rak D1', jumlah: '8', dipinjam: '8', sumber: 'Hadiah Festival', catatan: 'Hanya baca di tempat', sembunyikan: 'FALSE' },
      { id: 'BK-251010-J5K', isbn: '978-602-12-8801-9', judul: 'Komik Sejarah: Raja Siantar Sang Naualuh', penulis: 'Ardi Damanik', penerbit_tahun: 'Studio Siantar Komik, 2022', kategori: 'Komik Edukasi', rak: 'Rak B1', jumlah: '20', dipinjam: '6', sumber: 'Kas Swadaya', catatan: '', sembunyikan: 'FALSE' }
    ],
    BERITA: [
      { id: 'PB-251028-A1B', tanggal: ago(0), judul: 'Semarak Sumpah Pemuda: Festival Baca Nyaring Bersama 80 Anak Siantar', kategori: 'Kegiatan', penulis: 'Kak Tiara Purba', lokasi: 'Siantar Barat', ringkasan: 'Delapan puluh anak merayakan kecintaan membaca lewat festival mendongeng.', isi: 'Sebanyak delapan puluh anak berkumpul.\n\n- Mendongeng cerita rakyat\n- Pameran buku bergambar\n\n> "Setiap anak membawa pulang paket buku."', foto_drive_id: '', status: 'Terbit', sembunyikan: 'FALSE' },
      { id: 'PB-251015-C2D', tanggal: ago(1), judul: 'Penerimaan Paket 350 Buku Ensiklopedia Anak dari Alumni Kampus Medan', kategori: 'Laporan Donasi', penulis: 'Bung David Saragih', lokasi: 'Simalungun', ringkasan: 'Koleksi buku sains dan atlas dunia bertambah.', isi: 'Seluruh kiriman telah dikurasi dan dilabeli kode rak.', foto_drive_id: '', status: 'Terbit', sembunyikan: 'FALSE' },
      { id: 'PB-250928-E3F', tanggal: ago(2), judul: 'Rencana Pembukaan Rak Baca Terbuka di Taman Bunga Lapangan Merdeka', kategori: 'Pojok Baca', penulis: 'Kak Tiara Purba', lokasi: 'Pematang Siantar', ringkasan: '', isi: 'Inisiatif rak baca terbuka tahan cuaca di ruang publik kota.', foto_drive_id: '', status: 'Draf', sembunyikan: 'FALSE' }
    ],
    DONASI: [
      { id: 'DN-251024-A1B', tanggal: ago(0), nama: 'Dr. Tiurmaida Situmorang, M.Pd', whatsapp: '6281370229811', asal: 'Alumni SMAN 1 Siantar / Medan', jenis: 'Donasi Buku', kategori_buku: 'Cerita Rakyat & Dongeng', jumlah: '120', logistik: 'JNE', resi: '881290', status: 'Diterima', apresiasi: 'Terkirim', catatan: 'Untuk perintisan pojok baca nagori di Dolok Pardamean.', sumber: 'admin' },
      { id: 'DN-251022-C2D', tanggal: ago(0), nama: 'Komunitas Anak Danau Kreatif', whatsapp: '6282165401922', asal: 'Parapat, Simalungun', jenis: 'Donasi Buku', kategori_buku: 'Sains & Lingkungan Hidup', jumlah: '85', logistik: 'Antar Langsung', resi: '', status: 'Terkatalog', apresiasi: 'Belum', catatan: 'Mendukung literasi sains terapan.', sumber: 'web' },
      { id: 'DN-251019-E3F', tanggal: ago(1), nama: 'Bona Ventura Saragih, S.T.', whatsapp: '628119981440', asal: 'Ikatan Alumni ITB Siantar / Jakarta', jenis: 'Donasi Buku', kategori_buku: 'Teknologi & Komputer', jumlah: '210', logistik: 'SiCepat', resi: '002194', status: 'Dalam Pengiriman', apresiasi: 'Belum', catatan: 'Paket ensiklopedia teknologi.', sumber: 'web' },
      { id: 'DN-251011-G4H', tanggal: ago(2), nama: 'Keluarga Besar Purba Tambak', whatsapp: '6281244119080', asal: 'Bandung, Jawa Barat', jenis: 'Donasi Buku', kategori_buku: 'Sastra & Budaya', jumlah: '95', logistik: 'J&T', resi: '772183', status: 'Baru', apresiasi: 'Belum', catatan: 'Koleksi sastra daerah dan majalah anak.', sumber: 'web' },
      { id: 'DN-251009-J5K', tanggal: ago(3), nama: 'Rian Sinaga', whatsapp: '6281234567890', asal: 'Mahasiswa USI', jenis: 'Relawan Mengajar', kategori_buku: '', jumlah: '', logistik: '', resi: '', status: 'Baru', apresiasi: 'Belum', catatan: 'Bisa mengajar matematika akhir pekan.', sumber: 'web' }
    ],
    ALBUM: [
      { id: 'AL-251020-A1B', tanggal: ago(1), judul: 'Festival Baca Nyaring 2026', folder_drive: 'https://drive.google.com/drive/folders/1DEMO_folderxxxxxxxxxxxxxxxxxxxxx', sembunyikan: 'FALSE', _foto: '24' }
    ],
    LOG: [{ waktu: ago(0) + ' 09:12:00', aksi: 'donasi-web', tab: 'DONASI', id: 'DN-251011-G4H', keterangan: 'Keluarga Besar Purba Tambak · Donasi Buku', oleh: 'web' }],
    PROFIL: [{ kunci: 'stat_anak_terbina', nilai: '420' }], PENGURUS: [{}, {}, {}, {}], RELAWAN: Array(6).fill({ nama: 'x' }), AGENDA: Array(5).fill({ nama_kegiatan: 'x', tanggal_mulai: '2026-12-01' }), GALERI: Array(3).fill({ foto_drive_id: 'x', album_id: 'a' })
  };
  const SK = { PROFIL: ['kunci', 'nilai'], PENGURUS: ['urutan', 'nama', 'jabatan', 'periode', 'foto_drive_id', 'deskripsi', 'sembunyikan'], RELAWAN: ['nama', 'asal_instansi', 'bidang', 'sejak_tahun', 'foto_drive_id', 'sembunyikan'], AGENDA: ['tahun', 'tanggal_mulai', 'tanggal_selesai', 'nama_kegiatan', 'lokasi', 'kategori', 'deskripsi', 'status', 'album_id', 'sembunyikan'], GALERI: ['album_id', 'judul_album', 'tanggal', 'foto_drive_id', 'keterangan', 'sampul', 'sembunyikan'], BUKU: ['id', 'isbn', 'judul', 'penulis', 'penerbit_tahun', 'kategori', 'rak', 'jumlah', 'dipinjam', 'sumber', 'catatan', 'sembunyikan'], BERITA: ['id', 'tanggal', 'judul', 'kategori', 'penulis', 'lokasi', 'ringkasan', 'isi', 'foto_drive_id', 'status', 'sembunyikan'], DONASI: ['id', 'tanggal', 'nama', 'whatsapp', 'asal', 'jenis', 'kategori_buku', 'jumlah', 'logistik', 'resi', 'status', 'apresiasi', 'catatan', 'sumber'], ALBUM: ['id', 'tanggal', 'judul', 'folder_drive', 'sembunyikan'], LOG: ['waktu', 'aksi', 'tab', 'id', 'keterangan', 'oleh'] };
  const WRITE = ['BUKU', 'BERITA', 'DONASI', 'ALBUM'];
  // Sesi demo bertahan saat halaman dimuat ulang (token demo tetap, tersimpan di sessionStorage oleh admin.js)
  let TOKEN = ''; try { if (sessionStorage.getItem('pb_admin_token') === 'a'.repeat(32)) TOKEN = 'a'.repeat(32); } catch (_) {}
  const log = (aksi, tab, id, ket) => DB.LOG.push({ waktu: new Date().toISOString().slice(0, 19).replace('T', ' '), aksi, tab, id, keterangan: ket, oleh: 'admin' });
  const months = n => { const o = []; for (let i = n - 1; i >= 0; i--) { const d = new Date(today.getFullYear(), today.getMonth() - i, 1); o.push(ym(d)); } return o; };
  const num = v => Number(String(v || '').replace(/[^0-9.-]/g, '')) || 0;

  PB.devPost = function (b) {
    return new Promise(res => setTimeout(() => res(handle(b)), 250 + Math.random() * 300));
  };
  function handle(b) {
    if (b.action === 'login') { if (b.password !== 'demo1234') return { ok: false, error: 'Password salah. (demo: demo1234)' }; TOKEN = 'a'.repeat(32); log('login', '-', '-', 'Admin masuk (demo)'); return { ok: true, token: TOKEN, user: { nama: 'Pengurus Literasi (Demo)', email: 'demo@localhost' } }; }
    if (b.action === 'donasi') { const id = 'DN-DEMO-' + Date.now().toString(36).toUpperCase(); DB.DONASI.push(Object.assign({ id, tanggal: ago(0), status: 'Baru', apresiasi: 'Belum', sumber: 'web', logistik: '', resi: '' }, b.data)); return { ok: true, id }; }
    if (!b.token || b.token !== TOKEN) return { ok: false, auth: false, error: 'Sesi tidak valid' };
    const list = s => ({ ok: true, sheet: s, headers: SK[s], rows: (DB[s] || []).map((r, i) => Object.assign({ _row: i + 2 }, r)), writable: WRITE.includes(s) });
    switch (b.action) {
      case 'me': return { ok: true, user: { nama: 'Pengurus Literasi (Demo)', email: 'demo@localhost' } };
      case 'logout': TOKEN = ''; return { ok: true };
      case 'list': return SK[b.sheet] ? list(b.sheet) : { ok: false, error: 'Tab tidak dikenal' };
      case 'save': {
        if (!WRITE.includes(b.sheet)) return { ok: false, error: 'Tab ' + b.sheet + ' hanya bisa diedit di Sheets' };
        const rows = DB[b.sheet], d = Object.assign({}, b.data); let i = d.id ? rows.findIndex(r => r.id === d.id) : -1;
        // Demo album: tidak membaca Drive sungguhan, jumlah foto dikarang.
        const extra = b.sheet === 'ALBUM' && 'folder_drive' in d ? { foto: 12 + Math.floor(Math.random() * 30), publik: true } : {};
        if (b.sheet === 'ALBUM' && 'folder_drive' in d && !/folders\/[\w-]{15,}/.test(d.folder_drive)) return { ok: false, error: 'Link folder tidak dikenali. Tempel link seperti https://drive.google.com/drive/folders/...' };
        if (extra.foto != null) d._foto = String(extra.foto);
        if (i === -1) { d.id = d.id || ({ BUKU: 'BK', BERITA: 'PB', DONASI: 'DN', ALBUM: 'AL' }[b.sheet]) + '-DEMO-' + Date.now().toString(36).toUpperCase().slice(-5); rows.push(d); i = rows.length - 1; log('tambah', b.sheet, d.id, d.judul || d.nama || ''); }
        else { Object.assign(rows[i], d); log('ubah', b.sheet, d.id, d.judul || d.nama || ''); }
        return Object.assign({ ok: true, row: Object.assign({ _row: i + 2 }, rows[i]) }, extra);
      }
      case 'delete': { if (!WRITE.includes(b.sheet)) return { ok: false, error: 'Tidak diizinkan' }; DB[b.sheet] = DB[b.sheet].filter(r => r.id !== b.id); log('hapus', b.sheet, b.id, ''); return { ok: true }; }
      case 'refresh': log('refresh', '-', '-', 'Cache publik disegarkan'); return { ok: true };
      case 'stats': {
        const kat = {}, zona = {}; let total = 0, dip = 0;
        DB.BUKU.forEach(r => { const j = num(r.jumlah) || 1, p = Math.min(num(r.dipinjam), j); total += j; dip += p; kat[r.kategori || 'Lainnya'] = (kat[r.kategori || 'Lainnya'] || 0) + j; const z = (r.rak || '').replace(/^rak\s*/i, '').charAt(0).toUpperCase() || '-'; zona[z] = zona[z] || { total: 0, siap: 0 }; zona[z].total += j; zona[z].siap += j - p; });
        const m = months(6), per = arr => m.map(x => ({ bulan: x, n: arr.filter(r => (r.tanggal || '').slice(0, 7) === x).length }));
        const rows = {}; Object.keys(SK).forEach(k => { rows[k] = (DB[k] || []).length; });
        return { ok: true, stats: { koleksi: { total, judul: DB.BUKU.length, tersedia: total - dip, dipinjam: dip, kategori: kat, zona }, anak_terbina: '420', relawan: 6,
          berita: { total: DB.BERITA.length, terbit: DB.BERITA.filter(r => r.status === 'Terbit').length, draf: DB.BERITA.filter(r => r.status === 'Draf').length, perBulan: per(DB.BERITA) },
          donasi: { total: DB.DONASI.length, buku: DB.DONASI.filter(r => /buku/i.test(r.jenis)).reduce((a, r) => a + num(r.jumlah), 0), baru: DB.DONASI.filter(r => r.status === 'Baru').length, perBulan: per(DB.DONASI) },
          kunjungan: (() => { const h = Array.from({ length: 14 }, (_, i) => ({ tanggal: new Date(Date.now() - (13 - i) * 864e5).toISOString().slice(0, 10), n: 8 + (i * 7) % 19 })), bl = m.map((x, i) => ({ bulan: x, n: 90 + i * 37 })); return { hariIni: h[13].n, kemarin: h[12].n, bulanIni: bl[5].n, bulanLalu: bl[4].n, harian: h, bulanan: bl }; })(),
          agenda: { total: 5, akanDatang: 2 }, galeri: { album: 2, foto: 3 }, rows, bulan: m, log: DB.LOG.slice(-8).reverse(), cache: { ttl: 600, aktif: true }, dibuat: new Date().toISOString() } };
      }
      case 'config': return { ok: true, config: { spreadsheet: { nama: 'DB Web Pelita Bangsa (DEMO)', id: '1DEMO_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', url: 'https://docs.google.com/spreadsheets' }, api: { url: 'https://script.google.com/macros/s/DEMO/exec', cacheTtl: 600, tokenTtl: 21600, timezone: 'Asia/Jakarta' }, user: { nama: 'Pengurus Literasi (Demo)', email: 'demo@localhost' },
        tabs: Object.keys(SK).map(k => ({ nama: k, ada: true, baris: (DB[k] || []).length, kolom: SK[k], skema: SK[k], deskripsi: { PROFIL: 'Identitas, kontak, statistik', PENGURUS: 'Struktur kepengurusan', RELAWAN: 'Relawan aktif', AGENDA: 'Agenda kegiatan tahunan', GALERI: 'Foto per album', BUKU: 'Katalog koleksi buku', BERITA: 'Berita & artikel', DONASI: 'Donatur & logistik buku', ALBUM: 'Album galeri dari folder Drive', LOG: 'Jejak audit panel admin' }[k], bisaTulis: WRITE.includes(k) })),
        log: DB.LOG.slice(-20).reverse(), passwordDiatur: true } };
      default: return { ok: false, error: 'Aksi tidak dikenal' };
    }
  }
})();
