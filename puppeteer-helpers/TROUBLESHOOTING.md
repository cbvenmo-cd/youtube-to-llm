# YVA Puppeteer Troubleshooting Guide

Common issues and solutions when using YVA Puppeteer automation.

## Mode Detection Failures

### Issue: "Failed to retrieve auth mode information"

**Symptoms:**
- Error detecting authentication mode
- Tests fail immediately after launch

**Solutions:**

1. **Check server is running:**
   ```bash
   curl http://localhost:8080/api/health
   ```

2. **Verify mode endpoint:**
   ```bash
   curl http://localhost:8080/api/auth/mode
   ```

3. **Check server logs for errors:**
   - Look for startup errors
   - Verify AUTH_MODE environment variable
   - Check for port conflicts

4. **Network issues:**
   - Ensure localhost is accessible
   - Check firewall settings
   - Try 127.0.0.1 instead of localhost

### Issue: Mode detection returns wrong mode

**Solutions:**

1. **Restart server with correct mode:**
   ```bash
   # For dev mode
   AUTH_MODE=development npm start
   
   # For prod mode
   AUTH_MODE=production npm start
   ```

2. **Check environment variables:**
   - Verify .env file settings
   - Ensure no conflicting ENV vars
   - Check for Fly.io deployment flags

## Cookie Expiration

### Issue: "All cookies are expired"

**Symptoms:**
- Repeated login prompts
- Session not persisting
- Cookie validation failures

**Solutions:**

1. **Clear old cookies:**
   ```bash
   rm -rf puppeteer-data/yva-cookies-*.json
   ```

2. **Check session duration:**
   - Default is 90 days
   - Verify SESSION_DURATION_DAYS in server
   - Check "Remember me" is checked

3. **Time sync issues:**
   - Ensure system time is correct
   - Check timezone settings
   - Verify cookie expiration dates

### Issue: Cookies not saving

**Solutions:**

1. **Check directory permissions:**
   ```bash
   mkdir -p puppeteer-data
   chmod 755 puppeteer-data
   ```

2. **Verify cookie format:**
   - Check for yva_session cookie
   - Ensure httpOnly cookies are captured
   - Look for cookie save errors in logs

## Login Failures

### Issue: "Login failed: Invalid API key"

**Solutions:**

1. **Verify API key:**
   ```bash
   # Check environment
   echo $API_KEY
   echo $PUPPETEER_API_KEY
   ```

2. **Set API key correctly:**
   ```bash
   export API_KEY=your-actual-api-key
   # or
   export PUPPETEER_API_KEY=your-actual-api-key
   ```

3. **Check .env files:**
   - Verify .env has correct API_KEY
   - Check .env.puppeteer if exists
   - Ensure no quotes around key

### Issue: Login form not found

**Symptoms:**
- "Not on login page" error
- Timeout waiting for #apiKey

**Solutions:**

1. **Check if already logged in:**
   - Clear cookies and retry
   - Check current page URL
   - Verify not already authenticated

2. **Verify selectors:**
   - Ensure #apiKey input exists
   - Check #loginButton is present
   - Verify form structure hasn't changed

3. **Page load issues:**
   - Increase navigation timeout
   - Check for JavaScript errors
   - Verify assets are loading

## Timeout Issues

### Issue: "Timeout exceeded while waiting for event"

**Solutions:**

1. **Increase timeouts:**
   ```javascript
   const yva = await createYVAPuppeteer({
       timeout: 60000 // 60 seconds
   });
   ```

2. **Add explicit waits:**
   ```javascript
   await page.waitForSelector('#element', { 
       visible: true, 
       timeout: 10000 
   });
   ```

3. **Check server performance:**
   - Monitor API response times
   - Check for slow database queries
   - Verify transcript extraction speed

4. **Network latency:**
   - Test with local server first
   - Check proxy settings
   - Verify DNS resolution

## Network Problems

### Issue: "net::ERR_CONNECTION_REFUSED"

**Solutions:**

1. **Verify server is running:**
   ```bash
   ps aux | grep node
   docker ps  # if using Docker
   ```

2. **Check port availability:**
   ```bash
   lsof -i :8080
   netstat -an | grep 8080
   ```

