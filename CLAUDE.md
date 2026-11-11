# CLAUDE.md — Web Profil Rumah Baca Pelita Bangsa

File ini adalah konteks utama untuk Claude (Claude Code / Claude.ai) setiap kali mengerjakan proyek ini. **Baca seluruh file ini sebelum menulis kode.** Lihat juga `SKILLS.md` (resep teknis) dan `AGENTS.md` (pembagian peran & alur kerja).

---

## 1. Ringkasan Proyek

| Item | Keterangan |
|---|---|
| Nama | Web Profil Rumah Baca Pelita Bangsa (Pematang Siantar – Simalungun) |
| Pemilik proyek | Daniel |
| Developer | Andre |
| Jenis | Website profil komunitas literasi + panel admin ringan, data di Google Sheets |
| Hosting web | **GitHub Pages** (HTML/CSS/JS statis) |
| Database | **Google Sheets** (1 spreadsheet, 12 tab) |
| API | **Google Apps Script Web App** → JSON (`doGet` baca publik, `doPost` tulis admin bertoken) |
| Penyimpanan foto | **Google Drive** (folder publik "Anyone with the link") |
| UI | Rancangan Google Stitch di `design/stitch/` + design system `design/stitch/lentera_edukasi_komunitas/DESIGN.md` |
| Bahasa konten | Bahasa Indonesia |
| Versi | v1.1 (10 Nov 2026) |

### Fitur WAJIB (permintaan klien)

1. **Profil** — sejarah singkat, visi, misi/pilar, alamat, kontak, media sosial, statistik (koleksi buku, anak terbina, relawan).
2. **Pengurus** — struktur kepengurusan: foto, nama, jabatan, periode.
3. **Volunteer / Relawan** — daftar nama relawan aktif: foto (opsional), nama, asal/instansi, bidang.
4. **Agenda kegiatan tahunan** — kalender kegiatan per tahun, dikelompokkan per bulan, dengan status (Akan Datang / Berlangsung / Selesai).
5. **Galeri foto kegiatan** — album per kegiatan, foto bisa diklik untuk dilihat besar (lightbox).

### Fitur TAMBAHAN (disetujui Andre, 10 Nov 2026 — dipertahankan dari rancangan Stitch)

6. **Katalog koleksi buku** — tab `BUKU`, panel admin `admin/#buku` (entri, edit, pinjam/kembali, filter, zona rak, ekspor CSV). Stat "Koleksi Buku" di beranda dihitung dari tab ini jika `PROFIL.stat_koleksi_buku` kosong.
7. **Donatur, logistik buku, resi, WA gateway** — tab `DONASI`, formulir partisipasi publik di beranda (`doPost action=donasi`), panel admin `admin/#donatur` (status logistik, resi, ucapan via tautan `wa.me` dengan template).
8. **Berita / artikel** — tab `BERITA`, halaman publik `berita.html` (daftar + detail), section "Kabar & Warta" di beranda, panel admin `admin/#berita` (draf/terbit, pratinjau, markdown ringkas).
9. **Ringkasan analitik** — `admin/#ringkasan`: KPI, komposisi kategori buku (donut SVG), tren donasi & berita 6 bulan, log audit, jumlah baris per tab, latensi API.
10. **Konfigurasi database** — `admin/#konfigurasi`: parameter spreadsheet/API, pemetaan tab & kolom vs skema, uji ping, segarkan cache, ekspor backup CSV, log audit.
11. **Login / panel admin di web** — `admin/index.html`, password tunggal (hash SHA-256 di Script Properties), token sesi 6 jam di CacheService.

12. **Album galeri dari folder Google Drive** (disetujui Andre, 11 Nov 2026) — tab `ALBUM`, panel admin `admin/#galeri`: tempel link folder Drive → semua foto di folder jadi satu album. Foto tidak disalin (hemat penyimpanan). Tab `GALERI` lama tetap dibaca.

13. **Agenda & isi beranda dari panel admin** (disetujui Andre, 11 Nov 2026) — `admin/#agenda` (CRUD tab `AGENDA`, tiap agenda boleh punya gambar/poster `poster_drive_id`; baris yang ditulis langsung di Sheets tetap tampil dan bisa diedit) dan `admin/#konten` (isi tab `PROFIL`: foto utama beranda, logo, sambutan, sejarah, visi-misi, kontak, statistik).

