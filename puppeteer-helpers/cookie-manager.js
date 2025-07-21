/**
 * Cookie Manager - Handles cookie storage and retrieval for session persistence
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Save cookies to file
 * @param {Page} page - Puppeteer page object
 * @param {string} filename - Cookie file name (default: cookies.json)
 * @returns {Promise<boolean>} True if saved successfully
 */
async function saveCookiesToFile(page, filename = 'cookies.json') {
    try {
        const cookies = await page.cookies();
        
        if (!cookies || cookies.length === 0) {
            console.log('No cookies to save');
            return false;
        }
        
        const filepath = getCookieFilePath(filename);
        const dir = path.dirname(filepath);
        
        // Ensure directory exists
        await fs.mkdir(dir, { recursive: true });
        
        // Save cookies with metadata
        const cookieData = {
            cookies,
            savedAt: new Date().toISOString(),
            url: page.url(),
            count: cookies.length
        };
        
        await fs.writeFile(filepath, JSON.stringify(cookieData, null, 2));
        console.log(`Saved ${cookies.length} cookies to ${filepath}`);
        
        return true;
    } catch (error) {
        console.error('Error saving cookies:', error);
        return false;
    }
}

/**
 * Load cookies from file
 * @param {Page} page - Puppeteer page object
 * @param {string} filename - Cookie file name (default: cookies.json)
 * @returns {Promise<boolean>} True if loaded successfully
 */
async function loadCookiesFromFile(page, filename = 'cookies.json') {
    try {
        const filepath = getCookieFilePath(filename);
        
        // Check if file exists
        await fs.access(filepath);
        
        // Read cookie data
        const content = await fs.readFile(filepath, 'utf8');
        const cookieData = JSON.parse(content);
        
        // Extract cookies array (handle both old and new format)
        const cookies = cookieData.cookies || cookieData;
        
        if (!Array.isArray(cookies) || cookies.length === 0) {
            console.log('No valid cookies found in file');
            return false;
        }
        
        // Check if cookies are still valid
        if (!areCookiesValid(cookies)) {
            console.log('Cookies have expired');
            return false;
        }
        
        // Set cookies
        await page.setCookie(...cookies);
        console.log(`Loaded ${cookies.length} cookies from ${filepath}`);
        
        // Log metadata if available
        if (cookieData.savedAt) {
            const savedDate = new Date(cookieData.savedAt);
            const ageHours = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);
            console.log(`Cookies age: ${ageHours.toFixed(1)} hours`);
        }
        
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No cookie file found');
        } else {
            console.error('Error loading cookies:', error);
        }
        return false;
    }
}

/**
 * Check if cookies are still valid
 * @param {Array} cookies - Array of cookie objects
 * @returns {boolean} True if cookies are valid
 */
function areCookiesValid(cookies) {
    if (!cookies || cookies.length === 0) {
        return false;
    }
    
    const now = Date.now() / 1000; // Current time in seconds
    
    // Check each cookie's expiration
    for (const cookie of cookies) {
        if (cookie.expires && cookie.expires > 0) {
            if (cookie.expires < now) {
                console.log(`Cookie '${cookie.name}' has expired`);
                return false;
            }
        }
    }
    
    // Check for essential auth cookies
    const hasAuthToken = cookies.some(c => c.name === 'auth-token' || c.name === 'yva-auth');
    if (!hasAuthToken) {
        console.log('No auth token found in cookies');
        return false;
    }
    
    return true;
}

/**
 * Get the full path for cookie file
 * @param {string} filename - Cookie file name or environment
 * @returns {string} Full path to cookie file
 */
function getCookieFilePath(filename) {
    // Handle environment-specific files
    if (filename === 'production' || filename === 'prod') {
        filename = 'cookies-production.json';
    } else if (filename === 'development' || filename === 'dev') {
        filename = 'cookies-development.json';
    } else if (!filename.endsWith('.json')) {
        filename = `cookies-${filename}.json`;
    }
    
    return path.join(__dirname, '..', 'puppeteer-data', filename);
}

/**
 * Clear stored cookies
 * @param {string} filename - Cookie file name or environment
 * @returns {Promise<boolean>} True if cleared successfully
 */
async function clearStoredCookies(filename = 'cookies.json') {
    try {
        const filepath = getCookieFilePath(filename);
        await fs.unlink(filepath);
        console.log('Cookies cleared:', filepath);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('No cookie file to clear');
            return true;
        }
        console.error('Error clearing cookies:', error);
        return false;
    }
}

/**
 * List all stored cookie files
 * @returns {Promise<Array>} List of cookie files with metadata
 */
async function listStoredCookies() {
    try {
        const dir = path.join(__dirname, '..', 'puppeteer-data');
        const files = await fs.readdir(dir);
        
        const cookieFiles = [];
        
        for (const file of files) {
            if (file.startsWith('cookies') && file.endsWith('.json')) {
                const filepath = path.join(dir, file);
                const stats = await fs.stat(filepath);
                
                try {
                    const content = await fs.readFile(filepath, 'utf8');
                    const data = JSON.parse(content);
                    
                    cookieFiles.push({
                        file,
                        path: filepath,
                        size: stats.size,
                        modified: stats.mtime,
                        cookieCount: data.cookies ? data.cookies.length : (Array.isArray(data) ? data.length : 0),
                        savedAt: data.savedAt || null
                    });
                } catch (error) {
                    cookieFiles.push({
                        file,
                        path: filepath,
                        size: stats.size,
                        modified: stats.mtime,
                        error: 'Invalid JSON'
                    });
                }
            }
        }
        
        return cookieFiles;
    } catch (error) {
        console.error('Error listing cookie files:', error);
        return [];
    }
}

/**
 * Get cookie info without loading them
 * @param {string} filename - Cookie file name
 * @returns {Promise<Object|null>} Cookie metadata or null
 */
async function getCookieInfo(filename = 'cookies.json') {
    try {
        const filepath = getCookieFilePath(filename);
        const content = await fs.readFile(filepath, 'utf8');
        const data = JSON.parse(content);
        
        const cookies = data.cookies || data;
        const info = {
            count: Array.isArray(cookies) ? cookies.length : 0,
            savedAt: data.savedAt || null,
            url: data.url || null,
            valid: areCookiesValid(cookies)
        };
        
        if (data.savedAt) {
            const savedDate = new Date(data.savedAt);
            info.ageHours = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60);
        }
        
        return info;
    } catch (error) {
        return null;
    }
}

module.exports = {
    saveCookiesToFile,
    loadCookiesFromFile,
    areCookiesValid,
    getCookieFilePath,
    clearStoredCookies,
    listStoredCookies,
    getCookieInfo
};
