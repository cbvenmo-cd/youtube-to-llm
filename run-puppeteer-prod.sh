#!/bin/bash

# Run Puppeteer Tests in Production Mode
# This script ensures the server is in production mode before running tests

echo "🚀 Running Puppeteer tests in PRODUCTION mode"
echo "=============================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:8080/api/health > /dev/null; then
    echo "❌ Server is not running at http://localhost:8080"
    echo "Please start the server with: ./run-prod.sh"
    exit 1
fi

# Check for API key
if [ -z "$API_KEY" ] && [ -z "$PUPPETEER_API_KEY" ]; then
    echo "❌ No API key found"
    echo "Please set API_KEY or PUPPETEER_API_KEY environment variable"
    echo "Example: export API_KEY=your-api-key"
    exit 1
fi

# Check current mode
MODE_RESPONSE=$(curl -s http://localhost:8080/api/auth/mode)
CURRENT_MODE=$(echo $MODE_RESPONSE | grep -o '"mode":"[^"]*' | cut -d'"' -f4)

if [ "$CURRENT_MODE" != "production" ]; then
    echo "⚠️  Server is running in $CURRENT_MODE mode"
    echo "Please restart server in production mode with: ./run-prod.sh"
    exit 1
fi

echo "✅ Server is running in production mode"
echo "✅ API key is set"
echo ""

# Export API key for tests
export PUPPETEER_API_KEY="${PUPPETEER_API_KEY:-$API_KEY}"

# Run tests
if [ "$1" == "all" ]; then
    echo "Running all tests..."
    node puppeteer-tests/run-all-tests.js
elif [ "$1" == "clear-cookies" ]; then
    echo "Clearing stored cookies..."
    rm -rf puppeteer-data/yva-cookies-*.json
    echo "✅ Cookies cleared"
elif [ -n "$1" ]; then
    echo "Running specific test: $1"
    node "puppeteer-tests/$1"
else
    echo "Running production mode test..."
    node puppeteer-tests/test-prod-mode.js
fi
