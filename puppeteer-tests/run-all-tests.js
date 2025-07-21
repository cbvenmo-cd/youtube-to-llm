/**
 * Run All Tests - Main test runner for YVA Puppeteer tests
 */

// Load environment variables from .env.puppeteer
require('../puppeteer-helpers/load-env');

const { detectAuthMode } = require('../puppeteer-helpers/auth-mode-detector');
const puppeteer = require('puppeteer');

// Import all test modules
const tests = {
    'Development Mode': require('./test-dev-mode'),
    'Production Mode': require('./test-prod-mode'),
    'Mode Switching': require('./test-mode-switching'),
    'Video Analysis': require('./test-video-analysis'),
    'Multi-Session': require('./test-multi-session'),
    'Error Handling': require('./test-error-handling')
};

// Test results tracking
const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
};

/**
 * Run a single test
 * @param {string} name - Test name
 * @param {Function} testFn - Test function
 * @returns {Promise<Object>} Test result
 */
async function runTest(name, testFn) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${name}`);
    console.log('='.repeat(60));
    
    const startTime = Date.now();
    const result = {
        name,
        status: 'unknown',
        duration: 0,
        error: null
    };
    
    try {
        await testFn();
        result.status = 'passed';
        results.passed++;
        console.log(`\n✅ ${name} - PASSED`);
    } catch (error) {
        result.status = 'failed';
        result.error = error.message;
        results.failed++;
        console.error(`\n❌ ${name} - FAILED`);
        console.error(`   Error: ${error.message}`);
    }
    
    result.duration = Date.now() - startTime;
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
    
    results.details.push(result);
    return result;
}

/**
 * Check prerequisites
 * @returns {Promise<Object>} Prerequisites status
 */
async function checkPrerequisites() {
    console.log('Checking prerequisites...\n');
    
    const status = {
        serverRunning: false,
        mode: null,
        apiKeySet: !!process.env.PUPPETEER_API_KEY
    };
    
    // Check if server is running
    let browser = null;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        const modeInfo = await detectAuthMode(page, 'http://localhost:8080');
        status.serverRunning = true;
        status.mode = modeInfo.mode;
        
        await browser.close();
    } catch (error) {
        console.error('❌ Server not running or not accessible');
        console.error('   Please start the server with ./run-dev.sh or ./run-prod.sh');
        if (browser) await browser.close();
        return status;
    }
    
    console.log('✓ Server is running');
    console.log(`✓ Current mode: ${status.mode}`);
    
    if (!status.apiKeySet) {
        console.log('⚠ PUPPETEER_API_KEY not set - production mode tests will be skipped');
        console.log('  Set it with: export PUPPETEER_API_KEY="your-api-key"');
    } else {
        console.log('✓ API key is set');
    }
    
    return status;
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log('🧪 YVA Puppeteer Test Suite');
    console.log('=' .repeat(60));
    
    // Check prerequisites
    const prereqs = await checkPrerequisites();
    if (!prereqs.serverRunning) {
        process.exit(1);
    }
    
    console.log('\nStarting tests...\n');
    const startTime = Date.now();
    
    // Determine which tests to run based on mode
    const testsToRun = [];
    
    if (prereqs.mode === 'development') {
        testsToRun.push('Development Mode');
        testsToRun.push('Video Analysis');
        console.log('ℹ Running development mode tests only');
    } else if (prereqs.mode === 'production' && prereqs.apiKeySet) {
        testsToRun.push('Production Mode');
        testsToRun.push('Video Analysis');
        testsToRun.push('Multi-Session');
        testsToRun.push('Error Handling');
        console.log('ℹ Running production mode tests');
    } else {
        console.log('⚠ Cannot run production tests without API key');
        testsToRun.push('Development Mode');
    }
    
    // Always try mode switching if on localhost
    testsToRun.push('Mode Switching');
    
    // Run selected tests
    for (const testName of testsToRun) {
        if (tests[testName]) {
            results.total++;
            await runTest(testName, tests[testName]);
        }
    }
    
    // Skip tests that weren't run
    const skippedTests = Object.keys(tests).filter(name => !testsToRun.includes(name));
    for (const skipped of skippedTests) {
        results.skipped++;
        results.total++;
        results.details.push({
            name: skipped,
            status: 'skipped',
            duration: 0,
            error: null
        });
    }
    
    // Print summary
    const totalDuration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    // Detailed results
    console.log('\nDetailed Results:');
    for (const result of results.details) {
        const icon = result.status === 'passed' ? '✅' : 
                    result.status === 'failed' ? '❌' : '⏭️';
        console.log(`${icon} ${result.name} - ${result.status.toUpperCase()}`);
        if (result.error) {
            console.log(`   └─ ${result.error}`);
        }
    }
    
    // Exit code based on results
    process.exit(results.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});

// Run tests
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = runAllTests;
