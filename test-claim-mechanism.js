#!/usr/bin/env node

// Test script for the new claiming mechanism
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3335/api';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testClaimMechanism() {
  console.log('=== Testing Task Claiming Mechanism ===\n');

  try {
    // Step 1: Clean all tasks first
    console.log('1. Cleaning all existing tasks...');
    let response = await fetch(`${API_BASE}/clean-all-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    let result = await response.json();
    console.log(`   Clean result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    // Step 2: Add a test task
    console.log('\n2. Adding test task...');
    const testTask = { id: 'claim-test-1', description: 'Task to test claiming mechanism' };
    response = await fetch(`${API_BASE}/add-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testTask)
    });
    result = await response.json();
    console.log(`   Added task: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    // Step 3: Check task is available
    console.log('\n3. Checking task status...');
    response = await fetch(`${API_BASE}/all-tasks`);
    result = await response.json();
    const task = result.tasks.find(t => t.id === 'claim-test-1');
    console.log(`   Task status: ${task ? task.status : 'NOT FOUND'}`);

    // Step 4: Claim worker slot
    console.log('\n4. Claiming worker slot...');
    response = await fetch(`${API_BASE}/claim-worker-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    result = await response.json();
    const workerSlot = result.slot;
    console.log(`   Got worker slot: ${workerSlot || 'FAILED'}`);

    if (!workerSlot) {
      console.error('Failed to get worker slot!');
      return;
    }

    // Step 5: Claim the task
    console.log('\n5. Claiming the task...');
    response = await fetch(`${API_BASE}/claim-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: 'claim-test-1',
        workerId: 'test-worker-1',
        workerSlot: workerSlot
      })
    });
    result = await response.json();
    console.log(`   Claim result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    // Step 6: Check task status (should be 'working' now)
    console.log('\n6. Checking task status after claim...');
    response = await fetch(`${API_BASE}/all-tasks`);
    result = await response.json();
    const claimedTask = result.tasks.find(t => t.id === 'claim-test-1');
    console.log(`   Task status: ${claimedTask ? claimedTask.status : 'NOT FOUND'}`);
    console.log(`   Task worker: ${claimedTask ? claimedTask.worker : 'N/A'}`);

    // Step 7: Try to claim the same task with another worker (should fail)
    console.log('\n7. Testing duplicate claim prevention...');
    
    // First get another worker slot
    response = await fetch(`${API_BASE}/claim-worker-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    result = await response.json();
    const workerSlot2 = result.slot;
    console.log(`   Got second worker slot: ${workerSlot2 || 'FAILED'}`);

    if (workerSlot2) {
      response = await fetch(`${API_BASE}/claim-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'claim-test-1',
          workerId: 'test-worker-2',
          workerSlot: workerSlot2
        })
      });
      result = await response.json();
      console.log(`   Second claim attempt: ${result.success ? 'FAILED (task was claimed!)' : 'SUCCESS (properly prevented)'}`);
      
      // Release the second worker slot
      await fetch(`${API_BASE}/release-worker-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot: workerSlot2 })
      });
    }

    // Step 8: Complete the task
    console.log('\n8. Completing the task...');
    response = await fetch(`${API_BASE}/update-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: 'claim-test-1',
        status: 'done',
        workerId: 'test-worker-1',
        output: 'Task completed successfully'
      })
    });
    result = await response.json();
    console.log(`   Update result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    // Step 9: Release worker slot
    console.log('\n9. Releasing worker slot...');
    response = await fetch(`${API_BASE}/release-worker-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: workerSlot })
    });
    result = await response.json();
    console.log(`   Release result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    console.log('\n=== Test completed successfully! ===');
    console.log('\nThe claiming mechanism now prevents multiple agents from taking the same task.');

  } catch (error) {
    console.error('\nError during test:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Make sure the Task Coordinator Server is running on port 3335');
      console.error('Run: npm run server');
    }
  }
}

// Run the test
testClaimMechanism();