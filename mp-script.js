const LS_CONFIG_KEY = 'fallenoneart_music_player_config';
const LS_AUTH_KEY = 'fallenoneart_spotify_auth';
const LS_PKCE_KEY = 'fallenoneart_spotify_pkce_verifier';
const LS_CLIENT_ID_KEY = 'fallenoneart_spotify_client_id';
const LS_DASH_THEME_KEY = 'fallenoneart_dashboard_theme';
const LS_PREVIEW_OPACITY_KEY = 'fallenoneart_preview_opacity';
const LS_DEVICE_ID_KEY = 'fallenoneart_spotify_device_id';
const LS_DISCORD_KEY = 'fallenoneart_discord_webhook_config';
const LS_WALLPAPER_HISTORY_KEY = 'fallenoneart_dashboard_wallpaper_history';
const MAX_WALLPAPER_HISTORY = 8;
const LS_DISCORD_AVATAR_URL_HISTORY_KEY = 'fallenoneart_discord_avatar_url_history';
const LS_DISCORD_AVATAR_UPLOAD_HISTORY_KEY = 'fallenoneart_discord_avatar_upload_history';
const MAX_AVATAR_HISTORY = 8;
const LS_HOTKEYS_ENABLED_KEY = 'fallenoneart_hotkeys_enabled';
const LS_KEYBINDS_KEY = 'fallenoneart_custom_keybinds';
const LS_SONGREQUEST_KEY = 'fallenoneart_songrequest_config';
const LS_CHATCOMMANDS_KEY = 'fallenoneart_chat_playback_commands_config';
const IMGUR_CLIENT_ID = '546c25a59c58ad7';
const BROADCAST_NAME = 'fallenoneart-music-player-sync';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_ME_URL = 'https://api.spotify.com/v1/me';
const SPOTIFY_SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state user-read-private user-read-recently-played user-library-read user-library-modify';

// ============================================
// NEW: WEBSOCKET RELAY (bridges this dashboard <-> real OBS Browser
// Source, which is a totally separate Chromium process and never sees
// this page's BroadcastChannel/localStorage). Connects to the local
// relay server that main.js already spins up on port 17650.
// ============================================
const WS_RELAY_PORT = 17650;
let relayWs = null;
let relayReconnectTimer = null;
function connectRelay(){
  try{
    relayWs = new WebSocket(`ws://127.0.0.1:${WS_RELAY_PORT}`);
    relayWs.onopen = () => { if (relayReconnectTimer) { clearTimeout(relayReconnectTimer); relayReconnectTimer = null; } };
    relayWs.onclose = () => { relayWs = null; relayReconnectTimer = setTimeout(connectRelay, 3000); };
    relayWs.onerror = () => {};
  }catch(e){ relayReconnectTimer = setTimeout(connectRelay, 3000); }
}
connectRelay();
function relaySend(payload){
  if (relayWs && relayWs.readyState === WebSocket.OPEN){
    try{ relayWs.send(JSON.stringify(payload)); }catch(e){}
  }
}

// ============================================
// PRODUCTION DOMAIN OVERRIDE
// Electron serves this dashboard from http://127.0.0.1:17650,
// but the Spotify app + OBS browser source are registered
// against the live domain. So instead of trusting
// window.location.origin blindly, we detect local/Electron
// contexts and force the production domain in that case.
// ============================================
const PRODUCTION_ORIGIN = 'https://caitlinscreativespace.xyz';

function getEffectiveOrigin(){
  const origin = window.location.origin;
  const isLocalOrFile =
    !origin ||
    origin === 'null' ||
    origin.startsWith('file://') ||
    /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin);
  return isLocalOrFile ? PRODUCTION_ORIGIN : origin;
}

const DEFAULT_CONFIG = {
  layoutMode:'compact',accentPrimary:'#7de8c8',accentSecondary:'#c8a2ff',timeColor:'#7de8c8',titleColor:'#f3f1f8',artistColor:'#a39fb5',albumColor:'#a39fb5',
  glassOpacity:0.45,blurStrength:18,cornerRadius:22,albumArtShape:'rounded',showProgressBar:true,showArtist:true,showAlbum:false,showTimecode:true,
  showEqualizer:true,showBranding:true,showContainerBackground:true,idleBehavior:'message',idleMessage:'NOTHING PLAYING',pollInterval:5,glowIntensity:0.6,
  pulseSpeed:6,fontPairing:'signature',artRevealStyle:'roll',marqueeEnabled:true,marqueeSpeed:36,progressBarStyle:'solid',showScrubberDot:false,showArtBadge:false,
  artistItalic:false,textScale:1,cardWidth:420,cardHeight:480,showMetadataPill:true,metadataBackground:true,metadataOpacity:1,progressBackground:true,showStartTime:false,
  compactArtSize:120,compactRightGap:6,compactTitleSize:16,compactArtistSize:11,compactEqBarsHeight:16,compactEqBarWidth:2,compactProgressHeight:6
};

const DEFAULT_DASH_THEME = {
  bgType:'gradient',bgColor1:'#0a0915',gradColor1:'#7de8c8',gradColor2:'#c8a2ff',gradAngle:135,bgImageUrl:'',bgImageSourceType:'url',bgImageUpload:'',bgPosition:'cover',navTextColor:'#9a97ab',
  primaryText:'#f3f1f8',secondaryText:'#9a97ab',tertiaryText:'#6f6c80',panelColor:'#1e1932',panelOpacity:0.55,panelBorder:'#ffffff',borderOpacity:0.15,accent1:'#7de8c8',accent2:'#c8a2ff',blurStrength:10,glowIntensity:1,
  cornerRadius:12,sidebarOpacity:0.5,sidebarGlow:true,transitionSpeed:'normal'
};

const DEFAULT_DISCORD_CONFIG = {
  enabled:false, webhookUrl:'', template:'🎵 Now playing: **{title}** by {artist}', includeArt:true, includeLink:true,
  includeDuration:false, botUsername:'FallenOneArt Music Player', botAvatarUrl:'', botAvatarSourceType:'url', botAvatarUpload:'', embedColor:'#7de8c8', mentionText:'', minPlaySeconds:0,
  nextSongEnabled:false, nextSongMinutes:5, nextSongTemplate:'⏭️ Coming up next: **{title}** by {artist}', nextSongEmbedColor:'#7de8c8',
  pauseSongEnabled:false, pauseSongEmbedColor:'#7de8c8', pauseSongTemplate:'⏸️ Paused: **{title}** by {artist}',
  resumeSongEnabled:false, resumeSongEmbedColor:'#7de8c8', resumeSongTemplate:'▶️ Resumed: **{title}** by {artist}'
};

const DEFAULT_KEYBINDS = [];

// ============================================
// NEW: SONG REQUEST (!sr) CONFIG
// ============================================
const DEFAULT_SONGREQUEST_CONFIG = {
  enabled: false,
  command: '!sr',
  permission: 'everyone', // everyone | subscriber | moderator | broadcaster
  cooldownSeconds: 30,
  modsBypassCooldown: true,
  maxRequestsPerStream: 0, // 0 = unlimited
  successTemplate: '✅ @{user} added "{title}" by {artist} to the queue!',
  notFoundTemplate: '❌ @{user} couldn\'t find a song matching "{query}".',
  cooldownTemplate: '@{user} please wait {seconds}s before requesting again.',
  noDeviceTemplate: '❌ @{user} no active Spotify device found — open Spotify first.',
  limitReachedTemplate: '❌ @{user} the song request limit has been reached for this stream.',
  permissionDeniedTemplate: '@{user} you don\'t have permission to request songs.'
};

// ============================================
// NEW: CHAT PLAYBACK COMMANDS (!play, !pause, !next) CONFIG
// ============================================
const DEFAULT_CHATCOMMANDS_CONFIG = {
  playEnabled: false,
  playCommand: '!play',
  playPermission: 'everyone',
  playSuccessTemplate: '▶️ @{user} resumed playback.',
  pauseEnabled: false,
  pauseCommand: '!pause',
  pausePermission: 'everyone',
  pauseSuccessTemplate: '⏸️ @{user} paused playback.',
  nextEnabled: false,
  nextCommand: '!next',
  nextPermission: 'moderator',
  nextSuccessTemplate: '⏭️ @{user} skipped to the next track.',
  cooldownSeconds: 10,
  modsBypassCooldown: true,
  noDeviceTemplate: '❌ @{user} no active Spotify device found — open Spotify first.',
  cooldownTemplate: '@{user} please wait {seconds}s before using that command again.',
  permissionDeniedTemplate: '@{user} you don\'t have permission to use that command.'
};

let config = { ...DEFAULT_CONFIG };
let dashTheme = { ...DEFAULT_DASH_THEME };
let discordConfig = { ...DEFAULT_DISCORD_CONFIG };
let previewOpacity = 1;
let wallpaperHistory = [];
let avatarUrlHistory = [];
let avatarUploadHistory = [];
let hotkeysEnabled = true;
let customKeybinds = [];
let songRequestConfig = { ...DEFAULT_SONGREQUEST_CONFIG };
let srUserCooldowns = {}; // userId -> last request timestamp (ms)
let srRequestCountThisStream = 0;
let chatCommandsConfig = { ...DEFAULT_CHATCOMMANDS_CONFIG };
let ccUserCooldowns = {}; // "userId:action" -> last used timestamp (ms)
let bc = null;
try{ bc = new BroadcastChannel(BROADCAST_NAME); }catch(e){}

// runtime-only state for playback UI (not persisted in config)
let shuffleState = false;
let repeatState = 'off'; // off -> context -> track -> off
let selectedDeviceId = null;
let deviceList = [];
let searchDebounceTimer = null;
let lastAnnouncedTrackId = null;

// runtime-only state for playlist browser
let allPlaylists = [];
let expandedPlaylistId = null;

// runtime-only state for the "next song" webhook alert
let lastQueueTracks = [];
let nextSongCheckTrackId = null;
let nextSongAnnouncedForTrackId = null;

// runtime-only state for the "pause song" webhook alert
let pauseSongAnnouncedForTrackId = null;

// runtime-only state for the "resume play" webhook alert
let wasPlayingLastForResume = null; // null = unknown yet, true/false = last observed is_playing state

// runtime-only state for Twitch pause/resume chat alerts
let twitchPauseAnnouncedForTrackId = null;
let twitchWasPlayingLastForResume = null;

// runtime-only state for the Twitch "next song" chat alert
let twitchNextSongCheckTrackId = null;
let twitchNextSongAnnouncedForTrackId = null;

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
    updateSaveBarVisibility(btn.dataset.tab);
  });
});

function updateSaveBarVisibility(tab){
  const saveBar = document.getElementById('saveBar');
  const hideOn = ['connection', 'theme', 'queue', 'settings'];
  saveBar.classList.toggle('hidden', hideOn.includes(tab));
}

let isEyeOpen = false;
document.getElementById('btnToggleClientId').addEventListener('click', ()=>{
  const input = document.getElementById('inputClientId');
  const btn = document.getElementById('btnToggleClientId');
  const svg = btn.querySelector('svg');
  
  isEyeOpen = !isEyeOpen;
  input.type = isEyeOpen ? 'text' : 'password';
  
  if(isEyeOpen){
    svg.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
  } else {
    svg.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28L3.46 8.84C2.08 10.29 1 12.04 1 12s1.73 4.39 6 7.5c1.55.84 3.15 1.31 4.8 1.53l3.02 3.02c1.25.125 2.47.1 3.38.084l2.85 2.85c.36.36.93.36 1.28 0l1.28-1.28c.36-.36.36-.92 0-1.28L3.54 3c-.36-.36-.92-.36-1.28 0l-1.28 1.27c-.36.36-.36.92 0 1.28zm9.5 6.12L9.48 9.65C9.5 9.77 9.5 9.88 9.5 10c0 1.66 1.34 3 3 3 .12 0 .23 0 .35-.02l2.5 2.5c-.67.33-1.41.5-2.2.5-2.76 0-5-2.24-5-5 0-.79.17-1.53.5-2.2zm5.7-6.41c-.89.6-1.96 1.37-2.3 1.69L15.13 2c.64-.3 1.21-.59 1.69-.82l1.41 1.41zM19 13.5c0-3.59-2.91-6.5-6.5-6.5-.62 0-1.23.09-1.82.23l1.5 1.5c.4-.05.81-.08 1.21-.08 2.76 0 5 2.24 5 5 0 .4-.03.81-.08 1.21l1.5 1.5c.14-.59.23-1.2.23-1.82z"/>';
  }
});

function buildOverlayUrlWithConfig(){
  const effectiveOrigin = getEffectiveOrigin();
  readFormIntoConfig(); // ensure config is current
  const configJson = JSON.stringify(config);
  const base64Cfg = btoa(unescape(encodeURIComponent(configJson)));
  return `${effectiveOrigin}/music-player.html?cfg=${base64Cfg}`;
}


