# Database Persistence

The Task Coordinator now includes SQLite database persistence, ensuring that tasks and their states are preserved across server restarts.

## Features

- **Automatic Database Creation**: The SQLite database is automatically created on first run
- **Task Persistence**: All tasks, their states, dependencies, and outputs are saved
- **Worker State Reset**: Worker slots are properly reset on restart while preserving task assignments
- **Transaction Support**: Database operations use transactions to ensure data consistency

## Database Schema

### Tasks Table
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'working', 'done', 'failed')),
  worker TEXT,
  dependencies TEXT,  -- JSON array of task IDs
  output TEXT,
  error TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

### Worker Slots Table
```sql
CREATE TABLE worker_slots (
  slot INTEGER PRIMARY KEY,
  worker_id TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  task_id TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)
```

## Database Location

The database file is stored at:
```
./task-coordinator.db
```

## Architecture Changes

1. **New Database Module** (`src/database.ts`): Handles all database operations with proper error handling and transaction support

2. **TaskManagerWithDB** (`src/taskManagerWithDB.ts`): Enhanced version of TaskManager that persists all operations to the database

3. **Automatic Migration**: On startup, the database schema is automatically created if it doesn't exist

## Benefits

- **Reliability**: Tasks won't be lost if the server crashes or needs to restart
- **State Recovery**: Agents can reconnect and continue where they left off
- **Audit Trail**: Complete history of task execution is preserved
- **Scalability**: Foundation for future distributed task coordination

## Testing Persistence

To verify persistence is working:

1. Add tasks to the system
2. Complete some tasks
3. Stop the server (Ctrl+C)
4. Restart the server (`npm run server`)
5. Check that tasks are still present with their states preserved

See `test-persistence-manual.md` for detailed testing instructions.

## Future Enhancements

- Add data retention policies
- Implement task archiving
- Add database backup/restore functionality
- Support for multiple database backends