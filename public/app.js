// Removed top-level import to prevent crushing the app if Firebase fails
// import { app, analytics } from './firebase-config.js';

const API_BASE = '/api';

// Update Firebase UI
const fbStatus = document.getElementById('firebaseStatus');

async function initFirebase() {
    try {
        const { app, analytics } = await import('./firebase-config.js');
        if (app && app.name) {
            fbStatus.style.background = '#FFA000'; // Amber for Firebase
            fbStatus.style.boxShadow = '0 0 10px #FFA000';
            fbStatus.title = "Firebase: Connected (Analytics Active)";
        }
    } catch (err) {
        console.warn("Firebase failed to load:", err);
        fbStatus.style.background = '#ff0000'; // Red
        fbStatus.title = "Firebase: Failed to load (AdBlock?)";
    }
}

// DOM Elements
const feedList = document.getElementById('feedList');
const refreshBtn = document.getElementById('refreshBtn');
const postForm = document.getElementById('postForm');
const agentNameEl = document.getElementById('agentName');
const autoPostBtn = document.getElementById('autoPostBtn');
let isAutoPostActive = false;

// Tabs & Sections
const tabFeed = document.getElementById('tabFeed');
const tabProfile = document.getElementById('tabProfile');
const feedSection = document.getElementById('feedSection');
const composeSection = document.getElementById('composeSection');
const profileSection = document.getElementById('profileSection');

// Profile Elements
const profileName = document.getElementById('profileName');
const profileBio = document.getElementById('profileBio');
const profileKarma = document.getElementById('profileKarma');
const profileFollowers = document.getElementById('profileFollowers');
const profileLink = document.getElementById('profileLink');
const profileFollowing = document.getElementById('profileFollowing');
const profileJoined = document.getElementById('profileJoined');
const ownerSection = document.getElementById('ownerSection');
const ownerAvatar = document.getElementById('ownerAvatar');
const ownerName = document.getElementById('ownerName');
const ownerHandle = document.getElementById('ownerHandle');
const ownerLink = document.getElementById('ownerLink');
const ownerFollowers = document.getElementById('ownerFollowers');
const ownerFollowing = document.getElementById('ownerFollowing');

// Tab Logic
function switchTab(tab) {
    if (tab === 'feed') {
        feedSection.style.display = 'block';
        composeSection.style.display = 'block';
        profileSection.style.display = 'none';

        tabFeed.classList.add('active');
        tabFeed.style.background = '#64748b';
        tabFeed.style.color = 'white';

        tabProfile.classList.remove('active');
        tabProfile.style.background = 'transparent';
        tabProfile.style.color = 'var(--text-secondary)';
    } else {
        feedSection.style.display = 'none';
        composeSection.style.display = 'none';
        profileSection.style.display = 'block';

        tabProfile.classList.add('active');
        tabProfile.style.background = '#64748b';
        tabProfile.style.color = 'white';

        tabFeed.classList.remove('active');
        tabFeed.style.background = 'transparent';
        tabFeed.style.color = 'var(--text-secondary)';
    }
}

tabFeed.addEventListener('click', () => switchTab('feed'));
tabProfile.addEventListener('click', () => switchTab('profile'));

// State
let agentInfo = null;

// Init
async function init() {
    // Start Firebase in background (don't await so app loads fast)
    initFirebase();

    // Core App
    await loadAgentInfo();
    await updateAutoPostUI();
    await loadFeed();
}

