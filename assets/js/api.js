/* Akses API Apps Script. GET sederhana tanpa header kustom (hindari preflight CORS).
   POST memakai body teks (Content-Type default text/plain) — juga "simple request". */
window.PB = window.PB || {};

PB.apiReady = () => PB.CONFIG.API_URL && !/<DEPLOYMENT_ID>/.test(PB.CONFIG.API_URL);

/**
 * Stale-while-revalidate. onData(data, {fromCache}) bisa terpanggil 2x: dari cache lalu dari API.
 * onError(err) hanya dipanggil jika API gagal DAN tidak ada cache.
 */
PB.loadData = function ({ onData, onError }) {
  const { API_URL, CACHE_KEY, TIMEOUT_MS } = PB.CONFIG;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (_) {}
  if (cached && cached.data) onData(cached.data, { fromCache: true });

  if (!PB.apiReady()) {
    if (!cached) onError(new Error('API_URL belum diisi di assets/js/config.js'));
    return;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  const sep = API_URL.indexOf('?') === -1 ? '?' : '&';

  fetch(API_URL + sep + 'action=all', { signal: ctrl.signal })   // JANGAN tambah header
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

/** POST JSON (admin / formulir donasi). Resolve objek respons {ok, ...}; reject bila jaringan gagal. */
PB.post = function (payload, timeoutMs) {
  if (!PB.apiReady()) return Promise.reject(new Error('API_URL belum diisi di assets/js/config.js'));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || PB.CONFIG.TIMEOUT_MS * 2);
  return fetch(PB.CONFIG.API_URL, { method: 'POST', body: JSON.stringify(payload), signal: ctrl.signal })
    .then(r => r.json())
    .finally(() => clearTimeout(timer));
};

/**
 * Penghitung pengunjung: satu perangkat dihitung SEKALI per hari (penanda tanggal di localStorage),
 * jadi hanya ada satu request kecil per perangkat per hari. `baru` = kunjungan pertama perangkat ini
 * di bulan berjalan (untuk pengunjung unik bulanan). Tidak ada data pribadi yang dikirim.
 */
PB.trackVisit = function () {
  if (!PB.apiReady() || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  const d = new Date(), p = x => String(x).padStart(2, '0');
  const today = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  let last = '';
  try {
    last = localStorage.getItem('pb_visit') || '';
    if (last === today) return;
    localStorage.setItem('pb_visit', today);
  } catch (_) { return; }   // localStorage diblokir → tidak dihitung (daripada terhitung berulang)
  PB.post({ action: 'kunjungan', baru: last.slice(0, 7) !== today.slice(0, 7) }).catch(() => {});
};
if (!PB.BASE) PB.trackVisit();   // hanya halaman publik; admin/ (PB.BASE = '../') tidak dihitung

/** Ukur latensi ?action=ping (ms). */
PB.ping = function () {
  const t0 = performance.now();
  const sep = PB.CONFIG.API_URL.indexOf('?') === -1 ? '?' : '&';
  return fetch(PB.CONFIG.API_URL + sep + 'action=ping').then(r => r.json())
    .then(res => ({ ok: !!res.ok, ms: Math.round(performance.now() - t0), pong: res.pong }));
};
