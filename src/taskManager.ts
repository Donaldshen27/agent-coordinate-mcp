import { Task, TaskUpdate, WorkerSlot, TaskCoordinationState } from './types';

export class TaskManager {
  private state: TaskCoordinationState;
  private lockMap: Map<string, Promise<any>> = new Map();

  constructor(maxWorkers: number = 5) {
    this.state = {
      workers: new Map(),
      tasks: new Map(),
      maxWorkers
    };

    // Initialize worker slots
    for (let i = 1; i <= maxWorkers; i++) {
      this.state.workers.set(i, {
        slot: i,
        active: false
      });
    }
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
      for (const [slot, worker] of this.state.workers) {
        if (!worker.active) {
          worker.active = true;
          return slot;
        }
      }
      return null;
    });
  }

  async releaseWorkerSlot(slot: number): Promise<void> {
    return this.withLock('workers', async () => {
      const worker = this.state.workers.get(slot);
      if (worker) {
        worker.active = false;
        worker.workerId = undefined;
        worker.taskId = undefined;
      }
    });
  }

  async getAvailableTasks(): Promise<Task[]> {
    return this.withLock('tasks', async () => {
      const availableTasks: Task[] = [];
      
      for (const task of this.state.tasks.values()) {
        if (task.status === 'available') {
          // Check if all dependencies are completed
          const allDepsComplete = task.dependencies.every(depId => {
            const dep = this.state.tasks.get(depId);
            return dep && dep.status === 'done';
          });
          
          if (allDepsComplete) {
            availableTasks.push({ ...task });
          }
        }
      }
      
      return availableTasks;
    });
  }

  async claimTask(taskId: string, workerId: string, workerSlot: number): Promise<boolean> {
    return this.withLock(`task-${taskId}`, async () => {
      const task = this.state.tasks.get(taskId);
      const worker = this.state.workers.get(workerSlot);
      
      if (!task || !worker) return false;
      if (task.status !== 'available') return false;
      if (!worker.active) return false;
      
      // Check dependencies
      const depsComplete = task.dependencies.every(depId => {
        const dep = this.state.tasks.get(depId);
        return dep && dep.status === 'done';
      });
      
      if (!depsComplete) return false;
      
      // Claim the task
      task.status = 'working';
      task.worker = workerId;
      task.startedAt = new Date();
      
      // Update worker slot
      worker.workerId = workerId;
      worker.taskId = taskId;
      
      return true;
    });
  }

  async updateTask(update: TaskUpdate): Promise<boolean> {
    return this.withLock(`task-${update.taskId}`, async () => {
      const task = this.state.tasks.get(update.taskId);
      
      if (!task) return false;
      if (task.worker !== update.workerId) return false;
      if (task.status !== 'working') return false;
      
      task.status = update.status;
      task.completedAt = new Date();
      
      if (update.output) task.output = update.output;
      if (update.error) task.error = update.error;
      
      // Find and release the worker slot
      for (const [slot, worker] of this.state.workers) {
        if (worker.workerId === update.workerId && worker.taskId === update.taskId) {
          await this.releaseWorkerSlot(slot);
          break;
        }
      }
      
      return true;
    });
  }

  async addTask(task: Task): Promise<void> {
    return this.withLock('tasks', async () => {
      this.state.tasks.set(task.id, task);
    });
  }

  async getTasks(): Promise<Task[]> {
    return this.withLock('tasks', async () => {
      return Array.from(this.state.tasks.values()).map(t => ({ ...t }));
    });
  }

  async getWorkers(): Promise<WorkerSlot[]> {
    return this.withLock('workers', async () => {
      return Array.from(this.state.workers.values()).map(w => ({ ...w }));
    });
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    return this.withLock('tasks', async () => {
      const task = this.state.tasks.get(taskId);
      return task ? { ...task } : null;
    });
  }

  async resetFailedTask(taskId: string): Promise<boolean> {
    return this.withLock(`task-${taskId}`, async () => {
      const task = this.state.tasks.get(taskId);
      
      if (!task || task.status !== 'failed') return false;
      
      task.status = 'available';
      task.worker = undefined;
      task.error = undefined;
      task.startedAt = undefined;
      task.completedAt = undefined;
      
      return true;
    });
  }
}