**Pengurus & Relawan = edit di Google Sheets. Agenda & Profil = Sheets ATAU panel admin. Album, berita, buku, donasi = panel admin.** Panel admin menulis ke tab `BUKU`, `BERITA`, `DONASI`, `ALBUM`, `AGENDA` (lihat `CONFIG.ADMIN_WRITE`) dan ke `PROFIL` lewat aksi khusus `profil_save`. Tab lain tetap read-only dari web.

### Belum dibuat (di luar v1.1, jangan dibuat kecuali diminta)

- Jadwal piket / roster relawan mingguan (tab Stitch "Jadwal Relawan").
- Peminjaman per nama anak (sirkulasi hanya dihitung per judul: kolom `dipinjam`).
- Testimoni, WA API otomatis (broadcast), import CSV ke Sheets dari web, multi-akun admin.

---

## 2. Arsitektur

```
Pengunjung                                   Pengurus
   │                                            │
   ▼                                            ▼
GitHub Pages                               GitHub Pages /admin/
 index.html album.html berita.html          admin/index.html + assets/js/admin.js
   │  fetch GET ?action=all (tanpa header)     │  fetch POST body JSON (text/plain, tanpa header)
   ▼                                            ▼
Google Apps Script Web App (apps-script/) ───── doPost → handleAdmin_ (login/token, list/save/delete, stats, config)
 doGet → getAllData() → JSON, CacheService 10 menit        ↑ formulir donasi publik juga lewat doPost (action=donasi)
   │
   ▼
Google Sheets: PROFIL PENGURUS RELAWAN AGENDA GALERI  BUKU BERITA DONASI  LOG

Foto: <img src="https://lh3.googleusercontent.com/d/<ID>=w600">  ← langsung dari Google Drive
```

**Keputusan arsitektur (jangan diubah tanpa alasan kuat):**

- **Apps Script sebagai API, bukan "Publish to web CSV".** Data dibersihkan di server (filter `sembunyikan`, URL foto Drive, status agenda, pengelompokan album), di-cache, kolom sensitif (nomor WA donatur) tidak pernah keluar lewat `?action=all`.
- **Satu request** `?action=all` untuk seluruh halaman publik.
- **Fetch harus "simple request"**: GET biasa dan POST dengan body string (Content-Type default `text/plain`) — **tanpa** header kustom. Apps Script tidak menangani preflight `OPTIONS`; request sederhana mengikuti redirect ke `script.googleusercontent.com` yang mengizinkan CORS.
- **Cache 2 lapis:** server `CacheService` 600 detik (dihapus otomatis setiap tulisan admin) + browser `localStorage` stale-while-revalidate.
- **Tanpa build step.** Tailwind via CDN (sama seperti Stitch) dengan token di `assets/js/tailwind-config.js`, font via Google Fonts. Kode dibuat ringan: JavaScript vanilla, helper bersama di `ui.js`, header/footer publik dari satu sumber (`layout.js`), panel admin satu shell dengan hash routing.
- **Halaman:** `index.html` (anchor `#beranda #profil #pengurus #relawan #agenda #berita #galeri #donasi-kontak`), `album.html?id=`, `berita.html?id=`, `admin/` (hash `#ringkasan #berita #galeri #agenda #konten #buku #donatur #konfigurasi`), `404.html`.
- **URL bersih:** semua tautan antarhalaman ditulis **tanpa `.html`** (`album?id=`, `berita`, `./#profil`, `../`). GitHub Pages dan `npx serve` melayani `/album` dari `album.html`. `config.js` merapikan alamat lama berakhiran `.html` lewat `history.replaceState` (tidak di localhost).
- **URL API disimpan di satu tempat:** `assets/js/config.js`.
- **Rahasia hanya di Script Properties** (`ADMIN_PASSWORD_HASH`), diatur dari menu Sheets. Repo publik tidak pernah memuat password/token.

---

## 3. Struktur Repository

