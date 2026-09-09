/* GenMentor project page — behaviour.
   Dependency-free apart from bulma-carousel. The initial colour theme is
   applied pre-paint by the inline script in <head>. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    initTheme();
    initNav();
    initTabs();
    initCarousel();
    initBibtexCopy();
    initScrollspy();
  });

  /* ---------- Theme ---------- */

  function storedTheme() {
    try {
      var value = localStorage.getItem('gm-theme');
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function labelToggles() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var label = dark ? 'Switch to light theme' : 'Switch to dark theme';
    document.querySelectorAll('.theme-toggle').forEach(function (toggle) {
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
    });
  }

  function initTheme() {
    document.querySelectorAll('.theme-toggle').forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('gm-theme', next); } catch (e) { /* ignore */ }
        labelToggles();
      });
    });

    var onSystemChange = function (event) {
      if (storedTheme()) { return; }
      root.setAttribute('data-theme', event.matches ? 'dark' : 'light');
      labelToggles();
    };
    if (prefersDark.addEventListener) {
      prefersDark.addEventListener('change', onSystemChange);
    } else if (prefersDark.addListener) {
      prefersDark.addListener(onSystemChange);
    }

    labelToggles();
  }

  /* ---------- Navbar (mobile menu) ---------- */

  function initNav() {
    var burger = document.querySelector('.navbar-burger');
    var menu = burger && document.getElementById(burger.getAttribute('aria-controls'));
    if (!burger || !menu) { return; }

    var setOpen = function (open) {
      burger.classList.toggle('is-active', open);
      menu.classList.toggle('is-active', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    burger.addEventListener('click', function () {
      setOpen(!menu.classList.contains('is-active'));
    });

    menu.querySelectorAll('a.navbar-item').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && menu.classList.contains('is-active')) {
        setOpen(false);
        burger.focus();
      }
    });
  }

  /* ---------- Tabs (WAI-ARIA tablist, arrow-key navigation) ---------- */

  function initTabs() {
    document.querySelectorAll('[role="tablist"]').forEach(function (list) {
      var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
      var panes = tabs.map(function (tab) {
        return document.getElementById(tab.getAttribute('aria-controls'));
      });
      if (!tabs.length || panes.some(function (p) { return !p; })) { return; }

      var select = function (index, focus) {
        tabs.forEach(function (tab, i) {
          var on = i === index;
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
          tab.tabIndex = on ? 0 : -1;
          panes[i].hidden = !on;
          panes[i].classList.toggle('is-active', on);
        });
        if (focus) { tabs[index].focus(); }
      };

      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(i, false); });
        tab.addEventListener('keydown', function (event) {
          var next = null;
          if (event.key === 'ArrowRight') { next = (i + 1) % tabs.length; }
          else if (event.key === 'ArrowLeft') { next = (i - 1 + tabs.length) % tabs.length; }
          else if (event.key === 'Home') { next = 0; }
          else if (event.key === 'End') { next = tabs.length - 1; }
          if (next !== null) {
            event.preventDefault();
            select(next, true);
          }
        });
      });

      var initial = tabs.findIndex(function (tab) {
        return tab.getAttribute('aria-selected') === 'true';
      });
      select(initial < 0 ? 0 : initial, false);
    });
  }

  /* ---------- Screenshot carousel ---------- */

  function initCarousel() {
    if (typeof bulmaCarousel === 'undefined') { return; }
    var el = document.getElementById('results-carousel');
    if (!el) { return; }
    bulmaCarousel.attach(el, {
      slidesToScroll: 1,
      slidesToShow: 1,
      loop: true,
      infinite: true,
      autoplay: !reduceMotion.matches,
      autoplaySpeed: 6000,
      pauseOnHover: true
    });
  }

  /* ---------- BibTeX copy ---------- */

  function initBibtexCopy() {
    var button = document.getElementById('bibtex-copy');
    var code = document.getElementById('bibtex-code');
    if (!button || !code) { return; }
    var label = button.querySelector('.bibtex-copy-label');

    var done = function () {
      button.classList.add('is-copied');
      if (label) { label.textContent = 'Copied'; }
      setTimeout(function () {
        button.classList.remove('is-copied');
        if (label) { label.textContent = 'Copy'; }
      }, 1800);
    };

    button.addEventListener('click', function () {
      var text = code.textContent.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else {
        fallbackCopy(text);
        done();
      }
    });
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(area);
  }

  /* ---------- Scrollspy ----------
     Deterministic: the nav item of the last section whose top has passed
     the reading line (just below the fixed navbar) is active; at the very
     bottom the last section is pinned so it can never be missed. */

  function initScrollspy() {
    var navLinks = Array.prototype.slice.call(
      document.querySelectorAll('.navbar-start a.navbar-item[href^="#"]')
    );
    var linkById = {};
    navLinks.forEach(function (link) {
      linkById[link.getAttribute('href').slice(1)] = link;
    });
    var sections = Object.keys(linkById)
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (!sections.length) { return; }

    var setActive = function (id) {
      navLinks.forEach(function (link) {
        var on = id && link === linkById[id];
        link.classList.toggle('is-active', !!on);
        if (on) { link.setAttribute('aria-current', 'true'); }
        else { link.removeAttribute('aria-current'); }
      });
    };

    // While a nav-driven smooth scroll is in flight, keep the clicked item
    // highlighted instead of flickering through the intermediate sections.
    var lockId = null;
    var lockTimer = null;

    var computeActive = function () {
      if (lockId !== null) { return lockId; }
      var line = window.scrollY + 140;
      var currentId = null;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= line) { currentId = sections[i].id; }
      }
      var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) { currentId = sections[sections.length - 1].id; }
      return currentId;
    };

    var ticking = false;
    var onScroll = function () {
      if (ticking) { return; }
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        setActive(computeActive());
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        lockId = link.getAttribute('href').slice(1);
        setActive(lockId);
        clearTimeout(lockTimer);
        lockTimer = setTimeout(function () {
          lockId = null;
          onScroll();
        }, 1200);
      });
    });
  }
})();
