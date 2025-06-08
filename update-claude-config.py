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

# Find all projects with task-coordinator
updated = False
if 'projects' in config:
    for project_path, project_config in config['projects'].items():
        if 'mcpServers' in project_config and 'task-coordinator' in project_config['mcpServers']:
            # Update or create the env section
            if 'env' not in project_config['mcpServers']['task-coordinator']:
                project_config['mcpServers']['task-coordinator']['env'] = {}
            
            project_config['mcpServers']['task-coordinator']['env']['TASK_COORDINATOR_URL'] = 'http://localhost:3335'
            print(f"✓ Updated task-coordinator in project: {project_path}")
            updated = True

if updated:
    # Write the updated config back
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    print("\n✓ Successfully updated Claude configuration")
    print("  Added TASK_COORDINATOR_URL=http://localhost:3335")
    print("\nPlease restart Claude Code for the changes to take effect.")
else:
    print("Error: task-coordinator not found in any project configuration")
    sys.exit(1)