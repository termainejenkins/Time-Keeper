import React from 'react';
import ScaledText from './ScaledText';
import { calculateBorderColor } from '../../shared/utils/colorUtils';

interface HUDPreviewProps {
  settings: {
    opacity: number;
    showBorder: boolean;
    borderColors: {
      normal: string;
      warning: string;
      critical: string;
    };
    dynamicBorderColor: boolean;
    showCurrentTime: boolean;
    width: number;
    height: number;
    fontSize: number;
    padding: number;
  };
}

const formatTime = (ms: number): string => {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const HUDPreview: React.FC<HUDPreviewProps> = ({ settings }) => {
  const {
    opacity,
    showBorder,
    borderColors,
    dynamicBorderColor,
    showCurrentTime,
    width,
    height,
    fontSize,
    padding
  } = settings;

  // Calculate border color based on time left (for preview, we'll use 10 minutes)
  const borderColor = calculateBorderColor(10 * 60 * 1000, dynamicBorderColor, borderColors);

  return (
    <div
      style={{
        position: 'relative',
        border: showBorder ? `2px solid ${borderColor}` : 'none',
        borderRadius: 8,
        padding: `${padding}px`,
        transition: 'border-color 0.3s ease, opacity 0.3s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
        margin: 0,
        boxSizing: 'border-box',
        opacity: opacity,
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          width: '100%',
          padding: 0,
          minHeight: 'fit-content',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div style={{
          textAlign: 'center',
          width: '100%',
          marginBottom: 0,
        }}>
          Now: <ScaledText
            text="Sample Task"
            fontSize={fontSize * 1.33}
            fontWeight={700}
            color="#4fa3e3"
            style={{
              textDecoration: 'underline',
              textShadow: '0 1px 4px rgba(0,0,0,0.10)',
            }}
            maxWidth={width - 100}
            scaleFactor={1}
            minScale={0.7}
          />
          <span style={{ 
            marginLeft: 8, 
            color: '#888', 
            fontSize: `${fontSize * 0.7}px`, 
            whiteSpace: 'nowrap', 
            verticalAlign: 'middle', 
            lineHeight: 1,
            display: 'inline-block',
          }}>
            [Daily]
          </span>
        </div>
        <div style={{ fontSize: `${fontSize}px`, color: '#666', textAlign: 'center', marginBottom: 0 }}>
          (1:30:00 left)
        </div>
        {showCurrentTime && (
          <div style={{ fontSize: `${fontSize}px`, fontWeight: 500, marginBottom: 0 }}>
            {new Date().toLocaleTimeString()}
          </div>
        )}
        <div style={{ 
          fontSize: `${fontSize * 0.95}px`, 
          color: '#888', 
          textAlign: 'center', 
          opacity: 0.7, 
          marginTop: 0,
          paddingTop: 2,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          Next: <ScaledText
            text="Next Sample Task"
            fontSize={fontSize * 0.95}
            color="#888"
            maxWidth={width - 150}
            scaleFactor={1}
            minScale={0.8}
          />
          <span style={{ marginLeft: 8, color: '#bbb', fontSize: `${fontSize * 0.7}px`, whiteSpace: 'nowrap', verticalAlign: 'middle', lineHeight: 1 }}>
            [Weekly]
          </span>
          <span style={{ marginLeft: 8, color: '#aaa', fontSize: `${fontSize * 0.9}px` }}>
            (in 2:15:00)
          </span>
        </div>
      </div>
    </div>
  );
};

export default HUDPreview; 