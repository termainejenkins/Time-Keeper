"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const { ipcRenderer } = window.require('electron');
const TaskForm = ({ onTaskAdded }) => {
    const [title, setTitle] = (0, react_1.useState)('');
    const [start, setStart] = (0, react_1.useState)('');
    const [end, setEnd] = (0, react_1.useState)('');
    const [description, setDescription] = (0, react_1.useState)('');
    const [repeat, setRepeat] = (0, react_1.useState)('none');
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title || !start || !end)
            return;
        const newTask = await ipcRenderer.invoke('tasks:add', {
            title,
            start,
            end,
            description,
            repeat,
        });
        setTitle('');
        setStart('');
        setEnd('');
        setDescription('');
        setRepeat('none');
        if (onTaskAdded)
            onTaskAdded(newTask);
    };
    return ((0, jsx_runtime_1.jsxs)("form", { className: "task-form", onSubmit: handleSubmit, style: { marginBottom: 16 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Title", value: title, onChange: e => setTitle(e.target.value), required: true }), (0, jsx_runtime_1.jsx)("input", { type: "datetime-local", placeholder: "Start", value: start, onChange: e => setStart(e.target.value), required: true }), (0, jsx_runtime_1.jsx)("input", { type: "datetime-local", placeholder: "End", value: end, onChange: e => setEnd(e.target.value), required: true }), (0, jsx_runtime_1.jsx)("input", { type: "text", placeholder: "Description (optional)", value: description, onChange: e => setDescription(e.target.value) }), (0, jsx_runtime_1.jsxs)("select", { value: repeat, onChange: e => setRepeat(e.target.value), style: { marginBottom: 8 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "none", children: "Does not repeat" }), (0, jsx_runtime_1.jsx)("option", { value: "daily", children: "Daily" }), (0, jsx_runtime_1.jsx)("option", { value: "weekly", children: "Weekly" })] }), (0, jsx_runtime_1.jsx)("button", { type: "submit", children: "Add Task" })] }));
};
exports.default = TaskForm;
