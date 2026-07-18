// search.js - Live Search controller with debouncing

let searchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialQuery = urlParams.get('q');
    
    const searchInput = document.getElementById('search-page-input');

    if (searchInput) {
        // Pre-fill query if present in URL
        if (initialQuery) {
            searchInput.value = initialQuery;
            performSearch(initialQuery);
        }

        // Setup debounced listener
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = searchInput.value.trim();

            if (query.length === 0) {
                resetSearchPage();
                return;
            }

            searchTimeout = setTimeout(() => {
                performSearch(query);
            }, 300);
        });
    }
});

// Executes searches requests
async function performSearch(query) {
    const usersSection = document.getElementById('users-results-section');
    const postsSection = document.getElementById('posts-results-section');
    const usersWrapper = document.getElementById('users-results-wrapper');
    const postsWrapper = document.getElementById('posts-results-wrapper');
    const emptyState = document.getElementById('search-empty-state');

    try {
        const response = await apiFetch(`/users/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success) {
            // Clear lists
            if (usersWrapper) usersWrapper.innerHTML = '';
            if (postsWrapper) postsWrapper.innerHTML = '';

            const usersFound = data.users && data.users.length > 0;
            const postsFound = data.posts && data.posts.length > 0;

            if (!usersFound && !postsFound) {
                // Show no results matches state
                if (emptyState) {
                    emptyState.style.display = 'flex';
                    emptyState.innerHTML = `
                        <div class="empty-state-icon">🔍</div>
                        <div class="empty-state-title">No Matches Found</div>
                        <p>We couldn't find any users or captions matching "${query}".</p>
                    `;
                }
                if (usersSection) usersSection.style.display = 'none';
                if (postsSection) postsSection.style.display = 'none';
                return;
            }

            if (emptyState) emptyState.style.display = 'none';

            // 1. Populate Users
            if (usersFound && usersSection && usersWrapper) {
                usersSection.style.display = 'block';
                data.users.forEach(u => {
                    const card = document.createElement('div');
                    card.className = 'user-result-card anim-scale-in';
                    card.innerHTML = `
                        <img src="${getMediaUrl(u.profileImage)}" class="user-result-avatar" alt="Avatar">
                        <div class="user-result-info">
                            <div class="user-result-username">${u.username}</div>
                            <div class="user-result-name">${u.name}</div>
                        </div>
                        <a href="/profile.html?username=${u.username}" class="btn-view-profile">View</a>
                    `;
                    usersWrapper.appendChild(card);
                });
            } else if (usersSection) {
                usersSection.style.display = 'none';
            }

            // 2. Populate Posts
            if (postsFound && postsSection && postsWrapper) {
                postsSection.style.display = 'block';
                data.posts.forEach(post => {
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
                    postsWrapper.appendChild(gridItem);
                });
            } else if (postsSection) {
                postsSection.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Search error:', err);
    }
}

// Resets search view state back to instructions
function resetSearchPage() {
    const usersSection = document.getElementById('users-results-section');
    const postsSection = document.getElementById('posts-results-section');
    const emptyState = document.getElementById('search-empty-state');

    if (usersSection) usersSection.style.display = 'none';
    if (postsSection) postsSection.style.display = 'none';
    if (emptyState) {
        emptyState.style.display = 'flex';
        emptyState.innerHTML = `
            <div class="empty-state-icon">🔍</div>
            <div class="empty-state-title">Search CodeAlpha Social</div>
            <p>Type keywords to search usernames, full names, or post captions.</p>
        `;
    }
}
