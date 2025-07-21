/**
 * YVA Puppeteer Wrapper - Main entry point for Puppeteer automation
 * Provides a unified interface for automating YVA in both dev and production modes
 */

const puppeteer = require('puppeteer');
const { detectAuthMode, isDevMode } = require('./auth-mode-detector');
const { authenticateSession } = require('./auth-helper');
const { loadConfig, getBrowserLaunchOptions, ensureDirectories } = require('./config-helper');

class YVAPuppeteer {
    constructor(config = {}) {
        this.config = null;
        this.browser = null;
        this.page = null;
        this.modeInfo = null;
        this.customConfig = config;
    }

    /**
     * Initialize the browser and authenticate
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // Load configuration
            this.config = await loadConfig();
            this.config = { ...this.config, ...this.customConfig };
            
            // Ensure directories exist
            await ensureDirectories(this.config);
            
            // Launch browser
            console.log('Launching browser...');
            this.browser = await puppeteer.launch(getBrowserLaunchOptions(this.config));
            
            // Create page
            this.page = await this.browser.newPage();
            await this.page.setDefaultTimeout(this.config.defaultTimeout);
            await this.page.setDefaultNavigationTimeout(this.config.navigationTimeout);
            
            // Detect mode
            this.modeInfo = await detectAuthMode(this.page, this.config.baseUrl);
            console.log('Mode:', this.modeInfo);
            
            // Authenticate if needed
            const authSuccess = await authenticateSession(this.page, {
                ...this.config,
                modeInfo: this.modeInfo
            });
            
            if (!authSuccess) {
                throw new Error('Authentication failed');
            }
            
            console.log('YVA Puppeteer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize YVA Puppeteer:', error);
            await this.cleanup();
            throw error;
        }
    }

    /**
     * Navigate to home page
     * @returns {Promise<void>}
     */
    async goToHome() {
        await this.page.goto(this.config.baseUrl, {
            waitUntil: 'networkidle0'
        });
    }

    /**
     * Analyze a YouTube video
     * @param {string} youtubeUrl - YouTube video URL
     * @returns {Promise<Object>} Analysis result
     */
    async analyzeVideo(youtubeUrl) {
        try {
            // Navigate to home page
            await this.goToHome();
            
            // Wait for the form
            await this.page.waitForSelector('#analyzeForm', { visible: true });
            
            // Clear and type URL
            const urlInput = await this.page.$('#videoUrl');
            await urlInput.click({ clickCount: 3 }); // Select all
            await urlInput.type(youtubeUrl);
            
            // Click analyze button
            await this.page.click('#analyzeButton');
            
            // Wait a bit for any errors or navigation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if we're still on the same page (error occurred)
            const currentUrl = this.page.url();
            if (currentUrl.includes('index.html') || currentUrl === this.config.baseUrl || currentUrl === this.config.baseUrl + '/') {
                // Check for error message
                const errorMessage = await this.page.evaluate(() => {
                    const errorElements = document.querySelectorAll('.error-message, #errorMessage, .alert-danger');
                    for (const elem of errorElements) {
                        if (elem.textContent.trim()) {
                            return elem.textContent.trim();
                        }
                    }
                    return null;
                });
                
                if (errorMessage) {
                    throw new Error(`Analysis failed: ${errorMessage}`);
                } else {
                    throw new Error('Analysis failed: No redirect occurred');
                }
            }
            
            // We navigated to video page, wait for content
            await this.page.waitForSelector('#mainContent', { 
                timeout: 60000
            });
            
            // Wait for loading to finish
            await this.page.waitForFunction(
                () => {
                    const mainContent = document.querySelector('#mainContent');
                    const loadingState = document.querySelector('#loadingState');
                    return mainContent && !mainContent.classList.contains('hidden');
                },
                { timeout: 60000 }
            );
            
            // Extract video info
            const videoInfo = await this.page.evaluate(() => {
                const getTextContent = (selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.textContent.trim() : null;
                };
                
                return {
                    title: getTextContent('#videoTitle'),
                    channel: getTextContent('#channelName'),
                    duration: getTextContent('#duration'),
                    publishDate: getTextContent('#publishDate'),
                    views: getTextContent('#viewCount'),
                    likes: getTextContent('#likeCount'),
                    url: window.location.href
                };
            });
            
            console.log('Video analyzed:', videoInfo.title);
            return videoInfo;
        } catch (error) {
            console.error('Error analyzing video:', error);
            throw error;
        }
    }

    /**
     * Get list of previous analyses
     * @returns {Promise<Array>} List of analyses
     */
    async getPreviousAnalyses() {
        try {
            await this.goToHome();
            
            // Wait for analyses list
            await this.page.waitForSelector('.previous-analyses', { visible: true });
            
            const analyses = await this.page.evaluate(() => {
                const items = document.querySelectorAll('.analysis-item');
                return Array.from(items).map(item => ({
                    title: item.querySelector('h4')?.textContent.trim(),
                    channel: item.querySelector('p')?.textContent.trim(),
                    date: item.querySelector('small')?.textContent.trim()
                }));
            });
            
            return analyses;
        } catch (error) {
            console.error('Error getting previous analyses:', error);
            return [];
        }
    }

    /**
     * Take a screenshot
     * @param {string} name - Screenshot name
     * @returns {Promise<string>} Screenshot path
     */
    async screenshot(name = 'screenshot') {
        const path = require('./config-helper').getScreenshotPath(this.config, name);
        await this.page.screenshot({ path, fullPage: true });
        console.log('Screenshot saved:', path);
        return path;
    }

    /**
     * Execute custom function on page
     * @param {Function} fn - Function to execute in page context
     * @param {...any} args - Arguments to pass to function
     * @returns {Promise<any>} Function result
     */
    async evaluate(fn, ...args) {
        return await this.page.evaluate(fn, ...args);
    }

    /**
     * Wait for a specific condition
     * @param {Function} condition - Condition function
     * @param {Object} options - Wait options
     * @returns {Promise<void>}
     */
    async waitFor(condition, options = {}) {
        await this.page.waitForFunction(condition, options);
    }

    /**
     * Get current mode info
     * @returns {Object} Mode information
     */
    getModeInfo() {
        return this.modeInfo;
    }

    /**
     * Check if in development mode
     * @returns {boolean} True if in dev mode
     */
    isDevMode() {
        return isDevMode(this.modeInfo);
    }

    /**
     * Get the Puppeteer page object for advanced usage
     * @returns {Page} Puppeteer page object
     */
    getPage() {
        return this.page;
    }

    /**
     * Get the Puppeteer browser object for advanced usage
     * @returns {Browser} Puppeteer browser object
     */
    getBrowser() {
        return this.browser;
    }

    /**
     * Clean up resources
     * @returns {Promise<void>}
     */
    async cleanup() {
        if (this.page) {
            await this.page.close().catch(console.error);
        }
        if (this.browser) {
            await this.browser.close().catch(console.error);
        }
        console.log('Cleanup completed');
    }

    /**
     * Create a new instance and initialize it
     * @param {Object} config - Configuration overrides
     * @returns {Promise<YVAPuppeteer>} Initialized instance
     */
    static async create(config = {}) {
        const instance = new YVAPuppeteer(config);
        await instance.init();
        return instance;
    }
}

// Export the class and helper functions
module.exports = {
    YVAPuppeteer,
    // Re-export useful functions from helpers
    detectAuthMode: require('./auth-mode-detector').detectAuthMode,
    isDevMode: require('./auth-mode-detector').isDevMode,
    isProdMode: require('./auth-mode-detector').isProdMode
};
