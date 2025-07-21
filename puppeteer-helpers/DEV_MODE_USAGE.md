# Development Mode Usage Guide

## Overview

Development mode in YVA allows you to run Puppeteer tests without authentication, significantly speeding up the development and testing process. This guide explains how to use development mode effectively.

## Starting YVA in Development Mode

### Using the run-dev.sh script (Recommended)
```bash
cd ~/Projects/yva
./run-dev.sh
```

### Manual start with environment variable
```bash
cd ~/Projects/yva
AUTH_MODE=development npm start
```

### Using Docker
```bash
cd ~/Projects/yva
docker-compose up
```
Note: Docker Compose is configured to use development mode by default for local testing.

## Visual Indicators

When running in development mode, you'll see:

1. **Orange Banner**: A prominent orange banner at the top of the page stating "DEVELOPMENT MODE - Authentication Disabled"
2. **Page Title**: The page title is prefixed with `[DEV]`
3. **Dev Favicon**: If available, a special development favicon is used

## Running Puppeteer Tests in Dev Mode

### Basic Example
```javascript
const { YVAPuppeteer } = require('./puppeteer-helpers/yva-puppeteer');

async function runTest() {
    const yva = await YVAPuppeteer.create();
    
    if (yva.isDevMode()) {
        console.log('Running in development mode - no login required!');
    }
    
    // Navigate directly to any page
    await yva.goToHome();
    
    // Analyze a video
    const result = await yva.analyzeVideo('https://youtube.com/watch?v=...');
    
    await yva.cleanup();
}
```

### Verify Dev Mode
```bash
cd ~/Projects/yva/puppeteer-tests
node verify-dev-mode.js
```

## Expected Behavior in Dev Mode

### What Works Without Authentication:
- ✅ Direct access to all pages (home, video, settings)
- ✅ All API endpoints accessible
- ✅ Video analysis functionality
- ✅ Database operations
- ✅ File uploads/downloads

### What Still Requires Credentials:
- ⚠️ YouTube API calls (need API key in environment)
- ⚠️ External service integrations

## Common Development Patterns

### 1. Quick Testing Loop
```javascript
// No need for login flow
const yva = await YVAPuppeteer.create({ headless: true });
await yva.analyzeVideo(testUrl);
await yva.screenshot('test-result');
await yva.cleanup();
```

### 2. Batch Processing
```javascript
const urls = ['url1', 'url2', 'url3'];
const yva = await YVAPuppeteer.create();

for (const url of urls) {
    await yva.analyzeVideo(url);
    // No session management needed!
}

await yva.cleanup();
```

### 3. UI Testing
```javascript
const yva = await YVAPuppeteer.create({ headless: false, slowMo: 50 });

// Test UI interactions without auth delays
await yva.goToHome();
await yva.getPage().click('#someButton');
await yva.waitFor(() => document.querySelector('.results'));

await yva.cleanup();
```

## Environment Variables

Set these in `.env.puppeteer` or export them:

```bash
# Base configuration
PUPPETEER_BASE_URL=http://localhost:8080
PUPPETEER_HEADLESS=false  # Show browser in dev
PUPPETEER_SLOW_MO=50      # Slow down for debugging

# Timeouts (can be shorter in dev mode)
PUPPETEER_TIMEOUT=10000
PUPPETEER_NAVIGATION_TIMEOUT=10000
```

## Troubleshooting

### Dev Mode Not Working

1. **Check server startup logs**
   ```
   Starting server with AUTH_MODE: development
   ```

2. **Verify mode via API**
   ```bash
   curl http://localhost:8080/api/auth/mode
   ```
   Should return: `{"mode":"development","environment":"local"}`

3. **Check for banner**
   - Orange banner should be visible at top of page
   - If not, check browser console for errors

### Common Issues

**Issue**: "Still redirected to login"
- **Solution**: Ensure server is running with `AUTH_MODE=development`

**Issue**: "Dev banner not visible"
- **Solution**: Check that you're on localhost (banner only shows on local)

**Issue**: "API calls failing"
- **Solution**: YouTube API still needs valid API key even in dev mode

## Best Practices

1. **Use dev mode for:**
   - Rapid prototyping
   - UI testing
   - Debugging Puppeteer scripts
   - CI/CD pipelines

2. **Don't use dev mode for:**
   - Production testing
   - Security testing
   - Performance benchmarking

3. **Keep separate test data**
   - Dev mode uses the same database
   - Consider using test YouTube URLs
   - Clean up test data regularly

## Security Notes

- Development mode is **only** available on localhost
- Cannot be enabled on production deployments (Fly.io)
- No sensitive data is exposed - just authentication bypass
- All other security features remain active

## Quick Commands

```bash
# Start dev mode
./run-dev.sh

# Test dev mode is working
node puppeteer-tests/verify-dev-mode.js

# Run quick test
node puppeteer-tests/test-dev-mode.js

# Run all tests in dev mode
./run-puppeteer-dev.sh
```
