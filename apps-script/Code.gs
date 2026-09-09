/**************************************************************
 * HAIR MANIA VALKANIS — Booking backend (Google Apps Script)
 *
 * Πηγή αλήθειας:
 *   • Google Calendar  -> τα ραντεβού και τα κλεισίματα (ΚΛΕΙΣΤΑ)
 *   • Google Sheet     -> ωράριο, υπηρεσίες, αρχείο ραντεβού
 *   • Google Drive     -> φωτογραφίες gallery
 *
 * ΠΡΩΤΟ ΒΗΜΑ: τρέξε μία φορά τη συνάρτηση  setup()
 * Οδηγίες: docs/ΟΔΗΓΙΕΣ-ΕΓΚΑΤΑΣΤΑΣΗΣ.md
 **************************************************************/

/* ============ ΡΥΘΜΙΣΕΙΣ ==================================== */

/** Άφησέ το κενό για να χρησιμοποιηθεί το κύριο ημερολόγιο του λογαριασμού. */
var CALENDAR_ID = '';

/** ID του φακέλου Drive με τις φωτογραφίες (προαιρετικό). */
var GALLERY_FOLDER_ID = '';

/**
 * Email ΜΠΑΡΜΠΕΡΗ — εκεί πάνε οι ειδοποιήσεις νέου/ακυρωμένου ραντεβού.
 * Κενό = ο λογαριασμός που τρέχει το script.
 *
 * ΠΡΟΣΟΧΗ στους δύο ρόλους:
 *   ΜΠΑΡΜΠΕΡΗΣ -> ο λογαριασμός που κάνει deploy το script. Στο ΔΙΚΟ ΤΟΥ
 *                 ημερολόγιο γράφονται τα ραντεβού (βλ. CALENDAR_ID).
 *   ΠΕΛΑΤΗΣ    -> ό,τι email γράψει στη φόρμα. Παίρνει επιβεβαίωση και
 *                 σύνδεσμο ακύρωσης. Δεν χρειάζεται λογαριασμό Google.
 */
var OWNER_EMAIL = 'teo20942@gmail.com';

/** Public URL του site (για τους συνδέσμους ακύρωσης στα email). */
var SITE_URL = 'https://theodoreandronikou.github.io/hairmania/';

var TZ                  = 'Europe/Athens';
var SLOT_STEP           = 30;   /* λεπτά */
var LEAD_MINUTES        = 60;   /* πόσο πριν κλείνει η online κράτηση */
var DAYS_AHEAD          = 21;
var CANCEL_CUTOFF_HOURS = 2;
var BLOCK_PREFIXES      = ['ΚΛΕΙΣΤΑ', 'KΛΕΙΣΤΑ', 'CLOSED', 'ΑΔΕΙΑ', 'ΔΙΑΚΟΠΕΣ'];

var SH_HOURS = 'Ωράριο', SH_SERVICES = 'Υπηρεσίες', SH_LOG = 'Ραντεβού';
var DOW_NAMES = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

/* ============ SETUP ======================================== */

