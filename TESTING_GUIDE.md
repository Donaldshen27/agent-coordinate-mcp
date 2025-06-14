# 🧪 Testing Guide for Enhanced Task Coordinator MCP

## 📋 Prerequisites

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Start the enhanced server**
   ```bash
   npm run enhanced-server
   # Server should start on port 3335
   # Dashboard should be available on port 3333
   ```

## 🔧 Testing Setup

### Option 1: Direct API Testing (Recommended for Initial Testing)

Use a tool like `curl`, Postman, or create a test script to interact with the API directly.

### Option 2: Claude Desktop Integration

1. Update your Claude Desktop configuration:
   ```json
   {
     "mcpServers": {
       "task-coordinator-enhanced": {
         "command": "node",
         "args": ["/absolute/path/to/agent-coordinate-mcp/dist/enhancedIndex.js"],
         "env": {
           "TASK_COORDINATOR_URL": "http://localhost:3335"
         }
       }
     }
   }
   ```

2. Restart Claude Desktop
3. Look for the enhanced tools in Claude's tool list

## 🧪 Test Scenarios

### 1. **Context Management Testing**

#### Test 1.1: Create Enhanced Task with Context
```bash
curl -X POST http://localhost:3335/api/add-enhanced-task \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-task-1",
    "description": "Build a test component",
    "acceptanceCriteria": ["Works correctly", "Has tests"],
    "context": {
      "projectBackground": "Test project for validation",
      "technicalStack": ["React", "TypeScript"],
      "codeConventions": "ESLint standard",
      "relatedFiles": ["src/App.tsx"],
      "previousDecisions": [],
      "testRequirements": "Jest with 90% coverage"
    },
    "metadata": {
      "complexity": "medium",
      "type": "creative",
      "estimatedTokens": 3000,
      "requiresMultipleTurns": true
    }
  }'
```

**Expected Result**: Task created successfully with context

#### Test 1.2: Context Inheritance
```bash
# Create parent task first (use command above)
# Then create child task with parent context
curl -X POST http://localhost:3335/api/add-enhanced-task \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-task-2",
    "description": "Child task of test-task-1",
    "dependencies": ["test-task-1"],
    "acceptanceCriteria": ["Inherits parent context"],
    "context": {
      "parentContext": "test-task-1",
      "additionalContext": {
        "specificRequirement": "Additional context for child"
      }
    }
  }'
```

**Expected Result**: Child task inherits all parent context

#### Test 1.3: Retrieve Enhanced Task
```bash
curl http://localhost:3335/api/enhanced-task/test-task-1
```

**Expected Result**: Full task data with context

### 2. **Code Artifact Storage Testing**

#### Test 2.1: Store Code Artifact
```bash
curl -X POST http://localhost:3335/api/store-artifact \
  -H "Content-Type: application/json" \
  -d '{
    "artifact": {
      "taskId": "test-task-1",
      "artifactId": "test-component",
      "type": "component",
      "language": "typescript",
      "code": "export const TestComponent = () => { return <div>Test</div>; }",
      "dependencies": ["react"],
      "exports": ["TestComponent"],
      "imports": ["React"],
      "createdBy": "test-worker",
      "description": "Test React component",
      "tags": ["react", "component", "test"]
    }
  }'
```

**Expected Result**: Returns artifact ID

#### Test 2.2: Search Artifacts
```bash
# Search by query
curl "http://localhost:3335/api/search-artifacts?query=test"

# Search by type
curl "http://localhost:3335/api/artifacts/by-type/component"

# Search by task
curl "http://localhost:3335/api/artifacts/by-task/test-task-1"
```

**Expected Result**: Returns matching artifacts

### 3. **Conversation Tracking Testing**

#### Test 3.1: Add Conversation Turn
```bash
curl -X POST http://localhost:3335/api/add-conversation-turn \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test-task-1",
    "message": {
      "role": "claude",
      "content": "I have decided to use React hooks for state management because...",
      "isDecision": true,
      "decisionType": "implementation",
      "artifacts": []
    }
  }'
```

**Expected Result**: Conversation turn added

#### Test 3.2: Retrieve Conversation
```bash
curl http://localhost:3335/api/conversation/test-task-1
```

**Expected Result**: Full conversation history with decisions

### 4. **Task Templates and Decomposition Testing**

#### Test 4.1: Create Task for Decomposition
```bash
curl -X POST http://localhost:3335/api/add-enhanced-task \
  -H "Content-Type: application/json" \
  -d '{
    "id": "feature-task",
    "description": "Build user authentication feature",
    "acceptanceCriteria": ["Login works", "Logout works", "Session management"]
  }'
```

