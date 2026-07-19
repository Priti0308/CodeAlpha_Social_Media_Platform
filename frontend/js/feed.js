// feed.js - Main Feed Loader, Interactions, and Creating Posts

let currentPage = 1;
let loadingPosts = false;
let hasMorePosts = true;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Load User Details into Sidebar & headers
    setupSidebarUserDetails();

    // 2. Fetch Suggested Users
    fetchSuggestedUsers();

    // 2.5. Fetch Active Stories
    fetchActiveStories();

    // 2.6. Setup Story Uploader
    setupStoryUploader();

    // 3. Fetch Initial Feed Posts
    fetchFeedPosts(currentPage);

    // 4. Setup Infinite Scroll Intersection Observer
    setupInfiniteScroll();

    // 5. Create Post Form Bindings
    setupCreatePostForm();
});

// Sets sidebar fields to local storage details
function setupSidebarUserDetails() {
    const user = getCurrentUser();
    if (!user) return;

    const selfAvatar = document.getElementById('stories-self-avatar');
    const formAvatar = document.getElementById('create-post-avatar');
    const sidebarAvatar = document.getElementById('sidebar-user-avatar');
    const sidebarUsername = document.getElementById('sidebar-user-username');
    const sidebarName = document.getElementById('sidebar-user-name');

    if (selfAvatar) selfAvatar.src = getMediaUrl(user.profileImage);
    if (formAvatar) formAvatar.src = getMediaUrl(user.profileImage);
    if (sidebarAvatar) sidebarAvatar.src = getMediaUrl(user.profileImage);
    if (sidebarUsername) sidebarUsername.innerText = user.username;
    if (sidebarName) sidebarName.innerText = user.name || user.username;
}

// Queries suggestion endpoint and updates sidebar panels
async function fetchSuggestedUsers() {
    const wrapper = document.getElementById('suggestions-list-wrapper');
    if (!wrapper) return;

    try {
        const response = await apiFetch('/users/suggested');
        const data = await response.json();

        if (data.success && data.suggested.length > 0) {
            wrapper.innerHTML = '';
            data.suggested.forEach(su => {
                const row = document.createElement('div');
                row.className = 'suggestion-item';
                row.innerHTML = `
                    <div class="suggestion-user">
                        <a href="/profile.html?username=${su.username}">
                            <img src="${getMediaUrl(su.profileImage)}" class="suggestion-avatar" alt="${su.username}">
                        </a>
                        <div class="suggestion-name-container">
                            <a href="/profile.html?username=${su.username}" class="suggestion-username">${su.username}</a>
                            <span class="suggestion-reason">Suggested creator</span>
                        </div>
                    </div>
                    <button class="btn-follow-link" onclick="toggleFollowSuggested('${su._id}', this)">Follow</button>
                `;
                wrapper.appendChild(row);
            });
        } else {
            wrapper.innerHTML = '<div style="font-size: 0.8rem; color: var(--gray-400); text-align: center; padding: 10px;">No suggestions available</div>';
        }
    } catch (err) {
        console.error('Error fetching suggestions:', err);
    }
}

// Queries timeline posts
async function fetchFeedPosts(page) {
    if (loadingPosts || !hasMorePosts) return;
    loadingPosts = true;

    const wrapper = document.getElementById('feed-posts-wrapper');

    try {
        const response = await apiFetch(`/posts/timeline?page=${page}&limit=5`);
        const data = await response.json();

        // Remove skeletons on first page loading
        if (page === 1) {
            wrapper.innerHTML = '';
        }

        if (data.success && data.posts.length > 0) {
            data.posts.forEach(post => {
                const card = renderPostCard(post);
                wrapper.appendChild(card);
            });
            currentPage++;
        } else {
            hasMorePosts = false;
            if (page === 1) {
                wrapper.innerHTML = `
                    <div class="card empty-state anim-scale-in">
                        <div class="empty-state-icon">📸</div>
                        <div class="empty-state-title">No Posts Yet</div>
                        <p>Follow suggestions or share your own photos to populate your feed stream!</p>
                    </div>
                `;
            } else {
                const endMsg = document.createElement('div');
                endMsg.style.cssText = 'text-align: center; padding: 20px; color: var(--gray-text); font-size: 0.85rem; font-weight: 500;';
                endMsg.innerText = "You've caught up with everything! ✨";
                wrapper.appendChild(endMsg);
            }
        }
    } catch (err) {
        console.error('Error fetching feed posts:', err);
        showToast('Error loading timeline feed.', 'error');
    } finally {
        loadingPosts = false;
    }
}

