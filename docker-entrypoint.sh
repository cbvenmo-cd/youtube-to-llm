#!/bin/sh

# Check if running on Fly.io and force production mode
if [ "$FLY_APP_NAME" != "" ] || [ "$FLY_DEPLOY" = "true" ]; then
    echo "Detected Fly.io deployment - forcing production mode"
    export AUTH_MODE=production
    export ALLOW_MODE_SWITCHING=false
fi

# Log current configuration
echo "Starting with configuration:"
echo "- AUTH_MODE: ${AUTH_MODE:-production}"
echo "- NODE_ENV: ${NODE_ENV:-development}"
echo "- ALLOW_MODE_SWITCHING: ${ALLOW_MODE_SWITCHING:-false}"
echo ""

# Run migrations
npx prisma migrate deploy

# Start the application
node server.js
