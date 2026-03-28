// ===============================
// 🎮 Twitch & Stream Integration (Unified & Updated Version)
// ===============================

// DOM Elements
const streamTitleEl = document.getElementById("stream-title");
const gameTitleEl = document.getElementById("game-title");
const gameCoverEl = document.getElementById("game-cover");
const streamDateEl = document.getElementById("stream-date");
const gameSection = document.getElementById("game-section");

// 🔑 Twitch API Credentials
const clientId = "gp762nuuoqcoxypju8c569th9wz7q5";
const oauthToken = "0s89vmye9hk95jiifrpion53n6cy9p";
const username = "fallenoneart";

// 🕖 Fixed stream time (7:00 PM local)
const FIXED_STREAM_TIME = "19:00"; // 7 PM

// ===============================
// 📅 Detect Next Stream & Fetch Info
// ===============================
async function updateStreamInfo() {
  try {
    // --- Get Twitch User ---
    const userResp = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
      headers: {
        "Client-ID": clientId,
        "Authorization": `Bearer ${oauthToken}`,
      },
    });
    const userData = await userResp.json();
    if (!userData.data?.length) throw new Error("User not found");
    const userId = userData.data[0].id;

    // --- Get Channel Info (Title + Game) ---
    const channelResp = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${userId}`,
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${oauthToken}`,
        },
      }
    );
    const channelData = await channelResp.json();
    if (!channelData.data?.length) throw new Error("No channel info found");
    const channelInfo = channelData.data[0];

    const streamTitle = channelInfo.title || "No Title Set";
    const gameTitle = channelInfo.game_name || "No Game Set";
    const gameId = channelInfo.game_id;

    // --- Calculate Next Stream Date ---
    const now = new Date();
    const streamDays = [3, 5, 6]; // Wed, Fri, Sat
    const today = now.getDay();

    let nextStreamDay = streamDays.find(day => day > today) ?? streamDays[0];
    let daysUntilNext = (nextStreamDay + 7 - today) % 7;

    // If today's a stream day but it's past 7:00 PM, move to the next stream day
    if (daysUntilNext === 0) {
      const [hour, minute] = FIXED_STREAM_TIME.split(":").map(Number);
      const streamTimeToday = new Date(now);
      streamTimeToday.setHours(hour, minute, 0, 0);

      if (now >= streamTimeToday) {
        const idx = streamDays.indexOf(today);
        nextStreamDay = streamDays[(idx + 1) % streamDays.length];
        daysUntilNext = (nextStreamDay + 7 - today) % 7 || 7;
      }
    }

    const nextStreamDate = new Date(now);
    nextStreamDate.setDate(now.getDate() + daysUntilNext);
    nextStreamDate.setHours(...FIXED_STREAM_TIME.split(":").map(Number), 0, 0);

    const dayName = nextStreamDate.toLocaleDateString(undefined, { weekday: "long" });
    const dateStr = nextStreamDate.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
    });
    const timeStr = nextStreamDate.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    // --- Update HTML Elements ---
    if (streamDateEl) streamDateEl.textContent = `${dayName}, ${dateStr} at ${timeStr}`;
    if (streamTitleEl) streamTitleEl.textContent = streamTitle;
    if (gameTitleEl) gameTitleEl.textContent = gameTitle;

    // --- Load Game Cover ---
    if (gameId && gameId !== "0") {
      gameCoverEl.src = `https://static-cdn.jtvnw.net/ttv-boxart/${gameId}-285x380.jpg`;
    } else {
      // fallback to API lookup
      await loadGameCover(gameTitle);
    }

    gameSection.style.display = "block";
  } catch (error) {
    console.error("Error fetching Twitch stream data:", error);
    if (streamDateEl) streamDateEl.textContent = "Next stream info unavailable";
    if (streamTitleEl) streamTitleEl.textContent = "Stream Title Unavailable";
    if (gameTitleEl) gameTitleEl.textContent = "Game Name Unavailable";
    if (gameCoverEl) gameCoverEl.src = "images/default-cover.png";
    gameSection.style.display = "block";
  }
}

// ===============================
// 🎮 Twitch Game Cover Loader
// ===============================
async function loadGameCover(gameName) {
  if (!gameName || gameName === "Just Chatting") {
    gameCoverEl.src = "images/default-cover.png";
    return;
  }

  try {
    const response = await fetch(
      `https://api.twitch.tv/helix/games?name=${encodeURIComponent(gameName)}`,
      {
        headers: {
          "Client-ID": clientId,
          "Authorization": `Bearer ${oauthToken}`,
        },
      }
    );

    const data = await response.json();
    const game = data.data && data.data[0];

    if (game && game.box_art_url) {
      const boxArtUrl = game.box_art_url
        .replace("{width}", "285")
        .replace("{height}", "380");
      gameCoverEl.src = boxArtUrl;
    } else {
      gameCoverEl.src = "images/default-cover.png";
    }
  } catch (error) {
    console.error("Error loading game cover:", error);
    gameCoverEl.src = "images/default-cover.png";
  }
}

// ===============================
// 🚀 Run on Page Load
// ===============================
updateStreamInfo();


