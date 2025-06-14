#!/bin/bash
# Quick visual test for database persistence

echo "🧪 QUICK VISUAL PERSISTENCE TEST"
echo "================================"
echo

# Step 1: Add test data
echo "1️⃣ Adding test tasks..."
curl -s -X POST http://localhost:3335/api/add-task \
  -H "Content-Type: application/json" \
  -d '{"id":"persist-test-1","description":"Task that should survive restart","dependencies":[]}' \
  && echo " ✓ Added persist-test-1"

curl -s -X POST http://localhost:3335/api/add-task \
  -H "Content-Type: application/json" \
  -d '{"id":"persist-test-2","description":"Another persistent task","dependencies":["persist-test-1"]}' \
  && echo " ✓ Added persist-test-2"

# Step 2: Show current state
echo
echo "2️⃣ Current tasks (BEFORE restart):"
curl -s http://localhost:3335/api/all-tasks | python3 -c "
import json, sys
data = json.load(sys.stdin)
for t in data.get('tasks', []):
    print(f\"   - {t['id']}: {t['status']} - {t['description']}\")
"

echo
echo "3️⃣ Database file created:"
ls -lh task-coordinator.db 2>/dev/null && echo "   ✓ Database exists!" || echo "   ❌ No database found"

echo
echo "═══════════════════════════════════════════════════════════"
echo "📋 NEXT STEPS TO TEST PERSISTENCE:"
echo "═══════════════════════════════════════════════════════════"
echo
echo "1. Stop the server:     Press Ctrl+C in the server terminal"
echo "2. Restart the server:  npm run server"
echo "3. Check persistence:   ./quick-visual-test.sh --check"
echo
echo "Or open the web dashboard: http://localhost:3333"
echo "Tasks should still be there after restart! 🎉"

# Check mode
if [ "$1" = "--check" ]; then
    echo
    echo "🔍 Checking persisted tasks (AFTER restart):"
    curl -s http://localhost:3335/api/all-tasks | python3 -c "
import json, sys
data = json.load(sys.stdin)
tasks = data.get('tasks', [])
found = [t for t in tasks if t['id'].startswith('persist-test-')]
if found:
    print('✅ SUCCESS! Tasks persisted:')
    for t in found:
        print(f\"   - {t['id']}: {t['status']} - {t['description']}\")
else:
    print('❌ No persisted tasks found - did you restart the server?')
"
fi