import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    ipcRenderer: {
      send: (channel: string, ...args: any[]) => {
        // whitelist channels
        const validChannels = ['hud-resize', 'hud-settings-update'];
        if (validChannels.includes(channel)) {
          ipcRenderer.send(channel, ...args);
        }
      },
      invoke: (channel: string, ...args: any[]) => {
        // whitelist channels
        const validChannels = [
          'tasks:get',
          'tasks:add',
          'tasks:update',
          'tasks:delete',
          'open-management-window',
          'quit-app',
          'set-hud-click-through',
          'get-app-version',
          'get-update-status',
          'check-for-updates',
          'set-auto-update'
        ];
        if (validChannels.includes(channel)) {
          return ipcRenderer.invoke(channel, ...args);
        }
        return Promise.reject(new Error('Invalid channel'));
      },
      on: (channel: string, func: (...args: any[]) => void) => {
        const validChannels = ['update-status', 'hud-settings-update'];
        if (validChannels.includes(channel)) {
          // Deliberately strip event as it includes `sender` 
          ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
      },
      removeAllListeners: (channel: string) => {
        const validChannels = ['update-status', 'hud-settings-update'];
        if (validChannels.includes(channel)) {
          ipcRenderer.removeAllListeners(channel);
        }
      },
    },
  }
); 