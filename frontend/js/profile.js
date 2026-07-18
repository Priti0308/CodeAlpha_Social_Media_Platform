// profile.js - Profile rendering, follow switches, and settings editing

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('edit-profile')) {
        setupEditProfilePage();
    } else if (path.includes('profile')) {
        setupProfilePage();
        setupCreateFormListener();
    }
});

// Setup profile pages
async function setupProfilePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = getCurrentUser();
    
    // Default to logged-in user if parameter is missing
    let username = urlParams.get('username');
    if (!username && currentUser) {
        username = currentUser.username;
    }
    
    if (!username) {
        showToast('Invalid profile request.', 'error');
        return;
    }

    try {
        const response = await apiFetch(`/users/profile/${username}`);
        const data = await response.json();

        if (data.success) {
            renderProfileDetails(data.user);
            setupProfileTabs();
        } else {
            showToast(data.error || 'Failed to load profile.', 'error');
        }
    } catch (err) {
        console.error('Error loading profile:', err);
    }
}

// Renders user statistics, bio, and posts grid
function renderProfileDetails(profileUser) {
    const currentUser = getCurrentUser();
    
    // Set Page Title
    document.title = `@${profileUser.username} • CodeAlpha Social`;

    // Elements
    const avatar = document.getElementById('profile-avatar-img');
    const usernameDisp = document.getElementById('profile-display-username');
    const nameDisp = document.getElementById('profile-display-name');
    const bioDisp = document.getElementById('profile-display-bio');
    const postsCount = document.getElementById('profile-posts-num');
    const followersCount = document.getElementById('profile-followers-num');
    const followingCount = document.getElementById('profile-following-num');
    const actionBtnContainer = document.getElementById('profile-action-btn-container');

    // Fill fields
    if (avatar) avatar.src = getMediaUrl(profileUser.profileImage);
    if (usernameDisp) usernameDisp.innerText = profileUser.username;
    if (nameDisp) nameDisp.innerText = profileUser.name;
    if (bioDisp) bioDisp.innerText = profileUser.bio || 'No bio yet. ✨';
    if (postsCount) postsCount.innerText = profileUser.postsCount;
    if (followersCount) followersCount.innerText = profileUser.followersCount;
    if (followingCount) followingCount.innerText = profileUser.followingCount;

    // Render cover image banner dynamically
    const coverWrapper = document.querySelector('.profile-cover-wrapper');
    if (coverWrapper) {
        if (profileUser.coverImage) {
            coverWrapper.innerHTML = `<img src="${getMediaUrl(profileUser.coverImage)}" class="profile-cover-img" alt="Cover photo">`;
        } else {
            coverWrapper.innerHTML = `<div style="width:100%; height:100%; background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);"></div>`;
        }
    }

    // Direct network listings links setup
    const followersLink = document.getElementById('profile-followers-link');
    const followingLink = document.getElementById('profile-following-link');
    if (followersLink) followersLink.href = `/followers.html?userId=${profileUser._id}&type=followers&username=${profileUser.username}`;
    if (followingLink) followingLink.href = `/followers.html?userId=${profileUser._id}&type=following&username=${profileUser.username}`;

    // Fill Action Buttons
    if (actionBtnContainer) {
        if (currentUser && currentUser._id === profileUser._id) {
            actionBtnContainer.innerHTML = `
                <div class="profile-action-buttons">
                    <a href="/edit-profile.html" class="btn-profile-edit">Edit Profile</a>
                    <button class="btn btn-primary btn-round btn-create-dropdown" id="profile-create-btn" style="padding: 6px 14px; font-size: 0.88rem; display: flex; align-items: center; gap: 4px; border: none; background: var(--pink-orange); color: white;" onclick="toggleCreateDropdown(event)">
                        <span>Create</span> <span style="font-size: 0.75rem;">▼</span>
                    </button>
                    <div id="profile-create-dropdown-menu" class="dropdown-menu">
                        <a class="dropdown-item" onclick="triggerProfileCreate('post')">📸 New Post</a>
                        <a class="dropdown-item" onclick="triggerProfileCreate('reel')">🎥 New Reel</a>
                        <a class="dropdown-item" onclick="triggerProfileCreate('story')">💫 Add Story</a>
                    </div>
                </div>
            `;
            // Add click outside handler to close dropdown
            document.addEventListener('click', () => {
                const dropdown = document.getElementById('profile-create-dropdown-menu');
                if (dropdown) dropdown.classList.remove('active');
            });
        } else {
            actionBtnContainer.innerHTML = `
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="btn btn-primary btn-round ${profileUser.isFollowing ? 'btn-secondary' : ''}" 
                            id="follow-btn" 
                            onclick="handleProfileFollowToggle('${profileUser._id}')">
                        ${profileUser.isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <a href="/messages.html?username=${profileUser.username}" class="btn btn-secondary btn-round" style="padding: 6px 16px; font-size: 0.88rem; font-weight: 600; text-decoration: none; border: 1px solid var(--border-color); color: var(--dark-text); display: inline-flex; align-items: center; justify-content: center; height: 32px; box-sizing: border-box; cursor: pointer;">
                        Message
                    </a>
                </div>
            `;
        }
    }

    // Populate Posts list & grid view
    populateProfilePosts(profileUser.posts, profileUser.username);
}

