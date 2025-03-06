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
  const tabs = document.querySelectorAll('#arch-tabs li');
  const tabContents = document.querySelectorAll('.tab-pane');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tabContents.forEach(tc => tc.classList.remove('is-active'));
      
      tab.classList.add('is-active');
      const target = tab.dataset.target;
      document.getElementById(target).classList.add('is-active');
    });
  });
});
