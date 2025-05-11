import Store from 'electron-store';
import { LocalTask } from '../../shared/types/task';
import { v4 as uuidv4 } from 'uuid';

const store: any = new Store<{ local_tasks: LocalTask[] }>();

export function getLocalTasks(): LocalTask[] {
  return store.get('local_tasks', []);
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
  const tasks = getLocalTasks().map(task =>
    task.id === updatedTask.id ? updatedTask : task
  );
  store.set('local_tasks', tasks);
}

export function deleteLocalTask(id: string): void {
  const tasks = getLocalTasks().filter(task => task.id !== id);
  store.set('local_tasks', tasks);
} 