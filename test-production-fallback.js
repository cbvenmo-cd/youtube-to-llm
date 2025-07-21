// Production Mode Test with Error Handling
const { createYVAPuppeteer } = require('./puppeteer-helpers/yva-puppeteer');
const puppeteer = require('puppeteer');

async function testProductionWithFallback() {
    console.log('🔐 Testing Production Mode Authentication\n');
    
    // First verify we're in production mode
    console.log('1. Checking server mode...');
    const testBrowser = await puppeteer.launch({ headless: true });
    const testPage = await testBrowser.newPage();
    
    try {
        await testPage.goto('http://localhost:8080/api/auth/mode');
        const modeText = await testPage.evaluate(() => document.body.textContent);
        const modeInfo = JSON.parse(modeText);
        
        console.log(`   Mode: ${modeInfo.mode}`);
        console.log(`   Environment: ${modeInfo.environment}`);
        
        if (modeInfo.mode !== 'production') {
            console.log('\n❌ Server is not in production mode!');
            await testBrowser.close();
            return;
        }
    } catch (error) {
        console.error('Error checking mode:', error.message);
    }
    
    await testBrowser.close();
    
    // Now test with different API keys
    const apiKeys = [
        process.env.API_KEY,
        '41e8b937002d320b690c646cfb914d28',
        process.env.PUPPETEER_API_KEY
    ].filter(Boolean);
    
    console.log(`\n2. Testing with ${apiKeys.length} potential API key(s)...\n`);
    
    for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        console.log(`Attempt ${i + 1}/${apiKeys.length}:`);
        console.log(`Testing with API key: ${apiKey.substring(0, 8)}...`);
        
        let yva = null;
        
        try {
            yva = await createYVAPuppeteer({
                headless: false,
                slowMo: 100,
                apiKey: apiKey
            });
            
            await yva.launch();
            
            // Try to authenticate
            const authenticated = await yva.authenticate();
            
            if (authenticated) {
                console.log('✅ Authentication successful!\n');
                
                // Test navigation
                await yva.navigate('/');
                const hasContent = await yva.exists('#youtubeUrl');
                console.log(`Can access protected content: ${hasContent ? '✅' : '❌'}`);
                
                // Get session info
                const sessionInfo = await yva.getSessionInfo();
                if (sessionInfo && !sessionInfo.mock) {
                    console.log('\nSession Information:');
                    console.log(`- Created: ${new Date(sessionInfo.createdAt).toLocaleString()}`);
                    console.log(`- Expires: ${new Date(sessionInfo.expiresAt).toLocaleString()}`);
                }
                
                await yva.screenshot('production-success');
                await yva.close();
                
                console.log('\n🎉 Production mode test completed successfully!');
                return true;
            } else {
                console.log('❌ Authentication failed with this key\n');
            }
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}\n`);
        } finally {
            if (yva) {
                await yva.close();
            }
        }
    }
    
    // If we get here, all attempts failed
    console.log('❌ All authentication attempts failed.');
    console.log('\nPossible issues:');
    console.log('1. API_KEY environment variable might not match server configuration');
    console.log('2. Server might be using a different .env file');
    console.log('3. Check if the server was restarted after changing environment variables');
    
    // Try manual API test
    console.log('\n3. Testing API directly...');
    const manualBrowser = await puppeteer.launch({ headless: true });
    const manualPage = await manualBrowser.newPage();
    
    for (const apiKey of apiKeys) {
        const response = await manualPage.evaluate(async (key) => {
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ apiKey: key, rememberMe: true })
                });
                const data = await res.json();
                return { status: res.status, data };
            } catch (error) {
                return { error: error.message };
            }
        }, apiKey);
        
        console.log(`API test with ${apiKey.substring(0, 8)}...: ${response.status} - ${JSON.stringify(response.data)}`);
    }
    
    await manualBrowser.close();
}

// Run the test
testProductionWithFallback()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
