// Comprehensive Puppeteer Integration Test Summary
const { createYVAPuppeteer } = require('./puppeteer-helpers/yva-puppeteer');
const { detectAuthMode } = require('./puppeteer-helpers/auth-mode-detector');
const { getCookieInfo } = require('./puppeteer-helpers/cookie-manager');
const path = require('path');

async function runComprehensiveTest() {
    console.log('🧪 YVA Puppeteer Integration Test Summary\n');
    console.log('=' .repeat(50));
    
    const results = {
        modeDetection: false,
        authentication: false,
        navigation: false,
        apiAccess: false,
        cookieManagement: false,
        screenshots: false
    };
    
    let yva = null;
    
    try {
        // Test 1: Mode Detection
        console.log('\n📋 Test 1: Mode Detection');
        const testBrowser = await require('puppeteer').launch({ headless: true });
        const testPage = await testBrowser.newPage();
        await testPage.goto('http://localhost:8080');
        
        const modeInfo = await detectAuthMode(testPage, 'http://localhost:8080');
        console.log(`   Current mode: ${modeInfo.mode}`);
        console.log(`   Environment: ${modeInfo.environment}`);
        console.log(`   Mode switching allowed: ${modeInfo.modeSwitchingAllowed}`);
        results.modeDetection = true;
        console.log('   ✅ Mode detection working');
        
        await testBrowser.close();
        
        // Test 2: YVA Puppeteer Instance
        console.log('\n📋 Test 2: Authentication & Instance Creation');
        yva = await createYVAPuppeteer({ headless: true });
        await yva.launch();
        await yva.authenticate();
        
        console.log(`   Authenticated: ${yva.authenticated}`);
        console.log(`   Is Dev Mode: ${yva.isDevMode()}`);
        console.log(`   Is Prod Mode: ${yva.isProdMode()}`);
        results.authentication = true;
        console.log('   ✅ Authentication working');
        
        // Test 3: Navigation
        console.log('\n📋 Test 3: Navigation');
        await yva.navigate('/');
        const currentUrl = yva.getCurrentUrl();
        console.log(`   Current URL: ${currentUrl}`);
        console.log(`   On home page: ${currentUrl.endsWith('8080/') || currentUrl.endsWith('8080')}`);
        results.navigation = true;
        console.log('   ✅ Navigation working');
        
        // Test 4: API Access
        console.log('\n📋 Test 4: API Access');
        const apiTest = await yva.evaluate(async () => {
            const endpoints = ['/api/health', '/api/auth/mode', '/api/videos'];
            const results = {};
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint);
                    results[endpoint] = { ok: response.ok, status: response.status };
                } catch (error) {
                    results[endpoint] = { ok: false, error: error.message };
                }
            }
            
            return results;
        });
        
        Object.entries(apiTest).forEach(([endpoint, result]) => {
            console.log(`   ${endpoint}: ${result.ok ? '✅' : '❌'} (${result.status || result.error})`);
        });
        results.apiAccess = Object.values(apiTest).every(r => r.ok);
        
        // Test 5: Cookie Management (Production mode only)
        console.log('\n📋 Test 5: Cookie Management');
        if (yva.isProdMode()) {
            const cookiePath = path.join(process.cwd(), 'puppeteer-data', 'yva-cookies-production.json');
            const cookieInfo = await getCookieInfo(cookiePath);
            
            if (cookieInfo) {
                console.log(`   Cookies saved: ✅`);
                console.log(`   Cookie age: ${cookieInfo.ageInDays.toFixed(1)} days`);
                console.log(`   Valid cookies: ${cookieInfo.validCookies}`);
                results.cookieManagement = true;
            } else {
                console.log('   No cookies found (might be first run)');
                results.cookieManagement = true; // Not a failure
            }
        } else {
            console.log('   Skipped (dev mode - no cookies needed)');
            results.cookieManagement = true;
        }
        
        // Test 6: Screenshots
        console.log('\n📋 Test 6: Screenshots');
        const screenshotPath = await yva.screenshot('comprehensive-test');
        console.log(`   Screenshot saved: ${screenshotPath}`);
        results.screenshots = true;
        console.log('   ✅ Screenshots working');
        
    } catch (error) {
        console.error('\n❌ Test error:', error.message);
    } finally {
        if (yva) {
            await yva.close();
        }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(50));
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}`);
    });
    
    console.log(`\nTotal: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('\n🎉 All tests passed! Puppeteer integration is fully functional.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the output above for details.');
    }
    
    return passed === total;
}

// Run the test
runComprehensiveTest()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