/** Τρέξε ΜΙΑ φορά. Φτιάχνει τα φύλλα με τις προεπιλογές. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);

  var h = sheet_(ss, SH_HOURS);
  if (h.getLastRow() < 2) {
    h.clear();
    h.getRange(1, 1, 1, 5).setValues([['Ημέρα', 'Πρωί από', 'Πρωί έως', 'Απόγευμα από', 'Απόγευμα έως']]);
    h.getRange(2, 1, 7, 5).setValues([
      ['Δευτέρα',   '09:00', '15:00', '17:00', '21:00'],
      ['Τρίτη',     '',      '',      '17:00', '21:00'],
      ['Τετάρτη',   '09:00', '15:00', '17:00', '21:00'],
      ['Πέμπτη',    '09:00', '15:00', '17:00', '21:00'],
      ['Παρασκευή', '09:00', '15:00', '17:00', '21:00'],
      ['Σάββατο',   '09:00', '15:00', '',      ''],
      ['Κυριακή',   '',      '',      '',      '']
    ]);
    h.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#5E1B20').setFontColor('#FFFFFF');
    h.getRange(2, 2, 7, 4).setNumberFormat('@');
    h.setFrozenRows(1);
    h.autoResizeColumns(1, 5);
    h.getRange('G2').setValue('Άδειο κελί = κλειστά. Μορφή ώρας: 09:00');
  }

  var s = sheet_(ss, SH_SERVICES);
  if (s.getLastRow() < 2) {
    s.clear();
    s.getRange(1, 1, 1, 6).setValues([['Κωδικός', 'Όνομα (ΕΛ)', 'Όνομα (EN)', 'Διάρκεια (λεπτά)', 'Τιμή (€)', 'Ενεργή']]);
    s.getRange(2, 1, 6, 6).setValues([
      ['kourema',  'Ανδρικό κούρεμα',      "Men's haircut",        30, 12, 'ΝΑΙ'],
      ['combo',    'Κούρεμα & γενειάδα',   'Haircut & beard',      45, 18, 'ΝΑΙ'],
      ['geneiada', 'Περιποίηση γενειάδας', 'Beard trim',           20,  8, 'ΝΑΙ'],
      ['paidiko',  'Παιδικό κούρεμα',      'Kids haircut',         30, 10, 'ΝΑΙ'],
      ['ksurisma', 'Ξύρισμα με λεπίδα',    'Straight razor shave', 30, 12, 'ΝΑΙ'],
      ['styling',  'Χτένισμα / styling',   'Styling',              15,  8, 'ΝΑΙ']
    ]);
    s.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#5E1B20').setFontColor('#FFFFFF');
    s.setFrozenRows(1);
    s.autoResizeColumns(1, 6);
  }

  var l = sheet_(ss, SH_LOG);
  if (l.getLastRow() < 1) {
    l.getRange(1, 1, 1, 13).setValues([[
      'Καταχώρηση', 'Ημερομηνία', 'Ώρα', 'Υπηρεσία', 'Διάρκεια', 'Τιμή',
      'Όνομα', 'Τηλέφωνο', 'Email', 'Σημείωση', 'Κατάσταση', 'Κωδικός', 'EventId'
    ]]);
    l.getRange(1, 1, 1, 13).setFontWeight('bold').setBackground('#5E1B20').setFontColor('#FFFFFF');
    l.setFrozenRows(1);
  }

  var cal = calendar_();
  Logger.log('OK. Ημερολόγιο: ' + cal.getName() + ' | Φύλλα έτοιμα.');
  return 'OK';
}

function sheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function calendar_() {
  return CALENDAR_ID ? CalendarApp.getCalendarById(CALENDAR_ID) : CalendarApp.getDefaultCalendar();
}

/* ============ ROUTER ======================================= */