// ==========================================
// SPOTIFY CURRENT TRACK FETCHER
// ==========================================
async function getSpotifyCurrentTrack() {
    // Use the dashboard's real auth helper (fallenoneart_spotify_auth), which also
    // auto-refreshes an expired token — the old localStorage key lookup here never matched.
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
        console.warn('No valid Spotify access token available (not connected or refresh failed).');
        return null;
    }

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // 204 No Content means Spotify is connected, but nothing is currently playing
        if (response.status === 204 || response.status === 205) {
            return { is_playing: false };
        }

        if (!response.ok) {
            throw new Error(`Spotify API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching Spotify track:', error);
        return null;
    }
}
// ============================================
// NEW: DISCORD WEBHOOK NOTIFICATIONS
// ============================================
let isDiscordWebhookVisible = false;
document.getElementById('btnToggleDiscordWebhook').addEventListener('click', ()=>{
  const input = document.getElementById('inputDiscordWebhookUrl');
  const btn = document.getElementById('btnToggleDiscordWebhook');
  const svg = btn.querySelector('svg');

  isDiscordWebhookVisible = !isDiscordWebhookVisible;
  input.type = isDiscordWebhookVisible ? 'text' : 'password';

  if(isDiscordWebhookVisible){
    svg.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
  } else {
    svg.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28L3.46 8.84C2.08 10.29 1 12.04 1 12s1.73 4.39 6 7.5c1.55.84 3.15 1.31 4.8 1.53l3.02 3.02c1.25.125 2.47.1 3.38.084l2.85 2.85c.36.36.93.36 1.28 0l1.28-1.28c.36-.36.36-.92 0-1.28L3.54 3c-.36-.36-.92-.36-1.28 0l-1.28 1.27c-.36.36-.36.92 0 1.28zm9.5 6.12L9.48 9.65C9.5 9.77 9.5 9.88 9.5 10c0 1.66 1.34 3 3 3 .12 0 .23 0 .35-.02l2.5 2.5c-.67.33-1.41.5-2.2.5-2.76 0-5-2.24-5-5 0-.79.17-1.53.5-2.2zm5.7-6.41c-.89.6-1.96 1.37-2.3 1.69L15.13 2c.64-.3 1.21-.59 1.69-.82l1.41 1.41zM19 13.5c0-3.59-2.91-6.5-6.5-6.5-.62 0-1.23.09-1.82.23l1.5 1.5c.4-.05.81-.08 1.21-.08 2.76 0 5 2.24 5 5 0 .4-.03.81-.08 1.21l1.5 1.5c.14-.59.23-1.2.23-1.82z"/>';
  }
});

function loadDiscordConfig(){
  try{
    const raw = localStorage.getItem(LS_DISCORD_KEY);
    if(raw) discordConfig = { ...DEFAULT_DISCORD_CONFIG, ...JSON.parse(raw) };
  }catch(e){}
}
function saveDiscordConfigToStorage(){ localStorage.setItem(LS_DISCORD_KEY, JSON.stringify(discordConfig)); }

function populateDiscordForm(){
  document.getElementById('toggleDiscordEnabled').checked = discordConfig.enabled;
  document.getElementById('inputDiscordWebhookUrl').value = discordConfig.webhookUrl;
  document.getElementById('inputDiscordTemplate').value = discordConfig.template;
  document.getElementById('toggleDiscordArt').checked = discordConfig.includeArt;
  document.getElementById('toggleDiscordLink').checked = discordConfig.includeLink;
  document.getElementById('toggleDiscordDuration').checked = discordConfig.includeDuration;
  document.getElementById('inputDiscordBotUsername').value = discordConfig.botUsername;
  document.getElementById('inputDiscordBotAvatar').value = discordConfig.botAvatarUrl;
  document.getElementById('inputDiscordEmbedColor').value = discordConfig.embedColor;
  document.getElementById('inputDiscordNextSongEmbedColor').value = discordConfig.nextSongEmbedColor;
  document.getElementById('inputDiscordMention').value = discordConfig.mentionText;
  document.getElementById('inputDiscordMinPlaySeconds').value = discordConfig.minPlaySeconds;
  document.getElementById('valDiscordMinPlaySeconds').textContent = discordConfig.minPlaySeconds + 's';
  document.getElementById('toggleNextSongEnabled').checked = discordConfig.nextSongEnabled;
  document.getElementById('inputNextSongMinutes').value = discordConfig.nextSongMinutes;
  document.getElementById('valNextSongMinutes').textContent = discordConfig.nextSongMinutes + ' min';
  document.getElementById('inputNextSongTemplate').value = discordConfig.nextSongTemplate;

  // Pause Song Alert
  document.getElementById('togglePauseSongEnabled').checked = discordConfig.pauseSongEnabled;
  document.getElementById('inputDiscordPauseSongEmbedColor').value = discordConfig.pauseSongEmbedColor;
  document.getElementById('inputPauseSongTemplate').value = discordConfig.pauseSongTemplate;

  // Resume Play Alert
  document.getElementById('toggleResumeSongEnabled').checked = discordConfig.resumeSongEnabled;
  document.getElementById('inputDiscordResumeSongEmbedColor').value = discordConfig.resumeSongEmbedColor;
  document.getElementById('inputResumeSongTemplate').value = discordConfig.resumeSongTemplate;

  // Avatar source toggle (URL vs local upload preview)
  document.getElementById('toggleDiscordAvatarSource').checked = discordConfig.botAvatarSourceType === 'upload';
  updateDiscordAvatarSourceToggle();
  renderAvatarUrlHistory();
  renderAvatarUploadHistory();
  if(discordConfig.botAvatarUpload){
    document.getElementById('discordAvatarUploadZone').style.display = 'none';
    document.getElementById('discordAvatarUploadPreview').classList.remove('hidden');
    document.getElementById('discordAvatarPreviewImg').src = discordConfig.botAvatarUpload;
    document.getElementById('discordAvatarPreviewFilename').textContent = 'Restored upload';
    document.getElementById('discordAvatarPreviewSize').textContent = 'Saved locally';
  }
}

function readDiscordForm(){
  discordConfig.enabled = document.getElementById('toggleDiscordEnabled').checked;
  discordConfig.webhookUrl = document.getElementById('inputDiscordWebhookUrl').value.trim();
  discordConfig.template = document.getElementById('inputDiscordTemplate').value.trim() || DEFAULT_DISCORD_CONFIG.template;
  discordConfig.includeArt = document.getElementById('toggleDiscordArt').checked;
  discordConfig.includeLink = document.getElementById('toggleDiscordLink').checked;
  discordConfig.includeDuration = document.getElementById('toggleDiscordDuration').checked;
  discordConfig.botUsername = document.getElementById('inputDiscordBotUsername').value.trim() || DEFAULT_DISCORD_CONFIG.botUsername;
  discordConfig.botAvatarUrl = document.getElementById('inputDiscordBotAvatar').value.trim();
  discordConfig.botAvatarSourceType = document.getElementById('toggleDiscordAvatarSource').checked ? 'upload' : 'url';
  discordConfig.embedColor = document.getElementById('inputDiscordEmbedColor').value;
  discordConfig.nextSongEmbedColor = document.getElementById('inputDiscordNextSongEmbedColor').value;
  discordConfig.mentionText = document.getElementById('inputDiscordMention').value.trim();
  discordConfig.minPlaySeconds = parseInt(document.getElementById('inputDiscordMinPlaySeconds').value) || 0;
  document.getElementById('valDiscordMinPlaySeconds').textContent = discordConfig.minPlaySeconds + 's';
  discordConfig.nextSongEnabled = document.getElementById('toggleNextSongEnabled').checked;
  discordConfig.nextSongMinutes = parseInt(document.getElementById('inputNextSongMinutes').value) || 5;
  discordConfig.nextSongTemplate = document.getElementById('inputNextSongTemplate').value.trim() || DEFAULT_DISCORD_CONFIG.nextSongTemplate;
  document.getElementById('valNextSongMinutes').textContent = discordConfig.nextSongMinutes + ' min';

  // Pause Song Alert
  discordConfig.pauseSongEnabled = document.getElementById('togglePauseSongEnabled').checked;
  discordConfig.pauseSongEmbedColor = document.getElementById('inputDiscordPauseSongEmbedColor').value;
  discordConfig.pauseSongTemplate = document.getElementById('inputPauseSongTemplate').value.trim() || DEFAULT_DISCORD_CONFIG.pauseSongTemplate;

  // Resume Play Alert
  discordConfig.resumeSongEnabled = document.getElementById('toggleResumeSongEnabled').checked;
  discordConfig.resumeSongEmbedColor = document.getElementById('inputDiscordResumeSongEmbedColor').value;
  discordConfig.resumeSongTemplate = document.getElementById('inputResumeSongTemplate').value.trim() || DEFAULT_DISCORD_CONFIG.resumeSongTemplate;
}

document.querySelectorAll('#panel-settings #toggleDiscordEnabled, #panel-settings #inputDiscordWebhookUrl, #panel-settings #inputDiscordTemplate, #panel-settings #toggleDiscordArt, #panel-settings #toggleDiscordLink, #panel-settings #toggleDiscordDuration, #panel-settings #inputDiscordBotUsername, #panel-settings #inputDiscordBotAvatar, #panel-settings #inputDiscordEmbedColor, #panel-settings #inputDiscordMention, #panel-settings #inputDiscordMinPlaySeconds, #panel-settings #toggleNextSongEnabled, #panel-settings #inputNextSongMinutes, #panel-settings #inputNextSongTemplate, #panel-settings #inputDiscordNextSongEmbedColor, #panel-settings #togglePauseSongEnabled, #panel-settings #inputDiscordPauseSongEmbedColor, #panel-settings #inputPauseSongTemplate, #panel-settings #toggleResumeSongEnabled, #panel-settings #inputDiscordResumeSongEmbedColor, #panel-settings #inputResumeSongTemplate').forEach(el=>{
  el.addEventListener('input', ()=>{ readDiscordForm(); saveDiscordConfigToStorage(); });
  el.addEventListener('change', ()=>{ readDiscordForm(); saveDiscordConfigToStorage(); });
});

// ============================================
// NEW: WEBHOOK BOT AVATAR — URL vs UPLOAD TOGGLE
// ============================================
function updateDiscordAvatarSourceToggle(){
  const isUpload = document.getElementById('toggleDiscordAvatarSource').checked;
  document.getElementById('discordAvatarUrlSection').classList.toggle('hidden', isUpload);
  document.getElementById('discordAvatarUploadSection').classList.toggle('hidden', !isUpload);
}

document.getElementById('toggleDiscordAvatarSource').addEventListener('change', ()=>{
  discordConfig.botAvatarSourceType = document.getElementById('toggleDiscordAvatarSource').checked ? 'upload' : 'url';
  updateDiscordAvatarSourceToggle();
  saveDiscordConfigToStorage();
  showToast(discordConfig.botAvatarSourceType === 'upload'
    ? 'Upload mode — drop an image and it will be hosted automatically.'
    : 'URL mode — paste or reuse a hosted link.');
});

// Track avatar URLs actually typed in, so they show up in history for reuse
document.getElementById('inputDiscordBotAvatar').addEventListener('blur', ()=>{
  const url = document.getElementById('inputDiscordBotAvatar').value.trim();
  if(url) addToAvatarUrlHistory(url);
});

// ---- URL History ----
function loadAvatarUrlHistory(){
  try{
    const raw = localStorage.getItem(LS_DISCORD_AVATAR_URL_HISTORY_KEY);
    avatarUrlHistory = raw ? JSON.parse(raw) : [];
  }catch(e){ avatarUrlHistory = []; }
}
function saveAvatarUrlHistory(){
  try{ localStorage.setItem(LS_DISCORD_AVATAR_URL_HISTORY_KEY, JSON.stringify(avatarUrlHistory)); }catch(e){}
}
function addToAvatarUrlHistory(url){
  if(!url || !url.trim()) return;
  url = url.trim();
  avatarUrlHistory = avatarUrlHistory.filter(item => item.url !== url);
  avatarUrlHistory.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), url, timestamp: Date.now() });
  if(avatarUrlHistory.length > MAX_AVATAR_HISTORY) avatarUrlHistory = avatarUrlHistory.slice(0, MAX_AVATAR_HISTORY);
  saveAvatarUrlHistory();
  renderAvatarUrlHistory();
}
function removeFromAvatarUrlHistory(id){
  avatarUrlHistory = avatarUrlHistory.filter(item => item.id !== id);
  saveAvatarUrlHistory();
  renderAvatarUrlHistory();
  showToast('Removed from URL history');
}
function renderAvatarUrlHistory(){
  const grid = document.getElementById('discordAvatarUrlHistoryGrid');
  const emptyHint = document.getElementById('discordAvatarUrlHistoryEmptyHint');
  if(!grid) return;
  grid.innerHTML = '';
  if(!avatarUrlHistory.length){
    if(emptyHint) emptyHint.style.display = 'block';
    return;
  }
  if(emptyHint) emptyHint.style.display = 'none';
  avatarUrlHistory.forEach(item=>{
    const cell = document.createElement('div');
    cell.className = 'wallpaper-history-item' + (discordConfig.botAvatarUrl === item.url ? ' active' : '');
    cell.title = item.url;
    cell.innerHTML = `<img src="${item.url}" alt="Avatar" loading="lazy" onerror="this.style.opacity='0.15'"><button type="button" class="wallpaper-history-delete" title="Remove from history">✕</button>`;
    cell.addEventListener('click', (e)=>{
      if(e.target.closest('.wallpaper-history-delete')) return;
      document.getElementById('inputDiscordBotAvatar').value = item.url;
      discordConfig.botAvatarUrl = item.url;
      saveDiscordConfigToStorage();
      renderAvatarUrlHistory();
      showToast('Avatar URL applied ✓');
    });
    cell.querySelector('.wallpaper-history-delete').addEventListener('click', (e)=>{
      e.stopPropagation();
      removeFromAvatarUrlHistory(item.id);
    });
    grid.appendChild(cell);
  });
}

// ---- Upload History (preview thumbnails; the actual Discord-facing link lives in URL history) ----
function loadAvatarUploadHistory(){
  try{
    const raw = localStorage.getItem(LS_DISCORD_AVATAR_UPLOAD_HISTORY_KEY);
    avatarUploadHistory = raw ? JSON.parse(raw) : [];
  }catch(e){ avatarUploadHistory = []; }
}
function saveAvatarUploadHistory(){
  try{
    localStorage.setItem(LS_DISCORD_AVATAR_UPLOAD_HISTORY_KEY, JSON.stringify(avatarUploadHistory));
  }catch(e){
    if(avatarUploadHistory.length > 1){
      avatarUploadHistory.pop();
      try{ localStorage.setItem(LS_DISCORD_AVATAR_UPLOAD_HISTORY_KEY, JSON.stringify(avatarUploadHistory)); }catch(e2){
        showToast('Avatar upload history is full — remove some to add more.');
      }
    }
  }
}
function addToAvatarUploadHistory(dataUrl, name, hostedUrl){
  avatarUploadHistory = avatarUploadHistory.filter(item => item.dataUrl !== dataUrl);
  avatarUploadHistory.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), dataUrl, name: name || 'Avatar', hostedUrl: hostedUrl || '', timestamp: Date.now() });
  if(avatarUploadHistory.length > MAX_AVATAR_HISTORY) avatarUploadHistory = avatarUploadHistory.slice(0, MAX_AVATAR_HISTORY);
  saveAvatarUploadHistory();
  renderAvatarUploadHistory();
}
function removeFromAvatarUploadHistory(id){
  avatarUploadHistory = avatarUploadHistory.filter(item => item.id !== id);
  saveAvatarUploadHistory();
  renderAvatarUploadHistory();
  showToast('Removed from upload history');
}
function renderAvatarUploadHistory(){
  const grid = document.getElementById('discordAvatarUploadHistoryGrid');
  const emptyHint = document.getElementById('discordAvatarUploadHistoryEmptyHint');
  if(!grid) return;
  grid.innerHTML = '';
  if(!avatarUploadHistory.length){
    if(emptyHint) emptyHint.style.display = 'block';
    return;
  }
  if(emptyHint) emptyHint.style.display = 'none';
  avatarUploadHistory.forEach(item=>{
    const cell = document.createElement('div');
    cell.className = 'wallpaper-history-item' + (discordConfig.botAvatarUpload === item.dataUrl ? ' active' : '');
    cell.title = item.name;
    cell.innerHTML = `<img src="${item.dataUrl}" alt="${item.name}" loading="lazy"><button type="button" class="wallpaper-history-delete" title="Remove from history">✕</button>`;
    cell.addEventListener('click', (e)=>{
      if(e.target.closest('.wallpaper-history-delete')) return;
      discordConfig.botAvatarUpload = item.dataUrl;
      if(item.hostedUrl){
        discordConfig.botAvatarUrl = item.hostedUrl;
        document.getElementById('inputDiscordBotAvatar').value = item.hostedUrl;
      }
      saveDiscordConfigToStorage();
      document.getElementById('discordAvatarUploadZone').style.display = 'none';
      document.getElementById('discordAvatarUploadPreview').classList.remove('hidden');
      document.getElementById('discordAvatarPreviewImg').src = item.dataUrl;
      document.getElementById('discordAvatarPreviewFilename').textContent = item.name;
      document.getElementById('discordAvatarPreviewSize').textContent = 'From history';
      renderAvatarUploadHistory();
      showToast(item.hostedUrl ? `Applied "${item.name}" — hosted link restored ✓` : `Applied "${item.name}" preview ✓`);
    });
    cell.querySelector('.wallpaper-history-delete').addEventListener('click', (e)=>{
      e.stopPropagation();
      removeFromAvatarUploadHistory(item.id);
    });
    grid.appendChild(cell);
  });
}

// ---- Upload zone: drag/drop + file picker, auto-hosted so Discord can display it ----
async function uploadImageToHost(dataUrl){
  const base64 = dataUrl.split(',')[1];
  const res = await fetch('https://api.imgur.com/3/image', {
    method:'POST',
    headers:{
      'Authorization':'Client-ID ' + IMGUR_CLIENT_ID,
      'Content-Type':'application/json'
    },
    body: JSON.stringify({ image: base64, type:'base64' })
  });
  if(!res.ok) throw new Error('Image host upload failed: ' + res.status);
  const data = await res.json();
  if(!data.success || !data.data?.link) throw new Error('Image host returned no link');
  return data.data.link;
}

function handleDiscordAvatarFile(file){
  if(!file.type.startsWith('image/')){ showToast('Please select an image file.'); return; }
  if(file.size > 5242880){ showToast('File too large (max 5MB)'); return; }
  const reader = new FileReader();
  reader.onload = async (evt)=>{
    const originalDataUrl = evt.target.result;
    const previewDataUrl = await resizeImageDataUrl(originalDataUrl, 512, 0.85);

    discordConfig.botAvatarUpload = previewDataUrl;
    saveDiscordConfigToStorage();
    showDiscordAvatarUploadPreview(file, previewDataUrl);
    showToast('Uploading image so Discord can display it...');

    try{
      const hostedUrl = await uploadImageToHost(previewDataUrl);
      discordConfig.botAvatarUrl = hostedUrl;
      discordConfig.botAvatarSourceType = 'url';
      saveDiscordConfigToStorage();
      document.getElementById('inputDiscordBotAvatar').value = hostedUrl;
      document.getElementById('toggleDiscordAvatarSource').checked = false;
      updateDiscordAvatarSourceToggle();
      addToAvatarUrlHistory(hostedUrl);
      addToAvatarUploadHistory(previewDataUrl, file.name, hostedUrl);
      showToast('Image hosted — Discord will now show it as the bot avatar ✓');
    }catch(err){
      addToAvatarUploadHistory(previewDataUrl, file.name, '');
      showToast('Could not auto-host that image — paste a hosted URL instead (Imgur, Discord CDN, etc).');
    }
  };
  reader.readAsDataURL(file);
}

function showDiscordAvatarUploadPreview(file, dataUrl){
  const zone = document.getElementById('discordAvatarUploadZone');
  const preview = document.getElementById('discordAvatarUploadPreview');
  const img = document.getElementById('discordAvatarPreviewImg');
  const filename = document.getElementById('discordAvatarPreviewFilename');
  const size = document.getElementById('discordAvatarPreviewSize');

  img.src = dataUrl;
  filename.textContent = file.name;
  size.textContent = formatFileSize(file.size);

  zone.style.display = 'none';
  preview.classList.remove('hidden');
}

function clearDiscordAvatarUploadPreview(){
  const zone = document.getElementById('discordAvatarUploadZone');
  const preview = document.getElementById('discordAvatarUploadPreview');
  const fileInput = document.getElementById('inputDiscordAvatarUpload');

  fileInput.value = '';
  discordConfig.botAvatarUpload = '';
  saveDiscordConfigToStorage();

  zone.style.display = 'block';
  preview.classList.add('hidden');
  showToast('Avatar preview cleared');
}

const discordAvatarUploadZone = document.getElementById('discordAvatarUploadZone');
const discordAvatarFileInput = document.getElementById('inputDiscordAvatarUpload');
const discordAvatarUploadClear = document.getElementById('discordAvatarUploadClear');

discordAvatarUploadZone.addEventListener('click', ()=> discordAvatarFileInput.click());

discordAvatarFileInput.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(file) handleDiscordAvatarFile(file);
});

discordAvatarUploadZone.addEventListener('dragover', (e)=>{
  e.preventDefault();
  discordAvatarUploadZone.classList.add('drag-over');
});

discordAvatarUploadZone.addEventListener('dragleave', ()=>{
  discordAvatarUploadZone.classList.remove('drag-over');
});

discordAvatarUploadZone.addEventListener('drop', (e)=>{
  e.preventDefault();
  discordAvatarUploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if(file) handleDiscordAvatarFile(file);
});

discordAvatarUploadClear.addEventListener('click', clearDiscordAvatarUploadPreview);

function buildDiscordEmbed(track){
  const title = track.name || 'Unknown Track';
  const artist = track.artists?.map(a=>a.name).join(', ') || 'Unknown Artist';
  const album = track.album?.name || '';
  const artUrl = track.album?.images?.[0]?.url || '';
  const trackUrl = track.external_urls?.spotify || '';

  const messageText = discordConfig.template
    .replace(/\{title\}/g, title)
    .replace(/\{artist\}/g, artist)
    .replace(/\{album\}/g, album);

  const embed = {
    description: messageText,
    color: 0x7de8c8,
    fields: [],
  };
  if(album) embed.fields.push({ name:'Album', value:album, inline:true });
  if(discordConfig.includeLink && trackUrl) embed.fields.push({ name:'Listen', value:`[Open in Spotify](${trackUrl})`, inline:true });
  if(discordConfig.includeArt && artUrl) embed.thumbnail = { url:artUrl };
  embed.footer = { text:'FallenOneArt Music Player' };

  // Bot name/avatar override, custom embed color, duration field, and optional mention
  if(discordConfig.embedColor){
    const parsedColor = parseInt(discordConfig.embedColor.replace('#',''), 16);
    if(!isNaN(parsedColor)) embed.color = parsedColor;
  }
  if(discordConfig.includeDuration && track.duration_ms){
    const mins = Math.floor(track.duration_ms / 60000);
    const secs = Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2,'0');
    embed.fields.push({ name:'Duration', value:`${mins}:${secs}`, inline:true });
  }

  const payload = { username: discordConfig.botUsername || 'FallenOneArt Music Player', embeds:[embed] };
  // Only a real hosted URL can be sent as avatar_url — a local upload preview is never sent to Discord.
  if(discordConfig.botAvatarSourceType !== 'upload' && discordConfig.botAvatarUrl) payload.avatar_url = discordConfig.botAvatarUrl;
  if(discordConfig.mentionText) payload.content = discordConfig.mentionText;

  return payload;
}

async function postToDiscord(track){
  if(!discordConfig.webhookUrl) return;
  try{
    const res = await fetch(discordConfig.webhookUrl, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(buildDiscordEmbed(track))
    });
    if(!res.ok && res.status !== 204){
      console.error('Discord webhook post failed:', res.status);
    }
  }catch(e){
    console.error('Discord webhook post error:', e);
  }
}

// ============================================
// NEW: "NEXT SONG" WEBHOOK ALERT
// Fires once per track once remaining play time
// on the CURRENT track drops to the configured
// minutes, announcing the NEXT track in queue.
// ============================================
function buildNextSongEmbed(nextTrack, remainingMs){
  const title = nextTrack.name || 'Unknown Track';
  const artist = nextTrack.artists?.map(a=>a.name).join(', ') || 'Unknown Artist';
  const album = nextTrack.album?.name || '';
  const artUrl = nextTrack.album?.images?.[0]?.url || '';
  const trackUrl = nextTrack.external_urls?.spotify || '';
  const mins = Math.max(0, Math.floor(remainingMs / 60000));
  const secs = Math.max(0, Math.floor((remainingMs % 60000) / 1000)).toString().padStart(2,'0');
  const remainingText = `${mins}:${secs}`;

  const messageText = discordConfig.nextSongTemplate
    .replace(/\{title\}/g, title)
    .replace(/\{artist\}/g, artist)
    .replace(/\{album\}/g, album)
    .replace(/\{remaining\}/g, remainingText);

  const embed = { description: messageText, fields: [] };
  if(album) embed.fields.push({ name:'Album', value:album, inline:true });
  if(discordConfig.includeLink && trackUrl) embed.fields.push({ name:'Listen', value:`[Open in Spotify](${trackUrl})`, inline:true });
  if(discordConfig.includeArt && artUrl) embed.thumbnail = { url:artUrl };
  embed.footer = { text:'FallenOneArt Music Player · Up Next' };

if(discordConfig.nextSongEmbedColor){
    const parsedColor = parseInt(discordConfig.nextSongEmbedColor.replace('#',''), 16);
    if(!isNaN(parsedColor)) embed.color = parsedColor;
  }

  const payload = { username: discordConfig.botUsername || 'FallenOneArt Music Player', embeds:[embed] };
  if(discordConfig.botAvatarSourceType !== 'upload' && discordConfig.botAvatarUrl) payload.avatar_url = discordConfig.botAvatarUrl;
  return payload;
}

async function postNextSongToDiscord(nextTrack, remainingMs){
  if(!discordConfig.webhookUrl) return;
  try{
    const res = await fetch(discordConfig.webhookUrl, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(buildNextSongEmbed(nextTrack, remainingMs))
    });
    if(!res.ok && res.status !== 204){
      console.error('Discord next-song webhook post failed:', res.status);
    }
  }catch(e){
    console.error('Discord next-song webhook post error:', e);
  }
}

function checkNextSongAlert(state){
  if(!discordConfig.enabled || !discordConfig.nextSongEnabled || !discordConfig.webhookUrl) return;
  if(!state || !state.item || typeof state.progress_ms !== 'number') return;

  const current = state.item;
  const nextTrack = lastQueueTracks[0];

  // Reset the guard whenever the currently-playing track itself changes
  if(current.id !== nextSongCheckTrackId){
    nextSongCheckTrackId = current.id;
    nextSongAnnouncedForTrackId = null;
  }
  if(!nextTrack || nextSongAnnouncedForTrackId === current.id) return;

  const remainingMs = (current.duration_ms || 0) - state.progress_ms;
  const thresholdMs = (discordConfig.nextSongMinutes || 5) * 60000;
  if(remainingMs > 0 && remainingMs <= thresholdMs){
    nextSongAnnouncedForTrackId = current.id;
    postNextSongToDiscord(nextTrack, remainingMs);
  }
}

// ============================================
// NEW: "PAUSE SONG" WEBHOOK ALERT
// Fires once per track whenever playback is
// detected as paused (is_playing === false),
// using the currently-loaded track's metadata.
// ============================================
function buildPauseSongEmbed(track){
  const title = track.name || 'Unknown Track';
  const artist = track.artists?.map(a=>a.name).join(', ') || 'Unknown Artist';
  const album = track.album?.name || '';
  const artUrl = track.album?.images?.[0]?.url || '';
  const trackUrl = track.external_urls?.spotify || '';

  const messageText = discordConfig.pauseSongTemplate
    .replace(/\{title\}/g, title)
    .replace(/\{artist\}/g, artist)
    .replace(/\{album\}/g, album);

  const embed = { description: messageText, fields: [] };
  if(album) embed.fields.push({ name:'Album', value:album, inline:true });
  if(discordConfig.includeLink && trackUrl) embed.fields.push({ name:'Listen', value:`[Open in Spotify](${trackUrl})`, inline:true });
  if(discordConfig.includeArt && artUrl) embed.thumbnail = { url:artUrl };
  embed.footer = { text:'FallenOneArt Music Player · Paused' };

  if(discordConfig.pauseSongEmbedColor){
    const parsedColor = parseInt(discordConfig.pauseSongEmbedColor.replace('#',''), 16);
    if(!isNaN(parsedColor)) embed.color = parsedColor;
  }

  const payload = { username: discordConfig.botUsername || 'FallenOneArt Music Player', embeds:[embed] };
  if(discordConfig.botAvatarSourceType !== 'upload' && discordConfig.botAvatarUrl) payload.avatar_url = discordConfig.botAvatarUrl;
  return payload;
}

async function postPauseSongToDiscord(track){
  if(!discordConfig.webhookUrl) return;
  try{
    const res = await fetch(discordConfig.webhookUrl, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(buildPauseSongEmbed(track))
    });
    if(!res.ok && res.status !== 204){
      console.error('Discord pause-song webhook post failed:', res.status);
    }
  }catch(e){
    console.error('Discord pause-song webhook post error:', e);
  }
}

function checkPauseSongAlert(state){
  if(!discordConfig.enabled || !discordConfig.pauseSongEnabled || !discordConfig.webhookUrl) return;
  if(!state || !state.item) return;

  const track = state.item;
  if(state.is_playing){
    // Track is playing again; allow a future pause on this same track to re-fire.
    if(pauseSongAnnouncedForTrackId === track.id) pauseSongAnnouncedForTrackId = null;
    return;
  }
  if(pauseSongAnnouncedForTrackId === track.id) return;

  pauseSongAnnouncedForTrackId = track.id;
  postPauseSongToDiscord(track);
}

// ============================================
// NEW: "RESUME PLAY" WEBHOOK ALERT
// Fires once each time playback transitions from
// paused (is_playing === false) to playing
// (is_playing === true), using the currently
// loaded track's metadata at the moment it resumes.
//
// FIX: Spotify's /v1/me/player endpoint can return
// an empty/no-content response (state === null) when
// a track has been paused for a while and the device
// goes idle from Spotify's point of view. Previously
// that caused wasPlayingLastForResume to be reset to
// null, which broke the paused -> playing transition
// check the next time a real state came back. Now we
// simply skip the check when state is temporarily
// unavailable and keep the last known playing state,
// instead of wiping it out.
// ============================================
function buildResumeSongEmbed(track){
  const title = track.name || 'Unknown Track';
  const artist = track.artists?.map(a=>a.name).join(', ') || 'Unknown Artist';
  const album = track.album?.name || '';
  const artUrl = track.album?.images?.[0]?.url || '';
  const trackUrl = track.external_urls?.spotify || '';

  const messageText = discordConfig.resumeSongTemplate
    .replace(/\{title\}/g, title)
    .replace(/\{artist\}/g, artist)
    .replace(/\{album\}/g, album);

  const embed = { description: messageText, fields: [] };
  if(album) embed.fields.push({ name:'Album', value:album, inline:true });
  if(discordConfig.includeLink && trackUrl) embed.fields.push({ name:'Listen', value:`[Open in Spotify](${trackUrl})`, inline:true });
  if(discordConfig.includeArt && artUrl) embed.thumbnail = { url:artUrl };
  embed.footer = { text:'FallenOneArt Music Player · Resumed' };

  if(discordConfig.resumeSongEmbedColor){
    const parsedColor = parseInt(discordConfig.resumeSongEmbedColor.replace('#',''), 16);
    if(!isNaN(parsedColor)) embed.color = parsedColor;
  }

  const payload = { username: discordConfig.botUsername || 'FallenOneArt Music Player', embeds:[embed] };
  if(discordConfig.botAvatarSourceType !== 'upload' && discordConfig.botAvatarUrl) payload.avatar_url = discordConfig.botAvatarUrl;
  return payload;
}

async function postResumeSongToDiscord(track){
  if(!discordConfig.webhookUrl) return;
  try{
    const res = await fetch(discordConfig.webhookUrl, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(buildResumeSongEmbed(track))
    });
    if(!res.ok && res.status !== 204){
      console.error('Discord resume-song webhook post failed:', res.status);
    }
  }catch(e){
    console.error('Discord resume-song webhook post error:', e);
  }
}

function checkResumeSongAlert(state){
  if(!discordConfig.enabled || !discordConfig.resumeSongEnabled || !discordConfig.webhookUrl) return;
  if(!state || !state.item){
    // Spotify can return an empty player state during a long pause (device
    // goes idle from Spotify's perspective). Don't wipe out what we last knew —
    // just wait for the next poll that actually has data. Resetting to null
    // here was the bug: it broke the paused -> playing transition check below
    // once real data came back after a long pause.
    return;
  }

  const track = state.item;
  const isPlaying = !!state.is_playing;

  // Only fire the moment we detect a paused -> playing transition, never on first load.
  if(wasPlayingLastForResume === false && isPlaying){
    postResumeSongToDiscord(track);
  }

  wasPlayingLastForResume = isPlaying;
}

let pendingAnnounceTimer = null;
let pendingAnnounceTrackId = null;
let lastTrackData = null;

function maybeAnnounceTrack(track){
  lastTrackData = track; // keep the latest track available for reference
  if(!track || !track.id) return;
  if(track.id === lastAnnouncedTrackId) return;
  if(pendingAnnounceTrackId === track.id) return; // already waiting on this track's skip-guard timer

  const discordActive = discordConfig.enabled && discordConfig.webhookUrl;
  const twitchActive = twitchConfig.autoPostEnabled && twitchWs && twitchWs.readyState === WebSocket.OPEN;
  if(!discordActive && !twitchActive) return;

  const delayMs = (discordConfig.minPlaySeconds || 0) * 1000; // shared skip-guard delay
  if(delayMs <= 0){
    lastAnnouncedTrackId = track.id;
    if(discordActive) postToDiscord(track);
    if(twitchActive) postNowPlayingToTwitchChat(track);
    return;
  }

  clearTimeout(pendingAnnounceTimer);
  pendingAnnounceTrackId = track.id;
  pendingAnnounceTimer = setTimeout(()=>{
    if(currentTrackId === track.id){
      lastAnnouncedTrackId = track.id;
      if(discordActive) postToDiscord(track);
      if(twitchActive) postNowPlayingToTwitchChat(track);
    }
    pendingAnnounceTrackId = null;
  }, delayMs);
}

function loadConfig(){try{const raw = localStorage.getItem(LS_CONFIG_KEY);if(raw) config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) }}catch(e){}}
function loadPreviewOpacity(){try{const saved = localStorage.getItem(LS_PREVIEW_OPACITY_KEY);if(saved) previewOpacity = parseFloat(saved)}catch(e){}}
function savePreviewOpacity(){localStorage.setItem(LS_PREVIEW_OPACITY_KEY, previewOpacity.toString())}
function applyPreviewOpacity(){document.documentElement.style.setProperty('--preview-opacity', previewOpacity);document.getElementById('inputPreviewOpacity').value = previewOpacity;document.getElementById('valPreviewOpacity').textContent = (previewOpacity * 100).toFixed(0) + '%'}

function populateForm(){
  document.getElementById('toggleShowContainerBackground').checked = config.showContainerBackground;
  document.getElementById('inputTitleColor').value = config.titleColor;
  document.getElementById('inputArtistColor').value = config.artistColor;
  document.getElementById('inputAlbumColor').value = config.albumColor;
  document.getElementById('inputAccentPrimary').value = config.accentPrimary;
  document.getElementById('inputAccentSecondary').value = config.accentSecondary;
  document.getElementById('inputTimeColor').value = config.timeColor;
  document.getElementById('inputGlassOpacity').value = config.glassOpacity;
  document.getElementById('inputBlurStrength').value = config.blurStrength;
  document.getElementById('inputCornerRadius').value = config.cornerRadius;
  document.getElementById('inputGlowIntensity').value = config.glowIntensity;
  document.getElementById('inputPulseSpeed').value = config.pulseSpeed;
  document.getElementById('inputTextScale').value = config.textScale;
  document.getElementById('inputFontPairing').value = config.fontPairing;
  document.getElementById('inputArtRevealStyle').value = config.artRevealStyle;
  document.getElementById('toggleMarqueeEnabled').checked = config.marqueeEnabled;
  document.getElementById('inputMarqueeSpeed').value = config.marqueeSpeed;
  document.getElementById('toggleShowScrubberDot').checked = config.showScrubberDot;
  document.getElementById('toggleShowArtBadge').checked = config.showArtBadge;
  document.getElementById('toggleArtistItalic').checked = config.artistItalic;
  document.getElementById('toggleShowArtist').checked = config.showArtist;
  document.getElementById('toggleShowAlbum').checked = config.showAlbum;
  document.getElementById('toggleShowProgressBar').checked = config.showProgressBar;
  document.getElementById('toggleShowTimecode').checked = config.showTimecode;
  document.getElementById('toggleShowStartTime').checked = config.showStartTime;
  document.getElementById('toggleShowEqualizer').checked = config.showEqualizer;
  document.getElementById('toggleShowBranding').checked = config.showBranding;
  document.getElementById('toggleShowMetadataPill').checked = config.showMetadataPill;
  document.getElementById('toggleMetadataBackground').checked = config.metadataBackground;
  document.getElementById('inputMetadataOpacity').value = config.metadataOpacity;
  document.getElementById('toggleProgressBackground').checked = config.progressBackground;
  document.getElementById('inputIdleBehavior').value = config.idleBehavior;
  document.getElementById('inputIdleMessage').value = config.idleMessage;
  document.getElementById('inputPollInterval').value = config.pollInterval;
  document.getElementById('inputCompactArtSize').value = config.compactArtSize;
  document.getElementById('inputCompactRightGap').value = config.compactRightGap;
  document.getElementById('inputCompactTitleSize').value = config.compactTitleSize;
  document.getElementById('inputCompactArtistSize').value = config.compactArtistSize;
  document.getElementById('inputCompactEqBarsHeight').value = config.compactEqBarsHeight;
  document.getElementById('inputCompactEqBarWidth').value = config.compactEqBarWidth;
  document.getElementById('inputCompactProgressHeight').value = config.compactProgressHeight;
  updateChoiceCards();
  updateRangeLabels();
}

function loadDashTheme(){try{const raw = localStorage.getItem(LS_DASH_THEME_KEY);if(raw) dashTheme = { ...DEFAULT_DASH_THEME, ...JSON.parse(raw) }}catch(e){}}
function saveDashTheme(){localStorage.setItem(LS_DASH_THEME_KEY, JSON.stringify(dashTheme))}

// ============================================
// NEW: WALLPAPER HISTORY
// ============================================
function loadWallpaperHistory(){
  try{
    const raw = localStorage.getItem(LS_WALLPAPER_HISTORY_KEY);
    wallpaperHistory = raw ? JSON.parse(raw) : [];
  }catch(e){ wallpaperHistory = []; }
}

function saveWallpaperHistory(){
  try{
    localStorage.setItem(LS_WALLPAPER_HISTORY_KEY, JSON.stringify(wallpaperHistory));
  }catch(e){
    // Likely hit localStorage quota - drop the oldest entry and retry once
    if(wallpaperHistory.length > 1){
      wallpaperHistory.pop();
      try{ localStorage.setItem(LS_WALLPAPER_HISTORY_KEY, JSON.stringify(wallpaperHistory)); }catch(e2){
        showToast('Wallpaper history is full — remove some to add more.');
      }
    }
  }
}

function resizeImageDataUrl(dataUrl, maxDim, quality){
  return new Promise((resolve)=>{
    const img = new Image();
    img.onload = ()=>{
      let width = img.width;
      let height = img.height;
      if(width > maxDim || height > maxDim){
        if(width > height){ height = Math.round(height * (maxDim / width)); width = maxDim; }
        else{ width = Math.round(width * (maxDim / height)); height = maxDim; }
      }
      try{
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      }catch(e){
        resolve(dataUrl);
      }
    };
    img.onerror = ()=> resolve(dataUrl);
    img.src = dataUrl;
  });
}

function addToWallpaperHistory(dataUrl, name){
  // Avoid storing an exact duplicate twice — move it to the front instead
  wallpaperHistory = wallpaperHistory.filter(item => item.dataUrl !== dataUrl);
  wallpaperHistory.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    dataUrl,
    name: name || 'Wallpaper',
    timestamp: Date.now()
  });
  if(wallpaperHistory.length > MAX_WALLPAPER_HISTORY){
    wallpaperHistory = wallpaperHistory.slice(0, MAX_WALLPAPER_HISTORY);
  }
  saveWallpaperHistory();
  renderWallpaperHistory();
}

function renderWallpaperHistory(){
  const grid = document.getElementById('wallpaperHistoryGrid');
  const emptyHint = document.getElementById('wallpaperHistoryEmptyHint');
  if(!grid) return;
  grid.innerHTML = '';
  if(!wallpaperHistory.length){
    if(emptyHint) emptyHint.style.display = 'block';
    return;
  }
  if(emptyHint) emptyHint.style.display = 'none';
  wallpaperHistory.forEach(item=>{
    const cell = document.createElement('div');
    cell.className = 'wallpaper-history-item' + (dashTheme.bgImageUpload === item.dataUrl ? ' active' : '');
    cell.title = item.name;
    cell.innerHTML = `<img src="${item.dataUrl}" alt="${item.name}" loading="lazy"><button type="button" class="wallpaper-history-delete" title="Remove from history">✕</button>`;
    cell.addEventListener('click', (e)=>{
      if(e.target.closest('.wallpaper-history-delete')) return;
      applyWallpaperFromHistory(item);
    });
    cell.querySelector('.wallpaper-history-delete').addEventListener('click', (e)=>{
      e.stopPropagation();
      removeFromWallpaperHistory(item.id);
    });
    grid.appendChild(cell);
  });
}

async function applyWallpaperFromHistory(item){
  dashTheme.bgImageUpload = item.dataUrl;
  dashTheme.bgImageSourceType = 'upload';
  document.getElementById('toggleBgImageSource').checked = true;
  updateImageSourceToggle();

  const colors = await extractImageColors(item.dataUrl);
  if(colors.length >= 2){
    dashTheme.gradColor1 = colors[0];
    dashTheme.gradColor2 = colors[colors.length > 1 ? 1 : 0];
    dashTheme.navTextColor = colors[colors.length > 2 ? 2 : colors[0]];
    document.getElementById('inputDashGradColor1').value = dashTheme.gradColor1;
    document.getElementById('inputDashGradColor2').value = dashTheme.gradColor2;
    document.getElementById('inputDashNavTextColor').value = dashTheme.navTextColor;
  }

  applyDashTheme();
  saveDashTheme();
  renderWallpaperHistory();

  // Mirror it in the upload preview card so it's clear which wallpaper is live
  document.getElementById('uploadZone').style.display = 'none';
  document.getElementById('uploadPreview').classList.remove('hidden');
  document.getElementById('previewImg').src = item.dataUrl;
  document.getElementById('previewFilename').textContent = item.name;
  document.getElementById('previewSize').textContent = 'From history';

  showToast(`Applied "${item.name}" ✓`);
}

function removeFromWallpaperHistory(id){
  wallpaperHistory = wallpaperHistory.filter(item => item.id !== id);
  saveWallpaperHistory();
  renderWallpaperHistory();
  showToast('Removed from wallpaper history');
}

function hexToRgbTriplet(hex){
  const clean = (hex || '#ffffff').replace('#','');
  const full = clean.length === 3 ? clean.split('').map(c=>c+c).join('') : clean;
  const r = parseInt(full.substring(0,2), 16) || 255;
  const g = parseInt(full.substring(2,4), 16) || 255;
  const b = parseInt(full.substring(4,6), 16) || 255;
  return `${r}, ${g}, ${b}`;
}

function applyDashTheme(){
  // Root CSS variables for dashboard theme
  document.documentElement.style.setProperty('--nav-text-color', dashTheme.navTextColor);
  document.documentElement.style.setProperty('--text-primary', dashTheme.primaryText);
  document.documentElement.style.setProperty('--text-secondary', dashTheme.secondaryText);
  document.documentElement.style.setProperty('--text-tertiary', dashTheme.tertiaryText);
  document.documentElement.style.setProperty('--dash-panel-opacity', dashTheme.panelOpacity);
  document.documentElement.style.setProperty('--dash-panel-color-rgb', hexToRgbTriplet(dashTheme.panelColor));
  document.documentElement.style.setProperty('--dash-border-opacity', dashTheme.borderOpacity);
  document.documentElement.style.setProperty('--dash-panel-border-rgb', hexToRgbTriplet(dashTheme.panelBorder));
  document.documentElement.style.setProperty('--dash-blur', dashTheme.blurStrength + 'px');
  document.documentElement.style.setProperty('--dash-glow-intensity', dashTheme.glowIntensity);
  document.documentElement.style.setProperty('--dash-active-glow', dashTheme.sidebarGlow
    ? `0 0 ${(20 * dashTheme.glowIntensity).toFixed(0)}px rgba(125,232,200,${(0.3 * dashTheme.glowIntensity).toFixed(2)})`
    : 'none');
  document.documentElement.style.setProperty('--dash-corner-radius', dashTheme.cornerRadius + 'px');
  document.documentElement.style.setProperty('--dash-sidebar-opacity', dashTheme.sidebarOpacity);
  
  const speedMap = { instant:'0s', fast:'0.1s', normal:'0.25s', slow:'0.5s', leisurely:'0.8s' };
  document.documentElement.style.setProperty('--dash-transition-speed', speedMap[dashTheme.transitionSpeed] || '0.25s');

  // Background
  const body = document.body;
  if(dashTheme.bgType === 'solid'){body.style.background = dashTheme.bgColor1}
  else if(dashTheme.bgType === 'gradient'){body.style.background = `linear-gradient(${dashTheme.gradAngle}deg, ${dashTheme.gradColor1}33, ${dashTheme.gradColor2}33), var(--bg-deep)`}
  else if(dashTheme.bgType === 'image'){
    const bgSource = dashTheme.bgImageSourceType === 'upload' && dashTheme.bgImageUpload ? dashTheme.bgImageUpload : dashTheme.bgImageUrl;
    if(bgSource){
      const posMap = {cover:'background-size:cover; background-repeat:no-repeat; background-position:center;',contain:'background-size:contain; background-repeat:no-repeat; background-position:center;',center:'background-size:auto; background-repeat:no-repeat; background-position:center;',repeat:'background-size:auto; background-repeat:repeat; background-position:top left;'};
      body.setAttribute('style', `background-image:url('${bgSource}'); ${posMap[dashTheme.bgPosition] || posMap.cover}; transition: background-color 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), background-image 0.8s ease;`)
    }
  }
  document.querySelectorAll('[data-dash-choice]').forEach(card=>{card.classList.toggle('selected', dashTheme[card.dataset.dashChoice] === card.dataset.value)});
  document.getElementById('fieldBgSolid').style.display = dashTheme.bgType === 'solid' ? 'block' : 'none';
  document.getElementById('fieldBgGradient').style.display = dashTheme.bgType === 'gradient' ? 'block' : 'none';
  document.getElementById('fieldBgImage').classList.toggle('hidden', dashTheme.bgType !== 'image');
  updateImageSourceToggle();
  renderWallpaperHistory();
}

function populateDashThemeForm(){
  document.getElementById('inputDashBgColor1').value = dashTheme.bgColor1;
  document.getElementById('inputDashGradColor1').value = dashTheme.gradColor1;
  document.getElementById('inputDashGradColor2').value = dashTheme.gradColor2;
  document.getElementById('inputDashGradAngle').value = dashTheme.gradAngle;
  document.getElementById('valDashGradAngle').textContent = dashTheme.gradAngle + '°';
  document.getElementById('inputDashBgImageUrl').value = dashTheme.bgImageUrl;
  document.getElementById('inputDashBgPosition').value = dashTheme.bgPosition;
  document.getElementById('inputDashNavTextColor').value = dashTheme.navTextColor;
  document.getElementById('inputDashPrimaryText').value = dashTheme.primaryText;
  document.getElementById('inputDashSecondaryText').value = dashTheme.secondaryText;
  document.getElementById('inputDashTertiaryText').value = dashTheme.tertiaryText;
  document.getElementById('inputDashPanelColor').value = dashTheme.panelColor;
  document.getElementById('inputDashPanelOpacity').value = dashTheme.panelOpacity;
  document.getElementById('valDashPanelOpacity').textContent = (dashTheme.panelOpacity * 100).toFixed(0) + '%';
  document.getElementById('inputDashPanelBorder').value = dashTheme.panelBorder;
  document.getElementById('inputDashBorderOpacity').value = dashTheme.borderOpacity;
  document.getElementById('valDashBorderOpacity').textContent = (dashTheme.borderOpacity * 100).toFixed(1) + '%';
  document.getElementById('inputDashAccent1').value = dashTheme.accent1;
  document.getElementById('inputDashAccent2').value = dashTheme.accent2;
  document.getElementById('inputDashBlur').value = dashTheme.blurStrength;
  document.getElementById('valDashBlur').textContent = dashTheme.blurStrength + 'px';
  document.getElementById('inputDashGlowIntensity').value = dashTheme.glowIntensity;
  document.getElementById('valDashGlowIntensity').textContent = (dashTheme.glowIntensity * 100).toFixed(0) + '%';
  document.getElementById('inputDashCornerRadius').value = dashTheme.cornerRadius;
  document.getElementById('valDashCornerRadius').textContent = dashTheme.cornerRadius + 'px';
  document.getElementById('inputDashSidebarOpacity').value = dashTheme.sidebarOpacity;
  document.getElementById('valDashSidebarOpacity').textContent = (dashTheme.sidebarOpacity * 100).toFixed(0) + '%';
  document.getElementById('toggleDashSidebarGlow').checked = dashTheme.sidebarGlow;
  document.getElementById('inputDashTransitionSpeed').value = dashTheme.transitionSpeed;
  document.getElementById('toggleBgImageSource').checked = dashTheme.bgImageSourceType === 'upload';
  updateImageSourceToggle();
}

function updateImageSourceToggle(){
  const isUpload = document.getElementById('toggleBgImageSource').checked;
  document.getElementById('bgImageUrlSection').classList.toggle('hidden', isUpload);
  document.getElementById('bgImageUploadSection').classList.toggle('hidden', !isUpload);
}

document.getElementById('toggleBgImageSource').addEventListener('change', ()=>{
  dashTheme.bgImageSourceType = document.getElementById('toggleBgImageSource').checked ? 'upload' : 'url';
  updateImageSourceToggle();
  applyDashTheme();
  saveDashTheme();
  showToast('Image source toggled ✓');
});

function formatFileSize(bytes){
  if(bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function extractImageColors(dataUrl){
  return new Promise((resolve)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=>{
      try{
        const canvas = document.createElement('canvas');
        canvas.width = 150;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 150, 150);
        
        const imageData = ctx.getImageData(0, 0, 150, 150);
        const data = imageData.data;
        
        const colorMap = {};
        for(let i = 0; i < data.length; i += 4){
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const a = data[i+3];
          if(a < 125) continue;
          
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if(brightness < 30 || brightness > 230) continue;
          
          const hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
          colorMap[hex] = (colorMap[hex] || 0) + 1;
        }
        
        const sorted = Object.entries(colorMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(entry => entry[0]);
        
        resolve(sorted);
      }catch(e){
        resolve(['#7de8c8', '#c8a2ff']);
      }
    };
    img.onerror = ()=> resolve(['#7de8c8', '#c8a2ff']);
    img.src = dataUrl;
  });
}

function handleFile(file){
  if(!file.type.startsWith('image/')){showToast('Please select an image file.');return}
  if(file.size > 5242880){showToast('File too large (max 5MB)');return}
  const reader = new FileReader();
  reader.onload = async (evt)=>{
    const originalDataUrl = evt.target.result;
    // Resize down before storing — keeps localStorage usage sane so history can hold several wallpapers
    const storedDataUrl = await resizeImageDataUrl(originalDataUrl, 1600, 0.82);

    dashTheme.bgImageUpload = storedDataUrl;
    dashTheme.bgImageSourceType = 'upload';
    
    const colors = await extractImageColors(storedDataUrl);
    if(colors.length >= 2){
      dashTheme.gradColor1 = colors[0];
      dashTheme.gradColor2 = colors[colors.length > 1 ? 1 : 0];
      dashTheme.navTextColor = colors[colors.length > 2 ? 2 : colors[0]];
      
      document.getElementById('inputDashGradColor1').value = dashTheme.gradColor1;
      document.getElementById('inputDashGradColor2').value = dashTheme.gradColor2;
      document.getElementById('inputDashNavTextColor').value = dashTheme.navTextColor;
      
      showToast('Colors extracted & applied ✓');
    }
    
    document.getElementById('toggleBgImageSource').checked = true;
    updateImageSourceToggle();
    applyDashTheme();
    saveDashTheme();
    showUploadPreview(file, storedDataUrl);
    addToWallpaperHistory(storedDataUrl, file.name);
  };
  reader.readAsDataURL(file);
}

function showUploadPreview(file, dataUrl){
  const zone = document.getElementById('uploadZone');
  const preview = document.getElementById('uploadPreview');
  const img = document.getElementById('previewImg');
  const filename = document.getElementById('previewFilename');
  const size = document.getElementById('previewSize');
  
  img.src = dataUrl;
  filename.textContent = file.name;
  size.textContent = formatFileSize(file.size);
  
  zone.style.display = 'none';
  preview.classList.remove('hidden');
}

function clearUploadPreview(){
  const zone = document.getElementById('uploadZone');
  const preview = document.getElementById('uploadPreview');
  const fileInput = document.getElementById('inputDashBgImageUpload');
  
  fileInput.value = '';
  dashTheme.bgImageUpload = '';
  applyDashTheme();
  saveDashTheme();
  
  zone.style.display = 'block';
  preview.classList.add('hidden');
  showToast('Wallpaper cleared');
}

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('inputDashBgImageUpload');
const uploadClear = document.getElementById('uploadClear');

uploadZone.addEventListener('click', ()=> fileInput.click());

fileInput.addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(file) handleFile(file);
});

uploadZone.addEventListener('dragover', (e)=>{
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', ()=>{
  uploadZone.classList.remove('drag-over');
});

uploadZone.addEventListener('drop', (e)=>{
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if(file) handleFile(file);
});

uploadClear.addEventListener('click', clearUploadPreview);
// ==========================================
// TWITCH CHAT BOT INTEGRATION
// ==========================================

// --- LOAD SAVED CREDENTIALS ON PAGE LOAD ---
const inputTwitchChannel = document.getElementById('inputTwitchChannel');
const inputBotUsername = document.getElementById('inputBotUsername');
const inputBotToken = document.getElementById('inputBotToken');

if (inputTwitchChannel) inputTwitchChannel.value = localStorage.getItem('twitchChannelName') || '';
if (inputBotUsername) inputBotUsername.value = localStorage.getItem('twitchBotUsername') || '';
if (inputBotToken) inputBotToken.value = localStorage.getItem('twitchBotToken') || '';


// 1. Show/Hide Twitch Bot Token
const botTokenInput = document.getElementById('inputBotToken');
const btnToggleBotToken = document.getElementById('btnToggleBotToken');

if (btnToggleBotToken && botTokenInput) {
    btnToggleBotToken.addEventListener('click', () => {
        if (botTokenInput.type === 'password') {
            botTokenInput.type = 'text';
            btnToggleBotToken.style.opacity = '1'; 
        } else {
            botTokenInput.type = 'password';
            btnToggleBotToken.style.opacity = '0.7';
        }
    });
}

// ============================================
// NEW: TWITCH AUTO-POST (fires on track change, mirrors Discord)
// ============================================
const LS_TWITCH_CONFIG_KEY = 'fallenoneart_twitch_autopost_config';
const DEFAULT_TWITCH_CONFIG = {
  autoPostEnabled: false,
  template: '🎵 Now Playing: {title} by {artist} {url}',
  nextSongEnabled: false,
  nextSongMinutes: 5,
  nextSongTemplate: '⏭️ Coming up next: {title} by {artist} {url}',
  pauseEnabled: false,
  pauseTemplate: '⏸️ Paused: {title} by {artist}',
  resumeEnabled: false,
  resumeTemplate: '▶️ Resumed: {title} by {artist}'
};
let twitchConfig = { ...DEFAULT_TWITCH_CONFIG };
let twitchChannelNameConnected = null;

function loadTwitchConfig(){
  try{
    const raw = localStorage.getItem(LS_TWITCH_CONFIG_KEY);
    if(raw) twitchConfig = { ...DEFAULT_TWITCH_CONFIG, ...JSON.parse(raw) };
  }catch(e){}
}
function saveTwitchConfigToStorage(){ localStorage.setItem(LS_TWITCH_CONFIG_KEY, JSON.stringify(twitchConfig)); }

function populateTwitchForm(){
  const toggleEl = document.getElementById('toggleTwitchAutoPost');
  const templateEl = document.getElementById('inputTwitchTemplate');
  if(toggleEl) toggleEl.checked = twitchConfig.autoPostEnabled;
  if(templateEl) templateEl.value = twitchConfig.template;

  const nextSongToggleEl = document.getElementById('toggleTwitchNextSongEnabled');
  const nextSongMinutesEl = document.getElementById('inputTwitchNextSongMinutes');
  const nextSongTemplateEl = document.getElementById('inputTwitchNextSongTemplate');
  if(nextSongToggleEl) nextSongToggleEl.checked = twitchConfig.nextSongEnabled;
  if(nextSongMinutesEl) nextSongMinutesEl.value = twitchConfig.nextSongMinutes;
  const nextSongMinutesValEl = document.getElementById('valTwitchNextSongMinutes');
  if(nextSongMinutesValEl) nextSongMinutesValEl.textContent = twitchConfig.nextSongMinutes + ' min';
  if(nextSongTemplateEl) nextSongTemplateEl.value = twitchConfig.nextSongTemplate;

  const pauseToggleEl = document.getElementById('toggleTwitchPauseEnabled');
  const pauseTemplateEl = document.getElementById('inputTwitchPauseTemplate');
  if(pauseToggleEl) pauseToggleEl.checked = twitchConfig.pauseEnabled;
  if(pauseTemplateEl) pauseTemplateEl.value = twitchConfig.pauseTemplate;

  const resumeToggleEl = document.getElementById('toggleTwitchResumeEnabled');
  const resumeTemplateEl = document.getElementById('inputTwitchResumeTemplate');
  if(resumeToggleEl) resumeToggleEl.checked = twitchConfig.resumeEnabled;
  if(resumeTemplateEl) resumeTemplateEl.value = twitchConfig.resumeTemplate;
}

function readTwitchForm(){
  const toggleEl = document.getElementById('toggleTwitchAutoPost');
  const templateEl = document.getElementById('inputTwitchTemplate');
  if(toggleEl) twitchConfig.autoPostEnabled = toggleEl.checked;
  if(templateEl) twitchConfig.template = templateEl.value.trim() || DEFAULT_TWITCH_CONFIG.template;

  const nextSongToggleEl = document.getElementById('toggleTwitchNextSongEnabled');
  const nextSongMinutesEl = document.getElementById('inputTwitchNextSongMinutes');
  const nextSongTemplateEl = document.getElementById('inputTwitchNextSongTemplate');
  if(nextSongToggleEl) twitchConfig.nextSongEnabled = nextSongToggleEl.checked;
  if(nextSongMinutesEl){
    twitchConfig.nextSongMinutes = parseInt(nextSongMinutesEl.value) || 5;
    const nextSongMinutesValEl = document.getElementById('valTwitchNextSongMinutes');
    if(nextSongMinutesValEl) nextSongMinutesValEl.textContent = twitchConfig.nextSongMinutes + ' min';
  }
  if(nextSongTemplateEl) twitchConfig.nextSongTemplate = nextSongTemplateEl.value.trim() || DEFAULT_TWITCH_CONFIG.nextSongTemplate;

  const pauseToggleEl = document.getElementById('toggleTwitchPauseEnabled');
  const pauseTemplateEl = document.getElementById('inputTwitchPauseTemplate');
  if(pauseToggleEl) twitchConfig.pauseEnabled = pauseToggleEl.checked;
  if(pauseTemplateEl) twitchConfig.pauseTemplate = pauseTemplateEl.value.trim() || DEFAULT_TWITCH_CONFIG.pauseTemplate;

  const resumeToggleEl = document.getElementById('toggleTwitchResumeEnabled');
  const resumeTemplateEl = document.getElementById('inputTwitchResumeTemplate');
  if(resumeToggleEl) twitchConfig.resumeEnabled = resumeToggleEl.checked;
  if(resumeTemplateEl) twitchConfig.resumeTemplate = resumeTemplateEl.value.trim() || DEFAULT_TWITCH_CONFIG.resumeTemplate;
}

// Wire up listeners only if the fields exist in the HTML (added per the setup instructions)
if(document.getElementById('toggleTwitchAutoPost')){
  document.getElementById('toggleTwitchAutoPost').addEventListener('change', ()=>{ readTwitchForm(); saveTwitchConfigToStorage(); });
}
if(document.getElementById('inputTwitchTemplate')){
  document.getElementById('inputTwitchTemplate').addEventListener('input', ()=>{ readTwitchForm(); saveTwitchConfigToStorage(); });
}
if(document.getElementById('toggleTwitchNextSongEnabled')){
  document.getElementById('toggleTwitchNextSongEnabled').addEventListener('change', ()=>{ readTwitchForm(); saveTwitchConfigToStorage(); });
}
if(document.getElementById('inputTwitchNextSongMinutes')){
  document.getElementById('inputTwitchNextSongMinutes').addEventListener('input', ()=>{ readTwitchForm(); saveTwitchConfigToStorage(); });
}
if(document.getElementById('inputTwitchNextSongTemplate')){
  document.getElementById('inputTwitchNextSongTemplate').addEventListener('input', ()=>{ readTwitchForm(); saveTwitchConfigToStorage(); });
}
if(document.getElementById('toggleTwitchPauseEnabled')){
  document.getElementById('toggleTwitchPauseEnabled').addEventListener('change', ()=>{ readTwitchForm(); saveTwitchConfigToStorage(); });
}
if(document.getElementById('inputTwitchPauseTemplate')){
  document.getElementById('inputTwitchPauseTemplate').addEventListener('input', ()=>{ readTwitchForm(); saveTwitchConfigToStorage(); });
}
if(document.getElementById('toggleTwitchResumeEnabled')){
  document.getElementById('toggleTwitchResumeEnabled').addEventListener('change', ()=>{ readTwitchForm(); saveTwitchConfigToStorage(); });
}
if(document.getElementById('inputTwitchResumeTemplate')){
  document.getElementById('inputTwitchResumeTemplate').addEventListener('input', ()=>{ readTwitchForm(); saveTwitchConfigToStorage(); });
}

// ============================================
// NEW: SONG REQUEST (!sr) CONFIG — load/save/populate/read
// ============================================
function loadSongRequestConfig(){
  try{
    const raw = localStorage.getItem(LS_SONGREQUEST_KEY);
    if(raw) songRequestConfig = { ...DEFAULT_SONGREQUEST_CONFIG, ...JSON.parse(raw) };
  }catch(e){}
}
function saveSongRequestConfigToStorage(){ localStorage.setItem(LS_SONGREQUEST_KEY, JSON.stringify(songRequestConfig)); }

function populateSongRequestForm(){
  const enabledEl = document.getElementById('toggleSongRequestEnabled');
  const commandEl = document.getElementById('inputSongRequestCommand');
  const permissionEl = document.getElementById('inputSongRequestPermission');
  const cooldownEl = document.getElementById('inputSongRequestCooldown');
  const modsBypassEl = document.getElementById('toggleSongRequestModsBypass');
  const maxPerStreamEl = document.getElementById('inputSongRequestMaxPerStream');
  const successEl = document.getElementById('inputSongRequestSuccessTemplate');
  const notFoundEl = document.getElementById('inputSongRequestNotFoundTemplate');
  const cooldownTemplateEl = document.getElementById('inputSongRequestCooldownTemplate');
  const noDeviceEl = document.getElementById('inputSongRequestNoDeviceTemplate');
  const limitEl = document.getElementById('inputSongRequestLimitTemplate');
  const permDeniedEl = document.getElementById('inputSongRequestPermissionDeniedTemplate');

  if(enabledEl) enabledEl.checked = songRequestConfig.enabled;
  if(commandEl) commandEl.value = songRequestConfig.command;
  if(permissionEl) permissionEl.value = songRequestConfig.permission;
  if(cooldownEl) cooldownEl.value = songRequestConfig.cooldownSeconds;
  if(modsBypassEl) modsBypassEl.checked = songRequestConfig.modsBypassCooldown;
  if(maxPerStreamEl) maxPerStreamEl.value = songRequestConfig.maxRequestsPerStream;
  if(successEl) successEl.value = songRequestConfig.successTemplate;
  if(notFoundEl) notFoundEl.value = songRequestConfig.notFoundTemplate;
  if(cooldownTemplateEl) cooldownTemplateEl.value = songRequestConfig.cooldownTemplate;
  if(noDeviceEl) noDeviceEl.value = songRequestConfig.noDeviceTemplate;
  if(limitEl) limitEl.value = songRequestConfig.limitReachedTemplate;
  if(permDeniedEl) permDeniedEl.value = songRequestConfig.permissionDeniedTemplate;

  updateSongRequestRangeLabels();
}

function updateSongRequestRangeLabels(){
  const valCooldownEl = document.getElementById('valSongRequestCooldown');
  const valMaxEl = document.getElementById('valSongRequestMaxPerStream');
  if(valCooldownEl) valCooldownEl.textContent = songRequestConfig.cooldownSeconds + 's';
  if(valMaxEl) valMaxEl.textContent = songRequestConfig.maxRequestsPerStream > 0 ? songRequestConfig.maxRequestsPerStream.toString() : 'Unlimited';
}

function readSongRequestForm(){
  const enabledEl = document.getElementById('toggleSongRequestEnabled');
  const commandEl = document.getElementById('inputSongRequestCommand');
  const permissionEl = document.getElementById('inputSongRequestPermission');
  const cooldownEl = document.getElementById('inputSongRequestCooldown');
  const modsBypassEl = document.getElementById('toggleSongRequestModsBypass');
  const maxPerStreamEl = document.getElementById('inputSongRequestMaxPerStream');
  const successEl = document.getElementById('inputSongRequestSuccessTemplate');
  const notFoundEl = document.getElementById('inputSongRequestNotFoundTemplate');
  const cooldownTemplateEl = document.getElementById('inputSongRequestCooldownTemplate');
  const noDeviceEl = document.getElementById('inputSongRequestNoDeviceTemplate');
  const limitEl = document.getElementById('inputSongRequestLimitTemplate');
  const permDeniedEl = document.getElementById('inputSongRequestPermissionDeniedTemplate');

  if(enabledEl) songRequestConfig.enabled = enabledEl.checked;
  if(commandEl) songRequestConfig.command = (commandEl.value.trim() || DEFAULT_SONGREQUEST_CONFIG.command);
  if(permissionEl) songRequestConfig.permission = permissionEl.value;
  if(cooldownEl) songRequestConfig.cooldownSeconds = parseInt(cooldownEl.value) || 0;
  if(modsBypassEl) songRequestConfig.modsBypassCooldown = modsBypassEl.checked;
  if(maxPerStreamEl) songRequestConfig.maxRequestsPerStream = parseInt(maxPerStreamEl.value) || 0;
  if(successEl) songRequestConfig.successTemplate = successEl.value.trim() || DEFAULT_SONGREQUEST_CONFIG.successTemplate;
  if(notFoundEl) songRequestConfig.notFoundTemplate = notFoundEl.value.trim() || DEFAULT_SONGREQUEST_CONFIG.notFoundTemplate;
  if(cooldownTemplateEl) songRequestConfig.cooldownTemplate = cooldownTemplateEl.value.trim() || DEFAULT_SONGREQUEST_CONFIG.cooldownTemplate;
  if(noDeviceEl) songRequestConfig.noDeviceTemplate = noDeviceEl.value.trim() || DEFAULT_SONGREQUEST_CONFIG.noDeviceTemplate;
  if(limitEl) songRequestConfig.limitReachedTemplate = limitEl.value.trim() || DEFAULT_SONGREQUEST_CONFIG.limitReachedTemplate;
  if(permDeniedEl) songRequestConfig.permissionDeniedTemplate = permDeniedEl.value.trim() || DEFAULT_SONGREQUEST_CONFIG.permissionDeniedTemplate;

  updateSongRequestRangeLabels();
}

document.querySelectorAll('#panel-settings #toggleSongRequestEnabled, #panel-settings #inputSongRequestCommand, #panel-settings #inputSongRequestPermission, #panel-settings #inputSongRequestCooldown, #panel-settings #toggleSongRequestModsBypass, #panel-settings #inputSongRequestMaxPerStream, #panel-settings #inputSongRequestSuccessTemplate, #panel-settings #inputSongRequestNotFoundTemplate, #panel-settings #inputSongRequestCooldownTemplate, #panel-settings #inputSongRequestNoDeviceTemplate, #panel-settings #inputSongRequestLimitTemplate, #panel-settings #inputSongRequestPermissionDeniedTemplate').forEach(el=>{
  el.addEventListener('input', ()=>{ readSongRequestForm(); saveSongRequestConfigToStorage(); });
  el.addEventListener('change', ()=>{ readSongRequestForm(); saveSongRequestConfigToStorage(); });
});

const btnResetSongRequestCountEl = document.getElementById('btnResetSongRequestCount');
if(btnResetSongRequestCountEl){
  btnResetSongRequestCountEl.addEventListener('click', ()=>{
    srRequestCountThisStream = 0;
    showToast('Song request counter reset ✓');
  });
}

// ============================================
// NEW: SONG REQUEST (!sr) — permission parsing helpers
// ============================================
function parseTwitchMessage(raw){
  let tags = {};
  let rest = raw;
  if(raw.startsWith('@')){
    const spaceIdx = raw.indexOf(' ');
    if(spaceIdx === -1) return null;
    const tagStr = raw.slice(1, spaceIdx);
    rest = raw.slice(spaceIdx + 1);
    tagStr.split(';').forEach(pair=>{
      const eqIdx = pair.indexOf('=');
      if(eqIdx === -1) return;
      tags[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
    });
  }
  const match = rest.match(/^:([^!]+)![^\s]+\s+PRIVMSG\s+#(\S+)\s+:(.*)$/);
  if(!match) return null;
  return { tags, nick: match[1], channel: match[2], message: match[3] };
}

function getUserPermissionLevel(tags){
  const badges = (tags.badges || '').split(',').map(b=>b.split('/')[0]).filter(Boolean);
  if(badges.includes('broadcaster')) return 'broadcaster';
  if(tags.mod === '1' || badges.includes('moderator')) return 'moderator';
  if(badges.includes('subscriber') || badges.includes('founder') || tags.subscriber === '1') return 'subscriber';
  return 'everyone';
}

function permissionAtLeast(level, required){
  const order = ['everyone','subscriber','moderator','broadcaster'];
  const levelIdx = order.indexOf(level);
  const requiredIdx = order.indexOf(required);
  if(levelIdx === -1 || requiredIdx === -1) return true; // fail open on unrecognized values
  return levelIdx >= requiredIdx;
}

function fillSongRequestTemplate(template, vars){
  let out = template || '';
  Object.keys(vars).forEach(key=>{
    out = out.split(`{${key}}`).join(vars[key]);
  });
  return out;
}

function sendTwitchChatMessage(channel, message){
  if(!twitchWs || twitchWs.readyState !== WebSocket.OPEN || !channel) return;
  try{
    twitchWs.send(`PRIVMSG #${channel} :${message}`);
  }catch(e){
    console.error('Failed to send Twitch chat message:', e);
  }
}

