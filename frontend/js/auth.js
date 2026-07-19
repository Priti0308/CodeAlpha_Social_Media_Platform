// auth.js - Frontend Sign Up & Login AJAX Controller

document.addEventListener('DOMContentLoaded', () => {
    // 1. Avatar Local Preview Handler
    setupAvatarPreview();

    // 2. Bind Registration Form Submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }

    // 3. Bind Login Form Submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    // 4. Bind Password Recovery forms
    const verifyEmailForm = document.getElementById('verify-email-form');
    if (verifyEmailForm) {
        verifyEmailForm.addEventListener('submit', handleVerifyEmailSubmit);
    }

    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', handleResetPasswordSubmit);
    }

    // 5. Setup Password Toggles
    setupPasswordToggles();
});

// Sets live image file reader reader logic on inputs
function setupAvatarPreview() {
    const fileInput = document.getElementById('profile-image-upload');
    const previewImg = document.getElementById('avatar-img-preview');

    if (fileInput && previewImg) {
        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                // Size validation: check if exceeds 5MB
                if (file.size > 5 * 1024 * 1024) {
                    showToast('Profile image must be less than 5MB.', 'error');
                    fileInput.value = '';
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

// Submits registration details as multipart form-data
async function handleRegisterSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const name = form.name.value.trim();
    const username = form.username.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirm_password.value;
    const fileInput = document.getElementById('profile-image-upload');

    // 1. Client-Side Field Validations
    if (!name || !username || !email || !password || !confirmPassword) {
        showToast('Please fill in all required fields.', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
    }

    if (password.length < 8) {
        showToast('Password must be at least 8 characters long.', 'warning');
        return;
    }

    // Prepare Multipart Form Data
    const formData = new FormData();
    formData.append('name', name);
    formData.append('username', username);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('confirmPassword', confirmPassword);
    
    if (fileInput && fileInput.files[0]) {
        const compressedProfileImg = await compressImageIfPossible(fileInput.files[0]);
        formData.append('profileImage', compressedProfileImg);
    }

    try {
        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Creating Account...';

        const response = await fetch(getApiUrl('/api/auth/register'), {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            setAuthToken(data.token);
            setCurrentUser(data.user);
            showToast('Registration successful! Welcome.', 'success');
            setTimeout(() => {
                window.location.href = '/home.html';
            }, 1000);
        } else {
            showToast(data.error || 'Registration failed.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Sign Up';
        }
    } catch (err) {
        console.error('Registration error:', err);
        showToast('Server communication failure. Please check your connection.', 'error');
        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Sign Up';
    }
}

// Submits login details as standard JSON payload
async function handleLoginSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !password) {
        showToast('Please enter both email and password.', 'warning');
        return;
    }

    try {
        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Logging In...';

        const response = await fetch(getApiUrl('/api/auth/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            setAuthToken(data.token);
            setCurrentUser(data.user);
            showToast('Log in successful!', 'success');
            setTimeout(() => {
                window.location.href = '/home.html';
            }, 1000);
        } else {
            showToast(data.error || 'Invalid credentials.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Log In';
        }
    } catch (err) {
        console.error('Login error:', err);
        showToast('Communication error. Please check your server status.', 'error');
        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Log In';
    }
}

// Global state for verified email during password recovery
let verifiedEmail = '';

// Reusable Password Visibility toggler
const EYE_OPEN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px; display: block;"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>`;
const EYE_CLOSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px; display: block;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>`;

function setupPasswordToggles() {
    const toggleBtns = document.querySelectorAll('.btn-toggle-password');
    toggleBtns.forEach(toggleBtn => {
        const container = toggleBtn.closest('.ig-input-container');
        if (!container) return;

        const input = container.querySelector('input');
        if (!input) return;

        if (toggleBtn.dataset.toggleSetup) return;
        toggleBtn.dataset.toggleSetup = 'true';
        
        // Initialize with default open eye
        toggleBtn.innerHTML = EYE_OPEN_SVG;

        // Toggle visibility indicator display on input
        input.addEventListener('input', () => {
            if (input.value.length > 0) {
                toggleBtn.style.display = 'flex';
            } else {
                toggleBtn.style.display = 'none';
            }
        });

        // Click handler to toggle type password -> text
        toggleBtn.addEventListener('click', () => {
            if (input.type === 'password') {
                input.type = 'text';
                toggleBtn.innerHTML = EYE_CLOSE_SVG;
            } else {
                input.type = 'password';
                toggleBtn.innerHTML = EYE_OPEN_SVG;
            }
        });
    });
}



// Recover password - Step 1 form handler
async function handleVerifyEmailSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('recovery-email').value.trim();

    if (!email) {
        showToast('Please enter your email address.', 'warning');
        return;
    }

    try {
        const submitBtn = document.getElementById('btn-verify-email');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Verifying...';

        const response = await fetch(getApiUrl('/api/auth/forgot-password'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            verifiedEmail = email;
            showToast('Email verified! You can now reset your password.', 'success');

            // Switch recovery visual state to Step 2 form
            document.getElementById('verify-email-form').style.display = 'none';
            document.getElementById('reset-password-form').style.display = 'block';
            document.getElementById('recovery-description').innerText = 'Choose a secure password that is at least 8 characters long, containing letters and numbers.';
            document.getElementById('recovery-card').querySelector('.recovery-title').innerText = 'Set New Password';
            
            // Re-setup toggles for new password inputs
            setupPasswordToggles();
        } else {
            showToast(data.error || 'Verification failed.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Verify Email';
        }
    } catch (err) {
        console.error('Verify email error:', err);
        showToast('Communication error. Please check your server connection.', 'error');
        const submitBtn = document.getElementById('btn-verify-email');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Verify Email';
    }
}

// Recover password - Step 2 form handler
async function handleResetPasswordSubmit(e) {
    e.preventDefault();
    const password = document.getElementById('reset-password-input').value;
    const confirmPassword = document.getElementById('reset-confirm-password-input').value;

    if (!password || !confirmPassword) {
        showToast('Please enter both password fields.', 'warning');
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
    }

    if (password.length < 8) {
        showToast('Password must be at least 8 characters long.', 'warning');
        return;
    }

    try {
        const submitBtn = document.getElementById('btn-reset-password');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Resetting...';

        const response = await fetch(getApiUrl('/api/auth/reset-password'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: verifiedEmail,
                password,
                confirmPassword
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Password updated successfully! Redirecting to login...', 'success');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1500);
        } else {
            showToast(data.error || 'Password reset failed.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerText = 'Reset Password';
        }
    } catch (err) {
        console.error('Reset password error:', err);
        showToast('Communication error. Please check your server connection.', 'error');
        const submitBtn = document.getElementById('btn-reset-password');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Reset Password';
    }
}
