/**
 * Debug Cookie Authentication - Check why cookies aren't working
 */

// Load environment variables from .env.puppeteer
require('../puppeteer-helpers/load-env');

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function debugCookieAuth() {
    let browser = null;
    let page = null;
    
    try {
        console.log('=== Debugging Cookie Authentication ===\n');
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 100
        });
        
        page = await browser.newPage();
        
        // Enable request interception to see what's being sent
        await page.setRequestInterception(true);
        page.on('request', request => {
            if (request.url().includes('/api/')) {
                console.log(`→ ${request.method()} ${request.url()}`);
                const cookies = request.headers().cookie;
                if (cookies) {
                    console.log(`  Cookies: ${cookies}`);
                }
            }
            request.continue();
        });
        
        page.on('response', response => {
            if (response.url().includes('/api/')) {
                console.log(`← ${response.status()} ${response.url()}`);
            }
        });
        
        // Load cookies if they exist
        const cookiePath = path.join(__dirname, '..', 'puppeteer-data', 'cookies.json');
        let savedCookies = [];
        try {
            const cookiesString = await fs.readFile(cookiePath, 'utf8');
            savedCookies = JSON.parse(cookiesString);
            console.log('\nSaved cookies:');
            savedCookies.forEach(cookie => {
                console.log(`- ${cookie.name}: ${cookie.value.substring(0, 20)}... (expires: ${new Date(cookie.expires * 1000).toISOString()})`);
            });
            
            await page.setCookie(...savedCookies);
            console.log('\n✓ Cookies set in browser\n');
        } catch (e) {
            console.log('No cookies found');
        }
        
        // Navigate to home page
        console.log('Navigating to home page...\n');
        await page.goto('http://localhost:8080/', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        console.log('\nNavigation complete');
        console.log('Current URL:', page.url());
        
        // Check what cookies are actually set in the browser
        const browserCookies = await page.cookies();
        console.log('\nCookies in browser after navigation:');
        browserCookies.forEach(cookie => {
            console.log(`- ${cookie.name}: ${cookie.value ? cookie.value.substring(0, 20) + '...' : 'empty'}`);
        });
        
        // Check localStorage
        const localStorageData = await page.evaluate(() => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data[key] = localStorage.getItem(key);
            }
            return data;
        });
        
        console.log('\nLocalStorage contents:');
        Object.entries(localStorageData).forEach(([key, value]) => {
            console.log(`- ${key}: ${value ? value.substring(0, 30) + '...' : 'empty'}`);
        });
        
        // Try to check auth status via API
        console.log('\nChecking auth status via API...');
        const authStatus = await page.evaluate(async () => {
            try {
                const response = await fetch('/api/auth/verify');
                return {
                    status: response.status,
                    ok: response.ok,
                    headers: {
                        'content-type': response.headers.get('content-type')
                    }
                };
            } catch (e) {
                return { error: e.message };
            }
        });
        
        console.log('Auth verify response:', authStatus);
        
        // Check what checkAuth function does
        const checkAuthResult = await page.evaluate(async () => {
            // Get current auth token from localStorage
            const token = localStorage.getItem('yva_auth_token');
            const apiKey = localStorage.getItem('yva_api_key');
            
            // Try to call the auth mode endpoint
            const modeResponse = await fetch('/api/auth/mode');
            const modeData = await modeResponse.json();
            
            return {
                authToken: token,
                apiKey: apiKey ? apiKey.substring(0, 10) + '...' : null,
                modeData: modeData
            };
        });
        
        console.log('\nAuth check result:', JSON.stringify(checkAuthResult, null, 2));
        
        // Take screenshot
        await page.screenshot({
            path: 'puppeteer-screenshots/debug-cookie-auth.png',
            fullPage: true
        });
        console.log('\n✓ Screenshot saved');
        
        // Keep browser open
        console.log('\nKeeping browser open for 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
    } catch (error) {
        console.error('Debug failed:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the debug
if (require.main === module) {
    debugCookieAuth().catch(console.error);
}

module.exports = debugCookieAuth;
