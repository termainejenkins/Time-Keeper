"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const client_1 = require("react-dom/client");
const TaskForm_1 = __importDefault(require("./components/TaskForm"));
const TaskList_1 = __importDefault(require("./components/TaskList"));
console.log('Manage.tsx loaded!');
const sections = [
    { key: 'tasks', label: 'Tasks' },
    { key: 'hud', label: 'HUD Options' },
    { key: 'updates', label: 'Updates' },
    { key: 'archive', label: 'Archive' },
    { key: 'about', label: 'About' },
];
const defaultHudSettings = {
    darkMode: false,
    showCurrentTime: false,
    clickThrough: true,
    opacity: 0.85,
    placement: 'top-center',
    alwaysOnTop: true,
};
const getHudSettings = () => {
    try {
        const raw = localStorage.getItem('hudSettings');
        if (raw)
            return { ...defaultHudSettings, ...JSON.parse(raw) };
    }
    catch { }
    return { ...defaultHudSettings };
};
const saveHudSettings = (settings) => {
    localStorage.setItem('hudSettings', JSON.stringify(settings));
    // Send to HUD window
    if (window.require) {
        const { ipcRenderer } = window.require('electron');
        console.log('[Renderer] Sending hud-settings-update:', settings);
        ipcRenderer.send('hud-settings-update', settings);
    }
};
const App = () => {
    const [selected, setSelected] = (0, react_1.useState)('tasks');
    const fetchTasksRef = (0, react_1.useRef)(() => { });
    const handleTaskAdded = (0, react_1.useCallback)(() => {
        if (fetchTasksRef.current)
            fetchTasksRef.current();
    }, []);
    // HUD options state
    const [hudSettings, setHudSettings] = (0, react_1.useState)(getHudSettings());
    // Updates state
    const [appVersion, setAppVersion] = (0, react_1.useState)('');
    const [updateStatus, setUpdateStatus] = (0, react_1.useState)('idle');
    const [updateInfo, setUpdateInfo] = (0, react_1.useState)(null);
    const [autoUpdate, setAutoUpdate] = (0, react_1.useState)(true);
    const [checking, setChecking] = (0, react_1.useState)(false);
    // IPC helpers
    const ipc = window.require ? window.require('electron').ipcRenderer : null;
    // Archive state
    const [archivedTasks, setArchivedTasks] = (0, react_1.useState)([]);
    const fetchArchivedTasks = (0, react_1.useCallback)(() => {
        if (ipc)
            ipc.invoke('get-archived-tasks').then(setArchivedTasks);
    }, [ipc]);
    (0, react_1.useEffect)(() => {
        if (selected === 'archive')
            fetchArchivedTasks();
    }, [selected, fetchArchivedTasks]);
    const handleRestoreArchived = (id) => {
        if (ipc)
            ipc.invoke('restore-archived-task', id).then(fetchArchivedTasks);
    };
    const handleDeleteArchived = (id) => {
        if (ipc)
            ipc.invoke('delete-archived-task', id).then(fetchArchivedTasks);
    };
    // Apply instantly on change
    (0, react_1.useEffect)(() => {
        saveHudSettings(hudSettings);
    }, [hudSettings]);
    // Set body and #root background to match app background
    (0, react_1.useEffect)(() => {
        const bg = hudSettings.darkMode ? '#23272f' : '#f6f7fb';
        document.body.style.background = bg;
        const root = document.getElementById('root');
        if (root)
            root.style.background = bg;
    }, [hudSettings.darkMode]);
    (0, react_1.useEffect)(() => {
        if (selected === 'hud') {
            console.log('Rendering HUD Options section');
            if (window.require) {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('test-event', { foo: 123 });
                console.log('[Renderer] Sent test-event');
            }
        }
    }, [selected]);
    // Fetch version and update status on mount
    (0, react_1.useEffect)(() => {
        if (ipc) {
            ipc.invoke('get-app-version').then(setAppVersion);
            ipc.invoke('get-update-status').then((data) => {
                setUpdateStatus(data.status);
                setUpdateInfo(data.info);
                setAutoUpdate(data.autoUpdate);
            });
            ipc.on('update-status', (_event, { status, info }) => {
                setUpdateStatus(status);
                setUpdateInfo(info);
                setChecking(false);
            });
        }
        return () => {
            if (ipc)
                ipc.removeAllListeners('update-status');
        };
    }, []);
    const handleManualCheck = () => {
        if (ipc) {
            setChecking(true);
            ipc.invoke('check-for-updates');
        }
    };
    const handleToggleAutoUpdate = (e) => {
        const enabled = e.target.checked;
        setAutoUpdate(enabled);
        if (ipc)
            ipc.invoke('set-auto-update', enabled);
    };
    const handleReset = () => {
        setHudSettings({ ...defaultHudSettings });
    };
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: 'flex',
            height: '100vh',
            width: '100vw',
            background: hudSettings.darkMode ? '#23272f' : '#f6f7fb',
            fontFamily: 'Inter, Arial, sans-serif',
            color: hudSettings.darkMode ? '#f3f3f3' : '#222',
            transition: 'background 0.2s, color 0.2s',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
        }, children: [(0, jsx_runtime_1.jsx)("nav", { style: {
                    width: 160,
                    height: '100vh', // Ensure sidebar fills height
                    background: hudSettings.darkMode ? '#181b20' : '#fff',
                    borderRight: hudSettings.darkMode ? '1px solid #2c2f36' : '1px solid #eee',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: 0, // Remove vertical padding
                    boxShadow: hudSettings.darkMode ? '2px 0 8px rgba(0,0,0,0.12)' : '2px 0 8px rgba(0,0,0,0.03)',
                    transition: 'background 0.2s, border 0.2s',
                }, children: (0, jsx_runtime_1.jsx)("div", { style: { padding: '24px 0', flex: 1, display: 'flex', flexDirection: 'column' }, children: sections.map(s => ((0, jsx_runtime_1.jsx)("button", { onClick: () => setSelected(s.key), style: {
                            background: selected === s.key ? (hudSettings.darkMode ? '#23272f' : '#e3e8f0') : 'none',
                            border: 'none',
                            borderLeft: selected === s.key ? '4px solid #4fa3e3' : '4px solid transparent',
                            color: hudSettings.darkMode ? (selected === s.key ? '#fff' : '#b3b3b3') : '#222',
                            fontWeight: selected === s.key ? 700 : 400,
                            fontSize: 16,
                            padding: '12px 20px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'background 0.2s, border 0.2s, color 0.2s',
                        }, children: s.label }, s.key))) }) }), (0, jsx_runtime_1.jsxs)("main", { style: {
                    flex: 1,
                    padding: '32px 40px',
                    background: hudSettings.darkMode ? '#23272f' : '#f6f7fb',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    color: hudSettings.darkMode ? '#f3f3f3' : '#222',
                    transition: 'background 0.2s, color 0.2s',
                    minHeight: '100vh',
                    boxSizing: 'border-box',
                }, children: [selected === 'tasks' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontWeight: 700, fontSize: 24, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }, children: "Tasks" }), (0, jsx_runtime_1.jsx)(TaskForm_1.default, { onTaskAdded: handleTaskAdded }), (0, jsx_runtime_1.jsx)(TaskList_1.default, { fetchTasksRef: fetchTasksRef })] })), selected === 'hud' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontWeight: 700, fontSize: 24, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }, children: "HUD Options" }), (0, jsx_runtime_1.jsxs)("div", { style: { color: hudSettings.darkMode ? '#f3f3f3' : '#222', fontSize: 16, marginTop: 24, maxWidth: 400 }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: hudSettings.darkMode, onChange: e => setHudSettings((s) => ({ ...s, darkMode: e.target.checked })) }), "Dark mode"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: hudSettings.showCurrentTime, onChange: e => setHudSettings((s) => ({ ...s, showCurrentTime: e.target.checked })) }), "Show current time"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: hudSettings.clickThrough, onChange: e => setHudSettings((s) => ({ ...s, clickThrough: e.target.checked })) }), "Enable click-through"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: hudSettings.alwaysOnTop, onChange: e => setHudSettings((s) => ({ ...s, alwaysOnTop: e.target.checked })) }), "Always on Top"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }, children: ["Placement", (0, jsx_runtime_1.jsxs)("select", { value: hudSettings.placement, onChange: e => {
                                                    console.log('[Renderer] Placement changed to:', e.target.value);
                                                    setHudSettings((s) => ({ ...s, placement: e.target.value }));
                                                }, style: { marginLeft: 12 }, children: [(0, jsx_runtime_1.jsx)("option", { value: "top-left", children: "Top Left" }), (0, jsx_runtime_1.jsx)("option", { value: "top-center", children: "Top Center" }), (0, jsx_runtime_1.jsx)("option", { value: "top-right", children: "Top Right" }), (0, jsx_runtime_1.jsx)("option", { value: "bottom-left", children: "Bottom Left" }), (0, jsx_runtime_1.jsx)("option", { value: "bottom-center", children: "Bottom Center" }), (0, jsx_runtime_1.jsx)("option", { value: "bottom-right", children: "Bottom Right" }), (0, jsx_runtime_1.jsx)("option", { value: "center", children: "Center" })] })] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }, children: ["Opacity", (0, jsx_runtime_1.jsx)("input", { type: "range", min: 0.5, max: 1, step: 0.01, value: hudSettings.opacity, onChange: e => setHudSettings((s) => ({ ...s, opacity: Number(e.target.value) })), style: { flex: 1, marginLeft: 12 } }), (0, jsx_runtime_1.jsxs)("span", { style: { width: 40, textAlign: 'right', color: hudSettings.darkMode ? '#b3b3b3' : '#888', fontSize: 15 }, children: [Math.round(hudSettings.opacity * 100), "%"] })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleReset, style: {
                                            marginTop: 12,
                                            background: hudSettings.darkMode ? '#23272f' : '#f3f3f3',
                                            border: hudSettings.darkMode ? '1px solid #444' : '1px solid #ddd',
                                            borderRadius: 6,
                                            padding: '8px 18px',
                                            fontSize: 15,
                                            color: hudSettings.darkMode ? '#f3f3f3' : '#444',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            transition: 'background 0.2s, border 0.2s',
                                        }, children: "Reset to Defaults" })] }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                    marginTop: 40,
                                    background: hudSettings.darkMode ? 'rgba(30,34,40,0.95)' : `rgba(0,0,0,${hudSettings.opacity})`,
                                    borderRadius: 10,
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                                    padding: 24,
                                    color: hudSettings.darkMode ? '#f3f3f3' : '#fff',
                                    minHeight: 80,
                                    maxWidth: 340,
                                    fontSize: 18,
                                    fontWeight: 500,
                                    letterSpacing: 0.2,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    border: hudSettings.darkMode ? '1.5px solid #222' : '1.5px solid #2222',
                                    transition: 'background 0.2s, color 0.2s',
                                }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontWeight: 700, fontSize: 20, marginBottom: 6, color: hudSettings.darkMode ? '#b3d1f7' : '#cce6ff' }, children: "HUD Preview" }), (0, jsx_runtime_1.jsxs)("span", { style: { fontSize: 16, color: hudSettings.darkMode ? '#b3d1f7' : '#cce6ff' }, children: ["Current Task: ", (0, jsx_runtime_1.jsx)("b", { style: { color: hudSettings.darkMode ? '#fff' : '#fff' }, children: "Example Task" })] }), hudSettings.showCurrentTime && ((0, jsx_runtime_1.jsx)("span", { style: { fontSize: 15, color: hudSettings.darkMode ? '#eee' : '#e0e0e0', marginTop: 4 }, children: "12:34:56 PM" })), (0, jsx_runtime_1.jsx)("span", { style: { fontSize: 15, color: hudSettings.darkMode ? '#eee' : '#e0e0e0', marginTop: 4 }, children: "(00:12:34 left)" })] })] })), selected === 'updates' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontWeight: 700, fontSize: 24, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }, children: "Updates" }), (0, jsx_runtime_1.jsxs)("div", { style: { color: hudSettings.darkMode ? '#f3f3f3' : '#222', fontSize: 16, marginTop: 24, maxWidth: 500 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Current Version:" }), " ", appVersion] }), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Update Status:" }), " ", checking ? 'Checking...' : updateStatus.charAt(0).toUpperCase() + updateStatus.slice(1)] }), updateStatus === 'available' && updateInfo && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12, color: '#4fa3e3' }, children: [(0, jsx_runtime_1.jsx)("b", { children: "New version available:" }), " ", updateInfo.version || ''] })), updateStatus === 'downloading' && updateInfo && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12, color: '#4fa3e3' }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Downloading update..." }), " ", updateInfo.percent ? `${Math.round(updateInfo.percent)}%` : ''] })), updateStatus === 'downloaded' && updateInfo && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12, color: '#4fa3e3' }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Update downloaded!" }), " Restart the app to apply the update."] })), updateStatus === 'error' && updateInfo && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12, color: 'red' }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Update error:" }), " ", updateInfo.message || String(updateInfo)] })), updateInfo && updateInfo.releaseNotes && ((0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12 }, children: [(0, jsx_runtime_1.jsx)("b", { children: "Release Notes:" }), (0, jsx_runtime_1.jsx)("div", { style: { background: '#2222', padding: 10, borderRadius: 6, marginTop: 4, maxHeight: 120, overflowY: 'auto', fontSize: 15 }, dangerouslySetInnerHTML: { __html: updateInfo.releaseNotes } })] })), (0, jsx_runtime_1.jsxs)("div", { style: { marginBottom: 12 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: handleManualCheck, disabled: checking, style: {
                                                    background: '#4fa3e3', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 15, cursor: 'pointer', fontWeight: 500, marginRight: 16
                                                }, children: "Check for Updates" }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: autoUpdate, onChange: handleToggleAutoUpdate }), "Enable Auto-Update"] })] })] })] })), selected === 'archive' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontWeight: 700, fontSize: 24, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }, children: "Archive" }), (0, jsx_runtime_1.jsxs)("div", { style: { color: hudSettings.darkMode ? '#f3f3f3' : '#222', fontSize: 16, marginTop: 24, maxWidth: 600 }, children: [archivedTasks.length === 0 && (0, jsx_runtime_1.jsx)("div", { children: "No archived tasks." }), archivedTasks.map(task => ((0, jsx_runtime_1.jsxs)("div", { style: {
                                            background: hudSettings.darkMode ? '#23272f' : '#f6f7fb',
                                            border: '1px solid #ccc',
                                            borderRadius: 8,
                                            padding: 16,
                                            marginBottom: 14,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6
                                        }, children: [(0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("b", { children: task.title }) }), (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 14, color: '#888' }, children: ["Ended: ", new Date(task.end).toLocaleString()] }), task.expiredAt && (0, jsx_runtime_1.jsxs)("div", { style: { fontSize: 13, color: '#aaa' }, children: ["Archived: ", new Date(task.expiredAt + 24 * 60 * 60 * 1000).toLocaleString()] }), (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', gap: 10, marginTop: 6 }, children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => handleRestoreArchived(task.id), style: { background: '#4fa3e3', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }, children: "Restore" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleDeleteArchived(task.id), style: { background: '#e34f4f', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }, children: "Delete" })] })] }, task.id)))] })] })), selected === 'about' && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h2", { style: { fontWeight: 700, fontSize: 24, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }, children: "About" }), (0, jsx_runtime_1.jsxs)("div", { style: { color: hudSettings.darkMode ? '#b3b3b3' : '#666', fontSize: 16, marginTop: 24 }, children: [(0, jsx_runtime_1.jsx)("p", { children: "Time Keeper v1.0" }), (0, jsx_runtime_1.jsx)("p", { children: "Modern minimalist time/task HUD for desktop." }), (0, jsx_runtime_1.jsxs)("p", { style: { fontSize: 14, color: hudSettings.darkMode ? '#888' : '#aaa', marginTop: 16 }, children: ["\u00A9 ", new Date().getFullYear(), " Time Keeper"] })] })] }))] })] }));
};
const container = document.getElementById('root');
if (container) {
    const root = (0, client_1.createRoot)(container);
    root.render((0, jsx_runtime_1.jsx)(App, {}));
}
