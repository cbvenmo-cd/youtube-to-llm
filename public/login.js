// YouTube To LLM - Enhanced Login JavaScript

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const apiKeyInput = document.getElementById('apiKey');
    const loginButton = document.getElementById('loginButton');
    const loginMessage = document.getElementById('loginMessage');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const passwordToggle = document.getElementById('passwordToggle');
    const devModeQuickLink = document.getElementById('devModeQuickLink');
    
    // Check if on localhost
    function isLocalhost() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname === '0.0.0.0';
    }
    
    // Load remember me preference
    const savedPreference = localStorage.getItem('yva_remember_preference');
    if (savedPreference !== null) {
        rememberMeCheckbox.checked = savedPreference === 'true';
    }
    
    // Auto-focus API key field
    apiKeyInput.focus();
    
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
        this.parentElement.parentElement.style.transform = 'scale(1.02)';
    });
    
    apiKeyInput.addEventListener('blur', function() {
        this.parentElement.parentElement.style.transform = 'scale(1)';
    });
    
    // Password visibility toggle
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function() {
            const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
            apiKeyInput.setAttribute('type', type);
            
            // Update icon
            if (type === 'text') {
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                `;
            } else {
                this.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                `;
            }
        });
    }
    
    // Show dev mode quick link on localhost
    if (isLocalhost() && devModeQuickLink) {
        // Check current mode
        fetchAuthMode().then(modeData => {
            if (modeData && modeData.mode !== 'development') {
                devModeQuickLink.style.display = 'block';
                
                // Handle dev mode switch
                const link = devModeQuickLink.querySelector('a');
                if (link) {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        if (confirm('Switch to development mode? This will disable authentication.')) {
                            localStorage.setItem('YVA_AUTH_MODE', 'development');
                            window.location.reload();
                        }
                    });
                }
            }
        });
    }
    
    // Check if in dev mode and skip login
    fetchAuthMode().then(modeData => {
        if (modeData && modeData.mode === 'development' && isLocalhost()) {
            showMessage('Development mode active - redirecting...', 'success');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        }
    });
    
    async function fetchAuthMode() {
        try {
            const response = await fetch('/api/auth/mode');
            if (!response.ok) {
                throw new Error('Failed to fetch auth mode');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching auth mode:', error);
            return null;
        }
    }
    
    async function handleLogin(e) {
        e.preventDefault();
        
        const apiKey = apiKeyInput.value.trim();
        const rememberMe = document.getElementById('rememberMe').checked;
        
        if (!apiKey) {
            showMessage('Please enter your API key', 'error');
            return;
        }
        
        // Save remember me preference
        localStorage.setItem('yva_remember_preference', rememberMe);
        
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
                body: JSON.stringify({ apiKey, rememberMe })
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
