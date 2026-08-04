/* ==========================================================================
   polasobun.com — app.js
   Vanilla JS, no dependencies, works from file://
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ============================================================ CONFIG ====
     ── DANE DO PODMIANY — jedyne miejsce, gdzie edytujesz liczby i rolki ──
     STATS: wpisz realne liczby w polu `value`. Dopóki value === null,
            dany kafelek (a jeśli wszystkie puste — cała sekcja) NIE renderuje się.
            Zero wymyślonych liczb. value ma być liczbą, np. 15000.
     REELS: wklej pełne adresy rolek z Instagrama, np.
            'https://www.instagram.com/reel/XXXXXXXXXXX/'
            Pusta tablica = sekcja MOTION się nie pokazuje.
     ---------------------------------------------------------------------- */
  var STATS = {
    followers:  { value: null, suffix: '+', label: { pl: 'obserwujących',        en: 'followers' } },
    reelsViews: { value: null, suffix: '+', label: { pl: 'zasięg rolek / mies.', en: 'monthly reel reach' } },
    campaigns:  { value: null, suffix: '+', label: { pl: 'kampanii dla marek',   en: 'brand campaigns' } },
    marathons:  { value: null, suffix: '',  label: { pl: 'maratony (majors)',    en: 'marathons (majors)' } }
  };

  var REELS = [
    // 'https://www.instagram.com/reel/XXXXXXXXXXX/',
  ];

  // kadry pod karty-zastępcze MOTION (gdy embed IG się nie załaduje)
  var MOTION_FB = ['work-05', 'work-11', 'work-31', 'work-46'];

  /* ======================================================== i18n ========== */

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

      'pre.sub': 'Photographer · Creator · Runner',

      'nav.works': 'Works',
      'nav.food': 'Food',
      'nav.about': 'About',
      'nav.contact': 'Contact',

      'hero.lead': 'Fashion, portrait and reportage photography — plus branded reels, food compositions and trashy still lifes. Based in Warsaw and Łódź, shooting across Poland and abroad.',
      'hero.role': 'Photographer · Creator · Runner',
      'hero.avail': 'Available for commissions @2026',
      'hero.scroll': 'Scroll',

      'sec.works.eyebrow': 'Featured works',
      'sec.works.title': 'Featured works',
      'cat.beauty': 'Beauty campaign',
      'cat.branded': 'Branded content',
      'cat.fashion': 'Fashion',
      'cat.lifestyle': 'Lifestyle',
      'work.desc.01': 'Beauty campaign imagery — studio light, close crops, colour carried entirely by the make-up.',
      'work.desc.02': 'Branded content with influencers: lookbook energy shot on location over two days.',
      'work.desc.03': 'Seasonal fashion drop for LPP — full look series, daylight and hard flash mixed.',
      'work.desc.04': 'Designer collaboration — portraits and garment studies from the atelier.',
      'work.desc.05': 'Lifestyle and product storytelling for a marketplace campaign.',

      /* NOWE COPY — do akceptacji klientki */
      'sec.creator.eyebrow': 'Creator',
      'sec.creator.title': 'Content creator',
      'creator.lead': 'I don’t just shoot for brands — I make content that carries itself. Reels, influencer campaigns and vertical formats, from concept through to the edit.',

      /* NOWE COPY — do akceptacji klientki */
      'sec.motion.eyebrow': 'Motion',
      'sec.motion.title': 'Reels for brands',
      'motion.lead': 'Vertical video for brands — concept, shoot, edit and release.',
      'motion.view': 'View on Instagram',

      'sec.frames.eyebrow': 'Selected frames',
      'sec.frames.title': 'Selected frames',
      'frames.more': 'View all frames',
      'frames.less': 'Show fewer frames',

      /* NOWE COPY — do akceptacji klientki */
      'sec.run.eyebrow': 'Run',
      'sec.run.title': 'Run',
      'run.p1': 'I run marathons. This isn’t a footnote to the portfolio — it’s why I know how to photograph effort from the inside.',
      'run.p2': 'I shoot sport as someone who knows the pain first-hand, not from behind the barrier.',

      'sec.about.eyebrow': 'About',
      'about.p1': 'Graduate of the University of Łódź (new media and digital culture) and the Łódź Film School (photography).',
      'about.p2': 'She photographs people above all — fashion and reportage — but is equally at home with food compositions and trashy still lifes.',
      'about.p3': 'Selected clients: Rimmel, Allegro, Esotiq, Robert Kupisz, Henderson, Publiszki, Kodano Optyk, Butik Optique and more.',
      'about.p4': 'She also produces a great deal of branded content with influencers for Zalando, LPP (Reserved, Cropp, House), CCC and Inditex (Pull&Bear).',
      /* NOWE COPY — do akceptacji klientki */
      'about.p5': 'Alongside commissions she runs her own channels, making video content for brands and documenting her running.',
      'stat.years': 'Years of experience',
      'stat.shoots': 'Completed shoots',
      'stat.brands': 'Brands',

      'sec.clients.eyebrow': 'Clients',
      'sec.clients.title': 'Worked with',

      'sec.food.eyebrow': 'Food',
      'food.hint': 'Drag or scroll sideways →',
      'food.railLabel': 'Food and still life photographs, horizontal gallery',

      'sec.contact.eyebrow': 'Contact',
      'contact.l1': "Let's create",
      'contact.l2': 'something good',
      'contact.mail': 'Email',
      'contact.tel': 'Phone',

      'footer.made': 'Photography portfolio',

      'mq': ['Photography', 'Reels', 'Branded content', 'Fashion', 'Reportage', 'Running', 'Food', 'UGC'],

      'alt.hero': 'Portrait from Pola Sobuń’s fashion portfolio',
      'alt.w1': 'Beauty campaign frame — close-up portrait with graphic make-up',
      'alt.w2': 'Branded content frame — model on location in a full look',
      'alt.w3': 'Fashion frame — seasonal collection look shot in daylight',
      'alt.w4': 'Designer collaboration — portrait in an atelier setting',
      'alt.w5': 'Lifestyle campaign frame — everyday scene with product',
      'alt.about': 'Photograph by Pola Sobuń — portrait from a fashion series',
      'alt.run1': 'Sports photograph — runner in motion',
      'alt.run2': 'Running frame — athlete on the track',
      'alt.run3': 'Sports portrait from a running session',
      'alt.g1': 'Fashion photograph — full-length look',
      'alt.g2': 'Portrait photograph — natural light',
      'alt.g3': 'Reportage frame from a shoot day',
      'alt.g4': 'Studio portrait with hard flash',
      'alt.g5': 'Fashion detail — fabric and accessory study',
      'alt.g6': 'Lifestyle photograph on location',
      'alt.g7': 'Backstage frame from a fashion session',
      'alt.g8': 'Editorial portrait in colour',
      'alt.f1': 'Food photograph — plated dish, close crop',
      'alt.f2': 'Still life composition with tableware',
      'alt.f3': 'Food photograph — ingredients on a coloured background',
      'alt.f4': 'Trashy still life — food and objects arranged on a table'
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

      'pre.sub': 'Fotografka · twórczyni · biegaczka',

      'nav.works': 'Prace',
      'nav.food': 'Food',
      'nav.about': 'O mnie',
      'nav.contact': 'Kontakt',

      'hero.lead': 'Moda, portret i reportaż — a obok tego rolki dla marek, kompozycje foodowe i thrashowe stille. Warszawa i Łódź, zdjęcia w całej Polsce i za granicą.',
      'hero.role': 'Fotografka · twórczyni · biegaczka',
      'hero.avail': 'Dostępna do zleceń @2026',
      'hero.scroll': 'Przewiń',

      'sec.works.eyebrow': 'Wybrane realizacje',
      'sec.works.title': 'Wybrane realizacje',
      'cat.beauty': 'Kampania beauty',
      'cat.branded': 'Branded content',
      'cat.fashion': 'Moda',
      'cat.lifestyle': 'Lifestyle',
      'work.desc.01': 'Zdjęcia kampanijne beauty — światło studyjne, ciasne kadry, kolor niesiony wyłącznie przez makijaż.',
      'work.desc.02': 'Branded content z influencerami: energia lookbooka, zdjęcia w plenerze przez dwa dni.',
      'work.desc.03': 'Sezonowy drop dla LPP — seria pełnych stylizacji, światło dzienne mieszane z twardą lampą.',
      'work.desc.04': 'Współpraca z projektantem — portrety i studia ubrań prosto z pracowni.',
      'work.desc.05': 'Lifestyle i opowieść produktowa na potrzeby kampanii marketplace’u.',

      /* NOWE COPY — do akceptacji klientki */
      'sec.creator.eyebrow': 'Twórczyni',
      'sec.creator.title': 'Twórczyni treści',
      'creator.lead': 'Nie tylko fotografuję marki — tworzę dla nich treści, które same się niosą. Rolki, kampanie z influencerami i formaty pionowe robione od koncepcji po montaż.',

      /* NOWE COPY — do akceptacji klientki */
      'sec.motion.eyebrow': 'Motion',
      'sec.motion.title': 'Rolki dla marek',
      'motion.lead': 'Pionowe wideo dla marek — od pomysłu, przez zdjęcia, po montaż i publikację.',
      'motion.view': 'Zobacz na Instagramie',

      'sec.frames.eyebrow': 'Wybrane kadry',
      'sec.frames.title': 'Wybrane kadry',
      'frames.more': 'Zobacz wszystkie kadry',
      'frames.less': 'Pokaż mniej kadrów',

      /* NOWE COPY — do akceptacji klientki */
      'sec.run.eyebrow': 'Bieganie',
      'sec.run.title': 'Bieganie',
      'run.p1': 'Biegam maratony. To nie jest dodatek do portfolio — to powód, dla którego wiem, jak sfotografować wysiłek od środka.',
      'run.p2': 'Kadry sportowe robię jako ktoś, kto zna ten ból z własnych nóg, a nie zza barierki.',

      'sec.about.eyebrow': 'O mnie',
      'about.p1': 'Absolwentka Uniwersytetu Łódzkiego (nowe media i kultura cyfrowa) oraz PWSFTViT (fotografia).',
      'about.p2': 'Fotografuje przede wszystkim ludzi (moda i reportaż), ale bliskie jej są również kompozycje foodowe/thrashowe stille.',
      'about.p3': 'Pracowała z Rimmel, Allegro, Esotiq, Robert Kupisz i Henderson, Publiszki, Kodano Optyk, Butik Optique itd.',
      'about.p4': 'Tworzy również dużo realizacji branded content z influencerami dla takich marek jak Zalando, LPP (Reserved, Cropp, House), CCC czy Inditex (Pull&Bear).',
      /* NOWE COPY — do akceptacji klientki */
      'about.p5': 'Poza zleceniami prowadzi własne kanały, gdzie tworzy treści wideo dla marek i dokumentuje bieganie.',
      'stat.years': 'Lat doświadczenia',
      'stat.shoots': 'Zrealizowanych sesji',
      'stat.brands': 'Marek',

      'sec.clients.eyebrow': 'Klienci',
      'sec.clients.title': 'Współprace',

      'sec.food.eyebrow': 'Food',
      'food.hint': 'Przeciągnij lub przewiń w bok →',
      'food.railLabel': 'Zdjęcia food i still life, galeria pozioma',

      'sec.contact.eyebrow': 'Kontakt',
      'contact.l1': 'Stwórzmy',
      'contact.l2': 'coś dobrego',
      'contact.mail': 'Mail',
      'contact.tel': 'Telefon',

      'footer.made': 'Portfolio fotograficzne',

      'mq': ['Fotografia', 'Rolki', 'Branded content', 'Moda', 'Reportaż', 'Bieganie', 'Food', 'UGC'],

      'alt.hero': 'Portret z portfolio modowego Poli Sobuń',
      'alt.w1': 'Kadr z kampanii beauty — portret z bliska z graficznym makijażem',
      'alt.w2': 'Kadr branded content — modelka w plenerze w pełnej stylizacji',
      'alt.w3': 'Kadr modowy — stylizacja z kolekcji sezonowej w świetle dziennym',
      'alt.w4': 'Współpraca z projektantem — portret w pracowni',
      'alt.w5': 'Kadr z kampanii lifestyle — codzienna scena z produktem',
      'alt.about': 'Zdjęcie autorstwa Poli Sobuń — portret z serii modowej',
      'alt.run1': 'Zdjęcie sportowe — biegaczka w ruchu',
      'alt.run2': 'Kadr biegowy — zawodnik na bieżni',
      'alt.run3': 'Portret sportowy z sesji biegowej',
      'alt.g1': 'Zdjęcie modowe — sylwetka w pełnej stylizacji',
      'alt.g2': 'Portret w świetle naturalnym',
      'alt.g3': 'Kadr reportażowy z dnia zdjęciowego',
      'alt.g4': 'Portret studyjny z twardą lampą',
      'alt.g5': 'Detal modowy — studium tkaniny i dodatku',
      'alt.g6': 'Zdjęcie lifestyle w plenerze',
      'alt.g7': 'Kadr backstage z sesji modowej',
      'alt.g8': 'Portret editorialowy w kolorze',
      'alt.f1': 'Zdjęcie food — danie na talerzu, ciasny kadr',
      'alt.f2': 'Kompozycja still life z zastawą',
      'alt.f3': 'Zdjęcie food — składniki na kolorowym tle',
      'alt.f4': 'Thrashowy still — jedzenie i przedmioty ułożone na stole'
    }
  };

  var lang = 'en';

  function t(key) {
    var d = I18N[lang];
    return (d && d[key] !== undefined) ? d[key] : (I18N.en[key] !== undefined ? I18N.en[key] : key);
  }

  function applyLang(next) {
    lang = (next === 'pl') ? 'pl' : 'en';
    root.setAttribute('lang', lang);

    $$('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (typeof v === 'string') el.textContent = v;
    });
    $$('[data-i18n-alt]').forEach(function (el) {
      el.setAttribute('alt', t(el.getAttribute('data-i18n-alt')));
    });
    $$('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });

    $$('.lang__btn').forEach(function (b) {
      var on = b.getAttribute('data-lang') === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    try { localStorage.setItem('ps-lang', lang); } catch (e) { /* private mode */ }

    if (typeof buildMarquees === 'function') buildMarquees();
    if (typeof syncFramesToggle === 'function') syncFramesToggle();
    if (typeof syncBurgerLabel === 'function') syncBurgerLabel();
    if (typeof refreshLightboxAlt === 'function') refreshLightboxAlt();
    if (typeof syncDynStats === 'function') syncDynStats();
    if (typeof renumberSections === 'function') renumberSections();
  }

  function initialLang() {
    var stored = null;
    try { stored = localStorage.getItem('ps-lang'); } catch (e) { /* noop */ }
    if (stored === 'pl' || stored === 'en') return stored;
    var nav = (navigator.language || 'en').toLowerCase();
    return nav.indexOf('pl') === 0 ? 'pl' : 'en';
  }

  /* ================================================== split characters === */

  function splitChars(el) {
    var text = el.textContent;
    var frag = doc.createDocumentFragment();
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var span = doc.createElement('span');
      span.className = 'char';
      span.style.transitionDelay = (0.045 * i) + 's';
      span.textContent = ch === ' ' ? ' ' : ch;
      frag.appendChild(span);
    }
    el.textContent = '';
    el.appendChild(frag);
  }

  /* ==================================================== smooth scroll ==== */

  var wrap = $('#scroll-wrap');
  var content = $('#scroll-content');
  var smooth = !reduceMotion && !isTouch && window.innerWidth > 900;
  var current = 0;
  var target = 0;
  var lastScroll = 0;
  var velocity = 0;

  function setBodyHeight() {
    if (!smooth) { doc.body.style.height = ''; return; }
    doc.body.style.height = Math.round(content.getBoundingClientRect().height) + 'px';
  }

  function enableSmooth() {
    doc.body.classList.add('smooth');
    root.style.scrollBehavior = 'auto';
    current = target = window.scrollY || 0;
    setBodyHeight();
  }

  function disableSmooth() {
    smooth = false;
    doc.body.classList.remove('smooth');
    doc.body.style.height = '';
    wrap.style.transform = '';
    root.style.scrollBehavior = '';
  }

  if (smooth) {
    enableSmooth();
    if (window.ResizeObserver) {
      new ResizeObserver(setBodyHeight).observe(content);
    }
  }
  window.addEventListener('load', setBodyHeight);
  window.addEventListener('resize', function () {
    if (smooth && window.innerWidth <= 900) { disableSmooth(); }
    setBodyHeight();
  });

  function scrollPos() { return smooth ? current : (window.scrollY || 0); }

  /* --------------------------------------------------- main rAF loop ----- */

  var mqTracks = [];
  var cursorState = null;
  var parallaxItems = $$('[data-parallax]');

  var lastT = 0;
  function frame(now) {
    var dt = Math.min(50, now - lastT || 16) / 1000;
    lastT = now;

    // smooth scroll
    if (smooth) {
      target = window.scrollY || 0;
      var prev = current;
      current += (target - current) * 0.085;
      if (Math.abs(target - current) < 0.05) current = target;
      wrap.style.transform = 'translate3d(0,' + (-current).toFixed(2) + 'px,0)';
      velocity = current - prev;
    } else {
      var s = window.scrollY || 0;
      velocity = s - lastScroll;
      lastScroll = s;
    }

    // parallax
    if (!reduceMotion) {
      for (var p = 0; p < parallaxItems.length; p++) {
        var el = parallaxItems[p];
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > window.innerHeight + 200) continue;
        var amt = parseFloat(el.getAttribute('data-parallax')) || 10;
        var progress = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        el.style.transform = 'translate3d(0,' + (progress * amt).toFixed(2) + '%,0)';
      }
    }

    // marquee
    if (!reduceMotion) {
      var boost = Math.min(9, Math.abs(velocity) * 0.5);
      for (var m = 0; m < mqTracks.length; m++) {
        var mt = mqTracks[m];
        if (!mt.setWidth) continue;
        mt.pos += (mt.base + boost) * mt.dir * dt * 60;
        var x = ((mt.pos % mt.setWidth) + mt.setWidth) % mt.setWidth;
        mt.el.style.transform = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)';
      }
    }

    // cursor
    if (cursorState) {
      var c = cursorState;
      c.dx += (c.x - c.dx) * 0.55;
      c.dy += (c.y - c.dy) * 0.55;
      c.rx += (c.x - c.rx) * 0.16;
      c.ry += (c.y - c.ry) * 0.16;
      c.dot.style.transform = 'translate3d(' + c.dx.toFixed(1) + 'px,' + c.dy.toFixed(1) + 'px,0)';
      c.ring.style.transform = 'translate3d(' + c.rx.toFixed(1) + 'px,' + c.ry.toFixed(1) + 'px,0)';
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ======================================================= anchors ======= */

  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var el = doc.getElementById(id.slice(1));
    if (!el) return;
    e.preventDefault();
    closeMenu();
    var y = el.getBoundingClientRect().top + scrollPos() - 12;
    if (y < 0) y = 0;
    if (smooth) window.scrollTo(0, y);
    else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ========================================================= nav ========== */

  var nav = $('#nav');
  var navScrim = $('.nav-scrim');
  var burger = $('#burger');
  var menu = $('#menu');
  var lastNavY = 0;
  var menuOpen = false;

  function onScrollNav() {
    var y = window.scrollY || 0;
    if (menuOpen || lightboxOpen) return;
    var hide = y > 140 && y > lastNavY;
    nav.classList.toggle('is-hidden', hide);
    if (navScrim) navScrim.style.opacity = hide ? '0' : (y > 40 ? '1' : '0.5');
    lastNavY = y;
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  function syncBurgerLabel() {
    if (!burger) return;
    burger.setAttribute('aria-label', menuOpen ? t('ui.menu.close') : t('ui.menu'));
  }

  function openMenu() {
    menuOpen = true;
    menu.hidden = false;
    // force reflow so the transition runs
    void menu.offsetWidth;
    menu.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    nav.classList.add('no-blend');
    doc.body.classList.add('is-locked');
    syncBurgerLabel();
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    nav.classList.remove('no-blend');
    doc.body.classList.remove('is-locked');
    syncBurgerLabel();
    window.setTimeout(function () { if (!menuOpen) menu.hidden = true; }, 450);
  }

  if (burger) {
    burger.addEventListener('click', function () {
      menuOpen ? closeMenu() : openMenu();
    });
  }

  /* active section in nav */
  var navLinks = $$('.nav__links a');
  var sectionsForNav = ['works', 'food', 'about', 'contact']
    .map(function (id) { return doc.getElementById(id); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sectionsForNav.length) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        navLinks.forEach(function (l) {
          l.classList.toggle('is-active', l.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sectionsForNav.forEach(function (s) { navObs.observe(s); });
  }

  /* ==================================================== reveal / stats === */

  var counted = new WeakSet();

  function animateCount(el) {
    if (counted.has(el)) return;
    counted.add(el);
    var to = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion) { el.textContent = String(to); return; }
    var dur = 1400;
    var t0 = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  var revealTargets = $$('.reveal, .client');

  if ('IntersectionObserver' in window && !reduceMotion) {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        $$('[data-count]', en.target).forEach(animateCount);
        revObs.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });

    revealTargets.forEach(function (el, i) {
      if (el.classList.contains('client')) el.style.transitionDelay = ((i % 14) * 0.05) + 's';
      revObs.observe(el);
    });

    // stagger inside grids
    $$('.frames__grid').forEach(function (g) {
      $$('.frame', g).forEach(function (f, i) {
        f.style.transitionDelay = ((i % 3) * 0.09) + 's';
      });
    });
    $$('.food-item').forEach(function (f, i) {
      f.style.transitionDelay = ((i % 5) * 0.07) + 's';
    });
  } else {
    revealTargets.forEach(function (el) { el.classList.add('is-in'); });
    $$('[data-count]').forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
  }

  /* ======================================================= marquee ======= */

  var mqDefs = [
    { el: $('#mq1'), dir: -1, base: 1.1 },
    { el: $('#mq2'), dir: 1, base: 0.8 }
  ].filter(function (d) { return !!d.el; });

  function makeSet(words) {
    var set = doc.createElement('div');
    set.className = 'mq-set';
    words.forEach(function (w) {
      var s = doc.createElement('span');
      s.className = 'mq-word';
      s.textContent = w;
      set.appendChild(s);
      var dot = doc.createElement('span');
      dot.className = 'mq-dot';
      dot.textContent = '•';
      set.appendChild(dot);
    });
    return set;
  }

  function buildMarquees() {
    var words = t('mq');
    if (!Array.isArray(words)) words = I18N.en.mq;
    mqTracks = [];

    mqDefs.forEach(function (def) {
      var el = def.el;
      el.innerHTML = '';
      var probe = makeSet(words);
      el.appendChild(probe);
      var setWidth = probe.getBoundingClientRect().width;
      if (!setWidth) setWidth = 1;
      var needed = Math.ceil((window.innerWidth + setWidth) / setWidth) + 1;
      for (var i = 1; i < needed; i++) el.appendChild(makeSet(words));
      mqTracks.push({
        el: el,
        dir: def.dir,
        base: def.base,
        setWidth: setWidth,
        pos: def.dir < 0 ? 0 : setWidth * 0.5
      });
    });
  }

  var mqResizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(mqResizeTimer);
    mqResizeTimer = setTimeout(buildMarquees, 180);
  });

  /* ================================================= frames "view all" === */

  var framesMore = $('#framesMore');
  var framesToggle = $('#framesToggle');
  var framesOpen = false;

  function syncFramesToggle() {
    if (!framesToggle) return;
    var span = framesToggle.querySelector('span');
    span.setAttribute('data-i18n', framesOpen ? 'frames.less' : 'frames.more');
    span.textContent = t(framesOpen ? 'frames.less' : 'frames.more');
    framesToggle.setAttribute('aria-expanded', framesOpen ? 'true' : 'false');
  }

  if (framesToggle && framesMore) {
    framesToggle.addEventListener('click', function () {
      framesOpen = !framesOpen;
      framesMore.hidden = !framesOpen;
      if (framesOpen) {
        $$('.frame', framesMore).forEach(function (f) { f.classList.add('is-in'); });
      }
      syncFramesToggle();
      setBodyHeight();
    });
  }

  /* ====================================================== lightbox ======= */

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

  function galleryItems(name) {
    return $$('[data-lb][data-gallery="' + name + '"]').filter(function (el) {
      return el.offsetParent !== null || el.getClientRects().length;
    });
  }

  function lbSrcFor(img) {
    return img.getAttribute('src').replace('/sm/', '/lg/');
  }

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
    var name = holder.getAttribute('data-gallery');
    lbList = galleryItems(name);
    var idx = lbList.indexOf(holder);
    if (idx < 0) idx = 0;
    lbLastFocus = doc.activeElement;
    lightboxOpen = true;
    lb.hidden = false;
    void lb.offsetWidth;
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

  doc.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var trigger = e.target.closest('.frame__btn, .work__media');
    if (!trigger) return;
    var holder = trigger.closest('[data-lb]');
    if (!holder) return;
    e.preventDefault();
    openLightbox(holder);
  });

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

  /* ====================================================== food rail ====== */

  var rail = $('#foodRail');
  if (rail) {
    var down = false, startX = 0, startLeft = 0, moved = 0;

    rail.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      down = true; moved = 0;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
      rail.classList.add('is-dragging');
    });
    rail.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      rail.scrollLeft = startLeft - dx;
      if (moved > 4) e.preventDefault();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      rail.addEventListener(ev, function () {
        if (!down) return;
        down = false;
        rail.classList.remove('is-dragging');
      });
    });
    rail.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; }
    }, true);

    // vertical wheel over the rail moves it sideways
    rail.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      var max = rail.scrollWidth - rail.clientWidth;
      if ((e.deltaY < 0 && rail.scrollLeft <= 0) || (e.deltaY > 0 && rail.scrollLeft >= max - 1)) return;
      e.preventDefault();
      rail.scrollLeft += e.deltaY;
    }, { passive: false });
  }

  /* ================================================== custom cursor ===== */

  var cur = $('#cursor');
  if (!(finePointer && !reduceMotion)) {
    if (cur) cur.hidden = true;
  } else {
    if (cur) {
      cursorState = {
        x: window.innerWidth / 2, y: window.innerHeight / 2,
        dx: window.innerWidth / 2, dy: window.innerHeight / 2,
        rx: window.innerWidth / 2, ry: window.innerHeight / 2,
        dot: $('.cursor__dot', cur), ring: $('.cursor__ring', cur)
      };
      window.addEventListener('pointermove', function (e) {
        cursorState.x = e.clientX;
        cursorState.y = e.clientY;
        var over = e.target.closest && e.target.closest('a, button, .work__media, .frame__btn');
        cur.classList.toggle('is-hover', !!over);
      }, { passive: true });
      doc.addEventListener('pointerleave', function () { cur.style.opacity = '0'; });
      doc.addEventListener('pointerenter', function () { cur.style.opacity = '1'; });
    }
  }

  /* ====================================================== preloader ===== */

  var pre = $('#preloader');
  var preCount = $('#preCount');
  var preBar = $('#preBar');

  function startHero() {
    doc.body.classList.add('is-ready');
    $$('.hero__h1 .line__in').forEach(function (el) { el.classList.add('is-ready'); });
    var h1 = $('.hero__h1');
    if (h1) h1.classList.add('is-ready');
  }

  function finishPreloader(instant) {
    if (!pre) { startHero(); return; }
    if (instant) {
      pre.classList.add('is-hidden');
      startHero();
      return;
    }
    pre.classList.add('is-done');
    window.setTimeout(function () { pre.classList.add('is-hidden'); }, 950);
    window.setTimeout(startHero, 260);
  }

  function runPreloader() {
    var seen = false;
    try { seen = sessionStorage.getItem('ps-pre') === '1'; } catch (e) { /* noop */ }
    if (seen || reduceMotion) { finishPreloader(true); return; }
    try { sessionStorage.setItem('ps-pre', '1'); } catch (e) { /* noop */ }

    var t0 = performance.now();
    var dur = 1250;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 2);
      var v = Math.round(eased * 100);
      preCount.textContent = v < 10 ? '0' + v : String(v);
      if (preBar) preBar.style.width = (eased * 100) + '%';
      if (p < 1) requestAnimationFrame(step);
      else window.setTimeout(function () { finishPreloader(false); }, 120);
    })(t0);
  }

  /* ============================== dynamic reveals (creator / run / motion) */

  function observeDynReveals(nodes) {
    if (!nodes.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) {
        n.classList.add('is-in');
        $$('[data-count]', n).forEach(animateCount);
      });
      return;
    }
    var o = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        $$('[data-count]', en.target).forEach(animateCount);
        o.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    nodes.forEach(function (n) { o.observe(n); });
  }

  /* ======================================== CREATOR + RUN stat counters == */

  // duże liczby pokazujemy kompaktowo (zaokrąglone): 15000 → 15K, 500000 → 500K
  function compactStat(v) {
    if (v >= 1e6) return { cnt: Math.round(v / 1e6), unit: 'M' };
    if (v >= 1000) return { cnt: Math.round(v / 1000), unit: 'K' };
    return { cnt: v, unit: '' };
  }

  function makeStat(key) {
    var cfg = STATS[key];
    var c = compactStat(cfg.value);
    var wrap = doc.createElement('div');
    wrap.className = 'stat reveal';
    var num = doc.createElement('p');
    num.className = 'stat__num';
    var span = doc.createElement('span');
    span.setAttribute('data-count', String(c.cnt));
    span.textContent = '0';
    num.appendChild(span);
    var suf = c.unit + (cfg.suffix || '');
    if (suf) num.appendChild(doc.createTextNode(suf));
    var lab = doc.createElement('p');
    lab.className = 'label';
    lab.setAttribute('data-stkey', key);
    wrap.appendChild(num);
    wrap.appendChild(lab);
    return wrap;
  }

  function syncDynStats() {
    $$('[data-stkey]').forEach(function (el) {
      var cfg = STATS[el.getAttribute('data-stkey')];
      if (cfg) el.textContent = (cfg.label[lang] || cfg.label.en || '');
    });
  }

  function buildCreator() {
    var sec = $('#creator');
    var host = $('#creatorStats');
    if (!sec || !host) return;
    var keys = ['followers', 'reelsViews', 'campaigns'].filter(function (k) {
      return STATS[k] && STATS[k].value != null;
    });
    if (!keys.length) { sec.hidden = true; return; }
    sec.hidden = false;
    host.innerHTML = '';
    keys.forEach(function (k) { host.appendChild(makeStat(k)); });
    observeDynReveals($$('.stat', host));
  }

  function buildRunStat() {
    var host = $('#runStat');
    if (!host) return;
    host.innerHTML = '';
    if (STATS.marathons && STATS.marathons.value != null) {
      host.appendChild(makeStat('marathons'));
      host.hidden = false;
      observeDynReveals($$('.stat', host));
    } else {
      host.hidden = true;
    }
  }

  /* ============================================= MOTION / reels (embeds) = */

  function buildMotion() {
    var sec = $('#motion');
    var grid = $('#motionGrid');
    if (!sec || !grid) return;
    if (!REELS.length) { sec.hidden = true; return; }
    sec.hidden = false;
    grid.innerHTML = '';

    REELS.forEach(function (url, i) {
      var card = doc.createElement('div');
      card.className = 'motion-card reveal';

      var bq = doc.createElement('blockquote');
      bq.className = 'instagram-media';
      bq.setAttribute('data-instgrm-permalink', url);
      bq.setAttribute('data-instgrm-version', '14');
      card.appendChild(bq);

      // fallback (widoczny dopóki embed się nie wyrenderuje / gdy zablokowany)
      var fb = doc.createElement('a');
      fb.className = 'motion-fallback';
      fb.href = url;
      fb.target = '_blank';
      fb.rel = 'noopener';
      var img = doc.createElement('img');
      var name = MOTION_FB[i % MOTION_FB.length];
      img.src = 'assets/img/sm/' + name + '.jpg';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.setAttribute('alt', '');
      fb.appendChild(img);
      var play = doc.createElement('span');
      play.className = 'motion-play';
      play.setAttribute('aria-hidden', 'true');
      play.textContent = '▶';
      fb.appendChild(play);
      var cta = doc.createElement('span');
      cta.className = 'motion-cta label';
      cta.setAttribute('data-i18n', 'motion.view');
      cta.textContent = t('motion.view');
      fb.appendChild(cta);
      card.appendChild(fb);

      grid.appendChild(card);
    });

    observeDynReveals($$('.motion-card', grid));

    var loaded = false;
    function markLive() {
      // TYLKO .instagram-media-rendered — Instagram wstrzykuje pusty <iframe>
      // zanim faktycznie wyrenderuje rolkę, więc obecność iframe to za mało.
      $$('.motion-card', grid).forEach(function (c) {
        if (c.querySelector('.instagram-media-rendered')) c.classList.add('is-live');
      });
    }
    function load() {
      if (loaded) return;
      loaded = true;
      var s = doc.createElement('script');
      s.async = true;
      s.src = 'https://www.instagram.com/embed.js';
      s.onload = function () {
        if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process();
        window.setTimeout(markLive, 1200);
        window.setTimeout(markLive, 3000);
      };
      doc.body.appendChild(s);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { load(); io.disconnect(); }
        });
      }, { rootMargin: '500px 0px' });
      io.observe(sec);
    } else {
      load();
    }
  }

  /* ================================================= section renumbering = */

  function renumberSections() {
    var n = 0;
    $$('#main > section').forEach(function (sec) {
      var eb = sec.querySelector('.label[data-seq]');
      if (!eb) return;
      if (sec.hidden) return;
      n++;
      var key = eb.getAttribute('data-i18n');
      var base = key ? t(key) : eb.textContent;
      eb.textContent = (n < 10 ? '0' + n : String(n)) + ' — ' + base;
    });
  }

  /* ========================================================= boot ======= */

  $$('.lang__btn').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang')); });
  });

  $$('[data-split]').forEach(splitChars);
  buildCreator();
  buildRunStat();
  buildMotion();
  applyLang(initialLang());
  buildMarquees();
  runPreloader();

  // fonts can change measurements — rebuild after they land
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(function () {
      buildMarquees();
      setBodyHeight();
    }).catch(function () { /* noop */ });
  }
})();
