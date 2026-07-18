// api.js - Core Fetch wrapper with JWT headers

const API_BASE = getApiUrl('/api');

async function apiFetch(endpoint, options = {}) {
    const token = getAuthToken();
    
    // Set headers
    const headers = options.headers || {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // If body is object, automatically convert to JSON (unless it is FormData)
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
        body = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        ...options,
        headers,
        body
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);
        
        // Handle token expiration
        if (response.status === 401) {
            removeAuthToken();
            removeCurrentUser();
            // Do not redirect if already on login or register pages
            const path = window.location.pathname;
            if (!path.includes('login.html') && !path.includes('register.html') && path !== '/' && !path.includes('index.html')) {
                window.location.href = '/login.html';
            }
        }
        
        return response;
    } catch (err) {
        console.error(`API Fetch Error [${endpoint}]:`, err);
        throw err;
    }
}
