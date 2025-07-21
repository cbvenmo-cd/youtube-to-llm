# YVA Puppeteer Integration

This directory contains helpers and utilities for automating YVA with Puppeteer. The integration automatically detects and handles both development and production authentication modes.

## Overview

The YVA Puppeteer integration provides:
- **Automatic mode detection** - Detects whether YVA is running in development or production mode
- **Seamless authentication** - Handles login automatically in production, skips in development
- **Cookie persistence** - Saves and reuses session cookies to avoid repeated logins
- **Simple API** - Easy-to-use wrapper around Puppeteer with YVA-specific helpers

## Directory Structure

```
puppeteer-helpers/
├── yva-puppeteer.js        # Main wrapper class
├── auth-mode-detector.js   # Detects current authentication mode
├── auth-helper.js          # Handles authentication flow
├── config-helper.js        # Configuration management
├── navigation-helper.js    # Common navigation functions
├── cookie-manager.js       # Cookie persistence
├── login-automation.js     # Login form automation
├── session-validator.js    # Session validation utilities
└── README.md              # This file
```

## Quick Start

### Basic Usage

```javascript
const { createYVAPuppeteer } = require('./puppeteer-helpers/yva-puppeteer');

async function example() {
    // Create and initialize YVA Puppeteer
    const yva = await createYVAPuppeteer({
        headless: false,  // Show browser
        apiKey: 'your-api-key'  // Only needed for production mode
    });
    
    // Launch browser
    await yva.launch();
    
    // Authenticate (automatic mode detection)
    await yva.authenticate();
    
    // Navigate to home page
    await yva.navigate('/');
    
    // Submit a video for analysis
    const { submitVideoUrl, waitForAnalysis } = require('./puppeteer-helpers/navigation-helper');
    await submitVideoUrl(yva, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const analysis = await waitForAnalysis(yva);
    
    // Clean up
    await yva.close();
}
```

### Development Mode

In development mode, authentication is bypassed:

```javascript
// No API key needed in dev mode
const yva = await createYVAPuppeteer();
await yva.launch();
await yva.authenticate(); // Automatically skips login
```

### Production Mode

In production mode, the integration handles login and cookie persistence:

```javascript
const yva = await createYVAPuppeteer({
    apiKey: process.env.API_KEY
});

await yva.launch();
await yva.authenticate(); // Performs login or uses saved cookies
```

## Running Tests

### Prerequisites

1. Install Puppeteer:
   ```bash
   npm install puppeteer
   ```

2. Start YVA server in desired mode:
   ```bash
   # Development mode
   ./run-dev.sh
   
   # Production mode
   ./run-prod.sh
   ```

3. For production mode, set your API key:
   ```bash
   export API_KEY=your-api-key
   ```

### Running Tests

```bash
# Run dev mode tests
./run-puppeteer-dev.sh

# Run prod mode tests (requires API_KEY)
./run-puppeteer-prod.sh

# Run all tests
./run-puppeteer-dev.sh all

# Run specific test
./run-puppeteer-dev.sh test-video-analysis.js
```

## Common Patterns

### Pattern 1: Quick Development Testing
Perfect for rapid iteration during development:

```javascript
const yva = await createYVAPuppeteer({ headless: true });
await yva.launch();
await yva.authenticate(); // No login needed
// Run your tests...
await yva.close();
```

### Pattern 2: Production-like Testing
Test with real authentication flow:

```javascript
const yva = await createYVAPuppeteer({ 
    apiKey: process.env.API_KEY,
    headless: false // Watch the login process
});
await yva.launch();
await yva.authenticate(); // Handles login/cookies
// Test authenticated features...
await yva.close();
```

### Pattern 3: Batch Processing
Process multiple videos efficiently:

```javascript
const videos = [
    'https://www.youtube.com/watch?v=video1',
    'https://www.youtube.com/watch?v=video2',
    // ...
];

const yva = await createYVAPuppeteer();
await yva.launch();
await yva.authenticate();

for (const url of videos) {
    await submitVideoUrl(yva, url);
    await waitForAnalysis(yva);
    await yva.navigate('/'); // Back to home
}

await yva.close();
```

### Pattern 4: CI/CD Integration
Configure for continuous integration:

