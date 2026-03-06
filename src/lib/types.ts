export interface Timer {
  id?: number;
  status: "running" | "stopped";
  date: string;
  start: string;
  end?: string;
  total: number;
}

export interface Project {
  id?: number;
  position: number;
  name: string;
  max_daily: number | null;
  max_daily_alert: number | null;
  max_weekly: number | null;
  max_weekly_alert: number | null;
  max_daily_enabled: boolean;
  max_weekly_enabled: boolean;
}

export interface ProjectLimits {
  maxDaily: number | null;
  maxDailyAlert: number | null;
  maxWeekly: number | null;
  maxWeeklyAlert: number | null;
  maxDailyEnabled: boolean;
  maxWeeklyEnabled: boolean;
}

export interface Entry {
  id?: number;
  timer_id: number;
  project_id: number;
  title?: string;
  summary?: string;
}