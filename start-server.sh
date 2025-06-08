#!/bin/bash

# Script to start the Task Coordinator Server

echo "Starting Task Coordinator Server..."

# Check if server is already running
if curl -s http://localhost:3335/api/health > /dev/null 2>&1; then
    echo "Task Coordinator Server is already running at http://localhost:3335"
    exit 0
fi

# Build the project if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "Building project..."
    npm run build
fi

# Start the server
echo "Starting server on port 3335..."
echo "Web dashboard will be available at http://localhost:3333"
npm run server