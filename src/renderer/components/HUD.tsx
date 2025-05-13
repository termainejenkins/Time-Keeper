import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LocalTask, CustomRepeatSettings, WeekdayRepeatSettings } from '../../shared/types/task';
import { IpcRendererEvent } from 'electron';

const DAY_ABBREVIATIONS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface HudSettings {
  opacity: number;
  showBorder: boolean;
  dynamicBorderColor: boolean;
  borderColors: {
    normal: string;
    warning: string;
    critical: string;
  };
}

const HUD: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<Date | null>(new Date());
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [currentTask, setCurrentTask] = useState<LocalTask | null>(null);
  const [nextTask, setNextTask] = useState<LocalTask | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clickThrough, setClickThrough] = useState(true);
  const [showCurrentTime, setShowCurrentTime] = useState(false);
  const [showBorder, setShowBorder] = useState(true);
  const [dynamicBorderColor, setDynamicBorderColor] = useState(true);
  const [borderColors, setBorderColors] = useState({
    normal: '#4fa3e3',
    warning: '#ffa726',
    critical: '#ef5350'
  });
  const [borderColor, setBorderColor] = useState('#4fa3e3');
  const menuRef = useRef<HTMLDivElement>(null);
  const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
  const [titleScale, setTitleScale] = useState(1);
  const titleRef = useRef<HTMLSpanElement>(null);
  const [opacity, setOpacity] = useState(0.85);

  // Calculate border color based on time left
  const calculateBorderColor = (timeLeft: number | null) => {
    if (!dynamicBorderColor || timeLeft === null) return borderColors.normal;
    
    const minutesLeft = timeLeft / (1000 * 60);
    if (minutesLeft <= 5) return borderColors.critical;
    if (minutesLeft <= 15) return borderColors.warning;
    return borderColors.normal;
  };

  // Update border color when time left changes
  useEffect(() => {
    setBorderColor(calculateBorderColor(timeLeft));
  }, [timeLeft, dynamicBorderColor, borderColors]);

  // Load HUD settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('hudSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings) as HudSettings;
        setOpacity(settings.opacity ?? 0.85);
        setShowBorder(settings.showBorder ?? true);
        setDynamicBorderColor(settings.dynamicBorderColor ?? true);
        setBorderColors(settings.borderColors ?? {
          normal: '#4fa3e3',
          warning: '#ffa726',
          critical: '#ef5350'
        });
      }
    } catch (error) {
      console.error('Error loading HUD settings:', error);
    }
  }, []);

  // Listen for HUD settings updates
  useEffect(() => {
    if (!ipcRenderer) return;

    const handleSettingsUpdate = (_event: IpcRendererEvent, settings: Partial<HudSettings>) => {
      try {
        if (typeof settings.opacity === 'number') setOpacity(settings.opacity);
        if (typeof settings.showBorder === 'boolean') setShowBorder(settings.showBorder);
        if (typeof settings.dynamicBorderColor === 'boolean') setDynamicBorderColor(settings.dynamicBorderColor);
        if (settings.borderColors) setBorderColors(settings.borderColors);
      } catch (error) {
        console.error('Error updating HUD settings:', error);
      }
    };

    ipcRenderer.on('hud-settings-update', handleSettingsUpdate);
    
    return () => {
      ipcRenderer.removeListener('hud-settings-update', handleSettingsUpdate);
    };
  }, []);

  // Place getCurrentAndNextTask function here (above useEffect)
  const getCurrentAndNextTask = (tasks: LocalTask[], now: Date) => {
    let current: { task: LocalTask; end: Date } | null = null;
    let soonest: { task: LocalTask; time: number } | null = null;

    for (const task of tasks) {
      let occurrences: { start: Date; end: Date }[] = [];
      
      if (!task.repeat || task.repeat === 'none') {
        occurrences = [{ start: new Date(task.start), end: new Date(task.end) }];
      } else {
        const baseStart = new Date(task.start);
        const baseEnd = new Date(task.end);
        const duration = baseEnd.getTime() - baseStart.getTime();

        switch (task.repeat) {
          case 'daily': {
        const todayStart = new Date(now);
        todayStart.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0);
            if (todayEnd <= todayStart) todayEnd.setDate(todayEnd.getDate() + 1);
        occurrences.push({ start: todayStart, end: todayEnd });
        if (todayEnd <= now) {
          const tomorrowStart = new Date(todayStart);
          tomorrowStart.setDate(todayStart.getDate() + 1);
          const tomorrowEnd = new Date(todayEnd);
          tomorrowEnd.setDate(todayEnd.getDate() + 1);
          occurrences.push({ start: tomorrowStart, end: tomorrowEnd });
        }
            break;
          }
          case 'weekly': {
            const dayDiff = (baseStart.getDay() - now.getDay() + 7) % 7;
            const thisWeekStart = new Date(now);
            thisWeekStart.setDate(now.getDate() + dayDiff);
        thisWeekStart.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
        const thisWeekEnd = new Date(thisWeekStart);
        thisWeekEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0);
            if (thisWeekEnd <= thisWeekStart) thisWeekEnd.setDate(thisWeekEnd.getDate() + 1);
        occurrences.push({ start: thisWeekStart, end: thisWeekEnd });
        if (thisWeekEnd <= now) {
          const nextWeekStart = new Date(thisWeekStart);
          nextWeekStart.setDate(thisWeekStart.getDate() + 7);
          const nextWeekEnd = new Date(thisWeekEnd);
          nextWeekEnd.setDate(thisWeekEnd.getDate() + 7);
          occurrences.push({ start: nextWeekStart, end: nextWeekEnd });
            }
            break;
          }
          case 'weekdays': {
            if (task.repeatSettings?.type === 'weekdays') {
              const settings = task.repeatSettings;
              let daysToAdd = 0;
              while (daysToAdd < 7) {
                const checkDate = new Date(now);
                checkDate.setDate(now.getDate() + daysToAdd);
                if (settings.days.includes(checkDate.getDay())) {
                  const start = new Date(checkDate);
                  start.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
                  const end = new Date(start);
                  end.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0);
                  if (end <= start) end.setDate(end.getDate() + 1);
                  occurrences.push({ start, end });
                }
                daysToAdd++;
              }
            }
            break;
          }
          case 'weekends': {
            const day = now.getDay();
            let nextWeekendDay = day === 0 ? 6 : day === 6 ? 0 : 6;
            const start = new Date(now);
            start.setDate(now.getDate() + (nextWeekendDay - day + 7) % 7);
            start.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
            const end = new Date(start);
            end.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0);
            if (end <= start) end.setDate(end.getDate() + 1);
            occurrences.push({ start, end });
            break;
          }
          case 'every_other_day': {
            const daysSinceStart = Math.floor((now.getTime() - baseStart.getTime()) / (24 * 60 * 60 * 1000));
            const nextDay = baseStart.getDate() + Math.ceil((daysSinceStart + 1) / 2) * 2;
            const start = new Date(now);
            start.setDate(nextDay);
            start.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
            const end = new Date(start);
            end.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0);
            if (end <= start) end.setDate(end.getDate() + 1);
            occurrences.push({ start, end });
            break;
          }
          case 'custom': {
            if (task.repeatSettings?.type === 'custom_days') {
              const settings = task.repeatSettings;
              const daysSinceStart = Math.floor((now.getTime() - baseStart.getTime()) / (24 * 60 * 60 * 1000));
              const nextDay = baseStart.getDate() + Math.ceil((daysSinceStart + 1) / settings.interval) * settings.interval;
              const start = new Date(now);
              start.setDate(nextDay);
              start.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
              const end = new Date(start);
              end.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0);
              if (end <= start) end.setDate(end.getDate() + 1);
              occurrences.push({ start, end });
            }
            break;
          }
        }
      }

      for (const occ of occurrences) {
        if (occ.start <= now && now < occ.end) {
          if (!current || occ.end < current.end) {
            current = { task, end: occ.end };
          }
        } else if (occ.start > now) {
          const diff = occ.start.getTime() - now.getTime();
          if (!soonest || diff < soonest.time) {
            soonest = { task, time: diff };
          }
        }
      }
    }

    return {
      currentTask: current ? current.task : null,
      currentTaskTimeLeft: current ? current.end.getTime() - now.getTime() : null,
      nextTask: soonest ? soonest.task : null,
      nextTaskTimeLeft: soonest ? soonest.time : null,
    };
  };

  // Fetch tasks from main process
  const fetchTasks = async () => {
    if (!ipcRenderer) return;
    const fetched: LocalTask[] = await ipcRenderer.invoke('tasks:get');
    setTasks(fetched);
  };

  // Find the next upcoming task, considering repeat
  const getNextTask = (tasks: LocalTask[], now: Date): { task: LocalTask | null, timeLeft: number | null } => {
    let soonest: { task: LocalTask, time: number } | null = null;
    for (const task of tasks) {
      let startTimes: Date[] = [];
      if (!task.repeat || task.repeat === 'none') {
        startTimes = [new Date(task.start)];
      } else if (task.repeat === 'daily') {
        // Next occurrence today or tomorrow
        const base = new Date(task.start);
        const today = new Date(now);
        today.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), 0);
        if (today >= now) {
          startTimes = [today];
        } else {
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          startTimes = [tomorrow];
        }
      } else if (task.repeat === 'weekly') {
        // Next occurrence this week or next
        const base = new Date(task.start);
        const today = new Date(now);
        const dayDiff = (base.getDay() - today.getDay() + 7) % 7;
        const next = new Date(today);
        next.setDate(today.getDate() + (dayDiff === 0 && today < base ? 0 : dayDiff || 7));
        next.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), 0);
        if (next < now) next.setDate(next.getDate() + 7);
        startTimes = [next];
      }
      for (const start of startTimes) {
        const diff = start.getTime() - now.getTime();
        if (diff >= 0 && (!soonest || diff < soonest.time)) {
          soonest = { task, time: diff };
        }
      }
    }
    return soonest ? { task: soonest.task, timeLeft: soonest.time } : { task: null, timeLeft: null };
  };

  // Fetch tasks on mount and when window regains focus
  useEffect(() => {
    fetchTasks();
    const onFocus = () => fetchTasks();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Update current/next task every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const { currentTask, currentTaskTimeLeft, nextTask, nextTaskTimeLeft } = getCurrentAndNextTask(tasks, now);
      setCurrentTask(currentTask);
      setNextTask(nextTask); // Always show next task
      setTimeLeft(currentTask ? currentTaskTimeLeft : nextTaskTimeLeft);
    }, 1000);
    return () => clearInterval(timer);
  }, [tasks]);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Handle click-through state with IPC
  useEffect(() => {
    if (ipcRenderer) {
      ipcRenderer.invoke('set-hud-click-through', clickThrough).catch((err: any) => {
        // Ignore missing handler errors in dev
        if (err && err.message && err.message.includes('No handler registered')) return;
        console.error('set-hud-click-through error:', err);
      });
    }
  }, [clickThrough, ipcRenderer]);

  // Make hamburger always clickable: disable click-through when menu is open or button is hovered
  useEffect(() => {
    if (ipcRenderer) {
      if (menuOpen) {
        ipcRenderer.invoke('set-hud-click-through', false).catch((err: any) => {
          if (err && err.message && err.message.includes('No handler registered')) return;
          console.error('set-hud-click-through error:', err);
        });
      } else {
        ipcRenderer.invoke('set-hud-click-through', clickThrough).catch((err: any) => {
          if (err && err.message && err.message.includes('No handler registered')) return;
          console.error('set-hud-click-through error:', err);
        });
      }
    }
  }, [menuOpen, clickThrough, ipcRenderer]);

  const formatTime = (ms: number | null) => {
    if (ms === null || ms <= 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  function formatTimeHMS(ms: number | null) {
    if (ms === null || ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  const hasData = currentTime !== null && timeLeft !== null;

  const handleMenuClick = (action: string) => {
    setMenuOpen(false);
    if (!ipcRenderer) return;
    if (action === 'manage') {
      ipcRenderer.invoke('open-management-window', { alwaysOnTop: false });
    } else if (action === 'quit') {
      ipcRenderer.invoke('quit-app');
    }
  };

  const formatRepeatLabel = (task: LocalTask): string => {
    if (!task.repeat || task.repeat === 'none') return '';
    
    switch (task.repeat) {
      case 'daily':
        return 'Every day';
      case 'weekly':
        return 'Weekly';
      case 'weekdays':
        if (task.repeatSettings?.type === 'weekdays') {
          const settings = task.repeatSettings as WeekdayRepeatSettings;
          if (settings.days.length === 5 && 
              settings.days.includes(1) && 
              settings.days.includes(2) && 
              settings.days.includes(3) && 
              settings.days.includes(4) && 
              settings.days.includes(5)) {
            return 'M-F';
          }
          return settings.days.map(d => DAY_ABBREVIATIONS[d]).join('');
        }
        return 'M-F';
      case 'weekends':
        return 'Sa-Su';
      case 'every_other_day':
        return 'Every 2 days';
      case 'custom':
        if (task.repeatSettings?.type === 'custom_days') {
          const settings = task.repeatSettings as CustomRepeatSettings;
          return `Every ${settings.interval} days`;
        }
        return 'Custom';
      default:
        return (task.repeat as string).charAt(0).toUpperCase() + (task.repeat as string).slice(1);
    }
  };

  // Add this new function to handle text scaling
  const adjustTitleScale = () => {
    if (!titleRef.current || !currentTask) return;
    
    const container = titleRef.current.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const titleWidth = titleRef.current.scrollWidth;
    
    if (titleWidth > containerWidth) {
      const scale = Math.max(0.7, containerWidth / titleWidth);
      setTitleScale(scale);
    } else {
      setTitleScale(1);
    }
  };

  // Adjust title scale when current task changes or window resizes
  useEffect(() => {
    adjustTitleScale();
    const handleResize = () => {
      adjustTitleScale();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentTask]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ 
        position: 'relative',
        border: showBorder ? `2px solid ${borderColor}` : 'none',
        borderRadius: 8,
        padding: '8px',
        transition: 'border-color 0.3s ease, opacity 0.3s ease',
        overflow: 'visible',
        minHeight: 'fit-content',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
        margin: 0,
        boxSizing: 'border-box',
        opacity: opacity,
        width: '100%',
        maxWidth: '100%'
      }}
    >
      {/* Hamburger menu button and dropdown as siblings to the HUD container */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 100,
        pointerEvents: 'auto',
        width: 40,
        height: 40,
        background: 'transparent',
        borderRadius: '0 8px 0 8px',
        padding: '4px'
      }}>
        <button
          className="hud-hamburger"
          style={{
            width: 32,
            height: 32,
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            // @ts-ignore
            'WebkitAppRegion': 'no-drag',
          }}
          onClick={() => setMenuOpen((v) => !v)}
          onMouseEnter={() => {
            if (ipcRenderer) ipcRenderer.invoke('set-hud-click-through', false);
          }}
          onMouseLeave={() => {
            if (ipcRenderer && !menuOpen) ipcRenderer.invoke('set-hud-click-through', clickThrough);
          }}
          aria-label="Menu"
        >
          <span style={{ display: 'block', width: 20, height: 2, background: '#333', borderRadius: 1, marginBottom: 4 }} />
          <span style={{ display: 'block', width: 20, height: 2, background: '#333', borderRadius: 1, marginBottom: 4 }} />
          <span style={{ display: 'block', width: 20, height: 2, background: '#333', borderRadius: 1 }} />
        </button>
        {menuOpen && (
          <div
            ref={menuRef}
            className="hud-menu-dropdown"
            style={{
              position: 'absolute',
              top: 36,
              right: 0,
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              zIndex: 200,
              minWidth: 180,
              padding: 0,
              pointerEvents: 'auto',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', fontSize: 15, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={clickThrough}
                onChange={e => setClickThrough(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Enable Click-Through
            </label>
            <label style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', fontSize: 15, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showCurrentTime}
                onChange={e => setShowCurrentTime(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Show Current Time
            </label>
            <div style={{ borderTop: '1px solid #eee' }} />
            <label style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', fontSize: 15, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showBorder}
                onChange={e => setShowBorder(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Show Border
            </label>
            {showBorder && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', fontSize: 15, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={dynamicBorderColor}
                    onChange={e => setDynamicBorderColor(e.target.checked)}
                    style={{ marginRight: 8 }}
                  />
                  Dynamic Border Color
                </label>
                {dynamicBorderColor && (
                  <div style={{ padding: '0 16px 10px', fontSize: 14 }}>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', marginBottom: 4 }}>Normal Color:</label>
                      <input
                        type="color"
                        value={borderColors.normal}
                        onChange={e => setBorderColors(prev => ({ ...prev, normal: e.target.value }))}
                        style={{ width: '100%', height: 24 }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: 'block', marginBottom: 4 }}>Warning Color (≤15min):</label>
                      <input
                        type="color"
                        value={borderColors.warning}
                        onChange={e => setBorderColors(prev => ({ ...prev, warning: e.target.value }))}
                        style={{ width: '100%', height: 24 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4 }}>Critical Color (≤5min):</label>
                      <input
                        type="color"
                        value={borderColors.critical}
                        onChange={e => setBorderColors(prev => ({ ...prev, critical: e.target.value }))}
                        style={{ width: '100%', height: 24 }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            <div style={{ borderTop: '1px solid #eee' }} />
            <button
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 15,
              }}
              onClick={() => handleMenuClick('manage')}
            >
              Options
            </button>
            <div style={{ borderTop: '1px solid #eee' }} />
            <button
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#c00',
                fontSize: 15,
              }}
              onClick={() => handleMenuClick('quit')}
            >
              Quit
            </button>
          </div>
        )}
      </div>

      {/* Main HUD container with pointerEvents: 'none' */}
      <div className="hud-container" style={{
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        width: '100%',
        padding: 0,
        minHeight: 'fit-content',
        overflow: 'visible'
      }}>
        <div className="current-task-prominent" style={{
          fontSize: '1.3em',
          fontWeight: 700,
          color: currentTask ? '#4fa3e3' : '#7fa7c7',
          textShadow: '0 1px 4px rgba(0,0,0,0.10)',
          marginBottom: 0,
          textAlign: 'center',
          width: '100%',
          overflow: 'visible',
          wordBreak: 'break-word'
        }}>
          {currentTask ? (
            <>
              Now: <span 
                ref={titleRef}
                style={{
                  textDecoration: 'underline',
                  display: 'inline-block',
                  transform: `scale(${titleScale})`,
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease-out',
                  maxWidth: '100%',
                  overflow: 'visible'
                }}
              >
                {currentTask.title}
              </span>
              {currentTask.repeat && currentTask.repeat !== 'none' && (
                <span style={{ 
                  marginLeft: 8, 
                  color: '#888', 
                  fontSize: '0.7em', 
                  whiteSpace: 'nowrap', 
                  verticalAlign: 'middle', 
                  lineHeight: 1,
                  display: 'inline-block',
                }}>
                  [{formatRepeatLabel(currentTask)}]
                </span>
              )}
            </>
          ) : (
            <span style={{ fontStyle: 'italic', color: '#7fa7c7' }}>Idle</span>
          )}
        </div>
        <div className="current-task-timer" style={{ fontSize: '1em', color: '#666', textAlign: 'center', marginBottom: 0 }}>
          {currentTask ? `(${formatTimeHMS(timeLeft)} left)` : ''}
        </div>
        {showCurrentTime && (
          <div className="current-time" style={{ fontSize: '1em', fontWeight: 500, marginBottom: 0 }}>
            {currentTime?.toLocaleTimeString()}
          </div>
        )}
        {/* Only show one next task, never a list */}
        {nextTask && (
          <div className="next-event" style={{ 
            fontSize: '0.95em', 
            color: '#888', 
            textAlign: 'center', 
            opacity: 0.7, 
            marginTop: 0,
            paddingTop: 2,
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            Next: <span>{nextTask.title}</span>
            {nextTask.repeat && nextTask.repeat !== 'none' && (
              <span style={{ marginLeft: 8, color: '#bbb', fontSize: '0.7em', whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: 1 }}>
                [{formatRepeatLabel(nextTask)}]
              </span>
            )}
            <span style={{ marginLeft: 8, color: '#aaa', fontSize: '0.9em' }}>
              (in {formatTime(nextTask && !currentTask ? timeLeft : (nextTask ? (new Date(nextTask.start).getTime() - (currentTime ? currentTime.getTime() : 0)) : 0))})
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default HUD; 