// Small progressive enhancements. The site works without JavaScript.
(function () {
  var btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('open', open);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); } });
  }
  // copy private link
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var input = document.getElementById(b.getAttribute('data-copy'));
      if (!input) return;
      input.select();
      var done = function () { var t = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = t; }, 2000); };
      if (navigator.clipboard) navigator.clipboard.writeText(input.value).then(done, function () { document.execCommand('copy'); done(); });
      else { document.execCommand('copy'); done(); }
    });
  });
  // show the fee box only when "set fee" is chosen
  var fee = document.querySelector('input[name="fee"]');
  if (fee) {
    var box = fee.closest('.field');
    var sync = function () { var c = document.querySelector('input[name="nightType"]:checked'); box.hidden = !(c && c.value === 'fee'); };
    document.querySelectorAll('input[name="nightType"]').forEach(function (r) { r.addEventListener('change', sync); });
    sync();
  }
  // inline validation when leaving a field (the server still checks everything)
  var MSG = { email: 'Please enter a valid email address.', tel: 'Please enter a UK phone number, like 01782 123456.', postcode: 'Please enter a valid UK postcode, like ST1 1AA.', required: 'Please fill this in.' };
  var PC = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  function problem(el) {
    var v = el.value.trim();
    if (!v) return el.required ? MSG.required : '';
    if (el.name === 'postcode' && !PC.test(v)) return MSG.postcode;
    if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v)) return MSG.email;
    if (el.type === 'tel' && !/^0\d{9,10}$/.test(v.replace(/[\s()-]/g, '').replace(/^\+44/, '0'))) return MSG.tel;
    return '';
  }
  document.querySelectorAll('.form .field input:not([type=checkbox]):not([type=radio]):not([type=date]):not([type=password]), .form .field textarea').forEach(function (el) {
    var box = el.closest('.field');
    el.addEventListener('blur', function () {
      var msg = problem(el), err = box.querySelector('.err.live');
      if (msg) {
        if (!err) { err = document.createElement('span'); err.className = 'err live'; err.id = el.id + '-live'; err.setAttribute('aria-live', 'polite'); box.appendChild(err); }
        err.textContent = msg; el.setAttribute('aria-invalid', 'true'); box.classList.add('has-err');
        var d = (el.getAttribute('aria-describedby') || '').split(' ').filter(Boolean); if (d.indexOf(err.id) < 0) { d.push(err.id); el.setAttribute('aria-describedby', d.join(' ')); }
      } else { box.querySelectorAll('.err').forEach(function (e) { e.remove(); }); el.removeAttribute('aria-invalid'); box.classList.remove('has-err'); }
    });
  });
  // stop double submits
  document.querySelectorAll('form').forEach(function (f) {
    f.addEventListener('submit', function () {
      var b = f.querySelector('button[type="submit"]');
      if (b) setTimeout(function () { b.disabled = true; }, 0);
    });
  });
})();
