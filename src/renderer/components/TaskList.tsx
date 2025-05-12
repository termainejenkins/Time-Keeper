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
    
    // Exit edit mode immediately
    setEditingTaskId(null);
    
    // Update local state right away
    setTasks(prevTasks => 
      prevTasks.map(task => task.id === updatedTask.id ? updatedTask : task)
    );

    // Send update to main process in the background
    if (updatedTask.id) {
      ipcRenderer.invoke('tasks:update', updatedTask).catch((error) => {
        console.error('Error updating task:', error);
        // Only fetch tasks if there was an error to ensure sync
        fetchTasks();
      });
    }
  };

  const handleTaskDeleted = async (taskId: string) => {
    try {
      // Remove from local state immediately
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      
      // Send delete to main process
      await ipcRenderer.invoke('tasks:delete', taskId);
    } catch (error: unknown) {
      console.error('Error deleting task:', error);
      // Refresh tasks if there was an error
      fetchTasks();
    }
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
        background: bgColor, 
        padding: '12px', 
        borderRadius: 6, 
        border: `1px solid ${borderColor}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 4 
          }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '1.1em', 
              color: textColor,
              fontWeight: 500
            }}>
              {task.title}
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setEditingTaskId(task.id)}
                style={{
                  padding: '4px 8px',
                  background: darkMode ? '#444' : '#f5f5f5',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: darkMode ? '#f3f3f3' : '#666',
                  fontSize: '0.9em'
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleTaskDeleted(task.id)}
                style={{
                  padding: '4px 8px',
                  background: darkMode ? '#442222' : '#ffeeee',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: darkMode ? '#ff9999' : '#cc0000',
                  fontSize: '0.9em'
                }}
              >
                Delete
              </button>
            </div>
          </div>
          <div style={{ color: secondaryTextColor, fontSize: '0.9em' }}>
            {timeRange}
            {task.repeat && task.repeat !== 'none' && (
              <span style={{ marginLeft: 8 }}>
                [{formatRepeatDays(task)}]
              </span>
            )}
          </div>
          {task.description && (
            <p style={{ 
              margin: '4px 0 0', 
              color: secondaryTextColor,
              fontSize: '0.9em'
            }}>
              {task.description}
            </p>
          )}
        </div>
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