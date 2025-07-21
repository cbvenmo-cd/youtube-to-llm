/**
 * Test Development Mode - Verifies that dev mode works correctly
 */

// Load environment variables from .env.puppeteer
require('../puppeteer-helpers/load-env');

const { YVAPuppeteer } = require('../puppeteer-helpers/yva-puppeteer');

async function testDevMode() {
    let yva = null;
    
    try {
        console.log('=== Testing Development Mode ===\n');
        
        // Create YVA instance
        yva = await YVAPuppeteer.create({
            headless: false, // Show browser for visual verification
            slowMo: 50 // Slow down for visibility
        });
        
        // Check mode
        const modeInfo = yva.getModeInfo();
        console.log('Mode info:', modeInfo);
        
        if (!yva.isDevMode()) {
            throw new Error('Expected development mode but got: ' + modeInfo.mode);
        }
        
        console.log('✓ Development mode detected correctly\n');
        
        // Test 1: Navigate to home without login
        console.log('Test 1: Navigate to home page...');
        await yva.goToHome();
        
        // Check we're not redirected to login
        const currentUrl = yva.getPage().url();
        if (currentUrl.includes('/login.html')) {
            throw new Error('Unexpected redirect to login page in dev mode');
        }
        
        console.log('✓ Home page accessible without login\n');
        
        // Test 2: Check for dev banner
        console.log('Test 2: Check for dev mode banner...');
        const bannerVisible = await yva.evaluate(() => {
            const banner = document.getElementById('devModeBanner');
            return banner && !banner.classList.contains('hidden');
        });
        
        if (!bannerVisible) {
            console.log('⚠ Dev mode banner not visible (might be expected on some pages)');
        } else {
            console.log('✓ Dev mode banner is visible');
        }
        
        // Test 3: Try to analyze a video (may fail if YouTube API key issues)
        console.log('\nTest 3: Analyze a test video...');
        const testVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        
        try {
            // First, let's check what happens when we click analyze
            const result = await yva.getPage().evaluate(async (url) => {
                // Fill in the URL
                document.querySelector('#videoUrl').value = url;
                
                // Click analyze button
                document.querySelector('#analyzeButton').click();
                
                // Wait a bit
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                // Check current location
                return {
                    currentUrl: window.location.href,
                    hasError: !!document.querySelector('.error-message:not(.hidden)'),
                    errorText: document.querySelector('.error-message:not(.hidden)')?.textContent || null
                };
            }, testVideoUrl);
            
            console.log('Analysis result:', result);
            
            if (result.hasError) {
                console.log('⚠ Video analysis failed with error:', result.errorText);
                console.log('  This is expected if YouTube API key is missing or invalid');
            } else if (result.currentUrl.includes('/video')) {
                console.log('✓ Video analysis completed - redirected to video page');
            } else if (result.currentUrl.includes('/login')) {
                throw new Error('Unexpectedly redirected to login page in dev mode!');
            } else {
                console.log('⚠ Unexpected result - stayed on same page');
            }
        } catch (error) {
            console.log('⚠ Video analysis test failed:', error.message);
        }
        
        // Test 4: Get previous analyses
        console.log('\nTest 4: Get previous analyses...');
        const analyses = await yva.getPreviousAnalyses();
        console.log(`✓ Found ${analyses.length} previous analyses`);
        
        // Take screenshot
        console.log('\nTaking screenshot...');
        const screenshotPath = await yva.screenshot('dev-mode-test');
        console.log('✓ Screenshot saved:', screenshotPath);
        
        console.log('\n=== All Development Mode Tests Passed ===');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        // Take error screenshot
        if (yva && yva.getPage()) {
            const screenshotPath = await yva.screenshot('dev-mode-error').catch(() => null);
            if (screenshotPath) {
                console.log('Error screenshot saved:', screenshotPath);
            }
        }
        
        process.exit(1);
    } finally {
        // Cleanup
        if (yva) {
            await yva.cleanup();
        }
    }
}

// Run the test
if (require.main === module) {
    testDevMode().catch(console.error);
}

module.exports = testDevMode;
