# Task Coordinator MCP Server

A persistent task coordination server with MCP (Model Context Protocol) client that enables multiple Claude instances to coordinate work on parallel tasks without conflicts. Features SQLite database persistence to maintain task state across server restarts. This solves the critical issue where each Claude instance spawns its own isolated MCP server, preventing proper task synchronization.

## Problem Solved

The default MCP architecture has a critical limitation:
- Each Claude instance spawns its own MCP server
- Multiple Claude instances cannot share state
- Task coordination between instances is impossible

This project solves this by:
- **Standalone Server**: A persistent HTTP/WebSocket server that runs independently
- **MCP Client**: The MCP server acts as a thin client connecting to the standalone server
- **Shared State**: All Claude instances connect to the same server, ensuring synchronized state

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Claude #1      │     │  Claude #2      │     │  Claude #3      │
│  MCP Client     │     │  MCP Client     │     │  MCP Client     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │ HTTP/WS               │ HTTP/WS               │ HTTP/WS
         └───────────────────────┴───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Standalone Server      │
                    │  - Task Manager         │
                    │  - Worker Slots         │
                    │  - Web Dashboard        │
                    │  Port 3335 (API)        │
                    │  Port 3333 (Dashboard)  │
                    └─────────────────────────┘
```

## Features

- **Persistent Server**: Runs independently, maintains state across Claude sessions
- **Database Persistence**: SQLite database preserves tasks and state across server restarts
- **Atomic Operations**: All task claims and updates are atomic, preventing race conditions
- **Worker Slot Management**: Limited worker slots (default 5) to control concurrency
- **Dependency Tracking**: Tasks can depend on other tasks being completed first
- **Real-time Updates**: WebSocket support for live updates across all clients
- **Web Dashboard**: Visual monitoring of tasks and workers at http://localhost:3333
- **Failure Recovery**: Failed tasks can be reset to available
- **Automatic Schema Creation**: Database tables are created automatically on first run

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/agent-coordinate-mcp.git
cd agent-coordinate-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Start the Standalone Server

```bash
# Start the server (required before using with Claude)
npm run server

# Or use the start script
./start-server.sh
```

The server will start on:
- **API**: http://localhost:3335
- **Dashboard**: http://localhost:3333

### 3. Configure Claude Code

You can either:

**Option A: Use the automated script**
```bash
./update-claude-config.py
```

**Option B: Manually edit `~/.claude.json`**

Find your project's `task-coordinator` configuration and add the `env` section:

```json
"task-coordinator": {
  "command": "node",
  "args": [
    "/path/to/agent-coordinate-mcp/dist/index.js"
  ],
  "env": {
    "TASK_COORDINATOR_URL": "http://localhost:3335"
  }
}
```

### 4. Restart Claude Code

After configuration, restart Claude Code for the changes to take effect.

## Usage

### Available MCP Tools

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

### Example Workflow

**Claude Instance 1:**
```typescript
// Worker 1 starts
const slot1 = await claim_worker_slot(); // Returns 1
const tasks = await get_available_tasks();
await claim_task('TASK-001', 'worker-1', slot1);
// ... do work ...
await update_task('TASK-001', 'done', 'worker-1', 'Completed successfully');
await release_worker_slot(slot1);
```

**Claude Instance 2 (running concurrently):**
```typescript
// Worker 2 runs in a different Claude instance
const slot2 = await claim_worker_slot(); // Returns 2
const tasks = await get_available_tasks(); // Won't show TASK-001 (already claimed)
await claim_task('TASK-002', 'worker-2', slot2);
```

### Setting Up Tasks with Dependencies

```typescript
// Phase 1: Setup tasks
await add_task('setup-project', 'Initialize Next.js project');
await add_task('setup-db', 'Set up Prisma with SQLite');
await add_task('setup-env', 'Create environment configuration');

