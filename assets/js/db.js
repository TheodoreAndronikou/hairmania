/* =============================================================
   Σύνδεση με τη βάση (Supabase)

   Καλούμε ΜΟΝΟ συναρτήσεις της βάσης (RPC), ποτέ πίνακες απευθείας.
   Οι πίνακες είναι κλειδωμένοι με RLS — έτσι το δημόσιο κλειδί που
   βρίσκεται μέσα στη σελίδα δεν μπορεί να κατεβάσει ονόματα και
   τηλέφωνα πελατών. Βλ. supabase/schema.sql.

   Αν δεν έχουν οριστεί κλειδιά, το HMV.db είναι null και ο υπόλοιπος
   κώδικας πέφτει πίσω στον παλιό δρόμο (Apps Script).
   ============================================================= */
(function () {
  'use strict';

  var S = (window.CONFIG && window.CONFIG.SUPABASE) || {};
  if (!S.url || !S.key) { window.HMV_DB = null; return; }

  var BASE = String(S.url).replace(/\/+$/, '') + '/rest/v1/rpc/';
  var HEAD = {
    'Content-Type': 'application/json',
    'apikey': S.key,
    'Authorization': 'Bearer ' + S.key
  };

  /**
   * Κάθε κλήση επιστρέφει το JSON της συνάρτησης, ή {ok:false,error:'NET'}.
   *
   * Τα όρια είναι γενναιόδωρα επίτηδες: σε κινητό δίκτυο, και ιδίως μέσα σε
   * ενσωματωμένο παράθυρο εφαρμογής, η πρώτη κλήση μπορεί να αργήσει πολύ
   * περισσότερο απ' ό,τι σε σταθερή σύνδεση.
   */
  function rpc(fn, args, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 25000);
    return fetch(BASE + fn, {
      method: 'POST',
      headers: HEAD,
      body: JSON.stringify(args || {}),
      signal: ctrl.signal
    }).then(function (r) {
      return r.json().then(function (j) {
        /* Σφάλμα Postgres έρχεται ως {code,message,...} χωρίς ok */
        if (j && typeof j === 'object' && !('ok' in j) && (j.code || j.message)) {
          return { ok: false, error: 'DB', detail: j.message || j.code };
        }
        return j;
      });
    }).catch(function (e) {
      return { ok: false, error: e.name === 'AbortError' ? 'TIMEOUT' : 'NET' };
    }).then(function (res) {
      clearTimeout(timer);
      return res;
    });
  }

  /** Μόνο για διαβάσματα: μία σιωπηλή επανάληψη αν κόπηκε το δίκτυο. */
  function rpcRetry(fn, args, timeoutMs) {
    return rpc(fn, args, timeoutMs).then(function (res) {
      var flaky = res && res.ok === false && (res.error === 'NET' || res.error === 'TIMEOUT');
      return flaky ? rpc(fn, args, timeoutMs) : res;
    });
  }

  window.HMV_DB = {
    /* ---- δημόσια ---- */
    availability: function (days) { return rpcRetry('availability', { days: days || 21 }); },

    book: function (o) {
      return rpc('book', {
        p_start: o.start.toISOString(),
        p_service: o.serviceId,
        p_name: o.name,
        p_phone: o.phone,
        p_email: o.email || '',
        p_notes: o.notes || ''
      }, 30000);
    },

    appointmentInfo: function (id, key) { return rpc('appointment_info', { p_id: id, p_key: key }); },
    cancelAppointment: function (id, key) { return rpc('cancel_appointment', { p_id: id, p_key: key }); },

    /* ---- διαχειριστικό ---- */
    adminDay: function (pin, dateISO) { return rpcRetry('admin_day', { p_pin: pin, p_date: dateISO }); },

    adminAdd: function (pin, o) {
      return rpc('admin_add', {
        p_pin: pin, p_start: o.start.toISOString(),
        p_service: o.serviceId, p_name: o.name, p_phone: o.phone || ''
      });
    },

    adminBlock: function (pin, o) {
      return rpc('admin_block', {
        p_pin: pin, p_start: o.start.toISOString(),
        p_minutes: o.minutes, p_note: o.note || ''
      });
    },

    adminClose: function (pin, from, to, note) {
      return rpc('admin_close', { p_pin: pin, p_from: from, p_to: to, p_note: note || '' });
    },

    adminReopen: function (pin, dateISO) { return rpc('admin_reopen', { p_pin: pin, p_date: dateISO }); },
    adminSetPin: function (pin, next) { return rpc('admin_set_pin', { p_pin: pin, p_new: next }); },
    adminDelete: function (pin, id) { return rpc('admin_delete', { p_pin: pin, p_id: id }); },

    /**
     * Ακύρωση ραντεβού ΜΕ ειδοποίηση του πελάτη (και προαιρετική αιτία).
     *
     * Το admin_cancel μπαίνει στη βάση με το patch-02-email.sql. Όσο δεν
     * έχει τρέξει, η PostgREST απαντάει PGRST202 και ΤΟ ΚΟΥΜΠΙ ΑΚΥΡΩΣΗΣ
     * ΔΕΝ ΕΚΑΝΕ ΤΙΠΟΤΑ. Πέφτουμε πίσω στο admin_delete, που ελευθερώνει
     * την ώρα κανονικά — απλώς χωρίς email.
     */
    adminCancel: function (pin, id, reason) {
      return rpc('admin_cancel', { p_pin: pin, p_id: id, p_reason: reason || '' }, 20000)
        .then(function (res) {
          var missing = res && res.ok === false && res.error === 'DB' &&
                        /PGRST202|Could not find the function/i.test(res.detail || '');
          if (!missing) return res;
          return rpc('admin_delete', { p_pin: pin, p_id: id }).then(function (r2) {
            if (r2 && r2.ok) { r2.notified = false; r2.emailOffline = true; }
            return r2;
          });
        });
    }
  };
})();
