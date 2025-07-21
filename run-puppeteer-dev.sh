#!/bin/bash

# Run Puppeteer Tests in Development Mode
# This script ensures the server is in development mode before running tests

echo "🚀 Running Puppeteer tests in DEVELOPMENT mode"
echo "=============================================="
echo ""

# Check if server is running
if ! curl -s http://localhost:8080/api/health > /dev/null; then
    echo "❌ Server is not running at http://localhost:8080"
    echo "Please start the server with: ./run-dev.sh"
    exit 1
fi

# Check current mode
MODE_RESPONSE=$(curl -s http://localhost:8080/api/auth/mode)
CURRENT_MODE=$(echo $MODE_RESPONSE | grep -o '"mode":"[^"]*' | cut -d'"' -f4)

if [ "$CURRENT_MODE" != "development" ]; then
    echo "⚠️  Server is running in $CURRENT_MODE mode"
    echo "Please restart server in development mode with: ./run-dev.sh"
    exit 1
fi

echo "✅ Server is running in development mode"
echo ""

# Run tests
if [ "$1" == "all" ]; then
    echo "Running all tests..."
    node puppeteer-tests/run-all-tests.js
elif [ "$1" == "verify" ]; then
    echo "Running verification..."
    node puppeteer-tests/verify-dev-mode.js
elif [ -n "$1" ]; then
    echo "Running specific test: $1"
    node "puppeteer-tests/$1"
else
    echo "Running development mode test..."
    node puppeteer-tests/test-dev-mode.js
fi
