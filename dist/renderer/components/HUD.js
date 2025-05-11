"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const HUD = () => {
    const [currentTime, setCurrentTime] = (0, react_1.useState)(new Date());
    const [tasks, setTasks] = (0, react_1.useState)([]);
    const [currentTask, setCurrentTask] = (0, react_1.useState)(null);
    const [nextTask, setNextTask] = (0, react_1.useState)(null);
    const [timeLeft, setTimeLeft] = (0, react_1.useState)(null);
    const [menuOpen, setMenuOpen] = (0, react_1.useState)(false);
    const [clickThrough, setClickThrough] = (0, react_1.useState)(true);
    const [showCurrentTime, setShowCurrentTime] = (0, react_1.useState)(false);
    const menuRef = (0, react_1.useRef)(null);
    const ipcRenderer = window.require?.('electron')?.ipcRenderer;
    // Place getCurrentAndNextTask function here (above useEffect)
    const getCurrentAndNextTask = (tasks, now) => {
        let current = null;
        let soonest = null;
        for (const task of tasks) {
            let occurrences = [];
            if (!task.repeat || task.repeat === 'none') {
                occurrences = [{ start: new Date(task.start), end: new Date(task.end) }];
            }
            else if (task.repeat === 'daily') {
                const baseStart = new Date(task.start);
                const baseEnd = new Date(task.end);
                const todayStart = new Date(now);
                todayStart.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
                const todayEnd = new Date(todayStart);
                todayEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0);
                if (todayEnd <= todayStart)
                    todayEnd.setDate(todayEnd.getDate() + 1); // handle overnight
                occurrences.push({ start: todayStart, end: todayEnd });
                // If already past, add tomorrow
                if (todayEnd <= now) {
                    const tomorrowStart = new Date(todayStart);
                    tomorrowStart.setDate(todayStart.getDate() + 1);
                    const tomorrowEnd = new Date(todayEnd);
                    tomorrowEnd.setDate(todayEnd.getDate() + 1);
                    occurrences.push({ start: tomorrowStart, end: tomorrowEnd });
                }
            }
            else if (task.repeat === 'weekly') {
                const baseStart = new Date(task.start);
                const baseEnd = new Date(task.end);
                const today = new Date(now);
                const dayDiff = (baseStart.getDay() - today.getDay() + 7) % 7;
                const thisWeekStart = new Date(today);
                thisWeekStart.setDate(today.getDate() + dayDiff);
                thisWeekStart.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
                const thisWeekEnd = new Date(thisWeekStart);
                thisWeekEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0);
                if (thisWeekEnd <= thisWeekStart)
                    thisWeekEnd.setDate(thisWeekEnd.getDate() + 1); // handle overnight
                occurrences.push({ start: thisWeekStart, end: thisWeekEnd });
                // If already past, add next week
                if (thisWeekEnd <= now) {
                    const nextWeekStart = new Date(thisWeekStart);
                    nextWeekStart.setDate(thisWeekStart.getDate() + 7);
                    const nextWeekEnd = new Date(thisWeekEnd);
                    nextWeekEnd.setDate(thisWeekEnd.getDate() + 7);
                    occurrences.push({ start: nextWeekStart, end: nextWeekEnd });
                }
            }
            for (const occ of occurrences) {
                if (occ.start <= now && now < occ.end) {
                    if (!current || occ.end < current.end) {
                        current = { task, end: occ.end };
                    }
                }
                else if (occ.start > now) {
                    const diff = occ.start.getTime() - now.getTime();
                    if (!soonest || diff < soonest.time) {
                        soonest = { task, time: diff };
                    }
                }
            }
        }
        return {
            currentTask: current ? current.task : null,
            currentTaskTimeLeft: current ? current.end.getTime() - now.getTime() : null,
            nextTask: soonest ? soonest.task : null,
            nextTaskTimeLeft: soonest ? soonest.time : null,
        };
    };
    // Fetch tasks from main process
    const fetchTasks = async () => {
        if (!ipcRenderer)
            return;
        const fetched = await ipcRenderer.invoke('tasks:get');
        setTasks(fetched);
    };
    // Find the next upcoming task, considering repeat
    const getNextTask = (tasks, now) => {
        let soonest = null;
        for (const task of tasks) {
            let startTimes = [];
            if (!task.repeat || task.repeat === 'none') {
                startTimes = [new Date(task.start)];
            }
            else if (task.repeat === 'daily') {
                // Next occurrence today or tomorrow
                const base = new Date(task.start);
                const today = new Date(now);
                today.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), 0);
                if (today >= now) {
                    startTimes = [today];
                }
                else {
                    const tomorrow = new Date(today);
                    tomorrow.setDate(today.getDate() + 1);
                    startTimes = [tomorrow];
                }
            }
            else if (task.repeat === 'weekly') {
                // Next occurrence this week or next
                const base = new Date(task.start);
                const today = new Date(now);
                const dayDiff = (base.getDay() - today.getDay() + 7) % 7;
                const next = new Date(today);
                next.setDate(today.getDate() + (dayDiff === 0 && today < base ? 0 : dayDiff || 7));
                next.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), 0);
                if (next < now)
                    next.setDate(next.getDate() + 7);
                startTimes = [next];
            }
            for (const start of startTimes) {
                const diff = start.getTime() - now.getTime();
                if (diff >= 0 && (!soonest || diff < soonest.time)) {
                    soonest = { task, time: diff };
                }
            }
        }
        return soonest ? { task: soonest.task, timeLeft: soonest.time } : { task: null, timeLeft: null };
    };
    // Fetch tasks on mount and when window regains focus
    (0, react_1.useEffect)(() => {
        fetchTasks();
        const onFocus = () => fetchTasks();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);
    // Update current/next task every second
    (0, react_1.useEffect)(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);
            const { currentTask, currentTaskTimeLeft, nextTask, nextTaskTimeLeft } = getCurrentAndNextTask(tasks, now);
            setCurrentTask(currentTask);
            setNextTask(currentTask ? null : nextTask); // Only show next if not in current
            setTimeLeft(currentTask ? currentTaskTimeLeft : nextTaskTimeLeft);
        }, 1000);
        return () => clearInterval(timer);
    }, [tasks]);
    // Close menu on outside click
    (0, react_1.useEffect)(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen]);
    // Handle click-through state with IPC
    (0, react_1.useEffect)(() => {
        if (ipcRenderer) {
            ipcRenderer.invoke('set-hud-click-through', clickThrough).catch((err) => {
                // Ignore missing handler errors in dev
                if (err && err.message && err.message.includes('No handler registered'))
                    return;
                console.error('set-hud-click-through error:', err);
            });
        }
    }, [clickThrough, ipcRenderer]);
    // Make hamburger always clickable: disable click-through when menu is open or button is hovered
    (0, react_1.useEffect)(() => {
        if (ipcRenderer) {
            if (menuOpen) {
                ipcRenderer.invoke('set-hud-click-through', false).catch((err) => {
                    if (err && err.message && err.message.includes('No handler registered'))
                        return;
                    console.error('set-hud-click-through error:', err);
                });
            }
            else {
                ipcRenderer.invoke('set-hud-click-through', clickThrough).catch((err) => {
                    if (err && err.message && err.message.includes('No handler registered'))
                        return;
                    console.error('set-hud-click-through error:', err);
                });
            }
        }
    }, [menuOpen, clickThrough, ipcRenderer]);
    const formatTime = (ms) => {
        if (ms === null || ms <= 0)
            return '00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`;
    };
    function formatTimeHMS(ms) {
        if (ms === null || ms <= 0)
            return '00:00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    const hasData = currentTime !== null && timeLeft !== null;
    const handleMenuClick = (action) => {
        setMenuOpen(false);
        if (!ipcRenderer)
            return;
        if (action === 'manage') {
            ipcRenderer.invoke('open-management-window', { alwaysOnTop: false });
        }
        else if (action === 'quit') {
            ipcRenderer.invoke('quit-app');
        }
    };
    return ((0, jsx_runtime_1.jsxs)(framer_motion_1.motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5 }, style: { position: 'relative' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    zIndex: 100,
                    pointerEvents: 'auto',
                    width: 40,
                    height: 40,
                    background: 'rgba(255,255,255,0.01)', // nearly invisible but hit-testable
                    borderRadius: 8,
                }, children: [(0, jsx_runtime_1.jsxs)("button", { className: "hud-hamburger", style: {
                            width: 32,
                            height: 32,
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            // @ts-ignore
                            'WebkitAppRegion': 'no-drag',
                        }, onClick: () => setMenuOpen((v) => !v), onMouseEnter: () => {
                            if (ipcRenderer)
                                ipcRenderer.invoke('set-hud-click-through', false);
                        }, onMouseLeave: () => {
                            if (ipcRenderer && !menuOpen)
                                ipcRenderer.invoke('set-hud-click-through', clickThrough);
                        }, "aria-label": "Menu", children: [(0, jsx_runtime_1.jsx)("span", { style: { display: 'block', width: 20, height: 2, background: '#333', borderRadius: 1, marginBottom: 4 } }), (0, jsx_runtime_1.jsx)("span", { style: { display: 'block', width: 20, height: 2, background: '#333', borderRadius: 1, marginBottom: 4 } }), (0, jsx_runtime_1.jsx)("span", { style: { display: 'block', width: 20, height: 2, background: '#333', borderRadius: 1 } })] }), menuOpen && ((0, jsx_runtime_1.jsxs)("div", { ref: menuRef, className: "hud-menu-dropdown", style: {
                            position: 'absolute',
                            top: 36,
                            right: 0,
                            background: 'white',
                            border: '1px solid #ddd',
                            borderRadius: 8,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                            zIndex: 200,
                            minWidth: 180,
                            padding: 0,
                            pointerEvents: 'auto',
                        }, children: [(0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', padding: '10px 16px', fontSize: 15, cursor: 'pointer' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: clickThrough, onChange: e => setClickThrough(e.target.checked), style: { marginRight: 8 } }), "Enable Click-Through"] }), (0, jsx_runtime_1.jsxs)("label", { style: { display: 'flex', alignItems: 'center', padding: '10px 16px', fontSize: 15, cursor: 'pointer' }, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: showCurrentTime, onChange: e => setShowCurrentTime(e.target.checked), style: { marginRight: 8 } }), "Show Current Time"] }), (0, jsx_runtime_1.jsx)("div", { style: { borderTop: '1px solid #eee' } }), (0, jsx_runtime_1.jsx)("button", { style: {
                                    width: '100%',
                                    padding: '10px 16px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    fontSize: 15,
                                }, onClick: () => handleMenuClick('manage'), children: "Options" }), (0, jsx_runtime_1.jsx)("div", { style: { borderTop: '1px solid #eee' } }), (0, jsx_runtime_1.jsx)("button", { style: {
                                    width: '100%',
                                    padding: '10px 16px',
                                    background: 'none',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    color: '#c00',
                                    fontSize: 15,
                                }, onClick: () => handleMenuClick('quit'), children: "Quit" })] }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "hud-container", style: { pointerEvents: 'none' }, children: [(0, jsx_runtime_1.jsx)("div", { className: "current-task-prominent", style: {
                            fontSize: '1.3em',
                            fontWeight: 700,
                            color: currentTask ? '#4fa3e3' : '#7fa7c7',
                            textShadow: '0 1px 4px rgba(0,0,0,0.10)',
                            marginBottom: 4,
                            textAlign: 'center',
                        }, children: currentTask ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["Now: ", (0, jsx_runtime_1.jsx)("span", { style: { textDecoration: 'underline' }, children: currentTask.title }), currentTask.repeat && currentTask.repeat !== 'none' && ((0, jsx_runtime_1.jsxs)("span", { style: { marginLeft: 8, color: '#888', fontSize: '0.7em', whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: 1 }, children: ["[Repeats: ", currentTask.repeat.charAt(0).toUpperCase() + currentTask.repeat.slice(1), "]"] }))] })) : ((0, jsx_runtime_1.jsx)("span", { style: { fontStyle: 'italic', color: '#7fa7c7' }, children: "Idle" })) }), (0, jsx_runtime_1.jsx)("div", { className: "current-task-timer", style: { fontSize: '1em', color: '#555', textAlign: 'center', marginBottom: 8 }, children: currentTask ? `(${formatTimeHMS(timeLeft)} left)` : '' }), showCurrentTime && ((0, jsx_runtime_1.jsx)("div", { className: "current-time", style: { fontSize: '1em', fontWeight: 500, marginBottom: 4 }, children: currentTime?.toLocaleTimeString() })), nextTask && ((0, jsx_runtime_1.jsxs)("div", { className: "next-event", style: { fontSize: '0.95em', color: '#888', textAlign: 'center', opacity: 0.7, marginTop: 2 }, children: ["Next: ", (0, jsx_runtime_1.jsx)("span", { children: nextTask.title }), nextTask.repeat && nextTask.repeat !== 'none' && ((0, jsx_runtime_1.jsxs)("span", { style: { marginLeft: 8, color: '#bbb', fontSize: '0.7em', whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: 1 }, children: ["[Repeats: ", nextTask.repeat.charAt(0).toUpperCase() + nextTask.repeat.slice(1), "]"] })), (0, jsx_runtime_1.jsxs)("span", { style: { marginLeft: 8, color: '#aaa', fontSize: '0.9em' }, children: ["(in ", formatTime(nextTask && !currentTask ? timeLeft : (nextTask ? (new Date(nextTask.start).getTime() - (currentTime ? currentTime.getTime() : 0)) : 0)), ")"] })] }))] })] }));
};
exports.default = HUD;
