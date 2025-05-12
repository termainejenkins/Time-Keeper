"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const { ipcRenderer } = window.require('electron');
const WEEKDAYS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];
const TaskForm = ({ onTaskAdded, initialTask, onCancel }) => {
    const [title, setTitle] = (0, react_1.useState)('');
    const [start, setStart] = (0, react_1.useState)('');
    const [end, setEnd] = (0, react_1.useState)('');
    const [description, setDescription] = (0, react_1.useState)('');
    const [repeat, setRepeat] = (0, react_1.useState)('none');
    const [customInterval, setCustomInterval] = (0, react_1.useState)(2);
    const [selectedWeekdays, setSelectedWeekdays] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        if (initialTask) {
            setTitle(initialTask.title);
            setStart(initialTask.start);
            setEnd(initialTask.end);
            setDescription(initialTask.description || '');
            setRepeat(initialTask.repeat || 'none');
            if (initialTask.repeatSettings?.type === 'custom_days') {
                setCustomInterval(initialTask.repeatSettings.interval);
            }
            else if (initialTask.repeatSettings?.type === 'weekdays') {
                setSelectedWeekdays(initialTask.repeatSettings.days);
            }
        }
    }, [initialTask]);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !start || !end)
            return;
        let repeatSettings;
        if (repeat === 'custom') {
            repeatSettings = {
                type: 'custom_days',
                interval: customInterval
            };
        }
        else if (repeat === 'weekdays') {
            repeatSettings = {
                type: 'weekdays',
                days: selectedWeekdays
            };
        }
        const taskData = {
            title,
            start,
            end,
            description,
            repeat,
            repeatSettings,
        };
        // Create the updated task object
        const updatedTask = initialTask
            ? { ...initialTask, ...taskData }
            : { ...taskData, id: '', completed: false };
        // Call onTaskAdded immediately with the optimistic update
        if (onTaskAdded)
            onTaskAdded(updatedTask);
        // Then send to main process
        try {
            if (initialTask) {
                await ipcRenderer.invoke('tasks:update', updatedTask);
            }
            else {
                const newTask = await ipcRenderer.invoke('tasks:add', taskData);
                if (onTaskAdded)
                    onTaskAdded(newTask);
            }
        }
        catch (error) {
            console.error('Error saving task:', error);
        }
        if (!initialTask) {
            setTitle('');
            setStart('');
            setEnd('');
            setDescription('');
            setRepeat('none');
            setCustomInterval(2);
            setSelectedWeekdays([]);
        }
    };
    const handleWeekdayToggle = (day) => {
        setSelectedWeekdays(prev => prev.includes(day)
            ? prev.filter(d => d !== day)
            : [...prev, day].sort());
    };
    return ((0, jsx_runtime_1.jsxs)("form", { className: "task-form", onSubmit: handleSubmit, style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Title", value: title, onChange: e => setTitle(e.target.value), required: true }), (0, jsx_runtime_1.jsx)("input", { type: "datetime-local", placeholder: "Start", value: start, onChange: e => setStart(e.target.value), required: true }), (0, jsx_runtime_1.jsx)("input", { type: "datetime-local", placeholder: "End", value: end, onChange: e => setEnd(e.target.value), required: true }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Description (optional)", value: description, onChange: e => setDescription(e.target.value) }), (0, jsx_runtime_1.jsxs)("select", { value: repeat, onChange: e => setRepeat(e.target.value), style: { marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "none", children: "Does not repeat" }), (0, jsx_runtime_1.jsx)("option", { value: "daily", children: "Daily" }), (0, jsx_runtime_1.jsx)("option", { value: "weekly", children: "Weekly" }), (0, jsx_runtime_1.jsx)("option", { value: "weekdays", children: "Weekdays (Mon-Fri)" }), (0, jsx_runtime_1.jsx)("option", { value: "weekends", children: "Weekends (Sat-Sun)" }), (0, jsx_runtime_1.jsx)("option", { value: "every_other_day", children: "Every other day" }), (0, jsx_runtime_1.jsx)("option", { value: "custom", children: "Custom interval" })] }), repeat === 'custom' && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("label", { children: "Repeat every " }), (0, jsx_runtime_1.jsx)("input", { type: "number", min: "1", value: customInterval, onChange: e => setCustomInterval(parseInt(e.target.value)), style: { width: 60, marginRight: 4 } }), (0, jsx_runtime_1.jsx)("label", { children: " days" })] })), repeat === 'weekdays' && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("label", { children: "Select days:" }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }, children: WEEKDAYS.map(day => ((0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', marginRight: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: selectedWeekdays.includes(day.value), onChange: () => handleWeekdayToggle(day.value), style: { marginRight: 4 } }), day.label] }, day.value))) })] })), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("button", { type: "submit", children: initialTask ? 'Update Task' : 'Add Task' }), initialTask && onCancel && ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onCancel, style: { background: '#f5f5f5', color: '#666' }, children: "Cancel" }))] })] }));
};
exports.default = TaskForm;