// Builds grid and list posts cards
function populateProfilePosts(posts, authorUsername) {
    const grid = document.getElementById('profile-posts-grid');
    const reelsGrid = document.getElementById('profile-reels-grid');
    const list = document.getElementById('profile-posts-list');
    
    if (!grid || !list) return;

    // Filter Posts vs Reels
    const postsList = posts.filter(p => !p.isReel);
    const reelsList = posts.filter(p => p.isReel);

    // Render Posts Grid
    if (postsList.length === 0) {
        const emptyStateHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; padding: 60px 20px;">
                <div class="empty-state-icon">📷</div>
                <div class="empty-state-title">No Posts Yet</div>
                <p>Moments shared by this user will appear here.</p>
            </div>
        `;
        grid.innerHTML = emptyStateHTML;
        list.innerHTML = emptyStateHTML;
    } else {
        grid.innerHTML = '';
        list.innerHTML = '';

        postsList.forEach(post => {
            // 1. Render Grid item
            const gridItem = document.createElement('div');
            gridItem.className = 'grid-item anim-scale-in';
            gridItem.innerHTML = `
                ${renderPostMedia(post.image, "grid-item-img", false)}
                <div class="grid-item-overlay">
                    <div class="overlay-stat">❤️ ${post.likes ? post.likes.length : 0}</div>
                    <div class="overlay-stat">💬 ${post.comments ? post.comments.length : 0}</div>
                </div>
            `;
            gridItem.addEventListener('click', () => {
                window.location.href = `/post.html?id=${post._id}`;
            });
            grid.appendChild(gridItem);

            // 2. Render List post card
            const card = document.createElement('article');
            card.className = 'post-card';
            card.style.marginBottom = '24px';
            card.innerHTML = `
                <div class="post-header">
                    <div class="post-author">
                        <img src="${document.getElementById('profile-avatar-img').src}" class="post-author-avatar" alt="Avatar">
                        <div class="post-author-info">
                            <span class="post-author-name">${authorUsername}</span>
                            <span class="post-time">${new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div class="post-image-container" onclick="window.location.href='/post.html?id=${post._id}'" style="cursor: pointer;">
                    ${renderPostMedia(post.image, "post-image")}
                </div>
                <div class="post-info">
                    <div class="post-likes-count">${post.likes ? post.likes.length : 0} likes</div>
                    <div class="post-caption">
                        <span class="post-caption-author">${authorUsername}</span>
                        ${post.caption}
                    </div>
                </div>
            `;
            list.appendChild(card);
        });
    }

    // Render Reels Grid
    if (reelsGrid) {
        if (reelsList.length === 0) {
            reelsGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1; padding: 60px 20px;">
                    <div class="empty-state-icon">🎥</div>
                    <div class="empty-state-title">No Reels Yet</div>
                    <p>Reels shared by this user will appear here.</p>
                </div>
            `;
        } else {
            reelsGrid.innerHTML = '';
            reelsList.forEach(reel => {
                const reelItem = document.createElement('div');
                reelItem.className = 'reel-item anim-scale-in';
                reelItem.innerHTML = `
                    ${renderPostMedia(reel.image, "reel-item-video", false)}
                    <div class="reel-item-overlay">
                        <div class="overlay-stat">❤️ ${reel.likes ? reel.likes.length : 0}</div>
                        <div class="overlay-stat">💬 ${reel.comments ? reel.comments.length : 0}</div>
                    </div>
                `;
                reelItem.addEventListener('click', () => {
                    window.location.href = `/post.html?id=${reel._id}`;
                });
                reelsGrid.appendChild(reelItem);
            });
        }
    }
}

