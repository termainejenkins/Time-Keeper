import React from 'react';
import { createRoot } from 'react-dom/client';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <>
      <h2>Manage Tasks & Options</h2>
      <TaskForm />
      <TaskList />
      {/* Future: Add options/settings UI here */}
    </>
  );
} 