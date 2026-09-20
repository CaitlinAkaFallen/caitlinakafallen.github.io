const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');

const PORT = 17650;
const DASHBOARD_FILE = 'music-player-dashboard.html';
const DASHBOARD_URL = `http://127.0.0.1:${PORT}/${DASHBOARD_FILE}`;
const SPLASH_FILE = 'boot-musicplayer.html';
const SPLASH_WIDTH = 400;
const SPLASH_HEIGHT = 280;
const MIN_SPLASH_DURATION_MS = 15000;
const DASHBOARD_LOAD_TIMEOUT_MS = 20000;
const DASHBOARD_WIDTH = 1440;
const DASHBOARD_HEIGHT = 920;
const DEBUG = true;
const AUTO_UPDATE_ENABLED = true;
const AUTO_UPDATE_INTERVAL_MS = 5 * 60 * 1000;

let server;
let wss;
let win;
let splashWin;
let splashShownAt;
let handoffStarted;
let autoUpdateTimer;

// ---- WebSocket Relay ----
function attachWebSocketRelay(httpServer) {
  // Only accept relay connections from pages served by this machine. The relay now carries a
  // Spotify access token, so a random website open in your browser must not be able to connect.
  wss = new WebSocket.Server({
    server: httpServer,
    verifyClient: (info) => {
      const origin = info.origin;
      if (!origin) return true; // non-browser clients send no Origin
      return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(origin);
    }
  });

  wss.on('connection', (ws) => {
    if (DEBUG) console.log('[relay] Client connected. Total clients:', wss.clients.size);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (DEBUG && msg.type) console.log('[relay] Broadcasting message type:', msg.type);
        
        // Broadcast to all OTHER clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });
      } catch (err) {
        if (DEBUG) console.log('[relay] Message parse error:', err.message);
      }
    });

    ws.on('close', () => {
      if (DEBUG) console.log('[relay] Client disconnected. Total clients:', wss.clients.size);
    });

    ws.on('error', (err) => {
      if (DEBUG) console.log('[relay] Client error:', err.message);
    });
  });

  wss.on('error', (err) => {
    if (DEBUG) console.log('[relay] Server error:', err.message);
  });
}

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function createServer() {
  return new Promise((resolve, reject) => {
    const root = path.join(__dirname, 'app');
    server = http.createServer((req, res) => {
      let reqPath = decodeURIComponent(req.url.split('?')[0]);
      if (reqPath === '/') reqPath = `/${DASHBOARD_FILE}`;
      // Allow URLs that include the /app/ folder prefix (e.g. /app/music-player.html),
      // since the server root is already the app/ folder. Both URL styles resolve to the same file.
      if (reqPath.startsWith('/app/')) reqPath = reqPath.slice(4);
      const filePath = path.join(root, reqPath);

      if (!filePath.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          if (DEBUG) console.log('[server] 404 — File not found:', filePath);
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        if (DEBUG) console.log('[server] Port', PORT, 'already in use. Reusing existing server.');
        resolve();
      } else {
        if (DEBUG) console.log('[server] Failed to start:', err.message);
        reject(err);
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log('\n✓ Local server running on http://127.0.0.1:' + PORT);
      console.log('  Dashboard: http://127.0.0.1:' + PORT + '/' + DASHBOARD_FILE);
      console.log('  WebSocket relay: ws://127.0.0.1:' + PORT + '\n');
      attachWebSocketRelay(server);
      resolve();
    });
  });
}

function sendSplashStatus(text) {
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.webContents.send('splash-status', text);
  }
}

