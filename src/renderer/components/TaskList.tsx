import React, { useEffect, useState, useCallback } from 'react';
import { LocalTask } from '../../shared/types/task';
// import TaskForm from './TaskForm';

const { ipcRenderer } = window.require('electron');

type TaskListProps = {
  fetchTasksRef?: React.MutableRefObject<() => void>;
};

const TaskList: React.FC<TaskListProps> = ({ fetchTasksRef }) => {
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
    if (fetchTasksRef) {
      fetchTasksRef.current = fetchTasks;
    }
  }, [fetchTasks, fetchTasksRef]);

  return (
    <div className="task-list">
      {/* <h3>Local Tasks</h3> */}
      {/* <TaskForm onTaskAdded={fetchTasks} /> */}
      {tasks.length === 0 ? (
        <div>No tasks found.</div>
      ) : (
        <ul>
          {tasks.map(task => {
            const startDate = new Date(task.start);
            const endDate = new Date(task.end);
            const dateRange = `${startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`;
            const timeRange = `${startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })} - ${endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}`;
            return (
              <li key={task.id}>
                <strong>{task.title}</strong> ({dateRange}
                <span style={{ color: '#bbb', margin: '0 8px' }}>•</span>
                <span style={{ color: '#888', fontSize: '0.97em' }}>{timeRange}</span>)
                {task.completed && ' ✅'}
                {task.repeat && task.repeat !== 'none' && (
                  <span style={{ marginLeft: 8, color: '#888', fontSize: '0.9em' }}>
                    [Repeats: {task.repeat.charAt(0).toUpperCase() + task.repeat.slice(1)}]
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TaskList; 