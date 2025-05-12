export interface LocalTask {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO date string
  end: string;   // ISO date string
  completed: boolean;
  repeat?: 'none' | 'daily' | 'weekly';
  expiredAt?: number; // ms since epoch when task expired
  archived?: boolean; // true if task is archived
} 