function doGet(e) {
  var a = (e && e.parameter && e.parameter.action) || '';
  try {
    if (a === 'bootstrap')   return json_(bootstrap_());
    if (a === 'slots')       return json_(slots_(e.parameter.date, e.parameter.service));
    if (a === 'appointment') return json_(appointment_(e.parameter.id, e.parameter.k));
    if (a === 'gallery')     return json_(gallery_());
    if (a === 'flush')      return json_(flushCache_());
    if (a === 'ping')        return json_({ ok: true, tz: TZ, time: fmt_(new Date(), 'yyyy-MM-dd HH:mm') });
    return json_({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (err) {
    return json_({ ok: false, error: 'SERVER', detail: String(err) });
  }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (x) { return json_({ ok: false, error: 'BAD_JSON' }); }
  try {
    if (body.action === 'book')   return json_(book_(body));
    if (body.action === 'cancel') return json_(cancel_(body.id, body.k));
    return json_({ ok: false, error: 'UNKNOWN_ACTION' });
  } catch (err) {
    return json_({ ok: false, error: 'SERVER', detail: String(err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* ============ ΡΥΘΜΙΣΕΙΣ ΑΠΟ ΤΟ SHEET ======================= */

/* Το διάβασμα του Sheet κοστίζει ~0,8s κάθε φορά. Υπηρεσίες και ωράριο
   αλλάζουν ελάχιστα, οπότε τα κρατάμε σε cache. Όταν ο ιδιοκτήτης αλλάξει
   τιμή ή ωράριο, φαίνεται μέσα σε CONFIG_TTL δευτερόλεπτα — ή αμέσως αν
   ανοίξει το  …/exec?action=flush  */
var CONFIG_TTL = 180;

function cached_(key, producer) {
  var c = CacheService.getScriptCache();
  var hit = c.get(key);
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var val = producer();
  try { c.put(key, JSON.stringify(val), CONFIG_TTL); } catch (e) {}
  return val;
}

function readServices_() { return cached_('svc_v1', readServicesRaw_); }
function readHours_()    { return cached_('hrs_v1', readHoursRaw_); }

function flushCache_() {
  CacheService.getScriptCache().removeAll(['svc_v1', 'hrs_v1']);
  return { ok: true, flushed: true };
}

function readServicesRaw_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH_SERVICES);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues()
    .filter(function (r) { return r[0] && String(r[5]).toUpperCase().indexOf('ΝΑΙ') === 0; })
    .map(function (r) {
      return { id: String(r[0]).trim(), el: String(r[1]).trim(), en: String(r[2]).trim() || String(r[1]).trim(),
               min: Number(r[3]) || 30, price: Number(r[4]) || 0 };
    });
}

function readHoursRaw_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH_HOURS);
  var out = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().forEach(function (r) {
    var dow = DOW_NAMES.indexOf(String(r[0]).trim());
    if (dow < 0) return;
    var ranges = [];
    [[r[1], r[2]], [r[3], r[4]]].forEach(function (pair) {
      var a = cell2hm_(pair[0]), b = cell2hm_(pair[1]);
      if (a && b && a !== b) ranges.push([a, b]);
    });
    out[dow] = ranges;
  });
  return out;
}

/** Δέχεται και κείμενο "09:00" και πραγματική ώρα από το Sheets. */
function cell2hm_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (v instanceof Date) return fmt_(v, 'HH:mm');
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2})[:.](\d{2})/);
  return m ? pad_(+m[1]) + ':' + m[2] : '';
}

/* ============ BOOTSTRAP ==================================== */

/**
 * Τα κατειλημμένα διαστήματα όλου του παραθύρου κρατήσεων, σε ΜΙΑ κλήση.
 *
 * Γιατί: το Apps Script θέλει ~2s ανά κλήση ΚΑΙ βάζει τις ταυτόχρονες σε
 * ουρά. Μία κλήση ανά ημέρα σήμαινε ότι ο πελάτης περίμενε σε κάθε πάτημα.
 * Στέλνοντας τα διαστήματα μία φορά, ο browser υπολογίζει τις ώρες τοπικά
 * και ακαριαία. Η τελική απόφαση παραμένει του server: το book_() ξαναελέγχει
 * μέσα στο κλείδωμα, οπότε δεν χαλάει η προστασία από διπλοκράτηση.
 *
 * Στέλνουμε ΜΟΝΟ ώρες έναρξης/λήξης — ποτέ τίτλους ή στοιχεία πελατών.
 */
function busy_() {
  var cal = calendar_();
  var from = new Date();
  var to = new Date(from.getTime() + (DAYS_AHEAD + 1) * 864e5);
  var out = [];
  cal.getEvents(from, to).forEach(function (ev) {
    if (ev.isAllDayEvent()) return;          /* οι ολοήμερες πιάνονται από τα closures */
    out.push([ev.getStartTime().getTime(), ev.getEndTime().getTime()]);
  });
  return out;
}

