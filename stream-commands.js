 document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
        const content = header.nextElementSibling; // This finds .section-content
        const icon = header.querySelector('.toggle-icon');

        if (content.style.maxHeight && content.style.maxHeight !== "0px") {
            content.style.maxHeight = "0px";
            if (icon) icon.style.transform = "rotate(0deg)";
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
            if (icon) icon.style.transform = "rotate(180deg)";
        }
    });
});
 /* ===== REMOVE .HTML FROM URL ===== */
 (function hideHtmlInURL() {
     const pathname = window.location.pathname;
         if (pathname.endsWith(".html")) {
             // Replace URL in browser without reloading the page
            window.history.replaceState({}, "", pathname.replace(".html", ""));
          }
  })();

// ==========================
      // Filter Commands
      // ==========================
      function filterCommands() {
          const select = document.getElementById('categorySelect');
          const selectedCategory = select ? select.value : 'all';
          const sections = document.querySelectorAll('.command-section');
          const container = document.querySelector('.command-sections');

          let anyVisible = false;

          sections.forEach(section => {
              if (selectedCategory === 'all' || section.dataset.category === selectedCategory) {
                  section.style.display = 'block';
                  anyVisible = true;
              } else {
                  section.style.display = 'none';
              }
          });

          // Count visible sections
          const visibleSections = Array.from(sections).filter(section => section.style.display === 'block');

          // Add class if filtered or 2 or fewer sections are visible
          if ((selectedCategory !== 'all' && anyVisible) || visibleSections.length <= 2) {
              container.classList.add('filtered');
          } else {
              container.classList.remove('filtered');
          }
      }

      // Copy text without alert
      function copyText(element) {
          const textToCopy = element.textContent.trim();
          navigator.clipboard.writeText(textToCopy).catch(err => {
              console.error('Copy failed:', err);
          });
      }
      function searchCommands() {
    const query = document.getElementById("commandSearch").value.toLowerCase();
    
    // Adjust this selector to match whatever elements hold your commands
    const commands = document.querySelectorAll(".command-item"); 

    commands.forEach(cmd => {
        const text = cmd.textContent.toLowerCase();
        cmd.style.display = text.includes(query) ? "" : "none";
    });
}

              // --- Twitch API setup ---
              const clientId = 'gp762nuuoqcoxypju8c569th9wz7q5';
              const oauthToken = '0s89vmye9hk95jiifrpion53n6cy9p';
              const username = 'fallenoneart';

              const titleEl = document.getElementById("streamTitle");
              const gameEl = document.getElementById("streamGame");
              const viewerCountEl = document.getElementById("viewerCount");
              const streamTimerEl = document.getElementById("streamTimer");

              let streamSeconds = 0;
              let streamInterval = null;

              async function checkTwitchLive() {
                try {
                  const userResp = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
                    headers: { "Client-ID": clientId, "Authorization": `Bearer ${oauthToken}` }
                  });
                  const userData = await userResp.json();
                  const userId = userData.data[0].id;

                  const channelResp = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${userId}`, {
                    headers: { "Client-ID": clientId, "Authorization": `Bearer ${oauthToken}` }
                  });
                  const channelData = await channelResp.json();
                  const channelInfo = channelData.data[0];

                  if (titleEl) titleEl.textContent = ` ${channelInfo.title}`;
                  if (gameEl) gameEl.textContent = ` ${channelInfo.game_name}`;

                  const streamResp = await fetch(`https://api.twitch.tv/helix/streams?user_id=${userId}`, {
                    headers: { "Client-ID": clientId, "Authorization": `Bearer ${oauthToken}` }
                  });
                  const streamData = await streamResp.json();
                  const isLive = streamData.data && streamData.data.length > 0;

                  const liveEl = document.getElementById("twitch-live");
                  if (liveEl) liveEl.classList.toggle("live", isLive);

                  // --- Show/Hide LIVE indicator in navbar ---
                  const liveIndicator = document.getElementById("live-indicator");
                  if (liveIndicator) {
                    liveIndicator.style.display = isLive ? "inline" : "none";
                  }
                } catch (error) {
                  console.error("Error checking Twitch live status:", error);
                }
              }

              // Check live status every 60 seconds
              checkTwitchLive();
              setInterval(checkTwitchLive, 60000);

      // Initialize filter on page load
      window.addEventListener("load", filterCommands);
      window.addEventListener("change", () => filterCommands()); // updates when category changes

      // ==========================
      // Modal Logic
      // ==========================
      const tosModal = document.getElementById('tos-modal');
      const privacyModal = document.getElementById('privacy-modal');
      const openTos = document.getElementById('open-tos');
      const openPrivacy = document.getElementById('open-privacy');
      const closeButtons = document.querySelectorAll('.modal .close');

      function openModal(modal) { 
          if (modal) modal.classList.add('show'); 
      }

      function closeModal(modal) { 
          if (modal) modal.classList.remove('show'); 
      }

      // Open buttons
      if (openTos) {
          openTos.addEventListener('click', e => {
              e.preventDefault();
              openModal(tosModal);
          });
      }

      if (openPrivacy) {
          openPrivacy.addEventListener('click', e => {
              e.preventDefault();
              openModal(privacyModal);
          });
      }

      // Close with "x"
      closeButtons.forEach(btn => 
          btn.addEventListener('click', () => closeModal(btn.closest('.modal')))
      );

      // Close when clicking outside
      window.addEventListener('click', e => { 
          if (e.target.classList.contains('modal')) closeModal(e.target); 
      });

      // Close on Escape key
      window.addEventListener('keydown', e => { 
          if (e.key === 'Escape') { 
              closeModal(tosModal); 
              closeModal(privacyModal); 
          } 
      });
