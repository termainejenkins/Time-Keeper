console.log("Renderer JS loaded!");

import React from 'react';
import { createRoot } from 'react-dom/client';
import HUD from './components/HUD';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <HUD />
  );
} 