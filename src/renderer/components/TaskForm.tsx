import React, { useState } from 'react';
import { LocalTask } from '../../shared/types/task';

const { ipcRenderer } = window.require('electron');

const TaskForm: React.FC<{ onTaskAdded?: (task: LocalTask) => void }> = ({ onTaskAdded }) => {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !start || !end) return;
    const newTask = await ipcRenderer.invoke('tasks:add', {
      title,
      start,
      end,
      description,
    });
    setTitle('');
    setStart('');
    setEnd('');
    setDescription('');
    if (onTaskAdded) onTaskAdded(newTask);
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
      <button type="submit">Add Task</button>
    </form>
  );
};

export default TaskForm; 