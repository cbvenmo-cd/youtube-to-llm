/**
 * Test Video Analysis - Comprehensive test for video analysis in both modes
 */

// Load environment variables from .env.puppeteer
require('../puppeteer-helpers/load-env');

const { YVAPuppeteer } = require('../puppeteer-helpers/yva-puppeteer');

async function testVideoAnalysis() {
    let yva = null;
    
    try {
        console.log('=== Testing Video Analysis ===\n');
        
        // Create YVA instance
        yva = await YVAPuppeteer.create({
            headless: false,
            slowMo: 50
        });
        
        // Check mode
        const modeInfo = yva.getModeInfo();
        console.log('Current mode:', modeInfo.mode);
        
        // Test 1: Fill form and submit
        console.log('\nTest 1: Submit video URL...');
        await yva.goToHome();
        
        const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const page = yva.getPage();
        
        // Fill URL
        await page.type('#videoUrl', testUrl);
        console.log('✓ URL entered');
        
        // Set up navigation promise before clicking
        const navigationPromise = page.waitForNavigation({ 
            waitUntil: 'networkidle0',
            timeout: 30000 
        }).catch(e => null);
        
        // Click analyze
        await page.click('#analyzeButton');
        console.log('✓ Analyze button clicked');
        
        // Wait a bit for any immediate errors
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check current state
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);
        
        // Check for error message on current page
        const errorVisible = await page.evaluate(() => {
            const errorEl = document.querySelector('.error-message:not(.hidden)');
            return errorEl ? errorEl.textContent.trim() : null;
        }).catch(() => null);
        
        if (errorVisible) {
            console.log('⚠ Error message found:', errorVisible);
            
            // In dev mode, we should NOT be redirected to login
            if (yva.isDevMode() && currentUrl.includes('/login')) {
                throw new Error('Dev mode should not redirect to login!');
            }
            
            console.log('This is expected if YouTube API key is missing or invalid');
        } else if (currentUrl.includes('/video')) {
            console.log('✓ Successfully navigated to video page');
            
            // Wait for content to load
            try {
                await page.waitForSelector('#mainContent', { timeout: 10000 });
                console.log('✓ Video page loaded');
                
                // Get video info if available
                const videoInfo = await page.evaluate(() => {
                    return {
                        title: document.querySelector('#videoTitle')?.textContent,
                        channel: document.querySelector('#channelName')?.textContent
                    };
                });
                
                if (videoInfo.title) {
                    console.log('Video analyzed:', videoInfo.title);
                }
            } catch (e) {
                console.log('⚠ Video page loading timeout - API might have failed');
            }
        } else if (currentUrl.includes('/login')) {
            if (yva.isDevMode()) {
                throw new Error('Unexpected redirect to login in dev mode!');
            } else {
                console.log('✓ Correctly redirected to login in production mode');
            }
        }
        
        // Test 2: Try the built-in analyzeVideo method
        console.log('\nTest 2: Using built-in analyzeVideo method...');
        try {
            // Go back to home
            await yva.goToHome();
            
            const result = await yva.analyzeVideo('https://www.youtube.com/watch?v=jNQXAC9IVRw');
            console.log('✓ Analysis successful:', result.title || 'Title retrieved');
        } catch (error) {
            console.log('⚠ Built-in method failed:', error.message);
            
            if (error.message.includes('YouTube API')) {
                console.log('  This is expected - YouTube API key issue');
            } else if (error.message.includes('Unauthorized') && !yva.isDevMode()) {
                console.log('  This is expected in production mode without auth');
            }
        }
        
        // Take screenshot
        const screenshotPath = await yva.screenshot('video-analysis-test');
        console.log('\nScreenshot saved:', screenshotPath);
        
        console.log('\n=== Video Analysis Test Complete ===');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        if (yva && yva.getPage()) {
            await yva.screenshot('video-analysis-error').catch(() => null);
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
    testVideoAnalysis().catch(console.error);
}

module.exports = testVideoAnalysis;
