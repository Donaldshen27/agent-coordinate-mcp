#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { TaskManagerWithDB } from './taskManagerWithDB.js';
import { Task, TaskUpdate } from './types.js';
import { WebServer } from './webServer.js';

const DEFAULT_PORT = 3335;
const MAX_WORKERS = 5;

const app = express();
app.use(cors());
app.use(express.json());

// Initialize task manager with database
const taskManager = new TaskManagerWithDB(MAX_WORKERS);
let webServer: WebServer;

// Create HTTP server
const server = createServer(app);

// Create WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

// Broadcast updates to all connected clients
async function broadcastUpdate(type: string, data: any) {
  try {
    const workers = await taskManager.getWorkers();
    const tasks = await taskManager.getTasks();
    const message = JSON.stringify({
      type: 'update',
      workers,
      tasks
    });
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
    // Also update web dashboard
    if (webServer) {
      webServer.broadcastUpdate();
    }
  } catch (error) {
    console.error('[ERROR] Failed to broadcast update:', error);
  }
}

// REST API endpoints
app.post('/api/claim-worker-slot', async (req, res) => {
  try {
    const slot = await taskManager.claimWorkerSlot();
    if (slot !== null) {
      broadcastUpdate('worker-claimed', { slot });
      res.json({ success: true, slot });
    } else {
      res.json({ success: false, error: 'No available worker slots' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/release-worker-slot', async (req, res) => {
  try {
    const { slot } = req.body;
    await taskManager.releaseWorkerSlot(slot);
    broadcastUpdate('worker-released', { slot });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/available-tasks', async (req, res) => {
  try {
    const tasks = await taskManager.getAvailableTasks();
    res.json({ success: true, tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/claim-task', async (req, res) => {
  try {
    const { taskId, workerId, workerSlot } = req.body;
    const success = await taskManager.claimTask(taskId, workerId, workerSlot);
    if (success) {
      broadcastUpdate('task-claimed', { taskId, workerId, workerSlot });
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Failed to claim task' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/update-task', async (req, res) => {
  try {
    const update: TaskUpdate = req.body;
    const success = await taskManager.updateTask(update);
    if (success) {
      broadcastUpdate('task-updated', update);
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Failed to update task' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/add-task', async (req, res) => {
  try {
    const task: Task = {
      ...req.body,
      status: 'available'
    };
    await taskManager.addTask(task);
    broadcastUpdate('task-added', task);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/all-tasks', async (req, res) => {
  try {
    const tasks = await taskManager.getTasks();
    res.json({ success: true, tasks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/workers', async (req, res) => {
  try {
    const workers = await taskManager.getWorkers();
    res.json({ success: true, workers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/reset-failed-task', async (req, res) => {
  try {
    const { taskId } = req.body;
    const success = await taskManager.resetFailedTask(taskId);
    if (success) {
      broadcastUpdate('task-reset', { taskId });
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Failed to reset task' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/clean-all-tasks', async (req, res) => {
  try {
    await taskManager.cleanAllTasks();
    broadcastUpdate('all-tasks-cleaned', {});
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// WebSocket connection handling
wss.on('connection', async (ws) => {
  console.log('[INFO] New WebSocket client connected');
  
  // Send initial state
  try {
    const workers = await taskManager.getWorkers();
    const tasks = await taskManager.getTasks();
    ws.send(JSON.stringify({
      type: 'initial',
      workers,
      tasks
    }));
  } catch (error) {
    console.error('[ERROR] Failed to send initial state:', error);
  }
  
  ws.on('close', () => {
    console.log('[INFO] WebSocket client disconnected');
  });
});

// Initialize and start server
async function startServer() {
  try {
    await taskManager.initialize();
    
    // Start web dashboard
    webServer = new WebServer(taskManager as any, 3333);
    webServer.start();
    
    // Start main server
    const port = process.env.PORT || DEFAULT_PORT;
    server.listen(port, () => {
      console.log(`[INFO] Task Coordinator Server running on port ${port}`);
      console.log(`[INFO] Web dashboard available at http://localhost:3333`);
      console.log(`[INFO] API endpoints available at http://localhost:${port}/api/*`);
      console.log(`[INFO] WebSocket endpoint available at ws://localhost:${port}`);
    });
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[INFO] SIGTERM received, shutting down gracefully');
  server.close(async () => {
    console.log('[INFO] Server closed');
    await taskManager.close();
    console.log('[INFO] Database connection closed');
    process.exit(0);
  });
});