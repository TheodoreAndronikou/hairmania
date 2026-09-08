/* =============================================================
   HAIR MANIA VALKANIS — κοινός κώδικας για όλες τις σελίδες
   ============================================================= */
(function () {
  'use strict';

  var C = window.CONFIG;
  var TZ = C.booking.timezone;

  /* ---------- θέμα ---------------------------------------------------
     Προτεραιότητα: ?theme=a|b|c στο URL  >  CONFIG.theme  >  'c'
     Το URL είναι μόνο για προεπισκόπηση — δεν αποθηκεύεται πουθενά. */
  /* ΠΡΟΣΟΧΗ: κάθε γραμματοσειρά εδώ έχει ελεγχθεί ότι περιέχει ΕΛΛΗΝΙΚΟΥΣ
     χαρακτήρες στο Google Fonts. Πολλές δημοφιλείς (Archivo, Space Grotesk,
     Instrument Sans, DM Mono, Bricolage, Anton, Oswald) ΔΕΝ έχουν — τα
     ελληνικά πέφτουν σε fallback και το site δείχνει σπασμένο. */
  var THEMES = {
    c: 'family=Fira+Sans+Extra+Condensed:wght@700;800&family=Fira+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500',
    a: 'family=Commissioner:wght@400;500;600;800',
    b: 'family=Alegreya:ital,wght@0,500;0,700;1,500&family=Manrope:wght@400;500;700'
  };

  var THEME = (function () {
    var q = (new URLSearchParams(location.search).get('theme') || '').toLowerCase();
    if (THEMES[q]) return q;
    var c = String(C.theme || 'c').toLowerCase();
    return THEMES[c] ? c : 'c';
  })();

  document.documentElement.setAttribute('data-theme', THEME);
  (function loadFonts() {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + THEMES[THEME] + '&display=swap';
    document.head.appendChild(l);
  })();

  /* ---------- εικονίδια (inline SVG — καθόλου emoji) ------------------ */
  var PATHS = {
    phone: '<path d="M6.6 2.5 8.9 7l-2 1.6a12 12 0 0 0 6.5 6.5l1.6-2 4.5 2.3v3.1a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 2.5 4.7a2 2 0 0 1 2-2.2h2.1Z"/>',
    scissors: '<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M20 4 8.2 16.4M20 20 8.2 7.6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.4 2"/>',
    mail: '<rect x="2.5" y="5" width="19" height="14" rx="1"/><path d="m3 6.5 9 6.5 9-6.5"/>',
    pin: '<path d="M12 21.5s7-6.1 7-11.3A7 7 0 0 0 5 10.2c0 5.2 7 11.3 7 11.3Z"/><circle cx="12" cy="10" r="2.6"/>',
    razor: '<path d="M4 4h11l5 5v3H9L4 7Z"/><path d="M9 12v8"/><path d="M6.5 20h5"/>',
    check: '<path d="m4 12.5 5.2 5.2L20 6.8"/>',
    arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    download: '<path d="M12 3v12M7 10.5l5 5 5-5M4 20h16"/>',
    link: '<path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.4 1.4"/><path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.4-1.4"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>',
    left: '<path d="m14 5-7 7 7 7"/>',
    right: '<path d="m10 5 7 7-7 7"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };

  function icon(name, cls) {
    var p = PATHS[name];
    if (!p) return '';
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* ---------- ελληνικά κεφαλαία χωρίς τόνους --------------------------
     Ο κανόνας: τα κεφαλαία δεν παίρνουν τόνο, κρατούν όμως τα διαλυτικά.
     Οι browsers το κάνουν σωστά με lang="el", αλλά όχι όλοι και όχι
     πάντα — οπότε το επιβάλλουμε εμείς, ντετερμινιστικά. */
  var TONOS = { 'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
                'Ϊ́': 'Ϊ', 'Ϋ́': 'Ϋ', '΅': '¨', '΄': '' };
  function grUpper(s) {
    var out = String(s).toUpperCase();
    for (var k in TONOS) out = out.split(k).join(TONOS[k]);
    return out.replace(/́/g, '');
  }
  /** Βρίσκει ό,τι εμφανίζεται κεφαλαίο μέσω CSS και το ξαναγράφει σωστά. */
  function fixGreekCaps(root) {
    var nodes = (root || document).querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.children.length) continue;
      var txt = el.textContent;
      if (!txt || !/[άέήίόύώΆΈΉΊΌΎΏ]/.test(txt)) continue;
      if (getComputedStyle(el).textTransform !== 'uppercase') continue;
      /* Το σημαδεύουμε ώστε το applyLang() να ξέρει να ξαναγράψει κεφαλαία —
         αλλιώς η επόμενη μετάφραση θα το γύριζε πίσω σε πεζά. */
      el.setAttribute('data-caps', '1');
      el.style.textTransform = 'none';
      el.textContent = grUpper(txt);
    }
  }

  /* ---------- γλώσσα ------------------------------------------------- */
  var LANG = (function () {
    try { var s = localStorage.getItem('hmv_lang'); if (s === 'el' || s === 'en') return s; } catch (e) {}
    return 'el';
  })();

  function t(key) {
    var d = window.I18N[LANG] || window.I18N.el;
    return (key in d) ? d[key] : (window.I18N.el[key] || key);
  }
  function days() { return window.DAYS[LANG] || window.DAYS.el; }

  function applyLangTexts() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      el.textContent = el.hasAttribute('data-caps') ? grUpper(v) : v;
    });
  }

  function applyLang() {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      el.textContent = el.hasAttribute('data-caps') ? grUpper(v) : v;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':');
        if (p.length === 2) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === LANG));
    });
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: LANG } }));
  }

  function setLang(l) {
    if (l === LANG) return;
    LANG = l;
    try { localStorage.setItem('hmv_lang', l); } catch (e) {}
    applyLang();
    fixGreekCaps();
  }

  /* ---------- χρόνος (Europe/Athens ανεξάρτητα από τη ζώνη του χρήστη) */
  function tzOffsetMs(date, tz) {
    var dtf = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    var p = {};
    dtf.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    var h = p.hour === '24' ? '00' : p.hour;
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +h, +p.minute, +p.second);
    return asUTC - date.getTime();
  }

  function athens(y, m, d, hh, mm) {
    var guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
    var off = tzOffsetMs(new Date(guess), TZ);
    off = tzOffsetMs(new Date(guess - off), TZ);
    return new Date(guess - off);
  }

  function nowAthens() {
    var n = new Date();
    var s = new Date(n.getTime() + tzOffsetMs(n, TZ));
    return {
      y: s.getUTCFullYear(), m: s.getUTCMonth() + 1, d: s.getUTCDate(),
      hh: s.getUTCHours(), mm: s.getUTCMinutes(),
      dow: s.getUTCDay(), minutes: s.getUTCHours() * 60 + s.getUTCMinutes(),
      iso: iso(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate())
    };
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
  function parseISO(s) { var p = s.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function hm2min(s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; }
  function min2hm(v) { return pad(Math.floor(v / 60)) + ':' + pad(v % 60); }

  function dowOf(isoDate) {
    var p = parseISO(isoDate);
    return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
  }
  function addDaysISO(isoDate, n) {
    var p = parseISO(isoDate);
    var dt = new Date(Date.UTC(p.y, p.m - 1, p.d + n));
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  function fmtDateLong(isoDate) {
    var p = parseISO(isoDate), D = days();
    return D.long[dowOf(isoDate)] + ' ' + p.d + ' ' + D.monthsLong[p.m - 1];
  }
  function fmtDateShort(isoDate) {
    var p = parseISO(isoDate), D = days();
    return D.short[dowOf(isoDate)] + ' ' + p.d + ' ' + D.months[p.m - 1];
  }

  /* ---------- API ---------------------------------------------------- */
  var DEMO = !C.API_URL;

  function apiGet(params) {
    if (DEMO) return Promise.reject(new Error('DEMO'));
    var qs = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch(C.API_URL + '?' + qs, { method: 'GET', redirect: 'follow' })
      .then(function (r) { return r.json(); });
  }

  /* text/plain => "simple request", ώστε το Apps Script να μη χρειάζεται
     preflight OPTIONS (που δεν υποστηρίζει). */
  function apiPost(body) {
    if (DEMO) return Promise.reject(new Error('DEMO'));
    return fetch(C.API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  /* ---------- ωράριο / κατάσταση ------------------------------------- */
  function rangesFor(dow) { return (C.hours[dow] || []).map(function (r) { return [hm2min(r[0]), hm2min(r[1])]; }); }

  function openState() {
    var n = nowAthens();
    var today = rangesFor(n.dow);
    for (var i = 0; i < today.length; i++) {
      if (n.minutes >= today[i][0] && n.minutes < today[i][1]) return { open: true, until: min2hm(today[i][1]) };
    }
    for (var j = 0; j < today.length; j++) {
      if (n.minutes < today[j][0]) return { open: false, when: 'today', at: min2hm(today[j][0]) };
    }
    for (var k = 1; k <= 7; k++) {
      var dw = (n.dow + k) % 7, r = rangesFor(dw);
      if (r.length) return { open: false, when: k === 1 ? 'tomorrow' : days().long[dw], at: min2hm(r[0][0]) };
    }
    return { open: false };
  }

  function renderStatus() {
    var el = document.querySelector('[data-status]');
    if (!el) return;
    var s = openState(), txt;
    el.dataset.open = s.open ? '1' : '0';
    if (s.open) {
      txt = t('status.open') + ' · ' + t('status.until') + ' ' + s.until;
    } else {
      var when = s.when === 'today' ? t('status.today') : s.when === 'tomorrow' ? t('status.tomorrow') : s.when;
      txt = t('status.closed') + (s.at ? ' · ' + t('status.opens') + ' ' + when + ' ' + s.at : '');
    }
    var slot = el.querySelector('[data-status-text]');
    slot.textContent = getComputedStyle(slot).textTransform === 'uppercase' ? grUpper(txt) : txt;
    slot.style.textTransform = 'none';
  }

  function renderHours() {
    var box = document.querySelector('[data-hours]');
    if (!box) return;
    var n = nowAthens(), D = days(), order = [1, 2, 3, 4, 5, 6, 0], html = '';
    order.forEach(function (dw) {
      var r = C.hours[dw] || [];
      var txt = r.length ? r.map(function (x) { return x[0] + '–' + x[1]; }).join(' · ') : t('hrs.closed');
      html += '<div class="hours__row" data-today="' + (dw === n.dow ? 1 : 0) + '">' +
              '<span class="hours__d">' + D.long[dw] + '</span>' +
              '<span class="hours__t' + (r.length ? '' : ' closed') + '">' + txt + '</span></div>';
    });
    box.innerHTML = html;
  }

  function renderPrices() {
    var box = document.querySelector('[data-prices]');
    if (!box) return;
    box.innerHTML =
      '<div class="prices__hd">' + t('srv.h2') + '<span class="tag">' + new Date().getFullYear() + '</span></div>' +
      C.services.map(function (s) {
        return '<div class="price">' +
          '<span class="price__name">' + (LANG === 'en' ? s.en : s.el) + '</span>' +
          '<span class="price__dur">' + s.min + "'</span>" +
          '<span class="price__amt">' + s.price + '€</span></div>';
      }).join('');
    fixGreekCaps(box);
  }

  /* ---------- header / footer / bar ---------------------------------- */
  var P = { home: 'index.html', book: 'rantevou.html', gallery: 'gallery.html', contact: 'epikoinonia.html' };

  function navLinks(current) {
    return Object.keys(P).map(function (k) {
      return '<a href="' + P[k] + '"' + (k === current ? ' aria-current="page"' : '') +
             ' data-i18n="nav.' + k + '"></a>';
    }).join('');
  }

  function buildChrome() {
    var page = document.body.dataset.page || 'home';
    var b = C.business;

    var hdr = document.querySelector('[data-header]');
    if (hdr) {
      if (DEMO && !document.querySelector('.demo')) {
        hdr.insertAdjacentHTML('beforebegin', '<div class="demo" data-i18n="demo.badge"></div>');
      }
      hdr.innerHTML =
        '<div class="hdr__in">' +
          '<a class="brand" href="index.html">' +
            '<img src="assets/img/logo.jpg" alt="' + b.name + '" width="48" height="32">' +
            '<span class="brand__txt">HAIR MANIA<small>VALKANIS</small></span>' +
          '</a>' +
          '<nav class="nav">' + navLinks(page) + '</nav>' +
          '<div class="lang" role="group" aria-label="Language">' +
            '<button type="button" data-lang="el" aria-pressed="false">ΕΛ</button>' +
            '<button type="button" data-lang="en" aria-pressed="false">EN</button>' +
          '</div>' +
          '<button class="burger" type="button" aria-expanded="false" aria-controls="drawer" data-i18n-attr="aria-label:nav.menu"><span></span></button>' +
        '</div>' +
        '<div class="drawer" id="drawer" data-open="false">' + navLinks(page) + '</div>';

      var burger = hdr.querySelector('.burger'), drawer = hdr.querySelector('.drawer');
      burger.addEventListener('click', function () {
        var open = drawer.dataset.open === 'true';
        drawer.dataset.open = String(!open);
        burger.setAttribute('aria-expanded', String(!open));
      });
      hdr.querySelectorAll('.lang button').forEach(function (btn) {
        btn.addEventListener('click', function () { setLang(btn.dataset.lang); });
      });
    }

    var ftr = document.querySelector('[data-footer]');
    if (ftr) {
      ftr.innerHTML =
        '<div class="wrap"><div class="ftr__grid">' +
          '<div>' +
            '<img src="assets/img/logo.jpg" alt="' + b.name + '" width="140" style="border:2px solid var(--line);margin-bottom:12px">' +
            '<p class="muted" style="font-size:.9rem;max-width:34ch" data-i18n="ftr.blurb"></p>' +
            '<div class="socials">' + socialsHTML(b.social) + '</div>' +
          '</div>' +
          '<div><h4 data-i18n="nav.contact"></h4><ul>' +
            b.phones.map(function (p) { return '<li><a href="tel:' + telHref(p) + '">' + fmtPhone(p) + '</a></li>'; }).join('') +
            '<li><a href="mailto:' + b.email + '">' + b.email + '</a></li>' +
            '<li><a target="_blank" rel="noopener" href="' + mapsLink() + '">' + b.address.street + ', ' + b.address.city + '</a></li>' +
          '</ul></div>' +
          '<div><h4 data-i18n="ftr.links"></h4><ul>' +
            Object.keys(P).map(function (k) { return '<li><a href="' + P[k] + '" data-i18n="nav.' + k + '"></a></li>'; }).join('') +
          '</ul></div>' +
        '</div>' +
        '<div class="copy"><span>&copy; ' + new Date().getFullYear() + ' ' + b.name + '. <span data-i18n="ftr.rights"></span></span>' +
        '<span>' + b.address.street + ' · ' + b.address.postcode + ' ' + b.address.city + '</span></div></div>';
    }

    var bar = document.querySelector('[data-bar]');
    if (bar) bar.innerHTML = defaultBar();
  }

  function defaultBar() {
    var b = C.business;
    return '<a class="btn btn--ghost" href="tel:' + telHref(b.phones[1] || b.phones[0]) + '">' +
             icon('phone') + '<span data-i18n="bar.call"></span></a>' +
           '<a class="btn btn--primary" href="rantevou.html">' +
             icon('scissors') + '<span data-i18n="bar.book"></span></a>';
  }

  function socialsHTML(s) {
    var ic = {
      facebook: '<svg viewBox="0 0 24 24"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"/></svg>',
      instagram: '<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4 1 .5.4.8.8 1 1.4.2.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-1 1.4-.4.5-.8.8-1.4 1-.4.2-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-1-.5-.4-.8-.8-1-1.4-.2-.4-.3-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 1-1.4.4-.5.8-.8 1.4-1 .4-.2 1-.3 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.9-11.1a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z"/></svg>',
      tiktok: '<svg viewBox="0 0 24 24"><path d="M16.6 5.8a4.8 4.8 0 0 1-1.1-3.1h-3.2v12.6a2.6 2.6 0 1 1-1.9-2.5V9.5a5.8 5.8 0 1 0 5 5.7V9.1a7.9 7.9 0 0 0 4.4 1.4V7.3a4.7 4.7 0 0 1-3.2-1.5Z"/></svg>'
    };
    return Object.keys(ic).filter(function (k) { return s[k]; }).map(function (k) {
      return '<a href="' + s[k] + '" target="_blank" rel="noopener" aria-label="' + k + '">' + ic[k] + '</a>';
    }).join('');
  }

  function telHref(p) { return '+30' + p; }
  function fmtPhone(p) { return p.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3'); }
  function mapsLink() { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(C.business.mapsQuery); }

  /* ---------- εξαγωγή ------------------------------------------------- */
  window.HMV = {
    get lang() { return LANG; },
    get theme() { return THEME; },
    setLang: setLang, t: t, days: days, icon: icon,
    grUpper: grUpper, fixGreekCaps: fixGreekCaps,
    DEMO: DEMO, apiGet: apiGet, apiPost: apiPost,
    athens: athens, nowAthens: nowAthens, tzOffsetMs: tzOffsetMs,
    pad: pad, iso: iso, parseISO: parseISO, hm2min: hm2min, min2hm: min2hm,
    dowOf: dowOf, addDaysISO: addDaysISO, fmtDateLong: fmtDateLong, fmtDateShort: fmtDateShort,
    rangesFor: rangesFor, mapsLink: mapsLink, telHref: telHref, fmtPhone: fmtPhone,
    renderPrices: renderPrices, applyLang: applyLang, defaultBar: defaultBar
  };

  function boot() {
    buildChrome();
    renderHours();
    renderPrices();
    applyLang();
    renderStatus();
    fixGreekCaps();
    setInterval(renderStatus, 60000);

    document.addEventListener('langchange', function () {
      renderHours(); renderPrices(); renderStatus();
      applyLangTexts();
      fixGreekCaps();
    });

    /* Οι γραμματοσειρές φορτώνουν ασύγχρονα — ξαναπερνάμε μία φορά. */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fixGreekCaps(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
