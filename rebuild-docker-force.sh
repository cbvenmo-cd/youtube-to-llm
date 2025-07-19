#!/bin/bash

echo "Rebuilding and restarting YouTube Video Analyzer with authentication..."
echo "======================================================================"

# Stop and remove existing container
echo "1. Stopping existing container..."
docker-compose down

# Remove the old image to force rebuild
echo ""
echo "2. Removing old image..."
docker rmi yva:latest || true

# Build the new image
echo ""
echo "3. Building new Docker image..."
docker build -t yva:latest .

# Start the new container
echo ""
echo "4. Starting container..."
docker-compose up -d

# Wait for container to be healthy
echo ""
echo "5. Waiting for container to be healthy..."
sleep 10

# Check health status
echo ""
echo "6. Checking container status..."
docker-compose ps

# Show logs
echo ""
echo "7. Recent container logs:"
docker-compose logs --tail=20

echo ""
echo "Done! The application should now be running with the new authentication system."
echo "You can test it by visiting http://localhost:8080"
