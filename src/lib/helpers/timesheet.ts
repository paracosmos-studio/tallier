// SPDX-License-Identifier: GPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

import { computeDuration, formatDateISO, roundSeconds, roundTimeOfDay, timeToSeconds } from "./format";
import { splitCrossMidnight } from "./cross-midnight";
import { startOfWeek } from "./date-utils";
import type { ReportEntry } from "../types";


export interface TimesheetProjectGroup {
    projectId: number;
    projectName: string;
    entries: ReportEntry[];
    total: number;
    totalRounded: number;
    /** raw total ignoring hidden state, used as a stable sort key so the
     * project list doesn't reflow when entries are hidden/un-hidden. */
    rankTotal: number;
}

export interface TimesheetDayGroup {
    date: string;
    projects: TimesheetProjectGroup[];
    total: number;
    totalRounded: number;
}

export interface WeekCell {
    seconds: number;
    entries: ReportEntry[];
}

export interface WeekRow {
    projectId: number;
    projectName: string;
    cells: WeekCell[];
    total: number;
}

export interface WeekSection {
    weekStart: string;
    weekEnd: string;
    days: string[];
    dayNumbers: string[];
    rows: WeekRow[];
    dailyTotals: number[];
    weekTotal: number;
}

export interface CalendarBlock {
    entryId: number;
    projectId: number;
    projectName: string;
    start: string;
    end: string;
    startSeconds: number;
    durationSeconds: number;
    entry: ReportEntry;
}

export interface CalendarDay {
    date: string;
    blocks: CalendarBlock[];
    total: number;
    totalRounded: number;
}

export interface EntryOverride {
    projectId: number;
    title: string | null;
    summary: string | null;
    date: string;
    start: string;
    end: string;
}

/**
 * Returns the entry with start/end rounded to `roundMinutes` and total
 * recomputed as the difference of the rounded times.
 */
function withRoundedTimes(entry: ReportEntry, roundMinutes: number): ReportEntry {
    if (roundMinutes <= 1) return entry;
    const start: string = roundTimeOfDay(entry.start, roundMinutes);
    const end: string | null = entry.end ? roundTimeOfDay(entry.end, roundMinutes) : entry.end;
    const total: number = end
        ? Math.max(timeToSeconds(end) - timeToSeconds(start), 0)
        : entry.total;
    return { ...entry, start, end, total };
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

    const emit = (raw: ReportEntry): void => {
        const entry: ReportEntry = withRoundedTimes(raw, roundMinutes);
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
                rankTotal: 0,
            };
            dayMap.set(entry.project_id, group);
        }
        group.entries.push(entry);
        group.rankTotal += entry.total;
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
        // sort by rankTotal so hidden entries don't shuffle the project order
        const projects = Array.from(dayMap.values()).sort(
            (a, b) => b.rankTotal - a.rankTotal
        );
        const total = projects.reduce((s, p) => s + p.total, 0);
        const totalRounded = projects.reduce((s, p) => s + p.totalRounded, 0);
        result.push({ date, projects, total, totalRounded });
    }
    return result.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Builds per-day blocks for the calendar view, anchored by start time.
 * Applies the same override/split pipeline as buildDayGroups so cross-midnight
 * entries become two blocks and overrides are honored. Blocks are sorted by
 * start time within each day; days are sorted ascending.
 */
