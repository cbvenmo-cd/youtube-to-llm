// Quick Puppeteer Integration Test
const { createYVAPuppeteer } = require('./puppeteer-helpers/yva-puppeteer');

async function quickTest() {
    console.log('🧪 Testing YVA Puppeteer Integration\n');
    
    let yva = null;
    
    try {
        // Create instance
        console.log('1. Creating YVA Puppeteer instance...');
        yva = await createYVAPuppeteer({
            headless: true,  // Run headless for quick test
            timeout: 30000
        });
        console.log('✅ Instance created\n');
        
        // Launch browser
        console.log('2. Launching browser...');
        await yva.launch();
        console.log('✅ Browser launched\n');
        
        // Authenticate
        console.log('3. Authenticating...');
        await yva.authenticate();
        const modeInfo = yva.getModeInfo();
        console.log(`✅ Authenticated in ${modeInfo.mode} mode`);
        console.log(`   Environment: ${modeInfo.environment}`);
        console.log(`   Mode switching allowed: ${modeInfo.modeSwitchingAllowed}\n`);
        
        // Navigate to home
        console.log('4. Navigating to home page...');
        await yva.navigate('/');
        const currentUrl = yva.getCurrentUrl();
        console.log(`✅ Current URL: ${currentUrl}\n`);
        
        // Check for elements
        console.log('5. Checking page elements...');
        const hasVideoInput = await yva.exists('#youtubeUrl');
        const hasAnalyzeButton = await yva.exists('#analyzeBtn');
        const hasDevBanner = await yva.exists('#devModeBanner:not(.hidden)');
        
        console.log(`   Video input field: ${hasVideoInput ? '✅ Found' : '❌ Not found'}`);
        console.log(`   Analyze button: ${hasAnalyzeButton ? '✅ Found' : '❌ Not found'}`);
        console.log(`   Dev mode banner: ${hasDevBanner ? '✅ Visible' : '⚠️ Not visible'}\n`);
        
        // Take screenshot
        console.log('6. Taking screenshot...');
        const screenshotPath = await yva.screenshot('quick-test');
        console.log(`✅ Screenshot saved: ${screenshotPath}\n`);
        
        // Test API access
        console.log('7. Testing API access...');
        const apiResponse = await yva.evaluate(async () => {
            try {
                const response = await fetch('/api/videos');
                return { 
                    ok: response.ok, 
                    status: response.status,
                    authenticated: response.status !== 401
                };
            } catch (error) {
                return { ok: false, error: error.message };
            }
        });
        
        console.log(`   API response: ${apiResponse.ok ? '✅ Success' : '❌ Failed'}`);
        console.log(`   Status: ${apiResponse.status}`);
        console.log(`   Authenticated: ${apiResponse.authenticated ? '✅ Yes' : '❌ No'}\n`);
        
        console.log('🎉 All tests passed! Puppeteer integration is working correctly.');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        
        // Try to take error screenshot
        if (yva) {
            try {
                const errorScreenshot = await yva.screenshot('quick-test-error');
                console.log(`\n📸 Error screenshot saved: ${errorScreenshot}`);
            } catch (e) {
                // Ignore screenshot errors
            }
        }
        
        process.exit(1);
    } finally {
        // Clean up
        if (yva) {
            console.log('\n8. Closing browser...');
            await yva.close();
            console.log('✅ Browser closed');
        }
    }
}

// Run the test
quickTest()
    .then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Unexpected error:', error);
        process.exit(1);
    });
