import { BorderColors } from '../types/hud';

// Helper function to interpolate between two colors
export function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Calculate border color based on time left
export function calculateBorderColor(
  timeLeft: number | null,
  dynamicBorderColor: boolean,
  borderColors: BorderColors,
  totalDuration: number | null = null,
  colorThresholds: { warning: number; critical: number } = { warning: 50, critical: 5 }
): string {
  if (!dynamicBorderColor || timeLeft === null || totalDuration === null) {
    return borderColors.normal;
  }

  // Calculate percentage remaining
  const percentageRemaining = (timeLeft / totalDuration) * 100;

  // Determine color based on percentage thresholds
  if (percentageRemaining <= colorThresholds.critical) {
    return borderColors.critical;
  } else if (percentageRemaining <= colorThresholds.warning) {
    // Calculate transition factor between critical and warning
    const factor = (percentageRemaining - colorThresholds.critical) / 
                  (colorThresholds.warning - colorThresholds.critical);
    return interpolateColor(borderColors.critical, borderColors.warning, factor);
  } else {
    // Calculate transition factor between warning and normal
    const factor = (percentageRemaining - colorThresholds.warning) / 
                  (100 - colorThresholds.warning);
    return interpolateColor(borderColors.warning, borderColors.normal, factor);
  }
} 