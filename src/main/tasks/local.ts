import Store from 'electron-store';
import { LocalTask } from '../../shared/types/task';
import { v4 as uuidv4 } from 'uuid';

// Store structure: { lists: { [id]: { id, name, tasks: LocalTask[] } }, activeListId: string }
const store: any = new Store<{ lists: any, activeListId: string }>();
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

function getListsObj() {
  let lists = store.get('lists');
  if (!lists) {
    // Create default list if none exists
    const defaultId = uuidv4();
    lists = { [defaultId]: { id: defaultId, name: 'Default', tasks: [] } };
    store.set('lists', lists);
    store.set('activeListId', defaultId);
  }
  return lists;
}
function getActiveListId() {
  let id = store.get('activeListId');
  if (!id) {
    const lists = getListsObj();
    id = Object.keys(lists)[0];
    store.set('activeListId', id);
  }
  return id;
}
function setActiveListId(id: string) {
  store.set('activeListId', id);
}
function saveLists(lists: any) {
  store.set('lists', lists);
}

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

export function getTaskLists() {
  const lists = getListsObj();
  return Object.values(lists).map((l: any) => ({ id: l.id, name: l.name }));
}
export function getActiveTaskListId() {
  return getActiveListId();
}
export function setActiveTaskList(id: string) {
  setActiveListId(id);
}
export function createTaskList(name: string) {
  const lists = getListsObj();
  const id = uuidv4();
  lists[id] = { id, name, tasks: [] };
  saveLists(lists);
  setActiveListId(id);
  return { id, name };
}
export function renameTaskList(id: string, name: string) {
  const lists = getListsObj();
  if (lists[id]) lists[id].name = name;
  saveLists(lists);
}
export function deleteTaskList(id: string) {
  const lists = getListsObj();
  delete lists[id];
  // If deleted active, switch to another
  let activeId = getActiveListId();
  if (activeId === id) {
    const keys = Object.keys(lists);
    setActiveListId(keys.length ? keys[0] : '');
  }
  saveLists(lists);
}

function getActiveList() {
  const lists = getListsObj();
  const id = getActiveListId();
  return lists[id] || { id, name: 'Unknown', tasks: [] };
}
function saveActiveList(list: any) {
  const lists = getListsObj();
  lists[list.id] = list;
  saveLists(lists);
}

export function getLocalTasks(): LocalTask[] {
  let list = getActiveList();
  // Process expiration/archiving
  list.tasks = processTaskExpiration(list.tasks);
  saveActiveList(list);
  return list.tasks.filter((task: LocalTask) => !task.archived);
}

export function getArchivedTasks(): LocalTask[] {
  let list = getActiveList();
  return list.tasks.filter((task: LocalTask) => task.archived);
}

export function addLocalTask(task: Omit<LocalTask, 'id' | 'completed'>): LocalTask {
  let list = getActiveList();
  const newTask: LocalTask = {
    ...task,
    id: uuidv4(),
    completed: false,
  };
  list.tasks.push(newTask);
  saveActiveList(list);
  return newTask;
}

export function updateLocalTask(updatedTask: LocalTask): void {
  let list = getActiveList();
  list.tasks = list.tasks.map((task: LocalTask) =>
    task.id === updatedTask.id ? updatedTask : task
  );
  saveActiveList(list);
}

export function deleteLocalTask(id: string): void {
  let list = getActiveList();
  list.tasks = list.tasks.filter((task: LocalTask) => task.id !== id);
  saveActiveList(list);
}

export function restoreArchivedTask(id: string): void {
  let list = getActiveList();
  list.tasks = list.tasks.map((task: LocalTask) =>
    task.id === id ? { ...task, archived: false, expiredAt: undefined } : task
  );
  saveActiveList(list);
}

export function deleteArchivedTask(id: string): void {
  let list = getActiveList();
  list.tasks = list.tasks.filter((task: LocalTask) => task.id !== id);
  saveActiveList(list);
} 