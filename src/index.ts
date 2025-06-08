#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { TaskManager } from './taskManager.js';
import { Task, TaskUpdate } from './types.js';
import { WebServer } from './webServer.js';

const taskManager = new TaskManager(5);
let webServer: WebServer | null = null;

// Always start web server when running as MCP server
// Can be disabled with --no-web flag
const disableWeb = process.argv.includes('--no-web');
const portArg = process.argv.find(arg => arg.startsWith('--port='));
const port = portArg ? parseInt(portArg.split('=')[1]) : 3334;

if (!disableWeb) {
  try {
    webServer = new WebServer(taskManager, port);
    webServer.start();
  } catch (error) {
    // Log error but continue running the MCP server
    console.error('[ERROR] Failed to initialize web server:', error);
    console.error('[ERROR] The MCP server will continue without the web dashboard.');
    webServer = null;
  }
}

const server = new Server(
  {
    name: 'task-coordinator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'claim_worker_slot',
        description: 'Claim an available worker slot. Returns the slot number or null if none available.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'release_worker_slot',
        description: 'Release a worker slot when done with all tasks.',
        inputSchema: {
          type: 'object',
          properties: {
            slot: {
              type: 'number',
              description: 'The worker slot number to release',
            },
          },
          required: ['slot'],
        },
      },
      {
        name: 'get_available_tasks',
        description: 'Get all available tasks that have their dependencies met.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'claim_task',
        description: 'Claim a specific task for a worker.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the task to claim',
            },
            workerId: {
              type: 'string',
              description: 'The ID of the worker claiming the task',
            },
            workerSlot: {
              type: 'number',
              description: 'The worker slot number',
            },
          },
          required: ['taskId', 'workerId', 'workerSlot'],
        },
      },
      {
        name: 'update_task',
        description: 'Update the status of a task (mark as done or failed).',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the task to update',
            },
            status: {
              type: 'string',
              enum: ['done', 'failed'],
              description: 'The new status of the task',
            },
            workerId: {
              type: 'string',
              description: 'The ID of the worker updating the task',
            },
            output: {
              type: 'string',
              description: 'Optional output information',
            },
            error: {
              type: 'string',
              description: 'Optional error information (for failed tasks)',
            },
          },
          required: ['taskId', 'status', 'workerId'],
        },
      },
      {
        name: 'add_task',
        description: 'Add a new task to the system.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique task ID',
            },
            description: {
              type: 'string',
              description: 'Task description',
            },
            dependencies: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of task IDs this task depends on',
            },
            output: {
              type: 'string',
              description: 'Expected output description',
            },
          },
          required: ['id', 'description'],
        },
      },
      {
        name: 'get_all_tasks',
        description: 'Get the current state of all tasks.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_workers',
        description: 'Get the current state of all worker slots.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'reset_failed_task',
        description: 'Reset a failed task back to available status.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the failed task to reset',
            },
          },
          required: ['taskId'],
        },
      },
    ],
  };
});

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'claim_worker_slot': {
        const slot = await taskManager.claimWorkerSlot();
        if (slot !== null && webServer) {
          await webServer.broadcastUpdate();
        }
        return {
          content: [
            {
              type: 'text',
              text: slot !== null 
                ? `Successfully claimed worker slot ${slot}`
                : 'No available worker slots',
            },
          ],
          isError: slot === null,
        };
      }

      case 'release_worker_slot': {
        const { slot } = args as { slot: number };
        await taskManager.releaseWorkerSlot(slot);
        if (webServer) {
          webServer.broadcastUpdate();
        }
        return {
          content: [
            {
              type: 'text',
              text: `Released worker slot ${slot}`,
            },
          ],
        };
      }

      case 'get_available_tasks': {
        const tasks = await taskManager.getAvailableTasks();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }

      case 'claim_task': {
        const { taskId, workerId, workerSlot } = args as {
          taskId: string;
          workerId: string;
          workerSlot: number;
        };
        const success = await taskManager.claimTask(taskId, workerId, workerSlot);
        if (success && webServer) {
          webServer.broadcastUpdate();
        }
        return {
          content: [
            {
              type: 'text',
              text: success
                ? `Successfully claimed task ${taskId} for worker ${workerId}`
                : `Failed to claim task ${taskId}`,
            },
          ],
          isError: !success,
        };
      }

      case 'update_task': {
        const { taskId, status, workerId, output, error } = args as {
          taskId: string;
          status: 'done' | 'failed';
          workerId: string;
          output?: string;
          error?: string;
        };
        const update: TaskUpdate = { taskId, status, workerId, output, error };
        const success = await taskManager.updateTask(update);
        if (success && webServer) {
          webServer.broadcastUpdate();
        }
        return {
          content: [
            {
              type: 'text',
              text: success
                ? `Successfully updated task ${taskId} to ${status}`
                : `Failed to update task ${taskId}`,
            },
          ],
          isError: !success,
        };
      }

      case 'add_task': {
        const { id, description, dependencies = [], output } = args as {
          id: string;
          description: string;
          dependencies?: string[];
          output?: string;
        };
        const task: Task = {
          id,
          description,
          status: 'available',
          dependencies,
          output,
        };
        await taskManager.addTask(task);
        if (webServer) {
          webServer.broadcastUpdate();
        }
        return {
          content: [
            {
              type: 'text',
              text: `Added task ${id}`,
            },
          ],
        };
      }

      case 'get_all_tasks': {
        const tasks = await taskManager.getTasks();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tasks, null, 2),
            },
          ],
        };
      }

      case 'get_workers': {
        const workers = await taskManager.getWorkers();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(workers, null, 2),
            },
          ],
        };
      }

      case 'reset_failed_task': {
        const { taskId } = args as { taskId: string };
        const success = await taskManager.resetFailedTask(taskId);
        if (success && webServer) {
          webServer.broadcastUpdate();
        }
        return {
          content: [
            {
              type: 'text',
              text: success
                ? `Reset task ${taskId} to available`
                : `Failed to reset task ${taskId}`,
            },
          ],
          isError: !success,
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP servers should not output to stderr unless there's an error
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});