// Phase 2: Feature tasks (depend on setup)
await add_task('auth-api', 'Implement auth API routes', ['setup-project', 'setup-db']);
await add_task('auth-ui', 'Create login pages', ['setup-project']);
await add_task('auth-context', 'Build auth context', ['auth-api', 'auth-ui']);
```

## Web Dashboard

Access the real-time dashboard at http://localhost:3333 to:
- Monitor worker slot usage
- View task status and progress
- Filter tasks by status
- Add new tasks through the UI
- See live updates as tasks are claimed and completed

## Project Structure

```
agent-coordinate-mcp/
├── src/
│   ├── index.ts           # MCP client that connects to standalone server
│   ├── standaloneServer.ts # Persistent HTTP/WebSocket server
│   ├── httpClient.ts      # HTTP client for server communication
│   ├── taskManager.ts     # Core task management logic (in-memory)
│   ├── taskManagerWithDB.ts # Task manager with database persistence
│   ├── database.ts        # SQLite database operations
│   ├── webServer.ts       # Web dashboard server
│   └── types.ts           # TypeScript type definitions
├── public/                # Web dashboard files
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── dist/                  # Compiled JavaScript (after build)
├── task-coordinator.db    # SQLite database (created automatically)
├── start-server.sh        # Script to start the standalone server
└── update-claude-config.py # Script to update Claude configuration
```

## Troubleshooting

### "Cannot connect to Task Coordinator Server"
- Ensure the standalone server is running: `npm run server`
- Check if the server is accessible: `curl http://localhost:3335/api/health`
- Verify the `TASK_COORDINATOR_URL` in your Claude config

### MCP Server shows as "failed" in Claude
- Make sure you've added the `TASK_COORDINATOR_URL` environment variable
- Restart Claude Code completely (not just reload)
- Check logs in `~/.cache/claude-cli-nodejs/`

### Multiple Instances Not Synchronizing
- Confirm all Claude instances have the same `TASK_COORDINATOR_URL`
- Check the web dashboard to see if connections are being made
- Verify the server logs for any errors

### Port Already in Use
- The standalone server uses port 3335 by default
- The web dashboard uses port 3333
- Change ports with environment variables if needed

## Development

```bash
# Run tests
npm test

# Development mode (MCP client)
npm run dev

# Development mode (Standalone server)
npm run server:dev

# Build the project
npm run build
```

## Configuration

### Environment Variables

- `TASK_COORDINATOR_URL`: URL of the standalone server (default: `http://localhost:3335`)
- `PORT`: Port for the standalone server API (default: `3335`)

### Running on Different Ports

If you need to use different ports:

1. Start server on a different port:
   ```bash
   PORT=8080 npm run server
   ```

2. Update Claude configuration:
   ```json
   "env": {
     "TASK_COORDINATOR_URL": "http://localhost:8080"
   }
   ```

### Remote Server Setup

To run the coordinator on a different machine:

1. Start server on the remote machine:
   ```bash
   npm run server
   ```

2. Update Claude configuration on client machines:
   ```json
   "env": {
     "TASK_COORDINATOR_URL": "http://192.168.1.100:3335"
   }
   ```

## Benefits

1. **True Multi-Instance Coordination**: All Claude instances share the same state
2. **Persistent State**: Server maintains state between Claude sessions
3. **No Race Conditions**: Atomic operations at the server level
4. **Scalability**: Can be extended to support multiple machines
5. **Real-time Monitoring**: Web dashboard provides visibility into task progress
6. **Dependency Management**: Tasks wait for their dependencies to complete
7. **Failure Recovery**: Failed tasks can be reset and retried

## Database Persistence

The task coordinator now includes SQLite database persistence:

- Tasks and their states are automatically saved to `task-coordinator.db`
- Server can be restarted without losing task data
- Worker slots are properly reset on restart
- Database schema is created automatically on first run

For more details, see [Database Persistence Documentation](docs/database-persistence.md).

## Future Enhancements

- [x] Persistent storage (SQLite) - **Implemented!**
- [ ] PostgreSQL support for larger deployments
- [ ] Task priorities and deadlines
- [ ] Worker heartbeats and automatic timeout
- [ ] Task history and audit logs
- [ ] Authentication and access control
- [ ] Task templates and bulk operations
- [ ] Performance metrics and analytics
- [ ] Distributed server clustering
- [ ] Database backup and restore
- [ ] Data retention policies

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details