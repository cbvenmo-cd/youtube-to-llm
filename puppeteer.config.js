/**
 * Puppeteer Configuration
 * Default configuration for Puppeteer automation
 */

module.exports = {
    // Browser launch options
    launch: {
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        slowMo: parseInt(process.env.PUPPETEER_SLOW_MO || '0'),
        devtools: process.env.PUPPETEER_DEVTOOLS === 'true',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--window-size=1280,800'
        ],
        defaultViewport: {
            width: 1280,
            height: 800,
            deviceScaleFactor: 1
        }
    },
    
    // Navigation options
    navigation: {
        waitUntil: 'networkidle2',
        timeout: 30000
    },
    
    // Screenshot options
    screenshot: {
        type: 'png',
        fullPage: true,
        encoding: 'binary'
    },
    
    // Timeouts
    timeouts: {
        default: 30000,
        navigation: 30000,
        analysis: 60000,
        authentication: 15000
    },
    
    // Retry configuration
    retry: {
        attempts: 3,
        delay: 1000,
        backoff: 2
    },
    
    // File paths
    paths: {
        cookies: './puppeteer-data',
        screenshots: './puppeteer-screenshots',
        logs: './puppeteer-logs'
    },
    
    // Environment URLs
    urls: {
        local: 'http://localhost:8080',
        production: 'https://youtube-to-llm.fly.dev'
    },
    
    // Test data
    testData: {
        videos: [
            {
                url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
                title: 'Me at the zoo',
                channel: 'jawed'
            },
            {
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                title: 'Rick Astley - Never Gonna Give You Up',
                channel: 'Rick Astley'
            }
        ]
    }
};
