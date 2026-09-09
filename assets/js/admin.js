/* =============================================================
   Διαχειριστικό κουρείου

   ΜΙΑ ΠΗΓΗ ΑΛΗΘΕΙΑΣ: το Google Calendar του καταστήματος.
   Ό,τι γράφεται εδώ πάει στον server και το βλέπουν όλοι — δεν
   μένει σε αυτό το κινητό. Ο κωδικός ελέγχεται ΣΤΟΝ SERVER.

   Τι λείπει μέχρι να μπει η πραγματική βάση (MySQL):
     • ταχύτητα — το Apps Script θέλει 2-10 δευτ. ανά ενέργεια
     • ο κωδικός ταξιδεύει με κάθε αίτημα (αρκετό για ένα κουρείο,
       όχι για σοβαρό σύστημα)
   ============================================================= */
(function () {
  'use strict';

  var gate = document.getElementById('gate');
  if (!gate) return;

  var H = window.HMV, C = window.CONFIG;
  var DB = window.HMV_DB;

  /** Ημερομηνία+ώρα Αθήνας -> πραγματικό Date. */
  function startOf(dateISO, hhmm) {
    var p = H.parseISO(dateISO), hm = hhmm.split(':');
    return H.athens(p.y, p.m, p.d, +hm[0], +hm[1]);
  }
  var panel = document.getElementById('panel');
  var sheet = document.getElementById('sheet');
  var day = H.nowAthens().iso;
  var pin = '';
  var data = null;
  var loadSeq = 0;

  try { pin = sessionStorage.getItem('hmv_pin') || ''; } catch (e) {}

  /* ---------- επικοινωνία ---------- */
  function api(params) {
    var qs = Object.keys(params).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');
    return fetch(C.API_URL + '?' + qs, { redirect: 'follow' }).then(function (r) { return r.json(); });
  }
  function send(body) {
    body.pin = pin;
    return fetch(C.API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  /* ---------- είσοδος ---------- */
  function tryPin() {
    var v = document.getElementById('pw').value.trim();
    var btn = document.getElementById('gate-go');
    var err = document.getElementById('pw-err');
    err.style.display = 'none';
    btn.disabled = true; btn.textContent = 'ΕΛΕΓΧΟΣ…';

    DB.adminDay(v, day).then(function (res) {
      btn.disabled = false; btn.textContent = 'ΕΙΣΟΔΟΣ';
      if (res && res.ok) {
        pin = v;
        try { sessionStorage.setItem('hmv_pin', pin); } catch (e) {}
        data = res; unlock(); paint();
      } else {
        err.textContent = !res ? 'Δεν συνδέθηκε — δοκίμασε ξανά'
          : res.error === 'BAD_PIN' ? 'Λάθος κωδικός'
          : res.error === 'UNKNOWN_ACTION' ? 'Ο server τρέχει παλιά έκδοση — ανέβασε ξανά το Code.gs'
          : 'Δεν συνδέθηκε — δοκίμασε ξανά';
        err.style.display = 'block';
      }
    }).catch(function () {
      btn.disabled = false; btn.textContent = 'ΕΙΣΟΔΟΣ';
      err.textContent = 'Δεν συνδέθηκε — έλεγξε το ίντερνετ';
      err.style.display = 'block';
    });
  }

  function unlock() {
    gate.hidden = true; panel.hidden = false;
    document.getElementById('adm-prev').innerHTML = H.icon('left');
    document.getElementById('adm-next').innerHTML = H.icon('right');
    document.getElementById('sheet-x').innerHTML = H.icon('close');
  }

  document.getElementById('gate-go').addEventListener('click', tryPin);
  document.getElementById('pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') tryPin(); });
  if (pin) { unlock(); load(); }

  document.getElementById('adm-out').addEventListener('click', function () {
    try { sessionStorage.removeItem('hmv_pin'); } catch (e) {}
    location.reload();
  });

  /* ---------- φόρτωση ημέρας ---------- */
  function load() {
    var seq = ++loadSeq;
    setBusy(true);
    DB.adminDay(pin, day).then(function (res) {
      if (seq !== loadSeq) return;
      setBusy(false);
      if (!res || !res.ok) { fail(res && res.error === 'BAD_PIN' ? 'Ο κωδικός δεν ισχύει πια' : 'Δεν φόρτωσε'); return; }
      data = res; paint();
    }).catch(function () {
      if (seq !== loadSeq) return;
      setBusy(false); fail('Δεν φόρτωσε — έλεγξε το ίντερνετ');
    });
  }

  function setBusy(on) {
    if (on) document.getElementById('adm-sub').textContent = 'Φόρτωση…';
    document.getElementById('adm-list').style.opacity = on ? '.4' : '1';
    ['adm-walkin', 'adm-block', 'adm-closeday'].forEach(function (id) {
      document.getElementById(id).disabled = on;
    });
  }
  function fail(msg) {
    document.getElementById('adm-sub').textContent = '';
    document.getElementById('adm-list').innerHTML =
      '<div class="adm__empty">' + msg +
      '<br><button class="btn btn--ghost" id="adm-retry" style="margin-top:12px;padding:8px 16px;font-size:.7rem">ΔΟΚΙΜΑΣΕ ΞΑΝΑ</button></div>';
    var r = document.getElementById('adm-retry');
    if (r) r.addEventListener('click', load);
  }

  document.getElementById('adm-prev').addEventListener('click', function () { day = H.addDaysISO(day, -1); paintHeader(); load(); });
  document.getElementById('adm-next').addEventListener('click', function () { day = H.addDaysISO(day, 1); paintHeader(); load(); });

  /* ---------- εμφάνιση ---------- */
  function paintHeader() {
    var D = H.days(), p = H.parseISO(day);
    document.getElementById('adm-date').textContent =
      H.grUpper(D.long[H.dowOf(day)] + ' ' + p.d + ' ' + D.monthsLong[p.m - 1]);
  }

  function paint() {
    paintHeader();
    if (!data) return;
    var n = H.nowAthens();
    var appts = data.items.filter(function (x) { return !x.block; });
    document.getElementById('adm-sub').textContent =
      (day === n.iso ? 'Σήμερα · ' : '') + appts.length + ' ραντεβού';

    var host = document.getElementById('adm-list');

    if (data.closed !== null || !(data.hours || []).length) {
      host.innerHTML = '<div class="adm__closed">' + H.icon('close') +
        '<b>ΚΛΕΙΣΤΑ</b><span>' +
        (data.closed !== null ? esc(data.closed || 'το έκλεισες εσύ') : 'εκτός ωραρίου') +
        '</span></div>';
      return;
    }
    if (!data.items.length) {
      host.innerHTML = '<div class="adm__empty">Καμία καταχώρηση για αυτή τη μέρα</div>';
      return;
    }

    host.innerHTML = data.items.map(function (x) {
      if (x.block) {
        return '<div class="adm__row adm__row--block" data-id="' + esc(x.id) + '">' +
          '<span class="adm__time">' + esc(x.time) + '</span>' +
          '<span class="adm__body"><b>ΜΠΛΟΚΑΡΙΣΜΕΝΟ</b><small>' + (esc(x.title) || '—') + ' · ' + x.min + "'</small></span>" +
          '<button class="adm__del" aria-label="Διαγραφή"></button></div>';
      }
      return '<div class="adm__row" data-id="' + esc(x.id) + '">' +
        '<span class="adm__time">' + esc(x.time) + '</span>' +
        '<span class="adm__body"><b>' + (esc(x.name) || esc(x.title)) + '</b><small>' +
          esc(x.service) + ' · ' + x.min + "'" + (x.online ? ' · online' : ' · με το χέρι') + '</small></span>' +
        (x.phone ? '<a class="adm__call" href="tel:+30' + esc(x.phone) + '" aria-label="Κλήση"></a>' : '') +
        '<button class="adm__del" aria-label="Διαγραφή"></button></div>';
    }).join('');

    host.querySelectorAll('.adm__call').forEach(function (b) { b.innerHTML = H.icon('phone'); });
    host.querySelectorAll('.adm__del').forEach(function (b) {
      b.innerHTML = H.icon('close');
      b.addEventListener('click', function () {
        var id = b.parentNode.getAttribute('data-id');
        var item = data.items.filter(function (x) { return x.id === id; })[0];
        if (!item) return;
        askDelete((item.name || item.title || 'Καταχώρηση') + ' · ' + item.time, id);
      });
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[<>&"]/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c];
    });
  }

  /* ---------- φύλλο ---------- */
  function openSheet(title, html, onMount) {
    document.getElementById('sheet-title').textContent = H.grUpper(title);
    document.getElementById('sheet-body').innerHTML = html;
    sheet.hidden = false;
    if (onMount) onMount();
  }
  function closeSheet() { sheet.hidden = true; }
  document.getElementById('sheet-x').addEventListener('click', closeSheet);
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });

  /** Κάθε ενέργεια περνάει από τον server· δείχνουμε τι γίνεται. */
  function run(btn, fn) {
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'ΑΠΟΘΗΚΕΥΕΤΑΙ…';
    fn().then(function (res) {
      if (res && res.ok) { closeSheet(); load(); return; }
      btn.disabled = false; btn.textContent = label;
      alertSheet(!res ? 'Δεν αποθηκεύτηκε — δοκίμασε ξανά'
        : res.error === 'BAD_PIN' ? 'Ο κωδικός δεν ισχύει'
        : res.error === 'SLOT_TAKEN' ? 'Η ώρα είναι ήδη πιασμένη'
        : 'Δεν αποθηκεύτηκε — δοκίμασε ξανά');
    }).catch(function () {
      btn.disabled = false; btn.textContent = label;
      alertSheet('Δεν αποθηκεύτηκε — έλεγξε το ίντερνετ');
    });
  }
  function alertSheet(msg) {
    var p = document.createElement('p');
    p.className = 'hint hint--err';
    p.style.marginTop = '12px';
    p.textContent = msg;
    document.getElementById('sheet-body').appendChild(p);
  }

  function timeOptions() {
    var out = '', step = (C.booking && C.booking.slotStep) || 30;
    ((data && data.hours) || []).forEach(function (r) {
      for (var m = H.hm2min(r[0]); m < H.hm2min(r[1]); m += step) out += '<option>' + H.min2hm(m) + '</option>';
    });
    return out || '<option>09:00</option>';
  }

  /* ---------- ενέργειες ---------- */
  document.getElementById('adm-walkin').addEventListener('click', function () {
    openSheet('Νέο ραντεβού',
      '<div class="field"><label for="w-name">Όνομα</label><input id="w-name" type="text" placeholder="π.χ. Γιώργος"></div>' +
      '<div class="field"><label for="w-phone">Τηλέφωνο (προαιρετικό)</label><input id="w-phone" type="tel" inputmode="numeric" placeholder="69…"></div>' +
      '<div class="field"><label for="w-time">Ώρα</label><select id="w-time" class="adm__sel">' + timeOptions() + '</select></div>' +
      '<div class="field"><label for="w-svc">Υπηρεσία</label><select id="w-svc" class="adm__sel">' +
        C.services.map(function (s) { return '<option value="' + s.id + '">' + s.el + '</option>'; }).join('') +
      '</select></div>' +
      '<button class="btn btn--accent btn--wide" id="w-go">ΚΑΤΑΧΩΡΗΣΗ</button>',
      function () {
        var go = document.getElementById('w-go');
        go.addEventListener('click', function () {
          run(go, function () {
            return DB.adminAdd(pin, {
              start: startOf(day, document.getElementById('w-time').value),
              serviceId: document.getElementById('w-svc').value,
              name: document.getElementById('w-name').value.trim(),
              phone: document.getElementById('w-phone').value.trim()
            });
          });
        });
      });
  });

  document.getElementById('adm-block').addEventListener('click', function () {
    openSheet('Μπλοκάρισμα ωρών',
      '<div class="field"><label for="b-time">Από</label><select id="b-time" class="adm__sel">' + timeOptions() + '</select></div>' +
      '<div class="field"><label for="b-min">Για πόσο</label><select id="b-min" class="adm__sel">' +
        [30, 60, 90, 120, 180, 240].map(function (m) { return '<option value="' + m + '">' + m + ' λεπτά</option>'; }).join('') +
      '</select></div>' +
      '<div class="field"><label for="b-note">Αιτία (προαιρετικό)</label><input id="b-note" type="text" placeholder="π.χ. συνεργείο"></div>' +
      '<button class="btn btn--accent btn--wide" id="b-go">ΜΠΛΟΚΑΡΕ</button>',
      function () {
        var go = document.getElementById('b-go');
        go.addEventListener('click', function () {
          run(go, function () {
            return DB.adminBlock(pin, {
              start: startOf(day, document.getElementById('b-time').value),
              minutes: +document.getElementById('b-min').value,
              note: document.getElementById('b-note').value.trim()
            });
          });
        });
      });
  });

  document.getElementById('adm-closeday').addEventListener('click', function () {
    openSheet('Διακοπές / ρεπό',
      '<p class="muted" style="font-size:.85rem;margin-top:0">Διάλεξε ολόκληρο διάστημα — δεν χρειάζεται μέρα-μέρα.</p>' +
      '<div class="field-row">' +
        '<div class="field"><label for="c-from">Από</label><input id="c-from" type="date" class="adm__sel" value="' + day + '"></div>' +
        '<div class="field"><label for="c-to">Έως και</label><input id="c-to" type="date" class="adm__sel" value="' + H.addDaysISO(day, 6) + '"></div>' +
      '</div>' +
      '<div class="field"><label for="c-note">Αιτία (προαιρετικό)</label><input id="c-note" type="text" placeholder="π.χ. διακοπές"></div>' +
      '<p class="hint" id="c-info" style="margin-bottom:14px"></p>' +
      '<button class="btn btn--accent btn--wide" id="c-go">ΚΛΕΙΣΕ ΤΟ ΔΙΑΣΤΗΜΑ</button>',
      function () {
        var from = document.getElementById('c-from'), to = document.getElementById('c-to');
        var info = document.getElementById('c-info'), go = document.getElementById('c-go');
        function count() {
          if (!from.value || !to.value || to.value < from.value) return 0;
          var n = 0, d = from.value;
          while (d <= to.value && n < 400) { n++; d = H.addDaysISO(d, 1); }
          return n;
        }
        function refresh() {
          var n = count();
          info.textContent = n ? ('Θα κλείσουν ' + n + (n === 1 ? ' μέρα' : ' μέρες')) : 'Διάλεξε σωστό διάστημα';
          go.disabled = !n;
        }
        from.addEventListener('change', refresh);
        to.addEventListener('change', refresh);
        refresh();
        go.addEventListener('click', function () {
          run(go, function () { return DB.adminClose(pin, from.value, to.value, document.getElementById('c-note').value.trim()); });
        });
      });
  });

  function askDelete(label, id) {
    openSheet('Διαγραφή',
      '<p style="margin-top:0">Να διαγραφεί;</p>' +
      '<p style="font-weight:600;margin-bottom:18px">' + esc(label) + '</p>' +
      '<div style="display:grid;gap:8px">' +
        '<button class="btn btn--wide" id="d-yes" style="background:var(--err);color:#fff;border-color:var(--err)">ΔΙΑΓΡΑΦΗ</button>' +
        '<button class="btn btn--ghost btn--wide" id="d-no">ΑΚΥΡΟ</button>' +
      '</div>',
      function () {
        var yes = document.getElementById('d-yes');
        yes.addEventListener('click', function () { run(yes, function () { return DB.adminDelete(pin, id); }); });
        document.getElementById('d-no').addEventListener('click', closeSheet);
      });
  }

  paintHeader();
})();
