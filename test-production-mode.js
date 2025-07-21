// Test Production Mode with Authentication
const { createYVAPuppeteer } = require('./puppeteer-helpers/yva-puppeteer');
const { getCookieInfo } = require('./puppeteer-helpers/cookie-manager');
const path = require('path');

async function testProductionMode() {
    console.log('🔐 Testing Production Mode with Authentication\n');
    
    // First, we need to check the current server mode
    const checkMode = await require('puppeteer').launch({ headless: true });
    const checkPage = await checkMode.newPage();
    await checkPage.goto('http://localhost:8080');
    
    const modeInfo = await checkPage.evaluate(async () => {
        const response = await fetch('/api/auth/mode');
        return await response.json();
    });
    
    await checkMode.close();
    
    if (modeInfo.mode !== 'production') {
        console.log('⚠️  Server is currently in ' + modeInfo.mode + ' mode');
        console.log('⚠️  For this test, the server needs to be in production mode');
        console.log('\nTo run the server in production mode:');
        console.log('1. Stop the current server');
        console.log('2. Run: AUTH_MODE=production npm start');
        console.log('   or: ./run-prod.sh');
        return;
    }
    
    let yva = null;
    
    try {
        // Create instance with API key
        yva = await createYVAPuppeteer({
            headless: false,  // Show browser to see login process
            slowMo: 100,     // Slow down for visibility
            apiKey: process.env.API_KEY || '41e8b937002d320b690c646cfb914d28'
        });
        
        console.log('1. Launching browser...');
        await yva.launch();
        
        // Check for existing cookies
        const cookiePath = path.join(process.cwd(), 'puppeteer-data', 'yva-cookies-production.json');
        const cookieInfo = await getCookieInfo(cookiePath);
        
        if (cookieInfo) {
            console.log('\n📋 Found existing cookies:');
            console.log(`   Saved: ${new Date(cookieInfo.savedAt).toLocaleString()}`);
            console.log(`   Age: ${cookieInfo.ageInDays.toFixed(1)} days`);
            console.log(`   Valid cookies: ${cookieInfo.validCookies}`);
        } else {
            console.log('\n📋 No existing cookies found - will perform fresh login');
        }
        
        console.log('\n2. Authenticating...');
        await yva.authenticate();
        
        console.log('\n✅ Authentication successful!');
        console.log(`   Mode: ${yva.getModeInfo().mode}`);
        console.log(`   Authenticated: ${yva.authenticated}`);
        
        // Test navigation
        console.log('\n3. Testing navigation...');
        await yva.navigate('/');
        
        const hasContent = await yva.exists('#youtubeUrl');
        console.log(`   Can access protected content: ${hasContent ? '✅ Yes' : '❌ No'}`);
        
        // Get session info
        const sessionInfo = await yva.getSessionInfo();
        if (sessionInfo && !sessionInfo.mock) {
            console.log('\n📋 Session Information:');
            console.log(`   Created: ${new Date(sessionInfo.createdAt).toLocaleString()}`);
            console.log(`   Expires: ${new Date(sessionInfo.expiresAt).toLocaleString()}`);
            console.log(`   Remember me: ${sessionInfo.rememberMe ? 'Yes' : 'No'}`);
        }
        
        // Take screenshot
        const screenshotPath = await yva.screenshot('production-mode-test');
        console.log(`\n📸 Screenshot saved: ${screenshotPath}`);
        
        // Check if cookies were saved
        const newCookieInfo = await getCookieInfo(cookiePath);
        if (newCookieInfo && (!cookieInfo || newCookieInfo.savedAt !== cookieInfo.savedAt)) {
            console.log('\n✅ New cookies saved for future use');
        }
        
        console.log('\n🎉 Production mode test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        if (yva) {
            await yva.screenshot('production-mode-error');
        }
    } finally {
        if (yva) {
            await yva.close();
        }
    }
}

// Run the test
testProductionMode()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
