import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { TaskManager } from './taskManager.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private taskManager: TaskManager;
  private port: number;

  constructor(taskManager: TaskManager, port: number = 3334) {
    this.taskManager = taskManager;
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '..', 'public')));
  }

  private setupRoutes() {
    // API endpoint to get all tasks
    this.app.get('/api/tasks', async (req, res) => {
      const tasks = await this.taskManager.getTasks();
      res.json(tasks);
    });

    // API endpoint to get all workers
    this.app.get('/api/workers', async (req, res) => {
      const workers = await this.taskManager.getWorkers();
      res.json(workers);
    });

    // API endpoint to add a new task
    this.app.post('/api/tasks', async (req, res) => {
      const { id, description, dependencies, output } = req.body;
      try {
        await this.taskManager.addTask({ 
          id, 
          description, 
          dependencies: dependencies || [], 
          output,
          status: 'available'
        });
        res.json({ success: true });
        await this.broadcastUpdate();
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
      }
    });

    // Serve the frontend
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', async (ws) => {
      logger.log('New WebSocket connection');
      
      // Send initial state
      const [tasks, workers] = await Promise.all([
        this.taskManager.getTasks(),
        this.taskManager.getWorkers()
      ]);
      
      ws.send(JSON.stringify({
        type: 'initial',
        tasks,
        workers
      }));

      ws.on('message', (message) => {
        logger.log('Received:', message.toString());
      });

      ws.on('close', () => {
        logger.log('WebSocket connection closed');
      });
    });
  }

  public async broadcastUpdate() {
    const [tasks, workers] = await Promise.all([
      this.taskManager.getTasks(),
      this.taskManager.getWorkers()
    ]);
    
    const update = {
      type: 'update',
      tasks,
      workers
    };

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(update));
      }
    });
  }

  public start() {
    // Handle errors on the WebSocket server
    this.wss.on('error', (err: any) => {
      logger.error(`WebSocket server error: ${err.message}`);
    });

    this.server.listen(this.port, () => {
      logger.log(`Web server running on http://localhost:${this.port}`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${this.port} is already in use. The MCP server will continue without the web dashboard.`);
        logger.error(`To use a different port, restart with --port=<number>`);
        // Close the WebSocket server to prevent it from throwing
        this.wss.close();
      } else {
        logger.error(`Failed to start web server: ${err.message}`);
      }
    });
  }

  public stop() {
    this.server.close();
    this.wss.close();
  }
}