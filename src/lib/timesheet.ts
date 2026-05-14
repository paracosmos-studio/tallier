import { computeDuration, roundSeconds } from "./format";
import { splitCrossMidnight } from "./cross-midnight";
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
    date: string;
    start: string;
    end: string;
}

function applyOverride(
    entry: ReportEntry,
    override: EntryOverride,
    projectNames: ReadonlyMap<number, string>,
): ReportEntry {
    const total: number = computeDuration(override.start, override.end);
    return {
        ...entry,
        project_id: override.projectId,
        project_name: projectNames.get(override.projectId) ?? entry.project_name,
        title: override.title,
        summary: override.summary,
        date: override.date,
        start: override.start,
        end: override.end,
        total,
        segment: "full",
        source_start: undefined,
        source_end: undefined,
        source_date: undefined,
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

    const emit = (entry: ReportEntry): void => {
        let dayMap = days.get(entry.date);
        if (!dayMap) {
            dayMap = new Map();
            days.set(entry.date, dayMap);
        }
        let group = dayMap.get(entry.project_id);
        if (!group) {
            group = {
                projectId: entry.project_id,
                projectName: entry.project_name,
                entries: [],
                total: 0,
                totalRounded: 0,
            };
            dayMap.set(entry.project_id, group);
        }
        group.entries.push(entry);
        if (!hiddenIds?.has(entry.entry_id)) {
            group.total += entry.total;
            group.totalRounded += roundSeconds(entry.total, roundMinutes);
        }
    };

    for (const raw of entries) {
        const ov = overrides?.get(raw.entry_id);
        if (!ov) {
            emit(raw);
            continue;
        }

        // collapse pre-split entries so the override applies once; the
        // first segment carries the override, the second is dropped.
        if (raw.segment === "second") continue;

        const whole: ReportEntry = applyOverride(raw, ov, names);

        // re-split if the new times cross midnight
        for (const part of splitCrossMidnight([whole])) {
            emit(part);
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