async function handleSongRequestCommand(parsed, query){
  if(!query){ return; }

  const displayName = parsed.tags['display-name'] || parsed.nick;
  const userId = parsed.tags['user-id'] || parsed.nick;
  const channel = parsed.channel;
  const userLevel = getUserPermissionLevel(parsed.tags);
  const isModOrHigher = permissionAtLeast(userLevel, 'moderator');

  if(!permissionAtLeast(userLevel, songRequestConfig.permission)){
    sendTwitchChatMessage(channel, fillSongRequestTemplate(songRequestConfig.permissionDeniedTemplate, { user: displayName, query }));
    return;
  }

  const bypassCooldown = songRequestConfig.modsBypassCooldown && isModOrHigher;
  if(!bypassCooldown && songRequestConfig.cooldownSeconds > 0){
    const last = srUserCooldowns[userId] || 0;
    const elapsed = (Date.now() - last) / 1000;
    if(elapsed < songRequestConfig.cooldownSeconds){
      const remaining = Math.ceil(songRequestConfig.cooldownSeconds - elapsed);
      sendTwitchChatMessage(channel, fillSongRequestTemplate(songRequestConfig.cooldownTemplate, { user: displayName, seconds: remaining, query }));
      return;
    }
  }

  if(songRequestConfig.maxRequestsPerStream > 0 && srRequestCountThisStream >= songRequestConfig.maxRequestsPerStream){
    sendTwitchChatMessage(channel, fillSongRequestTemplate(songRequestConfig.limitReachedTemplate, { user: displayName, query }));
    return;
  }

  const token = await getValidAccessToken();
  if(!token){
    sendTwitchChatMessage(channel, `@${displayName} song requests aren't connected to Spotify right now.`);
    return;
  }

  let track = null;
  try{
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    if(res.ok){
      const data = await res.json();
      track = data.tracks?.items?.[0] || null;
    }
  }catch(e){
    console.error('Song request search failed:', e);
  }

  if(!track){
    sendTwitchChatMessage(channel, fillSongRequestTemplate(songRequestConfig.notFoundTemplate, { user: displayName, query }));
    return;
  }

  try{
    const deviceParam = selectedDeviceId ? `&device_id=${selectedDeviceId}` : '';
    const queueRes = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(track.uri)}${deviceParam}`, {
      method:'POST',
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    if(queueRes.ok || queueRes.status === 204){
      srUserCooldowns[userId] = Date.now();
      srRequestCountThisStream++;
      const artistNames = track.artists?.map(a=>a.name).join(', ') || 'Unknown Artist';
      sendTwitchChatMessage(channel, fillSongRequestTemplate(songRequestConfig.successTemplate, { user: displayName, title: track.name, artist: artistNames, query }));
      setTimeout(fetchAndUpdateQueue, 500);
    } else if(queueRes.status === 404){
      sendTwitchChatMessage(channel, fillSongRequestTemplate(songRequestConfig.noDeviceTemplate, { user: displayName, query }));
    } else {
      sendTwitchChatMessage(channel, `@${displayName} something went wrong adding that to the queue.`);
    }
  }catch(e){
    console.error('Song request queue add failed:', e);
    sendTwitchChatMessage(channel, `@${displayName} something went wrong adding that to the queue.`);
  }
}

// ============================================
// NEW: CHAT PLAYBACK COMMANDS (!play, !pause, !next) — load/save/populate/read
// ============================================
function loadChatCommandsConfig(){
  try{
    const raw = localStorage.getItem(LS_CHATCOMMANDS_KEY);
    if(raw) chatCommandsConfig = { ...DEFAULT_CHATCOMMANDS_CONFIG, ...JSON.parse(raw) };
  }catch(e){}
}
function saveChatCommandsConfigToStorage(){ localStorage.setItem(LS_CHATCOMMANDS_KEY, JSON.stringify(chatCommandsConfig)); }

function populateChatCommandsForm(){
  const el = (id)=> document.getElementById(id);

  if(el('toggleChatPlayEnabled')) el('toggleChatPlayEnabled').checked = chatCommandsConfig.playEnabled;
  if(el('inputChatPlayCommand')) el('inputChatPlayCommand').value = chatCommandsConfig.playCommand;
  if(el('inputChatPlayPermission')) el('inputChatPlayPermission').value = chatCommandsConfig.playPermission;
  if(el('inputChatPlaySuccessTemplate')) el('inputChatPlaySuccessTemplate').value = chatCommandsConfig.playSuccessTemplate;

  if(el('toggleChatPauseEnabled')) el('toggleChatPauseEnabled').checked = chatCommandsConfig.pauseEnabled;
  if(el('inputChatPauseCommand')) el('inputChatPauseCommand').value = chatCommandsConfig.pauseCommand;
  if(el('inputChatPausePermission')) el('inputChatPausePermission').value = chatCommandsConfig.pausePermission;
  if(el('inputChatPauseSuccessTemplate')) el('inputChatPauseSuccessTemplate').value = chatCommandsConfig.pauseSuccessTemplate;

  if(el('toggleChatNextEnabled')) el('toggleChatNextEnabled').checked = chatCommandsConfig.nextEnabled;
  if(el('inputChatNextCommand')) el('inputChatNextCommand').value = chatCommandsConfig.nextCommand;
  if(el('inputChatNextPermission')) el('inputChatNextPermission').value = chatCommandsConfig.nextPermission;
  if(el('inputChatNextSuccessTemplate')) el('inputChatNextSuccessTemplate').value = chatCommandsConfig.nextSuccessTemplate;

  if(el('inputChatCommandsCooldown')) el('inputChatCommandsCooldown').value = chatCommandsConfig.cooldownSeconds;
  if(el('toggleChatCommandsModsBypass')) el('toggleChatCommandsModsBypass').checked = chatCommandsConfig.modsBypassCooldown;
  if(el('inputChatCommandsNoDeviceTemplate')) el('inputChatCommandsNoDeviceTemplate').value = chatCommandsConfig.noDeviceTemplate;
  if(el('inputChatCommandsCooldownTemplate')) el('inputChatCommandsCooldownTemplate').value = chatCommandsConfig.cooldownTemplate;
  if(el('inputChatCommandsPermissionDeniedTemplate')) el('inputChatCommandsPermissionDeniedTemplate').value = chatCommandsConfig.permissionDeniedTemplate;

  updateChatCommandsRangeLabels();
}

function updateChatCommandsRangeLabels(){
  const valEl = document.getElementById('valChatCommandsCooldown');
  if(valEl) valEl.textContent = chatCommandsConfig.cooldownSeconds + 's';
}

function readChatCommandsForm(){
  const el = (id)=> document.getElementById(id);

  if(el('toggleChatPlayEnabled')) chatCommandsConfig.playEnabled = el('toggleChatPlayEnabled').checked;
  if(el('inputChatPlayCommand')) chatCommandsConfig.playCommand = el('inputChatPlayCommand').value.trim() || DEFAULT_CHATCOMMANDS_CONFIG.playCommand;
  if(el('inputChatPlayPermission')) chatCommandsConfig.playPermission = el('inputChatPlayPermission').value;
  if(el('inputChatPlaySuccessTemplate')) chatCommandsConfig.playSuccessTemplate = el('inputChatPlaySuccessTemplate').value.trim() || DEFAULT_CHATCOMMANDS_CONFIG.playSuccessTemplate;

  if(el('toggleChatPauseEnabled')) chatCommandsConfig.pauseEnabled = el('toggleChatPauseEnabled').checked;
  if(el('inputChatPauseCommand')) chatCommandsConfig.pauseCommand = el('inputChatPauseCommand').value.trim() || DEFAULT_CHATCOMMANDS_CONFIG.pauseCommand;
  if(el('inputChatPausePermission')) chatCommandsConfig.pausePermission = el('inputChatPausePermission').value;
  if(el('inputChatPauseSuccessTemplate')) chatCommandsConfig.pauseSuccessTemplate = el('inputChatPauseSuccessTemplate').value.trim() || DEFAULT_CHATCOMMANDS_CONFIG.pauseSuccessTemplate;

  if(el('toggleChatNextEnabled')) chatCommandsConfig.nextEnabled = el('toggleChatNextEnabled').checked;
  if(el('inputChatNextCommand')) chatCommandsConfig.nextCommand = el('inputChatNextCommand').value.trim() || DEFAULT_CHATCOMMANDS_CONFIG.nextCommand;
  if(el('inputChatNextPermission')) chatCommandsConfig.nextPermission = el('inputChatNextPermission').value;
  if(el('inputChatNextSuccessTemplate')) chatCommandsConfig.nextSuccessTemplate = el('inputChatNextSuccessTemplate').value.trim() || DEFAULT_CHATCOMMANDS_CONFIG.nextSuccessTemplate;

  if(el('inputChatCommandsCooldown')) chatCommandsConfig.cooldownSeconds = parseInt(el('inputChatCommandsCooldown').value) || 0;
  if(el('toggleChatCommandsModsBypass')) chatCommandsConfig.modsBypassCooldown = el('toggleChatCommandsModsBypass').checked;
  if(el('inputChatCommandsNoDeviceTemplate')) chatCommandsConfig.noDeviceTemplate = el('inputChatCommandsNoDeviceTemplate').value.trim() || DEFAULT_CHATCOMMANDS_CONFIG.noDeviceTemplate;
  if(el('inputChatCommandsCooldownTemplate')) chatCommandsConfig.cooldownTemplate = el('inputChatCommandsCooldownTemplate').value.trim() || DEFAULT_CHATCOMMANDS_CONFIG.cooldownTemplate;
  if(el('inputChatCommandsPermissionDeniedTemplate')) chatCommandsConfig.permissionDeniedTemplate = el('inputChatCommandsPermissionDeniedTemplate').value.trim() || DEFAULT_CHATCOMMANDS_CONFIG.permissionDeniedTemplate;

  updateChatCommandsRangeLabels();
}

document.querySelectorAll('#panel-settings #toggleChatPlayEnabled, #panel-settings #inputChatPlayCommand, #panel-settings #inputChatPlayPermission, #panel-settings #inputChatPlaySuccessTemplate, #panel-settings #toggleChatPauseEnabled, #panel-settings #inputChatPauseCommand, #panel-settings #inputChatPausePermission, #panel-settings #inputChatPauseSuccessTemplate, #panel-settings #toggleChatNextEnabled, #panel-settings #inputChatNextCommand, #panel-settings #inputChatNextPermission, #panel-settings #inputChatNextSuccessTemplate, #panel-settings #inputChatCommandsCooldown, #panel-settings #toggleChatCommandsModsBypass, #panel-settings #inputChatCommandsNoDeviceTemplate, #panel-settings #inputChatCommandsCooldownTemplate, #panel-settings #inputChatCommandsPermissionDeniedTemplate').forEach(el=>{
  el.addEventListener('input', ()=>{ readChatCommandsForm(); saveChatCommandsConfigToStorage(); });
  el.addEventListener('change', ()=>{ readChatCommandsForm(); saveChatCommandsConfigToStorage(); });
});

// ============================================
// NEW: CHAT PLAYBACK COMMANDS — handler
// Fires when chat types the configured !play, !pause,
// or !next command. Checks permission and a shared
// per-user/per-command cooldown, then calls the same
// Spotify playback endpoints used by the dashboard's
// own Play/Pause/Next buttons, and replies in chat.
// ============================================
async function handleChatPlaybackCommand(parsed, action){
  const displayName = parsed.tags['display-name'] || parsed.nick;
  const userId = parsed.tags['user-id'] || parsed.nick;
  const channel = parsed.channel;
  const userLevel = getUserPermissionLevel(parsed.tags);
  const isModOrHigher = permissionAtLeast(userLevel, 'moderator');

  const requiredPermission = action === 'play' ? chatCommandsConfig.playPermission
    : action === 'pause' ? chatCommandsConfig.pausePermission
    : chatCommandsConfig.nextPermission;

  if(!permissionAtLeast(userLevel, requiredPermission)){
    sendTwitchChatMessage(channel, fillSongRequestTemplate(chatCommandsConfig.permissionDeniedTemplate, { user: displayName }));
    return;
  }

  const bypassCooldown = chatCommandsConfig.modsBypassCooldown && isModOrHigher;
  const cooldownKey = `${userId}:${action}`;
  if(!bypassCooldown && chatCommandsConfig.cooldownSeconds > 0){
    const last = ccUserCooldowns[cooldownKey] || 0;
    const elapsed = (Date.now() - last) / 1000;
    if(elapsed < chatCommandsConfig.cooldownSeconds){
      const remaining = Math.ceil(chatCommandsConfig.cooldownSeconds - elapsed);
      sendTwitchChatMessage(channel, fillSongRequestTemplate(chatCommandsConfig.cooldownTemplate, { user: displayName, seconds: remaining }));
      return;
    }
  }

  const token = await getValidAccessToken();
  if(!token){
    sendTwitchChatMessage(channel, `@${displayName} playback isn't connected to Spotify right now.`);
    return;
  }

  const methodMap = { play:'PUT', pause:'PUT', next:'POST' };
  const pathMap = { play:'play', pause:'pause', next:'next' };
  const successTemplateMap = { play: chatCommandsConfig.playSuccessTemplate, pause: chatCommandsConfig.pauseSuccessTemplate, next: chatCommandsConfig.nextSuccessTemplate };

  try{
    const deviceParam = selectedDeviceId ? `?device_id=${selectedDeviceId}` : '';
    const res = await fetch(`https://api.spotify.com/v1/me/player/${pathMap[action]}${deviceParam}`, {
      method: methodMap[action],
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    if(res.ok || res.status === 204){
      ccUserCooldowns[cooldownKey] = Date.now();
      sendTwitchChatMessage(channel, fillSongRequestTemplate(successTemplateMap[action], { user: displayName }));
      setTimeout(()=>{ fetchAndUpdateQueue(); updateQueuePlayPauseIcon(); }, 400);
    } else if(res.status === 404){
      sendTwitchChatMessage(channel, fillSongRequestTemplate(chatCommandsConfig.noDeviceTemplate, { user: displayName }));
    } else {
      sendTwitchChatMessage(channel, `@${displayName} something went wrong with that command.`);
    }
  }catch(e){
    console.error('Chat playback command failed:', e);
    sendTwitchChatMessage(channel, `@${displayName} something went wrong with that command.`);
  }
}

// Shared helper: formats remaining track time as m:ss, given duration/progress in ms.
function formatRemainingTime(durationMs, progressMs){
  const remainingMs = Math.max(0, (durationMs || 0) - (progressMs || 0));
  const mins = Math.floor(remainingMs / 60000);
  const secs = Math.floor((remainingMs % 60000) / 1000).toString().padStart(2,'0');
  return `${mins}:${secs}`;
}

function buildTwitchMessage(template, track, remainingText){
  const title = track.name || 'Unknown Track';
  const artist = track.artists?.map(a=>a.name).join(', ') || 'Unknown Artist';
  const album = track.album?.name || '';
  const url = track.external_urls?.spotify || '';
  return template
    .replace(/\{title\}/g, title)
    .replace(/\{artist\}/g, artist)
    .replace(/\{album\}/g, album)
    .replace(/\{url\}/g, url)
    .replace(/\{remaining\}/g, remainingText || '');
}

function postNowPlayingToTwitchChat(track){
  if(!twitchWs || twitchWs.readyState !== WebSocket.OPEN || !twitchChannelNameConnected) return;
  try{
    // Track just started, so remaining ≈ full duration (no progress data available at this call site).
    const remainingText = formatRemainingTime(track.duration_ms, 0);
    const message = buildTwitchMessage(twitchConfig.template, track, remainingText);
    twitchWs.send(`PRIVMSG #${twitchChannelNameConnected} :${message}`);
    console.log('Auto-posted to Twitch chat:', message);
  }catch(e){
    console.error('Twitch auto-post failed:', e);
  }
}

// ============================================
// NEW: TWITCH "NEXT SONG" CHAT ALERT
// Mirrors the Discord Next Song Alert: fires once
// per track once remaining play time on the CURRENT
// track drops to the configured minutes, announcing
// the NEXT track waiting in the Spotify queue.
// ============================================
function postTwitchNextSongMessage(nextTrack, remainingText){
  if(!twitchWs || twitchWs.readyState !== WebSocket.OPEN || !twitchChannelNameConnected) return;
  try{
    const message = buildTwitchMessage(twitchConfig.nextSongTemplate, nextTrack, remainingText);
    twitchWs.send(`PRIVMSG #${twitchChannelNameConnected} :${message}`);
    console.log('Posted Twitch next-song alert:', message);
  }catch(e){
    console.error('Twitch next-song post failed:', e);
  }
}

function checkTwitchNextSongAlert(state){
  if(!twitchConfig.nextSongEnabled || !twitchWs || twitchWs.readyState !== WebSocket.OPEN || !twitchChannelNameConnected) return;
  if(!state || !state.item || typeof state.progress_ms !== 'number') return;

  const current = state.item;
  const nextTrack = lastQueueTracks[0];

  // Reset the guard whenever the currently-playing track itself changes
  if(current.id !== twitchNextSongCheckTrackId){
    twitchNextSongCheckTrackId = current.id;
    twitchNextSongAnnouncedForTrackId = null;
  }
  if(!nextTrack || twitchNextSongAnnouncedForTrackId === current.id) return;

  const remainingMs = (current.duration_ms || 0) - state.progress_ms;
  const thresholdMs = (twitchConfig.nextSongMinutes || 5) * 60000;
  if(remainingMs > 0 && remainingMs <= thresholdMs){
    twitchNextSongAnnouncedForTrackId = current.id;
    const remainingText = formatRemainingTime(current.duration_ms, state.progress_ms);
    postTwitchNextSongMessage(nextTrack, remainingText);
  }
}

// ============================================
// NEW: TWITCH PAUSE / RESUME CHAT ALERTS
// Mirrors the Discord Pause Song / Resume Play
// alerts, but posts plain text directly to chat.
// ============================================
function postTwitchPauseMessage(track, remainingText){
  if(!twitchWs || twitchWs.readyState !== WebSocket.OPEN || !twitchChannelNameConnected) return;
  try{
    const message = buildTwitchMessage(twitchConfig.pauseTemplate, track, remainingText);
    twitchWs.send(`PRIVMSG #${twitchChannelNameConnected} :${message}`);
    console.log('Posted Twitch pause alert:', message);
  }catch(e){
    console.error('Twitch pause post failed:', e);
  }
}

function postTwitchResumeMessage(track, remainingText){
  if(!twitchWs || twitchWs.readyState !== WebSocket.OPEN || !twitchChannelNameConnected) return;
  try{
    const message = buildTwitchMessage(twitchConfig.resumeTemplate, track, remainingText);
    twitchWs.send(`PRIVMSG #${twitchChannelNameConnected} :${message}`);
    console.log('Posted Twitch resume alert:', message);
  }catch(e){
    console.error('Twitch resume post failed:', e);
  }
}

function checkTwitchPauseAlert(state){
  if(!twitchConfig.pauseEnabled || !twitchWs || twitchWs.readyState !== WebSocket.OPEN || !twitchChannelNameConnected) return;
  if(!state || !state.item) return;

  const track = state.item;
  if(state.is_playing){
    // Track is playing again; allow a future pause on this same track to re-fire.
    if(twitchPauseAnnouncedForTrackId === track.id) twitchPauseAnnouncedForTrackId = null;
    return;
  }
  if(twitchPauseAnnouncedForTrackId === track.id) return;

  twitchPauseAnnouncedForTrackId = track.id;
  const remainingText = formatRemainingTime(track.duration_ms, state.progress_ms);
  postTwitchPauseMessage(track, remainingText);
}

function checkTwitchResumeAlert(state){
  if(!twitchConfig.resumeEnabled || !twitchWs || twitchWs.readyState !== WebSocket.OPEN || !twitchChannelNameConnected) return;
  if(!state || !state.item){
    // Mirrors the Discord fix: Spotify can return an empty state during a long pause.
    // Keep the last known playing state instead of wiping it out.
    return;
  }

  const track = state.item;
  const isPlaying = !!state.is_playing;

  if(twitchWasPlayingLastForResume === false && isPlaying){
    const remainingText = formatRemainingTime(track.duration_ms, state.progress_ms);
    postTwitchResumeMessage(track, remainingText);
  }

  twitchWasPlayingLastForResume = isPlaying;
}

// 2. Twitch WebSocket Connection Logic
let twitchWs; // Keep this global so we can access it to send messages later
let twitchManualDisconnect = false; // true only when the person clicks "Disconnect Bot"
let twitchReconnectTimer = null;

const btnConnectTwitch = document.getElementById('btnConnectTwitch');
const btnDisconnectTwitch = document.getElementById('btnDisconnectTwitch');

function connectTwitchBot(channelName, botUsername, rawToken){
    channelName = (channelName || '').trim().toLowerCase();
    botUsername = (botUsername || '').trim().toLowerCase();
    rawToken = (rawToken || '').trim();

    if (!channelName || !botUsername || !rawToken) {
        console.error('Missing Twitch connection credentials!');
        return;
    }

    // --- BULLETPROOF TOKEN FORMATTING ---
    // Automatically strips accidental double prefixes and ensures 'oauth:' is present
    rawToken = rawToken.replace(/^oauth:/i, '').trim();
    const oauthToken = `oauth:${rawToken}`;

    // --- SAVE CREDENTIALS TO LOCAL STORAGE (so a page refresh can auto-reconnect) ---
    localStorage.setItem('twitchChannelName', channelName);
    localStorage.setItem('twitchBotUsername', botUsername);
    localStorage.setItem('twitchBotToken', rawToken);

    twitchManualDisconnect = false;
    clearTimeout(twitchReconnectTimer);

    // Open the WebSocket
    twitchWs = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    // Handle successful connection
    twitchWs.onopen = () => {
        console.log('Connected to Twitch IRC, authenticating...');

        // Request tags (badges, display-name, user-id, mod/subscriber flags) so
        // song-request permission checks and cooldowns can identify who's talking.
        twitchWs.send('CAP REQ :twitch.tv/tags twitch.tv/commands');

        // Authenticate using the properly formatted values
        twitchWs.send(`PASS ${oauthToken}`);
        twitchWs.send(`NICK ${botUsername}`);
        twitchWs.send(`JOIN #${channelName}`);

        // Update UI Status LED to Green
        const statusText = document.getElementById('twitchStatusText');
        const statusLed = document.getElementById('twitchStatusLed');
        if (statusText) statusText.textContent = `Connected to #${channelName} as ${botUsername}`;
        if (statusLed) statusLed.style.backgroundColor = '#1ed760';
        twitchChannelNameConnected = channelName;

        // Swap Connect/Disconnect buttons
        if (btnConnectTwitch) btnConnectTwitch.classList.add('hidden');
        if (btnDisconnectTwitch) btnDisconnectTwitch.classList.remove('hidden');
    };

    // Handle incoming messages
    twitchWs.onmessage = (event) => {
        // Twitch can batch multiple IRC lines into a single WebSocket message.
        const lines = event.data.split('\r\n').filter(Boolean);

        lines.forEach(line => {
            console.log('IRC In:', line);

            // Handle PING/PONG to keep connection alive
            if (line.startsWith('PING')) {
                twitchWs.send('PONG :tmi.twitch.tv');
                return;
            }

            if (!line.includes('PRIVMSG')) return;

            const parsed = parseTwitchMessage(line);
            if (!parsed) return;

            const lowerMsg = parsed.message.toLowerCase();

            // Listen for "!song" command (made case-insensitive so !SONG works too)
            if (lowerMsg.includes('!song')) {
                console.log('!song command detected in chat!');
                postNowPlayingToChat(parsed.channel);
            }

            // Listen for the configured song-request command (default "!sr")
            if (songRequestConfig.enabled) {
                const cmd = (songRequestConfig.command || '!sr').toLowerCase();
                if (lowerMsg === cmd || lowerMsg.startsWith(cmd + ' ')) {
                    const query = parsed.message.slice(songRequestConfig.command.length).trim();
                    handleSongRequestCommand(parsed, query);
                }
            }

            // Listen for the configured chat playback commands (!play, !pause, !next)
            if (chatCommandsConfig.playEnabled) {
                const cmd = (chatCommandsConfig.playCommand || '!play').toLowerCase();
                if (lowerMsg === cmd) handleChatPlaybackCommand(parsed, 'play');
            }
            if (chatCommandsConfig.pauseEnabled) {
                const cmd = (chatCommandsConfig.pauseCommand || '!pause').toLowerCase();
                if (lowerMsg === cmd) handleChatPlaybackCommand(parsed, 'pause');
            }
            if (chatCommandsConfig.nextEnabled) {
                const cmd = (chatCommandsConfig.nextCommand || '!next').toLowerCase();
                if (lowerMsg === cmd) handleChatPlaybackCommand(parsed, 'next');
            }
        });
    };

    // Handle Disconnection
    twitchWs.onclose = () => {
        console.log('Disconnected from Twitch IRC');

        // Update UI Status LED to Red
        const statusText = document.getElementById('twitchStatusText');
        const statusLed = document.getElementById('twitchStatusLed');
        if (statusText) statusText.textContent = twitchManualDisconnect ? 'Bot is offline.' : 'Bot is offline. Reconnecting...';
        if (statusLed) statusLed.style.backgroundColor = '#ff4444';
        twitchChannelNameConnected = null;

        // Revert Connect/Disconnect buttons
        if (btnConnectTwitch) btnConnectTwitch.classList.remove('hidden');
        if (btnDisconnectTwitch) btnDisconnectTwitch.classList.add('hidden');

        // Auto-reconnect on unexpected drops (e.g. Twitch IRC idle timeout, network blip)
        // — but never after the person explicitly clicked "Disconnect Bot".
        if (!twitchManualDisconnect) {
            clearTimeout(twitchReconnectTimer);
            twitchReconnectTimer = setTimeout(() => {
                connectTwitchBot(channelName, botUsername, rawToken);
            }, 5000);
        }
    };
}

if (btnConnectTwitch) {
    btnConnectTwitch.addEventListener('click', () => {
        const channelName = inputTwitchChannel.value.trim();
        const botUsername = inputBotUsername.value.trim();
        const rawToken = inputBotToken.value.trim();

        if (!channelName || !botUsername || !rawToken) {
            alert('Please fill out all fields in the Twitch Chat Integration section.');
            return;
        }
        connectTwitchBot(channelName, botUsername, rawToken);
    });
}

if (btnDisconnectTwitch) {
    btnDisconnectTwitch.addEventListener('click', () => {
        twitchManualDisconnect = true;
        clearTimeout(twitchReconnectTimer);
        if (twitchWs) twitchWs.close();
    });
}

// Auto-reconnect on page load if credentials were saved from a previous session,
// so refreshing the browser doesn't drop the bot connection.
function autoConnectTwitchBotIfSaved(){
    const savedChannel = localStorage.getItem('twitchChannelName');
    const savedUsername = localStorage.getItem('twitchBotUsername');
    const savedToken = localStorage.getItem('twitchBotToken');
    if (savedChannel && savedUsername && savedToken) {
        connectTwitchBot(savedChannel, savedUsername, savedToken);
    }
}

// 3. Post "Now Playing" to Chat
async function postNowPlayingToChat(channelName) {
    if (!twitchWs || twitchWs.readyState !== WebSocket.OPEN) {
        console.warn('Cannot post to chat: Twitch WebSocket is not connected.');
        return;
    }

    try {
        const currentTrack = await getSpotifyCurrentTrack(); 
        console.log('Spotify Track Data:', currentTrack);
        
        if (currentTrack && currentTrack.is_playing) {
            const songName = currentTrack.item.name;
            const artistName = currentTrack.item.artists[0].name;
            const spotifyUrl = currentTrack.item.external_urls?.spotify;
            
            const chatMessage = `🎵 Now Playing: ${songName} by ${artistName} ${spotifyUrl ? '- ' + spotifyUrl : ''}`;
            
            twitchWs.send(`PRIVMSG #${channelName} :${chatMessage}`);
            console.log('Posted to chat:', chatMessage);
        } else {
            console.log('Spotify is connected, but nothing is currently playing/is_playing is false.');
        }
    } catch (error) {
        console.error('Failed to post to chat:', error);
    }
}
// ============================================
// AUTO-SAVE FOR DASHBOARD THEME
// ============================================
document.querySelectorAll('#panel-theme input, #panel-theme select').forEach(el=>{
  el.addEventListener('input', ()=>{
    if(el.id === 'inputDashBgImageUpload') return;
    
    // Read all theme values from form
    dashTheme.bgColor1 = document.getElementById('inputDashBgColor1').value;
    dashTheme.gradColor1 = document.getElementById('inputDashGradColor1').value;
    dashTheme.gradColor2 = document.getElementById('inputDashGradColor2').value;
    dashTheme.gradAngle = parseInt(document.getElementById('inputDashGradAngle').value);
    dashTheme.bgImageUrl = document.getElementById('inputDashBgImageUrl').value;
    dashTheme.bgPosition = document.getElementById('inputDashBgPosition').value;
    dashTheme.navTextColor = document.getElementById('inputDashNavTextColor').value;
    dashTheme.primaryText = document.getElementById('inputDashPrimaryText').value;
    dashTheme.secondaryText = document.getElementById('inputDashSecondaryText').value;
    dashTheme.tertiaryText = document.getElementById('inputDashTertiaryText').value;
    dashTheme.panelColor = document.getElementById('inputDashPanelColor').value;
    dashTheme.panelOpacity = parseFloat(document.getElementById('inputDashPanelOpacity').value);
    dashTheme.panelBorder = document.getElementById('inputDashPanelBorder').value;
    dashTheme.borderOpacity = parseFloat(document.getElementById('inputDashBorderOpacity').value);
    dashTheme.accent1 = document.getElementById('inputDashAccent1').value;
    dashTheme.accent2 = document.getElementById('inputDashAccent2').value;
    dashTheme.blurStrength = parseInt(document.getElementById('inputDashBlur').value);
    dashTheme.glowIntensity = parseFloat(document.getElementById('inputDashGlowIntensity').value);
    dashTheme.cornerRadius = parseInt(document.getElementById('inputDashCornerRadius').value);
    dashTheme.sidebarOpacity = parseFloat(document.getElementById('inputDashSidebarOpacity').value);
    dashTheme.sidebarGlow = document.getElementById('toggleDashSidebarGlow').checked;
    dashTheme.transitionSpeed = document.getElementById('inputDashTransitionSpeed').value;
    
    // Update display labels
    document.getElementById('valDashGradAngle').textContent = dashTheme.gradAngle + '°';
    document.getElementById('valDashPanelOpacity').textContent = (dashTheme.panelOpacity * 100).toFixed(0) + '%';
    document.getElementById('valDashBorderOpacity').textContent = (dashTheme.borderOpacity * 100).toFixed(1) + '%';
    document.getElementById('valDashBlur').textContent = dashTheme.blurStrength + 'px';
    document.getElementById('valDashGlowIntensity').textContent = (dashTheme.glowIntensity * 100).toFixed(0) + '%';
    document.getElementById('valDashCornerRadius').textContent = dashTheme.cornerRadius + 'px';
    document.getElementById('valDashSidebarOpacity').textContent = (dashTheme.sidebarOpacity * 100).toFixed(0) + '%';
    
    // Apply and save
    applyDashTheme();
    saveDashTheme();
  });
});

// Background style choice cards
document.querySelectorAll('[data-dash-choice]').forEach(card=>{
  card.addEventListener('click', ()=>{
    dashTheme[card.dataset.dashChoice] = card.dataset.value;
    applyDashTheme();
    saveDashTheme();
    showToast('Background style updated ✓');
  });
});

// Reset dashboard theme
document.getElementById('btnResetDashTheme').addEventListener('click', ()=>{
  dashTheme = { ...DEFAULT_DASH_THEME };
  populateDashThemeForm();
  applyDashTheme();
  saveDashTheme();
  showToast('Dashboard theme reset ✓');
});

// ============================================
// PREVIEW OPACITY AUTO-SAVE
// ============================================
document.getElementById('inputPreviewOpacity').addEventListener('input', (e)=>{
  previewOpacity = parseFloat(e.target.value);
  applyPreviewOpacity();
  savePreviewOpacity();
});

function updateChoiceCards(){document.querySelectorAll('.choice-card').forEach(card=>{const key = card.dataset.choice;card.classList.toggle('selected', config[key] === card.dataset.value)})}
function updateRangeLabels(){
  document.getElementById('valGlassOpacity').textContent = config.glassOpacity;
  document.getElementById('valBlurStrength').textContent = config.blurStrength + 'px';
  document.getElementById('valCornerRadius').textContent = config.cornerRadius + 'px';
  document.getElementById('valGlowIntensity').textContent = config.glowIntensity;
  document.getElementById('valPulseSpeed').textContent = config.pulseSpeed + 's';
  document.getElementById('valTextScale').textContent = config.textScale + 'x';
  document.getElementById('valPollInterval').textContent = config.pollInterval + 's';
  document.getElementById('valMarqueeSpeed').textContent = config.marqueeSpeed + 'px/s';
  document.getElementById('valMetadataOpacity').textContent = (config.metadataOpacity * 100).toFixed(0) + '%';
  document.getElementById('valCompactArtSize').textContent = config.compactArtSize + 'px';
  document.getElementById('valCompactRightGap').textContent = config.compactRightGap + 'px';
  document.getElementById('valCompactTitleSize').textContent = config.compactTitleSize + 'px';
  document.getElementById('valCompactArtistSize').textContent = config.compactArtistSize + 'px';
  document.getElementById('valCompactEqBarsHeight').textContent = config.compactEqBarsHeight + 'px';
  document.getElementById('valCompactEqBarWidth').textContent = config.compactEqBarWidth + 'px';
  document.getElementById('valCompactProgressHeight').textContent = config.compactProgressHeight + 'px';
}

function initCustomSelects(){
  document.querySelectorAll('.custom-select-wrapper').forEach(wrapper=>{
    const choiceKey = wrapper.dataset.choice;
    if(choiceKey === '__device') return; // device select is handled separately (dynamic options, no config key)
    const trigger = wrapper.querySelector('.select-trigger');
    const triggerLabel = trigger.querySelector('span');
    const optionsList = wrapper.querySelector('.select-options');

    trigger.addEventListener('click', (e)=>{
      e.stopPropagation();
      const isOpen = !optionsList.classList.contains('hidden');
      document.querySelectorAll('.custom-select-wrapper').forEach(w=>{
        w.querySelector('.select-options').classList.add('hidden');
        w.classList.remove('open');
      });
      if(!isOpen){
        optionsList.classList.remove('hidden');
        wrapper.classList.add('open');
      }
    });

    optionsList.querySelectorAll('.select-option').forEach(option=>{
      option.addEventListener('click', (e)=>{
        e.stopPropagation();
        config[choiceKey] = option.dataset.value;
        triggerLabel.textContent = option.textContent;
        optionsList.querySelectorAll('.select-option').forEach(o=> o.classList.remove('selected'));
        option.classList.add('selected');
        optionsList.classList.add('hidden');
        wrapper.classList.remove('open');
        pushLivePreview();
      });
    });
  });

  // Device select trigger toggles open/closed the same way, options are populated dynamically
  const deviceWrapper = document.getElementById('deviceSelect');
  const deviceTrigger = deviceWrapper.querySelector('.select-trigger');
  deviceTrigger.addEventListener('click', (e)=>{
    e.stopPropagation();
    const optionsList = document.getElementById('deviceSelectOptions');
    const isOpen = !optionsList.classList.contains('hidden');
    document.querySelectorAll('.custom-select-wrapper').forEach(w=>{
      w.querySelector('.select-options').classList.add('hidden');
      w.classList.remove('open');
    });
    if(!isOpen){
      optionsList.classList.remove('hidden');
      deviceWrapper.classList.add('open');
    }
  });

  // Click anywhere outside a custom select closes it
  document.addEventListener('click', ()=>{
    document.querySelectorAll('.custom-select-wrapper').forEach(w=>{
      w.querySelector('.select-options').classList.add('hidden');
      w.classList.remove('open');
    });
  });
}

function syncCustomSelects(){
  document.querySelectorAll('.custom-select-wrapper').forEach(wrapper=>{
    const choiceKey = wrapper.dataset.choice;
    if(choiceKey === '__device') return;
    const trigger = wrapper.querySelector('.select-trigger');
    const triggerLabel = trigger.querySelector('span');
    const optionsList = wrapper.querySelector('.select-options');
    const currentValue = config[choiceKey];
    optionsList.querySelectorAll('.select-option').forEach(option=>{
      const isSelected = option.dataset.value === currentValue;
      option.classList.toggle('selected', isSelected);
      if(isSelected) triggerLabel.textContent = option.textContent;
    });
  });
}

function readFormIntoConfig(){
  config.showContainerBackground = document.getElementById('toggleShowContainerBackground').checked;
  config.accentPrimary = document.getElementById('inputAccentPrimary').value;
  config.accentSecondary = document.getElementById('inputAccentSecondary').value;
  config.timeColor = document.getElementById('inputTimeColor').value;
  config.titleColor = document.getElementById('inputTitleColor').value;
  config.artistColor = document.getElementById('inputArtistColor').value;
  config.albumColor = document.getElementById('inputAlbumColor').value;
  config.glassOpacity = parseFloat(document.getElementById('inputGlassOpacity').value);
  config.blurStrength = parseInt(document.getElementById('inputBlurStrength').value);
  config.cornerRadius = parseInt(document.getElementById('inputCornerRadius').value);
  config.glowIntensity = parseFloat(document.getElementById('inputGlowIntensity').value);
  config.pulseSpeed = parseInt(document.getElementById('inputPulseSpeed').value);
  config.textScale = parseFloat(document.getElementById('inputTextScale').value);
  config.fontPairing = document.getElementById('inputFontPairing').value;
  config.artRevealStyle = document.getElementById('inputArtRevealStyle').value;
  config.marqueeEnabled = document.getElementById('toggleMarqueeEnabled').checked;
  config.marqueeSpeed = parseInt(document.getElementById('inputMarqueeSpeed').value);
  config.showScrubberDot = document.getElementById('toggleShowScrubberDot').checked;
  config.showArtBadge = document.getElementById('toggleShowArtBadge').checked;
  config.artistItalic = document.getElementById('toggleArtistItalic').checked;
  config.showArtist = document.getElementById('toggleShowArtist').checked;
  config.showAlbum = document.getElementById('toggleShowAlbum').checked;
  config.showProgressBar = document.getElementById('toggleShowProgressBar').checked;
  config.showTimecode = document.getElementById('toggleShowTimecode').checked;
  config.showStartTime = document.getElementById('toggleShowStartTime').checked;
  config.showEqualizer = document.getElementById('toggleShowEqualizer').checked;
  config.showBranding = document.getElementById('toggleShowBranding').checked;
  config.showMetadataPill = document.getElementById('toggleShowMetadataPill').checked;
  config.metadataBackground = document.getElementById('toggleMetadataBackground').checked;
  config.metadataOpacity = parseFloat(document.getElementById('inputMetadataOpacity').value);
  config.progressBackground = document.getElementById('toggleProgressBackground').checked;
  config.idleBehavior = document.getElementById('inputIdleBehavior').value;
  config.idleMessage = document.getElementById('inputIdleMessage').value || 'NOTHING PLAYING';
  config.pollInterval = parseInt(document.getElementById('inputPollInterval').value);
  config.compactArtSize = parseInt(document.getElementById('inputCompactArtSize').value);
  config.compactRightGap = parseInt(document.getElementById('inputCompactRightGap').value);
  config.compactTitleSize = parseInt(document.getElementById('inputCompactTitleSize').value);
  config.compactArtistSize = parseInt(document.getElementById('inputCompactArtistSize').value);
  config.compactEqBarsHeight = parseInt(document.getElementById('inputCompactEqBarsHeight').value);
  config.compactEqBarWidth = parseFloat(document.getElementById('inputCompactEqBarWidth').value);
  config.compactProgressHeight = parseInt(document.getElementById('inputCompactProgressHeight').value);
}

function pushLivePreview(){const frame = document.getElementById('previewFrame');if(frame.contentWindow) frame.contentWindow.postMessage({ type:'config-update', config }, '*')}

function getOBSUrl(){return getEffectiveOrigin() + '/music-player.html'}

document.querySelectorAll('#panel-layout input, #panel-layout select, #panel-appearance input, #panel-appearance select, #panel-metadata input, #panel-metadata select, #panel-behavior input, #panel-behavior select').forEach(el=>{
  el.addEventListener('input', ()=>{readFormIntoConfig();updateRangeLabels();pushLivePreview()});
});

document.querySelectorAll('.choice-card').forEach(card=>{card.addEventListener('click', ()=>{if(card.dataset.choice){config[card.dataset.choice] = card.dataset.value;updateChoiceCards();pushLivePreview()}})});

document.getElementById('btnResetDefaults').addEventListener('click', ()=>{config = { ...DEFAULT_CONFIG };populateForm();syncCustomSelects();pushLivePreview();showToast('Reset to defaults ✓')});
document.getElementById('btnSave').addEventListener('click', ()=>{readFormIntoConfig();localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config));saveDashTheme();if(bc) bc.postMessage({ type:'config-update', config });relaySend({ type:'config-update', config });pushLivePreview();showToast('Saved & pushed to overlay ✓')});

