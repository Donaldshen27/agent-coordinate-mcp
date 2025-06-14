import sqlite3 from 'sqlite3';
import { Task, WorkerSlot } from './types.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
  private db!: sqlite3.Database;
  private dbPath: string;
  
  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(__dirname, '..', 'task-coordinator.db');
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`[INFO] Connected to SQLite database at ${this.dbPath}`);
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  private async createTables(): Promise<void> {
    await this.runQuery(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('available', 'claimed', 'working', 'done', 'failed')),
        worker TEXT,
        dependencies TEXT, -- JSON array of task IDs
        output TEXT,
        error TEXT,
        started_at TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.runQuery(`
      CREATE TABLE IF NOT EXISTS worker_slots (
        slot INTEGER PRIMARY KEY,
        worker_id TEXT,
        active INTEGER NOT NULL DEFAULT 0,
        task_id TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.runQuery(`
      CREATE INDEX IF NOT EXISTS idx_task_status ON tasks(status);
    `);

    await this.runQuery(`
      CREATE INDEX IF NOT EXISTS idx_worker_active ON worker_slots(active);
    `);
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Task operations
  async getTask(id: string): Promise<Task | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row ? this.rowToTask(row) : null);
      });
    });
  }

  async getAllTasks(): Promise<Task[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM tasks ORDER BY created_at', (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => this.rowToTask(row)));
      });
    });
  }

  async addTask(task: Task): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO tasks (id, description, status, worker, dependencies, output, error, started_at, completed_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.description,
          task.status,
          task.worker || null,
          JSON.stringify(task.dependencies),
          task.output || null,
          task.error || null,
          task.startedAt ? task.startedAt.toISOString() : null,
          task.completedAt ? task.completedAt.toISOString() : null
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async updateTask(task: Task): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE tasks 
         SET description = ?, status = ?, worker = ?, dependencies = ?, 
             output = ?, error = ?, started_at = ?, completed_at = ?
         WHERE id = ?`,
        [
          task.description,
          task.status,
          task.worker || null,
          JSON.stringify(task.dependencies),
          task.output || null,
          task.error || null,
          task.startedAt ? task.startedAt.toISOString() : null,
          task.completedAt ? task.completedAt.toISOString() : null,
          task.id
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async deleteTask(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM tasks WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async deleteAllTasks(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM tasks', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Worker operations
  async getWorkerSlot(slot: number): Promise<WorkerSlot | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM worker_slots WHERE slot = ?', [slot], (err, row) => {
        if (err) reject(err);
        else resolve(row ? this.rowToWorkerSlot(row) : null);
      });
    });
  }

  async getAllWorkerSlots(): Promise<WorkerSlot[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM worker_slots ORDER BY slot', (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => this.rowToWorkerSlot(row)));
      });
    });
  }

  async upsertWorkerSlot(worker: WorkerSlot): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO worker_slots (slot, worker_id, active, task_id, updated_at) 
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          worker.slot,
          worker.workerId || null,
          worker.active ? 1 : 0,
          worker.taskId || null
        ],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async initializeWorkerSlots(maxWorkers: number): Promise<void> {
    for (let i = 1; i <= maxWorkers; i++) {
      await new Promise<void>((resolve, reject) => {
        this.db.run(
          `INSERT OR IGNORE INTO worker_slots (slot, active) VALUES (?, 0)`,
          [i],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }
  }

  // Helper methods
  private rowToTask(row: any): Task {
    return {
      id: row.id,
      description: row.description,
      status: row.status,
      worker: row.worker,
      dependencies: JSON.parse(row.dependencies || '[]'),
      output: row.output,
      error: row.error,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }

  private rowToWorkerSlot(row: any): WorkerSlot {
    return {
      slot: row.slot,
      workerId: row.worker_id,
      active: row.active === 1,
      taskId: row.task_id
    };
  }

  // Helper method for running queries
  private async runQuery(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Transaction support
  async beginTransaction(): Promise<void> {
    await this.runQuery('BEGIN TRANSACTION');
  }

  async commit(): Promise<void> {
    await this.runQuery('COMMIT');
  }

  async rollback(): Promise<void> {
    await this.runQuery('ROLLBACK');
  }
}