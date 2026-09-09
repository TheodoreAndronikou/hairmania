/* =============================================================
   Παραγωγή αρχείου .ics (RFC 5545) — δουλεύει σε Google, Apple,
   Samsung, Outlook. Ώρες σε UTC ώστε να μην υπάρχει καμία
   εξάρτηση από ζώνη ώρας ή VTIMEZONE.
   ============================================================= */
(function () {
  'use strict';

  function z(d) {
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' +
           p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
  }

  /* escaping κατά RFC 5545 §3.3.11 */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\').replace(/;/g, '\\;')
      .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  /* αναδίπλωση γραμμών στα 75 octets (UTF-8 safe) */
  function fold(line) {
    var out = '', cur = '', bytes = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      var cp = ch.charCodeAt(0);
      var b = cp < 0x80 ? 1 : cp < 0x800 ? 2 : (cp >= 0xD800 && cp <= 0xDFFF) ? 2 : 3;
      if (bytes + b > 73) { out += cur + '\r\n '; cur = ''; bytes = 1; }
      cur += ch; bytes += b;
    }
    return out + cur;
  }

  /* TRIGGER τιμή από ώρες: 2 -> -PT2H, 0.5 -> -PT30M */
  function trig(hours) {
    var mins = Math.round(hours * 60);
    if (mins % 60 === 0) return '-PT' + (mins / 60) + 'H';
    return '-PT' + mins + 'M';
  }

  /**
   * @param {Object} o {uid,start:Date,end:Date,title,description,location,url,alarms:[hours]}
   */
  function build(o) {
    var L = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Hair Mania Valkanis//Booking//EL',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + o.uid,
      'DTSTAMP:' + z(new Date()),
      'DTSTART:' + z(o.start),
      'DTEND:' + z(o.end),
      'SUMMARY:' + esc(o.title),
      'DESCRIPTION:' + esc(o.description),
      'LOCATION:' + esc(o.location),
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'SEQUENCE:0'
    ];
    /* Το URL property το δείχνει το iPhone ως γυμνή διεύθυνση μέσα στο
       ραντεβού και μπερδεύει. Ο σύνδεσμος ακύρωσης μπαίνει στις σημειώσεις. */
    (o.alarms || []).forEach(function (h) {
      L.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(o.title),
             'TRIGGER:' + trig(h), 'END:VALARM');
    });
    L.push('END:VEVENT', 'END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }

  function download(text, filename) {
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 4000);
  }

  /* Fallback ενός κλικ για Google Calendar (web/Android) */
  function googleUrl(o) {
    var q = {
      action: 'TEMPLATE',
      text: o.title,
      dates: z(o.start).replace(/[-:]/g, '') + '/' + z(o.end).replace(/[-:]/g, ''),
      details: o.description,
      location: o.location
    };
    return 'https://calendar.google.com/calendar/render?' + Object.keys(q).map(function (k) {
      return k + '=' + encodeURIComponent(q[k]);
    }).join('&');
  }

  window.ICS = { build: build, download: download, googleUrl: googleUrl };
})();
