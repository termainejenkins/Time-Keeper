export interface LocalTask {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO date string
  end: string;   // ISO date string
  completed: boolean;
} 