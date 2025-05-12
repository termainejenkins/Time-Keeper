import React, { useEffect, useState, useCallback } from 'react';
import { LocalTask, WeekdayRepeatSettings } from '../../shared/types/task';
import TaskForm from './TaskForm';

const { ipcRenderer } = window.require('electron');

/**
 * Abbreviations for days of the week
 */
const DAY_ABBREVIATIONS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Formats the repeat days display for a task
 * @param task The task to format repeat days for
 * @returns Formatted string representing the repeat schedule
 */
const formatRepeatDays = (task: LocalTask): string => {
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
        return `Every ${task.repeatSettings.interval} days`;
      }
      return 'Custom';
    default:
      return (task.repeat as string).charAt(0).toUpperCase() + (task.repeat as string).slice(1);
  }
};

/**
 * Props for the TaskList component
 */
type TaskListProps = {
  /** Reference to the fetch tasks function */
  fetchTasksRef?: React.MutableRefObject<() => void>;
  /** Whether dark mode is enabled */
  darkMode?: boolean;
};

/**
 * TaskList component displays a list of tasks with inline editing capability
 */
const TaskList: React.FC<TaskListProps> = ({ fetchTasksRef, darkMode = false }) => {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const fetchTasks = useCallback(() => {
    ipcRenderer.invoke('tasks:get').then((fetched: LocalTask[]) => {
      console.log('Fetched tasks:', fetched);
      setTasks(fetched);
    });
  }, []);

  useEffect(() => {
    console.log('TaskList mounted');
    ipcRenderer.invoke('ping').then((result: string) => {
      console.log('Ping result:', result);
    });
    fetchTasks();
    if (fetchTasksRef) {
      fetchTasksRef.current = fetchTasks;
    }
  }, [fetchTasks, fetchTasksRef]);

  const handleEdit = (taskId: string) => {
    setEditingTaskId(taskId);
  };

  const handleTaskUpdated = (updatedTask: LocalTask) => {
    console.log('Updating task:', updatedTask);
    setTasks(prevTasks => prevTasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    ipcRenderer.invoke('tasks:update', updatedTask).then(() => {
      console.log('Task update successful');
      setEditingTaskId(null);
      fetchTasks();
    }).catch((error: Error) => {
      console.error('Error updating task:', error);
      fetchTasks();
      setEditingTaskId(null);
    });
  };

  /**
   * Renders a single task item, either in edit mode or display mode
   */
  const renderTaskItem = (task: LocalTask) => {
    const startDate = new Date(task.start);
    const endDate = new Date(task.end);
    const timeRange = `${startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })} - ${endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    
    const isEditing = editingTaskId === task.id;
    const bgColor = darkMode ? '#2c2f36' : '#fff';
    const textColor = darkMode ? '#f3f3f3' : '#222';
    const borderColor = darkMode ? '#444' : '#eee';
    const secondaryTextColor = darkMode ? '#b3b3b3' : '#888';

    if (isEditing) {
      return (
        <li key={task.id} style={{ 
          marginBottom: 12, 
          background: bgColor, 
          padding: '12px', 
          borderRadius: 6, 
          border: `1px solid ${borderColor}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <TaskForm 
            onTaskAdded={handleTaskUpdated} 
            initialTask={task}
            onCancel={() => setEditingTaskId(null)}
          />
        </li>
      );
    }

    return (
      <li key={task.id} style={{ 
        marginBottom: 12, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        background: bgColor, 
        padding: '8px 12px', 
        borderRadius: 6, 
        border: `1px solid ${borderColor}`,
        color: textColor
      }}>
        <div>
          <strong>{task.title}</strong>
          {(!task.repeat || task.repeat === 'none') && (
            <span style={{ marginLeft: 8, color: secondaryTextColor }}>
              ({startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
            </span>
          )}
          <span style={{ color: darkMode ? '#666' : '#bbb', margin: '0 8px' }}>•</span>
          <span style={{ color: secondaryTextColor, fontSize: '0.97em' }}>{timeRange}</span>
          {task.completed && ' ✅'}
          {task.repeat && task.repeat !== 'none' && (
            <span style={{ marginLeft: 8, color: secondaryTextColor, fontSize: '0.9em' }}>
              [{formatRepeatDays(task)}]
            </span>
          )}
        </div>
        <button
          onClick={() => handleEdit(task.id)}
          style={{
            background: '#4fa3e3',
            border: 'none',
            borderRadius: 4,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '0.9em',
            color: '#fff',
            fontWeight: 500,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          Edit
        </button>
      </li>
    );
  };

  return (
    <div className="task-list">
      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', color: darkMode ? '#b3b3b3' : '#888', marginTop: 32 }}>
          No tasks yet. Add one above!
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {tasks.map(renderTaskItem)}
        </ul>
      )}
    </div>
  );
};

export default TaskList; 