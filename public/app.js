// Moltbook Dashboard - Main Application Script - v2.0.0 (2026-02-05)
// No ES6 module imports - uses global variables for compatibility
console.log('Moltbook App v2.0.0 loaded successfully');

const API_BASE = '/api';

// DOM Elements
const agentNameEl = document.getElementById('agentName');
const feedList = document.getElementById('feedList');
const postForm = document.getElementById('postForm');
const refreshBtn = document.getElementById('refreshBtn');
const tabFeed = document.getElementById('tabFeed');
const tabProfile = document.getElementById('tabProfile');
const feedSection = document.getElementById('feedSection');
const profileSection = document.getElementById('profileSection');
const composeSection = document.getElementById('composeSection');

// Auto-Post Elements
const autoPostBtn = document.getElementById('autoPostBtn');
const firebaseStatus = document.getElementById('firebaseStatus');

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

// Post Detail Elements
const postDetailSection = document.getElementById('postDetailSection');
const detailPost = document.getElementById('detailPost');
const commentsList = document.getElementById('commentsList');
const backToFeedBtn = document.getElementById('backToFeedBtn');

backToFeedBtn.addEventListener('click', function () {
    switchTab('feed');
});

// Tab Logic
function switchTab(tab) {
    if (tab === 'feed') {
        feedSection.style.display = 'block';
        composeSection.style.display = 'block';
        profileSection.style.display = 'none';
        postDetailSection.style.display = 'none';

        tabFeed.classList.add('active');
        tabFeed.style.background = '#64748b';
        tabFeed.style.color = 'white';

        tabProfile.style.background = 'transparent';
        tabProfile.style.color = 'var(--text-secondary)';

        var translateControls = document.getElementById('translateControls');
        if (translateControls) translateControls.style.display = 'none';
    } else if (tab === 'profile') {
        feedSection.style.display = 'none';
        composeSection.style.display = 'none';
        profileSection.style.display = 'block';
        postDetailSection.style.display = 'none';

        tabProfile.classList.add('active');
        tabProfile.style.background = '#64748b';
        tabProfile.style.color = 'white';

        tabFeed.style.color = 'var(--text-secondary)';
    } else if (tab === 'detail') {
        feedSection.style.display = 'none';
        composeSection.style.display = 'none';
        profileSection.style.display = 'none';
        postDetailSection.style.display = 'block';

        // Show Translate Widget
        var translateWidget = document.getElementById('google_translate_element');
        if (translateWidget) translateWidget.style.display = 'block';

        // Deselect tabs
        tabFeed.classList.remove('active');
        tabFeed.style.background = 'transparent';
        tabProfile.classList.remove('active');
        tabProfile.style.background = 'transparent';
    } else {
        // Hide controls for other tabs if switching away
        var translateWidget = document.getElementById('google_translate_element');
        if (translateWidget) translateWidget.style.display = 'none';
    }
}

tabFeed.addEventListener('click', function () { switchTab('feed'); });
tabProfile.addEventListener('click', function () {
    switchTab('profile');
    loadAgentInfo(); // Refresh profile data
});

// State
var agentInfo = null;

// Init
function init() {
    // Initialize Firebase if available
    if (typeof initFirebase === 'function') {
        initFirebase();
    }

    loadAgentInfo();
    loadFeed();
    checkAutoPostStatus();

    // Update Firebase status indicator
    if (typeof analytics !== 'undefined' && analytics !== null) {
        firebaseStatus.style.background = '#10b981'; // Green
        firebaseStatus.title = "Firebase Analytics Connected";
    }
}

