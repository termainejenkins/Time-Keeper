console.log("Renderer JS loaded!");

import React from 'react';
import ReactDOM from 'react-dom/client';
import HUD from './components/HUD';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HUD />
  </React.StrictMode>
); 