3. **Docker networking:**
   - Use host network mode
   - Check container port mapping
   - Verify Docker service is running

### Issue: CORS errors in console

**Solutions:**

1. **Check server CORS settings**
2. **Ensure same origin requests**
3. **Verify API endpoints are correct**

## Element Not Found

### Issue: "Element not found: #youtubeUrl"

**Solutions:**

1. **Wait for element:**
   ```javascript
   await page.waitForSelector('#youtubeUrl', {
       visible: true,
       timeout: 10000
   });
   ```

2. **Check page state:**
   - Verify on correct page
   - Check for redirects
   - Ensure authenticated

3. **Dynamic content:**
   - Wait for JavaScript to load
   - Check for lazy loading
   - Verify element IDs haven't changed

## Browser Launch Failures

### Issue: "Failed to launch the browser process"

**Solutions:**

1. **Install dependencies:**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y \
     libnss3 libatk-bridge2.0-0 \
     libx11-xcb1 libxcomposite1 \
     libxdamage1 libxrandr2 \
     libgbm1 libgtk-3-0
   ```

2. **Use no-sandbox mode:**
   ```javascript
   const browser = await puppeteer.launch({
       args: ['--no-sandbox', '--disable-setuid-sandbox']
   });
   ```

3. **Check Puppeteer installation:**
   ```bash
   npm ls puppeteer
   npm install puppeteer
   ```

## Memory Issues

### Issue: Browser consuming too much memory

**Solutions:**

1. **Close unused pages:**
   ```javascript
   await page.close();
   ```

2. **Limit concurrent browsers:**
   - Use single browser instance
   - Reuse pages when possible
   - Implement connection pooling

3. **Clear browser data:**
   ```javascript
   await page.evaluate(() => {
       localStorage.clear();
       sessionStorage.clear();
   });
   ```

## Screenshot Problems

### Issue: Screenshots not saving

**Solutions:**

1. **Create directory:**
   ```bash
   mkdir -p puppeteer-screenshots
   ```

2. **Check permissions:**
   ```bash
   chmod 755 puppeteer-screenshots
   ```

3. **Verify path:**
   ```javascript
   const screenshotPath = path.resolve('./puppeteer-screenshots/test.png');
   await page.screenshot({ path: screenshotPath });
   ```

## Debug Strategies

### Enable verbose logging:

```javascript
// In your test
const yva = await createYVAPuppeteer({
    headless: false,  // See what's happening
    slowMo: 250,      // Slow down actions
    devtools: true    // Open DevTools
});

// Add console log handler
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
page.on('pageerror', err => console.log('PAGE ERROR:', err));
```

### Save debug information:

```javascript
// Save HTML on error
try {
    // Your test code
} catch (error) {
    const html = await page.content();
    await fs.writeFile('debug-page.html', html);
    await page.screenshot({ path: 'debug-error.png' });
    throw error;
}
```

### Check network activity:

```javascript
// Log all network requests
page.on('request', request => {
    console.log('Request:', request.method(), request.url());
});

page.on('response', response => {
    console.log('Response:', response.status(), response.url());
});
```

## Common Error Messages

### "Session expired"
- Clear cookies and re-login
- Check session duration settings
- Verify time synchronization

### "Cannot read property 'click' of null"
- Element doesn't exist
- Add wait before clicking
- Verify selector is correct

### "Navigation timeout exceeded"
- Increase timeout value
- Check for infinite redirects
- Verify page loads completely

### "Protocol error: Target closed"
- Browser crashed or closed
- Check for memory issues
- Verify browser installation

## Getting Help

If you're still having issues:

1. **Check logs:**
   - Server console output
   - Browser console (via DevTools)
   - Puppeteer debug logs

2. **Isolate the problem:**
   - Run minimal test case
   - Test with headless: false
   - Try different environments

3. **Gather information:**
   - Node.js version
   - Puppeteer version
   - Operating system
   - Error messages and stack traces

4. **Debug step by step:**
   - Add console.log statements
   - Take screenshots at each step
   - Use debugger breakpoints
   - Check network requests

Remember: Most issues are related to timing, selectors, or environment configuration. Start with the simplest test case and build up complexity.
