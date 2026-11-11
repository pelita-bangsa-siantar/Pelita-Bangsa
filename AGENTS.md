# AGENTS.md — Peran Agent & Alur Kerja

File ini mengatur **siapa mengerjakan apa** dan **urutan kerja** saat proyek dikerjakan dengan Claude Code (atau AI agent lain yang membaca `AGENTS.md`). Aturan proyek ada di `CLAUDE.md`, resep teknis di `SKILLS.md`.

> Jika hanya satu agent yang bekerja, ia menjalankan semua peran berurutan sesuai fase — tetap patuhi batas tiap peran.

Arsitektur singkat: **GitHub Pages (frontend statis + panel admin) → fetch JSON (GET publik / POST bertoken) → Apps Script → Google Sheets**. Foto dari Google Drive.

---

## 1. Daftar Agent

### 🏗️ Agent 1 — `arsitek` (Planner)

- Memecah permintaan jadi tugas kecil; menjaga cakupan (`CLAUDE.md` §1: 5 fitur wajib + 6 fitur tambahan yang disetujui).
- Tanya dulu untuk permintaan di luar daftar itu (mis. jadwal piket, peminjaman per anak).
- Output: daftar tugas bernomor + file yang disentuh + skill `SKILLS.md` yang dipakai.
- **Tidak menulis kode.**

### 🗄️ Agent 2 — `backend-api`

- **File milik:** `apps-script/**` (`Code.gs`, `Data.gs`, `Admin.gs`, `Setup.gs`, `Utils.gs`, `appsscript.json`, `.clasp.json`).
- **Skill:** 1, 2, 3, 4, 5, 9 (server), 11 (server), 12 (server), 13 (bagian API), 16, 17.
- Wajib: `getDisplayValues()`, cache, `try/catch` di `doGet`/`doPost`, respons selalu `{ok, ...}`. `doGet` read-only; tulisan hanya lewat `doPost` bertoken ke tab di `CONFIG.ADMIN_WRITE` + formulir donasi publik yang dibatasi.
- Skema sheet berubah → update `CLAUDE.md` §4, `SCHEMA` di `Setup.gs`, `README.md`, dan kontrak §3 di file ini dalam commit yang sama.
- Setelah selesai: jalankan / minta Andre jalankan `testData()` + buka `?action=all`, laporkan hasilnya.

### 🎨 Agent 3 — `frontend-pages`

- **File milik:** `index.html`, `album.html`, `berita.html`, `404.html`, `admin/**`, `.nojekyll`, `assets/**`, `dev/**`.
- **Skill:** 6, 7, 8, 10, 11 (browser), 12 (browser), 14, 18.
- Sumber kebenaran visual: `design/stitch/*/screen.png` + `code.html` + `DESIGN.md`. **Jangan mengarang gaya baru.**
- Path relatif saja; `fetch` tanpa header; semua teks API lewat `PB.esc()`; render idempotent (bisa dipanggil 2x).
- Tidak menyentuh `apps-script/`. Butuh field baru → minta ke `backend-api` lewat perubahan kontrak §3.

### ✅ Agent 4 — `qa-reviewer`

- Menjalankan **SKILLS.md Skill 15** butir per butir: ✅/❌ + bukti singkat.
- Review kode: konten hardcode, `getValues()` untuk tanggal, `innerHTML` tanpa `esc()`, path absolut `/`, header di `fetch`, data dummy Stitch tertinggal, fitur di luar cakupan, rahasia/kredensial di repo, tab `DONASI`/`LOG` bocor lewat `?action=all`, aksi tulis tanpa `auth_()`.
- Boleh perbaiki bug kecil (≤ 10 baris). Bug besar → kembalikan ke pemilik file.
- Sebaiknya agent terpisah yang **tidak** ikut menulis kode.

### 📝 Agent 5 — `dokumentasi`

- Menjaga `README.md` akurat: URL web, URL API, Deployment ID, tab/kolom baru, riwayat versi.
- Bagian "Panduan Pengurus" ditulis dengan bahasa sederhana (non-teknis).

