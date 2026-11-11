/* Satu-satunya tempat URL API. Ganti <DEPLOYMENT_ID> dengan URL Web App Apps Script (.../exec). */
window.PB = window.PB || {};
PB.CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyYy4moUwoMm3mKi-MbL_IANrRPFSJXrq3vnFIVBSbah3ibNJIwfmRzl9Cpmj8kypn1/exec',
  CACHE_KEY: 'pb_data_v2',     // naikkan versi jika bentuk data berubah
  TIMEOUT_MS: 15000,
  VERSION: '1.1.0'
};

/* URL bersih: tautan lama berakhiran .html (bookmark, hasil pencarian) dirapikan di address bar
   tanpa memuat ulang. GitHub Pages melayani /album dan /berita langsung dari album.html / berita.html.
   Tidak dijalankan di localhost karena tidak semua server lokal mendukung URL tanpa ekstensi. */
if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /\.html$/.test(location.pathname)) {
  try { history.replaceState(null, '', location.pathname.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '') + location.search + location.hash); } catch (_) {}
}

/* Dibuka langsung dari folder (file://, klik dua kali index.html): browser tidak mengenal URL tanpa
   ekstensi dan menampilkan daftar isi folder. Di mode ini saja, tautan dilengkapi saat diklik:
   "album" → "album.html", "./#profil" → "./index.html#profil", "admin/" → "admin/index.html". */
if (location.protocol === 'file:') {
  document.addEventListener('click', e => {
    const a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const h = a.getAttribute('href');
    if (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(h)) return;          // http:, mailto:, #anchor → biarkan
    const m = /^([^?#]*)(.*)$/.exec(h);
    let p = m[1];
    if (!p) return;
    if (/(^|\/)\.{0,2}\/?$/.test(p) || /\/$/.test(p)) p = p.replace(/\/?$/, '/') + 'index.html';   // folder
    else if (!/\.[a-z0-9]+$/i.test(p)) p += '.html';                                             // halaman
    else return;
    a.setAttribute('href', p + m[2]);
  }, true);
}

/* Khusus pengembangan di localhost: jalankan di console browser
   localStorage.pb_api_dev = 'dev/mock-api.json'   → memakai data contoh tanpa Apps Script */
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
  try { const o = localStorage.getItem('pb_api_dev'); if (o) PB.CONFIG.API_URL = /^https?:/.test(o) ? o : (PB.BASE || '') + o; } catch (_) {}
}
