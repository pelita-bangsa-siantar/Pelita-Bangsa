# SKILLS.md — Resep Teknis Proyek Pelita Bangsa

Kumpulan "skill" (resep siap pakai) untuk proyek **GitHub Pages + Google Sheets (via Apps Script API)**. Setiap skill: **kapan dipakai → langkah → kode acuan → cara cek**. Konteks proyek ada di `CLAUDE.md`; pembagian peran di `AGENTS.md`.

**Backend (Apps Script)**
1. [Setup spreadsheet + Apps Script + clasp](#skill-1--setup-spreadsheet--apps-script--clasp)
2. [Membuat tab database otomatis](#skill-2--membuat-tab-database-otomatis)
3. [Membaca sheet → data bersih + cache](#skill-3--membaca-sheet--data-bersih--cache)
4. [Endpoint API JSON (doGet)](#skill-4--endpoint-api-json-doget)
5. [Menu "Segarkan Web" di Sheets](#skill-5--menu-segarkan-web-di-sheets)

**Frontend (GitHub Pages)**
6. [Setup repo & GitHub Pages](#skill-6--setup-repo--github-pages)
7. [Mengubah HTML Stitch menjadi halaman statis](#skill-7--mengubah-html-stitch-menjadi-halaman-statis)
8. [config.js + api.js (fetch + cache browser)](#skill-8--configjs--apijs-fetch--cache-browser)
9. [Foto dari Google Drive](#skill-9--foto-dari-google-drive)
10. [Render profil, pengurus, relawan](#skill-10--render-profil-pengurus-relawan)
11. [Agenda tahunan](#skill-11--agenda-tahunan)
12. [Galeri, album.html, lightbox](#skill-12--galeri-albumhtml-lightbox)

**Rilis**
13. [Deploy & update (API + web)](#skill-13--deploy--update-api--web)
14. [SEO, preview WhatsApp, domain sendiri](#skill-14--seo-preview-whatsapp-domain-sendiri)
15. [Checklist QA](#skill-15--checklist-qa)

**Panel admin (fitur tambahan v1.1)**
16. [doPost: login bertoken & formulir donasi publik](#skill-16--dopost-login-bertoken--formulir-donasi-publik)
17. [CRUD generik berdasarkan kolom id + log audit](#skill-17--crud-generik-berdasarkan-kolom-id--log-audit)
18. [Panel admin satu shell (hash routing) + PB.post](#skill-18--panel-admin-satu-shell-hash-routing--pbpost)

> Skill 2–4 di bawah adalah versi inti (5 tab wajib). Kode aktual di `apps-script/` sudah memuat tab BUKU/BERITA/DONASI/LOG, `buildBerita_`, dan `doPost` — lihat Skill 16–18 dan `CLAUDE.md` §4–5.

---

## Skill 1 — Setup spreadsheet + Apps Script + clasp

1. Buat Google Spreadsheet baru: `DB Web Pelita Bangsa`.
2. **Ekstensi → Apps Script** (script terikat ke spreadsheet). Beri nama proyek `API Web Pelita Bangsa`.
3. Salin **Script ID** dari *Project Settings*.
4. Aktifkan Apps Script API: https://script.google.com/home/usersettings → ON.
5. Di repo lokal:
   ```bash
   npm i -g @google/clasp
   clasp login
   cd pelita-bangsa-web/apps-script
   clasp clone <SCRIPT_ID>        # membuat .clasp.json di folder ini
   ```
6. `apps-script/appsscript.json`:
   ```json
   {
     "timeZone": "Asia/Jakarta",
     "runtimeVersion": "V8",
     "exceptionLogging": "STACKDRIVER",
     "webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" },
     "oauthScopes": [
       "https://www.googleapis.com/auth/spreadsheets.currentonly",
       "https://www.googleapis.com/auth/script.container.ui"
     ]
   }
   ```
7. Tambahkan `.claspignore` di `apps-script/` (opsional): `**/*.md`.

**Cek:** `clasp push` sukses; file `.gs` tampil di editor.

---

## Skill 2 — Membuat tab database otomatis

`apps-script/Setup.gs`:

```js
const SCHEMA = {
  PROFIL:   ['kunci', 'nilai'],
  PENGURUS: ['urutan', 'nama', 'jabatan', 'periode', 'foto_drive_id', 'deskripsi', 'sembunyikan'],
  RELAWAN:  ['nama', 'asal_instansi', 'bidang', 'sejak_tahun', 'foto_drive_id', 'sembunyikan'],
  AGENDA:   ['tahun', 'tanggal_mulai', 'tanggal_selesai', 'nama_kegiatan', 'lokasi', 'kategori', 'deskripsi', 'status', 'album_id', 'sembunyikan'],
  GALERI:   ['album_id', 'judul_album', 'tanggal', 'foto_drive_id', 'keterangan', 'sampul', 'sembunyikan']
};

const PROFIL_KEYS = [
  'nama_organisasi', 'tagline', 'tahun_berdiri', 'sejarah', 'visi',
  'misi_1', 'misi_2', 'misi_3', 'alamat', 'whatsapp', 'email',
  'instagram', 'facebook', 'youtube', 'tiktok', 'maps_embed',
  'logo_drive_id', 'hero_foto_drive_id',
  'stat_koleksi_buku', 'stat_anak_terbina', 'stat_relawan'
];

const DROPDOWN = {
  'RELAWAN.bidang':   ['Pengajar', 'Dongeng', 'Literasi Digital', 'Dokumentasi', 'Logistik', 'Lainnya'],
  'AGENDA.kategori':  ['Literasi Anak', 'Literasi Digital', 'Pemberdayaan Warga', 'Perayaan', 'Lainnya'],
  'AGENDA.status':    ['Akan Datang', 'Berlangsung', 'Selesai', 'Ditunda', 'Dibatalkan']
};

/** Jalankan manual dari editor. Aman diulang: tab yang sudah ada tidak ditimpa. */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActive();
  Object.entries(SCHEMA).forEach(([name, headers]) => {
    if (ss.getSheetByName(name)) return;
    const sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#FEF3C7');
    sh.setFrozenRows(1);

    headers.forEach((h, i) => {
      const col = sh.getRange(2, i + 1, 999, 1);
      if (/tanggal/.test(h)) col.setNumberFormat('@');               // Plain text
      if (['sembunyikan', 'sampul'].includes(h)) col.insertCheckboxes();
      const list = DROPDOWN[name + '.' + h];
      if (list) col.setDataValidation(
        SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build()
      );
    });

    if (name === 'PROFIL') {
      sh.getRange(2, 1, PROFIL_KEYS.length, 1).setValues(PROFIL_KEYS.map(k => [k]));
      sh.setColumnWidth(1, 200).setColumnWidth(2, 520);
    }
  });
  ['Sheet1', 'Lembar1'].forEach(n => {
    const s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  SpreadsheetApp.getUi().alert('Tab database siap. Silakan isi datanya.');
}
```

**Cek:** jalankan `setupSpreadsheet` → 5 tab dengan header kuning, checkbox, dropdown.

---

## Skill 3 — Membaca sheet → data bersih + cache

`apps-script/Data.gs`:

```js
function getSS_() {
  return CONFIG.SPREADSHEET_ID ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID) : SpreadsheetApp.getActive();
}

function readSheet_(name) {
  const sh = getSS_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getDisplayValues();
  const headers = rows.shift().map(h => String(h).trim().toLowerCase());
  return rows
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => Object.fromEntries(headers.map((h, i) => [h, String(r[i] ?? '').trim()])));
}

const isShown_ = r => !parseBool_(r.sembunyikan, false);   // tidak dicentang / kosong = tampil

function buildData_() {
  const S = CONFIG.SHEETS;
  const profilRaw = Object.fromEntries(readSheet_(S.PROFIL).filter(r => r.kunci).map(r => [r.kunci, r.nilai]));
  const profil = {
    ...profilRaw,
    logo: driveImageUrl(profilRaw.logo_drive_id, 256),
    hero_foto: driveImageUrl(profilRaw.hero_foto_drive_id, 1200),
    misi: ['misi_1', 'misi_2', 'misi_3'].map(k => profilRaw[k]).filter(Boolean).map(s => {
      const [judul, ...rest] = s.split(' — ');
      return { judul: judul.trim(), deskripsi: rest.join(' — ').trim() };
    })
  };

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
  const galeri = buildGaleri_(readSheet_(S.GALERI).filter(r => r.foto_drive_id && isShown_(r)));

  return { profil, pengurus, relawan, agenda, galeri, dibuat: new Date().toISOString() };
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
  cache.removeAll(['data_meta', ...Array.from({ length: n }, (_, i) => 'data_' + i)]);
}

function testData() { console.log(JSON.stringify(buildData_(), null, 2)); }
```

`buildAgenda_` → Skill 11, `buildGaleri_` → Skill 12, `driveImageUrl` → Skill 9.

`apps-script/Utils.gs` (bagian umum):

```js
function parseBool_(v, def) {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === '') return def;
  return ['true', 'ya', 'yes', '1', 'y'].includes(s);
}

function slugify_(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
```

**Cek:** `testData` → log JSON berisi `profil, pengurus, relawan, agenda, galeri`.

---

## Skill 4 — Endpoint API JSON (doGet)

`apps-script/Code.gs`:

```js
const CONFIG = {
  SPREADSHEET_ID: '',            // kosong = spreadsheet induk
  CACHE_TTL: 600,                // detik
  SHEETS: { PROFIL: 'PROFIL', PENGURUS: 'PENGURUS', RELAWAN: 'RELAWAN', AGENDA: 'AGENDA', GALERI: 'GALERI' },
  TIMEZONE: 'Asia/Jakarta'
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
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Mengapa tidak ada `doPost` / header CORS: Apps Script tidak bisa mengatur header respons. Request **GET sederhana** dari browser diarahkan (302) ke `script.googleusercontent.com` yang mengirim `Access-Control-Allow-Origin: *`, jadi `fetch(url)` biasa berhasil. Header kustom memicu preflight `OPTIONS` yang **tidak didukung** → gagal.

**Deploy API** (pertama kali): Deploy → New deployment → *Web app* → Execute as **Me** → Who has access **Anyone** → salin URL `.../exec`. Simpan **Deployment ID**-nya.

**Cek:** buka `<URL>/exec?action=ping` di jendela Incognito → tampil JSON `{"ok":true,...}`.

---

## Skill 5 — Menu "Segarkan Web" di Sheets

`apps-script/Setup.gs` (tambahan):

```js
const WEB_URL = 'https://<user>.github.io/<repo>/';   // isi setelah GitHub Pages aktif

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Pelita Bangsa')
    .addItem('🔄 Segarkan Web (hapus cache)', 'menuRefresh')
    .addItem('🌐 Buka Website', 'menuOpenWeb')
    .addSeparator()
    .addItem('⚙️ Siapkan Tab Database', 'setupSpreadsheet')
    .addToUi();
}

function menuRefresh() {
  clearCache();
  getAllData();   // panaskan cache
  SpreadsheetApp.getActive().toast('Data baru siap. Muat ulang halaman website untuk melihatnya.', 'Pelita Bangsa', 6);
}

function menuOpenWeb() {
  const html = HtmlService.createHtmlOutput(
    `<p style="font-family:sans-serif">Alamat website:<br><a href="${WEB_URL}" target="_blank">${WEB_URL}</a></p>`
  ).setWidth(420).setHeight(120);
  SpreadsheetApp.getUi().showModalDialog(html, 'Website Pelita Bangsa');
}
```

Catatan: pengunjung lama memegang cache `localStorage`; mereka melihat data lama sesaat lalu halaman otomatis memperbarui diri setelah fetch selesai (Skill 8).

---

## Skill 6 — Setup repo & GitHub Pages

1. Buat repo publik, misal `pelita-bangsa-web`.
2. Tambahkan file kosong `.nojekyll` di root.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)`** → Save.
4. URL: `https://<user>.github.io/pelita-bangsa-web/` (aktif ±1 menit setelah push).
5. Uji lokal **selalu lewat server**, bukan `file://`:
   ```bash
   python3 -m http.server 8080
   # buka http://localhost:8080
   ```

Kerangka `<head>` untuk `index.html` dan `album.html`:

```html
<!DOCTYPE html>
<html lang="id" class="scroll-smooth">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rumah Baca Pelita Bangsa — Pematang Siantar & Simalungun</title>
  <meta name="description" content="Komunitas literasi anak dan warga di Pematang Siantar – Simalungun. Profil, pengurus, relawan, agenda kegiatan, dan galeri.">
  <link rel="icon" href="assets/img/favicon.png">
  <!-- Open Graph: Skill 14 -->

  <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
  <script src="assets/js/tailwind-config.js"></script>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/custom.css">

  <script src="assets/js/config.js" defer></script>
  <script src="assets/js/ui.js" defer></script>
  <script src="assets/js/api.js" defer></script>
  <script src="assets/js/lightbox.js" defer></script>
  <script src="assets/js/app.js" defer></script>   <!-- album.html: album.js -->
</head>
```

Urutan `defer` dijamin sesuai urutan tag, jadi `config → ui → api → lightbox → app` aman.

---

## Skill 7 — Mengubah HTML Stitch menjadi halaman statis

1. Buka `design/stitch/beranda_profil_rumah_baca_pelita_bangsa/code.html`.
2. Pindahkan isi `<script id="tailwind-config">` ke `assets/js/tailwind-config.js` (isinya `tailwind.config = {...}`). `<style>` kustom → `assets/css/custom.css`.
3. Salin navbar, section, dan footer ke `index.html`. Ganti menu navbar menjadi: **Beranda, Profil, Pengurus, Relawan, Agenda, Galeri, Kontak**.
4. Ganti teks dummy dengan `data-bind`:
   ```html
   <h1 data-bind="profil.tagline">Rumah Baca Pelita Bangsa</h1>   <!-- teks fallback boleh untuk SEO -->
   <p data-bind="profil.sejarah" class="whitespace-pre-line"></p>
   ```
5. Untuk daftar berulang, sisakan **satu** kartu sebagai acuan, pindahkan markup-nya ke fungsi render di `app.js`, lalu ganti kontainernya dengan elemen kosong ber-`id` + skeleton:
   ```html
   <div id="list-pengurus" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
     <div class="skeleton h-64 rounded-lg"></div><div class="skeleton h-64 rounded-lg"></div>
   </div>
   ```
6. Samakan dengan versi mobile (`beranda_profil_mobile_...`) memakai prefix responsif.
7. Hapus `onclick` inline, form donasi, toast & script dummy Stitch.

Pemetaan section Stitch → fitur klien:

| Section Stitch | Dipakai untuk |
|---|---|
| Hero | Hero + 3 statistik `PROFIL.stat_*` + foto `hero_foto` |
| `#profil` ("Dimulai dari Teras Rumah", "Visi Besar & Tiga Pilar") | Sejarah, visi, `profil.misi[]` |
| `#program` (kartu program) | **Gaya kartu** untuk Pengurus |
| Testimoni (kartu dengan avatar inisial) | **Gaya kartu** untuk Relawan |
| `#berita` ("Kabar & Warta") | **Diganti** section Agenda Tahunan |
| `#galeri` | Galeri album |
| `#donasi-kontak` + footer | Kontak, peta, tombol WhatsApp (form dihapus) |

`custom.css` minimal:

```css
.skeleton { background: linear-gradient(90deg,#eef2ff 25%,#f8fafc 37%,#eef2ff 63%); background-size: 400% 100%; animation: sk 1.4s ease infinite; }
@keyframes sk { 0% { background-position: 100% 50% } 100% { background-position: 0 50% } }
[data-bind]:empty { display: none; }
```

---

## Skill 8 — config.js + api.js (fetch + cache browser)

`assets/js/config.js`:

```js
window.PB = window.PB || {};
PB.CONFIG = {
  API_URL: 'https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec',
  CACHE_KEY: 'pb_data_v1',     // naikkan versi jika bentuk data berubah
  TIMEOUT_MS: 15000
};
```

`assets/js/api.js` — *stale-while-revalidate*:

```js
window.PB = window.PB || {};

/**
 * Panggil onData(data, {fromCache}) — bisa terpanggil 2x: dari cache lalu dari API.
 * onError(err) hanya dipanggil jika API gagal DAN tidak ada cache.
 */
PB.loadData = function ({ onData, onError }) {
  const { API_URL, CACHE_KEY, TIMEOUT_MS } = PB.CONFIG;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (_) {}
  if (cached && cached.data) onData(cached.data, { fromCache: true });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  fetch(API_URL + '?action=all', { signal: ctrl.signal })   // JANGAN tambah header
    .then(r => r.json())
    .then(res => {
      if (!res.ok) throw new Error(res.error || 'API error');
      const changed = !cached || cached.generatedAt !== res.generatedAt;
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: res.data, generatedAt: res.generatedAt })); } catch (_) {}
      if (changed) onData(res.data, { fromCache: false });
    })
    .catch(err => {
      console.error('[PB] gagal memuat data:', err);
      if (!cached) onError(err);
    })
    .finally(() => clearTimeout(timer));
};
```

Pola di `app.js`:

```js
document.addEventListener('DOMContentLoaded', () => {
  PB.loadData({
    onData: data => PB.renderAll(data),          // harus idempotent (boleh dipanggil 2x)
    onError: () => PB.showGlobalError()          // banner + tombol "Coba lagi" → location.reload()
  });
});
```

---

## Skill 9 — Foto dari Google Drive

1. Folder Drive `Web Pelita Bangsa – Foto` dengan subfolder `pengurus/`, `relawan/`, `galeri/<kegiatan>/`.
2. Bagikan folder induk: **Anyone with the link → Viewer**.
3. Kolom `*_drive_id` boleh berisi **ID saja atau link lengkap**.

`apps-script/Utils.gs`:

```js
function driveImageUrl(idOrUrl, width) {
  const s = String(idOrUrl || '').trim();
  if (!s) return '';
  if (/^https?:\/\//.test(s) && !/drive\.google\.com/.test(s)) return s;   // URL gambar biasa
  const m = s.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
  const id = m ? m[1] : s;
  return 'https://lh3.googleusercontent.com/d/' + id + (width ? '=w' + width : '');
}
```

Di browser, ukuran besar untuk lightbox: `url.replace(/=w\d+$/, '=w1600')`. Tambahkan `referrerpolicy="no-referrer"` pada `<img>` Drive (mengurangi kasus gambar diblokir saat di-hotlink).

**Cek:** buka URL hasil helper di jendela Incognito → gambar tampil tanpa login.

---

## Skill 10 — Render profil, pengurus, relawan

`assets/js/ui.js`:

```js
window.PB = window.PB || {};
PB.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
PB.initials = n => PB.esc(String(n).split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase());
PB.AVATAR_FALLBACK = 'flex items-center justify-center bg-primary-fixed text-on-primary-fixed font-bold';
PB.avatar = (url, nama, cls) => url
  ? `<img src="${PB.esc(url)}" alt="${PB.esc(nama)}" loading="lazy" referrerpolicy="no-referrer"
          class="${cls} object-cover" data-cls="${cls}" onerror="PB.imgFallback(this)">`
  : `<div class="${cls} ${PB.AVATAR_FALLBACK}">${PB.initials(nama)}</div>`;
/** Foto gagal dimuat → ganti dengan avatar inisial (nama diambil dari alt). */
PB.imgFallback = img => {
  const d = document.createElement('div');
  d.className = `${img.dataset.cls} ${PB.AVATAR_FALLBACK}`;
  d.textContent = String(img.alt).split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  img.replaceWith(d);
};
PB.empty = msg => `<p class="col-span-full text-center text-on-surface-variant py-space-xl">${PB.esc(msg)}</p>`;
PB.bind = data => document.querySelectorAll('[data-bind]').forEach(el => {
  const v = el.dataset.bind.split('.').reduce((o, k) => (o || {})[k], data);
  if (v) el.textContent = v;
});
```

`assets/js/app.js` (potongan):

```js
PB.renderAll = function (D) {
  PB.bind(D);
  renderPengurus(D.pengurus || []);
  renderRelawan(D.relawan || []);
  PB.renderAgenda(D.agenda || { items: [], tahunList: [] });
  renderGaleri(D.galeri || []);
  renderKontak(D.profil || {});
};

function renderPengurus(list) {
  const el = document.getElementById('list-pengurus');
  el.innerHTML = list.map(p => `
    <article class="bg-white rounded-lg border border-slate-200 shadow-[0_4px_20px_-2px_rgba(30,41,59,0.05)]
                    p-space-md text-center transition hover:-translate-y-0.5">
      ${PB.avatar(p.foto, p.nama, 'w-28 h-28 rounded-full mx-auto mb-space-md')}
      <h3 class="font-headline-sm text-headline-sm text-on-surface">${PB.esc(p.nama)}</h3>
      <p class="font-label-lg text-label-lg text-primary">${PB.esc(p.jabatan)}</p>
      ${p.periode ? `<p class="font-body-sm text-body-sm text-on-surface-variant">Periode ${PB.esc(p.periode)}</p>` : ''}
    </article>`).join('') || PB.empty('Data pengurus belum diisi.');
}
```

Relawan:
- Chip filter per `bidang` di atas grid ("Semua" + bidang unik). Simpan filter aktif di variabel modul agar tidak reset saat render ulang.
- Kartu kecil: avatar 64px, nama, asal_instansi, chip bidang (warna chip ikut DESIGN.md: amber / sky / rose).
- Tampilkan 24 pertama + tombol "Lihat semua (N)".

Kontak: tombol WhatsApp `https://wa.me/${profil.whatsapp}`, ikon media sosial hanya untuk yang terisi, `<iframe>` peta dari `maps_embed` (`loading="lazy"`).

---

## Skill 11 — Agenda tahunan

Server (`Data.gs`):

```js
function buildAgenda_(rows) {
  const today = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  const items = rows.map(r => {
    const mulai = r.tanggal_mulai, selesai = r.tanggal_selesai || r.tanggal_mulai;
    let status = r.status;
    if (!status && mulai) status = today < mulai ? 'Akan Datang' : today > selesai ? 'Selesai' : 'Berlangsung';
    return {
      tahun: r.tahun || (mulai ? mulai.slice(0, 4) : ''),
      bulan: mulai ? Number(mulai.slice(5, 7)) : 0,
      tanggal_mulai: mulai, tanggal_selesai: r.tanggal_selesai,
      nama_kegiatan: r.nama_kegiatan, lokasi: r.lokasi, kategori: r.kategori || 'Lainnya',
      deskripsi: r.deskripsi, status: status || 'Akan Datang', album_id: r.album_id
    };
  }).sort((a, b) => (a.tanggal_mulai || '9999').localeCompare(b.tanggal_mulai || '9999'));

  const tahunList = [...new Set(items.map(i => i.tahun).filter(Boolean))].sort().reverse();
  const tahunIni = today.slice(0, 4);
  return { items, tahunList, tahunAktif: tahunList.includes(tahunIni) ? tahunIni : (tahunList[0] || tahunIni) };
}
```

> Status dihitung saat cache dibuat (maks. 10 menit), cukup akurat. Jika ingin presisi sampai jam, hitung ulang di browser dengan rumus yang sama.

Browser (`app.js`):

- Pill tahun (`tahunList`), default `tahunAktif`; simpan pilihan di variabel modul.
- Kartu **"Kegiatan Terdekat"** = item `Akan Datang` paling awal.
- Timeline per bulan (vertikal di mobile, grid 3 kolom di desktop); bulan kosong disembunyikan.
- Item: tanggal, nama, lokasi (ikon `location_on`), chip kategori, chip status
  (Akan Datang = sky, Berlangsung = amber, Selesai = slate, Ditunda/Dibatalkan = rose).
- `album_id` terisi → tautan **"Lihat foto"** ke `album?id=<album_id>` (tautan selalu tanpa `.html`).

```js
PB.BLN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
PB.BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
PB.fmtTanggal = (a, b) => {
  if (!a) return '';
  const [y1, m1, d1] = a.split('-').map(Number);
  if (!b || b === a) return `${d1} ${PB.BLN[m1 - 1]} ${y1}`;
  const [y2, m2, d2] = b.split('-').map(Number);
  return m1 === m2 && y1 === y2
    ? `${d1}–${d2} ${PB.BLN[m1 - 1]} ${y1}`
    : `${d1} ${PB.BLN[m1 - 1]} – ${d2} ${PB.BLN[m2 - 1]} ${y2}`;
};
```

---

## Skill 12 — Galeri, album.html, lightbox

Server:

```js
function buildGaleri_(rows) {
  const map = new Map();
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
    .map(a => ({ ...a, sampul: a.sampul || a.foto[0].url, jumlah: a.foto.length }))
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
}
```

Beranda `#galeri`: maks 6 album terbaru, gaya kartu foto Stitch + badge jumlah foto, link `album?id=<id>`. Tombol **"Semua Album"** → `album`. Tautan antarhalaman ditulis tanpa `.html` (GitHub Pages dan `npx serve` melayani `/album` dari `album.html`).

Sumber album: tab `ALBUM` (satu baris = satu folder Drive, dikelola di `admin/#galeri`; `folderFotoIds_()` membaca gambar di folder lewat `DriveApp`, cache `fld_<id>` 6 jam) digabung dengan tab `GALERI` lama (satu baris = satu foto).

`album.html` + `assets/js/album.js`:

```js
document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('id');
  PB.loadData({
    onData: D => {
      PB.bind(D);
      const albums = D.galeri || [];
      if (!id) return renderDaftarAlbum(albums);             // semua album
      const a = albums.find(x => x.id === id);
      if (!a) return renderTidakDitemukan();
      document.title = `${a.judul} — Galeri Pelita Bangsa`;
      renderAlbum(a);   // grid masonry: columns-2 md:columns-3 gap-4, foto break-inside-avoid mb-4
    },
    onError: () => PB.showGlobalError()
  });
});
// klik foto ke-i → PB.openLightbox(a.foto, i)
```

`assets/js/lightbox.js`:

```js
window.PB = window.PB || {};
PB.openLightbox = function (list, idx) {
  let i = idx;
  const box = document.createElement('div');
  box.className = 'fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4';
  box.innerHTML = `
    <button data-x class="absolute top-4 right-4 text-white text-4xl w-11 h-11" aria-label="Tutup">&times;</button>
    <button data-p class="absolute left-2 md:left-6 text-white text-5xl w-11 h-11" aria-label="Sebelumnya">&#8249;</button>
    <figure class="max-w-5xl w-full text-center">
      <img class="max-h-[80vh] mx-auto rounded-lg" alt="" referrerpolicy="no-referrer">
      <figcaption class="text-white/80 mt-3 text-sm"></figcaption>
    </figure>
    <button data-n class="absolute right-2 md:right-6 text-white text-5xl w-11 h-11" aria-label="Berikutnya">&#8250;</button>`;
  const img = box.querySelector('img'), cap = box.querySelector('figcaption');
  const show = () => { img.src = list[i].url.replace(/=w\d+$/, '=w1600'); img.alt = list[i].ket || ''; cap.textContent = list[i].ket || `${i + 1} / ${list.length}`; };
  const close = () => { box.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; };
  const go = d => { i = (i + d + list.length) % list.length; show(); };
  const key = e => e.key === 'Escape' ? close() : e.key === 'ArrowLeft' ? go(-1) : e.key === 'ArrowRight' ? go(1) : 0;
  box.addEventListener('click', e => {
    const t = e.target.closest('button') || e.target;
    if (t === box || t.hasAttribute('data-x')) close();
    else if (t.hasAttribute('data-p')) go(-1);
    else if (t.hasAttribute('data-n')) go(1);
  });
  let x0 = null;
  box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    x0 = null;
  });
  document.addEventListener('keydown', key);
  document.body.style.overflow = 'hidden';
  document.body.appendChild(box);
  show();
};
```

---

## Skill 13 — Deploy & update (API + web)

**API (Apps Script) — update tanpa ganti URL:**

```bash
cd apps-script
clasp push
clasp deployments                                  # catat ID deployment web app (bukan @HEAD)
clasp deploy -i <DEPLOYMENT_ID> -d "v1.1 – keterangan"
```

Atau UI: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
⚠️ Jangan *New deployment* — URL API berubah, `config.js` harus diubah, pengunjung lama gagal sampai cache browser diganti.

Perubahan di Sheets **tidak perlu deploy ulang** — cukup menu "Segarkan Web".

**Web (GitHub Pages):**

```bash
git add . && git commit -m "feat(agenda): timeline per bulan" && git push
```

Tunggu ±1 menit (tab **Actions** di GitHub menunjukkan status `pages build and deployment`). Jika browser masih menampilkan versi lama: hard refresh (Ctrl+Shift+R). Untuk memaksa file JS/CSS baru, tambahkan versi di tag: `assets/js/app.js?v=1.1`.

Jika bentuk data API berubah → naikkan `CACHE_KEY` di `config.js` (`pb_data_v2`).

---

## Skill 14 — SEO, preview WhatsApp, domain sendiri

Crawler & preview link WhatsApp **tidak menjalankan JavaScript**, jadi tag ini ditulis statis di `index.html`:

```html
<meta property="og:type" content="website">
<meta property="og:title" content="Rumah Baca Pelita Bangsa">
<meta property="og:description" content="Komunitas literasi anak & warga di Pematang Siantar – Simalungun.">
<meta property="og:image" content="https://<user>.github.io/pelita-bangsa-web/assets/img/og-image.jpg">
<meta property="og:url" content="https://<user>.github.io/pelita-bangsa-web/">
<meta name="twitter:card" content="summary_large_image">
```

`og:image` harus URL absolut, ukuran 1200×630, < 300 KB.

**Domain sendiri (opsional):**
1. Repo → Settings → Pages → Custom domain → isi `rumahbacapelitabangsa.id` (GitHub membuat file `CNAME`).
2. Di DNS: `A` record ke `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; atau `CNAME www → <user>.github.io`.
3. Centang **Enforce HTTPS** setelah sertifikat aktif.
4. Perbarui `og:url`, `og:image`, dan `WEB_URL` di `Setup.gs`.

---

## Skill 15 — Checklist QA

- [ ] `<API_URL>?action=ping` dan `?action=all` → `ok: true` di Incognito.
- [ ] `testData()` tanpa error; jumlah data sesuai sheet.
- [ ] Desktop 1280px & mobile 375px sesuai `screen.png` Stitch.
- [ ] Bekerja di URL GitHub Pages (subfolder `/<repo>/`) — tidak ada 404 di tab Network.
- [ ] Navbar menggulir ke section yang benar; menu hamburger mobile buka/tutup.
- [ ] Kunjungan pertama: skeleton → data. Kunjungan kedua: data langsung tampil.
- [ ] Ubah `API_URL` jadi salah + hapus localStorage → banner error + tombol "Coba lagi".
- [ ] Tab `RELAWAN` dikosongkan → pesan kosong, halaman tidak rusak.
- [ ] Foto kosong → avatar inisial; foto rusak → fallback.
- [ ] Agenda: kemarin = Selesai, hari ini = Berlangsung, besok = Akan Datang; pindah tahun bekerja.
- [ ] `album.html?id=<id>` tampil; `album.html?id=salah` → pesan tidak ditemukan; `album.html` → daftar album.
- [ ] Lightbox: tombol, keyboard, swipe, Esc.
- [ ] Teks `<b>tes</b>` di sheet tampil sebagai teks (escape bekerja).
- [ ] Link dibagikan di WhatsApp → preview judul + gambar muncul.
- [ ] Console bersih (kecuali warning Tailwind CDN); Apps Script Executions tanpa error.
- [ ] `berita.html` daftar + `?id=`; berita Draf tidak muncul di web publik.
- [ ] Formulir donasi di beranda → baris baru di tab DONASI status Baru; kirim 2× dalam 3 menit → ditolak ramah.
- [ ] `admin/`: password salah 5× → terkunci 5 menit; login benar → 5 modul tampil; simpan buku/berita/donasi → baris di Sheets + tab LOG + cache publik dihapus.
- [ ] `?action=all` **tidak** memuat tab DONASI/LOG maupun nomor WA donatur.
- [ ] Panel admin di 375px: chip nav + bottom nav, tabel bisa digulir horizontal.

---

## Skill 16 — doPost: login bertoken & formulir donasi publik

**Kapan:** semua aksi tulis dari browser. Apps Script tidak bisa mengatur header respons, jadi POST harus "simple request": body string (Content-Type default `text/plain`), **tanpa** header kustom.

`apps-script/Code.gs`:

```js
function doPost(e) {
  let out;
  try { out = handleAdmin_(JSON.parse((e && e.postData && e.postData.contents) || '{}')); }
  catch (err) { console.error(err.stack || err); out = { ok: false, error: 'Permintaan tidak valid' }; }
  return json_(out);
}
```

`apps-script/Admin.gs` — password hanya di Script Properties (diatur dari menu Sheets `menuSetPassword`), token di CacheService (TTL 21600 s = maksimum), sesi bergeser (sliding):

```js
function login_(password) {
  const cache = CacheService.getScriptCache();
  if (Number(cache.get('login_fail') || 0) >= 5) return { ok: false, error: 'Terlalu banyak percobaan. Coba lagi 5 menit.' };
  const stored = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD_HASH');
  if (!stored) return { ok: false, error: 'Password admin belum diatur.' };
  if (sha256_(String(password || '')) !== stored) { cache.put('login_fail', String(fails + 1), 300); return { ok: false, error: 'Password salah.' }; }
  const token = Utilities.getUuid().replace(/-/g, '');
  cache.put('tok_' + token, '1', CONFIG.TOKEN_TTL);
  return { ok: true, token, expiresIn: CONFIG.TOKEN_TTL };
}
function auth_(token) {
  if (!/^[a-f0-9]{32}$/.test(String(token || ''))) return false;
  const cache = CacheService.getScriptCache();
  if (cache.get('tok_' + token) !== '1') return false;
  cache.put('tok_' + token, '1', CONFIG.TOKEN_TTL);
  return true;
}
```

Formulir donasi publik (`publicDonasi_`): honeypot `website` harus kosong, validasi nama/WA, 1 kiriman per 3 menit per nomor (kunci cache = hash nomor), baris baru selalu `status: 'Baru', sumber: 'web'`.

**Cek:** `curl -X POST -d '{"action":"login","password":"salah"}' <URL>/exec` → `{"ok":false,...}`; dari browser `PB.post({action:'login',password})` tanpa error CORS.

---

## Skill 17 — CRUD generik berdasarkan kolom id + log audit

Satu set fungsi melayani semua tab yang boleh ditulis (`CONFIG.ADMIN_WRITE = ['BUKU','BERITA','DONASI','ALBUM','AGENDA']`; `PROFIL` lewat `saveProfil_`/aksi `profil_save`). Khusus `ALBUM`, `checkAlbum_()` memvalidasi link folder Drive sebelum menulis dan respons `save` membawa `foto` (jumlah) + `publik` (status berbagi). Pemetaan **berdasarkan nama header**, bukan indeks kolom, jadi pengurus boleh menambah kolom di kanan.

```js
function saveRow_(name, data) {                       // upsert
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const { key, sh } = sheetFor_(name, true);        // lempar error jika tab tak boleh ditulis
    const headers = headersOf_(sh), clean = sanitizeRow_(key, data);   // whitelist kolom SCHEMA, clip, validasi
    let row = clean.id ? findRowById_(sh, headers, clean.id) : 0;
    if (!clean.id) clean.id = newId_(ID_PREFIX[key]);  // BK-251110-A7K
    const values = headers.map(h => h === 'sembunyikan' ? parseBool_(clean[h], false) : (clean[h] != null ? clean[h] : ''));
    if (row) {                                         // kolom yang tidak dikirim dipertahankan
      const old = sh.getRange(row, 1, 1, headers.length).getDisplayValues()[0];
      headers.forEach((h, i) => { if (!(h in clean)) values[i] = h === 'sembunyikan' ? parseBool_(old[i], false) : old[i]; });
      sh.getRange(row, 1, 1, headers.length).setValues([values]);
    } else { sh.appendRow(values); row = sh.getLastRow(); }
    clearCache(); logRow_(row ? 'ubah' : 'tambah', key, clean.id, clean.judul || clean.nama || '');
    return { ok: true, row: Object.fromEntries(headers.map((h, i) => [h, String(values[i])])) };
  } finally { lock.releaseLock(); }
}
```

Aturan: setiap tulisan → `clearCache()` (web publik langsung segar) + `logRow_()` ke tab LOG (dipangkas di 1000 baris). `stats` dan `config` dihitung ulang setiap panggilan (tanpa cache) karena hanya dipakai admin.

**Cek:** `save` tanpa `id` → baris baru dengan id otomatis; `save` dengan `id` + 1 kolom → kolom lain tidak hilang; `delete` id salah → `{ok:false}`; tab PENGURUS → ditolak.

---

## Skill 18 — Panel admin satu shell (hash routing) + PB.post

`admin/index.html` berisi login + `<section data-view="...">` untuk 8 modul; `assets/js/admin.js` memilih view dari `location.hash` (`#ringkasan #berita #galeri #agenda #konten #buku #donatur #konfigurasi`). Satu header/sidebar, satu bottom-nav mobile, satu file JS — lebih ringan daripada 5 halaman.

```js
// assets/js/api.js
PB.post = payload => fetch(PB.CONFIG.API_URL, { method: 'POST', body: JSON.stringify(payload) }).then(r => r.json());

// assets/js/admin.js (pola)
const post = p => (PB.devPost || PB.post)(Object.assign({ token: S.token }, p)).then(res => {
  if (res && res.auth === false) { forceLogout('Sesi berakhir.'); throw new Error(res.error); }
  return res;
});
function route() {
  const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'ringkasan';
  PB.qa('[data-view]').forEach(s => s.classList.toggle('hidden', s.dataset.view !== v));
  ({ ringkasan: loadRingkasan, berita: () => ensureList('BERITA').then(renderBerita), /* ... */ })[v]();
}
window.addEventListener('hashchange', route);
```

Pola per modul: `ensureList(sheet)` memuat sekali → render dari `S.lists[sheet].rows` dengan filter/paginasi di browser → aksi tulis memanggil `post({action:'save'|'delete'})` lalu `upsertLocal`/`removeLocal` + render ulang (tanpa fetch ulang) + `PB.toast`. Token hanya di `sessionStorage`. Grafik (donut, garis, sparkline) = SVG inline dari data `stats`, tanpa pustaka.

Mode demo lokal: `localStorage.pb_admin_dev='1'` memuat `dev/mock-admin.js` yang menyediakan `PB.devPost` (password `demo1234`), sehingga seluruh UI bisa diuji tanpa Apps Script.

**Cek:** `admin/#buku` langsung membuka modul buku; tombol pinjam mengubah angka tanpa reload; setelah 6 jam / token dihapus → kembali ke login dengan pesan.