function bootstrap_() {
  return {
    ok: true,
    services: readServices_(),
    hours: readHours_(),
    closures: closures_(),
    busy: busy_(),
    serverNow: Date.now(),
    leadMinutes: LEAD_MINUTES,
    slotStep: SLOT_STEP,
    daysAhead: DAYS_AHEAD,
    now: fmt_(new Date(), "yyyy-MM-dd'T'HH:mm"),
    tz: TZ
  };
}

/** Ολοήμερα events "ΚΛΕΙΣΤΑ..." μέσα στο παράθυρο κρατήσεων. */
function closures_() {
  var cal = calendar_(), from = new Date(), to = new Date(from.getTime() + DAYS_AHEAD * 864e5);
  return cal.getEvents(from, to)
    .filter(function (ev) { return ev.isAllDayEvent() && isBlock_(ev.getTitle()); })
    .map(function (ev) {
      var s = ev.getAllDayStartDate();
      var e = new Date(ev.getAllDayEndDate().getTime() - 864e5); /* end είναι exclusive */
      return { from: fmt_(s, 'yyyy-MM-dd'), to: fmt_(e, 'yyyy-MM-dd'),
               title: cleanBlockTitle_(ev.getTitle()) };
    });
}

/**
 * Κεφαλαία ΧΩΡΙΣ τόνους, για σύγκριση.
 * Κρίσιμο: ο ιδιοκτήτης θα γράψει «Κλειστά» ή «Διακοπές» όπως γράφει ένας
 * άνθρωπος. Το σκέτο toUpperCase() δίνει «ΚΛΕΙΣΤΆ» και η σύγκριση αποτύγχανε
 * σιωπηλά — δηλαδή το μαγαζί δεχόταν ραντεβού μέσα στις διακοπές του.
 */
function norm_(s) {
  return String(s == null ? '' : s)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

function isBlock_(title) {
  var t = norm_(title);
  for (var i = 0; i < BLOCK_PREFIXES.length; i++) if (t.indexOf(BLOCK_PREFIXES[i]) === 0) return true;
  return false;
}

function cleanBlockTitle_(title) {
  var raw = String(title == null ? '' : title).trim();
  var t = norm_(raw);
  for (var i = 0; i < BLOCK_PREFIXES.length; i++) {
    if (t.indexOf(BLOCK_PREFIXES[i]) === 0) {
      return raw.slice(BLOCK_PREFIXES[i].length).replace(/^[\s:—–-]+/, '');
    }
  }
  return raw;
}

/* ============ ΔΙΑΘΕΣΙΜΕΣ ΩΡΕΣ ============================== */

function slots_(dateStr, serviceId) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return { ok: false, error: 'BAD_DATE' };

  var svcs = readServices_();
  var svc = null;
  for (var i = 0; i < svcs.length; i++) if (svcs[i].id === serviceId) svc = svcs[i];
  if (!svc) svc = svcs[0];
  if (!svc) return { ok: false, error: 'NO_SERVICES' };

  var d = ymd_(dateStr);
  var hours = readHours_();
  var dow = new Date(d.y, d.m - 1, d.d).getDay();
  var ranges = hours[dow] || [];
  if (!ranges.length) return { ok: true, slots: [], closed: true };

  var dayStart = new Date(d.y, d.m - 1, d.d, 0, 0, 0);
  var dayEnd   = new Date(d.y, d.m - 1, d.d, 23, 59, 59);
  var events = calendar_().getEvents(dayStart, dayEnd);

  /* ολοήμερο κλείσιμο -> καμία ώρα */
  for (var k = 0; k < events.length; k++) {
    if (events[k].isAllDayEvent() && isBlock_(events[k].getTitle())) return { ok: true, slots: [], closed: true };
  }

  var busy = events.filter(function (ev) { return !ev.isAllDayEvent(); })
                   .map(function (ev) { return [ev.getStartTime().getTime(), ev.getEndTime().getTime()]; });

  var limit = Date.now() + LEAD_MINUTES * 60000;
  var out = [];

  ranges.forEach(function (r) {
    var from = hm2min_(r[0]), to = hm2min_(r[1]);
    for (var m = from; m + svc.min <= to; m += SLOT_STEP) {
      var s = new Date(d.y, d.m - 1, d.d, Math.floor(m / 60), m % 60, 0).getTime();
      var e = s + svc.min * 60000;
      if (s < limit) continue;
      var free = true;
      for (var b = 0; b < busy.length; b++) {
        if (s < busy[b][1] && e > busy[b][0]) { free = false; break; }
      }
      if (free) out.push(min2hm_(m));
    }
  });

  return { ok: true, slots: out, closed: false, duration: svc.min };
}

