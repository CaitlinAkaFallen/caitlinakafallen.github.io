
        
         
            document.addEventListener('DOMContentLoaded', function () {
                removePastConventions(); // Remove old ones before anything loads
                loadConventions();
                makeListEditable();
                setupAddEventButton();
            });

            // Removes past conventions based on end date
            function removePastConventions() {
                const savedConventions = localStorage.getItem('conventionsList');
                if (!savedConventions) return;

                const tempContainer = document.createElement('ul');
                tempContainer.innerHTML = savedConventions;

                const today = new Date();

                const parseDateRange = (dateStr) => {
                    const regex = /([A-Za-z]+) (\d+)[a-z]{2}?-(\d+)[a-z]{2}?, (\d{4})/;
                    const match = dateStr.match(regex);
                    if (match) {
                        const [_, month, startDay, endDay, year] = match;
                        const endDate = new Date(`${month} ${endDay}, ${year}`);
                        return endDate;
                    }
                    return null;
                };

                const items = tempContainer.querySelectorAll('li');
                items.forEach(item => {
                    const dateSpan = item.querySelector('.event-date');
                    const dateText = dateSpan?.innerText.trim();
                    const endDate = parseDateRange(dateText);

                    if (endDate && endDate < today) {
                        item.remove();
                    }
                });

                localStorage.setItem('conventionsList', tempContainer.innerHTML);
            }

            function loadConventions() {
                const savedConventions = localStorage.getItem('conventionsList');
                const conventionsList = document.getElementById('conventionList');
                if (savedConventions && conventionsList) {
                    conventionsList.innerHTML = savedConventions;
                }
            }

            function saveConventions() {
                const conventionsList = document.getElementById('conventionList');
                if (conventionsList) {
                    localStorage.setItem('conventionsList', conventionsList.innerHTML);
                }
            }
            
            function makeListEditable() {
                const spans = document.querySelectorAll('.conventions-list li span');
                spans.forEach(span => {
                    span.contentEditable = true;

                    span.addEventListener('blur', () => {
                        saveConventions();
                    });
                });
            }

            function setupAddEventButton() {
                const addButton = document.getElementById('addEventButton');
                if (addButton) {
                    addButton.addEventListener('click', function () {
                        const conventionsList = document.getElementById('conventionList');

                        const newEvent = document.createElement('li');
                        newEvent.innerHTML = `
                            <span class="event-name" contenteditable="true">New Event Name</span>
                            <span class="event-date" contenteditable="true">New Event Date</span>
                            <span class="event-location" contenteditable="true">New Event Location</span>
                            <span class="event-description" contenteditable="true">New Event Description</span>
                        `;

                        conventionsList.appendChild(newEvent);
                        saveConventions();
                        makeListEditable();
                    });
                }
            }
            

                // Logout function
            function logout() {
                localStorage.removeItem('adminAuth');
                window.location.href = 'login.html';
            }


            function toggleSidebar() {
                const sidebar = document.querySelector(".sidebar");
                const toggleBtn = document.querySelector(".sidebar-toggle");

                sidebar.classList.toggle("open");
                toggleBtn.classList.toggle("open");
            }

            function toggleDarkMode() {
                const body = document.body;
                const darkModeButton = document.getElementById("darkModeToggle");
                body.classList.toggle("dark-mode");

                darkModeButton.innerHTML = body.classList.contains("dark-mode")
                    ? "☀️ Dark Mode"
                    : "🔦 Light Mode";
            }

            function showCategory(categoryName) {
                if (categoryName === 'conventions') {
                    document.querySelector('.main-content').scrollIntoView({ behavior: 'smooth' });
                }
            }
        