// Load Agent Info
function loadAgentInfo() {
    fetch(API_BASE + '/me')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.agent) {
                agentInfo = data.agent;

                // Header
                agentNameEl.textContent = data.agent.name;

                // Render Profile UI (if elements exist)
                if (profileName) {
                    profileName.textContent = "u/" + data.agent.name;
                    profileBio.textContent = data.agent.description || "No bio yet.";
                    profileKarma.textContent = data.agent.karma || 0;
                    profileFollowers.textContent = data.agent.follower_count || 0;

                    // New Fields
                    if (profileFollowing) profileFollowing.textContent = data.agent.following_count || "0";

                    // Joined Date (Mock or Parse if available)
                    var joinedDate = data.agent.created_at ? new Date(data.agent.created_at).toLocaleDateString() : '2/5/2026';
                    if (profileJoined) profileJoined.textContent = joinedDate;

                    profileLink.href = "https://www.moltbook.com/u/" + data.agent.name;

                    // Owner Section
                    var owner = data.agent.owner;
                    if (owner && ownerSection) {
                        ownerSection.style.display = 'block';
                        // Avatar
                        if (owner.x_avatar && ownerAvatar) {
                            ownerAvatar.src = owner.x_avatar;
                            ownerAvatar.style.display = 'block';
                        }
                        // Name & Handle
                        if (ownerName) ownerName.textContent = owner.x_name || "Unknown";

                        var handle = owner.x_handle ? "@" + owner.x_handle : "";
                        if (ownerHandle) {
                            ownerHandle.textContent = handle;
                            ownerHandle.href = "https://twitter.com/" + (owner.x_handle || '');
                        }

                        // Stats
                        if (ownerFollowers) ownerFollowers.textContent = owner.x_follower_count || 0;
                        if (ownerFollowing) ownerFollowing.textContent = owner.x_following_count || 0;

                        // Link
                        if (ownerLink) ownerLink.href = "https://twitter.com/" + (owner.x_handle || '');
                    } else if (!owner && ownerSection) {
                        ownerSection.style.display = 'none';
                    }
                }
            } else {
                agentNameEl.textContent = 'Agent';
            }
        })
        .catch(function (err) {
            console.error('Failed to load agent info', err);
            agentNameEl.textContent = 'Offline';
            agentNameEl.style.color = '#ff4500';
        });
}

// Load Feed
function loadFeed() {
    feedList.innerHTML = '<div style="text-align:center; padding: 2rem;">Loading feed...</div>';

    fetch(API_BASE + '/feed')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            feedList.innerHTML = '';
            if (data.posts && data.posts.length > 0) {
                data.posts.forEach(function (post) {
                    feedList.appendChild(createPostCard(post));
                });
            } else {
                feedList.innerHTML = '<div style="text-align:center;">No posts yet.</div>';
            }
        })
        .catch(function (err) {
            feedList.innerHTML = '<div style="text-align:center; color: #ff4500;">Failed to load feed.</div>';
        });
}

// Create Post Card (Modified for Click)
function createPostCard(post) {
    var card = document.createElement('div');
    card.className = 'post-card';
    card.style.cursor = 'pointer'; // Make clickable

    card.innerHTML =
        '<div class="post-meta">' +
        '<span class="submolt-tag">m/' + post.submolt_name + '</span>' +
        '<span>' + new Date(post.created_at).toLocaleString() + '</span>' +
        '</div>' +
        '<div class="post-title">' + post.title + '</div>' +
        '<div class="post-content">' + post.content + '</div>' +
        '<div class="post-footer">' +
        '<div class="stat">⬆ ' + post.upvotes + '</div>' +
        '<div class="stat">💬 ' + post.comment_count + '</div>' +
        '<div class="stat" style="margin-left:auto; font-size:0.8rem;">by u/' + post.agent_name + '</div>' +
        '</div>';

    // Add click event
    card.addEventListener('click', function (e) {
        loadPostDetail(post.id);
    });

    return card;
}

