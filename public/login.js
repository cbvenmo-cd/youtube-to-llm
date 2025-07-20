// YouTube To LLM - Enhanced Login JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const apiKeyInput = document.getElementById('apiKey');
    const loginButton = document.getElementById('loginButton');
    const loginMessage = document.getElementById('loginMessage');
    
    // Check if already authenticated
    const authToken = localStorage.getItem('yva_auth_token');
    if (authToken) {
        // Verify token is still valid
        verifyAndRedirect(authToken);
    }
    
    // Handle login form submission
    loginForm.addEventListener('submit', handleLogin);
    
    // Add input animation
    apiKeyInput.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    
    apiKeyInput.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
    
    async function handleLogin(e) {
        e.preventDefault();
        
        const apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
            showMessage('Please enter your API key', 'error');
            return;
        }
        
        // Show loading state
        loginButton.disabled = true;
        loginButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" class="animate-spin" style="transform-origin: center;"/>
            </svg>
            Authenticating...
        `;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiKey })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }
            
            // Store auth token
            localStorage.setItem('yva_auth_token', data.token);
            localStorage.setItem('yva_api_key', apiKey);
            
            // Show success message
            showMessage('Login successful! Redirecting...', 'success');
            
            // Redirect after animation
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
            
        } catch (error) {
            showMessage(error.message, 'error');
            loginButton.disabled = false;
            loginButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle; margin-right: 8px;">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Login
            `;
        }
    }
    
    async function verifyAndRedirect(token) {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                window.location.href = '/';
            }
        } catch (error) {
            // Token invalid, stay on login page
            localStorage.removeItem('yva_auth_token');
        }
    }
    
    function showMessage(message, type) {
        loginMessage.textContent = message;
        loginMessage.className = type === 'error' ? 'error-message' : 'success-message';
        loginMessage.style.display = 'block';
        
        // Auto-hide error messages after 5 seconds
        if (type === 'error') {
            setTimeout(() => {
                loginMessage.style.display = 'none';
            }, 5000);
        }
    }
    
    // Add CSS for spinner animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .animate-spin {
            animation: spin 1s linear infinite;
        }
    `;
    document.head.appendChild(style);
});
