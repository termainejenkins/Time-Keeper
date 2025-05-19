console.log("Renderer JS loaded!");

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { motion } from 'framer-motion';

// Add IPC types
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
        send(channel: string, ...args: any[]): void;
        on(channel: string, func: (...args: any[]) => void): void;
        removeAllListeners(channel: string): void;
      };
    };
  }
}

const HUD: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<Date | null>(new Date());
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Function to send size to main process
  const sendSizeToMain = () => {
    if (rootRef.current) {
      const { width, height } = rootRef.current.getBoundingClientRect();
      window.electron?.ipcRenderer?.send('hud-resize', { 
        width: Math.ceil(width), 
        height: Math.ceil(height) 
      });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (timeLeft !== null) {
        setTimeLeft(prev => prev !== null ? prev - 1000 : null);
      }
    }, 1000);

    // Initial size calculation
    sendSizeToMain();

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      sendSizeToMain();
    });

    if (rootRef.current) {
      resizeObserver.observe(rootRef.current);
    }

    return () => {
      clearInterval(timer);
      resizeObserver.disconnect();
    };
  }, []);

  const formatTime = (ms: number | null) => {
    if (ms === null || ms <= 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  const hasData = currentTime !== null && timeLeft !== null;

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="hud-container">
        {hasData ? (
          <>
            <div className="current-time">
              {currentTime?.toLocaleTimeString()}
            </div>
            <div className="next-event">
              Next event in: {formatTime(timeLeft)}
            </div>
          </>
        ) : (
          <div className="placeholder">No data available. Waiting for events...</div>
 