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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
console.log("Main process started");
const electron_1 = require("electron");
const path = __importStar(require("path"));
const local_1 = require("./main/tasks/local");
const menu_1 = require("./shared/menu");
const electron_store_1 = __importDefault(require("electron-store"));
const electron_updater_1 = require("electron-updater");
class MainProcess {
    constructor() {
        this.mainWindow = null;
        this.managementWindow = null;
        this.tray = null;
        this.settingsStore = new electron_store_1.default();
        this.updateStatus = 'idle';
        this.updateInfo = null;
        this.updateStore = new electron_store_1.default();
        this.autoUpdateEnabled = this.updateStore.get('autoUpdate', true);
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
            // IPC for HUD hamburger menu
            electron_1.ipcMain.handle('open-management-window', (_event, settings) => {
                const alwaysOnTop = settings && typeof settings.alwaysOnTop === 'boolean' ? settings.alwaysOnTop : false;
                this.openManagementWindow(alwaysOnTop);
            });
            electron_1.ipcMain.handle('quit-app', () => {
                electron_1.app.quit();
            });
            electron_1.ipcMain.handle('set-hud-click-through', (_event, enabled) => {
                if (this.mainWindow) {
                    this.mainWindow.setIgnoreMouseEvents(!!enabled);
                }
            });
            // Listen for HUD settings updates (placement, etc)
            electron_1.ipcMain.on('hud-settings-update', (_event, settings) => {
                console.log('[IPC] hud-settings-update received:', settings);
                this.updateHudPlacement(settings?.placement);
                if (this.mainWindow && typeof settings?.alwaysOnTop === 'boolean') {
                    this.mainWindow.setAlwaysOnTop(!!settings.alwaysOnTop);
                    this.settingsStore.set('hudSettings', settings);
                }
            });
            electron_1.ipcMain.on('test-event', (_event, data) => {
                console.log('[IPC] test-event received:', data);
            });
            // Auto-update logic
            if (this.autoUpdateEnabled) {
                electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
            }
            electron_updater_1.autoUpdater.on('checking-for-update', () => {
                this.sendUpdateStatusToAll('checking');
            });
            electron_updater_1.autoUpdater.on('update-available', (info) => {
                this.sendUpdateStatusToAll('available', info);
            });
            electron_updater_1.autoUpdater.on('update-not-available', (info) => {
                this.sendUpdateStatusToAll('not-available', info);
            });
            electron_updater_1.autoUpdater.on('download-progress', (progress) => {
                this.sendUpdateStatusToAll('downloading', progress);
            });
            electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
                this.sendUpdateStatusToAll('downloaded', info);
                electron_1.dialog.showMessageBox({
                    type: 'info',
                    title: 'Update Ready',
                    message: 'A new version has been downloaded. Restart to apply the update?',
                    buttons: ['Restart', 'Later'],
                    defaultId: 0,
                }).then(result => {
                    if (result.response === 0) {
                        electron_updater_1.autoUpdater.quitAndInstall();
                    }
                });
            });
            electron_updater_1.autoUpdater.on('error', (err) => {
                this.sendUpdateStatusToAll('error', err);
            });
            // IPC for update info and actions
            electron_1.ipcMain.handle('get-app-version', () => electron_1.app.getVersion());
            electron_1.ipcMain.handle('get-update-status', () => ({ status: this.updateStatus, info: this.updateInfo, autoUpdate: this.autoUpdateEnabled }));
            electron_1.ipcMain.handle('check-for-updates', () => {
                electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
                return true;
            });
            electron_1.ipcMain.handle('set-auto-update', (_event, enabled) => {
                this.autoUpdateEnabled = enabled;
                this.updateStore.set('autoUpdate', enabled);
                if (enabled) {
                    electron_updater_1.autoUpdater.checkForUpdatesAndNotify();
                }
                return enabled;
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
    getAppIconPathAndLog() {
        console.log('[DEBUG] getAppIconPathAndLog called');
        const fs = require('fs');
        // Write to a debug file to confirm execution
        try {
            fs.appendFileSync('app_icon_debug.log', `[${new Date().toISOString()}] getAppIconPathAndLog called\n`);
        }
        catch (e) {
            // ignore
        }
        const iconPath = path.join(__dirname, 'renderer/assets/icon.png');
        let appIconPath = undefined;
        let iconSource = '';
        if (fs.existsSync(iconPath)) {
            appIconPath = iconPath;
            iconSource = `custom icon at ${iconPath}`;
        }
        else {
            // Fallback to Electron's default app icon (icon.ico or icon.png in app root)
            const appIconIco = path.join(electron_1.app.getAppPath(), 'icon.ico');
            const appIconPng = path.join(electron_1.app.getAppPath(), 'icon.png');
            if (fs.existsSync(appIconIco)) {
                appIconPath = appIconIco;
                iconSource = `fallback icon.ico at ${appIconIco}`;
            }
            else if (fs.existsSync(appIconPng)) {
                appIconPath = appIconPng;
                iconSource = `fallback icon.png at ${appIconPng}`;
            }
            else {
                iconSource = 'no icon found, using Electron blank icon';
            }
        }
        if (appIconPath) {
            console.log('App icon: using', iconSource);
        }
        else {
            console.warn('App icon: no icon found, using Electron blank icon');
        }
        return appIconPath;
    }
    createWindow() {
        console.log('[DEBUG] createWindow called');
        const { width, height } = electron_1.screen.getPrimaryDisplay().workAreaSize;
        const savedPlacement = this.settingsStore.get('hudPlacement', 'top-right');
        const hudSettings = this.settingsStore.get('hudSettings', { alwaysOnTop: true });
        const appIconPath = this.getAppIconPathAndLog();
        this.mainWindow = new electron_1.BrowserWindow({
            width: 320,
            height: 100,
            x: width - 340,
            y: 20,
            frame: false,
            transparent: true,
            alwaysOnTop: !!hudSettings.alwaysOnTop,
            icon: appIconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        // Set dock icon for macOS
        if (process.platform === 'darwin' && appIconPath) {
            electron_1.app.dock.setIcon(appIconPath);
        }
        this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
        this.mainWindow.setIgnoreMouseEvents(true, { forward: true });
        this.mainWindow.webContents.openDevTools({ mode: 'detach' });
        this.mainWindow.webContents.on('context-menu', (_event, params) => {
            this.mainWindow.setIgnoreMouseEvents(false);
            const menu = electron_1.Menu.buildFromTemplate(this.buildMenuTemplate());
            menu.popup({ window: this.mainWindow });
            menu.once('menu-will-close', () => {
                this.mainWindow.setIgnoreMouseEvents(true);
            });
        });
        this.mainWindow.once('ready-to-show', () => {
            this.updateHudPlacement(savedPlacement);
        });
    }
    openManagementWindow(alwaysOnTop = false) {
        console.log('[DEBUG] openManagementWindow called');
        if (this.managementWindow) {
            this.managementWindow.focus();
            return;
        }
        console.log('Opening Options window');
        const { workArea } = electron_1.screen.getPrimaryDisplay();
        const winWidth = workArea.width; // 100% of work area
        const winHeight = workArea.height; // 100% of work area
        const x = workArea.x;
        const y = workArea.y;
        const appIconPath = this.getAppIconPathAndLog();
        this.managementWindow = new electron_1.BrowserWindow({
            width: winWidth,
            height: winHeight,
            x,
            y,
            title: 'Time Keeper - Options',
            alwaysOnTop,
            fullscreen: false,
            icon: appIconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        // Set dock icon for macOS
        if (process.platform === 'darwin' && appIconPath) {
            electron_1.app.dock.setIcon(appIconPath);
        }
        this.managementWindow.loadFile(path.join(__dirname, 'renderer/manage.html'));
        this.managementWindow.once('ready-to-show', () => {
            if (this.managementWindow) {
                this.managementWindow.setMenuBarVisibility(true);
                this.managementWindow.show();
            }
        });
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
        let trayIconPath = undefined;
        let iconSource = '';
        if (fs.existsSync(iconPath)) {
            trayIconPath = iconPath;
            iconSource = `custom icon at ${iconPath}`;
        }
        else {
            // Fallback to Electron's default app icon (icon.ico or icon.png in app root)
            const appIconIco = path.join(electron_1.app.getAppPath(), 'icon.ico');
            const appIconPng = path.join(electron_1.app.getAppPath(), 'icon.png');
            if (fs.existsSync(appIconIco)) {
                trayIconPath = appIconIco;
                iconSource = `fallback icon.ico at ${appIconIco}`;
            }
            else if (fs.existsSync(appIconPng)) {
                trayIconPath = appIconPng;
                iconSource = `fallback icon.png at ${appIconPng}`;
            }
            else {
                iconSource = 'no icon found, using Electron blank icon';
            }
        }
        if (trayIconPath) {
            this.tray = new electron_1.Tray(trayIconPath);
            console.log('Tray icon: using', iconSource);
        }
        else {
            this.tray = new electron_1.Tray(electron_1.nativeImage.createEmpty());
            console.warn('Tray icon: no icon found, using Electron blank icon');
        }
        const contextMenu = electron_1.Menu.buildFromTemplate(this.buildMenuTemplate());
        this.tray.setToolTip('Time Keeper');
        this.tray.setContextMenu(contextMenu);
    }
    buildMenuTemplate() {
        return menu_1.sharedMenu.map(item => {
            if ('separator' in item && item.separator)
                return { type: 'separator' };
            if (item.action === 'show-hud') {
                return {
                    label: item.label,
                    click: () => {
                        if (this.mainWindow) {
                            this.mainWindow.show();
                            this.mainWindow.focus();
                        }
                    },
                };
            }
            else if (item.action === 'manage') {
                return {
                    label: item.label,
                    click: () => this.openManagementWindow(),
                };
            }
            else if (item.action === 'quit') {
                return {
                    label: item.label,
                    click: () => electron_1.app.quit(),
                };
            }
            // If action is unknown, skip this item
            return null;
        }).filter(Boolean);
    }
    updateHudPlacement(placement) {
        if (!this.mainWindow)
            return;
        console.log('[HUD] updateHudPlacement called with:', placement);
        this.settingsStore.set('hudPlacement', placement); // persist
        const { width: screenW, height: screenH } = electron_1.screen.getPrimaryDisplay().workAreaSize;
        const [hudW, hudH] = [this.mainWindow.getBounds().width, this.mainWindow.getBounds().height];
        let x = 0, y = 0;
        switch (placement) {
            case 'top-left':
                x = 20;
                y = 20;
                break;
            case 'top-center':
                x = Math.round((screenW - hudW) / 2);
                y = 20;
                break;
            case 'top-right':
                x = screenW - hudW - 20;
                y = 20;
                break;
            case 'bottom-left':
                x = 20;
                y = screenH - hudH - 20;
                break;
            case 'bottom-center':
                x = Math.round((screenW - hudW) / 2);
                y = screenH - hudH - 20;
                break;
            case 'bottom-right':
                x = screenW - hudW - 20;
                y = screenH - hudH - 20;
                break;
            case 'center':
                x = Math.round((screenW - hudW) / 2);
                y = Math.round((screenH - hudH) / 2);
                break;
            default:
                x = screenW - hudW - 20;
                y = 20;
        }
        console.log(`[HUD] setPosition: (${x}, ${y}) for placement: ${placement}, window size: (${hudW}, ${hudH}), screen: (${screenW}, ${screenH})`);
        this.mainWindow.setPosition(x, y);
    }
    sendUpdateStatusToAll(status, info = null) {
        this.updateStatus = status;
        this.updateInfo = info;
        electron_1.BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('update-status', { status, info });
        });
    }
}
new MainProcess();
