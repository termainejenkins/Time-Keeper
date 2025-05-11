import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const HUD: React.FC = () => {
  const [currentTime, setCurrentTime] = useState<Date | null>(new Date());
  // Hardcoded next event 5 minutes from now
  const nextEventTime = new Date(Date.now() + 5 * 60 * 1000);
  const [timeLeft, setTimeLeft] = useState<number | null>(nextEventTime.getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setTimeLeft(nextEventTime.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(timer);
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
        )}
      </div>
    </motion.div>
  );
};

export default HUD; 