/* =============================================================
   Gallery — φορτώνει τις φωτογραφίες από τον φάκελο Google Drive
   του ιδιοκτήτη (μέσω Apps Script). Αν δεν υπάρχει backend,
   δείχνει τις φωτογραφίες του config.js.
   ============================================================= */
(function () {
  'use strict';

  var H = window.HMV, C = window.CONFIG, t = H.t;
  var grid = document.getElementById('gal');
  if (!grid) return;

  var lb = document.getElementById('lb');
  var items = C.gallery.slice();
  var idx = 0;

  function cap(it) { return H.lang === 'en' ? (it.en || it.el || '') : (it.el || it.en || ''); }

  function render() {
    grid.innerHTML = items.map(function (it, i) {
      return '<button type="button" data-i="' + i + '" aria-label="' + cap(it).replace(/"/g, '') + '">' +
        '<img src="' + it.src + '" alt="' + cap(it).replace(/"/g, '') + '" loading="lazy" decoding="async">' +
        '</button>';
    }).join('');
    grid.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { open(+b.dataset.i); });
    });
  }

  function open(i) {
    idx = (i + items.length) % items.length;
    lb.querySelector('img').src = items[idx].src;
    lb.querySelector('.lb__cap').textContent = cap(items[idx]);
    lb.dataset.open = 'true';
    document.body.style.overflow = 'hidden';
    lb.querySelector('.lb__x').focus();
  }
  function close() {
    lb.dataset.open = 'false';
    document.body.style.overflow = '';
  }

  lb.querySelector('.lb__x').addEventListener('click', close);
  lb.querySelector('.prev').addEventListener('click', function () { open(idx - 1); });
  lb.querySelector('.next').addEventListener('click', function () { open(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.dataset.open !== 'true') return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') open(idx - 1);
    if (e.key === 'ArrowRight') open(idx + 1);
  });

  ['close', 'left', 'right'].forEach(function (n) {
    var b = lb.querySelector('[data-ico="' + n + '"]');
    if (b) b.innerHTML = H.icon(n);
  });

  document.addEventListener('langchange', render);
  render();

  if (!H.DEMO) {
    H.apiGet({ action: 'gallery' }).then(function (res) {
      if (res && res.ok && res.images && res.images.length) {
        items = res.images.map(function (im) { return { src: im.url, el: im.name, en: im.name }; });
        render();
      }
    }).catch(function () { /* κρατάμε τις φωτογραφίες του config */ });
  }
})();
