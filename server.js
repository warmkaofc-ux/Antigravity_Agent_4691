require('dotenv').config(); // Load .env
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const open = require('open');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Init Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "API_KEY_MISSING");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Explicitly serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

// Debug/Health Check
app.get('/api/debug', (req, res) => {
    res.json({
        status: 'online',
        has_api_key: !!credentials.api_key,
        agent_name: credentials.agent_name || 'Unknown',
        timestamp: new Date().toISOString()
    });
});

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

// Get Single Post
app.get('/api/post/:id', checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const response = await axios.get(`https://www.moltbook.com/api/v1/posts/${id}`, {
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

// Translate Post (AI)
app.post('/api/translate', checkAuth, async (req, res) => {
    try {
        const { data, targetLang } = req.body;
        if (!data || !targetLang) return res.status(400).json({ error: "Missing data or targetLang" });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

        // Construct prompt to preserve JSON structure
        const prompt = `Translate the following JSON content values to ${targetLang}. 
        Preserve all keys and the overall structure. 
        Only translate 'title', 'content', and comment 'content'.
        Do not translate names, IDs, or timestamps.
        
        Input JSON:
        ${JSON.stringify(data)}
        
        Return ONLY the valid JSON string.`;

        const result = await model.generateContent(prompt);
        const translatedText = result.response.text();

        // Clean up markdown code blocks if present
        const cleanJson = translatedText.replace(/```json|```/g, '').trim();
        const translatedData = JSON.parse(cleanJson);

        res.json({ translatedData });
    } catch (error) {
        console.error("Translation Error:", error);
        res.status(500).json({ error: "Translation failed", details: error.message });
    }
});

// --- Auto-Post System ---
const contentLib = require('./content');
let autoPostInterval = null;
let lastAutoPostTime = null;
const POST_INTERVAL_MS = 40 * 60 * 1000; // 40 minutes

const doAutoPost = async () => {
    if (!credentials || !credentials.api_key) return;

    let post;
    try {
        // AI Generation
        const submolts = ['general', 'coding', 'agents', 'random'];
        const selectedSubmolt = submolts[Math.floor(Math.random() * submolts.length)];

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
        const prompt = `Write a short, engaging, witty social media post for a developer audience about ${selectedSubmolt} or tech life. 
        Requirements:
        - Max 200 characters
        - Include 1 emoji
        - No hashtags
        - Return ONLY the content string.`;

        const result = await model.generateContent(prompt);
        const aiContent = result.response.text().trim();

        post = {
            title: "🤖 AI Thought",
            content: aiContent,
            submolt: selectedSubmolt
        };
        console.log(`[Auto-Post] Generated via Gemini: ${aiContent}`);

    } catch (err) {
        console.error("[Auto-Post] AI Generation failed, using fallback:", err.message);
        // Fallback to static
        post = contentLib[Math.floor(Math.random() * contentLib.length)];
    }

    // Post to Moltbook
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

        // Log to Firebase (if initialized)
        if (global.firebaseDb) {
            const { addDoc, collection } = require("firebase/firestore");
            // Note: server-side firebase might be different, but we used web sdk in earlier steps? 
            // Actually previous task used 'firebase' package which is creating issues in node environment usually unless using admin sdk.
            // But let's assume the previous firebase integration works or we skip it if not robust.
            // Checking imports... we didn't import firebase in server.js yet?
            // Ah, previous plan said "Update server.js (Init Firebase)".
            // Let's stick to console log for now as Firebase Admin SDK wasn't fully set up in server.js in my view_file.
        }

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
