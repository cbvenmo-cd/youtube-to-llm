/**
 * Login Automation - Handles automated login flow for production mode
 */

/**
 * Navigate to the login page
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<void>}
 */
async function navigateToLogin(page, baseUrl = 'http://localhost:8080') {
    console.log('Navigating to login page...');
    
    await page.goto(`${baseUrl}/login.html`, {
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    
    // Wait for login form to be visible
    await page.waitForSelector('#loginForm', { 
        visible: true,
        timeout: 10000 
    });
    
    console.log('Login page loaded');
}

/**
 * Fill the login form with API key
 * @param {Page} page - Puppeteer page object
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<void>}
 */
async function fillLoginForm(page, apiKey) {
    console.log('Filling login form...');
    
    // Wait for API key input
    await page.waitForSelector('#apiKey', { visible: true });
    
    // Clear any existing value
    await page.click('#apiKey', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    
    // Type API key
    await page.type('#apiKey', apiKey, { delay: 50 });
    
    // Check "Remember me" checkbox
    const rememberMeSelector = '#rememberMe';
    const isChecked = await page.$eval(rememberMeSelector, el => el.checked);
    
    if (!isChecked) {
        console.log('Checking "Remember me" checkbox...');
        await page.click(rememberMeSelector);
    }
    
    console.log('Login form filled');
}

/**
 * Submit the login form
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<void>}
 */
async function submitLogin(page) {
    console.log('Submitting login form...');
    
    // Click login button and wait for navigation
    await Promise.all([
        page.waitForNavigation({ 
            waitUntil: 'networkidle0',
            timeout: 30000 
        }),
        page.click('#loginButton')
    ]);
    
    console.log('Login form submitted');
}

/**
 * Wait for login to complete successfully
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL of the application
 * @returns {Promise<boolean>} True if login successful
 */
async function waitForLoginSuccess(page, baseUrl = 'http://localhost:8080') {
    try {
        // Check current URL
        const currentUrl = page.url();
        
        // Success if we're on home page
        if (currentUrl === `${baseUrl}/` || currentUrl.includes('/index.html')) {
            console.log('Login successful - redirected to home page');
            
            // Wait for main content to load
            await page.waitForSelector('.container', { 
                visible: true,
                timeout: 10000 
            });
            
            return true;
        }
        
        // Still on login page - check for error
        if (currentUrl.includes('/login.html')) {
            const errorVisible = await page.$eval('#loginMessage', el => {
                return el && el.style.display !== 'none' && el.textContent.trim().length > 0;
            }).catch(() => false);
            
            if (errorVisible) {
                const errorText = await page.$eval('#loginMessage', el => el.textContent.trim());
                console.error('Login failed with error:', errorText);
                return false;
            }
            
            console.error('Login failed - still on login page');
            return false;
        }
        
        // Unexpected page
        console.error('Login resulted in unexpected redirect to:', currentUrl);
        return false;
        
    } catch (error) {
        console.error('Error waiting for login success:', error);
        return false;
    }
}

/**
 * Handle login errors
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<Object>} Error details
 */
async function handleLoginError(page) {
    try {
        // Check for error message
        const errorSelector = '#loginMessage';
        const errorVisible = await page.$(errorSelector);
        
        if (errorVisible) {
            const errorText = await page.$eval(errorSelector, el => el.textContent.trim());
            
            return {
                hasError: true,
                message: errorText,
                screenshot: await page.screenshot({ 
                    path: 'puppeteer-screenshots/login-error.png',
                    fullPage: true 
                })
            };
        }
        
        // Check if still on login page
        const currentUrl = page.url();
        if (currentUrl.includes('/login.html')) {
            return {
                hasError: true,
                message: 'Login failed - no redirect occurred',
                currentUrl
            };
        }
        
        return {
            hasError: false,
            message: 'No error detected'
        };
        
    } catch (error) {
        return {
            hasError: true,
            message: `Error checking login status: ${error.message}`,
            error
        };
    }
}

/**
 * Complete login flow with retries
 * @param {Page} page - Puppeteer page object
 * @param {string} apiKey - API key for authentication
 * @param {Object} options - Login options
 * @returns {Promise<boolean>} True if login successful
 */
async function performLoginWithRetries(page, apiKey, options = {}) {
    const {
        baseUrl = 'http://localhost:8080',
        maxRetries = 3,
        retryDelay = 2000
    } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`Login attempt ${attempt} of ${maxRetries}...`);
        
        try {
            // Navigate to login
            await navigateToLogin(page, baseUrl);
            
            // Fill form
            await fillLoginForm(page, apiKey);
            
            // Submit
            await submitLogin(page);
            
            // Check success
            const success = await waitForLoginSuccess(page, baseUrl);
            
            if (success) {
                console.log(`Login successful on attempt ${attempt}`);
                return true;
            }
            
            // Handle error
            const errorInfo = await handleLoginError(page);
            console.error(`Login failed on attempt ${attempt}:`, errorInfo.message);
            
            // Wait before retry
            if (attempt < maxRetries) {
                console.log(`Waiting ${retryDelay}ms before retry...`);
                await page.waitForTimeout(retryDelay);
            }
            
        } catch (error) {
            console.error(`Login attempt ${attempt} failed with error:`, error.message);
            
            if (attempt < maxRetries) {
                await page.waitForTimeout(retryDelay);
            }
        }
    }
    
    console.error(`Login failed after ${maxRetries} attempts`);
    return false;
}

module.exports = {
    navigateToLogin,
    fillLoginForm,
    submitLogin,
    waitForLoginSuccess,
    handleLoginError,
    performLoginWithRetries
};
