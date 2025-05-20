// Helper function to interpolate between two colors
export const interpolateColor = (color1: string, color2: string, factor: number) => {
  // Convert hex to RGB
  const hex2rgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  };

  // Convert RGB to hex
  const rgb2hex = (r: number, g: number, b: number) => {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const c1 = hex2rgb(color1);
  const c2 = hex2rgb(color2);

  return rgb2hex(
    c1.r + (c2.r - c1.r) * factor,
    c1.g + (c2.g - c1.g) * factor,
    c1.b + (c2.b - c1.b) * factor
  );
};

// Calculate border color based on time left
export const calculateBorderColor = (
  timeLeft: number | null,
  dynamicBorderColor: boolean,
  borderColors: { normal: string; warning: string; critical: string }
) => {
  if (!dynamicBorderColor || timeLeft === null) return borderColors.normal;
  
  const minutesLeft = timeLeft / (1000 * 60);
  
  // Define transition points
  const criticalThreshold = 5;
  const warningThreshold = 15;
  const transitionRange = 2; // 2 minutes transition period

  if (minutesLeft <= criticalThreshold) {
    return borderColors.critical;
  } else if (minutesLeft <= criticalThreshold + transitionRange) {
    // Transition from critical to warning
    const factor = (minutesLeft - criticalThreshold) / transitionRange;
    return interpolateColor(borderColors.critical, borderColors.warning, factor);
  } else if (minutesLeft <= warningThreshold) {
    return borderColors.warning;
  } else if (minutesLeft <= warningThreshold + transitionRange) {
    // Transition from warning to normal
    const factor = (minutesLeft - warningThreshold) / transitionRange;
    return interpolateColor(borderColors.warning, borderColors.normal, factor);
  }
  return borderColors.normal;
}; 