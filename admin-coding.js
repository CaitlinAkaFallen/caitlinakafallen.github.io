document.addEventListener('DOMContentLoaded', () => {
    /* ===== 1. URL & INITIAL STATE ===== */
    (function hideHtmlInURL() {
        const pathname = window.location.pathname;
        if (pathname.endsWith(".html")) {
            window.history.replaceState({}, "", pathname.replace(".html", ""));
        }
    })();
    // ===== Elements =====
    const normalBtn = document.getElementById('normal-announcements-btn');
    const releaseBtn = document.getElementById('release-announcements-btn');
    const normalContainer = document.querySelector('.normal-announcements-container');
    const releaseContainer = document.querySelector('.release-announcements-container');
    const releaseFields = document.querySelectorAll('.release-only');
    const form = document.getElementById('announcement-form');
    const addBtn = document.getElementById('add-announcement-btn');
    const editBtn = document.getElementById('edit-announcement-btn');
    const deleteBtn = document.getElementById('delete-announcement');

    const tosModal = document.getElementById('tos-modal');
    const privacyModal = document.getElementById('privacy-modal');
    const openTos = document.getElementById('open-tos');
    const openPrivacy = document.getElementById('open-privacy');
    const closeButtons = document.querySelectorAll('.modal .close');

    // ===== Modal Logic =====
    function openModal(modal) { if (modal) modal.classList.add('show'); }
    function closeModal(modal) { if (modal) modal.classList.remove('show'); }

    if (openTos) openTos.addEventListener('click', e => { e.preventDefault(); openModal(tosModal); });
    if (openPrivacy) openPrivacy.addEventListener('click', e => { e.preventDefault(); openModal(privacyModal); });
    closeButtons.forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal'))));
    window.addEventListener('click', e => { if (e.target.classList.contains('modal')) closeModal(e.target); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(tosModal); closeModal(privacyModal); } });

    // ===== Announcement Logic =====
    let currentType = 'normal';
    let editingIndex = null;

    function getStoredAnnouncements(type) {
        return JSON.parse(localStorage.getItem(`${type}-announcements`) || '[]');
    }

    // SYNC TO SERVER: Sends full list to your backend to update announcements.json
    
        async function syncToServer() {
            const normal = getStoredAnnouncements('normal');
            const release = getStoredAnnouncements('release');
            const allAnnouncements = [...normal, ...release];

            try {
                // RIGHT HERE: You already updated this to your Render URL! ✅
                const response = await fetch('https://caitlins-creativespace-api.onrender.com/api/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(allAnnouncements) 
                });

            if (response.ok) {
                console.log("✅ Server updated successfully!");
            } else {
                console.error("❌ Server rejected the update.");
            }
        } catch (err) {
            console.error("Failed to connect to backend. Is your server running?", err);
        }
    }

    function saveAnnouncements(type, announcements) {
        localStorage.setItem(`${type}-announcements`, JSON.stringify(announcements));
        syncToServer();
    }

    // ===== Load Announcements =====
    function loadAnnouncements(type, isAdmin = false) {
        const container = document.getElementById(`${type}-announcements-list`);
        if (!container) return;

        container.innerHTML = '';
        const announcements = getStoredAnnouncements(type);

        if (announcements.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No announcements available.';
            li.classList.add('is-visible');
            container.appendChild(li);
            return;
        }

        announcements.forEach((item, index) => {
            const li = document.createElement('li');
            li.classList.add("announcement-card", "is-visible");

            let titleElement;
            const titleContent = item.title || 'Untitled Announcement';
            const styleClass = 'announcement-title is-bold-white';
            
            // Note: The link here will now be the "clean" version (no .html)
            if (item.link && item.link.trim() !== '') {
                titleElement = `<a href="${item.link}" class="${styleClass}" target="_blank">${titleContent}</a>`;
            } else {
                titleElement = `<span class="${styleClass}">${titleContent}</span>`;
            }

            const showCheckbox = isAdmin && editingIndex === index ? `<input type="checkbox" class="announcement-checkbox" data-index="${index}" checked>` : '';

            li.innerHTML = `
                <div>
                    ${showCheckbox}
                    <div class="announcement-details">
                        ${titleElement}
                        ${item.version ? `<span class="announcement-version">Version: ${item.version}</span>` : ''}
                        ${item.notes ? `<span class="announcement-notes">Notes: ${item.notes}</span>` : ''}
                    </div>
                </div>
                ${isAdmin ? `<button class="announcement-edit-btn" data-index="${index}">Edit</button>` : ''}
            `;

            if (isAdmin) {
                const editButton = li.querySelector('.announcement-edit-btn');
                if (editButton) {
                    editButton.addEventListener('click', () => {
                        document.getElementById('announcement-title').value = item.title;
                        document.getElementById('announcement-link').value = item.link;
                        document.getElementById('announcement-version').value = item.version;
                        document.getElementById('announcement-notes').value = item.notes;

                        editingIndex = index;
                        addBtn.style.display = 'none';
                        editBtn.style.display = 'inline-block';
                        deleteBtn.style.display = 'inline-block';
                        editBtn.classList.add('active-edit');
                        loadAnnouncements(type, isAdmin);
                    });
                }
            }
            container.appendChild(li);
        });
    }

    // ===== Add/Edit/Delete Announcements =====
    // This is called when the form is submitted - sanitized link logic added here
    function handleSubmission(type) {
        const title = document.getElementById('announcement-title').value.trim();
        const rawLink = document.getElementById('announcement-link').value.trim();
        const version = document.getElementById('announcement-version').value.trim();
        const notes = document.getElementById('announcement-notes').value.trim();

        // Clean the link: Remove .html if it exists at the end
        const cleanLink = rawLink.replace(/\.html$/, "");

        if (!title && !notes) return;

        const announcements = getStoredAnnouncements(type);
        const announcementData = { 
            title, 
            link: cleanLink, // Now saved without .html
            version, 
            notes, 
            type,
            date: new Date().toLocaleDateString()
        };

        if (editingIndex !== null) {
            announcements[editingIndex] = announcementData;
        } else {
            announcements.push(announcementData);
        }

        saveAnnouncements(type, announcements);
        form.reset();
        editingIndex = null;

        addBtn.style.display = 'inline-block';
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        editBtn.classList.remove('active-edit');

        loadAnnouncements(type, true);
    }

    function deleteSelectedAnnouncements(type) {
        if (editingIndex === null) return;
        const announcements = getStoredAnnouncements(type);
        announcements.splice(editingIndex, 1);
        
        saveAnnouncements(type, announcements);
        form.reset();
        editingIndex = null;

        addBtn.style.display = 'inline-block';
        editBtn.style.display = 'none';
        deleteBtn.style.display = 'none';
        editBtn.classList.remove('active-edit');

        loadAnnouncements(type, true);
    }

    function switchTo(type) {
        currentType = type;
        if (normalBtn) normalBtn.classList.toggle('active-toggle', type === 'normal');
        if (releaseBtn) releaseBtn.classList.toggle('active-toggle', type === 'release');
        
        if (normalContainer) normalContainer.classList.toggle('active', type === 'normal');
        if (releaseContainer) releaseContainer.classList.toggle('active', type === 'release');
        
        // Show/Hide version field based on type
        releaseFields.forEach(field => field.style.display = (type === 'release') ? 'flex' : 'none');
        
        if (form) form.reset();
        editingIndex = null;
        
        if (addBtn) addBtn.style.display = 'inline-block';
        if (editBtn) editBtn.style.display = 'none';
        if (deleteBtn) deleteBtn.style.display = 'none';
        
        loadAnnouncements(currentType, true);
    }

    // ===== Event Listeners =====
    if (normalBtn) normalBtn.addEventListener('click', () => switchTo('normal'));
    if (releaseBtn) releaseBtn.addEventListener('click', () => switchTo('release'));
    
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            handleSubmission(currentType);
        });
    }

    if (addBtn) addBtn.addEventListener('click', e => { 
        if(form.checkValidity()) { 
            e.preventDefault(); 
            handleSubmission(currentType); 
        }
    });

    if (editBtn) editBtn.addEventListener('click', e => { 
        e.preventDefault(); 
        handleSubmission(currentType); 
    });

    if (deleteBtn) deleteBtn.addEventListener('click', () => { 
        deleteSelectedAnnouncements(currentType); 
    });

    // ===== Initial Setup =====
    switchTo('normal');
    
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    document.querySelectorAll('.content-container').forEach(c => c.classList.add('is-visible'));
});