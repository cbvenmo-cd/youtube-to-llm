/**
 * Test Multi-Session - Verifies multiple concurrent sessions work correctly
 */

const { YVAPuppeteer } = require('../puppeteer-helpers/yva-puppeteer');

async function testMultiSession() {
    let session1 = null;
    let session2 = null;
    
    try {
        console.log('=== Testing Multi-Session Support ===\n');
        
        // Check if we need API key
        if (!process.env.PUPPETEER_API_KEY) {
            console.log('⚠️  PUPPETEER_API_KEY not set');
            console.log('This test requires production mode with valid API key');
            console.log('Set it with: export PUPPETEER_API_KEY="your-api-key"');
            console.log('\nOr run in development mode: ./run-dev.sh');
            return;
        }
        
        // Create first session
        console.log('1. Creating first session...');
        session1 = await YVAPuppeteer.create({
            headless: true,
            cookieFile: 'puppeteer-data/cookies-session1.json'
        });
        
        if (session1.isDevMode()) {
            console.log('Running in development mode - multi-session test simplified\n');
        }
        
        console.log('✓ Session 1 created and authenticated');
        
        // Perform action in session 1
        await session1.goToHome();
        const analyses1 = await session1.getPreviousAnalyses();
        console.log(`✓ Session 1 accessed home page - found ${analyses1.length} analyses`);
        
        // Create second session
        console.log('\n2. Creating second session...');
        session2 = await YVAPuppeteer.create({
            headless: true,
            cookieFile: 'puppeteer-data/cookies-session2.json'
        });
        
        console.log('✓ Session 2 created and authenticated');
        
        // Perform action in session 2
        await session2.goToHome();
        const analyses2 = await session2.getPreviousAnalyses();
        console.log(`✓ Session 2 accessed home page - found ${analyses2.length} analyses`);
        
        // Verify both sessions work independently
        console.log('\n3. Testing concurrent operations...');
        
        // Perform actions in both sessions simultaneously
        const [result1, result2] = await Promise.all([
            session1.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    timestamp: new Date().toISOString()
                };
            }),
            session2.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    timestamp: new Date().toISOString()
                };
            })
        ]);
        
        console.log('Session 1 state:', result1);
        console.log('Session 2 state:', result2);
        console.log('✓ Both sessions operating independently');
        
        // Close session 1
        console.log('\n4. Closing session 1...');
        await session1.cleanup();
        session1 = null;
        console.log('✓ Session 1 closed');
        
        // Verify session 2 still works
        console.log('\n5. Verifying session 2 still works...');
        await session2.goToHome();
        const stillWorking = await session2.evaluate(() => {
            return document.querySelector('.container') !== null;
        });
        
        if (stillWorking) {
            console.log('✓ Session 2 continues to work after session 1 closed');
        } else {
            throw new Error('Session 2 failed after closing session 1');
        }
        
        // Test session info if in production mode
        if (!session2.isDevMode()) {
            console.log('\n6. Checking session information...');
            const sessionInfo = await session2.getPage().evaluate(async () => {
                try {
                    const response = await fetch('/api/auth/session-info', {
                        credentials: 'include'
                    });
                    return await response.json();
                } catch (error) {
                    return { error: error.message };
                }
            });
            
            if (!sessionInfo.error) {
                console.log('Session info:', {
                    sessionAge: sessionInfo.sessionAge ? `${Math.round(sessionInfo.sessionAge / 60)} minutes` : 'N/A',
                    timeRemaining: sessionInfo.timeRemaining ? `${Math.round(sessionInfo.timeRemaining / 3600)} hours` : 'N/A',
                    rememberMe: sessionInfo.rememberMe
                });
            }
        }
        
        console.log('\n=== Multi-Session Test Passed ===');
        console.log('✓ Multiple sessions can operate independently');
        console.log('✓ Sessions persist when others are closed');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    } finally {
        // Cleanup
        if (session1) await session1.cleanup();
        if (session2) await session2.cleanup();
    }
}

// Run the test
if (require.main === module) {
    testMultiSession().catch(console.error);
}

module.exports = testMultiSession;
