const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const open = require('open');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Load Credentials
const credsPath = path.join(__dirname, '.agent/skills/moltbook/credentials.json');
let credentials = {
    api_key: process.env.MOLTBOOK_API_KEY,
    agent_name: process.env.MOLTBOOK_AGENT_NAME
};

try {
    if (!credentials.api_key && fs.existsSync(credsPath)) {
        const data = fs.readFileSync(credsPath, 'utf8');
        const fileCreds = JSON.parse(data);
        credentials.api_key = fileCreds.api_key;
        credentials.agent_name = fileCreds.agent_name;
        console.log(`Loaded credentials for ${credentials.agent_name} from file`);
    } else if (credentials.api_key) {
        console.log(`Loaded credentials for ${credentials.agent_name || 'Agent'} from Env`);
    } else {
        console.error("Credentials not found (Env or File)!");
    }
} catch (error) {
    console.error("Error loading credentials:", error);
}

// Middleware to check API key
const checkAuth = (req, res, next) => {
    if (!credentials || !credentials.api_key) {
        return res.status(500).json({ error: "Agent credentials not loaded" });
    }
    req.apiKey = credentials.api_key;
    next();
};

// --- API Routes ---

// Get Feed
app.get('/api/feed', checkAuth, async (req, res) => {
    try {
        const response = await axios.get('https://www.moltbook.com/api/v1/feed?sort=new&limit=20', {
            headers: { 'Authorization': `Bearer ${req.apiKey}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check Status/Me
app.get('/api/me', checkAuth, async (req, res) => {
    try {
        const response = await axios.get('https://www.moltbook.com/api/v1/agents/me', {
            headers: { 'Authorization': `Bearer ${req.apiKey}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check DMs
app.get('/api/dms', checkAuth, async (req, res) => {
    try {
        const response = await axios.get('https://www.moltbook.com/api/v1/agents/dm/check', {
            headers: { 'Authorization': `Bearer ${req.apiKey}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Post
app.post('/api/post', checkAuth, async (req, res) => {
    try {
        const response = await axios.post('https://www.moltbook.com/api/v1/posts', req.body, {
            headers: {
                'Authorization': `Bearer ${req.apiKey}`,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message, details: error.response?.data });
    }
});

// --- Auto-Post System ---
const contentLib = require('./content');
let autoPostInterval = null;
let lastAutoPostTime = null;
const POST_INTERVAL_MS = 40 * 60 * 1000; // 40 minutes

const doAutoPost = async () => {
    if (!credentials || !credentials.api_key) return;

    // Pick random post
    const post = contentLib[Math.floor(Math.random() * contentLib.length)];
    console.log(`[Auto-Post] Posting to m/${post.submolt}: ${post.title}`);

    try {
        await axios.post('https://www.moltbook.com/api/v1/posts', post, {
            headers: {
                'Authorization': `Bearer ${credentials.api_key}`,
                'Content-Type': 'application/json'
            }
        });
        lastAutoPostTime = new Date();
        console.log('[Auto-Post] Success!');
    } catch (error) {
        console.error('[Auto-Post] Failed:', error.message, error.response?.data);
    }
};

app.post('/api/autopost/start', checkAuth, (req, res) => {
    if (autoPostInterval) {
        return res.json({ status: 'active', message: 'Already running' });
    }

    // Start interval
    autoPostInterval = setInterval(doAutoPost, POST_INTERVAL_MS);

    // Check if we should post immediately (if waiting implies delay)
    // For safety, we just start the timer. User can manually post if they want immediate.
    console.log('[Auto-Post] Started');
    res.json({ status: 'active', message: 'Auto-Post started' });
});

app.post('/api/autopost/stop', checkAuth, (req, res) => {
    if (autoPostInterval) {
        clearInterval(autoPostInterval);
        autoPostInterval = null;
    }
    console.log('[Auto-Post] Stopped');
    res.json({ status: 'inactive', message: 'Auto-Post stopped' });
});

app.get('/api/autopost/status', checkAuth, (req, res) => {
    res.json({
        status: autoPostInterval ? 'active' : 'inactive',
        interval_minutes: 40,
        last_post: lastAutoPostTime
    });
});

// Start Server
app.listen(PORT, async () => {
    console.log(`Moltbook Dashboard running at http://localhost:${PORT}`);
    await open(`http://localhost:${PORT}`);
});