#### Test 4.2: Decompose Task
```bash
curl -X POST http://localhost:3335/api/decompose-task \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "feature-task",
    "templateId": "ui-component"
  }'
```

**Expected Result**: Creates subtasks based on template

### 5. **Integration Checkpoint Testing**

#### Test 5.1: Create Checkpoint
```bash
curl -X POST http://localhost:3335/api/create-checkpoint \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Integration Test 1",
    "taskIds": ["test-task-1", "test-task-2"],
    "checkTypes": ["api-contract", "type-compatibility"]
  }'
```

**Expected Result**: Returns checkpoint ID

#### Test 5.2: Update Checkpoint
```bash
curl -X POST http://localhost:3335/api/update-checkpoint \
  -H "Content-Type: application/json" \
  -d '{
    "checkpointId": "checkpoint-xxx",
    "checkType": "api-contract",
    "status": "passed",
    "details": "All API contracts validated"
  }'
```

### 6. **Task Recommendation Testing**

#### Test 6.1: Get Recommendation
```bash
curl -X POST http://localhost:3335/api/recommend-task \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "test-worker",
    "completedTasks": ["test-task-1"]
  }'
```

**Expected Result**: Recommends most suitable task

### 7. **Clear All Tasks Testing**

#### Test 7.1: Via API
```bash
curl -X POST http://localhost:3335/api/clear-all-tasks
```

#### Test 7.2: Via Web Dashboard
1. Open http://localhost:3333
2. Click "Clear All Tasks" button
3. Confirm the dialog

**Expected Result**: All tasks cleared, workers released

## 📊 Dashboard Testing

1. **Open Dashboard**: http://localhost:3333
2. **Verify Features**:
   - Worker slots display correctly
   - Tasks show with enhanced metadata
   - Clear All Tasks button works
   - Real-time updates via WebSocket

## 🔄 Integration Testing

### Full Workflow Test
```bash
# 1. Create parent task
# 2. Store code artifact
# 3. Add conversation with decision
# 4. Create child task with inheritance
# 5. Search for artifacts
# 6. Get task recommendation
# 7. Create checkpoint
# 8. Verify all data persists
```

## 🐛 Common Issues and Solutions

### Issue 1: Server Won't Start
- Check if port 3335 is already in use
- Ensure all dependencies are installed: `npm install`
- Check build output: `npm run build`

### Issue 2: Claude Desktop Not Finding Tools
- Verify absolute path in configuration
- Check Claude Desktop logs
- Ensure server is running before starting Claude

### Issue 3: WebSocket Connection Failed
- Check browser console for errors
- Verify server is running on correct port
- Check CORS settings if testing from different origin

## 📝 Test Checklist

- [ ] Enhanced server starts successfully
- [ ] Can create task with context
- [ ] Context inheritance works
- [ ] Can store code artifacts
- [ ] Artifact search returns results
- [ ] Conversation tracking works
- [ ] Decision marking works
- [ ] Task decomposition creates subtasks
- [ ] Checkpoints track integration status
- [ ] Recommendations are context-aware
- [ ] Clear all tasks works
- [ ] Dashboard displays enhanced data
- [ ] WebSocket updates work in real-time

## 🧪 Automated Testing

Create a test script `test-enhanced-features.js`:

```javascript
const fetch = require('node-fetch');
const baseUrl = 'http://localhost:3335/api';

async function runTests() {
  console.log('Testing Enhanced Features...\n');
  
  // Test 1: Create enhanced task
  console.log('1. Testing enhanced task creation...');
  const taskResponse = await fetch(`${baseUrl}/add-enhanced-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'auto-test-1',
      description: 'Automated test task',
      acceptanceCriteria: ['Test passes'],
      context: {
        projectBackground: 'Automated testing',
        technicalStack: ['Node.js'],
        codeConventions: 'Standard',
        relatedFiles: [],
        previousDecisions: [],
        testRequirements: 'Full coverage'
      }
    })
  });
  console.log('Task creation:', taskResponse.ok ? 'PASSED' : 'FAILED');
  
  // Add more tests...
  
  console.log('\nAll tests completed!');
}

runTests().catch(console.error);
```

## 🎯 Next Steps

1. Run through all test scenarios
2. Document any issues found
3. Create automated test suite
4. Test with actual Claude Desktop
5. Performance test with many tasks/artifacts
6. Test error handling and edge cases