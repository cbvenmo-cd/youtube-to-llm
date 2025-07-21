// Test Video Analysis with Puppeteer
const { createYVAPuppeteer } = require('./puppeteer-helpers/yva-puppeteer');
const { submitVideoUrl, waitForAnalysis } = require('./puppeteer-helpers/navigation-helper');

async function testVideoAnalysis() {
    console.log('🎬 Testing Video Analysis Feature\n');
    
    let yva = null;
    const testVideoUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // "Me at the zoo"
    
    try {
        // Setup
        yva = await createYVAPuppeteer({
            headless: false,  // Show browser for this test
            slowMo: 100      // Slow down to see what's happening
        });
        
        await yva.launch();
        await yva.authenticate();
        
        console.log(`Mode: ${yva.getModeInfo().mode}`);
        console.log(`Testing with video: ${testVideoUrl}\n`);
        
        // Navigate to home
        await yva.navigate('/');
        
        // Submit video
        console.log('Submitting video URL...');
        const submitted = await submitVideoUrl(yva, testVideoUrl);
        
        if (!submitted) {
            throw new Error('Failed to submit video URL');
        }
        
        console.log('✅ Video submitted, waiting for analysis...\n');
        
        // Wait for analysis with timeout
        const startTime = Date.now();
        const analysis = await waitForAnalysis(yva, { timeout: 60000 });
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        if (analysis) {
            console.log(`✅ Analysis completed in ${duration} seconds!`);
            console.log('\n📊 Analysis Results:');
            console.log(`   Title: ${analysis.title}`);
            console.log(`   Channel: ${analysis.channel}`);
            console.log(`   Has Transcript: ${analysis.hasTranscript ? 'Yes' : 'No'}`);
            
            if (analysis.hasTranscript) {
                console.log(`   Transcript Length: ${analysis.transcriptLength.toLocaleString()} characters`);
            }
            
            // Take screenshot of results
            const screenshotPath = await yva.screenshot('video-analysis-result');
            console.log(`\n📸 Screenshot saved: ${screenshotPath}`);
        } else {
            console.log('❌ Analysis failed or timed out');
        }
        
        // Wait a bit before closing
        await new Promise(resolve => setTimeout(resolve, 3000));
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        
        if (yva) {
            await yva.screenshot('video-analysis-error');
        }
    } finally {
        if (yva) {
            await yva.close();
        }
    }
}

// Run the test
console.log('🚀 Starting video analysis test...\n');
testVideoAnalysis()
    .then(() => console.log('\n✅ Test completed!'))
    .catch(error => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
