#!/usr/bin/env node
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:3335';

async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${SERVER_URL}/api/${endpoint}`, options);
  return response.json();
}

async function testPersistence() {
  console.log('=== Testing Task Coordinator Persistence ===\n');
  
  try {
    // Check health
    const health = await apiCall('health');
    console.log('✓ Server is running:', health);
    
    // Add some test tasks
    console.log('\n1. Adding test tasks...');
    await apiCall('add-task', 'POST', {
      id: 'task-1',
      description: 'First test task',
      dependencies: []
    });
    console.log('✓ Added task-1');
    
    await apiCall('add-task', 'POST', {
      id: 'task-2',
      description: 'Second test task',
      dependencies: ['task-1']
    });
    console.log('✓ Added task-2');
    
    await apiCall('add-task', 'POST', {
      id: 'task-3',
      description: 'Third test task',
      dependencies: []
    });
    console.log('✓ Added task-3');
    
    // Claim a worker slot
    console.log('\n2. Claiming worker slot...');
    const slotResult = await apiCall('claim-worker-slot', 'POST');
    const workerSlot = slotResult.slot;
    console.log(`✓ Claimed worker slot ${workerSlot}`);
    
    // Claim and complete task-1
    console.log('\n3. Working on task-1...');
    await apiCall('claim-task', 'POST', {
      taskId: 'task-1',
      workerId: 'test-worker',
      workerSlot
    });
    console.log('✓ Claimed task-1');
    
    await apiCall('update-task', 'POST', {
      taskId: 'task-1',
      status: 'done',
      workerId: 'test-worker',
      output: 'Task completed successfully'
    });
    console.log('✓ Completed task-1');
    
    // Get current state
    console.log('\n4. Current state before restart:');
    const tasksBeforeRestart = await apiCall('all-tasks');
    const workersBeforeRestart = await apiCall('workers');
    
    console.log('\nTasks:');
    tasksBeforeRestart.tasks.forEach(task => {
      console.log(`  - ${task.id}: ${task.status} (deps: [${task.dependencies.join(', ')}])`);
    });
    
    console.log('\nWorkers:');
    workersBeforeRestart.workers.forEach(worker => {
      console.log(`  - Slot ${worker.slot}: ${worker.active ? 'active' : 'inactive'}`);
    });
    
    console.log('\n=== RESTART THE SERVER NOW ===');
    console.log('1. Press Ctrl+C in the server terminal');
    console.log('2. Run "npm run server" again');
    console.log('3. Press Enter here to continue testing...');
    
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // Check state after restart
    console.log('\n5. Checking state after restart...');
    try {
      const tasksAfterRestart = await apiCall('all-tasks');
      const workersAfterRestart = await apiCall('workers');
      
      console.log('\nTasks after restart:');
      tasksAfterRestart.tasks.forEach(task => {
        console.log(`  - ${task.id}: ${task.status} (deps: [${task.dependencies.join(', ')}])`);
      });
      
      console.log('\nWorkers after restart:');
      workersAfterRestart.workers.forEach(worker => {
        console.log(`  - Slot ${worker.slot}: ${worker.active ? 'active' : 'inactive'}`);
      });
      
      // Verify persistence
      console.log('\n6. Verifying persistence...');
      const task1 = tasksAfterRestart.tasks.find(t => t.id === 'task-1');
      const task2 = tasksAfterRestart.tasks.find(t => t.id === 'task-2');
      const task3 = tasksAfterRestart.tasks.find(t => t.id === 'task-3');
      
      if (task1 && task1.status === 'done' && task1.output === 'Task completed successfully') {
        console.log('✓ Task-1 persisted correctly');
      } else {
        console.log('✗ Task-1 did not persist correctly');
      }
      
      if (task2 && task2.status === 'available') {
        console.log('✓ Task-2 persisted correctly');
      } else {
        console.log('✗ Task-2 did not persist correctly');
      }
      
      if (task3 && task3.status === 'available') {
        console.log('✓ Task-3 persisted correctly');
      } else {
        console.log('✗ Task-3 did not persist correctly');
      }
      
      // Check that task-2 is now available since task-1 is done
      console.log('\n7. Checking dependency resolution...');
      const availableTasks = await apiCall('available-tasks');
      const task2Available = availableTasks.tasks.some(t => t.id === 'task-2');
      
      if (task2Available) {
        console.log('✓ Task-2 is available (dependency satisfied)');
      } else {
        console.log('✗ Task-2 is not available (dependency not satisfied)');
      }
      
      console.log('\n✅ Persistence test completed!');
      
    } catch (error) {
      console.error('\n✗ Failed to connect after restart:', error.message);
      console.error('Make sure you restarted the server!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Enable stdin for the pause
process.stdin.setRawMode(true);
process.stdin.resume();

testPersistence().then(() => {
  process.exit(0);
});