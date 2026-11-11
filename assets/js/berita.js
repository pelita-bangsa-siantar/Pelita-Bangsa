/* berita.html: daftar semua berita (filter kategori) atau satu artikel (?id=). */
(function () {
  const id = new URLSearchParams(location.search).get('id');
  let filter = 'Semua', list = [];

  function renderDaftar() {
    const kat = ['Semua', ...new Set(list.map(b => b.kategori).filter(Boolean))];
    if (!kat.includes(filter)) filter = 'Semua';
    PB.q('#filter-berita').innerHTML = kat.map(k => `<button data-k="${PB.esc(k)}" class="px-space-sm py-2.5 sm:py-1.5 rounded-full font-label-sm text-label-sm transition-colors ${k === filter ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'}">${PB.esc(k)}</button>`).join('');
    const rows = filter === 'Semua' ? list : list.filter(b => b.kategori === filter);
    PB.q('#list-berita').innerHTML = rows.map(b => PB.beritaCard(b)).join('') || PB.empty('Belum ada berita yang diterbitkan.');
  }
  PB.q('#filter-berita').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { filter = b.dataset.k; renderDaftar(); } });

  function renderArtikel(b) {
    document.title = `${b.judul} — Rumah Baca Pelita Bangsa`;
    PB.q('#view-daftar').classList.add('hidden');
    PB.q('#view-artikel').classList.remove('hidden');
    PB.q('#artikel-isi').innerHTML = `
      <div class="flex flex-wrap items-center gap-space-xs mb-space-sm">${PB.chip(b.kategori)}<span class="font-label-sm text-label-sm text-on-surface-variant inline-flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">calendar_today</span>${PB.esc(PB.fmtTgl(b.tanggal, true))}</span>${b.lokasi ? `<span class="font-label-sm text-label-sm text-on-surface-variant inline-flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span>${PB.esc(b.lokasi)}</span>` : ''}</div>
      <h1 class="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-on-surface leading-tight">${PB.esc(b.judul)}</h1>
      ${b.penulis ? `<p class="font-label-lg text-label-lg text-on-surface-variant mt-space-sm inline-flex items-center gap-1"><span class="material-symbols-outlined text-[18px] text-primary">badge</span>${PB.esc(b.penulis)}</p>` : ''}
      ${b.foto ? `<figure class="mt-space-lg rounded-2xl overflow-hidden shadow-sm bg-surface-container"><img src="${PB.esc(b.foto)}" alt="${PB.esc(b.judul)}" class="w-full max-h-[480px] object-cover cursor-zoom-in" referrerpolicy="no-referrer" onerror="this.parentNode.remove()" id="artikel-foto"></figure>` : ''}
      ${b.ringkasan ? `<p class="font-body-lg text-body-lg text-on-surface-variant mt-space-lg justify font-semibold">${PB.esc(b.ringkasan)}</p>` : ''}
      <div class="prose-pb font-body-md text-body-md text-on-surface mt-space-md justify">${PB.md(b.isi || '')}</div>
      <div class="mt-space-xl p-space-md rounded-xl bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-sm">
        <span class="font-label-md text-label-md text-on-surface-variant">Bagikan kabar ini ke keluarga dan sahabat.</span>
        <a class="inline-flex items-center gap-space-xs px-space-md py-2.5 rounded-lg bg-secondary text-on-secondary font-label-lg text-label-lg" target="_blank" rel="noopener" href="${PB.wa('', `${b.judul} — ${location.href}`)}"><span class="material-symbols-outlined text-[18px]">share</span>Bagikan via WhatsApp</a>
      </div>`;
    const foto = PB.q('#artikel-foto');
    if (foto) foto.addEventListener('click', () => PB.openLightbox([{ url: b.foto, ket: b.judul }], 0));
    PB.q('#list-lainnya').innerHTML = list.filter(x => x.id !== b.id).slice(0, 3).map(x => PB.beritaCard(x, 'h-40')).join('') || PB.empty('Belum ada berita lain.');
  }

  function renderTidakDitemukan() {
    PB.q('#view-daftar').classList.add('hidden');
    PB.q('#view-artikel').classList.remove('hidden');
    PB.q('#artikel-isi').innerHTML = `<div class="text-center py-space-xl"><span class="material-symbols-outlined text-6xl text-outline-variant">article</span><h1 class="font-headline-md text-headline-md text-on-surface mt-space-sm">Berita tidak ditemukan</h1><p class="font-body-md text-body-md text-on-surface-variant">Tautan mungkin salah atau berita sudah ditarik.</p><a class="inline-flex mt-space-md px-space-lg py-3 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg" href="berita">Lihat semua berita</a></div>`;
    PB.q('#list-lainnya').innerHTML = list.slice(0, 3).map(x => PB.beritaCard(x, 'h-40')).join('');
  }

  PB.loadData({
    onData: D => {
      PB.bindLayout(D);
      list = D.berita || [];
      if (!id) return renderDaftar();
      const b = list.find(x => x.id === id);
      b ? renderArtikel(b) : renderTidakDitemukan();
    },
    onError: err => PB.showGlobalError(err && err.message)
  });
})();
