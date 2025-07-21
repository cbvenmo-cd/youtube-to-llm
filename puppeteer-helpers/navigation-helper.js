/**
 * Navigation Helper - Common navigation functions for YVA
 */

/**
 * Navigate to home page
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<void>}
 */
async function goToHomePage(page, baseUrl = 'http://localhost:8080') {
    await page.goto(baseUrl, {
        waitUntil: 'networkidle0'
    });
    
    // Wait for main content
    await page.waitForSelector('.container', { visible: true });
}

/**
 * Navigate to a specific video analysis page
 * @param {Page} page - Puppeteer page object
 * @param {string} videoId - Video ID or URL
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<void>}
 */
async function goToVideoPage(page, videoId, baseUrl = 'http://localhost:8080') {
    // If it's a full URL, extract the video ID
    if (videoId.includes('youtube.com') || videoId.includes('youtu.be')) {
        const match = videoId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        if (match) {
            videoId = match[1];
        }
    }
    
    await page.goto(`${baseUrl}/video.html?id=${videoId}`, {
        waitUntil: 'networkidle0'
    });
    
    // Wait for video content
    await page.waitForSelector('.video-detail-container', { visible: true });
}

/**
 * Navigate to settings page
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<void>}
 */
async function goToSettingsPage(page, baseUrl = 'http://localhost:8080') {
    await page.goto(`${baseUrl}/settings.html`, {
        waitUntil: 'networkidle0'
    });
    
    // Wait for settings content
    await page.waitForSelector('.settings-container', { visible: true });
}

/**
 * Wait for page to fully load
 * @param {Page} page - Puppeteer page object
 * @param {Object} options - Wait options
 * @returns {Promise<void>}
 */
async function waitForPageLoad(page, options = {}) {
    const {
        timeout = 30000,
        waitForSelector = null
    } = options;
    
    // Wait for network to be idle (Puppeteer uses different method)
    await page.waitForNavigation({ 
        waitUntil: 'networkidle0',
        timeout 
    }).catch(() => {
        // If no navigation happens, that's ok
    });
    
    // Wait for specific selector if provided
    if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { 
            visible: true,
            timeout 
        });
    }
    
    // Additional wait for any animations
    await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Navigate back in browser history
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function goBack(page) {
    await page.goBack({
        waitUntil: 'networkidle0'
    });
}

/**
 * Navigate forward in browser history
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function goForward(page) {
    await page.goForward({
        waitUntil: 'networkidle0'
    });
}

/**
 * Refresh the current page
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function refreshPage(page) {
    await page.reload({
        waitUntil: 'networkidle0'
    });
}

/**
 * Click on a link and wait for navigation
 * @param {Page} page - Puppeteer page object
 * @param {string} selector - CSS selector for the link
 * @returns {Promise<void>}
 */
async function clickAndNavigate(page, selector) {
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        page.click(selector)
    ]);
}

/**
 * Check if currently on a specific page
 * @param {Page} page - Puppeteer page object
 * @param {string} pageName - Name of the page (home, login, video, settings)
 * @returns {boolean} True if on the specified page
 */
function isOnPage(page, pageName) {
    const url = page.url();
    
    switch (pageName.toLowerCase()) {
        case 'home':
            return url.endsWith('/') || url.includes('/index.html');
        case 'login':
            return url.includes('/login.html');
        case 'video':
            return url.includes('/video.html');
        case 'settings':
            return url.includes('/settings.html');
        default:
            return false;
    }
}

/**
 * Wait for navigation to complete
 * @param {Page} page - Puppeteer page object
 * @param {Function} navigationTrigger - Function that triggers navigation
 * @returns {Promise<void>}
 */
async function waitForNavigation(page, navigationTrigger) {
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        navigationTrigger()
    ]);
}

module.exports = {
    goToHomePage,
    goToVideoPage,
    goToSettingsPage,
    waitForPageLoad,
    goBack,
    goForward,
    refreshPage,
    clickAndNavigate,
    isOnPage,
    waitForNavigation
};
