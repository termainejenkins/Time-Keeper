console.log("Main process started")

import { app, BrowserWindow, screen, ipcMain, Menu, Tray, nativeImage } from 'electron';
import * as path from 'path';
import { getLocalTasks, addLocalTask, updateLocalTask, deleteLocalTask } from './main/tasks/local';

class MainProcess {
  private mainWindow: BrowserWindow | null = null;
  private managementWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;

  constructor() {
    this.init();
  }

  private init() {
    app.whenReady().then(() => {
      this.createWindow();
      this.createTray();
      // IPC handlers for local tasks
      ipcMain.handle('tasks:get', () => getLocalTasks());
      ipcMain.handle('tasks:add', (_event, task) => addLocalTask(task));
      ipcMain.handle('tasks:update', (_event, task) => updateLocalTask(task));
      ipcMain.handle('tasks:delete', (_event, id) => deleteLocalTask(id));
      console.log("IPC handlers for local tasks registered");
      // Minimal IPC test
      ipcMain.handle('ping', () => {
        console.log('Received ping from renderer');
        return 'pong';
      });
      // TODO: Add system tray integration here
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    
    this.mainWindow = new BrowserWindow({
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
      this.mainWindow!.setIgnoreMouseEvents(false);
      const menu = Menu.buildFromTemplate([
        {
          label: 'Manage Tasks / Options',
          click: () => this.openManagementWindow(),
        },
        { type: 'separator' },
        {
          label: 'Quit',
          click: () => app.quit(),
        },
      ]);
      menu.popup({ window: this.mainWindow! });
      // Re-enable click-through after menu closes
      menu.once('menu-will-close', () => {
        this.mainWindow!.setIgnoreMouseEvents(true);
      });
    });
  }

  private openManagementWindow() {
    if (this.managementWindow) {
      this.managementWindow.focus();
      return;
    }
    this.managementWindow = new BrowserWindow({
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

  private createTray() {
    console.log('createTray() called');
    if (this.tray) {
      console.log('Tray already exists, skipping creation.');
      return;
    }
    const fs = require('fs');
    const iconPath = path.join(__dirname, 'renderer/assets/icon.png');
    let trayIconPath: string | undefined = iconPath;
    if (!fs.existsSync(iconPath)) {
      // Fallback to Electron's default app icon (icon.ico or icon.png in app root)
      const appIconIco = path.join(app.getAppPath(), 'icon.ico');
      const appIconPng = path.join(app.getAppPath(), 'icon.png');
      if (fs.existsSync(appIconIco)) {
        trayIconPath = appIconIco;
      } else if (fs.existsSync(appIconPng)) {
        trayIconPath = appIconPng;
      } else {
        console.warn('No tray icon found at', iconPath, 'or default app icon. Tray will use a blank icon.');
        trayIconPath = undefined;
      }
    }
    console.log('Tray icon resolved path:', trayIconPath, '| Exists:', trayIconPath ? fs.existsSync(trayIconPath) : 'N/A');
    if (trayIconPath) {
      this.tray = new Tray(trayIconPath);
    } else {
      this.tray = new Tray(nativeImage.createEmpty());
    }
    const contextMenu = Menu.buildFromTemplate([
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
        click: () => app.quit(),
      },
    ]);
    this.tray.setToolTip('Time Keeper');
    this.tray.setContextMenu(contextMenu);
  }
}

new MainProcess(); 