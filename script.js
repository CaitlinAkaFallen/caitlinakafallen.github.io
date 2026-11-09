/* =========================================================
   Caitlin's Creative Space — shared page script
   Loaded by index.html. Handles social login (Twitch, Discord,
   YouTube/Google), subscriber check, search, live status,
   modals, collapsible cards, and hiding the nav until logged in.
   ========================================================= */
(() => {
  "use strict";

  /* ===== WHICH SITE IS THIS PAGE RUNNING ON? =====
     The same page is served from the main site and from the Render server.
     Logins must return to the same address they started from, because
     the saved login lives in that address's own browser storage. */
  const ON_RENDER = location.hostname === "caitlins-announcement-api.onrender.com";
  const SITE_ORIGIN = ON_RENDER
    ? "https://caitlins-announcement-api.onrender.com"
    : "https://caitlinscreativespace.xyz";

  /* ===== REMOVE .HTML FROM URL =====
     Skipped on Render, because the server only serves the .html address
     (a refresh on the clean address would show a 404). */
  (function hideHtmlInURL() {
    if (ON_RENDER) return;
    const pathname = window.location.pathname;
    if (pathname.endsWith(".html")) {
      window.history.replaceState({}, "", pathname.replace(/\.html$/, "") + window.location.search + window.location.hash);
    }
  })();

  /* =========================================================
     CONFIG
     - Twitch uses the login app whose redirects are registered.
       Main site: main-page (clean address).
       Render: main-page.html (the server has no clean address).
     - Discord and Google use the .html address on both sites.
     - Every address below must be registered in that provider's
       developer console, or the login will be refused.
     ========================================================= */
  const CONFIG = {
    channel: "fallenoneart",
    broadcasterId: "fallenoneart",
    twitchClientId: "93zm8q03ri0840ul18y8e7owbl4y01",
    twitchScope: "user:read:email user:read:subscriptions",
    discordClientId: "1426998908164505600",
    googleClientId: "323446283951-pqq1ic2ivpnofmfrp7flc83iklc6tjp1.apps.googleusercontent.com",
    twitchRedirectUri: ON_RENDER ? SITE_ORIGIN + "/main-page.html" : SITE_ORIGIN + "/main-page",
    standardRedirectUri: SITE_ORIGIN + "/main-page.html",
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
     Saved login helpers
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

  /* =========================================================
     Login buttons (send the visitor to each provider)
     ========================================================= */
  function startOAuth(provider, url) {
    sessionStorage.setItem("oauthProvider", provider);
    sessionStorage.setItem("loginType", provider);
    location.href = url;
  }

  function loginWithTwitch() {
    startOAuth("twitch",
      "https://id.twitch.tv/oauth2/authorize?response_type=token" +
      `&client_id=${CONFIG.twitchClientId}` +
      `&redirect_uri=${encodeURIComponent(CONFIG.twitchRedirectUri)}` +
      `&scope=${encodeURIComponent(CONFIG.twitchScope)}`);
  }

  function loginWithDiscord() {
    startOAuth("discord",
      "https://discord.com/api/oauth2/authorize?response_type=code" +
      `&client_id=${CONFIG.discordClientId}` +
      `&redirect_uri=${encodeURIComponent(CONFIG.standardRedirectUri)}` +
      "&scope=identify%20email");
  }

  function loginWithGoogle() {
    startOAuth("google",
      "https://accounts.google.com/o/oauth2/v2/auth?response_type=token" +
      `&client_id=${CONFIG.googleClientId}` +
      `&redirect_uri=${encodeURIComponent(CONFIG.standardRedirectUri)}` +
      "&scope=profile%20email");
  }

  /* =========================================================
     Twitch: profile + subscriber check
     ========================================================= */
  async function checkSubscriptionStatus(userId, token) {
    try {
      const res = await fetch(
        `https://api.twitch.tv/helix/subscriptions/user?broadcaster_id=${CONFIG.broadcasterId}&user_id=${userId}`,
        { headers: { "Authorization": `Bearer ${token}`, "Client-Id": CONFIG.twitchClientId } }
      );
      // Twitch usually refuses this check for regular viewers (403), so treat that as "unknown"
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data.data) && data.data.length > 0;
    } catch (err) {
      console.error("Subscription check error:", err);
      return null;
    }
  }

  async function finishTwitchLogin(token) {
    const res = await fetch("https://api.twitch.tv/helix/users", {
      headers: { "Authorization": `Bearer ${token}`, "Client-Id": CONFIG.twitchClientId }
    });
    if (!res.ok) throw new Error("Twitch " + res.status);
    const json = await res.json();
    const user = json.data && json.data[0];
    if (!user) throw new Error("No user data returned from Twitch");

    const isSubscriber = await checkSubscriptionStatus(user.id, token);
    const saved = {
      username: user.display_name,
      name: user.display_name,
      avatar: user.profile_image_url,
      id: user.id,
      token,
      isSubscriber
    };
    localStorage.setItem("twitchUser", JSON.stringify(saved));
    localStorage.setItem("twitch_access_token", token);
    localStorage.setItem("socialUser", JSON.stringify({ name: user.display_name, avatar: user.profile_image_url, id: user.id, platform: "twitch" }));
    toast(`Logged in as ${user.display_name}`);
  }

  /* =========================================================
     Google / YouTube
     ========================================================= */
  async function finishGoogleLogin(token) {
    let d = null, lastStatus = null;
    for (const url of [
      "https://www.googleapis.com/oauth2/v3/userinfo",
      "https://www.googleapis.com/oauth2/v2/userinfo"
    ]) {
      const r = await fetch(url, { headers: { "Authorization": "Bearer " + token } });
      if (r.ok) { d = await r.json(); break; }
      lastStatus = r.status;
    }
    if (!d) throw new Error("Google " + lastStatus);
    const name = d.name || d.given_name || "Google user";
    localStorage.setItem("socialUser", JSON.stringify({ name, avatar: d.picture || "", platform: "google" }));
    localStorage.removeItem("twitchUser");
    toast(`Logged in as ${name}`);
  }

  /* =========================================================
     Discord (placeholder: records a generic user; the code
     is not exchanged for a real profile yet)
     ========================================================= */
  function finishDiscordLogin() {
    localStorage.setItem("socialUser", JSON.stringify({
      name: "Discord User", avatar: "https://cdn.discordapp.com/embed/avatars/0.png", platform: "discord"
    }));
    localStorage.removeItem("twitchUser");
    toast("Logged in with Discord");
  }

  /* Finish a login when this page was opened by a provider redirect */
  async function handleOAuthReturn() {
    const hash = new URLSearchParams(location.hash.slice(1));
    const search = new URLSearchParams(location.search);
    const provider = sessionStorage.getItem("oauthProvider");
    const token = hash.get("access_token");
    const code = search.get("code");
    if (!provider || (!token && !code)) return;

    sessionStorage.removeItem("oauthProvider");
    sessionStorage.removeItem("loginType");
    history.replaceState(null, "", location.pathname + location.search.replace(/[?&]code=[^&]*/, ""));

    try {
      if (provider === "twitch" && token) await finishTwitchLogin(token);
      else if (provider === "google" && token) await finishGoogleLogin(token);
      else if (provider === "discord" && code) finishDiscordLogin();
    } catch (e) {
      console.error(`${provider} login failed:`, e);
      toast(`${provider} login failed (${e.message}). Check the browser console.`);
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
      localStorage.removeItem("twitch_access_token");
      sessionStorage.removeItem("oauthProvider");
      sessionStorage.removeItem("loginType");
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
     Search palette + footer search (lists nothing until logged in)
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

  /* ---------- Section toggle (older onclick="toggleSection(...)" markup) ---------- */
  window.toggleSection = function (sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const body = section.querySelector(".section-body");
    const icon = section.querySelector(".toggle-icon");
    if (body && icon) {
      body.classList.toggle("collapsed");
      icon.classList.toggle("rotate");
    }
  };

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
