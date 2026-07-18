// follow.js - Follow listings and buttons controllers

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('followers.html')) {
        setupNetworkListPage();
    }
});

// Queries following or followers and populates layouts
async function setupNetworkListPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const type = urlParams.get('type'); // 'followers' or 'following'
    const username = urlParams.get('username') || 'user';

    const titleEl = document.getElementById('network-title');
    const linkEl = document.getElementById('network-profile-link');
    const listWrapper = document.getElementById('network-users-list');

    if (!userId || !type) {
        showToast('Invalid parameters for network view.', 'error');
        if (listWrapper) listWrapper.innerHTML = '';
        return;
    }

    // Configure Header Texts
    if (titleEl) titleEl.innerText = type === 'followers' ? 'Followers' : 'Following';
    if (linkEl) {
        linkEl.innerText = `@${username}`;
        linkEl.href = `/profile.html?username=${username}`;
    }

    try {
        const response = await apiFetch(`/follow/${userId}/${type}`);
        const data = await response.json();

        if (listWrapper) listWrapper.innerHTML = '';

        if (data.success) {
            const list = type === 'followers' ? data.followers : data.following;
            
            if (list.length === 0) {
                listWrapper.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">👥</div>
                        <div class="empty-state-title">No creators found</div>
                        <p>This network directory is currently empty.</p>
                    </div>
                `;
                return;
            }

            const currentUser = getCurrentUser();

            list.forEach(u => {
                const item = document.createElement('div');
                item.className = 'followers-list-item anim-fade-in';
                item.id = `network-item-${u._id}`;

                // Check if current user is following this user
                const isSelf = currentUser && currentUser._id === u._id;
                const isFollowing = currentUser && currentUser.following.includes(u._id);

                let actionBtnHTML = '';
                if (!isSelf) {
                    actionBtnHTML = `
                        <button class="btn-follow-action ${isFollowing ? 'unfollow' : 'follow'}" 
                                id="network-btn-${u._id}"
                                onclick="handleNetworkFollowToggle('${u._id}', '${u.username}')">
                            ${isFollowing ? 'Following' : 'Follow'}
                        </button>
                    `;
                }

                item.innerHTML = `
                    <div class="follower-user-details">
                        <a href="/profile.html?username=${u.username}">
                            <img src="${getMediaUrl(u.profileImage)}" class="follower-avatar" alt="Avatar">
                        </a>
                        <div>
                            <a href="/profile.html?username=${u.username}" class="follower-username">${u.username}</a>
                            <div class="follower-fullname">${u.name}</div>
                        </div>
                    </div>
                    ${actionBtnHTML}
                `;
                listWrapper.appendChild(item);
            });
        } else {
            showToast(data.error || 'Failed to load list details.', 'error');
        }
    } catch (err) {
        console.error('Error fetching networks list:', err);
    }
}

// Network List follow buttons click handler
async function handleNetworkFollowToggle(targetId, targetUsername) {
    const btn = document.getElementById(`network-btn-${targetId}`);
    if (!btn) return;

    try {
        btn.disabled = true;
        const response = await apiFetch(`/follow/${targetId}`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            const currentUser = getCurrentUser();
            
            if (data.following) {
                btn.innerText = 'Following';
                btn.className = 'btn-follow-action unfollow';
                showToast(`You followed @${targetUsername}`, 'success');
                // Sync current user caches
                if (currentUser && !currentUser.following.includes(targetId)) {
                    currentUser.following.push(targetId);
                    setCurrentUser(currentUser);
                }
            } else {
                btn.innerText = 'Follow';
                btn.className = 'btn-follow-action follow';
                showToast(`You unfollowed @${targetUsername}`, 'info');
                // Sync current user caches
                if (currentUser) {
                    currentUser.following = currentUser.following.filter(id => id !== targetId);
                    setCurrentUser(currentUser);
                }
            }
        }
        btn.disabled = false;
    } catch (err) {
        console.error(err);
        btn.disabled = false;
    }
}
