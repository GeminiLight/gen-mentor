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
