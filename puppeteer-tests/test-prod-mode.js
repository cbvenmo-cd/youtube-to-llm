/**
 * Test Production Mode - Verifies production mode authentication and cookie persistence
 */

// Load environment variables from .env.puppeteer
require('../puppeteer-helpers/load-env');

const { YVAPuppeteer } = require('../puppeteer-helpers/yva-puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testProdMode() {
    let yva = null;
    const cookieFile = path.join(__dirname, '..', 'puppeteer-data', 'cookies.json');
    
    try {
        console.log('=== Testing Production Mode ===\n');
        
        // Check if API key is set
        if (!process.env.PUPPETEER_API_KEY) {
            throw new Error('PUPPETEER_API_KEY environment variable not set. Please set it to run production tests.');
        }
        
        // Clear existing cookies to test fresh login
        console.log('Clearing existing cookies...');
        try {
            await fs.unlink(cookieFile);
            console.log('✓ Existing cookies cleared\n');
        } catch (error) {
            console.log('✓ No existing cookies to clear\n');
        }
        
        // Test 1: Fresh login
        console.log('Test 1: Fresh login with API key...');
        yva = await YVAPuppeteer.create({
            headless: false,
            slowMo: 50
        });
        
        const modeInfo = yva.getModeInfo();
        console.log('Mode info:', modeInfo);
        
        if (yva.isDevMode()) {
            throw new Error('In development mode! Please start server with AUTH_MODE=production or without AUTH_MODE set');
        }
        
        console.log('✓ Production mode confirmed');
        console.log('✓ Login completed successfully\n');
        
        // Test 2: Navigate to home
        console.log('Test 2: Verify authenticated access...');
        await yva.goToHome();
        
        const currentUrl = yva.getPage().url();
        if (currentUrl.includes('/login.html')) {
            throw new Error('Still on login page after authentication');
        }
        
        console.log('✓ Successfully accessed home page\n');
        
        // Test 3: Check no dev banner
        console.log('Test 3: Verify no dev mode indicators...');
        const devBannerVisible = await yva.evaluate(() => {
            const banner = document.getElementById('devModeBanner');
            return banner && !banner.classList.contains('hidden');
        });
        
        if (devBannerVisible) {
            throw new Error('Dev mode banner visible in production mode!');
        }
        
        const pageTitle = await yva.evaluate(() => document.title);
        if (pageTitle.includes('[DEV]')) {
            throw new Error('Page title contains [DEV] in production mode!');
        }
        
        console.log('✓ No development mode indicators present\n');
        
        // Test 4: Verify cookies saved
        console.log('Test 4: Verify cookies saved...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Give time for cookies to save
        
        try {
            await fs.access(cookieFile);
            const cookieData = await fs.readFile(cookieFile, 'utf8');
            const cookies = JSON.parse(cookieData);
            console.log(`✓ Cookies saved (${cookies.length} cookies)\n`);
        } catch (error) {
            console.log('⚠ Warning: Cookies not saved properly\n');
        }
        
        // Close browser
        await yva.cleanup();
        console.log('Browser closed, testing cookie persistence...\n');
        
        // Test 5: Reuse cookies
        console.log('Test 5: Testing cookie reuse (no login required)...');
        yva = await YVAPuppeteer.create({
            headless: false,
            slowMo: 50
        });
        
        // Should not need to login again
        await yva.goToHome();
        
        const urlAfterCookieReuse = yva.getPage().url();
        if (urlAfterCookieReuse.includes('/login.html')) {
            throw new Error('Redirected to login despite having cookies');
        }
        
        console.log('✓ Successfully reused cookies - no login required\n');
        
        // Test 6: Perform an action
        console.log('Test 6: Test functionality with session...');
        const analyses = await yva.getPreviousAnalyses();
        console.log(`✓ Retrieved ${analyses.length} previous analyses\n`);
        
        // Take screenshot
        const screenshotPath = await yva.screenshot('prod-mode-test');
        console.log('Screenshot saved:', screenshotPath);
        
        console.log('\n=== All Production Mode Tests Passed ===');
        console.log('\nNote: Cookies are saved and will be reused for future runs.');
        console.log('Delete puppeteer-data/cookies.json to force fresh login.\n');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        // Take error screenshot
        if (yva && yva.getPage()) {
            const screenshotPath = await yva.screenshot('prod-mode-error').catch(() => null);
            if (screenshotPath) {
                console.log('Error screenshot saved:', screenshotPath);
            }
        }
        
        process.exit(1);
    } finally {
        if (yva) {
            await yva.cleanup();
        }
    }
}

// Run the test
if (require.main === module) {
    testProdMode().catch(console.error);
}

module.exports = testProdMode;
