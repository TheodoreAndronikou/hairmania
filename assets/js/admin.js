/* =============================================================
   Διαχειριστικό κουρείου — ΔΟΚΙΜΑΣΤΙΚΗ ΕΚΔΟΣΗ

   Σκοπός: να δει ο ιδιοκτήτης πώς θα δουλεύει καθημερινά, χωρίς να
   χρειάζεται να θυμάται λέξεις-κλειδιά σε ημερολόγιο.

   ΠΡΟΣΟΧΗ — τι ΔΕΝ είναι:
   Ο κωδικός ελέγχεται στον browser και τα δεδομένα μένουν στο ίδιο
   κινητό (localStorage). Αυτό ΔΕΝ είναι ασφάλεια και ΔΕΝ συγχρονίζεται.
   Με την πραγματική βάση (MySQL) ο έλεγχος γίνεται στον server και τα
   δεδομένα είναι κοινά παντού. Ό,τι βλέπεις εδώ είναι η εμπειρία χρήσης,
   όχι η τελική υποδομή.
   ============================================================= */
(function () {
  'use strict';

  var gate = document.getElementById('gate');
  if (!gate) return;

  var H = window.HMV, C = window.CONFIG;
  var PIN = '1234';                    /* προσωρινό — αλλάζει με τον server */
  var KEY = 'hmv_admin_v1';

  var panel = document.getElementById('panel');
  var sheet = document.getElementById('sheet');
  var day = H.nowAthens().iso;

  /* ---------- αποθήκευση ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { appts: [], blocks: [], closed: [] }; }
    catch (e) { return { appts: [], blocks: [], closed: [] }; }
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  var DB = load();

  /* ---------- είσοδος ---------- */
  function unlock() {
    gate.hidden = true; panel.hidden = false;
    document.getElementById('adm-prev').innerHTML = H.icon('left');
    document.getElementById('adm-next').innerHTML = H.icon('right');
    document.getElementById('sheet-x').innerHTML = H.icon('close');
    render();
  }
  document.getElementById('gate-go').addEventListener('click', tryPin);
  document.getElementById('pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') tryPin(); });
  function tryPin() {
    var v = document.getElementById('pw').value.trim();
    if (v === PIN) { try { sessionStorage.setItem('hmv_adm', '1'); } catch (e) {} unlock(); }
    else { document.getElementById('pw-err').style.display = 'block'; }
  }
  try { if (sessionStorage.getItem('hmv_adm') === '1') unlock(); } catch (e) {}

  document.getElementById('adm-out').addEventListener('click', function () {
    try { sessionStorage.removeItem('hmv_adm'); } catch (e) {}
    location.reload();
  });

  /* ---------- πλοήγηση ημέρας ---------- */
  document.getElementById('adm-prev').addEventListener('click', function () { day = H.addDaysISO(day, -1); render(); });
  document.getElementById('adm-next').addEventListener('click', function () { day = H.addDaysISO(day, 1); render(); });

  /* ---------- ώρες της μέρας ---------- */
  function ranges(d) { return (C.hours[H.dowOf(d)] || []); }
  function isClosed(d) { return DB.closed.indexOf(d) >= 0; }

  function itemsFor(d) {
    var out = [];
    DB.appts.filter(function (a) { return a.date === d; }).forEach(function (a) { out.push({ k: 'appt', v: a }); });
    DB.blocks.filter(function (b) { return b.date === d; }).forEach(function (b) { out.push({ k: 'block', v: b }); });
    out.sort(function (a, b) { return H.hm2min(a.v.time) - H.hm2min(b.v.time); });
    return out;
  }

  /* ---------- εμφάνιση ---------- */
  function render() {
    var D = H.days(), p = H.parseISO(day), n = H.nowAthens();
    document.getElementById('adm-date').textContent =
      H.grUpper(D.long[H.dowOf(day)] + ' ' + p.d + ' ' + D.monthsLong[p.m - 1]);

    var items = itemsFor(day);
    var closed = isClosed(day) || !ranges(day).length;
    var appts = items.filter(function (x) { return x.k === 'appt'; }).length;
    document.getElementById('adm-sub').textContent =
      day === n.iso ? 'Σήμερα · ' + appts + ' ραντεβού'
                    : appts + ' ραντεβού';

    var host = document.getElementById('adm-list');

    if (closed) {
      host.innerHTML = '<div class="adm__closed">' + H.icon('close') +
        '<b>ΚΛΕΙΣΤΑ</b><span>' + (isClosed(day) ? 'Το έκλεισες εσύ' : 'Εκτός ωραρίου') + '</span>' +
        (isClosed(day) ? '<button class="btn btn--ghost" id="adm-reopen" style="margin-top:14px;padding:9px 16px;font-size:.7rem">ΑΝΟΙΞΕ ΤΗ ΜΕΡΑ</button>' : '') +
        '</div>';
      var re = document.getElementById('adm-reopen');
      if (re) re.addEventListener('click', function () {
        DB.closed = DB.closed.filter(function (x) { return x !== day; });
        save(DB); render();
      });
      return;
    }

    if (!items.length) {
      host.innerHTML = '<div class="adm__empty">Καμία καταχώρηση για αυτή τη μέρα</div>';
      return;
    }

    host.innerHTML = items.map(function (x, i) {
      if (x.k === 'block') {
        return '<div class="adm__row adm__row--block">' +
          '<span class="adm__time">' + x.v.time + '</span>' +
          '<span class="adm__body"><b>ΚΛΕΙΣΤΟ</b><small>' + (x.v.note || 'μπλοκαρισμένο') + ' · ' + x.v.min + "'</small></span>" +
          '<button class="adm__del" data-k="block" data-i="' + i + '" aria-label="Διαγραφή"></button></div>';
      }
      var a = x.v;
      return '<div class="adm__row">' +
        '<span class="adm__time">' + a.time + '</span>' +
        '<span class="adm__body"><b>' + esc(a.name) + '</b><small>' + esc(a.service) + ' · ' + a.min + "'" +
        (a.source === 'walkin' ? ' · στο μαγαζί' : ' · online') + '</small></span>' +
        (a.phone ? '<a class="adm__call" href="tel:+30' + a.phone + '" aria-label="Κλήση"></a>' : '') +
        '<button class="adm__del" data-k="appt" data-i="' + i + '" aria-label="Διαγραφή"></button></div>';
    }).join('');

    host.querySelectorAll('.adm__call').forEach(function (b) { b.innerHTML = H.icon('phone'); });
    host.querySelectorAll('.adm__del').forEach(function (b) {
      b.innerHTML = H.icon('close');
      b.addEventListener('click', function () {
        var it = itemsFor(day)[+b.dataset.i];
        if (!it) return;
        if (!confirm('Να διαγραφεί;')) return;
        var arr = it.k === 'appt' ? DB.appts : DB.blocks;
        var idx = arr.indexOf(it.v);
        if (idx >= 0) arr.splice(idx, 1);
        save(DB); render();
      });
    });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }); }

  /* ---------- φύλλο ενεργειών ---------- */
  function openSheet(title, html, onMount) {
    document.getElementById('sheet-title').textContent = H.grUpper(title);
    document.getElementById('sheet-body').innerHTML = html;
    sheet.hidden = false;
    if (onMount) onMount();
  }
  function closeSheet() { sheet.hidden = true; }
  document.getElementById('sheet-x').addEventListener('click', closeSheet);
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });

  /** Πλέγμα ωρών της ημέρας — ό,τι χρησιμοποιεί και ο πελάτης. */
  function timeGrid(id) {
    var out = '';
    ranges(day).forEach(function (r) {
      for (var m = H.hm2min(r[0]); m < H.hm2min(r[1]); m += 15) out += '<option>' + H.min2hm(m) + '</option>';
    });
    return '<select id="' + id + '" class="adm__sel">' + out + '</select>';
  }

  document.getElementById('adm-walkin').addEventListener('click', function () {
    openSheet('Πελάτης στο μαγαζί',
      '<div class="field"><label for="w-name">Όνομα</label><input id="w-name" type="text" placeholder="π.χ. Γιώργος"></div>' +
      '<div class="field"><label for="w-time">Ώρα</label>' + timeGrid('w-time') + '</div>' +
      '<div class="field"><label for="w-svc">Υπηρεσία</label><select id="w-svc" class="adm__sel">' +
        C.services.map(function (s) { return '<option value="' + s.id + '">' + s.el + ' (' + s.min + "')</option>"; }).join('') +
      '</select></div>' +
      '<button class="btn btn--accent btn--wide" id="w-go">ΚΑΤΑΧΩΡΗΣΗ</button>',
      function () {
        document.getElementById('w-go').addEventListener('click', function () {
          var name = document.getElementById('w-name').value.trim() || 'Πελάτης';
          var time = document.getElementById('w-time').value;
          var sid = document.getElementById('w-svc').value;
          var svc = C.services.filter(function (s) { return s.id === sid; })[0];
          DB.appts.push({ date: day, time: time, name: name, service: svc.el, min: svc.min, source: 'walkin' });
          save(DB); closeSheet(); render();
        });
      });
  });

  document.getElementById('adm-block').addEventListener('click', function () {
    openSheet('Κλείσε ώρες',
      '<div class="field"><label for="b-time">Από</label>' + timeGrid('b-time') + '</div>' +
      '<div class="field"><label for="b-min">Για πόσο</label><select id="b-min" class="adm__sel">' +
        [30, 60, 90, 120, 180].map(function (m) { return '<option value="' + m + '">' + m + ' λεπτά</option>'; }).join('') +
      '</select></div>' +
      '<div class="field"><label for="b-note">Αιτία (προαιρετικό)</label><input id="b-note" type="text" placeholder="π.χ. συνεργείο"></div>' +
      '<button class="btn btn--accent btn--wide" id="b-go">ΚΛΕΙΣΕ ΤΙΣ ΩΡΕΣ</button>',
      function () {
        document.getElementById('b-go').addEventListener('click', function () {
          DB.blocks.push({
            date: day,
            time: document.getElementById('b-time').value,
            min: +document.getElementById('b-min').value,
            note: document.getElementById('b-note').value.trim()
          });
          save(DB); closeSheet(); render();
        });
      });
  });

  document.getElementById('adm-closeday').addEventListener('click', function () {
    if (isClosed(day)) return;
    if (!confirm('Να κλείσει όλη η μέρα;')) return;
    DB.closed.push(day); save(DB); render();
  });
})();
