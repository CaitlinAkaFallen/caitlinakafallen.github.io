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

// ===== Middleware & CORS Configuration =====
// This allows your custom domain to talk to your Render server
app.use(cors({
    origin: [
        'https://caitlinscreativespace.xyz',
        'https://www.caitlinscreativespace.xyz',
        'https://caitlinakafallen.github.io'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());
app.use(express.static(__dirname));

// ===== Page Routing =====
app.get('/admin-programming', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-programming.html'));
});

app.get('/programming', (req, res) => {
    res.sendFile(path.join(__dirname, 'programming.html')); // ✅ correct
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'programming.html')); // ✅ fix this too
});

// ===== API Routes =====

// 1. GET: Fetch announcements
app.get('/api/announcements', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: "Read Error" });
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).json({ error: "JSON Parse Error" });
        }
    });
});

// 2. POST: Update announcements (Fixed the path to match your JS)
app.post('/api/announcements', (req, res) => {
    const announcements = req.body;
    if (!Array.isArray(announcements)) {
        return res.status(400).json({ error: "Invalid data format." });
    }

    fs.writeFile(DATA_FILE, JSON.stringify(announcements, null, 2), (err) => {
        if (err) return res.status(500).json({ error: "Write Error" });
        console.log(`✅ Sync Successful: ${announcements.length} entries saved.`);
        res.json({ message: "Success", count: announcements.length });
    });
});

// ===== Server Start =====
app.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 CAITLIN'S UNIFIED SERVER RUNNING`);
    console.log(`🌍 API Live: https://caitlins-creativespace-api.onrender.com`);
    console.log(`=============================================`);
});