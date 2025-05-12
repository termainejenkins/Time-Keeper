"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const TaskForm_1 = __importDefault(require("./TaskForm"));
const { ipcRenderer } = window.require('electron');
/**
 * Abbreviations for days of the week
 */
const DAY_ABBREVIATIONS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/**
 * Formats the repeat days display for a task
 * @param task The task to format repeat days for
 * @returns Formatted string representing the repeat schedule
 */
const formatRepeatDays = (task) => {
    if (!task.repeat || task.repeat === 'none')
        return '';
    switch (task.repeat) {
        case 'daily':
            return 'Every day';
        case 'weekly':
            return 'Weekly';
        case 'weekdays':
            if (task.repeatSettings?.type === 'weekdays') {
                const settings = task.repeatSettings;
                if (settings.days.length === 5 &&
                    settings.days.includes(1) &&
                    settings.days.includes(2) &&
                    settings.days.includes(3) &&
                    settings.days.includes(4) &&
                    settings.days.includes(5)) {
                    return 'M-F';
                }
                return settings.days.map(d => DAY_ABBREVIATIONS[d]).join('');
            }
            return 'M-F';
        case 'weekends':
            return 'Sa-Su';
        case 'every_other_day':
            return 'Every 2 days';
        case 'custom':
            if (task.repeatSettings?.type === 'custom_days') {
                return `Every ${task.repeatSettings.interval} days`;
            }
            return 'Custom';
        default:
            return task.repeat.charAt(0).toUpperCase() + task.repeat.slice(1);
    }
};
/**
 * TaskList component displays a list of tasks with inline editing capability
 */
const TaskList = ({ fetchTasksRef, darkMode = false }) => {
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const [editingTaskId, setEditingTaskId] = (0, react_1.useState)(null);
    const fetchTasks = (0, react_1.useCallback)(() => {
        ipcRenderer.invoke('tasks:get').then((fetched) => {
            console.log('Fetched tasks:', fetched);
            setTasks(fetched);
        });
    }, []);
    (0, react_1.useEffect)(() => {
        console.log('TaskList mounted');
        ipcRenderer.invoke('ping').then((result) => {
            console.log('Ping result:', result);
        });
        fetchTasks();
        if (fetchTasksRef) {
            fetchTasksRef.current = fetchTasks;
        }
    }, [fetchTasks, fetchTasksRef]);
    const handleEdit = (taskId) => {
        setEditingTaskId(taskId);
    };
    const handleTaskUpdated = (updatedTask) => {
        console.log('Updating task:', updatedTask);
        // Exit edit mode immediately
        setEditingTaskId(null);
        // Update local state immediately for smooth UI
        setTasks(prevTasks => {
            // If this is a new task (no id), add it to the list
            if (!updatedTask.id) {
                return [...prevTasks, updatedTask];
            }
            // Otherwise update the existing task
            return prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task);
        });
        // Send update to main process in the background
        if (updatedTask.id) {
            ipcRenderer.invoke('tasks:update', updatedTask).catch((error) => {
                console.error('Error updating task:', error);
                // Only fetch tasks if there was an error to ensure sync
                fetchTasks();
            });
        }
    };
    /**
     * Renders a single task item, either in edit mode or display mode
     */
    const renderTaskItem = (task) => {
        const startDate = new Date(task.start);
        const endDate = new Date(task.end);
        const timeRange = `${startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })} - ${endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`;
        const isEditing = editingTaskId === task.id;
        const bgColor = darkMode ? '#2c2f36' : '#fff';
        const textColor = darkMode ? '#f3f3f3' : '#222';
        const borderColor = darkMode ? '#444' : '#eee';
        const secondaryTextColor = darkMode ? '#b3b3b3' : '#888';
        if (isEditing) {
            return ((0, jsx_runtime_1.jsx)("li", { style: {
                    marginBottom: 12,
                    background: bgColor,
                    padding: '12px',
                    borderRadius: 6,
                    border: `1px solid ${borderColor}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }, children: (0, jsx_runtime_1.jsx)(TaskForm_1.default, { onTaskAdded: handleTaskUpdated, initialTask: task, onCancel: () => setEditingTaskId(null) }) }, task.id));
        }
        return ((0, jsx_runtime_1.jsxs)("li", { style: {
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: bgColor,
                padding: '8px 12px',
                borderRadius: 6,
                border: `1px solid ${borderColor}`,
                color: textColor
            }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: task.title }), (!task.repeat || task.repeat === 'none') && ((0, jsx_runtime_1.jsxs)("span", { style: { marginLeft: 8, color: secondaryTextColor }, children: ["(", startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), ")"] })), (0, jsx_runtime_1.jsx)("span", { style: { color: darkMode ? '#666' : '#bbb', margin: '0 8px' }, children: "\u2022" }), (0, jsx_runtime_1.jsx)("span", { style: { color: secondaryTextColor, fontSize: '0.97em' }, children: timeRange }), task.completed && ' ✅', task.repeat && task.repeat !== 'none' && ((0, jsx_runtime_1.jsxs)("span", { style: { marginLeft: 8, color: secondaryTextColor, fontSize: '0.9em' }, children: ["[", formatRepeatDays(task), "]"] }))] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleEdit(task.id), style: {
                        background: '#4fa3e3',
                        border: 'none',
                        borderRadius: 4,
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        color: '#fff',
                        fontWeight: 500,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }, children: "Edit" })] }, task.id));
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "task-list", children: tasks.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { textAlign: 'center', color: darkMode ? '#b3b3b3' : '#888', marginTop: 32 }, children: "No tasks yet. Add one above!" })) : ((0, jsx_runtime_1.jsx)("ul", { style: { listStyle: 'none', padding: 0, margin: 0 }, children: tasks.map(renderTaskItem) })) }));
};
exports.default = TaskList;
