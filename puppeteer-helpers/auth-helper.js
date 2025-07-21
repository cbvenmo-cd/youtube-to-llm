/**
 * Authentication Helper - Handles authentication for both dev and production modes
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Main authentication function that handles both dev and prod modes
 * @param {Page} page - Puppeteer page object
 * @param {Object} config - Configuration object
 * @returns {Promise<boolean>} True if authentication successful
 */
async function authenticateSession(page, config = {}) {
    const {
        baseUrl = 'http://localhost:8080',
        apiKey = process.env.PUPPETEER_API_KEY,
        cookieFile = path.join(__dirname, '..', 'puppeteer-data', 'cookies.json'),
        modeInfo = null
    } = config;

    // If mode info provided, use it, otherwise detect
    const mode = modeInfo || await require('./auth-mode-detector').detectAuthMode(page, baseUrl);
    
    if (require('./auth-mode-detector').isDevMode(mode)) {
        console.log('Development mode detected - skipping authentication');
        return await skipAuthentication(page);
    } else {
        console.log('Production mode detected - handling authentication');
        
        // Try to load existing cookies first
        const cookiesLoaded = await loadCookies(page, cookieFile);
        if (cookiesLoaded && await isSessionValid(page, baseUrl)) {
            console.log('Existing session is valid');
            return true;
        }
        
        // Perform login if no valid session
        if (!apiKey) {
            throw new Error('API key required for production mode. Set PUPPETEER_API_KEY environment variable.');
        }
        
        const loginSuccess = await performLogin(page, apiKey, baseUrl);
        if (loginSuccess) {
            await saveCookies(page, cookieFile);
        }
        return loginSuccess;
    }
}

/**
 * Skip authentication in development mode
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<boolean>} Always returns true in dev mode
 */
async function skipAuthentication(page) {
    console.log('Authentication skipped - development mode active');
    return true;
}

/**
 * Perform login in production mode
 * @param {Page} page - Puppeteer page object
 * @param {string} apiKey - API key for authentication
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<boolean>} True if login successful
 */
async function performLogin(page, apiKey, baseUrl = 'http://localhost:8080') {
    try {
        console.log('Performing login...');
        
        // Navigate to login page
        await page.goto(`${baseUrl}/login.html`, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Wait for login form
        await page.waitForSelector('#loginForm', { visible: true });

        // Fill in API key
        await page.type('#apiKey', apiKey);

        // Check "Remember me" checkbox (should be checked by default)
        const rememberMeChecked = await page.$eval('#rememberMe', el => el.checked);
        if (!rememberMeChecked) {
            await page.click('#rememberMe');
        }

        // Submit form
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.click('#loginButton')
        ]);

        // Check if we're on the home page (successful login)
        const currentUrl = page.url();
        if (currentUrl.includes('/index.html') || currentUrl === `${baseUrl}/`) {
            console.log('Login successful');
            return true;
        } else {
            console.error('Login failed - unexpected redirect to:', currentUrl);
            return false;
        }
    } catch (error) {
        console.error('Error during login:', error);
        return false;
    }
}

/**
 * Save cookies to file for session persistence
 * @param {Page} page - Puppeteer page object
 * @param {string} filepath - Path to save cookies
 * @returns {Promise<boolean>} True if saved successfully
 */
async function saveCookies(page, filepath) {
    try {
        const cookies = await page.cookies();
        
        // Ensure directory exists
        const dir = path.dirname(filepath);
        await fs.mkdir(dir, { recursive: true });
        
        // Save cookies
        await fs.writeFile(filepath, JSON.stringify(cookies, null, 2));
        console.log('Cookies saved to:', filepath);
        return true;
    } catch (error) {
        console.error('Error saving cookies:', error);
        return false;
    }
}

/**
 * Load cookies from file
 * @param {Page} page - Puppeteer page object
 * @param {string} filepath - Path to load cookies from
 * @returns {Promise<boolean>} True if loaded successfully
 */
async function loadCookies(page, filepath) {
    try {
        // Check if file exists
        await fs.access(filepath);
        
        // Read and parse cookies
        const cookiesString = await fs.readFile(filepath, 'utf8');
        const cookies = JSON.parse(cookiesString);
        
        // Set cookies
        if (cookies && cookies.length > 0) {
            await page.setCookie(...cookies);
            console.log('Cookies loaded from:', filepath);
            return true;
        }
        return false;
    } catch (error) {
        console.log('No existing cookies found');
        return false;
    }
}

/**
 * Check if current session is valid
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<boolean>} True if session is valid
 */
async function isSessionValid(page, baseUrl = 'http://localhost:8080') {
    try {
        // Try to access the home page
        const response = await page.goto(baseUrl, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });

        // Check if we're redirected to login
        const currentUrl = page.url();
        const isValid = !currentUrl.includes('/login.html');
        
        console.log('Session valid:', isValid);
        return isValid;
    } catch (error) {
        console.error('Error checking session validity:', error);
        return false;
    }
}

/**
 * Clear stored cookies
 * @param {string} cookieFile - Path to cookie file
 * @returns {Promise<boolean>} True if cleared successfully
 */
async function clearStoredCookies(cookieFile) {
    try {
        await fs.unlink(cookieFile);
        console.log('Cookies cleared');
        return true;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error clearing cookies:', error);
        }
        return false;
    }
}

module.exports = {
    authenticateSession,
    skipAuthentication,
    performLogin,
    saveCookies,
    loadCookies,
    isSessionValid,
    clearStoredCookies
};
