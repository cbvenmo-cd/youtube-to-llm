#!/bin/bash

echo "🔧 YVA Production Mode Setup Helper"
echo "==================================="
echo ""

# Check current mode
echo "Current server mode:"
curl -s http://localhost:8080/api/auth/mode | grep -o '"mode":"[^"]*"' || echo "Cannot connect to server"
echo ""

# Display instructions
echo "To run the server in production mode with the correct API key:"
echo ""
echo "1. If using Docker Compose:"
echo "   Stop the current container:"
echo "   $ docker-compose down"
echo ""
echo "   Start with production mode:"
echo "   $ AUTH_MODE=production API_KEY=41e8b937002d320b690c646cfb914d28 docker-compose up"
echo ""
echo "2. If running directly with Node.js:"
echo "   Stop the current server (Ctrl+C)"
echo ""
echo "   Start with:"
echo "   $ AUTH_MODE=production API_KEY=41e8b937002d320b690c646cfb914d28 npm start"
echo ""
echo "3. Or use the run script:"
echo "   $ ./run-prod.sh"
echo ""
echo "Make sure the API_KEY environment variable is set to: 41e8b937002d320b690c646cfb914d28"
echo ""
echo "After restarting, run: node test-production-mode.js"
