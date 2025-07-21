// Debug Production Mode Login
const puppeteer = require('puppeteer');

async function debugProductionLogin() {
    console.log('🔍 Debugging Production Mode Login\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 250,
        devtools: true
    });
    
    const page = await browser.newPage();
    
    try {
        // Enable console logging
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err));
        
        console.log('1. Navigating to home page...');
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
        
        // Check if redirected to login
        const currentUrl = page.url();
        console.log(`   Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('/login')) {
            console.log('   ✅ Redirected to login page (correct for production mode)\n');
            
            // Check for login form elements
            console.log('2. Checking login form elements...');
            
            const elements = await page.evaluate(() => {
                return {
                    form: document.querySelector('#loginForm') !== null,
                    apiKeyInput: document.querySelector('#apiKey') !== null,
                    loginButton: document.querySelector('#loginButton') !== null,
                    rememberMe: document.querySelector('#rememberMe') !== null,
                    devBanner: document.querySelector('#devModeBanner:not(.hidden)') !== null
                };
            });
            
            console.log(`   Login form: ${elements.form ? '✅' : '❌'}`);
            console.log(`   API key input: ${elements.apiKeyInput ? '✅' : '❌'}`);
            console.log(`   Login button: ${elements.loginButton ? '✅' : '❌'}`);
            console.log(`   Remember me checkbox: ${elements.rememberMe ? '✅' : '❌'}`);
            console.log(`   Dev banner visible: ${elements.devBanner ? '⚠️ Yes' : '✅ No'}\n`);
            
            if (elements.apiKeyInput && elements.loginButton) {
                console.log('3. Attempting login...');
                
                // Type API key
                await page.click('#apiKey');
                await page.keyboard.type('41e8b937002d320b690c646cfb914d28', { delay: 50 });
                
                // Check remember me
                const isChecked = await page.$eval('#rememberMe', el => el.checked);
                console.log(`   Remember me checked: ${isChecked ? '✅' : '❌'}`);
                
                // Take screenshot before login
                await page.screenshot({ 
                    path: 'puppeteer-screenshots/before-login.png',
                    fullPage: true 
                });
                
                console.log('\n4. Submitting login form...');
                
                // Click login and wait for response
                const [response] = await Promise.all([
                    page.waitForResponse(response => 
                        response.url().includes('/api/auth/login'),
                        { timeout: 10000 }
                    ),
                    page.click('#loginButton')
                ]);
                
                console.log(`   Login API response: ${response.status()}`);
                const responseData = await response.json();
                console.log(`   Response data:`, responseData);
                
                // Wait a bit for navigation
                await page.waitForTimeout(2000);
                
                // Check final URL
                const finalUrl = page.url();
                console.log(`\n5. Final URL: ${finalUrl}`);
                
                if (finalUrl === 'http://localhost:8080/' || finalUrl === 'http://localhost:8080') {
                    console.log('   ✅ Successfully redirected to home page!');
                    
                    // Check for session cookie
                    const cookies = await page.cookies();
                    const sessionCookie = cookies.find(c => c.name === 'yva_session');
                    
                    if (sessionCookie) {
                        console.log(`   ✅ Session cookie set: ${sessionCookie.value.substring(0, 10)}...`);
                        console.log(`   Cookie expires: ${new Date(sessionCookie.expires * 1000).toLocaleString()}`);
                    }
                } else {
                    console.log('   ❌ Still on login page');
                    
                    // Check for error message
                    const errorMsg = await page.$eval('.error-message', el => el.textContent).catch(() => null);
                    if (errorMsg) {
                        console.log(`   Error message: ${errorMsg}`);
                    }
                }
                
                // Take final screenshot
                await page.screenshot({ 
                    path: 'puppeteer-screenshots/after-login.png',
                    fullPage: true 
                });
            }
        } else {
            console.log('   ⚠️  Not redirected to login - might already be authenticated or in wrong mode');
        }
        
    } catch (error) {
        console.error('\n❌ Debug error:', error.message);
        await page.screenshot({ 
            path: 'puppeteer-screenshots/debug-error.png',
            fullPage: true 
        });
    }
    
    console.log('\n⏸️  Browser will remain open for inspection...');
    console.log('Press Ctrl+C to close when done.');
    
    // Keep browser open for manual inspection
    await new Promise(() => {});
}

// Run the debug
debugProductionLogin().catch(console.error);