function showToast(msg){const t = document.getElementById('toast');t.textContent = msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'), 2400)}

function base64UrlEncode(buffer){return btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function generateCodeChallenge(verifier){const data = new TextEncoder().encode(verifier);const digest = await crypto.subtle.digest('SHA-256', data);return base64UrlEncode(digest)}
function generateCodeVerifier(length=64){const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';const randomValues = crypto.getRandomValues(new Uint8Array(length));let result = '';randomValues.forEach(v=> result += chars[v % chars.length]);return result}
function getRedirectUri(){return getEffectiveOrigin() + '/music-player-dashboard.html'}
function saveClientId(){const clientId = document.getElementById('inputClientId').value.trim();if(clientId) localStorage.setItem(LS_CLIENT_ID_KEY, clientId)}
function restoreClientId(){const saved = localStorage.getItem(LS_CLIENT_ID_KEY);if(saved) document.getElementById('inputClientId').value = saved}
function getAuth(){try{ return JSON.parse(localStorage.getItem(LS_AUTH_KEY) || 'null'); }catch(e){ return null; }}
function saveAuth(auth){ localStorage.setItem(LS_AUTH_KEY, JSON.stringify(auth)); }
async function startSpotifyLogin(){const clientId = document.getElementById('inputClientId').value.trim();if(!clientId){ alert('Enter your Spotify Client ID first.'); return; }saveClientId();const verifier = generateCodeVerifier();localStorage.setItem(LS_PKCE_KEY, verifier);const challenge = await generateCodeChallenge(verifier);const params = new URLSearchParams({client_id: clientId,response_type: 'code',redirect_uri: getRedirectUri(),code_challenge_method: 'S256',code_challenge: challenge,scope: SPOTIFY_SCOPES});window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`}
async function exchangeCodeForToken(code){const verifier = localStorage.getItem(LS_PKCE_KEY);const clientId = localStorage.getItem(LS_CLIENT_ID_KEY) || document.getElementById('inputClientId').value.trim();const body = new URLSearchParams({client_id: clientId,grant_type: 'authorization_code',code,redirect_uri: getRedirectUri(),code_verifier: verifier});const res = await fetch(SPOTIFY_TOKEN_URL, {method:'POST',headers:{ 'Content-Type':'application/x-www-form-urlencoded' },body});if(!res.ok){ throw new Error('Token exchange failed: ' + res.status); }const data = await res.json();const auth = {clientId,redirectUri: getRedirectUri(),accessToken: data.access_token,refreshToken: data.refresh_token,expiresAt: Date.now() + (data.expires_in * 1000)};saveAuth(auth);localStorage.removeItem(LS_PKCE_KEY);return auth}
async function refreshAccessToken(auth){const body = new URLSearchParams({client_id: auth.clientId,grant_type: 'refresh_token',refresh_token: auth.refreshToken});const res = await fetch(SPOTIFY_TOKEN_URL, {method:'POST',headers:{ 'Content-Type':'application/x-www-form-urlencoded' },body});if(!res.ok) throw new Error('Refresh failed: ' + res.status);const data = await res.json();const updated = { ...auth, accessToken:data.access_token,refreshToken:data.refresh_token || auth.refreshToken,expiresAt: Date.now() + (data.expires_in*1000) };saveAuth(updated);return updated}
async function getValidAccessToken(){let auth = getAuth();if(!auth) return null;if(!auth.expiresAt || Date.now() > (auth.expiresAt - 60000)){try{ auth = await refreshAccessToken(auth); }catch(e){ return null; }}return auth.accessToken}

async function getPlaybackState(){const token = await getValidAccessToken();if(!token) return null;try{const res = await fetch('https://api.spotify.com/v1/me/player', { headers:{ 'Authorization': `Bearer ${token}` } });if(res.status === 204) return null;if(res.ok) return await res.json();return null}catch(e){return null}}

// ============================================
// NEW: DEVICE SWITCHER
// ============================================
function loadSelectedDeviceId(){
  try{ selectedDeviceId = localStorage.getItem(LS_DEVICE_ID_KEY) || null; }catch(e){ selectedDeviceId = null; }
}
function saveSelectedDeviceId(id){
  selectedDeviceId = id;
  try{ localStorage.setItem(LS_DEVICE_ID_KEY, id); }catch(e){}
}

async function fetchDevices(){
  const token = await getValidAccessToken();
  if(!token) return;
  try{
    const res = await fetch('https://api.spotify.com/v1/me/player/devices', { headers:{ 'Authorization': `Bearer ${token}` } });
    if(!res.ok) return;
    const data = await res.json();
    deviceList = data.devices || [];
    renderDeviceOptions();
  }catch(e){}
}

function renderDeviceOptions(){
  const optionsList = document.getElementById('deviceSelectOptions');
  const label = document.getElementById('deviceSelectLabel');
  const dot = document.getElementById('deviceStatusDot');

  if(!deviceList.length){
    label.textContent = 'No devices found';
    optionsList.innerHTML = '<div class="select-option" style="opacity:.6;cursor:default;">Open Spotify on a device first</div>';
    dot.classList.remove('active');
    return;
  }

  // If nothing selected yet, or previous selection vanished, default to the API-reported active device
  const activeFromApi = deviceList.find(d=>d.is_active);
  if(!selectedDeviceId || !deviceList.some(d=>d.id === selectedDeviceId)){
    if(activeFromApi) saveSelectedDeviceId(activeFromApi.id);
    else saveSelectedDeviceId(deviceList[0].id);
  }

  optionsList.innerHTML = '';
  deviceList.forEach(dev=>{
    const opt = document.createElement('div');
    opt.className = 'select-option' + (dev.id === selectedDeviceId ? ' selected' : '');
    opt.dataset.value = dev.id;
    opt.textContent = `${dev.is_active ? '● ' : ''}${dev.name} (${dev.type})`;
    opt.addEventListener('click', (e)=>{
      e.stopPropagation();
      saveSelectedDeviceId(dev.id);
      renderDeviceOptions();
      transferPlaybackToDevice(dev.id);
      document.getElementById('deviceSelectOptions').classList.add('hidden');
      document.getElementById('deviceSelect').classList.remove('open');
    });
    optionsList.appendChild(opt);
  });

  const selectedDevice = deviceList.find(d=>d.id === selectedDeviceId);
  label.textContent = selectedDevice ? `${selectedDevice.name} (${selectedDevice.type})` : 'Select a device';
  dot.classList.toggle('active', !!(selectedDevice && selectedDevice.is_active));
}

async function transferPlaybackToDevice(deviceId){
  const token = await getValidAccessToken();
  if(!token) return;
  try{
    await fetch('https://api.spotify.com/v1/me/player', {
      method:'PUT',
      headers:{ 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ device_ids:[deviceId], play:false })
    });
    showToast('Switched active device ✓');
  }catch(e){
    showToast('Could not switch device.');
  }
}

document.getElementById('btnRefreshDevices').addEventListener('click', ()=>{ fetchDevices(); showToast('Refreshing devices...'); });


// ============================================
// NEW: VOLUME SLIDER
// ============================================
function updateVolumeIcon(vol){
  const svg = document.getElementById('volumeIcon');
  if(vol == 0){
    svg.innerHTML = '<path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>';
  } else if(vol < 50){
    svg.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02z"/>';
  } else {
    svg.innerHTML = '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
  }
}

let volumeDebounceTimer = null;
document.getElementById('inputVolume').addEventListener('input', (e)=>{
  const vol = parseInt(e.target.value);
  document.getElementById('valVolume').textContent = vol + '%';
  updateVolumeIcon(vol);
  clearTimeout(volumeDebounceTimer);
  volumeDebounceTimer = setTimeout(()=> setSpotifyVolume(vol), 300);
});

async function setSpotifyVolume(vol){
  const token = await getValidAccessToken();
  if(!token){ showToast('Not connected to Spotify.'); return; }
  try{
    const res = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${vol}`, {
      method:'PUT',
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    if(res.status === 404){ showToast('No active device to set volume on.'); }
  }catch(e){
    showToast('Volume change failed.');
  }
}

// ============================================
// NEW: SHUFFLE / REPEAT
// ============================================
function updateShuffleRepeatButtons(){
  const shuffleBtn = document.getElementById('queueBtnShuffle');
  const repeatBtn = document.getElementById('queueBtnRepeat');
  shuffleBtn.classList.toggle('active-toggle', shuffleState);
  repeatBtn.classList.toggle('active-toggle', repeatState !== 'off');
  const svg = repeatBtn.querySelector('svg');
  if(repeatState === 'track'){
    svg.innerHTML = '<path d="M7 7h7v3l4-4-4-4v3H5v6h2V7zm10 10h-7v-3l-4 4 4 4v-3h9v-6h-2v4zm-6.8-6.8l1.4-1.4L13 11.17V9h-1v4.83l1.7-1.7-1.5-1.93z"/><text x="12" y="14" font-size="7" text-anchor="middle" fill="currentColor">1</text>';
  } else {
    svg.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>';
  }
}

document.getElementById('queueBtnShuffle').addEventListener('click', async ()=>{
  shuffleState = !shuffleState;
  updateShuffleRepeatButtons();
  const token = await getValidAccessToken();
  if(!token){ showToast('Not connected to Spotify.'); return; }
  try{
    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${shuffleState}`, {
      method:'PUT',
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    showToast(shuffleState ? 'Shuffle on ✓' : 'Shuffle off');
  }catch(e){
    showToast('Shuffle toggle failed.');
  }
});

document.getElementById('queueBtnRepeat').addEventListener('click', async ()=>{
  const order = ['off','context','track'];
  const idx = order.indexOf(repeatState);
  repeatState = order[(idx + 1) % order.length];
  updateShuffleRepeatButtons();
  const token = await getValidAccessToken();
  if(!token){ showToast('Not connected to Spotify.'); return; }
  try{
    await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${repeatState}`, {
      method:'PUT',
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    const labelMap = { off:'Repeat off', context:'Repeat: playlist', track:'Repeat: track' };
    showToast(labelMap[repeatState]);
  }catch(e){
    showToast('Repeat toggle failed.');
  }
});

async function syncShuffleRepeatFromState(){
  const state = await getPlaybackState();
  if(!state) return;
  shuffleState = !!state.shuffle_state;
  repeatState = state.repeat_state || 'off';
  updateShuffleRepeatButtons();
  if(typeof state.device?.volume_percent === 'number'){
    document.getElementById('inputVolume').value = state.device.volume_percent;
    document.getElementById('valVolume').textContent = state.device.volume_percent + '%';
    updateVolumeIcon(state.device.volume_percent);
  }
}

// ============================================
// NEW: PLAYLIST BROWSER
// ============================================
async function fetchPlaylists(showToastOnDone){
  const token = await getValidAccessToken();
  if(!token){ showToast('Not connected to Spotify.'); return; }
  const grid = document.getElementById('playlistGrid');
  grid.innerHTML = '<div class="status-placeholder">Loading playlists...</div>';
  let results = [];
  let url = 'https://api.spotify.com/v1/me/playlists?limit=50';
  try{
    while(url){
      const res = await fetch(url, { headers:{ 'Authorization': `Bearer ${token}` } });
      if(!res.ok) break;
      const data = await res.json();
      results = results.concat(data.items || []);
      url = data.next;
    }
    allPlaylists = results.filter(p => p); // Spotify can return null entries for removed playlists
    renderPlaylistGrid(allPlaylists);
    if(showToastOnDone) showToast('Playlists refreshed ✓');
  }catch(e){
    grid.innerHTML = '<div class="status-placeholder">Could not load playlists.</div>';
  }
}

function renderPlaylistGrid(list){
  const grid = document.getElementById('playlistGrid');
  if(!list.length){
    grid.innerHTML = '<div class="status-placeholder">No playlists found.</div>';
    return;
  }
  grid.innerHTML = '';
  list.forEach(pl=>{
    const art = pl.images?.[0]?.url || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    const card = document.createElement('div');
    card.className = 'playlist-card';
    card.innerHTML = `
      <img src="${art}" alt="${pl.name}" loading="lazy">
      <button type="button" class="playlist-card-play" title="Play this playlist">
        <svg class="svg-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <div class="playlist-card-info">
        <div class="playlist-card-name">${pl.name}</div>
        <div class="playlist-card-meta">${pl.tracks?.total ?? 0} tracks · ${pl.owner?.display_name || 'Unknown'}</div>
      </div>
    `;
    card.querySelector('.playlist-card-play').addEventListener('click', (e)=>{
      e.stopPropagation();
      playPlaylist(pl.uri, pl.name);
    });
    card.querySelector('.playlist-card-info').addEventListener('click', ()=> toggleExpandPlaylist(pl));
    grid.appendChild(card);
  });
}

async function playPlaylist(contextUri, name){
  const token = await getValidAccessToken();
  if(!token){ showToast('Not connected to Spotify.'); return; }
  try{
    const res = await fetch('https://api.spotify.com/v1/me/player/play' + (selectedDeviceId ? `?device_id=${selectedDeviceId}` : ''), {
      method:'PUT',
      headers:{ 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ context_uri: contextUri })
    });
    if(res.ok || res.status === 204){
      showToast(`Playing "${name}" ✓`);
      setTimeout(fetchAndUpdateQueue, 500);
    } else if(res.status === 404){
      showToast('No active device found. Open Spotify somewhere first.');
    } else {
      showToast('Could not start playlist.');
    }
  }catch(e){
    showToast('Playback request failed.');
  }
}

async function toggleExpandPlaylist(pl){
  const panel = document.getElementById('playlistTracksPanel');
  if(expandedPlaylistId === pl.id){
    expandedPlaylistId = null;
    panel.classList.add('hidden');
    panel.innerHTML = '';
    return;
  }
  expandedPlaylistId = pl.id;
  panel.classList.remove('hidden');
  panel.innerHTML = '<div class="status-placeholder">Loading tracks...</div>';

  const token = await getValidAccessToken();
  if(!token){ showToast('Not connected to Spotify.'); return; }
  try{
    const res = await fetch(`https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=50&fields=items(track(uri,name,artists,album(name,images)))`, {
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    if(!res.ok){ panel.innerHTML = '<div class="status-placeholder">Could not load tracks.</div>'; return; }
    const data = await res.json();
    renderPlaylistTracksPanel(pl, (data.items || []).map(i=>i.track).filter(Boolean));
  }catch(e){
    panel.innerHTML = '<div class="status-placeholder">Could not load tracks.</div>';
  }
}

function renderPlaylistTracksPanel(pl, tracks){
  const panel = document.getElementById('playlistTracksPanel');
  panel.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'playlist-tracks-header';
  header.innerHTML = `<span>${pl.name}</span><button type="button" class="icon-btn" title="Close">✕</button>`;
  header.querySelector('button').addEventListener('click', ()=> toggleExpandPlaylist(pl));
  panel.appendChild(header);

  if(!tracks.length){
    const empty = document.createElement('div');
    empty.className = 'status-placeholder';
    empty.textContent = 'No tracks in this playlist.';
    panel.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'search-results-list playlist-tracks-list';
  tracks.forEach(track=>{
    const art = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '';
    const artists = track.artists?.map(a=>a.name).join(', ') || 'Unknown Artist';
    const row = document.createElement('div');
    row.className = 'search-result-row';
    row.innerHTML = `
      <img src="${art}" alt="Art">
      <div class="search-result-details">
        <div class="search-result-title">${track.name}</div>
        <div class="search-result-artist">${artists}</div>
      </div>
      <button type="button" class="icon-btn" title="Play from here">
        <svg class="svg-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z"/></svg>
      </button>
      <button type="button" class="icon-btn" title="Add to queue">
        <svg class="svg-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
      </button>
    `;
    const actionButtons = row.querySelectorAll('button');
    actionButtons[0].addEventListener('click', ()=> playPlaylistFromTrack(pl.uri, track.uri, track.name));
    actionButtons[1].addEventListener('click', ()=> addTrackToQueue(track.uri, track.name));
    list.appendChild(row);
  });
  panel.appendChild(list);
}

async function playPlaylistFromTrack(contextUri, trackUri, name){
  const token = await getValidAccessToken();
  if(!token){ showToast('Not connected to Spotify.'); return; }
  try{
    const res = await fetch('https://api.spotify.com/v1/me/player/play' + (selectedDeviceId ? `?device_id=${selectedDeviceId}` : ''), {
      method:'PUT',
      headers:{ 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
      body: JSON.stringify({ context_uri: contextUri, offset:{ uri:trackUri } })
    });
    if(res.ok || res.status === 204){
      showToast(`Playing "${name}" ✓`);
      setTimeout(fetchAndUpdateQueue, 500);
    } else if(res.status === 404){
      showToast('No active device found. Open Spotify somewhere first.');
    } else {
      showToast('Could not start track.');
    }
  }catch(e){
    showToast('Playback request failed.');
  }
}

document.getElementById('btnRefreshPlaylists').addEventListener('click', ()=> fetchPlaylists(true));
document.getElementById('inputPlaylistFilter').addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  const filtered = q ? allPlaylists.filter(p=> p.name.toLowerCase().includes(q)) : allPlaylists;
  renderPlaylistGrid(filtered);
});

// ============================================
// SEARCH + ADD/REMOVE FROM QUEUE (toggle select)
// ============================================
let queuedTrackUris = new Set();

async function searchTracks(query){
  const token = await getValidAccessToken();
  if(!token){ showToast('Not connected to Spotify.'); return; }
  if(!query || !query.trim()){ document.getElementById('searchResultsList').innerHTML = ''; return; }
  try{
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8`, {
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    if(!res.ok) return;
    const data = await res.json();
    renderSearchResults(data.tracks?.items || []);
  }catch(e){
    showToast('Search failed.');
  }
}

function setQueueButtonState(btn, isQueued){
  btn.dataset.queued = isQueued ? '1' : '0';
  btn.classList.toggle('active-toggle', isQueued);
  btn.title = isQueued ? 'Selected — click to deselect' : 'Add to queue';
  btn.querySelector('svg').innerHTML = isQueued
    ? '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>'
    : '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>';
}

async function toggleQueueSelection(uri, name, btn){
  const isQueued = btn.dataset.queued === '1';
  if(!isQueued){
    const added = await addTrackToQueue(uri, name);
    if(added){
      queuedTrackUris.add(uri);
      setQueueButtonState(btn, true);
    }
  } else {
    queuedTrackUris.delete(uri);
    setQueueButtonState(btn, false);
    showToast("Deselected — Spotify's API can't remove a single track already in queue. Use Next/skip when it comes up.");
  }
}

function renderSearchResults(tracks){
  const container = document.getElementById('searchResultsList');
  if(!tracks.length){
    container.innerHTML = '<div style="text-align:center; color:var(--text-tertiary); padding:14px; font-family:var(--font-mono); font-size:12px;">No results found.</div>';
    return;
  }
  container.innerHTML = '';
  tracks.forEach(track=>{
    const art = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '';
    const artists = track.artists?.map(a=>a.name).join(', ') || 'Unknown Artist';
    const isQueued = queuedTrackUris.has(track.uri);
    const row = document.createElement('div');
    row.className = 'search-result-row';
    row.innerHTML = `
      <img src="${art}" alt="Art">
      <div class="search-result-details">
        <div class="search-result-title">${track.name}</div>
        <div class="search-result-artist">${artists}</div>
      </div>
      <button type="button" class="icon-btn${isQueued ? ' active-toggle' : ''}" data-queued="${isQueued ? '1' : '0'}" title="${isQueued ? 'Selected — click to deselect' : 'Add to queue'}">
        <svg class="svg-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${isQueued ? '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' : '<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>'}</svg>
      </button>
    `;
    row.querySelector('button').addEventListener('click', (e)=> toggleQueueSelection(track.uri, track.name, e.currentTarget));
    container.appendChild(row);
  });
}

async function addTrackToQueue(uri, name){
  const token = await getValidAccessToken();
  if(!token){ showToast('Not connected to Spotify.'); return false; }
  try{
    const deviceParam = selectedDeviceId ? `&device_id=${selectedDeviceId}` : '';
    const res = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}${deviceParam}`, {
      method:'POST',
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    if(res.ok || res.status === 204){
      showToast(`Added "${name}" to queue ✓`);
      setTimeout(fetchAndUpdateQueue, 500);
      return true;
    } else if(res.status === 404){
      showToast('No active device found. Open Spotify somewhere first.');
      return false;
    } else {
      showToast('Could not add to queue.');
      return false;
    }
  }catch(e){
    showToast('Add to queue failed.');
    return false;
  }
}

document.getElementById('btnSearchTrack').addEventListener('click', ()=> searchTracks(document.getElementById('inputSearchQuery').value));
document.getElementById('inputSearchQuery').addEventListener('input', (e)=>{
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(()=> searchTracks(e.target.value), 500);
});
document.getElementById('inputSearchQuery').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){ e.preventDefault(); searchTracks(e.target.value); }
});

// ============================================
// NEW: RECENTLY PLAYED
// ============================================
function formatRelativeTime(isoString){
  const then = new Date(isoString).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if(mins < 1) return 'just now';
  if(mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if(hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function fetchRecentlyPlayed(){
  const token = await getValidAccessToken();
  if(!token) return;
  try{
    const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=8', {
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    if(!res.ok) return;
    const data = await res.json();
    renderRecentlyPlayed(data.items || []);
  }catch(e){}
}

function renderRecentlyPlayed(items){
  const container = document.getElementById('recentListTracks');
  if(!items.length){
    container.innerHTML = '<div style="text-align:center; color:var(--text-tertiary); padding:14px; font-family:var(--font-mono); font-size:12px;">No recent history yet.</div>';
    return;
  }
  container.innerHTML = '';
  items.forEach(item=>{
    const track = item.track;
    const art = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '';
    const artists = track.artists?.map(a=>a.name).join(', ') || 'Unknown Artist';
    const row = document.createElement('div');
    row.className = 'recent-row-item';
    row.innerHTML = `
      <img src="${art}" alt="Art">
      <div class="recent-row-details">
        <div class="recent-row-title">${track.name}</div>
        <div class="recent-row-artist">${artists}</div>
      </div>
      <div class="recent-row-time">${formatRelativeTime(item.played_at)}</div>
    `;
    container.appendChild(row);
  });
}

// ============================================
// NEW: LIKE / SAVE TO LIBRARY
// ============================================
let currentTrackId = null;
async function checkSavedStatus(trackId){
  const token = await getValidAccessToken();
  if(!token || !trackId) return false;
  try{
    const res = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackId}`, {
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    if(!res.ok) return false;
    const data = await res.json();
    return !!data[0];
  }catch(e){ return false; }
}

async function toggleSavedTrack(){
  const token = await getValidAccessToken();
  if(!token || !currentTrackId){ showToast('Not connected to Spotify.'); return; }
  const btn = document.getElementById('btnLikeTrack');
  const isSaved = btn.dataset.saved === '1';
  try{
    const res = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${currentTrackId}`, {
      method: isSaved ? 'DELETE' : 'PUT',
      headers:{ 'Authorization': `Bearer ${token}` }
    });
    if(res.ok || res.status === 200 || res.status === 204){
      setLikeButtonState(!isSaved);
      showToast(isSaved ? 'Removed from Liked Songs' : 'Added to Liked Songs ✓');
    }
  }catch(e){
    showToast('Could not update Liked Songs.');
  }
}

function setLikeButtonState(saved){
  const btn = document.getElementById('btnLikeTrack');
  if(!btn) return;
  btn.dataset.saved = saved ? '1' : '0';
  btn.classList.toggle('active-toggle', saved);
  btn.querySelector('svg').innerHTML = saved
    ? '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>'
    : '<path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>';
}

// ============================================
// EXISTING: QUEUE & NOW PLAYING
// ============================================
async function fetchAndUpdateQueue() {
  const token = await getValidAccessToken();
  if (!token) return;
  
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/queue', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    lastQueueTracks = data.queue || [];
    
    const cardActive = document.getElementById('queueActiveTrack');
    if (data.currently_playing) {
      const activeTrack = data.currently_playing;
      const albumArt = activeTrack.album?.images?.[0]?.url || 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
      const parsedArtists = activeTrack.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
      
      if(currentTrackId !== activeTrack.id){
        currentTrackId = activeTrack.id;
        pauseSongAnnouncedForTrackId = null;
        twitchPauseAnnouncedForTrackId = null;
        checkSavedStatus(currentTrackId).then(setLikeButtonState);
        maybeAnnounceTrack(activeTrack);
      }

      cardActive.innerHTML = `
        <img src="${albumArt}" alt="Album Cover">
        <div class="now-playing-large-info">
          <div class="now-playing-large-title">${activeTrack.name}</div>
          <div class="now-playing-large-artist">${parsedArtists}</div>
        </div>
        <div class="now-playing-large-actions">
          <button type="button" class="icon-btn" id="btnLikeTrack" title="Save to Liked Songs" data-saved="0">
            <svg class="svg-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>
          </button>
        </div>
      `;
      document.getElementById('btnLikeTrack').addEventListener('click', toggleSavedTrack);
      checkSavedStatus(currentTrackId).then(setLikeButtonState);
    } else {
      currentTrackId = null;
      cardActive.innerHTML = `<div style="text-align:center; width:100%; color:var(--text-secondary); font-family:var(--font-mono); font-size:12px;">Nothing streaming right now.</div>`;
    }
    
    const tracksContainer = document.getElementById('queueListTracks');
    if (data.queue && data.queue.length > 0) {
      tracksContainer.innerHTML = '';
      const displayQueueLimit = data.queue.slice(0, 10);
      
      displayQueueLimit.forEach((track, index) => {
        const thumbArt = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '';
        const trackArtists = track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';
        const mins = Math.floor(track.duration_ms / 60000);
        const secs = Math.floor((track.duration_ms % 60000) / 1000).toString().padStart(2, '0');
        
        const row = document.createElement('div');
        row.className = 'queue-row-item';
        row.innerHTML = `
          <div class="queue-row-index">${(index + 1).toString().padStart(2, '0')}</div>
          <img src="${thumbArt}" alt="Art">
          <div class="queue-row-details">
            <div class="queue-row-title">${track.name}</div>
            <div class="queue-row-artist">${trackArtists}</div>
          </div>
          <div class="queue-row-duration">${mins}:${secs}</div>
        `;
        row.addEventListener('click', () => jumpToQueueTrack(track.uri));
        tracksContainer.appendChild(row);
      });
    } else {
      tracksContainer.innerHTML = `<div style="text-align:center; color:var(--text-tertiary); padding:20px; font-family:var(--font-mono); font-size:12px;">No upcoming tracks waiting in your Spotify queue.</div>`;
    }
  } catch(e) {
    console.error("Queue fetch failed: ", e);
  }
}

async function jumpToQueueTrack(trackUri) {
  const token = await getValidAccessToken();
  if (!token) { showToast('Not connected to Spotify.'); return; }
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/play' + (selectedDeviceId ? `?device_id=${selectedDeviceId}` : ''), {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [trackUri] })
    });
    if (res.ok) {
      showToast('Jumping to track ✓');
      setTimeout(fetchAndUpdateQueue, 400);
    } else {
      showToast('Unable to skip directly. Premium account required.');
    }
  } catch(e) {
    showToast('Playback request failed.');
  }
}

