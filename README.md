# Task Coordinator MCP Server

An MCP (Model Context Protocol) server that enables multiple Claude Code instances to coordinate work on parallel tasks without conflicts. This solves the race condition issues inherent in file-based coordination systems.

## Problem Solved

When running multiple Claude Code instances on the same project, you need a way to:
- Prevent duplicate work on the same task
- Manage worker slots atomically
- Track task dependencies
- Handle failures gracefully

This MCP server provides atomic operations for task coordination, eliminating race conditions that occur with simple file-based approaches.

## Features

- **Atomic Operations**: All task claims and updates are atomic, preventing race conditions
- **Worker Slot Management**: Limited worker slots (default 5) to control concurrency
- **Dependency Tracking**: Tasks can depend on other tasks being completed first
- **Task States**: Available, Working, Done, or Failed
- **Failure Recovery**: Failed tasks can be reset to available
- **Lock-based Concurrency**: Internal locking ensures thread-safe operations

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd agent-coordinate-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### 1. Configure Claude Code

Add to your Claude Code settings:

```json
{
  "mcpServers": {
    "task-coordinator": {
      "command": "node",
      "args": ["/path/to/agent-coordinate-mcp/dist/index.js"]
    }
  }
}
```

### 2. Web Dashboard (Optional)

The server includes a web dashboard for visualizing tasks and workers in real-time.

To run with the web interface:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start with web dashboard
npm run start:web

# Or in development mode
npm run dev:web
```

Then open http://localhost:3333 in your browser.

Features:
- Real-time visualization of worker slots
- Task status monitoring with filtering
- Add new tasks through the UI
- WebSocket updates for live changes
- Connection status indicator

### 3. Available Tools

The MCP server provides these tools:

#### Worker Management
- `claim_worker_slot()` - Claim an available worker slot
- `release_worker_slot(slot)` - Release a worker slot when done
- `get_workers()` - View all worker slots and their status

#### Task Management
- `add_task(id, description, dependencies?, output?)` - Add a new task
- `get_available_tasks()` - Get tasks ready to work on
- `get_all_tasks()` - View all tasks and their status
- `claim_task(taskId, workerId, workerSlot)` - Claim a task
- `update_task(taskId, status, workerId, output?, error?)` - Update task status
- `reset_failed_task(taskId)` - Reset a failed task to available

### 4. Example Workflow

```typescript
// Worker 1 starts
const slot1 = await claim_worker_slot(); // Returns 1
const tasks = await get_available_tasks();
await claim_task('TASK-001', 'worker-1', slot1);
// ... do work ...
await update_task('TASK-001', 'done', 'worker-1', 'Completed successfully');

// Worker 2 runs concurrently
const slot2 = await claim_worker_slot(); // Returns 2
const tasks = await get_available_tasks(); // Won't show TASK-001
await claim_task('TASK-002', 'worker-2', slot2);
```

### 5. Setting Up Tasks

Example task structure for building a todo app:

```typescript
// Phase 1: Setup
await add_task('TASK-001', 'Initialize Next.js project', []);
await add_task('TASK-002', 'Set up Prisma with SQLite', []);
await add_task('TASK-003', 'Create environment configuration', []);

// Phase 2: Features (depend on setup)
await add_task('TASK-004', 'Implement auth API routes', ['TASK-001', 'TASK-002']);
await add_task('TASK-005', 'Create login pages', ['TASK-001']);
await add_task('TASK-006', 'Build auth context', ['TASK-004', 'TASK-005']);
```

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Development mode
npm run dev
```

## Architecture

The server uses a lock-based approach to ensure atomic operations:

1. **Lock Manager**: Each operation acquires a lock before modifying state
2. **Task Manager**: Handles all task and worker operations atomically
3. **MCP Interface**: Exposes tools via the Model Context Protocol

## Benefits Over File-Based Coordination

1. **No Race Conditions**: Atomic operations prevent conflicts
2. **Immediate Consistency**: No file system delays or caching issues
3. **Better Performance**: In-memory operations are faster than file I/O
4. **Reliable State**: No partial writes or corrupted states

## Testing

The project includes comprehensive tests covering:
- Concurrent worker slot claims
- Concurrent task claims
- Dependency resolution
- Failure scenarios
- Complex multi-level dependencies

Run tests with: `npm test`

## Limitations

- State is in-memory only (resets on server restart)
- Maximum 5 concurrent workers by default (configurable)
- No persistence between sessions

## Future Enhancements

- Persistent state storage
- Task priorities
- Worker heartbeats
- Task timeouts
- Metrics and logging