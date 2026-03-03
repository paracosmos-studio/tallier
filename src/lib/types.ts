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
}

export interface Entry {
  id?: number;
  timer_id: number;
  project_id: number;
  title?: string;
  summary?: string;
}