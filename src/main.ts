console.log("Main process started")

import { app, BrowserWindow, screen } from 'electron';
import * as path from 'path';

class MainProcess {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    this.init();
  }

  private init() {
    app.whenReady().then(() => {
      this.createWindow();
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
      width: 500,
      height: 200,
      x: width - 520,
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
  }
}

new MainProcess(); 