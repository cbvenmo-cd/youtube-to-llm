/**
 * Batch Processing Example
 * Demonstrates processing multiple videos efficiently
 */

const { createYVAPuppeteer } = require('../puppeteer-helpers/yva-puppeteer');
const { submitVideoUrl, waitForAnalysis, goToHomePage, getVideoList } = require('../puppeteer-helpers/navigation-helper');
const fs = require('fs').promises;
const path = require('path');

/**
 * Process a batch of YouTube URLs
 * @param {Array<string>} urls - Array of YouTube URLs
 * @param {Object} options - Processing options
 */
async function batchProcessVideos(urls, options = {}) {
    const {
        concurrency = 1,
        saveResults = true,
        outputFile = 'batch-results.json',
        continueOnError = true,
        progressCallback = null
    } = options;
    
    console.log(`🎬 Batch Processing ${urls.length} videos`);
    console.log(`Concurrency: ${concurrency}`);
    console.log(`Continue on error: ${continueOnError}\n`);
    
    const results = [];
    const errors = [];
    
    // Create YVA instance
    const yva = await createYVAPuppeteer({
        headless: true, // Run headless for batch processing
        timeout: 60000  // Longer timeout for reliability
    });
    
    try {
        await yva.launch();
        await yva.authenticate();
        
        // Process URLs in batches based on concurrency
        for (let i = 0; i < urls.length; i += concurrency) {
            const batch = urls.slice(i, i + concurrency);
            console.log(`\nProcessing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(urls.length / concurrency)}`);
            
            const batchPromises = batch.map(async (url, index) => {
                const videoIndex = i + index;
                
                try {
                    // Navigate to home
                    await goToHomePage(yva);
                    
                    // Submit video
                    console.log(`[${videoIndex + 1}/${urls.length}] Submitting: ${url}`);
                    const submitted = await submitVideoUrl(yva, url);
                    
                    if (!submitted) {
                        throw new Error('Failed to submit URL');
                    }
                    
                    // Wait for analysis
                    const startTime = Date.now();
                    const analysis = await waitForAnalysis(yva);
                    const processingTime = Date.now() - startTime;
                    
                    if (!analysis) {
                        throw new Error('Analysis failed or timed out');
                    }
                    
                    const result = {
                        index: videoIndex,
                        url: url,
                        success: true,
                        data: {
                            title: analysis.title,
                            channel: analysis.channel,
                            hasTranscript: analysis.hasTranscript,
                            transcriptLength: analysis.transcriptLength,
                            processingTime: processingTime
                        },
                        timestamp: new Date().toISOString()
                    };
                    
                    console.log(`✅ [${videoIndex + 1}/${urls.length}] Success: ${analysis.title}`);
                    
                    if (progressCallback) {
                        progressCallback(videoIndex + 1, urls.length, result);
                    }
                    
                    return result;
                    
                } catch (error) {
                    const errorResult = {
                        index: videoIndex,
                        url: url,
                        success: false,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    };
                    
                    console.error(`❌ [${videoIndex + 1}/${urls.length}] Error: ${error.message}`);
                    errors.push(errorResult);
                    
                    if (progressCallback) {
                        progressCallback(videoIndex + 1, urls.length, errorResult);
                    }
                    
                    if (!continueOnError) {
                        throw error;
                    }
                    
                    return errorResult;
                }
            });
            
            // Wait for batch to complete
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches
            if (i + concurrency < urls.length) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 Batch Processing Summary');
        console.log('='.repeat(50));
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`Total videos: ${urls.length}`);
        console.log(`✅ Successful: ${successful}`);
        console.log(`❌ Failed: ${failed}`);
        
        if (failed > 0) {
            console.log('\nFailed URLs:');
            results.filter(r => !r.success).forEach(r => {
                console.log(`- ${r.url}: ${r.error}`);
            });
        }
        
        // Calculate statistics
        const successfulResults = results.filter(r => r.success);
        if (successfulResults.length > 0) {
            const avgProcessingTime = successfulResults.reduce((sum, r) => sum + r.data.processingTime, 0) / successfulResults.length;
            const transcriptCount = successfulResults.filter(r => r.data.hasTranscript).length;
            
            console.log('\n📈 Statistics:');
            console.log(`Average processing time: ${(avgProcessingTime / 1000).toFixed(2)}s`);
            console.log(`Videos with transcripts: ${transcriptCount}/${successfulResults.length}`);
        }
        
        // Save results if requested
        if (saveResults) {
            const outputPath = path.resolve(outputFile);
            await fs.writeFile(outputPath, JSON.stringify({
                summary: {
                    total: urls.length,
                    successful: successful,
                    failed: failed,
                    processedAt: new Date().toISOString()
                },
                results: results
            }, null, 2));
            
            console.log(`\n💾 Results saved to: ${outputPath}`);
        }
        
        return results;
        
    } finally {
        await yva.close();
    }
}

/**
 * Load URLs from a file
 * @param {string} filename - Path to file containing URLs (one per line)
 * @returns {Promise<Array<string>>} Array of URLs
 */
async function loadUrlsFromFile(filename) {
    const content = await fs.readFile(filename, 'utf8');
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.startsWith('http'));
}

// Example usage
async function runBatchExample() {
    // Example URLs
    const exampleUrls = [
        'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        'https://www.youtube.com/watch?v=9bZkp7q19f0',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://www.youtube.com/watch?v=0J2QdDbelmY'
    ];
    
    // Progress callback example
    const onProgress = (current, total, result) => {
        const percentage = ((current / total) * 100).toFixed(1);
        console.log(`📊 Progress: ${percentage}% (${current}/${total})`);
    };
    
    // Run batch processing
    await batchProcessVideos(exampleUrls, {
        concurrency: 2,
        saveResults: true,
        outputFile: 'example-batch-results.json',
        continueOnError: true,
        progressCallback: onProgress
    });
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // Run example
        console.log('Running example batch processing...\n');
        runBatchExample()
            .then(() => console.log('\n✅ Batch processing completed!'))
            .catch(error => {
                console.error('\n❌ Error:', error);
                process.exit(1);
            });
    } else if (args[0] === '--file' && args[1]) {
        // Process URLs from file
        loadUrlsFromFile(args[1])
            .then(urls => {
                console.log(`Loaded ${urls.length} URLs from ${args[1]}\n`);
                return batchProcessVideos(urls, {
                    concurrency: parseInt(args[2]) || 1,
                    saveResults: true,
                    continueOnError: true
                });
            })
            .then(() => console.log('\n✅ Batch processing completed!'))
            .catch(error => {
                console.error('\n❌ Error:', error);
                process.exit(1);
            });
    } else {
        console.log('Usage:');
        console.log('  node example-batch-processing.js                    # Run example');
        console.log('  node example-batch-processing.js --file urls.txt   # Process URLs from file');
        console.log('  node example-batch-processing.js --file urls.txt 3 # With concurrency');
    }
}

module.exports = { batchProcessVideos, loadUrlsFromFile };