async function refreshConnectionStatus(){const auth = getAuth();const led = document.getElementById('statusLed');const text = document.getElementById('statusText');const connectBtn = document.getElementById('btnConnect');const disconnectBtn = document.getElementById('btnDisconnect');if(!auth){led.classList.remove('on');text.textContent = 'Not connected yet.';connectBtn.classList.remove('hidden');disconnectBtn.classList.add('hidden');return}document.getElementById('inputClientId').value = auth.clientId;connectBtn.classList.add('hidden');disconnectBtn.classList.remove('hidden');const token = await getValidAccessToken();if(!token){led.classList.remove('on');text.innerHTML = '<strong>Connection expired.</strong> Reconnect below.';connectBtn.classList.remove('hidden');disconnectBtn.classList.add('hidden');return}led.classList.add('on');try{const res = await fetch(SPOTIFY_ME_URL, { headers:{ 'Authorization': `Bearer ${token}` } });if(res.ok){const me = await res.json();text.innerHTML = `Connected as <strong>${me.display_name || me.id}</strong>.`; }else{text.innerHTML = '<strong>Connected.</strong>'}}catch(e){text.innerHTML = '<strong>Connected.</strong>'}}
document.getElementById('btnConnect').addEventListener('click', startSpotifyLogin);
document.getElementById('btnDisconnect').addEventListener('click', async ()=>{
  localStorage.removeItem(LS_AUTH_KEY);
  if(bc) bc.postMessage({ type:'auth-cleared' });
  await refreshConnectionStatus();
  showToast('Disconnected from Spotify ✓');
});
async function playbackAction(method, path){const token = await getValidAccessToken();if(!token){ showToast('Not connected to Spotify.'); return; }try{const devSuffix = selectedDeviceId ? (path.includes('?') ? `&device_id=${selectedDeviceId}` : `?device_id=${selectedDeviceId}`) : '';const res = await fetch(`https://api.spotify.com/v1/me/player/${path}${devSuffix}`, { method, headers:{ 'Authorization': `Bearer ${token}` } });if(res.status === 404){ showToast('No active Spotify device found. Open Spotify somewhere first.'); }}catch(e){ showToast('Playback control failed.'); }}

