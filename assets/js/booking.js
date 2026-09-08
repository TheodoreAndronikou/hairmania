/* =============================================================
   Booking wizard — Υπηρεσία → Ημέρα → Ώρα → Στοιχεία
   Ο server (Google Apps Script) είναι η μόνη πηγή αλήθειας:
   το frontend δεν κρατάει ποτέ την τελική απόφαση για ένα slot.
   ============================================================= */
(function () {
  'use strict';

  var H = window.HMV, C = window.CONFIG, t = H.t;
  var form = document.getElementById('bk');
  if (!form) return;

  var el = {
    services: document.getElementById('bk-services'),
    days:     document.getElementById('bk-days'),
    slots:    document.getElementById('bk-slots'),
    slotsMsg: document.getElementById('bk-slots-msg'),
    summary:  document.getElementById('bk-summary'),
    submit:   document.getElementById('bk-submit'),
    err:      document.getElementById('bk-error'),
    steps:    document.querySelectorAll('.step'),
    vac:      document.getElementById('bk-vac'),
    vacTxt:   document.getElementById('bk-vac-text'),
    wizard:   document.getElementById('bk-wizard'),
    done:     document.getElementById('bk-done')
  };

  var S = {
    service: null, date: null, time: null,
    services: C.services.slice(),
    hours: C.hours,
    closures: [],   /* [{from:'YYYY-MM-DD', to:'YYYY-MM-DD', title}] */
    slots: [],
    loadToken: 0,
    submitting: false,
    idem: null
  };

  /* ---------------- helpers ---------------- */
  function svcName(s) { return H.lang === 'en' ? s.en : s.el; }
  function findSvc(id) { for (var i = 0; i < S.services.length; i++) if (S.services[i].id === id) return S.services[i]; return null; }

  function closureFor(isoDate) {
    for (var i = 0; i < S.closures.length; i++) {
      var c = S.closures[i];
      if (isoDate >= c.from && isoDate <= c.to) return c;
    }
    return null;
  }
  function dayOpen(isoDate) {
    var dow = H.dowOf(isoDate);
    var r = S.hours[dow] || [];
    return r.length > 0 && !closureFor(isoDate);
  }

  function setStep(n) {
    el.steps.forEach(function (s, i) {
      s.dataset.state = (i + 1) < n ? 'done' : (i + 1) === n ? 'active' : '';
    });
  }
  function currentStep() {
    if (!S.service) return 1;
    if (!S.date) return 2;
    if (!S.time) return 3;
    return 4;
  }
  /* Αυτόματη μετάβαση στο επόμενο βήμα (το ζητούμενο: να μη σκρολάρει ο χρήστης).
     Κρατάμε το προηγούμενο βήμα ορατό από πάνω, ώστε να μπορεί να το αλλάξει. */
  var HEADER_OFFSET = 96;
  function reduceMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function goToStep(n, focusEl) {
    var target = document.getElementById('fs-' + n);
    if (!target) return;
    var y = target.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
    window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion() ? 'auto' : 'smooth' });
    if (focusEl) setTimeout(function () { try { focusEl.focus({ preventScroll: true }); } catch (e) {} }, 420);
  }
  /* Το επιλεγμένο chip ημέρας να μπαίνει στο οπτικό πεδίο της οριζόντιας λωρίδας. */
  function centerDay(input) {
    var lab = input && input.nextElementSibling;
    if (!lab || !el.days.scrollWidth) return;
    var want = lab.offsetLeft - (el.days.clientWidth - lab.offsetWidth) / 2;
    el.days.scrollTo({ left: Math.max(0, want), behavior: reduceMotion() ? 'auto' : 'smooth' });
  }

  function showErr(msg, cls) {
    el.err.hidden = !msg;
    el.err.className = 'hint ' + (cls || 'hint--err');
    el.err.textContent = msg || '';
    if (msg) el.err.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---------------- 1. services ---------------- */
  function renderServices() {
    el.services.innerHTML = S.services.map(function (s, i) {
      return '<div class="opt">' +
        '<input type="radio" name="service" id="svc-' + s.id + '" value="' + s.id + '"' +
        (S.service === s.id ? ' checked' : '') + '>' +
        '<label for="svc-' + s.id + '">' +
          '<span class="opt__body"><span class="opt__t">' + svcName(s) + '</span>' +
          '<span class="opt__s">' + s.min + ' ' + t('bk.min') + '</span></span>' +
          '<span class="opt__p">' + s.price + '&euro;</span>' +
        '</label></div>';
    }).join('');
    H.fixGreekCaps(el.services);
    el.services.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('change', function () {
        S.service = inp.value; S.time = null;
        renderSummary(); setStep(currentStep());
        if (S.date) loadSlots(); else renderDays();
        goToStep(S.date ? 3 : 2);
      });
    });
  }

  /* ---------------- 2. days ---------------- */
  function renderDays() {
    var D = H.days(), n = H.nowAthens(), html = '', firstOpen = null;
    for (var i = 0; i < C.booking.daysAhead; i++) {
      var d = H.addDaysISO(n.iso, i);
      var p = H.parseISO(d);
      var open = dayOpen(d);
      if (open && !firstOpen) firstOpen = d;
      html += '<div class="day">' +
        '<input type="radio" name="date" id="d-' + d + '" value="' + d + '"' +
        (open ? '' : ' disabled') + (S.date === d ? ' checked' : '') + '>' +
        '<label for="d-' + d + '">' +
          '<span class="day__dow">' + D.short[H.dowOf(d)] + '</span>' +
          '<span class="day__num">' + p.d + '</span>' +
          '<span class="day__mon">' + D.months[p.m - 1] + '</span>' +
        '</label></div>';
    }
    el.days.innerHTML = html;
    H.fixGreekCaps(el.days);
    el.days.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('change', function () {
        S.date = inp.value; S.time = null;
        renderSummary(); setStep(currentStep());
        centerDay(inp);
        loadSlots(true);
      });
    });
    renderVacation();
  }

  function renderVacation() {
    if (!el.vac) return;
    var n = H.nowAthens(), upcoming = null;
    for (var i = 0; i < S.closures.length; i++) {
      var c = S.closures[i];
      if (c.to >= n.iso && (!upcoming || c.from < upcoming.from)) upcoming = c;
    }
    el.vac.dataset.show = upcoming ? 'true' : 'false';
    if (upcoming) {
      var range = upcoming.from === upcoming.to
        ? H.fmtDateLong(upcoming.from)
        : H.fmtDateLong(upcoming.from) + ' – ' + H.fmtDateLong(upcoming.to);
      el.vacTxt.textContent = range + (upcoming.title ? ' · ' + upcoming.title : '');
    }
  }

  /* ---------------- 3. slots ---------------- */
  function loadSlots(advance) {
    if (!S.date) { el.slots.innerHTML = ''; el.slotsMsg.hidden = false; el.slotsMsg.className = 'hint'; el.slotsMsg.textContent = t('bk.pickday'); return; }
    var svc = findSvc(S.service) || S.services[0];
    var token = ++S.loadToken;

    el.slots.innerHTML = '<div class="spin" role="status" aria-live="polite"></div>';
    el.slotsMsg.hidden = true;

    var p = H.DEMO
      ? Promise.resolve({ ok: true, slots: demoSlots(S.date, svc.min) })
      : H.apiGet({ action: 'slots', date: S.date, service: svc.id });

    p.then(function (res) {
      if (token !== S.loadToken) return;
      if (!res || !res.ok) throw new Error('bad');
      S.slots = res.slots || [];
      renderSlots();
      if (advance) goToStep(3);
    }).catch(function () {
      if (token !== S.loadToken) return;
      el.slots.innerHTML = '';
      el.slotsMsg.hidden = false;
      el.slotsMsg.className = 'hint hint--err';
      el.slotsMsg.innerHTML = t('bk.loaderr') + ' <button type="button" class="btn btn--ghost" style="margin-left:10px;padding:6px 14px" id="bk-retry">' + t('bk.retry') + '</button>';
      var r = document.getElementById('bk-retry');
      if (r) r.addEventListener('click', loadSlots);
    });
  }

  function renderSlots() {
    if (!S.slots.length) {
      el.slots.innerHTML = '';
      el.slotsMsg.hidden = false;
      el.slotsMsg.className = 'hint hint--warn';
      el.slotsMsg.textContent = dayOpen(S.date) ? t('bk.noslots') : t('bk.closedday');
      return;
    }
    el.slotsMsg.hidden = true;
    var morning = S.slots.filter(function (x) { return H.hm2min(x) < 15 * 60; });
    var after = S.slots.filter(function (x) { return H.hm2min(x) >= 15 * 60; });

    function group(list) {
      return '<div class="slots">' + list.map(function (x) {
        return '<div class="slot"><input type="radio" name="time" id="t-' + x + '" value="' + x + '"' +
          (S.time === x ? ' checked' : '') + '><label for="t-' + x + '">' + x + '</label></div>';
      }).join('') + '</div>';
    }
    var html = '';
    if (morning.length) html += '<p class="slots__part">' + t('bk.morning') + '</p>' + group(morning);
    if (after.length)   html += '<p class="slots__part">' + t('bk.afternoon') + '</p>' + group(after);
    el.slots.innerHTML = html;

    H.fixGreekCaps(el.slots);
    el.slots.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('change', function () {
        S.time = inp.value; showErr(''); renderSummary(); setStep(currentStep());
        var name = document.getElementById('f-name');
        goToStep(4, name && !name.value ? name : null);
      });
    });
  }

  /* Demo mode: ρεαλιστικές ψεύτικες ώρες όσο δεν υπάρχει backend. */
  function demoSlots(date, dur) {
    if (!dayOpen(date)) return [];
    var n = H.nowAthens(), out = [];
    var ranges = H.rangesFor(H.dowOf(date));
    var seed = 0; for (var i = 0; i < date.length; i++) seed = (seed * 31 + date.charCodeAt(i)) % 9973;
    ranges.forEach(function (r) {
      for (var m = r[0]; m + dur <= r[1]; m += C.booking.slotStep) {
        if (date === n.iso && m < n.minutes + C.booking.leadTimeMinutes) continue;
        seed = (seed * 1103515245 + 12345) % 2147483648;
        if ((seed >> 7) % 10 < 4) continue;              /* ~40% κατειλημμένα */
        out.push(H.min2hm(m));
      }
    });
    return out;
  }

  /* ---------------- 4. summary ---------------- */
  function renderSummary() {
    var svc = findSvc(S.service);
    var ready = !!(S.service && S.date && S.time);
    var rows = [];
    if (svc) rows.push([t('bk.sum_srv'), H.grUpper(svcName(svc))]);
    if (S.date) rows.push([t('bk.sum_when'), H.grUpper(H.fmtDateShort(S.date) + (S.time ? ' · ' + S.time : ''))]);
    if (svc) rows.push([t('bk.sum_dur'), svc.min + "'"]);

    el.summary.innerHTML =
      '<div class="summary__hd">' + t('bk.sum') + '</div>' +
      '<dl class="summary__bd">' + rows.map(function (r) {
        return '<div class="summary__row"><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
      }).join('') + '</dl>' +
      (svc ? '<div class="summary__tot"><b>' + svc.price + ',00 €</b>' +
             '<span class="muted" style="margin-left:auto;font-size:.78rem">' + t('bk.sum_price') + '</span></div>' : '');

    H.fixGreekCaps(el.summary);
    el.submit.disabled = !ready;
    renderBar(ready, svc);
  }

  /* Κάτω μπάρα κινητού: όσο λείπει κάτι δείχνει τηλέφωνο/ραντεβού,
     μόλις συμπληρωθεί γίνεται σύνοψη + κουμπί επιβεβαίωσης. */
  function renderBar(ready, svc) {
    var bar = document.querySelector('[data-bar]');
    if (!bar) return;
    if (!ready) {
      if (bar.dataset.mode !== 'default') { bar.innerHTML = H.defaultBar(); bar.dataset.mode = 'default'; H.applyLang(); }
      return;
    }
    bar.dataset.mode = 'summary';
    bar.innerHTML =
      '<span class="bar__sum"><span class="k">' + t('bk.sum') + '</span>' +
      '<span class="v">' + H.fmtDateShort(S.date) + ' · ' + S.time + ' · ' + svc.price + '€</span></span>' +
      '<button type="button" class="btn btn--accent btn--go" id="bar-go">' + t('bk.submit') + '</button>';
    H.fixGreekCaps(bar);
    var go = document.getElementById('bar-go');
    if (go) go.addEventListener('click', function () {
      if (form.requestSubmit) form.requestSubmit(); else el.submit.click();
    });
  }

  /* ---------------- validation ---------------- */
  function field(id) { return document.getElementById(id); }
  function invalid(id, bad) { field(id).setAttribute('aria-invalid', bad ? 'true' : 'false'); return !bad; }

  function validate() {
    var ok = true;
    ok = invalid('f-name', field('f-name').value.trim().length < 2) && ok;
    var ph = field('f-phone').value.replace(/[^\d]/g, '');
    ok = invalid('f-phone', !/^(69\d{8}|2\d{9})$/.test(ph)) && ok;
    var em = field('f-email').value.trim();
    ok = invalid('f-email', em !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) && ok;
    return ok;
  }

  /* ---------------- submit ---------------- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (S.submitting) return;
    showErr('');
    if (!(S.service && S.date && S.time)) { showErr(t('bk.pickday')); return; }
    if (!validate()) { form.querySelector('[aria-invalid="true"]').focus(); return; }

    var svc = findSvc(S.service);
    if (!S.idem) S.idem = 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    var payload = {
      action: 'book',
      idem: S.idem,
      date: S.date,
      time: S.time,
      serviceId: svc.id,
      serviceName: svc.el,
      duration: svc.min,
      price: svc.price,
      name: field('f-name').value.trim(),
      phone: field('f-phone').value.replace(/[^\d]/g, ''),
      email: field('f-email').value.trim(),
      notes: field('f-notes').value.trim(),
      lang: H.lang
    };

    S.submitting = true;
    el.submit.disabled = true;
    var label = el.submit.textContent;
    el.submit.textContent = t('bk.submitting');

    var p = H.DEMO
      ? new Promise(function (res) {
          setTimeout(function () {
            res({ ok: true, eventId: 'demo-' + S.idem, cancelKey: Math.random().toString(36).slice(2, 10) });
          }, 900);
        })
      : H.apiPost(payload);

    p.then(function (res) {
      if (res && res.ok) { success(res, payload, svc); return; }
      if (res && res.error === 'SLOT_TAKEN') {
        showErr(t('bk.taken'));
        S.time = null; S.idem = null;
        loadSlots(); renderSummary(); setStep(3);
      } else {
        showErr(t('bk.failed'));
      }
    }).catch(function () {
      showErr(t('bk.failed'));
    }).then(function () {
      S.submitting = false;
      el.submit.textContent = label;
      el.submit.disabled = !(S.service && S.date && S.time);
    });
  });

  /* ---------------- success ---------------- */
  function success(res, payload, svc) {
    var p = H.parseISO(payload.date), hm = payload.time.split(':');
    var start = H.athens(p.y, p.m, p.d, +hm[0], +hm[1]);
    var end = new Date(start.getTime() + svc.min * 60000);
    var b = C.business;
    var addr = b.address.street + ', ' + b.address.city + ' ' + b.address.postcode;

    var cancelUrl = location.origin +
      location.pathname.replace(/[^/]*$/, '') + 'akyrosi.html' +
      '?id=' + encodeURIComponent(res.eventId) + '&k=' + encodeURIComponent(res.cancelKey);

    var ev = {
      uid: (res.eventId || S.idem) + '@hairmania-valkanis',
      start: start, end: end,
      title: (H.lang === 'en' ? 'Barber — ' : 'Κούρεμα — ') + b.name + ' (' + svcName(svc) + ')',
      description: (H.lang === 'en' ? 'Service: ' : 'Υπηρεσία: ') + svcName(svc) +
        '\n' + (H.lang === 'en' ? 'Phone: ' : 'Τηλέφωνο: ') + b.phones.join(' / ') +
        '\n' + (H.lang === 'en' ? 'Cancel: ' : 'Ακύρωση: ') + cancelUrl,
      location: addr,
      url: cancelUrl,
      alarms: C.booking.reminderHours
    };
    var icsText = window.ICS.build(ev);

    el.wizard.hidden = true;
    el.done.hidden = false;
    el.done.innerHTML =
      '<div class="confirm">' +
        '<div class="confirm__top">' +
          '<h2>' + t('ok.h2') + '</h2>' +
          '<p>' + H.grUpper(H.fmtDateLong(payload.date) + ' · ' + payload.time + ' · ' + svcName(svc)) + '</p>' +
        '</div>' +
        '<div class="confirm__bd">' +
          '<p class="muted" style="font-size:.8rem;margin-bottom:2px">' + t('ok.code') + '</p>' +
          '<div class="confirm__code">' + (res.cancelKey || '').toUpperCase() + '</div>' +
          '<p class="muted" style="font-size:.88rem;margin-top:10px">' + t('ok.sub') + '</p>' +
          '<div class="confirm__actions">' +
            '<button type="button" class="btn btn--accent" id="dl-ics">' + H.icon('download') + t('ok.ics') + '</button>' +
            '<a class="btn btn--ghost" target="_blank" rel="noopener" href="' + window.ICS.googleUrl(ev) + '">' + H.icon('calendar') + t('ok.gcal') + '</a>' +
            '<button type="button" class="btn btn--ghost" id="cp-link">' + H.icon('link') + t('ok.copy') + '</button>' +
            '<a class="btn btn--ghost" href="rantevou.html">' + H.icon('scissors') + t('ok.again') + '</a>' +
          '</div>' +
          '<p class="muted" style="font-size:.78rem;margin-top:18px">' + t('ok.ics_note') + '</p>' +
          '<p class="muted" style="font-size:.78rem">' + t('ok.cancel_note') + '</p>' +
        '</div>' +
      '</div>';
    H.fixGreekCaps(el.done);

    var bar = document.querySelector('[data-bar]');
    if (bar) { bar.innerHTML = H.defaultBar(); bar.dataset.mode = 'default'; H.applyLang(); H.fixGreekCaps(bar); }

    document.getElementById('dl-ics').addEventListener('click', function () {
      window.ICS.download(icsText, 'rantevou-hairmania.ics');
    });
    document.getElementById('cp-link').addEventListener('click', function () {
      var btn = this;
      var done = function () { btn.textContent = '✓ ' + t('ok.copied'); };
      if (navigator.clipboard) navigator.clipboard.writeText(cancelUrl).then(done, done);
      else { window.prompt(t('ok.cancel'), cancelUrl); }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- bootstrap ---------------- */
  function init() {
    renderServices(); renderDays(); renderSummary(); setStep(1);
    el.slotsMsg.hidden = false; el.slotsMsg.className = 'hint'; el.slotsMsg.textContent = t('bk.pickday');

    if (!H.DEMO) {
      H.apiGet({ action: 'bootstrap' }).then(function (res) {
        if (!res || !res.ok) return;
        if (res.services && res.services.length) { S.services = res.services; C.services = res.services; }
        if (res.hours) { S.hours = res.hours; C.hours = res.hours; }
        if (res.closures) S.closures = res.closures;
        renderServices(); renderDays(); renderSummary(); H.renderPrices();
      }).catch(function () { /* κρατάμε τα fallback του config.js */ });
    }
  }

  document.addEventListener('langchange', function () {
    renderServices(); renderDays(); renderSummary();
    if (S.date) renderSlots(); else { el.slotsMsg.hidden = false; el.slotsMsg.className = 'hint'; el.slotsMsg.textContent = t('bk.pickday'); }
    setStep(currentStep());
  });

  init();
})();
