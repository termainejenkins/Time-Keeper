"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const client_1 = require("react-dom/client");
const framer_motion_1 = require("framer-motion");
const HUD = () => {
    const [currentTime, setCurrentTime] = (0, react_1.useState)(new Date());
    // Hardcoded next event 5 minutes from now
    const nextEventTime = new Date(Date.now() + 5 * 60 * 1000);
    const [timeLeft, setTimeLeft] = (0, react_1.useState)(nextEventTime.getTime() - Date.now());
    (0, react_1.useEffect)(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            setTimeLeft(nextEventTime.getTime() - Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    const formatTime = (ms) => {
        if (ms <= 0)
            return '00:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds
            .toString()
            .padStart(2, '0')}`;
    };
    return ((0, jsx_runtime_1.jsx)(framer_motion_1.motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5 }, children: (0, jsx_runtime_1.jsxs)("div", { className: "hud-container", children: [(0, jsx_runtime_1.jsx)("div", { className: "current-time", children: currentTime.toLocaleTimeString() }), (0, jsx_runtime_1.jsxs)("div", { className: "next-event", children: ["Next event in: ", formatTime(timeLeft)] })] }) }));
};
const container = document.getElementById('root');
if (container) {
    const root = (0, client_1.createRoot)(container);
    root.render((0, jsx_runtime_1.jsx)(HUD, {}));
}
