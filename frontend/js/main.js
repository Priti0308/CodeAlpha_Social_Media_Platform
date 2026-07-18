// main.js - Core Session Protection, Dynamic Navbar Injector, and Shared UI Bindings

document.addEventListener('DOMContentLoaded', () => {
    // 1. Session Check & Client-Side Route Protection
    checkAuthentication();

    // 2. Inject Shared Glassmorphic Navbar & Footer (for logged-in pages)
    const token = getAuthToken();
    const path = window.location.pathname.toLowerCase();
    const isAuthPage = path.includes('login.html') || 
                       path.includes('register.html') || 
                       path.includes('forgot-password.html') || 
                       path.includes('index.html') || 
                       path === '/' || 
                       path === '';
    if (token && !isAuthPage) {
        injectNavbar();
        setupNavbarDropdown();
        setupUnreadNotificationsCounter();
        setupBackToTop();
    }

    // 3. Setup Button Ripple Effects
    setupRippleEffects();
});

// Enforces route guards on the client side
function checkAuthentication() {
    const token = getAuthToken();
    const path = window.location.pathname.toLowerCase();
    
    // Pages requiring active login
    const protectedPages = [
        'home.html',
        'profile.html',
        'edit-profile.html',
        'post.html',
        'search.html',
        'notifications.html',
        'followers.html',
        'messages.html'
    ];

    const isProtected = protectedPages.some(page => path.includes(page));
    const isAuthPage = path.includes('login.html') || path.includes('register.html') || path.includes('index.html') || path === '/';

    if (isProtected && !token) {
        window.location.href = '/login.html';
    } else if (isAuthPage && token) {
        window.location.href = '/home.html';
    }
}

// Injects the sticky desktop navigation header and mobile bottom navbar
function injectNavbar() {
    const user = getCurrentUser() || { username: 'user', profileImage: '/assets/images/default-avatar.svg' };
    
    // Create Desktop Header
    const header = document.createElement('header');
    header.className = 'navbar';
    header.innerHTML = `
        <div class="navbar-container">
            <a href="/home.html" class="nav-brand">CodeAlpha Social</a>

            <div class="nav-search">
                <span class="search-icon">🔍</span>
                <input type="text" id="global-search-input" placeholder="Search creators...">
            </div>

            <nav class="nav-menu">
                <a href="/home.html" class="nav-link" title="Home">🏠</a>
                <a href="/search.html" class="nav-link" title="Search">🔍</a>
                <a href="/messages.html" class="nav-link" title="Messages">✉️</a>
                <a href="/notifications.html" class="nav-link" title="Notifications">
                    🔔
                    <span class="nav-badge" id="unread-badge" style="display: none;">0</span>
                </a>
                <div class="profile-dropdown-container">
                    <div class="nav-link" id="dropdown-trigger" style="cursor: pointer;">
                        <img src="${getMediaUrl(user.profileImage)}" class="nav-profile-img" alt="Profile">
                    </div>
                    <div class="dropdown-menu" id="dropdown-menu">
                        <a href="/profile.html?username=${user.username}" class="dropdown-item">👤 Profile</a>
                        <a href="/edit-profile.html" class="dropdown-item">⚙️ Settings</a>
                        <div class="dropdown-divider"></div>
                        <a id="nav-logout-btn" class="dropdown-item" style="color: #EF4444;">🚪 Log Out</a>
                    </div>
                </div>
            </nav>
        </div>
    `;
    
    // Insert header before the main app content
    document.body.insertBefore(header, document.body.firstChild);

    // Create Mobile Bottom Navbar
    const mobileNav = document.createElement('nav');
    mobileNav.className = 'mobile-bottom-nav';
    mobileNav.innerHTML = `
        <a href="/home.html" class="nav-link">🏠</a>
        <a href="/search.html" class="nav-link">🔍</a>
        <a href="/notifications.html" class="nav-link" style="position: relative;">
            🔔
            <span class="nav-badge" id="mobile-unread-badge" style="display: none;">0</span>
        </a>
        <a href="/messages.html" class="nav-link" title="Messages">✉️</a>
        <a href="/profile.html?username=${user.username}" class="nav-link">
            <img src="${getMediaUrl(user.profileImage)}" class="nav-profile-img" alt="Profile">
        </a>
    `;
    document.body.appendChild(mobileNav);

    // Bind logout button click
    const logoutBtn = document.getElementById('nav-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logoutUser();
        });
    }

    // Bind search action keyup
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const q = searchInput.value.trim();
                if (q) {
                    window.location.href = `/search.html?q=${encodeURIComponent(q)}`;
                }
            }
        });
    }
}

// Drops down dropdown options under header avatar
function setupNavbarDropdown() {
    const trigger = document.getElementById('dropdown-trigger');
    const menu = document.getElementById('dropdown-menu');
    
    if (trigger && menu) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
        });

        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
    }
}

// Queries unread notifications and sets headers badge counter
async function setupUnreadNotificationsCounter() {
    if (typeof apiFetch !== 'function') return;
    try {
        const response = await apiFetch('/users/notifications/unread-count');
        const data = await response.json();
        if (data.success && data.unreadCount > 0) {
            const badge = document.getElementById('unread-badge');
            const mobileBadge = document.getElementById('mobile-unread-badge');
            
            if (badge) {
                badge.innerText = data.unreadCount;
                badge.style.display = 'inline-block';
            }
            if (mobileBadge) {
                mobileBadge.innerText = data.unreadCount;
                mobileBadge.style.display = 'inline-block';
            }
        }
    } catch (err) {
        console.error('Error fetching unread notifications count:', err);
    }
}

// Clear token values and redirect
function logoutUser() {
    removeAuthToken();
    removeCurrentUser();
    showToast('Logged out successfully!', 'info');
    setTimeout(() => {
        window.location.href = '/login.html';
    }, 500);
}

// Sets click listener on back-to-top buttons
function setupBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.id = 'back-to-top-btn';
    btn.innerHTML = '▲';
    btn.title = 'Back to Top';
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Attaches click ripples on interactive buttons
function setupRippleEffects() {
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('.btn, .btn-submit, .btn-follow-action');
        if (!target) return;

        target.classList.add('ripple');
        const rect = target.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
        
        target.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
}