// Compiles and returns a post card node
function renderPostCard(post) {
    const user = getCurrentUser() || { _id: '' };
    const hasLiked = post.likes && post.likes.some(l => l._id.toString() === user._id.toString());
    const card = document.createElement('article');
    card.className = 'post-card anim-slide-up';
    card.id = `post-card-${post._id}`;

    // Options dropdown for post authors
    let optionsHTML = '';
    if (post.userId._id === user._id) {
        optionsHTML = `
            <div class="profile-dropdown-container">
                <button class="post-options-btn" onclick="togglePostOptions('${post._id}')">•••</button>
                <div class="dropdown-menu" id="post-menu-${post._id}" style="width: 140px; right: 0;">
                    <a href="/post.html?id=${post._id}" class="dropdown-item">👁 View Detail</a>
                    <a class="dropdown-item" style="color: #EF4444;" onclick="deletePostCard('${post._id}')">🗑 Delete</a>
                </div>
            </div>
        `;
    } else {
        optionsHTML = `
            <a href="/post.html?id=${post._id}" class="post-options-btn" style="text-decoration:none;">👁</a>
        `;
    }

    // Build comment snippets preview
    let commentsSnippetHTML = '';
    if (post.comments && post.comments.length > 0) {
        // Sort chronologically (oldest to newest)
        const sortedComments = [...post.comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        sortedComments.forEach(c => {
            if (c.userId) {
                commentsSnippetHTML += `
                    <div class="comment-snippet-item">
                        <span class="comment-snippet-user">${c.userId.username}</span>
                        <span>${c.comment}</span>
                    </div>
                `;
            }
        });
    }

    card.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <a href="/profile.html?username=${post.userId.username}">
                    <img src="${getMediaUrl(post.userId.profileImage)}" class="post-author-avatar" alt="${post.userId.username}">
                </a>
                <div class="post-author-info">
                    <a href="/profile.html?username=${post.userId.username}" class="post-author-name">${post.userId.username}</a>
                    <span class="post-time">${new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            ${optionsHTML}
        </div>

        <div class="post-image-container" ondblclick="handleDoubleTapLike('${post._id}')">
            ${renderPostMedia(post.image, "post-image")}
            <div class="like-heart-pop" id="heart-pop-${post._id}">&#x2764;</div>
        </div>

        <div class="post-actions">
            <div class="post-actions-left">
                <button class="post-action-btn ${hasLiked ? 'liked' : ''}" id="like-btn-${post._id}" onclick="handleLikeToggle('${post._id}')">
                    ${hasLiked ? '❤️' : '🤍'}
                </button>
                <button class="post-action-btn" onclick="document.getElementById('comment-input-${post._id}').focus()">💬</button>
                <button class="post-action-btn" onclick="sharePost('${post._id}')">🔗</button>
            </div>
        </div>

        <div class="post-info">
            <div class="post-likes-count">
                <span id="likes-count-${post._id}">${post.likes ? post.likes.length : 0}</span> likes
            </div>
            <div class="post-caption">
                <a href="/profile.html?username=${post.userId.username}" class="post-caption-author">${post.userId.username}</a>
                ${post.caption}
            </div>
            <div class="post-comments-snippet" id="comments-snippet-${post._id}">
                ${commentsSnippetHTML}
            </div>
            <a href="/post.html?id=${post._id}" class="view-comments-link" id="comments-link-${post._id}">View details</a>
        </div>

        <div class="post-comment-box">
            <textarea class="post-comment-input" id="comment-input-${post._id}" placeholder="Add a comment..." rows="1" oninput="togglePostCommentBtn('${post._id}')"></textarea>
            <button class="post-comment-submit-btn" id="comment-btn-${post._id}" onclick="submitPostComment('${post._id}')">Post</button>
        </div>
    `;

    return card;
}

// Drops post settings options menu
function togglePostOptions(postId) {
    const menu = document.getElementById(`post-menu-${postId}`);
    if (menu) {
        menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
        // Auto-close dropdowns
        document.addEventListener('click', function close(e) {
            if (!e.target.closest('.profile-dropdown-container')) {
                menu.style.display = 'none';
                document.removeEventListener('click', close);
            }
        });
    }
}

// Deletes post document
async function deletePostCard(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
        const response = await apiFetch(`/posts/${postId}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            showToast('Post deleted successfully!', 'success');
            document.getElementById(`post-card-${postId}`).remove();
        } else {
            showToast(data.error || 'Failed to delete post.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error deleting post.', 'error');
    }
}

// Toggles posts likes
async function handleLikeToggle(postId) {
    const btn = document.getElementById(`like-btn-${postId}`);
    const likesCount = document.getElementById(`likes-count-${postId}`);
    
    try {
        const response = await apiFetch(`/posts/${postId}/like`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            if (data.liked) {
                btn.innerText = '❤️';
                btn.classList.add('liked');
            } else {
                btn.innerText = '🤍';
                btn.classList.remove('liked');
            }
            likesCount.innerText = data.likesCount;
        }
    } catch (err) {
        console.error('Error toggling like:', err);
    }
}

// Double click to like animation overlay
function handleDoubleTapLike(postId) {
    const pop = document.getElementById(`heart-pop-${postId}`);
    if (pop) {
        pop.classList.add('heart-pop-active');
        setTimeout(() => pop.classList.remove('heart-pop-active'), 800);
    }
    
    const btn = document.getElementById(`like-btn-${postId}`);
    if (btn && !btn.classList.contains('liked')) {
        handleLikeToggle(postId);
    }
}

// Activates comment button on input typing
function togglePostCommentBtn(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const btn = document.getElementById(`comment-btn-${postId}`);
    if (input && btn) {
        if (input.value.trim().length > 0) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }
}

// Submits posts comments
async function submitPostComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    if (!input || input.value.trim().length === 0) return;

    try {
        const response = await apiFetch(`/comments/${postId}`, {
            method: 'POST',
            body: { comment: input.value }
        });
        const data = await response.json();

        if (data.success) {
            showToast('Comment posted!', 'success');
            input.value = '';
            togglePostCommentBtn(postId);
            // Append preview locally
            const snippet = document.getElementById(`comments-snippet-${postId}`);
            if (snippet) {
                const row = document.createElement('div');
                row.className = 'comment-snippet-item anim-fade-in';
                row.innerHTML = `<span class="comment-snippet-user">${data.comment.userId.username}</span> ${data.comment.comment}`;
                snippet.appendChild(row);
            }
        }
    } catch (err) {
        console.error(err);
        showToast('Error posting comment.', 'error');
    }
}

