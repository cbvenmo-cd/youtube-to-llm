#!/bin/bash

# Run YVA in Production Mode
# This script starts the server with production mode authentication

echo "🚀 Starting YVA in PRODUCTION mode"
echo "=============================================="
echo ""
echo "🔐 Authentication is ENABLED"
echo "🔐 API key required for access"
echo ""

# Set production mode
export AUTH_MODE=production
export NODE_ENV=production
export ENV_FILE=.env.production

# Load other env vars from .env.production if exists
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Check for API key
if [ -z "$API_KEY" ]; then
    echo "⚠️  WARNING: No API_KEY environment variable set"
    echo "You may want to set it in .env or .env.production"
    echo ""
else
    echo "✅ API_KEY is set"
    echo ""
fi

# Start the server
echo "Starting server on http://localhost:8080"
echo ""

# Check if using Docker or native Node
if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
    # Inside Docker
    npm start
else
    # Check if we should use Docker
    if command -v docker &> /dev/null && [ -f docker-compose.yml ]; then
        echo "Using Docker Compose with production configuration..."
        # Use docker-compose with production override file
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
    else
        # Use native Node.js
        npm start
    fi
fi
