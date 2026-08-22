/* ==========================================================================
   polasobun.com — portfolio (grid-first, category pages)
   Vanilla JS, no dependencies, works from file://
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ===================================================== photo data ======= */

  var PHOTOS = [
    { n: 'work-00', w: 1067, h: 1600, c: 'commercial' },
    { n: 'work-01', w: 1199, h: 1600, c: 'commercial' },
    { n: 'work-02', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-03', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-04', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-05', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-06', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-07', w: 1067, h: 1600, c: 'sport' },
    { n: 'work-08', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-09', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-10', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-11', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-12', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-13', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-14', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-15', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-16', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-17', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-18', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-19', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-20', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-21', w: 1067, h: 1600, c: 'commercial' },
    { n: 'work-22', w: 1067, h: 1600, c: 'sport' },
    { n: 'work-23', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-24', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-25', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-26', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-27', w: 1067, h: 1600, c: 'sport' },
    { n: 'work-28', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-29', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-30', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-31', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-32', w: 1067, h: 1600, c: 'commercial' },
    { n: 'work-33', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-34', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-35', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-36', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-37', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-38', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-39', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-40', w: 1067, h: 1600, c: 'commercial' },
    { n: 'work-41', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-42', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-43', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-44', w: 1067, h: 1600, c: 'commercial' },
    { n: 'work-45', w: 1066, h: 1600, c: 'sport' },
    { n: 'work-46', w: 1066, h: 1600, c: 'commercial' },
    { n: 'work-47', w: 1066, h: 1600, c: 'sport' },
    { n: 'food-00', w: 1067, h: 1600, c: 'food' },
    { n: 'food-01', w: 1066, h: 1600, c: 'food' },
    { n: 'food-02', w: 1067, h: 1600, c: 'food' },
    { n: 'food-03', w: 1066, h: 1600, c: 'food' },
    { n: 'food-04', w: 1067, h: 1600, c: 'food' },
    { n: 'food-05', w: 1066, h: 1600, c: 'food' },
    { n: 'food-06', w: 1067, h: 1600, c: 'food' },
    { n: 'food-07', w: 1060, h: 1600, c: 'food' },
    { n: 'food-08', w: 1060, h: 1600, c: 'food' },
    { n: 'food-09', w: 1060, h: 1600, c: 'food' },
    { n: 'food-10', w: 1060, h: 1600, c: 'food' },
    { n: 'food-11', w: 1060, h: 1600, c: 'food' },
    { n: 'food-12', w: 1066, h: 1600, c: 'food' },
    { n: 'food-13', w: 1058, h: 1600, c: 'food' },
    { n: 'food-14', w: 1067, h: 1600, c: 'food' },
    { n: 'food-15', w: 1067, h: 1600, c: 'food' }
  ];

  /* ========================================================= i18n ========= */

  var I18N = {
    en: {
      'ui.skip': 'Skip to content',
      'ui.menu': 'Open menu',
      'ui.menu.close': 'Close menu',
      'ui.lang': 'Language',
      'ui.open': 'Open photograph in full screen',
      'ui.lightbox': 'Photograph viewer',
      'ui.close': 'Close',
      'ui.prev': 'Previous photograph',
      'ui.next': 'Next photograph',

      'nav.all': 'Portfolio',
      'nav.food': 'Food',
      'nav.sport': 'Sport',
      'nav.commercial': 'Commercial',

      'cat.all': 'Selected work',
      'cat.food': 'Food & still life',
      'cat.sport': 'Sport & running',
      'cat.commercial': 'Fashion & commercial',

      'foot.about': 'Pola Sobuń — photographer. Fashion, portrait and reportage, alongside sport, food and branded content. Based in Warsaw and Łódź, shooting across Poland and abroad. Selected clients: Rimmel, Zalando, LPP (Reserved, Cropp, House), CCC, Allegro, Esotiq, Robert Kupisz.',
      'foot.contact': 'Contact',
      'foot.mail': 'Email',
      'foot.tel': 'Phone',
      'foot.based': 'Warsaw / Łódź',
      'foot.rights': 'All rights reserved',

      'alt.commercial': 'Fashion and commercial photograph by Pola Sobuń',
      'alt.sport': 'Sports photograph by Pola Sobuń',
      'alt.food': 'Food and still life photograph by Pola Sobuń'
    },

    pl: {
      'ui.skip': 'Przejdź do treści',
      'ui.menu': 'Otwórz menu',
      'ui.menu.close': 'Zamknij menu',
      'ui.lang': 'Język',
      'ui.open': 'Otwórz zdjęcie na pełnym ekranie',
      'ui.lightbox': 'Podgląd zdjęcia',
      'ui.close': 'Zamknij',
      'ui.prev': 'Poprzednie zdjęcie',
      'ui.next': 'Następne zdjęcie',

      'nav.all': 'Portfolio',
      'nav.food': 'Food',
      'nav.sport': 'Sport',
      'nav.commercial': 'Komercyjne',

      'cat.all': 'Wybrane prace',
      'cat.food': 'Food & still life',
      'cat.sport': 'Sport i bieganie',
      'cat.commercial': 'Moda i komercja',

      'foot.about': 'Pola Sobuń — fotografka. Moda, portret i reportaż, a obok tego sport, food i branded content. Warszawa i Łódź, zdjęcia w całej Polsce i za granicą. Pracowała m.in. z Rimmel, Zalando, LPP (Reserved, Cropp, House), CCC, Allegro, Esotiq, Robert Kupisz.',
      'foot.contact': 'Kontakt',
      'foot.mail': 'Mail',
      'foot.tel': 'Telefon',
      'foot.based': 'Warszawa / Łódź',
      'foot.rights': 'Wszelkie prawa zastrzeżone',

      'alt.commercial': 'Zdjęcie modowe / komercyjne autorstwa Poli Sobuń',
      'alt.sport': 'Zdjęcie sportowe autorstwa Poli Sobuń',
      'alt.food': 'Zdjęcie food / still life autorstwa Poli Sobuń'
    }
  };

  var lang = 'en';
  function t(key) {
    var d = I18N[lang];
    return (d && d[key] !== undefined) ? d[key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
  }

  /* ==================================================== current page ====== */

  var category = doc.body.getAttribute('data-category') || 'all';
  function inCategory(p) { return category === 'all' || p.c === category; }
  var LIST = PHOTOS.filter(inCategory);

  /* ===================================================== grid render ====== */

  var grid = $('#grid');

  function buildGrid() {
    if (!grid) return;
    var frag = doc.createDocumentFragment();
    LIST.forEach(function (p, i) {
      var fig = doc.createElement('figure');
      fig.className = 'tile reveal';
      fig.setAttribute('data-i', String(i));
      if (!reduceMotion) fig.style.transitionDelay = ((i % 4) * 0.06) + 's';

      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'tile__btn';
      btn.setAttribute('aria-label', t('ui.open'));

      var img = doc.createElement('img');
      img.src = 'assets/img/sm/' + p.n + '.jpg';
      img.setAttribute('srcset',
        'assets/img/sm/' + p.n + '.jpg ' + Math.round(p.w / 2) + 'w, ' +
        'assets/img/lg/' + p.n + '.jpg ' + p.w + 'w');
      img.setAttribute('sizes', '(max-width: 600px) 46vw, (max-width: 1000px) 46vw, (max-width: 1400px) 31vw, 23vw');
      img.width = p.w;
      img.height = p.h;
      img.loading = i < 6 ? 'eager' : 'lazy';
      img.decoding = 'async';
      if (i < 4) img.setAttribute('fetchpriority', 'high');
      img.setAttribute('alt', t('alt.' + p.c));
      img.setAttribute('data-altkey', 'alt.' + p.c);

      var tag = doc.createElement('span');
      tag.className = 'tile__tag';
      tag.textContent = String(i + 1).padStart(2, '0');

      btn.appendChild(img);
      btn.appendChild(tag);
      fig.appendChild(btn);
      frag.appendChild(fig);
    });
    grid.appendChild(frag);
  }

  /* =================================================== lang switch ======== */

  function applyLang(next) {
    lang = (next === 'pl') ? 'pl' : 'en';
    root.setAttribute('lang', lang);

    $$('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (typeof v === 'string') el.textContent = v;
    });
    $$('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    $$('img[data-altkey]').forEach(function (el) {
      el.setAttribute('alt', t(el.getAttribute('data-altkey')));
    });
    $$('.tile__btn').forEach(function (el) { el.setAttribute('aria-label', t('ui.open')); });

    $$('.lang__btn').forEach(function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    try { localStorage.setItem('ps-lang', lang); } catch (e) { /* private mode */ }
    if (typeof refreshLightboxAlt === 'function') refreshLightboxAlt();
    if (typeof syncBurgerLabel === 'function') syncBurgerLabel();
  }

  function initialLang() {
    var stored = null;
    try { stored = localStorage.getItem('ps-lang'); } catch (e) { /* noop */ }
    if (stored === 'pl' || stored === 'en') return stored;
    var nav = (navigator.language || 'en').toLowerCase();
    return nav.indexOf('pl') === 0 ? 'pl' : 'en';
  }

  /* ==================================================== nav counts ======== */

  function countFor(cat) {
    return cat === 'all' ? PHOTOS.length : PHOTOS.filter(function (p) { return p.c === cat; }).length;
  }
  function fillCounts() {
    $$('[data-count-cat]').forEach(function (el) {
      el.textContent = String(countFor(el.getAttribute('data-count-cat')));
    });
  }

  /* ======================================================= nav ============ */

  var nav = $('#nav');
  var burger = $('#burger');
  var menu = $('#menu');
  var menuOpen = false;
  var lastY = 0;

  window.addEventListener('scroll', function () {
    var y = window.scrollY || 0;
    if (!menuOpen && !lightboxOpen) {
      nav.classList.toggle('is-hidden', y > 160 && y > lastY);
      nav.classList.toggle('is-scrolled', y > 20);
    }
    lastY = y;
  }, { passive: true });

  function syncBurgerLabel() {
    if (burger) burger.setAttribute('aria-label', menuOpen ? t('ui.menu.close') : t('ui.menu'));
  }
  function openMenu() {
    menuOpen = true; menu.hidden = false; void menu.offsetWidth;
    menu.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true');
    doc.body.classList.add('is-locked'); syncBurgerLabel();
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false; menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    doc.body.classList.remove('is-locked'); syncBurgerLabel();
    window.setTimeout(function () { if (!menuOpen) menu.hidden = true; }, 450);
  }
  if (burger) burger.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });

  /* ==================================================== reveal ============ */

  function initReveal() {
    var targets = $$('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        obs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    targets.forEach(function (el) { obs.observe(el); });
  }

  /* ==================================================== lightbox ========== */

  var lb = $('#lightbox');
  var lbImg = $('#lbImg');
  var lbCount = $('#lbCount');
  var lbPrev = $('#lbPrev');
  var lbNext = $('#lbNext');
  var lbClose = $('#lbClose');
  var lightboxOpen = false;
  var lbList = [];
  var lbIndex = 0;
  var lbLastFocus = null;

  function lbSrcFor(img) { return img.getAttribute('src').replace('/sm/', '/lg/'); }

  function refreshLightboxAlt() {
    if (!lightboxOpen || !lbList[lbIndex]) return;
    var img = lbList[lbIndex].querySelector('img');
    if (img) lbImg.setAttribute('alt', img.getAttribute('alt') || '');
  }

  function showAt(i) {
    if (!lbList.length) return;
    lbIndex = (i + lbList.length) % lbList.length;
    var img = lbList[lbIndex].querySelector('img');
    if (!img) return;
    lbImg.setAttribute('src', lbSrcFor(img));
    lbImg.setAttribute('alt', img.getAttribute('alt') || '');
    lbCount.textContent = String(lbIndex + 1).padStart(2, '0') + ' / ' + String(lbList.length).padStart(2, '0');
  }

  function openLightbox(holder) {
    lbList = $$('.tile', grid);
    var idx = lbList.indexOf(holder);
    if (idx < 0) idx = 0;
    lbLastFocus = doc.activeElement;
    lightboxOpen = true;
    lb.hidden = false; void lb.offsetWidth;
    lb.classList.add('is-open');
    doc.body.classList.add('is-locked');
    root.style.overflow = 'hidden';
    nav.classList.add('is-hidden');
    showAt(idx);
    lbClose.focus();
  }

  function closeLightbox() {
    if (!lightboxOpen) return;
    lightboxOpen = false;
    lb.classList.remove('is-open');
    doc.body.classList.remove('is-locked');
    root.style.overflow = '';
    nav.classList.remove('is-hidden');
    window.setTimeout(function () { if (!lightboxOpen) { lb.hidden = true; lbImg.removeAttribute('src'); } }, 350);
    if (lbLastFocus && lbLastFocus.focus) lbLastFocus.focus();
  }

  if (grid) {
    grid.addEventListener('click', function (e) {
      var holder = e.target.closest ? e.target.closest('.tile') : null;
      if (!holder) return;
      e.preventDefault();
      openLightbox(holder);
    });
  }

  if (lb) {
    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', function () { showAt(lbIndex - 1); });
    lbNext.addEventListener('click', function () { showAt(lbIndex + 1); });
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lightbox__fig')) closeLightbox();
    });
  }

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (lightboxOpen) { closeLightbox(); return; }
      if (menuOpen) { closeMenu(); return; }
    }
    if (!lightboxOpen) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); showAt(lbIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); showAt(lbIndex + 1); }
    if (e.key === 'Tab') {
      var f = [lbClose, lbPrev, lbNext];
      var i = f.indexOf(doc.activeElement);
      e.preventDefault();
      var nxt = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i < 0 || i === f.length - 1 ? 0 : i + 1);
      f[nxt].focus();
    }
  });

  // swipe on touch
  if (lb) {
    var tsx = 0, tsy = 0;
    lb.addEventListener('touchstart', function (e) { tsx = e.touches[0].clientX; tsy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tsx, dy = e.changedTouches[0].clientY - tsy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) showAt(lbIndex + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* =================================================== custom cursor ====== */

  var cur = $('#cursor');
  var cursorState = null;
  if (cur && finePointer && !reduceMotion) {
    cursorState = {
      x: innerWidth / 2, y: innerHeight / 2, dx: innerWidth / 2, dy: innerHeight / 2,
      rx: innerWidth / 2, ry: innerHeight / 2,
      dot: $('.cursor__dot', cur), ring: $('.cursor__ring', cur)
    };
    window.addEventListener('pointermove', function (e) {
      cursorState.x = e.clientX; cursorState.y = e.clientY;
      var over = e.target.closest && e.target.closest('a, button, .tile');
      cur.classList.toggle('is-hover', !!over);
    }, { passive: true });
    doc.addEventListener('pointerleave', function () { cur.style.opacity = '0'; });
    doc.addEventListener('pointerenter', function () { cur.style.opacity = '1'; });
    (function loop() {
      var c = cursorState;
      c.dx += (c.x - c.dx) * 0.55; c.dy += (c.y - c.dy) * 0.55;
      c.rx += (c.x - c.rx) * 0.16; c.ry += (c.y - c.ry) * 0.16;
      c.dot.style.transform = 'translate3d(' + c.dx.toFixed(1) + 'px,' + c.dy.toFixed(1) + 'px,0)';
      c.ring.style.transform = 'translate3d(' + c.rx.toFixed(1) + 'px,' + c.ry.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  } else if (cur) {
    cur.hidden = true;
  }

  /* ======================================================= boot =========== */

  $$('.lang__btn').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang')); });
  });

  buildGrid();
  fillCounts();
  applyLang(initialLang());
  initReveal();
  doc.body.classList.add('is-ready');
})();
