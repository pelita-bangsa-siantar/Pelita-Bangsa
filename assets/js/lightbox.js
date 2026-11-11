/* Lightbox galeri: klik foto → tampil besar, tombol / keyboard / swipe / Esc. */
window.PB = window.PB || {};
PB.openLightbox = function (list, idx) {
  let i = idx || 0;
  const box = document.createElement('div');
  box.className = 'lightbox fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-label', 'Tampilan foto');
  box.innerHTML = `
    <button data-x class="absolute top-4 right-4 text-white text-4xl w-11 h-11 flex items-center justify-center" aria-label="Tutup">&times;</button>
    <button data-p class="absolute left-2 md:left-6 text-white text-5xl w-11 h-11 flex items-center justify-center" aria-label="Sebelumnya">&#8249;</button>
    <figure class="max-w-5xl w-full text-center m-0">
      <img class="max-h-[80vh] max-w-full mx-auto rounded-lg" alt="" referrerpolicy="no-referrer">
      <figcaption class="text-white/80 mt-3 text-sm"></figcaption>
    </figure>
    <button data-n class="absolute right-2 md:right-6 text-white text-5xl w-11 h-11 flex items-center justify-center" aria-label="Berikutnya">&#8250;</button>`;
  const img = box.querySelector('img'), cap = box.querySelector('figcaption');
  const show = () => { img.src = PB.big(list[i].url); img.alt = list[i].ket || ''; cap.textContent = list[i].ket || `${i + 1} / ${list.length}`; };
  const close = () => { box.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; };
  const go = d => { i = (i + d + list.length) % list.length; show(); };
  const key = e => { if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); };
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
