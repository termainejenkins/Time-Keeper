import React, { useEffect, useRef, useState } from 'react';

interface ScaledTextProps {
  text: string;
  fontSize: number;
  maxWidth?: number;
  fontWeight?: number | string;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
  scaleFactor?: number;
  minScale?: number;
  showEllipsis?: boolean;
  children?: React.ReactNode;
}

const ScaledText: React.FC<ScaledTextProps> = ({
  text,
  fontSize,
  maxWidth,
  fontWeight = 400,
  color,
  style = {},
  className = '',
  scaleFactor = 1,
  minScale = 0.7,
  showEllipsis = true,
  children
}) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  const adjustScale = () => {
    if (!textRef.current) return;
    
    const container = textRef.current.parentElement;
    if (!container) return;

    const containerWidth = maxWidth || container.clientWidth;
    const textWidth = textRef.current.scrollWidth;
    
    if (textWidth > containerWidth) {
      const newScale = Math.max(minScale, containerWidth / textWidth);
      setScale(newScale * scaleFactor);
    } else {
      setScale(scaleFactor);
    }
  };

  useEffect(() => {
    adjustScale();
    const handleResize = () => adjustScale();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [text, fontSize, maxWidth, scaleFactor, minScale]);

  return (
    <span
      ref={textRef}
      className={className}
      style={{
        fontSize: `${fontSize}px`,
        fontWeight,
        color,
        display: 'inline-block',
        transform: `scale(${scale})`,
        transformOrigin: 'left center',
        transition: 'transform 0.2s ease-out',
        maxWidth: maxWidth ? `${maxWidth}px` : '100%',
        overflow: showEllipsis ? 'hidden' : 'visible',
        textOverflow: showEllipsis ? 'ellipsis' : 'clip',
        whiteSpace: 'nowrap',
        ...style
      }}
    >
      {text}
      {children}
    </span>
  );
};

export default ScaledText; 