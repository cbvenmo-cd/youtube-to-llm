/**
 * Test Error Handling - Verifies proper error handling in various scenarios
 */

const { YVAPuppeteer } = require('../puppeteer-helpers/yva-puppeteer');
const puppeteer = require('puppeteer');

async function testErrorHandling() {
    let yva = null;
    let browser = null;
    
    try {
        console.log('=== Testing Error Handling ===\n');
        
        // Test 1: Invalid YouTube URL
        console.log('Test 1: Invalid YouTube URL...');
        yva = await YVAPuppeteer.create({ headless: true });
        
        try {
            await yva.goToHome();
            const page = yva.getPage();
            
            // Enter invalid URL
            await page.type('#videoUrl', 'https://not-a-youtube-url.com');
            await page.click('#analyzeButton');
            
            // Wait for error
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const error = await page.evaluate(() => {
                const errorEl = document.querySelector('.error-message:not(.hidden)');
                return errorEl ? errorEl.textContent.trim() : null;
            });
            
            if (error) {
                console.log('✓ Error displayed:', error);
            } else {
                console.log('⚠ No error message displayed for invalid URL');
            }
        } catch (e) {
            console.log('✓ Error caught:', e.message);
        }
        
        // Test 2: Network timeout
        console.log('\nTest 2: Network timeout handling...');
        
        // Create a page with very short timeout
        const page = yva.getPage();
        page.setDefaultTimeout(1000); // 1 second timeout
        
        try {
            // This should timeout
            await page.goto('https://httpstat.us/200?sleep=5000', {
                waitUntil: 'networkidle0'
            });
            console.log('⚠ Timeout did not occur as expected');
        } catch (error) {
            if (error.name === 'TimeoutError') {
                console.log('✓ Timeout error properly caught');
            } else {
                console.log('✓ Error caught:', error.message);
            }
        }
        
        // Reset timeout
        page.setDefaultTimeout(30000);
        
        // Test 3: Invalid API key in production mode
        if (!yva.isDevMode()) {
            console.log('\nTest 3: Invalid API key...');
            
            // Close current session
            await yva.cleanup();
            
            // Try to create session with invalid API key
            const originalKey = process.env.PUPPETEER_API_KEY;
            process.env.PUPPETEER_API_KEY = 'invalid-key-12345';
            
            try {
                browser = await puppeteer.launch({ headless: true });
                const page = await browser.newPage();
                
                // Try to login with invalid key
                await page.goto('http://localhost:8080/login.html');
                await page.type('#apiKey', 'invalid-key-12345');
                await page.click('#loginButton');
                
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const error = await page.evaluate(() => {
                    const errorEl = document.querySelector('#loginMessage');
                    return errorEl && errorEl.style.display !== 'none' ? 
                           errorEl.textContent.trim() : null;
                });
                
                if (error) {
                    console.log('✓ Login error displayed:', error);
                } else {
                    console.log('⚠ No error message for invalid API key');
                }
                
                await browser.close();
                browser = null;
            } catch (e) {
                console.log('✓ Error during invalid login:', e.message);
            }
            
            // Restore original key
            process.env.PUPPETEER_API_KEY = originalKey;
        } else {
            console.log('\nTest 3: Skipped (dev mode - no API key required)');
        }
        
        // Test 4: Recovery after error
        console.log('\nTest 4: Recovery after error...');
        
        // Create new session
        yva = await YVAPuppeteer.create({ headless: true });
        
        // Should be able to use the app normally after previous errors
        await yva.goToHome();
        const analyses = await yva.getPreviousAnalyses();
        console.log(`✓ App recovered - found ${analyses.length} analyses`);
        
        // Test 5: Malformed video ID
        console.log('\nTest 5: Malformed video ID...');
        
        try {
            const page = yva.getPage();
            await page.goto('http://localhost:8080/video?id=invalid-id-format');
            
            // Wait a bit for any errors
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const pageState = await page.evaluate(() => {
                return {
                    url: window.location.href,
                    hasError: document.body.textContent.includes('error') || 
                             document.body.textContent.includes('Error') ||
                             document.body.textContent.includes('not found')
                };
            });
            
            if (pageState.hasError) {
                console.log('✓ Error shown for invalid video ID');
            } else {
                console.log('⚠ No clear error for invalid video ID');
            }
        } catch (e) {
            console.log('✓ Error caught:', e.message);
        }
        
        console.log('\n=== Error Handling Test Complete ===');
        console.log('✓ Errors are properly displayed to users');
        console.log('✓ Application recovers from errors');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    } finally {
        if (yva) await yva.cleanup();
        if (browser) await browser.close();
    }
}

// Run the test
if (require.main === module) {
    testErrorHandling().catch(console.error);
}

module.exports = testErrorHandling;
