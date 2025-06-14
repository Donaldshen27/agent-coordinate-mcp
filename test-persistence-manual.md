# Testing Database Persistence

## Quick Test Steps

1. **Add a test task:**
```bash
curl -X POST http://localhost:3335/api/add-task \
  -H "Content-Type: application/json" \
  -d '{"id":"test-1","description":"Test task that should persist","dependencies":[]}'
```

2. **Check tasks exist:**
```bash
curl http://localhost:3335/api/all-tasks
```

3. **Stop the server:**
   - Press `Ctrl+C` in the terminal where the server is running

4. **Check database file was created:**
```bash
ls -la task-coordinator.db
```

5. **Restart the server:**
```bash
npm run server
```

6. **Verify tasks persisted:**
```bash
curl http://localhost:3335/api/all-tasks
```

The task "test-1" should still be there!

## Full Workflow Test

```bash
# 1. Add multiple tasks with dependencies
curl -X POST http://localhost:3335/api/add-task \
  -H "Content-Type: application/json" \
  -d '{"id":"setup","description":"Setup environment","dependencies":[]}'

curl -X POST http://localhost:3335/api/add-task \
  -H "Content-Type: application/json" \
  -d '{"id":"build","description":"Build project","dependencies":["setup"]}'

curl -X POST http://localhost:3335/api/add-task \
  -H "Content-Type: application/json" \
  -d '{"id":"test","description":"Run tests","dependencies":["build"]}'

# 2. Claim worker and complete first task
curl -X POST http://localhost:3335/api/claim-worker-slot

# Use the slot number from above (e.g., 1)
curl -X POST http://localhost:3335/api/claim-task \
  -H "Content-Type: application/json" \
  -d '{"taskId":"setup","workerId":"worker-1","workerSlot":1}'

curl -X POST http://localhost:3335/api/update-task \
  -H "Content-Type: application/json" \
  -d '{"taskId":"setup","status":"done","workerId":"worker-1","output":"Environment ready"}'

# 3. Check current state
curl http://localhost:3335/api/all-tasks

# 4. Restart server (Ctrl+C, then npm run server)

# 5. Verify state persisted
curl http://localhost:3335/api/all-tasks
# Should show: setup=done, build=available, test=available (waiting for build)
```

## What to Look For

After restart, you should see:
- All tasks still exist
- Completed tasks remain "done" with their output
- Task dependencies are preserved
- Worker slots are reset (all inactive)

## Database Location

The SQLite database is stored at:
```
./task-coordinator.db
```

You can also inspect it with SQLite:
```bash
sqlite3 task-coordinator.db "SELECT * FROM tasks;"
sqlite3 task-coordinator.db "SELECT * FROM worker_slots;"
```