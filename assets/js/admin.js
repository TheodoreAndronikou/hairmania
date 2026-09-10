/* =============================================================
   Διαχειριστικό κουρείου

   ΜΙΑ ΠΗΓΗ ΑΛΗΘΕΙΑΣ: η βάση (Supabase / PostgreSQL).
   Ό,τι γράφεται εδώ πάει στη βάση και το βλέπουν όλοι — δεν μένει
   σε αυτό το κινητό. Ο κωδικός ελέγχεται ΣΤΗ ΒΑΣΗ, ποτέ εδώ.

   Γνωστός συμβιβασμός: ο κωδικός ταξιδεύει με κάθε αίτημα. Αρκετό
   για ένα κουρείο· όχι για σύστημα με πολλούς χρήστες.
   ============================================================= */
(function () {
  'use strict';

  var gate = document.getElementById('gate');
  if (!gate) return;

  var H = window.HMV, C = window.CONFIG;
  var DB = window.HMV_DB;
  if (!DB) {                       /* χωρίς κλειδιά δεν υπάρχει διαχειριστικό */
    gate.innerHTML = '<p class="adm__empty">Λείπουν τα στοιχεία σύνδεσης με τη βάση (config.js).</p>';
    return;
  }

  /** Ημερομηνία+ώρα Αθήνας -> πραγματικό Date. */
  function startOf(dateISO, hhmm) {
    var p = H.parseISO(dateISO), hm = hhmm.split(':');
    return H.athens(p.y, p.m, p.d, +hm[0], +hm[1]);
  }
  var panel = document.getElementById('panel');
  var sheet = document.getElementById('sheet');
  var day = H.nowAthens().iso;
  var view = 'day';          /* day | week */
  var week = null;           /* {days:[iso], data:{iso:res}} */
  var pin = '';
  var data = null;
  var loadSeq = 0;

  try { pin = sessionStorage.getItem('hmv_pin') || ''; } catch (e) {}

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
    pinWarn();
    document.getElementById('adm-prev').innerHTML = H.icon('left');
    document.getElementById('adm-next').innerHTML = H.icon('right');
    document.getElementById('sheet-x').innerHTML = H.icon('close');
  }

  var eye = document.getElementById('pw-eye');
  if (eye) eye.addEventListener('click', function () {
    var f = document.getElementById('pw');
    var show = f.type === 'password';
    f.type = show ? 'text' : 'password';
    eye.textContent = show ? 'ΚΡΥΨΕ' : 'ΔΕΙΞΕ';
    f.focus();
  });

  document.getElementById('gate-go').addEventListener('click', tryPin);
  document.getElementById('pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') tryPin(); });
  if (pin) { unlock(); load(); }

  /* Ο κωδικός φεύγει από το schema.sql σαν 1234. Αν δεν αλλάξει, όποιος
     μαντέψει τη διεύθυνση βλέπει ονόματα και τηλέφωνα πελατών. */
  function pinWarn() {
    var box = document.getElementById('adm-warn');
    box.hidden = pin !== '1234';
  }

  function openPin() {
    openSheet('Αλλαγή κωδικού',
      '<div class="field"><label for="p-new">Νέος κωδικός</label>' +
      '<input id="p-new" type="text" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="τουλάχιστον 4 χαρακτήρες"></div>' +
      '<div class="field"><label for="p-again">Ξαναγράψ\' τον</label>' +
      '<input id="p-again" type="text" autocapitalize="off" autocorrect="off" spellcheck="false"></div>' +
      '<p class="adm__note">Γράψ\' τον και κάπου έξω από το κινητό. Αν χαθεί, θέλει επέμβαση στη βάση.</p>' +
      '<button class="btn btn--accent btn--wide" id="p-go">ΑΛΛΑΞΕ ΤΟΝ</button>',
      function () {
        var go = document.getElementById('p-go');
        go.addEventListener('click', function () {
          var v1 = document.getElementById('p-new').value.trim();
          var v2 = document.getElementById('p-again').value.trim();
          if (v1.length < 4) { alertSheet('Θέλει τουλάχιστον 4 χαρακτήρες'); return; }
          if (v1 !== v2) { alertSheet('Οι δύο κωδικοί δεν είναι ίδιοι'); return; }
          run(go, function () {
            return DB.adminSetPin(pin, v1).then(function (res) {
              if (res && res.ok) {
                pin = v1;
                try { sessionStorage.setItem('hmv_pin', pin); } catch (e) {}
                pinWarn();
              }
              return res;
            });
          });
        });
      });
  }
  document.getElementById('adm-pin').addEventListener('click', openPin);
  document.getElementById('adm-warn-go').addEventListener('click', openPin);

  document.getElementById('adm-out').addEventListener('click', function () {
    try { sessionStorage.removeItem('hmv_pin'); } catch (e) {}
    location.reload();
  });

  /* ---------- φόρτωση ημέρας ---------- */
  function load() {
    var seq = ++loadSeq;
    setBusy(true);

    if (view === 'day') {
      DB.adminDay(pin, day).then(function (res) {
        if (seq !== loadSeq) return;
        setBusy(false);
        if (!res || !res.ok) { fail(res && res.error === 'BAD_PIN' ? 'Ο κωδικός δεν ισχύει πια' : 'Δεν φόρτωσε'); return; }
        data = res; paint();
      }).catch(function () {
        if (seq !== loadSeq) return;
        setBusy(false); fail('Δεν φόρτωσε — έλεγξε το ίντερνετ');
      });
      return;
    }

    /* Επτά κλήσεις παράλληλα. Η βάση τις εξυπηρετεί ταυτόχρονα — συνολικά
       όσο περίπου και μία. (Με το Apps Script αυτό ήταν αδιανόητο.) */
    var days = [], w0 = weekStart(day);
    for (var i = 0; i < 7; i++) days.push(H.addDaysISO(w0, i));

    Promise.all(days.map(function (d) { return DB.adminDay(pin, d); })).then(function (all) {
      if (seq !== loadSeq) return;
      setBusy(false);
      var bad = all.filter(function (r) { return !r || !r.ok; })[0];
      if (bad) { failWeek(bad.error === 'BAD_PIN' ? 'Ο κωδικός δεν ισχύει πια' : 'Δεν φόρτωσε'); return; }
      week = { days: days, data: {} };
      days.forEach(function (d, i) { week.data[d] = all[i]; });
      paintWeek();
    }).catch(function () {
      if (seq !== loadSeq) return;
      setBusy(false); failWeek('Δεν φόρτωσε — έλεγξε το ίντερνετ');
    });
  }

  function failWeek(msg) {
    document.getElementById('adm-sub').textContent = '';
    document.getElementById('adm-week').innerHTML =
      '<div class="adm__empty">' + msg +
      '<br><button class="btn btn--ghost" id="wk-retry" style="margin-top:12px;padding:8px 16px;font-size:.7rem">ΔΟΚΙΜΑΣΕ ΞΑΝΑ</button></div>';
    var r = document.getElementById('wk-retry');
    if (r) r.addEventListener('click', load);
  }

  function setBusy(on) {
    if (on) document.getElementById('adm-sub').textContent = 'Φόρτωση…';
    document.getElementById('adm-list').style.opacity = on ? '.4' : '1';
    document.getElementById('adm-week').style.opacity = on ? '.4' : '1';
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

  function step(n) {
    day = H.addDaysISO(day, view === 'week' ? n * 7 : n);
    paintHeader(); load();
  }
  document.getElementById('adm-prev').addEventListener('click', function () { step(-1); });
  document.getElementById('adm-next').addEventListener('click', function () { step(1); });

  document.getElementById('adm-today').addEventListener('click', function () {
    day = H.nowAthens().iso; paintHeader(); load();
  });

  /* Το πεδίο είναι διάφανο πάνω από την ημερομηνία, άρα το πάτημα το
     δέχεται το ίδιο. Στον υπολογιστή βοηθάει και το showPicker(), που στο
     κινητό απλώς δεν υπάρχει — γι' αυτό δεν βασιζόμαστε σε αυτό. */
  var jump = document.getElementById('adm-jump');
  jump.addEventListener('click', function () {
    if (typeof jump.showPicker === 'function') {
      try { jump.showPicker(); } catch (e) {}
    }
  });
  jump.addEventListener('change', function () {
    if (!jump.value) return;
    day = jump.value;
    paintHeader(); load();
  });

  /* ---------- καρτέλες ---------- */
  function setView(v) {
    view = v;
    document.getElementById('tab-day').setAttribute('aria-selected', String(v === 'day'));
    document.getElementById('tab-week').setAttribute('aria-selected', String(v === 'week'));
    document.getElementById('adm-list').hidden = v !== 'day';
    document.getElementById('adm-week').hidden = v !== 'week';
    document.querySelector('.adm__actions').hidden = v !== 'day';
    paintHeader(); load();
  }
  document.getElementById('tab-day').addEventListener('click', function () { if (view !== 'day') setView('day'); });
  document.getElementById('tab-week').addEventListener('click', function () { if (view !== 'week') setView('week'); });

  /** Δευτέρα της εβδομάδας στην οποία ανήκει η ημερομηνία. */
  function weekStart(iso) {
    var dow = (H.dowOf(iso) + 6) % 7;          /* 0 = Δευτέρα */
    return H.addDaysISO(iso, -dow);
  }

  /* ---------- εμφάνιση ---------- */
  function paintHeader() {
    var D = H.days(), el = document.getElementById('adm-date');
    jump.value = day;          /* ο επιλογέας ανοίγει στη μέρα που βλέπει */
    if (view === 'week') {
      var a0 = weekStart(day), a1 = H.addDaysISO(a0, 6);
      var p0 = H.parseISO(a0), p1 = H.parseISO(a1);
      el.textContent = H.grUpper(
        p0.m === p1.m
          ? p0.d + '–' + p1.d + ' ' + D.monthsLong[p1.m - 1]
          : p0.d + ' ' + D.months[p0.m - 1] + ' – ' + p1.d + ' ' + D.months[p1.m - 1]);
    } else {
      var p = H.parseISO(day);
      el.textContent = H.grUpper(D.long[H.dowOf(day)] + ' ' + p.d + ' ' + D.monthsLong[p.m - 1]);
    }
  }

  /* ---------- εβδομαδιαία εικόνα ---------- */
  function paintWeek() {
    paintHeader();
    if (!week) return;
    var D = H.days(), n = H.nowAthens(), step = (C.booking && C.booking.slotStep) || 30;

    /* Το πλέγμα καλύπτει από το νωρίτερο άνοιγμα ως το αργότερο κλείσιμο
       της εβδομάδας — όχι όλο το 24ωρο, που θα ήταν άχρηστο σκρολάρισμα. */
    var lo = 24 * 60, hi = 0, total = 0;
    week.days.forEach(function (d) {
      (week.data[d].hours || []).forEach(function (r) {
        lo = Math.min(lo, H.hm2min(r[0]));
        hi = Math.max(hi, H.hm2min(r[1]));
      });
      total += (week.data[d].items || []).filter(function (x) { return !x.block; }).length;
    });
    if (hi <= lo) { lo = 9 * 60; hi = 21 * 60; }

    document.getElementById('adm-sub').textContent = total + ' ραντεβού τη βδομάδα';

    var rows = Math.ceil((hi - lo) / step);
    var html = '<div class="wk"><div class="wk__grid">';

    html += '<div class="wk__hd"></div>';
    week.days.forEach(function (d) {
      var p = H.parseISO(d), closed = week.data[d].closed !== null || !(week.data[d].hours || []).length;
      html += '<div class="wk__hd' + (d === n.iso ? ' is-today' : '') + (closed ? ' is-closed' : '') + '">' +
        D.short[H.dowOf(d)] + '<b>' + p.d + '</b></div>';
    });

    for (var r = 0; r < rows; r++) {
      var m = lo + r * step;
      html += '<div class="wk__time" style="grid-row:' + (r + 2) + '">' +
              (m % 60 === 0 ? H.min2hm(m) : '') + '</div>';
    }

    week.days.forEach(function (d, col) {
      var day_ = week.data[d];
      var open = (day_.hours || []);
      var closed = day_.closed !== null || !open.length;

      for (var r = 0; r < rows; r++) {
        var m = lo + r * step;
        var inHours = !closed && open.some(function (x) {
          return m >= H.hm2min(x[0]) && m < H.hm2min(x[1]);
        });
        html += '<div class="wk__cell' + (inHours ? '' : ' is-off') + '"' +
                ' style="grid-column:' + (col + 2) + ';grid-row:' + (r + 2) + '"' +
                (inHours ? ' data-go="' + d + '" data-at="' + H.min2hm(m) + '"' : '') + '></div>';
      }

      (day_.items || []).forEach(function (it) {
        var start = H.hm2min(it.time);
        var r0 = Math.round((start - lo) / step);
        if (r0 < 0 || r0 >= rows) return;
        var span = Math.max(1, Math.round(it.min / step));
        if (r0 + span > rows) span = rows - r0;
        html += '<div class="wk__ev' + (it.block ? ' wk__ev--block' : (it.online ? ' wk__ev--online' : '')) + '"' +
          ' style="grid-column:' + (col + 2) + ';grid-row:' + (r0 + 2) + '/span ' + span + '"' +
          ' data-id="' + esc(it.id) + '" data-day="' + d + '">' +
          '<b>' + (it.block ? 'ΜΠΛΟΚΟ' : (esc(it.name) || '—')) + '</b>' +
          '<small>' + esc(it.time) + '</small></div>';
      });
    });

    html += '</div><div class="wk__legend">' +
      '<span><i style="background:var(--accent)"></i>online</span>' +
      '<span><i style="background:var(--invert-bg)"></i>με το χέρι</span>' +
      '<span><i style="background:var(--surface-2);border:1px dashed var(--line-soft)"></i>μπλοκάρισμα</span>' +
      '<span>Πάτα ελεύθερο κελί για ενέργειες</span></div></div>';

    var host = document.getElementById('adm-week');
    host.innerHTML = html;
    H.fixGreekCaps(host);

    host.querySelectorAll('[data-go]').forEach(function (c) {
      c.addEventListener('click', function () { slotMenu(c.dataset.go, c.dataset.at); });
    });
    host.querySelectorAll('.wk__ev').forEach(function (e) {
      e.addEventListener('click', function () {
        day = e.dataset.day;
        setView('day');       /* η ακύρωση γίνεται από την ημερήσια όψη */
      });
    });
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
      var byMe = data.closed !== null;
      host.innerHTML = '<div class="adm__closed">' + H.icon('close') +
        '<b>ΚΛΕΙΣΤΑ</b><span>' +
        (byMe ? esc(data.closed || 'το έκλεισες εσύ') : 'εκτός ωραρίου') + '</span>' +
        (byMe ? '<button class="btn btn--ghost" id="adm-reopen" style="margin-top:14px;padding:9px 16px;font-size:.7rem">ΞΑΝΑ ΑΝΟΙΞΕ ΤΗ ΜΕΡΑ</button>' : '') +
        '</div>';
      var rb = document.getElementById('adm-reopen');
      if (rb) rb.addEventListener('click', askReopen);
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
      if (res && res.ok) {
        closeSheet(); load();
        /* Η ακύρωση πέρασε, αλλά χωρίς email: να μην το μάθει ο κουρέας
           από τον πελάτη που θα εμφανιστεί στην πόρτα. */
        if (res.emailOffline) toast('Ακυρώθηκε. Δεν στάλθηκε email — πάρε τον πελάτη τηλέφωνο.');
        return;
      }
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
  /** Μικρό μήνυμα που φεύγει μόνο του — δεν διακόπτει τη δουλειά. */
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 6000);
  }

  function alertSheet(msg) {
    var p = document.createElement('p');
    p.className = 'hint hint--err';
    p.style.marginTop = '12px';
    p.textContent = msg;
    document.getElementById('sheet-body').appendChild(p);
  }

  /**
   * Οι ΠΡΑΓΜΑΤΙΚΑ ελεύθερες μισάωρες αυτής της μέρας.
   *
   * Πριν η λίστα ήταν σταθερή: έδειχνε 09:00-21:00 ακόμα κι όταν η ώρα
   * ήταν πιασμένη, οπότε ο κουρέας το καταλάβαινε μόνο αφού πατούσε
   * ΚΑΤΑΧΩΡΗΣΗ και έτρωγε «Η ώρα είναι ήδη πιασμένη».
   */
  function freeSlots() {
    var stepM = (C.booking && C.booking.slotStep) || 30;

    var ranges = ((data && data.hours) || []).map(function (r) {
      return [H.hm2min(r[0]), H.hm2min(r[1])];
    });
    /* Κλειστή μέρα: δείχνουμε το κανονικό ωράριο, γιατί ο κουρέας μπορεί
       να θέλει να γράψει κάποιον παρόλα αυτά. Το λέμε όμως καθαρά. */
    var offday = !ranges.length;
    if (offday) {
      ranges = ((C.hours && C.hours[H.dowOf(day)]) || []).map(function (r) {
        return [H.hm2min(r[0]), H.hm2min(r[1])];
      });
    }
    if (!ranges.length) ranges = [[9 * 60, 21 * 60]];

    var taken = ((data && data.items) || []).map(function (x) {
      var s = H.hm2min(x.time);
      return [s, s + (x.min || stepM)];
    });

    var slots = [];
    ranges.forEach(function (r) {
      for (var m = r[0]; m + stepM <= r[1]; m += stepM) {
        var busy = taken.some(function (t) { return m < t[1] && m + stepM > t[0]; });
        if (!busy) slots.push(m);
      }
    });

    return { slots: slots, step: stepM, ranges: ranges, taken: taken, offday: offday };
  }

  /** Πόσα συνεχόμενα λεπτά μένουν ελεύθερα ξεκινώντας από αυτή την ώρα. */
  function freeRunFrom(startM, free) {
    var end = null;
    free.ranges.forEach(function (r) { if (startM >= r[0] && startM < r[1]) end = r[1]; });
    if (end === null) return free.step;
    var stop = end;
    free.taken.forEach(function (t) { if (t[0] >= startM && t[0] < stop) stop = t[0]; });
    return Math.max(free.step, stop - startM);
  }

  /** Ποια ώρα να προεπιλεγεί: η ζητούμενη αν είναι ελεύθερη, αλλιώς η επόμενη. */
  function pickSlot(free, preset) {
    if (!free.slots.length) return null;
    var want = preset ? H.hm2min(preset) : null;
    if (want !== null && free.slots.indexOf(want) >= 0) return want;
    if (want !== null) {
      var next = free.slots.filter(function (m) { return m > want; })[0];
      if (next !== undefined) return next;
    }
    var n = H.nowAthens();
    if (day === n.iso) {
      var soon = free.slots.filter(function (m) { return m >= n.minutes; })[0];
      if (soon !== undefined) return soon;
    }
    return free.slots[0];
  }

  function slotOptions(free, chosen) {
    return free.slots.map(function (m) {
      return '<option value="' + H.min2hm(m) + '"' + (m === chosen ? ' selected' : '') + '>' +
             H.min2hm(m) + '</option>';
    }).join('');
  }

  /** Η γραμμή κάτω από το select: τι βλέπει και τι λείπει. */
  function slotNote(free, preset, chosen) {
    var bits = [];
    if (free.offday) bits.push('Η μέρα είναι κλειστή — οι ώρες είναι από το κανονικό ωράριο.');
    if (preset && chosen !== null && H.hm2min(preset) !== chosen) {
      bits.push('Η ' + preset + ' είναι πιασμένη, μπήκε η ' + H.min2hm(chosen) + '.');
    }
    bits.push(free.slots.length + (free.slots.length === 1 ? ' ελεύθερη ώρα' : ' ελεύθερες ώρες'));
    return '<p class="adm__note' + (free.offday ? ' adm__note--warn' : '') + '">' + bits.join(' ') + '</p>';
  }

  /** Όταν δεν έχει μείνει τίποτα ελεύθερο δεν έχει νόημα φόρμα. */
  function sheetFull(title) {
    openSheet(title,
      '<div class="adm__empty" style="margin-bottom:14px">Δεν έμεινε ελεύθερη ώρα σε αυτή τη μέρα.</div>' +
      '<button class="btn btn--ghost btn--wide" id="f-ok">ΕΝΤΑΞΕΙ</button>',
      function () { document.getElementById('f-ok').addEventListener('click', closeSheet); });
  }

  /**
   * Το admin_reopen σβήνει ΟΛΟΚΛΗΡΟ το διάστημα που περιέχει τη μέρα.
   * Αν είχε κλείσει 10-20 Σεπτεμβρίου και πατήσει «ξανά άνοιξε» στις 12,
   * ανοίγουν και οι δέκα μέρες. Πρέπει να το ξέρει ΠΡΙΝ πατήσει.
   */
  function askReopen() {
    var span = (data && data.closedFrom && data.closedTo && data.closedFrom !== data.closedTo)
      ? H.grUpper(rangeLabel(data.closedFrom, data.closedTo)) : null;

    openSheet('Ξανά άνοιγμα',
      '<p style="margin-top:0">' +
        (span
          ? 'Αυτή η μέρα ανήκει στο κλείσιμο <b>' + esc(span) + '</b>. Θα ξανανοίξει <b>ολόκληρο</b>.'
          : 'Αν το είχες κλείσει σαν διάστημα (π.χ. διακοπές), θα ξανανοίξει <b>ολόκληρο το διάστημα</b>, όχι μόνο αυτή η μέρα.') +
      '</p>' +
      '<div style="display:grid;gap:8px;margin-top:16px">' +
        '<button class="btn btn--accent btn--wide" id="r-yes">ΞΑΝΑ ΑΝΟΙΞΕ</button>' +
        '<button class="btn btn--ghost btn--wide" id="r-no">ΑΚΥΡΟ</button>' +
      '</div>',
      function () {
        var yes = document.getElementById('r-yes');
        yes.addEventListener('click', function () {
          run(yes, function () { return DB.adminReopen(pin, day); });
        });
        document.getElementById('r-no').addEventListener('click', closeSheet);
      });
  }

  function rangeLabel(a1, b1) {
    var D = H.days(), p0 = H.parseISO(a1), p1 = H.parseISO(b1);
    return p0.m === p1.m
      ? p0.d + '–' + p1.d + ' ' + D.months[p1.m - 1]
      : p0.d + ' ' + D.months[p0.m - 1] + ' – ' + p1.d + ' ' + D.months[p1.m - 1];
  }

  /**
   * Καταχώρηση σε ώρα που πέρασε.
   *
   * Δεν την απαγορεύουμε: ο κουρέας θέλει να γράψει τον παππού που ήρθε
   * χθες απροειδοποίητα, ώστε να βγαίνει σωστά ο απολογισμός. Αλλά δεν
   * πρέπει να γίνεται κατά λάθος — γι' αυτό φαίνεται και στη φόρμα και
   * πάνω στο κουμπί.
   */
  function isPast(hhmm) {
    var now = H.nowAthens();
    if (day < now.iso) return true;
    if (day > now.iso) return false;
    return H.hm2min(hhmm) < now.minutes;
  }

  /** «ΔΕΥ 7 ΣΕΠ» — μπαίνει στους τίτλους των φύλλων. */
  function dayLabel() {
    var D = H.days(), p = H.parseISO(day);
    return D.short[H.dowOf(day)] + ' ' + p.d + ' ' + D.months[p.m - 1];
  }

  /* ---------- ενέργειες ---------- */
  function openWalkin(preset) {
    var free = freeSlots(), chosen = pickSlot(free, preset);
    if (chosen === null) { sheetFull('Νέο ραντεβού'); return; }

    openSheet('Νέο ραντεβού · ' + dayLabel(),
      '<div class="field"><label for="w-time">Ώρα</label><select id="w-time" class="adm__sel">' +
        slotOptions(free, chosen) + '</select></div>' + slotNote(free, preset, chosen) +
      '<div class="field"><label for="w-name">Όνομα</label><input id="w-name" type="text" placeholder="π.χ. Γιώργος"></div>' +
      '<div class="field"><label for="w-phone">Τηλέφωνο (προαιρετικό)</label><input id="w-phone" type="tel" inputmode="numeric" placeholder="69…"></div>' +
      '<div class="field"><label for="w-svc">Υπηρεσία</label><select id="w-svc" class="adm__sel">' +
        C.services.map(function (s) { return '<option value="' + s.id + '">' + s.el + '</option>'; }).join('') +
      '</select></div>' +
      '<div id="w-past" hidden><p class="adm__past"><b>ΠΡΟΣΟΧΗ — ΠΕΡΑΣΜΕΝΗ ΩΡΑ</b>' +
        '<span>Καταχωρείς ραντεβού που έχει ήδη περάσει. Σωστό αν γράφεις κάποιον που ήρθε ' +
        'και ξέχασες να τον περάσεις. Λάθος αν ήθελες μελλοντική μέρα.</span></p></div>' +
      '<button class="btn btn--accent btn--wide" id="w-go">ΚΑΤΑΧΩΡΗΣΗ</button>',
      function () {
        var go = document.getElementById('w-go'), time = document.getElementById('w-time');

        function markPast() {
          var past = isPast(time.value);
          document.getElementById('w-past').hidden = !past;
          go.textContent = past ? 'ΚΑΤΑΧΩΡΗΣΗ ΣΤΑ ΠΕΡΑΣΜΕΝΑ' : 'ΚΑΤΑΧΩΡΗΣΗ';
          go.className = 'btn btn--wide ' + (past ? 'btn--past' : 'btn--accent');
        }
        time.addEventListener('change', markPast);
        markPast();

        go.addEventListener('click', function () {
          run(go, function () {
            return DB.adminAdd(pin, {
              start: startOf(day, time.value),
              serviceId: document.getElementById('w-svc').value,
              name: document.getElementById('w-name').value.trim(),
              phone: document.getElementById('w-phone').value.trim()
            });
          });
        });
      });
  }

  function openBlock(preset) {
    var free = freeSlots(), chosen = pickSlot(free, preset);
    if (chosen === null) { sheetFull('Μπλοκάρισμα ωρών'); return; }

    openSheet('Μπλοκάρισμα · ' + dayLabel(),
      '<div class="field"><label for="b-time">Από</label><select id="b-time" class="adm__sel">' +
        slotOptions(free, chosen) + '</select></div>' + slotNote(free, preset, chosen) +
      '<div class="field"><label for="b-min">Για πόσο</label><select id="b-min" class="adm__sel"></select></div>' +
      '<div class="field"><label for="b-note">Αιτία (προαιρετικό)</label><input id="b-note" type="text" placeholder="π.χ. συνεργείο"></div>' +
      '<button class="btn btn--accent btn--wide" id="b-go">ΜΠΛΟΚΑΡΕ</button>',
      function () {
        var time = document.getElementById('b-time'), mins = document.getElementById('b-min');

        /* Η διάρκεια δεν πρέπει να ξεπερνά το επόμενο ραντεβού ή το
           κλείσιμο — αλλιώς η βάση το απορρίπτει και δεν καταλαβαίνει γιατί. */
        function fillMinutes() {
          var run_ = freeRunFrom(H.hm2min(time.value), free);
          var opts = [30, 60, 90, 120, 180, 240].filter(function (m) { return m <= run_; });
          if (!opts.length) opts = [free.step];
          if (opts.indexOf(run_) < 0 && run_ > opts[opts.length - 1]) opts.push(run_);
          mins.innerHTML = opts.map(function (m) {
            var h_ = Math.floor(m / 60), r_ = m % 60;
            var lbl = h_ ? (h_ + (r_ ? ':' + H.pad(r_) : '') + (r_ ? ' ώρες' : (h_ === 1 ? ' ώρα' : ' ώρες'))) : (m + ' λεπτά');
            return '<option value="' + m + '"' + (m === run_ ? ' data-max="1"' : '') + '>' + lbl +
                   (m === run_ && run_ > free.step ? ' (ως το τέλος)' : '') + '</option>';
          }).join('');
        }
        time.addEventListener('change', fillMinutes);
        fillMinutes();

        var go = document.getElementById('b-go');
        go.addEventListener('click', function () {
          run(go, function () {
            return DB.adminBlock(pin, {
              start: startOf(day, time.value),
              minutes: +mins.value,
              note: document.getElementById('b-note').value.trim()
            });
          });
        });
      });
  }

  function openClose() {
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
  }

  document.getElementById('adm-walkin').addEventListener('click', function () { openWalkin(); });
  document.getElementById('adm-block').addEventListener('click', function () { openBlock(); });
  document.getElementById('adm-closeday').addEventListener('click', function () { openClose(); });

  /**
   * Πάτημα σε ελεύθερο κελί της εβδομάδας: αντί να πετάει τον χρήστη
   * στην ημερήσια όψη και να ξαναδιαλέγει ώρα, ανοίγουμε κατευθείαν τις
   * ενέργειες με τη μέρα και την ώρα ήδη συμπληρωμένες.
   */
  function slotMenu(dateISO, hhmm) {
    /* Δεν αλλάζουμε ημέρα εδώ: αν κοιτάξει ένα κελί και κλείσει το φύλλο,
       η ημερήσια όψη δεν πρέπει να έχει πεταχτεί σε άλλη μέρα. */
    function pickDay() {
      day = dateISO;
      data = (week && week.data[dateISO]) || data;
    }
    var D = H.days(), p = H.parseISO(dateISO);
    var label = H.grUpper(D.short[H.dowOf(dateISO)] + ' ' + p.d + ' ' + D.months[p.m - 1]) + ' · ' + hhmm;

    openSheet(label,
      '<div style="display:grid;gap:8px">' +
        '<button class="btn btn--primary btn--wide" id="sm-new">+ ΝΕΟ ΡΑΝΤΕΒΟΥ</button>' +
        '<button class="btn btn--block btn--wide" id="sm-block">ΜΠΛΟΚΑΡΕ ΩΡΕΣ</button>' +
        '<button class="btn btn--off btn--wide" id="sm-close">ΔΙΑΚΟΠΕΣ / ΡΕΠΟ</button>' +
        '<button class="btn btn--ghost btn--wide" id="sm-day">ΔΕΣ ΟΛΗ ΤΗ ΜΕΡΑ</button>' +
      '</div>',
      function () {
        document.getElementById('sm-new').addEventListener('click', function () { pickDay(); openWalkin(hhmm); });
        document.getElementById('sm-block').addEventListener('click', function () { pickDay(); openBlock(hhmm); });
        document.getElementById('sm-close').addEventListener('click', function () { pickDay(); openClose(); });
        document.getElementById('sm-day').addEventListener('click', function () { pickDay(); closeSheet(); setView('day'); });
      });
  }

  /**
   * Δύο διαφορετικές πράξεις, σκόπιμα ξεχωριστές:
   *  - μπλοκάρισμα -> απλή αφαίρεση, κανείς δεν περιμένει
   *  - ραντεβού    -> υπάρχει άνθρωπος απέναντι. Τον ειδοποιούμε, και του
   *                   λέμε να σβήσει και τη δική του εγγραφή, γιατί στο
   *                   ημερολόγιο του κινητού του δεν φτάνουμε.
   */
  function askDelete(label, id) {
    var item = data.items.filter(function (x) { return x.id === id; })[0] || {};

    if (item.block) {
      openSheet('Αφαίρεση μπλοκαρίσματος',
        '<p style="margin-top:0">Να ελευθερωθεί η ώρα;</p>' +
        '<p style="font-weight:600;margin-bottom:18px">' + esc(label) + '</p>' +
        '<div style="display:grid;gap:8px">' +
          '<button class="btn btn--wide" id="d-yes" style="background:var(--err);color:#fff;border-color:var(--err)">ΑΦΑΙΡΕΣΗ</button>' +
          '<button class="btn btn--ghost btn--wide" id="d-no">ΑΚΥΡΟ</button>' +
        '</div>',
        function () {
          var yes = document.getElementById('d-yes');
          yes.addEventListener('click', function () {
            run(yes, function () { return DB.adminCancel(pin, id, ''); });
          });
          document.getElementById('d-no').addEventListener('click', closeSheet);
        });
      return;
    }

    var hasEmail = !!item.email;
    openSheet('Ακύρωση ραντεβού',
      '<p style="margin-top:0">Ακύρωση του ραντεβού:</p>' +
      '<p style="font-weight:600;font-size:1.05rem;margin-bottom:16px">' + esc(label) + '</p>' +
      (hasEmail
        ? '<p class="hint" style="display:block;margin-bottom:14px"><b>Θα σταλεί email στον πελάτη</b> ' +
          'ότι ακυρώθηκε, μαζί με υπενθύμιση να το σβήσει και από το ημερολόγιο του κινητού του.</p>'
        : '<p class="hint hint--warn" style="display:block;margin-bottom:14px"><b>Δεν έχει δώσει email.</b> ' +
          'Δεν θα ειδοποιηθεί αυτόματα — ' +
          (item.phone ? 'πάρε τον τηλέφωνο πρώτα.' : 'δεν άφησε ούτε τηλέφωνο.') + '</p>') +
      '<div class="field"><label for="d-why">Αιτία (μπαίνει στο email)</label>' +
      '<input id="d-why" type="text" placeholder="π.χ. έκτακτο κώλυμα, θα επικοινωνήσω"></div>' +
      '<div style="display:grid;gap:8px">' +
        (item.phone ? '<a class="btn btn--ghost btn--wide" href="tel:+30' + esc(item.phone) + '">ΠΑΡΕ ΤΟΝ ΠΕΛΑΤΗ ΠΡΩΤΑ</a>' : '') +
        '<button class="btn btn--wide" id="d-yes" style="background:var(--err);color:#fff;border-color:var(--err)"></button>' +
        '<button class="btn btn--ghost btn--wide" id="d-no">ΟΧΙ, ΤΟ ΚΡΑΤΑΩ</button>' +
      '</div>',
      function () {
        var yes = document.getElementById('d-yes');
        yes.textContent = hasEmail ? 'ΑΚΥΡΩΣΗ ΚΑΙ ΕΙΔΟΠΟΙΗΣΗ' : 'ΑΚΥΡΩΣΗ';
        yes.addEventListener('click', function () {
          var why = document.getElementById('d-why').value.trim();
          run(yes, function () { return DB.adminCancel(pin, id, why); });
        });
        document.getElementById('d-no').addEventListener('click', closeSheet);
      });
  }

  paintHeader();
})();
