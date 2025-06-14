#!/usr/bin/env node
import fetch from 'node-fetch';

const baseUrl = 'http://localhost:3335/api';
let testsPassed = 0;
let testsFailed = 0;

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

async function test(name, fn) {
  try {
    console.log(`\n${colors.yellow}Testing: ${name}${colors.reset}`);
    await fn();
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    testsPassed++;
  } catch (error) {
    console.log(`${colors.red}✗ FAILED: ${error.message}${colors.reset}`);
    testsFailed++;
  }
}

async function makeRequest(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(`Request failed: ${data.error || response.statusText}`);
  }
  
  return data;
}

async function runTests() {
  console.log('🧪 Enhanced Task Coordinator MCP - Automated Tests\n');
  
  // Check server health
  await test('Server health check', async () => {
    const data = await makeRequest('/health');
    if (data.status !== 'ok') throw new Error('Server not healthy');
  });

  // Test 1: Enhanced task creation
  await test('Create enhanced task with context', async () => {
    const data = await makeRequest('/add-enhanced-task', {
      method: 'POST',
      body: JSON.stringify({
        id: 'test-enhanced-1',
        description: 'Test enhanced task with full context',
        acceptanceCriteria: [
          'Has context',
          'Has metadata',
          'Can be retrieved'
        ],
        context: {
          projectBackground: 'Automated test project',
          technicalStack: ['React', 'TypeScript', 'Jest'],
          codeConventions: 'ESLint + Prettier',
          relatedFiles: ['src/App.tsx', 'src/index.tsx'],
          previousDecisions: [],
          testRequirements: 'Unit tests with 90% coverage'
        },
        metadata: {
          complexity: 'medium',
          type: 'creative',
          estimatedTokens: 4000,
          requiresMultipleTurns: true,
          suggestedDuration: 60
        }
      })
    });
  });

  // Test 2: Retrieve enhanced task
  let enhancedTask;
  await test('Retrieve enhanced task with context', async () => {
    const data = await makeRequest('/enhanced-task/test-enhanced-1');
    enhancedTask = data.task;
    
    if (!enhancedTask) throw new Error('Task not found');
    if (!enhancedTask.context) throw new Error('Context missing');
    if (!enhancedTask.metadata) throw new Error('Metadata missing');
    if (enhancedTask.context.technicalStack.length !== 3) {
      throw new Error('Technical stack not preserved');
    }
  });

  // Test 3: Context inheritance
  await test('Create child task with context inheritance', async () => {
    await makeRequest('/add-enhanced-task', {
      method: 'POST',
      body: JSON.stringify({
        id: 'test-child-1',
        description: 'Child task that inherits context',
        dependencies: ['test-enhanced-1'],
        acceptanceCriteria: ['Inherits parent context'],
        context: {
          parentContext: 'test-enhanced-1',
          additionalContext: {
            specificFeature: 'Button component'
          }
        }
      })
    });
  });

  await test('Verify context inheritance', async () => {
    const data = await makeRequest('/enhanced-task/test-child-1');
    const childTask = data.task;
    
    if (!childTask.context) throw new Error('Child context missing');
    // Check if technical stack was inherited
    if (!childTask.context.technicalStack.includes('React')) {
      throw new Error('Context not inherited from parent');
    }
  });

  // Test 4: Code artifact storage
  let artifactId;
  await test('Store code artifact', async () => {
    const data = await makeRequest('/store-artifact', {
      method: 'POST',
      body: JSON.stringify({
        artifact: {
          taskId: 'test-enhanced-1',
          artifactId: 'test-button-component',
          type: 'component',
          language: 'typescript',
          code: `
export interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onClick, 
  variant = 'primary' 
}) => {
  return (
    <button className={\`btn btn-\${variant}\`} onClick={onClick}>
      {label}
    </button>
  );
};`,
          dependencies: ['react'],
          exports: ['Button', 'ButtonProps'],
          imports: ['React'],
          createdBy: 'test-worker-1',
          description: 'Reusable button component',
          tags: ['ui', 'component', 'button', 'react']
        }
      })
    });
    
    artifactId = data.artifactId;
    if (!artifactId) throw new Error('Artifact ID not returned');
  });

  // Test 5: Search artifacts
  await test('Search artifacts by query', async () => {
    const data = await makeRequest('/search-artifacts?query=button');
    if (!data.artifacts || data.artifacts.length === 0) {
      throw new Error('No artifacts found');
    }
    
    const found = data.artifacts.find(a => a.artifactId === 'test-button-component');
    if (!found) throw new Error('Expected artifact not found in search');
  });

  await test('Get artifacts by type', async () => {
    const data = await makeRequest('/artifacts/by-type/component');
    if (!data.artifacts || data.artifacts.length === 0) {
      throw new Error('No component artifacts found');
    }
  });

  await test('Get artifacts by task', async () => {
    const data = await makeRequest('/artifacts/by-task/test-enhanced-1');
    if (!data.artifacts || data.artifacts.length === 0) {
      throw new Error('No artifacts found for task');
    }
  });

  // Test 6: Conversation tracking
  await test('Add conversation turn with decision', async () => {
    await makeRequest('/add-conversation-turn', {
      method: 'POST',
      body: JSON.stringify({
        taskId: 'test-enhanced-1',
        message: {
          role: 'claude',
          content: 'I have decided to use React hooks for state management instead of Redux because the component is simple and doesn\'t need global state.',
          isDecision: true,
          decisionType: 'implementation',
          artifacts: [artifactId]
        }
      })
    });
  });

  await test('Retrieve task conversation', async () => {
    const data = await makeRequest('/conversation/test-enhanced-1');
    const conversation = data.conversation;
    
    if (!conversation) throw new Error('Conversation not found');
    if (conversation.messages.length === 0) throw new Error('No messages in conversation');
    
    const decision = conversation.messages.find(m => m.isDecision);
    if (!decision) throw new Error('Decision not found in conversation');
  });

  // Test 7: Task templates and decomposition
  await test('Create task for decomposition', async () => {
    await makeRequest('/add-enhanced-task', {
      method: 'POST',
      body: JSON.stringify({
        id: 'feature-auth',
        description: 'Implement user authentication',
        acceptanceCriteria: [
          'User can log in',
          'User can log out',
          'Sessions are managed'
        ]
      })
    });
  });

  await test('Decompose task using template', async () => {
    const data = await makeRequest('/decompose-task', {
      method: 'POST',
      body: JSON.stringify({
        taskId: 'feature-auth',
        templateId: 'ui-component'
      })
    });
    
    if (!data.subtaskIds || data.subtaskIds.length === 0) {
      throw new Error('No subtasks created');
    }
    
    console.log(`  Created ${data.subtaskIds.length} subtasks`);
  });

  // Test 8: Integration checkpoints
  let checkpointId;
  await test('Create integration checkpoint', async () => {
    const data = await makeRequest('/create-checkpoint', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Auth Feature Integration',
        taskIds: ['test-enhanced-1', 'test-child-1'],
        checkTypes: ['api-contract', 'type-compatibility', 'test-pass']
      })
    });
    
    checkpointId = data.checkpointId;
    if (!checkpointId) throw new Error('Checkpoint ID not returned');
  });

  await test('Update checkpoint status', async () => {
    await makeRequest('/update-checkpoint', {
      method: 'POST',
      body: JSON.stringify({
        checkpointId: checkpointId,
        checkType: 'api-contract',
        status: 'passed',
        details: 'All API contracts validated successfully'
      })
    });
  });

  // Test 9: Task recommendation
  await test('Get task recommendation', async () => {
    const data = await makeRequest('/recommend-task', {
      method: 'POST',
      body: JSON.stringify({
        workerId: 'test-worker-1',
        completedTasks: ['test-enhanced-1']
      })
    });
    
    if (data.recommendation) {
      console.log(`  Recommended: ${data.recommendation.taskId} (score: ${data.recommendation.score})`);
      console.log(`  Reason: ${data.recommendation.reason}`);
    }
  });

  // Test 10: Dashboard data
  await test('Get enhanced dashboard data', async () => {
    const data = await makeRequest('/enhanced-dashboard-data');
    
    if (!data.data) throw new Error('Dashboard data not returned');
    if (!data.data.tasks) throw new Error('Tasks missing from dashboard data');
    if (!data.data.artifacts) throw new Error('Artifacts missing from dashboard data');
    if (!data.data.checkpoints) throw new Error('Checkpoints missing from dashboard data');
    if (!data.data.conversations) throw new Error('Conversations missing from dashboard data');
    
    console.log(`  Dashboard data contains:`);
    console.log(`    - ${data.data.tasks.length} tasks`);
    console.log(`    - ${data.data.artifacts.length} artifacts`);
    console.log(`    - ${data.data.checkpoints.length} checkpoints`);
    console.log(`    - ${data.data.conversations.length} conversations`);
  });

  // Test 11: Clear all tasks
  await test('Clear all tasks', async () => {
    await makeRequest('/clear-all-tasks', {
      method: 'POST'
    });
  });

  await test('Verify all tasks cleared', async () => {
    const data = await makeRequest('/all-tasks');
    if (data.tasks && data.tasks.length > 0) {
      throw new Error('Tasks were not cleared');
    }
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests completed: ${colors.green}${testsPassed} passed${colors.reset}, ${colors.red}${testsFailed} failed${colors.reset}`);
  
  if (testsFailed === 0) {
    console.log(`\n${colors.green}✨ All tests passed! The enhanced features are working correctly.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}⚠️  Some tests failed. Please check the errors above.${colors.reset}`);
    process.exit(1);
  }
}

// Check if server is running before starting tests
async function checkServer() {
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) throw new Error('Server not responding');
    return true;
  } catch (error) {
    console.error(`${colors.red}Error: Enhanced server is not running on ${baseUrl}${colors.reset}`);
    console.error('Please start the server with: npm run enhanced-server');
    process.exit(1);
  }
}

// Main execution
async function main() {
  await checkServer();
  await runTests();
}

main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});