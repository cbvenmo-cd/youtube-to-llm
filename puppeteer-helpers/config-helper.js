/**
 * Configuration Helper - Manages Puppeteer configuration for YVA
 */

const path = require('path');
const fs = require('fs').promises;

/**
 * Get default configuration
 * @returns {Object} Default configuration object
 */
function getDefaultConfig() {
    return {
        // Base URL configuration
        baseUrl: process.env.PUPPETEER_BASE_URL || 'http://localhost:8080',
        
        // Authentication
        apiKey: process.env.PUPPETEER_API_KEY || '',
        
        // File paths
        cookieFile: path.join(__dirname, '..', 'puppeteer-data', 'cookies.json'),
        screenshotDir: path.join(__dirname, '..', 'puppeteer-screenshots'),
        
        // Timeouts
        defaultTimeout: parseInt(process.env.PUPPETEER_TIMEOUT) || 30000,
        navigationTimeout: parseInt(process.env.PUPPETEER_NAVIGATION_TIMEOUT) || 30000,
        
        // Browser options
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        slowMo: parseInt(process.env.PUPPETEER_SLOW_MO) || 0,
        
        // Viewport
        viewport: {
            width: 1280,
            height: 800
        },
        
        // Mode preferences
        preferredMode: process.env.PUPPETEER_PREFERRED_MODE || 'auto', // auto, dev, prod
        
        // Retry configuration
        maxRetries: 3,
        retryDelay: 1000
    };
}

/**
 * Load configuration from file if exists
 * @param {string} configFile - Path to config file
 * @returns {Promise<Object>} Configuration object
 */
async function loadConfig(configFile = null) {
    const defaultConfig = getDefaultConfig();
    
    if (!configFile) {
        return defaultConfig;
    }
    
    try {
        const configString = await fs.readFile(configFile, 'utf8');
        const fileConfig = JSON.parse(configString);
        
        // Merge with defaults
        return { ...defaultConfig, ...fileConfig };
    } catch (error) {
        console.log('Using default configuration');
        return defaultConfig;
    }
}

/**
 * Save configuration to file
 * @param {Object} config - Configuration object
 * @param {string} configFile - Path to save config
 * @returns {Promise<boolean>} True if saved successfully
 */
async function saveConfig(config, configFile) {
    try {
        const dir = path.dirname(configFile);
        await fs.mkdir(dir, { recursive: true });
        
        await fs.writeFile(configFile, JSON.stringify(config, null, 2));
        console.log('Configuration saved to:', configFile);
        return true;
    } catch (error) {
        console.error('Error saving configuration:', error);
        return false;
    }
}

/**
 * Validate configuration
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateConfig(config) {
    const errors = [];
    
    // Check required fields
    if (!config.baseUrl) {
        errors.push('baseUrl is required');
    }
    
    // Validate URL format
    try {
        new URL(config.baseUrl);
    } catch (error) {
        errors.push('Invalid baseUrl format');
    }
    
    // Check timeout values
    if (config.defaultTimeout < 0 || config.navigationTimeout < 0) {
        errors.push('Timeout values must be positive');
    }
    
    // Check viewport
    if (!config.viewport || config.viewport.width <= 0 || config.viewport.height <= 0) {
        errors.push('Invalid viewport configuration');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Get browser launch options based on config
 * @param {Object} config - Configuration object
 * @returns {Object} Puppeteer launch options
 */
function getBrowserLaunchOptions(config) {
    const options = {
        headless: config.headless,
        slowMo: config.slowMo,
        defaultViewport: config.viewport,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--window-size=1280,800'
        ]
    };
    
    // Add additional args for headless mode
    if (config.headless) {
        options.args.push('--single-process');
    }
    
    return options;
}

/**
 * Get page default options based on config
 * @param {Object} config - Configuration object
 * @returns {Object} Page default options
 */
function getPageDefaults(config) {
    return {
        timeout: config.defaultTimeout,
        waitUntil: 'networkidle0'
    };
}

/**
 * Create screenshot path with timestamp
 * @param {Object} config - Configuration object
 * @param {string} name - Screenshot name
 * @returns {string} Full path for screenshot
 */
function getScreenshotPath(config, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    return path.join(config.screenshotDir, filename);
}

/**
 * Ensure required directories exist
 * @param {Object} config - Configuration object
 * @returns {Promise<void>}
 */
async function ensureDirectories(config) {
    const dirs = [
        path.dirname(config.cookieFile),
        config.screenshotDir
    ];
    
    for (const dir of dirs) {
        await fs.mkdir(dir, { recursive: true });
    }
}

module.exports = {
    getDefaultConfig,
    loadConfig,
    saveConfig,
    validateConfig,
    getBrowserLaunchOptions,
    getPageDefaults,
    getScreenshotPath,
    ensureDirectories
};
