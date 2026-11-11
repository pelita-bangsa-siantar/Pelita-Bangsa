/* album.html: tanpa ?id → daftar semua album; ?id=<album_id> → satu album penuh + lightbox. */
(function () {
  const id = new URLSearchParams(location.search).get('id');
  const isi = PB.q('#album-isi');

  function renderDaftar(albums) {
    isi.className = 'max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md';
    isi.innerHTML = albums.map(PB.albumCard).join('') || PB.empty('Belum ada album foto. Tambahkan album lewat panel admin (menu Galeri).');
  }

  function renderAlbum(a) {
    document.title = `${a.judul} — Galeri Pelita Bangsa`;
    PB.q('#album-judul').textContent = a.judul;
    PB.q('#album-sub').textContent = `${PB.fmtTgl(a.tanggal, true) || 'Dokumentasi'} • ${PB.num(a.jumlah)} foto`;
    const c = PB.q('#crumb-album'); c.classList.remove('hidden'); c.classList.add('inline-flex'); c.querySelector('span:last-child').textContent = a.judul;
    isi.className = 'max-w-[1200px] mx-auto columns-2 md:columns-3 gap-4';
    isi.innerHTML = a.foto.map((f, i) => `
      <button data-i="${i}" class="block w-full break-inside-avoid mb-4 rounded-xl overflow-hidden shadow-sm bg-surface-container group text-left">
        ${PB.img(f.url, f.ket || `${a.judul} ${i + 1}`, 'w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300')}
        ${f.ket ? `<span class="block px-space-sm py-space-xs font-label-sm text-label-sm text-on-surface-variant bg-surface-container-lowest">${PB.esc(f.ket)}</span>` : ''}
      </button>`).join('');
    isi.onclick = e => { const b = e.target.closest('[data-i]'); if (b) PB.openLightbox(a.foto, Number(b.dataset.i)); };
  }

  function renderTidakDitemukan() {
    PB.q('#album-judul').textContent = 'Album tidak ditemukan';
    PB.q('#album-sub').textContent = 'Tautan mungkin salah atau album sudah disembunyikan.';
    isi.className = 'max-w-[1200px] mx-auto';
    isi.innerHTML = `<div class="text-center py-space-xl"><span class="material-symbols-outlined text-6xl text-outline-variant">photo_library</span><p class="font-body-md text-body-md text-on-surface-variant mt-space-sm">Album dengan id <code class="font-mono">${PB.esc(id)}</code> tidak ada.</p><a class="inline-flex mt-space-md px-space-lg py-3 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg" href="album">Lihat semua album</a></div>`;
  }

  PB.loadData({
    onData: D => {
      PB.bindLayout(D);
      const albums = D.galeri || [];
      if (!id) return renderDaftar(albums);
      const a = albums.find(x => x.id === id);
      a ? renderAlbum(a) : renderTidakDitemukan();
    },
    onError: err => PB.showGlobalError(err && err.message)
  });
})();
