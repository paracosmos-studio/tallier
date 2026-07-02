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
  color: string | null;
  hourly_rate: number | null;
  currency: string | null;
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

export interface ClientContact {
  label: string;
  value: string;
}

export interface Client {
  id?: number;
  position: number;
  contact_name: string | null; // at least one of contact_name / company_name is set
  company_name: string | null;
  mailing_address: string | null;
  avatar: string | null;
  emails: ClientContact[] | null;
  phones: ClientContact[] | null;
  websites: ClientContact[] | null;
  invoice_id_prefix: string | null;
}

export interface Profile {
  id?: number;
  position: number;
  label: string;
  business_name: string;
  tax_id: string | null;
  logo: string | null;
  emails: ClientContact[] | null;
  phones: ClientContact[] | null;
  mailing_address: string | null;
}

export interface InvoiceMeta {
  invoiceNo: string;
  issueDate: string; // ISO yyyy-mm-dd in the editor; "MMM DD, YYYY" once assembled
  dueDate: string; // same as issueDate, or "" when unset
  notes: string;
}

export interface InvoiceRow {
  kind: "data" | "header"; // header = sub-section or totals band
  cells: string[]; // pre-formatted, parallel to columns
}

export interface InvoiceData {
  sender: Profile; // sender identity
  recipient: Client; // invoice recipient
  meta: InvoiceMeta;
  items: {
    columns: string[]; // header labels, display order
    widths: number[]; // fr weights parallel to columns, drive table layout
    rows: InvoiceRow[]; // body rows in original editor order
  };
}

export interface Entry {
  id?: number;
  timer_id: number;
  project_id: number;
  title?: string;
  summary?: string;
  is_billable: boolean;
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
  is_billable: boolean;
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