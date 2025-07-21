/**
 * Video Analysis Example
 * Demonstrates analyzing YouTube videos with YVA
 */

const { createYVAPuppeteer } = require('../puppeteer-helpers/yva-puppeteer');
const { submitVideoUrl, waitForAnalysis, goToHomePage } = require('../puppeteer-helpers/navigation-helper');

// Sample YouTube videos to analyze
const SAMPLE_VIDEOS = [
    {
        url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        title: 'Me at the zoo',
        description: 'First YouTube video ever uploaded'
    },
    {
        url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        title: 'Big Buck Bunny',
        description: 'Open source animated short'
    },
    {
        url: 'https://youtu.be/9bZkp7q19f0',
        title: 'Gangnam Style',
        description: 'First video to hit 1 billion views'
    }
];

async function videoAnalysisExample() {
    const yva = await createYVAPuppeteer({
        headless: process.env.HEADLESS === 'true',
        slowMo: 100 // Slow down for visibility
    });
    
    try {
        console.log('🎬 Video Analysis Example\n');
        
        // Setup
        await yva.launch();
        await yva.authenticate();
        
        console.log(`Mode: ${yva.getModeInfo().mode}\n`);
        
        // Analyze each video
        for (const video of SAMPLE_VIDEOS) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`📹 Analyzing: ${video.description}`);
            console.log(`URL: ${video.url}`);
            console.log('='.repeat(50));
            
            // Navigate to home page
            await goToHomePage(yva);
            
            // Submit video URL
            console.log('Submitting URL...');
            const submitted = await submitVideoUrl(yva, video.url);
            
            if (!submitted) {
                console.log('❌ Failed to submit URL');
                continue;
            }
            
            // Wait for analysis
            console.log('Waiting for analysis...');
            const startTime = Date.now();
            const analysis = await waitForAnalysis(yva);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            if (analysis) {
                console.log(`\n✅ Analysis completed in ${duration}s`);
                console.log(`Title: ${analysis.title}`);
                console.log(`Channel: ${analysis.channel}`);
                console.log(`Has Transcript: ${analysis.hasTranscript ? 'Yes' : 'No'}`);
                
                if (analysis.hasTranscript) {
                    console.log(`Transcript Length: ${analysis.transcriptLength.toLocaleString()} characters`);
                }
                
                // Take screenshot of results
                await yva.screenshot(`analysis-${video.url.split('=').pop()}`);
            } else {
                console.log('❌ Analysis failed or timed out');
            }
            
            // Brief pause between videos
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 Analysis Summary');
        console.log('='.repeat(50));
        console.log(`Videos analyzed: ${SAMPLE_VIDEOS.length}`);
        
        // Go back to home to see all videos
        await goToHomePage(yva);
        
        // Get video list
        const videoList = await yva.evaluate(() => {
            const items = document.querySelectorAll('.video-item');
            return Array.from(items).map(item => ({
                title: item.querySelector('.video-title')?.textContent || '',
                channel: item.querySelector('.video-channel')?.textContent || ''
            }));
        });
        
        if (videoList.length > 0) {
            console.log(`\nVideos in library: ${videoList.length}`);
            videoList.forEach((v, i) => {
                console.log(`${i + 1}. ${v.title} - ${v.channel}`);
            });
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await yva.screenshot('video-analysis-error');
    } finally {
        await yva.close();
        console.log('\n✅ Example completed!');
    }
}

// Helper to run with different videos
async function analyzeCustomVideo(videoUrl) {
    const yva = await createYVAPuppeteer({ headless: false });
    
    try {
        await yva.launch();
        await yva.authenticate();
        await goToHomePage(yva);
        
        console.log(`Analyzing: ${videoUrl}`);
        const submitted = await submitVideoUrl(yva, videoUrl);
        
        if (submitted) {
            const analysis = await waitForAnalysis(yva);
            if (analysis) {
                console.log('Analysis Result:', analysis);
            }
        }
    } finally {
        await yva.close();
    }
}

// Run the example
if (require.main === module) {
    // Check for custom video URL
    const customUrl = process.argv[2];
    
    if (customUrl) {
        analyzeCustomVideo(customUrl)
            .catch(error => {
                console.error('Error:', error);
                process.exit(1);
            });
    } else {
        videoAnalysisExample()
            .catch(error => {
                console.error('Error:', error);
                process.exit(1);
            });
    }
}

module.exports = { videoAnalysisExample, analyzeCustomVideo };
