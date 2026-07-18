// notifications.js - Activity Notifications listing page

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.toLowerCase();
    
    if (path.includes('notifications.html')) {
        fetchActivityNotifications();
    }
});

// Queries notifications details
async function fetchActivityNotifications() {
    const wrapper = document.getElementById('notifications-wrapper');
    if (!wrapper) return;

    try {
        const response = await apiFetch('/users/notifications');
        const data = await response.json();

        wrapper.innerHTML = '';

        if (data.success) {
            // Reset unread badges globally
            clearUnreadBadges();

            if (data.notifications.length === 0) {
                wrapper.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">🔔</div>
                        <div class="empty-state-title">No notifications yet</div>
                        <p>Interactions with your posts and network connections will show up here.</p>
                    </div>
                `;
                return;
            }

            data.notifications.forEach(n => {
                const row = document.createElement('div');
                row.className = 'notification-item anim-fade-in';

                // Determine notification texts
                let actionText = '';
                if (n.type === 'like') {
                    actionText = 'liked your photo.';
                } else if (n.type === 'comment') {
                    actionText = 'commented on your post.';
                } else if (n.type === 'follow') {
                    actionText = 'started following you.';
                }

                // Thumbnail if comment/like
                let thumbHTML = '';
                if ((n.type === 'like' || n.type === 'comment') && n.postId) {
                    thumbHTML = `
                        <a href="/post.html?id=${n.postId._id}">
                            <img src="${getMediaUrl(n.postId.image)}" class="notification-post-thumb" alt="Post thumbnail">
                        </a>
                    `;
                }

                row.innerHTML = `
                    <div class="notification-left">
                        <a href="/profile.html?username=${n.senderId.username}">
                            <img src="${getMediaUrl(n.senderId.profileImage)}" class="notification-sender-avatar" alt="Avatar">
                        </a>
                        <div class="notification-text-content">
                            <div>
                                <a href="/profile.html?username=${n.senderId.username}" class="notification-sender-name">${n.senderId.username}</a>
                                <span>${actionText}</span>
                            </div>
                            <span class="notification-time">${new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    ${thumbHTML}
                `;
                wrapper.appendChild(row);
            });
        } else {
            showToast(data.error || 'Failed to load notifications.', 'error');
        }
    } catch (err) {
        console.error('Error fetching notifications:', err);
    }
}

// Clears indicators badges
function clearUnreadBadges() {
    const badge = document.getElementById('unread-badge');
    const mobileBadge = document.getElementById('mobile-unread-badge');
    if (badge) badge.style.display = 'none';
    if (mobileBadge) mobileBadge.style.display = 'none';
}
