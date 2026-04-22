/* ===== COLLAPSIBLE TOGGLE LOGIC ===== */
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
        window.history.replaceState({}, "", pathname.replace(".html", ""));
    }
})();

/* ===== FILTER COMMANDS BY CATEGORY ===== */
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

    const visibleSections = Array.from(sections).filter(section => section.style.display === 'block');

    if ((selectedCategory !== 'all' && anyVisible) || visibleSections.length <= 2) {
        container.classList.add('filtered');
    } else {
        container.classList.remove('filtered');
    }
}

/* ===== SEARCH COMMANDS BY NAME ===== */
function searchCommands() {
    const searchInput = document.getElementById('commandSearch').value.toLowerCase();
    const sections = document.querySelectorAll('.command-section');

    sections.forEach(section => {
        let hasMatchInSection = false;
        const items = section.querySelectorAll('.command-item');

        items.forEach(item => {
            const commandTitle = item.querySelector('.command-subgroup-title');
            
            if (commandTitle) {
                const titleText = commandTitle.textContent.toLowerCase();
                
                if (titleText.includes(searchInput)) {
                    item.style.display = ''; 
                    hasMatchInSection = true;
                } else {
                    item.style.display = 'none';
                }
            }
        });

        const content = section.querySelector('.section-content');
        const icon = section.querySelector('.toggle-icon');

        if (hasMatchInSection) {
            section.style.display = ''; 
            
            // Auto-expand section if searching
            if (searchInput.length > 0 && content) {
                content.style.maxHeight = content.scrollHeight + "px";
                content.classList.add('expanded');
                if (icon) icon.style.transform = "rotate(180deg)";
            }
        } else {
            section.style.display = 'none';
        }
    });
}

/* ===== COPY TEXT WITHOUT ALERT ===== */
function copyText(element) {
    const textToCopy = element.textContent.trim();
    navigator.clipboard.writeText(textToCopy).catch(err => {
        console.error('Copy failed:', err);
    });
}

/* ===== TWITCH API SETUP ===== */
const clientId = 'gp762nuuoqcoxypju8c569th9wz7q5';
const oauthToken = '0s89vmye9hk95jiifrpion53n6cy9p';
const username = 'fallenoneart';

const titleEl = document.getElementById("streamTitle");
const gameEl = document.getElementById("streamGame");
const viewerCountEl = document.getElementById("viewerCount");

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

        const liveIndicator = document.getElementById("live-indicator");
        if (liveIndicator) {
            liveIndicator.style.display = isLive ? "inline" : "none";
        }
    } catch (error) {
        console.error("Error checking Twitch live status:", error);
    }
}

checkTwitchLive();
setInterval(checkTwitchLive, 60000);

/* ===== MODAL LOGIC ===== */
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

closeButtons.forEach(btn => 
    btn.addEventListener('click', () => closeModal(btn.closest('.modal')))
);

window.addEventListener('click', e => { 
    if (e.target.classList.contains('modal')) closeModal(e.target); 
});

window.addEventListener('keydown', e => { 
    if (e.key === 'Escape') { 
        closeModal(tosModal); 
        closeModal(privacyModal); 
    } 
});

/* ===== INITIALIZATION ===== */
window.addEventListener("load", filterCommands);