function createSplashWindow() {
  return new Promise((resolve) => {
    splashWin = new BrowserWindow({
      width: SPLASH_WIDTH,
      height: SPLASH_HEIGHT,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      center: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload', 'splash.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    splashWin.loadFile(path.join(__dirname, 'app', SPLASH_FILE));

    splashWin.webContents.once('did-finish-load', () => {
      splashWin.show();
      splashShownAt = Date.now();
      if (DEBUG) console.log('[splash] Shown at', new Date(splashShownAt).toLocaleTimeString());
      resolve();
    });
  });
}

ipcMain.on('splash-closed', () => {
  if (DEBUG) console.log('[splash] Closed, revealing dashboard');
  if (splashWin && !splashWin.isDestroyed()) splashWin.destroy();
  if (win && !win.isDestroyed()) win.show();
});

function beginHandoff(reason) {
  if (handoffStarted) return;
  handoffStarted = true;

  if (DEBUG) console.log('[handoff] Triggered by:', reason);
  sendSplashStatus('ready');

  const elapsed = Date.now() - (splashShownAt || Date.now());
  const remaining = Math.max(0, MIN_SPLASH_DURATION_MS - elapsed);

  setTimeout(() => {
    if (splashWin && !splashWin.isDestroyed()) {
      splashWin.webContents.send('splash-ready-to-close');
    } else if (win && !win.isDestroyed()) {
      win.show();
    }
  }, remaining);
}

let updateInProgress = false;
async function updateDashboard(targetWin, reason = 'manual') {
  if (updateInProgress) {
    if (DEBUG) console.log('[update] Already in progress, ignoring (' + reason + ')');
    return;
  }
  if (!targetWin || targetWin.isDestroyed()) return;

  updateInProgress = true;
  if (DEBUG) console.log('[update:' + reason + '] Reloading from', DASHBOARD_URL);

  try {
    await targetWin.webContents.session.clearCache();
  } catch (err) {
    if (DEBUG) console.log('[update] Cache clear failed:', err.message);
  }

  try {
    await targetWin.loadURL(DASHBOARD_URL);
    if (DEBUG) console.log('[update:' + reason + '] Dashboard reloaded successfully');
  } catch (err) {
    if (DEBUG) console.log('[update:' + reason + '] Load failed:', err.message);
  } finally {
    updateInProgress = false;
  }
}

function startAutoUpdateLoop(targetWin) {
  if (!AUTO_UPDATE_ENABLED) return;
  stopAutoUpdateLoop();

  autoUpdateTimer = setInterval(() => {
    if (!targetWin || targetWin.isDestroyed()) {
      stopAutoUpdateLoop();
      return;
    }
    updateDashboard(targetWin, 'auto');
  }, AUTO_UPDATE_INTERVAL_MS);

  if (DEBUG) console.log('[update:auto] Background auto-update enabled');
}

function stopAutoUpdateLoop() {
  if (autoUpdateTimer) {
    clearInterval(autoUpdateTimer);
    autoUpdateTimer = null;
  }
}

function attachContextMenu(targetWin) {
  targetWin.webContents.on('context-menu', (_event, params) => {
    const mainFrame = targetWin.webContents.mainFrame;
    const clickedFrame = params.frame;
    const isPreviewFrame = !!(clickedFrame && mainFrame && clickedFrame !== mainFrame);

    const menuTemplate = [];

    if (isPreviewFrame) {
      menuTemplate.push(
        { label: 'Reload Preview', click: () => { try { clickedFrame.reload(); } catch (e) {} } },
        { label: 'Hard Reload Preview (clear cache)', click: async () => {
          try { await targetWin.webContents.session.clearCache(); } catch (e) {}
          try { clickedFrame.reload(); } catch (e) {}
        }},
        { type: 'separator' }
      );
    }

    menuTemplate.push(
      { label: 'Update Dashboard', click: () => updateDashboard(targetWin, 'manual') },
      { type: 'separator' },
      { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => targetWin.webContents.reload() },
      { label: 'Hard Reload (clear cache)', accelerator: 'CmdOrCtrl+Shift+R', click: async () => {
        try { await targetWin.webContents.session.clearCache(); } catch (e) {}
        targetWin.webContents.reloadIgnoringCache();
      }},
      { type: 'separator' },
      { label: 'Toggle Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: () => targetWin.webContents.toggleDevTools() }
    );

    Menu.buildFromTemplate(menuTemplate).popup({ window: targetWin });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: DASHBOARD_WIDTH,
    height: DASHBOARD_HEIGHT,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0a0915',
    icon: path.join(__dirname, 'icon.ico'),
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  Menu.setApplicationMenu(null);
  attachContextMenu(win);

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[dashboard] LOAD FAILED:', errorCode, errorDescription, validatedURL);
    console.error('  Expected to load from:', DASHBOARD_URL);
    console.error('  Check that', DASHBOARD_FILE, 'exists in the app/ folder');
  });

  win.once('ready-to-show', () => beginHandoff('ready-to-show'));
  win.webContents.once('did-finish-load', () => startAutoUpdateLoop(win));
  win.once('closed', () => stopAutoUpdateLoop());

  setTimeout(() => {
    if (!handoffStarted) {
      console.error('[dashboard] Handoff timeout! Dashboard never fired ready-to-show.');
      beginHandoff('timeout-fallback');
    }
  }, DASHBOARD_LOAD_TIMEOUT_MS);

  win.webContents.session.clearCache().then(() => {
    if (DEBUG) console.log('[dashboard] Loading:', DASHBOARD_URL);
    win.loadURL(DASHBOARD_URL);
  }).catch((err) => {
    if (DEBUG) console.log('[dashboard] Cache clear failed, loading anyway:', err.message);
    win.loadURL(DASHBOARD_URL);
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    await createSplashWindow();
    sendSplashStatus('Starting local server...');

    await createServer();
    sendSplashStatus('Loading dashboard...');

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    stopAutoUpdateLoop();
    if (server) server.close();
    if (process.platform !== 'darwin') app.quit();
  });
}