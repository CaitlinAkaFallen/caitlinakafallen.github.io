/* =========================================================
   Caitlin's Creative Space — shared page script
   Loaded by index.html. Handles social login, search,
   live status, modals, collapsible cards, and hiding
   the site navigation until the visitor is logged in.
   ========================================================= */
(() => {
  "use strict";

  /* =========================================================
     CONFIG
     - twitchClientId is the public login client (same as the
       Twitch Lounge and main pages), so one login works everywhere.
     - redirectUri must exactly match an address registered in each
       provider's developer console. main-page is registered for Twitch.
     - The live pill uses the logged-in Twitch token, so no
       app credentials are needed.
     ========================================================= */
  const CONFIG = {
    channel: "fallenoneart",
    twitchClientId: "iv3dicfghd1hflqzzysljadc8mw1sa",   // login client (shared)
    twitchScope: "user:read:email",
    discordClientId: "1426998908164505600",
    googleClientId: "323446283951-pqq1ic2ivpnofmfrp7flc83iklc6tjp1.apps.googleusercontent.com",
    redirectUri: "https://caitlinscreativespace.xyz/main-page",
    liveCheckMs: 60_000
  };

  const DEFAULT_AVATAR = "images/default-avatar.png";

  const PAGES = [
    { href: "index.html", label: "Welcome", keys: "home start intro", icon: "welcome" },
    { href: "photography.html", label: "Photography", keys: "portfolio photos camera", icon: "camera" },
    { href: "programming.html", label: "Programming", keys: "code coding projects", icon: "code" },
    { href: "viewer-art.html", label: "Gallery", keys: "art viewer community", icon: "brush" },
    { href: "viewers-convention.html", label: "Conventions", keys: "convention events", icon: "users" },
    { href: "schedule.html", label: "Content", keys: "schedule stream content", icon: "video" },
    { href: "about.html", label: "About", keys: "about me bio", icon: "user" },
    { href: "contact.html", label: "Contact", keys: "contact email message", icon: "mail" },
    { href: "twitch.html", label: "Twitch Lounge", keys: "twitch live stream", icon: "twitch" },
    { href: "stream-commands.html", label: "Commands", keys: "commands chat bot", icon: "bell" },
    { href: "youtube.html", label: "YouTube", keys: "youtube video", icon: "youtube" }
  ];

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* =========================================================
     Modals (login, terms, privacy)
     ========================================================= */
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add("open");
    const first = m.querySelector("button, a, input");
    if (first) setTimeout(() => first.focus(), 50);
  }
  function closeModal(m) { m.classList.remove("open"); }
  function closeAllModals() { $$(".modal.open").forEach(closeModal); }

  function initModals() {
    $$(".modal").forEach(m => {
      m.addEventListener("click", e => { if (e.target === m) closeModal(m); });
      m.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(m)));
    });
    $("#open-tos")?.addEventListener("click", e => { e.preventDefault(); closeModal($("#loginModal")); openModal("tos-modal"); });
    $("#open-privacy")?.addEventListener("click", e => { e.preventDefault(); closeModal($("#loginModal")); openModal("privacy-modal"); });
  }

  /* =========================================================
     Login (Twitch, Discord, YouTube/Google)
     ========================================================= */
  const load = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };

  function currentUser() {
    return load("twitchUser") || load("socialUser");
  }
  const isLoggedIn = () => !!currentUser();

  /* Hide the whole nav bar until the visitor is logged in */
  function applyNavGate() {
    const logged = isLoggedIn();
    const navWrap = $(".nav-scroll");
    if (navWrap) navWrap.hidden = !logged;
    // Keep search + Log in pinned to the right when the nav is hidden
    const actions = $(".actions");
    if (actions) actions.style.justifySelf = logged ? "" : "end";
  }

  function renderProfile() {
    const u = currentUser();
    const loginBtn = $("#loginBtn"), profile = $("#profile");
    if (u) {
      $("#profilePic").src = u.avatar || DEFAULT_AVATAR;
      $("#profileName").textContent = u.name || u.username || "User";
      profile.classList.add("show");
      loginBtn.hidden = true;
    } else {
      profile.classList.remove("show");
      loginBtn.hidden = false;
    }
    applyNavGate();
    checkLive();
  }

  function startOAuth(provider, url) {
    sessionStorage.setItem("oauthProvider", provider);
    location.href = url;
  }

  function loginWithTwitch() {
    startOAuth("twitch",
      "https://id.twitch.tv/oauth2/authorize?response_type=token" +
      `&client_id=${CONFIG.twitchClientId}` +
      `&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}` +
      `&scope=${encodeURIComponent(CONFIG.twitchScope)}`);
  }
  function loginWithDiscord() {
    startOAuth("discord",
      "https://discord.com/api/oauth2/authorize?response_type=code" +
      `&client_id=${CONFIG.discordClientId}` +
      `&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}` +
      "&scope=identify%20email");
  }
  function loginWithGoogle() {
    startOAuth("google",
      "https://accounts.google.com/o/oauth2/v2/auth?response_type=token" +
      `&client_id=${CONFIG.googleClientId}` +
      `&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}` +
      "&scope=profile%20email");
  }

  async function finishTwitchLogin(token) {
    const r = await fetch("https://api.twitch.tv/helix/users", {
      headers: { "Client-ID": CONFIG.twitchClientId, "Authorization": "Bearer " + token }
    });
    if (!r.ok) throw new Error("Twitch " + r.status);
    const u = (await r.json()).data?.[0];
    if (!u) throw new Error("no Twitch user");
    localStorage.setItem("twitchUser", JSON.stringify({
      username: u.display_name, avatar: u.profile_image_url, id: u.id, token
    }));
    localStorage.removeItem("socialUser");
    toast(`Logged in as ${u.display_name}`);
  }

  async function finishGoogleLogin(token) {
    const r = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!r.ok) throw new Error("Google " + r.status);
    const d = await r.json();
    localStorage.setItem("socialUser", JSON.stringify({ name: d.name, avatar: d.picture, platform: "google" }));
    localStorage.removeItem("twitchUser");
    toast(`Logged in as ${d.name}`);
  }

  function finishDiscordLogin() {
    // Placeholder: records a generic Discord user. Replace with a real token exchange.
    localStorage.setItem("socialUser", JSON.stringify({
      name: "Discord User", avatar: "https://cdn.discordapp.com/embed/avatars/0.png", platform: "discord"
    }));
    localStorage.removeItem("twitchUser");
    toast("Logged in with Discord");
  }

  /* Finish a login if this page was opened by a provider redirect */
  async function handleOAuthReturn() {
    const hash = new URLSearchParams(location.hash.slice(1));
    const search = new URLSearchParams(location.search);
    const provider = sessionStorage.getItem("oauthProvider");
    const token = hash.get("access_token");
    const code = search.get("code");
    if (!provider || (!token && !code)) return;

    sessionStorage.removeItem("oauthProvider");
    history.replaceState(null, "", location.pathname);

    try {
      if (provider === "twitch" && token) await finishTwitchLogin(token);
      else if (provider === "google" && token) await finishGoogleLogin(token);
      else if (provider === "discord" && code) finishDiscordLogin();
    } catch (e) {
      console.error("Login failed:", e);
      toast("Login failed. Please try again.");
    }
    renderProfile();
  }

  function initLogin() {
    $("#loginBtn")?.addEventListener("click", () => openModal("loginModal"));
    $("#twitchLoginBtn")?.addEventListener("click", loginWithTwitch);
    $("#discordLoginBtn")?.addEventListener("click", loginWithDiscord);
    $("#youtubeLoginBtn")?.addEventListener("click", loginWithGoogle);
    $("#logoutBtn")?.addEventListener("click", () => {
      localStorage.removeItem("twitchUser");
      localStorage.removeItem("socialUser");
      sessionStorage.removeItem("oauthProvider");
      renderProfile();
      toast("Logged out");
    });

    // Stay in sync if you log in or out in another tab
    window.addEventListener("storage", e => {
      if (!e.key || e.key === "twitchUser" || e.key === "socialUser") renderProfile();
    });
  }

  /* =========================================================
     Live status pill (uses the logged-in Twitch token)
     ========================================================= */
  async function checkLive() {
    const pill = $("#livePill"), text = $("#liveText");
    if (!pill || !text) return;
    const token = load("twitchUser")?.token;
    if (!token) {
      pill.classList.remove("live");
      text.textContent = "Log in with Twitch to see live status";
      return;
    }
    try {
      const r = await fetch(`https://api.twitch.tv/helix/streams?user_login=${CONFIG.channel}`, {
        headers: { "Client-ID": CONFIG.twitchClientId, "Authorization": "Bearer " + token }
      });
      if (r.status === 401) {
        pill.classList.remove("live");
        text.textContent = "Twitch login expired. Log in again";
        return;
      }
      if (!r.ok) throw new Error(String(r.status));
      const live = ((await r.json()).data || []).length > 0;
      pill.classList.toggle("live", live);
      text.textContent = live ? "LIVE on Twitch now" : "Offline on Twitch";
    } catch (e) {
      console.warn("Live check failed:", e);
      pill.classList.remove("live");
      text.textContent = "Twitch status unavailable";
    }
  }

  /* =========================================================
     Search palette + footer search
     (lists nothing until logged in)
     ========================================================= */
  let paletteActive = 0;
  let paletteShown = [];

  const availablePages = () => isLoggedIn() ? PAGES : [];

  function renderPalette() {
    const q = ($("#paletteInput").value || "").trim().toLowerCase();
    paletteShown = availablePages().filter(p => !q || (p.label + " " + p.keys).toLowerCase().includes(q));
    if (paletteActive >= paletteShown.length) paletteActive = 0;
    $("#paletteList").innerHTML = paletteShown.length
      ? paletteShown.map((p, i) => `
          <li role="option" aria-selected="${i === paletteActive}">
            <a href="${esc(p.href)}" data-i="${i}" class="${i === paletteActive ? "active" : ""}">
              <span class="p-ico"><svg aria-hidden="true" width="18" height="18"><use href="#i-${esc(p.icon)}"/></svg></span>
              <span><strong>${esc(p.label)}</strong><small>${esc(p.href)}</small></span>
            </a>
          </li>`).join("")
      : isLoggedIn()
        ? `<li class="palette-empty">No pages match “${esc($("#paletteInput").value)}”.</li>`
        : `<li class="palette-empty">Log in to browse pages.</li>`;
  }

  function openPalette(prefill = "") {
    const p = $("#palette");
    p.classList.add("open");
    $("#paletteInput").value = prefill;
    paletteActive = 0;
    renderPalette();
    setTimeout(() => $("#paletteInput").focus(), 30);
  }
  function closePalette() { $("#palette").classList.remove("open"); }

  function initSearch() {
    $("#openSearch")?.addEventListener("click", () => openPalette());
    $("#browseBtn")?.addEventListener("click", () => openPalette());

    const pIn = $("#paletteInput");
    pIn.addEventListener("input", () => { paletteActive = 0; renderPalette(); });
    pIn.addEventListener("keydown", e => {
      const n = Math.max(paletteShown.length, 1);
      if (e.key === "ArrowDown") { e.preventDefault(); paletteActive = (paletteActive + 1) % n; renderPalette(); }
      if (e.key === "ArrowUp") { e.preventDefault(); paletteActive = (paletteActive - 1 + n) % n; renderPalette(); }
      if (e.key === "Enter" && paletteShown[paletteActive]) { e.preventDefault(); location.href = paletteShown[paletteActive].href; }
      if (e.key === "Escape") closePalette();
    });
    $("#palette").addEventListener("click", e => { if (e.target.id === "palette") closePalette(); });
    $("#paletteList").addEventListener("mousemove", e => {
      const a = e.target.closest("a[data-i]");
      if (a && Number(a.dataset.i) !== paletteActive) { paletteActive = Number(a.dataset.i); renderPalette(); }
    });

    const fForm = $("#footerSearch"), fIn = $("#footerInput");
    fForm.addEventListener("submit", e => {
      e.preventDefault();
      openPalette(fIn.value.trim());
      fIn.value = "";
    });

    document.addEventListener("keydown", e => {
      const typing = e.target.matches("input, textarea");
      if (e.key === "/" && !typing) { e.preventDefault(); openPalette(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
      if (e.key === "Escape") { closePalette(); closeAllModals(); }
    });
  }

  /* =========================================================
     Collapsible cards + reveal on scroll
     ========================================================= */
  function initCards() {
    $$(".card-head").forEach(btn => {
      btn.addEventListener("click", () => {
        const card = btn.closest(".card");
        const closed = card.classList.toggle("closed");
        btn.setAttribute("aria-expanded", String(!closed));
      });
    });
  }

  function initReveal() {
    const items = $$(".card, .notice");
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.animation = "rise .7s var(--ease) both";
          io.unobserve(e.target);
        }
      });
    }, { threshold: .12 });
    items.forEach(el => { el.style.opacity = "0"; io.observe(el); });
  }

  /* ---------- Revamp notice date ---------- */
  function setToday() {
    const el = $("#revamp-date");
    if (el) el.textContent = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  /* ---------- Init ---------- */
  // Hide the nav right away so it never flashes for logged-out visitors
  applyNavGate();

  document.addEventListener("DOMContentLoaded", () => {
    initModals();
    initLogin();
    initSearch();
    initCards();
    initReveal();
    setToday();

    handleOAuthReturn().finally(renderProfile);
    renderProfile();

    setInterval(checkLive, CONFIG.liveCheckMs);
  });
})();
