/* Motorsports Partnerships — front-end behaviour
   Vanilla JS, no jQuery. Every feature checks that its element exists first,
   so the same file can be enqueued on Elementor-built pages without errors. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- AOS ---------- */
  if (window.AOS) {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
      disable: reduceMotion
    });
    // re-measure once images/fonts are in, so triggers fire at the right spot
    window.addEventListener('load', function () { AOS.refresh(); });
  }

  /* ---------- Sticky header + back-to-top ---------- */
  var header = document.getElementById('mpHeader');
  var toTop = document.getElementById('mpTop');

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('is-scrolled', y > 20);
    if (toTop) toTop.classList.toggle('is-visible', y > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Close mobile menu after choosing a link ---------- */
  var menu = document.getElementById('mpMenu');
  if (menu && window.bootstrap) {
    menu.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        if (menu.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(menu).hide();
      });
    });
  }

  /* ---------- Smooth anchor scroll with sticky-header offset ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var offset = header ? header.offsetHeight : 0;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset + 1;
      window.scrollTo({ top: top, behavior: reduceMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---------- Active nav link follows scroll ---------- */
  var navLinks = document.querySelectorAll('#mpNav .nav-link[href^="#"]');
  var spySections = [];
  navLinks.forEach(function (l) {
    var s = document.querySelector(l.getAttribute('href'));
    if (s) spySections.push({ link: l, el: s });
  });
  function spy() {
    if (!spySections.length) return;
    var line = (header ? header.offsetHeight : 0) + window.innerHeight * 0.3;
    var current = spySections[0];
    spySections.forEach(function (s) {
      if (s.el.getBoundingClientRect().top <= line) current = s;
    });
    navLinks.forEach(function (l) { l.classList.toggle('active', l === current.link); });
  }
  window.addEventListener('scroll', spy, { passive: true });
  spy();

  /* ---------- Count-up numbers ---------- */
  var counters = document.querySelectorAll('[data-count]');
  function runCounter(el) {
    var end = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion) { el.textContent = end; return; }
    var start = null;
    var dur = 1600;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && counters.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* ---------- Forms (front-end only until WP: Elementor Form / CF7 takes over) ---------- */
  function handleForm(form, successMsg) {
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.add('was-validated');
      var note = form.querySelector('.mp-form-note');
      if (!form.checkValidity()) {
        var firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      if (note) {
        note.textContent = successMsg;
        note.classList.remove('d-none');
      }
      form.reset();
      form.classList.remove('was-validated');
    });
  }
  handleForm(document.getElementById('mpContactForm'), 'Thanks! Your message has been sent — we will be in touch shortly.');

  var cta = document.getElementById('mpCtaForm');
  if (cta) {
    cta.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = cta.querySelector('input[type="email"]');
      if (!email.checkValidity()) { email.reportValidity(); return; }
      // hand the email over to the main contact form
      var mainEmail = document.getElementById('mpEmail');
      if (!mainEmail) {
        // inner pages without a contact form: carry the email over to contact.html
        window.location.href = 'contact.html?email=' + encodeURIComponent(email.value) + '#contact';
        return;
      }
      mainEmail.value = email.value;
      email.value = '';
      var contact = document.getElementById('contact');
      if (contact) {
        var offset = header ? header.offsetHeight : 0;
        window.scrollTo({ top: contact.getBoundingClientRect().top + window.pageYOffset - offset, behavior: reduceMotion ? 'auto' : 'smooth' });
        var first = document.getElementById('mpName');
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 700);
      }
    });
  }

  /* ---------- Prefill contact email from ?email= (sent by the CTA band on inner pages) ---------- */
  var prefill = document.getElementById('mpEmail');
  if (prefill && window.URLSearchParams) {
    var qEmail = new URLSearchParams(window.location.search).get('email');
    if (qEmail) prefill.value = qEmail;
  }

  /* ---------- Blog category filter ---------- */
  var filterBar = document.querySelector('[data-mp-filter]');
  if (filterBar) {
    var cols = document.querySelectorAll('.mp-post-col[data-cat]');
    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.mp-filter__btn');
      if (!btn) return;
      var cat = btn.getAttribute('data-filter');
      filterBar.querySelectorAll('.mp-filter__btn').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      cols.forEach(function (c) {
        c.classList.toggle('is-hidden', cat !== 'all' && c.getAttribute('data-cat') !== cat);
      });
      if (window.AOS) AOS.refresh();
    });
  }
})();
