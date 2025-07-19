// Login page JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const apiKeyInput = document.getElementById('apiKey');
    const loginButton = document.getElementById('loginButton');
    const loginMessage = document.getElementById('loginMessage');

    // Check if already authenticated
    checkAuthStatus();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showMessage('Please enter an API key', 'error');
            return;
        }

        // Disable form during login
        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        try {
            // Attempt login
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiKey })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Login successful! Redirecting...', 'success');
                
                // Store auth token
                localStorage.setItem('yva_auth_token', data.token);
                localStorage.setItem('yva_api_key', apiKey);
                
                // Redirect to main app
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                showMessage(data.error || 'Invalid API key', 'error');
            }
        } catch (error) {
            showMessage('Login failed. Please try again.', 'error');
            console.error('Login error:', error);
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = 'Login';
        }
    });

    async function checkAuthStatus() {
        const token = localStorage.getItem('yva_auth_token');
        if (token) {
            try {
                const response = await fetch('/api/auth/verify', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    // Already authenticated, redirect to main app
                    window.location.href = '/';
                }
            } catch (error) {
                // Token invalid, stay on login page
                localStorage.removeItem('yva_auth_token');
            }
        }
    }

    function showMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = type === 'success' ? 'success-message' : 'error-message';
        loginMessage.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => {
                loginMessage.style.display = 'none';
            }, 3000);
        }
    }
});
