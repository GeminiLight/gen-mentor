window.HELP_IMPROVE_VIDEOJS = false;


$(document).ready(function() {
    // Check for click events on the navbar burger icon

    var options = {
			slidesToScroll: 1,
			slidesToShow: 1,
			loop: true,
			infinite: true,
			autoplay: true,
			autoplaySpeed: 5000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);
	
    bulmaSlider.attach();

})

// Framework Architecture Tabs
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the first framework tab as active
  const firstArchTab = document.querySelector('#arch-tabs li');
  const firstArchPane = document.querySelector('#framework .tab-content #skill-identifier');
  
  if (firstArchTab && firstArchPane) {
    firstArchTab.classList.add('is-active');
    firstArchPane.classList.add('is-active');
  }

  const frameworkTabs = document.querySelectorAll('#arch-tabs li');
  const frameworkContents = document.querySelectorAll('#framework .tab-content .tab-pane');

  frameworkTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      frameworkTabs.forEach(t => t.classList.remove('is-active'));
      frameworkContents.forEach(tc => tc.classList.remove('is-active'));
      
      tab.classList.add('is-active');
      const target = tab.dataset.target;
      document.getElementById(target).classList.add('is-active');
    });
  });
});

// Navbar burger menu
document.addEventListener('DOMContentLoaded', () => {
  const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

  if ($navbarBurgers.length > 0) {
    $navbarBurgers.forEach(el => {
      el.addEventListener('click', () => {
        const target = el.dataset.target;
        const $target = document.getElementById(target);
        el.classList.toggle('is-active');
        $target.classList.toggle('is-active');
      });
    });
  }

  // Close mobile menu when clicking a link
  const navbarLinks = document.querySelectorAll('.navbar-item');
  const navbarMenu = document.querySelector('.navbar-menu');
  const navbarBurger = document.querySelector('.navbar-burger');
  
  navbarLinks.forEach(link => {
    link.addEventListener('click', () => {
      navbarMenu.classList.remove('is-active');
      navbarBurger.classList.remove('is-active');
    });
  });
});

// Results Tabs
document.addEventListener('DOMContentLoaded', () => {
  // Initialize the first results tab as active
  const firstResultsTab = document.querySelector('#results-tabs li');
  const firstResultsPane = document.querySelector('#results .tab-content #automated-results');
  
  if (firstResultsTab && firstResultsPane) {
    firstResultsTab.classList.add('is-active');
    firstResultsPane.classList.add('is-active');
  }

  const resultsTabs = document.querySelectorAll('#results-tabs li');
  const resultsContents = document.querySelectorAll('#results .tab-content .tab-pane');

  resultsTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      resultsTabs.forEach(t => t.classList.remove('is-active'));
      resultsContents.forEach(tc => tc.classList.remove('is-active'));
      
      tab.classList.add('is-active');
      const target = tab.dataset.target;
      document.getElementById(target).classList.add('is-active');
    });
  });
});

// Light/dark theme toggle. The initial theme is applied pre-paint by the
// inline script in <head> (localStorage choice, else system preference).
// Clicking the button stores an explicit choice; while the user has not
// chosen, live system theme changes are followed.
(function () {
  var attach = function () {
  var root = document.documentElement;
  var toggles = document.querySelectorAll('.theme-toggle');
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function stored() {
    try {
      var value = localStorage.getItem('gm-theme');
      return value === 'light' || value === 'dark' ? value : null;
    } catch (e) {
      return null;
    }
  }

  toggles.forEach(function (toggle) {
    toggle.addEventListener('click', function (event) {
      event.preventDefault();
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('gm-theme', next); } catch (e) { /* ignore */ }
    });
  });

  var copyBtn = document.getElementById('bibtex-copy');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var code = document.getElementById('bibtex-code');
      var label = copyBtn.querySelector('.bibtex-copy-label');
      var done = function () {
        if (!label) return;
        label.textContent = 'Copied!';
        setTimeout(function () { label.textContent = 'Copy'; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code.textContent.trim()).then(done);
      } else {
        var area = document.createElement('textarea');
        area.value = code.textContent.trim();
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
        done();
      }
    });
  }

  var onSystemChange = function (event) {
    if (stored()) { return; }
    root.setAttribute('data-theme', event.matches ? 'dark' : 'light');
  };
  if (media.addEventListener) {
    media.addEventListener('change', onSystemChange);
  } else if (media.addListener) {
    media.addListener(onSystemChange);
  }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();

// Scrollspy: deterministic scroll-position based highlighting. The nav
// item of the last section whose top passed the reading line (just
// below the fixed navbar) is active; at the very bottom the last
// section is pinned so it can never be missed.
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = Array.from(document.querySelectorAll('.navbar-start a.navbar-item[href^="#"]'));
  const linkById = {};
  navLinks.forEach(link => { linkById[link.getAttribute('href').slice(1)] = link; });
  const sections = Object.keys(linkById)
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if (!sections.length) return;

  // Close the mobile menu after tapping a nav item; Bulma leaves it open.
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const burger = document.querySelector('.navbar-burger');
      const menu = document.getElementById('navbarBasic');
      if (burger && menu && menu.classList.contains('is-active')) {
        burger.classList.remove('is-active');
        menu.classList.remove('is-active');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  });

  const setActive = (id) => {
    navLinks.forEach(link => link.classList.remove('is-active'));
    const link = id && linkById[id];
    if (link) link.classList.add('is-active');
  };

  // While a nav-driven smooth scroll is in flight, keep the clicked item
  // highlighted instead of flickering through the intermediate sections.
  let spyLockId = null;
  let lockTimer = null;

  const computeActive = () => {
    if (spyLockId !== null) return spyLockId;
    const line = window.scrollY + 140; // reading line below the navbar
    let currentId = null;
    for (const section of sections) {
      if (section.offsetTop <= line) currentId = section.id;
    }
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) currentId = sections[sections.length - 1].id;
    return currentId;
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      setActive(computeActive());
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      spyLockId = link.getAttribute('href').slice(1);
      setActive(spyLockId);
      clearTimeout(lockTimer);
      lockTimer = setTimeout(() => {
        spyLockId = null;
        onScroll();
      }, 1200);
    });
  });
});
