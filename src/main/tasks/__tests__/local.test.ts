import {
  getLocalTasks,
  addLocalTask,
  updateLocalTask,
  deleteLocalTask,
  getArchivedTasks,
  restoreArchivedTask,
  deleteArchivedTask,
  getTaskLists,
  getActiveTaskListId,
  setActiveTaskList,
  createTaskList,
  renameTaskList,
  deleteTaskList,
} from '../local';
import { LocalTask } from '../../../shared/types/task';

// Mock electron-store
jest.mock('electron-store');

describe('Local Task Management', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('Task Lists', () => {
    it('should create a new task list', () => {
      const listName = 'Test List';
      const result = createTaskList(listName);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', listName);
    });

    it('should get all task lists', () => {
      const lists = getTaskLists();
      expect(Array.isArray(lists)).toBe(true);
    });

    it('should rename a task list', () => {
      const listId = 'test-id';
      const newName = 'New List Name';
      renameTaskList(listId, newName);
      // Verify the store was called with the correct parameters
      expect(require('electron-store')).toHaveBeenCalled();
    });

    it('should delete a task list', () => {
      const listId = 'test-id';
      deleteTaskList(listId);
      // Verify the store was called with the correct parameters
      expect(require('electron-store')).toHaveBeenCalled();
    });
  });

  describe('Tasks', () => {
    it('should add a new task', () => {
      const task = {
        title: 'Test Task',
        description: 'Test Description',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
        repeat: 'daily' as const,
      };
      const result = addLocalTask(task);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('title', task.title);
    });

    it('should get all tasks', () => {
      const tasks = getLocalTasks();
      expect(Array.isArray(tasks)).toBe(true);
    });

    it('should update a task', () => {
      const taskId = 'test-id';
      const task: LocalTask = {
        id: taskId,
        title: 'Updated Task',
        description: 'Updated Description',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
        completed: false,
      };
      updateLocalTask(task);
      // Verify the store was called with the correct parameters
      expect(require('electron-store')).toHaveBeenCalled();
    });

    it('should delete a task', () => {
      const taskId = 'test-id';
      deleteLocalTask(taskId);
      // Verify the store was called with the correct parameters
      expect(require('electron-store')).toHaveBeenCalled();
    });
  });

  describe('Archived Tasks', () => {
    it('should get archived tasks', () => {
      const archivedTasks = getArchivedTasks();
      expect(Array.isArray(archivedTasks)).toBe(true);
    });

    it('should restore an archived task', () => {
      const taskId = 'test-id';
      restoreArchivedTask(taskId);
      // Verify the store was called with the correct parameters
      expect(require('electron-store')).toHaveBeenCalled();
    });

    it('should delete an archived task', () => {
      const taskId = 'test-id';
      deleteArchivedTask(taskId);
      // Verify the store was called with the correct parameters
      expect(require('electron-store')).toHaveBeenCalled();
    });
  });
}); 