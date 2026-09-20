/*
 * relay-auth.js — helper for music-player.html (the OBS overlay)
 *
 * OBS Browser Sources (and any other browser) have their OWN localStorage, separate from the
 * Electron dashboard. This file bridges the gap:
 *   1) Reads the ?cfg=... part of the URL and stores it as the overlay's config.
 *   2) Asks the dashboard (through the local relay on port 17650) for a Spotify access token
 *      and stores it so the overlay can show what's playing.
 *
 * It must be loaded BEFORE the main <script> in music-player.html.
 * If the dashboard and overlay share storage (e.g. the Live Preview inside the dashboard),
 * the real login already exists and this file leaves it untouched.
 */
(function () {
  'use strict';

  var LS_CONFIG_KEY = 'fallenoneart_music_player_config';
  var LS_AUTH_KEY = 'fallenoneart_spotify_auth';
  var LS_LAST_CFG_PARAM_KEY = 'fallenoneart_last_cfg_param';
  var RELAY_PORT = 17650;
  var RELAY_MARKER = 'relay';
  // The main script treats a token as expired 60s before expiry and tries to refresh it itself
  // (which can't work here). Padding by 55s means the dashboard's fresh token (pushed ~60s before
  // expiry) always arrives before the overlay would try.
  var EXPIRY_PAD_MS = 55000;

  // ---- 1) Config from the URL (?cfg=base64) ----
  try {
    var raw = new URLSearchParams(window.location.search).get('cfg');
    if (raw) {
      // "+" in base64 is turned into a space by URLSearchParams — put it back.
      var param = raw.replace(/ /g, '+');
      // Only apply when the pasted URL is new, so a later live update from the dashboard
      // isn't overwritten by the older config baked into the URL every time OBS reloads.
      if (param !== localStorage.getItem(LS_LAST_CFG_PARAM_KEY)) {
        var json = decodeURIComponent(escape(atob(param)));
        JSON.parse(json); // validate before storing
        localStorage.setItem(LS_CONFIG_KEY, json);
        localStorage.setItem(LS_LAST_CFG_PARAM_KEY, param);
      }
    }
  } catch (e) {}

  // ---- 2) Spotify access token from the dashboard via the relay ----
  function hasFullAuth() {
    try {
      var a = JSON.parse(localStorage.getItem(LS_AUTH_KEY) || 'null');
      return !!(a && a.refreshToken && a.refreshToken !== RELAY_MARKER);
    } catch (e) { return false; }
  }

  var ws = null;
  function requestState() {
    if (ws && ws.readyState === 1) {
      try { ws.send(JSON.stringify({ type: 'request-state' })); } catch (e) {}
    }
  }

  function connect() {
    try {
      ws = new WebSocket('ws://127.0.0.1:' + RELAY_PORT);
    } catch (e) {
      setTimeout(connect, 3000);
      return;
    }
    ws.onopen = function () { if (!hasFullAuth()) requestState(); };
    ws.onmessage = function (evt) {
      try {
        var msg = JSON.parse(evt.data);
        if (msg && msg.type === 'auth-update' && msg.auth && msg.auth.accessToken) {
          if (hasFullAuth()) return; // shared storage with the dashboard — keep the real login
          localStorage.setItem(LS_AUTH_KEY, JSON.stringify({
            clientId: RELAY_MARKER,
            refreshToken: RELAY_MARKER,
            accessToken: msg.auth.accessToken,
            expiresAt: (Number(msg.auth.expiresAt) || 0) + EXPIRY_PAD_MS
          }));
          if (typeof window.pollNowPlaying === 'function') window.pollNowPlaying();
        }
      } catch (e) {}
    };
    ws.onclose = function () { ws = null; setTimeout(connect, 3000); };
    ws.onerror = function () {};
  }
  connect();

  // Safety net: if the dashboard was closed and reopened, ask again every 2 minutes.
  setInterval(function () { if (!hasFullAuth()) requestState(); }, 120000);
})();