// Binds grid / reels / list view tab selection events
function setupProfileTabs() {
    const gridTab = document.getElementById('tab-grid');
    const reelsTab = document.getElementById('tab-reels');
    const listTab = document.getElementById('tab-list');
    const gridView = document.getElementById('profile-posts-grid');
    const reelsView = document.getElementById('profile-reels-grid');
    const listView = document.getElementById('profile-posts-list');

    if (gridTab && reelsTab && listTab && gridView && reelsView && listView) {
        gridTab.addEventListener('click', () => {
            setActiveTab(gridTab, gridView);
        });

        reelsTab.addEventListener('click', () => {
            setActiveTab(reelsTab, reelsView);
        });

        listTab.addEventListener('click', () => {
            setActiveTab(listTab, listView);
        });
    }

    function setActiveTab(activeTab, activeView) {
        [gridTab, reelsTab, listTab].forEach(t => t.classList.remove('active'));
        [gridView, reelsView, listView].forEach(v => v.style.display = 'none');
        activeTab.classList.add('active');
        if (activeView === gridView || activeView === reelsView) {
            activeView.style.display = 'grid';
        } else {
            activeView.style.display = 'block';
        }
    }
}

// Handles followers toggles from profiles pages
async function handleProfileFollowToggle(targetId) {
    const btn = document.getElementById('follow-btn');
    const followersNum = document.getElementById('profile-followers-num');
    
    if (!btn) return;
    
    try {
        btn.disabled = true;
        const response = await apiFetch(`/follow/${targetId}`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            if (data.following) {
                btn.innerText = 'Following';
                btn.classList.add('btn-secondary');
                showToast('Followed creator!', 'success');
            } else {
                btn.innerText = 'Follow';
                btn.classList.remove('btn-secondary');
                showToast('Unfollowed creator.', 'info');
            }
            if (followersNum) followersNum.innerText = data.followersCount;
        }
        btn.disabled = false;
    } catch (err) {
        console.error(err);
        btn.disabled = false;
    }
}

