/* Westhead Gates — site behaviour. Loaded on every page. */
(function () {
  'use strict';

  /* --- Mobile navigation ------------------------------------------------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  var top = document.getElementById('top');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        burger.setAttribute('aria-expanded', 'false');
        nav.classList.remove('open');
        burger.focus();
      }
    });
  }

  /* Keep the dropdown pinned directly under the sticky header. */
  if (top) {
    var place = function () {
      document.documentElement.style.setProperty('--menutop', top.getBoundingClientRect().bottom + 'px');
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { passive: true });
  }

  /* --- Optional photography ---------------------------------------------
     hero.jpg and workshop.jpg are decorative. Until they are uploaded the
     browser would draw an empty framed box with alt text in it, so hide any
     that fail to load and let the layout close up. ---------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('img[data-optional]'), function (img) {
    var drop = function () { img.style.display = 'none'; };
    img.addEventListener('error', drop);
    // Covers a cached failure that fired before this script ran.
    if (img.complete && img.naturalWidth === 0) { drop(); }
  });

  /* --- Footer year ------------------------------------------------------- */
  var yr = document.getElementById('yr');
  if (yr) { yr.textContent = String(new Date().getFullYear()); }
})();