---

## 2. Alur Kerja (Fase)

```
Fase 0  Persiapan     arsitek          → rencana tugas
Fase 1  API           backend-api      → Skill 1–5: spreadsheet, data, doGet JSON, deploy API pertama
                                          ✔ selesai jika ?action=all mengembalikan data contoh
Fase 2  Kerangka web  frontend-pages   → Skill 6–8: repo, GitHub Pages, head, navbar, footer, hero,
                                          config.js, api.js, skeleton, error state
Fase 3  Fitur         backend + frontend bergantian, satu fitur per putaran:
                        3a Profil & Kontak → 3b Pengurus → 3c Relawan → 3d Agenda → 3e Galeri + album.html
                        3f Berita + berita.html → 3g Admin: login/doPost (Skill 16–17) → 3h Modul admin (Skill 18)
Fase 4  Pemeriksaan   qa-reviewer      → Skill 15, daftar bug
Fase 5  Rilis         backend-api      → Skill 13 (update deployment API)
                      frontend-pages   → Skill 13–14 (push, OG tags, domain opsional)
                      dokumentasi      → README final
```

Aturan:

- Fitur selesai jika memenuhi **Definition of Done** (`CLAUDE.md` §8) sebelum lanjut.
- Uji lokal dengan `npx serve -l 8080 .` (mendukung URL tanpa `.html` seperti GitHub Pages), lalu uji ulang di URL GitHub Pages.
- Commit per fitur: `feat(agenda): timeline per bulan + status otomatis`, `fix(api): ...`, `docs: ...`.

---

## 3. Kontrak Data API

`GET <API_URL>?action=all` →

```ts
{
  ok: true,
  cached: boolean,
  generatedAt: string,                            // = data.dibuat, dipakai cache browser
  data: {
    profil: {
      [kunci: string]: string,                    // semua kunci tab PROFIL (CLAUDE.md §4)
      logo: string, hero_foto: string,            // URL siap pakai atau ''
      misi: Array<{ judul: string, deskripsi: string }>
    },
    pengurus: Array<{ nama: string, jabatan: string, periode: string, deskripsi: string, foto: string }>,
    relawan:  Array<{ nama: string, asal_instansi: string, bidang: string, sejak_tahun: string, foto: string }>,
    agenda: {
      tahunAktif: string,                         // "2026"
      tahunList: string[],                        // terbaru dulu
      items: Array<{
        tahun: string, bulan: number,             // 1–12, 0 jika tanpa tanggal
        tanggal_mulai: string, tanggal_selesai: string,   // "yyyy-mm-dd" atau ''
        nama_kegiatan: string, lokasi: string, kategori: string, deskripsi: string,
        status: 'Akan Datang' | 'Berlangsung' | 'Selesai' | 'Ditunda' | 'Dibatalkan',
        album_id: string
      }>
    },
    galeri: Array<{
      id: string, judul: string, tanggal: string, sampul: string, jumlah: number,
      foto: Array<{ url: string, ket: string }>   // url ukuran =w600
    }>,
    berita: Array<{                               // hanya status Terbit & tidak disembunyikan, terbaru dulu
      id: string, tanggal: string, judul: string, kategori: string, penulis: string,
      lokasi: string, ringkasan: string, isi: string,   // isi = markdown ringkas, render dengan PB.md()
      foto: string                                // =w900 atau ''
    }>,
    dibuat: string                                // ISO
  }
}
```

Gagal → `{ ok: false, error: string }`. `profil.whatsapp` sudah dinormalisasi (62…). Tab `DONASI` dan `LOG` **tidak pernah** ada di sini.

- Frontend harus aman jika array kosong atau field `''`.
- Perubahan bentuk data = ubah kontrak ini **dan** naikkan `CACHE_KEY` di `assets/js/config.js` (sekarang `pb_data_v2`).

**POST** (`PB.post({action, token, ...})`, body JSON `text/plain`) — tabel lengkap di `CLAUDE.md` §5:

