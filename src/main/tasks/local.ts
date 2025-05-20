import Store from 'electron-store';
import { LocalTask, CustomRepeatSettings, WeekdayRepeatSettings } from '../../shared/types/task';
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

function getActiveList() {
  const lists = getListsObj();
  const activeListId = store.get('activeListId');
  return lists[activeListId];
}
function saveActiveList(list: any) {
  const lists = getListsObj();
  lists[list.id] = list;
  saveLists(lists);
}

function processTaskExpiration(tasks: LocalTask[]): LocalTask[] {
  const now = Date.now();
  return tasks.map(task => {
    // Only process non-repeating, non-archived, not completed tasks
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

function getNextOccurrence(task: LocalTask, fromDate: Date): Date | null {
  const start = new Date(task.start);
  const end = new Date(task.end);
  const duration = end.getTime() - start.getTime();

  if (!task.repeat || task.repeat === 'none') {
    return start > fromDate ? start : null;
  }

  const nextDate = new Date(fromDate);
  nextDate.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);

  switch (task.repeat) {
    case 'daily':
      if (nextDate < fromDate) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      break;

    case 'weekly':
      const dayDiff = (start.getDay() - fromDate.getDay() + 7) % 7;
      nextDate.setDate(fromDate.getDate() + (dayDiff === 0 && fromDate < start ? 0 : dayDiff || 7));
      break;

    case 'weekdays':
      if (task.repeatSettings?.type === 'weekdays') {
        const settings = task.repeatSettings as WeekdayRepeatSettings;
        if (settings.days.length === 0) return null;
        
        let daysToAdd = 0;
        let found = false;
        
        while (!found && daysToAdd < 7) {
          const checkDate = new Date(fromDate);
          checkDate.setDate(fromDate.getDate() + daysToAdd);
          if (settings.days.includes(checkDate.getDay())) {
            found = true;
            nextDate.setDate(fromDate.getDate() + daysToAdd);
          }
          daysToAdd++;
        }
        
        if (!found) return null;
      }
      break;

    case 'weekends':
      const day = fromDate.getDay();
      if (day === 0) { // Sunday
        nextDate.setDate(fromDate.getDate() + 6); // Next Saturday
      } else if (day === 6) { // Saturday
        nextDate.setDate(fromDate.getDate() + 1); // Next Sunday
      } else {
        nextDate.setDate(fromDate.getDate() + (6 - day)); // Next Saturday
      }
      break;

    case 'every_other_day':
      const daysSinceStart = Math.floor((fromDate.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      const nextDay = start.getDate() + Math.ceil((daysSinceStart + 1) / 2) * 2;
      nextDate.setDate(nextDay);
      break;

    case 'custom':
      if (task.repeatSettings?.type === 'custom_days') {
        const settings = task.repeatSettings as CustomRepeatSettings;
        const daysSinceStart = Math.floor((fromDate.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        const nextDay = start.getDate() + Math.ceil((daysSinceStart + 1) / settings.interval) * settings.interval;
        nextDate.setDate(nextDay);
      }
      break;

    default:
      return null;
  }

  return nextDate > fromDate ? nextDate : null;
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

export function getLocalTasks(): LocalTask[] {
  let list = getActiveList();
  console.log('Getting local tasks:', {
    activeListId: getActiveListId(),
    tasks: list.tasks.map((t: LocalTask) => ({
      title: t.title,
      start: t.start,
      end: t.end,
      repeat: t.repeat
    }))
  });
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