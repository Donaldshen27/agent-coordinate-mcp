import fetch, { RequestInit as NodeFetchRequestInit } from 'node-fetch';
import { Task, TaskUpdate, WorkerSlot } from './types.js';

export class TaskCoordinatorClient {
  private baseUrl: string;
  
  constructor(serverUrl: string = 'http://localhost:3335') {
    this.baseUrl = serverUrl;
  }

  private async request<T>(endpoint: string, options?: NodeFetchRequestInit): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      const data = await response.json() as any;
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data as T;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Task Coordinator Server at ${this.baseUrl}. Please ensure the server is running.`);
      }
      throw error;
    }
  }

  async claimWorkerSlot(): Promise<number | null> {
    const result = await this.request<{ success: boolean; slot?: number }>('/claim-worker-slot', {
      method: 'POST',
    });
    return result.slot ?? null;
  }

  async releaseWorkerSlot(slot: number): Promise<void> {
    await this.request('/release-worker-slot', {
      method: 'POST',
      body: JSON.stringify({ slot }),
    });
  }

  async getAvailableTasks(): Promise<Task[]> {
    const result = await this.request<{ success: boolean; tasks: Task[] }>('/available-tasks');
    return result.tasks;
  }

  async claimTask(taskId: string, workerId: string, workerSlot: number): Promise<boolean> {
    const result = await this.request<{ success: boolean }>('/claim-task', {
      method: 'POST',
      body: JSON.stringify({ taskId, workerId, workerSlot }),
    });
    return result.success;
  }

  async updateTask(update: TaskUpdate): Promise<boolean> {
    const result = await this.request<{ success: boolean }>('/update-task', {
      method: 'POST',
      body: JSON.stringify(update),
    });
    return result.success;
  }

  async addTask(task: Task): Promise<void> {
    await this.request('/add-task', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async getTasks(): Promise<Task[]> {
    const result = await this.request<{ success: boolean; tasks: Task[] }>('/all-tasks');
    return result.tasks;
  }

  async getWorkers(): Promise<WorkerSlot[]> {
    const result = await this.request<{ success: boolean; workers: WorkerSlot[] }>('/workers');
    return result.workers;
  }

  async resetFailedTask(taskId: string): Promise<boolean> {
    const result = await this.request<{ success: boolean }>('/reset-failed-task', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
    return result.success;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/health`;
      const response = await fetch(url);
      const data = await response.json() as any;
      return response.ok && data.status === 'ok';
    } catch {
      return false;
    }
  }
}