```
pelita-bangsa-web/                  ← repo GitHub, GitHub Pages dari branch main / root
├── CLAUDE.md  SKILLS.md  AGENTS.md  README.md
├── .nojekyll
├── index.html                      ← beranda (semua fitur wajib + berita + formulir donasi)
├── album.html                      ← galeri: daftar album / satu album
├── berita.html                     ← daftar berita / satu artikel
├── 404.html
├── admin/
│   └── index.html                  ← panel admin (login + 8 modul, hash routing)
├── assets/
│   ├── css/custom.css              ← skeleton, teks rata, prose berita, print
│   ├── js/
│   │   ├── config.js               ← API_URL, CACHE_KEY, override dev di localhost
│   │   ├── tailwind-config.js      ← token DESIGN.md (disalin dari Stitch)
│   │   ├── ui.js                   ← esc, avatar, bind, tanggal, chip, md, toast, kartu berita/album
│   │   ├── api.js                  ← loadData (SWR), post (POST text/plain), ping
│   │   ├── layout.js               ← header, menu mobile, bottom-nav, footer halaman publik
│   │   ├── lightbox.js
│   │   ├── app.js                  ← render index.html + kirim formulir donasi
│   │   ├── album.js  berita.js
│   │   └── admin.js                ← seluruh logika panel admin
│   └── img/ logo.png  og-image.png  placeholder.svg
├── apps-script/                    ← kode API (push dengan clasp)
│   ├── .clasp.json  .claspignore  appsscript.json
│   ├── Code.gs                     ← CONFIG, doGet, doPost
│   ├── Data.gs                     ← readSheet_, buildData_, buildAgenda_/Galeri_/Berita_, cache
│   ├── Admin.gs                    ← login/token, list/save/delete, donasi publik, stats, config, log
│   ├── Setup.gs                    ← SCHEMA, PROFIL_KEYS, DROPDOWN, setupSpreadsheet, menu, password
│   └── Utils.gs
├── dev/                            ← HANYA untuk uji lokal (tidak dipakai produksi)
│   ├── mock-api.json               ← contoh respons ?action=all
│   └── mock-admin.js               ← simulasi doPost di localhost (password demo1234)
└── design/stitch/                  ← ekspor Google Stitch ASLI, referensi saja, JANGAN diedit
```

Catatan: `apps-script/` dan `dev/` ikut terpublikasi di GitHub Pages sebagai file teks. Tidak masalah **asal tidak ada kunci/rahasia apa pun di kode**.

---

## 4. Skema Google Sheets

Nama tab **HURUF BESAR**, baris 1 = header, data mulai baris 2. Header **harus persis** (pemetaan berdasarkan nama header, urutan kolom bebas; kolom tambahan diabaikan API). `setupSpreadsheet()` membuat semuanya.

### Tab `PROFIL` (kunci–nilai)

| kunci | nilai |
|---|---|
| nama_organisasi, tagline, deskripsi_singkat | teks (tagline: bagian setelah " di " terakhir diberi sorotan warna) |
| tahun_berdiri, sejarah_judul, sejarah, visi | teks (sejarah boleh beberapa paragraf) |
| misi_1 / misi_2 / misi_3 | "Judul — deskripsi" (dipisah " — ") |
| alamat, jam_operasional, whatsapp, email, rekening | whatsapp format 62xxx tanpa +; rekening boleh beberapa baris |
| instagram / facebook / youtube / tiktok | URL lengkap (kosong = ikon disembunyikan) |
| maps_embed | URL embed Google Maps (kosong = peta disembunyikan) |
| logo_drive_id, hero_foto_drive_id | ID/link Drive |
| stat_koleksi_buku / stat_anak_terbina / stat_relawan | angka; stat_koleksi_buku kosong → dihitung dari tab BUKU |

