import { roundSeconds, timeToSeconds } from "./format";
import type { ReportEntry } from "./types";

export interface TimesheetProjectGroup {
    projectId: number;
    projectName: string;
    entries: ReportEntry[];
    total: number;
    totalRounded: number;
}

export interface TimesheetDayGroup {
    date: string;
    projects: TimesheetProjectGroup[];
    total: number;
    totalRounded: number;
}

/**
 * Per-entry overrides applied locally for the timesheet view only;
 * the underlying database row is never mutated.
 */
export interface EntryOverride {
    projectId: number;
    title: string | null;
    summary: string | null;
    start: string;
    end: string;
}

function applyOverride(
    entry: ReportEntry,
    override: EntryOverride,
    projectNames: ReadonlyMap<number, string>,
): ReportEntry {
    const total = Math.max(0, timeToSeconds(override.end) - timeToSeconds(override.start));
    return {
        ...entry,
        project_id: override.projectId,
        project_name: projectNames.get(override.projectId) ?? entry.project_name,
        title: override.title,
        summary: override.summary,
        start: override.start,
        end: override.end,
        total,
    };
}

/**
 * Builds the day → project → entries hierarchy used by the list view.
 * Each entry's duration is rounded to `roundMinutes`; project and day
 * totals sum the rounded values (billing-style). Entries whose IDs are in
 * `hiddenIds` still appear in the entries list but are excluded from totals.
 * `overrides` apply view-only field changes; `projectNames` resolves
 * overridden project IDs to display names.
 */
export function buildDayGroups(
    entries: ReportEntry[],
    roundMinutes: number,
    hiddenIds?: ReadonlySet<number>,
    overrides?: ReadonlyMap<number, EntryOverride>,
    projectNames?: ReadonlyMap<number, string>,
): TimesheetDayGroup[] {
    const days: Map<string, Map<number, TimesheetProjectGroup>> = new Map();
    const names = projectNames ?? new Map<number, string>();

    for (const raw of entries) {
        const ov = overrides?.get(raw.entry_id);
        const e = ov ? applyOverride(raw, ov, names) : raw;

        let dayMap = days.get(e.date);
        if (!dayMap) {
            dayMap = new Map();
            days.set(e.date, dayMap);
        }
        let group = dayMap.get(e.project_id);
        if (!group) {
            group = {
                projectId: e.project_id,
                projectName: e.project_name,
                entries: [],
                total: 0,
                totalRounded: 0,
            };
            dayMap.set(e.project_id, group);
        }
        group.entries.push(e);
        if (!hiddenIds?.has(e.entry_id)) {
            group.total += e.total;
            group.totalRounded += roundSeconds(e.total, roundMinutes);
        }
    }

    const result: TimesheetDayGroup[] = [];
    for (const [date, dayMap] of days) {
        const projects = Array.from(dayMap.values()).sort(
            (a, b) => b.totalRounded - a.totalRounded
        );
        const total = projects.reduce((s, p) => s + p.total, 0);
        const totalRounded = projects.reduce((s, p) => s + p.totalRounded, 0);
        result.push({ date, projects, total, totalRounded });
    }
    return result.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function projectKey(date: string, projectId: number): string {
    return `${date}|${projectId}`;
}