// Shares post copy links
function sharePost(postId) {
    const link = `${window.location.origin}/post.html?id=${postId}`;
    navigator.clipboard.writeText(link).then(() => {
        showToast('Post link copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy post link.', 'error');
    });
}

// Follow/Unfollow action inside Suggestions card
async function toggleFollowSuggested(targetId, btn) {
    try {
        btn.disabled = true;
        const response = await apiFetch(`/follow/${targetId}`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            if (data.following) {
                btn.innerText = 'Following';
                btn.style.color = 'var(--gray-text)';
                showToast('Followed successfully!', 'success');
            } else {
                btn.innerText = 'Follow';
                btn.style.color = 'var(--primary-color)';
                showToast('Unfollowed successfully!', 'info');
            }
        }
        btn.disabled = false;
    } catch (err) {
        console.error(err);
        btn.disabled = false;
    }
}

// Infinite scroll triggers
function setupInfiniteScroll() {
    const trigger = document.getElementById('infinite-scroll-trigger');
    if (!trigger) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !loadingPosts && hasMorePosts) {
            fetchFeedPosts(currentPage);
        }
    }, { rootMargin: '100px' });
    
    observer.observe(trigger);
}

// Previews post images and submit handlers
function setupCreatePostForm() {
    const form = document.getElementById('create-post-form');
    const imgInput = document.getElementById('post-image-input');
    const previewBox = document.getElementById('post-image-preview-box');
    const previewImg = document.getElementById('post-image-img-preview');
    const removeBtn = document.getElementById('remove-img-preview-btn');

    if (imgInput && previewBox && previewImg) {
        imgInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    previewBox.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        removeBtn.addEventListener('click', () => {
            imgInput.value = '';
            previewImg.src = '';
            previewBox.style.display = 'none';
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!imgInput.files[0]) {
                showToast('Please select a photo to share.', 'warning');
                return;
            }

            const rawFile = imgInput.files[0];
            const file = await compressImageIfPossible(rawFile);

            const formData = new FormData();
            formData.append('image', file);
            formData.append('caption', form.caption.value.trim());

            try {
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerText = 'Sharing...';

                const response = await fetch(getApiUrl('/api/posts/create'), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    showToast('Post shared successfully!', 'success');
                    form.reset();
                    previewBox.style.display = 'none';
                    previewImg.src = '';
                    
                    // Insert post at top of list
                    const wrapper = document.getElementById('feed-posts-wrapper');
                    if (wrapper) {
                        // If empty state exists, clear it
                        const emptyState = wrapper.querySelector('.empty-state');
                        if (emptyState) emptyState.remove();

                        const card = renderPostCard(data.post);
                        wrapper.insertBefore(card, wrapper.firstChild);
                    }
                } else {
                    showToast(data.error || 'Failed to share post.', 'error');
                }
                submitBtn.disabled = false;
                submitBtn.innerText = 'Share';
            } catch (err) {
                console.error(err);
                showToast('Error sharing post.', 'error');
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerText = 'Share';
            }
        });
    }
}

