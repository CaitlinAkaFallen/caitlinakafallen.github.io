 // Add the Language Grid dynamically (if needed in the future)
            const languageGridHTML = `<!-- Language Grid HTML content here -->`;

            const mainContent = document.querySelector('.main-content');
            if (mainContent && !mainContent.innerHTML.includes(languageGridHTML)) {
                mainContent.innerHTML += languageGridHTML;
            }

            // Navbar Dropdown Animation
            const dropdowns = document.querySelectorAll('.dropdown-btn');
            dropdowns.forEach(dropdown => {
                dropdown.addEventListener('mouseenter', function () {
                    const content = this.nextElementSibling;
                    content.classList.add('active');
                });

                dropdown.addEventListener('mouseleave', function () {
                    const content = this.nextElementSibling;
                    content.classList.remove('active');
                });
            });

            let editingIndex = null;

            // Function to add an announcement
            function addAnnouncement(title, link, version = '', notes = '') {
                const announcementList = document.getElementById('announcement-list');
                const li = document.createElement('li');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('announcement-checkbox');
                checkbox.setAttribute('data-title', title);
                checkbox.setAttribute('data-link', link);
                checkbox.setAttribute('data-version', version);
                checkbox.setAttribute('data-notes', notes);

                const editButton = document.createElement('button');
                editButton.textContent = 'Edit';
                editButton.addEventListener('click', function() {
                    editAnnouncement(title, link, version, notes, li);
                });

                li.appendChild(checkbox);
                li.innerHTML += `<a href="${link}">${title}</a><br><small>Version: ${version}</small><br><small>Notes: ${notes}</small>`;
                li.appendChild(editButton);
                announcementList.appendChild(li);

                // Store the announcement in localStorage
                let announcements = JSON.parse(localStorage.getItem('announcements')) || [];
                if (editingIndex !== null) {
                    announcements[editingIndex] = { title, link, version, notes };
                    editingIndex = null; // Reset editing index
                } else {
                    announcements.push({ title, link, version, notes });
                }
                localStorage.setItem('announcements', JSON.stringify(announcements));

                // Automatically remove the "new" class after 5 seconds
                setTimeout(() => {
                    checkbox.classList.remove('new');
                }, 5000);

                updateAnnouncementSelect();  // Update checkbox options
            }

            // Function to load announcements from localStorage on page load
            function loadAnnouncements() {
                // Clear existing announcements
                const announcementList = document.getElementById('announcement-list');
                announcementList.innerHTML = '';

                const announcements = JSON.parse(localStorage.getItem('announcements')) || [];

                announcements.forEach(announcement => {
                    const li = document.createElement('li');
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.classList.add('announcement-checkbox');
                    checkbox.setAttribute('data-title', announcement.title);
                    checkbox.setAttribute('data-link', announcement.link);
                    checkbox.setAttribute('data-version', announcement.version || '');
                    checkbox.setAttribute('data-notes', announcement.notes || '');

                    const editButton = document.createElement('button');
                    editButton.textContent = 'Edit';
                    editButton.addEventListener('click', function() {
                        editAnnouncement(announcement.title, announcement.link, announcement.version, announcement.notes, li);
                    });

                    li.appendChild(checkbox);
                    li.innerHTML += `<a href="${announcement.link}">${announcement.title}</a><br><small>Version: ${announcement.version}</small><br><small>Notes: ${announcement.notes}</small>`;
                    li.appendChild(editButton);
                    announcementList.appendChild(li);
                });

                updateAnnouncementSelect();  // Update checkbox options
            }

            // Function to update checkbox list with the current announcements
            function updateAnnouncementSelect() {
                const checkboxes = document.querySelectorAll('.announcement-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.addEventListener('change', function () {
                        // Show the delete button only if any checkbox is selected
                        const deleteButton = document.getElementById('delete-announcement');
                        const selectedCheckboxes = document.querySelectorAll('.announcement-checkbox:checked');
                        deleteButton.style.display = selectedCheckboxes.length > 0 ? 'block' : 'none';
                    });
                });
            }

            // Function to delete selected announcements
            function deleteSelectedAnnouncements() {
                const selectedCheckboxes = document.querySelectorAll('.announcement-checkbox:checked');
                
                // Get all announcements from localStorage
                let announcements = JSON.parse(localStorage.getItem('announcements')) || [];
                
                selectedCheckboxes.forEach(checkbox => {
                    const title = checkbox.getAttribute('data-title');
                    const link = checkbox.getAttribute('data-link');
                    const version = checkbox.getAttribute('data-version');
                    const notes = checkbox.getAttribute('data-notes');

                    // Remove from the list on the page
                    checkbox.parentElement.remove();

                    // Remove from localStorage
                    announcements = announcements.filter(announcement => !(announcement.title === title && announcement.link === link && announcement.version === version && announcement.notes === notes));
                });
                
                // Save the updated announcements array back to localStorage
                localStorage.setItem('announcements', JSON.stringify(announcements));

                // Hide delete button again
                document.getElementById('delete-announcement').style.display = 'none';
            }

            // Function to edit an announcement
            function editAnnouncement(title, link, version, notes, li) {
                document.getElementById('announcement-title').value = title;
                document.getElementById('announcement-link').value = link;
                document.getElementById('announcement-version').value = version;
                document.getElementById('announcement-notes').value = notes;
                
                // Store the index of the announcement being edited
                const announcementList = JSON.parse(localStorage.getItem('announcements')) || [];
                editingIndex = announcementList.findIndex(announcement => 
                    announcement.title === title && 
                    announcement.link === link && 
                    announcement.version === version && 
                    announcement.notes === notes
                );

                // Optionally, highlight the item being edited (for better UX)
                li.classList.add('editing');
            }

            // Load saved announcements when the page is loaded
            window.onload = loadAnnouncements;

            // Function to add a custom announcement from the form
            function addCustomAnnouncement() {
                const title = document.getElementById('announcement-title').value;
                const link = document.getElementById('announcement-link').value;
                const version = document.getElementById('announcement-version').value;
                const notes = document.getElementById('announcement-notes').value;

                if (title && link) {
                    addAnnouncement(title, link, version, notes);

                    // Clear the form fields after adding the announcement
                    document.getElementById('announcement-title').value = '';
                    document.getElementById('announcement-link').value = '';
                    document.getElementById('announcement-version').value = '';
                    document.getElementById('announcement-notes').value = '';
                } else {
                    alert('Please fill in both the title and link!');
                }
            }

            // Event listener for the delete button
            document.getElementById('delete-announcement').addEventListener('click', deleteSelectedAnnouncements);
