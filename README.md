# 🏮 Web Profil Rumah Baca Pelita Bangsa

Website profil komunitas literasi **Rumah Baca Pelita Bangsa** (Pematang Siantar – Simalungun) beserta **panel admin ringan**.
Tampilan di-hosting gratis di **GitHub Pages**, isinya diambil dari **Google Sheets** lewat API kecil **Google Apps Script**, dan foto disimpan di **Google Drive**. Pengurus mengedit spreadsheet (profil, pengurus, relawan, agenda, galeri) atau memakai panel admin (buku, berita, donasi) — tidak perlu menyentuh kode.

| | |
|---|---|
| Pemilik proyek | Daniel |
| Developer | Andre |
| URL website | `https://<user>.github.io/<repo>/` *(isi setelah aktif)* |
| URL panel admin | `https://<user>.github.io/<repo>/admin/` |
| URL API | `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec` |
| Deployment ID API | `<DEPLOYMENT_ID>` |
| Spreadsheet database | `<link spreadsheet>` |
| Folder foto Drive | `<link folder>` |
| Versi | v1.1 (10 Nov 2026) |

---

## ✨ Fitur

| Fitur | Isi | Sumber data | Dikelola lewat |
|---|---|---|---|
| **Profil** | Sejarah, visi, 3 pilar/misi, statistik, alamat, jam buka, kontak, media sosial, peta, rekening | Tab `PROFIL` | Sheets |
| **Pengurus** | Foto, nama, jabatan, periode | Tab `PENGURUS` | Sheets |
| **Relawan** | Daftar relawan, asal/instansi, bidang, filter per bidang | Tab `RELAWAN` | Sheets |
| **Agenda Tahunan** | Kegiatan per tahun & bulan, status otomatis, sorotan kegiatan terdekat | Tab `AGENDA` | Sheets |
| **Galeri Foto** | Album per kegiatan, halaman album, lightbox | Tab `GALERI` + Drive | Sheets |
| **Berita & Artikel** | Kartu di beranda, halaman daftar + detail, markdown ringkas | Tab `BERITA` | Panel admin / Sheets |
| **Katalog Buku** | Inventaris, stok tersedia/dipinjam, zona rak, ekspor CSV | Tab `BUKU` | Panel admin / Sheets |
| **Donatur & Logistik** | Formulir partisipasi di web, status logistik, resi, ucapan via WhatsApp | Tab `DONASI` | Panel admin |
| **Ringkasan Analitik** | KPI, komposisi kategori, tren 6 bulan, log audit, status API | Semua tab | Panel admin |
| **Konfigurasi Sheets** | Parameter spreadsheet/API, pemetaan tab, ping, segarkan cache, backup CSV | — | Panel admin |

Tampilan mengikuti rancangan Google Stitch (`design/stitch/`) dengan design system *Lentera Edukasi Komunitas*: amber–biru langit–rose, font Plus Jakarta Sans, responsif desktop & HP.

---

## 🧱 Cara Kerja

```
Pengunjung → GitHub Pages (HTML/CSS/JS)
               ├─ fetch GET  → Apps Script API (?action=all) → Google Sheets   (cache 10 menit)
               ├─ fetch POST → Apps Script API (action=donasi) → tab DONASI
               └─ <img>      → Google Drive
Pengurus   → GitHub Pages /admin/ → fetch POST (login, list, save, delete, stats, config) → Sheets
```

- Web publik hanya **membaca** data (kecuali formulir donasi yang menambah satu baris).
- Panel admin hanya bisa menulis ke tab `BUKU`, `BERITA`, `DONASI`. Tab lain tetap diedit di Sheets.
- Password admin disimpan sebagai hash di *Script Properties* Apps Script, tidak ada di kode.

**Teknologi:** HTML + JavaScript vanilla (tanpa framework/bundler), Tailwind CSS (CDN), Google Apps Script (V8), Google Sheets, Google Drive, GitHub Pages, `clasp`.

---

## 📁 Struktur Repository

```
pelita-bangsa-web/
├── CLAUDE.md  SKILLS.md  AGENTS.md  README.md
├── .nojekyll
├── index.html  album.html  berita.html  404.html
├── admin/index.html                 panel admin (login + 5 modul)
├── assets/
│   ├── css/custom.css
│   ├── js/  config.js tailwind-config.js ui.js api.js layout.js lightbox.js app.js album.js berita.js admin.js
│   └── img/ logo.png og-image.png placeholder.svg
├── apps-script/   Code.gs Data.gs Admin.gs Setup.gs Utils.gs appsscript.json .clasp.json
├── dev/           mock-api.json mock-admin.js   (hanya uji lokal)
└── design/stitch/ rancangan UI asli (referensi, jangan diedit)
```

