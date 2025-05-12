"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
console.log("Renderer JS loaded!");
const client_1 = require("react-dom/client");
const HUD_1 = __importDefault(require("./components/HUD"));
const container = document.getElementById('root');
if (container) {
    const root = (0, client_1.createRoot)(container);
    root.render((0, jsx_runtime_1.jsx)(HUD_1.default, {}));
}
