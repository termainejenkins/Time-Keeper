"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocalTasks = getLocalTasks;
exports.addLocalTask = addLocalTask;
exports.updateLocalTask = updateLocalTask;
exports.deleteLocalTask = deleteLocalTask;
const electron_store_1 = __importDefault(require("electron-store"));
const uuid_1 = require("uuid");
const store = new electron_store_1.default();
function getLocalTasks() {
    return store.get('local_tasks', []);
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
    const tasks = getLocalTasks().map(task => task.id === updatedTask.id ? updatedTask : task);
    store.set('local_tasks', tasks);
}
function deleteLocalTask(id) {
    const tasks = getLocalTasks().filter(task => task.id !== id);
    store.set('local_tasks', tasks);
}
