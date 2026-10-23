// Menu on small screens, and stop double-sending a form.
(function () {
  var btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
  }
  document.querySelectorAll('form.form').forEach(function (f) {
    f.addEventListener('submit', function () {
      var b = f.querySelector('button[type="submit"]');
      if (b) { b.disabled = true; b.textContent = 'Sending…'; }
    });
  });
  var bad = document.querySelector('[aria-invalid="true"]');
  if (bad) bad.focus();
})();
