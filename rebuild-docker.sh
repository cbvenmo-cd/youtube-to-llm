#!/bin/bash

echo "Rebuilding and restarting YouTube Video Analyzer with authentication..."
echo "======================================================================"

# Stop and remove existing container
echo "1. Stopping existing container..."
docker-compose down

# Rebuild the image with new code
echo ""
echo "2. Building new Docker image..."
docker-compose build

# Start the new container
echo ""
echo "3. Starting container..."
docker-compose up -d

# Wait for container to be healthy
echo ""
echo "4. Waiting for container to be healthy..."
sleep 5

# Check health status
echo ""
echo "5. Checking container status..."
docker-compose ps

echo ""
echo "Done! The application should now be running with the new authentication system."
echo "You can test it by visiting http://localhost:8080"
