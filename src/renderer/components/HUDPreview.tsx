import React from 'react';
import { motion } from 'framer-motion';

interface HUDPreviewProps {
  settings: {
    darkMode: boolean;
    showCurrentTime: boolean;
    opacity: number;
    showBorder: boolean;
    dynamicBorderColor: boolean;
    borderColors: {
      normal: string;
      warning: string;
      critical: string;
    };
  };
}

const HUDPreview: React.FC<HUDPreviewProps> = ({ settings }) => {
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [timeLeft, setTimeLeft] = React.useState(15 * 60 * 1000); // 15 minutes for preview

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setTimeLeft(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getBorderColor = () => {
    if (!settings.dynamicBorderColor) return settings.borderColors.normal;
    const minutesLeft = timeLeft / (1000 * 60);
    if (minutesLeft <= 5) return settings.borderColors.critical;
    if (minutesLeft <= 15) return settings.borderColors.warning;
    return settings.borderColors.normal;
  };

  return (
    <div style={{
      width: '320px',
      height: '100px',
      position: 'relative',
      margin: '20px auto',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      backgroundColor: settings.darkMode ? '#2c2f36' : '#ffffff',
      border: settings.showBorder ? `2px solid ${getBorderColor()}` : 'none',
      opacity: settings.opacity,
    }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          padding: '12px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: settings.darkMode ? '#f3f3f3' : '#222',
        }}
      >
        {settings.showCurrentTime && (
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '8px',
          }}>
            {currentTime.toLocaleTimeString()}
          </div>
        )}
        <div style={{
          fontSize: '18px',
          opacity: 0.9,
        }}>
          Next event in: {formatTime(timeLeft)}
        </div>
      </motion.div>
    </div>
  );
};

export default HUDPreview; 