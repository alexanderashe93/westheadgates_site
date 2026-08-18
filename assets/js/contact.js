/* Westhead Gates — contact form.
 *
 * The form works without JavaScript: it posts to api/contact.php and the
 * server redirects back with ?sent=1 or ?error=…. This script only makes
 * that nicer — inline validation and a submit without a page reload.
 */
(function () {
  'use strict';

  var form = document.getElementById('contactForm');
  if (!form) { return; }

  var statusEl = document.getElementById('formStatus');
  var button   = document.getElementById('contactSubmit');
  var label    = button ? button.querySelector('[data-submit-label]') : null;

  /* Timestamp the render, so the server can reject instant bot submissions. */
  var loadedAt = document.getElementById('loadedAt');
  if (loadedAt) { loadedAt.value = String(Math.floor(Date.now() / 1000)); }

  /* Preselect a subject from the query string, e.g. ?subject=safety-inspection */
  var wanted = new URLSearchParams(window.location.search).get('subject');
  if (wanted) {
    var select = form.querySelector('#subject');
    if (select && select.querySelector('option[value="' + CSS.escape(wanted) + '"]')) {
      select.value = wanted;
    }
  }

  /* Show the outcome of a no-JavaScript submission. */
  var params = new URLSearchParams(window.location.search);
  if (params.get('sent') === '1') {
    show('ok', 'Thanks — your enquiry is with us. We’ll be in touch shortly.');
    form.reset();
  } else if (params.get('error')) {
    show('err', 'Sorry, that didn’t send. Please call us instead.');
  }

  /* ------------------------------------------------------------ validation */

  var RULES = {
    name:    function (v) { return v.trim().length >= 2 || 'Please tell us your name.'; },
    phone:   function (v) { return /^[\d\s+()-]{7,}$/.test(v.trim()) || 'Please enter a phone number we can reach you on.'; },
    email:   function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Please enter a valid email address.'; },
    message: function (v) { return v.trim().length >= 10 || 'A sentence or two about the job, please.'; },
    consent: function (v, field) { return field.checked || 'Please tick the box so we can reply.'; }
  };

  function setError(name, message) {
    var slot = form.querySelector('[data-error-for="' + name + '"]');
    var field = form.querySelector('[name="' + name + '"]');
    if (slot) { slot.textContent = message || ''; }
    if (field && field.closest('.field')) {
      field.closest('.field').classList.toggle('has-error', Boolean(message));
    }
    if (field) {
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
  }

  function validate() {
    var firstBad = null;
    Object.keys(RULES).forEach(function (name) {
      var field = form.querySelector('[name="' + name + '"]');
      if (!field) { return; }
      var result = RULES[name](field.value, field);
      var message = result === true ? '' : result;
      setError(name, message);
      if (message && !firstBad) { firstBad = field; }
    });
    return firstBad;
  }

  // Clear a field's error as soon as it becomes valid.
  Object.keys(RULES).forEach(function (name) {
    var field = form.querySelector('[name="' + name + '"]');
    if (!field) { return; }
    var evt = field.type === 'checkbox' ? 'change' : 'input';
    field.addEventListener(evt, function () {
      if (RULES[name](field.value, field) === true) { setError(name, ''); }
    });
  });

  /* ---------------------------------------------------------------- submit */

  function show(kind, message) {
    if (!statusEl) { return; }
    statusEl.className = 'form-status form-status--' + kind;
    statusEl.textContent = message;
    statusEl.hidden = false;
  }

  function busy(state) {
    if (!button) { return; }
    button.disabled = state;
    if (label) { label.textContent = state ? 'Sending…' : 'Send enquiry'; }
  }

  form.addEventListener('submit', function (e) {
    var firstBad = validate();
    if (firstBad) {
      e.preventDefault();
      firstBad.focus();
      show('err', 'Please check the highlighted fields.');
      return;
    }

    // fetch() is available everywhere current; if not, let the form post normally.
    if (!window.fetch) { return; }

    e.preventDefault();
    if (statusEl) { statusEl.hidden = true; }
    busy(true);

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (res) { return res.json().catch(function () { return {}; }); })
      .then(function (data) {
        if (data && data.ok) {
          form.reset();
          if (loadedAt) { loadedAt.value = String(Math.floor(Date.now() / 1000)); }
          show('ok', data.message || 'Thanks — your enquiry is with us. We’ll be in touch shortly.');
        } else {
          show('err', (data && data.message) ||
            'Sorry, that didn’t send. Please call us on the number above.');
        }
      })
      .catch(function () {
        show('err', 'Sorry, that didn’t send — you may be offline. Please call us instead.');
      })
      .then(function () { busy(false); });
  });
})();