---

## 🚀 Instalasi (untuk developer)

### Langkah 1 — Database & API (Google)

1. Buat Google Sheet baru `DB Web Pelita Bangsa` → **Ekstensi → Apps Script**.
2. Pasang kode `apps-script/`:
   - **Dengan clasp (dianjurkan):**
     ```bash
     npm i -g @google/clasp
     clasp login
     cd apps-script
     clasp clone <SCRIPT_ID>    # Script ID dari Project Settings; menimpa .clasp.json
     clasp push
     ```
     (Aktifkan dulu Apps Script API di https://script.google.com/home/usersettings)
   - **Tanpa clasp (paling mudah):** di editor Apps Script hanya ada **6 file**: `Code`, `Data`, `Admin`, `Setup`, `Utils`, dan `appsscript.json`.
     1. Klik **+ → Script**, ketik nama **tanpa** akhiran (`Data`, bukan `Data.gs` — editor menambah `.gs` sendiri), lalu tempel isi file dari folder `apps-script/`. Ulangi untuk kelimanya (`Code` sudah ada, cukup ganti isinya).
     2. **Project Settings (ikon gerigi) → centang "Show appsscript.json manifest file in editor"**, buka `appsscript.json`, ganti seluruh isinya dengan isi `apps-script/appsscript.json`.
     3. Simpan (Ctrl+S).

     ⚠️ `.clasp.json` dan `.claspignore` **jangan dibuat di editor Apps Script** (akan menjadi `.clasp.json.gs` dan membuat error). Dua file itu hanya dipakai alat `clasp` di komputer. Kalau terlanjur dibuat, hapus: titik tiga di samping nama file → **Delete**.
3. Muat ulang spreadsheet → menu **Pelita Bangsa → ⚙️ Siapkan Tab Database** (atau jalankan `setupSpreadsheet` dari editor) → izinkan akses (Sheets + baca Drive untuk album) → 12 tab terbentuk, termasuk tab `ADMIN` (akun login) dan `KUNJUNGAN` (penghitung pengunjung).
4. Menu **Pelita Bangsa → 🔑 Atur Password Admin** → masukkan password panel admin (min. 8 karakter).
5. Isi data (lihat Panduan Pengurus), lalu jalankan **`testData`** untuk mengecek.
6. **Deploy → New deployment → Web app** → Execute as **Me** → Who has access **Anyone** → Deploy.
7. Salin URL `/exec` dan **Deployment ID** ke tabel di atas.
8. Uji di jendela Incognito: `<URL>/exec?action=ping` harus menampilkan `{"ok":true,...}`.

### Langkah 2 — Website (GitHub Pages)

1. Isi `API_URL` di `assets/js/config.js` dengan URL dari langkah 1.
2. Ganti `https://<user>.github.io/<repo>/` pada tag `og:url`/`og:image` di `index.html`, `album.html`, `berita.html`.
3. Uji lokal:
   ```bash
   npx serve -l 8080 .      # buka http://localhost:8080
   ```
   Pakai `npx serve` (bukan `python -m http.server`): alamat halaman tanpa `.html` (`/album`, `/berita`) hanya jalan di server yang mendukungnya, sama seperti GitHub Pages.
   Tanpa API, di console browser: `localStorage.pb_api_dev='dev/mock-api.json'` (web publik) atau `localStorage.pb_admin_dev='1'` (admin, password `demo1234`).
4. Push ke GitHub (repo publik), lalu **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
5. Tunggu ±1 menit, buka `https://<user>.github.io/<repo>/` dan `.../admin/`.
6. Isi `WEB_URL` di `apps-script/Setup.gs`, `clasp push`, lalu update deployment (lihat di bawah).

### Update

| Yang berubah | Yang dilakukan |
|---|---|
| Isi data lewat panel admin | Otomatis — cache dihapus setiap kali menyimpan. |
| Isi data langsung di Sheets | Menu **Pelita Bangsa → Segarkan Web** (atau tombol *Segarkan Cache Publik* di admin). Tanpa itu muncul paling lambat ±10 menit. |
| Tampilan / JS / CSS | `git push`. Tunggu ±1 menit, lalu hard refresh (Ctrl+Shift+R). |
| Kode API (`apps-script/`) | `clasp push` lalu `clasp deploy -i <DEPLOYMENT_ID> -d "v1.x"` — **URL tetap sama**. |
| Password admin | Menu **Pelita Bangsa → Atur Password Admin**. |

⚠️ Jangan pakai *New deployment* untuk update API. URL-nya akan berubah dan website berhenti menampilkan data sampai `config.js` diubah.

---

## 📒 Panduan Pengurus (non-teknis)

### Dua cara mengelola isi

| Lewat **Google Sheets** | Lewat **Panel Admin** (`/admin/`) |
|---|---|
| Pengurus, Relawan (Profil & Agenda juga boleh) | Isi & foto beranda, Agenda (+ poster), Berita & artikel, Galeri (album folder Drive), Katalog buku, Donatur & logistik |
| Setelah edit: menu **Pelita Bangsa → Segarkan Web** | Langsung tersimpan ke Sheets dan web ikut berubah |

Panel admin dibuka dari tombol **Login Admin** di web. Password diminta ke pengurus yang memegang spreadsheet. Sesi berakhir otomatis setelah 6 jam.

### Aturan umum di Sheets

- **Baris 1 (judul kolom berwarna kuning) jangan diubah.** Boleh menambah kolom baru di paling kanan untuk catatan.
- Satu baris = satu data. Baris kosong diabaikan.
- Kolom **sembunyikan**: ☐ = muncul di web, ☑ = disembunyikan (tidak perlu dihapus).
- Tanggal ditulis **`tahun-bulan-tanggal`**, contoh `2026-08-17`.
- Tab **LOG** diisi otomatis (jejak perubahan), jangan diedit.

### Menambah foto

1. Kompres foto (maks ±1 MB). Foto pengurus/relawan sebaiknya persegi.
2. Upload ke folder Drive yang sesuai: `pengurus/`, `relawan/`, `galeri/<nama kegiatan>/`, `berita/`.
3. Klik kanan foto → **Bagikan → Salin link**.
4. Tempel link di kolom `foto_drive_id` (link lengkap atau ID saja, dua-duanya bisa).

> Hanya foto di dalam folder "Web Pelita Bangsa – Foto" yang bisa tampil, karena folder itu sudah diatur publik.

### Tab PROFIL

| kunci | contoh nilai |
|---|---|
| tagline | Nyalakan Lentera Literasi Generasi Muda di Pematang Siantar & Simalungun |
| deskripsi_singkat | Rumah belajar mandiri, perpustakaan komunitas, … (1–2 kalimat) |
| tahun_berdiri | 2021 |
| sejarah_judul | Dimulai dari Teras Rumah dan Tumpukan Buku |
| misi_1 | Literasi Baca–Tulis — Penyediaan buku bergambar dan bimbingan membaca |
| jam_operasional | Selasa – Minggu, 10:00 – 17:30 WIB |
| whatsapp | 6281234567890 *(awali 62, tanpa + dan tanpa 0 di depan)* |
| rekening | Bank Sumut: 102-xxx (a.n. …) *(boleh beberapa baris; kosong = tidak tampil)* |
| instagram | https://instagram.com/... *(kosong = ikon tidak tampil)* |
| stat_relawan | 35 |

Untuk `misi_1`–`misi_3`: tulis **judul**, lalu ` — ` (spasi, tanda pisah panjang, spasi), lalu deskripsi.

### Tab PENGURUS — `urutan | nama | jabatan | periode | foto_drive_id | deskripsi | sembunyikan`
`urutan` = posisi tampil (1 paling depan). Tanpa foto → muncul inisial nama.

### Tab RELAWAN — `nama | asal_instansi | bidang | sejak_tahun | foto_drive_id | sembunyikan`
Diurutkan otomatis sesuai abjad. Pilih `bidang` dari daftar pilihan.

### Tab AGENDA — `tahun | tanggal_mulai | tanggal_selesai | nama_kegiatan | lokasi | kategori | deskripsi | status | album_id | sembunyikan`
- `status` **boleh kosong** — dihitung otomatis dari tanggal. Isi manual hanya untuk `Ditunda` / `Dibatalkan`.
- `album_id` diisi jika kegiatan punya album di tab GALERI (tulisan harus sama persis) → tombol "Lihat foto".

### Tab GALERI — `album_id | judul_album | tanggal | foto_drive_id | keterangan | sampul | sembunyikan`
Satu baris = satu foto; `album_id` sama = satu album; `album_id` huruf kecil tanpa spasi (`lomba-17an-2026`). Centang `sampul` pada satu foto untuk foto depan album.

> Cara yang dianjurkan untuk album sekarang adalah **Panel Admin → Galeri** (di bawah). Tab GALERI tetap berfungsi untuk album lama.

### Panel Admin — Galeri (album dari folder Google Drive)
1. Buat folder di Google Drive, upload foto kegiatan ke dalamnya.
2. Klik kanan folder → **Bagikan** → akses umum **Siapa saja yang memiliki link**.
3. Di panel admin menu **Galeri**: isi judul, tempel link folder, pilih tanggal → **Simpan Album**.

Semua foto di folder tampil otomatis (urut nama file, foto pertama jadi sampul, maksimal 300 foto per album). Foto tetap di Drive — tidak ada yang disalin. Setelah menambah foto ke folder, klik tombol 🔄 pada album itu. Agar agenda punya tombol "Lihat foto", isi `album_id` di tab AGENDA dengan kode album (mis. `AL-261111-A7K`). Data tersimpan di tab `ALBUM` — `id | tanggal | judul | folder_drive | sembunyikan`.

### Panel Admin — Pengguna Admin (hanya admin utama)
Menu **Pengguna Admin** hanya muncul untuk admin utama. Di sana admin utama bisa menambah akun, mengganti nama/password, mengubah peran (Admin / Admin Utama), menonaktifkan, dan menghapus akun. Admin biasa tetap bisa mengelola isi website tetapi tidak bisa menyentuh akun. Password minimal 6 karakter dan tidak pernah ditampilkan; lupa password → edit akunnya lalu isi password baru. Akun sendiri tidak bisa dihapus/dinonaktifkan, dan harus selalu ada minimal satu admin utama aktif. Akun di baris pertama tab `ADMIN` otomatis menjadi admin utama.

### Tab ADMIN — `username | password | nama | nonaktif | peran` (akun login panel admin)
Satu baris = satu akun. Ketik username dan password biasa di selnya. Setelah akun itu berhasil login pertama kali, isi kolom `password` otomatis berubah menjadi kode acak `sha256:...` — itu normal dan lebih aman. Lupa password: hapus isi selnya, ketik password baru. Centang `nonaktif` untuk mematikan akun tanpa menghapusnya. Mengganti `username` berarti password harus diketik ulang.

### Jumlah pengunjung website
Lihat di **Panel Admin → Ringkasan → Pengunjung Website**: hari ini, kemarin, bulan ini, bulan lalu, grafik 14 hari, dan 6 bulan terakhir. Satu perangkat (HP/laptop) dihitung sekali per hari dan sekali per bulan; kunjungan ke panel admin tidak dihitung. Angkanya tersimpan otomatis di tab `KUNJUNGAN` — jangan diedit.

### Panel Admin — Agenda Kegiatan
Isi nama kegiatan, tanggal, kategori, lokasi → **Simpan Agenda**. Agenda yang ditulis langsung di tab AGENDA ikut muncul di daftar dan bisa diedit/dihapus dari panel. Kalau agenda sudah dibuat sebagai gambar (poster/kalender), upload gambarnya ke Google Drive, bagikan "Siapa saja yang memiliki link", lalu tempel link filenya di kolom **Gambar / Poster** — cukup dengan nama kegiatan saja pun bisa. Poster tampil di web dan bisa diklik untuk diperbesar.

### Panel Admin — Isi & Foto Beranda
Mengubah foto utama beranda, logo, tagline, sejarah, visi-misi, kontak, media sosial, dan angka statistik. Untuk foto: tempel link **file gambar** Google Drive (dibagikan "Siapa saja yang memiliki link"), lihat pratinjaunya, lalu **Simpan Perubahan**. Isinya sama dengan tab PROFIL, jadi boleh juga diedit di Sheets.

### Panel Admin — Berita
Isi judul, kategori, penulis, tanggal, foto (link Drive), ringkasan, dan isi. **Simpan Draf** = belum tampil; **Simpan & Publikasikan** = langsung tampil di web. Isi mendukung `**tebal**`, `*miring*`, baris `- ` untuk daftar, `> ` untuk kutipan.

### Panel Admin — Katalog Buku
Tambah buku lewat formulir; kode `id` dibuat otomatis. Tombol ✋ mencatat satu peminjaman, ↩ pengembalian. Kode rak diawali huruf zona (A = anak, B = budaya/komik, C = sains, D = referensi) agar panel bisa merangkum per zona.

### Panel Admin — Donatur & Relawan
Formulir "Partisipasi Cepat" di web masuk otomatis dengan status **Baru**. Alur: Baru → Dikonfirmasi → Dalam Pengiriman → Diterima → Terkatalog (tombol ✓ memajukan status). Tombol ✈ membuka WhatsApp dengan pesan siap kirim (konfirmasi / info resi / ucapan terima kasih). Tab **Pendaftar Relawan** menampilkan pengisi formulir yang memilih "Relawan Mengajar".

---

## 🛠️ Pemecahan Masalah

| Gejala | Penyebab & solusi |
|---|---|
| Perubahan di Sheets belum muncul | Klik **Segarkan Web**, lalu muat ulang halaman (sekali lagi jika masih lama). |
| Web menampilkan "Gagal memuat data" | Buka URL API `?action=ping` di Incognito. Minta login → deployment belum *Anyone*. Error → cek Apps Script → **Executions**. `API_URL belum diisi` → edit `config.js`. |
| Panel admin: "Password admin belum diatur" | Menu **Pelita Bangsa → Atur Password Admin** di Sheets. |
| Panel admin: "Terlalu banyak percobaan" | Tunggu 5 menit (5 kali password salah). |
| Panel admin: "Sesi berakhir" | Normal setelah 6 jam; login lagi. |
| Formulir donasi: "baru saja dikirim" | Satu nomor WA dibatasi 1 kiriman per 3 menit. |
| Foto tidak muncul | Foto belum di folder publik. Uji link fotonya di jendela Incognito. |
| Galeri: "Folder Drive tidak bisa dibuka" | Yang ditempel harus link **folder** yang bisa dibuka akun pemilik script. Setelah update API pertama kali, jalankan `testData` di editor Apps Script untuk menyetujui izin baca Drive, lalu `clasp deploy -i <DEPLOYMENT_ID>`. |
| Galeri: "Tab ALBUM belum dibuat" | Menu **Pelita Bangsa → Siapkan Tab Database**. |
| Alamat `/album` atau `/berita` 404 di lokal | Server lokal tidak mendukung URL tanpa `.html`; pakai `npx serve`. |
| Tanggal agenda / status salah | Tanggal bukan format `yyyy-mm-dd` teks. Set kolom ke *Format → Angka → Teks biasa*. |
| Tampilan baru belum terlihat setelah push | Tunggu build di tab **Actions** GitHub selesai, lalu Ctrl+Shift+R. |
| Halaman 404 di GitHub Pages | Pastikan Pages aktif dari `main` / root dan `index.html` ada di root. |
| Menu "Pelita Bangsa" tidak ada di Sheets | Muat ulang spreadsheet; jika tetap tidak ada, jalankan `onOpen` dari editor. |
| Website kosong setelah update API | Kemungkinan dibuat *New deployment* (URL berubah). Samakan `API_URL` di `config.js`. |

---

## 🗺️ Rencana Pengembangan (di luar v1.1)

- Jadwal piket / roster relawan mingguan
- Peminjaman per nama anak binaan
- Testimoni warga & relawan
- Pengiriman WhatsApp otomatis (saat ini lewat tautan `wa.me`)

---

## 🤖 Bekerja dengan Claude

- `CLAUDE.md` — aturan & konteks proyek (dibaca otomatis oleh Claude Code)
- `SKILLS.md` — resep teknis + kode acuan per bagian
- `AGENTS.md` — peran agent, fase kerja, kontrak data API, template prompt

---

## 📜 Riwayat Versi

| Versi | Tanggal | Perubahan |
|---|---|---|
| v1.0 | – | Rancangan awal: profil, pengurus, relawan, agenda tahunan, galeri |
| v1.1 | 10 Nov 2026 | Implementasi penuh web publik + panel admin (katalog buku, donatur & logistik, berita, analitik, konfigurasi, login), `doPost` bertoken, tab BUKU/BERITA/DONASI/LOG |
| v1.3 | 11 Nov 2026 | Panel admin: Agenda Kegiatan (+ poster gambar) dan Isi & Foto Beranda (tab PROFIL); kolom `id` & `poster_drive_id` di AGENDA |
| v1.2 | 11 Nov 2026 | URL tanpa `.html` (`/album`, `/berita`); album galeri dari link folder Google Drive lewat panel admin (`admin/#galeri`, tab ALBUM, scope `drive.readonly`) |
#   P e l i t a - B a n g s a  
 