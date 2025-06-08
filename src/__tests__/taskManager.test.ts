import { TaskManager } from '../taskManager';
import { Task } from '../types';

describe('TaskManager', () => {
  let taskManager: TaskManager;

  beforeEach(() => {
    taskManager = new TaskManager(3);
  });

  describe('Worker Slot Management', () => {
    test('should claim available worker slots', async () => {
      const slot1 = await taskManager.claimWorkerSlot();
      const slot2 = await taskManager.claimWorkerSlot();
      const slot3 = await taskManager.claimWorkerSlot();
      const slot4 = await taskManager.claimWorkerSlot();

      expect(slot1).toBe(1);
      expect(slot2).toBe(2);
      expect(slot3).toBe(3);
      expect(slot4).toBeNull(); // No more slots available
    });

    test('should release worker slots', async () => {
      const slot1 = await taskManager.claimWorkerSlot();
      await taskManager.releaseWorkerSlot(slot1!);
      
      const newSlot = await taskManager.claimWorkerSlot();
      expect(newSlot).toBe(slot1);
    });

    test('should handle concurrent slot claims safely', async () => {
      const claims = await Promise.all([
        taskManager.claimWorkerSlot(),
        taskManager.claimWorkerSlot(),
        taskManager.claimWorkerSlot(),
        taskManager.claimWorkerSlot(),
        taskManager.claimWorkerSlot(),
      ]);

      const validSlots = claims.filter(slot => slot !== null);
      const uniqueSlots = new Set(validSlots);

      expect(validSlots.length).toBe(3);
      expect(uniqueSlots.size).toBe(3);
    });
  });

  describe('Task Management', () => {
    test('should add and retrieve tasks', async () => {
      const task: Task = {
        id: 'TASK-001',
        description: 'Test task',
        status: 'available',
        dependencies: [],
      };

      await taskManager.addTask(task);
      const tasks = await taskManager.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toMatchObject(task);
    });

    test('should only show available tasks with met dependencies', async () => {
      const task1: Task = {
        id: 'TASK-001',
        description: 'First task',
        status: 'available',
        dependencies: [],
      };

      const task2: Task = {
        id: 'TASK-002',
        description: 'Dependent task',
        status: 'available',
        dependencies: ['TASK-001'],
      };

      await taskManager.addTask(task1);
      await taskManager.addTask(task2);

      let available = await taskManager.getAvailableTasks();
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe('TASK-001');

      // Complete task1
      const slot = await taskManager.claimWorkerSlot();
      await taskManager.claimTask('TASK-001', 'worker-1', slot!);
      await taskManager.updateTask({
        taskId: 'TASK-001',
        status: 'done',
        workerId: 'worker-1',
      });

      available = await taskManager.getAvailableTasks();
      expect(available).toHaveLength(1);
      expect(available[0].id).toBe('TASK-002');
    });

    test('should claim tasks atomically', async () => {
      const task: Task = {
        id: 'TASK-001',
        description: 'Test task',
        status: 'available',
        dependencies: [],
      };

      await taskManager.addTask(task);
      const slot1 = await taskManager.claimWorkerSlot();
      const slot2 = await taskManager.claimWorkerSlot();

      const claim1 = await taskManager.claimTask('TASK-001', 'worker-1', slot1!);
      const claim2 = await taskManager.claimTask('TASK-001', 'worker-2', slot2!);

      expect(claim1).toBe(true);
      expect(claim2).toBe(false); // Should fail as task is already claimed
    });

    test('should update task status correctly', async () => {
      const task: Task = {
        id: 'TASK-001',
        description: 'Test task',
        status: 'available',
        dependencies: [],
      };

      await taskManager.addTask(task);
      const slot = await taskManager.claimWorkerSlot();
      await taskManager.claimTask('TASK-001', 'worker-1', slot!);

      const success = await taskManager.updateTask({
        taskId: 'TASK-001',
        status: 'done',
        workerId: 'worker-1',
        output: 'Task completed successfully',
      });

      expect(success).toBe(true);

      const updatedTask = await taskManager.getTaskById('TASK-001');
      expect(updatedTask?.status).toBe('done');
      expect(updatedTask?.output).toBe('Task completed successfully');
      expect(updatedTask?.completedAt).toBeDefined();
    });

    test('should handle concurrent task claims safely', async () => {
      const task: Task = {
        id: 'TASK-001',
        description: 'Test task',
        status: 'available',
        dependencies: [],
      };

      await taskManager.addTask(task);
      
      const slots = await Promise.all([
        taskManager.claimWorkerSlot(),
        taskManager.claimWorkerSlot(),
        taskManager.claimWorkerSlot(),
      ]);

      const claims = await Promise.all([
        taskManager.claimTask('TASK-001', 'worker-1', slots[0]!),
        taskManager.claimTask('TASK-001', 'worker-2', slots[1]!),
        taskManager.claimTask('TASK-001', 'worker-3', slots[2]!),
      ]);

      const successfulClaims = claims.filter(claim => claim === true);
      expect(successfulClaims.length).toBe(1);
    });

    test('should reset failed tasks', async () => {
      const task: Task = {
        id: 'TASK-001',
        description: 'Test task',
        status: 'available',
        dependencies: [],
      };

      await taskManager.addTask(task);
      const slot = await taskManager.claimWorkerSlot();
      await taskManager.claimTask('TASK-001', 'worker-1', slot!);

      await taskManager.updateTask({
        taskId: 'TASK-001',
        status: 'failed',
        workerId: 'worker-1',
        error: 'Something went wrong',
      });

      const success = await taskManager.resetFailedTask('TASK-001');
      expect(success).toBe(true);

      const resetTask = await taskManager.getTaskById('TASK-001');
      expect(resetTask?.status).toBe('available');
      expect(resetTask?.error).toBeUndefined();
      expect(resetTask?.worker).toBeUndefined();
    });

    test('should release worker slot after task completion', async () => {
      const task: Task = {
        id: 'TASK-001',
        description: 'Test task',
        status: 'available',
        dependencies: [],
      };

      await taskManager.addTask(task);
      const slot = await taskManager.claimWorkerSlot();
      await taskManager.claimTask('TASK-001', 'worker-1', slot!);

      const workersBefore = await taskManager.getWorkers();
      const activeBefore = workersBefore.find(w => w.slot === slot);
      expect(activeBefore?.active).toBe(true);
      expect(activeBefore?.taskId).toBe('TASK-001');

      await taskManager.updateTask({
        taskId: 'TASK-001',
        status: 'done',
        workerId: 'worker-1',
      });

      const workersAfter = await taskManager.getWorkers();
      const activeAfter = workersAfter.find(w => w.slot === slot);
      expect(activeAfter?.active).toBe(false);
      expect(activeAfter?.taskId).toBeUndefined();
    });
  });

  describe('Complex Dependency Scenarios', () => {
    test('should handle multi-level dependencies', async () => {
      const tasks: Task[] = [
        { id: 'A', description: 'Task A', status: 'available', dependencies: [] },
        { id: 'B', description: 'Task B', status: 'available', dependencies: ['A'] },
        { id: 'C', description: 'Task C', status: 'available', dependencies: ['A'] },
        { id: 'D', description: 'Task D', status: 'available', dependencies: ['B', 'C'] },
      ];

      for (const task of tasks) {
        await taskManager.addTask(task);
      }

      // Initially only A should be available
      let available = await taskManager.getAvailableTasks();
      expect(available.map(t => t.id)).toEqual(['A']);

      // Complete A
      const slot1 = await taskManager.claimWorkerSlot();
      await taskManager.claimTask('A', 'worker-1', slot1!);
      await taskManager.updateTask({ taskId: 'A', status: 'done', workerId: 'worker-1' });

      // Now B and C should be available
      available = await taskManager.getAvailableTasks();
      expect(available.map(t => t.id).sort()).toEqual(['B', 'C']);

      // Complete B and C
      const slot2 = await taskManager.claimWorkerSlot();
      const slot3 = await taskManager.claimWorkerSlot();
      await taskManager.claimTask('B', 'worker-2', slot2!);
      await taskManager.claimTask('C', 'worker-3', slot3!);
      await taskManager.updateTask({ taskId: 'B', status: 'done', workerId: 'worker-2' });
      await taskManager.updateTask({ taskId: 'C', status: 'done', workerId: 'worker-3' });

      // Now D should be available
      available = await taskManager.getAvailableTasks();
      expect(available.map(t => t.id)).toEqual(['D']);
    });
  });
});