// Load Agent Info
async function loadAgentInfo() {
    try {
        const res = await fetch(`${API_BASE}/me`);
        const data = await res.json();
        if (data.agent) {
            agentInfo = data.agent;
            agentNameEl.textContent = data.agent.name;

            // Render Profile
            if (profileName) {
                profileName.textContent = "u/" + data.agent.name;
                profileBio.textContent = data.agent.description || "No bio yet.";
                profileKarma.textContent = data.agent.karma || 0;
                profileFollowers.textContent = data.agent.follower_count || 0;

                // New Fields
                if (profileFollowing) profileFollowing.textContent = data.agent.following_count || "0";

                // Joined Date (Mock or Parse if available)
                const joinedDate = data.agent.created_at ? new Date(data.agent.created_at).toLocaleDateString() : '2/5/2026';
                if (profileJoined) profileJoined.textContent = joinedDate;

                profileLink.href = `https://www.moltbook.com/u/${data.agent.name}`;

                // Owner Section
                const owner = data.agent.owner;
                if (owner && ownerSection) {
                    ownerSection.style.display = 'block';
                    // Avatar
                    if (owner.x_avatar && ownerAvatar) {
                        ownerAvatar.src = owner.x_avatar;
                        ownerAvatar.style.display = 'block';
                    }
                    // Name & Handle
                    if (ownerName) ownerName.textContent = owner.x_name || "Unknown";

                    const handle = owner.x_handle ? "@" + owner.x_handle : "";
                    if (ownerHandle) {
                        ownerHandle.textContent = handle;
                        ownerHandle.href = `https://twitter.com/${owner.x_handle || ''}`;
                    }

                    // Stats
                    if (ownerFollowers) ownerFollowers.textContent = owner.x_follower_count || 0;
                    if (ownerFollowing) ownerFollowing.textContent = owner.x_following_count || 0;

                    // Link
                    if (ownerLink) ownerLink.href = `https://twitter.com/${owner.x_handle || ''}`;
                } else if (!owner && ownerSection) {
                    ownerSection.style.display = 'none';
                }
            }
        } else {
            agentNameEl.textContent = 'Agent';
        }
    } catch (err) {
        console.error('Failed to load agent info', err);
        agentNameEl.textContent = 'Offline';
        agentNameEl.style.color = '#ff4500';
    }
}

// Load Feed
async function loadFeed() {
    feedList.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">Loading feed...</div>';

    try {
        const res = await fetch(`${API_BASE}/feed`);
        const data = await res.json();

        if (data.posts && data.posts.length > 0) {
            renderPosts(data.posts);
        } else {
            feedList.innerHTML = '<div style="text-align:center; padding: 2rem;">No posts found.</div>';
        }
    } catch (err) {
        console.error('Failed to load feed', err);
        feedList.innerHTML = `<div style="text-align:center; padding: 2rem; color: #ff6b6b;">Error loading feed: ${err.message}</div>`;
    }
}

// Render Posts
function renderPosts(posts) {
    feedList.innerHTML = '';
    posts.forEach(post => {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.innerHTML = `
            <div class="post-meta">
                <span><span class="submolt-tag">m/${post.submolt}</span> • @${post.author.name}</span>
                <span>${new Date(post.created_at).toLocaleTimeString()}</span>
            </div>
            <div class="post-title">${escapeHtml(post.title)}</div>
            <div class="post-content">${escapeHtml(post.content || post.url || '')}</div>
            <div class="post-footer">
                <span class="stat">⬆ ${post.upvotes}</span>
                <span class="stat">💬 ${post.comment_count || 0} Comments</span>
            </div>
        `;
        feedList.appendChild(card);
    });
}

// Create Post
postForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submolt = document.getElementById('submoltSelect').value;
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const btn = postForm.querySelector('button');

    // Button Loading State
    const originalText = btn.textContent;
    btn.textContent = 'Posting...';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submolt, title, content })
        });

        const data = await res.json();

        if (data.success || data.post) {
            showToast('Post created successfully! 🦞');
            postForm.reset();
            loadFeed(); // Reload feed to show new post
        } else {
            throw new Error(data.error || 'Unknown error');
        }
    } catch (err) {
        alert('Failed to post: ' + err.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// Refresh Button
refreshBtn.addEventListener('click', loadFeed);

// Utility: Escape HTML to avoid XSS
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Utility: Show Toast
function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- Auto-Post Logic ---
// (Variables declared at top)

async function updateAutoPostUI() {
    try {
        const res = await fetch(`${API_BASE}/autopost/status`);
        const data = await res.json();

        isAutoPostActive = (data.status === 'active');
        renderAutoPostBtn();
    } catch (err) {
        console.error('Failed to get autopost status', err);
    }
}

function renderAutoPostBtn() {
    if (isAutoPostActive) {
        autoPostBtn.textContent = 'ON';
        autoPostBtn.style.color = '#10b981'; // Green
    } else {
        autoPostBtn.textContent = 'OFF';
        autoPostBtn.style.color = '#64748b'; // Gray
    }
}

autoPostBtn.addEventListener('click', async () => {
    const endpoint = isAutoPostActive ? '/autopost/stop' : '/autopost/start';

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST' });
        const data = await res.json();

        showToast(data.message);
        await updateAutoPostUI();
    } catch (err) {
        showToast('Error toggling auto-post');
    }
});

// Start
init();
