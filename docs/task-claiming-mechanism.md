# Task Claiming Mechanism

## Overview

The task coordinator now implements a two-phase claiming mechanism to prevent race conditions where multiple agents might try to work on the same task simultaneously.

## Task Status Lifecycle

Tasks now have the following status progression:

1. **available** - Task is ready to be claimed (all dependencies met)
2. **claimed** - Task has been locked by an agent but work hasn't started yet
3. **working** - Agent is actively working on the task
4. **done** - Task completed successfully
5. **failed** - Task failed and needs to be reset

## How It Works

### Claiming Process

When an agent claims a task:

1. The task status immediately changes from `available` to `claimed`
2. This locks the task, preventing other agents from claiming it
3. The task is then transitioned to `working` status
4. The agent begins actual work on the task

### Benefits

- **Race Condition Prevention**: The atomic claim operation prevents multiple agents from taking the same task
- **Clear Task Ownership**: Each task shows which worker has claimed it
- **Recovery Support**: Claimed but not started tasks can be reset if needed

### API Usage

```javascript
// Claim a task
const success = await client.claimTask(taskId, workerId, workerSlot);

// The task will go through: available -> claimed -> working
```

### Resetting Tasks

The `reset_failed_task` tool now supports resetting both failed AND claimed tasks:

```javascript
// Reset a failed or stuck claimed task
await client.resetFailedTask(taskId);
```

## Database Migration

If you have an existing database, run the migration script:

```bash
node migrate-db-claimed-status.js
```

This will update your database schema to support the new claimed status.

## Testing

Run the test script to verify the claiming mechanism:

```bash
node test-claim-mechanism.js
```

This will demonstrate:
- Task claiming process
- Prevention of duplicate claims
- Proper status transitions