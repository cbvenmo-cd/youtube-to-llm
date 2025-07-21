/**
 * Test Mode Switching - Verifies mode switching functionality (localhost only)
 */

const puppeteer = require('puppeteer');
const { getDefaultConfig, getBrowserLaunchOptions } = require('../puppeteer-helpers/config-helper');

async function testModeSwitching() {
    let browser = null;
    let page = null;
    
    try {
        console.log('=== Testing Mode Switching ===\n');
        console.log('Note: Mode switching is only available on localhost\n');
        
        const config = getDefaultConfig();
        browser = await puppeteer.launch({
            ...getBrowserLaunchOptions(config),
            headless: false,
            slowMo: 100
        });
        
        page = await browser.newPage();
        
        // Check initial mode
        console.log('1. Checking initial mode...');
        let response = await page.goto(`${config.baseUrl}/api/auth/mode`, {
            waitUntil: 'networkidle0'
        });
        let modeData = await response.json();
        console.log('Initial mode:', modeData.mode);
        console.log('Mode switching allowed:', modeData.modeSwitchingAllowed);
        
        if (!modeData.modeSwitchingAllowed) {
            console.log('\n⚠️  Mode switching is not allowed in this environment');
            console.log('This is expected on production deployments');
            return;
        }
        
        // Note: Since we removed the visual mode switcher, mode switching
        // now requires restarting the server with different AUTH_MODE
        console.log('\n2. Mode switching now requires server restart');
        console.log('   To switch modes:');
        console.log('   - Development: ./run-dev.sh');
        console.log('   - Production: ./run-prod.sh');
        
        // Test that we can detect different modes
        console.log('\n3. Verifying mode detection works...');
        
        // Go to home page
        await page.goto(config.baseUrl, { waitUntil: 'networkidle0' });
        
        // Check for dev mode indicators
        const devIndicators = await page.evaluate(() => {
            return {
                banner: document.querySelector('#devModeBanner') && 
                       !document.querySelector('#devModeBanner').classList.contains('hidden'),
                bodyClass: document.body.classList.contains('dev-mode'),
                title: document.title.includes('[DEV]')
            };
        });
        
        console.log('Dev mode indicators:', devIndicators);
        
        if (modeData.mode === 'development') {
            if (devIndicators.banner || devIndicators.bodyClass || devIndicators.title) {
                console.log('✓ Development mode indicators present');
            }
        } else {
            if (!devIndicators.banner && !devIndicators.bodyClass && !devIndicators.title) {
                console.log('✓ Production mode - no dev indicators');
            }
        }
        
        // Test authentication behavior
        console.log('\n4. Testing authentication behavior...');
        
        // Try to access API without auth
        const testResponse = await page.evaluate(async () => {
            try {
                const resp = await fetch('/api/videos', {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                return {
                    status: resp.status,
                    ok: resp.ok,
                    error: !resp.ok ? await resp.text() : null
                };
            } catch (error) {
                return { error: error.message };
            }
        });
        
        console.log('API response:', testResponse);
        
        if (modeData.mode === 'development' && testResponse.ok) {
            console.log('✓ Development mode - API accessible without auth');
        } else if (modeData.mode === 'production' && testResponse.status === 401) {
            console.log('✓ Production mode - API requires authentication');
        }
        
        // Take screenshot
        await page.screenshot({ 
            path: `puppeteer-screenshots/mode-${modeData.mode}.png`,
            fullPage: true 
        });
        console.log(`\nScreenshot saved: mode-${modeData.mode}.png`);
        
        console.log('\n=== Mode Switching Test Complete ===');
        console.log('\nTo test different modes:');
        console.log('1. Stop current server (Ctrl+C)');
        console.log('2. Start in different mode:');
        console.log('   ./run-dev.sh  - for development mode');
        console.log('   ./run-prod.sh - for production mode');
        console.log('3. Run this test again');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        if (page) {
            await page.screenshot({ 
                path: 'puppeteer-screenshots/mode-switching-error.png',
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

// Run the test
if (require.main === module) {
    testModeSwitching().catch(console.error);
}

module.exports = testModeSwitching;
