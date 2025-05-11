import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LocalTask } from '../../shared/types/task';

const HUD: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<Date | null>(new Date());
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [currentTask, setCurrentTask] = useState<LocalTask | null>(null);
  const [nextTask, setNextTask] = useState<LocalTask | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [clickThrough, setClickThrough] = useState(true);
  const [showCurrentTime, setShowCurrentTime] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;

  // Place getCurrentAndNextTask function here (above useEffect)
  const getCurrentAndNextTask = (tasks: LocalTask[], now: Date) => {
    let current: { task: LocalTask; end: Date } | null = null;
    let soonest: { task: LocalTask; time: number } | null = null;
    for (const task of tasks) {
      let occurrences: { start: Date; end: Date }[] = [];
      if (!task.repeat || task.repeat === 'none') {
        occurrences = [{ start: new Date(task.start), end: new Date(task.end) }];
      } else if (task.repeat === 'daily') {
        const baseStart = new Date(task.start);
        const baseEnd = new Date(task.end);
        const todayStart = new Date(now);
        todayStart.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0);
        if (todayEnd <= todayStart) todayEnd.setDate(todayEnd.getDate() + 1); // handle overnight
        occurrences.push({ start: todayStart, end: todayEnd });
        // If already past, add tomorrow
        if (todayEnd <= now) {
          const tomorrowStart = new Date(todayStart);
          tomorrowStart.setDate(todayStart.getDate() + 1);
          const tomorrowEnd = new Date(todayEnd);
          tomorrowEnd.setDate(todayEnd.getDate() + 1);
          occurrences.push({ start: tomorrowStart, end: tomorrowEnd });
        }
      } else if (task.repeat === 'weekly') {
        const baseStart = new Date(task.start);
        const baseEnd = new Date(task.end);
        const today = new Date(now);
        const dayDiff = (baseStart.getDay() - today.getDay() + 7) % 7;
        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() + dayDiff);
        thisWeekStart.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0);
        const thisWeekEnd = new Date(thisWeekStart);
        thisWeekEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0);
        if (thisWeekEnd <= thisWeekStart) thisWeekEnd.setDate(thisWeekEnd.getDate() + 1); // handle overnight
        occurrences.push({ start: thisWeekStart, end: thisWeekEnd });
        // If already past, add next week
        if (thisWeekEnd <= now) {
          const nextWeekStart = new Date(thisWeekStart);
          nextWeekStart.setDate(thisWeekStart.getDate() + 7);
          const nextWeekEnd = new Date(thisWeekEnd);
          nextWeekEnd.setDate(thisWeekEnd.getDate() + 7);
          occurrences.push({ start: nextWeekStart, end: nextWeekEnd });
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
      setNextTask(currentTask ? null : nextTask); // Only show next if not in current
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
      ipcRenderer.invoke('open-management-window');
    } else if (action === 'quit') {
      ipcRenderer.invoke('quit-app');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ position: 'relative' }}
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
        background: 'rgba(255,255,255,0.01)', // nearly invisible but hit-testable
        borderRadius: 8,
      }}>
        <button
          className="hud-hamburger"
          style={{
            width: 32,
            height: 32,
            background: 'rgba(255,255,255,0.1)',
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
              Manage Tasks / Options
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
      <div className="hud-container" style={{ pointerEvents: 'none' }}>
        <div className="current-task-prominent" style={{
          fontSize: '1.3em',
          fontWeight: 700,
          color: currentTask ? '#4fa3e3' : '#7fa7c7',
          textShadow: '0 1px 4px rgba(0,0,0,0.10)',
          marginBottom: 4,
          textAlign: 'center',
        }}>
          {currentTask ? (
            <>
              Now: <span style={{ textDecoration: 'underline' }}>{currentTask.title}</span>
              {currentTask.repeat && currentTask.repeat !== 'none' && (
                <span style={{ marginLeft: 8, color: '#888', fontSize: '0.8em' }}>
                  [Repeats: {currentTask.repeat.charAt(0).toUpperCase() + currentTask.repeat.slice(1)}]
                </span>
              )}
            </>
          ) : (
            <span style={{ fontStyle: 'italic', color: '#7fa7c7' }}>Idle</span>
          )}
        </div>
        <div className="current-task-timer" style={{ fontSize: '1em', color: '#555', textAlign: 'center', marginBottom: 8 }}>
          {currentTask ? `(${formatTimeHMS(timeLeft)} left)` : ''}
        </div>
        {showCurrentTime && (
          <div className="current-time" style={{ fontSize: '1em', fontWeight: 500, marginBottom: 4 }}>
            {currentTime?.toLocaleTimeString()}
          </div>
        )}
        {/* Only show one next task, never a list */}
        {nextTask && (
          <div className="next-event" style={{ fontSize: '0.95em', color: '#888', textAlign: 'center', opacity: 0.7, marginTop: 2 }}>
            Next: <span>{nextTask.title}</span>
            {nextTask.repeat && nextTask.repeat !== 'none' && (
              <span style={{ marginLeft: 8, color: '#bbb', fontSize: '0.8em' }}>
                [Repeats: {nextTask.repeat.charAt(0).toUpperCase() + nextTask.repeat.slice(1)}]
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