require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'announcements.json');

// Ensure announcements.json exists to prevent read errors
if (!fs.existsSync(DATA_FILE)) {
    console.log("📝 Creating new announcements.json file...");
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// ===== Storage settings =====
// If GITHUB_TOKEN is set, announcements are stored in your GitHub repo
// (permanent). If it is not set, the server falls back to the local
// announcements.json file exactly like before.
//
// Render environment variables:
//   GITHUB_TOKEN        (required for GitHub storage) fine-grained token, Contents: Read and write
//   GITHUB_OWNER        default: CaitlinAkaFallen
//   GITHUB_REPO         default: caitlinakafallen.github.io
//   GITHUB_BRANCH       default: data   (a separate branch so saving does NOT redeploy Render)
//   GITHUB_BASE_BRANCH  default: main   (the data branch is created from this one if missing)
//   GITHUB_FILE_PATH    default: announcements.json
const GH = {
    token: process.env.GITHUB_TOKEN || '',
    owner: process.env.GITHUB_OWNER || 'CaitlinAkaFallen',
    repo: process.env.GITHUB_REPO || 'caitlinakafallen.github.io',
    branch: process.env.GITHUB_BRANCH || 'data',
    baseBranch: process.env.GITHUB_BASE_BRANCH || 'main',
    file: process.env.GITHUB_FILE_PATH || 'announcements.json',
    api: (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '')
};

if (GH.token && typeof fetch !== 'function') {
    console.warn('⚠️ GITHUB_TOKEN is set but this Node version has no fetch (needs Node 18+). Using local file.');
}
const USE_GITHUB = Boolean(GH.token) && typeof fetch === 'function';

// ===== Middleware & CORS Configuration =====
const allowedOrigins = [
    'https://caitlinscreativespace.xyz',
    'https://www.caitlinscreativespace.xyz',
    'https://caitlinakafallen.github.io',
    'http://localhost:3000/admin-programming', // Added for local testing
    'http://127.0.0.1:3000/programming'       // Added for local testing
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or local file system)
        if (!origin) return callback(null, true);

        // Check if the origin matches our list or is a local variation
        const isAllowed = allowedOrigins.some(o => origin.startsWith(o)) ||
                          origin.includes('localhost:3000') ||
                          origin.includes('127.0.0.1:3000');

        if (isAllowed) {
            return callback(null, true);
        } else {
            console.log("❌ Blocked by CORS:", origin);
            return callback(new Error('CORS Policy Block'), false);
        }
    },
    methods: ['GET', 'POST'],
    // Cache-Control and Pragma are added automatically by browsers when a page
    // fetches with cache: 'no-store' (the admin page does). Without them here
    // the browser's preflight check can fail.
    allowedHeaders: ['Content-Type', 'Cache-Control', 'Pragma']
}));

