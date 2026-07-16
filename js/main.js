/* TEST — shared page behavior.
   Everything here is progressive enhancement: with JavaScript disabled the
   nav stays fully visible and the text-size buttons stay hidden, so no
   control ever appears broken. */
(function () {
  'use strict';

  document.documentElement.classList.add('js-enabled');

  /* ---- Mobile navigation toggle ---- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  function isSmallScreen() {
    return window.matchMedia('(max-width: 47.99em)').matches;
  }

  if (toggle && nav) {
    if (isSmallScreen()) {
      nav.hidden = true;
    }

    toggle.addEventListener('click', function () {
      var open = nav.hidden;
      nav.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });

    window.addEventListener('resize', function () {
      if (!isSmallScreen()) {
        nav.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
      }
    });
  }

  /* ---- Text-size control ----
     Scales the root font size from the 18px default up to 200% (36px).
     Uses rem-based layout throughout, so everything reflows rather than
     breaking. Choice is saved so it follows the visitor between pages. */
  var BASE_PERCENT = 112.5; /* 18px */
  var STEPS = [1, 1.25, 1.5, 1.75, 2];
  var STORAGE_KEY = 'test-text-scale';

  var controls = document.querySelector('.text-size-controls');
  var smaller = document.querySelector('[data-text-size="down"]');
  var larger = document.querySelector('[data-text-size="up"]');
  var status = document.querySelector('.text-size-status');

  function readStep() {
    try {
      var saved = parseFloat(localStorage.getItem(STORAGE_KEY));
      return STEPS.indexOf(saved) !== -1 ? STEPS.indexOf(saved) : 0;
    } catch (e) {
      return 0;
    }
  }

  function applyStep(index) {
    var scale = STEPS[index];
    document.documentElement.style.fontSize = (BASE_PERCENT * scale) + '%';
    if (status) {
      status.textContent = Math.round(scale * 100) + '%';
    }
    if (smaller) { smaller.disabled = index === 0; }
    if (larger) { larger.disabled = index === STEPS.length - 1; }
    try {
      localStorage.setItem(STORAGE_KEY, String(STEPS[index]));
    } catch (e) { /* private browsing — size still applies for this page */ }
  }

  if (controls && smaller && larger) {
    controls.hidden = false;
    var current = readStep();
    applyStep(current);

    smaller.addEventListener('click', function () {
      if (current > 0) { applyStep(--current); }
    });
    larger.addEventListener('click', function () {
      if (current < STEPS.length - 1) { applyStep(++current); }
    });
  }
})();
