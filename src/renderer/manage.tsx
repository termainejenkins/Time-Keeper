import React, { useCallback, useRef, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';

console.log('Manage.tsx loaded!');

const sections = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'hud', label: 'HUD Options' },
  { key: 'updates', label: 'Updates' },
  { key: 'archive', label: 'Archive' },
  { key: 'about', label: 'About' },
];

const defaultHudSettings = {
  darkMode: false,
  showCurrentTime: false,
  clickThrough: true,
  opacity: 0.85,
  placement: 'top-center',
  alwaysOnTop: true,
  showBorder: true,
  dynamicBorderColor: true,
  borderColors: {
    normal: '#4fa3e3',
    warning: '#ffa726',
    critical: '#ef5350'
  },
  previewAnimation: false
};

const defaultStartupSettings = {
  autoStart: false,
  startTime: '09:00',
  startDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  startWithWindows: false
};

const defaultViewMode = 'both'; // 'local', 'google', or 'both'

function getViewMode() {
  return localStorage.getItem('viewMode') || defaultViewMode;
}
function setViewMode(mode: string) {
  localStorage.setItem('viewMode', mode);
}

type HudSettings = typeof defaultHudSettings;

const getHudSettings = () => {
  try {
    const raw = localStorage.getItem('hudSettings');
    if (raw) return { ...defaultHudSettings, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultHudSettings };
};

const saveHudSettings = (settings: any) => {
  localStorage.setItem('hudSettings', JSON.stringify(settings));
  // Send to HUD window
  if ((window as any).require) {
    const { ipcRenderer } = (window as any).require('electron');
    console.log('[Renderer] Sending hud-settings-update:', settings);
    ipcRenderer.send('hud-settings-update', settings);
  }
};

// Add type declaration for window.electron
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
        send(channel: string, ...args: any[]): void;
        on(channel: string, func: (...args: any[]) => void): void;
        removeAllListeners(channel: string): void;
      };
    };
  }
}