```ts
login   { password }                 → { ok, token, expiresIn, user:{nama,email} }
donasi  { data:{nama,whatsapp,jenis,asal?,kategori_buku?,jumlah?,catatan?,website:''} } → { ok, id }
list    { token, sheet }             → { ok, headers:string[], rows:Array<{_row:number, [kolom]:string}>, writable }
save    { token, sheet, data:{id?,...} } → { ok, row }        // upsert by id, BUKU/BERITA/DONASI saja
delete  { token, sheet, id }         → { ok }
stats   { token }                    → { ok, stats:{ koleksi:{total,judul,tersedia,dipinjam,kategori,zona},
                                          anak_terbina, relawan, berita:{total,terbit,draf,perBulan},
                                          donasi:{total,buku,baru,perBulan}, agenda, galeri, rows, bulan[], log[], cache } }
config  { token }                    → { ok, config:{ spreadsheet:{nama,id,url}, api:{url,cacheTtl,tokenTtl,timezone},
                                          user, tabs:[{nama,ada,baris,kolom,skema,deskripsi,bisaTulis}], log[], passwordDiatur } }
refresh { token }                    → { ok }
// sesi tidak valid → { ok:false, auth:false, error }
```

---

## 4. Template Prompt Siap Pakai

**Mulai proyek (Fase 0–1):**
```
Baca CLAUDE.md, SKILLS.md, AGENTS.md. Peran: arsitek lalu backend-api.
Buat rencana Fase 0, lalu kerjakan Fase 1 (Skill 1–5) di folder apps-script/.
Jangan sentuh frontend dulu. Akhiri dengan langkah yang harus saya jalankan manual
(setupSpreadsheet, testData, deploy) beserta urutannya.
```

**Kerangka web (Fase 2):**
```
Peran: frontend-pages. Kerjakan Fase 2 (Skill 6–8).
Acuan visual: design/stitch/beranda_profil_rumah_baca_pelita_bangsa/ (desktop) dan
beranda_profil_mobile_rumah_baca_pelita_bangsa/ (mobile). Buat index.html dengan navbar,
hero, footer, skeleton untuk semua section, config.js, api.js, ui.js. API_URL: <isi>.
```

**Satu fitur (Fase 3):**
```
Peran: frontend-pages (dan backend-api jika perlu field baru).
Kerjakan fitur <Agenda tahunan> sesuai CLAUDE.md §1 dan SKILLS.md Skill <11>.
Acuan visual: section <#berita> di Stitch (diganti jadi agenda). Responsif 375px.
Patuhi kontrak data AGENTS.md §3.
```

**QA (Fase 4):**
```
Peran: qa-reviewer. Jangan menambah fitur.
Jalankan SKILLS.md Skill 15 terhadap repo ini. Laporkan tabel ✅/❌ + bukti,
lalu daftar bug dari paling parah.
```

**Rilis (Fase 5):**
```
Peran: backend-api + frontend-pages + dokumentasi. Ikuti Skill 13 dan 14,
lalu perbarui README.md (URL web, URL API, versi, tanggal rilis, perubahan).
```

---

## 5. Batasan untuk Semua Agent

- Jangan mengedit `design/stitch/`.
- Jangan menambah framework/library/build tool tanpa persetujuan Andre.
- Repo publik: **tidak boleh** ada API key, token, password, atau data pribadi di repo. Password admin hanya di Script Properties.
- `doGet` tetap read-only. Tulisan hanya lewat `doPost` dengan `auth_()` (kecuali `login` dan `donasi` yang dibatasi), hanya ke tab `CONFIG.ADMIN_WRITE`.
- Jangan *New deployment* Apps Script untuk update — pakai update deployment yang sama.
- Jangan tampilkan nomor HP pribadi pengurus/relawan; hanya `PROFIL.whatsapp`. Nomor WA donatur hanya terlihat di panel admin setelah login.
- Ragu soal cakupan atau data → **tanya Andre** dan berhenti; jangan menebak.
