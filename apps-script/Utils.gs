/** Helper umum. Fungsi privat diakhiri underscore. */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseBool_(v, def) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (s === '') return def;
  return ['true', 'ya', 'yes', '1', 'y'].indexOf(s) !== -1;
}

function slugify_(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** ID/link Drive atau URL gambar biasa → URL gambar siap pakai. */
function driveImageUrl(idOrUrl, width) {
  const s = String(idOrUrl || '').trim();
  if (!s) return '';
  if (/^https?:\/\//.test(s) && !/drive\.google\.com/.test(s)) return s;
  const m = s.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
  const id = m ? m[1] : s;
  return 'https://lh3.googleusercontent.com/d/' + id + (width ? '=w' + width : '');
}

/** Link folder Drive (…/folders/<ID>, open?id=<ID>) atau ID polos → ID folder. Tidak dikenali → ''. */
function driveFolderId_(linkOrId) {
  const s = String(linkOrId || '').trim();
  const m = s.match(/(?:\/folders\/|[?&]id=)([a-zA-Z0-9_-]{15,})/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{15,}$/.test(s) ? s : '';
}

function todayStr_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function nowStr_() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

/** ID baris yang mudah dibaca: PB-251110-A7K */
function newId_(prefix) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (let i = 0; i < 3; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return prefix + '-' + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyMMdd') + '-' + r;
}

/** Normalisasi nomor WhatsApp ke format internasional tanpa + (62812...). */
function normalizeWa_(v) {
  let d = String(v || '').replace(/[^0-9]/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  if (d.startsWith('8')) d = '62' + d;
  return d;
}

function toNum_(v) {
  const n = Number(String(v == null ? '' : v).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function clip_(s, max) {
  s = String(s == null ? '' : s).trim();
  return s.length > max ? s.slice(0, max) : s;
}
