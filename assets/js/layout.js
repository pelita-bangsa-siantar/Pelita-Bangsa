/* Header, menu mobile, bottom-nav, dan footer bersama untuk halaman publik (markup dari Stitch). */
window.PB = window.PB || {};

PB.NAV = [
  ['Beranda', './#beranda', 'beranda'], ['Profil', './#profil', 'profil'], ['Pengurus', './#pengurus', 'pengurus'],
  ['Relawan', './#relawan', 'relawan'], ['Agenda', './#agenda', 'agenda'], ['Berita', 'berita', 'berita'],
  ['Galeri', 'album', 'galeri'], ['Kontak', './#donasi-kontak', 'kontak']
];

PB.mountLayout = function () {
  const page = document.body.dataset.page || 'beranda';
  const link = (l, h, k, cls) => `<a class="${cls} ${k === page ? 'text-primary font-bold bg-surface-container-low rounded-lg' : 'text-on-surface-variant hover:text-on-surface'} transition-colors" href="${h}" ${k === page ? 'aria-current="page"' : ''}>${l}</a>`;

  const header = `
<header class="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
  <div class="h-16 xl:h-20 max-w-[1200px] mx-auto px-gutter flex items-center justify-between gap-space-md">
    <div class="flex items-center gap-space-sm min-w-0">
      <button id="pb-burger" aria-label="Menu Utama" aria-expanded="false" class="xl:hidden w-11 h-11 -ml-2 flex items-center justify-center text-on-surface hover:text-primary rounded-lg"><span class="material-symbols-outlined text-[24px]">menu</span></button>
      <a href="./#beranda" class="flex items-center gap-space-sm min-w-0">
        <div class="hidden xl:block p-space-xs rounded-full bg-surface-container-high shrink-0"><img alt="Logo Rumah Baca Pelita Bangsa" class="w-8 h-8 rounded-full object-cover" src="assets/img/logo.png" data-src="profil.logo" referrerpolicy="no-referrer"></div>
        <div class="flex flex-col min-w-0">
          <span class="xl:hidden font-label-sm text-label-sm text-primary uppercase tracking-wider">Rumah Baca</span>
          <span class="font-headline-sm text-headline-sm text-primary leading-tight tracking-tight truncate"><span class="hidden xl:inline" data-bind="profil.nama_organisasi">Rumah Baca Pelita Bangsa</span><span class="xl:hidden text-on-surface">Pelita Bangsa</span></span>
          <span class="hidden xl:block font-label-sm text-label-sm text-on-surface-variant">Pematang Siantar – Simalungun</span>
        </div>
      </a>
    </div>
    <nav class="hidden xl:flex items-center gap-space-xs" aria-label="Navigasi utama">
      ${PB.NAV.map(([l, h, k]) => link(l, h, k, 'font-label-lg text-label-lg px-space-sm py-space-xs')).join('')}
    </nav>
    <div class="flex items-center gap-space-sm shrink-0">
      <a class="hidden md:flex bg-primary text-on-primary hover:bg-primary-container font-label-lg text-label-lg px-space-md py-space-sm rounded-lg shadow-sm transition-all items-center justify-center" href="./#donasi-kontak">Donasi Buku</a>
      <a class="bg-surface-container-low text-secondary hover:bg-surface-container-high hover:text-on-surface font-label-lg text-label-lg px-space-sm sm:px-space-md py-space-sm rounded-lg flex items-center gap-space-xs transition-all" href="admin/" title="Login Admin"><span class="material-symbols-outlined text-[18px]">lock</span><span class="hidden sm:inline">Login Admin</span></a>
    </div>
  </div>
  <nav id="pb-menu" class="xl:hidden hidden border-t border-surface-container-high bg-surface px-gutter py-space-sm" aria-label="Menu mobile">
    <div class="flex flex-col">${PB.NAV.map(([l, h, k]) => link(l, h, k, 'font-label-lg text-label-lg px-space-sm py-3')).join('')}</div>
  </nav>
</header>`;

  const bottom = `
<nav class="xl:hidden fixed bottom-0 inset-x-0 z-50 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.05)]" aria-label="Navigasi bawah">
  <div class="flex items-center justify-around h-16 px-space-xs">
    ${[['cottage', 'Beranda', './#beranda', 'beranda'], ['local_library', 'Agenda', './#agenda', 'agenda'], ['newspaper', 'Berita', 'berita', 'berita'],
       ['photo_library', 'Galeri', 'album', 'galeri'], ['volunteer_activism', 'Donasi', './#donasi-kontak', 'donasi']]
      .map(([i, l, h, k]) => `<a class="flex flex-col items-center justify-center w-14 h-12 gap-0.5 transition-colors ${k === page ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'}" href="${h}"><span class="material-symbols-outlined text-[22px]">${i}</span><span class="font-label-sm text-[10px] leading-tight">${l}</span></a>`).join('')}
  </div>
</nav>`;

  const footer = `
<footer class="w-full bg-surface-container-low text-on-surface mt-space-xl pt-space-xl pb-space-lg shadow-[0_-1px_6px_rgba(0,0,0,0.03)] mb-16 xl:mb-0">
  <div class="max-w-[1200px] mx-auto px-gutter">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg mb-space-xl">
      <div class="flex flex-col gap-space-sm">
        <div class="flex items-center gap-space-xs"><span class="material-symbols-outlined text-primary text-2xl">menu_book</span><span class="font-headline-sm text-headline-sm text-primary" data-bind="profil.nama_organisasi">Rumah Baca Pelita Bangsa</span></div>
        <p class="font-body-sm text-body-sm text-on-surface-variant" data-bind="profil.deskripsi_singkat">Komunitas literasi mandiri merajut cahaya ilmu dan pemberdayaan anak bangsa di Pematang Siantar dan Simalungun.</p>
        <div class="mt-space-xs inline-flex items-center gap-space-xs bg-surface-container-highest px-space-sm py-space-xs rounded-full w-fit"><span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span><span class="font-label-sm text-label-sm text-on-surface-variant">Data dari Google Sheets</span></div>
      </div>
      <div class="flex flex-col gap-space-sm">
        <h4 class="font-headline-sm text-headline-sm text-on-surface">Tautan Navigasi</h4>
        <ul class="flex flex-col gap-space-xs font-body-sm text-body-sm">${PB.NAV.slice(0, 7).map(([l, h]) => `<li class="flex items-center gap-space-xs text-on-surface-variant hover:text-primary"><span class="material-symbols-outlined text-sm">chevron_right</span><a class="py-1.5 flex-1" href="${h}">${l}</a></li>`).join('')}</ul>
      </div>
      <div class="flex flex-col gap-space-sm">
        <h4 class="font-headline-sm text-headline-sm text-on-surface">Sekretariat &amp; Balai Baca</h4>
        <p class="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-space-xs"><span class="material-symbols-outlined text-primary text-base mt-0.5">location_on</span><span data-bind="profil.alamat">Pematang Siantar – Simalungun, Sumatera Utara</span></p>
        <div class="flex flex-col gap-space-xs mt-space-xs font-body-sm text-body-sm">
          <a class="hidden flex items-center gap-space-xs py-1.5 text-on-surface-variant hover:text-primary" data-href="profil.whatsapp" data-href-tpl="https://wa.me/{v}" target="_blank" rel="noopener"><span class="material-symbols-outlined text-base text-primary">chat</span><span>WhatsApp: <span data-bind="profil.whatsapp_tampil"></span></span></a>
          <a class="hidden flex items-center gap-space-xs py-1.5 text-on-surface-variant hover:text-primary" data-href="profil.email" data-href-tpl="mailto:{v}"><span class="material-symbols-outlined text-base text-primary">mail</span><span data-bind="profil.email"></span></a>
        </div>
      </div>
      <div class="flex flex-col gap-space-sm">
        <h4 class="font-headline-sm text-headline-sm text-on-surface">Kanal Sosial Media</h4>
        <p class="font-body-sm text-body-sm text-on-surface-variant">Ikuti cerita senyum baca anak-anak dan agenda relawan literasi kami.</p>
        <div class="flex flex-col gap-space-xs font-label-md text-label-md">
          <a class="hidden flex items-center gap-space-sm py-1.5 text-on-surface-variant hover:text-primary" data-href="profil.instagram" target="_blank" rel="noopener"><span class="material-symbols-outlined text-primary">photo_camera</span><span>Instagram</span></a>
          <a class="hidden flex items-center gap-space-sm py-1.5 text-on-surface-variant hover:text-primary" data-href="profil.facebook" target="_blank" rel="noopener"><span class="material-symbols-outlined text-secondary">public</span><span>Facebook</span></a>
          <a class="hidden flex items-center gap-space-sm py-1.5 text-on-surface-variant hover:text-primary" data-href="profil.youtube" target="_blank" rel="noopener"><span class="material-symbols-outlined text-tertiary">play_circle</span><span>YouTube</span></a>
          <a class="hidden flex items-center gap-space-sm py-1.5 text-on-surface-variant hover:text-primary" data-href="profil.tiktok" target="_blank" rel="noopener"><span class="material-symbols-outlined text-on-surface">music_note</span><span>TikTok</span></a>
        </div>
        <div class="mt-space-sm"><a class="inline-flex items-center gap-space-xs py-2.5 text-secondary hover:text-primary font-label-sm text-label-sm" href="admin/"><span class="material-symbols-outlined text-[16px]">admin_panel_settings</span><span>Portal Admin Database Sheets</span></a></div>
      </div>
    </div>
    <div class="pt-space-md border-t border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-space-sm text-center sm:text-left">
      <p class="font-label-sm text-label-sm text-on-surface-variant">© ${new Date().getFullYear()} <span data-bind="profil.nama_organisasi">Rumah Baca Pelita Bangsa</span> (Pematang Siantar – Simalungun).</p>
      <div class="flex items-center gap-space-md font-label-sm text-label-sm text-on-surface-variant"><a class="hover:text-primary py-3" href="berita">Berita</a><span class="text-outline-variant">•</span><a class="hover:text-primary py-3" href="album">Galeri</a><span class="text-outline-variant">•</span><a class="hover:text-primary py-3" href="admin/">Panel Admin</a></div>
    </div>
  </div>
</footer>`;

  document.body.insertAdjacentHTML('afterbegin', header);
  document.body.insertAdjacentHTML('beforeend', footer + bottom);

  const burger = PB.q('#pb-burger'), menu = PB.q('#pb-menu');
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('hidden') === false;
    burger.setAttribute('aria-expanded', String(open));
    burger.querySelector('span').textContent = open ? 'close' : 'menu';
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) burger.click(); });
};

/** Dipanggil setiap data tiba: isi semua data-bind di header/footer. */
PB.bindLayout = D => {
  const p = Object.assign({}, D.profil || {});
  p.whatsapp_tampil = PB.waTampil(p.whatsapp);
  PB.bind(Object.assign({}, D, { profil: p }));
};

PB.mountLayout();