// ============================================
// SETTINGS TAB PLAYBACK BUTTONS (Prev / Play-Pause / Next)
// ============================================
async function updateQueuePlayPauseIcon(){
  const btn = document.getElementById('queueBtnPlayPause');
  if(!btn) return;
  const svg = btn.querySelector('svg');
  const state = await getPlaybackState();
  const isPlaying = !!(state && state.is_playing);
  svg.innerHTML = isPlaying
    ? '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>'
    : '<path d="M8 5v14l11-7z"/>';
  btn.dataset.playing = isPlaying ? '1' : '0';
  checkNextSongAlert(state);
  checkPauseSongAlert(state);
  checkResumeSongAlert(state);
  checkTwitchNextSongAlert(state);
  checkTwitchPauseAlert(state);
  checkTwitchResumeAlert(state);
}

document.getElementById('queueBtnPrev').addEventListener('click', async ()=>{
  await playbackAction('POST', 'previous');
  setTimeout(()=>{ fetchAndUpdateQueue(); updateQueuePlayPauseIcon(); }, 400);
});

document.getElementById('queueBtnPlayPause').addEventListener('click', async ()=>{
  const btn = document.getElementById('queueBtnPlayPause');
  const isPlaying = btn.dataset.playing === '1';
  await playbackAction('PUT', isPlaying ? 'pause' : 'play');
  setTimeout(updateQueuePlayPauseIcon, 400);
});

