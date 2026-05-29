import { invoke } from "@tauri-apps/api/core";
import { formatDuration, roundTimeOfDay, timeToSeconds } from "./format";
import type { ReportEntry } from "../types";

export type ExportFormat = "csv" | "json";

interface ExportRow {
    date: string;
    project: string;
    start: string;
    end: string;
    duration: string;
    duration_seconds: number;
    title?: string | null;
    summary?: string | null;
}

interface ExportOptions {
    entries: ReportEntry[];
    range: { start: string; end: string };
    format: ExportFormat;
    includeNotes: boolean;
    location: string;
    roundMinutes: number;
}

function buildRows(
    entries: ReportEntry[],
    includeNotes: boolean,
    roundMinutes: number,
): ExportRow[] {
    return entries
        .slice()
        .sort((a, b) =>
            a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)
        )
        .map((e) => {
            const start = roundTimeOfDay(e.start, roundMinutes);
            const end = e.end ? roundTimeOfDay(e.end, roundMinutes) : "";
            const total = end
                ? Math.max(timeToSeconds(end) - timeToSeconds(start), 0)
                : 0;
            const row: ExportRow = {
                date: e.date,
                project: e.project_name,
                start,
                end,
                duration: formatDuration(total, true),
                duration_seconds: total,
            };
            if (includeNotes) {
                row.title = e.title;
                row.summary = e.summary;
            }
            return row;
        });
}

function csvEscape(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (/[",\r\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function rowsToCsv(rows: ExportRow[], includeNotes: boolean): string {
    const headers: (keyof ExportRow)[] = [
        "date",
        "project",
        "start",
        "end",
        "duration",
    ];
    if (includeNotes) headers.push("title", "summary");

    const lines = [headers.join(",")];
    for (const row of rows) {
        lines.push(headers.map((h) => csvEscape(row[h])).join(","));
    }
    return lines.join("\n") + "\n";
}

function rowsToJson(rows: ExportRow[], range: { start: string; end: string }): string {
    return JSON.stringify(
        {
            range,
            generated_at: new Date().toISOString(),
            count: rows.length,
            entries: rows,
        },
        null,
        2,
    ) + "\n";
}

function joinPath(dir: string, file: string): string {
    const trimmed = dir.replace(/[\\/]+$/, "");
    return `${trimmed}/${file}`;
}

function buildFilename(range: { start: string; end: string }, format: ExportFormat): string {
    return `timesheet_${range.start}_to_${range.end}.${format}`;
}

/**
 * Returns the full target path the export would write to, without performing
 * any IO. Useful for pre-flight checks (e.g. overwrite warnings).
 */
export function targetPath(
    location: string,
    range: { start: string; end: string },
    format: ExportFormat,
): string {
    return joinPath(location, buildFilename(range, format));
}

/**
 * Checks whether the given path already exists on disk. Expands a leading
 * `~/` via the Rust side.
 */
export async function pathExists(path: string): Promise<boolean> {
    return await invoke<boolean>("path_exists", { path });
}

/**
 * Serializes the filtered timesheet entries and writes them to disk via the
 * `write_text_file` Tauri command. Returns the resolved absolute path of the
 * written file (with any leading "~/" expanded server-side).
 */
export async function exportTimesheet(opts: ExportOptions): Promise<string> {
    const { entries, range, format, includeNotes, location, roundMinutes } = opts;
    const rows = buildRows(entries, includeNotes, roundMinutes);
    const contents =
        format === "csv" ? rowsToCsv(rows, includeNotes) : rowsToJson(rows, range);
    const path = targetPath(location, range, format);
    return await invoke<string>("write_text_file", { path, contents });
}
