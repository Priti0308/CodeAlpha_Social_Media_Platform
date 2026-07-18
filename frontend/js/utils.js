// utils.js - Core Frontend Helpers and Token Storage Managers

const BACKEND_PORT = '5003';
function getApiUrl(path) {
    const base = window.location.port === BACKEND_PORT
        ? ''
        : `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
    return `${base}${path}`;
}

// 1. Toast Notification system
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} anim-fade-in`;
    toast.innerText = message;
    
    // Quick inline styling fallback before styles.css is loaded
    toast.style.cssText = `
        background: #FFFFFF;
        color: #1F2937;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        border-left: 5px solid #2563EB;
        font-weight: 500;
        font-family: sans-serif;
        min-width: 250px;
        transition: all 0.3s ease;
    `;
    
    if (type === 'success') toast.style.borderLeftColor = '#10B981';
    if (type === 'error') toast.style.borderLeftColor = '#EF4444';
    if (type === 'warning') toast.style.borderLeftColor = '#F59E0B';

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 2. Token helpers
function getAuthToken() {
    return localStorage.getItem('token');
}

function setAuthToken(token) {
    localStorage.setItem('token', token);
}

function removeAuthToken() {
    localStorage.removeItem('token');
}

// 3. User cache helper
function setCurrentUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('user'));
    } catch {
        return null;
    }
}

function removeCurrentUser() {
    localStorage.removeItem('user');
}

function getMediaUrl(url) {
    if (!url) return '';
    if (url.startsWith('/uploads/')) {
        return getApiUrl(url);
    }
    return url;
}

// 4. Media checking and rendering utilities
function isVideoUrl(url) {
    if (!url) return false;
    return !!url.match(/\.(mp4|webm|mov|ogg)$/i);
}

function renderPostMedia(mediaUrl, className = "post-image", showControls = true) {
    const fullUrl = getMediaUrl(mediaUrl);
    if (isVideoUrl(fullUrl)) {
        const attrs = showControls ? 'controls loop muted playsinline' : 'loop muted playsinline autoplay';
        return `<video src="${fullUrl}" class="${className}" ${attrs} style="width: 100%; height: 100%; object-fit: cover;"></video>`;
    } else {
        return `<img src="${fullUrl}" class="${className}" alt="Post Media" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
}

// 5. Global Media Port Redirector for separate frontend/backend server ports (e.g. 8081 static vs 5003 API)
window.addEventListener('error', function(e) {
    const target = e.target;
    if (target && (target.tagName === 'IMG' || target.tagName === 'VIDEO' || target.tagName === 'SOURCE')) {
        const srcAttr = target.tagName === 'SOURCE' ? 'src' : target.src ? 'src' : 'currentSrc';
        const src = target[srcAttr];
        if (src && src.includes('/uploads/') && !src.includes(`:${BACKEND_PORT}`)) {
            try {
                const url = new URL(src);
                url.port = BACKEND_PORT;
                target[srcAttr] = url.toString();
                if (target.tagName === 'VIDEO') {
                    target.load();
                }
            } catch (err) {
                console.error('Error rewriting media port:', err);
            }
        }
    }
}, true);
