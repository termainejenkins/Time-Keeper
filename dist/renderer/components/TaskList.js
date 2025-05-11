"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
// import TaskForm from './TaskForm';
const { ipcRenderer } = window.require('electron');
const TaskList = ({ fetchTasksRef }) => {
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const fetchTasks = (0, react_1.useCallback)(() => {
        ipcRenderer.invoke('tasks:get').then((fetched) => {
            setTasks(fetched);
        });
    }, []);
    (0, react_1.useEffect)(() => {
        // Minimal IPC test
        ipcRenderer.invoke('ping').then((result) => {
            console.log('Ping result:', result);
        });
        fetchTasks();
        if (fetchTasksRef) {
            fetchTasksRef.current = fetchTasks;
        }
    }, [fetchTasks, fetchTasksRef]);
    return ((0, jsx_runtime_1.jsx)("div", { className: "task-list", children: tasks.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { children: "No tasks found." })) : ((0, jsx_runtime_1.jsx)("ul", { children: tasks.map(task => {
                const startDate = new Date(task.start);
                const endDate = new Date(task.end);
                const dateRange = `${startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;
                const timeRange = `${startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })} - ${endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`;
                return ((0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsx)("strong", { children: task.title }), " (", dateRange, (0, jsx_runtime_1.jsx)("span", { style: { color: '#bbb', margin: '0 8px' }, children: "\u2022" }), (0, jsx_runtime_1.jsx)("span", { style: { color: '#888', fontSize: '0.97em' }, children: timeRange }), ")", task.completed && ' ✅', task.repeat && task.repeat !== 'none' && ((0, jsx_runtime_1.jsxs)("span", { style: { marginLeft: 8, color: '#888', fontSize: '0.9em' }, children: ["[Repeats: ", task.repeat.charAt(0).toUpperCase() + task.repeat.slice(1), "]"] }))] }, task.id));
            }) })) }));
};
exports.default = TaskList;
