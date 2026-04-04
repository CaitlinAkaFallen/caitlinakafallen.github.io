document.addEventListener("DOMContentLoaded", function () {
     /* ===== REMOVE .HTML FROM URL ===== */

          (function hideHtmlInURL() {

              const pathname = window.location.pathname;

              if (pathname.endsWith(".html")) {

                  // Replace URL in browser without reloading the page

                  window.history.replaceState({}, "", pathname.replace(".html", ""));

              }

          })();
    // ===== Remove OAuth tokens from URL after login =====
    (function cleanOAuthFromURL() {
        let urlChanged = false;
        const url = new URL(window.location.href);

        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');

            if (accessToken) {
                sessionStorage.setItem('twitchAccessToken', accessToken);
            }

            url.hash = '';
            urlChanged = true;
        }

        if (url.searchParams.has('code')) {
            url.searchParams.delete('code');
            urlChanged = true;
        }

        if (urlChanged) {
            history.replaceState(null, '', url.toString());
        }
    })();

    // ===== User Profile & Login/Logout Logic =====
    const accessToken = sessionStorage.getItem('twitchAccessToken');
    const userProfile = document.getElementById("userProfile");
    const twitchLoginBtn = document.getElementById("twitchLoginBtn");

    if (accessToken) {
        // Fetch user data from Twitch
        fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-Id': 'YOUR_TWITCH_CLIENT_ID' // Replace with your actual Client ID
            }
        })
        .then(res => res.json())
        .then(data => {
            const user = data.data[0];
            if (user) {
                // Show profile, hide login button
                if (userProfile) userProfile.style.display = "flex";
                if (twitchLoginBtn) twitchLoginBtn.style.display = "none";

                // Update UI elements
                document.getElementById("profileName").textContent = user.display_name;
                document.getElementById("profilePic").src = user.profile_image_url;
            }
        })
        .catch(err => console.error("Error fetching Twitch user:", err));
    }

    // Logout Functionality
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            sessionStorage.removeItem('twitchAccessToken');
            window.location.href = "index.html"; // Redirect to login page
        });
    }

    // ===== Search Bar Functionality =====
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
                event.preventDefault();
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
            const searchInput = searchBar.value.trim();
            const pages = {
                "Portfolio": "photography.html",
                "Programming": "programming.html",
                "About": "about.html",
                "Gallery": "viewer-art.html",
                "Contact": "contact.html",
                "Conventions": "viewer-convention.html",
                "Content": "schedule.html"
            };

            const matchedPage = Object.keys(pages).find(key => key.toLowerCase() === searchInput.toLowerCase());
            if (matchedPage) {
                window.location.href = pages[matchedPage];
            } else {
                console.log("Page not found for: " + searchInput);
            }
        }
    }

    // ===== Auto-scroll functionality for navbar =====
    const navList = document.querySelector(".nav-list");
    let scrollSpeed = 12;
    let scrollInterval;

    if (navList) {
        function autoScroll(event) {
            const { clientX, target } = event;
            const { left, width } = target.getBoundingClientRect();
            const edgeOffset = window.innerWidth < 600 ? 120 : 80;

            if (clientX < left + edgeOffset) {
                if (navList.scrollLeft > 0) startScrolling(-scrollSpeed);
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
    }

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

    // ===== Live Status & Date (Moved inside DOMContentLoaded) =====
    // Note: 'isLive' needs to be defined by your twitch status checker
    const isLive = false; // Placeholder
    const liveEl = document.getElementById("twitch-live");
    if (liveEl) liveEl.classList.toggle("live", isLive);

    const liveIndicator = document.getElementById("live-indicator");
    if (liveIndicator) {
        liveIndicator.style.display = isLive ? "inline" : "none";
    }

    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateEl = document.getElementById("revamp-date");
    if (dateEl) dateEl.textContent = today.toLocaleDateString(undefined, options);
});

// ===== Toggle Section Function (Keep Global if called by onclick) =====
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const body = section.querySelector(".section-body");
    const icon = section.querySelector(".toggle-icon");
    
    if (body) body.classList.toggle("collapsed");
    if (icon) icon.classList.toggle("rotate");
}