### Tab `PENGURUS` — `urutan | nama | jabatan | periode | foto_drive_id | deskripsi | sembunyikan`
### Tab `RELAWAN` — `nama | asal_instansi | bidang | sejak_tahun | foto_drive_id | sembunyikan`
`bidang`: Pengajar, Dongeng, Literasi Digital, Dokumentasi, Logistik, Lainnya.
### Tab `AGENDA` (Sheets atau panel admin) — `id | tahun | tanggal_mulai | tanggal_selesai | nama_kegiatan | lokasi | kategori | deskripsi | status | album_id | poster_drive_id | sembunyikan`
`id` otomatis `AG-yymmdd-XXX`; baris buatan Sheets tanpa id diberi id saat panel memuat daftar (`ensureIds_`). Kolom skema yang belum ada di tab lama ditambahkan di kanan (`ensureSchemaCols_`). `poster_drive_id` = link file gambar Drive → `agenda.items[].poster` (=w900), tampil di web + lightbox; agenda boleh hanya nama + poster (tanpa tanggal → kelompok "Tanggal Menyusul").
Tanggal `yyyy-mm-dd` Plain text. `status` kosong → dihitung server. `kategori`: Literasi Anak, Literasi Digital, Pemberdayaan Warga, Perayaan, Lainnya.
### Tab `GALERI` — `album_id | judul_album | tanggal | foto_drive_id | keterangan | sampul | sembunyikan`
Satu baris = satu foto; `album_id` sama = satu album; `sampul` TRUE = foto sampul.

### Tab `BUKU` (admin boleh tulis)
`id | isbn | judul | penulis | penerbit_tahun | kategori | rak | jumlah | dipinjam | sumber | catatan | sembunyikan`
- `id` otomatis `BK-yymmdd-XXX`. `rak` diawali huruf zona (Rak A1 …). `dipinjam` ≤ `jumlah`.
- `kategori`: Fabel & Dongeng, Sains & Alam, Komik Edukasi, Cerita Rakyat, Ensiklopedi & Kamus, Pelajaran, Sastra Remaja, Lainnya.

### Tab `BERITA` (admin boleh tulis)
`id | tanggal | judul | kategori | penulis | lokasi | ringkasan | isi | foto_drive_id | status | sembunyikan`
- `status`: Terbit / Draf — hanya **Terbit** yang keluar lewat `?action=all`. `isi` mendukung markdown ringkas (`**tebal**`, `*miring*`, `- daftar`, `> kutipan`).
- `kategori`: Kabar Komunitas, Kegiatan, Laporan Donasi, Opini Edukasi, Pojok Baca.

### Tab `DONASI` (admin boleh tulis; formulir web menambah baris)
`id | tanggal | nama | whatsapp | asal | jenis | kategori_buku | jumlah | logistik | resi | status | apresiasi | catatan | sumber`
- `jenis`: Donasi Buku, Relawan Mengajar, Rak & Alat Tulis, Dukungan Operasional, Kemitraan / CSR.
- `status`: Baru → Dikonfirmasi → Dalam Pengiriman → Diterima → Terkatalog; atau Dibatalkan. `apresiasi`: Belum / Terkirim. `sumber`: web / admin.
- **Tidak pernah dikirim ke web publik** (berisi nomor WA).

### Tab `ALBUM` (admin boleh tulis)
`id | tanggal | judul | folder_drive | sembunyikan`
- Satu baris = satu album = satu folder Google Drive (dibagikan "Anyone with the link"). `id` otomatis `AL-yymmdd-XXX`, dipakai sebagai `album_id` di AGENDA.
- Server membaca gambar di folder lewat `DriveApp` (scope `drive.readonly`), urut nama file, foto pertama = sampul, maks `CONFIG.ALBUM_MAX_FOTO`. Daftar foto di-cache per folder 6 jam (`fld_<id>`); dibaca ulang saat album disimpan/tombol sync, atau saat "Segarkan".

### Tab `ADMIN` (akun login panel admin — disetujui Andre, 11 Nov 2026)
`username | password | nama | nonaktif`
- Satu baris = satu akun. Password diketik biasa di sel; server menggantinya jadi `sha256:<hash>` saat login berhasil / menu "Segarkan Web" (`hashAdminPasswords_`). Username ikut di-hash → ganti username = isi ulang password.
- `nonaktif` dicentang = akun tidak bisa login. Password kosong = tidak bisa login.
- **Tidak pernah keluar lewat API**: tidak dibaca `buildData_`, dan `sheetFor_` menolak `ADMIN` (list/save/delete/ekspor CSV).
- Tab belum ada/kosong → login jatuh ke akun lama di Script Properties (`ADMIN_USER`, `ADMIN_PASSWORD_HASH`).

