document.addEventListener('DOMContentLoaded', () => {
    /* ===== 1. URL & INITIAL STATE ===== */
    (function hideHtmlInURL() {
        const pathname = window.location.pathname;
        if (pathname.endsWith(".html")) {
            window.history.replaceState({}, "", pathname.replace(".html", ""));
        }
    })();

    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.classList.add('hidden'); // Kept from script 1

    /* ===== 2. MODAL LOGIC ===== */
    const tosModal = document.getElementById('tos-modal');
    const privacyModal = document.getElementById('privacy-modal');
    const openTos = document.getElementById('open-tos');
    const openPrivacy = document.getElementById('open-privacy');
    const closeButtons = document.querySelectorAll('.modal .close');

    function openModal(modal) { if (modal) modal.classList.add('show'); }
    function closeModal(modal) { if (modal) modal.classList.remove('show'); }

    if (openTos) openTos.addEventListener('click', e => { e.preventDefault(); openModal(tosModal); });
    if (openPrivacy) openPrivacy.addEventListener('click', e => { e.preventDefault(); openModal(privacyModal); });
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(btn.closest('.modal'));
        });
    });

    window.addEventListener('click', e => { if (e.target.classList.contains('modal')) closeModal(e.target); });
    window.addEventListener('keydown', e => { 
        if (e.key === 'Escape') { closeModal(tosModal); closeModal(privacyModal); } 
    });

    /* ===== 3. ANNOUNCEMENTS: FETCH & RENDER ===== */
    const normalBtn = document.getElementById('normal-announcements-btn');
    const releaseBtn = document.getElementById('release-announcements-btn');
    const normalList = document.getElementById('normal-announcements-list');
    const releaseList = document.getElementById('release-announcements-list');
    const announcementHeading = document.getElementById('announcement-heading');

    async function loadAnnouncements() {
        try {
            // Fetch with cache-busting
            const response = await fetch(`https://caitlins-creativespace-api.onrender.com/api/announcements?t=${Date.now()}`);
            if (!response.ok) throw new Error('File not found');
            const data = await response.json();

            if (normalList) normalList.innerHTML = '';
            if (releaseList) releaseList.innerHTML = '';

            const normalItems = data.filter(item => item.type === 'normal');
            const releaseItems = data.filter(item => item.type === 'release');

            // Handle empty states
            if (normalItems.length === 0 && normalList) {
                normalList.innerHTML = '<li class="empty">No announcements available.</li>';
            }
            if (releaseItems.length === 0 && releaseList) {
                releaseList.innerHTML = '<li class="empty">No release notes available.</li>';
            }

            // Render combined items
            data.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'announcement-card';
                
                const titleHtml = item.link && item.link.trim() !== '' 
                    ? `<a href="${item.link}" class="announcement-title is-bold-white" target="_blank">${item.title || 'Untitled'}</a>`
                    : `<span class="announcement-title is-bold-white">${item.title || 'Untitled'}</span>`;

                li.innerHTML = `
                    <div>
                        ${titleHtml}
                        <div class="announcement-details">
                            ${item.version ? `<span class="announcement-version">Version: ${item.version}</span>` : ''}
                            <span class="announcement-notes">Notes: ${item.notes || 'N/A'}</span>
                            ${item.date ? `<small class="announcement-date" style="display:block; opacity:0.6;">${item.date}</small>` : ''}
                        </div>
                    </div>
                `;

                if (item.type === 'normal' && normalList) {
                    normalList.appendChild(li);
                } else if (item.type === 'release' && releaseList) {
                    releaseList.appendChild(li);
                }

                // Animation
                setTimeout(() => li.classList.add('is-visible'), index * 50);
            });
        } catch (err) {
            console.warn("Announcement Fetch Error:", err);
        }
    }

    /* ===== 4. TOGGLE VIEW LOGIC ===== */
    function switchAnnouncements(type) {
        if (normalBtn) normalBtn.classList.toggle('active-toggle', type === 'normal');
        if (releaseBtn) releaseBtn.classList.toggle('active-toggle', type === 'release');

        // Update heading if it exists (from script 1)
        if (announcementHeading) {
            announcementHeading.textContent = type === 'normal' ? 'Normal Announcements' : 'Release Announcements';
        }

        const nContainer = document.querySelector('.normal-announcements-container');
        const rContainer = document.querySelector('.release-announcements-container');
        
        if (nContainer) nContainer.style.display = (type === 'normal') ? 'block' : 'none';
        if (rContainer) rContainer.style.display = (type === 'release') ? 'block' : 'none';
    }

    if (normalBtn) normalBtn.addEventListener('click', (e) => { e.preventDefault(); switchAnnouncements('normal'); });
    if (releaseBtn) releaseBtn.addEventListener('click', (e) => { e.preventDefault(); switchAnnouncements('release'); });

    /* ===== 5. INITIALIZE ===== */
    loadAnnouncements();
    switchAnnouncements('normal');
    
    // Auto-refresh every 60 seconds
    setInterval(loadAnnouncements, 60000);
});