// ===============================
// 🔴 Twitch Live Status Check
// ===============================
async function checkTwitchLive() {
  const clientId = "gp762nuuoqcoxypju8c569th9wz7q5";
  const oauthToken = "0s89vmye9hk95jiifrpion53n6cy9p";
  const username = "fallenoneart";

  const titleEl = document.getElementById("streamTitle");
  const gameEl = document.getElementById("game-title");
  const coverEl = document.getElementById("game-cover");

  try {
    const userResp = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
      headers: {
        "Client-ID": clientId,
        "Authorization": `Bearer ${oauthToken}`
      }
    });
    const userData = await userResp.json();
    if (!userData.data?.length) throw new Error("User not found");

    const userId = userData.data[0].id;
    const channelResp = await fetch(`https://api.twitch.tv/helix/channels?broadcaster_id=${userId}`, {
      headers: {
        "Client-ID": clientId,
        "Authorization": `Bearer ${oauthToken}`
      }
    });

    const channelData = await channelResp.json();
    const channelInfo = channelData.data?.[0];
    if (!channelInfo) throw new Error("No channel info found");

    const gameId = channelInfo.game_id;
    const gameName = channelInfo.game_name;
    const streamTitle = channelInfo.title;

    if (titleEl) titleEl.textContent = streamTitle || "Untitled Stream";
    if (gameEl) gameEl.textContent = gameName || "Unknown Game";

    if (coverEl && gameId && gameId !== "0") {
      coverEl.src = `https://static-cdn.jtvnw.net/ttv-boxart/${gameId}-285x380.jpg`;
      coverEl.style.display = "block";
    } else if (coverEl) {
      coverEl.src = "images/default-cover.png";
      coverEl.style.display = "block";
    }

  } catch (err) {
    console.error("Error checking Twitch live status:", err);
  }
}

// ===============================
// 📅 Render Schedule
// ===============================
async function renderSchedule() {
  const grid = document.getElementById("schedule-grid");
  const segments = await fetchStreams();
  grid.innerHTML = '';

  for (const segment of segments) {
    const gameName = segment.category?.name || 'Just Chatting';
    const coverUrl = await fetchGameImage(gameName);
    const startTime = new Date(segment.start_time);
    const endTime = new Date(segment.end_time);

    const streamItem = document.createElement('div');
    streamItem.classList.add('stream-item');
    streamItem.innerHTML = `
      <div class="stream-details">
        <strong>${startTime.toLocaleDateString()}</strong><br>
        <span class="stream-title">${gameName}</span> —
        <time datetime="${startTime.toISOString()}">${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
        to
        <time datetime="${endTime.toISOString()}">${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
      </div>
      <div class="cover-container">
        <img src="${coverUrl}" alt="${gameName} Cover"
        style="width:100%; max-height:200px; object-fit:cover; border-radius:8px; margin-top:8px;">
      </div>
    `;
    grid.appendChild(streamItem);
  }
}

// ===============================
// 🔄 Section Selector
// ===============================
function setupStreamSelection(select, sections) {
  select.addEventListener('change', () => {
    const selected = select.value;
    sections.forEach(section => {
      const isMatch = section.id === selected;
      section.style.display = isMatch ? 'block' : 'none';
      section.classList.toggle('active', isMatch);
    });
  });
}

// ===============================
// 🚀 Initialize Everything
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  const streamTitleUpcomingEl = document.getElementById("stream-title");
  const gameTitleUpcomingEl = document.getElementById("game-title");
  const select = document.getElementById("streamSections");
  const allSections = document.querySelectorAll(".stream-section");
  const form = document.getElementById("stream-form");

  setupStreamSelection(select, allSections);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const gameName = document.getElementById('game-name').value.trim();
      const startTime = new Date(document.getElementById('start-time').value);
      const endTime = new Date(document.getElementById('end-time').value);
      if (!gameName || isNaN(startTime) || isNaN(endTime)) return alert('Please fill all fields');
      const coverUrl = await fetchGameImage(gameName);
      const grid = document.getElementById("schedule-grid");
      const streamItem = document.createElement('div');
      streamItem.classList.add('stream-item');
      streamItem.innerHTML = `
        <div class="stream-details">
          <strong>${startTime.toLocaleDateString()}</strong><br>
          <span class="stream-title">${gameName}</span> —
          <time datetime="${startTime.toISOString()}">${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          to
          <time datetime="${endTime.toISOString()}">${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
        </div>
        <div class="cover-container">
          <img src="${coverUrl}" alt="${gameName} Cover"
          style="width:100%; max-height:200px; object-fit:cover; border-radius:8px; margin-top:8px;">
        </div>
      `;
      grid.appendChild(streamItem);
      form.reset();
    });
  }

  updateDateDisplay();
  detectNextStreamDay(streamTitleUpcomingEl, gameTitleUpcomingEl);
  await checkTwitchLive();
  await renderSchedule();

  setInterval(checkTwitchLive, 60000);
  setInterval(() => detectNextStreamDay(streamTitleUpcomingEl, gameTitleUpcomingEl), 60000);
  setInterval(renderSchedule, 5 * 60 * 1000);
});