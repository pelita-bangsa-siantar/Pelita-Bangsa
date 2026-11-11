/* Helper UI bersama (namespace window.PB). Semua teks dari API WAJIB lewat PB.esc(). */
window.PB = window.PB || {};

PB.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
PB.q = (sel, root) => (root || document).querySelector(sel);
PB.qa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
PB.num = n => new Intl.NumberFormat('id-ID').format(Number(n) || 0);
PB.initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

PB.AVATAR_FALLBACK = 'flex items-center justify-center bg-primary-fixed text-primary font-bold';
PB.avatar = (url, nama, cls) => url
  ? `<img src="${PB.esc(url)}" alt="${PB.esc(nama)}" loading="lazy" referrerpolicy="no-referrer" class="${cls} object-cover" data-cls="${cls}" onerror="PB.imgFallback(this)">`
  : `<div class="${cls} ${PB.AVATAR_FALLBACK}" aria-label="${PB.esc(nama)}">${PB.esc(PB.initials(nama))}</div>`;
/** Foto gagal dimuat → avatar inisial (nama diambil dari alt). */
PB.imgFallback = img => {
  const d = document.createElement('div');
  d.className = `${img.dataset.cls || ''} ${PB.AVATAR_FALLBACK}`;
  d.textContent = PB.initials(img.alt);
  img.replaceWith(d);
};
/** Gambar umum dengan placeholder saat gagal. */
PB.BASE = PB.BASE || '';   // '../' bila halaman ada di subfolder (admin/)
PB.PLACEHOLDER = () => PB.BASE + 'assets/img/placeholder.svg';
PB.img = (url, alt, cls) => `<img src="${PB.esc(url || PB.PLACEHOLDER())}" alt="${PB.esc(alt)}" loading="lazy" referrerpolicy="no-referrer" class="${cls}" onerror="this.onerror=null;this.src='${PB.PLACEHOLDER()}'">`;
PB.big = url => String(url || '').replace(/=w\d+$/, '=w1600');

PB.empty = (msg, cls) => `<p class="${cls || 'col-span-full'} text-center font-body-md text-body-md text-on-surface-variant py-space-xl">${PB.esc(msg)}</p>`;

/** data-bind="profil.tagline" → textContent; data-href="profil.instagram" → href (elemen disembunyikan jika kosong);
 *  data-src="profil.hero_foto" → src; data-show="profil.rekening" → tampil hanya jika terisi. */
PB.get = (obj, path) => String(path || '').split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
PB.bind = data => {
  PB.qa('[data-bind]').forEach(el => { const v = PB.get(data, el.dataset.bind); if (v != null && v !== '') el.textContent = v; });
  PB.qa('[data-src]').forEach(el => { const v = PB.get(data, el.dataset.src); if (v) el.src = v; });
  PB.qa('[data-href]').forEach(el => {
    const v = PB.get(data, el.dataset.href);
    const tpl = el.dataset.hrefTpl;             // mis. "https://wa.me/{v}" atau "mailto:{v}"
    if (v) { el.href = tpl ? tpl.replace('{v}', encodeURIComponent(v)) : v; el.classList.remove('hidden'); }
    else el.classList.add('hidden');
  });
  PB.qa('[data-show]').forEach(el => el.classList.toggle('hidden', !PB.get(data, el.dataset.show)));
};

/* Tanggal */
PB.BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
PB.BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
PB.fmtTgl = (iso, panjang) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return iso || '';
  return `${Number(m[3])} ${(panjang ? PB.BULAN : PB.BLN)[Number(m[2]) - 1]} ${m[1]}`;
};
PB.fmtTanggal = (a, b) => {
  if (!a) return '';
  const [y1, m1, d1] = a.split('-').map(Number);
  if (!b || b === a) return `${d1} ${PB.BLN[m1 - 1]} ${y1}`;
  const [y2, m2, d2] = b.split('-').map(Number);
  return m1 === m2 && y1 === y2 ? `${d1}–${d2} ${PB.BLN[m1 - 1]} ${y1}` : `${d1} ${PB.BLN[m1 - 1]} – ${d2} ${PB.BLN[m2 - 1]} ${y2}`;
};
PB.today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
PB.lalu = iso => {   // "8 mnt lalu" dari "yyyy-MM-dd HH:mm:ss"
  const t = Date.parse(String(iso || '').replace(' ', 'T'));
  if (isNaN(t)) return iso || '';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
};

