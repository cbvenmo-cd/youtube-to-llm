/**
 * Clear Cache Test - Force clear browser cache and test video analysis
 */

// Load environment variables from .env.puppeteer
require('../puppeteer-helpers/load-env');

const puppeteer = require('puppeteer');

async function testWithCacheClear() {
    let browser = null;
    let page = null;
    
    try {
        console.log('=== Testing Video Analysis with Cache Clear ===\n');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 100,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials',
                '--disable-web-security',
                '--disable-features=BlockInsecurePrivateNetworkRequests',
                '--disable-features=ImprovedCookieControls',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });
        
        page = await browser.newPage();
        
        // Clear all browser data
        const client = await page.target().createCDPSession();
        await client.send('Network.clearBrowserCookies');
        await client.send('Network.clearBrowserCache');
        
        console.log('✓ Browser cache and cookies cleared');
        
        // Set cache disabled for this session
        await page.setCacheEnabled(false);
        console.log('✓ Cache disabled for session');
        
        // Navigate to home page
        await page.goto('http://localhost:8080/', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        console.log('✓ Navigated to home page');
        
        // Check if we're on the home page or redirected to login
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);
        
        if (currentUrl.includes('/login')) {
            console.log('❌ Redirected to login page - checking mode...');
            
            // Check mode via API
            const modeResponse = await page.evaluate(async () => {
                const response = await fetch('/api/auth/mode');
                return await response.json();
            });
            
            console.log('Mode response:', modeResponse);
            
            if (modeResponse.mode === 'development') {
                console.log('❌ ERROR: In development mode but still redirected to login!');
                console.log('This suggests the frontend JavaScript is not properly checking mode.');
            }
        } else {
            console.log('✓ On home page, testing video analysis...');
            
            // Wait for form to be ready
            await page.waitForSelector('#videoUrl', { timeout: 5000 });
            
            // Fill in video URL
            const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            await page.type('#videoUrl', testUrl);
            console.log('✓ URL entered');
            
            // Click analyze
            await page.click('#analyzeButton');
            console.log('✓ Analyze button clicked');
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check where we are now
            const afterClickUrl = page.url();
            console.log('URL after click:', afterClickUrl);
            
            // Check for any errors
            const errorVisible = await page.evaluate(() => {
                const errorEl = document.querySelector('.error-message:not(.hidden)');
                return errorEl ? errorEl.textContent.trim() : null;
            });
            
            if (errorVisible) {
                console.log('Error message:', errorVisible);
            }
            
            if (afterClickUrl.includes('/login')) {
                console.log('❌ ERROR: Redirected to login after analyze!');
                
                // Let's check what the auth check function returns
                const authCheckResult = await page.evaluate(() => {
                    // Get the authToken value
                    const token = localStorage.getItem('yva_auth_token') || '';
                    return {
                        token: token,
                        tokenLength: token.length,
                        tokenType: typeof token,
                        isEmptyString: token === '',
                        isFalsy: !token,
                        checkWouldFail: !token || token === ''
                    };
                });
                
                console.log('Auth token check:', authCheckResult);
            } else if (afterClickUrl.includes('/video')) {
                console.log('✓ SUCCESS: Navigated to video page!');
            }
        }
        
        // Take screenshot
        await page.screenshot({
            path: 'puppeteer-screenshots/cache-clear-test.png',
            fullPage: true
        });
        console.log('✓ Screenshot saved');
        
    } catch (error) {
        console.error('Test failed:', error);
        if (page) {
            await page.screenshot({
                path: 'puppeteer-screenshots/cache-clear-error.png',
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
    testWithCacheClear().catch(console.error);
}

module.exports = testWithCacheClear;
