import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LocalTask, CustomRepeatSettings, WeekdayRepeatSettings } from '../../shared/types/task';
import { IpcRendererEvent } from 'electron';
import ScaledText from './ScaledText';
import { calculateBorderColor } from '../../shared/utils/colorUtils';

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
  width: number;
  height: number;
  fontSize: number;
  padding: number;
  showCurrentTime: boolean;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [width, setWidth] = useState(320);
  const [height, setHeight] = useState(100);
  const [fontSize, setFontSize] = useState(18);
  const [padding, setPadding] = useState(12);
  const [opacity, setOpacity] = useState(0.85);

  // Helper function to interpolate between two colors
  const interpolateColor = (color1: string, color2: string, factor: number) => {
    // Convert hex to RGB
    const hex2rgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    // Convert RGB to hex
    const rgb2hex = (r: number, g: number, b: number) => {
      return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    };

    const c1 = hex2rgb(color1);
    const c2 = hex2rgb(color2);

    return rgb2hex(
      c1.r + (c2.r - c1.r) * factor,
      c1.g + (c2.g - c1.g) * factor,
      c1.b + (c2.b - c1.b) * factor
    );
  };

  // Calculate border color based on time left
  const calculateBorderColor = (timeLeft: number | null) => {
    if (!dynamicBorderColor || timeLeft === null) return borderColors.normal;
    
    const minutesLeft = timeLeft / (1000 * 60);
    
    // Define transition points
    const criticalThreshold = 5;
    const warningThreshold = 15;
    const transitionRange = 2; // 2 minutes transition period

    if (minutesLeft <= criticalThreshold) {
      return borderColors.critical;
    } else if (minutesLeft <= criticalThreshold + transitionRange) {
      // Transition from critical to warning
      const factor = (minutesLeft - criticalThreshold) / transitionRange;
      return interpolateColor(borderColors.critical, borderColors.warning, factor);
    } else if (minutesLeft <= warningThreshold) {
      return borderColors.warning;
    } else if (minutesLeft <= warningThreshold + transitionRange) {
      // Transition from warning to normal
      const factor = (minutesLeft - warningThreshold) / transitionRange;
      return interpolateColor(borderColors.warning, borderColors.normal, factor);
    }
    return borderColors.normal;
  };

  // Update border color when time left changes
  useEffect(() => {
    setBorderColor(calculateBorderColor(timeLeft));
  }, [timeLeft, dynamicBorderColor, borderColors]);

  // Load HUD settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('hudSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.opacity !== undefined) setOpacity(settings.opacity);
      if (settings.showBorder !== undefined) setShowBorder(settings.showBorder);
      if (settings.borderColors) setBorderColors(settings.borderColors);
      if (settings.dynamicBorderColor !== undefined) setDynamicBorderColor(settings.dynamicBorderColor);
      if (settings.showCurrentTime !== undefined) setShowCurrentTime(settings.showCurrentTime);
      if (settings.width !== undefined) setWidth(settings.width);
      if (settings.height !== undefined) setHeight(settings.height);
      if (settings.fontSize !== undefined) setFontSize(settings.fontSize);
      if (settings.padding !== undefined) setPadding(settings.padding);
    }
  }, []);

  // Listen for HUD settings updates
  useEffect(() => {
    if (!ipcRenderer) return;

    const handleHudSettingsUpdate = (_event: IpcRendererEvent, settings: any) => {
      if (settings.opacity !== undefined) setOpacity(settings.opacity);
      if (settings.showBorder !== undefined) setShowBorder(settings.showBorder);
      if (settings.borderColors) setBorderColors(settings.borderColors);
      if (settings.dynamicBorderColor !== undefined) setDynamicBorderColor(settings.dynamicBorderColor);
      if (settings.showCurrentTime !== undefined) setShowCurrentTime(settings.showCurrentTime);
      if (settings.width !== undefined) setWidth(settings.width);
      if (settings.height !== undefined) setHeight(settings.height);
      if (settings.fontSize !== undefined) setFontSize(settings.fontSize);
      if (settings.padding !== undefined) setPadding(settings.padding);
    };

    ipcRenderer.on('hud-settings-update', handleHudSettingsUpdate);
    return () => {
      ipcRenderer.removeListener('hud-settings-update', handleHudSettingsUpdate);
    };
  }, [ipcRenderer]);

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
      console.log('Time update:', {
        now: now.toISOString(),
        currentTask: currentTask?.title,
        currentTaskTimeLeft,
        nextTask: nextTask?.title,
        nextTaskTimeLeft,
        tasks: tasks.map(t => ({
          title: t.title,
          start: t.start,
          end: t.end,
          repeat: t.repeat
        }))
      });
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

  // Add ResizeObserver to handle dynamic content sizing
  useEffect(() => {
    if (!contentRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        setContainerHeight(height);
      }
    });

    resizeObserver.observe(contentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ 
        position: 'relative',
        border: showBorder ? `2px solid ${borderColor}` : 'none',
        borderRadius: 8,
        padding: `${padding}px`,
        transition: 'border-color 0.3s ease, opacity 0.3s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
        margin: 0,
        boxSizing: 'border-box',
        opacity: opacity,
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      {/* Menu with pointerEvents: 'auto' */}
      <div 
        ref={menuRef}
        className="hud-menu" 
        style={{
          pointerEvents: 'auto',
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 1000,
          display: 'flex',
          gap: '4px',
          padding: '4px',
          background: 'rgba(0, 0, 0, 0.1)',
          borderRadius: '0 0 0 8px',
          backdropFilter: 'blur(4px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <button
          onClick={() => setMenuOpen((v) => !v)}
          title="Menu"
          aria-label="Menu"
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            fontSize: '14px'
          }}
        >
          Menu
        </button>
      </div>

      {/* Main HUD container with pointerEvents: 'none' */}
      <div 
        ref={contentRef}
        className="hud-container" 
        style={{
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          width: '100%',
          padding: 0,
          minHeight: 'fit-content',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div className="current-task-prominent" style={{
          textAlign: 'center',
          width: '100%',
          marginBottom: 0,
        }}>
          {currentTask ? (
            <>
              Now: <ScaledText
                text={currentTask.title}
                fontSize={fontSize * 1.33}
                fontWeight={700}
                color={currentTask ? '#4fa3e3' : '#7fa7c7'}
                style={{
                  textDecoration: 'underline',
                  textShadow: '0 1px 4px rgba(0,0,0,0.10)',
                }}
                maxWidth={width - 100}
                scaleFactor={1}
                minScale={0.7}
              />
              {currentTask.repeat && currentTask.repeat !== 'none' && (
                <span style={{ 
                  marginLeft: 8, 
                  color: '#888', 
                  fontSize: `${fontSize * 0.7}px`, 
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
        <div className="current-task-timer" style={{ fontSize: `${fontSize}px`, color: '#666', textAlign: 'center', marginBottom: 0 }}>
          {currentTask ? `(${formatTimeHMS(timeLeft)} left)` : ''}
        </div>
        {showCurrentTime && (
          <div className="current-time" style={{ fontSize: `${fontSize}px`, fontWeight: 500, marginBottom: 0 }}>
            {currentTime?.toLocaleTimeString()}
          </div>
        )}
        {/* Only show one next task, never a list */}
        {nextTask && (
          <div className="next-event" style={{ 
            fontSize: `${fontSize * 0.95}px`, 
            color: '#888', 
            textAlign: 'center', 
            opacity: 0.7, 
            marginTop: 0,
            paddingTop: 2,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            Next: <ScaledText
              text={nextTask.title}
              fontSize={fontSize * 0.95}
              color="#888"
              maxWidth={width - 150}
              scaleFactor={1}
              minScale={0.8}
            />
            {nextTask.repeat && nextTask.repeat !== 'none' && (
              <span style={{ marginLeft: 8, color: '#bbb', fontSize: `${fontSize * 0.7}px`, whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: 1 }}>
                [{formatRepeatLabel(nextTask)}]
              </span>
            )}
            <span style={{ marginLeft: 8, color: '#aaa', fontSize: `${fontSize * 0.9}px` }}>
              (in {formatTime(nextTask && !currentTask ? timeLeft : (nextTask ? (new Date(nextTask.start).getTime() - (currentTime ? currentTime.getTime() : 0)) : 0))})
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default HUD; 