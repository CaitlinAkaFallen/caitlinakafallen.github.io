require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'announcements.json');

// ===== Debugging: Environment Variables =====
console.log('--- Environment Check ---');
console.log('Twitch Client ID:', process.env.TWITCH_CLIENT_ID ? 'Loaded ✅' : 'Missing ❌');
console.log('YouTube API Key:', process.env.YOUTUBE_API_KEY ? 'Loaded ✅' : 'Missing ❌');
console.log('Current Directory:', __dirname);
console.log('-------------------------');

// Ensure announcements.json exists to prevent read errors
if (!fs.existsSync(DATA_FILE)) {
    console.log("📝 Creating new announcements.json file...");
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());

// Serve static assets (CSS, JS, Images) from the root
app.use(express.static(__dirname));

// ===== Page Routing =====

// Admin Dashboard
app.get('/admin-programming', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-programming.html'));
});

// Viewer Page
app.get('/programming', (req, res) => {
    res.sendFile(path.join(__dirname, 'viewer-programming.html'));
});

// Root URL (Defaults to Viewer)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'viewer-programming.html'));
});

// ===== API Routes =====

// 1. GET: Fetch announcements for the frontend
app.get('/api/announcements', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error("❌ Read Error:", err);
            return res.status(500).json({ error: "Failed to read data file" });
        }
        try {
            res.json(JSON.parse(data));
        } catch (parseErr) {
            console.error("❌ JSON Parse Error:", parseErr);
            res.status(500).json({ error: "Data file is corrupted" });
        }
    });
});

// 2. POST: Update announcements from the Admin panel
app.post('/update-announcements', (req, res) => {
    const announcements = req.body;

    if (!Array.isArray(announcements)) {
        return res.status(400).json({ error: "Invalid data format. Expected an array." });
    }

    fs.writeFile(DATA_FILE, JSON.stringify(announcements, null, 2), (err) => {
        if (err) {
            console.error("❌ Write Error:", err);
            return res.status(500).json({ error: "Failed to save data" });
        }
        console.log(`✅ Sync Successful: ${announcements.length} entries saved.`);
        res.json({ message: "Success", count: announcements.length });
    });
});

// ===== Server Start =====
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 CAITLIN'S UNIFIED SERVER RUNNING`);
    console.log(`📍 Local URL: http://localhost:${PORT}`);
    console.log(`🛠️  Admin URL: http://localhost:${PORT}/admin-programming`);
    console.log(`🌐 Viewer URL: http://localhost:${PORT}/viewer-programming`);
    console.log(`=============================================`);
});