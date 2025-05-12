export interface CustomRepeatSettings {
  type: 'custom_days';
  interval: number;  // Number of days between repeats
}

export interface WeekdayRepeatSettings {
  type: 'weekdays';
  days: number[];  // 0-6 for Sunday-Saturday
}

export interface LocalTask {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO date string
  end: string;   // ISO date string
  completed: boolean;
  repeat?: 'none' | 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'every_other_day' | 'custom';
  repeatSettings?: CustomRepeatSettings | WeekdayRepeatSettings;
  expiredAt?: number; // ms since epoch when task expired
  archived?: boolean; // true if task is archived
} 