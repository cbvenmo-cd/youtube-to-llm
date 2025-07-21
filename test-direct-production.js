// Direct Production Mode Test
const puppeteer = require('puppeteer');

async function directProductionTest() {
    console.log('🔐 Direct Production Mode Test\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 200
    });
    
    const page = await browser.newPage();
    
    // Log all console messages from the page
    page.on('console', msg => {
        if (msg.type() !== 'warning') {
            console.log('Browser console:', msg.text());
        }
    });
    
    try {
        // First, let's check what the login page shows
        console.log('1. Navigating to login page...');
        await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle2' });
        
        // Check page title and elements
        const pageInfo = await page.evaluate(() => {
            return {
                title: document.title,
                hasApiKeyInput: !!document.querySelector('#apiKey'),
                hasLoginButton: !!document.querySelector('#loginButton'),
                hasRememberMe: !!document.querySelector('#rememberMe'),
                loginFormAction: document.querySelector('#loginForm')?.action,
                anyErrors: document.querySelector('.error-message')?.textContent
            };
        });
        
        console.log('Page info:', pageInfo);
        
        if (!pageInfo.hasApiKeyInput) {
            console.log('❌ Login form not found!');
            return;
        }
        
        // Try logging in with the API key
        console.log('\n2. Attempting login...');
        
        // Clear and type API key
        await page.click('#apiKey');
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        
        // Type the API key slowly to ensure it's entered correctly
        const apiKey = '41e8b937002d320b690c646cfb914d28';
        await page.type('#apiKey', apiKey, { delay: 50 });
        
        // Verify the value was entered
        const enteredValue = await page.$eval('#apiKey', el => el.value);
        console.log(`API key entered: ${enteredValue === apiKey ? '✅ Correct' : '❌ Mismatch'}`);
        
        // Check remember me
        const rememberMeChecked = await page.$eval('#rememberMe', el => el.checked);
        if (!rememberMeChecked) {
            await page.click('#rememberMe');
        }
        
        // Set up request interception to see what's being sent
        await page.setRequestInterception(true);
        
        page.on('request', request => {
            if (request.url().includes('/api/auth/login')) {
                console.log('\nLogin request:');
                console.log('- URL:', request.url());
                console.log('- Method:', request.method());
                console.log('- Headers:', request.headers());
                console.log('- Post data:', request.postData());
            }
            request.continue();
        });
        
        page.on('response', response => {
            if (response.url().includes('/api/auth/login')) {
                console.log('\nLogin response:');
                console.log('- Status:', response.status());
                console.log('- Headers:', response.headers());
            }
        });
        
        // Click login button
        console.log('\n3. Clicking login button...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
            page.click('#loginButton')
        ]);
        
        // Wait a moment
        await page.waitForTimeout(2000);
        
        // Check results
        const currentUrl = page.url();
        console.log(`\n4. Current URL: ${currentUrl}`);
        
        if (currentUrl.includes('localhost:8080') && !currentUrl.includes('login')) {
            console.log('✅ Successfully logged in and redirected!');
            
            // Check for cookies
            const cookies = await page.cookies();
            const sessionCookie = cookies.find(c => c.name === 'yva_session');
            if (sessionCookie) {
                console.log('✅ Session cookie found');
            }
        } else {
            // Check for error message
            const errorMsg = await page.$eval('.error-message', el => el.textContent).catch(() => null);
            if (errorMsg) {
                console.log(`❌ Login failed with error: ${errorMsg}`);
            } else {
                console.log('❌ Login failed - still on login page');
            }
        }
        
        // Take screenshot
        await page.screenshot({ 
            path: 'puppeteer-screenshots/direct-test-result.png',
            fullPage: true 
        });
        
    } catch (error) {
        console.error('\n❌ Test error:', error.message);
        await page.screenshot({ 
            path: 'puppeteer-screenshots/direct-test-error.png',
            fullPage: true 
        });
    }
    
    console.log('\n⏸️  Keeping browser open for inspection...');
    console.log('Check the browser window and press Ctrl+C when done.');
    
    // Keep browser open
    await new Promise(() => {});
}

// Run the test
directProductionTest().catch(console.error);
