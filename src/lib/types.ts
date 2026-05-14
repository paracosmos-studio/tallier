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
  created_at?: string;
  updated_at?: string;
  updated_reason?: string;
}

export interface ReportEntry {
  entry_id: number;
  timer_id: number;
  project_id: number;
  project_name: string;
  title: string | null;
  summary: string | null;
  date: string;
  start: string;
  end: string | null;
  total: number;
  segment?: "full" | "first" | "second";
  source_start?: string;
  source_end?: string;
  source_date?: string;
}

export interface DailyProjectTotal {
  date: string;
  project_id: number;
  project_name: string;
  total_seconds: number;
}

export interface ProjectTotal {
  project_id: number;
  project_name: string;
  total_seconds: number;
}

export interface ProjectEntryGroup {
  projectId: number;
  projectName: string;
  entries: ReportEntry[];
  total: number;
}

export type StackedBarSegment = {
  key: string | number;
  label: string;
  value: number;
  color: string;
};

export type StackedBarColumn = {
  id: string;
  label: string;
  tooltipLabel: string;
  segments: StackedBarSegment[];
};

export type BarListItem = {
  key: string | number;
  label: string;
  value: number;
  color: string;
};