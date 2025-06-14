#!/bin/bash

# Enhanced Task Coordinator MCP - Manual Testing Script
# This script provides an interactive way to test the enhanced features

BASE_URL="http://localhost:3335/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Enhanced Task Coordinator MCP - Manual Testing${NC}\n"

# Function to make API calls and pretty print
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    echo -e "${YELLOW}→ ${method} ${endpoint}${NC}"
    if [ -n "$data" ]; then
        echo -e "Data: ${data}\n"
    fi
    
    if [ "$method" = "GET" ]; then
        curl -s "${BASE_URL}${endpoint}" | jq '.' || echo -e "${RED}Request failed${NC}"
    else
        curl -s -X "${method}" "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}" | jq '.' || echo -e "${RED}Request failed${NC}"
    fi
    echo ""
}

# Function to pause between tests
pause() {
    echo -e "${GREEN}Press Enter to continue...${NC}"
    read
}

# Check if server is running
echo "Checking if server is running..."
if ! curl -s "${BASE_URL}/health" > /dev/null; then
    echo -e "${RED}Error: Server is not running on ${BASE_URL}${NC}"
    echo "Please start the server with: npm run enhanced-server"
    exit 1
fi
echo -e "${GREEN}✓ Server is running${NC}\n"

# Test 1: Create Enhanced Task
echo -e "${GREEN}=== Test 1: Create Enhanced Task ===${NC}"
api_call POST "/add-enhanced-task" '{
  "id": "manual-test-1",
  "description": "Manual test task with context",
  "acceptanceCriteria": ["Test context", "Test metadata"],
  "context": {
    "projectBackground": "Manual testing project",
    "technicalStack": ["React", "TypeScript"],
    "codeConventions": "Standard ESLint",
    "relatedFiles": ["test.tsx"],
    "previousDecisions": [],
    "testRequirements": "Manual validation"
  },
  "metadata": {
    "complexity": "simple",
    "type": "testing",
    "estimatedTokens": 1000,
    "requiresMultipleTurns": false
  }
}'
pause

# Test 2: Retrieve Enhanced Task
echo -e "${GREEN}=== Test 2: Retrieve Enhanced Task ===${NC}"
api_call GET "/enhanced-task/manual-test-1"
pause

# Test 3: Store Code Artifact
echo -e "${GREEN}=== Test 3: Store Code Artifact ===${NC}"
api_call POST "/store-artifact" '{
  "artifact": {
    "taskId": "manual-test-1",
    "artifactId": "manual-component",
    "type": "component",
    "language": "typescript",
    "code": "export const TestComponent = () => <div>Manual Test</div>;",
    "dependencies": ["react"],
    "exports": ["TestComponent"],
    "imports": ["React"],
    "createdBy": "manual-tester",
    "description": "Manual test component",
    "tags": ["test", "manual", "component"]
  }
}'
pause

# Test 4: Search Artifacts
echo -e "${GREEN}=== Test 4: Search Artifacts ===${NC}"
echo "Searching for 'manual'..."
api_call GET "/search-artifacts?query=manual"
pause

# Test 5: Add Conversation
echo -e "${GREEN}=== Test 5: Add Conversation with Decision ===${NC}"
api_call POST "/add-conversation-turn" '{
  "taskId": "manual-test-1",
  "message": {
    "role": "claude",
    "content": "Decided to use functional components for simplicity",
    "isDecision": true,
    "decisionType": "implementation"
  }
}'
pause

# Test 6: Get Conversation
echo -e "${GREEN}=== Test 6: Get Task Conversation ===${NC}"
api_call GET "/conversation/manual-test-1"
pause

# Test 7: Create Checkpoint
echo -e "${GREEN}=== Test 7: Create Integration Checkpoint ===${NC}"
api_call POST "/create-checkpoint" '{
  "name": "Manual Test Checkpoint",
  "taskIds": ["manual-test-1"],
  "checkTypes": ["api-contract", "test-pass"]
}'
pause

# Test 8: Task Recommendation
echo -e "${GREEN}=== Test 8: Get Task Recommendation ===${NC}"
api_call POST "/recommend-task" '{
  "workerId": "manual-tester",
  "completedTasks": ["manual-test-1"]
}'
pause

# Test 9: Dashboard Data
echo -e "${GREEN}=== Test 9: Get Enhanced Dashboard Data ===${NC}"
echo "Fetching all enhanced data..."
api_call GET "/enhanced-dashboard-data" | jq '{
  tasks: .data.tasks | length,
  artifacts: .data.artifacts | length,
  checkpoints: .data.checkpoints | length,
  conversations: .data.conversations | length
}'
pause

# Test 10: Clean up
echo -e "${GREEN}=== Test 10: Clear All Tasks (Optional) ===${NC}"
echo -e "${YELLOW}Do you want to clear all tasks? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    api_call POST "/clear-all-tasks"
    echo -e "${GREEN}✓ All tasks cleared${NC}"
else
    echo "Skipping cleanup"
fi

echo -e "\n${GREEN}✨ Manual testing completed!${NC}"
echo -e "You can also test the web dashboard at: ${YELLOW}http://localhost:3333${NC}"