const App: React.FC = () => {
  const [selected, setSelected] = useState('tasks');
  const fetchTasksRef = useRef<() => void>(() => {});
  const handleTaskAdded = useCallback(() => {
    if (fetchTasksRef.current) fetchTasksRef.current();
  }, []);

  // HUD options state
  const [hudSettings, setHudSettings] = useState<HudSettings>(getHudSettings());

  // Updates state
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [checking, setChecking] = useState(false);

  // View Mode state
  const [viewMode, setViewModeState] = useState(getViewMode());
  const handleViewModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewModeState(e.target.value);
    setViewMode(e.target.value);
  };

  // IPC helpers
  const ipc = (window as any).require ? (window as any).require('electron').ipcRenderer : null;

  // Archive state
  const [archivedTasks, setArchivedTasks] = useState<any[]>([]);
  const fetchArchivedTasks = useCallback(() => {
    if (ipc) ipc.invoke('get-archived-tasks').then(setArchivedTasks);
  }, [ipc]);
  useEffect(() => {
    if (selected === 'archive') fetchArchivedTasks();
  }, [selected, fetchArchivedTasks]);
  const handleRestoreArchived = (id: string) => {
    if (ipc) ipc.invoke('restore-archived-task', id).then(fetchArchivedTasks);
  };
  const handleDeleteArchived = (id: string) => {
    if (ipc) ipc.invoke('delete-archived-task', id).then(fetchArchivedTasks);
  };

  // Task Lists state
  const [taskLists, setTaskLists] = useState<{ id: string, name: string }[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [newListName, setNewListName] = useState('');
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fetchTaskLists = useCallback(() => {
    if (ipc) {
      ipc.invoke('get-task-lists').then(setTaskLists);
      ipc.invoke('get-active-task-list-id').then(setActiveListId);
    }
  }, [ipc]);
  useEffect(() => { if (selected === 'tasks') fetchTaskLists(); }, [selected, fetchTaskLists]);

  const handleSwitchList = (id: string) => {
    if (ipc) ipc.invoke('set-active-task-list', id).then(fetchTaskLists);
  };
  const handleCreateList = () => {
    if (ipc && newListName.trim()) {
      ipc.invoke('create-task-list', newListName.trim()).then(() => {
        setNewListName('');
        fetchTaskLists();
      });
    }
  };
  const handleRenameList = (id: string) => {
    if (ipc && renameValue.trim()) {
      ipc.invoke('rename-task-list', id, renameValue.trim()).then(() => {
        setRenamingListId(null);
        setRenameValue('');
        fetchTaskLists();
      });
    }
  };
  const handleDeleteList = (id: string) => {
    if (ipc) ipc.invoke('delete-task-list', id).then(fetchTaskLists);
  };

  // Apply instantly on change
  useEffect(() => {
    saveHudSettings(hudSettings);
  }, [hudSettings]);

  // Set body and #root background to match app background
  useEffect(() => {
    const bg = hudSettings.darkMode ? '#23272f' : '#f6f7fb';
    document.body.style.background = bg;
    const root = document.getElementById('root');
    if (root) (root as HTMLElement).style.background = bg;
  }, [hudSettings.darkMode]);

  useEffect(() => {
    if (selected === 'hud') {
      console.log('Rendering HUD Options section');
      if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('test-event', { foo: 123 });
        console.log('[Renderer] Sent test-event');
      }
    }
  }, [selected]);

  // Fetch version and update status on mount
  useEffect(() => {
    if (ipc) {
      ipc.invoke('get-app-version').then(setAppVersion);
      ipc.invoke('get-update-status').then((data: any) => {
        setUpdateStatus(data.status);
        setUpdateInfo(data.info);
        setAutoUpdate(data.autoUpdate);
      });
      ipc.on('update-status', (_event: any, { status, info }: any) => {
        setUpdateStatus(status);
        setUpdateInfo(info);
        setChecking(false);
      });
    }
    return () => {
      if (ipc) ipc.removeAllListeners('update-status');
    };
  }, []);

  const handleManualCheck = () => {
    if (ipc) {
      setChecking(true);
      ipc.invoke('check-for-updates');
    }
  };
  const handleToggleAutoUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setAutoUpdate(enabled);
    if (ipc) ipc.invoke('set-auto-update', enabled);
  };

  const handleReset = () => {
    setHudSettings({ ...defaultHudSettings });
  };

  const [previewTimeLeft, setPreviewTimeLeft] = useState<number>(30 * 1000);
  const [isPreviewAnimating, setIsPreviewAnimating] = useState(false);

  // Calculate preview border color
  const getPreviewBorderColor = () => {
    if (!hudSettings.dynamicBorderColor) return hudSettings.borderColors.normal;
    
    const secondsLeft = previewTimeLeft / 1000;
    if (secondsLeft <= 5) return hudSettings.borderColors.critical;
    if (secondsLeft <= 15) return hudSettings.borderColors.warning;
    return hudSettings.borderColors.normal;
  };

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Reset animation state when component unmounts
      setIsPreviewAnimating(false);
      setPreviewTimeLeft(30 * 1000);
      // If settings are still in memory, update them to disable preview
      if (hudSettings.previewAnimation) {
        setHudSettings(prev => ({ ...prev, previewAnimation: false }));
      }
    };
  }, []);

  // Start/stop preview animation when HUD tab is selected/deselected and preview is enabled
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (selected === 'hud' && hudSettings.dynamicBorderColor && hudSettings.previewAnimation) {
      setIsPreviewAnimating(true);
      interval = setInterval(() => {
        setPreviewTimeLeft(prev => {
          // Cycle from 30 seconds down to 0 and back up
          if (prev <= 0) return 30 * 1000;
          return prev - 1000;
        });
      }, 100); // Update every 100ms for faster preview
    } else {
      // Reset animation state when conditions are not met
      setIsPreviewAnimating(false);
      setPreviewTimeLeft(30 * 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      setIsPreviewAnimating(false);
    };
  }, [selected, hudSettings.dynamicBorderColor, hudSettings.previewAnimation]);

  const [startupSettings, setStartupSettings] = useState(defaultStartupSettings);
  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    // Load startup settings
    const loadStartupSettings = async () => {
      try {
        const settings = await window.electron.ipcRenderer.invoke('get-startup-settings');
        setStartupSettings(settings);
      } catch (error) {
        console.error('Failed to load startup settings:', error);
      }
    };
    loadStartupSettings();
  }, []);

  const handleStartupSettingsChange = async (newSettings: typeof defaultStartupSettings) => {
    setStartupSettings(newSettings);
    try {
      await window.electron.ipcRenderer.invoke('update-startup-settings', newSettings);
    } catch (error) {
      console.error('Failed to update startup settings:', error);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: hudSettings.darkMode ? '#23272f' : '#f6f7fb',
      fontFamily: 'Inter, Arial, sans-serif',
      color: hudSettings.darkMode ? '#f3f3f3' : '#222',
      transition: 'background 0.2s, color 0.2s',
      margin: 0,
      padding: 0,
      boxSizing: 'border-box',
    }}>
      {/* Sidebar */}
      <nav style={{
        width: 160,
        height: '100vh', // Ensure sidebar fills height
        background: hudSettings.darkMode ? '#181b20' : '#fff',
        borderRight: hudSettings.darkMode ? '1px solid #2c2f36' : '1px solid #eee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        padding: 0, // Remove vertical padding
        boxShadow: hudSettings.darkMode ? '2px 0 8px rgba(0,0,0,0.12)' : '2px 0 8px rgba(0,0,0,0.03)',
        transition: 'background 0.2s, border 0.2s',
      }}>
        <div style={{ padding: '24px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setSelected(s.key)}
              style={{
                background: selected === s.key ? (hudSettings.darkMode ? '#23272f' : '#e3e8f0') : 'none',
                border: 'none',
                borderLeft: selected === s.key ? '4px solid #4fa3e3' : '4px solid transparent',
                color: hudSettings.darkMode ? (selected === s.key ? '#fff' : '#b3b3b3') : '#222',
                fontWeight: selected === s.key ? 700 : 400,
                fontSize: 16,
                padding: '12px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                outline: 'none',
                transition: 'background 0.2s, border 0.2s, color 0.2s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>
      {/* Main content area */}
      <main style={{
        flex: 1,
        padding: '32px 40px',
        background: hudSettings.darkMode ? '#23272f' : '#f6f7fb',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        color: hudSettings.darkMode ? '#f3f3f3' : '#222',
        transition: 'background 0.2s, color 0.2s',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}>
        {/* View Mode Selector - always visible at top */}
        <div style={{ marginBottom: 32, marginTop: 8 }}>
          <label style={{ fontWeight: 600, fontSize: 17, marginRight: 12 }}>View Mode:</label>
          <select value={viewMode} onChange={handleViewModeChange} style={{ fontSize: 16, padding: '4px 12px', borderRadius: 6 }}>
            <option value="local">Local Tasks</option>
            <option value="google">Google Calendar</option>
            <option value="both">Both</option>
          </select>
        </div>
        {selected === 'tasks' && (
          <>
            {/* Local Tasks Section */}
            {(viewMode === 'local' || viewMode === 'both') && (
              <>
                <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }}>Tasks</h2>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontWeight: 700, fontSize: 17, marginRight: 10, color: hudSettings.darkMode ? '#fff' : '#222' }}>Active Task List:</label>
                  <select value={activeListId} onChange={e => handleSwitchList(e.target.value)} style={{ fontSize: 16, padding: '5px 12px', borderRadius: 6, marginRight: 10, background: hudSettings.darkMode ? '#23272f' : '#fff', color: hudSettings.darkMode ? '#fff' : '#222', border: '2px solid #4fa3e3', fontWeight: 700, boxShadow: '0 2px 8px rgba(79,163,227,0.10)' }}>
                    {taskLists.map(list => (
                      <option key={list.id} value={list.id} style={{ background: list.id === activeListId ? '#4fa3e3' : (hudSettings.darkMode ? '#23272f' : '#fff'), color: list.id === activeListId ? '#fff' : (hudSettings.darkMode ? '#f3f3f3' : '#222'), fontWeight: list.id === activeListId ? 700 : 500 }}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                  <input type="text" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="New list name" style={{ fontSize: 15, padding: '4px 10px', borderRadius: 6, marginRight: 6, background: hudSettings.darkMode ? '#23272f' : '#fff', color: hudSettings.darkMode ? '#fff' : '#222', border: '1px solid #aaa' }} />
                  <button onClick={handleCreateList} style={{ fontSize: 15, padding: '4px 12px', borderRadius: 6, background: '#4fa3e3', color: '#fff', border: 'none', fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>+ New</button>
                </div>
                {/* List Management (Rename/Delete) */}
                <div style={{ marginBottom: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {taskLists.map(list => (
                    <span key={list.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: list.id === activeListId ? '#4fa3e3' : (hudSettings.darkMode ? '#23272f' : '#f6f7fb'), borderRadius: 6, padding: '2px 12px', color: list.id === activeListId ? '#fff' : (hudSettings.darkMode ? '#f3f3f3' : '#222'), fontWeight: list.id === activeListId ? 700 : 500, border: list.id === activeListId ? '2px solid #4fa3e3' : '1px solid #ccc', boxShadow: list.id === activeListId ? '0 2px 8px rgba(79,163,227,0.10)' : 'none' }}>
                      {renamingListId === list.id ? (
                        <>
                          <input value={renameValue} onChange={e => setRenameValue(e.target.value)} style={{ fontSize: 14, padding: '2px 6px', borderRadius: 4, background: hudSettings.darkMode ? '#23272f' : '#fff', color: hudSettings.darkMode ? '#fff' : '#222', border: '1px solid #aaa' }} />
                          <button onClick={() => handleRenameList(list.id)} style={{ fontSize: 13, marginLeft: 2, color: '#4fa3e3', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                          <button onClick={() => setRenamingListId(null)} style={{ fontSize: 13, marginLeft: 2, color: '#e34f4f', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <span>{list.name}</span>
                          <button onClick={() => { setRenamingListId(list.id); setRenameValue(list.name); }} style={{ fontSize: 13, marginLeft: 2, color: list.id === activeListId ? '#fff' : '#4fa3e3', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Rename</button>
                          {taskLists.length > 1 && <button onClick={() => handleDeleteList(list.id)} style={{ fontSize: 13, marginLeft: 2, color: '#e34f4f', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>}
                        </>
                      )}
                    </span>
                  ))}
                </div>
                <TaskForm onTaskAdded={handleTaskAdded} />
                <TaskList fetchTasksRef={fetchTasksRef} darkMode={hudSettings.darkMode} />
              </>
            )}
            {/* Google Calendar Section (placeholder) */}
            {(viewMode === 'google' || viewMode === 'both') && (
              <div style={{ marginTop: 32, color: '#4fa3e3', fontSize: 18 }}>
                <b>Google Calendar events will appear here (integration coming soon).</b>
              </div>
            )}
          </>
        )}
        {selected === 'hud' && (
          <>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }}>HUD Options</h2>
            <div style={{ color: hudSettings.darkMode ? '#f3f3f3' : '#222', fontSize: 16, marginTop: 24, maxWidth: 400 }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                <input type="checkbox" checked={hudSettings.darkMode} onChange={e => setHudSettings((s: HudSettings) => ({ ...s, darkMode: e.target.checked }))} />
                Dark mode
              </label>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                <input type="checkbox" checked={hudSettings.showCurrentTime} onChange={e => setHudSettings((s: HudSettings) => ({ ...s, showCurrentTime: e.target.checked }))} />
                Show current time
              </label>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                <input type="checkbox" checked={hudSettings.clickThrough} onChange={e => setHudSettings((s: HudSettings) => ({ ...s, clickThrough: e.target.checked }))} />
                Enable click-through
              </label>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                <input type="checkbox" checked={hudSettings.alwaysOnTop} onChange={e => setHudSettings((s: HudSettings) => ({ ...s, alwaysOnTop: e.target.checked }))} />
                Always on Top
              </label>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                <input type="checkbox" checked={hudSettings.showBorder} onChange={e => setHudSettings((s: HudSettings) => ({ ...s, showBorder: e.target.checked }))} />
                Show Border
              </label>
              {hudSettings.showBorder && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                    <input type="checkbox" checked={hudSettings.dynamicBorderColor} onChange={e => setHudSettings((s: HudSettings) => ({ ...s, dynamicBorderColor: e.target.checked }))} />
                    Dynamic Border Color
                  </label>
                  {hudSettings.dynamicBorderColor && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10, paddingLeft: 24 }}>
                        <input type="checkbox" checked={hudSettings.previewAnimation} onChange={e => setHudSettings((s: HudSettings) => ({ ...s, previewAnimation: e.target.checked }))} />
                        Enable Preview Animation
                      </label>
                      <div style={{ padding: '0 16px 10px', fontSize: 14 }}>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ display: 'block', marginBottom: 4 }}>Normal Color:</label>
                          <input
                            type="color"
                            value={hudSettings.borderColors.normal}
                            onChange={e => setHudSettings((s: HudSettings) => ({ 
                              ...s, 
                              borderColors: { ...s.borderColors, normal: e.target.value }
                            }))}
                            style={{ width: '100%', height: 24 }}
                          />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ display: 'block', marginBottom: 4 }}>Warning Color (≤15min):</label>
                          <input
                            type="color"
                            value={hudSettings.borderColors.warning}
                            onChange={e => setHudSettings((s: HudSettings) => ({ 
                              ...s, 
                              borderColors: { ...s.borderColors, warning: e.target.value }
                            }))}
                            style={{ width: '100%', height: 24 }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: 4 }}>Critical Color (≤5min):</label>
                          <input
                            type="color"
                            value={hudSettings.borderColors.critical}
                            onChange={e => setHudSettings((s: HudSettings) => ({ 
                              ...s, 
                              borderColors: { ...s.borderColors, critical: e.target.value }
                            }))}
                            style={{ width: '100%', height: 24 }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                Placement
                <select
                  value={hudSettings.placement}
                  onChange={e => {
                    console.log('[Renderer] Placement changed to:', e.target.value);
                    setHudSettings((s: HudSettings) => ({ ...s, placement: e.target.value }));
                  }}
                  style={{ marginLeft: 12 }}
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="center">Center</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                Opacity
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={hudSettings.opacity}
                  onChange={e => setHudSettings((s: HudSettings) => ({ ...s, opacity: Number(e.target.value) }))}
                  style={{ flex: 1, marginLeft: 12 }}
                />
                <span style={{ width: 40, textAlign: 'right', color: hudSettings.darkMode ? '#b3b3b3' : '#888', fontSize: 15 }}>{Math.round(hudSettings.opacity * 100)}%</span>
              </label>
              <button
                onClick={handleReset}
                style={{
                  marginTop: 12,
                  background: hudSettings.darkMode ? '#23272f' : '#f3f3f3',
                  border: hudSettings.darkMode ? '1px solid #444' : '1px solid #ddd',
                  borderRadius: 6,
                  padding: '8px 18px',
                  fontSize: 15,
                  color: hudSettings.darkMode ? '#f3f3f3' : '#444',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'background 0.2s, border 0.2s',
                }}
              >
                Reset to Defaults
              </button>
            </div>
            <div style={{ marginTop: 40, borderTop: '1px solid #eee', paddingTop: 24 }}>
              <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }}>Startup Options</h3>
              <div style={{ color: hudSettings.darkMode ? '#f3f3f3' : '#222', fontSize: 16, maxWidth: 400 }}>
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={startupSettings.autoStart}
                    onChange={e => handleStartupSettingsChange({ ...startupSettings, autoStart: e.target.checked })}
                  />
                  Enable scheduled startup
                </label>
                {startupSettings.autoStart && (
                  <>
                    <div style={{ marginBottom: 18, paddingLeft: 24 }}>
                      <label style={{ display: 'block', marginBottom: 8 }}>Start Time:</label>
                      <input
                        type="time"
                        value={startupSettings.startTime}
                        onChange={e => handleStartupSettingsChange({ ...startupSettings, startTime: e.target.value })}
                        style={{ padding: '4px 8px', borderRadius: 4 }}
                      />
                    </div>
                    <div style={{ marginBottom: 18, paddingLeft: 24 }}>
                      <label style={{ display: 'block', marginBottom: 8 }}>Start Days:</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                          <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="checkbox"
                              checked={startupSettings.startDays.includes(day)}
                              onChange={e => {
                                const newDays = e.target.checked
                                  ? [...startupSettings.startDays, day]
                                  : startupSettings.startDays.filter(d => d !== day);
                                handleStartupSettingsChange({ ...startupSettings, startDays: newDays });
                              }}
                            />
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <label style={{ display: 'flex', alignItems: 'center', marginBottom: 18, gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={startupSettings.startWithWindows}
                    onChange={e => handleStartupSettingsChange({ ...startupSettings, startWithWindows: e.target.checked })}
                  />
                  Start with Windows
                </label>
              </div>
            </div>
            {/* Live preview */}
            <div
              style={{
                marginTop: 40,
                background: hudSettings.darkMode ? 'rgba(30,34,40,0.95)' : `rgba(0,0,0,${hudSettings.opacity})`,
                borderRadius: 10,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                padding: 24,
                color: hudSettings.darkMode ? '#f3f3f3' : '#fff',
                minHeight: 80,
                maxWidth: 340,
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: 0.2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: hudSettings.showBorder ? `2px solid ${getPreviewBorderColor()}` : 'none',
                transition: 'background 0.2s, color 0.2s, border 0.2s',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 20, marginBottom: 6, color: hudSettings.darkMode ? '#b3d1f7' : '#cce6ff' }}>HUD Preview</span>
              <span style={{ fontSize: 16, color: hudSettings.darkMode ? '#b3d1f7' : '#cce6ff' }}>Current Task: <b style={{ color: hudSettings.darkMode ? '#fff' : '#fff' }}>Example Task</b></span>
              {hudSettings.showCurrentTime && (
                <span style={{ fontSize: 15, color: hudSettings.darkMode ? '#eee' : '#e0e0e0', marginTop: 4 }}>12:34:56 PM</span>
              )}
              {hudSettings.previewAnimation && (
                <span style={{ fontSize: 15, color: hudSettings.darkMode ? '#eee' : '#e0e0e0', marginTop: 4 }}>
                  ({Math.floor(previewTimeLeft / 1000)} seconds left)
                </span>
              )}
              {hudSettings.dynamicBorderColor && (
                <span style={{ fontSize: 12, color: hudSettings.darkMode ? '#aaa' : '#888', marginTop: 8 }}>
                  {isPreviewAnimating ? 'Previewing dynamic colors...' : 'Dynamic colors enabled'}
                </span>
              )}
            </div>
          </>
        )}
        {selected === 'updates' && (
          <>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }}>Updates</h2>
            <div style={{ color: hudSettings.darkMode ? '#f3f3f3' : '#222', fontSize: 16, marginTop: 24, maxWidth: 500 }}>
              <div style={{ marginBottom: 12 }}>
                <b>Current Version:</b> {appVersion}
              </div>
              <div style={{ marginBottom: 12 }}>
                <b>Update Status:</b> {checking ? 'Checking...' : updateStatus.charAt(0).toUpperCase() + updateStatus.slice(1)}
              </div>
              {updateStatus === 'available' && updateInfo && (
                <div style={{ marginBottom: 12, color: '#4fa3e3' }}>
                  <b>New version available:</b> {updateInfo.version || ''}
                </div>
              )}
              {updateStatus === 'downloading' && updateInfo && (
                <div style={{ marginBottom: 12, color: '#4fa3e3' }}>
                  <b>Downloading update...</b> {updateInfo.percent ? `${Math.round(updateInfo.percent)}%` : ''}
                </div>
              )}
              {updateStatus === 'downloaded' && updateInfo && (
                <div style={{ marginBottom: 12, color: '#4fa3e3' }}>
                  <b>Update downloaded!</b> Restart the app to apply the update.
                </div>
              )}
              {updateStatus === 'error' && updateInfo && (
                <div style={{ marginBottom: 12, color: 'red' }}>
                  <b>Update error:</b> {updateInfo.message || String(updateInfo)}
                </div>
              )}
              {updateInfo && updateInfo.releaseNotes && (
                <div style={{ marginBottom: 12 }}>
                  <b>Release Notes:</b>
                  <div style={{ background: '#2222', padding: 10, borderRadius: 6, marginTop: 4, maxHeight: 120, overflowY: 'auto', fontSize: 15 }}
                    dangerouslySetInnerHTML={{ __html: updateInfo.releaseNotes }} />
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <button onClick={handleManualCheck} disabled={checking} style={{
                  background: '#4fa3e3', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 15, cursor: 'pointer', fontWeight: 500, marginRight: 16
                }}>Check for Updates</button>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                  <input type="checkbox" checked={autoUpdate} onChange={handleToggleAutoUpdate} />
                  Enable Auto-Update
                </label>
              </div>
            </div>
          </>
        )}
        {selected === 'archive' && (
          <>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }}>Archive</h2>
            <div style={{ color: hudSettings.darkMode ? '#f3f3f3' : '#222', fontSize: 16, marginTop: 24, maxWidth: 600 }}>
              {archivedTasks.length === 0 && <div>No archived tasks.</div>}
              {archivedTasks.map(task => (
                <div key={task.id} style={{
                  background: hudSettings.darkMode ? '#23272f' : '#f6f7fb',
                  border: '1px solid #ccc',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}>
                  <div><b>{task.title}</b></div>
                  <div style={{ fontSize: 14, color: '#888' }}>Ended: {new Date(task.end).toLocaleString()}</div>
                  {task.expiredAt && <div style={{ fontSize: 13, color: '#aaa' }}>Archived: {new Date(task.expiredAt + 24*60*60*1000).toLocaleString()}</div>}
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <button onClick={() => handleRestoreArchived(task.id)} style={{ background: '#4fa3e3', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>Restore</button>
                    <button onClick={() => handleDeleteArchived(task.id)} style={{ background: '#e34f4f', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {selected === 'about' && (
          <>
            <h2 style={{ fontWeight: 700, fontSize: 24, marginBottom: 16, color: hudSettings.darkMode ? '#f3f3f3' : '#222' }}>About</h2>
            <div style={{ color: hudSettings.darkMode ? '#b3b3b3' : '#666', fontSize: 16, marginTop: 24 }}>
              <p>Time Keeper v1.0</p>
              <p>Modern minimalist time/task HUD for desktop.</p>
              <p style={{ fontSize: 14, color: hudSettings.darkMode ? '#888' : '#aaa', marginTop: 16 }}>© {new Date().getFullYear()} Time Keeper</p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} 