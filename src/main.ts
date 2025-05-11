console.log("Main process started")

import { app, BrowserWindow, screen, ipcMain, Menu, Tray, nativeImage, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import { getLocalTasks, addLocalTask, updateLocalTask, deleteLocalTask } from './main/tasks/local';
import { sharedMenu } from './shared/menu';
import Store from 'electron-store';

class MainProcess {
  private mainWindow: BrowserWindow | null = null;
  private managementWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private settingsStore = new Store<{ hudPlacement: string }>();

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
      // IPC for HUD hamburger menu
      ipcMain.handle('open-management-window', (_event, settings) => {
        const alwaysOnTop = settings && typeof settings.alwaysOnTop === 'boolean' ? settings.alwaysOnTop : false;
        this.openManagementWindow(alwaysOnTop);
      });
      ipcMain.handle('quit-app', () => {
        app.quit();
      });
      ipcMain.handle('set-hud-click-through', (_event, enabled) => {
        if (this.mainWindow) {
          this.mainWindow.setIgnoreMouseEvents(!!enabled);
        }
      });
      // Listen for HUD settings updates (placement, etc)
      ipcMain.on('hud-settings-update', (_event, settings) => {
        console.log('[IPC] hud-settings-update received:', settings);
        this.updateHudPlacement(settings?.placement);
        if (this.mainWindow && typeof settings?.alwaysOnTop === 'boolean') {
          this.mainWindow.setAlwaysOnTop(!!settings.alwaysOnTop);
          this.settingsStore.set('hudSettings', settings);
        }
      });
      ipcMain.on('test-event', (_event, data) => {
        console.log('[IPC] test-event received:', data);
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

  private getAppIconPathAndLog(): string | undefined {
    console.log('[DEBUG] getAppIconPathAndLog called');
    const fs = require('fs');
    // Write to a debug file to confirm execution
    try {
      fs.appendFileSync('app_icon_debug.log', `[${new Date().toISOString()}] getAppIconPathAndLog called\n`);
    } catch (e) {
      // ignore
    }
    const iconPath = path.join(__dirname, 'renderer/assets/icon.png');
    let appIconPath: string | undefined = undefined;
    let iconSource = '';
    if (fs.existsSync(iconPath)) {
      appIconPath = iconPath;
      iconSource = `custom icon at ${iconPath}`;
    } else {
      // Fallback to Electron's default app icon (icon.ico or icon.png in app root)
      const appIconIco = path.join(app.getAppPath(), 'icon.ico');
      const appIconPng = path.join(app.getAppPath(), 'icon.png');
      if (fs.existsSync(appIconIco)) {
        appIconPath = appIconIco;
        iconSource = `fallback icon.ico at ${appIconIco}`;
      } else if (fs.existsSync(appIconPng)) {
        appIconPath = appIconPng;
        iconSource = `fallback icon.png at ${appIconPng}`;
      } else {
        iconSource = 'no icon found, using Electron blank icon';
      }
    }
    if (appIconPath) {
      console.log('App icon: using', iconSource);
    } else {
      console.warn('App icon: no icon found, using Electron blank icon');
    }
    return appIconPath;
  }

  private createWindow() {
    console.log('[DEBUG] createWindow called');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const savedPlacement = this.settingsStore.get('hudPlacement', 'top-right');
    const hudSettings = this.settingsStore.get('hudSettings', { alwaysOnTop: true });
    const appIconPath = this.getAppIconPathAndLog();
    this.mainWindow = new BrowserWindow({
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
      app.dock.setIcon(appIconPath);
    }
    this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
    this.mainWindow.setIgnoreMouseEvents(true, { forward: true });
    this.mainWindow.webContents.openDevTools({ mode: 'detach' });
    this.mainWindow.webContents.on('context-menu', (_event, params) => {
      this.mainWindow!.setIgnoreMouseEvents(false);
      const menu = Menu.buildFromTemplate(this.buildMenuTemplate());
      menu.popup({ window: this.mainWindow! });
      menu.once('menu-will-close', () => {
        this.mainWindow!.setIgnoreMouseEvents(true);
      });
    });
    this.mainWindow.once('ready-to-show', () => {
      this.updateHudPlacement(savedPlacement);
    });
  }

  private openManagementWindow(alwaysOnTop: boolean = false) {
    console.log('[DEBUG] openManagementWindow called');
    if (this.managementWindow) {
      this.managementWindow.focus();
      return;
    }
    console.log('Opening Options window');
    const { workArea } = screen.getPrimaryDisplay();
    const winWidth = Math.round(workArea.width * 0.98);
    const winHeight = Math.round(workArea.height * 0.98);
    const x = workArea.x + Math.round((workArea.width - winWidth) / 2);
    const y = workArea.y + Math.round((workArea.height - winHeight) / 2);
    const appIconPath = this.getAppIconPathAndLog();
    this.managementWindow = new BrowserWindow({
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
      app.dock.setIcon(appIconPath);
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

  private createTray() {
    console.log('createTray() called');
    if (this.tray) {
      console.log('Tray already exists, skipping creation.');
      return;
    }
    const fs = require('fs');
    const iconPath = path.join(__dirname, 'renderer/assets/icon.png');
    let trayIconPath: string | undefined = undefined;
    let iconSource = '';
    if (fs.existsSync(iconPath)) {
      trayIconPath = iconPath;
      iconSource = `custom icon at ${iconPath}`;
    } else {
      // Fallback to Electron's default app icon (icon.ico or icon.png in app root)
      const appIconIco = path.join(app.getAppPath(), 'icon.ico');
      const appIconPng = path.join(app.getAppPath(), 'icon.png');
      if (fs.existsSync(appIconIco)) {
        trayIconPath = appIconIco;
        iconSource = `fallback icon.ico at ${appIconIco}`;
      } else if (fs.existsSync(appIconPng)) {
        trayIconPath = appIconPng;
        iconSource = `fallback icon.png at ${appIconPng}`;
      } else {
        iconSource = 'no icon found, using Electron blank icon';
      }
    }
    if (trayIconPath) {
      this.tray = new Tray(trayIconPath);
      console.log('Tray icon: using', iconSource);
    } else {
      this.tray = new Tray(nativeImage.createEmpty());
      console.warn('Tray icon: no icon found, using Electron blank icon');
    }
    const contextMenu = Menu.buildFromTemplate(this.buildMenuTemplate());
    this.tray.setToolTip('Time Keeper');
    this.tray.setContextMenu(contextMenu);
  }

  private buildMenuTemplate(): MenuItemConstructorOptions[] {
    return sharedMenu.map(item => {
      if ('separator' in item && item.separator) return { type: 'separator' };
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
      } else if (item.action === 'manage') {
        return {
          label: item.label,
          click: () => this.openManagementWindow(),
        };
      } else if (item.action === 'quit') {
        return {
          label: item.label,
          click: () => app.quit(),
        };
      }
      // If action is unknown, skip this item
      return null;
    }).filter(Boolean) as MenuItemConstructorOptions[];
  }

  private updateHudPlacement(placement: string) {
    if (!this.mainWindow) return;
    console.log('[HUD] updateHudPlacement called with:', placement);
    this.settingsStore.set('hudPlacement', placement); // persist
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
    const [hudW, hudH] = [this.mainWindow.getBounds().width, this.mainWindow.getBounds().height];
    let x = 0, y = 0;
    switch (placement) {
      case 'top-left':
        x = 20;
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
}

new MainProcess(); 