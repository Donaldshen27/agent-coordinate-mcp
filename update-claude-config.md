# How to Configure Claude with TASK_COORDINATOR_URL

To configure Claude to use the environment variable `TASK_COORDINATOR_URL`, you need to update your Claude configuration file at `~/.claude.json`.

## Quick Setup (Recommended)

Run the provided Python script to automatically add the task-coordinator MCP server to your global configuration:

```bash
python update-claude-config.py
```

This will make the MCP server available from any directory when you run Claude.

## Manual Configuration

If you prefer to manually configure, add this to the global `mcpServers` section in `~/.claude.json`:

```json
{
  "mcpServers": {
    "task-coordinator": {
      "command": "node",
      "args": [
        "/home/a11a2/projects/agent-coorinate-mcp/dist/index.js"
      ],
      "env": {
        "TASK_COORDINATOR_URL": "http://localhost:3335"
      }
    }
  }
}
```

## Steps to Update:

1. Open your Claude configuration file:
   ```bash
   nano ~/.claude.json
   # or
   vim ~/.claude.json
   # or your preferred editor
   ```

2. Find the `"task-coordinator"` section under `"mcpServers"`

3. Add the `"env"` section after the `"args"` array (don't forget the comma after the closing bracket of args)

4. Save the file

5. Restart Claude Code for the changes to take effect

## Alternative: Using a Different Server URL

If you want to connect to a task coordinator server running on a different machine or port, simply change the URL:
```json
"env": {
  "TASK_COORDINATOR_URL": "http://192.168.1.100:3335"
}
```

## Verification

After restarting Claude Code, the MCP client will attempt to connect to the specified server URL. If the connection fails, you'll see an error message indicating that it cannot connect to the Task Coordinator Server at the specified URL.