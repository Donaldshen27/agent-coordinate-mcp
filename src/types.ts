export interface Worker {
  id: string;
  active: boolean;
  currentTask?: string;
  claimedAt?: Date;
}

export interface Task {
  id: string;
  description: string;
  status: 'available' | 'working' | 'done' | 'failed';
  worker?: string;
  dependencies: string[];
  output?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskUpdate {
  taskId: string;
  status: 'working' | 'done' | 'failed';
  workerId: string;
  output?: string;
  error?: string;
}

export interface WorkerSlot {
  slot: number;
  workerId?: string;
  active: boolean;
  taskId?: string;
}

export interface TaskCoordinationState {
  workers: Map<number, WorkerSlot>;
  tasks: Map<string, Task>;
  maxWorkers: number;
}