import React, { useEffect, useState, useCallback } from 'react';
import { LocalTask } from '../../shared/types/task';
// import TaskForm from './TaskForm';

const { ipcRenderer } = window.require('electron');

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<LocalTask[]>([]);

  const fetchTasks = useCallback(() => {
    ipcRenderer.invoke('tasks:get').then((fetched: LocalTask[]) => {
      setTasks(fetched);
    });
  }, []);

  useEffect(() => {
    // Minimal IPC test
    ipcRenderer.invoke('ping').then((result: string) => {
      console.log('Ping result:', result);
    });
    fetchTasks();
  }, [fetchTasks]);

  return (
    <div className="task-list">
      <h3>Local Tasks</h3>
      {/* <TaskForm onTaskAdded={fetchTasks} /> */}
      {tasks.length === 0 ? (
        <div>No tasks found.</div>
      ) : (
        <ul>
          {tasks.map(task => (
            <li key={task.id}>
              <strong>{task.title}</strong> ({task.start} - {task.end})
              {task.completed && ' ✅'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TaskList; 