#!/bin/bash

# Run YVA in Development Mode
# This script starts the server with development mode authentication

echo "🚀 Starting YVA in DEVELOPMENT mode"
echo "=============================================="
echo ""
echo "⚠️  WARNING: Authentication is DISABLED"
echo "⚠️  This mode should NEVER be deployed to production"
echo ""

# Set development mode
export AUTH_MODE=development
export NODE_ENV=development
export ENV_FILE=.env.development

# Load other env vars from .env.development if exists
if [ -f .env.development ]; then
    export $(cat .env.development | grep -v '^#' | xargs)
fi

# Start the server
echo "Starting server on http://localhost:8080"
echo ""

# Check if using Docker or native Node
if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
    # Inside Docker
    npm run dev
else
    # Check if we should use Docker
    if command -v docker &> /dev/null && [ -f docker-compose.yml ]; then
        echo "Using Docker Compose with development configuration..."
        # Reset to defaults (development mode)
        docker-compose up
    else
        # Use native Node.js
        npm run dev
    fi
fi