### Tab `KUNJUNGAN` (penghitung pengunjung — disetujui Andre, 11 Nov 2026; hanya ditulis server)
`tanggal | pengunjung | pengunjung_baru`
- Satu baris = satu hari. `pengunjung` = perangkat unik hari itu; `pengunjung_baru` = perangkat yang pertama kali datang di bulan itu (jumlah sebulan = pengunjung unik bulanan).
- Frontend: `PB.trackVisit()` di `api.js` (halaman publik saja, bukan localhost/admin), penanda `localStorage.pb_visit` → maksimal 1 POST `action=kunjungan` per perangkat per hari. Tanpa data pribadi, tidak masuk LOG, tidak menghapus cache.
- Tampil di `admin/#ringkasan` lewat `stats.kunjungan` (`hariIni, kemarin, bulanIni, bulanLalu, harian[14], bulanan[6]`).

### Tab `LOG` (hanya ditulis server)
`waktu | aksi | tab | id | keterangan | oleh` — jejak audit panel admin & formulir web, dipangkas otomatis di 1000 baris.

### Aturan umum data

- Kolom `sembunyikan`: checkbox. **Tidak dicentang = tampil**, dicentang = disembunyikan.
- Baris tanpa field utama diabaikan, bukan error. Selalu baca dengan `getDisplayValues()`.

---

## 5. Kontrak API

**GET** `<API_URL>?action=<aksi>`

| action | Respons |
|---|---|
| `all` (default) | `{ ok: true, data: {...}, cached: bool, generatedAt: ISO }` — bentuk `data` di `AGENTS.md` §3 |
| `ping` | `{ ok: true, pong: ISO }` |
| lainnya / error | `{ ok: false, error }` (HTTP tetap 200) |

**POST** body = JSON string `{ action, token?, ... }` (Content-Type `text/plain`, tanpa header kustom)

| action | token | Payload | Respons |
|---|---|---|---|
| `login` | – | `{ user, password }` (dicocokkan ke tab `ADMIN`) | `{ ok, token, expiresIn, user }` (5× salah → kunci 5 menit) |
| `donasi` | – | `{ data: { nama, whatsapp, jenis, catatan, website(honeypot) } }` | `{ ok, id }` — dibatasi 1 kiriman / 3 menit per nomor |
| `kunjungan` | – | `{ baru: bool }` | `{ ok }` — +1 pengunjung hari ini (tab KUNJUNGAN) |
| `me`, `logout` | ✓ | – | `{ ok }` |
| `list` | ✓ | `{ sheet }` | `{ ok, headers, rows:[{_row,...}], writable }` — semua tab |
| `save` | ✓ | `{ sheet, data:{ id?, ... } }` | `{ ok, row }` — upsert by `id`; hanya BUKU/BERITA/DONASI/ALBUM/AGENDA; kolom tak dikirim dipertahankan. ALBUM: folder divalidasi, respons ditambah `foto` (jumlah) & `publik` (bool) |
| `delete` | ✓ | `{ sheet, id }` | `{ ok }` |
| `profil_save` | ✓ | `{ data: { kunci: nilai, ... } }` | `{ ok, profil }` — hanya kunci di `PROFIL_KEYS`; kunci tak dikirim tidak diubah |
| `stats` | ✓ | – | `{ ok, stats }` (KPI, kategori, perBulan, rows, log, cache) |
| `config` | ✓ | – | `{ ok, config }` (spreadsheet, api, tabs+skema, log, passwordDiatur) |
| `refresh` | ✓ | – | `{ ok }` — hapus & panaskan cache publik |

Token/sesi tidak valid → `{ ok:false, auth:false }` → frontend memaksa login ulang. Frontend **wajib** memeriksa `ok`.

---

## 6. Konvensi Kode

### Apps Script (`apps-script/*.gs`)

- V8 runtime, `const`/`let`. Fungsi privat diakhiri `_`. Konstanta di `CONFIG` (`Code.gs`).
- Output lewat `json_()`. Jangan melempar error mentah ke klien: tangkap, kembalikan `{ok:false}`, `console.error` detailnya.
- Semua tulisan: `LockService`, `sanitizeRow_` (whitelist kolom, batas panjang, validasi tanggal/angka), `clearCache()`, `logRow_()`.
- Komentar Bahasa Indonesia.

### Frontend (`*.html`, `assets/`)

