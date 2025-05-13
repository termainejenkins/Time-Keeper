console.log("Main process started")

import { app, BrowserWindow, screen, ipcMain, Menu, Tray, nativeImage, MenuItemConstructorOptions, dialog } from 'electron';
import * as path from 'path';
import { getLocalTasks, addLocalTask, updateLocalTask, deleteLocalTask, getArchivedTasks, restoreArchivedTask, deleteArchivedTask, getTaskLists, getActiveTaskListId, setActiveTaskList, createTaskList, renameTaskList, deleteTaskList } from './main/tasks/local';
import { sharedMenu } from './shared/menu';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import { authenticateWithGoogleCalendar, fetchGoogleCalendarEvents } from './main/calendar/google';
import { exec } from 'child_process';
import { platform } from 'os';

// Performance monitoring
const performanceLogs: { [key: string]: number[] } = {};
const PERFORMANCE_THRESHOLD = 1000; // 1 second threshold for warnings
const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};
const CURRENT_LOG_LEVEL = LOG_LEVEL.INFO; // Adjust this to control logging verbosity

function logPerformance(operation: string, startTime: number) {
  try {
    const duration = Date.now() - startTime;
    if (!performanceLogs[operation]) {
      performanceLogs[operation] = [];
    }
    performanceLogs[operation].push(duration);

    // Keep only last 100 measurements
    if (performanceLogs[operation].length > 100) {
      performanceLogs[operation].shift();
    }

    // Calculate statistics
    const avg = performanceLogs[operation].reduce((a, b) => a + b, 0) / performanceLogs[operation].length;
    const min = Math.min(...performanceLogs[operation]);
    const max = Math.max(...performanceLogs[operation]);
    const lastAvg = performanceLogs[operation].slice(0, -1).reduce((a, b) => a + b, 0) / (performanceLogs[operation].length - 1) || avg;

    // Log based on level and conditions
    if (CURRENT_LOG_LEVEL <= LOG_LEVEL.INFO) {
      console.log(`[PERF] ${operation}: ${duration}ms (avg: ${avg.toFixed(2)}ms, min: ${min}ms, max: ${max}ms)`);
    }

    if (duration > PERFORMANCE_THRESHOLD && CURRENT_LOG_LEVEL <= LOG_LEVEL.WARN) {
      console.warn(`[PERF] ${operation} exceeded threshold: ${duration}ms > ${PERFORMANCE_THRESHOLD}ms`);
    }

    if (duration > avg * 2 && CURRENT_LOG_LEVEL <= LOG_LEVEL.WARN) {
      console.warn(`[PERF] ${operation} spike detected: ${duration}ms (avg: ${avg.toFixed(2)}ms)`);
    }

    // Log detailed stats every 10 operations
    if (performanceLogs[operation].length % 10 === 0 && CURRENT_LOG_LEVEL <= LOG_LEVEL.DEBUG) {
      console.debug(`[PERF] ${operation} stats:`, {
        samples: performanceLogs[operation].length,
        average: avg.toFixed(2),
        min,
        max,
        last10: performanceLogs[operation].slice(-10)
      });
    }

    return duration;
  } catch (error) {
    console.error(`[PERF] Error logging performance for ${operation}:`, error);
    return 0;
  }
}

function startOperation(operation: string): () => number {
  const startTime = Date.now();
  return () => logPerformance(operation, startTime);
}

// Error handling wrapper
function handleError(operation: string, fn: () => void) {
  try {
    fn();
  } catch (error) {
    console.error(`[ERROR] ${operation} failed:`, error);
    // You might want to show a dialog to the user here
    dialog.showErrorBox('Error', `${operation} failed: ${error}`);
  }
}

class MainProcess {
  private mainWindow: BrowserWindow | null = null;
  private managementWindow: BrowserWindow | null = null;
  private tray: Tray | null = null;
  private settingsStore = new Store<{ hudPlacement: string }>();
  private updateStatus: string = 'idle';
  private updateInfo: any = null;
  private autoUpdateEnabled: boolean = true;
  private updateStore = new Store<{ autoUpdate: boolean }>();
  private startupStore = new Store({
    name: 'startup-settings',
    defaults: {
      autoStart: false,
      startTime: '09:00',
      startDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      startWithWindows: false
    }
  });

