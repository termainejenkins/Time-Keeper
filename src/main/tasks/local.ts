import Store from 'electron-store';
import { LocalTask } from '../../shared/types/task';
import { v4 as uuidv4 } from 'uuid';

const store: any = new Store<{ local_tasks: LocalTask[] }>();
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

function processTaskExpiration(tasks: LocalTask[]): LocalTask[] {
  const now = Date.now();
  return tasks.map(task => {
    // Only non-repeating, non-archived, not completed
    if (!task.archived && !task.completed && (task.repeat === undefined || task.repeat === 'none')) {
      const endTime = new Date(task.end).getTime();
      if (endTime < now) {
        // Mark expiredAt if not already set
        if (!task.expiredAt) {
          return { ...task, expiredAt: now };
        } else if (now - task.expiredAt > GRACE_PERIOD_MS) {
          // Archive if grace period passed
          return { ...task, archived: true };
        }
      }
    }
    return task;
  });
}

export function getLocalTasks(): LocalTask[] {
  let tasks: LocalTask[] = store.get('local_tasks', []);
  // Process expiration/archiving
  tasks = processTaskExpiration(tasks);
  // Save any changes
  store.set('local_tasks', tasks);
  // Return only active (not archived) tasks
  return tasks.filter(task => !task.archived);
}

export function getArchivedTasks(): LocalTask[] {
  const tasks: LocalTask[] = store.get('local_tasks', []);
  return tasks.filter(task => task.archived);
}

export function addLocalTask(task: Omit<LocalTask, 'id' | 'completed'>): LocalTask {
  const newTask: LocalTask = {
    ...task,
    id: uuidv4(),
    completed: false,
  };
  const tasks = getLocalTasks();
  store.set('local_tasks', [...tasks, newTask]);
  return newTask;
}

export function updateLocalTask(updatedTask: LocalTask): void {
  const tasks = store.get('local_tasks', []).map((task: LocalTask) =>
    task.id === updatedTask.id ? updatedTask : task
  );
  store.set('local_tasks', tasks);
}

export function deleteLocalTask(id: string): void {
  const tasks = store.get('local_tasks', []).filter((task: LocalTask) => task.id !== id);
  store.set('local_tasks', tasks);
}

export function restoreArchivedTask(id: string): void {
  const tasks = store.get('local_tasks', []).map((task: LocalTask) =>
    task.id === id ? { ...task, archived: false, expiredAt: undefined } : task
  );
  store.set('local_tasks', tasks);
}

export function deleteArchivedTask(id: string): void {
  const tasks = store.get('local_tasks', []).filter((task: LocalTask) => task.id !== id);
  store.set('local_tasks', tasks);
} 