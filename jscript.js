document.addEventListener("DOMContentLoaded", function () {
            /* ===== REMOVE .HTML FROM URL ===== */
    (function hideHtmlInURL() {
        const pathname = window.location.pathname;
        if (pathname.endsWith(".html")) {
            // Replace URL in browser without reloading the page
            window.history.replaceState({}, "", pathname.replace(".html", ""));
        }
    })();
    
    /* ===== 2. DROP_DOWN SELECTION ===== */
    const jsonDropdown = document.getElementById("jsonSections");
    
    // Safety check: only run if the dropdown actually exists on this page
    if (jsonDropdown) {
        jsonDropdown.addEventListener("change", function() {
            const selected = this.value;

            // Hide all tab content
            document.querySelectorAll(".tab-content").forEach(tab => {
                tab.classList.remove("active");
            });

            // Show the selected tab
            const tabToShow = document.getElementById(selected);
            if (tabToShow) {
                tabToShow.classList.add("active");
            }
        });
    }
});

/* ===== 3. WIDGET DOWNLOAD ===== */
// Moved outside DOMContentLoaded so it's globally accessible for button onclicks
function downloadWidget(widgetName, jsonFileName) {
    const jsonContent = {
        "widgetName": widgetName,
        "filePath": "C:\\Users\\caitl\\OneDrive\\Desktop\\Coding\\OBS Profile\\" + jsonFileName
    };

    const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = jsonFileName;
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
