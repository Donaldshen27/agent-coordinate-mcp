#!/usr/bin/env python3
import json
import os
import sys

# Path to Claude config file
config_path = os.path.expanduser("~/.claude.json")

# Check if config file exists
if not os.path.exists(config_path):
    print(f"Error: Claude config file not found at {config_path}")
    sys.exit(1)

# Read the config
with open(config_path, 'r') as f:
    config = json.load(f)

# Ensure mcpServers exists at the global level
if 'mcpServers' not in config:
    config['mcpServers'] = {}

# Get the current project directory
current_dir = os.path.abspath(os.path.dirname(__file__))

# Define the task-coordinator configuration
task_coordinator_config = {
    "command": "node",
    "args": [
        os.path.join(current_dir, "dist", "index.js")
    ],
    "env": {
        "TASK_COORDINATOR_URL": "http://localhost:3335"
    }
}

# Add or update the global task-coordinator configuration
config['mcpServers']['task-coordinator'] = task_coordinator_config

# Write the updated config back
with open(config_path, 'w') as f:
    json.dump(config, f, indent=2)

print("✓ Successfully updated Claude global configuration")
print(f"  Added task-coordinator MCP server globally")
print(f"  Command: node {os.path.join(current_dir, 'dist', 'index.js')}")
print(f"  Environment: TASK_COORDINATOR_URL=http://localhost:3335")
print("\nThe task-coordinator MCP server is now available globally.")
print("You can run Claude from any directory and the MCP server will be available.")
print("\nPlease restart Claude Code for the changes to take effect.")