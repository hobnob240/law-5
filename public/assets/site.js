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
  // stop double submits
  document.querySelectorAll('form').forEach(function (f) {
    f.addEventListener('submit', function () {
      var b = f.querySelector('button[type="submit"]');
      if (b) setTimeout(function () { b.disabled = true; }, 0);
    });
  });
})();
