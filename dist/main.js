"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
console.log("Main process started");
const electron_1 = require("electron");
const path = __importStar(require("path"));
const local_1 = require("./main/tasks/local");
class MainProcess {
    constructor() {
        this.mainWindow = null;
        this.managementWindow = null;
        this.tray = null;
        this.init();
    }
    init() {
        electron_1.app.whenReady().then(() => {
            this.createWindow();
            this.createTray();
            // IPC handlers for local tasks
            electron_1.ipcMain.handle('tasks:get', () => (0, local_1.getLocalTasks)());
            electron_1.ipcMain.handle('tasks:add', (_event, task) => (0, local_1.addLocalTask)(task));
            electron_1.ipcMain.handle('tasks:update', (_event, task) => (0, local_1.updateLocalTask)(task));
            electron_1.ipcMain.handle('tasks:delete', (_event, id) => (0, local_1.deleteLocalTask)(id));
            console.log("IPC handlers for local tasks registered");
            // Minimal IPC test
            electron_1.ipcMain.handle('ping', () => {
                console.log('Received ping from renderer');
                return 'pong';
            });
            // TODO: Add system tray integration here
        });
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                electron_1.app.quit();
            }
        });
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });
    }
    createWindow() {
        const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
        this.mainWindow = new electron_1.BrowserWindow({
            width: 320,
            height: 100,
            x: width - 340,
            y: 20,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        // Load the index.html file from dist/renderer
        this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
        // Make the window click-through
        this.mainWindow.setIgnoreMouseEvents(true);
        // TODO: Add click-through toggle logic here
        // Always open DevTools for debugging
        this.mainWindow.webContents.openDevTools({ mode: 'detach' });
        // Add context menu for HUD (fix: use webContents event)
        this.mainWindow.webContents.on('context-menu', (_event, params) => {
            // Temporarily disable click-through to allow menu interaction
            this.mainWindow.setIgnoreMouseEvents(false);
            const menu = electron_1.Menu.buildFromTemplate([
                {
                    label: 'Manage Tasks / Options',
                    click: () => this.openManagementWindow(),
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    click: () => electron_1.app.quit(),
                },
            ]);
            menu.popup({ window: this.mainWindow });
            // Re-enable click-through after menu closes
            menu.once('menu-will-close', () => {
                this.mainWindow.setIgnoreMouseEvents(true);
            });
        });
    }
    openManagementWindow() {
        if (this.managementWindow) {
            this.managementWindow.focus();
            return;
        }
        this.managementWindow = new electron_1.BrowserWindow({
            width: 500,
            height: 600,
            title: 'Time Keeper - Manage Tasks & Options',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.managementWindow.loadFile(path.join(__dirname, 'renderer/manage.html'));
        this.managementWindow.on('closed', () => {
            this.managementWindow = null;
        });
    }
    createTray() {
        console.log('createTray() called');
        if (this.tray) {
            console.log('Tray already exists, skipping creation.');
            return;
        }
        const fs = require('fs');
        const iconPath = path.join(__dirname, 'renderer/assets/icon.png');
        let trayIconPath = iconPath;
        if (!fs.existsSync(iconPath)) {
            // Fallback to Electron's default app icon (icon.ico or icon.png in app root)
            const appIconIco = path.join(electron_1.app.getAppPath(), 'icon.ico');
            const appIconPng = path.join(electron_1.app.getAppPath(), 'icon.png');
            if (fs.existsSync(appIconIco)) {
                trayIconPath = appIconIco;
            }
            else if (fs.existsSync(appIconPng)) {
                trayIconPath = appIconPng;
            }
            else {
                console.warn('No tray icon found at', iconPath, 'or default app icon. Tray will use a blank icon.');
                trayIconPath = undefined;
            }
        }
        console.log('Tray icon resolved path:', trayIconPath, '| Exists:', trayIconPath ? fs.existsSync(trayIconPath) : 'N/A');
        if (trayIconPath) {
            this.tray = new electron_1.Tray(trayIconPath);
        }
        else {
            this.tray = new electron_1.Tray(electron_1.nativeImage.createEmpty());
        }
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: 'Show HUD',
                click: () => {
                    if (this.mainWindow) {
                        this.mainWindow.show();
                        this.mainWindow.focus();
                    }
                },
            },
            {
                label: 'Manage Tasks / Options',
                click: () => this.openManagementWindow(),
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => electron_1.app.quit(),
            },
        ]);
        this.tray.setToolTip('Time Keeper');
        this.tray.setContextMenu(contextMenu);
    }
}
new MainProcess();
