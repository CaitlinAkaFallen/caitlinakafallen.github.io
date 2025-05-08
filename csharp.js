 // Open (or create) an IndexedDB database called "videoDB"
            let db;
            const request = indexedDB.open("videoDB", 1);

            request.onupgradeneeded = function(e) {
            db = e.target.result;
            if (!db.objectStoreNames.contains("videos")) {
                db.createObjectStore("videos", { keyPath: "id" });
            }
            };

            request.onsuccess = function(e) {
            db = e.target.result;
            restoreVideos();
            };

            request.onerror = function(e) {
            console.error("IndexedDB error:", e.target.errorCode);
            };

            function saveVideo(videoId, file) {
            const transaction = db.transaction(["videos"], "readwrite");
            const store = transaction.objectStore("videos");
            const videoRecord = {
                id: videoId,
                file: file
            };
            store.put(videoRecord).onsuccess = function() {
                console.log("Video saved:", videoId);
            };
            }

            function deleteVideo(videoId) {
            const transaction = db.transaction(["videos"], "readwrite");
            const store = transaction.objectStore("videos");
            const deleteRequest = store.delete(videoId);

            deleteRequest.onsuccess = function() {
                console.log("Video deleted:", videoId);
                const videoElement = document.getElementById(videoId);
                const inputElement = document.getElementById('input-' + videoId);
                const deleteButton = document.getElementById('delete-' + videoId);

                videoElement.src = "";
                inputElement.style.display = 'block';
                deleteButton.style.display = 'none';
            };

            deleteRequest.onerror = function(err) {
                console.error("Error deleting video:", err);
            };
            }

            function loadVideo(event, videoId) {
            const videoElement = document.getElementById(videoId);
            const inputElement = document.getElementById('input-' + videoId);
            const deleteButton = document.getElementById('delete-' + videoId);
            const file = event.target.files[0];

            if (file) {
                saveVideo(videoId, file);
                videoElement.src = URL.createObjectURL(file);
                videoElement.load();

                inputElement.style.display = 'none';
                deleteButton.style.display = 'block';
            }
            }

            function restoreVideos() {
            const transaction = db.transaction(["videos"], "readonly");
            const store = transaction.objectStore("videos");
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = function(e) {
                const videos = e.target.result;
                videos.forEach(videoRecord => {
                const videoElement = document.getElementById(videoRecord.id);
                const inputElement = document.getElementById('input-' + videoRecord.id);
                const deleteButton = document.getElementById('delete-' + videoRecord.id);

                if (videoElement) {
                    videoElement.src = URL.createObjectURL(videoRecord.file);
                    videoElement.load();

                    if (inputElement) inputElement.style.display = 'none';
                    if (deleteButton) deleteButton.style.display = 'block';
                }
                });
            };

            getAllRequest.onerror = function(err) {
                console.error("Error restoring videos:", err);
            };
            }

            // Function to copy text from a textarea (unchanged)
            function copyCode(codeBoxId) {
            const textarea = document.getElementById(codeBoxId);
            if (textarea) {
                textarea.select();
                textarea.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(textarea.value)
                .then(() => console.log('Code copied successfully!'))
                .catch(err => console.error('Failed to copy:', err));
            } else {
                console.error('No textarea found with id:', codeBoxId);
            }
            }

            // Add event listeners to all copy buttons
            document.querySelectorAll('.copy-button').forEach(button => {
            button.addEventListener('click', function() {
                // Assumes each button has a data-target attribute with the textarea's id
                copyCode(button.dataset.target);
            });
            });