document.getElementById('queueBtnPlaybackNext').addEventListener('click', async ()=>{
  await playbackAction('POST', 'next');
  setTimeout(()=>{ fetchAndUpdateQueue(); updateQueuePlayPauseIcon(); }, 400);
});

// ============================================
// NEW: CONFIG EXPORT / IMPORT (JSON backup & restore)
// ============================================
function gatherFullConfigBundle(){
  readFormIntoConfig();
  readDiscordForm();
  readTwitchForm();
  readSongRequestForm();
  readChatCommandsForm();

  // --- NEW ADDITION: Read Twitch credentials directly from DOM inputs ---
  const twitchStreamAccount = document.getElementById('inputTwitchChannel')?.value || (typeof twitchConfig !== 'undefined' ? twitchConfig.streamAccount : '') || '';
  const twitchBotAccount = document.getElementById('inputBotUsername')?.value || (typeof twitchConfig !== 'undefined' ? twitchConfig.botAccount : '') || '';
  const twitchBotToken = document.getElementById('inputBotToken')?.value || (typeof twitchConfig !== 'undefined' ? twitchConfig.botToken : '') || '';

  // --- NEW ADDITION: Gather wallpaper history array ---
  let currentWallpaperHistory = [];
  try {
    if (typeof wallpaperHistory !== 'undefined' && Array.isArray(wallpaperHistory)) {
      currentWallpaperHistory = wallpaperHistory;
    } else {
      currentWallpaperHistory = JSON.parse(localStorage.getItem('wallpaperHistory') || '[]');
    }
  } catch(e) {
    console.warn('Could not parse wallpaper history:', e);
  }

  return {
    __fallenoneart_export__: true,
    version: 1,
    exportedAt: new Date().toISOString(),
    config,
    dashTheme,
    discordConfig,
    twitchConfig: {
      ...(twitchConfig || {}),
      streamAccount: twitchStreamAccount,
      botAccount: twitchBotAccount,
      botToken: twitchBotToken
    },
    songRequestConfig,
    chatCommandsConfig,
    hotkeysEnabled,
    customKeybinds,
    // --- NEW ADDITIONS IN EXPORT BUNDLE ---
    twitchStreamAccount,
    twitchBotAccount,
    twitchBotToken,
    wallpaperHistory: currentWallpaperHistory
  };
}

