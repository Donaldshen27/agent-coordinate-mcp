#!/bin/bash
# Terminal-based visual dashboard for task coordinator

# Check if server is running
if ! curl -s http://localhost:3335/api/health > /dev/null 2>&1; then
    echo "❌ Server is not running!"
    echo "Start it with: npm run server"
    exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear
while true; do
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║              TASK COORDINATOR VISUAL MONITOR               ║"
    echo "╠════════════════════════════════════════════════════════════╣"
    echo "║ Time: $(date '+%Y-%m-%d %H:%M:%S')                              ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    echo "👷 WORKER SLOTS:"
    echo "────────────────"
    curl -s http://localhost:3335/api/workers 2>/dev/null | \
        python3 -c "
import json, sys
data = json.load(sys.stdin)
for w in data.get('workers', []):
    status = '🟢 ACTIVE' if w['active'] else '⚪ FREE'
    worker = f\"({w.get('workerId', '')})\" if w.get('workerId') else ''
    print(f\"  Slot {w['slot']}: {status} {worker}\")
" || echo "  Error loading workers"
    
    echo ""
    echo "📋 TASKS:"
    echo "─────────"
    curl -s http://localhost:3335/api/all-tasks 2>/dev/null | \
        python3 -c "
import json, sys
data = json.load(sys.stdin)
tasks = data.get('tasks', [])
if not tasks:
    print('  No tasks yet - add some to test persistence!')
else:
    for t in tasks:
        status = t['status']
        if status == 'available':
            icon = '🔵'
        elif status == 'working':
            icon = '🟡'
        elif status == 'done':
            icon = '🟢'
        elif status == 'failed':
            icon = '🔴'
        else:
            icon = '⚪'
        deps = f\" (deps: {','.join(t['dependencies'])})\" if t['dependencies'] else ''
        print(f\"  {icon} [{status.upper():9}] {t['id']}: {t['description']}{deps}\")
" || echo "  Error loading tasks"
    
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "💡 Quick Commands:"
    echo "  Add task:  curl -X POST http://localhost:3335/api/add-task -H \"Content-Type: application/json\" -d '{\"id\":\"test\",\"description\":\"Test task\",\"dependencies\":[]}''"
    echo "  Web UI:    http://localhost:3333"
    echo ""
    echo "Press Ctrl+C to exit | Refreshing every 2 seconds..."
    sleep 2
    clear
done