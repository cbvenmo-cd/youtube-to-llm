#!/bin/bash

# Check YVA server configuration

echo "🔍 Checking YVA Server Configuration"
echo "===================================="
echo ""

# Check if server is running
echo "1. Server Health Check:"
curl -s http://localhost:8080/api/health || echo "Server not responding"
echo ""

# Check authentication mode
echo "2. Authentication Mode:"
curl -s http://localhost:8080/api/auth/mode | python3 -m json.tool || echo "Failed to get mode"
echo ""

# Test API keys from different sources
echo "3. Testing API Authentication:"

# From .env
if [ -f .env ]; then
    API_KEY_ENV=$(grep "^API_KEY=" .env | cut -d'=' -f2)
    echo "   Testing API key from .env: ${API_KEY_ENV:0:8}..."
    curl -X POST http://localhost:8080/api/auth/login \
         -H "Content-Type: application/json" \
         -d "{\"apiKey\": \"$API_KEY_ENV\", \"rememberMe\": true}" \
         -s | python3 -m json.tool || echo "Failed"
    echo ""
fi

# From .env.production
if [ -f .env.production ]; then
    API_KEY_PROD=$(grep "^API_KEY=" .env.production | cut -d'=' -f2)
    echo "   Testing API key from .env.production: ${API_KEY_PROD:0:8}..."
    curl -X POST http://localhost:8080/api/auth/login \
         -H "Content-Type: application/json" \
         -d "{\"apiKey\": \"$API_KEY_PROD\", \"rememberMe\": true}" \
         -s | python3 -m json.tool || echo "Failed"
    echo ""
fi

# Check Docker environment
echo "4. Docker Container Check:"
docker ps --filter "name=yva" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
