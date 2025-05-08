 // Auto-scroll functionality for navbar
    const navList = document.querySelector(".nav-list");
    let scrollSpeed = 12;
    let scrollInterval;

    function autoScroll(event) {
      const { clientX, target } = event;
      const { left, width } = target.getBoundingClientRect();
      const edgeOffset = window.innerWidth < 600 ? 120 : 80; // Adjust edge offset based on screen width

      if (clientX < left + edgeOffset) {
        // Ensure it starts scrolling left only if it is not already at the leftmost position
        if (navList.scrollLeft > 0) {
          startScrolling(-scrollSpeed);
        }
      } else if (clientX > left + width - edgeOffset) {
        // Allow scrolling right normally
        startScrolling(scrollSpeed);
      } else {
        stopScrolling();
      }
    }

    function startScrolling(speed) {
      if (!scrollInterval) {
        scrollInterval = setInterval(() => {
          navList.scrollBy({ left: speed, behavior: "smooth" });
        }, 12);
      }
    }

    function stopScrolling() {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }

    navList.addEventListener("mousemove", autoScroll);
    navList.addEventListener("mouseleave", stopScrolling);

    navList.addEventListener("wheel", (e) => {
      e.preventDefault();
      navList.scrollBy({ left: e.deltaY * 1, behavior: "smooth" });
    });

    let touchStartX = 0;
    let touchScrollLeft = 0;

    navList.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].pageX;
      touchScrollLeft = navList.scrollLeft;
    });

    navList.addEventListener("touchmove", (e) => {
      const touchX = e.touches[0].pageX - touchStartX;
      navList.scrollLeft = touchScrollLeft - touchX;
    });

    const scrollLeftBtn = document.getElementById("scroll-left");
    const scrollRightBtn = document.getElementById("scroll-right");

    if (scrollLeftBtn && scrollRightBtn) {
      scrollLeftBtn.addEventListener("click", () => {
        navList.scrollBy({ left: -300, behavior: "smooth" });
      });

      scrollRightBtn.addEventListener("click", () => {
        navList.scrollBy({ left: 300, behavior: "smooth" });
      });
    }