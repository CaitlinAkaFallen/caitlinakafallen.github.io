 document.addEventListener("DOMContentLoaded", function () {
    const searchButton = document.getElementById("search-button");
    const searchBar = document.getElementById("search-bar");

    if (searchButton && searchBar) {
        searchButton.addEventListener("click", function (event) {
            if (!searchBar.classList.contains("active")) {
                searchBar.classList.add("active");
                searchBar.focus();
            } else if (searchBar.value === "") {
                searchBar.classList.remove("active");
            } else {
                event.preventDefault(); // Prevent default button behavior
                redirectToPage();
            }
        });

        searchBar.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                redirectToPage();
            }
        });

        document.addEventListener("click", function (event) {
            if (!searchBar.contains(event.target) && !searchButton.contains(event.target)) {
                if (searchBar.value === "") {
                    searchBar.classList.remove("active");
                }
            }
        });

        function redirectToPage() {
            const searchInput = searchBar.value.trim(); // Use the existing searchBar variable
            const pages = {
                "Code": "coding.html",
                "About": "about.html",
                "Contact": "contact.html",
                "Stream Platforms": "streaming.html"
            };

            const matchedPage = Object.keys(pages).find(key => key.toLowerCase() === searchInput.toLowerCase());

            if (matchedPage) {
                window.location.href = pages[matchedPage];
            } else {
                console.log("Page not found for: " + searchInput);
                
            }
        }
    }

    // Auto-scroll functionality for navbar (remains unchanged)
    const navList = document.querySelector(".nav-list");
    let scrollSpeed = 12;
    let scrollInterval;

    function autoScroll(event) {
        const { clientX, target } = event;
        const { left, width } = target.getBoundingClientRect();
        const edgeOffset = window.innerWidth < 600 ? 120 : 80;

        if (clientX < left + edgeOffset) {
            if (navList.scrollLeft > 0) {
                startScrolling(-scrollSpeed);
            }
        } else if (clientX > left + width - edgeOffset) {
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
});
