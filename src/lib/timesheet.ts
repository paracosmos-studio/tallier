import { roundSeconds } from "./format";
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
 * Builds the day → project → entries hierarchy used by the list view.
 * Each entry's duration is rounded to `roundMinutes`; project and day
 * totals sum the rounded values (billing-style).
 */
export function buildDayGroups(
    entries: ReportEntry[],
    roundMinutes: number,
): TimesheetDayGroup[] {
    const days: Map<string, Map<number, TimesheetProjectGroup>> = new Map();

    for (const e of entries) {
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
        group.total += e.total;
        group.totalRounded += roundSeconds(e.total, roundMinutes);
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
