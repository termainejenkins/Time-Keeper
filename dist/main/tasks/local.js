"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalTasks = getLocalTasks;
exports.getArchivedTasks = getArchivedTasks;
exports.addLocalTask = addLocalTask;
exports.updateLocalTask = updateLocalTask;
exports.deleteLocalTask = deleteLocalTask;
exports.restoreArchivedTask = restoreArchivedTask;
exports.deleteArchivedTask = deleteArchivedTask;
const electron_store_1 = __importDefault(require("electron-store"));
const uuid_1 = require("uuid");
const store = new electron_store_1.default();
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours
function processTaskExpiration(tasks) {
    const now = Date.now();
    return tasks.map(task => {
        // Only non-repeating, non-archived, not completed
        if (!task.archived && !task.completed && (task.repeat === undefined || task.repeat === 'none')) {
            const endTime = new Date(task.end).getTime();
            if (endTime < now) {
                // Mark expiredAt if not already set
                if (!task.expiredAt) {
                    return { ...task, expiredAt: now };
                }
                else if (now - task.expiredAt > GRACE_PERIOD_MS) {
                    // Archive if grace period passed
                    return { ...task, archived: true };
                }
            }
        }
        return task;
    });
}
function getLocalTasks() {
    let tasks = store.get('local_tasks', []);
    // Process expiration/archiving
    tasks = processTaskExpiration(tasks);
    // Save any changes
    store.set('local_tasks', tasks);
    // Return only active (not archived) tasks
    return tasks.filter(task => !task.archived);
}
function getArchivedTasks() {
    const tasks = store.get('local_tasks', []);
    return tasks.filter(task => task.archived);
}
function addLocalTask(task) {
    const newTask = {
        ...task,
        id: (0, uuid_1.v4)(),
        completed: false,
    };
    const tasks = getLocalTasks();
    store.set('local_tasks', [...tasks, newTask]);
    return newTask;
}
function updateLocalTask(updatedTask) {
    const tasks = store.get('local_tasks', []).map((task) => task.id === updatedTask.id ? updatedTask : task);
    store.set('local_tasks', tasks);
}
function deleteLocalTask(id) {
    const tasks = store.get('local_tasks', []).filter((task) => task.id !== id);
    store.set('local_tasks', tasks);
}
function restoreArchivedTask(id) {
    const tasks = store.get('local_tasks', []).map((task) => task.id === id ? { ...task, archived: false, expiredAt: undefined } : task);
    store.set('local_tasks', tasks);
}
function deleteArchivedTask(id) {
    const tasks = store.get('local_tasks', []).filter((task) => task.id !== id);
    store.set('local_tasks', tasks);
}