- **Pertahankan tampilan Stitch.** Salin struktur kelas Tailwind dari `design/stitch/*/code.html`; satu markup responsif (mobile = Stitch `..._mobile_...`, desktop = Stitch desktop) dengan prefix `sm: md: lg: xl:`.
- Token desain di `assets/js/tailwind-config.js`, dimuat **setelah** CDN Tailwind.
- JavaScript **vanilla**, file terpisah, `defer`, namespace `window.PB`. Tidak ada framework/bundler. Halaman di subfolder set `PB.BASE = '../'` sebelum `ui.js`.
- **Semua path relatif**. Render dengan template literal; **selalu `PB.esc()`** teks dari API sebelum `innerHTML`; isi berita lewat `PB.md()` (sudah di-escape).
- Skeleton saat memuat, pesan kosong per section, banner error + "Coba lagi" jika API gagal tanpa cache. Render harus idempotent.
- Gambar: `loading="lazy"`, `referrerpolicy="no-referrer"`, fallback avatar inisial / `placeholder.svg`.
- Konten utama tidak di-hardcode. Pengecualian: `<title>`, meta/OG, teks fallback SEO, dan kalimat pengantar section.
- Panel admin: token hanya di `sessionStorage`; setiap aksi tulis memperbarui daftar lokal (tanpa muat ulang) lalu `PB.toast`.

### Aksesibilitas & performa

- Kontras sesuai DESIGN.md; target sentuh ≥ 44px di mobile; tombol ikon punya `title`/`aria-label`.
- Foto Drive: thumbnail `=w600` (berita `=w900`), lightbox `=w1600`.
- Kunjungan pertama < 4 detik di 4G; kunjungan ulang (cache browser) < 1 detik.

---

## 7. Perintah Penting

```bash
# Frontend — uji lokal (wajib lewat server, jangan buka file:// langsung)
npx serve -l 8080 .            # wajib server yang mendukung URL tanpa .html (python -m http.server TIDAK)
# Tanpa Apps Script: di console browser
#   localStorage.pb_api_dev = 'dev/mock-api.json'   (halaman publik, data contoh)
#   localStorage.pb_admin_dev = '1'                 (admin/, password demo1234)

# Apps Script API
npm i -g @google/clasp && clasp login
cd apps-script && clasp push
clasp deploy -i <DEPLOYMENT_ID> -d "v1.x"   # update API TANPA ganti URL

# Rilis frontend
git add . && git commit -m "feat: ..." && git push   # GitHub Pages update otomatis ±1 menit
```

Fungsi manual di editor / menu Sheets: `setupSpreadsheet()`, `menuSetPassword()` / `setAdminPassword('...')`, `clearCache()`, `testData()`.

---

## 8. Definisi Selesai (Definition of Done)

1. Section tampil sesuai rancangan Stitch di desktop (≥1024px) **dan** mobile (375px).
2. Data 100% dari Sheets via API — ubah satu sel → "Segarkan Web" → muat ulang → perubahan terlihat.
3. Tab kosong / baris tidak lengkap / API mati tidak membuat halaman rusak.
4. Console browser tanpa error (warning Tailwind CDN diperbolehkan); Apps Script Executions tanpa error.
5. Berfungsi di URL GitHub Pages (subfolder), bukan hanya di localhost.
6. Panel admin: login, setiap aksi tulis terlihat di Sheets dan di tab LOG, web publik ikut berubah setelah cache dihapus.
7. README diperbarui jika ada kolom/tab/langkah baru.

## 9. Hal yang JANGAN Dilakukan

- Jangan mengubah `design/stitch/`.
- Jangan menambah fitur di luar daftar §1 tanpa konfirmasi Andre.
- Jangan menaruh API key, token, password, atau nomor WA pribadi di repo. Password admin hanya lewat Script Properties.
- Jangan menambah header kustom pada `fetch` ke Apps Script (memicu preflight CORS → gagal). POST tetap body string.
- Jangan memakai path absolut `/...` di HTML/JS.
- Jangan membuat *New deployment* Apps Script untuk update — URL API berubah dan web rusak.
- Jangan mengeluarkan tab `DONASI`/`LOG` atau kolom `whatsapp` lewat `?action=all`.
- Jangan menambah tab ke `CONFIG.ADMIN_WRITE` tanpa persetujuan Andre (fitur wajib tetap diedit di Sheets).
- Jangan memakai `getValues()` untuk tanggal.
