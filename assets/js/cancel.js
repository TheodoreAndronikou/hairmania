/* =============================================================
   Σελίδα ακύρωσης — ανοίγει με ?id=<eventId>&k=<κωδικός>
   ============================================================= */
(function () {
  'use strict';

  var H = window.HMV, C = window.CONFIG, t = H.t;
  var box = document.getElementById('cx');
  if (!box) return;

  var q = new URLSearchParams(location.search);
  var id = q.get('id'), key = q.get('k');

  function phones() {
    return C.business.phones.map(function (p) {
      return '<a class="btn btn--ghost btn--wide" href="tel:' + H.telHref(p) + '">' +
             H.icon('phone') + H.fmtPhone(p) + '</a>';
    }).join('');
  }
  function msg(kind, title, body, extra) {
    box.innerHTML = '<div class="hint hint--' + kind + '" style="display:block">' +
      '<b style="display:block;margin-bottom:6px">' + title + '</b>' + (body || '') + '</div>' +
      (extra || '');
  }

  if (!id || !key) { msg('err', t('cx.h2'), t('cx.nolink')); return; }

  box.innerHTML = '<div class="spin"></div><p class="center muted">' + t('cx.loading') + '</p>';

  var demo = H.DEMO;

  function load() {
    if (demo) {
      var n = H.nowAthens();
      return Promise.resolve({
        ok: true, status: 'confirmed',
        date: H.addDaysISO(n.iso, 2), time: '11:30',
        serviceName: 'Κούρεμα & γενειάδα', name: 'Demo'
      });
    }
    return H.apiGet({ action: 'appointment', id: id, k: key });
  }

  load().then(function (res) {
    if (!res || !res.ok) { msg('err', t('cx.h2'), t('cx.notfound')); return; }
    if (res.status === 'cancelled') { msg('warn', t('cx.h2'), t('cx.already')); return; }

    var p = H.parseISO(res.date), hm = res.time.split(':');
    var start = H.athens(p.y, p.m, p.d, +hm[0], +hm[1]);
    var tooLate = (start.getTime() - Date.now()) < C.booking.cancelCutoffHours * 3600000;

    box.innerHTML =
      '<div class="summary" style="margin-bottom:22px">' +
        '<div class="summary__hd">' + t('bk.sum') + '</div>' +
        '<dl class="summary__bd">' +
          row(t('bk.sum_srv'), res.serviceName) +
          row(t('bk.sum_when'), H.fmtDateLong(res.date) + ', ' + res.time) +
          (res.name ? row(t('bk.name'), res.name) : '') +
        '</dl></div>' +
      (tooLate
        ? '<div class="hint hint--warn" style="display:block;margin-bottom:16px">' + t('cx.toolate') + '</div>' + phones()
        : '<p>' + t('cx.confirm') + '</p>' +
          '<div style="display:grid;gap:10px;max-width:380px">' +
            '<button type="button" class="btn btn--primary btn--wide" id="cx-go">' + t('cx.btn') + '</button>' +
            '<a class="btn btn--ghost btn--wide" href="index.html">' + t('cx.keep') + '</a>' +
          '</div>');

    var go = document.getElementById('cx-go');
    if (go) go.addEventListener('click', function () {
      go.disabled = true; go.textContent = '…';
      var p2 = demo ? Promise.resolve({ ok: true }) : H.apiPost({ action: 'cancel', id: id, k: key });
      p2.then(function (r) {
        if (r && r.ok) {
          box.innerHTML =
            '<div class="confirm">' +
              '<div class="confirm__top"><h2>' + t('cx.done') + '</h2></div>' +
              '<div class="confirm__bd"><p>' + t('cx.done_sub') + '</p>' +
              '<div class="confirm__actions"><a class="btn btn--accent" href="rantevou.html">' +
              H.icon('scissors') + t('ok.again') + '</a></div></div>' +
            '</div>';
          H.fixGreekCaps(box);
        } else if (r && r.error === 'TOO_LATE') {
          msg('warn', t('cx.h2'), t('cx.toolate'), phones());
        } else {
          msg('err', t('cx.h2'), t('cx.err'), phones());
        }
      }).catch(function () { msg('err', t('cx.h2'), t('cx.err'), phones()); });
    });
  }).catch(function () { msg('err', t('cx.h2'), t('cx.err'), phones()); });

  function row(k, v) {
    return '<div class="summary__row"><dt>' + k + '</dt><dd>' + v + '</dd></div>';
  }
})();
