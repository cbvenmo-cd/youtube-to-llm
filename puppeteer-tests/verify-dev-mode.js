/**
 * Verify Development Mode - Comprehensive verification of dev mode features
 */

const puppeteer = require('puppeteer');
const { detectAuthMode, isDevMode } = require('../puppeteer-helpers/auth-mode-detector');
const { goToHomePage, isOnPage } = require('../puppeteer-helpers/navigation-helper');
const { getBrowserLaunchOptions, getDefaultConfig } = require('../puppeteer-helpers/config-helper');

async function verifyDevMode() {
    let browser = null;
    let page = null;
    
    try {
        console.log('=== Verifying Development Mode Features ===\n');
        
        // Get config and launch browser
        const config = getDefaultConfig();
        browser = await puppeteer.launch({
            ...getBrowserLaunchOptions(config),
            headless: false,
            slowMo: 100
        });
        
        page = await browser.newPage();
        
        // Test 1: Detect auth mode
        console.log('Test 1: Detecting authentication mode...');
        const modeInfo = await detectAuthMode(page, config.baseUrl);
        console.log('Mode info:', JSON.stringify(modeInfo, null, 2));
        
        if (!isDevMode(modeInfo)) {
            throw new Error('Not in development mode! Please start the server with AUTH_MODE=development');
        }
        console.log('✓ Development mode confirmed\n');
        
        // Test 2: Verify dev banner
        console.log('Test 2: Checking dev mode banner...');
        await goToHomePage(page, config.baseUrl);
        
        const devBanner = await page.evaluate(() => {
            const banner = document.getElementById('devModeBanner');
            if (!banner) return { exists: false };
            
            return {
                exists: true,
                visible: !banner.classList.contains('hidden'),
                text: banner.textContent.trim(),
                backgroundColor: window.getComputedStyle(banner).backgroundColor
            };
        });
        
        console.log('Dev banner:', devBanner);
        if (devBanner.exists && devBanner.visible) {
            console.log('✓ Dev mode banner is visible\n');
        } else {
            console.log('⚠ Dev mode banner not visible\n');
        }
        
        // Test 3: No login required
        console.log('Test 3: Verifying no login required...');
        if (!isOnPage(page, 'home')) {
            throw new Error('Not on home page - might have been redirected to login');
        }
        console.log('✓ Direct access to home page confirmed\n');
        
        // Test 4: Check all protected pages accessible
        console.log('Test 4: Testing access to all pages...');
        const pagesToTest = [
            { name: 'Home', url: config.baseUrl },
            { name: 'Settings', url: `${config.baseUrl}/settings.html` },
            { name: 'Video', url: `${config.baseUrl}/video.html?id=test` }
        ];
        
        for (const pageTest of pagesToTest) {
            await page.goto(pageTest.url, { waitUntil: 'networkidle0' });
            const currentUrl = page.url();
            
            if (currentUrl.includes('/login.html')) {
                throw new Error(`Redirected to login when accessing ${pageTest.name}`);
            }
            
            console.log(`✓ ${pageTest.name} page accessible`);
        }
        console.log();
        
        // Test 5: API calls work without auth
        console.log('Test 5: Testing API calls...');
        const apiResponse = await page.evaluate(async () => {
            try {
                const response = await fetch('/api/auth/mode');
                const data = await response.json();
                return { success: true, data };
            } catch (error) {
                return { success: false, error: error.message };
            }
        });
        
        if (apiResponse.success) {
            console.log('✓ API calls work without authentication');
            console.log('  API response:', apiResponse.data);
        } else {
            console.log('❌ API call failed:', apiResponse.error);
        }
        console.log();
        
        // Test 6: Check for visual indicators
        console.log('Test 6: Checking visual indicators...');
        const visualIndicators = await page.evaluate(() => {
            const indicators = {
                title: document.title,
                bodyClass: document.body.className,
                favicon: document.querySelector("link[rel*='icon']")?.href
            };
            return indicators;
        });
        
        console.log('Visual indicators:');
        console.log('  Title:', visualIndicators.title);
        console.log('  Body class:', visualIndicators.bodyClass);
        console.log('  Favicon:', visualIndicators.favicon);
        
        if (visualIndicators.title.includes('[DEV]')) {
            console.log('✓ Page title shows dev mode');
        }
        if (visualIndicators.bodyClass.includes('dev-mode')) {
            console.log('✓ Body has dev-mode class');
        }
        console.log();
        
        // Take final screenshot
        await page.screenshot({ 
            path: 'puppeteer-screenshots/dev-mode-verified.png',
            fullPage: true 
        });
        console.log('Screenshot saved: dev-mode-verified.png');
        
        console.log('\n=== All Development Mode Features Verified ===');
        
    } catch (error) {
        console.error('\n❌ Verification failed:', error.message);
        
        // Take error screenshot
        if (page) {
            await page.screenshot({ 
                path: 'puppeteer-screenshots/dev-mode-error.png',
                fullPage: true 
            }).catch(() => {});
        }
        
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run verification
if (require.main === module) {
    verifyDevMode().catch(console.error);
}

module.exports = verifyDevMode;
