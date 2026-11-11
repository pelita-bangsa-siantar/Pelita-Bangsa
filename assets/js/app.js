/* Render semua section index.html. Semua fungsi idempotent (boleh dipanggil 2x: cache lalu API). */
(function () {
  const state = { relawanFilter: 'Semua', relawanAll: false, tahun: null, D: null };

  /* ---------- Hero ---------- */
  function renderHero(p) {
    const h = PB.q('#hero-tagline');
    const t = p.tagline || '';
    if (!t) return;
    const i = t.lastIndexOf(' di ');
    h.innerHTML = i > 0
      ? `${PB.esc(t.slice(0, i))} di <span class="text-primary underline decoration-primary-fixed decoration-4 underline-offset-8">${PB.esc(t.slice(i + 4))}</span>`
      : PB.esc(t);
  }

  /* ---------- Misi / pilar ---------- */
  const PILAR = [['bg-primary-fixed text-primary', 'history_edu'], ['bg-secondary-fixed text-secondary', 'psychology'], ['bg-tertiary-fixed text-tertiary', 'handshake']];
  function renderMisi(misi) {
    PB.q('#list-misi').innerHTML = misi.map((m, i) => `
      <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col gap-space-xs">
        <div class="w-10 h-10 rounded-lg ${PILAR[i % 3][0]} flex items-center justify-center font-bold">${i + 1}</div>
        <h5 class="font-headline-sm text-headline-sm text-on-surface">${PB.esc(m.judul)}</h5>
        <p class="font-body-sm text-body-sm text-on-surface-variant justify">${PB.esc(m.deskripsi)}</p>
      </div>`).join('') || PB.empty('Misi belum diisi di tab PROFIL.');
  }

  /* ---------- Pengurus ---------- */
  function renderPengurus(list) {
    PB.q('#list-pengurus').innerHTML = list.map(p => `
      <article class="bg-surface-container-lowest rounded-xl p-space-sm sm:p-space-md shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-center flex flex-col items-center">
        ${PB.avatar(p.foto, p.nama, 'w-20 h-20 sm:w-28 sm:h-28 rounded-full mb-space-sm text-2xl')}
        <h3 class="font-headline-sm text-headline-sm text-on-surface leading-tight">${PB.esc(p.nama)}</h3>
        <p class="font-label-lg text-label-lg text-primary mt-0.5">${PB.esc(p.jabatan)}</p>
        ${p.periode ? `<p class="font-label-sm text-label-sm text-on-surface-variant mt-1">Periode ${PB.esc(p.periode)}</p>` : ''}
        ${p.deskripsi ? `<p class="font-body-sm text-body-sm text-on-surface-variant mt-space-xs clamp-2">${PB.esc(p.deskripsi)}</p>` : ''}
      </article>`).join('') || PB.empty('Data pengurus belum diisi.');
    const per = [...new Set(list.map(p => p.periode).filter(Boolean))];
    const el = PB.q('#pengurus-periode');
    el.classList.toggle('hidden', !per.length); el.classList.toggle('flex', !!per.length);
    el.querySelector('span:last-child').textContent = per.length ? 'Periode ' + per[0] : '';
  }

  /* ---------- Relawan ---------- */
  function renderRelawan(list) {
    const bidang = ['Semua', ...new Set(list.map(r => r.bidang).filter(Boolean))];
    if (!bidang.includes(state.relawanFilter)) state.relawanFilter = 'Semua';
    PB.q('#filter-relawan').innerHTML = !list.length ? '' : bidang.map(b => `
      <button data-bidang="${PB.esc(b)}" class="px-space-sm py-2.5 sm:py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${b === state.relawanFilter ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}">${PB.esc(b)}${b !== 'Semua' ? ` (${list.filter(r => r.bidang === b).length})` : ''}</button>`).join('');
    const rows = state.relawanFilter === 'Semua' ? list : list.filter(r => r.bidang === state.relawanFilter);
    const show = state.relawanAll ? rows : rows.slice(0, 24);
    PB.q('#list-relawan').innerHTML = show.map(r => `
      <div class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center gap-space-sm">
        ${PB.avatar(r.foto, r.nama, 'w-16 h-16 rounded-full shrink-0')}
        <div class="min-w-0 flex-1">
          <h5 class="font-label-lg text-label-lg text-on-surface truncate">${PB.esc(r.nama)}</h5>
          <p class="font-label-sm text-label-sm text-on-surface-variant truncate">${PB.esc(r.asal_instansi || '')}${r.sejak_tahun ? ` • Sejak ${PB.esc(r.sejak_tahun)}` : ''}</p>
          <div class="mt-1.5">${PB.chip(r.bidang)}</div>
        </div>
      </div>`).join('') || PB.empty(list.length ? 'Tidak ada relawan di bidang ini.' : 'Data relawan belum diisi.');
    const more = PB.q('#relawan-more');
    more.classList.toggle('hidden', state.relawanAll || rows.length <= 24);
    more.querySelector('span').textContent = `Lihat semua (${rows.length})`;
  }
  PB.q('#filter-relawan').addEventListener('click', e => {
    const b = e.target.closest('[data-bidang]'); if (!b) return;
    state.relawanFilter = b.dataset.bidang; state.relawanAll = false; renderRelawan(state.D.relawan || []);
  });
  PB.q('#relawan-more').addEventListener('click', () => { state.relawanAll = true; renderRelawan(state.D.relawan || []); });

  /* ---------- Agenda ---------- */
  const agendaItem = (a, besar) => `
    <div class="${besar ? 'bg-surface-container-lowest rounded-2xl p-space-md sm:p-space-lg shadow-md flex flex-col sm:flex-row gap-space-md' : 'flex gap-space-sm py-space-sm border-t border-surface-container-high first:border-0'}">
      <div class="${besar ? 'w-20 h-20 rounded-xl bg-primary-fixed' : 'w-12 h-12 rounded-lg bg-surface-container-low'} flex flex-col items-center justify-center text-center shrink-0">
        <span class="font-label-sm text-label-sm uppercase text-primary font-bold">${a.bulan ? PB.BLN[a.bulan - 1] : '—'}</span>
        <span class="${besar ? 'font-headline-lg text-headline-lg' : 'font-headline-sm text-headline-sm'} text-on-surface leading-none">${a.tanggal_mulai ? Number(a.tanggal_mulai.slice(8, 10)) : '?'}</span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-1.5 mb-1">${PB.chip(a.kategori)}${PB.chip(a.status)}</div>
        <h4 class="${besar ? 'font-headline-md text-headline-md' : 'font-label-lg text-label-lg'} text-on-surface leading-snug">${PB.esc(a.nama_kegiatan)}</h4>
        <p class="font-label-sm text-label-sm text-on-surface-variant flex flex-wrap items-center gap-x-1.5 mt-0.5">
          <span class="inline-flex items-center gap-0.5"><span class="material-symbols-outlined text-[14px] text-primary">event</span>${PB.esc(PB.fmtTanggal(a.tanggal_mulai, a.tanggal_selesai) || 'Tanggal menyusul')}</span>
          ${a.lokasi ? `<span class="inline-flex items-center gap-0.5"><span class="material-symbols-outlined text-[14px] text-primary">location_on</span>${PB.esc(a.lokasi)}</span>` : ''}
        </p>
        ${a.deskripsi ? `<p class="font-body-sm text-body-sm text-on-surface-variant mt-space-xs ${besar ? 'justify' : 'clamp-2'}">${PB.esc(a.deskripsi)}</p>` : ''}
        ${a.album_id ? `<a class="inline-flex items-center gap-0.5 mt-space-xs py-2 font-label-sm text-label-sm text-secondary hover:underline" href="album?id=${encodeURIComponent(a.album_id)}"><span class="material-symbols-outlined text-[16px]">photo_library</span>Lihat foto</a>` : ''}
      </div>
    </div>`;

  PB.renderAgenda = function (ag) {
    const items = ag.items || [], tahunList = ag.tahunList || [];
    if (!state.tahun || !tahunList.includes(state.tahun)) state.tahun = ag.tahunAktif || tahunList[0] || String(new Date().getFullYear());
    PB.q('#agenda-tahun-aktif').textContent = state.tahun;
    PB.q('#agenda-tahun').innerHTML = tahunList.map(t => `
      <button data-tahun="${PB.esc(t)}" class="px-space-md py-2.5 sm:py-1.5 rounded-full font-label-lg text-label-lg transition-colors ${t === state.tahun ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'}">${PB.esc(t)}</button>`).join('');

    const today = PB.today();
    const dekat = items.filter(a => a.status === 'Akan Datang' && (a.tanggal_mulai || '') >= today)[0] || items.filter(a => a.status === 'Berlangsung')[0];
    PB.q('#agenda-terdekat').innerHTML = dekat ? `
      <div class="flex items-center gap-space-xs mb-space-sm text-secondary font-label-md text-label-md uppercase tracking-wider font-bold"><span class="material-symbols-outlined text-base">upcoming</span>Kegiatan Terdekat</div>${agendaItem(dekat, true)}` : '';

    const tahunItems = items.filter(a => a.tahun === state.tahun);
    const byBulan = new Map();
    tahunItems.forEach(a => { if (!byBulan.has(a.bulan)) byBulan.set(a.bulan, []); byBulan.get(a.bulan).push(a); });
    PB.q('#agenda-timeline').innerHTML = [...byBulan.keys()].sort((a, b) => a - b).map(b => `
      <div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
        <div class="flex items-center justify-between mb-space-xs"><h3 class="font-headline-sm text-headline-sm text-on-surface">${b ? PB.BULAN[b - 1] : 'Tanggal Menyusul'} ${PB.esc(state.tahun)}</h3><span class="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">${byBulan.get(b).length} kegiatan</span></div>
        ${byBulan.get(b).map(a => agendaItem(a, false)).join('')}
      </div>`).join('') || PB.empty(`Belum ada agenda untuk tahun ${state.tahun}.`);
  };
  PB.q('#agenda-tahun').addEventListener('click', e => {
    const b = e.target.closest('[data-tahun]'); if (!b) return;
    state.tahun = b.dataset.tahun; PB.renderAgenda(state.D.agenda || {});
  });

  /* ---------- Berita (3 terbaru) — kartu di PB.beritaCard (ui.js) ---------- */
  function renderBerita(list) {
    PB.q('#list-berita').innerHTML = list.slice(0, 3).map(b => PB.beritaCard(b)).join('') || PB.empty('Belum ada berita yang diterbitkan.');
  }

  /* ---------- Galeri (6 album terbaru) — kartu di PB.albumCard (ui.js) ---------- */
  function renderGaleri(list) {
    PB.q('#list-galeri').innerHTML = list.slice(0, 6).map(PB.albumCard).join('') || PB.empty('Belum ada album foto.');
  }

  /* ---------- Formulir donasi ---------- */
  const form = PB.q('#form-donasi'), notif = PB.q('#donasi-notif');
  const showNotif = (msg, ok) => {
    notif.className = `p-space-sm rounded-lg font-body-sm text-body-sm flex items-center gap-space-xs ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-error-container text-on-error-container'}`;
    notif.innerHTML = `<span class="material-symbols-outlined text-lg">${ok ? 'check_circle' : 'error'}</span><span>${PB.esc(msg)}</span>`;
  };
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);
    const data = Object.fromEntries(f.entries());
    if (String(data.nama).trim().length < 2) return showNotif('Mohon isi nama lengkap.', false);
    if (String(data.whatsapp).replace(/\D/g, '').length < 10) return showNotif('Nomor WhatsApp belum benar (contoh 08123456789).', false);
    const btn = PB.q('#dn-submit'); btn.disabled = true;
    PB.post({ action: 'donasi', data })
      .then(res => {
        if (!res.ok) throw new Error(res.error || 'Gagal mengirim');
        showNotif('Terima kasih! Formulir Anda tercatat. Tim relawan akan segera menghubungi melalui WhatsApp.', true);
        form.reset();
      })
      .catch(err => showNotif(err.message || 'Gagal mengirim. Coba lagi atau hubungi kami via WhatsApp.', false))
      .finally(() => { btn.disabled = false; });
  });

  /* ---------- Render semua ---------- */
  PB.renderAll = function (D) {
    state.D = D;
    PB.bindLayout(D);
    renderHero(D.profil || {});
    renderMisi((D.profil || {}).misi || []);
    renderPengurus(D.pengurus || []);
    renderRelawan(D.relawan || []);
    PB.renderAgenda(D.agenda || { items: [], tahunList: [] });
    renderBerita(D.berita || []);
    renderGaleri(D.galeri || []);
  };

  PB.loadData({ onData: PB.renderAll, onError: err => PB.showGlobalError(err && err.message) });
})();
