// Custom JavaScript to enhance functionality

// Make sure the topbar and header are properly handled when scrolling
window.addEventListener("DOMContentLoaded", function() {
  const topbar = document.querySelector(".topbar");
  const header = document.querySelector("[data-header]");
  let lastScrollPos = 0;

  // Function to hide header when scrolling down and show when scrolling up
  const hideHeader = function () {
    const isScrollBottom = lastScrollPos < window.scrollY;
    if (isScrollBottom) {
      header.classList.add("hide");
    } else {
      header.classList.remove("hide");
    }
    lastScrollPos = window.scrollY;
  }

  if (topbar) {
    window.addEventListener("scroll", function() {
      if (window.scrollY >= 50) {
        topbar.style.backgroundColor = "var(--eerie-black-4)";
      } else {
        topbar.style.backgroundColor = "transparent";
      }
    });
  }

  // Ensure the header hide/show behavior is consistent across all pages
  if (header) {
    window.addEventListener("scroll", function() {
      if (window.scrollY >= 50) {
        header.classList.add("active");
        hideHeader();
      } else {
        header.classList.remove("active");
        header.classList.remove("hide");
      }
    });
  }
});
