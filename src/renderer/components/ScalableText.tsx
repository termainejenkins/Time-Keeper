import React, { useEffect, useRef, useState } from 'react';

export type ScalingMode = 'fixed' | 'auto' | 'dynamic';

interface ScalableTextProps {
  text: string;
  fontSize: number;
  scalingMode: ScalingMode;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  minScale?: number;
  maxScale?: number;
  onScaleChange?: (scale: number) => void;
}

const ScalableText: React.FC<ScalableTextProps> = ({
  text,
  fontSize,
  scalingMode,
  maxWidth,
  maxHeight,
  className,
  style,
  minScale = 0.5,
  maxScale = 1,
  onScaleChange
}) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!textRef.current) return;
    
    const container = textRef.current.parentElement;
    if (!container) return;

    const containerWidth = maxWidth || container.clientWidth;
    const containerHeight = maxHeight || container.clientHeight;
    const textWidth = textRef.current.scrollWidth;
    const textHeight = textRef.current.scrollHeight;

    let newScale = 1;

    switch (scalingMode) {
      case 'fixed':
        newScale = 1;
        break;
      case 'auto':
        if (textWidth > containerWidth || textHeight > containerHeight) {
          const widthScale = containerWidth / textWidth;
          const heightScale = containerHeight / textHeight;
          newScale = Math.max(minScale, Math.min(maxScale, Math.min(widthScale, heightScale)));
        }
        break;
      case 'dynamic':
        const widthScale = containerWidth / textWidth;
        const heightScale = containerHeight / textHeight;
        newScale = Math.max(minScale, Math.min(maxScale, Math.min(widthScale, heightScale)));
        break;
    }

    setScale(newScale);
    onScaleChange?.(newScale);
  }, [text, fontSize, scalingMode, maxWidth, maxHeight, minScale, maxScale, onScaleChange]);

  return (
    <span
      ref={textRef}
      className={className}
      style={{
        ...style,
        fontSize: `${fontSize}px`,
        display: 'inline-block',
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        transition: 'transform 0.2s ease-out',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}
      title={text}
    >
      {text}
    </span>
  );
};

export default ScalableText; 