// --- Stories Features (Upload & Playback) ---

function triggerStoryUploadClick() {
    const input = document.getElementById('story-file-input');
    if (input) input.click();
}

function setupStoryUploader() {
    const input = document.getElementById('story-file-input');
    if (input) {
        input.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                uploadStoryFile(file);
            }
        });
    }
}

async function uploadStoryFile(rawFile) {
    const file = await compressImageIfPossible(rawFile);
    if (file.size > 10 * 1024 * 1024) {
        showToast('Story image must be less than 10MB.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
        showToast('Adding to Story...', 'info');
        const response = await fetch(getApiUrl('/api/stories/create'), {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            showToast('Story shared successfully!', 'success');
            // Reload stories list
            fetchActiveStories();
        } else {
            showToast(data.error || 'Failed to add story.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Error uploading story.', 'error');
    }
}

// Global player variables
let activeGroupedStories = [];
let currentGroupIndex = 0;
let currentStoryIndex = 0;
let storyTimer = null;

async function fetchActiveStories() {
    const wrapper = document.getElementById('stories-users-list');
    if (!wrapper) return;

    try {
        const response = await apiFetch('/stories/active');
        const data = await response.json();

        wrapper.innerHTML = '';

        if (data.success && data.stories.length > 0) {
            activeGroupedStories = data.stories;

            data.stories.forEach((group, gIdx) => {
                const storyItem = document.createElement('div');
                storyItem.className = 'story-item';
                storyItem.innerHTML = `
                    <div class="story-img-container story-ring-active">
                        <img src="${getMediaUrl(group.user.profileImage)}" alt="${group.user.username}">
                    </div>
                    <span class="story-username">${group.user.username}</span>
                `;
                
                storyItem.onclick = () => {
                    startStoryPlayback(gIdx);
                };
                
                wrapper.appendChild(storyItem);
            });
        }
    } catch (err) {
        console.error('Error loading stories:', err);
    }
}

function startStoryPlayback(groupIndex) {
    currentGroupIndex = groupIndex;
    currentStoryIndex = 0;
    
    const modal = document.getElementById('story-viewer-modal');
    if (modal) {
        modal.style.display = 'flex';
        playCurrentStory();
    }
}

function playCurrentStory() {
    clearTimeout(storyTimer);

    const group = activeGroupedStories[currentGroupIndex];
    if (!group) {
        closeStoryViewer();
        return;
    }

    const story = group.stories[currentStoryIndex];
    if (!story) {
        // Move to next user's story
        currentGroupIndex++;
        currentStoryIndex = 0;
        playCurrentStory();
        return;
    }

    // Set fields
    document.getElementById('story-viewer-avatar').src = getMediaUrl(group.user.profileImage);
    document.getElementById('story-viewer-username').innerText = group.user.username;
    document.getElementById('story-viewer-img').src = getMediaUrl(story.image);

    // Reset progress indicator
    const progress = document.getElementById('story-viewer-progress');
    if (progress) {
        progress.style.transition = 'none';
        progress.style.width = '0%';
        // Force reflow
        progress.offsetHeight;
        progress.style.transition = 'width 4s linear';
        progress.style.width = '100%';
    }

    // Advance story after 4 seconds
    storyTimer = setTimeout(() => {
        currentStoryIndex++;
        playCurrentStory();
    }, 4000);
}

function closeStoryViewer() {
    clearTimeout(storyTimer);
    const modal = document.getElementById('story-viewer-modal');
    if (modal) modal.style.display = 'none';
}