/* Chip warna (DESIGN.md: amber / sky / rose / netral) */
PB.CHIP = {
  amber: 'bg-primary-fixed text-primary', sky: 'bg-secondary-fixed text-secondary', rose: 'bg-tertiary-fixed text-tertiary',
  netral: 'bg-surface-container-highest text-on-surface', hijau: 'bg-emerald-100 text-emerald-800', kuning: 'bg-amber-100 text-amber-800'
};
PB.CHIP_MAP = {
  // relawan.bidang
  'Pengajar': 'amber', 'Dongeng': 'rose', 'Literasi Digital': 'sky', 'Dokumentasi': 'netral', 'Logistik': 'sky',
  // agenda.kategori
  'Literasi Anak': 'amber', 'Pemberdayaan Warga': 'rose', 'Perayaan': 'rose',
  // agenda.status
  'Akan Datang': 'sky', 'Berlangsung': 'amber', 'Selesai': 'netral', 'Ditunda': 'rose', 'Dibatalkan': 'rose',
  // berita.kategori
  'Kabar Komunitas': 'amber', 'Kegiatan': 'rose', 'Laporan Donasi': 'sky', 'Opini Edukasi': 'amber', 'Pojok Baca': 'netral',
  // buku.kategori
  'Fabel & Dongeng': 'amber', 'Sains & Alam': 'sky', 'Komik Edukasi': 'amber', 'Cerita Rakyat': 'rose', 'Ensiklopedi & Kamus': 'netral', 'Pelajaran': 'sky', 'Sastra Remaja': 'rose',
  // donasi.status / berita.status
  'Baru': 'kuning', 'Dikonfirmasi': 'sky', 'Dalam Pengiriman': 'amber', 'Diterima': 'hijau', 'Terkatalog': 'hijau', 'Terbit': 'hijau', 'Draf': 'kuning'
};
PB.chipCls = label => PB.CHIP[PB.CHIP_MAP[label] || ['amber', 'sky', 'rose'][String(label || '').length % 3]];
PB.chip = (label, extra) => label ? `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full font-label-sm text-label-sm ${PB.chipCls(label)} ${extra || ''}">${PB.esc(label)}</span>` : '';

/* Markdown ringkas (**tebal**, *miring*, "- " daftar, "> " kutipan, paragraf per baris kosong). Output sudah di-escape. */
PB.md = text => {
  const lines = PB.esc(text).split(/\r?\n/);
  const out = []; let para = [], list = [];
  const flushP = () => { if (para.length) { out.push(`<p>${para.join('<br>')}</p>`); para = []; } };
  const flushL = () => { if (list.length) { out.push(`<ul>${list.map(l => `<li>${l}</li>`).join('')}</ul>`); list = []; } };
  const inl = s => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|\W)\*(?!\s)(.+?)\*(?=\W|$)/g, '$1<em>$2</em>');
  lines.forEach(l => {
    const t = l.trim();
    if (!t) { flushP(); flushL(); return; }
    if (/^- /.test(t)) { flushP(); list.push(inl(t.slice(2))); return; }
    if (/^&gt; /.test(t)) { flushP(); flushL(); out.push(`<blockquote>${inl(t.slice(5))}</blockquote>`); return; }
    flushL(); para.push(inl(t));
  });
  flushP(); flushL();
  return out.join('');
};

