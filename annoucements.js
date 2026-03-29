/**
 * announcements.js
 * Handled by: programming.html
 * Purpose: Fetch the global JSON data and display it to users.
 */

document.addEventListener('DOMContentLoaded', () => {
    // These IDs must match your programming.html containers
    const normalContainer = document.getElementById('normal-announcements-list');
    const releaseContainer = document.getElementById('release-announcements-list');

    async function fetchAnnouncements() {
        try {
            // We fetch from the API route defined in your Node.js server
            const response = await fetch('https://caitlins-creativespace-api.onrender.com/api/announcements');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const allAnnouncements = await response.json();
            
            // Filter data into their respective categories
            const normalPosts = allAnnouncements.filter(p => p.type === 'normal');
            const releasePosts = allAnnouncements.filter(p => p.type === 'release');

            // Render both sections
            renderList(normalPosts, normalContainer, 'No general announcements.');
            renderList(releasePosts, releaseContainer, 'No recent releases.');

        } catch (err) {
            console.error("Failed to load announcements:", err);
            if (normalContainer) normalContainer.innerHTML = "<li>Error loading updates.</li>";
        }
    }

    function renderList(posts, container, emptyMessage) {
        if (!container) return; // Guard clause if the element doesn't exist on this page

        if (!posts || posts.length === 0) {
            container.innerHTML = `<li class="announcement-card is-visible">${emptyMessage}</li>`;
            return;
        }

        // Display newest first (reverse the array)
        container.innerHTML = [...posts].reverse().map(post => {
            // Logic to handle "hidden" .html extensions and absolute vs relative links
            // If it starts with http, use it as is. Otherwise, add a / for the local route.
            let href = "";
            if (post.link && post.link.trim() !== "") {
                href = post.link.startsWith('http') ? post.link : `/${post.link}`;
            }

            return `
                <li class="announcement-card is-visible">
                    <div class="announcement-details">
                        <div class="announcement-header">
                            ${href 
                                ? `<a href="${href}" class="announcement-title is-bold-white" target="_blank">${post.title}</a>` 
                                : `<span class="announcement-title is-bold-white">${post.title || 'Update'}</span>`
                            }
                            ${post.version ? `<span class="announcement-version">Version: ${post.version}</span>` : ''}
                        </div>
                        ${post.notes ? `<p class="announcement-notes">${post.notes}</p>` : ''}
                        <small class="announcement-date">${post.date || ''}</small>
                    </div>
                </li>
            `;
        }).join('');
    }

    // Initial load
    fetchAnnouncements();

    // Refresh every 60 seconds to check for new admin posts
    setInterval(fetchAnnouncements, 60000);
});