/* ============ ΚΡΑΤΗΣΗ (με κλείδωμα) ======================== */

function book_(b) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.date || ''))) return { ok: false, error: 'BAD_DATE' };
  if (!/^\d{2}:\d{2}$/.test(String(b.time || '')))       return { ok: false, error: 'BAD_TIME' };

  var name  = clean_(b.name, 80);
  var phone = String(b.phone || '').replace(/[^\d]/g, '');
  var email = clean_(b.email, 100);
  var notes = clean_(b.notes, 200);
  if (name.length < 2) return { ok: false, error: 'BAD_NAME' };
  if (!/^(69\d{8}|2\d{9})$/.test(phone)) return { ok: false, error: 'BAD_PHONE' };

  var svcs = readServices_(), svc = null;
  for (var i = 0; i < svcs.length; i++) if (svcs[i].id === b.serviceId) svc = svcs[i];
  if (!svc) return { ok: false, error: 'BAD_SERVICE' };

  /* idempotency: διπλό tap / retry δεν δημιουργεί δεύτερο ραντεβού */
  var cache = CacheService.getScriptCache();
  var idemKey = 'idem_' + clean_(b.idem, 40);
  if (b.idem) {
    var prev = cache.get(idemKey);
    if (prev) return JSON.parse(prev);
  }

  var d = ymd_(b.date), hm = String(b.time).split(':');
  var start = new Date(d.y, d.m - 1, d.d, +hm[0], +hm[1], 0);
  var end   = new Date(start.getTime() + svc.min * 60000);

  if (start.getTime() < Date.now() + LEAD_MINUTES * 60000) return { ok: false, error: 'TOO_SOON' };
  if (start.getTime() > Date.now() + (DAYS_AHEAD + 1) * 864e5) return { ok: false, error: 'TOO_FAR' };

  /* --- κρίσιμο τμήμα: μόνο ένα αίτημα τη φορά ---------------- */
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, error: 'BUSY' }; }

  try {
    /* το ωράριο ισχύει; */
    var ranges = readHours_()[start.getDay()] || [];
    var mins = start.getHours() * 60 + start.getMinutes(), fits = false;
    for (var r = 0; r < ranges.length; r++) {
      if (mins >= hm2min_(ranges[r][0]) && mins + svc.min <= hm2min_(ranges[r][1])) fits = true;
    }
    if (!fits) return { ok: false, error: 'OUT_OF_HOURS' };

    /* ΕΠΑΝΕΛΕΓΧΟΣ διαθεσιμότητας μέσα στο κλείδωμα */
    var cal = calendar_();
    var overlapping = cal.getEvents(new Date(start.getTime() - 12 * 3600000), new Date(end.getTime() + 12 * 3600000));
    for (var j = 0; j < overlapping.length; j++) {
      var ev = overlapping[j];
      if (ev.isAllDayEvent()) {
        if (isBlock_(ev.getTitle()) && sameDay_(ev.getAllDayStartDate(), start)) return { ok: false, error: 'SLOT_TAKEN' };
        continue;
      }
      if (start.getTime() < ev.getEndTime().getTime() && end.getTime() > ev.getStartTime().getTime()) {
        return { ok: false, error: 'SLOT_TAKEN' };
      }
    }

    var key = randomKey_();
    var title = '✂ ' + name + ' — ' + svc.el + ' — ' + phone;
    var desc =
      'Υπηρεσία: ' + svc.el + ' (' + svc.min + ' λεπτά, ' + svc.price + '€)\n' +
      'Πελάτης: ' + name + '\n' +
      'Τηλέφωνο: ' + phone + '\n' +
      (email ? 'Email: ' + email + '\n' : '') +
      (notes ? 'Σημείωση: ' + notes + '\n' : '') +
      '\nΚωδικός ακύρωσης: ' + key +
      '\nΚλείστηκε online: ' + fmt_(new Date(), 'dd/MM/yyyy HH:mm');

    var event = cal.createEvent(title, start, end, { description: desc, location: addressText_() });
    try { event.addPopupReminder(15); } catch (x) {}

    var res = { ok: true, eventId: event.getId(), cancelKey: key,
                date: b.date, time: b.time, duration: svc.min };

    logRow_([new Date(), b.date, b.time, svc.el, svc.min, svc.price, name, phone, email, notes,
             'Ενεργό', key, event.getId()]);

    if (b.idem) cache.put(idemKey, JSON.stringify(res), 21600);

    notifyOwner_('Νέο ραντεβού: ' + name,
      name + ' — ' + svc.el + '\n' + fmt_(start, 'EEEE dd/MM/yyyy HH:mm') + '\nΤηλ: ' + phone + (notes ? '\nΣημείωση: ' + notes : ''));

    if (email) mailCustomer_(email, name, svc, start, key, event.getId(), b.lang === 'en');

    return res;

  } finally {
    lock.releaseLock();
  }
}

