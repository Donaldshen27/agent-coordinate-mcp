#!/usr/bin/env node

// Test script for clean_all_tasks functionality
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3335/api';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCleanAllTasks() {
  console.log('=== Testing clean_all_tasks functionality ===\n');

  try {
    // Step 1: Add some test tasks
    console.log('1. Adding test tasks...');
    const tasks = [
      { id: 'test-task-1', description: 'First test task' },
      { id: 'test-task-2', description: 'Second test task', dependencies: ['test-task-1'] },
      { id: 'test-task-3', description: 'Third test task' }
    ];

    for (const task of tasks) {
      const response = await fetch(`${API_BASE}/add-task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task)
      });
      const result = await response.json();
      console.log(`   Added task ${task.id}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    }

    // Step 2: Check current tasks
    console.log('\n2. Current tasks before cleaning:');
    let response = await fetch(`${API_BASE}/all-tasks`);
    let result = await response.json();
    console.log(`   Total tasks: ${result.tasks.length}`);
    result.tasks.forEach(task => {
      console.log(`   - ${task.id}: ${task.description} (${task.status})`);
    });

    // Step 3: Clean all tasks
    console.log('\n3. Cleaning all tasks...');
    response = await fetch(`${API_BASE}/clean-all-tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    result = await response.json();
    console.log(`   Clean result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

    // Step 4: Verify tasks are cleaned
    console.log('\n4. Tasks after cleaning:');
    response = await fetch(`${API_BASE}/all-tasks`);
    result = await response.json();
    console.log(`   Total tasks: ${result.tasks.length}`);
    if (result.tasks.length === 0) {
      console.log('   ✓ All tasks successfully cleaned!');
    } else {
      console.log('   ✗ Some tasks remain!');
      result.tasks.forEach(task => {
        console.log(`   - ${task.id}: ${task.description} (${task.status})`);
      });
    }

    // Step 5: Check worker slots are reset
    console.log('\n5. Checking worker slots:');
    response = await fetch(`${API_BASE}/workers`);
    result = await response.json();
    const activeWorkers = result.workers.filter(w => w.active);
    console.log(`   Total workers: ${result.workers.length}`);
    console.log(`   Active workers: ${activeWorkers.length}`);
    if (activeWorkers.length === 0) {
      console.log('   ✓ All worker slots successfully reset!');
    } else {
      console.log('   ✗ Some workers are still active!');
    }

    console.log('\n=== Test completed successfully! ===');

  } catch (error) {
    console.error('\nError during test:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('Make sure the Task Coordinator Server is running on port 3335');
      console.error('Run: npm run server');
    }
  }
}

// Run the test
testCleanAllTasks();