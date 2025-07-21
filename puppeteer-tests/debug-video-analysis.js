/**
 * Debug Video Analysis - Detailed debugging of the video analysis flow
 */

// Load environment variables from .env.puppeteer
require('../puppeteer-helpers/load-env');

const puppeteer = require('puppeteer');

async function debugVideoAnalysis() {
    let browser = null;
    let page = null;
    
    try {
        console.log('=== Debugging Video Analysis Flow ===\n');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 100,
            devtools: true // Open DevTools
        });
        
        page = await browser.newPage();
        
        // Listen for console messages
        page.on('console', msg => {
            console.log(`Browser console [${msg.type()}]:`, msg.text());
        });
        
        // Listen for page errors
        page.on('pageerror', error => {
            console.error('Page error:', error.message);
        });
        
        // Listen for request failures
        page.on('requestfailed', request => {
            console.error('Request failed:', request.url(), request.failure().errorText);
        });
        
        // Monitor network requests
        const requests = [];
        page.on('request', request => {
            if (request.url().includes('/api/')) {
                console.log(`→ API Request: ${request.method()} ${request.url()}`);
                requests.push({
                    url: request.url(),
                    method: request.method(),
                    headers: request.headers()
                });
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('/api/')) {
                console.log(`← API Response: ${response.status()} ${response.url()}`);
            }
        });
        
        // Navigate to home page
        await page.goto('http://localhost:8080/', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        console.log('\n✓ Page loaded\n');
        
        // Check if app.js is loaded and check auth function
        const authCheckInfo = await page.evaluate(() => {
            // Check if checkAuth function exists
            const hasCheckAuth = typeof checkAuth === 'function';
            
            // Get auth token info
            const token = localStorage.getItem('yva_auth_token');
            
            // Try to get the actual auth check logic
            let checkAuthSource = '';
            if (hasCheckAuth) {
                checkAuthSource = checkAuth.toString();
            }
            
            return {
                hasCheckAuth,
                authToken: token,
                authTokenType: typeof token,
                authTokenValue: token === null ? 'null' : token === '' ? 'empty string' : `"${token}"`,
                checkAuthSource: checkAuthSource.substring(0, 500) // First 500 chars
            };
        });
        
        console.log('Auth check info:', JSON.stringify(authCheckInfo, null, 2));
        
        // Wait for form to be ready
        await page.waitForSelector('#videoUrl', { timeout: 5000 });
        
        // Fill in video URL
        const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        await page.type('#videoUrl', testUrl);
        console.log('\n✓ URL entered');
        
        // Set up promise to catch navigation
        const navigationPromise = page.waitForNavigation({ 
            waitUntil: 'networkidle0',
            timeout: 10000 
        }).catch(() => null);
        
        // Click analyze button
        await page.click('#analyzeButton');
        console.log('✓ Analyze button clicked\n');
        
        // Wait for either navigation or API response
        await Promise.race([
            navigationPromise,
            new Promise(resolve => setTimeout(resolve, 5000))
        ]);
        
        // Check current state
        const currentUrl = page.url();
        console.log('\nCurrent URL:', currentUrl);
        
        // Check for errors on page
        const pageState = await page.evaluate(() => {
            const errorEl = document.querySelector('.error-message:not(.hidden)');
            const loadingEl = document.querySelector('#loadingIndicator');
            const successEl = document.querySelector('#successMessage');
            
            return {
                hasError: errorEl && !errorEl.classList.contains('hidden'),
                errorText: errorEl ? errorEl.textContent.trim() : null,
                isLoading: loadingEl && !loadingEl.classList.contains('hidden'),
                hasSuccess: successEl && !successEl.classList.contains('hidden'),
                formAction: document.querySelector('#analyzeForm')?.action,
                analyzeButtonDisabled: document.querySelector('#analyzeButton')?.disabled
            };
        });
        
        console.log('\nPage state:', JSON.stringify(pageState, null, 2));
        
        // Check if any API requests were made
        console.log('\nAPI Requests made:', requests.length);
        requests.forEach(req => {
            console.log(`- ${req.method} ${req.url}`);
            if (req.headers.authorization) {
                console.log(`  Authorization: ${req.headers.authorization}`);
            }
            if (req.headers['x-api-key']) {
                console.log(`  X-API-Key: ${req.headers['x-api-key'].substring(0, 8)}...`);
            }
        });
        
        // Take screenshot
        await page.screenshot({
            path: 'puppeteer-screenshots/debug-video-analysis.png',
            fullPage: true
        });
        console.log('\n✓ Screenshot saved');
        
        // Keep browser open for 10 seconds for manual inspection
        console.log('\nKeeping browser open for 10 seconds for inspection...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('Test failed:', error);
        if (page) {
            await page.screenshot({
                path: 'puppeteer-screenshots/debug-error.png',
                fullPage: true
            }).catch(() => null);
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
if (require.main === module) {
    debugVideoAnalysis().catch(console.error);
}

module.exports = debugVideoAnalysis;