/* ============ ΑΝΑΖΗΤΗΣΗ / ΑΚΥΡΩΣΗ ========================== */

function findEvent_(id, key) {
  if (!id || !key) return null;
  var ev;
  try { ev = calendar_().getEventById(id); } catch (e) { return null; }
  if (!ev) return null;
  if (String(ev.getDescription() || '').indexOf('Κωδικός ακύρωσης: ' + key) < 0) return null;
  return ev;
}

function appointment_(id, key) {
  var ev = findEvent_(id, key);
  if (!ev) return { ok: false, error: 'NOT_FOUND' };
  var desc = String(ev.getDescription() || '');
  var svcName = (desc.match(/Υπηρεσία:\s*([^(\n]+)/) || [, ''])[1].trim();
  var cust = (desc.match(/Πελάτης:\s*(.+)/) || [, ''])[1].trim();
  return {
    ok: true, status: 'confirmed',
    date: fmt_(ev.getStartTime(), 'yyyy-MM-dd'),
    time: fmt_(ev.getStartTime(), 'HH:mm'),
    serviceName: svcName, name: cust
  };
}

function cancel_(id, key) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: 'BUSY' }; }
  try {
    var ev = findEvent_(id, key);
    if (!ev) return { ok: false, error: 'NOT_FOUND' };
    var start = ev.getStartTime();
    if (start.getTime() - Date.now() < CANCEL_CUTOFF_HOURS * 3600000) return { ok: false, error: 'TOO_LATE' };

    var title = ev.getTitle();
    ev.deleteEvent();
    markCancelled_(id);
    notifyOwner_('ΑΚΥΡΩΣΗ ραντεβού', title + '\n' + fmt_(start, 'EEEE dd/MM/yyyy HH:mm') + '\nΑκυρώθηκε από τον πελάτη online.');
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

/* ============ GALLERY ====================================== */

function gallery_() {
  if (!GALLERY_FOLDER_ID) return { ok: true, images: [] };
  var out = [];
  try {
    var it = DriveApp.getFolderById(GALLERY_FOLDER_ID).getFiles();
    while (it.hasNext()) {
      var f = it.next();
      if (String(f.getMimeType()).indexOf('image/') !== 0) continue;
      out.push({ url: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w1400',
                 name: f.getName().replace(/\.[^.]+$/, ''),
                 t: f.getDateCreated().getTime() });
    }
  } catch (e) { return { ok: false, error: 'DRIVE' }; }
  out.sort(function (a, b) { return b.t - a.t; });
  return { ok: true, images: out };
}

/* ============ ΒΟΗΘΗΤΙΚΑ ==================================== */

function logRow_(row) {
  try { SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH_LOG).appendRow(row); } catch (e) {}
}

