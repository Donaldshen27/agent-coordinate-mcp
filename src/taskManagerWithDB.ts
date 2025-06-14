import { Task, TaskUpdate, WorkerSlot } from './types.js';
import { Database } from './database.js';

export class TaskManagerWithDB {
  private db: Database;
  private maxWorkers: number;
  private lockMap: Map<string, Promise<any>> = new Map();

  constructor(maxWorkers: number = 5, dbPath?: string) {
    this.maxWorkers = maxWorkers;
    this.db = new Database(dbPath);
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
    await this.db.initializeWorkerSlots(this.maxWorkers);
    console.log('[INFO] TaskManager initialized with database persistence');
  }

  async close(): Promise<void> {
    await this.db.close();
  }

  private async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    while (this.lockMap.has(key)) {
      await this.lockMap.get(key);
    }

    const promise = fn();
    this.lockMap.set(key, promise);

    try {
      return await promise;
    } finally {
      this.lockMap.delete(key);
    }
  }

  async claimWorkerSlot(): Promise<number | null> {
    return this.withLock('workers', async () => {
      await this.db.beginTransaction();
      try {
        const workers = await this.db.getAllWorkerSlots();
        
        for (const worker of workers) {
          if (!worker.active) {
            worker.active = true;
            await this.db.upsertWorkerSlot(worker);
            await this.db.commit();
            return worker.slot;
          }
        }
        
        await this.db.rollback();
        return null;
      } catch (error) {
        await this.db.rollback();
        throw error;
      }
    });
  }

  async releaseWorkerSlot(slot: number): Promise<void> {
    return this.withLock('workers', async () => {
      const worker = await this.db.getWorkerSlot(slot);
      if (worker) {
        worker.active = false;
        worker.workerId = undefined;
        worker.taskId = undefined;
        await this.db.upsertWorkerSlot(worker);
      }
    });
  }

  async getAvailableTasks(): Promise<Task[]> {
    return this.withLock('tasks', async () => {
      const allTasks = await this.db.getAllTasks();
      const availableTasks: Task[] = [];
      
      for (const task of allTasks) {
        if (task.status === 'available') {
          const allDepsComplete = task.dependencies.every(depId => {
            const dep = allTasks.find(t => t.id === depId);
            return dep && dep.status === 'done';
          });
          
          if (allDepsComplete) {
            availableTasks.push(task);
          }
        }
      }
      
      return availableTasks;
    });
  }

  async claimTask(taskId: string, workerId: string, workerSlot: number): Promise<boolean> {
    return this.withLock(`task-${taskId}`, async () => {
      await this.db.beginTransaction();
      try {
        const task = await this.db.getTask(taskId);
        const worker = await this.db.getWorkerSlot(workerSlot);
        
        if (!task || !worker) {
          await this.db.rollback();
          return false;
        }
        
        if (task.status !== 'available' || !worker.active) {
          await this.db.rollback();
          return false;
        }
        
        // Check dependencies
        const allTasks = await this.db.getAllTasks();
        const depsComplete = task.dependencies.every(depId => {
          const dep = allTasks.find(t => t.id === depId);
          return dep && dep.status === 'done';
        });
        
        if (!depsComplete) {
          await this.db.rollback();
          return false;
        }
        
        // Claim the task
        task.status = 'working';
        task.worker = workerId;
        task.startedAt = new Date();
        await this.db.updateTask(task);
        
        // Update worker slot
        worker.workerId = workerId;
        worker.taskId = taskId;
        await this.db.upsertWorkerSlot(worker);
        
        await this.db.commit();
        return true;
      } catch (error) {
        await this.db.rollback();
        throw error;
      }
    });
  }

  async updateTask(update: TaskUpdate): Promise<boolean> {
    return this.withLock(`task-${update.taskId}`, async () => {
      await this.db.beginTransaction();
      try {
        const task = await this.db.getTask(update.taskId);
        
        if (!task || task.worker !== update.workerId || task.status !== 'working') {
          await this.db.rollback();
          return false;
        }
        
        task.status = update.status;
        task.completedAt = new Date();
        
        if (update.output) task.output = update.output;
        if (update.error) task.error = update.error;
        
        await this.db.updateTask(task);
        
        // Find and release the worker slot
        const workers = await this.db.getAllWorkerSlots();
        for (const worker of workers) {
          if (worker.workerId === update.workerId && worker.taskId === update.taskId) {
            await this.releaseWorkerSlot(worker.slot);
            break;
          }
        }
        
        await this.db.commit();
        return true;
      } catch (error) {
        await this.db.rollback();
        throw error;
      }
    });
  }

  async addTask(task: Task): Promise<void> {
    return this.withLock('tasks', async () => {
      await this.db.addTask(task);
    });
  }

  async getTasks(): Promise<Task[]> {
    return this.withLock('tasks', async () => {
      return await this.db.getAllTasks();
    });
  }

  async getWorkers(): Promise<WorkerSlot[]> {
    return this.withLock('workers', async () => {
      return await this.db.getAllWorkerSlots();
    });
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    return this.withLock('tasks', async () => {
      return await this.db.getTask(taskId);
    });
  }

  async resetFailedTask(taskId: string): Promise<boolean> {
    return this.withLock(`task-${taskId}`, async () => {
      const task = await this.db.getTask(taskId);
      
      if (!task || task.status !== 'failed') return false;
      
      task.status = 'available';
      task.worker = undefined;
      task.error = undefined;
      task.startedAt = undefined;
      task.completedAt = undefined;
      
      await this.db.updateTask(task);
      return true;
    });
  }

  async cleanAllTasks(): Promise<void> {
    return this.withLock('all-tasks', async () => {
      await this.db.beginTransaction();
      try {
        // Delete all tasks
        await this.db.deleteAllTasks();
        
        // Reset all worker slots
        const workers = await this.db.getAllWorkerSlots();
        for (const worker of workers) {
          worker.active = false;
          worker.workerId = undefined;
          worker.taskId = undefined;
          await this.db.upsertWorkerSlot(worker);
        }
        
        await this.db.commit();
      } catch (error) {
        await this.db.rollback();
        throw error;
      }
    });
  }
}