#!/bin/bash

echo "=== Testing Task Coordinator Database Persistence ==="
echo

# Test endpoint
SERVER_URL="http://localhost:3335/api"

# Step 1: Add some tasks
echo "1. Adding test tasks..."
curl -s -X POST $SERVER_URL/add-task \
  -H "Content-Type: application/json" \
  -d '{"id":"persist-task-1","description":"First persistent task","dependencies":[]}' \
  | jq '.'

curl -s -X POST $SERVER_URL/add-task \
  -H "Content-Type: application/json" \
  -d '{"id":"persist-task-2","description":"Second task depends on first","dependencies":["persist-task-1"]}' \
  | jq '.'

echo
echo "2. Claiming a worker slot and working on task..."
# Claim worker slot
SLOT=$(curl -s -X POST $SERVER_URL/claim-worker-slot | jq -r '.slot')
echo "Claimed worker slot: $SLOT"

# Claim and complete first task
curl -s -X POST $SERVER_URL/claim-task \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"persist-task-1\",\"workerId\":\"test-worker\",\"workerSlot\":$SLOT}" \
  | jq '.'

curl -s -X POST $SERVER_URL/update-task \
  -H "Content-Type: application/json" \
  -d '{"taskId":"persist-task-1","status":"done","workerId":"test-worker","output":"Completed!"}' \
  | jq '.'

echo
echo "3. Current state BEFORE restart:"
echo "Tasks:"
curl -s $SERVER_URL/all-tasks | jq '.tasks[] | {id: .id, status: .status, output: .output}'

echo
echo "4. Check database file exists:"
ls -la task-coordinator.db

echo
echo "=== NOW RESTART THE SERVER ==="
echo "Steps:"
echo "1. Press Ctrl+C to stop the server"
echo "2. Run: npm run server"
echo "3. Run this command to check persistence:"
echo
echo "curl -s http://localhost:3335/api/all-tasks | jq '.tasks[] | {id: .id, status: .status, output: .output}'"
echo
echo "The tasks should still exist with their completed status!"