/* Westhead Gates — auto-loading gallery.
 *
 * No image is hard-coded anywhere. The photo list is fetched at page load,
 * in this order:
 *
 *   1. api/images.php   — reads the /images/ folder on the server (normal case)
 *   2. images/images.json — a static list, if PHP is unavailable
 *
 * Drop a photo into /images/ and it appears. Delete it and it's gone.
 * Sub-folders of /images/ become filter categories.
 */
(function () {
  'use strict';

  var grid     = document.getElementById('gallery');
  var teaser   = document.querySelector('[data-gallery-teaser]');
  if (!grid && !teaser) { return; }

  var filtersEl = document.getElementById('galleryFilters');
  var countEl   = document.getElementById('galleryCount');
  var noteEl    = document.getElementById('galleryNote');

  var SOURCES = ['api/images.php', 'images/images.json'];

  var all = [];       // every image
  var shown = [];     // what the lightbox currently steps through
  var activeFilter = 'all';

  /* ---------------------------------------------------------------- utils */

  function el(tag, className) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    return node;
  }

  function note(title, body) {
    if (!noteEl) { return; }
    var t = document.getElementById('galleryNoteTitle');
    var b = document.getElementById('galleryNoteBody');
    if (t) { t.textContent = title; }
    if (b) { b.innerHTML = body; }
    noteEl.hidden = false;
  }

  /* --------------------------------------------------------------- loading */

  function load(index) {
    index = index || 0;
    if (index >= SOURCES.length) {
      return Promise.reject(new Error('no source available'));
    }
    return fetch(SOURCES[index], { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data && data.images);
        if (!Array.isArray(list)) { throw new Error('unexpected payload'); }
        return list;
      })
      .catch(function () { return load(index + 1); });
  }

  /* -------------------------------------------------------------- skeleton */

  function skeleton(host, n) {
    var heights = [280, 360, 240, 400, 300, 340, 260, 380];
    for (var i = 0; i < n; i++) {
      var s = el('div', 'gallery__item is-loading');
      s.style.height = heights[i % heights.length] + 'px';
      host.appendChild(s);
    }
  }

  /* ------------------------------------------------------------- rendering */

  function tile(image, index, withCaption, fixed) {
    var btn = el('button', 'gallery__item' + (fixed ? ' gallery__item--fixed' : ''));
    btn.type = 'button';
    btn.setAttribute('data-index', String(index));

    var img = el('img');
    img.src = image.src;
    img.alt = image.caption || 'Westhead Gates installation';
    img.loading = 'lazy';
    img.decoding = 'async';
    // Reserve the right space before the file arrives, so nothing jumps.
    // Fixed tiles crop to the grid cell instead, so they set no ratio.
    if (image.width && image.height) {
      img.width = image.width;
      img.height = image.height;
      if (!fixed) { img.style.aspectRatio = image.width + ' / ' + image.height; }
    }
    img.addEventListener('error', function () {
      btn.remove();
    });
    btn.appendChild(img);

    if (withCaption !== false && (image.caption || image.category)) {
      var cap = el('span', 'gallery__caption');
      if (image.category) {
        var small = el('small');
        small.textContent = image.category;
        cap.appendChild(small);
      }
      cap.appendChild(document.createTextNode(image.caption || ''));
      btn.appendChild(cap);
    }

    btn.addEventListener('click', function () {
      openLightbox(Number(btn.getAttribute('data-index')));
    });

    return btn;
  }

  function render() {
    if (!grid) { return; }

    shown = activeFilter === 'all'
      ? all.slice()
      : all.filter(function (i) { return i.category === activeFilter; });

    grid.textContent = '';
    shown.forEach(function (image, i) { grid.appendChild(tile(image, i)); });

    if (countEl) {
      countEl.textContent = shown.length === 1
        ? 'Showing 1 photo'
        : 'Showing ' + shown.length + ' photos';
    }
  }

  function buildFilters() {
    if (!filtersEl) { return; }

    var categories = [];
    all.forEach(function (i) {
      if (i.category && categories.indexOf(i.category) === -1) {
        categories.push(i.category);
      }
    });
    categories.sort();

    // With no sub-folders there is nothing to filter by — hide the controls.
    if (!categories.length) { filtersEl.hidden = true; return; }

    function addButton(label, value, count) {
      var b = el('button', 'filter');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(value === activeFilter));
      b.textContent = label;
      var c = el('span', 'filter__count');
      c.textContent = String(count);
      b.appendChild(c);
      b.addEventListener('click', function () {
        activeFilter = value;
        Array.prototype.forEach.call(filtersEl.children, function (other) {
          other.setAttribute('aria-pressed', String(other === b));
        });
        render();
      });
      filtersEl.appendChild(b);
    }

    addButton('All', 'all', all.length);
    categories.forEach(function (cat) {
      addButton(cat, cat, all.filter(function (i) { return i.category === cat; }).length);
    });
  }

  /* -------------------------------------------------------------- lightbox */

  var box      = document.getElementById('lightbox');
  var boxImg   = document.getElementById('lightboxImg');
  var boxMeta  = document.getElementById('lightboxMeta');
  var boxCount = document.getElementById('lightboxCounter');
  var current  = 0;
  var lastFocused = null;

  function showAt(i) {
    if (!shown.length) { return; }
    current = (i + shown.length) % shown.length;
    var image = shown[current];
    boxImg.src = image.src;
    boxImg.alt = image.caption || 'Westhead Gates installation';
    if (boxMeta) {
      boxMeta.textContent = [image.caption, image.category]
        .filter(Boolean).join(' — ');
    }
    if (boxCount) {
      boxCount.textContent = (current + 1) + ' / ' + shown.length;
    }
  }

  function openLightbox(i) {
    if (!box) { return; }
    lastFocused = document.activeElement;
    box.hidden = false;
    // Next frame, so the transition actually runs.
    requestAnimationFrame(function () { box.classList.add('is-open'); });
    document.body.classList.add('is-locked');
    showAt(i);
    var close = document.getElementById('lightboxClose');
    if (close) { close.focus(); }
  }

  function closeLightbox() {
    if (!box) { return; }
    box.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    window.setTimeout(function () {
      box.hidden = true;
      boxImg.src = '';
    }, 300);
    if (lastFocused && lastFocused.focus) { lastFocused.focus(); }
  }

  if (box) {
    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev').addEventListener('click', function () { showAt(current - 1); });
    document.getElementById('lightboxNext').addEventListener('click', function () { showAt(current + 1); });

    // Click the backdrop (but not the image or a button) to close.
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.classList.contains('lightbox__stage')) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) { return; }
      if (e.key === 'Escape')     { closeLightbox(); }
      if (e.key === 'ArrowLeft')  { showAt(current - 1); }
      if (e.key === 'ArrowRight') { showAt(current + 1); }
    });

    // Swipe on touch devices.
    var startX = null;
    box.addEventListener('touchstart', function (e) {
      startX = e.changedTouches[0].clientX;
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (startX === null) { return; }
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) { showAt(current + (dx < 0 ? 1 : -1)); }
      startX = null;
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ boot */

  var host = grid || teaser;
  skeleton(host, teaser && !grid ? 4 : 6);

  load()
    .then(function (list) {
      all = list.filter(function (i) { return i && i.src; });
      host.textContent = '';

      if (!all.length) {
        if (grid) {
          note('No photos yet',
            'Upload photos to the <code>/images/</code> folder on the server and they ' +
            'will appear here automatically. Sub-folders become filter categories.');
        }
        if (countEl) { countEl.textContent = ''; }
        if (filtersEl) { filtersEl.hidden = true; }
        return;
      }

      if (grid) {
        buildFilters();
        render();
      } else if (teaser) {
        // Home page: a fixed handful, no captions, no lightbox wiring needed.
        var n = parseInt(teaser.getAttribute('data-gallery-teaser'), 10) || 4;
        shown = all.slice(0, n);
        shown.forEach(function (image, i) {
          teaser.appendChild(tile(image, i, true, true));
        });
      }
    })
    .catch(function () {
      host.textContent = '';
      if (grid) {
        note('Gallery unavailable',
          'The photo list could not be loaded. Check that <code>api/images.php</code> ' +
          'is present and that PHP is enabled for this domain in Plesk.');
      }
      if (countEl) { countEl.textContent = ''; }
      if (filtersEl) { filtersEl.hidden = true; }
    });
})();
