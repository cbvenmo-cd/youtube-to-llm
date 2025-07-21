#!/bin/bash

# Deploy YouTube-to-LLM to Fly.io with updated modern UI

echo "🚀 Deploying YouTube-to-LLM with modern UI to Fly.io..."

# Ensure we're in the right directory
cd ~/Projects/yva

# Run production readiness check
if ! ./check-production-ready.sh; then
    echo "❌ Deployment cancelled - production readiness check failed"
    exit 1
fi

# Export production environment variables
export AUTH_MODE=production
export ALLOW_MODE_SWITCHING=false
export NODE_ENV=production

# Show deployment configuration
echo ""
echo "📋 Deployment Configuration:"
echo "- Environment: production"
echo "- Authentication: enforced"
echo "- Mode switching: disabled"
echo "- Target: https://youtube-to-llm.fly.dev"
echo ""

# Confirmation prompt
read -p "🤔 Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled by user"
    exit 1
fi

# Use .env.fly for deployment
if [ -f ".env" ]; then
    mv .env .env.backup.$(date +%s)
fi
cp .env.fly .env

# Deploy to Fly.io
fly deploy

# Restore original .env
if [ -f ".env.backup."* ]; then
    mv .env.backup.* .env
fi

echo "✅ Deployment complete! Check https://youtube-to-llm.fly.dev"