/* Kartu bersama (beranda, berita.html, album.html) — gaya kartu Stitch */
PB.beritaCard = (b, h) => `
  <article class="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
    <a href="berita?id=${encodeURIComponent(b.id)}" class="relative ${h || 'h-48'} w-full overflow-hidden block bg-surface-container">
      ${PB.img(b.foto, b.judul, 'w-full h-full object-cover transition-transform hover:scale-105 duration-300')}
      <div class="absolute top-3 left-3 flex items-center gap-1">${PB.chip(b.kategori, 'shadow bg-surface-container-lowest/90 backdrop-blur-sm')}</div>
    </a>
    <div class="p-space-md flex flex-col flex-grow justify-between gap-space-sm">
      <div class="flex flex-col gap-space-xs">
        <div class="flex items-center flex-wrap gap-space-xs text-on-surface-variant font-label-sm text-label-sm"><span class="material-symbols-outlined text-xs">calendar_today</span><span>${PB.esc(PB.fmtTgl(b.tanggal, true))}</span>${b.lokasi ? `<span>•</span><span class="material-symbols-outlined text-xs">location_on</span><span>${PB.esc(b.lokasi)}</span>` : ''}</div>
        <h3 class="font-headline-sm text-headline-sm text-on-surface hover:text-primary transition-colors"><a href="berita?id=${encodeURIComponent(b.id)}">${PB.esc(b.judul)}</a></h3>
        <p class="font-body-sm text-body-sm text-on-surface-variant justify clamp-3">${PB.esc(b.ringkasan || String(b.isi || '').slice(0, 220))}</p>
      </div>
      <div class="pt-space-xs border-t border-surface-container-high flex items-center justify-between">
        <a class="inline-flex items-center gap-space-xs py-2 text-primary font-label-lg text-label-lg hover:underline" href="berita?id=${encodeURIComponent(b.id)}"><span>Baca Selengkapnya</span><span class="material-symbols-outlined text-sm">arrow_forward</span></a>
        ${b.penulis ? `<span class="font-label-sm text-label-sm text-on-surface-variant truncate max-w-[45%]">${PB.esc(b.penulis)}</span>` : ''}
      </div>
    </div>
  </article>`;
PB.albumCard = a => `
  <a href="album?id=${encodeURIComponent(a.id)}" class="rounded-xl overflow-hidden shadow-sm relative group h-64 block bg-surface-container">
    ${PB.img(a.sampul, a.judul, 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300')}
    <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-space-md text-white">
      <div class="min-w-0"><span class="font-label-lg text-label-lg block truncate">${PB.esc(a.judul)}</span><span class="font-label-sm text-label-sm text-white/80">${PB.esc(PB.fmtTgl(a.tanggal))}</span></div>
    </div>
    <span class="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white font-label-sm text-label-sm inline-flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">photo_library</span>${PB.num(a.jumlah)} foto</span>
  </a>`;

/* WhatsApp */
PB.wa = (nomor, teks) => `https://wa.me/${String(nomor || '').replace(/[^0-9]/g, '')}${teks ? '?text=' + encodeURIComponent(teks) : ''}`;
PB.waTampil = n => { const d = String(n || '').replace(/[^0-9]/g, ''); return d ? '+' + d.replace(/^(\d{2})(\d{3})(\d{4})(\d+)$/, '$1 $2-$3-$4') : ''; };

/* Toast kecil (gaya Stitch: inverse-surface) */
PB.toast = (msg, ikon) => {
  let box = PB.q('#pb-toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'pb-toast';
    box.className = 'fixed bottom-20 xl:bottom-6 right-4 xl:right-6 z-[90] transition-all duration-300 translate-y-6 opacity-0 pointer-events-none';
    document.body.appendChild(box);
  }
  box.innerHTML = `<div class="bg-inverse-surface text-inverse-on-surface px-space-md py-3 rounded-lg shadow-xl flex items-center gap-space-sm max-w-sm">
    <span class="material-symbols-outlined text-secondary-container">${PB.esc(ikon || 'check_circle')}</span><span class="font-label-md text-label-md">${PB.esc(msg)}</span></div>`;
  box.classList.remove('translate-y-6', 'opacity-0');
  clearTimeout(PB._toastT);
  PB._toastT = setTimeout(() => box.classList.add('translate-y-6', 'opacity-0'), 3500);
};

/** Banner error global + tombol "Coba lagi" (dipakai saat API gagal dan tidak ada cache). */
PB.showGlobalError = msg => {
  if (PB.q('#pb-error')) return;
  const d = document.createElement('div');
  d.id = 'pb-error';
  d.className = 'fixed top-16 xl:top-20 inset-x-0 z-[80] px-gutter';
  d.innerHTML = `<div class="max-w-[1200px] mx-auto mt-2 p-space-md rounded-xl bg-error-container text-on-error-container shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm">
      <div class="flex items-start gap-space-sm"><span class="material-symbols-outlined">cloud_off</span>
        <div><p class="font-label-lg text-label-lg">Gagal memuat data dari server.</p><p class="font-body-sm text-body-sm">${PB.esc(msg || 'Periksa koneksi internet Anda, lalu coba lagi.')}</p></div></div>
      <button class="px-space-md py-2 rounded-lg bg-on-error-container text-error-container font-label-lg text-label-lg" onclick="location.reload()">Coba lagi</button></div>`;
  document.body.appendChild(d);
};
