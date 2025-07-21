/**
 * Session Validator - Validates and manages user sessions
 */

/**
 * Check if current session is valid
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<boolean>} True if session is valid
 */
async function isSessionValid(page, baseUrl = 'http://localhost:8080') {
    try {
        console.log('Checking session validity...');
        
        // Try to access a protected page
        const response = await page.goto(baseUrl, {
            waitUntil: 'networkidle0',
            timeout: 15000
        });
        
        // Check response status
        if (!response || !response.ok()) {
            console.log('Invalid response status:', response ? response.status() : 'No response');
            return false;
        }
        
        // Check if redirected to login
        const currentUrl = page.url();
        if (currentUrl.includes('/login.html')) {
            console.log('Session invalid - redirected to login');
            return false;
        }
        
        // Check for main content
        try {
            await page.waitForSelector('.container', { 
                visible: true, 
                timeout: 5000 
            });
            console.log('Session valid - main content loaded');
            return true;
        } catch (error) {
            console.log('Session invalid - main content not found');
            return false;
        }
        
    } catch (error) {
        console.error('Error checking session validity:', error.message);
        return false;
    }
}

/**
 * Check authentication status via API
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<Object>} Auth status object
 */
async function checkAuthStatus(page, baseUrl = 'http://localhost:8080') {
    try {
        // Make API call to check auth status
        const authStatus = await page.evaluate(async (url) => {
            try {
                const response = await fetch(`${url}/api/auth/status`, {
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    return {
                        authenticated: false,
                        error: `HTTP ${response.status}`
                    };
                }
                
                return await response.json();
            } catch (error) {
                return {
                    authenticated: false,
                    error: error.message
                };
            }
        }, baseUrl);
        
        console.log('Auth status:', authStatus);
        return authStatus;
        
    } catch (error) {
        console.error('Error checking auth status:', error);
        return {
            authenticated: false,
            error: error.message
        };
    }
}

/**
 * Refresh the current session
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<boolean>} True if refresh successful
 */
async function refreshSession(page, baseUrl = 'http://localhost:8080') {
    try {
        console.log('Refreshing session...');
        
        // Try to refresh via API
        const refreshResult = await page.evaluate(async (url) => {
            try {
                const response = await fetch(`${url}/api/auth/refresh`, {
                    method: 'POST',
                    credentials: 'include'
                });
                
                return {
                    success: response.ok,
                    status: response.status
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }, baseUrl);
        
        if (refreshResult.success) {
            console.log('Session refreshed successfully');
            return true;
        } else {
            console.log('Session refresh failed:', refreshResult);
            return false;
        }
        
    } catch (error) {
        console.error('Error refreshing session:', error);
        return false;
    }
}

/**
 * Get detailed session information
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<Object>} Session information
 */
async function getSessionInfo(page) {
    try {
        // Get cookies
        const cookies = await page.cookies();
        
        // Find auth-related cookies
        const authCookies = cookies.filter(cookie => 
            cookie.name.includes('auth') || 
            cookie.name.includes('session') ||
            cookie.name === 'yva-auth'
        );
        
        // Get localStorage data
        const localStorageData = await page.evaluate(() => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.includes('auth') || key.includes('user')) {
                    data[key] = localStorage.getItem(key);
                }
            }
            return data;
        });
        
        // Calculate session age and expiry
        const sessionInfo = {
            hasCookies: authCookies.length > 0,
            cookieCount: authCookies.length,
            cookies: authCookies.map(cookie => ({
                name: cookie.name,
                domain: cookie.domain,
                expires: cookie.expires,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure
            })),
            localStorage: localStorageData,
            sessionAge: null,
            expiresIn: null
        };
        
        // Find the main auth cookie
        const mainAuthCookie = authCookies.find(c => c.name === 'auth-token' || c.name === 'yva-auth');
        if (mainAuthCookie && mainAuthCookie.expires) {
            const now = Date.now() / 1000;
            const expiresAt = mainAuthCookie.expires;
            sessionInfo.expiresIn = Math.round((expiresAt - now) / 3600); // Hours
            
            // Estimate session age (90 days default - remaining time)
            const totalSessionHours = 90 * 24; // 90 days in hours
            sessionInfo.sessionAge = totalSessionHours - sessionInfo.expiresIn;
        }
        
        return sessionInfo;
        
    } catch (error) {
        console.error('Error getting session info:', error);
        return {
            hasCookies: false,
            error: error.message
        };
    }
}

/**
 * Validate session and provide detailed status
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<Object>} Detailed validation result
 */
async function validateSession(page, baseUrl = 'http://localhost:8080') {
    const result = {
        valid: false,
        reason: null,
        sessionInfo: null,
        authStatus: null,
        recommendations: []
    };
    
    try {
        // Check basic validity
        result.valid = await isSessionValid(page, baseUrl);
        
        // Get session info
        result.sessionInfo = await getSessionInfo(page);
        
        // Get auth status
        result.authStatus = await checkAuthStatus(page, baseUrl);
        
        // Determine reason and recommendations
        if (!result.valid) {
            if (!result.sessionInfo.hasCookies) {
                result.reason = 'No authentication cookies found';
                result.recommendations.push('Perform fresh login');
            } else if (result.sessionInfo.expiresIn <= 0) {
                result.reason = 'Session has expired';
                result.recommendations.push('Perform fresh login');
            } else {
                result.reason = 'Session invalid for unknown reason';
                result.recommendations.push('Clear cookies and perform fresh login');
            }
        } else {
            result.reason = 'Session is valid';
            
            // Check if session is about to expire
            if (result.sessionInfo.expiresIn < 24) { // Less than 24 hours
                result.recommendations.push(`Session expires in ${result.sessionInfo.expiresIn} hours - consider refreshing`);
            }
        }
        
        return result;
        
    } catch (error) {
        result.reason = `Validation error: ${error.message}`;
        result.recommendations.push('Check network connection');
        result.recommendations.push('Verify server is running');
        return result;
    }
}

module.exports = {
    isSessionValid,
    checkAuthStatus,
    refreshSession,
    getSessionInfo,
    validateSession
};
