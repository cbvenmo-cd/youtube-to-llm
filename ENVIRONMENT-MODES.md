# YVA Environment Mode Configuration

## Development Mode

Run with: `./run-dev.sh`

### What happens:
- **NODE_ENV**: development
- **AUTH_MODE**: development
- **Authentication**: DISABLED (no login required)
- **Mode Switching**: Enabled (can switch to production on localhost)
- **Config File**: Uses `.env.development`

### Expected server output:
```
Environment: development ✅
AUTH_MODE: development ✅
Session Duration: 90 days
Mode Switching: enabled
Fly.io Deployment: no

⚠️  WARNING: Running in DEVELOPMENT MODE
⚠️  Authentication is DISABLED
⚠️  This mode should NEVER be deployed to production
```

### Docker Compose behavior:
- Uses default values from `docker-compose.yml`
- Loads `.env.development` file
- All environment variables properly set

---

## Production Mode

Run with: `./run-prod.sh`

### What happens:
- **NODE_ENV**: production
- **AUTH_MODE**: production
- **Authentication**: ENABLED (API key required)
- **Mode Switching**: Disabled in override file
- **Config File**: Uses `.env.production`

### Expected server output:
```
Environment: production ✅
AUTH_MODE: production ✅
Session Duration: 90 days
Mode Switching: disabled
Fly.io Deployment: no
```

### Docker Compose behavior:
- Uses `docker-compose.yml` + `docker-compose.prod.yml` override
- Loads `.env.production` file
- Forces production settings
- API_KEY properly passed to container

---

## Quick Commands

### Development Mode:
```bash
# Start in dev mode (no auth)
./run-dev.sh

# Test with Puppeteer
./run-puppeteer-dev.sh
```

### Production Mode:
```bash
# Start in production mode (auth required)
./run-prod.sh

# Test with Puppeteer
./run-puppeteer-prod.sh
```

### Switch modes:
```bash
# Stop current server
docker-compose down

# Start in desired mode
./run-dev.sh   # for development
./run-prod.sh  # for production
```

---

## Environment Files

### `.env.development`
- NODE_ENV=development
- AUTH_MODE=development
- API_KEY=dev-key-not-used
- Mode switching enabled

### `.env.production`
- NODE_ENV=production
- AUTH_MODE=production
- API_KEY=41e8b937002d320b690c646cfb914d28
- Mode switching can be disabled

### `docker-compose.yml`
- Base configuration
- Defaults to development mode
- Uses ENV_FILE variable to select config

### `docker-compose.prod.yml`
- Production override
- Forces production settings
- Disables mode switching
