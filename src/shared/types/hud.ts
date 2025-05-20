export interface BorderColors {
  normal: string;
  warning: string;
  critical: string;
}

export interface ColorThresholds {
  warning: number;
  critical: number;
}

export interface HudSettings {
  darkMode: boolean;
  showCurrentTime: boolean;
  clickThrough: boolean;
  opacity: number;
  placement: string;
  alwaysOnTop: boolean;
  showBorder: boolean;
  dynamicBorderColor: boolean;
  borderColors: BorderColors;
  colorThresholds: ColorThresholds;
  timeDisplayFormat: 'minutes' | 'percentage';
  previewAnimation: boolean;
  width: number;
  height: number;
  fontSize: number;
  padding: number;
} 