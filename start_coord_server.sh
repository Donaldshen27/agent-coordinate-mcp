#!/bin/bash

# Task Coordinator Server Startup Script
# This script starts the standalone task coordinator server

# Set default values
PORT=${TASK_COORDINATOR_PORT:-3335}
HOST=${TASK_COORDINATOR_HOST:-localhost}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to kill existing server on port
kill_existing() {
    echo -e "${YELLOW}Checking for existing server on port $PORT...${NC}"
    if check_port $PORT; then
        echo -e "${YELLOW}Found existing process on port $PORT${NC}"
        PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
        echo -e "${YELLOW}Killing process $PID...${NC}"
        kill -9 $PID 2>/dev/null
        sleep 1
    fi
}

# Change to script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if dist/standaloneServer.js exists
if [ ! -f "dist/standaloneServer.js" ]; then
    echo -e "${RED}Error: dist/standaloneServer.js not found${NC}"
    echo -e "${YELLOW}Building the project...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}Build failed!${NC}"
        exit 1
    fi
fi

# Check if database exists, create if not
DB_FILE="task-coordinator.db"
if [ ! -f "$DB_FILE" ]; then
    echo -e "${YELLOW}Database not found. Creating ${DB_FILE}...${NC}"
    # The database will be created automatically when the server starts
    # This is just a notification for the user
fi

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -h|--host)
            HOST="$2"
            shift 2
            ;;
        -k|--kill)
            kill_existing
            echo -e "${GREEN}Server stopped${NC}"
            exit 0
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -p, --port PORT    Set the server port (default: 3335)"
            echo "  -h, --host HOST    Set the server host (default: localhost)"
            echo "  -k, --kill         Kill existing server and exit"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Kill any existing server
kill_existing

# Export environment variables
export TASK_COORDINATOR_URL="http://${HOST}:${PORT}"

# Start the server
echo -e "${GREEN}Starting Task Coordinator Server${NC}"
echo -e "URL: ${GREEN}http://${HOST}:${PORT}${NC}"
echo -e "Web Dashboard: ${GREEN}http://${HOST}:${PORT}/dashboard${NC}"
echo -e "\nPress Ctrl+C to stop the server\n"

# Run the server
node dist/standaloneServer.js