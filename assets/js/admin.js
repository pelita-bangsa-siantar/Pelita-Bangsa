/* Panel admin: login bertoken, routing hash, modul Ringkasan / Berita / Buku / Donatur / Konfigurasi.
   Semua tulis ke Sheets lewat PB.post({action, token, ...}). Mode demo lokal: dev/mock-admin.js menyediakan PB.devPost. */
(function () {
  const S = { token: '', user: null, config: null, stats: null, profil: null, lists: {}, loadedAt: {}, page: {}, dnTab: 'donasi', pings: [], zona: '' };
  const PER_PAGE = 10;
  const post = p => (PB.devPost || PB.post)(Object.assign({ token: S.token }, p)).then(res => {
    if (res && res.auth === false) { forceLogout('Sesi berakhir. Silakan login kembali.'); throw new Error(res.error); }
    setStatus(true);
    return res;
  }).catch(err => { if (!/Sesi berakhir/.test(err.message)) setStatus(false); throw err; });

  const $ = PB.q, $$ = PB.qa;
  const localStamp = t => { const d = new Date(t), p = x => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
  const nowLabel = () => { const d = new Date(); return `Hari ini, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`; };
  const setErr = msg => { const e = $('#app-err'); e.classList.toggle('hidden', !msg); e.querySelector('[data-msg]').textContent = msg || ''; };
  const setStatus = ok => $$('[data-status-text]').forEach(el => { el.textContent = ok ? 'Terhubung' : 'Gangguan'; el.className = `font-label-sm text-label-sm px-2 py-0.5 rounded-full ${ok ? 'text-secondary bg-secondary-fixed' : 'text-tertiary bg-tertiary-fixed'}`; });
  const busy = (btn, on) => { if (btn) { btn.disabled = on; btn.classList.toggle('opacity-60', on); } };
  const isTrue = v => /^(true|ya|yes|1)$/i.test(String(v || ''));
  const n = v => Number(String(v == null ? '' : v).replace(/[^0-9.-]/g, '')) || 0;
  const formData = f => { const o = {}; new FormData(f).forEach((v, k) => { o[k] = String(v).trim(); }); $$('input[type=checkbox]', f).forEach(c => { o[c.name] = c.checked ? 'TRUE' : 'FALSE'; }); return o; };
  const fillForm = (f, row) => { f.reset(); Object.keys(row || {}).forEach(k => { const el = f.elements[k]; if (!el || el.length === 0) return; if (el.type === 'checkbox') el.checked = isTrue(row[k]); else el.value = row[k] || ''; }); };
  const paginate = (rows, key) => { const p = S.page[key] || 1, total = Math.max(1, Math.ceil(rows.length / PER_PAGE)); S.page[key] = Math.min(p, total); return { slice: rows.slice((S.page[key] - 1) * PER_PAGE, S.page[key] * PER_PAGE), page: S.page[key], total, count: rows.length }; };
  const pagerHtml = (pg, key, label) => `<div>Menampilkan <strong class="text-on-surface">${pg.count ? (pg.page - 1) * PER_PAGE + 1 : 0}–${Math.min(pg.page * PER_PAGE, pg.count)}</strong> dari <strong class="text-on-surface">${PB.num(pg.count)} ${label}</strong></div>
    <div class="flex items-center gap-1">${pg.total > 1 ? Array.from({ length: pg.total }, (_, i) => i + 1).filter(i => Math.abs(i - pg.page) < 3 || i === 1 || i === pg.total).map((i, idx, arr) => `${idx && arr[idx - 1] !== i - 1 ? '<span class="px-1">…</span>' : ''}<button data-page="${key}:${i}" class="px-3 py-1.5 rounded ${i === pg.page ? 'bg-primary text-on-primary font-semibold' : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'}">${i}</button>`).join('') : ''}</div>`;
  const csvDownload = (name, headers, rows) => {
    const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const text = '﻿' + [headers.map(q).join(','), ...rows.map(r => headers.map(h => q(r[h])).join(','))].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })); a.download = `${name}_${PB.today()}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const copyText = (t, btn) => navigator.clipboard.writeText(t).then(() => { const old = btn.innerHTML; btn.innerHTML = '<span class="material-symbols-outlined text-body-sm">done</span> Tersalin'; setTimeout(() => { btn.innerHTML = old; }, 2000); });
  const SKEMA = { BUKU: ['id', 'isbn', 'judul', 'penulis', 'penerbit_tahun', 'kategori', 'rak', 'jumlah', 'dipinjam', 'sumber', 'catatan', 'sembunyikan'], BERITA: ['id', 'tanggal', 'judul', 'kategori', 'penulis', 'lokasi', 'ringkasan', 'isi', 'foto_drive_id', 'status', 'sembunyikan'], DONASI: ['id', 'tanggal', 'nama', 'whatsapp', 'asal', 'jenis', 'kategori_buku', 'jumlah', 'logistik', 'resi', 'status', 'apresiasi', 'catatan', 'sumber'] };
  const ssNama = () => (S.config && S.config.spreadsheet.nama) || 'Google Sheets';
  const fotoUrl = v => { const s = String(v || '').trim(); if (!s) return ''; if (/^https?:\/\//.test(s) && !/drive\.google\.com/.test(s)) return s; const m = s.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{20,})/); return 'https://lh3.googleusercontent.com/d/' + (m ? m[1] : s) + '=w900'; };

  /* ---------- Auth ---------- */
  function showLogin() { $('#view-login').classList.remove('hidden'); $('#app').classList.add('hidden'); }
  function showApp() { $('#view-login').classList.add('hidden'); $('#app').classList.remove('hidden'); $$('[data-user-nama]').forEach(e => { e.textContent = (S.user && S.user.nama) || 'Pengurus'; }); $$('[data-user-email]').forEach(e => { e.textContent = (S.user && S.user.email) || 'Admin'; }); route(); }
  function forceLogout(msg) { S.token = ''; try { sessionStorage.removeItem('pb_admin_token'); } catch (_) {} showLogin(); if (msg) { const e = $('#login-err'); e.textContent = msg; e.classList.remove('hidden'); } }
  $('#form-login').addEventListener('submit', e => {
    e.preventDefault();
    const btn = $('#btn-login'), err = $('#login-err'); busy(btn, true); err.classList.add('hidden');
    (PB.devPost || PB.post)({ action: 'login', user: $('#login-user').value.trim(), password: $('#login-pw').value })
      .then(res => {
        if (!res.ok) throw new Error(res.error || 'Login gagal');
        S.token = res.token; S.user = res.user; try { sessionStorage.setItem('pb_admin_token', res.token); } catch (_) {}
        $('#login-pw').value = ''; showApp();
      })
      .catch(x => { err.textContent = x.message || 'Tidak dapat terhubung ke API. Periksa API_URL di config.js.'; err.classList.remove('hidden'); })
      .finally(() => busy(btn, false));
  });
  $$('[data-logout]').forEach(b => b.addEventListener('click', () => { post({ action: 'logout' }).catch(() => {}); forceLogout(); }));

  /* ---------- Routing ---------- */
  const VIEWS = ['ringkasan', 'berita', 'galeri', 'agenda', 'konten', 'buku', 'donatur', 'konfigurasi'];
  function route() {
    if (!S.token) return;   // belum login (mis. hash berubah saat proses login) → jangan memicu "sesi berakhir"
    const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'ringkasan';
    $$('[data-view]').forEach(s => { const on = s.dataset.view === v; s.classList.toggle('hidden', !on); s.classList.toggle('flex', on); });
    $$('#side-nav [data-nav]').forEach(a => { a.className = `flex items-center gap-3 px-space-md py-space-sm rounded-lg transition-colors ${a.dataset.nav === v ? 'bg-primary-container text-on-primary-container font-headline-sm shadow-[0_1px_8px_rgba(0,0,0,0.04)]' : 'font-label-lg text-label-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`; });
    $$('#chip-nav [data-nav]').forEach(a => { a.className = `flex items-center gap-1.5 px-3 py-1.5 rounded-full font-label-sm whitespace-nowrap ${a.dataset.nav === v ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-surface-variant'}`; });
    $$('#bottom-nav [data-nav]').forEach(a => { a.className = `flex flex-col items-center justify-center w-14 h-12 gap-0.5 ${a.dataset.nav === v ? 'text-primary font-bold' : 'text-on-surface-variant'}`; });
    window.scrollTo({ top: 0 });
    setErr('');
    ({ ringkasan: loadRingkasan, berita: () => ensureList('BERITA').then(renderBerita), galeri: () => ensureList('ALBUM').then(renderGaleri), agenda: () => Promise.all([ensureList('AGENDA'), ensureList('ALBUM')]).then(renderAgendaAdm), konten: () => ensureList('PROFIL').then(renderKonten), buku: () => ensureList('BUKU').then(renderBuku), donatur: () => Promise.all([ensureList('DONASI'), ensureStats()]).then(renderDonatur), konfigurasi: () => ensureConfig(true).then(renderKonfigurasi) })[v]().catch(err => setErr(err.message));
  }
  window.addEventListener('hashchange', route);

  /* ---------- Loader ---------- */
  function ensureStats(force) { if (S.stats && !force) return Promise.resolve(S.stats); return post({ action: 'stats' }).then(r => { if (!r.ok) throw new Error(r.error); S.stats = r.stats; $$('[data-cache-ttl]').forEach(e => { e.textContent = Math.round(r.stats.cache.ttl / 60); }); return r.stats; }); }
  function ensureConfig(force) { if (S.config && !force) return Promise.resolve(S.config); return post({ action: 'config' }).then(r => { if (!r.ok) throw new Error(r.error); S.config = r.config; $$('[data-ss-nama]').forEach(e => { e.textContent = r.config.spreadsheet.nama; }); $$('[data-ss-link]').forEach(e => { e.href = r.config.spreadsheet.url; }); $('#kf-tz').textContent = r.config.api.timezone; $('#kf-token-ttl').textContent = Math.round(r.config.api.tokenTtl / 3600); return r.config; }); }
  function ensureList(sheet, force) { if (S.lists[sheet] && !force) return Promise.resolve(S.lists[sheet]); return post({ action: 'list', sheet }).then(r => { if (!r.ok) throw new Error(r.error); S.lists[sheet] = r; S.loadedAt[sheet] = Date.now(); return r; }); }
  function ensureProfil() { if (S.profil) return; PB.loadData({ onData: D => { S.profil = D.profil || {}; renderBanner(); }, onError: () => {} }); }
  function upsertLocal(sheet, row) { const L = S.lists[sheet]; if (!L) return; const i = L.rows.findIndex(r => r.id === row.id); if (i === -1) L.rows.push(row); else L.rows[i] = Object.assign({}, L.rows[i], row); S.stats = null; }
  function removeLocal(sheet, id) { const L = S.lists[sheet]; if (L) L.rows = L.rows.filter(r => r.id !== id); S.stats = null; }
  $$('[data-refresh]').forEach(b => b.addEventListener('click', () => { const ic = $('[data-refresh-icon]'); ic.classList.add('animate-spin'); S.stats = null; S.lists = {}; S.config = null; route(); setTimeout(() => ic.classList.remove('animate-spin'), 1200); PB.toast('Memuat ulang data dari Google Sheets…', 'sync'); }));
  $$('[data-reload]').forEach(b => b.addEventListener('click', () => { S.stats = null; ensureList(b.dataset.reload, true).then(() => { route(); PB.toast(`Tab ${b.dataset.reload} dimuat ulang dari Sheets.`, 'cloud_done'); }).catch(err => setErr(err.message)); }));
  $$('[data-export]').forEach(b => b.addEventListener('click', () => ensureList(b.dataset.export).then(L => { csvDownload(b.dataset.export, L.headers, L.rows); PB.toast(`CSV tab ${b.dataset.export} diunduh.`, 'download'); })));
  document.addEventListener('click', e => { const p = e.target.closest('[data-page]'); if (!p) return; const [k, i] = p.dataset.page.split(':'); S.page[k] = Number(i); ({ BERITA: renderBerita, BUKU: renderBuku, DONASI: renderDonatur, ALBUM: renderGaleri, AGENDA: renderAgendaAdm })[k](); });
  $$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('.fixed').classList.replace('flex', 'hidden')));
  const openModal = id => { const m = $(id); m.classList.remove('hidden'); m.classList.add('flex'); };
  const closeModal = id => { const m = $(id); m.classList.add('hidden'); m.classList.remove('flex'); };

  /* ---------- Ringkasan & Analitik ---------- */
  const kpiCard = (label, val, sub, color, icon, bg) => `<div class="p-space-md lg:p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between hover:-translate-y-0.5 transition-transform">
    <div class="flex items-start justify-between"><div class="flex flex-col min-w-0"><span class="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">${label}</span><span class="font-headline-xl text-headline-xl ${color} font-bold mt-1">${val}</span></div><div class="w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-headline-sm">${icon}</span></div></div>
    <div class="mt-4 pt-3 flex items-center justify-between bg-surface-container-low rounded-lg px-3 py-2 font-label-sm text-label-sm text-on-surface-variant">${sub}</div></div>`;
  function loadRingkasan() {
    ensureProfil();
    return Promise.all([ensureStats(), ensureConfig()]).then(() => { renderRingkasan(); doPing(); });
  }
  function renderBanner() { const b = $('#rk-banner'); if (!S.profil) return; b.classList.toggle('hidden', !S.profil.hero_foto); b.querySelector('img').src = S.profil.hero_foto || ''; $$('[data-profil]', b).forEach(e => { e.textContent = S.profil[e.dataset.profil] || ''; }); }
  function renderRingkasan() {
    const st = S.stats, k = st.koleksi;
    $('#rk-waktu').textContent = nowLabel();
    $('#rk-kpi').innerHTML = [
      kpiCard('Katalog Terdaftar', PB.num(k.total), `<span class="text-primary font-semibold">${PB.num(k.judul)} judul</span><span>${Object.keys(k.kategori).length} kategori</span>`, 'text-primary', 'collections_bookmark', 'bg-primary-fixed text-primary'),
      kpiCard('Anak Binaan Aktif', PB.num(st.anak_terbina) || '—', `<span class="text-on-surface font-semibold">Siantar &amp; Simalungun</span><span class="text-secondary bg-surface-container px-2 py-0.5 rounded">PROFIL</span>`, 'text-secondary', 'groups', 'bg-secondary-fixed text-secondary'),
      kpiCard('Relawan Aktif', PB.num(st.relawan), `<span class="flex items-center gap-1 text-primary font-semibold"><span class="w-2 h-2 rounded-full bg-primary"></span>Tab RELAWAN</span><span>${st.agenda.akanDatang} agenda mendatang</span>`, 'text-on-surface', 'handshake', 'bg-primary-fixed-dim/40 text-on-primary-fixed-variant'),
      kpiCard('Donasi &amp; Pendaftar', PB.num(st.donasi.total), `<span class="text-tertiary font-semibold">${st.donasi.baru} baru menunggu</span><span>${PB.num(st.donasi.buku)} buku dijanjikan</span>`, 'text-tertiary', 'volunteer_activism', 'bg-tertiary-fixed text-tertiary')
    ].join('');
    renderBanner();
    // Pengunjung (kosong jika API lama / tab KUNJUNGAN belum ada)
    const kj = st.kunjungan || { hariIni: 0, kemarin: 0, bulanIni: 0, bulanLalu: 0, harian: [], bulanan: [] };
    const lblBln = m => { const [y, mo] = m.split('-'); return `${PB.BLN[Number(mo) - 1]} '${y.slice(2)}`; };
    const kjBox = (l, v, s, c) => `<div class="p-3 rounded-lg bg-surface-container-low flex flex-col"><span class="font-label-sm text-label-sm text-on-surface-variant">${l}</span><span class="font-headline-md text-headline-md ${c} font-bold mt-1">${PB.num(v)}</span><span class="font-label-sm text-label-sm text-on-surface-variant">${s}</span></div>`;
    $('#rk-kj-angka').innerHTML = kjBox('Hari ini', kj.hariIni, 'pengunjung', 'text-primary') + kjBox('Kemarin', kj.kemarin, 'pengunjung', 'text-on-surface') + kjBox('Bulan ini', kj.bulanIni, 'pengunjung unik', 'text-secondary') + kjBox('Bulan lalu', kj.bulanLalu, 'pengunjung unik', 'text-on-surface');
    const kjMax = Math.max(1, ...kj.harian.map(x => x.n));
    $('#rk-kj-harian').innerHTML = kj.harian.map((x, i) => `<div class="flex-1 h-full flex flex-col justify-end items-center gap-1 min-w-0" title="${PB.esc(PB.fmtTgl(x.tanggal))}: ${x.n} pengunjung"><span class="font-label-sm text-[10px] leading-none text-on-surface-variant">${x.n || ''}</span><div class="w-full rounded-t ${i === kj.harian.length - 1 ? 'bg-primary' : 'bg-secondary/40'}" style="height:${x.n ? Math.max(6, Math.round(x.n / kjMax * 80)) : 2}%"></div><span class="font-label-sm text-[10px] leading-none text-on-surface-variant">${Number(x.tanggal.slice(8))}</span></div>`).join('') || '<p class="font-body-sm text-body-sm text-on-surface-variant self-center">Belum ada data kunjungan.</p>';
    $('#rk-kj-bulanan').innerHTML = kj.bulanan.map(x => `<div class="p-2 rounded-lg bg-surface-container-low text-center"><div class="font-label-sm text-label-sm text-on-surface-variant">${lblBln(x.bulan)}</div><div class="font-label-lg text-label-lg text-on-surface font-bold">${PB.num(x.n)}</div></div>`).join('');
    // Donut kategori
    const COL = ['#8d4b00', '#006398', '#b15f00', '#5bb8fe', '#ba0035', '#dee8ff'];
    const ent = Object.entries(k.kategori).sort((a, b) => b[1] - a[1]);
    const top = ent.slice(0, 5); const rest = ent.slice(5).reduce((a, e) => a + e[1], 0); if (rest) top.push(['Lainnya', rest]);
    const C = 2 * Math.PI * 40; let off = 0;
    $('#rk-donut').innerHTML = k.total ? top.map(([_, v], i) => { const len = v / k.total * C; const s = `<circle cx="50" cy="50" r="40" fill="transparent" stroke="${COL[i]}" stroke-width="16" stroke-dasharray="${len} ${C}" stroke-dashoffset="${-off}"></circle>`; off += len; return s; }).join('') : `<circle cx="50" cy="50" r="40" fill="transparent" stroke="#e7eeff" stroke-width="16"></circle>`;
    $('#rk-donut-total').textContent = PB.num(k.total);
    $('#rk-legend').innerHTML = top.map(([name, v], i) => `<div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-container-low"><div class="flex items-center gap-2 min-w-0"><span class="w-3 h-3 rounded-full shrink-0" style="background:${COL[i]}"></span><span class="font-label-sm text-label-sm text-on-surface truncate">${PB.esc(name)}</span></div><span class="font-label-md text-label-md font-bold shrink-0" style="color:${COL[i] === '#dee8ff' ? '#554336' : COL[i]}">${Math.round(v / k.total * 100)}%</span></div>`).join('') || '<p class="font-body-sm text-body-sm text-on-surface-variant">Tab BUKU masih kosong.</p>';
    $('#rk-judul').textContent = `${PB.num(k.judul)} judul · ${PB.num(k.dipinjam)} sedang dipinjam`;
    // Tren
    const bln = st.bulan, d1 = st.donasi.perBulan.map(x => x.n), d2 = st.berita.perBulan.map(x => x.n);
    const max = Math.max(3, ...d1, ...d2), X = i => 50 + i * (500 / Math.max(1, bln.length - 1)), Y = v => 180 - v / max * 150;
    const line = arr => arr.map((v, i) => `${i ? 'L' : 'M'} ${X(i)} ${Y(v)}`).join(' ');
    const lbl = m => { const [y, mo] = m.split('-'); return `${PB.BLN[Number(mo) - 1]} '${y.slice(2)}`; };
    $('#rk-tren').innerHTML = `<defs><linearGradient id="g2" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#006398" stop-opacity=".25"/><stop offset="100%" stop-color="#006398" stop-opacity="0"/></linearGradient><linearGradient id="g1" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#8d4b00" stop-opacity=".2"/><stop offset="100%" stop-color="#8d4b00" stop-opacity="0"/></linearGradient></defs>
      ${[0, 1 / 3, 2 / 3, 1].map(f => `<line x1="30" x2="580" y1="${180 - f * 150}" y2="${180 - f * 150}" stroke="#d8e3fb" stroke-width="1" ${f ? 'stroke-dasharray="4 4"' : ''}/><text x="5" y="${184 - f * 150}" fill="#554336" font-size="10">${Math.round(max * f)}</text>`).join('')}
      <path d="${line(d1)} L ${X(d1.length - 1)} 180 L 50 180 Z" fill="url(#g2)"/><path d="${line(d1)}" fill="none" stroke="#006398" stroke-width="3" stroke-linecap="round"/>
      <path d="${line(d2)} L ${X(d2.length - 1)} 180 L 50 180 Z" fill="url(#g1)"/><path d="${line(d2)}" fill="none" stroke="#8d4b00" stroke-width="3" stroke-linecap="round"/>
      ${d1.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="#006398"><title>Donasi ${lbl(bln[i])}: ${v}</title></circle>`).join('')}${d2.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="#8d4b00"><title>Berita ${lbl(bln[i])}: ${v}</title></circle>`).join('')}
      ${bln.map((m, i) => `<text x="${X(i) - 12}" y="196" fill="#554336" font-size="11">${lbl(m)}</text>`).join('')}`;
    $('#rk-tren-periode').textContent = `Periode ${lbl(bln[0])} — ${lbl(bln[bln.length - 1])}`;
    $('#rk-agenda').textContent = PB.num(st.agenda.total); $('#rk-galeri').textContent = `${st.galeri.album} album · ${st.galeri.foto} foto`;
    $('#rk-donasi-baru').textContent = st.donasi.baru ? `${st.donasi.baru} formulir baru menunggu konfirmasi` : 'Tidak ada formulir menunggu';
    // Log
    const ICON = { tambah: ['post_add', 'bg-tertiary-fixed text-tertiary'], ubah: ['edit_note', 'bg-secondary-fixed text-secondary'], hapus: ['delete', 'bg-surface-container-highest text-on-surface-variant'], 'donasi-web': ['inventory_2', 'bg-primary-fixed text-primary'], login: ['login', 'bg-surface-container-highest text-on-surface-variant'], refresh: ['sync', 'bg-secondary-fixed text-secondary'] };
    $('#rk-log').innerHTML = (st.log || []).map(l => { const ic = ICON[l.aksi] || ['history', 'bg-surface-container-highest text-on-surface-variant']; return `<div class="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors"><div class="w-9 h-9 rounded-lg ${ic[1]} flex items-center justify-center shrink-0 mt-0.5"><span class="material-symbols-outlined text-body-lg">${ic[0]}</span></div><div class="flex-1 min-w-0"><div class="flex items-center justify-between gap-2"><span class="font-label-md text-label-md text-on-surface font-bold truncate">${PB.esc(l.aksi)} ${PB.esc(l.tab !== '-' ? l.tab : '')} ${PB.esc(l.id !== '-' ? l.id : '')}</span><span class="font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">${PB.esc(PB.lalu(l.waktu))}</span></div><p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">${PB.esc(l.keterangan || '')} <span class="text-outline">· oleh ${PB.esc(l.oleh || 'admin')}</span></p></div></div>`; }).join('') || '<p class="font-body-sm text-body-sm text-on-surface-variant">Belum ada aktivitas tercatat.</p>';
    $('#rk-cache').textContent = st.cache.aktif ? 'Aktif (hangat)' : 'Kosong (akan dibangun)';
    const maxRows = Math.max(1, ...Object.values(st.rows));
    $('#rk-rows').innerHTML = Object.entries(st.rows).map(([t, r], i) => `<div><div class="flex items-center justify-between font-label-sm text-label-sm mb-1"><span class="text-on-surface font-semibold flex items-center gap-1.5"><span class="material-symbols-outlined text-body-sm ${['text-primary', 'text-secondary', 'text-tertiary'][i % 3]}">table_chart</span>${t} (${r < 0 ? 'tab belum ada' : PB.num(r) + ' baris'})</span></div><div class="w-full h-2 rounded-full bg-surface-container-high overflow-hidden"><div class="h-full ${['bg-primary', 'bg-secondary', 'bg-tertiary'][i % 3]} rounded-full" style="width:${Math.max(2, Math.round(Math.max(0, r) / maxRows * 100))}%"></div></div></div>`).join('');
  }
  function doPing() {
    if (!PB.apiReady() && !PB.devPost) return;
    const run = PB.devPost ? Promise.resolve({ ok: true, ms: 120 + Math.round(Math.random() * 60) }) : PB.ping();
    return run.then(r => { S.pings.push(r.ms); S.pings = S.pings.slice(-11); try { sessionStorage.setItem('pb_pings', JSON.stringify(S.pings)); } catch (_) {}
      $('#rk-latency').textContent = `${r.ms} ms`; $('#kf-latency').textContent = r.ms; $('#bk-diag-latency').textContent = `Latensi ${r.ms} ms`;
      $('#rk-api-status').innerHTML = `<span class="w-2 h-2 rounded-full bg-secondary"></span>${r.ms < 1500 ? 'Stabil' : 'Lambat'}`; $('#kf-status').textContent = 'Live & Connected'; renderSpark(); return r; })
      .catch(() => { $('#rk-api-status').innerHTML = '<span class="w-2 h-2 rounded-full bg-tertiary"></span>Gagal'; $('#kf-status').textContent = 'Tidak terhubung'; });
  }

  /* ---------- Kelola Berita ---------- */
  const fb = $('#form-berita');
  const statusChip = s => s === 'Draf' ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-label-sm text-label-sm font-bold"><span class="w-1.5 h-1.5 rounded-full bg-amber-600"></span>Draf</span>` : `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-bold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Terbit</span>`;
  function renderBerita() {
    const L = S.lists.BERITA, rows = L.rows.slice().sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
    $('#br-waktu').textContent = PB.lalu(localStamp(S.loadedAt.BERITA));
    const terbit = rows.filter(r => (r.status || 'Terbit') === 'Terbit').length, draf = rows.length - terbit;
    const mini = (l, v, s, c, i, b) => `<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between"><div><p class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">${l}</p><p class="font-headline-xl text-headline-xl ${c} mt-1">${v}</p><p class="font-label-md text-label-md text-on-surface-variant mt-1">${s}</p></div><div class="w-12 h-12 rounded-lg ${b} flex items-center justify-center"><span class="material-symbols-outlined text-[24px]">${i}</span></div></div>`;
    $('#br-kpi').innerHTML = mini('Berita Terbit', terbit, 'Tampil di web publik', 'text-primary', 'newspaper', 'bg-primary-fixed text-primary') + mini('Draf Disimpan', draf, 'Menunggu kurasi', 'text-secondary', 'drafts', 'bg-secondary-fixed text-secondary') + mini('Total Baris', rows.length, 'Tab BERITA', 'text-tertiary', 'dataset', 'bg-tertiary-fixed text-tertiary') + mini('Disembunyikan', rows.filter(r => isTrue(r.sembunyikan)).length, 'Arsip', 'text-on-surface', 'visibility_off', 'bg-surface-container-high text-on-surface-variant');
    $('#br-kolom').innerHTML = ((S.config && S.config.tabs.find(t => t.nama === 'BERITA') || {}).skema || SKEMA.BERITA).map((c, i) => `<div class="p-2 rounded bg-surface-container-low flex items-center justify-between"><span class="text-primary font-bold">${String.fromCharCode(65 + i)}: ${c}</span></div>`).join('');
    const q = $('#br-cari').value.toLowerCase(), st = $('#br-filter-status').value;
    const filt = rows.filter(r => (!st || (r.status || 'Terbit') === st) && (!q || `${r.judul} ${r.kategori} ${r.penulis} ${r.id}`.toLowerCase().includes(q)));
    const pg = paginate(filt, 'BERITA');
    $('#br-rows').innerHTML = pg.slice.map(r => `<tr class="hover:bg-surface-container-low/60 transition-colors ${isTrue(r.sembunyikan) ? 'opacity-60' : ''}">
      <td class="py-3 px-space-md font-mono font-semibold text-primary whitespace-nowrap">${PB.esc(r.id)}</td><td class="py-3 px-space-md whitespace-nowrap text-on-surface-variant">${PB.esc(PB.fmtTgl(r.tanggal))}</td>
      <td class="py-3 px-space-md font-semibold text-on-surface min-w-[220px]">${PB.esc(r.judul)}${isTrue(r.sembunyikan) ? ' <span class="font-label-sm text-on-surface-variant">(disembunyikan)</span>' : ''}</td>
      <td class="py-3 px-space-md">${PB.chip(r.kategori)}</td><td class="py-3 px-space-md whitespace-nowrap text-on-surface-variant">${PB.esc(r.penulis)}</td><td class="py-3 px-space-md whitespace-nowrap">${statusChip(r.status)}</td>
      <td class="py-3 px-space-md whitespace-nowrap text-right"><div class="inline-flex items-center gap-1">
        <button data-act="preview" data-id="${PB.esc(r.id)}" title="Pratinjau" class="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface"><span class="material-symbols-outlined text-[18px]">visibility</span></button>
        <button data-act="edit" data-id="${PB.esc(r.id)}" title="Edit" class="p-1.5 rounded hover:bg-surface-container text-secondary"><span class="material-symbols-outlined text-[18px]">edit</span></button>
        <button data-act="hapus" data-id="${PB.esc(r.id)}" title="Hapus baris" class="p-1.5 rounded hover:bg-error-container text-tertiary"><span class="material-symbols-outlined text-[18px]">delete</span></button></div></td></tr>`).join('') || `<tr><td colspan="7" class="py-space-lg text-center text-on-surface-variant">Belum ada berita. Isi formulir di atas.</td></tr>`;
    $('#br-pager').innerHTML = pagerHtml(pg, 'BERITA', 'entri');
    renderBeritaPreview();
  }
  function renderBeritaPreview() {
    const d = formData(fb), foto = fotoUrl(d.foto_drive_id);
    $('#br-preview').innerHTML = `<div class="rounded-lg overflow-hidden bg-surface-container-low shadow-sm"><div class="relative h-40 w-full overflow-hidden bg-surface-container">${PB.img(foto, d.judul, 'w-full h-full object-cover')}<div class="absolute top-2 left-2">${PB.chip(d.kategori || 'Kabar Komunitas', 'shadow-sm bg-surface-container-lowest/90')}</div></div>
      <div class="p-space-sm"><p class="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 mb-1"><span class="material-symbols-outlined text-[14px]">calendar_today</span>${PB.esc(PB.fmtTgl(d.tanggal, true) || 'Tanggal')}${d.lokasi ? ' • ' + PB.esc(d.lokasi) : ''}</p><h3 class="font-headline-sm text-headline-sm text-on-surface font-bold leading-tight clamp-2">${PB.esc(d.judul || 'Judul berita akan tampil di sini')}</h3><p class="font-body-sm text-body-sm text-on-surface-variant mt-1.5 clamp-2 justify">${PB.esc(d.ringkasan || d.isi || 'Ringkasan narasi berita...')}</p><div class="mt-space-sm pt-space-xs flex items-center justify-between border-t border-surface-container-high"><span class="font-label-sm text-label-sm text-primary font-bold">Baca Selengkapnya →</span><span class="font-label-sm text-label-sm text-on-surface-variant">${PB.esc(d.penulis || 'Penulis')}</span></div></div></div>`;
  }
  fb.addEventListener('input', renderBeritaPreview);
  $$('[data-fmt]', fb).forEach(b => b.addEventListener('click', () => {
    const t = fb.elements.isi, s = t.selectionStart, e = t.selectionEnd, sel = t.value.slice(s, e);
    const rep = { bold: `**${sel || 'teks tebal'}**`, italic: `*${sel || 'teks miring'}*`, list: `\n- ${sel || 'item daftar'}\n`, quote: `\n> ${sel || 'kutipan inspiratif'}\n` }[b.dataset.fmt];
    t.value = t.value.slice(0, s) + rep + t.value.slice(e); t.focus(); renderBeritaPreview();
  }));
  $('#br-toggle').addEventListener('click', () => { if (window.innerWidth >= 1280) return; const hid = fb.classList.toggle('hidden'); $('#br-arrow').textContent = hid ? 'chevron_right' : 'expand_more'; });
  function beritaMode(edit) { $('#br-batal').classList.toggle('hidden', !edit); $('#br-form-title').textContent = edit ? `Edit Berita ${edit}` : 'Formulir Warta & Berita Komunitas'; $('#br-form-note').textContent = edit ? 'Perubahan menimpa baris yang sama di tab BERITA' : 'Baris baru ditambahkan ke tab BERITA'; }
  $('#br-batal').addEventListener('click', () => { fb.reset(); fb.elements.tanggal.value = PB.today(); beritaMode(''); renderBeritaPreview(); });
  function simpanBerita(status) {
    const d = formData(fb); d.status = status;
    if (!d.judul) return setErr('Judul berita wajib diisi.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.tanggal)) return setErr('Tanggal publikasi wajib diisi.');
    if (!d.isi && status === 'Terbit') return setErr('Isi berita wajib diisi untuk publikasi.');
    busy($('#br-terbit'), true); busy($('#br-draf'), true); setErr('');
    post({ action: 'save', sheet: 'BERITA', data: d }).then(r => {
      if (!r.ok) throw new Error(r.error);
      upsertLocal('BERITA', r.row); PB.toast(`Berita ${r.row.id} ${status === 'Terbit' ? 'dipublikasikan' : 'disimpan sebagai draf'} ke Sheets.`); $('#br-batal').click(); renderBerita();
    }).catch(err => setErr(err.message)).finally(() => { busy($('#br-terbit'), false); busy($('#br-draf'), false); });
  }
  fb.addEventListener('submit', e => { e.preventDefault(); simpanBerita('Terbit'); });
  $('#br-draf').addEventListener('click', () => simpanBerita('Draf'));
  ['#br-cari', '#br-filter-status'].forEach(s => $(s).addEventListener('input', () => { S.page.BERITA = 1; renderBerita(); }));
  $('#br-rows').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const r = S.lists.BERITA.rows.find(x => x.id === b.dataset.id); if (!r) return;
    if (b.dataset.act === 'edit') { fillForm(fb, r); fb.classList.remove('hidden'); beritaMode(r.id); renderBeritaPreview(); fb.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (b.dataset.act === 'preview') { $('#mb-judul').textContent = r.judul; $('#mb-meta').textContent = `${r.id} • ${r.penulis || '-'} • ${PB.fmtTgl(r.tanggal, true)}`; $('#mb-chips').innerHTML = PB.chip(r.kategori) + statusChip(r.status); $('#mb-foto').innerHTML = fotoUrl(r.foto_drive_id) ? PB.img(fotoUrl(r.foto_drive_id), r.judul, 'w-full max-h-64 object-cover rounded-lg') : ''; $('#mb-isi').innerHTML = (r.ringkasan ? `<p><strong>${PB.esc(r.ringkasan)}</strong></p>` : '') + PB.md(r.isi || ''); $('#mb-edit').onclick = () => { closeModal('#modal-berita'); b.parentNode.querySelector('[data-act=edit]').click(); }; openModal('#modal-berita'); }
    if (b.dataset.act === 'hapus' && confirm(`Hapus berita "${r.judul}" dari Google Sheets? Tindakan ini tidak bisa dibatalkan.`)) {
      post({ action: 'delete', sheet: 'BERITA', id: r.id }).then(x => { if (!x.ok) throw new Error(x.error); removeLocal('BERITA', r.id); renderBerita(); PB.toast(`Baris ${r.id} dihapus.`, 'delete'); }).catch(err => setErr(err.message));
    }
  });

  /* ---------- Galeri: album = folder Google Drive (tab ALBUM) ---------- */
  const fa = $('#form-album');
  const folderOk = v => /(?:\/folders\/|[?&]id=)[a-zA-Z0-9_-]{15,}/.test(v) || /^[a-zA-Z0-9_-]{15,}$/.test(v);
  function renderGaleri() {
    const rows = S.lists.ALBUM.rows.slice().sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b._row - a._row));
    $('#gl-count').textContent = `${PB.num(rows.length)} album`;
    const pg = paginate(rows, 'ALBUM');
    $('#gl-rows').innerHTML = pg.slice.map(r => `<tr class="hover:bg-surface-container-low/60 transition-colors ${isTrue(r.sembunyikan) ? 'opacity-60' : ''}">
      <td class="py-3 px-space-sm sm:px-space-md"><div class="font-semibold text-on-surface">${PB.esc(r.judul)}${isTrue(r.sembunyikan) ? ' <span class="font-label-sm text-on-surface-variant">(disembunyikan)</span>' : ''}</div><div class="font-mono font-label-sm text-label-sm text-primary">${PB.esc(r.id)}</div><div class="sm:hidden font-label-sm text-label-sm text-on-surface-variant mt-0.5">${PB.esc(PB.fmtTgl(r.tanggal) || '—')}${r._foto ? ' · ' + PB.num(r._foto) + ' foto' : ''}</div></td>
      <td class="py-3 px-space-md whitespace-nowrap text-on-surface-variant hidden sm:table-cell">${PB.esc(PB.fmtTgl(r.tanggal) || '—')}</td>
      <td class="py-3 px-space-md whitespace-nowrap text-on-surface-variant hidden sm:table-cell">${r._foto ? PB.num(r._foto) + ' foto' : '—'}</td>
      <td class="py-3 px-space-sm sm:px-space-md text-right"><div class="inline-flex flex-wrap justify-end items-center gap-1 max-w-[120px] sm:max-w-none sm:flex-nowrap">
        <a href="${/^https:\/\//.test(r.folder_drive) ? PB.esc(r.folder_drive) : '#'}" target="_blank" rel="noopener" title="Buka folder di Google Drive" class="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface"><span class="material-symbols-outlined text-[18px]">folder_open</span></a>
        <a href="../album?id=${encodeURIComponent(r.id)}" target="_blank" rel="noopener" title="Lihat album di web" class="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface"><span class="material-symbols-outlined text-[18px]">visibility</span></a>
        <button data-act="sync" data-id="${PB.esc(r.id)}" title="Baca ulang foto dari folder Drive" class="p-1.5 rounded hover:bg-surface-container text-secondary"><span class="material-symbols-outlined text-[18px]">sync</span></button>
        <button data-act="edit" data-id="${PB.esc(r.id)}" title="Edit" class="p-1.5 rounded hover:bg-surface-container text-secondary"><span class="material-symbols-outlined text-[18px]">edit</span></button>
        <button data-act="hapus" data-id="${PB.esc(r.id)}" title="Hapus album" class="p-1.5 rounded hover:bg-error-container text-tertiary"><span class="material-symbols-outlined text-[18px]">delete</span></button></div></td></tr>`).join('') || `<tr><td colspan="4" class="py-space-lg text-center text-on-surface-variant">Belum ada album. Tempel link folder Google Drive di formulir.</td></tr>`;
    $('#gl-pager').innerHTML = pagerHtml(pg, 'ALBUM', 'album');
  }
  // Simpan → server membaca folder Drive; respons membawa jumlah foto & status berbagi folder.
  function simpanAlbum(d, btn) {
    busy(btn, true); setErr('');
    return post({ action: 'save', sheet: 'ALBUM', data: d }).then(r => {
      if (!r.ok) throw new Error(r.error);
      upsertLocal('ALBUM', r.row); renderGaleri();
      PB.toast(`Album "${r.row.judul}" tersimpan${r.foto != null ? ` · ${r.foto} foto terbaca` : ''}.`, 'photo_library');
      if (r.publik === false) setErr('Folder Drive ini belum dibagikan ke publik, jadi fotonya tidak akan tampil di web. Buka folder → Bagikan → "Siapa saja yang memiliki link".');
      return r;
    }).catch(err => setErr(err.message)).finally(() => busy(btn, false));
  }
  $('#gl-batal').addEventListener('click', () => { fa.reset(); fa.elements.tanggal.value = PB.today(); $('#gl-batal').classList.add('hidden'); $('#gl-form-title').textContent = 'Album Baru dari Folder Drive'; });
  fa.addEventListener('submit', e => {
    e.preventDefault(); const d = formData(fa);
    if (!d.judul) return setErr('Judul album wajib diisi.');
    if (!folderOk(d.folder_drive)) return setErr('Tempel link folder Google Drive (https://drive.google.com/drive/folders/...).');
    simpanAlbum(d, $('#gl-simpan')).then(r => { if (r) $('#gl-batal').click(); });
  });
  $('#gl-rows').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const r = S.lists.ALBUM.rows.find(x => x.id === b.dataset.id); if (!r) return;
    const act = b.dataset.act;
    if (act === 'edit') { fillForm(fa, r); $('#gl-batal').classList.remove('hidden'); $('#gl-form-title').textContent = `Edit Album ${r.id}`; fa.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (act === 'sync') simpanAlbum({ id: r.id, folder_drive: r.folder_drive }, b);
    if (act === 'hapus' && confirm(`Hapus album "${r.judul}" dari web? Foto di Google Drive tidak ikut terhapus.`)) {
      post({ action: 'delete', sheet: 'ALBUM', id: r.id }).then(x => { if (!x.ok) throw new Error(x.error); removeLocal('ALBUM', r.id); renderGaleri(); PB.toast(`Album ${r.id} dihapus.`, 'delete'); }).catch(err => setErr(err.message));
    }
  });

  /* ---------- Agenda kegiatan (tab AGENDA; baris buatan Sheets ikut tampil & bisa diedit) ---------- */
  const fg = $('#form-agenda');
  const posterPrev = () => { const u = fotoUrl(fg.elements.poster_drive_id.value); $('#ag-preview').innerHTML = u ? PB.img(u, 'Pratinjau poster', 'w-full max-h-56 object-contain rounded-lg bg-surface-container') : ''; };
  function renderAgendaAdm() {
    const all = S.lists.AGENDA.rows.filter(r => r.nama_kegiatan).sort((a, b) => (b.tanggal_mulai || b.tahun || '').localeCompare(a.tanggal_mulai || a.tahun || '') || (b._row - a._row));
    $('#ag-count').textContent = `${PB.num(all.length)} agenda`;
    const thn = r => r.tahun || (r.tanggal_mulai || '').slice(0, 4);
    const selT = $('#ag-filter-tahun'), curT = selT.value;
    selT.innerHTML = '<option value="">Semua Tahun</option>' + [...new Set(all.map(thn).filter(Boolean))].sort().reverse().map(t => `<option>${PB.esc(t)}</option>`).join(''); selT.value = curT;
    // Pilihan album: tab ALBUM + nilai lama yang tidak ada di daftar (album dari tab GALERI)
    const selA = fg.elements.album_id, curA = selA.value, albums = ((S.lists.ALBUM || {}).rows || []);
    const lain = [...new Set(all.map(r => r.album_id).filter(v => v && !albums.some(a => a.id === v)))];
    selA.innerHTML = '<option value="">Tidak ada</option>' + albums.map(a => `<option value="${PB.esc(a.id)}">${PB.esc(a.judul)}</option>`).join('') + lain.map(v => `<option value="${PB.esc(v)}">${PB.esc(v)}</option>`).join(''); selA.value = curA;
    const q = $('#ag-cari').value.toLowerCase(), ft = selT.value, today = PB.today();
    const status = r => r.status || (!r.tanggal_mulai ? '' : today < r.tanggal_mulai ? 'Akan Datang' : today > (r.tanggal_selesai || r.tanggal_mulai) ? 'Selesai' : 'Berlangsung');
    const rows = all.filter(r => (!ft || thn(r) === ft) && (!q || `${r.nama_kegiatan} ${r.lokasi} ${r.kategori} ${r.id}`.toLowerCase().includes(q)));
    const pg = paginate(rows, 'AGENDA');
    const tgl = r => PB.fmtTanggal(r.tanggal_mulai, r.tanggal_selesai) || (thn(r) ? `Tahun ${thn(r)}` : '—');
    $('#ag-rows').innerHTML = pg.slice.map(r => `<tr class="hover:bg-surface-container-low/60 transition-colors ${isTrue(r.sembunyikan) ? 'opacity-60' : ''}">
      <td class="py-3 px-space-sm sm:px-space-md"><div class="font-semibold text-on-surface">${PB.esc(r.nama_kegiatan)}${isTrue(r.sembunyikan) ? ' <span class="font-label-sm text-on-surface-variant">(disembunyikan)</span>' : ''}</div>
        <div class="flex flex-wrap items-center gap-1.5 mt-1">${PB.chip(r.kategori)}${r.poster_drive_id ? '<span class="inline-flex items-center gap-0.5 font-label-sm text-label-sm text-secondary"><span class="material-symbols-outlined text-[14px]">image</span>poster</span>' : ''}${r.lokasi ? `<span class="font-label-sm text-label-sm text-on-surface-variant">${PB.esc(r.lokasi)}</span>` : ''}</div>
        <div class="sm:hidden font-label-sm text-label-sm text-on-surface-variant mt-1">${PB.esc(tgl(r))}${status(r) ? ' · ' + PB.esc(status(r)) : ''}</div></td>
      <td class="py-3 px-space-md whitespace-nowrap text-on-surface-variant hidden sm:table-cell">${PB.esc(tgl(r))}</td>
      <td class="py-3 px-space-md whitespace-nowrap hidden sm:table-cell">${PB.chip(status(r)) || '—'}</td>
      <td class="py-3 px-space-sm sm:px-space-md text-right"><div class="inline-flex items-center gap-1">
        <button data-act="edit" data-id="${PB.esc(r.id)}" title="Edit agenda" class="p-2 rounded hover:bg-surface-container text-secondary"><span class="material-symbols-outlined text-[18px]">edit</span></button>
        <button data-act="hapus" data-id="${PB.esc(r.id)}" title="Hapus agenda" class="p-2 rounded hover:bg-error-container text-tertiary"><span class="material-symbols-outlined text-[18px]">delete</span></button></div></td></tr>`).join('') || `<tr><td colspan="4" class="py-space-lg text-center text-on-surface-variant">${all.length ? 'Tidak ada agenda yang cocok.' : 'Belum ada agenda. Isi formulir, atau tulis langsung di tab AGENDA Google Sheets.'}</td></tr>`;
    $('#ag-pager').innerHTML = pagerHtml(pg, 'AGENDA', 'agenda');
  }
  fg.elements.poster_drive_id.addEventListener('input', posterPrev);
  ['#ag-cari', '#ag-filter-tahun'].forEach(s => $(s).addEventListener('input', () => { S.page.AGENDA = 1; renderAgendaAdm(); }));
  $('#ag-batal').addEventListener('click', () => { fg.reset(); posterPrev(); $('#ag-batal').classList.add('hidden'); $('#ag-form-title').textContent = 'Agenda Baru'; });
  fg.addEventListener('submit', e => {
    e.preventDefault(); const d = formData(fg);
    if (!d.nama_kegiatan) return setErr('Nama kegiatan wajib diisi.');
    if (d.tanggal_mulai && d.tanggal_selesai && d.tanggal_selesai < d.tanggal_mulai) return setErr('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    if (d.tanggal_mulai) d.tahun = d.tanggal_mulai.slice(0, 4);
    if (d.tahun && !/^\d{4}$/.test(d.tahun)) return setErr('Tahun harus 4 angka, mis. 2026.');
    busy($('#ag-simpan'), true); setErr('');
    post({ action: 'save', sheet: 'AGENDA', data: d }).then(r => {
      if (!r.ok) throw new Error(r.error);
      upsertLocal('AGENDA', r.row); PB.toast(`Agenda "${r.row.nama_kegiatan}" tersimpan dan tampil di web.`, 'event_available'); $('#ag-batal').click(); renderAgendaAdm();
    }).catch(err => setErr(err.message)).finally(() => busy($('#ag-simpan'), false));
  });
  $('#ag-rows').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const r = S.lists.AGENDA.rows.find(x => x.id === b.dataset.id);
    if (!r) return setErr('Agenda ini belum punya kode id. Klik "Muat Ulang dari Sheets" lalu coba lagi.');
    if (b.dataset.act === 'edit') { fillForm(fg, r); posterPrev(); $('#ag-batal').classList.remove('hidden'); $('#ag-form-title').textContent = `Edit Agenda ${r.id}`; fg.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    if (b.dataset.act === 'hapus' && confirm(`Hapus agenda "${r.nama_kegiatan}" dari Google Sheets? Tindakan ini tidak bisa dibatalkan.`)) {
      post({ action: 'delete', sheet: 'AGENDA', id: r.id }).then(x => { if (!x.ok) throw new Error(x.error); removeLocal('AGENDA', r.id); renderAgendaAdm(); PB.toast(`Agenda ${r.id} dihapus.`, 'delete'); }).catch(err => setErr(err.message));
    }
  });

  /* ---------- Isi & foto beranda (tab PROFIL, kunci–nilai) ---------- */
  const fkn = $('#form-konten');
  // [kunci, label, jenis ('' teks | area | area5 | num | url | tel), placeholder]
  const KONTEN = [
    ['Foto Beranda & Logo', 'image', [
      ['hero_foto_drive_id', 'Foto utama beranda (link file gambar Google Drive)', 'url', 'https://drive.google.com/file/d/...'],
      ['logo_drive_id', 'Logo (link file gambar Google Drive)', 'url', 'https://drive.google.com/file/d/...']]],
    ['Identitas & Sambutan', 'badge', [
      ['nama_organisasi', 'Nama organisasi', '', 'Rumah Baca Pelita Bangsa'],
      ['tagline', 'Tagline (judul besar; bagian setelah " di " terakhir diberi warna)', '', 'Nyalakan Lentera Literasi Generasi Muda di Pematang Siantar & Simalungun'],
      ['deskripsi_singkat', 'Deskripsi singkat', 'area', '1–2 kalimat tentang rumah baca'],
      ['tahun_berdiri', 'Tahun berdiri', 'num', '2021']]],
    ['Sejarah, Visi & Misi', 'history_edu', [
      ['sejarah_judul', 'Judul sejarah', '', 'Dimulai dari Teras Rumah dan Tumpukan Buku'],
      ['sejarah', 'Sejarah (baris kosong = paragraf baru)', 'area5', ''],
      ['visi', 'Visi', 'area', ''],
      ['misi_1', 'Misi 1 — tulis: Judul — deskripsi', '', 'Literasi Baca-Tulis — Penyediaan buku dan bimbingan membaca'],
      ['misi_2', 'Misi 2', '', ''], ['misi_3', 'Misi 3', '', '']]],
    ['Kontak & Alamat', 'call', [
      ['alamat', 'Alamat', 'area', ''], ['jam_operasional', 'Jam operasional', '', 'Selasa – Minggu, 10:00 – 17:30 WIB'],
      ['whatsapp', 'Nomor WhatsApp', 'tel', '08123456789'], ['email', 'Email', '', 'kontak@contoh.org'],
      ['rekening', 'Rekening donasi (kosong = tidak tampil)', 'area', 'Bank …: 123-xxx (a.n. …)'],
      ['maps_embed', 'Link embed Google Maps (kosong = peta tidak tampil)', 'url', 'https://www.google.com/maps/embed?...']]],
    ['Media Sosial', 'share', [
      ['instagram', 'Instagram', 'url', 'https://instagram.com/...'], ['facebook', 'Facebook', 'url', 'https://facebook.com/...'],
      ['youtube', 'YouTube', 'url', 'https://youtube.com/...'], ['tiktok', 'TikTok', 'url', 'https://tiktok.com/@...']]],
    ['Angka Statistik Beranda', 'monitoring', [
      ['stat_koleksi_buku', 'Koleksi buku (kosong = dihitung dari Katalog Buku)', 'num', ''],
      ['stat_anak_terbina', 'Anak terbina', 'num', ''], ['stat_relawan', 'Relawan aktif', 'num', '']]]
  ];
  const KT_CLS = 'w-full px-space-md py-2.5 rounded-lg bg-surface-container-low border-0 text-on-surface font-body-md focus:ring-2 focus:ring-secondary';
  $('#kt-fields').innerHTML = KONTEN.map(([judul, ikon, fields]) => `<fieldset class="bg-surface-container-lowest rounded-xl p-space-md lg:p-space-lg shadow-sm">
    <legend class="sr-only">${judul}</legend>
    <div class="flex items-center gap-2 mb-space-md"><span class="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center"><span class="material-symbols-outlined text-[20px]">${ikon}</span></span><h2 class="font-headline-sm text-headline-sm text-on-surface">${judul}</h2></div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-space-md">${fields.map(([k, label, jenis, ph]) => `<div class="${/area|url/.test(jenis) || /tagline|misi|sejarah_judul/.test(k) ? 'md:col-span-2' : ''}"><label class="block font-label-lg text-label-lg text-on-surface mb-1.5" for="kt-${k}">${PB.esc(label)}</label>${/area/.test(jenis)
      ? `<textarea id="kt-${k}" name="${k}" rows="${jenis === 'area5' ? 6 : 2}" maxlength="5000" class="${KT_CLS} resize-y" placeholder="${PB.esc(ph)}"></textarea>`
      : `<input id="kt-${k}" name="${k}" ${jenis === 'num' ? 'inputmode="numeric"' : jenis === 'tel' ? 'type="tel" inputmode="tel"' : jenis === 'url' ? 'inputmode="url" autocapitalize="none" spellcheck="false"' : ''} maxlength="${jenis === 'url' ? 1000 : 300}" class="${KT_CLS}" placeholder="${PB.esc(ph)}">`}</div>`).join('')}</div></fieldset>`).join('');
  const KT_KEYS = KONTEN.flatMap(g => g[2].map(f => f[0]));
  const kontenPrev = () => {
    const h = fotoUrl(fkn.elements.hero_foto_drive_id.value), l = fotoUrl(fkn.elements.logo_drive_id.value);
    $('#kt-prev-hero').innerHTML = PB.img(h, 'Pratinjau foto utama', 'w-full h-full object-cover');
    $('#kt-prev-logo').innerHTML = PB.img(l || PB.BASE + 'assets/img/logo.png', 'Pratinjau logo', 'w-full h-full object-cover');
  };
  const kontenNilai = () => { const o = {}; S.lists.PROFIL.rows.forEach(r => { if (r.kunci) o[r.kunci] = r.nilai || ''; }); return o; };
  function renderKonten() {
    const v = kontenNilai();
    KT_KEYS.forEach(k => { fkn.elements[k].value = v[k] || ''; });
    kontenPrev();
  }
  ['hero_foto_drive_id', 'logo_drive_id'].forEach(k => fkn.elements[k].addEventListener('input', kontenPrev));
  fkn.addEventListener('submit', e => {
    e.preventDefault();
    const lama = kontenNilai(), d = {};
    KT_KEYS.forEach(k => { const v = fkn.elements[k].value.trim(); if (v !== (lama[k] || '')) d[k] = v; });
    const keys = Object.keys(d);
    if (!keys.length) return PB.toast('Tidak ada perubahan untuk disimpan.', 'info');
    const salah = keys.find(k => /^(stat_|tahun_berdiri)/.test(k) && d[k] && !/^\d{1,7}$/.test(d[k]));
    if (salah) { fkn.elements[salah].focus(); return setErr('Isian angka hanya boleh berisi angka (tanpa titik atau huruf).'); }
    const link = keys.find(k => /^(instagram|facebook|youtube|tiktok|maps_embed)$/.test(k) && d[k] && !/^https:\/\//i.test(d[k]));
    if (link) { fkn.elements[link].focus(); return setErr('Link harus diawali https://'); }
    busy($('#kt-simpan'), true); setErr('');
    post({ action: 'profil_save', data: d }).then(r => {
      if (!r.ok) throw new Error(r.error);
      const L = S.lists.PROFIL;
      Object.keys(r.profil).forEach(k => { const row = L.rows.find(x => x.kunci === k); if (row) row.nilai = r.profil[k]; else L.rows.push({ kunci: k, nilai: r.profil[k] }); });
      S.profil = null; S.stats = null;
      try { localStorage.removeItem(PB.CONFIG.CACHE_KEY); } catch (_) {}
      renderKonten();
      PB.toast(`${keys.length} isian beranda tersimpan dan tampil di web.`, 'done_all');
    }).catch(err => setErr(err.message)).finally(() => busy($('#kt-simpan'), false));
  });

  /* ---------- Katalog Buku ---------- */
  const fk = $('#form-buku');
  const ZONA = { A: 'Anak Usia Dini & Dongeng', B: 'Budaya & Komik', C: 'Sains, Flora & Fauna', D: 'Kamus & Ensiklopedia' };
  const ZCLS = { A: ['bg-primary-fixed/40 hover:bg-primary-fixed', 'text-primary'], B: ['bg-tertiary-fixed/40 hover:bg-tertiary-fixed', 'text-tertiary'], C: ['bg-secondary-fixed/40 hover:bg-secondary-fixed', 'text-secondary'] };
  const zonaOf = r => (String(r.rak || '').replace(/^rak\s*/i, '').charAt(0) || '-').toUpperCase();
  function renderBuku() {
    const rows = S.lists.BUKU.rows;
    let total = 0, pinjam = 0, menipis = 0; const kat = new Set(), rak = new Set();
    rows.forEach(r => { const j = n(r.jumlah) || 1, p = Math.min(n(r.dipinjam), j); total += j; pinjam += p; if (j - p <= 2) menipis++; if (r.kategori) kat.add(r.kategori); if (r.rak) rak.add(r.rak); });
    const stat = (l, v, s, c, i, b, bar) => `<div class="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between relative overflow-hidden"><div class="absolute -right-4 -bottom-4 w-24 h-24 ${b}/30 rounded-full blur-xl pointer-events-none"></div><div class="flex items-center justify-between mb-2"><span class="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">${l}</span><div class="w-9 h-9 rounded-lg ${b} flex items-center justify-center ${c}"><span class="material-symbols-outlined text-headline-sm">${i}</span></div></div><div><div class="flex items-baseline gap-2"><span class="font-headline-xl text-headline-xl ${c} leading-none">${v}</span><span class="font-label-md text-label-md text-on-surface-variant">${s}</span></div>${bar != null ? `<div class="w-full bg-surface-container h-1.5 rounded-full mt-3 overflow-hidden"><div class="${c.replace('text-', 'bg-')} h-full rounded-full" style="width:${bar}%"></div></div>` : ''}</div></div>`;
    const pct = total ? Math.round((total - pinjam) / total * 100) : 0;
    $('#bk-kpi').innerHTML = stat('Total Koleksi', PB.num(total), `${rows.length} judul · ${kat.size} kategori`, 'text-primary', 'collections_bookmark', 'bg-primary-fixed') + stat('Tersedia di Rak', PB.num(total - pinjam), `${pct}% siap baca`, 'text-secondary', 'local_library', 'bg-secondary-fixed', pct) + stat('Dipinjam', PB.num(pinjam), 'sirkulasi aktif', 'text-tertiary', 'front_hand', 'bg-tertiary-fixed') + stat('Stok Menipis', PB.num(menipis), 'judul sisa ≤ 2', 'text-on-surface', 'warning', 'bg-surface-container-highest');
    const fillSel = (id, vals) => { const s = $(id), cur = s.value; s.innerHTML = `<option value="">${s.options[0].text}</option>` + [...vals].sort().map(v => `<option>${PB.esc(v)}</option>`).join(''); s.value = cur; };
    fillSel('#bk-filter-kategori', kat); fillSel('#bk-filter-rak', rak);
    $('#bk-rak-list').innerHTML = [...rak].sort().map(v => `<option value="${PB.esc(v)}">`).join('');
    const q = $('#bk-cari').value.toLowerCase(), fk1 = $('#bk-filter-kategori').value, fr = $('#bk-filter-rak').value, fs = $('#bk-filter-status').value;
    const filt = rows.filter(r => { const j = n(r.jumlah) || 1, sisa = j - Math.min(n(r.dipinjam), j);
      return (!q || `${r.judul} ${r.penulis} ${r.isbn} ${r.rak} ${r.id}`.toLowerCase().includes(q)) && (!fk1 || r.kategori === fk1) && (!fr || r.rak === fr) && (!S.zona || zonaOf(r) === S.zona) && (!fs || (fs === 'habis' ? sisa === 0 : fs === 'menipis' ? sisa > 0 && sisa <= 2 : sisa > 2)); });
    const pg = paginate(filt, 'BUKU');
    $('#bk-count').textContent = `Menampilkan ${pg.slice.length} dari ${PB.num(rows.length)} data`;
    $('#bk-rows').innerHTML = pg.slice.map((r, i) => { const j = n(r.jumlah) || 1, p = Math.min(n(r.dipinjam), j), sisa = j - p, warn = sisa <= 2; return `<tr class="${i % 2 ? 'bg-surface-container-lowest/70' : ''} hover:bg-surface-container-low transition-colors ${isTrue(r.sembunyikan) ? 'opacity-60' : ''}">
      <td class="py-3.5 px-4 text-center font-label-sm text-on-surface-variant">${String((pg.page - 1) * PER_PAGE + i + 1).padStart(2, '0')}</td>
      <td class="py-3.5 px-4 font-mono font-label-sm text-on-surface-variant">${PB.esc(r.isbn || r.id)}</td>
      <td class="py-3.5 px-4 min-w-[200px]"><div class="font-headline-sm text-headline-sm text-on-surface text-base">${PB.esc(r.judul)}</div><div class="font-label-sm text-label-sm text-on-surface-variant">${r.penulis ? 'Oleh: ' + PB.esc(r.penulis) : ''}${r.penerbit_tahun ? ' • ' + PB.esc(r.penerbit_tahun) : ''}</div></td>
      <td class="py-3.5 px-4">${PB.chip(r.kategori)}</td>
      <td class="py-3.5 px-4"><div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-body-md text-on-surface-variant">shelves</span><span class="font-label-md text-label-md text-on-surface">${PB.esc(r.rak || '—')}</span></div></td>
      <td class="py-3.5 px-4"><div class="flex flex-col gap-1"><div class="flex items-center justify-between text-label-sm font-label-sm"><span class="${warn ? 'text-tertiary' : 'text-primary'} font-semibold">${sisa} dari ${j} di Rak</span><span class="text-on-surface-variant">${p} Dipinjam</span></div><div class="w-full bg-surface-container h-1.5 rounded-full overflow-hidden"><div class="${warn ? 'bg-tertiary' : 'bg-primary'} h-full rounded-full" style="width:${Math.round(sisa / j * 100)}%"></div></div></div></td>
      <td class="py-3.5 px-4 text-center"><div class="flex items-center justify-center gap-1">
        <button data-act="pinjam" data-id="${PB.esc(r.id)}" ${sisa ? '' : 'disabled'} class="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary-fixed transition-colors disabled:opacity-40" title="Catat peminjaman (+1)"><span class="material-symbols-outlined text-body-md">front_hand</span></button>
        <button data-act="kembali" data-id="${PB.esc(r.id)}" ${p ? '' : 'disabled'} class="p-1.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed transition-colors disabled:opacity-40" title="Catat pengembalian (-1)"><span class="material-symbols-outlined text-body-md">assignment_returned</span></button>
        <button data-act="edit" data-id="${PB.esc(r.id)}" class="p-1.5 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed transition-colors" title="Edit"><span class="material-symbols-outlined text-body-md">edit_note</span></button>
        <button data-act="hapus" data-id="${PB.esc(r.id)}" class="p-1.5 rounded-lg text-on-surface-variant hover:text-tertiary hover:bg-tertiary-fixed transition-colors" title="Hapus baris"><span class="material-symbols-outlined text-body-md">delete</span></button></div></td></tr>`; }).join('') || `<tr><td colspan="7" class="py-space-lg text-center text-on-surface-variant">${rows.length ? 'Tidak ada buku yang cocok dengan filter.' : 'Katalog masih kosong. Tambahkan buku lewat formulir di bawah.'}</td></tr>`;
    $('#bk-pager').innerHTML = pagerHtml(pg, 'BUKU', 'buku');
    const z = {}; rows.forEach(r => { const k = zonaOf(r), j = n(r.jumlah) || 1; z[k] = z[k] || { total: 0, siap: 0 }; z[k].total += j; z[k].siap += j - Math.min(n(r.dipinjam), j); });
    $('#bk-zona').innerHTML = Object.keys(z).sort().map(k => { const c = ZCLS[k] || ['bg-surface-container-high hover:bg-surface-container-highest', 'text-on-surface']; return `<button data-zona="${k}" class="p-3 rounded-lg ${c[0]} transition-colors text-left ${S.zona === k ? 'ring-2 ring-primary' : ''}"><div class="flex items-start justify-between gap-2 mb-1"><span class="font-label-lg text-label-lg ${c[1]} font-bold whitespace-nowrap">ZONA ${k}</span><span class="font-label-sm text-label-sm text-on-surface-variant text-right">${PB.esc(ZONA[k] || 'Rak ' + k)}</span></div><div class="flex justify-between items-center text-label-sm text-on-surface-variant mt-2"><span>${PB.num(z[k].total)} Buku</span><span class="${c[1]} font-semibold">${PB.num(z[k].siap)} Siap</span></div></button>`; }).join('') || '<p class="col-span-2 font-body-sm text-body-sm text-on-surface-variant">Belum ada data rak.</p>';
    $('#bk-diag').innerHTML = [['Baris terisi di tab BUKU', PB.num(rows.length)], ['Dimuat', PB.lalu(localStamp(S.loadedAt.BUKU))], ['Spreadsheet', ssNama()], ['Hak tulis panel', S.lists.BUKU.writable ? 'Aktif' : 'Hanya baca']].map(([a, b]) => `<div class="flex items-center justify-between"><span>${a}</span><span class="font-label-sm text-on-surface font-semibold">${PB.esc(b)}</span></div>`).join('');
  }
  ['#bk-cari', '#bk-filter-kategori', '#bk-filter-rak', '#bk-filter-status'].forEach(s => $(s).addEventListener('input', () => { S.page.BUKU = 1; renderBuku(); }));
  $('#bk-reset').addEventListener('click', () => { ['#bk-cari', '#bk-filter-kategori', '#bk-filter-rak', '#bk-filter-status'].forEach(s => { $(s).value = ''; }); S.zona = ''; S.page.BUKU = 1; renderBuku(); });
  $('#bk-zona').addEventListener('click', e => { const b = e.target.closest('[data-zona]'); if (!b) return; S.zona = S.zona === b.dataset.zona ? '' : b.dataset.zona; S.page.BUKU = 1; renderBuku(); });
  $('#bk-tambah').addEventListener('click', () => { $('#bk-batal').click(); fk.scrollIntoView({ behavior: 'smooth', block: 'start' }); fk.elements.judul.focus(); });
  $('#bk-batal').addEventListener('click', () => { fk.reset(); $('#bk-batal').classList.add('hidden'); $('#bk-form-title').textContent = 'Entri Buku Baru ke Google Sheets'; });
  fk.addEventListener('submit', e => {
    e.preventDefault(); const d = formData(fk);
    if (!d.judul) return setErr('Judul buku wajib diisi.');
    if (n(d.dipinjam) > n(d.jumlah)) return setErr('Jumlah dipinjam tidak boleh melebihi jumlah eksemplar.');
    busy($('#bk-simpan'), true); setErr('');
    post({ action: 'save', sheet: 'BUKU', data: d }).then(r => { if (!r.ok) throw new Error(r.error); upsertLocal('BUKU', r.row); PB.toast(`Buku ${r.row.id} tersimpan ke tab BUKU.`); $('#bk-batal').click(); renderBuku(); })
      .catch(err => setErr(err.message)).finally(() => busy($('#bk-simpan'), false));
  });
  $('#bk-rows').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const r = S.lists.BUKU.rows.find(x => x.id === b.dataset.id); if (!r) return;
    const act = b.dataset.act;
    if (act === 'edit') { fillForm(fk, r); $('#bk-batal').classList.remove('hidden'); $('#bk-form-title').textContent = `Edit Buku ${r.id}`; fk.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (act === 'hapus') { if (!confirm(`Hapus "${r.judul}" dari tab BUKU?`)) return; return post({ action: 'delete', sheet: 'BUKU', id: r.id }).then(x => { if (!x.ok) throw new Error(x.error); removeLocal('BUKU', r.id); renderBuku(); PB.toast(`Baris ${r.id} dihapus.`, 'delete'); }).catch(err => setErr(err.message)); }
    const dipinjam = Math.max(0, Math.min(n(r.jumlah) || 1, n(r.dipinjam) + (act === 'pinjam' ? 1 : -1)));
    post({ action: 'save', sheet: 'BUKU', data: { id: r.id, dipinjam: String(dipinjam) } }).then(x => { if (!x.ok) throw new Error(x.error); upsertLocal('BUKU', x.row); renderBuku(); PB.toast(act === 'pinjam' ? `Peminjaman dicatat: "${r.judul}"` : `Pengembalian dicatat: "${r.judul}"`, act === 'pinjam' ? 'front_hand' : 'assignment_returned'); }).catch(err => setErr(err.message));
  });

  /* ---------- Donatur & Relawan ---------- */
  const fd = $('#form-donasi');
  const NEXT = { 'Baru': 'Dikonfirmasi', 'Dikonfirmasi': 'Dalam Pengiriman', 'Dalam Pengiriman': 'Diterima', 'Diterima': 'Terkatalog' };
  const isRelawan = r => /relawan/i.test(r.jenis || '');
  const waTpl = (r, k) => {
    const org = 'Rumah Baca Pelita Bangsa', nama = r.nama || 'Bapak/Ibu', jml = r.jumlah ? `${r.jumlah} ${/buku/i.test(r.jenis) ? 'buku' : 'paket'}` : (r.jenis || 'dukungan');
    return {
      konfirmasi: `Halo ${nama}, terima kasih sudah mengisi formulir ${r.jenis || 'partisipasi'} untuk ${org}. Kami ingin mengonfirmasi rencana ${isRelawan(r) ? 'bergabung sebagai relawan' : 'pengiriman ' + jml}. Kapan waktu yang nyaman untuk kami hubungi? 🙏`,
      resi: `Halo ${nama}, ini kabar dari ${org}. ${r.resi ? `Paket ${jml} tercatat dengan resi ${r.resi}${r.logistik ? ' (' + r.logistik + ')' : ''}.` : `Paket ${jml} akan kami jemput/terima sesuai kesepakatan${r.logistik ? ' via ' + r.logistik : ''}.`} Kami kabari lagi begitu paket tiba. Mauliate! 📚`,
      terimakasih: `Mauliate, ${nama}! ${isRelawan(r) ? `Selamat bergabung sebagai relawan ${org}. Kami tunggu di jadwal orientasi berikutnya.` : `Donasi ${jml} dari Anda sudah kami terima dan dicatat untuk adik-adik binaan ${org}.`} Semoga kebaikan ini menyala terus di Pematang Siantar – Simalungun. 🙏📖`
    }[k];
  };
  function renderDonatur() {
    const rows = S.lists.DONASI.rows.slice().sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || '') || (b._row - a._row));
    $('#dn-count-badge').textContent = `${PB.num(rows.length)} baris`;
    const donatur = new Set(rows.filter(r => !isRelawan(r) && r.status !== 'Dibatalkan').map(r => (r.nama || '').toLowerCase())).size;
    const buku = rows.filter(r => /buku/i.test(r.jenis || '') && /^(Diterima|Terkatalog)$/.test(r.status || '')).reduce((a, r) => a + n(r.jumlah), 0);
    const pendaftar = rows.filter(isRelawan).length;
    const card = (l, v, u, s, c, i, b) => `<div class="relative overflow-hidden rounded-xl bg-surface-container-lowest p-space-md lg:p-space-lg shadow-sm flex flex-col justify-between"><div class="flex items-start justify-between"><div><span class="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">${l}</span><div class="flex items-baseline gap-2 mt-1"><span class="font-headline-xl text-headline-xl ${c} font-extrabold tracking-tight">${v}</span><span class="font-label-lg text-label-lg text-on-surface">${u}</span></div></div><div class="w-12 h-12 rounded-xl ${b} flex items-center justify-center"><span class="material-symbols-outlined text-headline-md icon-fill">${i}</span></div></div><div class="mt-4 pt-3 bg-surface-container-low/60 rounded-lg p-2.5"><p class="font-body-sm text-body-sm text-on-surface-variant justify">${s}</p></div></div>`;
    $('#dn-kpi').innerHTML = card('Total Terdaftar', PB.num(donatur), 'Donatur', `${rows.filter(r => r.status === 'Baru').length} formulir baru menunggu konfirmasi dari web maupun pencatatan manual.`, 'text-primary', 'favorite', 'bg-primary-fixed text-on-primary-fixed') + card('Logistik Literasi', PB.num(buku), 'Buku', 'Eksemplar yang sudah diterima atau terkatalog dari seluruh donasi buku.', 'text-secondary', 'menu_book', 'bg-secondary-fixed text-on-secondary-fixed') + card('Kekuatan Pengajar', PB.num((S.stats || {}).relawan || 0), 'Relawan', `${pendaftar} pendaftar relawan lewat formulir web menunggu orientasi.`, 'text-tertiary', 'groups_3', 'bg-tertiary-fixed text-on-tertiary-fixed');
    $$('#dn-tabs [data-tab]').forEach(b => { b.className = `flex items-center gap-2 px-space-md py-2 rounded-lg font-label-lg text-label-lg transition-all ${b.dataset.tab === S.dnTab ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`; });
    $('#dn-table-title').textContent = S.dnTab === 'relawan' ? 'Pendaftar Relawan Mengajar' : 'Riwayat Penerimaan Donasi Masuk';
    const q = $('#dn-cari').value.toLowerCase(), st = $('#dn-filter-status').value;
    const filt = rows.filter(r => (S.dnTab === 'relawan') === isRelawan(r) && (!st || r.status === st) && (!q || `${r.nama} ${r.asal} ${r.logistik} ${r.resi} ${r.kategori_buku} ${r.whatsapp} ${r.id}`.toLowerCase().includes(q)));
    const pg = paginate(filt, 'DONASI');
    $('#dn-count').textContent = `Menampilkan ${pg.slice.length} dari ${PB.num(filt.length)}`;
    $('#dn-rows').innerHTML = pg.slice.map((r, i) => `<tr class="${i % 2 ? 'bg-surface-container-low/30' : ''} hover:bg-surface-container-low/60 transition-colors">
      <td class="py-space-md px-space-md lg:px-space-lg align-top min-w-[220px]"><div class="flex flex-col"><span class="font-label-lg text-label-lg text-on-surface">${PB.esc(r.nama)}</span><a href="${PB.wa(r.whatsapp)}" target="_blank" rel="noopener" class="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1 mt-0.5 hover:text-secondary"><span class="material-symbols-outlined text-label-sm text-secondary">chat</span>${PB.esc(PB.waTampil(r.whatsapp))}</a>${r.catatan ? `<p class="font-body-sm text-body-sm text-on-surface-variant justify mt-1.5 max-w-xs clamp-3">Catatan: ${PB.esc(r.catatan)}</p>` : ''}<span class="font-label-sm text-label-sm text-outline mt-1 font-mono">${PB.esc(r.id)} · ${PB.esc(r.sumber || 'admin')}</span></div></td>
      <td class="py-space-md px-space-md align-top"><div class="flex flex-col"><span class="font-label-md text-label-md text-on-surface">${PB.esc(r.asal || '—')}</span></div></td>
      <td class="py-space-md px-space-md align-top"><div class="flex flex-col gap-1"><span class="font-label-lg text-label-lg text-primary">${r.jumlah ? PB.num(r.jumlah) + (/buku/i.test(r.jenis) ? ' Eksemplar' : ' Paket') : PB.esc(r.jenis || '—')}</span>${r.kategori_buku ? PB.chip(r.kategori_buku, 'w-max') : ''}${r.jumlah ? `<span class="font-label-sm text-label-sm text-on-surface-variant">${PB.esc(r.jenis)}</span>` : ''}</div></td>
      <td class="py-space-md px-space-md align-top"><div class="flex flex-col"><span class="font-label-md text-label-md text-on-surface">${PB.esc(PB.fmtTgl(r.tanggal))}</span><span class="font-label-sm text-label-sm text-on-surface-variant">${PB.esc(r.logistik || '—')}${r.resi ? ` (Resi: ${PB.esc(r.resi)})` : ''}</span></div></td>
      <td class="py-space-md px-space-md align-top"><div class="flex flex-col gap-1">${PB.chip(r.status || 'Baru', 'w-max')}<span class="font-label-sm text-label-sm ${r.apresiasi === 'Terkirim' ? 'text-on-surface-variant' : 'text-tertiary'} flex items-center gap-1"><span class="material-symbols-outlined text-label-sm ${r.apresiasi === 'Terkirim' ? 'text-primary' : ''}">${r.apresiasi === 'Terkirim' ? 'mark_email_read' : 'schedule'}</span>${r.apresiasi === 'Terkirim' ? 'Ucapan terkirim' : 'Belum ada ucapan'}</span></div></td>
      <td class="py-space-md px-space-md lg:px-space-lg align-top text-right"><div class="flex items-center justify-end gap-1.5 relative">
        <div class="relative"><button data-act="wa" data-id="${PB.esc(r.id)}" class="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors" title="Kirim pesan WhatsApp"><span class="material-symbols-outlined text-body-md text-secondary">send</span></button>
          <div data-wa-menu class="hidden absolute right-0 top-full mt-1 z-20 w-56 bg-surface-container-lowest rounded-lg shadow-xl p-1 text-left">${[['konfirmasi', 'Konfirmasi formulir', 'chat'], ['resi', 'Info resi / penjemputan', 'local_shipping'], ['terimakasih', 'Ucapan terima kasih', 'favorite']].map(([k, l, ic]) => `<a href="${PB.wa(r.whatsapp, waTpl(r, k))}" target="_blank" rel="noopener" data-wa="${k}" data-id="${PB.esc(r.id)}" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-container-low font-label-md text-label-md text-on-surface"><span class="material-symbols-outlined text-[18px] text-secondary">${ic}</span>${l}</a>`).join('')}</div></div>
        ${NEXT[r.status || 'Baru'] ? `<button data-act="next" data-id="${PB.esc(r.id)}" class="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors" title="Ubah status → ${NEXT[r.status || 'Baru']}"><span class="material-symbols-outlined text-body-md text-primary">check_circle</span></button>` : ''}
        <button data-act="edit" data-id="${PB.esc(r.id)}" class="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors" title="Detail / edit"><span class="material-symbols-outlined text-body-md">edit</span></button>
        <button data-act="hapus" data-id="${PB.esc(r.id)}" class="p-1.5 rounded-lg bg-surface-container-high hover:bg-tertiary-fixed text-on-surface transition-colors" title="Hapus"><span class="material-symbols-outlined text-body-md text-tertiary">delete</span></button></div></td></tr>`).join('') || `<tr><td colspan="6" class="py-space-lg text-center text-on-surface-variant">${rows.length ? 'Tidak ada data yang cocok.' : 'Belum ada donasi tercatat. Formulir di web publik akan masuk ke sini otomatis.'}</td></tr>`;
    $('#dn-pager').innerHTML = pagerHtml(pg, 'DONASI', 'baris');
  }
  $('#dn-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { S.dnTab = b.dataset.tab; S.page.DONASI = 1; renderDonatur(); } });
  ['#dn-cari', '#dn-filter-status'].forEach(s => $(s).addEventListener('input', () => { S.page.DONASI = 1; renderDonatur(); }));
  $('#dn-tambah').addEventListener('click', () => { fillForm(fd, { tanggal: PB.today(), status: 'Baru', apresiasi: 'Belum', sumber: 'admin' }); $('#dn-form-title').textContent = 'Pencatatan Donasi Masuk Baru'; openModal('#modal-donasi'); });
  fd.addEventListener('submit', e => {
    e.preventDefault(); const d = formData(fd);
    if (!d.nama) return PB.toast('Nama donatur wajib diisi.', 'error');
    if (String(d.whatsapp).replace(/\D/g, '').length < 10) return PB.toast('Nomor WhatsApp belum benar.', 'error');
    busy($('#dn-simpan'), true);
    post({ action: 'save', sheet: 'DONASI', data: d }).then(r => { if (!r.ok) throw new Error(r.error); upsertLocal('DONASI', r.row); closeModal('#modal-donasi'); renderDonatur(); PB.toast(`Donasi ${r.row.id} tersimpan ke tab DONASI.`); })
      .catch(err => PB.toast(err.message, 'error')).finally(() => busy($('#dn-simpan'), false));
  });
  document.addEventListener('click', e => { if (!e.target.closest('[data-act=wa]')) $$('[data-wa-menu]').forEach(m => m.classList.add('hidden')); });
  $('#dn-rows').addEventListener('click', e => {
    const wa = e.target.closest('[data-wa]');
    if (wa) { const r = S.lists.DONASI.rows.find(x => x.id === wa.dataset.id); if (wa.dataset.wa === 'terimakasih' && r && r.apresiasi !== 'Terkirim') setTimeout(() => { if (confirm('Tandai ucapan terima kasih sebagai terkirim?')) post({ action: 'save', sheet: 'DONASI', data: { id: r.id, apresiasi: 'Terkirim' } }).then(x => { if (x.ok) { upsertLocal('DONASI', x.row); renderDonatur(); } }); }, 800); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const r = S.lists.DONASI.rows.find(x => x.id === b.dataset.id); if (!r) return;
    const act = b.dataset.act;
    if (act === 'wa') { const m = b.parentNode.querySelector('[data-wa-menu]'); const open = m.classList.contains('hidden'); $$('[data-wa-menu]').forEach(x => x.classList.add('hidden')); if (open) m.classList.remove('hidden'); return; }
    if (act === 'edit') { fillForm(fd, r); $('#dn-form-title').textContent = `Detail Pencatatan ${r.id}`; openModal('#modal-donasi'); return; }
    if (act === 'hapus') { if (!confirm(`Hapus catatan donasi ${r.nama} (${r.id})?`)) return; return post({ action: 'delete', sheet: 'DONASI', id: r.id }).then(x => { if (!x.ok) throw new Error(x.error); removeLocal('DONASI', r.id); renderDonatur(); PB.toast(`Baris ${r.id} dihapus.`, 'delete'); }).catch(err => setErr(err.message)); }
    if (act === 'next') { const ns = NEXT[r.status || 'Baru']; post({ action: 'save', sheet: 'DONASI', data: { id: r.id, status: ns } }).then(x => { if (!x.ok) throw new Error(x.error); upsertLocal('DONASI', x.row); renderDonatur(); PB.toast(`Status ${r.nama} → ${ns}`, 'check_circle'); }).catch(err => setErr(err.message)); }
  });

  /* ---------- Konfigurasi ---------- */
  function renderSpark() {
    const p = S.pings; const max = Math.max(1, ...p);
    $('#kf-spark').innerHTML = p.map((v, i) => `<div class="flex-1 ${i === p.length - 1 ? 'bg-primary' : 'bg-secondary/30 hover:bg-secondary'} rounded-t transition-all" style="height:${Math.max(8, Math.round(v / max * 100))}%" title="${v} ms"></div>`).join('') || '<div class="flex-1 text-label-sm text-on-surface-variant self-center">Klik "Test API Ping" untuk mulai mengukur.</div>';
    $('#kf-lat-avg').textContent = p.length ? `Rata-rata: ${Math.round(p.reduce((a, b) => a + b, 0) / p.length)} ms (${p.length} pengukuran)` : 'Belum ada data';
  }
  function renderKonfigurasi() {
    const c = S.config;
    const param = (ic, col, l, v, right) => `<div class="bg-surface-container-low p-space-md rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-space-sm"><div class="flex items-center gap-3 min-w-0"><span class="material-symbols-outlined ${col}">${ic}</span><div class="min-w-0"><span class="block font-label-sm text-label-sm text-on-surface-variant uppercase">${l}</span><code class="font-mono font-label-md text-label-md text-on-surface truncate block">${PB.esc(v || '—')}</code></div></div>${right || ''}</div>`;
    const copyBtn = (v, l) => `<button data-copy="${PB.esc(v)}" class="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-sm text-label-sm rounded-lg transition-colors shadow-sm"><span class="material-symbols-outlined text-body-sm">content_copy</span> ${l}</button>`;
    $('#kf-param').innerHTML = param('description', 'text-primary', 'Nama Spreadsheet', c.spreadsheet.nama, `<div class="flex items-center gap-2"><span class="px-2.5 py-0.5 rounded font-label-sm text-label-sm bg-surface-container-highest text-on-surface">Sheet Utama</span><a class="p-1.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary transition-colors" href="${PB.esc(c.spreadsheet.url)}" target="_blank" rel="noopener" title="Buka Spreadsheet"><span class="material-symbols-outlined text-body-md">launch</span></a></div>`)
      + param('vpn_key', 'text-secondary', 'Spreadsheet ID', c.spreadsheet.id, copyBtn(c.spreadsheet.id, 'Salin ID'))
      + param('webhook', 'text-tertiary', 'URL Web App Apps Script (API)', c.api.url || PB.CONFIG.API_URL, copyBtn(c.api.url || PB.CONFIG.API_URL, 'Salin URL'))
      + param('admin_panel_settings', 'text-primary', 'Akun pemilik script (Execute as)', c.user.email || '(tidak tersedia)', '<span class="shrink-0 px-2.5 py-1 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm">Editor Spreadsheet</span>');
    $$('[data-copy]').forEach(b => b.addEventListener('click', () => copyText(b.dataset.copy, b)));
    const pw = $('#kf-pw-badge'); pw.textContent = c.passwordDiatur ? 'Password admin aktif' : 'Password admin BELUM diatur'; pw.className = `font-label-sm text-label-sm px-2.5 py-1 rounded-full ${c.passwordDiatur ? 'bg-secondary-fixed text-secondary' : 'bg-tertiary-fixed text-tertiary'}`;
    $('#kf-tab-count').textContent = `${c.tabs.filter(t => t.ada).length} / ${c.tabs.length} tab`;
    const ICON = { PROFIL: 'badge', PENGURUS: 'groups', RELAWAN: 'diversity_1', AGENDA: 'event', GALERI: 'photo_library', BUKU: 'menu_book', BERITA: 'article', DONASI: 'volunteer_activism', ALBUM: 'add_to_drive', ADMIN: 'manage_accounts', LOG: 'receipt_long' };
    $('#kf-tabs').innerHTML = c.tabs.map((t, i) => `<div class="p-space-md rounded-xl bg-surface-container-low"><div class="flex items-start justify-between gap-2 mb-2"><div class="flex items-center gap-2"><span class="material-symbols-outlined ${['text-primary', 'text-secondary', 'text-tertiary'][i % 3]} text-headline-sm">${ICON[t.nama] || 'table_chart'}</span><div><h3 class="font-label-lg text-label-lg text-on-surface">Tab: ${t.nama}</h3><span class="font-label-sm text-label-sm text-on-surface-variant">${PB.esc(t.deskripsi)} · ${t.bisaTulis ? 'ditulis dari panel' : 'edit di Sheets'}</span></div></div><span class="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${t.ada ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-tertiary-fixed text-tertiary'}">${t.ada ? PB.num(t.baris) + ' baris' : 'Belum ada'}</span></div>
      <div class="mt-space-sm pt-space-sm bg-surface-container-lowest p-2.5 rounded-lg"><div class="text-label-sm font-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Kolom:</div><div class="flex flex-wrap gap-1">${(t.ada ? t.kolom : t.skema).map(k => `<span class="px-2 py-0.5 rounded bg-surface-container font-mono text-label-sm ${t.skema.includes(k) ? 'text-on-surface' : 'text-secondary'}" title="${t.skema.includes(k) ? '' : 'kolom tambahan (diabaikan API)'}">${PB.esc(k)}</span>`).join('')}${t.ada ? t.skema.filter(k => !t.kolom.includes(k)).map(k => `<span class="px-2 py-0.5 rounded bg-tertiary-fixed font-mono text-label-sm text-tertiary" title="kolom skema belum ada di sheet">${PB.esc(k)} ?</span>`).join('') : ''}</div></div></div>`).join('');
    $('#kf-log').innerHTML = (c.log || []).map(l => `<tr class="hover:bg-surface-container-lowest transition-colors"><td class="py-2.5 px-space-md font-mono text-label-sm whitespace-nowrap">${PB.esc(l.waktu)}</td><td class="py-2.5 px-space-md font-label-md">${PB.esc(l.aksi)}</td><td class="py-2.5 px-space-md font-label-sm">${PB.esc(l.tab)}</td><td class="py-2.5 px-space-md font-mono text-label-sm text-primary">${PB.esc(l.id)}</td><td class="py-2.5 px-space-md font-label-sm text-on-surface-variant">${PB.esc(l.keterangan)}</td><td class="py-2.5 px-space-md text-right font-label-sm text-on-surface-variant">${PB.esc(l.oleh)}</td></tr>`).join('') || '<tr><td colspan="6" class="py-space-md text-center text-on-surface-variant">Belum ada log.</td></tr>';
    renderSpark();
  }
  $('#kf-ping').addEventListener('click', () => { busy($('#kf-ping'), true); Promise.resolve(doPing()).then(r => { if (r) PB.toast(`Ping berhasil: ${r.ms} ms`, 'network_check'); }).finally(() => busy($('#kf-ping'), false)); });
  $('#kf-refresh').addEventListener('click', () => { busy($('#kf-refresh'), true); post({ action: 'refresh' }).then(r => { if (!r.ok) throw new Error(r.error); S.stats = null; PB.toast('Cache publik disegarkan. Web menampilkan data terbaru.', 'done_all'); }).catch(err => setErr(err.message)).finally(() => busy($('#kf-refresh'), false)); });
  $('#kf-export').addEventListener('click', () => {
    const tabs = S.config.tabs.filter(t => t.ada && t.nama !== 'ADMIN').map(t => t.nama);   // tab ADMIN (akun) tidak pernah diekspor
    busy($('#kf-export'), true); PB.toast(`Mengunduh ${tabs.length} berkas CSV…`, 'inventory_2');
    tabs.reduce((p, t) => p.then(() => ensureList(t, true).then(L => csvDownload(t, L.headers, L.rows))), Promise.resolve()).catch(err => setErr(err.message)).finally(() => busy($('#kf-export'), false));
  });

  /* ---------- Init ---------- */
  try { S.pings = JSON.parse(sessionStorage.getItem('pb_pings') || '[]'); } catch (_) {}
  fb.elements.tanggal.value = PB.today();
  fa.elements.tanggal.value = PB.today();
  try { S.token = sessionStorage.getItem('pb_admin_token') || ''; } catch (_) {}
  if (S.token) post({ action: 'me' }).then(r => { if (!r.ok) throw new Error(); S.user = r.user; showApp(); }).catch(() => forceLogout());
  else showLogin();
})();
