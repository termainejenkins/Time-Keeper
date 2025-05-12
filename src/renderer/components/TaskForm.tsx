import React, { useState, useEffect } from 'react';
import { LocalTask, CustomRepeatSettings, WeekdayRepeatSettings } from '../../shared/types/task';

const { ipcRenderer } = window.require('electron');

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

interface TaskFormProps {
  onTaskAdded?: (task: LocalTask) => void;
  initialTask?: LocalTask;
  onCancel?: () => void;
}

const TaskForm: React.FC<TaskFormProps> = ({ onTaskAdded, initialTask, onCancel }) => {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [description, setDescription] = useState('');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'every_other_day' | 'custom'>('none');
  const [customInterval, setCustomInterval] = useState(2);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setStart(initialTask.start);
      setEnd(initialTask.end);
      setDescription(initialTask.description || '');
      setRepeat(initialTask.repeat || 'none');
      
      if (initialTask.repeatSettings?.type === 'custom_days') {
        setCustomInterval((initialTask.repeatSettings as CustomRepeatSettings).interval);
      } else if (initialTask.repeatSettings?.type === 'weekdays') {
        setSelectedWeekdays((initialTask.repeatSettings as WeekdayRepeatSettings).days);
      }
    }
  }, [initialTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !start || !end) return;

    let repeatSettings: CustomRepeatSettings | WeekdayRepeatSettings | undefined;
    
    if (repeat === 'custom') {
      repeatSettings = {
        type: 'custom_days',
        interval: customInterval
      };
    } else if (repeat === 'weekdays') {
      repeatSettings = {
        type: 'weekdays',
        days: selectedWeekdays
      };
    }

    const taskData = {
      title,
      start,
      end,
      description,
      repeat,
      repeatSettings,
    };

    let updatedTask: LocalTask;
    if (initialTask) {
      updatedTask = await ipcRenderer.invoke('tasks:update', {
        ...initialTask,
        ...taskData
      });
    } else {
      updatedTask = await ipcRenderer.invoke('tasks:add', taskData);
    }

    if (!initialTask) {
      setTitle('');
      setStart('');
      setEnd('');
      setDescription('');
      setRepeat('none');
      setCustomInterval(2);
      setSelectedWeekdays([]);
    }
    
    if (onTaskAdded) onTaskAdded(updatedTask);
  };

  const handleWeekdayToggle = (day: number) => {
    setSelectedWeekdays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  return (
    <form className="task-form" onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <input
        type="datetime-local"
        placeholder="Start"
        value={start}
        onChange={e => setStart(e.target.value)}
        required
      />
      <input
        type="datetime-local"
        placeholder="End"
        value={end}
        onChange={e => setEnd(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <select 
        value={repeat} 
        onChange={e => setRepeat(e.target.value as any)} 
        style={{ marginBottom: 8 }}
      >
        <option value="none">Does not repeat</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="weekdays">Weekdays (Mon-Fri)</option>
        <option value="weekends">Weekends (Sat-Sun)</option>
        <option value="every_other_day">Every other day</option>
        <option value="custom">Custom interval</option>
      </select>

      {repeat === 'custom' && (
        <div style={{ marginBottom: 8 }}>
          <label>Repeat every </label>
          <input
            type="number"
            min="1"
            value={customInterval}
            onChange={e => setCustomInterval(parseInt(e.target.value))}
            style={{ width: 60, marginRight: 4 }}
          />
          <label> days</label>
        </div>
      )}

      {repeat === 'weekdays' && (
        <div style={{ marginBottom: 8 }}>
          <label>Select days:</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {WEEKDAYS.map(day => (
              <label key={day.value} style={{ display: 'flex', alignItems: 'center', marginRight: 8 }}>
                <input
                  type="checkbox"
                  checked={selectedWeekdays.includes(day.value)}
                  onChange={() => handleWeekdayToggle(day.value)}
                  style={{ marginRight: 4 }}
                />
                {day.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit">{initialTask ? 'Update Task' : 'Add Task'}</button>
        {initialTask && onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            style={{ background: '#f5f5f5', color: '#666' }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default TaskForm; 