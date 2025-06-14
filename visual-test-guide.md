# Visual Testing Guide for Database Persistence

## Method 1: Web Dashboard (Easiest)

1. **Start the server:**
   ```bash
   npm run server
   ```

2. **Open the dashboard:**
   - Navigate to http://localhost:3333 in your browser
   - You'll see the live task and worker status

3. **Add test tasks through the dashboard:**
   - Use the "Add Task" form at the top
   - Create tasks like:
     - ID: `test-1`, Description: `First test task`
     - ID: `test-2`, Description: `Second task`, Dependencies: `test-1`
     - ID: `test-3`, Description: `Third task`

4. **Watch the visual state:**
   - Tasks appear in real-time
   - Worker slots show as active/inactive
   - Task status changes color (blue=available, yellow=working, green=done, red=failed)

5. **Test persistence:**
   - Stop the server (Ctrl+C in terminal)
   - Refresh the browser (it will show disconnected)
   - Restart server: `npm run server`
   - Refresh browser again - **all tasks should still be there!**

## Method 2: Terminal with JSON Viewer

1. **Install jq for pretty JSON** (if not installed):
   ```bash
   # Ubuntu/Debian
   sudo apt-get install jq
   
   # macOS
   brew install jq
   ```

2. **Run visual test commands:**
   ```bash
   # Watch tasks in real-time (run in separate terminal)
   watch -n 1 'curl -s http://localhost:3335/api/all-tasks | jq ".tasks[] | {id, status, description}"'
   ```

3. **Add and modify tasks in another terminal:**
   ```bash
   # Add tasks
   curl -X POST http://localhost:3335/api/add-task \
     -H "Content-Type: application/json" \
     -d '{"id":"visual-1","description":"Task visible in terminal","dependencies":[]}'
   
   # See the update in your watch terminal!
   ```

## Method 3: Database Browser

1. **Install SQLite browser:**
   - Download from https://sqlitebrowser.org/
   - Or use command line: `sudo apt-get install sqlitebrowser`

2. **Open the database:**
   - File → Open Database
   - Select `task-coordinator.db` in your project folder

3. **Browse visually:**
   - Click "Browse Data" tab
   - Select "tasks" table
   - You can see all task data, timestamps, etc.
   - Refresh to see changes after operations

## Method 4: Interactive Terminal Dashboard

Create this script for a terminal-based dashboard:

```bash
#!/bin/bash
# save as: visual-test.sh

clear
while true; do
    echo "==== TASK COORDINATOR STATUS ===="
    echo "Time: $(date)"
    echo ""
    
    echo "WORKERS:"
    curl -s http://localhost:3335/api/workers | \
        jq -r '.workers[] | "  Slot \(.slot): \(if .active then "ACTIVE" else "FREE" end) \(.workerId // "")"'
    
    echo ""
    echo "TASKS:"
    curl -s http://localhost:3335/api/all-tasks | \
        jq -r '.tasks[] | "  [\(.status | ascii_upcase)] \(.id): \(.description)"'
    
    echo ""
    echo "Press Ctrl+C to exit, refreshing every 2 seconds..."
    sleep 2
    clear
done
```

Make it executable: `chmod +x visual-test.sh`
Run it: `./visual-test.sh`

## Quick Visual Test Workflow

1. **Terminal 1 - Server:**
   ```bash
   npm run server
   ```

2. **Terminal 2 - Dashboard:**
   ```bash
   ./visual-test.sh  # or use the watch command
   ```

3. **Terminal 3 - Add tasks:**
   ```bash
   # Add parent task
   curl -X POST http://localhost:3335/api/add-task \
     -H "Content-Type: application/json" \
     -d '{"id":"parent","description":"Parent task","dependencies":[]}'
   
   # Add child task
   curl -X POST http://localhost:3335/api/add-task \
     -H "Content-Type: application/json" \
     -d '{"id":"child","description":"Child depends on parent","dependencies":["parent"]}'
   ```

4. **Browser - Web Dashboard:**
   - Open http://localhost:3333
   - See tasks appear in real-time
   - Watch colors change as tasks progress

5. **Test persistence:**
   - Kill server (Ctrl+C in Terminal 1)
   - Dashboard shows disconnected
   - Restart server
   - Everything reappears!

## Visual Indicators

### Web Dashboard Colors:
- **Blue**: Available task
- **Yellow**: Task being worked on
- **Green**: Completed task
- **Red**: Failed task
- **Gray**: Task waiting for dependencies

### Worker Slots:
- **Green dot**: Active/claimed
- **Gray dot**: Available
- Shows worker ID when claimed

### Real-time Updates:
- Tasks appear instantly when added
- Status changes immediately
- Worker claims show in real-time
- Multiple browsers stay in sync