// Pre-populates settings inside edit-profile page
async function setupEditProfilePage() {
    const user = getCurrentUser();
    if (!user) return;

    // Fill form elements
    const avatarImg = document.getElementById('avatar-preview-img');
    const nameInput = document.querySelector('input[name="name"]');
    const usernameInput = document.querySelector('input[name="username"]');
    const emailInput = document.querySelector('input[name="email"]');
    const bioInput = document.querySelector('textarea[name="bio"]');
    const coverImg = document.getElementById('cover-preview-img');
    const coverFallback = document.getElementById('cover-preview-fallback');

    // Prepopulate fallback cache instantly
    if (avatarImg) avatarImg.src = getMediaUrl(user.profileImage);
    if (nameInput) nameInput.value = user.name || '';
    if (usernameInput) usernameInput.value = user.username;
    if (emailInput) emailInput.value = user.email;
    if (bioInput) bioInput.value = user.bio || '';
    if (user.coverImage && coverImg) {
        coverImg.src = getMediaUrl(user.coverImage);
        coverImg.style.display = 'block';
        if (coverFallback) coverFallback.style.display = 'none';
    }

    // Now query API for fresh settings details (including cover page!)
    try {
        const response = await apiFetch(`/users/profile/${user.username}`);
        const data = await response.json();
        
        if (data.success && data.user) {
            const freshUser = data.user;
            if (avatarImg) avatarImg.src = getMediaUrl(freshUser.profileImage);
            if (nameInput) nameInput.value = freshUser.name || '';
            if (usernameInput) usernameInput.value = freshUser.username;
            if (emailInput) emailInput.value = freshUser.email;
            if (bioInput) bioInput.value = freshUser.bio || '';
            
            if (freshUser.coverImage && coverImg) {
                coverImg.src = getMediaUrl(freshUser.coverImage);
                coverImg.style.display = 'block';
                if (coverFallback) coverFallback.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Error fetching settings info:', err);
    }

    // File selection listeners for avatar
    const avatarInput = document.getElementById('profile-image-upload-input');
    if (avatarInput && avatarImg) {
        avatarInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    avatarImg.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // File selection listeners for cover banner
    const coverInput = document.getElementById('cover-image-upload-input');
    if (coverInput && coverImg) {
        coverInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    coverImg.src = e.target.result;
                    coverImg.style.display = 'block';
                    if (coverFallback) coverFallback.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Submit listener
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', handleEditProfileSubmit);
    }
}

// Submits profile modifications
async function handleEditProfileSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const name = form.name.value.trim();
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const bio = form.bio.value.trim();
    const avatarInput = document.getElementById('profile-image-upload-input');
    const coverInput = document.getElementById('cover-image-upload-input');

    if (!username || !email) {
        showToast('Username and Email are required.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('username', username);
    formData.append('email', email);
    formData.append('bio', bio);
    
    if (avatarInput && avatarInput.files[0]) {
        formData.append('profileImage', avatarInput.files[0]);
    }
    if (coverInput && coverInput.files[0]) {
        formData.append('coverImage', coverInput.files[0]);
    }

    try {
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Saving Changes...';

        const response = await fetch(getApiUrl('/api/users/edit'), {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            // Update User Cache info
            setCurrentUser(data.user);
            showToast('Profile updated successfully!', 'success');
            setTimeout(() => {
                window.location.href = `/profile.html?username=${data.user.username}`;
            }, 1000);
        } else {
            showToast(data.error || 'Failed to save settings.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Save Changes';
        }
    } catch (err) {
        console.error(err);
        showToast('Communication error saving settings.', 'error');
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Save Changes';
    }
}

// ==========================================
// CODEALPHA SOCIAL - CREATION MODAL & ACTIONS
// ==========================================

window.toggleCreateDropdown = function(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('profile-create-dropdown-menu');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
};

window.triggerProfileCreate = function(type) {
    const modal = document.getElementById('create-content-modal');
    const typeInput = document.getElementById('create-content-type');
    const title = document.getElementById('create-modal-title');
    const fileLabel = document.getElementById('create-file-label');
    const fileInput = document.getElementById('create-file-input');
    const captionGroup = document.getElementById('create-caption-group');
    const captionInput = document.getElementById('create-caption-input');
    const previewContainer = document.getElementById('create-preview-container');
    const imgPreview = document.getElementById('create-img-preview');
    const videoPreview = document.getElementById('create-video-preview');

    if (!modal || !typeInput || !title || !fileLabel || !fileInput) return;

    // Reset fields
    typeInput.value = type;
    fileInput.value = '';
    captionInput.value = '';
    previewContainer.style.display = 'none';
    imgPreview.style.display = 'none';
    videoPreview.style.display = 'none';
    
    // Customize modal layout
    if (type === 'post') {
        title.innerText = 'Create New Post';
        fileLabel.innerText = 'Select Photo';
        fileInput.accept = 'image/*';
        captionGroup.style.display = 'block';
    } else if (type === 'reel') {
        title.innerText = 'Create New Reel';
        fileLabel.innerText = 'Select Video';
        fileInput.accept = 'video/*';
        captionGroup.style.display = 'block';
    } else if (type === 'story') {
        title.innerText = 'Add to Story';
        fileLabel.innerText = 'Select Story Image';
        fileInput.accept = 'image/*';
        captionGroup.style.display = 'none';
    }

    modal.style.display = 'flex';

    // File preview rendering
    fileInput.onchange = function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewContainer.style.display = 'flex';
                if (type === 'reel') {
                    videoPreview.src = e.target.result;
                    videoPreview.style.display = 'block';
                    imgPreview.style.display = 'none';
                } else {
                    imgPreview.src = e.target.result;
                    imgPreview.style.display = 'block';
                    videoPreview.style.display = 'none';
                }
            };
            reader.readAsDataURL(file);
        }
    };
};

window.closeCreateModal = function() {
    const modal = document.getElementById('create-content-modal');
    if (modal) modal.style.display = 'none';
};

function setupCreateFormListener() {
    const form = document.getElementById('create-content-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const type = document.getElementById('create-content-type').value;
        const fileInput = document.getElementById('create-file-input');
        const captionInput = document.getElementById('create-caption-input');
        const submitBtn = form.querySelector('button[type="submit"]');

        if (!fileInput.files[0]) {
            showToast('Please select a file to upload.', 'warning');
            return;
        }

        const file = fileInput.files[0];
        const formData = new FormData();
        
        submitBtn.disabled = true;
        submitBtn.innerText = 'Sharing...';

        try {
            if (type === 'story') {
                if (file.size > 10 * 1024 * 1024) {
                    showToast('Story image must be less than 10MB.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Share';
                    return;
                }
                formData.append('image', file);
                
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
                    closeCreateModal();
                } else {
                    showToast(data.error || 'Failed to add story.', 'error');
                }
            } else {
                // Post or Reel
                formData.append('image', file);
                formData.append('caption', captionInput.value.trim());
                if (type === 'reel') {
                    formData.append('isReel', 'true');
                }

                showToast(`Sharing new ${type}...`, 'info');
                const response = await fetch(getApiUrl('/api/posts/create'), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: formData
                });
                const data = await response.json();
                if (data.success) {
                    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} shared successfully!`, 'success');
                    closeCreateModal();
                    // Reload profile details
                    setupProfilePage();
                } else {
                    showToast(data.error || `Failed to create ${type}.`, 'error');
                }
            }
        } catch (err) {
            console.error('Error sharing content:', err);
            showToast('Error sharing content.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Share';
        }
    });
}
