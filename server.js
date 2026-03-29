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
    allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

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

// 1. GET: Fetch announcements
app.get('/api/announcements', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error("❌ Read Error:", err);
            return res.status(500).json({ error: "Read Error" });
        }
        try {
            const json = data ? JSON.parse(data) : [];
            res.json(json);
        } catch (e) {
            console.error("❌ JSON Parse Error:", e);
            res.status(500).json({ error: "JSON Parse Error" });
        }
    });
});

// 2. POST: Update announcements
app.post('/api/announcements', (req, res) => {
    const announcements = req.body;
    
    if (!Array.isArray(announcements)) {
        return res.status(400).json({ error: "Invalid data format." });
    }

    fs.writeFile(DATA_FILE, JSON.stringify(announcements, null, 2), (err) => {
        if (err) {
            console.error("❌ Write Error:", err);
            return res.status(500).json({ error: "Write Error" });
        }
        console.log(`✅ Sync Successful: ${announcements.length} entries saved.`);
        res.json({ message: "Success", count: announcements.length });
    });
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
    console.log(`🌍 Live API:   https://caitlins-creativespace-api.onrender.com`);
    console.log(`=============================================`);
});