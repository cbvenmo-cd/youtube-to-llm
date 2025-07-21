/**
 * Basic Usage Example
 * Shows the simplest way to use YVA Puppeteer
 */

const { createYVAPuppeteer } = require('../puppeteer-helpers/yva-puppeteer');

async function basicExample() {
    // Create YVA Puppeteer instance
    const yva = await createYVAPuppeteer({
        headless: false // Show browser window
    });
    
    try {
        // Launch browser
        await yva.launch();
        console.log('✅ Browser launched');
        
        // Authenticate (automatic based on mode)
        await yva.authenticate();
        console.log('✅ Authenticated');
        
        // Navigate to home page
        await yva.navigate('/');
        console.log('✅ On home page');
        
        // Check if we can see the video input
        const hasInput = await yva.exists('#youtubeUrl');
        console.log(`Video input present: ${hasInput}`);
        
        // Take a screenshot
        const screenshotPath = await yva.screenshot('basic-example');
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
        
        // Get current mode info
        const modeInfo = yva.getModeInfo();
        console.log('\nMode Information:');
        console.log(`- Mode: ${modeInfo.mode}`);
        console.log(`- Environment: ${modeInfo.environment}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        // Always close browser
        await yva.close();
        console.log('👋 Browser closed');
    }
}

// Run the example
if (require.main === module) {
    console.log('🚀 Running basic example...\n');
    basicExample()
        .then(() => console.log('\n✅ Example completed!'))
        .catch(error => {
            console.error('\n❌ Example failed:', error);
            process.exit(1);
        });
}

module.exports = basicExample;
