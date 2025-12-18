export interface AppSettings {
  tripwireX: number; // Percentage 0-100
  tripwireY: number; // Percentage 0-100
  detectionWidth: number; // Percentage 1-100
  detectionHeight: number; // Percentage 1-100
  sensitivity: number; // 0-100, where lower is more sensitive (threshold)
  cooldown: number; // milliseconds
  showTimerOverlay: boolean;
  targetLaps: number; // 0 for infinite, >0 for target
}

export interface Lap {
  id: string;
  timestamp: number;
  duration: number; // Time since previous lap (0 for first lap)
}

export enum Tab {
  CONFIG = 'CONFIG',
  DISPLAY = 'DISPLAY'
}