export function buildCalendarDays(
    entries: ReportEntry[],
    roundMinutes: number,
    hiddenIds?: ReadonlySet<number>,
    overrides?: ReadonlyMap<number, EntryOverride>,
    projectNames?: ReadonlyMap<number, string>,
): CalendarDay[] {
    const days: Map<string, CalendarDay> = new Map();
    const names = projectNames ?? new Map<number, string>();

    const emit = (raw: ReportEntry): void => {
        const entry: ReportEntry = withRoundedTimes(raw, roundMinutes);
        let day = days.get(entry.date);
        if (!day) {
            day = { date: entry.date, blocks: [], total: 0, totalRounded: 0 };
            days.set(entry.date, day);
        }
        const startSeconds: number = timeToSeconds(entry.start);
        const endSeconds: number = entry.end ? timeToSeconds(entry.end) : startSeconds;
        const durationSeconds: number = Math.max(endSeconds - startSeconds, 0);
        day.blocks.push({
            entryId: entry.entry_id,
            projectId: entry.project_id,
            projectName: entry.project_name,
            start: entry.start,
            end: entry.end ?? entry.start,
            startSeconds,
            durationSeconds,
            entry,
        });
        if (!hiddenIds?.has(entry.entry_id)) {
            day.total += entry.total;
            day.totalRounded += roundSeconds(entry.total, roundMinutes);
        }
    };

    for (const raw of entries) {
        const ov = overrides?.get(raw.entry_id);
        if (!ov) {
            emit(raw);
            continue;
        }
        if (raw.segment === "second") continue;
        const whole: ReportEntry = applyOverride(raw, ov, names);
        for (const part of splitCrossMidnight([whole])) {
            emit(part);
        }
    }

    const result: CalendarDay[] = Array.from(days.values()).sort(
        (a, b) => (a.date < b.date ? -1 : 1)
    );
    for (const d of result) {
        d.blocks.sort((a, b) => a.startSeconds - b.startSeconds);
    }
    return result;
}

export function projectKey(date: string, projectId: number): string {
    return `${date}|${projectId}`;
}

function addDays(d: Date, n: number): Date {
    const r: Date = new Date(d);
    r.setDate(d.getDate() + n);
    return r;
}

/**
 * Re-buckets the per-day timesheet groups into weeks anchored by `weekStartsOn`.
 * Each cell holds the rounded seconds for that (project, day) and a
 * reference to the underlying entries so the edit dialog can target them.
 * @param weekStartsOn - 0..6 (Sun..Sat)
 */
export function buildWeeks(dayGroups: TimesheetDayGroup[], weekStartsOn: number): WeekSection[] {
    const byDate: Map<string, TimesheetDayGroup> = new Map();
    for (const g of dayGroups) byDate.set(g.date, g);

    const weekStarts: Set<string> = new Set();
    for (const g of dayGroups) {
        weekStarts.add(formatDateISO(startOfWeek(new Date(g.date + "T00:00:00"), weekStartsOn)));
    }

    return Array.from(weekStarts)
        .sort((a, b) => (a < b ? 1 : -1))
        .map((weekStart): WeekSection => {
            const mon: Date = new Date(weekStart + "T00:00:00");
            const days: string[] = Array.from({ length: 7 }, (_, i) =>
                formatDateISO(addDays(mon, i))
            );
            const dayNumbers: string[] = days.map(d =>
                String(new Date(d + "T00:00:00").getDate())
            );
            const rowMap: Map<number, WeekRow> = new Map();
            const dailyTotals: number[] = new Array(7).fill(0);

            days.forEach((d, idx) => {
                const dg = byDate.get(d);
                if (!dg) return;
                for (const pg of dg.projects) {
                    let row = rowMap.get(pg.projectId);
                    if (!row) {
                        row = {
                            projectId: pg.projectId,
                            projectName: pg.projectName,
                            cells: Array.from({ length: 7 }, () => ({ seconds: 0, entries: [] })),
                            total: 0,
                        };
                        rowMap.set(pg.projectId, row);
                    }
                    row.cells[idx].seconds += pg.totalRounded;
                    row.cells[idx].entries.push(...pg.entries);
                    row.total += pg.totalRounded;
                    dailyTotals[idx] += pg.totalRounded;
                }
            });

            const rows: WeekRow[] = Array.from(rowMap.values()).sort(
                (a, b) => b.total - a.total
            );
            const weekTotal: number = dailyTotals.reduce((s, x) => s + x, 0);

            return {
                weekStart,
                weekEnd: days[6],
                days,
                dayNumbers,
                rows,
                dailyTotals,
                weekTotal,
            };
        });
}
