import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { TaskManager } from './taskManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WebServer {
  private app: express.Application;
  private server: ReturnType<typeof createServer>;
  private wss: WebSocketServer;
  private taskManager: TaskManager;
  private port: number;

  constructor(taskManager: TaskManager, port: number = 3000) {
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
    this.app.get('/api/tasks', (req, res) => {
      const tasks = this.taskManager.getTasks();
      res.json(tasks);
    });

    // API endpoint to get all workers
    this.app.get('/api/workers', (req, res) => {
      const workers = this.taskManager.getWorkers();
      res.json(workers);
    });

    // API endpoint to add a new task
    this.app.post('/api/tasks', (req, res) => {
      const { id, description, dependencies, output } = req.body;
      try {
        this.taskManager.addTask({ 
          id, 
          description, 
          dependencies: dependencies || [], 
          output,
          status: 'available'
        });
        res.json({ success: true });
        this.broadcastUpdate();
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
    this.wss.on('connection', (ws) => {
      console.log('New WebSocket connection');
      
      // Send initial state
      ws.send(JSON.stringify({
        type: 'initial',
        tasks: this.taskManager.getTasks(),
        workers: this.taskManager.getWorkers()
      }));

      ws.on('message', (message) => {
        console.log('Received:', message.toString());
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });
  }

  public broadcastUpdate() {
    const update = {
      type: 'update',
      tasks: this.taskManager.getTasks(),
      workers: this.taskManager.getWorkers()
    };

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(update));
      }
    });
  }

  public start() {
    this.server.listen(this.port, () => {
      console.log(`Web server running on http://localhost:${this.port}`);
    });
  }

  public stop() {
    this.server.close();
    this.wss.close();
  }
}