function downloadConfigBundle(){
  try{
    const bundle = gatherFullConfigBundle();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
    a.href = url;
    a.download = `fallenoneart-music-player-config-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Config downloaded ✓');
  }catch(e){
    console.error('Config export failed:', e);
    showToast('Could not export config — check the console for details.');
  }
}

function isPlainObject(val){
  return !!val && typeof val === 'object' && !Array.isArray(val);
}

function validateImportedBundle(data){
  if(!isPlainObject(data)){
    throw new Error('That file does not contain a valid config object.');
  }
  // Every top-level section is optional so partial/edited exports still import,
  // but if present it must be the right shape.
  if('config' in data && !isPlainObject(data.config)){
    throw new Error('The "config" section in that file is not valid.');
  }
  if('dashTheme' in data && !isPlainObject(data.dashTheme)){
    throw new Error('The "dashTheme" section in that file is not valid.');
  }
  if('discordConfig' in data && !isPlainObject(data.discordConfig)){
    throw new Error('The "discordConfig" section in that file is not valid.');
  }
  if('twitchConfig' in data && !isPlainObject(data.twitchConfig)){
    throw new Error('The "twitchConfig" section in that file is not valid.');
  }
  if('songRequestConfig' in data && !isPlainObject(data.songRequestConfig)){
    throw new Error('The "songRequestConfig" section in that file is not valid.');
  }
  if('chatCommandsConfig' in data && !isPlainObject(data.chatCommandsConfig)){
    throw new Error('The "chatCommandsConfig" section in that file is not valid.');
  }
  if('customKeybinds' in data && !Array.isArray(data.customKeybinds)){
    throw new Error('The "customKeybinds" section in that file is not valid.');
  }
  // --- NEW ADDITION: Validate wallpaperHistory if present ---
  if('wallpaperHistory' in data && !Array.isArray(data.wallpaperHistory)){
    throw new Error('The "wallpaperHistory" section in that file is not valid.');
  }

  if(!('config' in data) && !('dashTheme' in data) && !('discordConfig' in data) && !('twitchConfig' in data) && !('songRequestConfig' in data) && !('chatCommandsConfig' in data) && !('customKeybinds' in data) && !('wallpaperHistory' in data)){
    throw new Error('That file does not contain any recognizable FallenOneArt config data.');
  }
  return true;
}

function applyImportedBundle(data){
  if(isPlainObject(data.config)) config = { ...DEFAULT_CONFIG, ...data.config };
  if(isPlainObject(data.dashTheme)) dashTheme = { ...DEFAULT_DASH_THEME, ...data.dashTheme };
  if(isPlainObject(data.discordConfig)) discordConfig = { ...DEFAULT_DISCORD_CONFIG, ...data.discordConfig };
  if(isPlainObject(data.twitchConfig)) twitchConfig = { ...DEFAULT_TWITCH_CONFIG, ...data.twitchConfig };
  if(isPlainObject(data.songRequestConfig)) songRequestConfig = { ...DEFAULT_SONGREQUEST_CONFIG, ...data.songRequestConfig };
  if(isPlainObject(data.chatCommandsConfig)) chatCommandsConfig = { ...DEFAULT_CHATCOMMANDS_CONFIG, ...data.chatCommandsConfig };
  if(typeof data.hotkeysEnabled === 'boolean') hotkeysEnabled = data.hotkeysEnabled;
  if(Array.isArray(data.customKeybinds)){
    customKeybinds = data.customKeybinds.filter(b => isPlainObject(b) && typeof b.combo === 'string' && typeof b.action === 'string');
  }

  // --- NEW ADDITION: Restore Twitch Credentials to fields and object ---
  const streamAcc = data.twitchStreamAccount || data.twitchConfig?.streamAccount;
  const botAcc = data.twitchBotAccount || data.twitchConfig?.botAccount;
  const botTok = data.twitchBotToken || data.twitchConfig?.botToken;

  if (streamAcc !== undefined) {
    const el = document.getElementById('inputTwitchChannel');
    if (el) el.value = streamAcc;
    if (twitchConfig) twitchConfig.streamAccount = streamAcc;
  }
  if (botAcc !== undefined) {
    const el = document.getElementById('inputBotUsername');
    if (el) el.value = botAcc;
    if (twitchConfig) twitchConfig.botAccount = botAcc;
  }
  if (botTok !== undefined) {
    const el = document.getElementById('inputBotToken');
    if (el) el.value = botTok;
    if (twitchConfig) twitchConfig.botToken = botTok;
  }

  // --- NEW ADDITION: Restore Wallpaper History ---
  if (Array.isArray(data.wallpaperHistory)) {
    if (typeof wallpaperHistory !== 'undefined') {
      wallpaperHistory = data.wallpaperHistory;
    }
    localStorage.setItem('wallpaperHistory', JSON.stringify(data.wallpaperHistory));
    if (typeof renderWallpaperHistory === 'function') {
      renderWallpaperHistory();
    }
  }

  localStorage.setItem(LS_CONFIG_KEY, JSON.stringify(config));
  saveDashTheme();
  saveDiscordConfigToStorage();
  saveTwitchConfigToStorage();
  saveSongRequestConfigToStorage();
  saveChatCommandsConfigToStorage();
  saveHotkeysEnabled();
  saveCustomKeybinds();

  populateForm();
  syncCustomSelects();
  populateDashThemeForm();
  applyDashTheme();
  populateDiscordForm();
  populateTwitchForm();
  populateSongRequestForm();
  populateChatCommandsForm();
  document.getElementById('toggleHotkeysEnabled').checked = hotkeysEnabled;
  renderKeybindTable();
  pushLivePreview();
  if(bc) bc.postMessage({ type:'config-update', config });
  relaySend({ type:'config-update', config });
}

function handleImportConfigFile(file){
  if(!file){ return; }
  if(file.type && file.type !== 'application/json' && !file.name.toLowerCase().endsWith('.json')){
    showToast('Please choose a .json config file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (evt)=>{
    let parsed;
    try{
      parsed = JSON.parse(evt.target.result);
    }catch(err){
      showToast('That file is not valid JSON — import cancelled.');
      return;
    }
    try{
      validateImportedBundle(parsed);
      applyImportedBundle(parsed);
      showToast('Config imported ✓');
    }catch(err){
      console.error('Config import validation failed:', err);
      showToast(err.message || 'That config file looks corrupted — import cancelled.');
    }
  };
  reader.onerror = ()=>{
    showToast('Could not read that file.');
  };
  reader.readAsText(file);
}

document.getElementById('btnExportConfig').addEventListener('click', downloadConfigBundle);
document.getElementById('btnImportConfigTrigger').addEventListener('click', ()=>{
  document.getElementById('inputImportConfig').click();
});
document.getElementById('inputImportConfig').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  handleImportConfigFile(file);
  e.target.value = '';
});

// ============================================
// NEW: HOTKEYS & KEYWORD BINDS
// ============================================
function loadHotkeysEnabled(){
  try{
    const raw = localStorage.getItem(LS_HOTKEYS_ENABLED_KEY);
    hotkeysEnabled = raw === null ? true : raw === 'true';
  }catch(e){ hotkeysEnabled = true; }
}
function saveHotkeysEnabled(){
  try{ localStorage.setItem(LS_HOTKEYS_ENABLED_KEY, hotkeysEnabled ? 'true' : 'false'); }catch(e){}
}

function loadCustomKeybinds(){
  try{
    const raw = localStorage.getItem(LS_KEYBINDS_KEY);
    customKeybinds = raw ? JSON.parse(raw) : [ ...DEFAULT_KEYBINDS ];
  }catch(e){ customKeybinds = [ ...DEFAULT_KEYBINDS ]; }
}
function saveCustomKeybinds(){
  try{ localStorage.setItem(LS_KEYBINDS_KEY, JSON.stringify(customKeybinds)); }catch(e){}
}

const KEYBIND_ACTIONS = [
  { value:'playpause', label:'Toggle Play/Pause' },
  { value:'next', label:'Skip to Next' },
  { value:'previous', label:'Skip to Previous' },
  { value:'shuffle', label:'Toggle Shuffle' },
  { value:'repeat', label:'Cycle Repeat Mode' },
  { value:'volumeup', label:'Volume Up (+5%)' },
  { value:'volumedown', label:'Volume Down (-5%)' },
  { value:'like', label:'Save Current Track to Liked Songs' }
];

function runKeybindAction(action){
  switch(action){
    case 'playpause': document.getElementById('queueBtnPlayPause').click(); break;
    case 'next': document.getElementById('queueBtnPlaybackNext').click(); break;
    case 'previous': document.getElementById('queueBtnPrev').click(); break;
    case 'shuffle': document.getElementById('queueBtnShuffle').click(); break;
    case 'repeat': document.getElementById('queueBtnRepeat').click(); break;
    case 'volumeup': {
      const vol = Math.min(100, parseInt(document.getElementById('inputVolume').value || '50') + 5);
      document.getElementById('inputVolume').value = vol;
      document.getElementById('inputVolume').dispatchEvent(new Event('input'));
      break;
    }
    case 'volumedown': {
      const vol = Math.max(0, parseInt(document.getElementById('inputVolume').value || '50') - 5);
      document.getElementById('inputVolume').value = vol;
      document.getElementById('inputVolume').dispatchEvent(new Event('input'));
      break;
    }
    case 'like': {
      const likeBtn = document.getElementById('btnLikeTrack');
      if(likeBtn) likeBtn.click(); else showToast('Nothing is currently playing.');
      break;
    }
  }
}

function normalizeComboFromEvent(e){
  const parts = [];
  if(e.ctrlKey) parts.push('Ctrl');
  if(e.altKey) parts.push('Alt');
  if(e.shiftKey) parts.push('Shift');
  if(e.metaKey) parts.push('Meta');
  let key = e.key;
  if(key === ' ') key = 'Space';
  if(!['Control','Alt','Shift','Meta'].includes(key)){
    key = key.length === 1 ? key.toUpperCase() : key;
    parts.push(key);
  }
  return parts.join('+');
}

function isTypingContext(){
  const el = document.activeElement;
  if(!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function renderKeybindTable(){
  const table = document.getElementById('keybindTable');
  table.innerHTML = '';
  if(!customKeybinds.length){
    const empty = document.createElement('div');
    empty.className = 'hint';
    empty.textContent = 'No custom keybinds yet — click "+ Add Keybind" to create one.';
    table.appendChild(empty);
    return;
  }
  customKeybinds.forEach((bind, idx)=>{
    const row = document.createElement('div');
    row.className = 'keybind-row';

    const comboBtn = document.createElement('button');
    comboBtn.type = 'button';
    comboBtn.className = 'ghost-btn';
    comboBtn.textContent = bind.combo ? bind.combo : 'Click to set...';
    comboBtn.addEventListener('click', ()=>{
      comboBtn.textContent = 'Press a key combo...';
      const listener = (e)=>{
        e.preventDefault();
        const combo = normalizeComboFromEvent(e);
        bind.combo = combo;
        comboBtn.textContent = combo;
        saveCustomKeybinds();
        document.removeEventListener('keydown', listener, true);
      };
      document.addEventListener('keydown', listener, true);
    });

    const select = document.createElement('select');
    KEYBIND_ACTIONS.forEach(opt=>{
      const optionEl = document.createElement('option');
      optionEl.value = opt.value;
      optionEl.textContent = opt.label;
      if(bind.action === opt.value) optionEl.selected = true;
      select.appendChild(optionEl);
    });
    if(!bind.action) bind.action = KEYBIND_ACTIONS[0].value;
    select.addEventListener('change', ()=>{
      bind.action = select.value;
      saveCustomKeybinds();
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'icon-btn';
    removeBtn.title = 'Remove keybind';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', ()=>{
      customKeybinds.splice(idx, 1);
      saveCustomKeybinds();
      renderKeybindTable();
      showToast('Keybind removed');
    });

    row.appendChild(comboBtn);
    row.appendChild(select);
    row.appendChild(removeBtn);
    table.appendChild(row);
  });
}

document.getElementById('btnAddKeybind').addEventListener('click', ()=>{
  customKeybinds.push({ combo:'', action:KEYBIND_ACTIONS[0].value });
  saveCustomKeybinds();
  renderKeybindTable();
});

document.getElementById('toggleHotkeysEnabled').addEventListener('change', (e)=>{
  hotkeysEnabled = e.target.checked;
  saveHotkeysEnabled();
  showToast(hotkeysEnabled ? 'Hotkeys enabled ✓' : 'Hotkeys disabled');
});

// Global hotkey listener — default shortcuts + custom keyword binds.
// Only fires while this dashboard document/tab is focused, and never
// while the person is typing into a text field, select, or textarea.
document.addEventListener('keydown', (e)=>{
  if(!hotkeysEnabled) return;
  if(!document.hasFocus()) return;
  if(isTypingContext()) return;

  // Check custom binds first so users can override defaults if they want.
  const combo = normalizeComboFromEvent(e);
  const customMatch = customKeybinds.find(b => b.combo && b.combo === combo);
  if(customMatch){
    e.preventDefault();
    runKeybindAction(customMatch.action);
    return;
  }

  // Default shortcuts (only for plain, unmodified key presses)
  if(e.ctrlKey || e.altKey || e.metaKey) return;
  if(e.code === 'Space'){
    e.preventDefault();
    runKeybindAction('playpause');
  } else if(e.key === 'ArrowRight'){
    e.preventDefault();
    runKeybindAction('next');
  } else if(e.key === 'ArrowLeft'){
    e.preventDefault();
    runKeybindAction('previous');
  }
});

async function handleRedirectIfPresent(){const url = new URL(window.location.href);const code = url.searchParams.get('code');const error = url.searchParams.get('error');if(error){showToast('Spotify login cancelled.');history.replaceState({}, '', window.location.pathname);return}if(code){try{await exchangeCodeForToken(code);showToast('Connected to Spotify ✓')}catch(e){showToast('Could not complete Spotify login.')}history.replaceState({}, '', window.location.pathname)}}
(async function init(){loadConfig();populateForm();initCustomSelects();syncCustomSelects();restoreClientId();document.getElementById('inputClientId').addEventListener('change', saveClientId);document.getElementById('inputClientId').addEventListener('blur', saveClientId);document.getElementById('inputRedirectUri').value = getRedirectUri();document.getElementById('inputOBSURL').value = getOBSUrl();const previewFrame = document.getElementById('previewFrame');previewFrame.addEventListener('load', pushLivePreview);if (previewFrame.contentDocument?.readyState === 'complete') pushLivePreview();await handleRedirectIfPresent();await refreshConnectionStatus();loadDashTheme();loadWallpaperHistory();populateDashThemeForm();applyDashTheme();loadPreviewOpacity();applyPreviewOpacity();loadSelectedDeviceId();loadDiscordConfig();loadAvatarUrlHistory();loadAvatarUploadHistory();populateDiscordForm();loadHotkeysEnabled();loadCustomKeybinds();document.getElementById('toggleHotkeysEnabled').checked = hotkeysEnabled;renderKeybindTable();loadTwitchConfig();populateTwitchForm();loadSongRequestConfig();populateSongRequestForm();loadChatCommandsConfig();populateChatCommandsForm();autoConnectTwitchBotIfSaved();
  setInterval(fetchAndUpdateQueue, 2000);
  setInterval(updateQueuePlayPauseIcon, 3000);
  setInterval(fetchDevices, 15000);
  setInterval(fetchRecentlyPlayed, 30000);
  fetchAndUpdateQueue();
  updateQueuePlayPauseIcon();
  fetchDevices();
  fetchRecentlyPlayed();
  fetchPlaylists();
  syncShuffleRepeatFromState();
  updateSaveBarVisibility('connection');
})();