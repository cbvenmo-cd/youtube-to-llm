#!/bin/bash

# Test authentication endpoints

echo "Testing YouTube Video Analyzer Authentication System"
echo "==================================================="

# Get the API key from environment or prompt user
if [ -z "$API_KEY" ]; then
    read -p "Enter your API key: " API_KEY
fi

BASE_URL="${BASE_URL:-http://localhost:8080}"

echo ""
echo "1. Testing login endpoint..."
echo "POST $BASE_URL/api/auth/login"

RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\": \"$API_KEY\"}")

echo "Response: $RESPONSE"

# Extract token from response
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "Login failed. Please check your API key."
    exit 1
fi

echo "Login successful! Token: ${TOKEN:0:20}..."

echo ""
echo "2. Testing verify endpoint..."
echo "GET $BASE_URL/api/auth/verify"

VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/verify" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $VERIFY_RESPONSE"

echo ""
echo "3. Testing protected endpoint with session token..."
echo "GET $BASE_URL/api/videos"

VIDEOS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/videos" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: ${VIDEOS_RESPONSE:0:100}..."

echo ""
echo "Authentication system is working correctly!"