```javascript
const yva = await createYVAPuppeteer({
    headless: true,
    timeout: 60000, // Longer timeout for CI
    baseUrl: process.env.TEST_URL || 'http://localhost:8080'
});

// Always use dev mode in CI for speed
process.env.AUTH_MODE = 'development';

await yva.launch();
await yva.authenticate();
// Run automated tests...
```

## API Reference

### YVAPuppeteer Class

Main wrapper class providing high-level automation API.

#### Methods

- `init()` - Initialize configuration
- `launch()` - Launch browser
- `authenticate()` - Handle authentication based on mode
- `navigate(path)` - Navigate to a path
- `click(selector)` - Click an element
- `type(selector, text)` - Type text into an input
- `getText(selector)` - Get element text content
- `exists(selector)` - Check if element exists
- `screenshot(name)` - Take a screenshot
- `evaluate(fn, ...args)` - Execute JavaScript in page
- `close()` - Close browser

#### Properties

- `isDevMode()` - Check if in development mode
- `isProdMode()` - Check if in production mode
- `getModeInfo()` - Get full mode information
- `getPage()` - Get raw Puppeteer page object
- `getBrowser()` - Get raw Puppeteer browser object

### Navigation Helpers

Common navigation functions:

- `goToHomePage(page)` - Navigate to home
- `goToVideoPage(page, videoId)` - Navigate to video page
- `goToSettingsPage(page)` - Navigate to settings
- `submitVideoUrl(page, url)` - Submit a YouTube URL
- `waitForAnalysis(page)` - Wait for analysis to complete
- `getVideoList(page)` - Get list of analyzed videos

### Authentication Helpers

- `authenticateSession(page, config)` - Main auth function
- `performLogin(page, apiKey)` - Execute login flow
- `validateSession(page)` - Check if session is valid
- `clearStoredCookies(filepath)` - Clear saved cookies

## Configuration

### Environment Variables

Create `.env.puppeteer` file:

```bash
PUPPETEER_BASE_URL=http://localhost:8080
PUPPETEER_API_KEY=your-api-key
PUPPETEER_HEADLESS=false
PUPPETEER_SLOW_MO=0
PUPPETEER_TIMEOUT=30000
```

### Configuration Object

```javascript
const config = {
    baseUrl: 'http://localhost:8080',
    apiKey: 'your-api-key',
    headless: false,
    slowMo: 100,
    timeout: 30000,
    viewport: { width: 1280, height: 800 }
};
```

## Troubleshooting

### Mode Detection Issues

If mode detection fails:
1. Ensure server is running
2. Check `/api/auth/mode` endpoint is accessible
3. Verify network connectivity

### Login Automation Fails

If login fails in production:
1. Verify API key is correct
2. Check login form selectors haven't changed
3. Ensure production mode is active
4. Clear cookies and try again

### Cookies Not Persisting

If cookies aren't saved/loaded:
1. Check file permissions in `puppeteer-data/`
2. Verify cookie expiration
3. Ensure cookie file path is correct
4. Check for cookie format changes

### Tests Timeout

If tests timeout:
1. Increase timeout values in config
2. Check for slow network/server
3. Verify selectors exist
4. Add explicit waits where needed

## Best Practices

1. **Use Development Mode for Testing**
   - Faster execution
   - No authentication overhead
   - Ideal for CI/CD

2. **Save Screenshots on Errors**
   - Helps debug failures
   - Automatic in test helpers
   - Configure screenshot directory

3. **Handle Dynamic Content**
   - Use appropriate wait strategies
   - Don't rely on fixed timeouts
   - Wait for specific elements

4. **Reuse Browser Instances**
   - Keep browser open for multiple operations
   - Reduces startup overhead
   - Remember to clean up

5. **Error Handling**
   - Always wrap in try/catch
   - Take screenshots on failure
   - Log meaningful error messages

## Examples

See the `puppeteer-examples/` directory for complete examples:
- `example-basic-usage.js` - Simple automation example
- `example-video-analysis.js` - Analyze multiple videos
- `example-batch-processing.js` - Process video lists

## Support

For issues or questions:
1. Check troubleshooting guide above
2. Review test files for examples
3. Check server logs for errors
4. Ensure environment is configured correctly
