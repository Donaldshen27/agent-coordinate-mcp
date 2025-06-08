# Example Usage: Building a Todo App with Multiple Claude Code Instances

This example shows how to use the Task Coordinator MCP to build a todo app with 3 Claude Code instances working in parallel.

## Setup

1. Start the MCP server (configured in Claude Code settings)
2. Create your task list
3. Launch multiple Claude Code instances

## Creating Tasks

```typescript
// Claude Instance 1: Create all tasks
const tasks = [
  // Infrastructure
  { id: 'TASK-001', desc: 'Initialize Next.js with TypeScript', deps: [] },
  { id: 'TASK-002', desc: 'Setup Prisma with SQLite', deps: [] },
  { id: 'TASK-003', desc: 'Configure environment variables', deps: [] },
  
  // Auth (depends on infrastructure)
  { id: 'TASK-004', desc: 'Create auth API routes', deps: ['TASK-001', 'TASK-002'] },
  { id: 'TASK-005', desc: 'Build login/register pages', deps: ['TASK-001'] },
  { id: 'TASK-006', desc: 'Implement auth context', deps: ['TASK-004', 'TASK-005'] },
  
  // Todos (depends on auth)
  { id: 'TASK-007', desc: 'Create todo API endpoints', deps: ['TASK-002', 'TASK-004'] },
  { id: 'TASK-008', desc: 'Build todo UI components', deps: ['TASK-001'] },
  { id: 'TASK-009', desc: 'Create dashboard page', deps: ['TASK-006', 'TASK-007', 'TASK-008'] },
  
  // Polish
  { id: 'TASK-010', desc: 'Add loading/error states', deps: ['TASK-009'] },
  { id: 'TASK-011', desc: 'Write tests', deps: ['TASK-009'] },
  { id: 'TASK-012', desc: 'Create documentation', deps: ['TASK-011'] }
];

// Add all tasks
for (const task of tasks) {
  await add_task(task.id, task.desc, task.deps);
}
```

## Worker Instances

### Claude Instance 1
```typescript
// Claim worker slot
const slot = await claim_worker_slot(); // Gets slot 1

// Check available tasks
const available = await get_available_tasks();
// Returns: TASK-001, TASK-002, TASK-003 (no dependencies)

// Claim and work on TASK-001
await claim_task('TASK-001', 'claude-1', slot);
// ... creates Next.js project ...
await update_task('TASK-001', 'done', 'claude-1', 'Created Next.js app');

// Get next task
const next = await get_available_tasks();
// Now includes TASK-005 (since TASK-001 is done)
```

### Claude Instance 2
```typescript
// Claim worker slot
const slot = await claim_worker_slot(); // Gets slot 2

// Work on TASK-002 in parallel
await claim_task('TASK-002', 'claude-2', slot);
// ... sets up Prisma ...
await update_task('TASK-002', 'done', 'claude-2', 'Prisma configured');

// This unlocks TASK-004 and TASK-007
```

### Claude Instance 3
```typescript
// Claim worker slot
const slot = await claim_worker_slot(); // Gets slot 3

// Work on TASK-003
await claim_task('TASK-003', 'claude-3', slot);
// ... configures .env ...
await update_task('TASK-003', 'done', 'claude-3', 'Environment configured');
```

## Coordination Benefits

1. **No Conflicts**: If two instances try to claim TASK-001, only one succeeds
2. **Dependency Aware**: TASK-004 won't appear until TASK-001 and TASK-002 are done
3. **Clear Progress**: Use `get_all_tasks()` to see overall progress
4. **Failure Handling**: If a task fails, use `reset_failed_task()` to retry

## Monitoring Progress

```typescript
// Check overall status
const allTasks = await get_all_tasks();
const workers = await get_workers();

// Example output:
{
  tasks: [
    { id: 'TASK-001', status: 'done', worker: 'claude-1' },
    { id: 'TASK-002', status: 'working', worker: 'claude-2' },
    { id: 'TASK-003', status: 'working', worker: 'claude-3' },
    { id: 'TASK-004', status: 'available', dependencies: ['TASK-001', 'TASK-002'] },
    // ...
  ],
  workers: [
    { slot: 1, active: true, workerId: 'claude-1', taskId: 'TASK-005' },
    { slot: 2, active: true, workerId: 'claude-2', taskId: 'TASK-002' },
    { slot: 3, active: true, workerId: 'claude-3', taskId: 'TASK-003' },
    { slot: 4, active: false },
    { slot: 5, active: false }
  ]
}
```

## Best Practices

1. **Release Slots**: When done with all work, release your slot
2. **Handle Failures**: Check for failed tasks and reset them
3. **Check Dependencies**: Tasks appear in `get_available_tasks()` only when ready
4. **Use Descriptive IDs**: Makes monitoring easier
5. **Add Output Info**: Include useful info in task updates for debugging