  constructor() {
    handleError('App Initialization', () => {
      const endInit = startOperation('App Initialization');
      this.autoUpdateEnabled = this.updateStore.get('autoUpdate', true);
      this.init();
      endInit();
    });
  }

  private init() {
    const endReady = startOperation('App Ready');
    app.whenReady().then(() => {
      handleError('Window Creation', () => {
        const endWindowCreate = startOperation('Window Creation');
        this.createWindow();
        endWindowCreate();
      });

      handleError('Tray Creation', () => {
        const endTrayCreate = startOperation('Tray Creation');
        this.createTray();
        endTrayCreate();
      });

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
          // Forward settings to HUD window
          this.mainWindow.webContents.send('hud-settings-update', settings);
        }
      });
      ipcMain.on('test-event', (_event, data) => {
        console.log('[IPC] test-event received:', data);
      });
      // Auto-update logic
      if (this.autoUpdateEnabled) {
        autoUpdater.checkForUpdatesAndNotify();
      }
      autoUpdater.on('checking-for-update', () => {
        this.sendUpdateStatusToAll('checking');
      });
      autoUpdater.on('update-available', (info) => {
        this.sendUpdateStatusToAll('available', info);
      });
      autoUpdater.on('update-not-available', (info) => {
        this.sendUpdateStatusToAll('not-available', info);
      });
      autoUpdater.on('download-progress', (progress) => {
        this.sendUpdateStatusToAll('downloading', progress);
      });
      autoUpdater.on('update-downloaded', (info) => {
        this.sendUpdateStatusToAll('downloaded', info);
        dialog.showMessageBox({
          type: 'info',
          title: 'Update Ready',
          message: 'A new version has been downloaded. Restart to apply the update?',
          buttons: ['Restart', 'Later'],
          defaultId: 0,
        }).then(result => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
      });
      autoUpdater.on('error', (err) => {
        this.sendUpdateStatusToAll('error', err);
      });
      // IPC for update info and actions
      ipcMain.handle('get-app-version', () => app.getVersion());
      ipcMain.handle('get-update-status', () => ({ status: this.updateStatus, info: this.updateInfo, autoUpdate: this.autoUpdateEnabled }));
      ipcMain.handle('check-for-updates', () => {
        autoUpdater.checkForUpdatesAndNotify();
        return true;
      });
      ipcMain.handle('set-auto-update', (_event, enabled: boolean) => {
        this.autoUpdateEnabled = enabled;
        this.updateStore.set('autoUpdate', enabled);
        if (enabled) {
          autoUpdater.checkForUpdatesAndNotify();
        }
        return enabled;
      });
      // IPC for archived tasks
      ipcMain.handle('get-archived-tasks', () => getArchivedTasks());
      ipcMain.handle('restore-archived-task', (_event, id: string) => {
        restoreArchivedTask(id);
        return true;
      });
      ipcMain.handle('delete-archived-task', (_event, id: string) => {
        deleteArchivedTask(id);
        return true;
      });
      // IPC for task lists
      ipcMain.handle('get-task-lists', () => getTaskLists());
      ipcMain.handle('get-active-task-list-id', () => getActiveTaskListId());
      ipcMain.handle('set-active-task-list', (_event, id: string) => { setActiveTaskList(id); return true; });
      ipcMain.handle('create-task-list', (_event, name: string) => createTaskList(name));
      ipcMain.handle('rename-task-list', (_event, id: string, name: string) => { renameTaskList(id, name); return true; });
      ipcMain.handle('delete-task-list', (_event, id: string) => { deleteTaskList(id); return true; });
      // IPC for Google Calendar
      ipcMain.handle('google-calendar-sign-in', async () => {
        try {
          await authenticateWithGoogleCalendar();
          return { success: true };
        } catch (e) {
          return { success: false, error: (e as any)?.message || String(e) };
        }
      });
      ipcMain.handle('google-calendar-sign-out', () => {
        const store = new Store();
        store.delete('google_tokens');
        return { success: true };
      });
      ipcMain.handle('google-calendar-status', () => {
        const store = new Store();
        const tokens = store.get('google_tokens');
        return { signedIn: !!tokens };
      });
      ipcMain.handle('google-calendar-events', async () => {
        try {
          const events = await fetchGoogleCalendarEvents();
          return { success: true, events };
        } catch (e) {
          return { success: false, error: (e as any)?.message || String(e) };
        }
      });
      // Add IPC handlers for startup settings
      ipcMain.handle('get-startup-settings', () => {
        return this.startupStore.store;
      });
      ipcMain.handle('update-startup-settings', (_event, settings) => {
        this.startupStore.store = settings;
        if (settings.startWithWindows) {
          this.setupWindowsStartup(true);
        } else {
          this.setupWindowsStartup(false);
        }
        return true;
      });
      // TODO: Add system tray integration here
      endReady();
    }).catch(error => {
      console.error('[ERROR] App ready failed:', error);
      dialog.showErrorBox('Error', 'Failed to initialize app: ' + error);
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
    const endCreate = startOperation('Main Window Creation');
    try {
      console.log('[DEBUG] createWindow called');
      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      const savedPlacement = this.settingsStore.get('hudPlacement', 'top-right');
      const hudSettings = this.settingsStore.get('hudSettings', { alwaysOnTop: true });
      const appIconPath = this.getAppIconPathAndLog();
      this.mainWindow = new BrowserWindow({
        width: 320,
        height: 100,
        x: width - 340,
        y: 0,
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

      // Check if we should start the HUD
      if (this.shouldStartNow()) {
        this.mainWindow.show();
      }
    } catch (error) {
      console.error('[ERROR] Window creation failed:', error);
      dialog.showErrorBox('Error', 'Failed to create window: ' + error);
    } finally {
      endCreate();
    }
  }

  private openManagementWindow(alwaysOnTop: boolean = false) {
    console.log('[DEBUG] openManagementWindow called');
    if (this.managementWindow) {
      this.managementWindow.focus();
      return;
    }
    console.log('Opening Options window');
    const { workArea } = screen.getPrimaryDisplay();
    const winWidth = workArea.width; // 100% of work area
    const winHeight = workArea.height; // 100% of work area
    const x = workArea.x;
    const y = workArea.y;
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
        x = 0;
        y = 0;
        break;
      case 'top-center':
        x = Math.round((screenW - hudW) / 2);
        y = 0;
        break;
      case 'top-right':
        x = screenW - hudW;
        y = 0;
        break;
      case 'bottom-left':
        x = 0;
        y = screenH - hudH;
        break;
      case 'bottom-center':
        x = Math.round((screenW - hudW) / 2);
        y = screenH - hudH;
        break;
      case 'bottom-right':
        x = screenW - hudW;
        y = screenH - hudH;
        break;
      case 'center':
        x = Math.round((screenW - hudW) / 2);
        y = Math.round((screenH - hudH) / 2);
        break;
      default:
        x = screenW - hudW;
        y = 0;
    }
    console.log(`[HUD] setPosition: (${x}, ${y}) for placement: ${placement}, window size: (${hudW}, ${hudH}), screen: (${screenW}, ${screenH})`);
    this.mainWindow.setPosition(x, y);
  }

  private sendUpdateStatusToAll(status: string, info: any = null) {
    this.updateStatus = status;
    this.updateInfo = info;
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-status', { status, info });
    });
  }

  private setupWindowsStartup(enable: boolean) {
    const endSetup = startOperation('Windows Startup Setup');
    const exePath = process.execPath;
    const startupKey = 'SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run';
    const appName = 'Time Keeper';

    if (platform() === 'win32') {
      if (enable) {
        exec(`reg add HKCU\\${startupKey} /v "${appName}" /t REG_SZ /d "${exePath}" /f`);
      } else {
        exec(`reg delete HKCU\\${startupKey} /v "${appName}" /f`);
      }
    }
    endSetup();
  }

  private shouldStartNow(): boolean {
    const endCheck = startOperation('Startup Check');
    const settings = this.startupStore.store;
    if (!settings.autoStart) {
      endCheck();
      return false;
    }

    const now = new Date();
    const [hours, minutes] = settings.startTime.split(':').map(Number);
    const startTime = new Date(now);
    startTime.setHours(hours, minutes, 0, 0);

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[now.getDay()];

    const result = settings.startDays.includes(currentDay) && 
           Math.abs(now.getTime() - startTime.getTime()) < 60000;
    endCheck();
    return result;
  }
}

// Start performance monitoring
console.log('[PERF] Starting performance monitoring');
handleError('App Startup', () => {
  new MainProcess();
}); 