function markCancelled_(eventId) {
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SH_LOG);
    var n = sh.getLastRow(); if (n < 2) return;
    var ids = sh.getRange(2, 13, n - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (ids[i][0] === eventId) { sh.getRange(i + 2, 11).setValue('Ακυρώθηκε'); return; }
    }
  } catch (e) {}
}

function notifyOwner_(subject, body) {
  var to = OWNER_EMAIL || Session.getEffectiveUser().getEmail();
  try { MailApp.sendEmail(to, '[HAIR MANIA] ' + subject, body); } catch (e) {}
}

function mailCustomer_(email, name, svc, start, key, eventId, en) {
  var cancelUrl = SITE_URL.replace(/\/?$/, '/') + 'akyrosi.html?id=' +
                  encodeURIComponent(eventId) + '&k=' + encodeURIComponent(key);
  var when = fmt_(start, 'EEEE dd/MM/yyyy') + ' στις ' + fmt_(start, 'HH:mm');
  var subj = en ? 'Your appointment at HAIR MANIA VALKANIS' : 'Το ραντεβού σου στο HAIR MANIA VALKANIS';
  var html = en
    ? '<p>Hi ' + esc_(name) + ',</p><p>Your appointment is confirmed:</p>' +
      '<p><b>' + esc_(svc.en) + '</b><br>' + when + '<br>' + esc_(addressText_()) + '</p>' +
      '<p>Need to cancel? <a href="' + cancelUrl + '">Cancel here</a> (up to ' + CANCEL_CUTOFF_HOURS + ' hours before).</p>'
    : '<p>Γεια σου ' + esc_(name) + ',</p><p>Το ραντεβού σου επιβεβαιώθηκε:</p>' +
      '<p><b>' + esc_(svc.el) + '</b><br>' + when + '<br>' + esc_(addressText_()) + '</p>' +
      '<p>Θέλεις να ακυρώσεις; <a href="' + cancelUrl + '">Πάτησε εδώ</a> (έως ' + CANCEL_CUTOFF_HOURS + ' ώρες πριν).</p>';
  html += '<p style="color:#888;font-size:12px">HAIR MANIA VALKANIS · 2382504514 · 6981195115</p>';
  try { MailApp.sendEmail({ to: email, subject: subj, htmlBody: html }); } catch (e) {}
}

function addressText_() { return 'Στρατηγού Πλαστήρα Νικολάου 35, Γιαννιτσά 58100'; }

function randomKey_() {
  var a = 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
  for (var i = 0; i < 8; i++) s += a.charAt(Math.floor(Math.random() * a.length));
  return s;
}

function clean_(v, max) { return String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max || 100); }
function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function pad_(n) { return (n < 10 ? '0' : '') + n; }
function ymd_(s) { var p = s.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
function hm2min_(s) { var p = String(s).split(':'); return +p[0] * 60 + +p[1]; }
function min2hm_(v) { return pad_(Math.floor(v / 60)) + ':' + pad_(v % 60); }
function fmt_(d, f) { return Utilities.formatDate(d, TZ, f); }
function sameDay_(a, b) { return fmt_(a, 'yyyy-MM-dd') === fmt_(b, 'yyyy-MM-dd'); }