app.use(bodyParser.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// ===== Local file storage (fallback) =====
function readLocal() {
    return new Promise((resolve, reject) => {
        fs.readFile(DATA_FILE, 'utf8', (err, data) => {
            if (err) return reject(err);
            try {
                const json = data ? JSON.parse(data) : [];
                resolve(Array.isArray(json) ? json : []);
            } catch (e) {
                reject(e);
            }
        });
    });
}

function writeLocal(list) {
    return new Promise((resolve, reject) => {
        fs.writeFile(DATA_FILE, JSON.stringify(list, null, 2), (err) => (err ? reject(err) : resolve()));
    });
}

// ===== GitHub storage =====
function ghHeaders(extra) {
    return Object.assign({
        'Authorization': `Bearer ${GH.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'caitlins-announcement-api'
    }, extra || {});
}

const ghUrl = (p) => `${GH.api}/repos/${GH.owner}/${GH.repo}${p}`;
const ghFilePath = GH.file.split('/').map(encodeURIComponent).join('/');

// Creates the data branch from the base branch the first time (keeps your existing announcements.json)
async function ghEnsureBranch() {
    const check = await fetch(ghUrl(`/git/ref/heads/${GH.branch}`), { headers: ghHeaders() });
    if (check.ok) return;
    if (check.status !== 404) throw new Error(`GitHub branch check failed (HTTP ${check.status})`);

    const base = await fetch(ghUrl(`/git/ref/heads/${GH.baseBranch}`), { headers: ghHeaders() });
    if (!base.ok) throw new Error(`GitHub base branch "${GH.baseBranch}" not found (HTTP ${base.status})`);
    const baseJson = await base.json();

    const create = await fetch(ghUrl('/git/refs'), {
        method: 'POST',
        headers: ghHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ref: `refs/heads/${GH.branch}`, sha: baseJson.object.sha })
    });
    // 422 means the branch already exists (created a moment ago), which is fine
    if (!create.ok && create.status !== 422) throw new Error(`GitHub branch create failed (HTTP ${create.status})`);
    console.log(`🌿 Created branch "${GH.branch}" from "${GH.baseBranch}"`);
}

// Returns { list, sha }. list is null if the file does not exist on the branch yet.
async function ghRead() {
    const res = await fetch(ghUrl(`/contents/${ghFilePath}?ref=${encodeURIComponent(GH.branch)}`), { headers: ghHeaders() });
    if (res.status === 404) return { list: null, sha: null };
    if (!res.ok) throw new Error(`GitHub read failed (HTTP ${res.status})`);
    const json = await res.json();
    const text = Buffer.from(json.content || '', 'base64').toString('utf8');
    const parsed = text.trim() ? JSON.parse(text) : [];
    return { list: Array.isArray(parsed) ? parsed : [], sha: json.sha };
}

async function loadList() {
    if (!USE_GITHUB) return readLocal();
    await ghEnsureBranch();
    const { list } = await ghRead();
    if (list) return list;
    console.log('ℹ️ No announcements file on the GitHub branch yet. Seeding from the local file.');
    return readLocal();
}

// Writes are queued one at a time so two saves can never collide
let writeQueue = Promise.resolve();
function saveList(list) {
    const job = writeQueue.then(async () => {
        if (!USE_GITHUB) return writeLocal(list);
        await ghEnsureBranch();
        const { sha } = await ghRead(); // newest sha, required by GitHub when updating a file
        const body = {
            message: `Update announcements (${list.length} entries)`,
            content: Buffer.from(JSON.stringify(list, null, 2), 'utf8').toString('base64'),
            branch: GH.branch
        };
        if (sha) body.sha = sha;
        const res = await fetch(ghUrl(`/contents/${ghFilePath}`), {
            method: 'PUT',
            headers: ghHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const detail = (await res.text()).slice(0, 200);
            throw new Error(`GitHub write failed (HTTP ${res.status}) ${detail}`);
        }
    });
    writeQueue = job.catch(() => {});
    return job;
}

// Short in-memory cache so every page view does not hit GitHub
let cache = { list: null, at: 0 };
const CACHE_MS = 30 * 1000;

async function getList() {
    if (cache.list && Date.now() - cache.at < CACHE_MS) return cache.list;
    try {
        const list = await loadList();
        cache = { list, at: Date.now() };
        return list;
    } catch (err) {
        if (cache.list) {
            console.warn('⚠️ Refresh failed, serving the last known list:', err.message);
            return cache.list;
        }
        throw err;
    }
}

// ===== Page Routing =====

// Admin Page
app.get(['/admin-programming', '/admin-programming.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-programming.html'));
});

// Viewer Page
app.get(['/programming', '/programming.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'programming.html'));
});

// Root defaults to programming viewer
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'programming.html'));
});

// ===== API Routes =====

// 0. GET: Quick check that the server is up and which storage it uses
app.get('/api/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
        ok: true,
        storage: USE_GITHUB ? 'github' : 'local-file',
        branch: USE_GITHUB ? GH.branch : null,
        time: new Date().toISOString()
    });
});

// 1. GET: Fetch announcements
app.get('/api/announcements', async (req, res) => {
    try {
        const list = await getList();
        res.set('Cache-Control', 'no-store');
        res.json(list);
    } catch (err) {
        console.error("❌ Read Error:", err.message);
        res.status(500).json({ error: "Read Error" });
    }
});

// 2. POST: Update announcements
app.post('/api/announcements', async (req, res) => {
    const announcements = req.body;

    if (!Array.isArray(announcements)) {
        return res.status(400).json({ error: "Invalid data format." });
    }

    try {
        await saveList(announcements);
        cache = { list: announcements, at: Date.now() };
        console.log(`✅ Sync Successful: ${announcements.length} entries saved (${USE_GITHUB ? 'GitHub' : 'local file'}).`);
        res.json({ message: "Success", count: announcements.length });
    } catch (err) {
        console.error("❌ Write Error:", err.message);
        res.status(500).json({ error: "Write Error" });
    }
});

// Final 404
app.use((req, res) => {
    res.status(404).send('<h1>404 - Not Found</h1>');
});

// ===== Server Start =====
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 CAITLIN'S UNIFIED SERVER RUNNING`);
    console.log(`🏠 Local Admin: http://localhost:${PORT}/admin-programming`);
    console.log(`🌍 Live API:   https://caitlins-announcement-api.onrender.com`);
    console.log(`💾 Storage:    ${USE_GITHUB ? `GitHub (${GH.owner}/${GH.repo}, branch ${GH.branch})` : 'local announcements.json'}`);
    console.log(`=============================================`);
    // Warm the cache at startup (also creates the GitHub data branch on first run)
    getList().catch((err) => console.error('❌ Startup load failed:', err.message));
});
