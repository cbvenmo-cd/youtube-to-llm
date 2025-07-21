/**
 * Auth Mode Detector - Detects the current authentication mode of YVA
 * Helps Puppeteer scripts determine whether to use dev or production flow
 */

/**
 * Detect the authentication mode by calling the /api/auth/mode endpoint
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL of the application (default: http://localhost:8080)
 * @returns {Promise<Object>} Mode information object
 */
async function detectAuthMode(page, baseUrl = 'http://localhost:8080') {
    try {
        // Navigate to the API endpoint
        const response = await page.goto(`${baseUrl}/api/auth/mode`, {
            waitUntil: 'networkidle0',
            timeout: 10000
        });

        if (!response || !response.ok()) {
            throw new Error(`Failed to fetch auth mode: ${response ? response.status() : 'No response'}`);
        }

        // Get the JSON response
        const modeInfo = await response.json();
        
        console.log('Auth mode detected:', modeInfo);
        return modeInfo;
    } catch (error) {
        console.error('Error detecting auth mode:', error);
        // Return default production mode on error
        return {
            mode: 'production',
            environment: 'unknown',
            error: error.message
        };
    }
}

/**
 * Check if the application is in development mode
 * @param {Object} modeInfo - Mode information from detectAuthMode
 * @returns {boolean} True if in development mode
 */
function isDevMode(modeInfo) {
    return modeInfo && modeInfo.mode === 'development';
}

/**
 * Check if the application is in production mode
 * @param {Object} modeInfo - Mode information from detectAuthMode
 * @returns {boolean} True if in production mode
 */
function isProdMode(modeInfo) {
    return !modeInfo || modeInfo.mode === 'production' || modeInfo.mode === undefined;
}

/**
 * Check if mode switching is available (localhost only)
 * @param {Object} modeInfo - Mode information from detectAuthMode
 * @returns {boolean} True if mode switching is available
 */
function canSwitchModes(modeInfo) {
    return modeInfo && modeInfo.environment === 'local';
}

/**
 * Get a human-readable description of the current mode
 * @param {Object} modeInfo - Mode information from detectAuthMode
 * @returns {string} Description of the current mode
 */
function getModeDescription(modeInfo) {
    if (!modeInfo) {
        return 'Unknown mode (defaulting to production)';
    }
    
    const mode = modeInfo.mode || 'production';
    const env = modeInfo.environment || 'unknown';
    
    if (isDevMode(modeInfo)) {
        return `Development mode on ${env} - Authentication disabled`;
    } else {
        return `Production mode on ${env} - Authentication required`;
    }
}

module.exports = {
    detectAuthMode,
    isDevMode,
    isProdMode,
    canSwitchModes,
    getModeDescription
};
