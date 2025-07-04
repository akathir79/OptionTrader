// Market Data Carousel Navigation
document.addEventListener("DOMContentLoaded", function() {
  let currentPage = 0;
  const totalPages = 7;

  const prevBtn = document.getElementById('marketDataPrevBtn');
  const nextBtn = document.getElementById('marketDataNextBtn');
  const carousel = document.getElementById('marketDataCarousel');

  function updateCarousel() {
    if (!carousel) return;

    const translateX = -(currentPage * 14.2857);
    carousel.style.transform = `translateX(${translateX}%)`;

    if (prevBtn) {
      prevBtn.disabled = currentPage === 0;
      prevBtn.style.opacity = currentPage === 0 ? '0.5' : '1';
    }

    if (nextBtn) {
      nextBtn.disabled = currentPage >= totalPages - 1;
      nextBtn.style.opacity = currentPage >= totalPages - 1 ? '0.5' : '1';
    }

    console.log(`Market data carousel moved to page ${currentPage + 1} of ${totalPages}`);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (currentPage > 0) {
        currentPage--;
        updateCarousel();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (currentPage < totalPages - 1) {
        currentPage++;
        updateCarousel();
      }
    });
  }

  updateCarousel();
});