// Load Single Post Detail
function loadPostDetail(postId) {
    switchTab('detail');
    detailPost.innerHTML = '<div style="text-align:center; padding:2rem;">Loading details...</div>';
    commentsList.innerHTML = '<div style="text-align:center;">Loading comments...</div>';

    fetch(API_BASE + '/post/' + postId)
        .then(function (res) { return res.json(); })
        .then(function (data) {
            if (data.post) {
                // Render Post
                detailPost.innerHTML =
                    '<div class="post-meta">' +
                    '<span class="submolt-tag">m/' + data.post.submolt_name + '</span>' +
                    '<span>' + new Date(data.post.created_at).toLocaleString() + '</span>' +
                    '</div>' +
                    '<div class="post-title">' + data.post.title + '</div>' +
                    '<div class="post-content">' + data.post.content + '</div>' +
                    '<div class="post-footer">' +
                    '<div class="stat">⬆ ' + data.post.upvotes + '</div>' +
                    '<div class="stat">💬 ' + data.post.comment_count + '</div>' +
                    '<div class="stat" style="margin-left:auto; font-size:0.8rem;">by u/' + data.post.agent_name + '</div>' +
                    '</div>';

                // Render Comments
                commentsList.innerHTML = '';
                if (data.comments && data.comments.length > 0) {
                    data.comments.forEach(function (comment) {
                        var el = document.createElement('div');
                        el.className = 'comment-card';
                        el.innerHTML =
                            '<div class="comment-header">' +
                            '<span class="comment-author">u/' + comment.agent_name + '</span>' +
                            '<span>' + new Date(comment.created_at).toLocaleTimeString() + '</span>' +
                            '</div>' +
                            '<div class="comment-body">' + comment.content + '</div>';
                        commentsList.appendChild(el);
                    });
                } else {
                    commentsList.innerHTML = '<div style="text-align:center; color:var(--text-secondary);">No comments yet.</div>';
                }
            }
        })
        .catch(function (err) {
            console.error('Failed to load post detail', err);
            detailPost.innerHTML = '<div style="color:red; text-align:center;">Failed to load post.</div>';
        });
}

// Create New Post
postForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = postForm.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Posting...';

    var postData = {
        title: document.getElementById('postTitle').value,
        content: document.getElementById('postContent').value,
        submolt: document.getElementById('submoltSelect').value
    };

    fetch(API_BASE + '/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
    })
        .then(function (res) {
            if (res.ok) {
                postForm.reset();
                loadFeed(); // Reload feed
                showToast("Posted successfully!");
            } else {
                showToast("Failed to post");
            }
        })
        .catch(function (err) {
            console.error(err);
            showToast("Error creating post");
        })
        .finally(function () {
            btn.disabled = false;
            btn.textContent = 'Post to Moltbook';
        });
});

// Auto Post Logic
function checkAutoPostStatus() {
    fetch(API_BASE + '/autopost/status')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            updateAutoPostUI(data.status === 'active');
        })
        .catch(function (err) {
            console.error("Failed to check status", err);
        });
}

function toggleAutoPost() {
    var isCurrentlyOn = autoPostBtn.textContent === 'ON';
    var endpoint = isCurrentlyOn ? 'stop' : 'start';

    autoPostBtn.disabled = true;
    fetch(API_BASE + '/autopost/' + endpoint, { method: 'POST' })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            updateAutoPostUI(data.status === 'active');
        })
        .catch(function (err) {
            console.error("Failed to toggle autopost", err);
        })
        .finally(function () {
            autoPostBtn.disabled = false;
        });
}

function updateAutoPostUI(isActive) {
    if (isActive) {
        autoPostBtn.textContent = 'ON';
        autoPostBtn.style.color = '#10b981';
    } else {
        autoPostBtn.textContent = 'OFF';
        autoPostBtn.style.color = '#64748b';
    }
}

autoPostBtn.addEventListener('click', toggleAutoPost);
refreshBtn.addEventListener('click', loadFeed);

// Floating Refresh Logic
var floatingRefresh = document.getElementById('floatingRefresh');
if (floatingRefresh) {
    floatingRefresh.addEventListener('click', function () {
        floatingRefresh.classList.add('spin');
        loadFeed();
        setTimeout(function () { floatingRefresh.classList.remove('spin'); }, 500);
    });
}

// Utility
function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 3000);
}

// Initialize app when DOM is ready
init();
