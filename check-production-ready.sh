#!/bin/bash

# Check if we're ready for production deployment

echo "🔍 Checking production readiness..."

# Check if .env.fly exists
if [ ! -f ".env.fly" ]; then
    echo "❌ ERROR: .env.fly not found!"
    echo "Please create .env.fly with production settings"
    exit 1
fi

# Check AUTH_MODE in .env.fly
AUTH_MODE=$(grep "AUTH_MODE=" .env.fly | cut -d'=' -f2)
if [ "$AUTH_MODE" != "production" ]; then
    echo "❌ ERROR: AUTH_MODE is not set to 'production' in .env.fly"
    echo "Found: AUTH_MODE=$AUTH_MODE"
    exit 1
fi

# Check ALLOW_MODE_SWITCHING in .env.fly
ALLOW_SWITCHING=$(grep "ALLOW_MODE_SWITCHING=" .env.fly | cut -d'=' -f2)
if [ "$ALLOW_SWITCHING" != "false" ]; then
    echo "❌ ERROR: ALLOW_MODE_SWITCHING is not set to 'false' in .env.fly"
    echo "Found: ALLOW_MODE_SWITCHING=$ALLOW_SWITCHING"
    exit 1
fi

# Check for API_KEY in .env.fly
API_KEY=$(grep "API_KEY=" .env.fly | cut -d'=' -f2)
if [ -z "$API_KEY" ] || [ "$API_KEY" = "dev-key-not-used" ]; then
    echo "❌ ERROR: Production API_KEY not set in .env.fly"
    echo "Please set a secure API key"
    exit 1
fi

# Check for development artifacts
if grep -q "dev-key-not-used" server.js; then
    echo "❌ ERROR: Development artifacts found in code"
    exit 1
fi

echo "✅ Production readiness check passed!"
echo ""
echo "Configuration summary:"
echo "- AUTH_MODE: production"
echo "- ALLOW_MODE_SWITCHING: false"
echo "- API_KEY: [set]"
echo ""

# Success
exit 0
